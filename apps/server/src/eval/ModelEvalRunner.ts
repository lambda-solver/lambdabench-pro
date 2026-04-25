/**
 * ModelEvalRunner.ts — Orchestrate standard + λ-RLM eval concurrently per model.
 *
 * For each TopModel:
 *   Effect.all([
 *     standard eval (1 LLM call per task) → res/{ts}_{model}.txt
 *     RLM eval     (up to maxDepth calls)  → res/{ts}_{model}_rlm.txt
 *   ], { concurrency: 2 })
 */

import { Array as Arr, Effect, FileSystem, Layer, Path } from "effect";
import { ModelUnresponsiveError } from "../llm/ModelGuard";
import type { TopModel } from "./EvalRunner";
import {
  LAM_DIR,
  loadAllTasks,
  referenceBits,
  runAllTasksForModel,
} from "../check/Check";
import type { Task } from "../check/Check";
import { makeOpenRouterLayer } from "../llm/OpenRouterClient";
import { BunHttpClient } from "@effect/platform-bun";
import { defaultConfig, rlmEval } from "../rlm/LambdaRlm";
import { writeResultFile } from "../run/RunWriter";
import { build } from "../build/BuildResults";

// ─── loadRefBitsMap ───────────────────────────────────────────────────────────

/**
 * Load reference solution bits for all tasks in lam/ into a ReadonlyMap.
 * Tasks without a reference .lam file are absent from the map.
 */
export const loadRefBitsMap = Effect.fn("loadRefBitsMap")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const exists = yield* fs.exists(LAM_DIR);
  if (!exists) return new Map<string, number>() as ReadonlyMap<string, number>;

  const lamFiles = (yield* fs.readDirectory(LAM_DIR)).filter((f) =>
    f.endsWith(".lam"),
  );

  const entries = yield* Effect.forEach(
    lamFiles,
    (f) =>
      Effect.gen(function* () {
        const taskId = path.basename(f, ".lam");
        const bits = yield* referenceBits(taskId).pipe(
          Effect.catch((_) => Effect.succeed(undefined as number | undefined)),
        );
        if (bits === undefined) return null as [string, number] | null;
        return [taskId, bits] as [string, number];
      }),
    { concurrency: 8 },
  );

  return new Map(
    entries.filter((e): e is [string, number] => e !== null),
  ) as ReadonlyMap<string, number>;
});

// ─── runRlmForAllTasks ────────────────────────────────────────────────────────

const runRlmForAllTasks = Effect.fn("runRlmForAllTasks")(function* (
  tasks: ReadonlyArray<Task>,
  refBitsMap: ReadonlyMap<string, number>,
  rlmMaxDepth: number,
  concurrency = 4,
) {
  const cfg = defaultConfig(rlmMaxDepth);

  const rlmResults = yield* Effect.forEach(
    tasks,
    (task) =>
      Effect.gen(function* () {
        const start = Date.now();
        const llmResult = yield* rlmEval(task, refBitsMap.get(task.id), cfg);
        const elapsedMs = Date.now() - start;
        return { ...llmResult, elapsedMs };
      }),
    { concurrency },
  );

  const totalAttempts = Arr.reduce(rlmResults, 0, (s, r) => s + r.attempts);
  const maxDepthUsed = Arr.reduce(rlmResults, 0, (s, r) =>
    Math.max(s, r.depth),
  );

  return { results: rlmResults, totalAttempts, maxDepthUsed } as const;
});

// ─── runModelEval ─────────────────────────────────────────────────────────────

/**
 * Run standard + λ-RLM eval concurrently for a single model.
 * Both variants write their own res/*.txt files.
 */
export const runModelEval = Effect.fn("runModelEval")(function* (
  model: TopModel,
  tasks: ReadonlyArray<Task>,
  refBitsMap: ReadonlyMap<string, number>,
  rlmMaxDepth = 3,
  concurrency = 1,
) {
  yield* Effect.log(
    `[ModelEvalRunner] Starting eval for ${model.modelId} (${tasks.length} tasks)`,
  );

  const llmLayer = makeOpenRouterLayer(model.modelId).pipe(
    Layer.provide(BunHttpClient.layer),
  );

  /** Wrap a variant so ModelUnresponsiveError skips it cleanly. */
  const guarded = <A, E, R>(
    variant: string,
    eff: Effect.Effect<A, E, R>,
  ) =>
    eff.pipe(
      Effect.catchIf(
        (e: unknown): e is ModelUnresponsiveError =>
          e instanceof ModelUnresponsiveError,
        (e) => {
          const err = e as unknown as ModelUnresponsiveError;
          return Effect.log(
            `[ModelEvalRunner] SKIP ${model.modelId} (${variant}) — unresponsive after ${err.attempts} attempts`,
          );
        },
      ),
    );

  yield* Effect.all(
    [
      // Standard eval: single LLM call per task
      guarded(
        "standard",
        Effect.gen(function* () {
          const results = yield* runAllTasksForModel(tasks, refBitsMap, concurrency).pipe(
            Effect.provide(llmLayer),
          );
          yield* writeResultFile(model.modelId, results, "standard");
          yield* build().pipe(Effect.catch((_) => Effect.void));
        }),
      ),

      // λ-RLM eval: up to maxDepth self-correction calls per task
      guarded(
        "rlm",
        Effect.gen(function* () {
          const { results, totalAttempts, maxDepthUsed } =
            yield* runRlmForAllTasks(tasks, refBitsMap, rlmMaxDepth, concurrency).pipe(
              Effect.provide(llmLayer),
            );
          yield* writeResultFile(`${model.modelId}/rlm`, results, "rlm", {
            depth: maxDepthUsed,
            attempts: totalAttempts,
          });
          yield* build().pipe(Effect.catch((_) => Effect.void));
        }),
      ),
    ],
    { concurrency: 2 },
  );

  yield* Effect.log(
    `[ModelEvalRunner] Done: ${model.modelId} (standard + rlm)`,
  );
});

// Re-export for use in index.ts
export { loadAllTasks };
export type { Task };
