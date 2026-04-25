---
name: 03-api-contracts
description: Effect-TS 4 HttpApi schema-first REST contracts — route definitions, error schemas, and client codegen
license: MIT
compatibility: opencode
---

# Schema API Contracts

## HttpApi — schema-first REST API definition

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { Schema } from "effect"

// 1. Define API shape — separate from implementation
class UsersGroup extends HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("list", "/").addSuccess(Schema.Array(User)))
  .add(HttpApiEndpoint.get("get", "/:id").addSuccess(User).addError(NotFoundError))
  .add(HttpApiEndpoint.post("create", "/").setPayload(CreateUserInput).addSuccess(User))
  .prefix("/users") {}

export const Api = HttpApi.make("Api").add(UsersGroup)
```

## RPC — streaming / request-response

```typescript
import { RpcGroup, Rpc } from "effect/unstable/rpc"

export class EventRpc extends RpcGroup.make(
  Rpc.make("tick", {
    payload: Schema.Struct({ ticks: Schema.Number }),
    success: TickEvent,
    stream: true,  // enables streaming
  })
) {}
```

## HttpApiClient — generated typed client

```typescript
import { HttpApiClient } from "effect/unstable/httpapi"

const client = yield* HttpApiClient.make(Api, {
  transformClient: (c) => c.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl("http://localhost:3000")),
    HttpClient.retryTransient({ schedule: Schedule.exponential(100), times: 3 })
  )
})

// Typed call — no manual URL construction
const users = yield* client.users.list()
const user  = yield* client.users.get({ path: { id: "123" } })
```

## Schema for domain types (lambench-pro pattern)

```typescript
// Always export schema + type together
export const Ranking = Schema.Struct({
  model:    Schema.String,
  right:    Schema.Number,
  total:    Schema.Number,
  pct:      Schema.String,
  avgTime:  Schema.Number,
  tasks:    Schema.Record(Schema.String, Schema.Boolean),   // positional args
  taskBits: Schema.Record(Schema.String, Schema.Number),
  taskRefs: Schema.Record(Schema.String, Schema.Number),
  pricePerMOutputTokens: Schema.Number,
})
export type Ranking = Schema.Schema.Type<typeof Ranking>

export const BenchmarkData = Schema.Struct({
  rankings:    Schema.Array(Ranking),
  tasks:       Schema.Array(BenchmarkTask),
  categories:  Schema.Array(BenchmarkCategory),
  generatedAt: Schema.String,
})
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>
```

## Decoding in atoms

```typescript
// Decode fetched JSON with Schema in an atom
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(url)
    const body = yield* response.json
    return yield* Schema.decode(BenchmarkDataSchema)(body)
  })
)
```
