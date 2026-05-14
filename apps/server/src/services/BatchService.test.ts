// apps/server/src/services/BatchService.test.ts

import { existsSync, unlinkSync } from "node:fs";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { beforeEach, describe, it } from "@effect/vitest";
import {
  assertDefined,
  assertTrue,
  assertUndefined,
  deepStrictEqual,
  strictEqual,
} from "@effect/vitest/utils";
import type { BatchEvalRequest, SingleEvalRequest } from "@repo/domain/Api";
import type { EvalResult } from "@repo/domain/Benchmark";
import { Effect, Layer, Ref } from "effect";
import { beforeAll, vi } from "vitest";
import { ModelUnresponsiveError } from "../llm/ModelGuard.js";
import { BatchService, BatchServiceLive } from "./BatchService";
import { EvalService } from "./EvalService";
import {
  type DbTask,
  ResultStore,
  ResultStoreLive,
  SqlError,
} from "./ResultStore";
import { TaskService } from "./TaskService";

const testDbPath = "apps/server/test-data/BatchService.test.db";

const cleanupDbFiles = () => {
  const paths = [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`];
  for (const p of paths) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const testTasks: ReadonlyArray<DbTask> = [
  {
    id: "task-1",
    category: "algo",
    categoryName: "Algorithms",
    description: "Add two numbers",
    testCount: 2,
    tests: [],
    refBits: null,
    refSolution: null,
  },
  {
    id: "task-2",
    category: "logic",
    categoryName: "Logic",
    description: "Boolean AND",
    testCount: 2,
    tests: [],
    refBits: null,
    refSolution: null,
  },
];

const makeRequest = (overrides?: Partial<BatchEvalRequest>): BatchEvalRequest =>
  ({
    models: ["model-a"],
    tasks: ["task-1"],
    variant: "standard",
    concurrency: 1,
    ...overrides,
  }) as BatchEvalRequest;

// ─── Mock layers ─────────────────────────────────────────────────────────────

const mockTaskService = Layer.succeed(
  TaskService,
  TaskService.of({
    loadAndCacheTasks: () => Effect.void,
    getTask: (taskId: string) =>
      Effect.succeed(
        testTasks.find((t) => t.id === taskId) as DbTask | undefined,
      ),
    getAllTasks: () => Effect.succeed(testTasks),
    getTasksByCategory: () => Effect.succeed([]),
    computeRefBits: () => Effect.succeed(undefined),
  }),
);

const makeMockEvalService = (
  behaviors?: Array<"success" | "unresponsive" | "error">,
) =>
  Layer.effect(
    EvalService,
    Effect.gen(function* () {
      const callCount = yield* Ref.make(0);
      return EvalService.of({
        evaluateSingle: (request: SingleEvalRequest) =>
          Effect.gen(function* () {
            const idx = yield* Ref.getAndUpdate(callCount, (n) => n + 1);
            const behavior = behaviors?.[idx] ?? "success";
            if (behavior === "unresponsive") {
              return yield* Effect.fail(
                new ModelUnresponsiveError(request.model, 3),
              );
            }
            if (behavior === "error") {
              return yield* Effect.fail(new SqlError("unexpected eval error"));
            }
            return {
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
            } as EvalResult;
          }),
      });
    }),
  );

const provideTestLayers = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  evalServiceLayer: Layer.Layer<EvalService>,
) =>
  effect.pipe(
    Effect.provide(BatchServiceLive),
    Effect.provide(ResultStoreLive(testDbPath)),
    Effect.provide(mockTaskService),
    Effect.provide(evalServiceLayer),
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodePath.layer),
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BatchService", () => {
  beforeAll(() => {
    cleanupDbFiles();
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });

  beforeEach(() => {
    cleanupDbFiles();
  });

  // ─── 1. createBatchJob ─────────────────────────────────────────────────────

  it.effect(
    "createBatchJob creates a job with correct totalTasks, status queued, persists to ResultStore",
    () =>
      provideTestLayers(
        Effect.gen(function* () {
          const batchService = yield* BatchService;
          const resultStore = yield* ResultStore;

          const request = makeRequest({
            models: ["model-a"],
            tasks: ["task-1"],
            variant: "standard",
            concurrency: 1,
          });
          const job = yield* batchService.createBatchJob(request);

          strictEqual(job.status, "queued");
          strictEqual(job.totalTasks, 1);
          strictEqual(job.completedTasks, 0);
          assertDefined(job.id);

          const dbJob = yield* resultStore.getJob(job.id);
          assertDefined(dbJob);
          strictEqual(dbJob.status, "queued");
          strictEqual(dbJob.totalTasks, 1);
          strictEqual(dbJob.completedTasks, 0);
        }),
        makeMockEvalService(),
      ),
  );

  it.effect("createBatchJob uses all tasks when tasks array is empty", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest({
          tasks: [] as string[],
          models: ["model-a"],
          variant: "standard",
        });
        const job = yield* batchService.createBatchJob(request);

        strictEqual(job.totalTasks, 2);

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.totalTasks, 2);
      }),
      makeMockEvalService(),
    ),
  );

  // ─── 2. getBatchJob ────────────────────────────────────────────────────────

  it.effect(
    "getBatchJob retrieves a job by ID with correct status and results",
    () =>
      provideTestLayers(
        Effect.gen(function* () {
          const batchService = yield* BatchService;
          const resultStore = yield* ResultStore;

          const request = makeRequest();
          const created = yield* batchService.createBatchJob(request);

          yield* resultStore.insertResult({
            runId: "run-1",
            jobId: created.id,
            taskId: "task-1",
            model: "model-a",
            variant: "standard",
            provider: "openrouter",
            pass: true,
            bits: 10,
            score: 0.8,
            errors: [],
            submission: "sub",
            elapsedMs: 50,
            timestamp: "2025-01-01T00:00:00Z",
          });

          const job = yield* batchService.getBatchJob(created.id);
          assertDefined(job);
          strictEqual(job.id, created.id);
          strictEqual(job.status, "queued");
          strictEqual(job.totalTasks, 1);
          strictEqual(job.results.length, 1);
          strictEqual(job.results[0]?.taskId, "task-1");
          strictEqual(job.results[0]?.model, "model-a");
          strictEqual(job.results[0]?.pass, true);
        }),
        makeMockEvalService(),
      ),
  );

  it.effect("getBatchJob returns undefined for unknown job ID", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const job = yield* batchService.getBatchJob("non-existent-id");
        assertUndefined(job);
      }),
      makeMockEvalService(),
    ),
  );

  // ─── 3. runBatchJob (single model, single task) ────────────────────────────

  it.effect(
    "runBatchJob single model single task completes and saves result",
    () =>
      provideTestLayers(
        Effect.gen(function* () {
          const batchService = yield* BatchService;
          const resultStore = yield* ResultStore;

          const request = makeRequest({
            models: ["model-a"],
            tasks: ["task-1"],
            variant: "standard",
            concurrency: 1,
          });
          const job = yield* batchService.createBatchJob(request);

          yield* batchService.runBatchJob(job.id);

          const dbJob = yield* resultStore.getJob(job.id);
          assertDefined(dbJob);
          strictEqual(dbJob.status, "completed");
          strictEqual(dbJob.completedTasks, 1);

          const results = yield* resultStore.getResultsByJobId(job.id);
          strictEqual(results.length, 1);
          strictEqual(results[0]?.taskId, "task-1");
          strictEqual(results[0]?.model, "model-a");
          strictEqual(results[0]?.variant, "standard");
          strictEqual(results[0]?.pass, true);
        }),
        makeMockEvalService(),
      ),
  );

  // ─── 4. runBatchJob (both variant) ─────────────────────────────────────────

  it.effect("runBatchJob both variant creates 2 requests per task", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest({
          models: ["model-a"],
          tasks: ["task-1"],
          variant: "both",
          concurrency: 1,
        });
        const job = yield* batchService.createBatchJob(request);

        strictEqual(job.totalTasks, 2);

        yield* batchService.runBatchJob(job.id);

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.status, "completed");
        strictEqual(dbJob.completedTasks, 2);

        const results = yield* resultStore.getResultsByJobId(job.id);
        strictEqual(results.length, 2);
        const variants = results.map((r) => r.variant).sort();
        deepStrictEqual(variants, ["rlm", "standard"]);
      }),
      makeMockEvalService(),
    ),
  );

  // ─── 5. runBatchJob idempotency ────────────────────────────────────────────

  it.effect("runBatchJob idempotency does not create duplicate results", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest({
          models: ["model-a"],
          tasks: ["task-1"],
          variant: "standard",
          concurrency: 1,
        });
        const job = yield* batchService.createBatchJob(request);

        yield* batchService.runBatchJob(job.id);
        const resultsAfterFirst = yield* resultStore.getResultsByJobId(job.id);
        strictEqual(resultsAfterFirst.length, 1);

        yield* batchService.runBatchJob(job.id);
        const resultsAfterSecond = yield* resultStore.getResultsByJobId(job.id);
        strictEqual(resultsAfterSecond.length, 1);

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.status, "completed");
        strictEqual(dbJob.completedTasks, 1);
      }),
      makeMockEvalService(),
    ),
  );

  // ─── 6. runBatchJob resume ─────────────────────────────────────────────────

  it.effect("runBatchJob resume skips already-completed requests", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest({
          models: ["model-a"],
          tasks: ["task-1", "task-2"],
          variant: "standard",
          concurrency: 1,
        });
        const job = yield* batchService.createBatchJob(request);

        yield* resultStore.insertResult({
          runId: "run-partial",
          jobId: job.id,
          taskId: "task-1",
          model: "model-a",
          variant: "standard",
          provider: "openrouter",
          pass: true,
          bits: 20,
          score: 0.7,
          errors: [],
          submission: "partial",
          elapsedMs: 30,
          timestamp: "2025-01-01T00:00:00Z",
        });

        yield* resultStore.updateJobStatus(job.id, "running", 1);

        yield* batchService.runBatchJob(job.id);

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.status, "completed");
        strictEqual(dbJob.completedTasks, 2);

        const results = yield* resultStore.getResultsByJobId(job.id);
        strictEqual(results.length, 2);
      }),
      makeMockEvalService(),
    ),
  );

  // ─── 7. ModelUnresponsiveError handling ────────────────────────────────────

  it.effect(
    "runBatchJob handles ModelUnresponsiveError and continues batch",
    () => {
      const evalLayer = makeMockEvalService(["unresponsive", "success"]);
      return provideTestLayers(
        Effect.gen(function* () {
          const batchService = yield* BatchService;
          const resultStore = yield* ResultStore;

          const request = makeRequest({
            models: ["model-a"],
            tasks: ["task-1", "task-2"],
            variant: "standard",
            concurrency: 1,
          });
          const job = yield* batchService.createBatchJob(request);

          yield* batchService.runBatchJob(job.id);

          const dbJob = yield* resultStore.getJob(job.id);
          assertDefined(dbJob);
          strictEqual(dbJob.status, "completed");
          strictEqual(dbJob.completedTasks, 2);

          const results = yield* resultStore.getResultsByJobId(job.id);
          strictEqual(results.length, 2);

          const failed = results.find((r) => r.taskId === "task-1");
          const passed = results.find((r) => r.taskId === "task-2");
          assertDefined(failed);
          assertDefined(passed);

          strictEqual(failed.pass, false);
          assertTrue(
            (failed.errors ?? []).some((e) =>
              e.includes("Model unresponsive after 3 attempts"),
            ),
          );
          strictEqual(failed.bits, 0);
          strictEqual(failed.score, 0);

          strictEqual(passed.pass, true);
          strictEqual(passed.bits, 42);
        }),
        evalLayer,
      );
    },
  );

  // ─── 8. Error boundary ─────────────────────────────────────────────────────

  it.effect("runBatchJob updates status to failed on unexpected error", () => {
    const evalLayer = makeMockEvalService(["error"]);
    return provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest();
        const job = yield* batchService.createBatchJob(request);

        const exit = yield* batchService.runBatchJob(job.id).pipe(Effect.exit);
        assertTrue(exit._tag === "Failure");

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.status, "failed");
      }),
      evalLayer,
    );
  });

  // ─── 9. resumeInterruptedJobs ──────────────────────────────────────────────

  it.effect(
    "resumeInterruptedJobs finds queued and running jobs and resumes them",
    () => {
      const evalLayer = makeMockEvalService();
      return provideTestLayers(
        Effect.gen(function* () {
          const batchService = yield* BatchService;
          const resultStore = yield* ResultStore;

          const request = makeRequest();
          const jobQueued = yield* batchService.createBatchJob(request);
          const jobRunning = yield* batchService.createBatchJob(request);

          yield* resultStore.updateJobStatus(jobRunning.id, "running");

          yield* batchService.resumeInterruptedJobs();

          const dbQueued = yield* resultStore.getJob(jobQueued.id);
          const dbRunning = yield* resultStore.getJob(jobRunning.id);
          assertDefined(dbQueued);
          assertDefined(dbRunning);
          strictEqual(dbQueued.status, "completed");
          strictEqual(dbQueued.completedTasks, 1);
          strictEqual(dbRunning.status, "completed");
          strictEqual(dbRunning.completedTasks, 1);
        }),
        evalLayer,
      );
    },
  );

  // ─── Edge cases ────────────────────────────────────────────────────────────

  it.effect("runBatchJob does nothing for non-existent job", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        yield* batchService.runBatchJob("non-existent-id");
        assertTrue(true);
      }),
      makeMockEvalService(),
    ),
  );

  it.effect("runBatchJob does nothing for completed job", () =>
    provideTestLayers(
      Effect.gen(function* () {
        const batchService = yield* BatchService;
        const resultStore = yield* ResultStore;

        const request = makeRequest();
        const job = yield* batchService.createBatchJob(request);
        yield* resultStore.updateJobStatus(job.id, "completed", 1);

        yield* batchService.runBatchJob(job.id);

        const dbJob = yield* resultStore.getJob(job.id);
        assertDefined(dbJob);
        strictEqual(dbJob.status, "completed");
        strictEqual(dbJob.completedTasks, 1);
      }),
      makeMockEvalService(),
    ),
  );
});
