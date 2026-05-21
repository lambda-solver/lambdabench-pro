// apps/server/src/daemon/health.test.ts

import { Effect, Layer, Ref } from "effect";
import { HealthChecker, RegistryOps, checkHealth, createHealthPoller, restartProcess } from "./health";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";

import type { HealthCheckConfig } from "./health";

// ─── Test config ───────────────────────────────────────────────────────────────

const defaultConfig: HealthCheckConfig = {
  intervalMs: 10,
  maxRestarts: 3,
  pid: 42,
  port: 9999,
};

// ─── checkHealth ────────────────────────────────────────────────────────────────

describe.skipIf(typeof Bun === "undefined")("checkHealth", () => {
  it.effect("returns true for healthy port", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const server = yield* Effect.acquireRelease(
          Effect.sync(() =>
            Bun.serve({
              fetch() {
                return new Response("ok");
              },
              port: 0,
            }),
          ),
          (s) => Effect.tryPromise(() => s.stop()),
        );

        const result = yield* checkHealth(server.port as number);
        strictEqual(result, true);
      }),
    ),
  );

  it.effect("returns false for closed port", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const server = yield* Effect.acquireRelease(
          Effect.sync(() =>
            Bun.serve({
              fetch() {
                return new Response("ok");
              },
              port: 0,
            }),
          ),
          (s) => Effect.tryPromise(() => s.stop()),
        );
        const port = server.port as number;

        // Stop the server so the port is free
        yield* Effect.tryPromise(() => server.stop());

        const result = yield* checkHealth(port);
        strictEqual(result, false);
      }),
    ),
  );

  it.effect("never fails — always returns boolean", () =>
    Effect.gen(function* () {
      // A port that is very unlikely to be in use → connection refused (fast)
      const result = yield* checkHealth(65_530);
      strictEqual(typeof result, "boolean");
    }),
  );
});

// ─── restartProcess ─────────────────────────────────────────────────────────────

describe("restartProcess", () => {
  it.effect("is a no-op stub that succeeds", () =>
    Effect.gen(function* () {
      yield* restartProcess(42);
    }),
  );
});

// ─── createHealthPoller ─────────────────────────────────────────────────────────

describe.skipIf(typeof Bun === "undefined")("createHealthPoller", () => {
  it.effect("updates registry after health check", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const updateCalls = yield* Ref.make<Array<{ pid: number; healthy: boolean }>>([]);

        const mockHealthChecker = Layer.succeed(
          HealthChecker,
          HealthChecker.of({
            check: () => Effect.succeed(true),
            restart: () => Effect.void,
          }),
        );

        const mockRegistryOps = Layer.succeed(
          RegistryOps,
          RegistryOps.of({
            getProcess: () => Effect.succeed(null),
            updateHealth: (pid, healthy) => Ref.update(updateCalls, (calls) => [...calls, { healthy, pid }]),
          }),
        );

        yield* Effect.forkScoped(
          createHealthPoller(defaultConfig).pipe(Effect.provide(Layer.mergeAll(mockHealthChecker, mockRegistryOps))),
        );

        yield* Effect.sleep(100);

        const calls = yield* Ref.get(updateCalls);
        assertTrue(calls.length >= 1);
        strictEqual((calls[0] as (typeof calls)[number]).pid, 42);
        strictEqual((calls[0] as (typeof calls)[number]).healthy, true);
      }),
    ),
  );

  it.effect("tracks consecutive failures and resets on health", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const checkResults: Array<boolean> = [false, false, true, false];
        let callIndex = 0;
        const updateCalls = yield* Ref.make<Array<{ pid: number; healthy: boolean }>>([]);

        const mockHealthChecker = Layer.succeed(
          HealthChecker,
          HealthChecker.of({
            check: () =>
              Effect.sync(() => {
                const result = checkResults[callIndex] ?? true;
                callIndex++;
                return result;
              }),
            restart: () => Effect.void,
          }),
        );

        const mockRegistryOps = Layer.succeed(
          RegistryOps,
          RegistryOps.of({
            getProcess: () => Effect.succeed(null),
            updateHealth: (pid, healthy) => Ref.update(updateCalls, (calls) => [...calls, { healthy, pid }]),
          }),
        );

        yield* Effect.forkScoped(
          createHealthPoller(defaultConfig).pipe(Effect.provide(Layer.mergeAll(mockHealthChecker, mockRegistryOps))),
        );

        yield* Effect.sleep(200);

        const calls = yield* Ref.get(updateCalls);

        // First 2 calls are unhealthy (false)
        strictEqual((calls[0] as (typeof calls)[number]).healthy, false);
        strictEqual((calls[1] as (typeof calls)[number]).healthy, false);

        // 3rd call is healthy (true) — resets the failure counter
        const healthyCall = calls.find((c) => c.healthy === true);
        assertTrue(healthyCall !== undefined);
      }),
    ),
  );

  it.effect("triggers restart after 3 consecutive failures", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const checkCount = yield* Ref.make(0);
        const restartCalled = yield* Ref.make(false);

        const mockHealthChecker = Layer.succeed(
          HealthChecker,
          HealthChecker.of({
            check: () =>
              Effect.gen(function* () {
                const count = yield* Ref.getAndUpdate(checkCount, (n) => n + 1);
                // First 3 calls return false; subsequent calls return true
                return count >= 3;
              }),
            restart: () => Ref.set(restartCalled, true),
          }),
        );

        const mockRegistryOps = Layer.succeed(
          RegistryOps,
          RegistryOps.of({
            getProcess: () => Effect.succeed(null),
            updateHealth: () => Effect.void,
          }),
        );

        yield* Effect.forkScoped(
          createHealthPoller(defaultConfig).pipe(Effect.provide(Layer.mergeAll(mockHealthChecker, mockRegistryOps))),
        );

        // Wait for enough ticks: 3 failing checks + passing checks
        yield* Effect.sleep(200);

        const restarted = yield* Ref.get(restartCalled);
        assertTrue(restarted, "restart should have been called after 3 consecutive failures");
      }),
    ),
  );

  it.effect("stops after max restarts exhausted", () =>
    Effect.gen(function* () {
      const restartCalls = yield* Ref.make(0);

      const mockHealthChecker = Layer.succeed(
        HealthChecker,
        HealthChecker.of({
          check: () => Effect.succeed(false),
          restart: () => Ref.update(restartCalls, (n) => n + 1),
        }),
      );

      const mockRegistryOps = Layer.succeed(
        RegistryOps,
        RegistryOps.of({
          getProcess: () => Effect.succeed(null),
          updateHealth: () => Effect.void,
        }),
      );

      const poller = createHealthPoller({
        intervalMs: 10,
        maxRestarts: 1,
        pid: 1,
        port: 9999,
      }).pipe(Effect.provide(Layer.mergeAll(mockHealthChecker, mockRegistryOps)));

      // Race: "stopped" if poller stops on its own, "timeout" if it hangs
      const result = yield* Effect.race(
        poller.pipe(Effect.map(() => "stopped" as const)),
        Effect.sleep("5 seconds").pipe(Effect.map(() => "timeout" as const)),
      );

      strictEqual(result, "stopped", "poller should stop when maxRestarts exhausted");

      const calls = yield* Ref.get(restartCalls);
      strictEqual(calls, 1, "restart should be called exactly once");
    }),
  );

  it.effect("respects config values (interval, maxRestarts)", () =>
    Effect.gen(function* () {
      const restartCalls = yield* Ref.make(0);

      const mockHealthChecker = Layer.succeed(
        HealthChecker,
        HealthChecker.of({
          check: () => Effect.succeed(false),
          restart: () => Ref.update(restartCalls, (n) => n + 1),
        }),
      );

      const mockRegistryOps = Layer.succeed(
        RegistryOps,
        RegistryOps.of({
          getProcess: () => Effect.succeed(null),
          updateHealth: () => Effect.void,
        }),
      );

      const config: HealthCheckConfig = {
        intervalMs: 5,
        maxRestarts: 2,
        pid: 7,
        port: 3000,
      };

      const poller = createHealthPoller(config).pipe(
        Effect.provide(Layer.mergeAll(mockHealthChecker, mockRegistryOps)),
      );

      const result = yield* Effect.race(
        poller.pipe(Effect.map(() => "stopped" as const)),
        Effect.sleep("5 seconds").pipe(Effect.map(() => "timeout" as const)),
      );

      strictEqual(result, "stopped", "poller should stop after maxRestarts=2");

      const calls = yield* Ref.get(restartCalls);
      strictEqual(calls, 2, "restart should be called twice");
    }),
  );
});
