# Server AGENTS.md

> See root `/AGENTS.md` for monorepo conventions.

## Commands

| Command                         | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `bun dev --filter=server`       | Start server with watch mode (port 9000)               |
| `bun run build --filter=server` | Compile to `dist/`                                     |
| `bun run type-check`            | TypeScript check                                       |
| `bun test --filter=server`      | Run server tests (Vitest)                              |
| `bun src/index.ts server`       | Launch HTTP API server                                 |
| `bun src/index.ts cli <cmd>`    | Run CLI commands against the API                       |
| `bun src/index.ts mcp`          | Launch MCP server (stdio)                              |
| `bun src/index.ts eval`         | Fetch top models → `top-models.json`                   |
| `bun src/index.ts run`          | Run standard + λ-RLM eval for all models → `res/*.txt` |
| `bun src/index.ts build`        | Aggregate `res/*.txt` → `results.json`                 |

## Env vars

| Variable             | Default                           | Purpose                          |
| -------------------- | --------------------------------- | -------------------------------- |
| `OPENROUTER_API_KEY` | —                                 | Required for all LLM calls       |
| `LLM_MODEL`          | `minimax/minimax-m2.5:free`       | Model to evaluate                |
| `RLM_MAX_DEPTH`      | `3`                               | λ-RLM self-correction iterations |
| `LAMBENCH_PORT`      | `9000`                            | API server port                  |
| `LAMBENCH_DB_PATH`   | `.lambench-data/benchmark.sqlite` | SQLite database path             |
| `LAMBENCH_API_URL`   | `http://127.0.0.1:9000`           | Base URL for CLI client          |
| `DEV_MODE`           | `false`                           | Skip live fetch, use mock data   |
| `TOP_MODELS`         | —                                 | Comma-separated fallback models  |
| `EVAL_CONCURRENCY`   | `4`                               | Single-eval concurrency          |
| `BATCH_CONCURRENCY`  | `2`                               | Batch-eval concurrency           |
| `RETENTION_DAYS`     | `90`                              | SQLite retention window          |
| `MAX_DB_SIZE_MB`     | `1024`                            | Max SQLite size before cleanup   |

## Stack

- **Runtime**: Bun
- **Effect**: `@effect/platform-bun` — `BunRuntime`, `BunServices`, `BunFileSystem`, `BunHttpClient`
- **Database**: `bun:sqlite` with WAL mode, migrations via `ResultStore`
- **HTTP API**: `effect/unstable/httpapi` — `HttpApiBuilder`, typed endpoints, OpenAPI
- **MCP**: `effect/unstable/ai` — `McpServer`, `Toolkit`, `Tool`
- **No browser code** — this workspace is Bun-only; never import Vite/React here

## Structure

```
src/
├── index.ts              # Entry point — routes to server / cli / mcp / legacy eval|run|build
├── localServer.ts        # Bun HTTP server (API + static SPA)
├── httpApi.ts            # HttpApiBuilder groups (health, eval, results, tasks, models)
├── httpApi.test.ts       # API endpoint tests with mock layers
├── cli.ts                # CLI commands via LamBenchClient
├── mcp.ts                # MCP server with lambench tools
├── runtime.ts            # Service layer composition (Batch, Eval, Task, ResultStore)
├── client/
│   └── LamBenchClient.ts # Typed HTTP client service for the API
└── services/
    ├── LamConfig.ts      # Environment config with proxy-based caching
    ├── ResultStore.ts    # SQLite CRUD, retention, WAL mode
    ├── TaskService.ts    # Load .tsk/.lam files into SQLite
    ├── EvalService.ts    # Single evaluation orchestration
    └── BatchService.ts   # Batch job creation, execution, resume
```

## Patterns

### Entry point routing

```typescript
// index.ts dispatches by argv[2]
const mode = process.argv[2];
if (mode === "server") {
  /* launch HTTP server */
} else if (mode === "cli") {
  /* run CLI commands */
} else if (mode === "mcp") {
  /* launch MCP server */
} else {
  /* legacy eval/run/build pipeline */
}
```

### Bun HTTP server with static SPA

```typescript
import { BunServices } from "@effect/platform-bun";
import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { Layer } from "effect";
import * as HttpMiddleware from "effect/unstable/http/HttpMiddleware";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpStaticServer from "effect/unstable/http/HttpStaticServer";

const StaticLayer = HttpStaticServer.layer({
  root: CLIENT_DIST_DIR,
  spa: true,
});

export const ServerLive = HttpRouter.serve(Layer.mergeAll(ApiLayer, StaticLayer), {
  middleware: HttpMiddleware.tracer,
}).pipe(
  Layer.provide(ServicesLive),
  Layer.provide(BunServices.layer),
  Layer.provide(BunHttpServer.layer({ port: 9000, hostname: "127.0.0.1" })),
);
```

### HttpApiBuilder groups

```typescript
const MyGroupLive = HttpApiBuilder.group(Api, "myGroup", (handlers) =>
  handlers
    .handle("list", () => Effect.succeed([{ id: "1" }]))
    .handle("detail", ({ params }) =>
      params.id === "1"
        ? Effect.succeed({ id: "1" })
        : Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { error: "Not found" },
              {
                status: 404,
              },
            ),
          ),
    ),
);

export const ApiLayer = HttpApiBuilder.layer(Api, {
  openapiPath: "/openapi.json",
}).pipe(Layer.provide(MyGroupLive));
```

### Service layer composition

```typescript
export const makeServicesLayer = (dbPath: string) => {
  validateDbPath(dbPath);
  return BatchServiceLive.pipe(
    Layer.provideMerge(EvalServiceLive),
    Layer.provideMerge(TaskServiceLive),
    Layer.provideMerge(ResultStoreLive(dbPath)),
  );
};
```

### Typed HTTP client service

```typescript
export class LamBenchClient extends Context.Service<
  LamBenchClient,
  {
    health(): Effect.Effect<HealthStatus, ApiError>;
    evalSingle(request: SingleEvalRequest): Effect.Effect<EvalResult, ApiError>;
    // ...
  }
>()("app/LamBenchClient") {
  static readonly layer = (baseUrl: string) =>
    Layer.effect(
      LamBenchClient,
      Effect.gen(function* () {
        const client = (yield* HttpClient.HttpClient).pipe(
          HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
          HttpClient.filterStatusOk,
        );
        // ... implement methods
      }),
    ).pipe(Layer.provide(FetchHttpClient.layer));
}
```

### MCP Toolkit

```typescript
const MyTool = Tool.make("my_tool", {
  description: "Does something",
  parameters: Schema.Struct({ id: Schema.String }),
  success: Schema.Unknown,
});

export const MyToolkit = Toolkit.make(MyTool);

const ToolHandlers = MyToolkit.toLayer(
  Effect.gen(function* () {
    return { my_tool: (input) => Effect.succeed({ result: input.id }) };
  }),
);

export const ServerLayer = McpServer.toolkit(MyToolkit).pipe(
  Layer.provideMerge(ToolHandlers),
  Layer.provide(LamBenchClient.layer("http://127.0.0.1:9000")),
  Layer.provide(McpServer.layerStdio({ name: "my-server", version: "1.0.0" })),
  Layer.provide(BunStdio.layer),
);
```

### Testing with mock layers

```typescript
const mockEvalService = Layer.succeed(EvalService, EvalService.of({
  evaluateSingle: () => Effect.succeed({ ... } as EvalResult),
}));

const TestLayer = ApiLayer.pipe(
  Layer.provide(mockEvalService),
  Layer.provide(mockBatchService),
  Layer.provide(HttpRouter.layer),
  Layer.provide(BunHttpServer.layerHttpServices),
);
```

### General rules

- Use `FileSystem` (from `effect`) + `BunFileSystem.layer` for all file I/O
- Use `ChildProcess` (from `effect/unstable/process`) for subprocess execution
- Use `BunHttpClient` for outbound HTTP
- Use `BunRuntime.runMain` as the single entry point — never `Effect.runPromise` directly
- Use `Context.Service` for service definitions
- Use `Effect.fn("Name")(fn)` for all exported named functions
- Use `Effect.fnUntraced(fn)` for internal/private helpers
- HTTP headers are **lowercased** by Effect: `headers["authorization"]` not `headers["Authorization"]`
