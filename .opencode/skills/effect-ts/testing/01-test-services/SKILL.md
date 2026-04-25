---
name: 01-test-services
description: Effect-TS 4 testing with layers — mock services, test Refs, Layer.succeed, and test dependency injection
license: MIT
compatibility: opencode
---

# Testing Services with Layers

## Core pattern: mock at the Layer level

Provide a `Layer.succeed` or `Layer.effect` that replaces the real implementation.
Never reach past the layer boundary in tests.

```typescript
import { Context, Effect, Layer, Ref } from "effect"

// Mock a service with a Ref for state inspection
const mockDb = Layer.effect(
  Database,
  Effect.gen(function* () {
    const store = yield* Ref.make<Array<Row>>([])
    return Database.of({
      query: Effect.fnUntraced(function* (_sql) {
        return yield* Ref.get(store)
      }),
      insert: Effect.fnUntraced(function* (row) {
        yield* Ref.update(store, (rows) => [...rows, row])
      }),
    })
  }),
)
```

## Test Ref service — expose internal state to tests

```typescript
export class TodoRepoTestRef extends Context.Service<
  TodoRepoTestRef,
  Ref.Ref<Array<Todo>>
>()(
  "app/TodoRepoTestRef",
) {
  static readonly layer = Layer.effect(TodoRepoTestRef, Ref.make([]))
}

// layerTest: expose TestRef via provideMerge so tests can inspect
class TodoRepo extends Context.Service<TodoRepo, {
  create(title: string): Effect.Effect<Todo>
  readonly list: Effect.Effect<ReadonlyArray<Todo>>
}>()(
  "app/TodoRepo",
) {
  static readonly layerTest = Layer.effect(
    TodoRepo,
    Effect.gen(function* () {
      const store = yield* TodoRepoTestRef
      return TodoRepo.of({
        create: Effect.fnUntraced(function* (title: string) {
          const todos = yield* Ref.get(store)
          const todo = { id: todos.length + 1, title }
          yield* Ref.set(store, [...todos, todo])
          return todo
        }),
        list: Ref.get(store),
      })
    }),
  ).pipe(Layer.provideMerge(TodoRepoTestRef.layer))
}

// In test: access raw store
const todos = yield* Ref.get(yield* TodoRepoTestRef)
```

## Mocking LanguageModel (AI SDK)

The AI SDK uses `Context.Service` exactly like any other service:

```typescript
import { LanguageModel } from "effect/unstable/ai"

const mockLmLayer = (responses: ReadonlyArray<string>) =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const idx = yield* Ref.make(0)
      return {
        generateText: Effect.fnUntraced(function* (_options) {
          const i = yield* Ref.getAndUpdate(idx, (n) => n + 1)
          return {
            text: responses[Math.min(i, responses.length - 1)] ?? "",
            usage: { inputTokens: 0, outputTokens: 0 },
            toolCalls: [],
            finishReason: "stop" as const,
          }
        }),
        generateObject: () => Effect.die(new Error("not mocked")),
        streamText: () => Effect.die(new Error("not mocked")),
      } as unknown as LanguageModel.Service
    }),
  )
```

## Per-test provide — isolated

```typescript
test("processes item", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* MyService
      const result = yield* svc.doThing("input")
      expect(result).toBe("expected")
    }).pipe(Effect.provide(MyService.layerTest)),
  )
})
```

## Shared layer across describe block — use `layer()` from @effect/vitest

```typescript
import { layer } from "@effect/vitest"

layer(TodoRepo.layerTest)("TodoRepo tests", (it) => {
  it.effect("creates a todo", () =>
    Effect.gen(function* () {
      const repo = yield* TodoRepo
      yield* repo.create("Write tests")
      const all = yield* repo.list
      expect(all.length).toBeGreaterThanOrEqual(1)
    }),
  )
})
```

## Counting calls with Ref

```typescript
test("calls LLM twice for maxDepth=0", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const callCount = yield* Ref.make(0)
      const layer = mockLmLayerCounting(callCount)
      yield* myEffect.pipe(Effect.provide(layer))
      const total = yield* Ref.get(callCount)
      expect(total).toBeGreaterThanOrEqual(2)
    }),
  )
})
```
