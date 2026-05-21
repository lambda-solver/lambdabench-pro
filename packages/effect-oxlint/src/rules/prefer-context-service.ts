import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: prefer-context-service
 *
 * Flags old service definition patterns and enforces Context.Service.
 *
 * From skill: 01-best-practices — "Context.Service for all service definitions"
 */
export const preferContextService = Rule.define<undefined>({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) => {
        return Option.match(AST.matchMember(node, "Context", ["Tag", "GenericTag"]), {
          onNone: () => Effect.void,
          onSome: (matched) =>
            ctx.report(
              Diagnostic.make({
                node: matched,
                message: "Use Context.Service instead of Context.Tag / Context.GenericTag",
              }),
            ),
        });
      },
      CallExpression: (node) => {
        return Option.match(AST.matchCallOf(node, "Effect", "Service"), {
          onNone: () => Effect.void,
          onSome: () =>
            ctx.report(
              Diagnostic.make({
                node,
                message: "Use Context.Service instead of Effect.Service (deprecated in v4)",
              }),
            ),
        });
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Use Context.Service instead of Context.Tag, Context.GenericTag, or Effect.Service",
  }),
  name: "prefer-context-service",
});
