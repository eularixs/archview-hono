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

test("cqrs: dispatch routes controller -> command handler -> repo", () => {
  const g = analyze({ root: "./examples/cqrs", detectBuses: true });
  const layer = (l: string) => g.nodes.filter((n) => n.layer === l).map((n) => n.label);
  expect(layer("controller")).toContain("(UserController).create");
  expect(layer("service")).toContain("(CreateUserHandler).execute");
  expect(layer("repository")).toContain("(UserRepo).save");
  expect(g.edges.some((e) => e.kind === "dispatch")).toBe(true);
});

test("trpc: query/mutation procedures become endpoints -> service -> repo", () => {
  const g = analyze({ root: "./examples/trpc" });
  const eps = g.nodes.filter((n) => n.kind === "endpoint");
  expect(eps.some((e) => e.method === "QUERY" && e.path === "/listUsers")).toBe(true);
  expect(eps.some((e) => e.method === "MUTATION" && e.path === "/createUser")).toBe(true);
  expect(g.nodes.filter((n) => n.layer === "service").length).toBe(2);
  expect(g.nodes.filter((n) => n.layer === "repository").length).toBe(2);
});

test("nestjs: @Controller/@Get/@Post methods become endpoints", () => {
  const g = analyze({ root: "./examples/nest" });
  const eps = g.nodes.filter((n) => n.kind === "endpoint").map((e) => `${e.method} ${e.path}`);
  expect(eps).toContain("GET /users");
  expect(eps).toContain("GET /users/:id");
  expect(eps).toContain("POST /users");
  expect(g.nodes.filter((n) => n.layer === "service").length).toBe(2);
});

test("websocket: upgradeWebSocket route is labeled WS", () => {
  const g = analyze({ root: "./examples/ws" });
  const eps = g.nodes.filter((n) => n.kind === "endpoint");
  expect(eps.some((e) => e.method === "WS" && e.path === "/ws")).toBe(true);
  expect(eps.some((e) => e.method === "GET" && e.path === "/health")).toBe(true);
});
