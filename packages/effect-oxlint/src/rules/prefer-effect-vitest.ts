import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: prefer-effect-vitest
 *
 * Flags imports of it/describe from "vitest" instead of "@effect/vitest".
 *
 * From skill: 02-vitest-patterns — "Always import it/describe from @effect/vitest"
 */
export const preferEffectVitest = Rule.define<undefined>({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      ImportDeclaration: (node) => {
        const source = node.source.value as string;
        if (source !== "vitest") return Effect.void;

        // Check if it or describe are imported
        const hasItOrDescribe = node.specifiers.some((spec) => {
          return Option.match(AST.narrow(spec, "ImportSpecifier"), {
            onNone: () => false,
            onSome: (importSpec) => {
              const name = Option.match(AST.narrow(importSpec.imported, "Identifier"), {
                onNone: () => null,
                onSome: (id) => id.name,
              });
              return name === "it" || name === "describe";
            },
          });
        });

        if (!hasItOrDescribe) return Effect.void;

        return ctx.report(
          Diagnostic.make({
            node,
            message: "Import it and describe from @effect/vitest instead of vitest",
          }),
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Import it and describe from @effect/vitest, not vitest",
  }),
  name: "prefer-effect-vitest",
});
