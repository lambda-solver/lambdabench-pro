---
name: 05-concurrency
description: Effect-TS 4 concurrency — Effect.all, Effect.forEach, fibers, Ref, and structured concurrency patterns
license: MIT
compatibility: opencode
---

# Concurrency

## Effect.all — run multiple effects

```typescript
import { Effect } from "effect"

// Sequential (default)
const [a, b] = yield* Effect.all([effectA, effectB])

// Concurrent — bounded
const [a, b] = yield* Effect.all([effectA, effectB], { concurrency: 2 })

// Concurrent — unbounded
const results = yield* Effect.all(effects, { concurrency: "unbounded" })

// Discard results — only side effects matter
yield* Effect.all(effects, { concurrency: 4, discard: true })
```

## Effect.forEach — map an array effectfully

```typescript
// Concurrent processing of a list
const results = yield* Effect.forEach(
  items,
  (item) => processItem(item),
  { concurrency: 8 },
)
```

## Ref — shared mutable state inside Effect

```typescript
import { Effect, Ref } from "effect"

const counter = yield* Ref.make(0)
yield* Ref.update(counter, (n) => n + 1)
const value = yield* Ref.get(counter)
const old = yield* Ref.getAndUpdate(counter, (n) => n + 1)
```

## Fibers — structured fork/join

```typescript
// Fork and forget
yield* Effect.fork(backgroundTask)

// Fork and join later
const fiber = yield* Effect.fork(longTask)
const result = yield* Fiber.join(fiber)

// Fork scoped — interrupted when scope closes
yield* Effect.forkScoped(
  Effect.gen(function* () {
    while (true) {
      yield* Effect.sleep("5 seconds")
      yield* Effect.log("tick")
    }
  }),
)
```

## Effect.race — first one wins

```typescript
// Returns whichever Effect finishes first; interrupts the other
const result = yield* Effect.race(fastPath, slowPath)

// With timeout
const result = yield* Effect.timeout(program, "30 seconds")
```

## Semaphore — bounded concurrency gate

```typescript
import { Effect } from "effect"

const sem = yield* Effect.makeSemaphore(3)   // max 3 concurrent
yield* sem.withPermits(1)(expensiveTask)
```

## PubSub — broadcast events

```typescript
import { PubSub, Stream } from "effect"

const pubsub = yield* PubSub.bounded<Event>({ capacity: 256 })
yield* Effect.addFinalizer(() => PubSub.shutdown(pubsub))

yield* PubSub.publish(pubsub, event)
const stream = Stream.fromPubSub(pubsub)
```

## Scheduling — retry and polling

```typescript
import { Schedule } from "effect"

// Retry with exponential backoff, max 3 times
program.pipe(
  Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.upTo(3))),
)

// Repeat on a fixed interval
program.pipe(
  Effect.repeat(Schedule.spaced("30 seconds")),
)
```

## Tail recursion — use Effect.suspend

`Effect.iterate` does NOT exist in Effect 4. Use `Effect.suspend` for
recursive effectful loops to avoid stack overflow.

```typescript
const loop = (n: number): Effect.Effect<number> =>
  n <= 0
    ? Effect.succeed(0)
    : Effect.suspend(() => loop(n - 1).pipe(Effect.map((x) => x + 1)))
```
