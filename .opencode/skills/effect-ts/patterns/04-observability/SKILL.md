---
name: 04-observability
description: Effect-TS 4 observability — structured logging, spans, tracing, annotations, and metrics
license: MIT
compatibility: opencode
---

# Observability

## Structured logging

```typescript
yield* Effect.log("info message")
yield* Effect.logInfo("user:", id)
yield* Effect.logWarning("slow query:", sql)
yield* Effect.logError("fetch failed:", url)
yield* Effect.logDebug("cache hit:", key)
yield* Effect.logTrace("verbose detail:", payload)
```

## Spans — tracing

`Effect.fn("name")` automatically creates a span from the name argument.
This is the preferred way — no manual `withSpan` needed.

```typescript
// ✅ span created automatically from name
export const processItem = Effect.fn("processItem")(function* (id: string) {
  return yield* doWork(id)
})

// Manual span — for one-off wrapping
program.pipe(Effect.withSpan("myOperation"))

// Span with attributes
program.pipe(
  Effect.withSpan("myOperation", {
    attributes: { userId: id, requestId },
  }),
)
```

## Annotating the current span

```typescript
yield* Effect.annotateCurrentSpan({ userId: id, requestId })
```

## Log annotations — attach context to all logs in scope

```typescript
// Attach to any effect
program.pipe(
  Effect.annotateLogs({ component: "auth", requestId }),
)

// As extra arg in Effect.fn — applies to all logs in the function
export const login = Effect.fn("login")(
  function* (input: LoginInput) { ... },
  Effect.annotateLogs({ method: "login" }),
)
```

## Effect.fn extra-arg pattern — span + annotations together

```typescript
export const runEval = Effect.fn("runEval")(
  function* (taskId: string) {
    yield* Effect.log("running eval")
    return yield* evaluate(taskId)
  },
  Effect.withSpan("runEval"),
  Effect.annotateLogs({ component: "evaluator" }),
)
```

## Metrics

```typescript
import { Metric } from "effect"

const requestCount = Metric.counter("http.requests")
const latency = Metric.histogram("http.latency.ms", {
  boundaries: Metric.linearBoundaries({ start: 0, width: 50, count: 20 }),
})

yield* Metric.increment(requestCount)
yield* Metric.record(latency, elapsedMs)
```

## DevTools (browser / development)

```typescript
import { DevTools } from "effect/unstable/devtools"

const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(
      import.meta.env.VITE_ENABLE_DEVTOOLS === "true"
        ? DevTools.layer()
        : Layer.empty,
    ),
  ),
)
```
