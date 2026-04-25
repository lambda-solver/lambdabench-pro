---
name: 03-error-handling
description: Effect-TS 4 error handling — Effect.catch, catchTag, catchTags, typed channels, and absorb patterns
license: MIT
compatibility: opencode
---

# Error Handling Patterns

## Define errors at the module boundary

```typescript
import { Schema } from "effect"

// Serializable tagged error — primary pattern
export class ParseError extends Schema.TaggedErrorClass<ParseError>()(
  "ParseError",
  { input: Schema.String, message: Schema.String },
) {}

// With unknown cause
export class FetchError extends Schema.TaggedErrorClass<FetchError>()(
  "FetchError",
  { url: Schema.String, cause: Schema.Defect },
) {}

// Plain class — lightweight, non-serializable
export class LlmError {
  readonly _tag = "LlmError"
  constructor(readonly message: string) {}
}
```

## catchTag / catchTags — targeted recovery

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
```

## Effect.catch — all typed errors

`Effect.catchAll` does **not exist** in Effect 4. Use `Effect.catch`.
It only catches recoverable (typed) errors — defects still propagate.

```typescript
// ❌ Effect 3 — compile error in Effect 4
program.pipe(Effect.catchAll((e) => Effect.succeed("fallback")))

// ✅ Effect 4
program.pipe(Effect.catch((_e) => Effect.succeed("fallback")))
```

## Absorb boundary — unknown errors into typed channel

When calling code that may fail with `unknown` (SDK errors, callbacks),
use `Effect.catch` to absorb into a safe fallback.

```typescript
// LLM SDK may throw AiError or unknown — absorb at the boundary
const rawText = yield* LanguageModel.generateText({ prompt }).pipe(
  Effect.map((r) => r.text),
  Effect.catch((_e) => Effect.succeed(`@main = λf.λx.x  // error: ${String(_e)}`)),
)
```

## Wrapping at service boundaries

Map errors as they cross a layer boundary to keep the error type local.

```typescript
const findById = Effect.fn("Repo.findById")(function* (id: string) {
  return yield* sql`SELECT * FROM users WHERE id = ${id}`.pipe(
    Effect.mapError((cause) => new UserRepoError({ cause })),
  )
})
```

## Reason errors — nested categorized sub-errors

```typescript
export class AiError extends Schema.TaggedErrorClass<AiError>()(
  "AiError",
  { reason: Schema.Union([RateLimitError, QuotaExceededError, SafetyBlockedError]) },
) {}

// Catch one reason
program.pipe(
  Effect.catchReason("AiError", "RateLimitError",
    (r) => Effect.succeed(`retry after ${r.retryAfter}s`),
  ),
)

// Unwrap into error channel
program.pipe(
  Effect.unwrapReason("AiError"),
  Effect.catchTags({
    RateLimitError:    (r) => ...,
    QuotaExceededError:(r) => ...,
  }),
)
```

## Catching defects (unexpected failures)

```typescript
import { Cause } from "effect"

program.pipe(
  Effect.catchCause((cause) =>
    Cause.isFailure(cause)
      ? Effect.succeed("recovered")
      : Effect.failCause(cause),   // re-raise non-failure causes
  ),
)
```

## Return before yield* error

```typescript
export const load = Effect.fn("load")(function* (id: string) {
  if (!id) return yield* new NotFoundError()  // return stops TS inference here
  return yield* fetchById(id)
})
```

## Never fail silently

```typescript
// ❌ swallows the error
.pipe(Effect.catch((_) => Effect.succeed(undefined)))

// ✅ log then recover
.pipe(
  Effect.catch((e) =>
    Effect.gen(function* () {
      yield* Effect.logError("unexpected error", e)
      return defaultValue
    }),
  ),
)
```
