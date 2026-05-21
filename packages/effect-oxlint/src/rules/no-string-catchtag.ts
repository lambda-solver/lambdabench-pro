import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Check if an AST node is a string literal.
 */
const isStringLiteral = (node: unknown): node is { type: "Literal"; value: string } =>
  typeof node === "object" &&
  node !== null &&
  "type" in node &&
  (node as { type: string }).type === "Literal" &&
  "value" in node &&
  typeof (node as { value: unknown }).value === "string";

/**
 * Rule: no-string-catchtag
 *
 * Detects Effect.catchTag("stringLiteral", handler) which is fragile.
 * Typed error classes (Schema.TaggedErrorClass) should be used instead
 * for type-safe error handling.
 *
 * From skill: 03-error-handling — "Use typed errors with catchTag"
 */
export const noStringCatchTag = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        return Option.match(
          AST.matchCallOf(node, "Effect", ["catchTag", "catchTags"]),
          {
            onNone: () => Effect.void,
            onSome: (matched) => {
              const firstArg = matched.arguments[0];
              if (firstArg && isStringLiteral(firstArg)) {
                return ctx.report(
                  Diagnostic.make({
                    node: matched,
                    message:
                      "Avoid string literals in catchTag. Use typed error classes (Schema.TaggedErrorClass) for type-safe error handling.",
                  }),
                );
              }
              return Effect.void;
            },
          },
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description:
      "Avoid string literals in catchTag — use typed error classes for type-safe error handling",
  }),
  name: "no-string-catchtag",
});
