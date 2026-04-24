# HTTP Client

**Imports**: `effect/unstable/http`

## Basic usage

```typescript
import { Effect, Layer, Schedule, Schema, ServiceMap } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http"

export class JsonApi extends ServiceMap.Service<JsonApi, {
  getTodo(id: number): Effect.Effect<Todo, ApiError>
}>()("app/JsonApi") {
  static readonly layer = Layer.effect(
    JsonApi,
    Effect.gen(function* () {
      // Get the client and apply shared middleware
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequest(flow(
          HttpClientRequest.prependUrl("https://api.example.com"),
          HttpClientRequest.acceptJson,
        )),
        HttpClient.filterStatusOk,
        HttpClient.retryTransient({
          schedule: Schedule.exponential(100),
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
    })
  ).pipe(
    Layer.provide(FetchHttpClient.layer)  // provide fetch-based implementation
  )
}
```

## Making requests

```typescript
// GET
client.get("/path", { urlParams: { format: "json" } })

// POST with JSON body
HttpClientRequest.post("/todos").pipe(
  HttpClientRequest.setUrlParams({ format: "json" }),
  HttpClientRequest.bodyJsonUnsafe(payload),
  client.execute,
)

// Headers
HttpClientRequest.get(url).pipe(
  HttpClientRequest.setHeader("Authorization", `Bearer ${token}`),
)
```

## Reading responses

```typescript
// Decode response body with schema
HttpClientResponse.schemaBodyJson(MySchema)

// Raw JSON (untyped)
const body = yield* response.json

// Raw text
const text = yield* response.text
```

## In lambench-pro (client atom — static site)

```typescript
// benchmark-atom.ts: fetch results.json with FetchHttpClient from runtime layer
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(`${import.meta.env.BASE_URL}data/results.json`)
    const body = yield* response.json
    return yield* Schema.decode(BenchmarkDataSchema)(body)
  })
)
```

## Common middleware

```typescript
HttpClient.mapRequest(...)          // transform every request
HttpClient.filterStatusOk           // fail if status >= 400
HttpClient.retryTransient(...)      // retry on 5xx / network errors
HttpClient.transformResponse(...)   // transform every response
```
