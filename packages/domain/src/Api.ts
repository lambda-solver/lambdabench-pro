import { Effect, Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";
import {
  BatchJob,
  BenchmarkData,
  BenchmarkTask,
  EvalResult,
  ModelConfig,
} from "./Benchmark";

// ============================================================================
// Request / Response Schemas
// ============================================================================

export const SingleEvalRequest = Schema.Struct({
  model: Schema.String,
  task: Schema.String,
  variant: Schema.Literals(["standard", "rlm"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("standard" as const)),
  ),
  provider: Schema.Literals(["openrouter", "opencode-go"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("openrouter" as const)),
  ),
  maxTokens: Schema.Number.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(4096)),
  ),
  rlmMaxDepth: Schema.Number.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(3)),
  ),
  mode: Schema.Literals(["direct", "agent"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("direct" as const)),
  ),
});
export type SingleEvalRequest = Schema.Schema.Type<typeof SingleEvalRequest>;

export const BatchEvalRequest = Schema.Struct({
  models: Schema.Array(Schema.String),
  tasks: Schema.Array(Schema.String).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed([] as const)),
  ),
  variant: Schema.Literals(["standard", "rlm", "both"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("both" as const)),
  ),
  concurrency: Schema.Number.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(2)),
  ),
  mode: Schema.Literals(["direct", "agent", "both"]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed("both" as const)),
  ),
});
export type BatchEvalRequest = Schema.Schema.Type<typeof BatchEvalRequest>;

export const HealthStatus = Schema.Struct({
  status: Schema.Literals(["ok", "degraded"]),
  version: Schema.String,
  db: Schema.Literals(["connected", "disconnected"]),
  uptimeSeconds: Schema.Number,
});
export type HealthStatus = Schema.Schema.Type<typeof HealthStatus>;

export const ModelTestRequest = Schema.Struct({
  provider: Schema.Literals(["openrouter", "opencode-go"]),
  model: Schema.String,
});
export type ModelTestRequest = Schema.Schema.Type<typeof ModelTestRequest>;

export const ModelTestResponse = Schema.Struct({
  latencyMs: Schema.Number,
  ok: Schema.Boolean,
});
export type ModelTestResponse = Schema.Schema.Type<typeof ModelTestResponse>;

// ============================================================================
// API Groups
// ============================================================================

export class HealthGroup extends HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("get", "/health", { success: HealthStatus }))
  .prefix("/api") {}

export class EvalGroup extends HttpApiGroup.make("eval")
  .add(
    HttpApiEndpoint.post("single", "/eval/single", {
      success: EvalResult,
      payload: SingleEvalRequest,
    }),
  )
  .add(
    HttpApiEndpoint.post("batch", "/eval/batch", {
      success: BatchJob,
      payload: BatchEvalRequest,
    }),
  )
  .add(
    HttpApiEndpoint.get("status", "/eval/status/:jobId", {
      success: BatchJob,
      params: Schema.Struct({ jobId: Schema.String }),
    }),
  )
  .prefix("/api") {}

export class ResultsGroup extends HttpApiGroup.make("results")
  .add(HttpApiEndpoint.get("list", "/results", { success: BenchmarkData }))
  .add(
    HttpApiEndpoint.get("detail", "/results/:runId", {
      success: EvalResult,
      params: Schema.Struct({ runId: Schema.String }),
    }),
  )
  .prefix("/api") {}

export class TasksGroup extends HttpApiGroup.make("tasks")
  .add(
    HttpApiEndpoint.get("list", "/tasks", {
      success: Schema.Array(BenchmarkTask),
    }),
  )
  .add(
    HttpApiEndpoint.get("detail", "/tasks/:taskId", {
      success: BenchmarkTask,
      params: Schema.Struct({ taskId: Schema.String }),
    }),
  )
  .prefix("/api") {}

export class ModelsGroup extends HttpApiGroup.make("models")
  .add(
    HttpApiEndpoint.get("list", "/models", {
      success: Schema.Array(ModelConfig),
    }),
  )
  .add(
    HttpApiEndpoint.post("test", "/models/test", {
      success: ModelTestResponse,
      payload: ModelTestRequest,
    }),
  )
  .prefix("/api") {}

export const Api = HttpApi.make("Api")
  .add(HealthGroup)
  .add(EvalGroup)
  .add(ResultsGroup)
  .add(TasksGroup)
  .add(ModelsGroup);
