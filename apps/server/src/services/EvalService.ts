import { Context, Effect, Layer } from "effect";
import type { FileSystem, Path } from "effect";
import { defaultConfig, rlmEval } from "../rlm/LambdaRlm.js";

import type { EvalResult } from "@repo/domain/Benchmark";
import type { LanguageModel } from "effect/unstable/ai";
import type { ModelUnresponsiveError } from "../llm/ModelGuard.js";
import { ResultStore } from "./ResultStore.js";
import type { SingleEvalRequest } from "@repo/domain/Api";
import type { SqlError } from "./ResultStore.js";

import type { Task } from "../check/Check.js";
import { TaskService } from "./TaskService.js";
import { runTaskWithLlm } from "../check/Check.js";

// ─── Service Definition ───────────────────────────────────────────────────────

export class EvalService extends Context.Service<
  EvalService,
  {
    evaluateSingle(
      request: SingleEvalRequest,
    ): Effect.Effect<
      EvalResult,
      SqlError | ModelUnresponsiveError,
      ResultStore | TaskService | LanguageModel.LanguageModel | FileSystem.FileSystem | Path.Path
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
  bits: checkResult.bits,
  elapsedMs,
  errors: checkResult.errors,
  model: request.model,
  pass: checkResult.pass,
  score: checkResult.score,
  submission: "",
  taskId,
  timestamp: new Date().toISOString(),
  variant: request.variant,
});

const notFoundResult = (request: SingleEvalRequest): EvalResult => ({
  bits: 0,
  elapsedMs: 0,
  errors: ["Task not found"],
  model: request.model,
  pass: false,
  score: 0,
  submission: "",
  taskId: request.task,
  timestamp: new Date().toISOString(),
  variant: request.variant,
});

// ─── Layer Factory ───────────────────────────────────────────────────────────

export const EvalServiceLive = Layer.effect(
  EvalService,
  Effect.gen(function* () {
    const resultStore = yield* ResultStore;
    const taskService = yield* TaskService;

    const evaluateSingle = Effect.fn("EvalService.evaluateSingle")(function* (request: SingleEvalRequest) {
      const dbTask = yield* taskService.getTask(request.task);

      if (dbTask === undefined) {
        const result = notFoundResult(request);
        yield* resultStore.insertResult({
          bits: result.bits,
          elapsedMs: result.elapsedMs,
          errors: result.errors,
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
        return result;
      }

      const task: Task = {
        desc: dbTask.description,
        id: dbTask.id,
        tests: (dbTask.tests as Array<{ input: string; expected: string }>).map((t) => ({
          expr: t.input,
          want: t.expected,
        })),
      };

      const refBits = dbTask.refBits ?? undefined;

      const checkResult = yield* request.variant === "standard"
        ? runTaskWithLlm(task, refBits).pipe(
            Effect.catchTag("ModelCallError", (e) =>
              Effect.succeed({
                bits: 0,
                elapsedMs: 0,
                errors: [`Model call failed: ${e.cause}`],
                id: task.id,
                pass: false,
                score: 0,
              }),
            ),
          )
        : Effect.gen(function* () {
            const start = Date.now();
            const r = yield* rlmEval(task, refBits, defaultConfig(request.rlmMaxDepth)).pipe(
              Effect.catchTag("ModelCallError", (e) =>
                Effect.succeed({
                  bits: 0,
                  elapsedMs: 0,
                  errors: [`Model call failed: ${e.cause}`],
                  id: task.id,
                  pass: false,
                  score: 0,
                }),
              ),
            );
            return { ...r, elapsedMs: Date.now() - start };
          });

      const result = buildEvalResult(task.id, request, checkResult, checkResult.elapsedMs);

      yield* resultStore.insertResult({
        bits: result.bits,
        elapsedMs: result.elapsedMs,
        errors: result.errors,
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

      return result;
    });

    return EvalService.of({ evaluateSingle });
  }),
);
