import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Fiber, Ref, Schedule } from "effect";

describe("fork-debug", () => {
  // 1. Test basic sleep
  it.effect("sleep works", () =>
    Effect.gen(function*() {
      yield* Effect.sleep(10);
      strictEqual(1, 1);
    }));

  // 2. Test Effect.scoped + sleep
  it.effect("scoped sleep works", () =>
    Effect.scoped(
      Effect.gen(function*() {
        yield* Effect.sleep(10);
        strictEqual(1, 1);
      }),
    ));

  // 3. Test repeat + sleep (no fork)
  it.effect("repeat without fork", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const ref = yield* Ref.make(0);
        yield* Effect.forkScoped(
          Effect.repeat(
            Ref.update(ref, (n) => n + 1),
            Schedule.spaced(10),
          ).pipe(Effect.interruptible),
        );
        yield* Effect.sleep(100);
        const val = yield* Ref.get(ref);
        assertTrue(val >= 1, `val=${val}`);
      }),
    ));

  // 4. Test fork without repeat
  it.effect("fork without repeat", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const ref = yield* Ref.make(0);
        yield* Effect.forkScoped(Ref.update(ref, (n) => n + 42));
        yield* Effect.sleep(10);
        const val = yield* Ref.get(ref);
        strictEqual(val, 42);
      }),
    ));

  // 5. Test fork + repeat but manually
  it.effect("fork scoped manual repeat", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const ref = yield* Ref.make(0);
        const fiber = yield* Effect.forkScoped(
          Effect.forever(
            Ref.update(ref, (n) => n + 1).pipe(Effect.delay("10 millis")),
          ).pipe(Effect.interruptible),
        );
        yield* Effect.sleep(100);
        yield* Fiber.interrupt(fiber);
        const val = yield* Ref.get(ref);
        assertTrue(val >= 1, `val=${val}`);
      }),
    ));
});
