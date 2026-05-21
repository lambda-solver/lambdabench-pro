/**
 * Binding packages must stay platform-agnostic. They wrap external systems
 * (CLIs, APIs, databases) and should depend on `@effect/platform` abstract
 * interfaces — never on `@effect/platform-bun` or `@effect/platform-node`
 * concrete implementations. Those layers belong in the runtime/entry-point.
 *
 * This rule is scoped to files under `packages/<name>/binding/` precisely
 * because outside binding packages (e.g. application entry points)
 * importing `@effect/platform-bun` is correct.
 */

import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { AST, Diagnostic, Rule, RuleContext, Visitor } from "effect-oxlint";

import { pipe } from "effect/Function";

// ---------------------------------------------------------------------------
// Branded domain types
// ---------------------------------------------------------------------------

/**
 * A file path inside a binding package: matches `packages/<name>/binding/...`
 * anywhere in the path.
 */
const BindingPackagePath = Schema.String.check(
  Schema.isPattern(/(?:^|\/)packages\/[^/]+\/binding\//, {
    description: "A file path that resolves under `packages/<name>/binding/`.",
    identifier: "BindingPackagePathCheck",
    message: "Path must be inside a binding package",
    title: "Binding Package Path",
  }),
).pipe(
  Schema.brand("BindingPackagePath"),
  Schema.annotate({
    description:
      "Absolute file path inside `packages/<name>/binding/` — the only files where platform-bun imports are forbidden.",
    title: "BindingPackagePath",
  }),
);

const isBindingPackagePath = Schema.is(BindingPackagePath);

/**
 * An import source that points at the concrete Bun platform package —
 * either the root or any submodule.
 */
const PlatformBunImportSource = Schema.String.check(
  Schema.makeFilter((src: string) => src === "@effect/platform-bun" || src.startsWith("@effect/platform-bun/"), {
    description: "An import source naming `@effect/platform-bun` or any of its submodules.",
    identifier: "PlatformBunImportSourceCheck",
    message: "Import source must name @effect/platform-bun or a submodule",
    title: "Platform-Bun Import Source",
  }),
).pipe(
  Schema.brand("PlatformBunImportSource"),
  Schema.annotate({
    description: "Concrete Bun platform-binding import source. Forbidden inside binding packages; allowed elsewhere.",
    title: "PlatformBunImportSource",
  }),
);

const isPlatformBunImportSource = Schema.is(PlatformBunImportSource);

// ---------------------------------------------------------------------------
// Rule
// ---------------------------------------------------------------------------

const MESSAGE =
  "Binding packages must be platform-agnostic. Import from `@effect/platform` (abstract interfaces) instead of `@effect/platform-bun` (concrete implementations). Platform layers belong in the runtime entry point.";

export default Rule.define({
  create: function* () {
    const ctx = yield* RuleContext;
    return yield* Visitor.filter(
      isBindingPackagePath,
      Visitor.on("ImportDeclaration", (node) =>
        pipe(
          AST.matchImport(node, isPlatformBunImportSource),
          Option.match({
            onNone: () => Effect.void,
            onSome: (matched) =>
              ctx.report(
                Diagnostic.make({
                  node: matched,
                  message: MESSAGE,
                }),
              ),
          }),
        ),
      ),
    );
  },
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Forbid `@effect/platform-bun` imports inside `packages/<name>/binding/` — bindings stay platform-agnostic; concrete platforms wire up at the runtime entry point.",
  }),
  name: "avoid-platform-coupling",
});
