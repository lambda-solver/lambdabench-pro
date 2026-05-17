import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

/**
 * Rule: prefer-tagged-error-class
 *
 * Flags Data.TaggedError usage and enforces Schema.TaggedErrorClass.
 *
 * From skill: 03-error-handling — "Use Schema.TaggedErrorClass for serializable errors"
 */
export const preferTaggedErrorClass = Rule.define({
  name: "prefer-tagged-error-class",
  meta: Rule.meta({
    type: "error",
    description: "Use Schema.TaggedErrorClass instead of Data.TaggedError for serializable errors",
  }),
  create: function*() {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(
          AST.matchMember(node, "Data", "TaggedError"),
          {
            onNone: () => Effect.void,
            onSome: (matched) =>
              ctx.report(
                Diagnostic.make({
                  node: matched,
                  message:
                    "Use Schema.TaggedErrorClass instead of Data.TaggedError for serializable, round-trippable errors",
                }),
              ),
          },
        );
      },
    };
  },
});
