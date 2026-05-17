import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: prefer-effect-fn
 *
 * Enforces using Effect.fn for named exported functions instead of
 * plain Effect.gen assigned to a const.
 *
 * From skill: 01-best-practices — "Effect.fn for all named exported functions"
 */
export const preferEffectFn = Rule.define({
  name: "prefer-effect-fn",
  meta: Rule.meta({
    type: "suggestion",
    description: "Use Effect.fn for named exported functions instead of plain Effect.gen",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    return {
      VariableDeclarator: (node) => {
        // Check if it's an exported variable
        const isExported = Option.match(
          AST.findAncestor(node, "ExportNamedDeclaration"),
          { onNone: () => false, onSome: () => true },
        );

        if (!isExported) return Effect.void;

        // Check if the init is Effect.gen
        return Option.match(
          AST.narrow(node.init, "CallExpression"),
          {
            onNone: () => Effect.void,
            onSome: (callExpr) =>
              Option.match(
                AST.matchCallOf(callExpr, "Effect", "gen"),
                {
                  onNone: () => Effect.void,
                  onSome: () =>
                    ctx.report(
                      Diagnostic.make({
                        node,
                        message: "Use Effect.fn('name')(function* () { ... }) for named exported functions",
                      }),
                    ),
                },
              ),
          },
        );
      },
    };
  },
});
