import { Node, SyntaxKind } from "ts-morph";
import type { Result } from "./analyzer.js";

const VERBS: Record<string, string> = {
  get: "GET", post: "POST", put: "PUT", delete: "DELETE",
  patch: "PATCH", options: "OPTIONS", head: "HEAD", all: "ANY", ws: "WS",
};

export interface Route {
  method: string;
  path: string;
  handler?: Node;
  file: string;
  line: number;
  col: number;
}

const PROC_KINDS: Record<string, string> = { query: "QUERY", mutation: "MUTATION", subscription: "SUB" };

// Resolve a route's handler argument to a project Func node. A direct function
// reference resolves by symbol; an inline arrow ((c) => ctl.list(c)) resolves to
// the first project call it makes.
function resolveHandler(res: Result, last: Node): Node | undefined {
  let handler = res.resolveFunc(last);
  if (!handler && (Node.isArrowFunction(last) || Node.isFunctionExpression(last))) {
    for (const inner of last.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const h = res.resolveFunc(inner.getExpression());
      if (h) { handler = h; break; }
    }
  }
  return handler;
}

// Names that mount a sub-router under a path prefix.
const MOUNT = new Set(["route", "use", "mount"]);

function joinPath(a: string, b: string): string {
  const x = (a + "/" + b).replace(/\/{2,}/g, "/");
  return x.length > 1 ? x.replace(/\/$/, "") : x;
}

// Generic router extractor: X.<verb>("/path", ...handler) — Hono, Express,
// Fastify, Elysia, … matched by verb name, string path, function-ish last arg.
// Sub-routers mounted via app.route('/api', sub) contribute their prefix.
export function extractRoutes(res: Result): Route[] {
  const out: Route[] = [...extractTrpc(res), ...extractNest(res)];

  // Resolve an expression to the declaration of the router variable it names.
  const routerDecl = (e: Node): Node | undefined => {
    const sym = e.getSymbol();
    const s = sym?.getAliasedSymbol() ?? sym;
    return s?.getDeclarations()[0];
  };
  // child router decl -> { prefix, parent router decl }
  const mounts = new Map<Node, { prefix: string; parent?: Node }>();
  for (const sf of res.sourceFiles) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (!Node.isPropertyAccessExpression(expr) || !MOUNT.has(expr.getName())) continue;
      const args = call.getArguments();
      if (args.length < 2 || !Node.isStringLiteral(args[0])) continue;
      const child = routerDecl(args[1]);
      if (!child || !Node.isVariableDeclaration(child)) continue;
      mounts.set(child, { prefix: args[0].getLiteralValue(), parent: routerDecl(expr.getExpression()) });
    }
  }
  const fullPrefix = (decl?: Node): string => {
    let p = "";
    let cur = decl;
    const seen = new Set<Node>();
    while (cur && mounts.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      const m = mounts.get(cur)!;
      p = joinPath(m.prefix, p);
      cur = m.parent;
    }
    return p;
  };

  for (const sf of res.sourceFiles) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) continue;
      const verb = VERBS[expr.getName().toLowerCase()];
      if (!verb) continue;
      const args = call.getArguments();
      if (args.length < 2) continue;
      const pathArg = args[0];
      if (!Node.isStringLiteral(pathArg)) continue;
      const last = args[args.length - 1];
      const handler = resolveHandler(res, last);
      let method = verb;
      if (verb !== "WS") {
        for (const a of args) {
          if (Node.isCallExpression(a) && /upgradeWebSocket|upgradeWebsocket/.test(a.getExpression().getText())) { method = "WS"; break; }
        }
      }
      const prefix = fullPrefix(routerDecl(expr.getExpression()));
      const path = prefix ? joinPath(prefix, pathArg.getLiteralValue()) : pathArg.getLiteralValue();
      const { line, column } = sf.getLineAndColumnAtPos(call.getStart());
      out.push({ method, path, handler, file: sf.getFilePath(), line, col: column });
    }
  }
  return out;
}

// tRPC extractor — RPC for the TS world. A router({ proc: t.procedure.query(fn),
// ... }) maps each property to an endpoint; .query/.mutation/.subscription set
// the kind and the last call argument is the resolver. Nested routers join with
// a dot prefix (user.get).
export function extractTrpc(res: Result): Route[] {
  const out: Route[] = [];
  const isRouterCall = (call: Node): boolean => {
    if (!Node.isCallExpression(call)) return false;
    const expr = call.getExpression();
    const name = (Node.isPropertyAccessExpression(expr) ? expr.getName() : expr.getText()).toLowerCase();
    return name === "router" || name.endsWith("router");
  };
  const walkRouter = (obj: Node, prefix: string, sf: (typeof res.sourceFiles)[number]) => {
    if (!Node.isObjectLiteralExpression(obj)) return;
    for (const prop of obj.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
      const key = prop.getName();
      const val = prop.getInitializerOrThrow();
      const path = prefix ? `${prefix}.${key}` : key;
      // nested router({...})
      if (isRouterCall(val)) {
        const arg0 = (val as any).getArguments?.()[0];
        if (arg0) walkRouter(arg0, path, sf);
        continue;
      }
      // procedure chain: find the .query/.mutation/.subscription call
      const calls = Node.isCallExpression(val) ? [val, ...val.getDescendantsOfKind(SyntaxKind.CallExpression)] : [];
      for (const c of calls) {
        const e = c.getExpression();
        if (!Node.isPropertyAccessExpression(e)) continue;
        const kind = PROC_KINDS[e.getName()];
        if (!kind) continue;
        const cargs = c.getArguments();
        const handler = cargs.length ? resolveHandler(res, cargs[cargs.length - 1]) : undefined;
        const { line, column } = sf.getLineAndColumnAtPos(prop.getStart());
        out.push({ method: kind, path: "/" + path, handler, file: sf.getFilePath(), line, col: column });
        break;
      }
    }
  };
  for (const sf of res.sourceFiles) {
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (!isRouterCall(call)) continue;
      // skip nested routers (reached via walkRouter from their parent)
      const parent = call.getParent();
      if (parent && Node.isPropertyAssignment(parent)) continue;
      const arg0 = call.getArguments()[0];
      if (arg0) walkRouter(arg0, "", sf);
    }
  }
  return out;
}

const NEST_VERBS: Record<string, string> = { Get: "GET", Post: "POST", Put: "PUT", Delete: "DELETE", Patch: "PATCH", Options: "OPTIONS", Head: "HEAD", All: "ANY" };

// NestJS controller extractor: an @Controller('prefix') class whose methods
// carry @Get(':id')/@Post()/… decorators. Each method is an endpoint at
// prefix + method path, bound to the method itself.
export function extractNest(res: Result): Route[] {
  const out: Route[] = [];
  const decoArg = (text: string | undefined): string =>
    text && /^["'`]/.test(text.trim()) ? text.trim().slice(1, -1) : "";
  for (const sf of res.sourceFiles) {
    for (const cls of sf.getClasses()) {
      const ctrl = cls.getDecorator("Controller");
      if (!ctrl) continue;
      const prefix = decoArg(ctrl.getArguments()[0]?.getText());
      for (const m of cls.getMethods()) {
        for (const dec of m.getDecorators()) {
          const verb = NEST_VERBS[dec.getName()];
          if (!verb) continue;
          const sub = decoArg(dec.getArguments()[0]?.getText());
          const path = "/" + [prefix, sub].filter(Boolean).join("/").replace(/^\/+/, "");
          const { line, column } = sf.getLineAndColumnAtPos(m.getNameNode().getStart());
          out.push({ method: verb, path, handler: m, file: sf.getFilePath(), line, col: column });
          break;
        }
      }
    }
  }
  return out;
}
