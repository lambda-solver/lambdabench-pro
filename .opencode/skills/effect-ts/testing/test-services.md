# Testing Services with Layers

## Test layer pattern (layerTest + layerNoDeps)

Each service exposes `layerNoDeps` (needs deps from outside) and `layerTest` (self-contained with test doubles):

```typescript
class TodoRepo extends ServiceMap.Service<TodoRepo, {
  create(title: string): Effect.Effect<Todo>
  readonly list: Effect.Effect<ReadonlyArray<Todo>>
}>()("app/TodoRepo") {
  static readonly layerTest = Layer.effect(
    TodoRepo,
    Effect.gen(function* () {
      const store = yield* TodoRepoTestRef  // in-memory store

      const create = Effect.fn("TodoRepo.create")(function* (title: string) {
        const todos = yield* Ref.get(store)
        const todo = { id: todos.length + 1, title }
        yield* Ref.set(store, [...todos, todo])
        return todo
      })

      return TodoRepo.of({ create, list: Ref.get(store) })
    })
  ).pipe(
    // provideMerge so tests can access TestRef directly
    Layer.provideMerge(TodoRepoTestRef.layer)
  )
}
```

## Test Ref service for inspection

```typescript
export class TodoRepoTestRef
  extends ServiceMap.Service<TodoRepoTestRef, Ref.Ref<Array<Todo>>>()("app/TodoRepoTestRef")
{
  static readonly layer = Layer.effect(TodoRepoTestRef, Ref.make([]))
}

// In test: inspect raw state
const todos = yield* Ref.get(yield* TodoRepoTestRef)
assert.strictEqual(todos.length, 1)
```

## Higher-level service tests

```typescript
it.effect("addAndCount adds and returns length", () =>
  Effect.gen(function* () {
    const svc = yield* TodoService
    const count = yield* svc.addAndCount("New task")
    assert.isTrue(count >= 1)
  }).pipe(Effect.provide(TodoService.layerTest))  // self-contained
)
```

## Layer isolation: provideMerge exposes internals

```typescript
// layerTest exposes TodoRepo AND TodoRepoTestRef (via provideMerge chain)
// Tests can yield* TodoRepoTestRef to read the raw store
static readonly layerTest = this.layerNoDeps.pipe(
  Layer.provideMerge(TodoRepo.layerTest)   // exposes TodoRepo + TestRef
)
```

## React hook testing (lambench-pro vitest-browser pattern)

```typescript
import { render } from "vitest-browser-react"
import { RegistryProvider } from "@effect/atom-react"

// Wrap with RegistryProvider for Atom hooks
function wrapper({ children }: { children: React.ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>
}

test("renders leaderboard", async () => {
  const screen = render(<App />, { wrapper })
  await expect.element(screen.getByText(":intelligence")).toBeInTheDocument()
})
```
