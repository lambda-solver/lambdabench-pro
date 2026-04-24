# Schema Validation

**Version**: `effect@4.0.0-beta.41` — `Schema` is imported from `"effect"`, not `"@effect/schema"`.

## Defining schemas

```typescript
import { Schema } from "effect"

// Primitives
Schema.String
Schema.Number
Schema.Boolean

// Struct
const User = Schema.Struct({
  id: Schema.String,
  age: Schema.Number,
  active: Schema.Boolean,
})
type User = Schema.Schema.Type<typeof User>

// Array
Schema.Array(Schema.String)

// Record — positional args in Effect 4 beta
Schema.Record(Schema.String, Schema.Number)       // ✅ Effect 4 beta
// NOT Schema.Record({ key: ..., value: ... })    // ❌ Effect 3 style

// Literal union
Schema.Literal("online", "away", "busy")
Schema.Literals(["info", "warn", "error"])        // array form

// Tagged union (discriminated by _tag)
Schema.Union([
  Schema.TaggedStruct("left",  { value: Schema.Number }),
  Schema.TaggedStruct("right", { value: Schema.String }),
])

// Optional / nullable
Schema.optional(Schema.String)
Schema.NullOr(Schema.String)
Schema.UndefinedOr(Schema.String)

// Branded types
Schema.String.pipe(Schema.brand("UserId"))

// Class-based (adds constructor, prototype)
class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}
```

## Decoding / encoding

```typescript
// Decode (parse from unknown input)
const user = yield* Schema.decode(User)(unknownInput)

// Decode with options
const user = yield* Schema.decode(User)(input, { errors: "all" })

// Encode (serialize typed value to wire format)
const json = yield* Schema.encode(User)(user)

// Synchronous variants
const user = Schema.decodeSync(User)(input)

// Parse Options — show all errors vs first
{ errors: "all" }     // collect all validation errors
{ errors: "first" }   // stop at first (default)
```

## Errors with Schema

```typescript
// TaggedErrorClass — primary error pattern
export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String,
}) {}

// ErrorClass — without _tag field in constructor
export class SmtpError extends Schema.ErrorClass<SmtpError>("SmtpError")({
  cause: Schema.Defect,
}) {}
```

## Transformations

```typescript
// DateTimeUtcFromString — ISO-8601 string → DateTime.Utc
Schema.DateTimeUtcFromString

// Custom transformation
Schema.transform(
  Schema.String,
  Schema.Number,
  {
    decode: (s) => parseFloat(s),
    encode: (n) => String(n),
  }
)
```

## Export pattern (always export both schema + type)

```typescript
export const BenchmarkData = Schema.Struct({
  rankings: Schema.Array(Ranking),
  generatedAt: Schema.String,
})
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>
```
