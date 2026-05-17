import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: no-try-catch-in-effect-gen
 *
 * Flags try/catch blocks inside Effect.gen / Effect.fn / Effect.fnUntraced.
 * try/catch escapes the error channel.
 *
 * From skill: 01-best-practices — "No try/catch inside Effect.gen"
 */
export const noTryCatchInEffectGen = Rule.define({
  name: "no-try-catch-in-effect-gen",
  meta: Rule.meta({
    type: "error",
    description: "No try/catch inside Effect.gen — use Effect.catchTag / Effect.catch",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    let inEffectGen = false;

    return {
      CallExpression: (node) => {
        const isEffectGen = Option.isSome(AST.matchCallOf(node, "Effect", "gen"));
        const isEffectFn = Option.isSome(AST.matchCallOf(node, "Effect", "fn"));
        const isEffectFnUntraced = Option.isSome(AST.matchCallOf(node, "Effect", "fnUntraced"));

        if (isEffectGen || isEffectFn || isEffectFnUntraced) {
          inEffectGen = true;
        }
        return Effect.void;
      },
      "CallExpression:exit": (node) => {
        const isEffectGen = Option.isSome(AST.matchCallOf(node, "Effect", "gen"));
        const isEffectFn = Option.isSome(AST.matchCallOf(node, "Effect", "fn"));
        const isEffectFnUntraced = Option.isSome(AST.matchCallOf(node, "Effect", "fnUntraced"));

        if (isEffectGen || isEffectFn || isEffectFnUntraced) {
          inEffectGen = false;
        }
        return Effect.void;
      },
      TryStatement: (node) => {
        if (!inEffectGen) return Effect.void;
        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Effect.catchTag or Effect.catch instead of try/catch in Effect.gen",
          }),
        );
      },
    };
  },
});
