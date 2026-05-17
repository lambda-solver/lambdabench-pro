import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: no-for-loops-in-effect-gen
 *
 * Flags for/while/do-while loops inside Effect.gen.
 * Use Effect.forEach instead.
 *
 * From skill: 01-best-practices — "No for loops — use Effect.forEach"
 */
export const noForLoopsInEffectGen = Rule.define({
  name: "no-for-loops-in-effect-gen",
  meta: Rule.meta({
    type: "suggestion",
    description: "Use Effect.forEach instead of imperative loops in Effect code",
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
      ForStatement: (node) => {
        if (!inEffectGen) return Effect.void;
        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Effect.forEach instead of for loops in Effect.gen",
          }),
        );
      },
      ForOfStatement: (node) => {
        if (!inEffectGen) return Effect.void;
        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Effect.forEach instead of for...of loops in Effect.gen",
          }),
        );
      },
      WhileStatement: (node) => {
        if (!inEffectGen) return Effect.void;
        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Effect.iterate or Effect.repeat instead of while loops in Effect.gen",
          }),
        );
      },
    };
  },
});
