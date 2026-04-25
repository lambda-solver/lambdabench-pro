---
name: 02-services-layers
description: Effect-TS 4 services and layers — Context.Tag, Layer.effect, dependency injection, and Layer composition
license: MIT
compatibility: opencode
---

# Services and Layers

## Defining a service

```typescript
import { Effect, Layer, Schema, ServiceMap } from "effect"

export class Database extends ServiceMap.Service<Database, {
  query(sql: string): Effect.Effect<Array<unknown>, DatabaseError>
}>()(
  "myapp/db/Database"  // key: use package/path convention
) {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const query = Effect.fn("Database.query")(function* (sql: string) {
        yield* Effect.log("SQL:", sql)
        return [{ id: 1 }]
      })
      return Database.of({ query })
    })
  )
}

export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()("DatabaseError", {
  cause: Schema.Defect
}) {}
```

## Configuration values

```typescript
export const FeatureFlag = ServiceMap.Reference<boolean>("myapp/FeatureFlag", {
  defaultValue: () => false
})
```

## Consuming a service

```typescript
const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.query("SELECT * FROM users")
}).pipe(Effect.provide(Database.layer))
```

## Layer composition

```typescript
// Layer.provide — hides the dependency, only exposes outer service
static readonly layer = this.layerNoDeps.pipe(
  Layer.provide(Database.layer)
)

// Layer.provideMerge — exposes BOTH
static readonly layerWithDb = this.layerNoDeps.pipe(
  Layer.provideMerge(Database.layer)
)

// Layer.mergeAll — combine independent layers
const AppLayer = Layer.mergeAll(Database.layer, Cache.layer, Logger.layer)
```

## Dynamic layer from config

```typescript
static readonly layer = Layer.unwrap(
  Effect.gen(function* () {
    const inMemory = yield* Config.boolean("USE_IN_MEMORY").pipe(
      Config.withDefault(false)
    )
    return inMemory ? MyService.layerInMemory : MyService.layerRemote
  })
)
```

## Background task (no service interface)

```typescript
const BackgroundTask = Layer.effectDiscard(Effect.gen(function* () {
  yield* Effect.forkScoped(Effect.gen(function* () {
    while (true) {
      yield* Effect.sleep("5 seconds")
      yield* Effect.log("tick")
    }
  }))
}))
```

## Resource lifecycle (acquireRelease)

```typescript
const transporter = yield* Effect.acquireRelease(
  Effect.sync(() => createTransport(config)),     // acquire
  (t) => Effect.sync(() => t.close())             // release — always runs
)
```

## App entrypoint

```typescript
const AppLayer = Layer.mergeAll(HttpServerLayer, WorkerLayer, DbLayer)
Layer.launch(AppLayer).pipe(NodeRuntime.runMain)
```

## In lambench-pro (static site, no server)

```typescript
// FetchHttpClient replaces RpcClient — no server needed
export const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(ENABLE_DEVTOOLS ? DevTools.layer() : Layer.empty)
  )
)
```
