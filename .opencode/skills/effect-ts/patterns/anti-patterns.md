# Anti-Patterns to Avoid

## ❌ Returning Effect.gen from plain functions

```typescript
// ❌ Wrong — no tracing, no stack frames
export const fetchUser = (id: string) =>
  Effect.gen(function* () {
    return yield* db.query(id)
  })

// ✅ Correct — use Effect.fn
export const fetchUser = Effect.fn("fetchUser")(function* (id: string) {
  return yield* db.query(id)
})
```

## ❌ .pipe after Effect.fn operators

```typescript
// ❌ Wrong — operators in .pipe AFTER Effect.fn lose the span context
export const fn = Effect.fn("fn")(function* () { ... }).pipe(
  Effect.withSpan("fn")
)

// ✅ Correct — extra operators as additional args to Effect.fn
export const fn = Effect.fn("fn")(
  function* () { ... },
  Effect.withSpan("fn")
)
```

## ❌ Schema.Record with object syntax (Effect 4 beta)

```typescript
// ❌ Compile error in Effect 4 beta
Schema.Record({ key: Schema.String, value: Schema.Boolean })

// ✅ Positional args
Schema.Record(Schema.String, Schema.Boolean)
```

## ❌ Returning plain objects from services

```typescript
// ❌ Breaks ServiceMap.Service prototype chain
return { query, findById }

// ✅ Always use .of()
return Database.of({ query, findById })
```

## ❌ Missing return before yield* error

```typescript
// ❌ TypeScript doesn't know execution stops here
function* (id: string) {
  if (!id) yield* new NotFoundError()
  return yield* fetch(id) // inferred as possibly executing even after error
}

// ✅ return ensures TS narrows correctly
function* (id: string) {
  if (!id) return yield* new NotFoundError()
  return yield* fetch(id)
}
```

## ❌ try/catch inside Effect.gen

```typescript
// ❌ Escapes the Effect error channel
Effect.gen(function* () {
  try {
    return yield* riskyEffect
  } catch (e) {
    console.error(e) // silent failure
    return defaultValue
  }
})

// ✅ Use Effect error combinators
Effect.gen(function* () {
  return yield* riskyEffect
}).pipe(
  Effect.catchTag("MyError", (e) => Effect.succeed(defaultValue))
)
```

## ❌ Importing platform modules in domain package

```typescript
// ❌ Domain package must be pure effect — no platform/unstable
import { HttpClient } from "effect/unstable/http"  // in packages/domain/

// ✅ Platform in apps only
import { HttpClient } from "effect/unstable/http"  // in apps/client/
```

## ❌ async/await inside Effect.gen

```typescript
// ❌ Mixes async and Effect — errors escape the channel
Effect.gen(function* () {
  const data = await fetch(url).then(r => r.json()) // promise escapes
  return data
})

// ✅ Use Effect.tryPromise
Effect.gen(function* () {
  const data = yield* Effect.tryPromise({
    try: () => fetch(url).then(r => r.json()),
    catch: (e) => new FetchError({ cause: e })
  })
  return data
})
```
