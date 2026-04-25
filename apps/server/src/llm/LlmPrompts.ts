/**
 * LlmPrompts.ts — Pure prompt-builder functions for lambda calculus eval.
 *
 * No Effect imports — fully unit-testable without a runtime.
 * Used by LambdaRlm.ts for Phase 2 (task detection) and Phase 5 (leaf calls).
 */

import type { Task } from "../check/Check";

// ─── buildSolvePrompt ─────────────────────────────────────────────────────────

/**
 * Build the initial solve prompt for a lambda calculus task.
 *
 * Includes the task description and all example test cases formatted as
 * `expr / = want` pairs. Instructs the model to reply with ONLY a bare
 * `@main = <lambda-expression>` — no prose, no markdown fences.
 */
export const buildSolvePrompt = (task: Task): string => {
  const testLines = task.tests
    .map((t) => `  ${t.expr}\n  = ${t.want}`)
    .join("\n\n");

  return [
    `You are solving a lambda calculus task. Reply with ONLY the lambda expression — no explanation, no markdown, no prose.`,
    ``,
    `## Task`,
    task.desc,
    ``,
    `## Example tests`,
    testLines,
    ``,
    `## Instructions`,
    `Write a single definition "@main = <lambda-expression>" that satisfies all tests.`,
    `Use λ (or \\) for lambda abstraction. Use @name to reference other definitions if needed.`,
    `Reply with ONLY the @main = ... line (and any helper definitions above it). Nothing else.`,
  ].join("\n");
};

// ─── buildRetryPrompt ─────────────────────────────────────────────────────────

/**
 * Build a self-correction retry prompt for a failed lambda calculus attempt.
 *
 * Includes the original task, the prior attempt, and the lam checker error
 * lines. Used by the λ-RLM self-correction loop (Phase 5, depth > 0) to
 * feed checker feedback back to the model as context.
 */
export const buildRetryPrompt = (
  task: Task,
  priorAttempt: string,
  errors: ReadonlyArray<string>,
): string => {
  const testLines = task.tests
    .map((t) => `  ${t.expr}\n  = ${t.want}`)
    .join("\n\n");

  const errorLines = errors.map((e) => `  ${e}`).join("\n");

  return [
    `You are solving a lambda calculus task. Reply with ONLY the lambda expression — no explanation, no markdown, no prose.`,
    ``,
    `## Task`,
    task.desc,
    ``,
    `## Example tests`,
    testLines,
    ``,
    `## Your previous attempt`,
    "```",
    priorAttempt,
    "```",
    ``,
    `## Checker errors from the lam interpreter`,
    errorLines,
    ``,
    `## Instructions`,
    `Fix the errors above and write a corrected "@main = <lambda-expression>".`,
    `Reply with ONLY the @main = ... line (and any helper definitions above it). Nothing else.`,
  ].join("\n");
};

// ─── buildTaskDetectionProbe ──────────────────────────────────────────────────

/**
 * Build the λ-RLM Phase 2 task-type detection prompt.
 *
 * This is the single menu-selection LLM call that fires before the Φ
 * combinator chain. Returns a 7-option digit menu matching the task types
 * in LambdaPlan.ts. The model replies with a single digit (1–7).
 *
 * Mirrors the reference `_TASK_DETECTION_PROMPT` with metadata adapted
 * for lambda calculus task descriptions.
 */
export const buildTaskDetectionProbe = (
  taskPreview: string,
  n: number,
): string => {
  const metadata = `length=${n}, preview=${JSON.stringify(taskPreview.slice(0, 150))}`;

  return [
    `Based on the metadata below, select the single most appropriate task type.`,
    ``,
    `Metadata: ${metadata}`,
    ``,
    `Reply with ONLY a single digit (no other text):`,
    `1. summarization - condense/summarize content`,
    `2. qa - answer a question using context`,
    `3. translation - translate text`,
    `4. classification - categorize/label text`,
    `5. extraction - extract specific facts or entities`,
    `6. analysis - deep analysis or evaluation`,
    `7. general - mixed or other`,
    ``,
    `Single digit:`,
  ].join("\n");
};
