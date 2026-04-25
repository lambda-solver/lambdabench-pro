# Server AGENTS.md

> See root `/AGENTS.md` for monorepo conventions.

## Commands

| Command                         | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `bun dev --filter=server`       | Start server with watch mode                           |
| `bun run build --filter=server` | Compile to `dist/`                                     |
| `bun run type-check`            | TypeScript check                                       |
| `bun src/index.ts eval`         | Fetch top models → `top-models.json`                   |
| `bun src/index.ts run`          | Run standard + λ-RLM eval for all models → `res/*.txt` |
| `bun src/index.ts build`        | Aggregate `res/*.txt` → `results.json`                 |

## Env vars (run command)

| Variable            | Default                      | Purpose                          |
| ------------------- | ---------------------------- | -------------------------------- |
| `OPENROUTER_API_KEY`| —                            | Required for all LLM calls       |
| `LLM_MODEL`         | `minimax/minimax-m2.5:free`  | Model to evaluate                |
| `RLM_MAX_DEPTH`     | `3`                          | λ-RLM self-correction iterations |

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
