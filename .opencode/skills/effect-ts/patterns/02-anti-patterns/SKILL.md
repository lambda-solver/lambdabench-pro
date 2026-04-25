---
name: 02-anti-patterns
description: Effect-TS 4 anti-patterns — plain generators, .pipe after Effect.fn, ServiceMap, catchAll, for loops, and type pitfalls
license: MIT
compatibility: opencode
---

# Anti-Patterns to Avoid

## ❌ Plain function returning Effect.gen

```typescript
// ❌ no tracing, no stack frames
export const fetchUser = (id: string) =>
  Effect.gen(function* () { return yield* db.query(id) })

// ✅ use Effect.fn for exported functions
export const fetchUser = Effect.fn("fetchUser")(function* (id: string) {
  return yield* db.query(id)
})

// ✅ use Effect.fnUntraced for internal helpers
const buildPayload = Effect.fnUntraced(function* (id: string) {
  return yield* db.query(id)
})
```

## ❌ .pipe after Effect.fn

```typescript
// ❌ operators in .pipe lose the span's argument context
export const fn = Effect.fn("fn")(function* () { ... })
  .pipe(Effect.withSpan("fn"))

// ✅ extra operators as additional args to Effect.fn
export const fn = Effect.fn("fn")(
  function* () { ... },
  Effect.withSpan("fn"),
)
```

## ❌ ServiceMap.Service

The reference codebase (effect-smol) uses only `Context.Service`.
`ServiceMap.Service` may be removed or renamed in future betas.

```typescript
// ❌ outdated
export class Database extends ServiceMap.Service<Database, { ... }>()(
  "myapp/Database",
) {}

// ✅ canonical
export class Database extends Context.Service<Database, { ... }>()(
  "myapp/Database",
) {}
```

## ❌ Effect.catchAll — does not exist in Effect 4

```typescript
// ❌ compile error
program.pipe(Effect.catchAll((e) => Effect.succeed("fallback")))

// ✅ correct
program.pipe(Effect.catch((_e) => Effect.succeed("fallback")))
```

## ❌ Effect.iterate — does not exist in Effect 4

```typescript
// ❌ runtime error
yield* Effect.iterate(0, { while: (n) => n < 10, body: (n) => Effect.succeed(n + 1) })

// ✅ use Effect.suspend for recursive loops
const loop = (n: number): Effect.Effect<number> =>
  n >= 10
    ? Effect.succeed(n)
    : Effect.suspend(() => loop(n + 1))
```

## ❌ Plain class service returned as a plain object

```typescript
// ❌ breaks Context.Service prototype chain
return { query, findById }

// ✅
return Database.of({ query, findById })
```

## ❌ Missing return before yield* error

```typescript
// ❌ TS doesn't know execution stops — infers wrong type
function* (id: string) {
  if (!id) yield* new NotFoundError()
  return yield* fetch(id)     // inferred as possibly executing after error
}

// ✅ return narrows correctly
function* (id: string) {
  if (!id) return yield* new NotFoundError()
  return yield* fetch(id)
}
```

## ❌ try/catch inside Effect.gen

```typescript
// ❌ escapes the error channel — errors silently disappear
Effect.gen(function* () {
  try { return yield* riskyEffect }
  catch (e) { return defaultValue }
})

// ✅ keep errors inside the channel
riskyEffect.pipe(
  Effect.catchTag("MyError", (_e) => Effect.succeed(defaultValue)),
)
```

## ❌ async/await inside Effect.gen

```typescript
// ❌ mixes runtimes — promise errors escape the channel
Effect.gen(function* () {
  const data = await fetch(url).then(r => r.json())
  return data
})

// ✅ use Effect.tryPromise
Effect.gen(function* () {
  return yield* Effect.tryPromise({
    try: () => fetch(url).then(r => r.json()),
    catch: (e) => new FetchError({ cause: e }),
  })
})
```

## ❌ let reassignment inside Effect.gen

```typescript
// ❌ mutation obscures control flow
const program = Effect.gen(function* () {
  let top: ReadonlyArray<Model>
  if (devMode) top = yield* devModels()
  else top = yield* prodModels()
  return top
})

// ✅ extract helper, bind once with const
const resolveModels = (devMode: boolean) =>
  devMode ? devModels() : prodModels()

const program = Effect.gen(function* () {
  const top = yield* resolveModels(devMode)
  return top
})
```

## ❌ for loops inside Effect.gen

```typescript
// ❌ imperative loop with mutation
const results = []
for (const item of items) {
  results.push(yield* processItem(item))
}

// ✅ Effect.forEach
const results = yield* Effect.forEach(items, processItem, { concurrency: 4 })
```

## ❌ Schema.Record with object syntax

```typescript
Schema.Record({ key: Schema.String, value: Schema.Number })  // ❌ Effect 3 style
Schema.Record(Schema.String, Schema.Number)                  // ✅ Effect 4
```

## ❌ Platform imports in domain package

```typescript
// ❌ domain package must only import from "effect"
import { HttpClient } from "effect/unstable/http"   // in packages/domain/

// ✅ platform imports belong in apps/ only
import { HttpClient } from "effect/unstable/http"   // in apps/client/ or apps/server/
```
