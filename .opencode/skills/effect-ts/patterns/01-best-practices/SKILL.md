---
name: 01-best-practices
description: Effect-TS 4 best practices — Effect.fn naming, Layer conventions, yield* patterns, and span tracing
license: MIT
compatibility: opencode
---

# Effect-TS Best Practices

## Use Effect.fn for all named functions

```typescript
// ✅ Effect.fn with name string — adds spans, stack traces
export const processItem = Effect.fn("processItem")(
  function* (id: string): Effect.fn.Return<Result, ProcessError> {
    yield* Effect.log("Processing:", id)
    return yield* doWork(id)
  },
  Effect.withSpan("processItem")  // extra operators as extra args
)

// ❌ plain function returning Effect.gen — no tracing
export const processItem = (id: string) => Effect.gen(function* () { ... })
```

## Layer key naming convention

Use `"package/path/ServiceName"` to avoid collisions across packages:

```typescript
"myapp/db/Database"
"myapp/cache/RedisCache"
"@repo/domain/BenchmarkService"
```

## Layer.provide vs Layer.provideMerge

```typescript
// Layer.provide — hide the dependency (callers see only outer service)
static readonly layer = this.layerNoDeps.pipe(Layer.provide(Dep.layer))

// Layer.provideMerge — expose both (useful in tests to access internals)
static readonly layerTest = this.layerNoDeps.pipe(Layer.provideMerge(TestRef.layer))
```

## Services return `of(...)` — never plain objects

```typescript
return Database.of({        // ✅ correct — preserves prototype chain
  query,
  findById,
})

return { query, findById }  // ❌ wrong — breaks ServiceMap.Service extension
```

## Never import from "effect/unstable/*" in domain schemas

The domain package must be pure `effect` imports only. Platform, HTTP, atoms are app-layer concerns.

```typescript
// ✅ domain package
import { Schema, Effect } from "effect"

// ❌ domain package — platform-specific
import { HttpClient } from "effect/unstable/http"
```

## Schema.Record positional args (Effect 4 beta)

```typescript
Schema.Record(Schema.String, Schema.Number)       // ✅ Effect 4 beta
Schema.Record({ key: Schema.String, value: ... }) // ❌ Effect 3 style — compile error
```

## Effect.all for concurrent fetches

```typescript
// Run two fetches concurrently, wait for both
const [models, rankings] = yield* Effect.all(
  [fetchModels(apiKey), fetchRankings()],
  { concurrency: 2 }
)
```

## Effect.runPromise for Bun scripts

```typescript
if (import.meta.main) {
  Effect.runPromise(program).catch((e: unknown) => {
    process.stderr.write("error: " + (e instanceof Error ? e.message : String(e)) + "\n")
    process.exit(1)
  })
}
```

## Atom patterns (lambench-pro / Effect Atom v4)

```typescript
// Define atoms in lib/atoms/, consume in components
// runtime.atom(Effect) — for single-shot effects (data fetch)
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(url)
    const body = yield* response.json
    return yield* Schema.decode(MySchema)(body)
  })
)

// runtime.fn(arg => Effect) — for triggered/parameterized effects
export const searchAtom = runtime.fn((query: string) =>
  Effect.gen(function* () {
    const svc = yield* SearchService
    return yield* svc.search(query)
  })
)

// In React components
const result = useAtomValue(benchmarkAtom)
AsyncResult.match(result, {
  onInitial: () => <Loading />,
  onFailure: (e) => <Error error={e} />,
  onSuccess: (data) => <View data={data.value} />,
})
```

## Local dev workflow with OpenCode

Run `bun dev --filter=client` in a **separate terminal** and leave it running.
OpenCode edits files in this terminal; Vite HMR picks up every save and hot-reloads
the browser automatically (~100 ms). No need to restart the dev server between edits.

```bash
# Terminal 1 — keep running
bun dev --filter=client   # → http://localhost:3000

# Terminal 2 — OpenCode session
# Ask OpenCode to make changes; browser updates live
```
