import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: no-vitest-expect-for-effect
 *
 * Flags expect() from vitest used with Effect values.
 * Use @effect/vitest/utils assertions instead.
 *
 * From skill: 02-vitest-patterns — "Never use expect from vitest for Effect values"
 */
export const noVitestExpectForEffect = Rule.define({
  name: "no-vitest-expect-for-effect",
  meta: Rule.meta({
    type: "warn",
    description: "Use @effect/vitest/utils assertions instead of vitest expect for Effect values",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        // Check if this is expect(...) call
        return Option.match(
          AST.narrow(node.callee, "Identifier"),
          {
            onNone: () => Effect.void,
            onSome: (id) => {
              if (id.name !== "expect") return Effect.void;

              // Check if the argument contains Effect references
              const hasEffectRef = node.arguments.some((arg) => {
                return Option.match(
                  AST.narrow(arg, "Identifier"),
                  {
                    onNone: () => false,
                    onSome: (argId) => {
                      const name = argId.name.toLowerCase();
                      return name.includes("effect")
                        || name.includes("layer")
                        || name.includes("program")
                        || name.includes("result");
                    },
                  },
                );
              });

              if (!hasEffectRef) return Effect.void;

              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Use @effect/vitest/utils assertions (strictEqual, assertTrue, etc.) instead of vitest expect for Effect values",
                }),
              );
            },
          },
        );
      },
    };
  },
});
