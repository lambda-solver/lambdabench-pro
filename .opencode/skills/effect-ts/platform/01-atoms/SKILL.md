---
name: 01-atoms
description: Effect Atom reactivity — useAtomValue, Atom.make, React integration via @effect/atom-react
license: MIT
compatibility: opencode
---

# Effect Atom (Reactivity)

**Package**: `effect/unstable/reactivity`, `@effect/atom-react`
**Version**: `effect@4.0.0-beta.41`, `@effect/atom-react@4.0.0-beta.41`

## Runtime setup

```typescript
import { Layer } from "effect"
import { DevTools } from "effect/unstable/devtools"
import { Atom } from "effect/unstable/reactivity"
import { FetchHttpClient } from "effect/unstable/http"

// Static site — no RPC server, just FetchHttpClient
export const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(
      import.meta.env.VITE_ENABLE_DEVTOOLS === "true"
        ? DevTools.layer()
        : Layer.empty
    )
  )
)
```

## Atom types

```typescript
// runtime.atom(Effect) — single-shot, loads once, reactive
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(url)
    const body = yield* response.json
    return yield* Schema.decode(BenchmarkDataSchema)(body)
  })
)
// Type: Atom<AsyncResult<BenchmarkData, E>>

// runtime.fn(arg => Effect) — triggered/parameterized atom
export const searchAtom = runtime.fn((query: string) =>
  Effect.gen(function* () {
    const svc = yield* SearchService
    return yield* svc.search(query)
  })
)
// Type: AtomResultFn<string, SearchResult, E>

// runtime.atom(Stream) — streaming atom
export const streamAtom = runtime.atom(
  Stream.fromPubSub(myPubSub)
)
```

## React hooks

```typescript
import { useAtom, useAtomValue, useAtomSet } from "@effect/atom-react"
import { AsyncResult } from "effect/unstable/reactivity"

// Read-only
const result = useAtomValue(benchmarkAtom)

// Read + write (returns [value, setter])
const [result, trigger] = useAtom(searchAtom)
trigger("my query")

// Write-only
const trigger = useAtomSet(searchAtom)
trigger("my query")
```

## AsyncResult pattern matching

```typescript
import { AsyncResult } from "effect/unstable/reactivity"

// In a React component
const result = useAtomValue(benchmarkAtom)

return AsyncResult.match(result, {
  onInitial: (_) => <Loading />,
  onFailure: (e) => <Error message={String(e.cause)} />,
  onSuccess: (s) => <Leaderboard data={s.value} />,
})

// getOrElse for a default
const data = AsyncResult.getOrElse(result, () => emptyBenchmarkData)
```

## RegistryProvider — required in app root

```typescript
// main.tsx — not needed explicitly when using Atom.runtime()
// The runtime() call registers itself globally.
// But for tests, wrap with RegistryProvider:
import { RegistryProvider } from "@effect/atom-react"

render(
  <RegistryProvider>
    <App />
  </RegistryProvider>
)
```

## Key signatures from Atom.d.ts

```typescript
// AtomRuntime.atom — wraps Effect or Stream → AsyncResult atom
runtime.atom(effect: Effect<A, E, R | AtomRegistry>): Atom<AsyncResult<A, E>>

// AtomRuntime.fn — triggered atom
runtime.fn(fn: (arg: Arg) => Effect<A, E, R | AtomRegistry>): AtomResultFn<Arg, A, E>

// AsyncResult states
type AsyncResult<A, E> = Initial<A, E> | Success<A, E> | Failure<A, E>

// Hooks
useAtomValue<A>(atom: Atom<A>): A
useAtom<R,W>(atom: Writable<R,W>): readonly [R, (value: W) => void]
useAtomSet<R,W>(atom: Writable<R,W>): (value: W) => void
```
