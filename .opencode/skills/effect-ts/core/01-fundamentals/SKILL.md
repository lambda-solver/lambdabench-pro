---
name: 01-fundamentals
description: Effect-TS 4 fundamentals — Effect.gen, yield*, pipe, basic combinators, and runtime execution
license: MIT
compatibility: opencode
---

# Effect-TS v4 Fundamentals

**Version**: `effect@4.0.0-beta.41`

## Core model

`Effect<Success, Error, Requirements>` — lazy description of a program.
Nothing runs until you call a `run*` function or `Layer.launch`.

## Effect.gen — primary style

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.log("starting")
  const result = yield* someEffect
  return result
})
```

## Effect.fn — all named exported functions

Adds automatic span tracing + stack frames. Use for every exported function
that returns an Effect.

```typescript
import { Effect } from "effect"

// ✅ correct — traced, named span
export const processFile = Effect.fn("processFile")(function* (path: string) {
  yield* Effect.log("processing:", path)
  return yield* readFile(path)
})

// Extra operators as additional arguments — NOT .pipe after the call
export const processFileSafe = Effect.fn("processFileSafe")(
  function* (path: string) {
    return yield* readFile(path)
  },
  Effect.withSpan("processFile"),
  Effect.annotateLogs({ component: "file-processor" }),
)

// ❌ wrong — no tracing, no span
export const bad = (path: string) => Effect.gen(function* () { ... })
```

## Effect.fnUntraced — internal / private helpers

Use when the function is not exported and tracing is not needed.
Simpler syntax — no name string required.

```typescript
import { Effect } from "effect"

// ✅ for private / internal helpers
const buildPayload = Effect.fnUntraced(function* (id: string) {
  const data = yield* loadData(id)
  return { id, data }
})
```

## Creating Effects

```typescript
Effect.succeed(value)               // constant value
Effect.fail(new MyError())          // typed error
Effect.sync(() => Date.now())       // sync side-effect, guaranteed not to throw
Effect.try({
  try: () => JSON.parse(s),
  catch: (e) => new ParseError({ cause: e }),
})
Effect.tryPromise({
  try: () => fetch(url).then(r => r.json()),
  catch: (e) => new FetchError({ url, cause: e }),
})
Effect.callback<number>((resume) => {  // callback-based APIs
  const id = setTimeout(() => resume(Effect.succeed(42)), 100)
  return Effect.sync(() => clearTimeout(id))  // finalizer on interruption
})
```

## Running Effects

```typescript
import { BunRuntime } from "@effect/platform-bun"
import { NodeRuntime } from "@effect/platform-node"

BunRuntime.runMain(program)           // Bun entrypoint — handles signals
NodeRuntime.runMain(program)          // Node entrypoint
await Effect.runPromise(program)      // tests / scripts
Effect.runSync(program)               // sync-only programs
```

## Pipe for composition

```typescript
program.pipe(
  Effect.map(x => x * 2),
  Effect.flatMap(n => Effect.succeed(n + 1)),
  Effect.catchTag("ParseError", () => Effect.succeed(0)),
  Effect.withSpan("myOp"),
)
```

## Always `return` before `yield* error`

TypeScript must see the `return` to know execution stops at that point:

```typescript
export const load = Effect.fn("load")(function* (id: string) {
  if (!id) return yield* new NotFoundError()  // return = TS knows it stops here
  return yield* fetchById(id)
})
```

## Type annotations

```typescript
// Inside Effect.fn generator — use Effect.fn.Return
function* (id: string): Effect.fn.Return<User, UserError>

// Standalone effect
const eff: Effect.Effect<string, ParseError, never> = ...

// Service type access
type DbShape = Database["Service"]
```
