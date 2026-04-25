---
name: 01-validation
description: Effect-TS 4 Schema validation — Schema.decode, struct/union schemas, brand types, and export patterns
license: MIT
compatibility: opencode
---

# Schema Validation

**Version**: `effect@4.0.0-beta.41`
**Import**: `import { Schema } from "effect"` — never from `"@effect/schema"`.

## Primitives

```typescript
Schema.String
Schema.Number
Schema.Boolean
Schema.BigInt
Schema.Date
Schema.Unknown
Schema.Void
Schema.Never
```

## Struct

```typescript
const User = Schema.Struct({
  id: Schema.String,
  age: Schema.Number,
  active: Schema.Boolean,
})
type User = Schema.Schema.Type<typeof User>
```

## Array / Record

```typescript
Schema.Array(Schema.String)

// Record — positional args (NOT object syntax)
Schema.Record(Schema.String, Schema.Number)    // ✅ Effect 4
// Schema.Record({ key: ..., value: ... })     // ❌ Effect 3 — compile error
```

## Optional / nullable fields

```typescript
Schema.optional(Schema.String)       // field may be missing from input
Schema.NullOr(Schema.String)         // string | null
Schema.UndefinedOr(Schema.String)    // string | undefined
Schema.NullishOr(Schema.String)      // string | null | undefined
```

## Literal / union

```typescript
Schema.Literal("online", "away", "busy")
Schema.Literals(["info", "warn", "error"])       // array form

// Discriminated union (by _tag)
Schema.Union([
  Schema.TaggedStruct("left",  { value: Schema.Number }),
  Schema.TaggedStruct("right", { value: Schema.String }),
])
```

## Branded types

```typescript
const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = Schema.Schema.Type<typeof UserId>
```

## Class-based schema

```typescript
class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}
```

## Errors with Schema

```typescript
// TaggedErrorClass — serializable, primary pattern
export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()(
  "UserNotFound",
  { id: Schema.String },
) {}

// ErrorClass — without auto-generated _tag field
export class SmtpError extends Schema.ErrorClass<SmtpError>("SmtpError")({
  cause: Schema.Defect,
}) {}
```

## Decoding / encoding

```typescript
// Decode (parse unknown → typed)
const user = yield* Schema.decode(User)(unknownInput)
const user = yield* Schema.decode(User)(input, { errors: "all" })  // all errors

// Encode (typed → wire format)
const json = yield* Schema.encode(User)(user)

// Synchronous variants
const user = Schema.decodeSync(User)(input)
const json = Schema.encodeSync(User)(user)
```

## Export pattern — always export schema + type together

```typescript
export const Ranking = Schema.Struct({
  model:   Schema.String,
  right:   Schema.Number,
  pct:     Schema.String,
  tasks:   Schema.Record(Schema.String, Schema.Boolean),
})
export type Ranking = Schema.Schema.Type<typeof Ranking>

export const BenchmarkData = Schema.Struct({
  rankings:    Schema.Array(Ranking),
  generatedAt: Schema.String,
})
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>
```
