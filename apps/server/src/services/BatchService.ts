import type { BatchEvalRequest, SingleEvalRequest } from "@repo/domain/Api";
import type { BatchJob, EvalResult } from "@repo/domain/Benchmark";
import type { Config, FileSystem, Path } from "effect";
import { Context, Effect, Layer, Ref } from "effect";
import { makeOpenRouterLayer } from "../llm/OpenRouterClient.js";
import { EvalService } from "./EvalService.js";
import type { DbJob, DbResult, InsertJob, SqlError } from "./ResultStore.js";
import { ResultStore } from "./ResultStore.js";
import { TaskService } from "./TaskService.js";

// ─── Service Definition ─────────────────────────────────────────────────────

export class BatchService extends Context.Service<
  BatchService,
  {
    createBatchJob(
      request: BatchEvalRequest,
    ): Effect.Effect<BatchJob, SqlError, ResultStore>;
    getBatchJob(
      jobId: string,
    ): Effect.Effect<BatchJob | undefined, SqlError, ResultStore>;
    runBatchJob(
      jobId: string,
    ): Effect.Effect<
      void,
      SqlError | Config.ConfigError,
      FileSystem.FileSystem | Path.Path | ResultStore | TaskService
    >;
    resumeInterruptedJobs(): Effect.Effect<
      void,
      SqlError | Config.ConfigError,
      FileSystem.FileSystem | Path.Path | ResultStore | TaskService
    >;
  }
>()("app/BatchService") {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildRequests = (
  model: string,
  taskId: string,
  variant: "standard" | "rlm" | "both",
): ReadonlyArray<SingleEvalRequest> => {
  const base = {
    maxTokens: 4096,
    mode: "direct" as const,
    model,
    provider: "openrouter" as const,
    rlmMaxDepth: 3,
    task: taskId,
  };
  if (variant === "both") {
    return [
      { ...base, variant: "standard" as const },
      { ...base, variant: "rlm" as const },
    ];
  }
  return [{ ...base, variant }];
};

const dbResultToEvalResult = (dbResult: DbResult): EvalResult => ({
  bits: dbResult.bits ?? 0,
  elapsedMs: dbResult.elapsedMs,
  errors: dbResult.errors ?? [],
  model: dbResult.model,
  pass: dbResult.pass,
  score: dbResult.score ?? 0,
  submission: dbResult.submission ?? "",
  taskId: dbResult.taskId,
  timestamp: dbResult.timestamp,
  variant: dbResult.variant as "standard" | "rlm" | "both",
});

const dbJobToBatchJob = (
  dbJob: DbJob,
  results: ReadonlyArray<EvalResult>,
): BatchJob => ({
  completedTasks: dbJob.completedTasks,
  createdAt: dbJob.createdAt ?? new Date().toISOString(),
  id: dbJob.id,
  results,
  status: dbJob.status as "queued" | "running" | "completed" | "failed",
  totalTasks: dbJob.totalTasks,
});

// ─── Layer Factory ───────────────────────────────────────────────────────────

export const BatchServiceLive = Layer.effect(
  BatchService,
  Effect.gen(function*() {
    const resultStore = yield* ResultStore;
    const evalService = yield* EvalService;
    const taskService = yield* TaskService;

    const createBatchJob = Effect.fn("BatchService.createBatchJob")(function*(
      request: BatchEvalRequest,
    ) {
      const jobId = crypto.randomUUID();

      const taskIds = request.tasks.length === 0
        ? (yield* taskService.getAllTasks()).map((t) => t.id)
        : request.tasks;

      const totalTasks = request.models.length
        * taskIds.length
        * (request.variant === "both" ? 2 : 1);

      const insertJob: InsertJob = {
        completedTasks: 0,
        config: { ...request, tasks: taskIds },
        id: jobId,
        status: "queued",
        totalTasks,
      };
      yield* resultStore.insertJob(insertJob);

      return {
        completedTasks: 0,
        createdAt: new Date().toISOString(),
        id: jobId,
        results: [],
        status: "queued",
        totalTasks,
      } as BatchJob;
    });

    const getBatchJob = Effect.fn("BatchService.getBatchJob")(function*(
      jobId: string,
    ) {
      const dbJob = yield* resultStore.getJob(jobId);
      if (dbJob === undefined) return undefined;

      const dbResults = yield* resultStore.getResultsByJobId(jobId);
      const results = dbResults.map(dbResultToEvalResult);

      return dbJobToBatchJob(dbJob, results);
    });

    const runBatchJob = Effect.fn("BatchService.runBatchJob")(function*(
      jobId: string,
    ) {
      const job = yield* resultStore.getJob(jobId);
      if (
        job === undefined
        || (job.status !== "queued" && job.status !== "running")
      ) {
        return;
      }

      const existingResults = yield* resultStore.getResultsByJobId(jobId);
      const existingKeys = new Set(
        existingResults.map((r) => `${r.model}:${r.taskId}:${r.variant}`),
      );

      yield* resultStore.updateJobStatus(jobId, "running");

      const config = job.config as {
        models: ReadonlyArray<string>;
        tasks: ReadonlyArray<string>;
        variant: "standard" | "rlm" | "both";
        concurrency: number;
      };

      const tasks = yield* Effect.forEach(
        config.tasks,
        Effect.fnUntraced(function*(taskId: string) {
          const task = yield* taskService.getTask(taskId);
          return task ?? { id: taskId };
        }),
      );

      const requests = config.models.flatMap((model) =>
        tasks.flatMap((task) => buildRequests(model, task.id, config.variant))
      );

      const completedRef = yield* Ref.make(0);

      yield* Effect.forEach(
        requests,
        Effect.fnUntraced(function*(request: SingleEvalRequest) {
          const key = `${request.model}:${request.task}:${request.variant}`;
          if (existingKeys.has(key)) {
            yield* Ref.update(completedRef, (n) => n + 1);
            const completedTasks = yield* Ref.get(completedRef);
            yield* resultStore.updateJobStatus(
              jobId,
              "running",
              completedTasks,
            );
            return;
          }

          const llmLayer = makeOpenRouterLayer(request.model);
          const result = yield* evalService.evaluateSingle(request).pipe(
            Effect.provide(llmLayer),
            Effect.catchTag("ModelUnresponsiveError", (e) =>
              Effect.succeed({
                bits: 0,
                elapsedMs: 0,
                errors: [`Model unresponsive after ${e.attempts} attempts`],
                model: request.model,
                pass: false,
                score: 0,
                submission: "",
                taskId: request.task,
                timestamp: new Date().toISOString(),
                variant: request.variant,
              } as EvalResult)),
          );

          yield* resultStore.insertResult({
            bits: result.bits,
            elapsedMs: result.elapsedMs,
            errors: result.errors,
            jobId,
            model: result.model,
            pass: result.pass,
            provider: request.provider,
            runId: crypto.randomUUID(),
            score: result.score,
            submission: result.submission,
            taskId: result.taskId,
            timestamp: result.timestamp,
            variant: result.variant,
          });

          yield* Ref.update(completedRef, (n) => n + 1);
          const completedTasks = yield* Ref.get(completedRef);
          yield* resultStore.updateJobStatus(jobId, "running", completedTasks);
        }),
        { concurrency: config.concurrency },
      ).pipe(
        Effect.catch((e) =>
          Effect.gen(function*() {
            yield* resultStore.updateJobStatus(jobId, "failed");
            return yield* Effect.fail(e);
          })
        ),
      );

      const finalCompleted = yield* Ref.get(completedRef);
      yield* resultStore.updateJobStatus(jobId, "completed", finalCompleted);
    });

    const resumeInterruptedJobs = Effect.fn(
      "BatchService.resumeInterruptedJobs",
    )(function*() {
      const queuedJobs = yield* resultStore.getJobsByStatus("queued");
      const runningJobs = yield* resultStore.getJobsByStatus("running");

      yield* Effect.forEach(
        [...queuedJobs, ...runningJobs],
        Effect.fnUntraced(function*(job) {
          if (job.status === "running") {
            yield* resultStore.updateJobStatus(job.id, "queued");
          }
          yield* runBatchJob(job.id);
        }),
      );
    });

    return BatchService.of({
      createBatchJob,
      getBatchJob,
      resumeInterruptedJobs,
      runBatchJob,
    });
  }),
);
