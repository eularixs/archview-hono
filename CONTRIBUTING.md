# Contributing to archview (TypeScript)

TypeScript port of [archview](https://github.com/eularixs/archview); the docs
live in [archview-docs](https://github.com/eularixs/archview-docs).

## Develop

```sh
bun install
bun run build    # tsc --noEmit, must pass
bun test
```

## Principle

Emit the **same `graph.json` schema** as the Go version so the shared UI renders
it unchanged. New analysis features ship opt-in via `Options` with an example.

By contributing you agree your contributions are MIT-licensed.
