# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

## Commands

| Command                                            | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `bun install`                                      | Install dependencies                      |
| `bun dev`                                          | Start all apps (client:3000, server:9000) |
| `bun dev --filter=client`                          | Start client only                         |
| `bun dev --filter=server`                          | Start server only                         |
| `bun run build`                                    | Build all apps                            |
| `bun run type-check`                               | TypeScript check (all packages)           |
| `bun lint`                                         | oxlint check (all packages)               |
| `bun lint:fix`                                     | oxlint auto-fix (all packages)            |
| `bun format`                                       | oxfmt format (all packages)               |
| `bun format:check`                                 | oxfmt format check (all packages)         |
| `bun run test`                                     | Run all tests via turbo (Vitest)          |
| `bun run test --filter=server`                     | Run server tests only                     |
| `bun test --filter=server -- src/file.test.ts`     | Run single test file                      |
| `bun src/index.ts server > logs/server.log 2>&1 &` | Start server in background (logs/)        |
| `lsof -ti:9000                                     | xargs kill -9`                            |

## Tech Stack

| Layer      | Technology                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Runtime    | Bun 1.2+                                                                                         |
| Language   | TypeScript 5.9                                                                                   |
| Effect     | `effect@4.0.0-beta.52`, `@effect/platform-bun`, `@effect/platform-browser`, `@effect/atom-react` |
| UI         | React 19, Vite 8, Tailwind CSS 4                                                                 |
| Testing    | Vitest 4, `@effect/vitest`                                                                       |
| Linting    | oxlint 1.65+ with `@mpsuesser/oxlint-plugin-effect`                                              |
| Formatting | oxfmt 0.50+                                                                                      |

## Linting with oxlint

This project uses **oxlint** with the `@mpsuesser/oxlint-plugin-effect` plugin for Effect-specific linting. The plugin provides 54 rules that enforce Effect v4 idioms.

**Configuration:** `.oxlintrc.json` in the project root

**Key plugin categories:**

- `effect/avoid-*` — Flags imperative patterns (try/catch, mutable state, native fetch, etc.)
- `effect/prefer-*` — Enforces Effect APIs (Effect.fn, Arr.match, Duration constructors, etc.)
- `effect/use-*-service` — Requires platform services instead of Node APIs
- `effect/require-*` — Mandates schema metadata and type aliases

**Custom rules:** This project includes `@repo/effect-oxlint` (in `packages/effect-oxlint/`) with additional rules based on our skill patterns:

**Effect Best Practices (from skills):**

- `repo/prefer-effect-fn` — Use `Effect.fn` for named exported functions (01-best-practices)
- `repo/no-let-in-effect-gen` — No `let` reassignment inside `Effect.gen` (01-best-practices)
- `repo/no-try-catch-in-effect-gen` — No `try/catch` inside `Effect.gen` (01-best-practices)
- `repo/no-async-await-in-effect-gen` — No `async/await` inside `Effect.gen` (01-best-practices)
- `repo/no-pipe-after-effect-fn` — Don't use `.pipe` after `Effect.fn` (02-anti-patterns)
- `repo/no-catchall` — `Effect.catchAll` doesn't exist in v4 (02-anti-patterns)
- `repo/no-effect-iterate` — `Effect.iterate` doesn't exist in v4 (02-anti-patterns)
- `repo/prefer-context-service` — Use `Context.Service` not old patterns (01-best-practices)
- `repo/no-for-loops-in-effect-gen` — Use `Effect.forEach` instead of `for` loops (01-best-practices)
- `repo/prefer-tagged-error-class` — Use `Schema.TaggedErrorClass` not `Data.TaggedError` (03-error-handling)
- `repo/no-platform-imports-in-domain` — No platform imports in `packages/domain/` (01-best-practices)

**Testing Patterns (from skills):**

- `repo/prefer-effect-vitest` — Import `it`/`describe` from `@effect/vitest` (02-vitest-patterns)
- `repo/no-vitest-expect-for-effect` — Don't use `expect` for Effect values (02-vitest-patterns)

To enable: Build the package, then add `"@repo/effect-oxlint"` to the plugins array in `.oxlintrc.json`.

When you need more rules, use `effect-oxlint` to write them with Effect idioms. See the [oxlint skill](.opencode/skills/effect-ts/oxlint/SKILL.md) for examples.

## Linting Rules Are Immutable (HARD CONSTRAINT)

**NEVER disable, downgrade, or modify oxlint rules on your own.** Do not change any rule from `error` to `warn` or `off`. Do not add `allow` entries or ignore patterns to bypass failures. Do not modify `.oxlintrc.json` or any oxlint plugin configuration unless the user explicitly asks you to.

If `bun lint` fails:
- ✅ Fix the source code to comply with the rule
- ✅ Ask the user if a rule should be changed
- ❌ NEVER silence the rule by setting it to `"off"` or `"warn"`
- ❌ NEVER add `// oxlint-disable`, `// oxlint-disable-next-line`, or `// oxlint-disable-file` comments without user approval

This applies to all lint rules including:
- Built-in oxlint rules
- `@mpsuesser/oxlint-plugin-effect` rules
- Custom `@repo/effect-oxlint` rules

**NEVER modify `bun lint` or `bun lint:fix` commands to filter out failing rules.** Do not add `--rules-filter`, `--deny-warnings`, or other CLI flags to bypass failures.

## Git Discipline

**Only commit and push when explicitly asked.** Do not automatically push after
every file change. Completing a task does not imply the user wants a commit —
wait for an explicit "commit", "push", or "save this" instruction.

**Reference:** For the full Git workflow, branching strategy, and CI interaction
patterns, see the [Git skill](.opencode/skills/git/SKILL.md).

**Pre-commit checklist:**

- `bun lint` must pass (oxlint check)
- `bun format:check` must pass (oxfmt format check)
- `bun run type-check` must pass (TypeScript type check)

**Push rejections from benchmark workflow:**
The automated benchmark workflow commits `results.json` directly to `main`. If
your push is rejected because the remote has new commits, rebase and retry:

```bash
git pull origin main --rebase && git push origin main
```

## File System Rules (HARD CONSTRAINT)

**NEVER write to `/tmp/`, `/dev/shm/`, or any system temp directory.** All agents
must use the project-local `logs/` directory for temporary files, logs, scratch
data, debug output, and any other file writes that are not source code.

```bash
# ✅ ALLOWED — project-local logs/
bun src/index.ts server > logs/server.log 2>&1 &

# ❌ BLOCKED — /tmp is banned
node fix-imports.mjs > /tmp/debug.txt   # NEVER
cat data.json > /tmp/debug.json         # NEVER
```

The `logs/` directory exists at the project root and is gitignored. If a
subdirectory under `logs/` is needed, create it with `mkdir -p logs/<name>`.
This keeps all generated files within the repo boundary.

## Code Style

- **Formatting**: Spaces (not tabs), double quotes for strings
- **Imports**: Use `@repo/domain` for shared types; oxfmt organizes imports
- **Types**: Effect Schema for validation; `typeof Schema.Type` for inline
  types, `Schema.Schema.Type<typeof T>` for exports
- **Naming**: camelCase variables/functions, PascalCase types/classes/React components
- **Effect patterns**: `Effect.fn` for all named exported functions; `Effect.fnUntraced` for internal helpers; `Context.Service` for all service definitions; `Layer` composition for DI
- **Error handling**: Use Effect error channel; `Effect.catch` not `catchAll`; never try/catch inside `Effect.gen`
- **No mutations**: no `let` reassignment inside `Effect.gen`; no `for` loops — use `Effect.forEach`

## Skills — Mandatory Pre-Read (All Agents)

**Every agent (coder, reviewer, test_engineer, sme) MUST load the relevant skill
files before starting work.** These files contain confirmed Effect 4 API
patterns that differ from Effect 3 and from LLM training data. Skipping causes
type errors, regressions, and wasted reviewer cycles.

**Agent compliance:**

- `coder` → Load skills for the domain being implemented (Effect, React, etc.)
- `reviewer` → Load skills to verify patterns are followed correctly
- `test_engineer` → Load testing skills for proper test structure
- `sme` → Load domain skills before giving advice

**How to load:** Use the `Read` tool to load the skill file, or include the
skill path in delegation prompts via `SKILLS:` field.

| Task                            | Skill file                                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| Any Effect code                 | `.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md`    |
| Anti-patterns to avoid          | `.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md`     |
| Error handling                  | `.opencode/skills/effect-ts/patterns/03-error-handling/SKILL.md`    |
| Services & Layers               | `.opencode/skills/effect-ts/core/02-services-layers/SKILL.md`       |
| Effect fundamentals             | `.opencode/skills/effect-ts/core/01-fundamentals/SKILL.md`          |
| Error model (schema errors)     | `.opencode/skills/effect-ts/core/03-error-model/SKILL.md`           |
| Resource management             | `.opencode/skills/effect-ts/core/04-resources/SKILL.md`             |
| Concurrency / fibers            | `.opencode/skills/effect-ts/core/05-concurrency/SKILL.md`           |
| Streams                         | `.opencode/skills/effect-ts/core/06-streams/SKILL.md`               |
| HTTP client                     | `.opencode/skills/effect-ts/platform/02-http-client/SKILL.md`       |
| Effect Atoms (client)           | `.opencode/skills/effect-ts/platform/01-atoms/SKILL.md`             |
| AI / LanguageModel / OpenRouter | `.opencode/skills/effect-ts/platform/03-ai-language-model/SKILL.md` |
| Schema / validation             | `.opencode/skills/effect-ts/schema/01-validation/SKILL.md`          |
| Schema transformations          | `.opencode/skills/effect-ts/schema/02-transformations/SKILL.md`     |
| API contracts (HttpApi/RPC)     | `.opencode/skills/effect-ts/schema/03-api-contracts/SKILL.md`       |
| Testing with layers             | `.opencode/skills/effect-ts/testing/01-test-services/SKILL.md`      |
| Vitest patterns                 | `.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md`    |
| Property-based testing          | `.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md`   |
| Observability                   | `.opencode/skills/effect-ts/patterns/04-observability/SKILL.md`     |
| Git / CI workflow               | `.opencode/skills/git/SKILL.md`                                     |
| React FP style                  | `.opencode/skills/react/patterns/01-fp-style/SKILL.md`              |
| Writing oxlint rules            | `.opencode/skills/effect-ts/oxlint/SKILL.md`                        |

Use the `Read` tool to load each file before starting implementation.
**Do not guess Effect 4 APIs from memory** — verify against skill files or
`node_modules` type declarations.

## Reference Projects — Best Practice Source

When unsure about Effect patterns, **consult the reference projects first**:

| Reference       | Location                 | What to look for                                                                   |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| **Hazel**       | `reference/hazel/`       | Production Effect 4 app with mock layers, `serviceShape` helper, HTTP API patterns |
| **Clanka**      | `reference/clanka/`      | AI agent patterns, `Layer.succeed` for LanguageModel mocking, Toolkit usage        |
| **effect-smol** | `reference/effect-smol/` | Effect library source — canonical API for `Effect.fn`, `Layer`, `Context.Service`  |

**How to use:**

```bash
# Search for patterns in reference projects
grep -r "Effect.fnUntraced" reference/hazel/apps/backend/src/ --include="*.test.ts"
grep -r "Layer.succeed" reference/clanka/src/ --include="*.test.ts"
grep -r "Toolkit.make" reference/effect-smol/packages/effect/test/ --include="*.test.ts"
```

**Key patterns from references:**

- **Mock services**: Use `Layer.succeed(ServiceTag, { method: () => Effect.succeed(...) })` — NEVER wrap mock methods in `Effect.fnUntraced` unless they contain `yield*`
- **Toolkit tests**: Access tools via `(toolkit as Toolkit.Any).tools["tool_name"]` or use `toolkit.toLayer(...)`
- **Service definition**: `Context.Service` for service definitions
- **HTTP API**: `HttpApiBuilder.group` with `Layer.provide` composition

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

// Service definition — Context.Service (NOT ServiceMap.Service — deprecated in future betas)
export class MyService extends Context.Service<MyService, {
  method(): Effect.Effect<Result, MyError>
}>()("myapp/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    return MyService.of({ method: Effect.fn("MyService.method")(function* () { ... }) })
  }))
}
```

Key Effect 4 rules:

- `Context.Service` — service definition (NOT `ServiceMap.Service` — deprecated in future betas)
- `Effect.fn("name")(fn)` — all exported named functions
- `Effect.fnUntraced(fn)` — internal/private helpers
- `Effect.catch` — catches all typed errors (`catchAll` does not exist)
- `Effect.suspend(() => loop(...))` — tail recursion (`Effect.iterate` does not exist)
- `Effect.forEach(items, fn, { concurrency })` — never `for` loops inside `Effect.gen`
- `process.env["KEY"]` — index signature access required (see `NodeJS.ProcessEnv` below)
- `Schema.decodeUnknownEffect(schema)(input)` — decode unknown values
- HTTP headers are **lowercased** by Effect: `headers["authorization"]` not `headers["Authorization"]`

## Type-Safe Environment Variables

Declare known env vars in a global `NodeJS.ProcessEnv` augmentation so TypeScript validates access and Biome's `useLiteralKeys` rule accepts dot notation:

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly OPENROUTER_API_KEY?: string;
      readonly LAMBENCH_PORT?: string;
      readonly DEV_MODE?: string;
    }
  }
}

// Now dot notation is type-safe and lint-clean:
const apiKey = process.env.OPENROUTER_API_KEY;
```

## Biome Lint Rules (Enforced in CI)

The following rules are enforced at error level. Agents must write code that passes them on first submission:

| Rule              | What it means                            | Pattern to use                                                                          |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `noArrayIndexKey` | Never use `key={i}` in React `.map()`    | Use content-based keys (`key={item.id}`) or inline repeated elements                    |
| `useLiteralKeys`  | Prefer dot notation for known properties | `obj.field` for known keys; `obj["dynamic"]` only for `Record<string, …>` index access  |
| `noExplicitAny`   | Ban the `any` type                       | Use `unknown` + `as unknown as T` for necessary coercion                                |
| `useYield`        | Only use `yield*` inside generators      | Simple mock returns should be plain arrows, not `Effect.fnUntraced(function* () { … })` |

### `useLiteralKeys` — dot vs bracket notation

```typescript
// Known property on a typed object — dot notation
const name = user.name;

// Dynamic / Record index access — bracket notation required
const value = record[key];

// After casting unknown data — intermediate cast to Record
const r = row as Record<string, unknown>;
const id = r.id as number; // still triggers useLiteralKeys if row has known shape

// Better: cast to a specific intermediate shape
const r = row as { id: unknown; name: unknown };
const id = r.id as number; // now dot notation is fine
```

```typescript
// BAD — triggers noExplicitAny
const x = value as any;

// GOOD — explicit two-step cast
const x = value as unknown as MyType;
```

### `useYield` — mock service pattern

```typescript
// BAD — unnecessary generator for a pure return
health: Effect.fnUntraced(function* () { return { status: "ok" }; }),

// GOOD — plain arrow returning Effect
health: () => Effect.succeed({ status: "ok" }),
```

## Testing Patterns

### `it.layer()` for shared test dependencies

When multiple tests need the same Layer, use `it.layer()` instead of repeating `.pipe(Effect.provide(...))`:

```typescript
const pdfChunkServiceLayer = Layer.effect(ChunkService, ChunkService.make).pipe(
  Layer.provideMerge(Layer.mergeAll(...).pipe(Layer.provide(CharacterTokenizerLive))),
);

describe("ChunkService", () => {
  it.layer(pdfChunkServiceLayer)((it) => {
    it.effect("chunks pdf with table metadata preserved", () =>
      Effect.gen(function* () {
        const service = yield* ChunkService;
        // …
      }),
    );
  });
});
```

### Mock layers in tests

```typescript
const mockEvalService = Layer.succeed(
  EvalService,
  EvalService.of({
    evaluateSingle: (request: SingleEvalRequest) =>
      Effect.succeed({ taskId: request.task, pass: true, bits: 42 } as EvalResult),
  }),
);
```

Key mock rules:

- Use plain arrow functions for pure returns (`() => Effect.succeed(...)`)
- Only use `Effect.fnUntraced` when the mock contains `yield*`
- Type the request parameter explicitly to avoid implicit `any`
- Prefer `Layer.succeed` + `Service.of({ ... })` over inline class extensions

## Structure

| Workspace                  | Stack                                        | AGENTS.md                   |
| -------------------------- | -------------------------------------------- | --------------------------- |
| `apps/client`              | React 19, Effect Atom, Tailwind, Vite        | `apps/client/AGENTS.md`     |
| `apps/server`              | Bun, Effect Platform, `@effect/platform-bun` | `apps/server/AGENTS.md`     |
| `apps/server` (src/mcp.ts) | Effect MCP Server (stdio)                    | Part of server workspace    |
| `packages/domain`          | Effect Schema — no platform imports          | `packages/domain/AGENTS.md` |

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

## Running in Background

See skill `.opencode/skills/effect-ts/platform/04-build-output/SKILL.md` for:

- How to run Bun processes in the background
- Build output directories (`apps/server/dist/`, `apps/client/dist/`)
- Log directory: `logs/` (project root)

```bash
# Start server in background, output to logs/
bun src/index.ts server > logs/server.log 2>&1 &

# Check if running
curl -s http://127.0.0.1:9000/api/health

# View logs
tail -f logs/server.log
```

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._

Skills provide specialized instructions and workflows for specific tasks.
Use the skill tool to load a skill when a task matches its description.
<available_skills>
<skill>
<name>01-atoms</name>
<description>Effect Atom reactivity — useAtomValue, Atom.make, React integration via @effect/atom-react</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/platform/01-atoms/SKILL.md</location>
</skill>
<skill>
<name>01-best-practices</name>
<description>Effect-TS 4 best practices — Effect.fn, Effect.fnUntraced, Context.Service, Layer conventions, and FP style</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md</location>
</skill>
<skill>
<name>01-fp-style</name>
<description>React functional programming style — pure components, hooks conventions, Effect Atom integration, and Tailwind patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/react/patterns/01-fp-style/SKILL.md</location>
</skill>
<skill>
<name>01-fundamentals</name>
<description>Effect-TS 4 fundamentals — Effect.gen, yield\*, pipe, basic combinators, and runtime execution</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/01-fundamentals/SKILL.md</location>
</skill>
<skill>
<name>01-syntax</name>
<description>Bend language syntax and types — algebraic data types, pattern matching, function definitions, and HVM primitives</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/01-syntax/SKILL.md</location>
</skill>
<skill>
<name>01-test-services</name>
<description>Effect-TS 4 testing with layers — mock services, test Refs, Layer.succeed, and test dependency injection</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/testing/01-test-services/SKILL.md</location>
</skill>
<skill>
<name>01-validation</name>
<description>Effect-TS 4 Schema validation — Schema.decode, struct/union schemas, brand types, and export patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/schema/01-validation/SKILL.md</location>
</skill>
<skill>
<name>02-anti-patterns</name>
<description>Effect-TS 4 anti-patterns — plain generators, .pipe after Effect.fn, ServiceMap, catchAll, for loops, and type pitfalls</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md</location>
</skill>
<skill>
<name>02-execution</name>
<description>Bend/HVM execution model — lazy evaluation, reduction strategies, parallel execution, and runtime behavior</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/02-execution/SKILL.md</location>
</skill>
<skill>
<name>02-http-client</name>
<description>Effect-TS 4 HTTP client — HttpClient, request building, response decoding, and error handling via effect/unstable/http</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/platform/02-http-client/SKILL.md</location>
</skill>
<skill>
<name>02-services-layers</name>
<description>Effect-TS 4 services and layers — ServiceMap.Service, Layer.effect, dependency injection, and Layer composition</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/02-services-layers/SKILL.md</location>
</skill>
<skill>
<name>02-transformations</name>
<description>Effect-TS 4 Schema transformations — Schema.transform, Schema.transformOrFail, and codec patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/schema/02-transformations/SKILL.md</location>
</skill>
<skill>
<name>02-vitest-patterns</name>
<description>Effect-TS 4 Vitest patterns — it.effect, it.scoped, it.layer, @effect/vitest/utils assertions, ConfigProvider for env, and platform-node-shared for FileSystem</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md</location>
</skill>
<skill>
<name>03-ai-language-model</name>
<description>Effect-TS 4 AI — LanguageModel.generateText, @effect/ai-openai layer factory, and mocking in tests</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/platform/03-ai-language-model/SKILL.md</location>
</skill>
<skill>
<name>03-api-contracts</name>
<description>Effect-TS 4 HttpApi schema-first REST contracts — route definitions, error schemas, and typed client</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/schema/03-api-contracts/SKILL.md</location>
</skill>
<skill>
<name>03-error-handling</name>
<description>Effect-TS 4 error handling — Effect.catch, catchTag, catchTags, typed channels, and absorb patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/patterns/03-error-handling/SKILL.md</location>
</skill>
<skill>
<name>03-error-model</name>
<description>Effect-TS 4 error model — Schema.TaggedErrorClass, typed defects, union errors, and error channel semantics</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/03-error-model/SKILL.md</location>
</skill>
<skill>
<name>03-patterns</name>
<description>Bend/HVM programming patterns — recursion, fold/unfold, accumulator idioms, and common data structure encodings</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/03-patterns/SKILL.md</location>
</skill>
<skill>
<name>03-property-testing</name>
<description>Effect-TS 4 property-based testing — Schema Arbitrary, fast-check, and generative test patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md</location>
</skill>
<skill>
<name>04-concurrency</name>
<description>Bend/HVM concurrency models — parallel trees, fork/join, superposition, and GPU-parallel execution patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/04-concurrency/SKILL.md</location>
</skill>
<skill>
<name>04-observability</name>
<description>Effect-TS 4 observability — structured logging, spans, tracing, annotations, and metrics</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/patterns/04-observability/SKILL.md</location>
</skill>
<skill>
<name>04-resources</name>
<description>Effect-TS 4 resource management — Scope, acquireRelease, Layer.scoped, and safe resource lifecycle</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/04-resources/SKILL.md</location>
</skill>
<skill>
<name>05-concurrency</name>
<description>Effect-TS 4 concurrency — Effect.all, Effect.forEach, fibers, Ref, and structured concurrency patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/05-concurrency/SKILL.md</location>
</skill>
<skill>
<name>05-testing</name>
<description>Bend/HVM testing strategies — unit testing Bend functions, property tests, and correctness verification</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/05-testing/SKILL.md</location>
</skill>
<skill>
<name>06-memory</name>
<description>Bend/HVM memory management — interaction net nodes, garbage collection, memory layout, and allocation patterns</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/06-memory/SKILL.md</location>
</skill>
<skill>
<name>06-streams</name>
<description>Effect-TS 4 streams — Stream creation, transformation, chunking, and sink consumption</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/core/06-streams/SKILL.md</location>
</skill>
<skill>
<name>07-benchmarking</name>
<description>Bend/HVM benchmarking — profiling HVM programs, measuring interactions per second, and performance tuning</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/07-benchmarking/SKILL.md</location>
</skill>
<skill>
<name>08-ffi</name>
<description>Bend/HVM FFI integration — calling external functions, C interop, and binding native code to HVM programs</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/bend-hvm/08-ffi/SKILL.md</location>
</skill>
<skill>
<name>customize-opencode</name>
<description>Use ONLY when the user is editing or creating opencode's own configuration: opencode.json, opencode.jsonc, files under .opencode/, or files under ~/.config/opencode/. Also use when creating or fixing opencode agents, subagents, skills, plugins, MCP servers, or permission rules. Do not use for the user's own application code, or for any project that is not configuring opencode itself.</description>
<location>file:///workspaces/typescript-node/lambench-pro/%3Cbuilt-in%3E</location>
</skill>
<skill>
<name>oxlint</name>
<description>Writing oxlint custom rules with Effect — Rule.define, Visitor combinators, AST matchers, Diagnostic builders, and testing with effect-oxlint</description>
<location>file:///workspaces/typescript-node/lambench-pro/.opencode/skills/effect-ts/oxlint/SKILL.md</location>
</skill>
</available_skills>
