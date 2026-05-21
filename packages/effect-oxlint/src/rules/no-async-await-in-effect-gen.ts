import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-async-await-in-effect-gen
 *
 * Flags async/await inside Effect.gen / Effect.fn / Effect.fnUntraced.
 * await mixes runtimes and promise errors escape the channel.
 *
 * From skill: 01-best-practices — "No async/await inside Effect.gen"
 */
export const noAsyncAwaitInEffectGen = Rule.define({
  create: function* () {
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
      AwaitExpression: (node) => {
        if (!inEffectGen) return Effect.void;
        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Effect.tryPromise instead of await in Effect.gen",
          }),
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "No async/await inside Effect.gen — use Effect.tryPromise",
  }),
  name: "no-async-await-in-effect-gen",
});
