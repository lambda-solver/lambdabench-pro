---
name: 02-services-layers
description: Effect-TS 4 services and layers — ServiceMap.Service, Layer.effect, dependency injection, and Layer composition
license: MIT
compatibility: opencode
---

# Services and Layers

## Defining a service — `ServiceMap.Service`

The canonical pattern in Effect 4 beta. `ServiceMap` is exported from `"effect"`;
`Context` is **not** exported in beta.41+. Use `ServiceMap.Service`.

```typescript
import { Effect, Layer, ServiceMap } from "effect"

export class Database extends ServiceMap.Service<Database, {
  query(sql: string): Effect.Effect<Array<unknown>, DatabaseError>
}>()(
  "myapp/db/Database"   // key: use "package/path/Name" convention
) {
  // Self-contained layer
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const query = Effect.fn("Database.query")(function* (sql: string) {
        yield* Effect.log("SQL:", sql)
        return [{ id: 1 }]
      })
      return Database.of({ query })
    }),
  )

  // Test layer — always add a testLayer alongside layer
  static readonly testLayer = Layer.succeed(
    Database,
    Database.of({
      query: (_sql) => Effect.succeed([]),
    }),
  )
}
```

## Service key naming convention

Use `"package/path/ServiceName"` to avoid collisions:

```
"myapp/db/Database"
"myapp/cache/RedisCache"
"@repo/domain/BenchmarkService"
"effect/cluster/Entity/EntityAddress"   // effect-internal style
```

## Configuration service pattern

```typescript
export class AppConfig extends ServiceMap.Service<AppConfig, {
  readonly port: number
  readonly host: string
}>()(
  "myapp/AppConfig",
) {
  static readonly layer = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const port = yield* Config.integer("PORT").pipe(Config.withDefault(3000))
      const host = yield* Config.string("HOST").pipe(Config.withDefault("0.0.0.0"))
      return AppConfig.of({ port, host })
    }),
  )

  static readonly testLayer = Layer.succeed(
    AppConfig,
    AppConfig.of({ port: 3000, host: "localhost" }),
  )
}
```

## Consuming a service

```typescript
const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.query("SELECT * FROM users")
}).pipe(Effect.provide(Database.layer))
```

## Always return `Service.of(...)` — never plain objects

```typescript
return Database.of({ query })   // ✅ preserves prototype chain
return { query }                // ❌ breaks ServiceMap.Service extension
```

## Layer composition

```typescript
// Layer.provide — hides the dep, callers see only outer service
static readonly layer = this.layerNoDeps.pipe(
  Layer.provide(Database.layer),
)

// Layer.provideMerge — exposes BOTH (useful in tests)
static readonly layerTest = this.layerNoDeps.pipe(
  Layer.provideMerge(TestRef.layer),
)

// Layer.mergeAll — combine independent layers
const AppLayer = Layer.mergeAll(Database.layer, Cache.layer, Logger.layer)
```

## Dynamic layer from config

```typescript
static readonly layer = Layer.unwrap(
  Effect.gen(function* () {
    const inMemory = yield* Config.boolean("USE_IN_MEMORY").pipe(
      Config.withDefault(false),
    )
    return inMemory ? MyService.layerInMemory : MyService.layerRemote
  }),
)
```

## Background task (no service interface)

```typescript
const BackgroundTask = Layer.effectDiscard(
  Effect.gen(function* () {
    yield* Effect.forkScoped(
      Effect.gen(function* () {
        while (true) {
          yield* Effect.sleep("5 seconds")
          yield* Effect.log("tick")
        }
      }),
    )
  }),
)
```

## Resource with lifecycle in a layer

```typescript
const TransporterLayer = Layer.scoped(
  Transporter,
  Effect.gen(function* () {
    const t = yield* Effect.acquireRelease(
      Effect.sync(() => createTransport(config)),
      (t) => Effect.sync(() => t.close()),
    )
    return Transporter.of({ send: (msg) => Effect.sync(() => t.send(msg)) })
  }),
)
```

## App entrypoint

```typescript
import { BunRuntime } from "@effect/platform-bun"

const AppLayer = Layer.mergeAll(HttpServerLayer, WorkerLayer, DbLayer)
BunRuntime.runMain(Layer.launch(AppLayer))
```
