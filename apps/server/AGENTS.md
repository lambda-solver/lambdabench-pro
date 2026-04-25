# Server AGENTS.md

> See root `/AGENTS.md` for monorepo conventions.

## Commands

| Command                     | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `bun dev --filter=server`   | Start server with watch mode                 |
| `bun run build --filter=server` | Compile to `dist/`                       |
| `bun run type-check`        | TypeScript check                             |

## Stack

- **Runtime**: Bun
- **Effect**: `@effect/platform-bun` — `BunRuntime`, `BunServices`, `BunFileSystem`, `BunHttpClient`
- **No browser code** — this workspace is Bun-only; never import Vite/React here

## Structure

```
src/
└── main.ts    # Entry point — BunRuntime.runMain
```

## Patterns

```typescript
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path } from "effect";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  // ...
});

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
```

- Use `FileSystem` (from `effect`) + `BunFileSystem.layer` for all file I/O
- Use `ChildProcess` (from `effect/unstable/process`) for subprocess execution
- Use `BunHttpClient` for outbound HTTP
- Use `BunRuntime.runMain` as the single entry point — never `Effect.runPromise` directly
