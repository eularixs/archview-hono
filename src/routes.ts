import { Node, SyntaxKind } from "ts-morph";
import type { Result } from "./analyzer.js";

const VERBS: Record<string, string> = {
  get: "GET", post: "POST", put: "PUT", delete: "DELETE",
  patch: "PATCH", options: "OPTIONS", head: "HEAD", all: "ANY",
};

export interface Route {
  method: string;
  path: string;
  handler?: Node;
  file: string;
  line: number;
  col: number;
}

// Generic router extractor: X.<verb>("/path", ...handler) — Hono, Express,
// Fastify, Elysia, … matched by verb name, string path, function-ish last arg.
export function extractRoutes(res: Result): Route[] {
  const out: Route[] = [];
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
      let handler = res.resolveFunc(last);
      if (!handler && (Node.isArrowFunction(last) || Node.isFunctionExpression(last))) {
        // inline handler like (c) => ctl.list(c): use the first call it makes
        for (const inner of last.getDescendantsOfKind(SyntaxKind.CallExpression)) {
          const h = res.resolveFunc(inner.getExpression());
          if (h) { handler = h; break; }
        }
      }
      const { line, column } = sf.getLineAndColumnAtPos(call.getStart());
      out.push({ method: verb, path: pathArg.getLiteralValue(), handler, file: sf.getFilePath(), line, col: column });
    }
  }
  return out;
}
