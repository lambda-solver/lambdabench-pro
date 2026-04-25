/**
 * ModelGuard.ts — Per-call timeout, retry with backoff, and model exclusion.
 *
 * Wraps a single LanguageModel.generateText call with:
 *   1. 60-second hard timeout per attempt.
 *   2. Up to MAX_RETRIES retries with exponential backoff on timeout/error.
 *   3. If all retries are exhausted → ModelUnresponsiveError, which causes
 *      the entire model to be skipped from the benchmark output.
 */

import { Duration, Effect, Schedule } from "effect"
import { LanguageModel } from "effect/unstable/ai"

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when a single LLM call times out or errors. Retryable. */
export class ModelCallError {
  readonly _tag = "ModelCallError"
  constructor(
    readonly model: string,
    readonly attempt: number,
    readonly cause: string,
  ) {}
}

/** Thrown when all retries are exhausted — model is excluded from benchmark. */
export class ModelUnresponsiveError {
  readonly _tag = "ModelUnresponsiveError"
  constructor(
    readonly model: string,
    readonly attempts: number,
  ) {}
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CALL_TIMEOUT = Duration.seconds(180)
const MAX_RETRIES = 3
const BASE_BACKOFF = Duration.seconds(5)

// ─── guardedGenerate ─────────────────────────────────────────────────────────

/**
 * Call LanguageModel.generateText with a 60-second timeout per attempt.
 * Retries up to MAX_RETRIES times with exponential backoff.
 * If all attempts fail → ModelUnresponsiveError (model excluded from bench).
 */
export const guardedGenerate = Effect.fn("guardedGenerate")(function* (
  prompt: string,
  model: string,
) {
  const attempt = (n: number): Effect.Effect<
    string,
    ModelCallError | ModelUnresponsiveError,
    LanguageModel.LanguageModel
  > =>
    LanguageModel.generateText({ prompt }).pipe(
      Effect.map((r) => r.text),
      Effect.timeout(CALL_TIMEOUT),
      Effect.mapError((e) => new ModelCallError(model, n, String(e))),
      Effect.catchTag("ModelCallError", (e) => {
        if (n >= MAX_RETRIES) {
          return Effect.fail(new ModelUnresponsiveError(model, n))
        }
        const backoff = Duration.times(BASE_BACKOFF, Math.pow(2, n - 1))
        return Effect.gen(function* () {
          yield* Effect.log(
            `[guard] ${model} attempt ${n}/${MAX_RETRIES} failed (${e.cause}) — retrying in ${Duration.toSeconds(backoff)}s`,
          )
          yield* Effect.sleep(backoff)
          return yield* attempt(n + 1)
        })
      }),
    )

  return yield* attempt(1)
})
