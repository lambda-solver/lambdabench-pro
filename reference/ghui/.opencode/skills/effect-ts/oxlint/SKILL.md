> **Always use package.json CLI commands** (`bun lint`, `bun lint:fix`) — never invoke `npx oxlint` or `oxlint` directly.

## Lint vs Format: What's the Difference?

Our project uses **oxlint** for linting and **oxfmt** for formatting (not ESLint/Prettier/Biome). Two commands sound similar but do different things:

| Command            | Script                           | What it does                                     | Speed |
| ------------------ | -------------------------------- | ------------------------------------------------ | ----- |
| `bun lint`         | `oxlint --config .oxlintrc.json` | Runs lint rules (correctness, suspicious, style) | Fast  |
| `bun format:check` | `oxfmt . --check`                | Checks formatting only                           | Fast  |

**When to use each:**

- `bun lint` — Quick check during development. Catches the most common issues fast.
- `bun format:check` — The **formatting gate**. This is what GitHub Actions runs. It catches formatting mistakes.
- `bun lint:fix` — Auto-fixes lint issues via oxlint.
- `bun format` — Auto-fixes formatting issues via oxfmt.

**Why run both?** `bun lint` catches code issues. `bun format:check` catches formatting issues. Running both ensures nothing slips through.

## oxlint Rules (Enforced in CI)

From `.oxlintrc.json` — key rules:

| Rule                              | What it means                        | Level |
| --------------------------------- | ------------------------------------ | ----- |
| `typescript/no-explicit-any`      | Ban the `any` type                   | warn  |
| `eslint/prefer-const`             | Use `const` over `let`               | error |
| `eslint/no-extra-boolean-cast`    | No unnecessary `!!` or `Boolean()`   | warn  |
| `unicorn/no-useless-spread`       | No unnecessary spread operators      | warn  |
| `eslint/no-underscore-dangle`     | No underscore prefixes (except `_tag`) | warn |
| `eslint/no-console`               | No `console.log` in prod code        | warn  |
| `repo/no-linter-disable-comments` | No blanket lint suppression comments | warn  |

The `@mpsuesser/oxlint-plugin-effect` plugin adds 54 Effect-specific rules (`effect/prefer-effect-fn`, `effect/avoid-try-catch`, etc.). See the full plugin docs for details.

Note: `eslint/no-console` is relaxed to `off` in test files (`**/*.test.ts`, `**/*.test.tsx`).

## Important Files

- `.github/workflows/check.yml` — CI lint/type-check/test
- `.github/workflows/benchmark.yml` — Auto-commits results, deploys to Pages
- `apps/client/public/data/results.json` — Auto-modified by CI; never edit manually

# Writing oxlint Custom Rules with Effect

> Skill: effect-ts/oxlint — Write custom oxlint rules using Effect v4 patterns

## Overview

This project uses `@mpsuesser/oxlint-plugin-effect` for Effect-specific linting. When you need custom rules beyond the 54 built-in ones, use `effect-oxlint` to write them with Effect idioms.

## Installation

```bash
# The plugin is already installed in this project
# For custom rule development:
bun add -D effect-oxlint @oxlint/plugins
```

## Rule Structure

### Basic Rule with Effect

```typescript
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

const noJsonParse = Rule.define({
  name: "no-json-parse",
  meta: Rule.meta({
    type: "suggestion",
    description: "Use Schema for JSON decoding instead of JSON.parse",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      MemberExpression: (node) =>
        Option.match(AST.matchMember(node, "JSON", ["parse", "stringify"]), {
          onNone: () => Effect.void,
          onSome: (matched) =>
            ctx.report(
              Diagnostic.make({
                node: matched,
                message: "Use Schema for JSON",
              }),
            ),
        }),
    };
  },
});
```

### Convenience Factories

```typescript
import { Rule } from "effect-oxlint";

// Ban a member expression
const noMathRandom = Rule.banMember("Math", "random", {
  message: "Use the Effect Random service instead",
});

// Ban an import
const noNodeFs = Rule.banImport("node:fs", {
  message: "Use the Effect FileSystem service instead",
});

// Ban a statement type
const noThrow = Rule.banStatement("ThrowStatement", {
  message: "Use Effect.fail instead of throw",
});

// Ban bare identifier calls
const noFetch = Rule.banCallOf("fetch", {
  message: "Use Effect HTTP client instead",
});

// Ban method calls
const noRunSync = Rule.banCallOfMember("Effect", ["runSync", "runPromise"], {
  message: "Keep effects composable — run only at the entry point",
});

// Ban new expressions
const noNewDate = Rule.banNewExpr("Date", {
  message: "Use Clock service instead",
});

// Combine multiple patterns
const noImperativeLoops = Rule.banMultiple(
  {
    statements: ["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"],
  },
  { message: "Use Arr.map / Effect.forEach instead" },
);
```

## Plugin Assembly

```typescript
import { Plugin } from "effect-oxlint";

export default Plugin.define({
  name: "my-effect-rules",
  rules: {
    "no-json-parse": noJsonParse,
    "no-math-random": noMathRandom,
    "no-node-fs": noNodeFs,
    "no-throw": noThrow,
  },
});
```

## Testing Rules

```typescript
import { describe, expect, test } from "@effect/vitest";
import { Rule } from "effect-oxlint";
import * as Testing from "effect-oxlint/testing";
import * as Option from "effect/Option";

describe("no-json-parse", () => {
  test("reports JSON.parse", () => {
    const result = Testing.runRule(noJsonParse, "MemberExpression", Testing.memberExpr("JSON", "parse"));
    Testing.expectDiagnostics(result, [{ message: "Use Schema for JSON" }]);
  });

  test("ignores other member expressions", () => {
    const result = Testing.runRule(noJsonParse, "MemberExpression", Testing.memberExpr("console", "log"));
    Testing.expectNoDiagnostics(result);
  });
});
```

## Built-in Plugin Rules

The `@mpsuesser/oxlint-plugin-effect` plugin provides 54 rules. Key categories:

### Anti-patterns to Avoid

- `effect/avoid-any` — `as any` and `as unknown as T` casts
- `effect/avoid-try-catch` — `try/catch` in Effect code
- `effect/avoid-mutable-state` — `let` bindings in service factories
- `effect/avoid-native-fetch` — Native `fetch()` instead of HttpClient
- `effect/avoid-process-env` — `process.env` instead of Config service
- `effect/avoid-sync-fs` — Synchronous fs calls
- `effect/throw-in-effect-gen` — `throw` inside Effect.gen

### Prefer Effect APIs

- `effect/prefer-effect-fn` — Use `Effect.fn("name")` for named functions
- `effect/prefer-arr-match` — Use `Arr.match` instead of manual length checks
- `effect/prefer-arr-sort` — Use `Arr.sort` with Order instead of `.sort()`
- `effect/prefer-duration-constructors` — Use `Duration.seconds(5)` instead of `5000`
- `effect/prefer-effect-is` — Use `P.isString` instead of `typeof x === "string"`
- `effect/prefer-match-over-switch` — Use `Match.value` instead of `switch`
- `effect/prefer-namespace-imports` — Use `import * as Arr from "effect/Array"`

### Service Usage

- `effect/use-filesystem-service` — Use FileSystem instead of `node:fs`
- `effect/use-http-client-service` — Use HttpClient instead of `node:http`
- `effect/use-path-service` — Use Path service instead of `node:path`
- `effect/use-clock-service` — Use Clock/DateTime instead of `new Date()`
- `effect/use-console-service` — Use `Effect.log*` instead of `console.*`
- `effect/use-random-service` — Use Random service instead of `Math.random()`

### Schema Patterns

- `effect/avoid-data-tagged-error` — Use `Schema.TaggedErrorClass` instead of `Data.TaggedError`
- `effect/prefer-schema-class` — Use `Schema.Class` instead of `Schema.Struct`
- `effect/require-schema-type-alias` — Export type alias for schema constants
- `effect/avoid-direct-tag-checks` — Use `$is` / `$match` helpers instead of `._tag`

## Configuration

```json
{
  "plugins": ["@mpsuesser/oxlint-plugin-effect"],
  "categories": {
    "recommended": "error"
  },
  "rules": {
    "effect/avoid-native-object-helpers": "off"
  }
}
```

## Suppression

```typescript
// oxlint-disable-next-line effect/avoid-try-catch -- gating a third-party callback

try { ... } catch (e) { ... }
```

Always include a `-- reason` comment for suppressions that live longer than a single PR review.

## Resources

- [effect-oxlint](https://github.com/mpsuesser/effect-oxlint) — SDK for writing oxlint rules with Effect
- [oxlint-plugin-effect](https://github.com/mpsuesser/oxlint-plugin-effect) — 54 built-in Effect rules
- [oxlint documentation](https://oxc.rs/docs/guide/usage/linter.html)
