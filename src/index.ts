import { Hono } from "hono";
import type { Graph } from "./graph.js";
import { type Options, resolve } from "./options.js";
import { graphApp } from "./web.js";
import { load } from "./analyzer.js";
import { extractRoutes } from "./routes.js";
import { Classifier } from "./classify.js";
import { buildGraph } from "./build.js";

export type { Options } from "./options.js";
export type { Graph, Node, Edge } from "./graph.js";

/** Analyze a TypeScript project and build its architecture graph. */
export function analyze(opts: Options = {}): Graph {
  const o = resolve(opts);
  const res = load(o.root);
  const routes = extractRoutes(res);
  const cl = new Classifier();
  return buildGraph(res, routes, cl, o);
}

/** Analyze a project and return a Hono app serving the /graph UI. */
export function archview(opts: Options = {}): Hono {
  const o = resolve(opts);
  return graphApp(o.basePath, analyze(opts));
}
