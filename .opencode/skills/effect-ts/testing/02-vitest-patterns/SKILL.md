---
name: 02-vitest-patterns
description: Effect-TS 4 Vitest patterns — it.effect, it.scoped, it.layer, @effect/vitest/utils assertions, ConfigProvider for env, and platform-node-shared for FileSystem
license: MIT
compatibility: opencode
---

# Testing with @effect/vitest

**Package**: `@effect/vitest`
**Version**: `@effect/vitest@4.0.0-beta.41`

## Canonical import pattern

```typescript
import { describe, it } from "@effect/vitest"
import { strictEqual, assertTrue, assertSome } from "@effect/vitest/utils"
import { Effect, Layer } from "effect"
```

- `it` and `describe` — always from `@effect/vitest`
- assertions — always from `@effect/vitest/utils` (Effect-aware, uses `Equal.equals`)
- **never** import `it`/`describe` from `"vitest"`
- **never** use `expect` from `"vitest"` for Effect values — use `@effect/vitest/utils`

## @effect/vitest/utils — full assertion API

```typescript
import {
  strictEqual,        // strictEqual(actual, expected)
  deepStrictEqual,    // deep equality via Equal.equals
  assertTrue,         // assertTrue(value)
  assertFalse,        // assertFalse(value)
  assertSome,         // assertSome(option, expected)
  assertNone,         // assertNone(option)
  assertDefined,      // assertDefined(value)
  assertUndefined,    // assertUndefined(value)
  assertSuccess,      // assertSuccess(result, expected)
  assertFailure,      // assertFailure(result, expected)
  assertExitSuccess,  // assertExitSuccess(exit, expected)
  assertExitFailure,  // assertExitFailure(exit, cause)
  assertInclude,      // assertInclude(actual, expected)
  assertMatch,        // assertMatch(actual, regExp)
  assertInstanceOf,   // assertInstanceOf(value, Constructor)
  fail,               // fail("message")
} from "@effect/vitest/utils"
```

## it.effect — basic Effect test

```typescript
it.effect("processes item correctly", () =>
  Effect.gen(function* () {
    const svc = yield* MyService
    const result = yield* svc.process("input")
    strictEqual(result, "expected")
  }).pipe(Effect.provide(MyService.layerTest)),
)
```

## it.effect with timeout

Pass timeout (ms) as the last argument:

```typescript
it.effect("calls real API", () =>
  Effect.gen(function* () {
    const result = yield* callRealApi()
    assertTrue(result.length > 0)
  }).pipe(Effect.provide(realLayer)),
  30_000,
)
```

## it.scoped — test needs a Scope (resources, temp files)

```typescript
it.scoped("cleans up temp file", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* fs.makeTempFileScoped()   // auto-cleaned on scope close
    yield* fs.writeFileString(path, "hello")
    const content = yield* fs.readFileString(path)
    strictEqual(content, "hello")
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)
```

## it.layer — shared layer for all tests in a describe block

Provide a layer once; all `it.effect` / `it.scoped` inside share it:

```typescript
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"

const platformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)

describe("MyService", () => {
  it.layer(platformLayer)((it) => {
    it.effect("reads a file", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const content = yield* fs.readFileString("/tmp/test.txt")
        assertDefined(content)
      }),
    )
  })
})
```

## it.effect.skipIf — conditional skip

```typescript
it.effect.skipIf(!process.env["OPENROUTER_API_KEY"])(
  "calls real OpenRouter",
  () =>
    Effect.gen(function* () {
      const result = yield* LanguageModel.generateText({ prompt: "hello" })
      assertTrue(result.text.length > 0)
    }).pipe(Effect.provide(realLayer)),
  30_000,
)
```

## it.effect.each — parameterised tests

```typescript
it.effect.each([
  { input: " Ada ", expected: "ada" },
  { input: " Lin ", expected: "lin" },
])("trims and lowercases $input", ({ input, expected }) =>
  Effect.gen(function* () {
    strictEqual(input.trim().toLowerCase(), expected)
  }),
)
```

## Loading env vars for integration tests — ConfigProvider

Do **not** use `vitest.setup.ts` or manual `.env` parsing. Use
`ConfigProvider.fromUnknown(process.env)` inside the test — this is the
idiomatic Effect way to load env:

```typescript
import { ConfigProvider, Effect, Layer } from "effect"
import { FetchHttpClient } from "effect/unstable/http"

it.effect.skipIf(!process.env["OPENROUTER_API_KEY"])(
  "calls real OpenRouter",
  () =>
    Effect.gen(function* () {
      const layer = makeOpenRouterLayer("minimax/minimax-m2.5:free").pipe(
        Layer.provide(FetchHttpClient.layer),
      )
      const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
        Effect.map((r) => r.text),
        Effect.provide(layer),
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(process.env))),
      )
      assertTrue(result.length > 0)
    }),
  30_000,
)
```

Vitest does **not** load `.env` automatically. The key must already be in
`process.env` when Vitest starts. Pass it via shell:

```bash
# inline
OPENROUTER_API_KEY=sk-... bun run test

# or source first
source .env && bun run test
```

Without the key, `skipIf(!process.env["OPENROUTER_API_KEY"])` skips the test
cleanly — no failure.

## FileSystem in tests — use @effect/platform-node-shared

Vitest runs under **Node**, not Bun. Never import `BunFileSystem` or the
`@effect/platform-bun` barrel in test files — it pulls in `BunRedis` which
requires `bun:*` native modules unavailable under Node.

Use subpath imports from `@effect/platform-node-shared` instead:

```typescript
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"

const testLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)
```

`@effect/platform-node-shared` must be an **explicit `devDependency`** — it is
a transitive dep of `@effect/platform-bun` but Vite cannot resolve transitive
deps from `.bun/` without a direct entry:

```json
"devDependencies": {
  "@effect/platform-node-shared": "4.0.0-beta.41"
}
```

The package has **no barrel `index.js`** — always use subpath imports:
- `@effect/platform-node-shared/NodeFileSystem`
- `@effect/platform-node-shared/NodePath`
- `@effect/platform-node-shared/NodeChildProcessSpawner`

## HTTP in tests — use FetchHttpClient

`BunHttpClient` is a re-export of `FetchHttpClient` with no `bun:*` deps, but
importing via the `@effect/platform-bun` barrel pulls in `BunRedis`. Use
`FetchHttpClient` directly:

```typescript
import { FetchHttpClient } from "effect/unstable/http"

const layer = makeOpenRouterLayer("minimax/minimax-m2.5:free").pipe(
  Layer.provide(FetchHttpClient.layer),
)
```

## Mock LanguageModel layer

```typescript
import { LanguageModel } from "effect/unstable/ai"

const mockLmLayer = (
  responses: ReadonlyArray<string>,
): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const idx = yield* Ref.make(0)
      return {
        generateText: (_options: unknown) =>
          Effect.gen(function* () {
            const i = yield* Ref.getAndUpdate(idx, (n) => n + 1)
            const text = responses[Math.min(i, responses.length - 1)] ?? ""
            return {
              text,
              usage: { inputTokens: 0, outputTokens: 0 },
              toolCalls: [],
              finishReason: "stop" as const,
            }
          }),
        generateObject: () => Effect.die(new Error("not mocked")),
        streamText: () => Effect.die(new Error("not mocked")),
      } as unknown as LanguageModel.Service
    }),
  )
```

## File structure convention

```typescript
import { describe, it } from "@effect/vitest"
import { strictEqual, assertTrue } from "@effect/vitest/utils"
import { Effect, Layer } from "effect"

// ─── Fixtures ────────────────────────────────────────────────────────────────

const fixture = { id: "test", value: 42 }

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const mockLayer = Layer.succeed(MyService, { ... } as unknown as MyService)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MyService", () => {
  it.effect("does the thing", () =>
    Effect.gen(function* () {
      const result = yield* doThing()
      strictEqual(result, "expected")
    }).pipe(Effect.provide(mockLayer)),
  )
})
```
