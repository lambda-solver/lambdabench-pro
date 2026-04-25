---
name: 04-resources
description: Effect-TS 4 resource management — Scope, acquireRelease, Layer.scoped, and safe resource lifecycle
license: MIT
compatibility: opencode
---

# Resource Management

## acquireRelease — safe open/close pair

The release is guaranteed to run even on interruption or failure.

```typescript
import { Effect } from "effect"

const connection = yield* Effect.acquireRelease(
  Effect.sync(() => db.connect()),        // acquire
  (conn) => Effect.sync(() => conn.close()),  // release — always runs
)
```

## Layer.scoped — resource tied to layer lifetime

Use when the resource should live as long as the layer's scope.

```typescript
import { Context, Effect, Layer } from "effect"

export class DbPool extends Context.Service<DbPool, {
  query(sql: string): Effect.Effect<Array<unknown>>
}>()(
  "myapp/DbPool",
) {
  static readonly layer = Layer.scoped(
    DbPool,
    Effect.gen(function* () {
      const pool = yield* Effect.acquireRelease(
        Effect.promise(() => createPool(config)),
        (p) => Effect.promise(() => p.end()),
      )
      return DbPool.of({
        query: Effect.fn("DbPool.query")(function* (sql) {
          return yield* Effect.promise(() => pool.query(sql))
        }),
      })
    }),
  )
}
```

## Effect.addFinalizer — finalizer in current scope

```typescript
yield* Effect.addFinalizer(() =>
  Effect.sync(() => console.log("scope closing")),
)
```

## Scope — explicit lifetime management

```typescript
import { Scope } from "effect"

const program = Effect.gen(function* () {
  const scope = yield* Scope.make()

  const conn = yield* Effect.acquireRelease(
    Effect.sync(() => db.connect()),
    (c) => Effect.sync(() => c.close()),
  ).pipe(Effect.provideService(Scope.Scope, scope))

  // ... use conn ...

  // Close explicitly when done
  yield* Scope.close(scope, Exit.void)
})
```

## Effect.using — acquire + use + release in one expression

```typescript
const result = yield* Effect.using(
  Effect.acquireRelease(
    Effect.sync(() => openFile(path)),
    (f) => Effect.sync(() => f.close()),
  ),
  (file) => readLines(file),
)
```

## forkScoped — fiber tied to scope

The fiber is interrupted when the enclosing scope closes.

```typescript
yield* Effect.forkScoped(
  Effect.gen(function* () {
    while (true) {
      yield* Effect.sleep("5 seconds")
      yield* Effect.log("heartbeat")
    }
  }),
)
```

## Key rules

- Never manage resources with `try/finally` inside `Effect.gen` — use `acquireRelease`.
- `Layer.scoped` > `Layer.effect` when the service wraps a resource.
- `Effect.forkScoped` > `Effect.fork` for long-running background tasks.
