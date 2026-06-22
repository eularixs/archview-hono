import { Hono } from "hono";
import type { Graph } from "./graph.js";
import { INDEX_HTML_B64 } from "./web/html.js";

const page = (basePath: string) =>
  Buffer.from(INDEX_HTML_B64, "base64").toString("utf8").replaceAll("__BASE__", basePath);

/** Build a Hono app that serves the archview UI for a pre-built graph. */
export function graphApp(basePath: string, graph: Graph): Hono {
  const base = "/" + basePath.replace(/^\/+|\/+$/g, "");
  const html = page(base);
  const app = new Hono();
  app.get(base, (c) => c.html(html));
  app.get(base + "/data", (c) => c.json(graph));
  return app;
}
