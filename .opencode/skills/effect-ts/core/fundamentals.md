# Effect-TS v4 Fundamentals

**Version**: `effect@4.0.0-beta.41`

## Core model

`Effect<Success, Error, Requirements>` — lazy, nothing runs until `run*` or `Layer.launch`.

## Effect.gen — primary style

```typescript
import { Effect } from "effect"

const program = Effect.gen(function* () {
  yield* Effect.log("Starting...")
  const result = yield* someEffect
  return result
})
```

## Effect.fn — preferred for named functions

Adds automatic stack traces + tracing spans. **Do not** return `Effect.gen` from plain functions.

```typescript
import { Effect, Schema } from "effect"

// ✅ correct
export const processFile = Effect.fn("processFile")(
  function* (path: string): Effect.fn.Return<string, FileError> {
    yield* Effect.log("Processing:", path)
    return yield* readFile(path)
  },
  // extra operators go as additional args — NOT .pipe
  Effect.withSpan("processFile"),
  Effect.annotateLogs({ component: "file-processor" })
)

// ❌ avoid
export const bad = (path: string) => Effect.gen(function* () { ... })
```

## Creating Effects

```typescript
Effect.succeed(value)                        // already-computed value
Effect.sync(() => Date.now())                // sync side-effect, won't throw
Effect.try({
  try: () => JSON.parse(s),
  catch: (e) => new ParseError({ cause: e })
})
Effect.tryPromise({
  try: () => fetch(url).then(r => r.json()),
  catch: (e) => new FetchError({ url, cause: e })
})
Effect.fromNullishOr(map.get("key")).pipe(
  Effect.mapError(() => new MissingKey())
)
Effect.callback<number>((resume) => {        // callback-based APIs
  const id = setTimeout(() => resume(Effect.succeed(42)), 100)
  return Effect.sync(() => clearTimeout(id)) // finalizer called on interruption
})
```

## Running effects

```typescript
import { NodeRuntime } from "@effect/platform-node"
import { BunRuntime } from "@effect/platform-bun"

NodeRuntime.runMain(program)          // Node entrypoint — handles SIGINT/SIGTERM
BunRuntime.runMain(program)           // Bun entrypoint
await Effect.runPromise(program)      // tests / ad-hoc
Effect.runSync(program)               // sync-only (no async effects)
Effect.runPromise(program.pipe(Effect.provide(MyLayer)))
```

## Pipe for composition

```typescript
program.pipe(
  Effect.map(x => x * 2),
  Effect.flatMap(n => Effect.succeed(n + 1)),
  Effect.catchTag("ParseError", () => Effect.succeed(0))
)
```

## Type annotations

```typescript
// Return type in Effect.fn generator
function* (id: string): Effect.fn.Return<User, UserError>

// Full type
const eff: Effect.Effect<string, ParseError, never> = ...

// Service type shorthand
type DbService = Database["Service"]
```

## Always return on yield* error

TypeScript needs a `return` before `yield* error` so it understands execution stops:

```typescript
return yield* new MyError({ message: "..." })
```
