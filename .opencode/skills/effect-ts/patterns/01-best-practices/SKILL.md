---
name: 01-best-practices
description: Effect-TS 4 best practices — Effect.fn, Effect.fnUntraced, Context.Service, Layer conventions, and FP style
license: MIT
compatibility: opencode
---

# Effect-TS Best Practices

## Effect.fn — all exported named functions

Every exported function that returns an Effect must use `Effect.fn`.
It adds span tracing, stack frames, and the name appears in traces.

```typescript
export const processItem = Effect.fn("processItem")(function* (id: string) {
  yield* Effect.log("processing:", id)
  return yield* doWork(id)
})
```

Extra operators go as **additional arguments to `Effect.fn`**, not in `.pipe`:

```typescript
// ✅ correct — operators receive the function's arguments too
export const processItem = Effect.fn("processItem")(
  function* (id: string) {
    return yield* doWork(id)
  },
  Effect.withSpan("processItem"),
  Effect.annotateLogs({ component: "worker" }),
)

// ❌ wrong — .pipe after Effect.fn loses the span context
export const processItem = Effect.fn("processItem")(function* () { ... })
  .pipe(Effect.withSpan("processItem"))
```

## Effect.fnUntraced — internal helpers

For private/internal functions where tracing adds no value.

```typescript
// ✅ simpler — no name string needed
const buildPayload = Effect.fnUntraced(function* (id: string) {
  const data = yield* loadData(id)
  return { id, data }
})
```

## Context.Service — the canonical service definition

**Always use `Context.Service`, not `ServiceMap.Service`.**
The reference codebase (effect-smol) uses only `Context.Service`.

```typescript
import { Context, Effect, Layer } from "effect"

export class MyService extends Context.Service<MyService, {
  doThing(input: string): Effect.Effect<Result, MyError>
}>()(
  "myapp/MyService",
) {
  static readonly layer = Layer.effect(
    MyService,
    Effect.gen(function* () {
      const doThing = Effect.fn("MyService.doThing")(function* (input: string) {
        return yield* compute(input)
      })
      return MyService.of({ doThing })
    }),
  )
}
```

## Service key naming

Use `"package/path/Name"` convention:

```
"myapp/db/Database"
"@repo/domain/BenchmarkService"
"effect/cluster/Entity/EntityAddress"
```

## Services return `.of(...)` — never plain objects

```typescript
return MyService.of({ doThing })   // ✅ preserves prototype chain
return { doThing }                 // ❌ breaks Context.Service
```

## No let reassignment inside Effect.gen

Extract each branch as a helper Effect; bind once with `const`.

```typescript
// ❌ let reassignment obscures which branch ran
const program = Effect.gen(function* () {
  let result: string
  if (condition) result = yield* branchA()
  else result = yield* branchB()
  return result
})

// ✅ const, no mutation
const resolveResult = (condition: boolean) =>
  condition ? branchA() : branchB()

const program = Effect.gen(function* () {
  const result = yield* resolveResult(condition)
  return result
})
```

## No try/catch, no async/await inside Effect.gen

```typescript
// ❌ escapes the error channel
Effect.gen(function* () {
  try { return yield* risky() } catch (e) { return default }
})

// ✅ use Effect combinators
risky().pipe(
  Effect.catchTag("MyError", (_) => Effect.succeed(default)),
)

// ❌ await mixes runtimes
Effect.gen(function* () {
  const data = await fetch(url).then(r => r.json())
})

// ✅ Effect.tryPromise
Effect.gen(function* () {
  const data = yield* Effect.tryPromise({
    try: () => fetch(url).then(r => r.json()),
    catch: (e) => new FetchError({ cause: e }),
  })
})
```

## Schema.Record — positional args only

```typescript
Schema.Record(Schema.String, Schema.Number)          // ✅ Effect 4
Schema.Record({ key: Schema.String, value: ... })    // ❌ Effect 3 — compile error
```

## Domain package — no platform imports

```typescript
// ✅ domain package
import { Schema, Effect } from "effect"

// ❌ domain package — platform-specific, must stay in apps/
import { HttpClient } from "effect/unstable/http"
```

## Bun script entrypoint pattern

```typescript
if (import.meta.main) {
  Effect.runPromise(program).catch((e: unknown) => {
    process.stderr.write(String(e) + "\n")
    process.exit(1)
  })
}
```
