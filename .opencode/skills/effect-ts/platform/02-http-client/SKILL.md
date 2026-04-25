---
name: 02-http-client
description: Effect-TS 4 HTTP client — HttpClient, request building, response decoding, and error handling via effect/unstable/http
license: MIT
compatibility: opencode
---

# HTTP Client

**Import path**: `effect/unstable/http`

## Basic service wrapping HttpClient

```typescript
import { Context, Effect, Layer, Schedule, Schema } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http"

export class JsonApi extends Context.Service<JsonApi, {
  getTodo(id: number): Effect.Effect<Todo, ApiError>
}>()(
  "app/JsonApi",
) {
  static readonly layer = Layer.effect(
    JsonApi,
    Effect.gen(function* () {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(
          HttpClientRequest.prependUrl("https://api.example.com"),
        ),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential("100 millis"),
          times: 3,
        }),
      )

      const getTodo = Effect.fn("JsonApi.getTodo")(function* (id: number) {
        yield* Effect.annotateCurrentSpan({ id })
        return yield* client.get(`/todos/${id}`).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Todo)),
          Effect.mapError((cause) => new ApiError({ cause })),
        )
      })

      return JsonApi.of({ getTodo })
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer))
}
```

## Making requests

```typescript
// GET with query params
client.get("/path", { urlParams: { format: "json" } })

// POST JSON body
HttpClientRequest.post("/todos").pipe(
  HttpClientRequest.bodyJsonUnsafe(payload),
  client.execute,
)

// Set headers — note: Effect HTTP headers are lowercased
HttpClientRequest.get(url).pipe(
  HttpClientRequest.setHeader("authorization", `Bearer ${token}`),
)
```

## Reading responses

```typescript
// Typed body via Schema
HttpClientResponse.schemaBodyJson(MySchema)

// Raw JSON (untyped)
const body = yield* response.json

// Raw text
const text = yield* response.text

// Status code
response.status
```

## Headers — always lowercase

Effect normalises header names to lowercase:

```typescript
// ✅ lowercase
request.headers["authorization"]
request.headers["content-type"]

// ❌ will not match
request.headers["Authorization"]
```

## Middleware composition

```typescript
const client = (yield* HttpClient.HttpClient).pipe(
  HttpClient.mapRequest(flow(
    HttpClientRequest.prependUrl(baseUrl),
    HttpClientRequest.acceptJson,
  )),
  HttpClient.filterStatusOk,
  HttpClient.retryTransient({ schedule: Schedule.exponential("100 millis"), times: 3 }),
  HttpClient.transformResponse(
    Effect.mapError((cause) => new ApiError({ cause })),
  ),
)
```

## BunHttpClient vs FetchHttpClient

```typescript
import { BunHttpClient } from "@effect/platform-bun"
import { FetchHttpClient } from "effect/unstable/http"

// Server (Bun runtime)
Layer.provide(BunHttpClient.layer)

// Browser / client atoms
Layer.provide(FetchHttpClient.layer)
```

## In lambench-pro client atoms

```typescript
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`${import.meta.env.BASE_URL}data/results.json`)
    const body = yield* response.json
    return yield* Schema.decode(BenchmarkDataSchema)(body)
  }),
)
```
