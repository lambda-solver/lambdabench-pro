# Concurrency

## Effect.all — run multiple effects

```typescript
import { Effect } from "effect"

// Sequential (default)
const [a, b] = yield* Effect.all([effectA, effectB])

// Concurrent
const [a, b] = yield* Effect.all([effectA, effectB], { concurrency: 2 })

// All concurrent, unbounded
const results = yield* Effect.all(effects, { concurrency: "unbounded" })
```

## Forking fibers

```typescript
// Fork and forget (fire-and-forget)
yield* Effect.fork(backgroundTask)

// Fork and join later
const fiber = yield* Effect.fork(longTask)
const result = yield* Fiber.join(fiber)

// Fork scoped (fiber interrupted when scope closes)
yield* Effect.forkScoped(Effect.gen(function* () {
  while (true) {
    yield* Effect.sleep("5 seconds")
    yield* Effect.log("tick")
  }
}))
```

## Streaming with concurrency

```typescript
import { Stream } from "effect"

// mapEffect with concurrency
stream.pipe(
  Stream.mapEffect(enrichItem, { concurrency: 4 })
)

// flatMap with concurrency
Stream.make("US", "CA").pipe(
  Stream.flatMap(fetchByCountry, { concurrency: 2 })
)
```

## PubSub for event broadcasting

```typescript
import { PubSub, Stream } from "effect"

const pubsub = yield* PubSub.bounded<Event>({
  capacity: 256,
  replay: 50,   // late subscribers get last 50 events
})
yield* Effect.addFinalizer(() => PubSub.shutdown(pubsub))

// Publish
yield* PubSub.publish(pubsub, event)
yield* PubSub.publishAll(pubsub, events)

// Subscribe as stream
const stream = Stream.fromPubSub(pubsub)
```

## Scheduling / polling

```typescript
import { Schedule, Stream } from "effect"

// Retry with exponential backoff
program.pipe(
  Effect.retry(Schedule.exponential(100).pipe(Schedule.upTo(3)))
)

// Poll on a schedule
const samples = Stream.fromEffectSchedule(
  Effect.succeed(Date.now()),
  Schedule.spaced("30 seconds")
)
```
