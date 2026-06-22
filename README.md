# archview (TypeScript / Hono)

Live architecture flow graph for TypeScript backends — the TypeScript port of
[archview](https://github.com/eularixs/archview). Mount it in your app, open
`/graph`, and watch endpoints flow through controller → service → repository,
inferred from your source via [ts-morph](https://ts-morph.com).

Shares the UI, graph schema, and docs with the Go version. Framework-agnostic
(Hono, Express, Fastify, Elysia, …) and pattern-aware.

> Status: **early** — F0 done (scaffold, graph model, UI, serve). Analysis
> (ts-morph) in progress. See [`docs`](https://github.com/eularixs/archview-docs).

## Usage (Hono)

```ts
import { Hono } from "hono";
import { archview } from "@eularix/archview";

const app = new Hono();
// ... your routes ...
app.route("/", archview({ root: ".", showPorts: true }));
```

Open `/graph`.

## Develop

```sh
bun install
bun run build   # tsc --noEmit
bun test
```
