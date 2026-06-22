import { expect, test } from "bun:test";
import { analyze } from "../src/index.js";

test("hono-mvc: endpoint -> controller -> service -> repository", () => {
  const g = analyze({ root: "./examples/hono-mvc" });
  const byLayer = (l: string) => g.nodes.filter((n) => n.layer === l).length;
  expect(byLayer("endpoint")).toBe(2);
  expect(byLayer("controller")).toBe(2);
  expect(byLayer("service")).toBe(2);
  expect(byLayer("repository")).toBe(2);
  // flow connectivity
  const g2 = analyze({ root: "./examples/hono-mvc", showPorts: true });
  expect(g2.nodes.filter((n) => n.layer === "port").length).toBe(1);
  expect(g2.edges.some((e) => e.kind === "implements")).toBe(true);
  const kinds = new Set(g.edges.map((e) => e.kind));
  expect(kinds.has("route")).toBe(true);
  expect(kinds.has("call")).toBe(true);
});
