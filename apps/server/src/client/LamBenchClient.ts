import type { BatchEvalRequest, ModelTestRequest, SingleEvalRequest } from "@repo/domain/Api";
import { BatchJob, BenchmarkData, BenchmarkTask, EvalResult, ModelConfig } from "@repo/domain/Benchmark";
import { Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http";
import { HealthStatus, ModelTestResponse } from "@repo/domain/Api";

export class ApiError {
  readonly _tag = "ApiError" as const;

  constructor(readonly cause: unknown) {}
}

export class LamBenchClient extends Context.Service<
  LamBenchClient,
  {
    health(): Effect.Effect<HealthStatus, ApiError>;
    evalSingle(request: SingleEvalRequest): Effect.Effect<EvalResult, ApiError>;
    evalBatch(request: BatchEvalRequest): Effect.Effect<BatchJob, ApiError>;
    evalStatus(jobId: string): Effect.Effect<BatchJob, ApiError>;
    results(): Effect.Effect<BenchmarkData, ApiError>;
    resultDetail(runId: string): Effect.Effect<EvalResult, ApiError>;
    tasks(): Effect.Effect<ReadonlyArray<BenchmarkTask>, ApiError>;
    taskDetail(taskId: string): Effect.Effect<BenchmarkTask, ApiError>;
    models(): Effect.Effect<ReadonlyArray<ModelConfig>, ApiError>;
    testModel(request: ModelTestRequest): Effect.Effect<ModelTestResponse, ApiError>;
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

        const health = (): Effect.Effect<HealthStatus, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get("/api/health");
            return yield* HttpClientResponse.schemaBodyJson(HealthStatus)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const evalSingle = (request: SingleEvalRequest): Effect.Effect<EvalResult, ApiError> =>
          Effect.gen(function* () {
            const req = HttpClientRequest.post("/api/eval/single").pipe(HttpClientRequest.bodyJsonUnsafe(request));
            const response = yield* client.execute(req);
            return yield* HttpClientResponse.schemaBodyJson(EvalResult)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const evalBatch = (request: BatchEvalRequest): Effect.Effect<BatchJob, ApiError> =>
          Effect.gen(function* () {
            const req = HttpClientRequest.post("/api/eval/batch").pipe(HttpClientRequest.bodyJsonUnsafe(request));
            const response = yield* client.execute(req);
            return yield* HttpClientResponse.schemaBodyJson(BatchJob)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const evalStatus = (jobId: string): Effect.Effect<BatchJob, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get(`/api/eval/status/${jobId}`);
            return yield* HttpClientResponse.schemaBodyJson(BatchJob)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const results = (): Effect.Effect<BenchmarkData, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get("/api/results");
            return yield* HttpClientResponse.schemaBodyJson(BenchmarkData)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const resultDetail = (runId: string): Effect.Effect<EvalResult, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get(`/api/results/${runId}`);
            return yield* HttpClientResponse.schemaBodyJson(EvalResult)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const tasks = (): Effect.Effect<Array<BenchmarkTask>, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get("/api/tasks");
            return (yield* HttpClientResponse.schemaBodyJson(Schema.Array(BenchmarkTask))(
              response,
            )) as Array<BenchmarkTask>;
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const taskDetail = (taskId: string): Effect.Effect<BenchmarkTask, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get(`/api/tasks/${taskId}`);
            return yield* HttpClientResponse.schemaBodyJson(BenchmarkTask)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const models = (): Effect.Effect<Array<ModelConfig>, ApiError> =>
          Effect.gen(function* () {
            const response = yield* client.get("/api/models");
            return (yield* HttpClientResponse.schemaBodyJson(Schema.Array(ModelConfig))(
              response,
            )) as Array<ModelConfig>;
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        const testModel = (request: ModelTestRequest): Effect.Effect<ModelTestResponse, ApiError> =>
          Effect.gen(function* () {
            const req = HttpClientRequest.post("/api/models/test").pipe(HttpClientRequest.bodyJsonUnsafe(request));
            const response = yield* client.execute(req);
            return yield* HttpClientResponse.schemaBodyJson(ModelTestResponse)(response);
          }).pipe(Effect.catch((error) => Effect.fail(new ApiError(error))));

        return LamBenchClient.of({
          evalBatch,
          evalSingle,
          evalStatus,
          health,
          models,
          resultDetail,
          results,
          taskDetail,
          tasks,
          testModel,
        });
      }),
    ).pipe(Layer.provide(FetchHttpClient.layer));
}
