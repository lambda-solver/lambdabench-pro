import * as Effect from "effect/Effect";

import { Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Linter disable directive patterns to detect.
 *
 * These prefixes in comments indicate a developer is suppressing
 * a linter rule rather than fixing the underlying issue.
 */
const DISABLE_PATTERNS = [
  "oxlint-disable",
  "eslint-disable",
  "tslint-disable",
  "biome-ignore",
  "stylelint-disable",
] as const;

/**
 * Check whether a comment value (text after delimiters) contains
 * a linter disable directive.
 */
const isDisableComment = (value: string): boolean => {
  const trimmed = value.trim();
  return DISABLE_PATTERNS.some((pattern) => trimmed.startsWith(pattern));
};

/**
 * Rule: no-linter-disable-comments
 *
 * Detects commented-out linter disable directives and reports a warning.
 * These are code smells that hide real issues — fix the underlying problem
 * instead of silencing the linter.
 */
export const noLinterDisableComments = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (node) => {
        const comments = (node as unknown as Record<string, unknown>).comments as
          | ReadonlyArray<{ readonly value: string }>
          | undefined;

        if (!comments || comments.length === 0) {
          return Effect.void;
        }

        const reportEffects = comments
          .filter((c) => isDisableComment(c.value))
          .map((c) =>
            ctx.report(
              Diagnostic.make({
                node: c as unknown as { range: [number, number] },
                message:
                  "Do not disable linter rules with comments. Fix the underlying issue instead.",
              }),
            ),
          );

        if (reportEffects.length === 0) {
          return Effect.void;
        }

        return Effect.all(reportEffects, { discard: true });
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Detects commented-out linter disable directives (oxlint-disable, eslint-disable, tslint-disable, biome-ignore, stylelint-disable) — fix the issue instead of suppressing the rule.",
  }),
  name: "no-linter-disable-comments",
});
