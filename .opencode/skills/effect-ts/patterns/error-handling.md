# Error Handling Patterns

## Define errors at the module boundary

```typescript
import { Schema } from "effect"

// Use Schema.TaggedErrorClass for typed, serializable errors
export class ParseError extends Schema.TaggedErrorClass<ParseError>()("ParseError", {
  input: Schema.String,
  message: Schema.String,
}) {}

// Use Schema.Defect for unknown thrown values (from catch blocks)
export class FetchError extends Schema.TaggedErrorClass<FetchError>()("FetchError", {
  url: Schema.String,
  cause: Schema.Defect,
}) {}
```

## catchTag / catchTags

```typescript
// Single tag
program.pipe(
  Effect.catchTag("ParseError", (e) => Effect.succeed(`fallback: ${e.message}`))
)

// Multiple with same handler
program.pipe(
  Effect.catchTag(["ParseError", "NetworkError"], (_) => Effect.succeed(0))
)

// Multiple with individual handlers
program.pipe(
  Effect.catchTags({
    ParseError:   (e) => Effect.succeed(`parse: ${e.message}`),
    NetworkError: (e) => Effect.succeed(`net: ${e.statusCode}`),
  })
)
```

## Wrapping errors at service boundaries

```typescript
// Map errors as they cross layer boundaries
const findById = Effect.fn("Repo.findById")(function* (id: string) {
  return yield* sql`SELECT * FROM users WHERE id = ${id}`.pipe(
    Effect.mapError((reason) => new UserRepoError({ reason }))
  )
})
```

## Reason errors for categorized sub-errors

```typescript
// Parent error wraps a tagged union of causes
export class AiError extends Schema.TaggedErrorClass<AiError>()("AiError", {
  reason: Schema.Union([RateLimitError, QuotaExceededError, SafetyBlockedError])
}) {}

// Handle via catchReason
program.pipe(
  Effect.catchReason("AiError", "RateLimitError",
    (r) => Effect.succeed(`retry after ${r.retryAfter}s`)
  )
)

// Or unwrap into error channel
program.pipe(
  Effect.unwrapReason("AiError"),
  Effect.catchTags({ RateLimitError: ..., QuotaExceededError: ... })
)
```

## Error flow in Effect.fn

```typescript
// Always return before yield* error — ensures TS narrows the type correctly
export const load = Effect.fn("load")(function* (id: string) {
  if (!id) return yield* new NotFoundError()
  return yield* fetchById(id)
})
```

## `Effect.catch` — catch all typed errors

`Effect.catchAll` does **not exist**. Use `Effect.catch` instead.
It only catches recoverable (typed) errors — defects still propagate.

```typescript
// ❌ Effect 3 — compile error in Effect 4
program.pipe(Effect.catchAll((e) => Effect.succeed("fallback")))

// ✅ Effect 4
program.pipe(Effect.catch((e) => Effect.succeed("fallback")))

// ✅ Effect 4 — two-argument form
Effect.catch(program, (e) => Effect.succeed("fallback"))
```

To also catch defects (all causes), use `Effect.catchCause`:

```typescript
import { Cause } from "effect"

program.pipe(
  Effect.catchCause((cause) =>
    Cause.isFailure(cause)
      ? Effect.succeed("recovered")
      : Effect.failCause(cause)  // re-raise defects
  )
)
```

## `Effect.catch` for unknown fallbacks

```typescript
program.pipe(
  Effect.catchTag("ReservedPort", (_) => Effect.succeed(3000)),
  Effect.catch((_) => Effect.succeed(3000))  // catch all remaining typed errors
)
```
