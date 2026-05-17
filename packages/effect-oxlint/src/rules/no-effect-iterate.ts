import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: no-effect-iterate
 *
 * Flags Effect.iterate usage which doesn't exist in Effect 4.
 * Use Effect.suspend for recursive loops.
 *
 * From skill: 02-anti-patterns — "Effect.iterate does not exist in Effect 4"
 */
export const noEffectIterate = Rule.define({
  name: "no-effect-iterate",
  meta: Rule.meta({
    type: "error",
    description: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(
          AST.matchMember(node, "Effect", "iterate"),
          {
            onNone: () => Effect.void,
            onSome: (matched) =>
              ctx.report(
                Diagnostic.make({
                  node: matched,
                  message: "Effect.iterate does not exist in Effect 4 — use Effect.suspend for recursive loops",
                }),
              ),
          },
        );
      },
    };
  },
});
