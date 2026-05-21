import * as Effect from "effect/Effect";

import { Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

/**
 * Rule: no-platform-imports-in-domain
 *
 * Flags platform-specific imports (effect/unstable/*, @effect/platform-*)
 * in packages/domain/ which should only import from "effect".
 *
 * From skill: 01-best-practices — "Domain package — no platform imports"
 */
export const noPlatformImportsInDomain = Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      ImportDeclaration: (node) => {
        // Only check files in packages/domain/
        const filename = ctx.filename;
        if (!filename.includes("packages/domain/")) return Effect.void;

        const source = node.source.value as string;

        // Check for platform-specific imports
        const isPlatformImport =
          source.startsWith("effect/unstable/") ||
          source.startsWith("@effect/platform") ||
          source.startsWith("@effect/platform-bun") ||
          source.startsWith("@effect/platform-node") ||
          source.startsWith("@effect/platform-browser");

        if (!isPlatformImport) return Effect.void;

        return ctx.report(
          Diagnostic.make({
            node,
            message: `Domain package must not import platform-specific module "${source}" — only import from "effect"`,
          }),
        );
      },
    } as Visitor.TypedEffectVisitor;
  },
  meta: Rule.meta({
    type: "problem",
    description: "Domain package must not import platform-specific modules — only import from 'effect'",
  }),
  name: "no-platform-imports-in-domain",
});
