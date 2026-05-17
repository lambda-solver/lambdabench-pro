# LamBench Pro

A lambda calculus benchmark leaderboard for AI models. Evaluates the top OpenRouter models weekly on 120 lambda calculus tasks and publishes results as a Solarized/Vim-style tabbed leaderboard on GitHub Pages.

**Live site:** https://lambda-solver.github.io/lambdabench-pro/

## What It Does

- **Benchmarks AI models** on 120 lambda calculus tasks (identity, church numerals, booleans, BLC encoding, etc.) using a pure Bun interpreter — no external binary needed
- **Fetches the top 2 models** automatically from OpenRouter rankings each week
- **Publishes results** as a static React app on GitHub Pages with six leaderboard panels
- **Tracks over time** by committing `results.json` to the repo after each run

## Leaderboard Panels

| Tab             | Metric                                          |
| --------------- | ----------------------------------------------- |
| `:intelligence` | Models ranked by pass rate (problems solved)    |
| `:speed`        | Models ranked by average response time          |
| `:elegance`     | Models ranked by solution brevity vs. reference |
| `:value`        | Pass rate per dollar (cost efficiency)          |
| `:problems`     | Browse tasks by category, click for details     |
| `:matrix`       | Full model × task pass/fail grid                |

## Project Structure

```
.
├── apps/
│   ├── client/                  # React leaderboard UI (Vite + Effect Atom)
│   │   └── public/data/
│   │       └── results.json     # Committed benchmark results (seed data included)
│   └── server/                  # Effect Platform HTTP API + CLI + MCP
│       ├── src/
│       │   ├── index.ts         # Entry point (server / cli / mcp modes)
│       │   ├── localServer.ts   # Bun HTTP server with static SPA serving
│       │   ├── httpApi.ts       # Typed REST API (HttpApiBuilder)
│       │   ├── cli.ts           # CLI client for the API
│       │   ├── mcp.ts           # MCP server for AI agent integration
│       │   ├── runtime.ts       # Service layer composition
│       │   ├── client/
│       │   │   └── LamBenchClient.ts  # Typed HTTP client service
│       │   ├── services/
│       │   │   ├── ResultStore.ts     # SQLite CRUD + retention (bun:sqlite)
│       │   │   ├── TaskService.ts     # Load .tsk/.lam files into DB
│       │   │   ├── EvalService.ts     # Single evaluation orchestration
│       │   │   ├── BatchService.ts    # Batch job creation + execution
│       │   │   └── LamConfig.ts       # Environment configuration
│       │   └── ...
│       └── package.json
├── packages/
│   └── domain/                  # Shared Effect Schema types (BenchmarkData, Ranking, Api, etc.)
├── reference/
│   └── lambench/                # Benchmark runner (standalone Bun scripts)
│       ├── src/
│       │   ├── lamb.ts          # Pure Bun lambda calculus interpreter
│       │   ├── lamb.test.ts     # 19 unit tests
│       │   ├── check.ts         # Evaluates model outputs against tasks
│       │   └── eval-runner.ts   # Fetches top models from OpenRouter
│       └── scripts/
│           ├── build-results.ts # Writes apps/client/public/data/results.json
│           └── seed-data.ts     # Generates mock results for local dev
└── .github/
    └── workflows/
        └── benchmark.yml        # Weekly CI: eval → commit → Pages deploy
```

## Quick Start

```bash
# Install monorepo dependencies
bun install

# Start the full stack (client:3000 + server:9000)
bun dev

# Or start individually
bun dev --filter=client   # UI only (port 3000)
bun dev --filter=server   # API server only (port 9000)
```

Open http://localhost:3000 — the UI loads from the committed `results.json` seed data, no API key needed.

## Running the Benchmark Locally

### Legacy standalone runner

```bash
cd reference/lambench
bun install

# Copy env and configure
cp .env.example .env
# Edit .env: set DEV_MODE=true for mock data, or add OPENROUTER_API_KEY for real runs

# Run the full pipeline
bun src/eval-runner.ts       # Fetch/resolve top models
bun src/check.ts             # Evaluate model outputs
bun scripts/build-results.ts # Write results.json
```

### Server + API (recommended)

```bash
# Start the API server
bun dev --filter=server

# In another terminal, use the CLI
bun apps/server/src/index.ts cli eval single minimax/minimax-m2.5:free task-id
bun apps/server/src/index.ts cli eval batch model1 model2 --tasks=task1,task2
bun apps/server/src/index.ts cli results
bun apps/server/src/index.ts cli tasks
```

### Environment Variables

| Variable             | Default                           | Description                                                     |
| -------------------- | --------------------------------- | --------------------------------------------------------------- |
| `DEV_MODE`           | `true`                            | Skip live fetch, use mock models — no API key needed            |
| `OPENROUTER_API_KEY` | —                                 | Required for all LLM calls                                      |
| `TOP_MODELS`         | —                                 | Comma-separated model IDs to override auto-fetch                |
| `VITE_BASE_URL`      | `/`                               | Base path for the client (set to `/lambdabench-pro/` for Pages) |
| `LAMBENCH_PORT`      | `9000`                            | API server port                                                 |
| `LAMBENCH_DB_PATH`   | `.lambench-data/benchmark.sqlite` | SQLite database path                                            |
| `LAMBENCH_API_URL`   | `http://127.0.0.1:9000`           | Base URL for CLI client                                         |

## HTTP API

The server exposes a typed REST API built with Effect `HttpApiBuilder`. OpenAPI spec is available at `http://localhost:9000/openapi.json`.

### Endpoints

| Group   | Method | Path                      | Description                    |
| ------- | ------ | ------------------------- | ------------------------------ |
| health  | GET    | `/api/health`             | Server status, version, uptime |
| eval    | POST   | `/api/eval/single`        | Run a single evaluation        |
| eval    | POST   | `/api/eval/batch`         | Create a batch evaluation job  |
| eval    | GET    | `/api/eval/status/:jobId` | Get batch job status           |
| results | GET    | `/api/results`            | List rankings                  |
| results | GET    | `/api/results/:runId`     | Result detail by run ID        |
| tasks   | GET    | `/api/tasks`              | List all tasks                 |
| tasks   | GET    | `/api/tasks/:taskId`      | Task detail by ID              |
| models  | GET    | `/api/models`             | List active model configs      |
| models  | POST   | `/api/models/test`        | Test a model connection        |

### Example: Single Evaluation

```bash
curl -X POST http://localhost:9000/api/eval/single \
  -H "Content-Type: application/json" \
  -d '{
    "model": "minimax/minimax-m2.5:free",
    "task": "church-numeral-2",
    "variant": "standard",
    "provider": "openrouter",
    "maxTokens": 4096,
    "rlmMaxDepth": 3,
    "mode": "direct"
  }'
```

### Example: Batch Evaluation

```bash
curl -X POST http://localhost:9000/api/eval/batch \
  -H "Content-Type: application/json" \
  -d '{
    "models": ["model-a", "model-b"],
    "tasks": ["task-1", "task-2"],
    "variant": "both",
    "concurrency": 2,
    "mode": "direct"
  }'
```

## CLI

The `cli.ts` module provides a command-line interface to the HTTP API via `LamBenchClient`.

```bash
bun apps/server/src/index.ts cli <command> [options]
```

### Commands

| Command                                                                                     | Description                        |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `eval single <model> <task> [--variant=standard\|rlm] [--provider=openrouter\|opencode-go]` | Run single evaluation              |
| `eval batch <models...> [--tasks=<task1,task2>] [--variant=both\|standard\|rlm]`            | Run batch evaluation               |
| `status <jobId>`                                                                            | Check batch job status             |
| `results [--model=<model>] [--task=<task>] [--limit=<n>]`                                   | List results with optional filters |
| `tasks [--task=<taskId>]`                                                                   | List tasks or get task detail      |
| `models`                                                                                    | List active model configs          |
| `server`                                                                                    | Print server start hint            |
| `gepa optimize <taskId>`                                                                    | GEPA optimizer (placeholder)       |

### Example

```bash
bun apps/server/src/index.ts cli eval single minimax/minimax-m2.5:free church-numeral-2 --variant=standard
bun apps/server/src/index.ts cli eval batch model1 model2 --tasks=task1,task2 --variant=both
bun apps/server/src/index.ts cli results --limit=10
```

## MCP Server

A Model Context Protocol (MCP) server is available for AI agent integration.

```bash
bun apps/server/src/index.ts mcp
```

### Available Tools

| Tool                            | Description                        | Readonly |
| ------------------------------- | ---------------------------------- | -------- |
| `lambench_eval_single`          | Run a single benchmark evaluation  | No       |
| `lambench_list_tasks`           | List all available tasks           | Yes      |
| `lambench_list_results`         | List results with optional filters | Yes      |
| `lambench_get_task`             | Get full task details              | Yes      |
| `lambench_list_prompt_versions` | List GEPA prompt versions          | Yes      |
| `lambench_trigger_gepa`         | Trigger GEPA optimization          | No       |

## CI / GitHub Pages

The `benchmark.yml` workflow runs every **Monday at 04:00 UTC** (and on `workflow_dispatch`):

1. Fetches the top 2 models from OpenRouter
2. Runs all 120 lambda calculus tasks against each model
3. Commits updated `results.json` to `main`
4. Builds the Vite client with `VITE_BASE_URL=/lambdabench-pro/`
5. Deploys to GitHub Pages

To trigger a deploy without running the benchmark (e.g. after a UI change), use `workflow_dispatch` with `skip_benchmark: true`.

To set up in your own fork:

1. Add `OPENROUTER_API_KEY` as a repository secret (`Settings → Secrets → Actions`)
2. Enable GitHub Pages via Actions (`Settings → Pages → Source: GitHub Actions`)

## Tech Stack

| Layer                | Technology                                                 |
| -------------------- | ---------------------------------------------------------- |
| Runtime              | Bun 1.2+                                                   |
| Language             | TypeScript 5.9                                             |
| UI framework         | React 19 + Vite 8                                          |
| State management     | Effect Atom (`@effect/atom-react`)                         |
| Schema / validation  | Effect Schema 4-beta                                       |
| HTTP API             | Effect Platform (`@effect/platform-bun`, `HttpApiBuilder`) |
| Database             | SQLite via `bun:sqlite` (WAL mode)                         |
| Styling              | Tailwind CSS 4 + Solarized palette                         |
| Monorepo             | Turborepo                                                  |
| Linting / formatting | Biome 2.4                                                  |
| Tests                | Vitest 4 (38 unit tests)                                   |

## Development Commands

| Command                         | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `bun install`                   | Install all dependencies                     |
| `bun dev`                       | Start full stack (client:3000 + server:9000) |
| `bun dev --filter=client`       | Start UI dev server (port 3000, HMR)         |
| `bun dev --filter=server`       | Start API server with watch mode (port 9000) |
| `bun run build --filter=client` | Production build                             |
| `bun run build --filter=server` | Compile server to `dist/`                    |
| `bun test`                      | Run all tests (Vitest)                       |
| `bun test --filter=server`      | Run server tests only                        |
| `bun lint`                      | Lint with Biome                              |
| `bun format`                    | Format with Biome                            |
| `bun run type-check`            | TypeScript check across all packages         |

> **Tip:** Run `bun dev --filter=client` in a separate terminal while using OpenCode. Vite's HMR picks up every file save and updates the browser in ~100 ms.

## Contributing Guidelines

### Lint Rules (Enforced in CI)

The following Biome rules are enforced at error level. Code must pass `bun lint` before merging:

| Rule              | What it means                            | Pattern to use                                                                          |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `noArrayIndexKey` | Never use `key={i}` in React `.map()`    | Use content-based keys (`key={item.id}`) or inline static arrays                        |
| `useLiteralKeys`  | Prefer dot notation for known properties | `obj.field` for known keys; `obj["dynamic"]` only for `Record<string, …>` index access  |
| `noExplicitAny`   | Ban the `any` type                       | Use `unknown` + `as unknown as T` for necessary coercion                                |
| `useYield`        | Only use `yield*` inside generators      | Simple mock returns should be plain arrows, not `Effect.fnUntraced(function* () { … })` |

### Type-Safe Environment Variables

Declare known env vars in a global `NodeJS.ProcessEnv` augmentation so TypeScript validates access and Biome's `useLiteralKeys` rule accepts dot notation:

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly OPENROUTER_API_KEY?: string;
      readonly LAMBENCH_PORT?: string;
      readonly DEV_MODE?: string;
    }
  }
}

// Now dot notation is type-safe and lint-clean:
const apiKey = process.env.OPENROUTER_API_KEY;
```

### Testing with Effect

Use `it.layer()` for shared test dependencies instead of repeating `.pipe(Effect.provide(...))`:

```typescript
const myLayer = Layer.effect(MyService, MyService.make);

describe("MyService", () => {
  it.layer(myLayer)((it) => {
    it.effect("does something", () =>
      Effect.gen(function*() {
        const service = yield* MyService;
        // ...
      }));
  });
});
```

### Mock Services in Tests

Use plain arrow functions returning Effects. Only use `Effect.fnUntraced` when the mock contains `yield*`:

```typescript
// GOOD — plain arrow returning Effect
const mockService = Layer.succeed(
  MyService,
  MyService.of({
    method: () => Effect.succeed({ status: "ok" }),
  }),
);

// BAD — unnecessary generator for a pure return
method: Effect.fnUntraced(function* () { return { status: "ok" }; }),
```

## Learn More

- [Effect](https://effect.website/docs/introduction)
- [OpenRouter](https://openrouter.ai)
- [Original LamBench](https://github.com/VictorTaelin/lambench)
- [Turborepo](https://turborepo.com/docs)
