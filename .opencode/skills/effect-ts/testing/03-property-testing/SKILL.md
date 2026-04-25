---
name: 03-property-testing
description: Effect-TS 4 property-based testing — Schema Arbitrary, fast-check, and generative test patterns
license: MIT
compatibility: opencode
---

# Property-Based Testing

## Schema Arbitrary — generate test data from schemas

Effect Schema can derive `fast-check` arbitraries automatically.

```typescript
import { Arbitrary, FastCheck, Schema } from "effect"

const User = Schema.Struct({
  id: Schema.String,
  age: Schema.Number.pipe(Schema.between(0, 120)),
  active: Schema.Boolean,
})

const arb = Arbitrary.make(User)

FastCheck.assert(
  FastCheck.property(arb, (user) => {
    // property must hold for all generated users
    expect(user.age).toBeGreaterThanOrEqual(0)
    expect(user.age).toBeLessThanOrEqual(120)
  }),
)
```

## it.effect.prop — built-in property test runner

```typescript
import { it } from "@effect/vitest"
import { Schema } from "effect"

it.effect.prop(
  "encode then decode is identity",
  [Schema.String, Schema.Number],
  ([str, num]) =>
    Effect.gen(function* () {
      const pair = { str, num }
      const encoded = yield* Schema.encode(MySchema)(pair)
      const decoded = yield* Schema.decode(MySchema)(encoded)
      assert.deepStrictEqual(decoded, pair)
    }),
)
```

## Plain fast-check in Vitest

```typescript
import { test } from "vitest"
import { FastCheck } from "effect"

test("sort is idempotent", () => {
  FastCheck.assert(
    FastCheck.property(
      FastCheck.array(FastCheck.integer()),
      (arr) => {
        const sorted = [...arr].sort()
        expect([...sorted].sort()).toEqual(sorted)
      },
    ),
  )
})
```

## Custom arbitraries

```typescript
import { Arbitrary, FastCheck } from "effect"

// Combine arbitraries
const nonEmptyString = FastCheck.string({ minLength: 1 })
const modelId = FastCheck.string({ minLength: 3 }).map((s) => `vendor/${s}`)

// Use with property test
FastCheck.assert(
  FastCheck.property(modelId, (id) => {
    expect(id).toContain("/")
  }),
)
```

## Schema constraints for tighter arbitraries

```typescript
const BoundedAge = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 120),
)

const NonEmptyTitle = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(200),
)

const Task = Schema.Struct({
  id: Schema.String.pipe(Schema.brand("TaskId")),
  title: NonEmptyTitle,
  age: BoundedAge,
})

// Arbitrary respects all constraints
const arb = Arbitrary.make(Task)
```

## Round-trip property (encode → decode)

A fundamental property for any Schema with a transformation:

```typescript
test("Schema round-trip", () => {
  FastCheck.assert(
    FastCheck.property(Arbitrary.make(MySchema), (value) => {
      const encoded = Schema.encodeSync(MySchema)(value)
      const decoded = Schema.decodeSync(MySchema)(encoded)
      expect(decoded).toEqual(value)
    }),
  )
})
```
