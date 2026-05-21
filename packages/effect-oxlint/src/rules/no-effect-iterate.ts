import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-effect-iterate
 *
 * Flags Effect.iterate usage which doesn't exist in Effect 4.
 * Use Effect.suspend for recursive loops.
 *
 * From skill: 02-anti-patterns — "Effect.iterate does not exist in Effect 4"
 */
export const noEffectIterate = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(AST.matchMember(node, "Effect", "iterate"), {
          onNone: () => Effect.void,
          onSome: (matched) =>
            ctx.report(
              Diagnostic.make({
                node: matched,
                message: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops",
              }),
            ),
        });
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops",
  }),
  name: "no-effect-iterate",
});
