/**
 * LambdaRlm.ts — λ-RLM evaluator for lambda calculus tasks.
 *
 * Implements the λ-RLM algorithm in Effect-TS:
 *
 * Algorithm — 5 phases:
 *   Phase 1: context_0 = task prompt stored as a plain string
 *   Phase 2: 1 LLM call → task type detection → TaskType
 *   Phase 3: plan(taskType, n, ...) → LambdaPlan — 0 LLM calls (pure math)
 *   Phase 4: log cost estimate
 *   Phase 5: executeΦ — the combinator chain Φ(P, depth):
 *     if leaf: sub_M(P) → extractLamCode → runTask (lam checker as oracle)
 *     else:    Split(P, k*) → Map(Φ, depth-1) → Reduce(selectBest)
 *
 * Design:
 *   - All state flows through Effect combinators — no mutation, no let
 *   - Self-correction loop uses Effect.suspend + pure tail recursion
 *   - The lam interpreter is the ⊕ oracle (replaces text-merge for this domain)
 *   - For lambda tasks n << contextWindowChars, plan() always returns depth=0;
 *     effectiveDepth = max(plan.depth, maxDepth) drives self-correction retries.
 */

import { Effect, FileSystem, Path } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import type { CheckResult, Task } from "../check/Check";
import { runTask } from "../check/Check";
import { extractLamCode } from "./LamCodeExtractor";
import {
  buildRetryPrompt,
  buildSolvePrompt,
  buildTaskDetectionProbe,
} from "../llm/LlmPrompts";
import { LlmError } from "../llm/OpenRouterClient";
import { guardedGenerate, ModelUnresponsiveError } from "../llm/ModelGuard";
import { type LambdaPlan, parseTaskType, plan, splitText } from "./LambdaPlan";

// ─── Types ───────────────────────────────────────────────────────────────────

/** CheckResult extended with λ-RLM execution metadata. */
export type LlmCheckResult = CheckResult & {
  /** Total leaf LLM calls made for this task (excluding the Phase 2 probe). */
  readonly attempts: number;
  /** Effective recursion depth used (= max(plan.depth, maxDepth)). */
  readonly depth: number;
};

/** Configuration for a single λ-RLM evaluation run. */
export type LambdaRlmConfig = {
  /** Model context window in characters (default 100 000). */
  readonly contextWindowChars: number;
  /** Minimum accuracy target α for the accuracy constraint (0–1). */
  readonly accuracyTarget: number;
  /** Estimated single-call accuracy A(K) (default 0.95). */
  readonly aLeaf: number;
  /** Estimated per-level composition accuracy A_⊕ (default 0.90). */
  readonly aCompose: number;
  /**
   * Maximum self-correction retries.
   * Maps to `max_depth` in the λ-RLM reference.
   * Overrides plan.depth (which is always 0 for short lambda tasks).
   */
  readonly maxDepth: number;
};

// ─── Config from env ─────────────────────────────────────────────────────────

/**
 * Build the default LambdaRlmConfig.
 *   maxDepth — from bench.config.json (passed in by the caller); default 3.
 *
 * Model selection is handled by the LanguageModel layer provided at runtime,
 * not by this config — see makeOpenRouterLayer in OpenRouterClient.ts.
 */
export const defaultConfig = (maxDepth = 3): LambdaRlmConfig => ({
  contextWindowChars: 100_000,
  accuracyTarget: 0.8,
  aLeaf: 0.95,
  aCompose: 0.9,
  maxDepth,
});

// ─── Effect type alias ────────────────────────────────────────────────────────

/** Shorthand for the full Effect type produced by Φ and its helpers. */
type PhiEffect = Effect.Effect<
  LlmCheckResult,
  ModelUnresponsiveError,
  LanguageModel.LanguageModel | FileSystem.FileSystem | Path.Path
>;

// ─── Internal: selectBest (⊕ operator for lambda calc) ───────────────────────

/**
 * Reduction operator ⊕ for lambda calculus tasks.
 *
 * Selects the best result from a set of partial Φ evaluations:
 *   1. Returns the first passing result.
 *   2. Falls back to the result with the fewest checker errors.
 *
 * The lam interpreter acts as the oracle — deterministic and domain-specific,
 * replacing a generic LLM-based text merge for this task type.
 */
const selectBest = (results: ReadonlyArray<LlmCheckResult>): LlmCheckResult => {
  const passing = results.filter((r) => r.pass);
  if (passing.length > 0) return passing[0]!;
  return [...results].sort((a, b) => a.errors.length - b.errors.length)[0]!;
};

// ─── Internal: absorbToCheckResult ───────────────────────────────────────────

/**
 * Absorb lam-runner and other non-unresponsive errors into a failed
 * LlmCheckResult. ModelUnresponsiveError is re-raised so it propagates
 * all the way up to ModelEvalRunner which skips the whole model.
 */
const absorbToCheckResult = (
  task: Task,
  eff: Effect.Effect<LlmCheckResult, unknown, LanguageModel.LanguageModel | FileSystem.FileSystem | Path.Path>,
): PhiEffect =>
  eff.pipe(
    Effect.catchIf(
      (e): e is Exclude<unknown, ModelUnresponsiveError> =>
        !(e instanceof ModelUnresponsiveError),
      (_e) =>
        Effect.succeed<LlmCheckResult>({
          id: task.id,
          pass: false,
          bits: 0,
          score: 0,
          errors: [`internal error: ${String(_e)}`],
          attempts: 1,
          depth: 0,
        }),
    ),
  ) as PhiEffect;

// ─── Internal: LeafInput / leafCall ──────────────────────────────────────────

/** Input bundle for a single leaf call in the Φ chain. */
type LeafInput = {
  readonly task: Task;
  readonly lambdaPlan: LambdaPlan;
  readonly config: LambdaRlmConfig;
  readonly refBits: number | undefined;
  readonly priorAttempt: string | undefined;
  readonly priorErrors: ReadonlyArray<string>;
};

/**
 * Leaf node of the Φ combinator chain — the ONLY place a neural call occurs.
 *
 * Calls the LLM with either an initial solve prompt or a self-correction
 * retry prompt (when priorAttempt is set), then runs the lam interpreter
 * as the oracle to verify the response.
 */
const leafCall = Effect.fn("leafCall")(function* (input: LeafInput) {
  const isRetry = input.priorAttempt !== undefined;
  const prompt = isRetry
    ? buildRetryPrompt(input.task, input.priorAttempt!, input.priorErrors)
    : buildSolvePrompt(input.task);

  yield* Effect.log(
    `[λ-RLM] ${input.task.id}${isRetry ? " retry" : ""} → prompt (${prompt.length} chars): ${prompt.slice(0, 80).replace(/\n/g, " ")}…`,
  );

  const rawResponse = yield* guardedGenerate(prompt, "rlm").pipe(
    Effect.catchTag("ModelUnresponsiveError", (e) =>
      Effect.fail(new ModelUnresponsiveError(e.model, e.attempts)),
    ),
  );

  const submission = extractLamCode(rawResponse);
  yield* Effect.log(
    `[λ-RLM] ${input.task.id} ← ${rawResponse.slice(0, 200).replace(/\n/g, " ")}`,
  );

  const checkResult = yield* runTask(input.task, submission, input.refBits);
  yield* Effect.log(
    `[λ-RLM] ${input.task.id} check: ${checkResult.pass ? "PASS" : "FAIL"} errors=${checkResult.errors.length}`,
  );

  return { ...checkResult, attempts: 1, depth: 0 } satisfies LlmCheckResult;
});

// ─── Internal: PhiInput / executeΦ ───────────────────────────────────────────

/** Input bundle for one recursive Φ invocation. */
type PhiInput = {
  readonly context: string;
  readonly depthRemaining: number;
  readonly task: Task;
  readonly lambdaPlan: LambdaPlan;
  readonly config: LambdaRlmConfig;
  readonly refBits: number | undefined;
  readonly priorAttempt: string | undefined;
  readonly priorErrors: ReadonlyArray<string>;
};

/**
 * Φ(P, depthRemaining) — the pre-verified combinator chain.
 *
 * Leaf branch (depthRemaining == 0 OR len(P) ≤ τ*):
 *   sub_M(Template.Fmt(P)) → lam checker → LlmCheckResult
 *
 * Non-leaf branch:
 *   Split(P, k*) → Effect.all(Φ(chunk, d-1)) → selectBest(partials)
 *
 * Defined as a plain function (not Effect.fn) so TypeScript can resolve the
 * recursive return type without circular inference issues.
 * Uses Effect.suspend for safe lazy recursion.
 */
const executeΦ = (input: PhiInput): PhiEffect => {
  const isLeaf =
    input.depthRemaining <= 0 ||
    input.context.length <= input.lambdaPlan.tauStar;

  if (isLeaf) {
    return absorbToCheckResult(
      input.task,
      leafCall({
        task: input.task,
        lambdaPlan: input.lambdaPlan,
        config: input.config,
        refBits: input.refBits,
        priorAttempt: input.priorAttempt,
        priorErrors: input.priorErrors,
      }),
    );
  }

  // Non-leaf: Split(P, k*) → Map(Φ, d-1) → Reduce(selectBest)
  const chunks = splitText(input.context, input.lambdaPlan.kStar);

  return absorbToCheckResult(
    input.task,
    Effect.gen(function* () {
      const partials = yield* Effect.all(
        chunks.map((chunk): PhiEffect =>
          Effect.suspend(() =>
            executeΦ({
              ...input,
              context: chunk,
              depthRemaining: input.depthRemaining - 1,
            }),
          ),
        ),
        { concurrency: input.lambdaPlan.kStar },
      );

      const best = selectBest(partials);
      const totalAttempts = partials.reduce(
        (s: number, r: LlmCheckResult) => s + r.attempts,
        0,
      );
      return { ...best, attempts: totalAttempts } satisfies LlmCheckResult;
    }),
  );
};

// ─── Internal: SelfCorrectState / selfCorrect ─────────────────────────────────

/** Accumulated state for the self-correction recursion. */
type SelfCorrectState = {
  readonly result: LlmCheckResult;
  readonly attemptsUsed: number;
  readonly depthRemaining: number;
};

/**
 * Self-correction loop — pure tail recursion via Effect.suspend.
 *
 * If the current result failed and depth remains, issues another leaf call
 * with the checker error lines injected as retry context, then recurses.
 * Terminates when: result.pass is true, or depthRemaining reaches 0.
 *
 * No mutation — all state is carried forward through function arguments.
 */
const selfCorrect = (
  state: SelfCorrectState,
  task: Task,
  lambdaPlan: LambdaPlan,
  config: LambdaRlmConfig,
  refBits: number | undefined,
  effectiveDepth: number,
): PhiEffect => {
  if (state.result.pass || state.depthRemaining <= 0) {
    return Effect.succeed({
      ...state.result,
      attempts: state.attemptsUsed,
      depth: effectiveDepth,
    });
  }

  return Effect.suspend(() =>
    Effect.gen(function* () {
      const retryResult = yield* executeΦ({
        context: buildSolvePrompt(task),
        depthRemaining: 0, // force leaf on retry
        task,
        lambdaPlan,
        config,
        refBits,
        priorAttempt:
          state.result.errors.length > 0
            ? `(prior attempt — ${state.result.errors.length} error(s))`
            : undefined,
        priorErrors: state.result.errors,
      });

      return yield* selfCorrect(
        {
          result: retryResult,
          attemptsUsed: state.attemptsUsed + retryResult.attempts,
          depthRemaining: state.depthRemaining - 1,
        },
        task,
        lambdaPlan,
        config,
        refBits,
        effectiveDepth,
      );
    }),
  );
};

// ─── rlmEval ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a single lambda calculus task using the full λ-RLM algorithm.
 *
 * Runs all 5 phases:
 *   1. Stores the task prompt as context_0 (plain string, no REPL socket).
 *   2. Fires exactly 1 LLM call to detect the task type.
 *   3. Computes the optimal plan analytically (0 LLM calls).
 *   4. Logs the cost estimate.
 *   5. Runs Φ with effectiveDepth = max(plan.depth, config.maxDepth), then
 *      self-corrects via checker feedback until pass or depth exhausted.
 *
 * Returns a LlmCheckResult with the check outcome plus attempts / depth metadata.
 * Never fails — all errors are absorbed into pass:false results.
 */
export const rlmEval = Effect.fn("rlmEval")(function* (
  task: Task,
  refBits?: number,
  config?: LambdaRlmConfig,
) {
  const cfg = config ?? defaultConfig();

  // ── Phase 1: context_0 = task prompt stored as a string ──────────────────
  const context0 = buildSolvePrompt(task);
  const n = context0.length;

  // ── Phase 2: Task Detection — exactly 1 LLM call ─────────────────────────
  const probe = buildTaskDetectionProbe(context0.slice(0, 500), n);
  const probeResponse = yield* guardedGenerate(probe, "probe").pipe(
    Effect.catchTag("ModelUnresponsiveError", (_) => Effect.succeed("7")), // default to GENERAL on failure
  );
  const taskType = parseTaskType(probeResponse);

  // ── Phase 3: Optimal Planning — 0 LLM calls (pure math) ─────────────────
  const lambdaPlan = plan(
    taskType,
    n,
    cfg.contextWindowChars,
    cfg.accuracyTarget,
    cfg.aLeaf,
    cfg.aCompose,
  );

  // ── Phase 4: Log cost estimate ────────────────────────────────────────────
  yield* Effect.log(
    `[λ-RLM] task=${task.id} type=${taskType} k*=${lambdaPlan.kStar} ` +
      `τ*=${lambdaPlan.tauStar} plan.depth=${lambdaPlan.depth} ` +
      `⊕=${lambdaPlan.composeOp} Ĉ≈${lambdaPlan.costEstimate.toFixed(1)}`,
  );

  // ── Phase 5: Execute Φ + self-correction ─────────────────────────────────
  // effectiveDepth = max(plan.depth, maxDepth).
  // For lambda tasks plan.depth=0 always → maxDepth drives self-correction.
  const effectiveDepth = Math.max(lambdaPlan.depth, cfg.maxDepth);

  const firstResult = yield* executeΦ({
    context: context0,
    depthRemaining: effectiveDepth,
    task,
    lambdaPlan,
    config: cfg,
    refBits,
    priorAttempt: undefined,
    priorErrors: [],
  });

  // Self-correction: budget = effectiveDepth - 1 (first attempt consumed 1).
  return yield* selfCorrect(
    {
      result: firstResult,
      attemptsUsed: firstResult.attempts,
      depthRemaining: effectiveDepth - 1,
    },
    task,
    lambdaPlan,
    cfg,
    refBits,
    effectiveDepth,
  );
});
