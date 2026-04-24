# Error Model

## Defining errors — Schema.TaggedErrorClass

```typescript
import { Schema } from "effect"

// Tagged error with fields
export class ParseError extends Schema.TaggedErrorClass<ParseError>()("ParseError", {
  input: Schema.String,
  message: Schema.String,
}) {}

// Error with cause (wraps unknown thrown values)
export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()("DatabaseError", {
  cause: Schema.Defect,  // Schema.Defect = unknown
}) {}

// Plain error (no extra fields)
export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()("NotFoundError", {}) {}

// Error with a tagged reason union (for categorized sub-errors)
export class AiError extends Schema.TaggedErrorClass<AiError>()("AiError", {
  reason: Schema.Union([RateLimitError, QuotaExceededError, SafetyBlockedError])
}) {}
```

## Catching errors

```typescript
// Catch one tag
program.pipe(
  Effect.catchTag("ParseError", (e) => Effect.succeed(`fallback: ${e.message}`))
)

// Catch multiple tags at once
program.pipe(
  Effect.catchTag(["ParseError", "NetworkError"], (_) => Effect.succeed(defaultValue))
)

// Catch multiple with different handlers
program.pipe(
  Effect.catchTags({
    ParseError: (e) => Effect.succeed(`parse failed: ${e.message}`),
    NetworkError: (e) => Effect.succeed(`network ${e.statusCode}`),
  })
)

// Catch all typed errors
program.pipe(
  Effect.catch((e) => Effect.succeed(defaultValue))
)
```

## Reason errors (nested tagged union)

```typescript
// Catch one specific reason
program.pipe(
  Effect.catchReason(
    "AiError",         // parent _tag
    "RateLimitError",  // reason _tag
    (reason) => Effect.succeed(`retry after ${reason.retryAfter}s`),
    (other)  => Effect.succeed(`other: ${other._tag}`)  // optional catch-all
  )
)

// Catch multiple reasons
program.pipe(
  Effect.catchReasons("AiError", {
    RateLimitError:    (r) => Effect.succeed(`retry ${r.retryAfter}s`),
    QuotaExceededError:(r) => Effect.succeed(`quota exceeded ${r.limit}`),
  })
)

// Move reasons into error channel for catchTags
program.pipe(
  Effect.unwrapReason("AiError"),
  Effect.catchTags({
    RateLimitError:     (r) => ...,
    QuotaExceededError: (r) => ...,
    SafetyBlockedError: (r) => ...,
  })
)
```

## Error in Effect.fn — always return

```typescript
export const load = Effect.fn("load")(function* (id: string) {
  if (!id) return yield* new NotFoundError()  // return ensures TS knows it stops here
  return yield* fetchById(id)
})
```
