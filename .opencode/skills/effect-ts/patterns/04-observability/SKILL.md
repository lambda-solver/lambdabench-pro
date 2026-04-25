---
name: 04-observability
description: Effect-TS 4 observability — structured logging, spans, tracing, and metrics patterns
license: MIT
compatibility: opencode
---

# Observability

## Logging

```typescript
// Log at various levels
yield* Effect.log("info message")
yield* Effect.logInfo("user:", id)
yield* Effect.logWarning("slow query:", sql)
yield* Effect.logError("fetch failed:", url)
yield* Effect.logDebug("cache hit:", key)
```

## Spans / tracing

```typescript
// Add a span to any effect
program.pipe(Effect.withSpan("myOperation"))

// Span in Effect.fn (preferred — automatic span from name arg)
export const fn = Effect.fn("myOperation")(function* () { ... })

// Annotate current span
yield* Effect.annotateCurrentSpan({ userId: id, requestId })
```

## Log annotations

```typescript
// Annotate all log messages in an effect scope
program.pipe(
  Effect.annotateLogs({ component: "auth", requestId })
)

// In Effect.fn as extra arg
Effect.fn("login")(
  function* (input) { ... },
  Effect.annotateLogs({ method: "login" })
)
```

## DevTools (browser)

```typescript
import { DevTools } from "effect/unstable/devtools"

// Enable in development
const runtime = Atom.runtime(
  FetchHttpClient.layer.pipe(
    Layer.provideMerge(
      import.meta.env.VITE_ENABLE_DEVTOOLS === "true"
        ? DevTools.layer()
        : Layer.empty
    )
  )
)
```
