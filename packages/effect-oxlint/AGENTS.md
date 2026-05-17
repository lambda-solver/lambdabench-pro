# Effect Oxlint Package

> Custom oxlint rules for this monorepo based on Effect v4 patterns.

## Purpose

This package contains custom oxlint rules that enforce patterns from our Effect skills and AGENTS.md conventions. It extends the `@mpsuesser/oxlint-plugin-effect` plugin with project-specific rules.

## Rules

### Effect Best Practices

| Rule                                 | Severity | Description                                          | Source            |
| ------------------------------------ | -------- | ---------------------------------------------------- | ----------------- |
| `repo/prefer-effect-fn`              | warn     | Use `Effect.fn` for named exported functions         | 01-best-practices |
| `repo/no-let-in-effect-gen`          | error    | No `let` reassignment inside `Effect.gen`            | 01-best-practices |
| `repo/no-try-catch-in-effect-gen`    | error    | No `try/catch` inside `Effect.gen`                   | 01-best-practices |
| `repo/no-async-await-in-effect-gen`  | error    | No `async/await` inside `Effect.gen`                 | 01-best-practices |
| `repo/no-pipe-after-effect-fn`       | error    | Don't use `.pipe` after `Effect.fn`                  | 02-anti-patterns  |
| `repo/no-catchall`                   | error    | `Effect.catchAll` doesn't exist in v4                | 02-anti-patterns  |
| `repo/no-effect-iterate`             | error    | `Effect.iterate` doesn't exist in v4                 | 02-anti-patterns  |
| `repo/prefer-context-service`        | error    | Use `Context.Service` not old patterns               | 01-best-practices |
| `repo/no-for-loops-in-effect-gen`    | warn     | Use `Effect.forEach` instead of `for` loops          | 01-best-practices |
| `repo/prefer-tagged-error-class`     | error    | Use `Schema.TaggedErrorClass` not `Data.TaggedError` | 03-error-handling |
| `repo/no-platform-imports-in-domain` | error    | No platform imports in `packages/domain/`            | 01-best-practices |

### Testing Patterns

| Rule                               | Severity | Description                                  | Source             |
| ---------------------------------- | -------- | -------------------------------------------- | ------------------ |
| `repo/prefer-effect-vitest`        | error    | Import `it`/`describe` from `@effect/vitest` | 02-vitest-patterns |
| `repo/no-vitest-expect-for-effect` | warn     | Don't use `expect` for Effect values         | 02-vitest-patterns |

## Adding New Rules

1. Create rule in `src/rules/<rule-name>.ts`
2. Export from `src/rules/index.ts`
3. Register in `src/plugin.ts`
4. Add tests in `test/rules/<rule-name>.test.ts`
5. Update this AGENTS.md

## Rule Development

See the [oxlint skill](../../.opencode/skills/effect-ts/oxlint/SKILL.md) for:

- Rule.define patterns
- Visitor combinators
- AST matchers
- Diagnostic builders
- Testing helpers

## Resources

- [effect-oxlint SDK](https://github.com/mpsuesser/effect-oxlint)
- [oxlint-plugin-effect](https://github.com/mpsuesser/oxlint-plugin-effect)
