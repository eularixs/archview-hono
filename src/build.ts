import { Node } from "ts-morph";
import type { Graph } from "./graph.js";
import { editorURL, LAYER_ORDER } from "./graph.js";
import { Classifier } from "./classify.js";
import type { Result } from "./analyzer.js";
import type { Route } from "./routes.js";
import { detectBuses } from "./buses.js";
import type { ResolvedOptions } from "./options.js";

const LAYERED = new Set(["controller", "service", "repository"]);

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
}

export function buildGraph(res: Result, routes: Route[], cl: Classifier, opts: ResolvedOptions): Graph {
  const funcs = res.funcs;
  const layerOf = new Map<Node, string>();
  const moduleOf = new Map<Node, string>();
  const included = new Set<Node>();
  const out = new Map<Node, Node[]>();
  for (const e of res.callEdges) if (funcs.has(e.from) && funcs.has(e.to)) push(out, e.from, e.to);

  const dispatches = opts.detectBuses ? detectBuses(res) : [];
  const dispatchPair = new Set<string>(); // "callerId->handlerId" rendered as dispatch
  for (const d of dispatches) for (const h of d.handlers) {
    if (funcs.has(d.caller) && funcs.has(h)) push(out, d.caller, h);
  }

  for (const [n, f] of funcs) {
    const { layer, module } = cl.classify(f.pkg);
    layerOf.set(n, layer);
    moduleOf.set(n, module);
    if (LAYERED.has(layer)) included.add(n);
  }
  for (const r of routes) if (r.handler && funcs.has(r.handler)) included.add(r.handler);
  for (const d of dispatches) {
    if (funcs.has(d.caller)) included.add(d.caller);
    for (const h of d.handlers) if (funcs.has(h)) included.add(h);
  }

  if (opts.autoLayer) {
    const entries = new Set<Node>();
    for (const n of included) if (layerOf.get(n) === "controller") entries.add(n);
    for (const r of routes) if (r.handler && funcs.has(r.handler)) entries.add(r.handler);
    const reach = new Set<Node>(entries);
    const q = [...entries];
    while (q.length) {
      const n = q.shift()!;
      for (const c of out.get(n) ?? []) if (!reach.has(c) && funcs.has(c)) { reach.add(c); q.push(c); }
    }
    for (const n of reach) {
      included.add(n);
      if (LAYERED.has(layerOf.get(n)!)) continue;
      if (entries.has(n)) { layerOf.set(n, "controller"); continue; }
      let intermediate = false;
      for (const c of out.get(n) ?? []) if (c !== n && reach.has(c)) { intermediate = true; break; }
      layerOf.set(n, intermediate ? "service" : "repository");
    }
  }

  // Outbound ports: an interface implemented by a repository-layer class. The
  // direct caller -> impl call is replaced by caller -> port (call) and
  // impl -> port (implements).
  type OutPort = { id: string; module: string; label: string; pkg: string; file: string; line: number; col: number; callers: Node[]; impls: Node[] };
  const ports: OutPort[] = [];
  const suppress = new Set<string>();
  if (opts.showPorts) {
    for (const p of res.ports) {
      const impls = p.implMethods.filter((n) => included.has(n));
      const outbound = impls.some((n) => layerOf.get(n) === "repository");
      if (!outbound || impls.length === 0) continue;
      const callers = p.callers.filter((n) => included.has(n));
      const { module } = cl.classify(p.pkg);
      const portID = `port:${p.pkg}.${p.name}`;
      ports.push({ id: portID, module, label: p.name, pkg: p.pkg, file: p.file, line: p.line, col: p.col, callers, impls });
      for (const c of callers) for (const m of impls) suppress.add(funcs.get(c)!.id + "->" + funcs.get(m)!.id);
    }
  }

  const reachInc = (start: Node): Set<Node> => {
    const found = new Set<Node>();
    const visited = new Set<Node>([start]);
    const stack = [start];
    while (stack.length) {
      const n = stack.pop()!;
      for (const c of out.get(n) ?? []) {
        if (visited.has(c)) continue;
        visited.add(c);
        if (included.has(c)) found.add(c);
        else if (funcs.has(c)) stack.push(c);
      }
    }
    return found;
  };

  const id = (n: Node) => funcs.get(n)!.id;
  const routeHandlers = new Set<Node>();
  for (const r of routes) if (r.handler) routeHandlers.add(r.handler);
  for (const d of dispatches) for (const h of d.handlers) {
    if (included.has(d.caller) && included.has(h)) dispatchPair.add(id(d.caller) + "->" + id(h));
    // A command/query handler is application-layer; reclassify off "controller"
    // (its file is often *.handler.ts) unless it is itself a route handler.
    if (included.has(h) && !routeHandlers.has(h) && layerOf.get(h) === "controller") layerOf.set(h, "service");
  }
  const g: Graph = { module: res.module, nodes: [], edges: [] };

  for (const n of included) {
    const f = funcs.get(n)!;
    g.nodes.push({
      id: f.id, kind: "func", label: f.label, layer: layerOf.get(n)!, module: moduleOf.get(n)!,
      pkg: f.pkg, func: f.name, file: f.file, line: f.line, editorURL: editorURL(opts.editor, f.file, f.line, f.col),
    });
  }
  const seen = new Set<string>();
  for (const n of included) for (const m of reachInc(n)) {
    const k = id(n) + "->" + id(m);
    if (id(n) === id(m) || seen.has(k) || suppress.has(k) || dispatchPair.has(k)) continue;
    seen.add(k);
    g.edges.push({ from: id(n), to: id(m), kind: "call" });
  }

  const epSeen = new Set<string>();
  for (const r of routes) {
    const epID = `ep:${r.method}:${r.path}`;
    if (!epSeen.has(epID)) {
      epSeen.add(epID);
      const module = r.handler && funcs.has(r.handler) ? moduleOf.get(r.handler)! : "";
      g.nodes.push({
        id: epID, kind: "endpoint", label: r.path || "(dynamic)", layer: "endpoint", module,
        method: r.method, path: r.path, file: r.file, line: r.line, editorURL: editorURL(opts.editor, r.file, r.line, r.col),
      });
    }
    if (r.handler && included.has(r.handler)) g.edges.push({ from: epID, to: id(r.handler), kind: "route" });
  }

  const dseen = new Set<string>();
  for (const d of dispatches) for (const h of d.handlers) {
    if (!included.has(d.caller) || !included.has(h)) continue;
    const k = id(d.caller) + "->" + id(h);
    if (dseen.has(k)) continue;
    dseen.add(k);
    g.edges.push({ from: id(d.caller), to: id(h), kind: "dispatch" });
  }

  for (const p of ports) {
    g.nodes.push({
      id: p.id, kind: "port", label: p.label, layer: "port", module: p.module,
      pkg: p.pkg, file: p.file, line: p.line, editorURL: editorURL(opts.editor, p.file, p.line, p.col),
    });
    for (const c of p.callers) g.edges.push({ from: funcs.get(c)!.id, to: p.id, kind: "call" });
    for (const m of p.impls) g.edges.push({ from: funcs.get(m)!.id, to: p.id, kind: "implements" });
  }

  pruneIsolated(g);
  pruneDisconnected(g);
  if (opts.lintLayers) lintLayers(g);
  sortGraph(g);
  return g;
}

function pruneIsolated(g: Graph) {
  const deg = new Set<string>();
  for (const e of g.edges) { deg.add(e.from); deg.add(e.to); }
  g.nodes = g.nodes.filter((n) => n.kind !== "func" || deg.has(n.id));
}
function pruneDisconnected(g: Graph) {
  if (!g.nodes.some((n) => n.kind === "endpoint")) return;
  const adj = new Map<string, string[]>();
  for (const e of g.edges) { push(adj, e.from, e.to); push(adj, e.to, e.from); }
  const keep = new Set<string>();
  const q: string[] = [];
  for (const n of g.nodes) if (n.kind === "endpoint") { keep.add(n.id); q.push(n.id); }
  while (q.length) { const n = q.shift()!; for (const m of adj.get(n) ?? []) if (!keep.has(m)) { keep.add(m); q.push(m); } }
  g.nodes = g.nodes.filter((n) => keep.has(n.id));
  g.edges = g.edges.filter((e) => keep.has(e.from) && keep.has(e.to));
}
function sortGraph(g: Graph) {
  const ord = (l: string) => { const i = (LAYER_ORDER as readonly string[]).indexOf(l); return i < 0 ? 99 : i; };
  g.nodes.sort((a, b) => ord(a.layer) - ord(b.layer) || a.module.localeCompare(b.module) || a.label.localeCompare(b.label));
  g.edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.kind.localeCompare(b.kind));
}

const LAYER_RANK: Record<string, number> = {
  endpoint: 0, controller: 1, service: 2, port: 3, repository: 4, other: 5,
};

// lintLayers marks architecture smells on call edges: a backward dependency
// (reverse), a controller reaching the repository past the service (skip), or a
// call into another module's internals (cross-module).
function lintLayers(g: Graph) {
  const node = new Map(g.nodes.map((n) => [n.id, n]));
  const classified = (l: string) => l === "controller" || l === "service" || l === "repository";
  for (const e of g.edges) {
    if (e.kind !== "call") continue;
    const a = node.get(e.from), b = node.get(e.to);
    if (!a || !b || !classified(a.layer) || !classified(b.layer)) continue;
    if (LAYER_RANK[b.layer] < LAYER_RANK[a.layer]) e.violation = "reverse";
    else if (a.layer === "controller" && b.layer === "repository") e.violation = "skip";
    else if (a.module && b.module && a.module !== b.module) e.violation = "cross-module";
  }
}
