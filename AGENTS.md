# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

## Commands

| Command                                        | Purpose                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `bun install`                                  | Install dependencies                      |
| `bun dev`                                      | Start all apps (client:3000, server:9000) |
| `bun dev --filter=client`                      | Start client only                         |
| `bun dev --filter=server`                      | Start server only                         |
| `bun run build`                                | Build all apps                            |
| `bun run type-check`                           | TypeScript check (all packages)           |
| `bun lint`                                     | Biome lint check (all packages)           |
| `bun format`                                   | Biome format (all packages)               |
| `bun biome check src/ --write`                 | Auto-fix lint + format in current package |
| `bun run test`                                 | Run all tests via turbo (Vitest)          |
| `bun run test --filter=server`                 | Run server tests only                     |
| `bun test --filter=server -- src/file.test.ts` | Run single test file                      |

## Tech Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Runtime   | Bun 1.2+                                                        |
| Language  | TypeScript 5.9                                                  |
| Effect    | `effect@4.0.0-beta.41`, `@effect/platform-bun`, `@effect/platform-browser`, `@effect/atom-react` |
| UI        | React 19, Vite 8, Tailwind CSS 4                                |
| Testing   | Vitest 4, `@effect/vitest`                                      |
| Linting   | Biome 2.4                                                       |

## Git Discipline

**Only commit and push when explicitly asked.** Do not automatically push after
every file change. Completing a task does not imply the user wants a commit —
wait for an explicit "commit", "push", or "save this" instruction.

## Code Style

- **Formatting**: Spaces (not tabs), double quotes for strings
- **Imports**: Use `@repo/domain` for shared types; Biome auto-organizes imports
- **Types**: Effect Schema for validation; `typeof Schema.Type` for inline
  types, `Schema.Schema.Type<typeof T>` for exports
- **Naming**: camelCase variables/functions, PascalCase types/classes/React components
- **Effect patterns**: `Effect.fn` for all named exported functions; `Effect.fnUntraced` for internal helpers; `ServiceMap.Service` for all service definitions; `Layer` composition for DI
- **Error handling**: Use Effect error channel; `Effect.catch` not `catchAll`; never try/catch inside `Effect.gen`
- **No mutations**: no `let` reassignment inside `Effect.gen`; no `for` loops — use `Effect.forEach`

## Skills — Mandatory Pre-Read

**Before writing any Effect or React code, load the relevant skill file.**
They contain confirmed Effect 4 API patterns that differ from Effect 3 and from
LLM training data. Skipping causes type errors and regressions.

| Task                        | Skill file                                                              |
| --------------------------- | ----------------------------------------------------------------------- |
| Any Effect code             | `.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md`        |
| Anti-patterns to avoid      | `.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md`         |
| Error handling              | `.opencode/skills/effect-ts/patterns/03-error-handling/SKILL.md`        |
| Services & Layers           | `.opencode/skills/effect-ts/core/02-services-layers/SKILL.md`           |
| Effect fundamentals         | `.opencode/skills/effect-ts/core/01-fundamentals/SKILL.md`              |
| Error model (schema errors) | `.opencode/skills/effect-ts/core/03-error-model/SKILL.md`               |
| Resource management         | `.opencode/skills/effect-ts/core/04-resources/SKILL.md`                 |
| Concurrency / fibers        | `.opencode/skills/effect-ts/core/05-concurrency/SKILL.md`               |
| Streams                     | `.opencode/skills/effect-ts/core/06-streams/SKILL.md`                   |
| HTTP client                 | `.opencode/skills/effect-ts/platform/02-http-client/SKILL.md`           |
| Effect Atoms (client)       | `.opencode/skills/effect-ts/platform/01-atoms/SKILL.md`                 |
| AI / LanguageModel / OpenRouter | `.opencode/skills/effect-ts/platform/03-ai-language-model/SKILL.md` |
| Schema / validation         | `.opencode/skills/effect-ts/schema/01-validation/SKILL.md`              |
| Schema transformations      | `.opencode/skills/effect-ts/schema/02-transformations/SKILL.md`         |
| API contracts (HttpApi/RPC) | `.opencode/skills/effect-ts/schema/03-api-contracts/SKILL.md`           |
| Testing with layers         | `.opencode/skills/effect-ts/testing/01-test-services/SKILL.md`          |
| Vitest patterns             | `.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md`        |
| Property-based testing      | `.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md`       |
| Observability               | `.opencode/skills/effect-ts/patterns/04-observability/SKILL.md`         |
| React FP style              | `.opencode/skills/react/patterns/01-fp-style/SKILL.md`                  |

Use the `Read` tool to load each file before starting implementation.
**Do not guess Effect 4 APIs from memory** — verify against skill files or
`node_modules` type declarations.

## Effect Essentials (quick reference)

```typescript
// Named exported function — Effect.fn mandatory
export const processItem = Effect.fn("processItem")(function* (id: string) {
  const svc = yield* MyService       // access service from context
  const result = yield* svc.method() // unwrap Effect result
  yield* Effect.log("done")
  return result
})

// Internal helper — Effect.fnUntraced
const buildPayload = Effect.fnUntraced(function* (id: string) {
  return yield* loadData(id)
})

// Service definition — Context.Service (NOT ServiceMap.Service)
export class MyService extends ServiceMap.Service<MyService, {
  method(): Effect.Effect<Result, MyError>
}>()("myapp/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    return MyService.of({ method: Effect.fn("MyService.method")(function* () { ... }) })
  }))
}
```

Key Effect 4 rules:
- `ServiceMap.Service` — service definition (`Context` not exported in beta.41+)
- `Effect.fn("name")(fn)` — all exported named functions
- `Effect.fnUntraced(fn)` — internal/private helpers
- `Effect.catch` — catches all typed errors (`catchAll` does not exist)
- `Effect.suspend(() => loop(...))` — tail recursion (`Effect.iterate` does not exist)
- `Effect.forEach(items, fn, { concurrency })` — never `for` loops inside `Effect.gen`
- `process.env["KEY"]` — index signature access required
- `Schema.decode(schema)(input)` — decode unknown values
- HTTP headers are **lowercased** by Effect: `headers["authorization"]` not `headers["Authorization"]`

## Structure

| Workspace         | Stack                                         | AGENTS.md                   |
| ----------------- | --------------------------------------------- | --------------------------- |
| `apps/client`     | React 19, Effect Atom, Tailwind, Vite         | `apps/client/AGENTS.md`     |
| `apps/server`     | Bun, Effect Platform, `@effect/platform-bun`  | `apps/server/AGENTS.md`     |
| `apps/server-mcp` | Effect MCP Server                             | `apps/server-mcp/AGENTS.md` |
| `packages/domain` | Effect Schema — no platform imports           | `packages/domain/AGENTS.md` |

## Reference Repos — Read Only

The `reference/` directory contains cloned repos for **reading patterns only**.

- `reference/effect-smol/` — Effect library source (`effect-smol` = beta repo)
- `reference/hazel/` — Production Effect 4 app; canonical patterns for OpenRouter, Vitest, env, FileSystem

**Rules:**
- **Never write, edit, or run code inside `reference/`.** It is read-only reference material.
- **Never run tests from `reference/`.** Always use `bun run test --filter=<workspace>` — never `bun test` from the repo root (Bun's native runner glob-scans everything including `reference/`).
- Use `Read` / `Grep` / `Glob` to study patterns in `reference/`, then apply them in `apps/` or `packages/`.

If `reference/effect-smol/` is missing (git-ignored), clone it:

```bash
git clone https://github.com/Effect-TS/effect-smol.git reference/effect-smol
```

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._
