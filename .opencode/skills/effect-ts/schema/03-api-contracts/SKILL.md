---
name: 03-api-contracts
description: Effect-TS 4 HttpApi schema-first REST contracts — route definitions, error schemas, and typed client
license: MIT
compatibility: opencode
---

# API Contracts

## HttpApi — schema-first REST definition

```typescript
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { Schema } from "effect"

class UsersGroup extends HttpApiGroup.make("users")
  .add(HttpApiEndpoint.get("list", "/").addSuccess(Schema.Array(User)))
  .add(
    HttpApiEndpoint.get("get", "/:id")
      .addSuccess(User)
      .addError(NotFoundError),
  )
  .add(
    HttpApiEndpoint.post("create", "/")
      .setPayload(CreateUserInput)
      .addSuccess(User),
  )
  .prefix("/users") {}

export const Api = HttpApi.make("Api").add(UsersGroup)
```

## HttpApiClient — generated typed client

```typescript
import { HttpApiClient } from "effect/unstable/httpapi"
import { HttpClient, HttpClientRequest, Schedule } from "effect/unstable/http"

const client = yield* HttpApiClient.make(Api, {
  transformClient: (c) =>
    c.pipe(
      HttpClient.mapRequest(
        HttpClientRequest.prependUrl("http://localhost:3000"),
      ),
      HttpClient.retryTransient({
        schedule: Schedule.exponential("100 millis"),
        times: 3,
      }),
    ),
})

const users = yield* client.users.list()
const user  = yield* client.users.get({ path: { id: "123" } })
const newUser = yield* client.users.create({ body: { name: "Ada" } })
```

## RPC — streaming / request-response

```typescript
import { Rpc, RpcGroup } from "effect/unstable/rpc"
import { Schema } from "effect"

export class BenchmarkRpc extends RpcGroup.make(
  Rpc.make("runEval", {
    payload: Schema.Struct({ taskId: Schema.String }),
    success: EvalResult,
  }),
  Rpc.make("streamResults", {
    payload: Schema.Struct({ modelId: Schema.String }),
    success: EvalResult,
    stream: true,
  }),
) {}
```

## Domain schema export pattern

Always export the Schema constant AND the derived TypeScript type together:

```typescript
export const Ranking = Schema.Struct({
  model:    Schema.String,
  right:    Schema.Number,
  total:    Schema.Number,
  pct:      Schema.String,
  avgTime:  Schema.Number,
  tasks:    Schema.Record(Schema.String, Schema.Boolean),
  taskBits: Schema.Record(Schema.String, Schema.Number),
  rlm:      Schema.optional(Schema.Number),
  rlmDepth: Schema.optional(Schema.Number),
})
export type Ranking = Schema.Schema.Type<typeof Ranking>

export const BenchmarkData = Schema.Struct({
  rankings:    Schema.Array(Ranking),
  tasks:       Schema.Array(BenchmarkTask),
  generatedAt: Schema.String,
})
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>
```

## Error schemas for API boundaries

```typescript
export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "NotFoundError",
  { id: Schema.String },
) {}

export class ValidationError extends Schema.TaggedErrorClass<ValidationError>()(
  "ValidationError",
  { field: Schema.String, message: Schema.String },
) {}
```

## Layer.provide for API server

```typescript
const AppLayer = Layer.mergeAll(
  HttpApiServer.layer,
  UsersHandler.layer,
  DbPool.layer,
)
BunRuntime.runMain(Layer.launch(AppLayer))
```
