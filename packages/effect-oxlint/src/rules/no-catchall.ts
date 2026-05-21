import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-catchall
 *
 * Flags Effect.catchAll usage which doesn't exist in Effect 4.
 * Use Effect.catch instead.
 *
 * From skill: 02-anti-patterns — "Effect.catchAll does not exist in Effect 4"
 */
export const noCatchAll = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(AST.matchMember(node, "Effect", "catchAll"), {
          onNone: () => Effect.void,
          onSome: (matched) =>
            ctx.report(
              Diagnostic.make({
                node: matched,
                message: "Effect.catchAll does not exist in Effect 4 — use Effect.catch",
              }),
            ),
        });
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Effect.catchAll does not exist in Effect 4 — use Effect.catch",
  }),
  name: "no-catchall",
});
