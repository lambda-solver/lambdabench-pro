import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: no-catchall
 *
 * Flags Effect.catchAll usage which doesn't exist in Effect 4.
 * Use Effect.catch instead.
 *
 * From skill: 02-anti-patterns — "Effect.catchAll does not exist in Effect 4"
 */
export const noCatchAll = Rule.define({
  name: "no-catchall",
  meta: Rule.meta({
    type: "error",
    description: "Effect.catchAll does not exist in Effect 4 — use Effect.catch",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(
          AST.matchMember(node, "Effect", "catchAll"),
          {
            onNone: () => Effect.void,
            onSome: (matched) =>
              ctx.report(
                Diagnostic.make({
                  node: matched,
                  message: "Effect.catchAll does not exist in Effect 4 — use Effect.catch",
                }),
              ),
          },
        );
      },
    };
  },
});
