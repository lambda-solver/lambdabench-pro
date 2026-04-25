---
name: 02-transformations
description: Effect-TS 4 Schema transformations — Schema.transform, Schema.transformOrFail, and codec patterns
license: MIT
compatibility: opencode
---

# Schema Transformations

## Schema.transform — lossless bidirectional mapping

Use when every encoded value maps cleanly to a decoded value and back.

```typescript
import { Schema } from "effect"

// String → Number (trim + parse)
const NumberFromString = Schema.transform(
  Schema.String,
  Schema.Number,
  {
    strict: true,
    decode: (s) => parseFloat(s),
    encode: (n) => String(n),
  },
)

// String → Date
const DateFromIso = Schema.transform(
  Schema.String,
  Schema.Date,
  {
    strict: true,
    decode: (s) => new Date(s),
    encode: (d) => d.toISOString(),
  },
)
```

## Schema.transformOrFail — mapping that can fail

Use when decoding may produce a validation error.

```typescript
import { ParseResult, Schema } from "effect"

const PositiveNumber = Schema.transformOrFail(
  Schema.Number,
  Schema.Number,
  {
    strict: true,
    decode: (n, _options, ast) =>
      n > 0
        ? ParseResult.succeed(n)
        : ParseResult.fail(new ParseResult.Type(ast, n, "must be positive")),
    encode: ParseResult.succeed,
  },
)
```

## Built-in transformations

```typescript
Schema.DateTimeUtcFromString          // ISO-8601 string → DateTime.Utc
Schema.NumberFromString               // "42" → 42
Schema.BooleanFromString              // "true" → true
Schema.BigIntFromString               // "9007199254740993" → 9007199254740993n
Schema.Trim                           // string → trimmed string
Schema.Lowercase                      // string → lowercase string
Schema.Uppercase                      // string → uppercase string
```

## Class with transformation

```typescript
class UserFromRaw extends Schema.Class<UserFromRaw>("UserFromRaw")({
  id: Schema.NumberFromString,           // wire: "42" → decoded: 42
  createdAt: Schema.DateTimeUtcFromString,
  name: Schema.Trim,
}) {}
```

## Codec pattern — named reusable transform

```typescript
// Define once
const JsonString = <A, I, R>(schema: Schema.Schema<A, I, R>) =>
  Schema.transform(
    Schema.String,
    schema,
    {
      strict: true,
      decode: (s) => JSON.parse(s) as I,
      encode: (a) => JSON.stringify(a),
    },
  )

// Use on any schema
const JsonRanking = JsonString(Ranking)
```

## Pipe transformations on struct fields

```typescript
const UserId = Schema.String.pipe(
  Schema.brand("UserId"),
  Schema.minLength(1),
)

const Slug = Schema.String.pipe(
  Schema.brand("Slug"),
  Schema.pattern(/^[a-z0-9-]+$/),
)
```

## Optional with default

```typescript
const ConfigSchema = Schema.Struct({
  port:    Schema.Number.pipe(Schema.optional).pipe(Schema.withDefault(() => 3000)),
  debug:   Schema.Boolean.pipe(Schema.optional).pipe(Schema.withDefault(() => false)),
})
```
