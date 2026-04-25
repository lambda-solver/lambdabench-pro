---
name: 03-error-model
description: Effect-TS 4 error model — Schema.TaggedErrorClass, typed defects, union errors, and error channel semantics
license: MIT
compatibility: opencode
---

# Error Model

## Defining errors

### Schema.TaggedErrorClass — primary pattern

```typescript
import { Schema } from "effect"

// With fields
export class ParseError extends Schema.TaggedErrorClass<ParseError>()(
  "ParseError",
  {
    input: Schema.String,
    message: Schema.String,
  },
) {}

// With unknown cause (from catch blocks)
export class FetchError extends Schema.TaggedErrorClass<FetchError>()(
  "FetchError",
  {
    url: Schema.String,
    cause: Schema.Defect,   // Schema.Defect = unknown
  },
) {}

// No fields
export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "NotFoundError",
  {},
) {}
```

### Plain class — for simple non-serializable errors

Use when serialization / Schema isn't needed (e.g. internal service boundary).

```typescript
export class LlmError {
  readonly _tag = "LlmError"
  constructor(readonly message: string) {}
}
```

### Reason errors — nested tagged union

```typescript
export class RateLimitError extends Schema.TaggedErrorClass<RateLimitError>()(
  "RateLimitError", { retryAfter: Schema.Number },
) {}

export class AiError extends Schema.TaggedErrorClass<AiError>()(
  "AiError",
  { reason: Schema.Union([RateLimitError, QuotaExceededError]) },
) {}
```

## Catching errors

```typescript
// Single tag
program.pipe(
  Effect.catchTag("ParseError", (e) => Effect.succeed(`fallback: ${e.message}`)),
)

// Multiple tags — same handler
program.pipe(
  Effect.catchTag(["ParseError", "NetworkError"], (_) => Effect.succeed(0)),
)

// Multiple tags — individual handlers
program.pipe(
  Effect.catchTags({
    ParseError:   (e) => Effect.succeed(`parse: ${e.message}`),
    NetworkError: (e) => Effect.succeed(`net: ${e.statusCode}`),
  }),
)

// All typed errors — Effect.catch (NOT catchAll — that doesn't exist)
program.pipe(
  Effect.catch((_e) => Effect.succeed(defaultValue)),
)
```

## Catching reason errors

```typescript
// One specific reason
program.pipe(
  Effect.catchReason("AiError", "RateLimitError",
    (r) => Effect.succeed(`retry after ${r.retryAfter}s`),
  ),
)

// Unwrap into error channel for catchTags
program.pipe(
  Effect.unwrapReason("AiError"),
  Effect.catchTags({
    RateLimitError:    (r) => ...,
    QuotaExceededError:(r) => ...,
  }),
)
```

## Catching defects (unexpected errors)

```typescript
import { Cause } from "effect"

program.pipe(
  Effect.catchCause((cause) =>
    Cause.isFailure(cause)
      ? Effect.succeed("recovered from typed error")
      : Effect.failCause(cause),   // re-raise defects
  ),
)
```

## Wrapping at service boundaries

```typescript
const findById = Effect.fn("Repo.findById")(function* (id: string) {
  return yield* sql`SELECT * FROM users WHERE id = ${id}`.pipe(
    Effect.mapError((reason) => new UserRepoError({ reason })),
  )
})
```

## Return before yield* error

```typescript
// ✅ return ensures TS knows execution stops
export const load = Effect.fn("load")(function* (id: string) {
  if (!id) return yield* new NotFoundError()
  return yield* fetchById(id)
})
```
