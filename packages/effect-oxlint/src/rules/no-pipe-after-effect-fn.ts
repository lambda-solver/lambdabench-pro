import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-pipe-after-effect-fn
 *
 * Flags .pipe() called on Effect.fn() result.
 * Operators in .pipe lose the span's argument context.
 *
 * From skill: 02-anti-patterns — ".pipe after Effect.fn"
 */
export const noPipeAfterEffectFn = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        // Check if this is a .pipe() call
        return Option.match(AST.narrow(node.callee, "MemberExpression"), {
          onNone: () => Effect.void,
          onSome: (memberExpr) => {
            // Check if property is "pipe"
            const isPipe = Option.match(AST.narrow(memberExpr.property, "Identifier"), {
              onNone: () => false,
              onSome: (id) => id.name === "pipe",
            });
            if (!isPipe) return Effect.void;

            // Check if the object is a call to Effect.fn
            return Option.match(AST.narrow(memberExpr.object, "CallExpression"), {
              onNone: () => Effect.void,
              onSome: (callExpr) =>
                Option.match(AST.matchCallOf(callExpr, "Effect", "fn"), {
                  onNone: () => Effect.void,
                  onSome: () =>
                    ctx.report(
                      Diagnostic.make({
                        node,
                        message: "Pass operators as additional arguments to Effect.fn instead of .pipe",
                      }),
                    ),
                }),
            });
          },
        });
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Don't use .pipe after Effect.fn — pass operators as additional arguments",
  }),
  name: "no-pipe-after-effect-fn",
});
