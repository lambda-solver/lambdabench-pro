---
name: 06-streams
description: Effect-TS 4 streams — Stream creation, transformation, chunking, and sink consumption
license: MIT
compatibility: opencode
---

# Streams

## Creating streams

```typescript
import { Effect, Schedule, Stream } from "effect"

Stream.fromIterable([1, 2, 3])

// Polling on a schedule
Stream.fromEffectSchedule(
  Effect.sync(() => Date.now()),
  Schedule.spaced("30 seconds"),
)

// Paginated API
Stream.paginate(0, (page) =>
  fetchPage(page).pipe(
    Effect.map((res) => [res.items, res.hasMore ? Option.some(page + 1) : Option.none()] as const),
  ),
)

// Async iterable
Stream.fromAsyncIterable(asyncIterable(), (e) => new StreamError({ cause: e }))

// Callback / event emitter
Stream.callback<Event>(Effect.fnUntraced(function* (queue) {
  yield* Effect.acquireRelease(
    Effect.sync(() => source.on("data", (e) => Queue.offerUnsafe(queue, e))),
    () => Effect.sync(() => source.removeAllListeners()),
  )
}))
```

## Transforming streams

```typescript
stream.pipe(
  Stream.map((x) => x * 2),
  Stream.filter((x) => x > 0),
  Stream.mapEffect(enrichAsync, { concurrency: 4 }),
  Stream.flatMap((x) => Stream.range(0, x), { concurrency: 2 }),
  Stream.take(10),
  Stream.drop(1),
  Stream.takeWhile((x) => x < 100),
  Stream.tap((x) => Effect.log("item:", x)),
)
```

## Consuming streams

```typescript
yield* Stream.runCollect(stream)                      // → Chunk<A>
yield* Stream.runDrain(stream)                        // → void (side-effects only)
yield* stream.pipe(Stream.runForEach((item) => ...))  // effectful per-item
yield* stream.pipe(Stream.runFold(0, (acc, x) => acc + x))
yield* Stream.runHead(stream)                         // → Option<A>
yield* Stream.runLast(stream)                         // → Option<A>
yield* stream.pipe(Stream.run(Sink.sum))              // with Sink
```

## Chunking

```typescript
stream.pipe(
  Stream.rechunk(64),            // rechunk to size 64
  Stream.chunks,                 // emit raw Chunk<A> elements
  Stream.unchunks,               // flatten chunks back to stream
)
```

## NDJSON / binary encoding

```typescript
import { Ndjson } from "effect/unstable/encoding"

// Decode NDJSON bytes → typed objects
stream.pipe(Stream.pipeThroughChannel(Ndjson.decodeSchema(MySchema)))

// Encode typed objects → NDJSON bytes
stream.pipe(Stream.pipeThroughChannel(Ndjson.encodeSchema(MySchema)))
```

## Error handling in streams

```typescript
stream.pipe(
  // Recover from typed error with a fallback stream
  Stream.catchTag("FetchError", (_e) => Stream.fromIterable(cachedItems)),

  // Retry failed elements
  Stream.mapEffect(
    (item) => processItem(item).pipe(
      Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.upTo(3))),
    ),
    { concurrency: 4 },
  ),
)
```
