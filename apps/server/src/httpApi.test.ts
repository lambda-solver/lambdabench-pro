// apps/server/src/httpApi.test.ts

import * as BunHttpServer from "@effect/platform-bun/BunHttpServer";
import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import type { SingleEvalRequest } from "@repo/domain/Api";
import type { BatchJob, EvalResult } from "@repo/domain/Benchmark";
import { ConfigProvider, Effect, Layer, ManagedRuntime } from "effect";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import type { HttpServerResponse } from "effect/unstable/http/HttpServerResponse";
import { ApiLayer } from "./httpApi.js";
import { BatchService } from "./services/BatchService.js";
import { EvalService } from "./services/EvalService.js";
import { ResultStore } from "./services/ResultStore.js";
import { TaskService } from "./services/TaskService.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const decodeJsonBody = (response: HttpServerResponse): Effect.Effect<unknown> =>
  Effect.gen(function* () {
    const body = response.body as unknown as { _tag: string; body: Uint8Array };
    if (body._tag === "Uint8Array") {
      const text = new TextDecoder().decode(body.body);
      return yield* Effect.try({
        try: () => JSON.parse(text),
        catch: (error) => new Error(String(error)),
      });
    }
    return null;
  });

const runRequest = (
  layer: Layer.Layer<never>,
  request: globalThis.Request,
): Effect.Effect<HttpServerResponse> =>
  Effect.gen(function* () {
    const runtime = ManagedRuntime.make(
      layer.pipe(Layer.provideMerge(HttpRouter.layer) /* test */),
    );
    const effect = Effect.scoped(
      Effect.gen(function* () {
        const router = yield* HttpRouter.HttpRouter;
        const httpRequest = HttpServerRequest.fromWeb(request);
        const response = yield* router
          .asHttpEffect()
          .pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              httpRequest,
            ),
          );
        return response;
      }),
    );
    const response = yield* Effect.promise(() =>
      runtime.runPromise(effect),
    ).pipe(Effect.ensuring(Effect.promise(() => runtime.dispose())));
    return response;
  });

// ─── Mock layers ─────────────────────────────────────────────────────────────

const mockEvalService = Layer.succeed(
  EvalService,
  EvalService.of({
    evaluateSingle: (request: SingleEvalRequest) =>
      Effect.succeed({
        taskId: request.task,
        model: request.model,
        variant: request.variant,
        pass: true,
        bits: 42,
        score: 0.95,
        errors: [],
        elapsedMs: 100,
        submission: "answer",
        timestamp: new Date().toISOString(),
      } as EvalResult),
  }),
);

const mockBatchService = Layer.succeed(
  BatchService,
  BatchService.of({
    createBatchJob: () =>
      Effect.succeed({
        id: "job-1",
        status: "queued",
        totalTasks: 1,
        completedTasks: 0,
        config: {},
        results: [],
        createdAt: new Date().toISOString(),
      } as BatchJob),
    getBatchJob: () => Effect.succeed(undefined),
    runBatchJob: () => Effect.succeed(undefined),
    resumeInterruptedJobs: () => Effect.succeed(undefined),
  }),
);

const mockResultStore = Layer.succeed(
  ResultStore,
  ResultStore.of({
    insertResult: () => Effect.succeed(undefined),
    getResultsByRunId: () => Effect.succeed([]),
    getResultsByJobId: () => Effect.succeed([]),
    getLatestResults: () => Effect.succeed([]),
    insertJob: () => Effect.succeed(undefined),
    updateJobStatus: () => Effect.succeed(undefined),
    getJob: () => Effect.succeed(undefined),
    getJobsByStatus: () => Effect.succeed([]),
    insertTask: () => Effect.succeed(undefined),
    getTask: () => Effect.succeed(undefined),
    getTasksByCategory: () => Effect.succeed([]),
    getAllTasks: () => Effect.succeed([]),
    insertModelConfig: () => Effect.succeed(undefined),
    getActiveModelConfigs: () => Effect.succeed([]),
    cleanupExpired: () => Effect.succeed({ deletedResults: 0, deletedJobs: 0 }),
  }),
);

const mockTaskService = Layer.succeed(
  TaskService,
  TaskService.of({
    loadAndCacheTasks: () => Effect.succeed(undefined),
    getTask: () => Effect.succeed(undefined),
    getAllTasks: () => Effect.succeed([]),
    getTasksByCategory: () => Effect.succeed([]),
    computeRefBits: () => Effect.succeed(undefined),
  }),
);

const mockConfigProvider = ConfigProvider.layer(
  ConfigProvider.fromUnknown({ OPENROUTER_API_KEY: "test-key" }),
);

const makeTestLayer = (
  overrides?: Partial<{
    evalService: Layer.Layer<EvalService>;
    batchService: Layer.Layer<BatchService>;
    resultStore: Layer.Layer<ResultStore>;
    taskService: Layer.Layer<TaskService>;
  }>,
) =>
  ApiLayer.pipe(
    Layer.provide(overrides?.evalService ?? mockEvalService),
    Layer.provide(overrides?.batchService ?? mockBatchService),
    Layer.provide(overrides?.resultStore ?? mockResultStore),
    Layer.provide(overrides?.taskService ?? mockTaskService),
    Layer.provide(HttpRouter.layer),
    Layer.provide(BunHttpServer.layerHttpServices),
    Layer.provide(mockConfigProvider),
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("httpApi", () => {
  it.effect("ApiLayer constructs with all mock service layers", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const layer = makeTestLayer();
        yield* Layer.build(layer);
      }),
    ),
  );

  it.effect("health endpoint returns correct shape", () =>
    Effect.gen(function* () {
      const response = yield* runRequest(
        makeTestLayer(),
        new Request("http://localhost/api/health"),
      );

      strictEqual(response.status, 200);

      const body = yield* decodeJsonBody(response);
      const json = body as Record<string, unknown>;
      strictEqual(json["status"], "ok");
      strictEqual(json["version"], "1.0.0");
      strictEqual(json["db"], "connected");
      assertTrue(typeof json["uptimeSeconds"] === "number");
      assertTrue((json["uptimeSeconds"] as number) >= 0);
    }),
  );

  it.effect("POST /eval/single returns EvalResult", () =>
    Effect.gen(function* () {
      const response = yield* runRequest(
        makeTestLayer(),
        new Request("http://localhost/api/eval/single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "test-model",
            task: "test-task",
            variant: "standard",
          }),
        }),
      );

      strictEqual(response.status, 200);

      const body = yield* decodeJsonBody(response);
      const json = body as Record<string, unknown>;
      strictEqual(json["taskId"], "test-task");
      strictEqual(json["model"], "test-model");
      strictEqual(json["variant"], "standard");
      strictEqual(json["pass"], true);
      strictEqual(json["bits"], 42);
      strictEqual(json["score"], 0.95);
    }),
  );

  it.effect("POST /eval/batch returns BatchJob", () =>
    Effect.gen(function* () {
      const response = yield* runRequest(
        makeTestLayer(),
        new Request("http://localhost/api/eval/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            models: ["test-model"],
            tasks: ["test-task"],
            variant: "standard",
          }),
        }),
      );

      strictEqual(response.status, 200);

      const body = yield* decodeJsonBody(response);
      const json = body as Record<string, unknown>;
      strictEqual(json["id"], "job-1");
      strictEqual(json["status"], "queued");
      strictEqual(json["totalTasks"], 1);
    }),
  );

  it.effect(
    "GET /eval/status/:jobId returns job for known ID and 404 for unknown",
    () =>
      Effect.gen(function* () {
        const batchServiceWithJob = Layer.succeed(
          BatchService,
          BatchService.of({
            createBatchJob: () =>
              Effect.succeed({
                id: "job-1",
                status: "queued",
                totalTasks: 1,
                completedTasks: 0,
                config: {},
                results: [],
                createdAt: new Date().toISOString(),
              } as BatchJob),
            getBatchJob: (jobId: string) =>
              Effect.succeed(
                jobId === "known-job"
                  ? ({
                      id: "known-job",
                      status: "completed",
                      totalTasks: 1,
                      completedTasks: 1,
                      results: [],
                      createdAt: new Date().toISOString(),
                    } as BatchJob)
                  : undefined,
              ),
            runBatchJob: () => Effect.succeed(undefined),
            resumeInterruptedJobs: () => Effect.succeed(undefined),
          }),
        );

        const layer = makeTestLayer({ batchService: batchServiceWithJob });

        const knownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/eval/status/known-job"),
        );
        strictEqual(knownResponse.status, 200);
        const knownBody = yield* decodeJsonBody(knownResponse);
        const knownJson = knownBody as Record<string, unknown>;
        strictEqual(knownJson["id"], "known-job");

        const unknownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/eval/status/unknown-job"),
        );
        strictEqual(unknownResponse.status, 404);
      }),
  );

  it.effect("GET /api/results returns rankings", () =>
    Effect.gen(function* () {
      const resultStoreWithData = Layer.succeed(
        ResultStore,
        ResultStore.of({
          insertResult: () => Effect.succeed(undefined),
          getResultsByRunId: () => Effect.succeed([]),
          getResultsByJobId: () => Effect.succeed([]),
          getLatestResults: () =>
            Effect.succeed([
              {
                id: 1,
                runId: "run-1",
                jobId: null,
                taskId: "task-1",
                model: "model-a",
                variant: "standard",
                provider: "openrouter",
                pass: true,
                bits: 10,
                score: 1,
                errors: null,
                submission: null,
                elapsedMs: 100,
                timestamp: new Date().toISOString(),
                createdAt: null,
              },
            ]),
          insertJob: () => Effect.succeed(undefined),
          updateJobStatus: () => Effect.succeed(undefined),
          getJob: () => Effect.succeed(undefined),
          getJobsByStatus: () => Effect.succeed([]),
          insertTask: () => Effect.succeed(undefined),
          getTask: () => Effect.succeed(undefined),
          getTasksByCategory: () => Effect.succeed([]),
          getAllTasks: () => Effect.succeed([]),
          insertModelConfig: () => Effect.succeed(undefined),
          getActiveModelConfigs: () => Effect.succeed([]),
          cleanupExpired: () =>
            Effect.succeed({ deletedResults: 0, deletedJobs: 0 }),
        }),
      );

      const response = yield* runRequest(
        makeTestLayer({ resultStore: resultStoreWithData }),
        new Request("http://localhost/api/results"),
      );

      strictEqual(response.status, 200);

      const body = yield* decodeJsonBody(response);
      const json = body as Record<string, unknown>;
      assertTrue(Array.isArray(json["rankings"]));
      const rankings = json["rankings"] as Array<unknown>;
      strictEqual(rankings.length, 1);
    }),
  );

  it.effect(
    "GET /api/results/:runId returns result for known runId and 404 for unknown",
    () =>
      Effect.gen(function* () {
        const resultStoreWithData = Layer.succeed(
          ResultStore,
          ResultStore.of({
            insertResult: () => Effect.succeed(undefined),
            getResultsByRunId: (runId: string) =>
              Effect.succeed(
                runId === "run-1"
                  ? [
                      {
                        id: 1,
                        runId: "run-1",
                        jobId: null,
                        taskId: "task-1",
                        model: "model-a",
                        variant: "standard",
                        provider: "openrouter",
                        pass: true,
                        bits: 10,
                        score: 1,
                        errors: null,
                        submission: null,
                        elapsedMs: 100,
                        timestamp: new Date().toISOString(),
                        createdAt: null,
                      },
                    ]
                  : [],
              ),
            getResultsByJobId: () => Effect.succeed([]),
            getLatestResults: () => Effect.succeed([]),
            insertJob: () => Effect.succeed(undefined),
            updateJobStatus: () => Effect.succeed(undefined),
            getJob: () => Effect.succeed(undefined),
            getJobsByStatus: () => Effect.succeed([]),
            insertTask: () => Effect.succeed(undefined),
            getTask: () => Effect.succeed(undefined),
            getTasksByCategory: () => Effect.succeed([]),
            getAllTasks: () => Effect.succeed([]),
            insertModelConfig: () => Effect.succeed(undefined),
            getActiveModelConfigs: () => Effect.succeed([]),
            cleanupExpired: () =>
              Effect.succeed({ deletedResults: 0, deletedJobs: 0 }),
          }),
        );

        const layer = makeTestLayer({ resultStore: resultStoreWithData });

        const knownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/results/run-1"),
        );
        strictEqual(knownResponse.status, 200);
        const knownBody = yield* decodeJsonBody(knownResponse);
        const knownJson = knownBody as Record<string, unknown>;
        strictEqual(knownJson["taskId"], "task-1");

        const unknownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/results/unknown"),
        );
        strictEqual(unknownResponse.status, 404);
      }),
  );

  it.effect("GET /api/tasks returns array of tasks", () =>
    Effect.gen(function* () {
      const taskServiceWithData = Layer.succeed(
        TaskService,
        TaskService.of({
          loadAndCacheTasks: () => Effect.succeed(undefined),
          getTask: () => Effect.succeed(undefined),
          getAllTasks: () =>
            Effect.succeed([
              {
                id: "task-1",
                category: "algo",
                categoryName: "Algorithms",
                description: "Test task",
                testCount: 2,
                tests: [{ input: "1", expected: "1" }],
                refBits: null,
                refSolution: null,
              },
            ]),
          getTasksByCategory: () => Effect.succeed([]),
          computeRefBits: () => Effect.succeed(undefined),
        }),
      );

      const response = yield* runRequest(
        makeTestLayer({ taskService: taskServiceWithData }),
        new Request("http://localhost/api/tasks"),
      );

      strictEqual(response.status, 200);

      const body = yield* decodeJsonBody(response);
      const json = body as Array<unknown>;
      strictEqual(json.length, 1);
      const task = json[0] as Record<string, unknown>;
      strictEqual(task["id"], "task-1");
    }),
  );

  it.effect(
    "GET /api/tasks/:taskId returns task for known ID and 404 for unknown",
    () =>
      Effect.gen(function* () {
        const taskServiceWithData = Layer.succeed(
          TaskService,
          TaskService.of({
            loadAndCacheTasks: () => Effect.succeed(undefined),
            getTask: (taskId: string) =>
              Effect.succeed(
                taskId === "task-1"
                  ? {
                      id: "task-1",
                      category: "algo",
                      categoryName: "Algorithms",
                      description: "Test task",
                      testCount: 2,
                      tests: [{ input: "1", expected: "1" }],
                      refBits: null,
                      refSolution: null,
                    }
                  : undefined,
              ),
            getAllTasks: () => Effect.succeed([]),
            getTasksByCategory: () => Effect.succeed([]),
            computeRefBits: () => Effect.succeed(undefined),
          }),
        );

        const layer = makeTestLayer({ taskService: taskServiceWithData });

        const knownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/tasks/task-1"),
        );
        strictEqual(knownResponse.status, 200);
        const knownBody = yield* decodeJsonBody(knownResponse);
        const knownJson = knownBody as Record<string, unknown>;
        strictEqual(knownJson["id"], "task-1");

        const unknownResponse = yield* runRequest(
          layer,
          new Request("http://localhost/api/tasks/unknown"),
        );
        strictEqual(unknownResponse.status, 404);
      }),
  );
});
