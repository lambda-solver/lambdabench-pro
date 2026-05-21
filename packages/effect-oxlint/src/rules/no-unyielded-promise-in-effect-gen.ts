import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Async method names commonly used on service-like objects (R2, S3, fetch, etc.).
 * These return Promises and must be wrapped with yield* Effect.tryPromise inside Effect.gen.
 */
const asyncMethodNames = new Set([
  "put",
  "get",
  "post",
  "delete",
  "patch",
  "fetch",
  "send",
  "write",
  "read",
]);

/**
 * Check if a CallExpression node has a parent YieldExpression with delegate=true (yield*).
 */
const hasYieldDelegateParent = (node: unknown): boolean => {
  const parent = (node as { parent?: { type?: string; delegate?: boolean } }).parent;
  return parent !== undefined && parent.type === "YieldExpression" && parent.delegate === true;
};

/**
 * Rule: no-unyielded-promise-in-effect-gen
 *
 * Detects promise-returning method calls inside Effect.gen/Effect.fn/Effect.fnUntraced
 * that are not wrapped with yield*. Common AI mistake: calling async APIs directly
 * instead of wrapping in Effect.
 *
 * From skill: 01-best-practices — "No await in Effect.gen — use Effect.tryPromise"
 */
export const noUnyieldedPromiseInEffectGen = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    let effectGenDepth = 0;

    return {
      CallExpression: (node) => {
        const isEffectGen = Option.isSome(AST.matchCallOf(node, "Effect", "gen"));
        const isEffectFn = Option.isSome(AST.matchCallOf(node, "Effect", "fn"));
        const isEffectFnUntraced = Option.isSome(AST.matchCallOf(node, "Effect", "fnUntraced"));

        if (isEffectGen || isEffectFn || isEffectFnUntraced) {
          effectGenDepth++;
          return Effect.void;
        }

        // Only check calls inside Effect.gen / Effect.fn / Effect.fnUntraced
        if (effectGenDepth === 0) return Effect.void;

        // Check if the call is a non-computed member expression with an async method name
        if (node.callee.type !== "MemberExpression" || node.callee.computed) return Effect.void;

        const propNode = node.callee.property;
        if (propNode.type !== "Identifier") return Effect.void;
        const methodName = propNode.name;

        if (!asyncMethodNames.has(methodName)) return Effect.void;

        // Exempt calls already wrapped with yield*
        if (hasYieldDelegateParent(node)) return Effect.void;

        return ctx.report(
          Diagnostic.make({
            node,
            message:
              "Async method calls inside Effect.gen must be wrapped with yield* Effect.tryPromise() or similar",
          }),
        );
      },
      "CallExpression:exit": (node) => {
        const isEffectGen = Option.isSome(AST.matchCallOf(node, "Effect", "gen"));
        const isEffectFn = Option.isSome(AST.matchCallOf(node, "Effect", "fn"));
        const isEffectFnUntraced = Option.isSome(AST.matchCallOf(node, "Effect", "fnUntraced"));

        if (isEffectGen || isEffectFn || isEffectFnUntraced) {
          effectGenDepth--;
        }
        return Effect.void;
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description:
      "Async method calls inside Effect.gen must be wrapped with yield* — use Effect.tryPromise",
  }),
  name: "no-unyielded-promise-in-effect-gen",
});
