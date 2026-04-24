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

## ❌ let reassignment inside Effect.gen

Branching with `let` and reassigning inside `Effect.gen` defeats the functional
model — the type system can't guarantee the variable is always initialised and
the intent becomes harder to follow.

```typescript
// ❌ let reassignment — value depends on implicit mutation
const program = Effect.gen(function* () {
  let top: ReadonlyArray<TopModel>

  if (devMode) {
    yield* Effect.log("dev mode")
    top = DEV_MOCK_MODELS           // mutation
  } else if (!apiKey) {
    top = topModelsFromEnv(fallbackEnv!)  // mutation
  } else {
    top = yield* getTopModels(apiKey, 2) // mutation
  }

  process.stdout.write(JSON.stringify(top))
})
```

**Fix:** extract a helper that returns an `Effect` for each branch, then
`const value = yield*` it once in the generator:

```typescript
// ✅ Each branch returns Effect; caller binds with const
const resolveTopModels = (
  devMode: boolean,
  apiKey: string | undefined,
  fallbackEnv: string | undefined,
): Effect.Effect<ReadonlyArray<TopModel>, Error, HttpClient.HttpClient> => {
  if (devMode) {
    return Effect.andThen(
      Effect.log("dev mode"),
      Effect.succeed(DEV_MOCK_MODELS),
    )
  }
  if (!apiKey) {
    return fallbackEnv
      ? Effect.succeed(topModelsFromEnv(fallbackEnv))
      : Effect.fail(new Error("no credentials"))
  }
  return getTopModels(apiKey, 2).pipe(
    Effect.catchAll((e) =>
      fallbackEnv
        ? Effect.succeed(topModelsFromEnv(fallbackEnv))
        : Effect.fail(e instanceof Error ? e : new Error(String(e))),
    ),
  )
}

const program = Effect.gen(function* () {
  const top = yield* resolveTopModels(devMode, apiKey, fallbackEnv) // const ✓
  process.stdout.write(JSON.stringify(top))
})
```

> **Note:** `let` is fine in plain Bun/TS scripts (no Effect involved), in
> accumulator loops over plain data, and in React render line-counters.
> The anti-pattern is specifically `let` + branch-reassignment *inside*
> `Effect.gen` where the mutation obscures which effect path ran.

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
