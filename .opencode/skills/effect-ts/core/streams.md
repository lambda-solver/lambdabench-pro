# Streams

## Creating streams

```typescript
import { Stream, Effect, Schedule, Queue } from "effect"

Stream.fromIterable([1, 2, 3])

// Polling (metrics, health checks)
Stream.fromEffectSchedule(Effect.succeed(Date.now()), Schedule.spaced("30 seconds"))

// Paginated APIs
Stream.paginate(0, Effect.fn(function* (page) {
  const results = yield* fetchPage(page)
  const next = results.hasMore ? Option.some(page + 1) : Option.none()
  return [results.items, next] as const
}))

// Async iterables
Stream.fromAsyncIterable(asyncIterable(), (e) => new StreamError({ cause: e }))

// DOM events
Stream.fromEventListener<PointerEvent>(button, "click")

// Callback-based
Stream.callback<Event>(Effect.fn(function* (queue) {
  yield* Effect.acquireRelease(
    Effect.sync(() => source.on("data", e => Queue.offerUnsafe(queue, e))),
    () => Effect.sync(() => source.removeAllListeners())
  )
}))
```

## Transforming streams

```typescript
stream.pipe(
  Stream.map(x => x * 2),
  Stream.filter(x => x > 0),
  Stream.flatMap(x => Stream.range(0, x), { concurrency: 2 }),
  Stream.mapEffect(enrichAsync, { concurrency: 4 }),
  Stream.take(10),
  Stream.drop(1),
  Stream.takeWhile(x => x < 100),
)
```

## Consuming streams

```typescript
Stream.runCollect(stream)                    // → Effect<Chunk<A>>
Stream.runDrain(stream)                      // → Effect<void>, side-effects only
stream.pipe(Stream.runForEach(item => ...))  // effectful consumer per item
stream.pipe(Stream.runFold(() => 0, (acc, x) => acc + x))  // reduce
stream.pipe(Stream.run(Sink.sum))            // with a Sink
Stream.runHead(stream)                       // → Effect<Option<A>>
Stream.runLast(stream)                       // → Effect<Option<A>>
```

## NDJSON / encoding

```typescript
import { Ndjson, Msgpack } from "effect/unstable/encoding"

// Decode NDJSON bytes → typed objects
stream.pipe(
  Stream.pipeThroughChannel(Ndjson.decodeSchema(MySchema))
)

// Encode objects → NDJSON bytes
stream.pipe(
  Stream.pipeThroughChannel(Ndjson.encodeSchema(MySchema))
)
```
