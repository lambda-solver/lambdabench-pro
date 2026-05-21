import * as Effect from "effect/Effect";

import { Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-service-bind
 *
 * Detects .bind() calls on service-like objects (e.g., Cloudflare.R2Bucket.bind(Tickets)).
 * This pattern mixes dependency acquisition with runtime logic.
 * Use Context.Service with Layer instead.
 *
 * From skill: 01-best-practices — "Context.Service for all service definitions"
 */
export const noServiceBind = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        // Only match when callee is a non-computed MemberExpression
        if (node.callee.type !== "MemberExpression") return Effect.void;
        if (node.callee.computed) return Effect.void;
        // Check if property name is "bind"
        const propNode = node.callee.property;
        if (propNode.type !== "Identifier" || propNode.name !== "bind") return Effect.void;

        // Only flag if first argument exists and is PascalCase (service class naming)
        const firstArg = node.arguments[0];
        const isPascalCaseArg =
          firstArg !== undefined &&
          firstArg.type === "Identifier" &&
          /^[A-Z]/.test(firstArg.name);
        if (!isPascalCaseArg) return Effect.void;

        return ctx.report(
          Diagnostic.make({
            node,
            message:
              "Avoid .bind() on service objects with PascalCase identifiers. Use Context.Service with Layer for dependency injection instead.",
          }),
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid .bind() on service objects — use Context.Service with Layer for dependency injection",
  }),
  name: "no-service-bind",
});
