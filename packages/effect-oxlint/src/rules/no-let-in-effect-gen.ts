import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-let-in-effect-gen
 *
 * Flags let bindings inside Effect.gen / Effect.fn / Effect.fnUntraced
 * that are reassigned (mutable state).
 *
 * From skill: 01-best-practices — "No mutations: no let reassignment inside Effect.gen"
 */
export const noLetInEffectGen = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    let inEffectGen = false;

    return {
      // Track when we enter/exit Effect.gen or Effect.fn
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
      // Check for let declarations
      VariableDeclaration: (node) => {
        if (!inEffectGen || node.kind !== "let") return Effect.void;

        return ctx.report(
          Diagnostic.make({
            node,
            message: "Use Ref, SynchronizedRef, or Effect.cached instead of let bindings in Effect.gen",
          }),
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "No let reassignment inside Effect.gen — use Ref, SynchronizedRef, or Effect.cached",
  }),
  name: "no-let-in-effect-gen",
});
