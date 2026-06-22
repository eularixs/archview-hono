import { Hono } from "hono";
import type { Graph } from "./graph.js";
import { type Options, resolve } from "./options.js";
import { graphApp } from "./web.js";

export type { Options } from "./options.js";
export type { Graph, Node, Edge } from "./graph.js";

/** Analyze a project and return a Hono app serving the /graph UI. */
export function archview(opts: Options = {}): Hono {
  const o = resolve(opts);
  // F1 will replace this with real ts-morph analysis.
  const graph: Graph = analyze(o.root);
  return graphApp(o.basePath, graph);
}

// Placeholder until F1 (ts-morph analysis) lands.
function analyze(_root: string): Graph {
  return { module: "", nodes: [], edges: [] };
}
