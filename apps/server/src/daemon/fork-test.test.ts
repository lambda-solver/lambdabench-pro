import { Context, Effect, Layer, Ref, Schedule } from "effect";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";

// ─── Test Service ────────────────────────────────────────────────────────────

class TestSvc extends Context.Service<
  TestSvc,
  {
    sync: Effect.Effect<number>;
  }
>()("TestSvc") {}

const TestSvcLive = Layer.succeed(TestSvc, {
  sync: Effect.sync(() => 42),
});

// ─── Minimal forkScoped test ─────────────────────────────────────────────────

describe("forkScoped minimal", () => {
  it.effect("forkScoped + Ref.update works", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ref = yield* Ref.make(0);

        // Fork a simple effect that increments ref every 10ms
        yield* Effect.forkScoped(
          Effect.repeat(
            Ref.update(ref, (n) => n + 1),
            Schedule.spaced(10),
          ).pipe(Effect.interruptible),
        );

        yield* Effect.sleep(100);

        const val = yield* Ref.get(ref);
        assertTrue(val >= 1, `expected val >= 1, got ${val}`);
      }),
    ),
  );

  it.effect("forkScoped with Layer + effect function", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const ref = yield* Ref.make(0);

        yield* Effect.forkScoped(
          Effect.gen(function* () {
            const svc = yield* TestSvc;
            const result = yield* svc.sync;
            yield* Ref.update(ref, (n) => n + result);
          }).pipe(Effect.provide(TestSvcLive)),
        );

        yield* Effect.sleep(10);

        const val = yield* Ref.get(ref);
        strictEqual(val, 42);
      }),
    ),
  );
});
