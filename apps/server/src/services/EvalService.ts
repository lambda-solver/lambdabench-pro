import type { SingleEvalRequest } from "@repo/domain/Api";
import type { EvalResult } from "@repo/domain/Benchmark";
import { Context, Effect, type FileSystem, Layer, type Path } from "effect";
import type { LanguageModel } from "effect/unstable/ai";
import { runTaskWithLlm, type Task } from "../check/Check.js";
import type { ModelUnresponsiveError } from "../llm/ModelGuard.js";
import { defaultConfig, rlmEval } from "../rlm/LambdaRlm.js";
import { ResultStore, type SqlError } from "./ResultStore.js";
import { TaskService } from "./TaskService.js";

// ─── Service Definition ───────────────────────────────────────────────────────

export class EvalService extends Context.Service<
  EvalService,
  {
    evaluateSingle(
      request: SingleEvalRequest,
    ): Effect.Effect<
      EvalResult,
      SqlError | ModelUnresponsiveError,
      | ResultStore
      | TaskService
      | LanguageModel.LanguageModel
      | FileSystem.FileSystem
      | Path.Path
    >;
  }
>()("app/EvalService") {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildEvalResult = (
  taskId: string,
  request: SingleEvalRequest,
  checkResult: {
    pass: boolean;
    bits: number;
    score: number;
    errors: ReadonlyArray<string>;
  },
  elapsedMs: number,
): EvalResult => ({
  taskId,
  model: request.model,
  variant: request.variant,
  pass: checkResult.pass,
  bits: checkResult.bits,
  score: checkResult.score,
  errors: checkResult.errors,
  elapsedMs,
  submission: "",
  timestamp: new Date().toISOString(),
});

const notFoundResult = (request: SingleEvalRequest): EvalResult => ({
  taskId: request.task,
  model: request.model,
  variant: request.variant,
  pass: false,
  bits: 0,
  score: 0,
  errors: ["Task not found"],
  elapsedMs: 0,
  submission: "",
  timestamp: new Date().toISOString(),
});

// ─── Layer Factory ───────────────────────────────────────────────────────────

export const EvalServiceLive = Layer.effect(
  EvalService,
  Effect.gen(function* () {
    const resultStore = yield* ResultStore;
    const taskService = yield* TaskService;

    const evaluateSingle = Effect.fn("EvalService.evaluateSingle")(function* (
      request: SingleEvalRequest,
    ) {
      const dbTask = yield* taskService.getTask(request.task);

      if (dbTask === undefined) {
        const result = notFoundResult(request);
        yield* resultStore.insertResult({
          runId: crypto.randomUUID(),
          taskId: result.taskId,
          model: result.model,
          variant: result.variant,
          provider: request.provider,
          pass: result.pass,
          bits: result.bits,
          score: result.score,
          errors: result.errors,
          submission: result.submission,
          elapsedMs: result.elapsedMs,
          timestamp: result.timestamp,
        });
        return result;
      }

      const task: Task = {
        id: dbTask.id,
        desc: dbTask.description,
        tests: (dbTask.tests as Array<{ input: string; expected: string }>).map(
          (t) => ({ expr: t.input, want: t.expected }),
        ),
      };

      const refBits = dbTask.refBits ?? undefined;

      const checkResult = yield* request.variant === "standard"
        ? runTaskWithLlm(task, refBits).pipe(
            Effect.catchTag("ModelCallError", (e) =>
              Effect.succeed({
                id: task.id,
                pass: false,
                bits: 0,
                score: 0,
                errors: [`Model call failed: ${e.cause}`],
                elapsedMs: 0,
              }),
            ),
          )
        : Effect.gen(function* () {
            const start = Date.now();
            const r = yield* rlmEval(
              task,
              refBits,
              defaultConfig(request.rlmMaxDepth),
            ).pipe(
              Effect.catchTag("ModelCallError", (e) =>
                Effect.succeed({
                  id: task.id,
                  pass: false,
                  bits: 0,
                  score: 0,
                  errors: [`Model call failed: ${e.cause}`],
                  elapsedMs: 0,
                }),
              ),
            );
            return { ...r, elapsedMs: Date.now() - start };
          });

      const result = buildEvalResult(
        task.id,
        request,
        checkResult,
        checkResult.elapsedMs,
      );

      yield* resultStore.insertResult({
        runId: crypto.randomUUID(),
        taskId: result.taskId,
        model: result.model,
        variant: result.variant,
        provider: request.provider,
        pass: result.pass,
        bits: result.bits,
        score: result.score,
        errors: result.errors,
        submission: result.submission,
        elapsedMs: result.elapsedMs,
        timestamp: result.timestamp,
      });

      return result;
    });

    return EvalService.of({ evaluateSingle });
  }),
);
