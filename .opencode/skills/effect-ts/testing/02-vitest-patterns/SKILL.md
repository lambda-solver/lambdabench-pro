---
name: 02-vitest-patterns
description: Effect-TS 4 Vitest patterns — it.effect, it.scoped, expect helpers, and test suite setup with @effect/vitest
license: MIT
compatibility: opencode
---

# Testing with @effect/vitest

## Setup

```typescript
import { assert, describe, it, layer } from "@effect/vitest"
import { Effect } from "effect"
```

## it.effect — basic Effect test

```typescript
it.effect("description", () =>
  Effect.gen(function* () {
    const result = yield* myEffect
    assert.strictEqual(result, expectedValue)
    assert.deepStrictEqual(result, { id: 1 })
    assert.isTrue(result.active)
  })
)
```

## it.live — uses real clock (not TestClock)

```typescript
it.live("uses real timers", () =>
  Effect.gen(function* () {
    const start = Date.now()
    yield* Effect.sleep(1)
    assert.isTrue(Date.now() >= start)
  })
)
```

## Parameterized tests

```typescript
it.effect.each([
  { input: " Ada ", expected: "ada" },
  { input: " Lin ", expected: "lin" },
])("trims and lowercases %#", ({ input, expected }) =>
  Effect.gen(function* () {
    assert.strictEqual(input.trim().toLowerCase(), expected)
  })
)
```

## TestClock — control time

```typescript
import { TestClock } from "effect/testing"

it.effect("advances virtual time", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(
      Effect.sleep(60_000).pipe(Effect.as("done" as const))
    )
    yield* TestClock.adjust(60_000)
    const value = yield* Fiber.join(fiber)
    assert.strictEqual(value, "done")
  })
)
```

## Property-based testing

```typescript
import { Schema } from "effect"

it.effect.prop("reverse twice is identity", [Schema.String], ([value]) =>
  Effect.gen(function* () {
    const roundTrip = value.split("").reverse().reverse().join("")
    assert.strictEqual(roundTrip, value)
  })
)
```

## Shared layer per describe block

```typescript
import { layer } from "@effect/vitest"

// One shared layer for all tests in this block, torn down in afterAll
layer(TodoRepo.layerTest)("TodoRepo tests", (it) => {
  it.effect("creates a todo", () =>
    Effect.gen(function* () {
      const repo = yield* TodoRepo
      yield* repo.create("Write tests")
      const all = yield* repo.list
      assert.isTrue(all.length >= 1)
    })
  )
})
```

## Test service with Ref

```typescript
export class TestRef extends ServiceMap.Service<TestRef, Ref.Ref<Array<Todo>>>()("app/TestRef") {
  static readonly layer = Layer.effect(TestRef, Ref.make([]))
}

// In test: access ref to inspect internal state
const todos = yield* Ref.get(yield* TestRef)
assert.strictEqual(todos.length, 1)
```

## Per-test provide (no shared layer)

```typescript
it.effect("isolated test", () =>
  Effect.gen(function* () {
    const svc = yield* MyService
    const result = yield* svc.doThing()
    assert.isTrue(result.ok)
  }).pipe(Effect.provide(MyService.layerTest))
)
```
