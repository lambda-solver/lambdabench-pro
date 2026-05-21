// apps/server/src/runtime.test.ts

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";

import { Effect, Layer } from "effect";

import { ServicesLive, makeRuntime, makeServicesLayer, serverRuntime } from "./runtime";

import { afterAll, afterEach, beforeAll } from "vitest";
import { assertDefined, assertTrue, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";
import { existsSync, unlinkSync } from "node:fs";

import { ResultStore } from "./services/ResultStore";

const testDbPathA = "apps/server/test-data/runtime.test.a.db";
const testDbPathB = "apps/server/test-data/runtime.test.b.db";

const cleanupDbFiles = () => {
  const paths = [
    testDbPathA,
    `${testDbPathA}-wal`,
    `${testDbPathA}-shm`,
    testDbPathB,
    `${testDbPathB}-wal`,
    `${testDbPathB}-shm`,
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

const platformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

describe("runtime", () => {
  beforeAll(() => {
    cleanupDbFiles();
  });

  afterEach(() => {
    cleanupDbFiles();
  });

  afterAll(() => {
    cleanupDbFiles();
  });

  // ─── Existence & shape ──────────────────────────────────────────────────────

  it.effect("serverRuntime is a ManagedRuntime", () =>
    Effect.sync(() => {
      assertDefined(serverRuntime);
      assertTrue(serverRuntime !== null && typeof serverRuntime === "object");
      // ManagedRuntime has runPromise / runSync methods
      assertTrue("runPromise" in serverRuntime);
      assertTrue("runSync" in serverRuntime);
    }),
  );

  it.effect("ServicesLive is a Layer", () =>
    Effect.sync(() => {
      assertDefined(ServicesLive);
      assertTrue(ServicesLive !== null && typeof ServicesLive === "object");
      // Layer has pipe method
      assertTrue("pipe" in ServicesLive);
    }),
  );

  // ─── makeServicesLayer ──────────────────────────────────────────────────────

  it.effect("makeServicesLayer returns a Layer that can be built", () =>
    Effect.gen(function* () {
      const layer = makeServicesLayer(testDbPathA).pipe(Layer.provideMerge(platformLayer));
      yield* Layer.build(layer);

      // Verify DB file was created
      assertTrue(existsSync(testDbPathA));
    }),
  );

  it.effect("makeServicesLayer provides ResultStore that can insert and query", () =>
    Effect.gen(function* () {
      const layer = makeServicesLayer(testDbPathA).pipe(Layer.provideMerge(platformLayer));

      const result = yield* Effect.gen(function* () {
        const store = yield* ResultStore;

        yield* store.insertResult({
          bits: 4,
          elapsedMs: 1234,
          model: "gpt-4",
          pass: true,
          provider: "openai",
          runId: "run-1",
          score: 0.95,
          taskId: "task-1",
          timestamp: "2025-01-01T00:00:00Z",
          variant: "standard",
        });

        const results = yield* store.getResultsByRunId("run-1");
        return results;
      }).pipe(Effect.provide(layer));

      strictEqual(result.length, 1);
      strictEqual(result[0]?.runId, "run-1");
      strictEqual(result[0]?.taskId, "task-1");
      strictEqual(result[0]?.model, "gpt-4");
      strictEqual(result[0]?.pass, true);
    }),
  );

  it.effect("makeServicesLayer with different dbPaths creates independent databases", () =>
    Effect.gen(function* () {
      const layerA = makeServicesLayer(testDbPathA).pipe(Layer.provideMerge(platformLayer));
      const layerB = makeServicesLayer(testDbPathB).pipe(Layer.provideMerge(platformLayer));

      // Insert into A
      yield* Effect.gen(function* () {
        const store = yield* ResultStore;
        yield* store.insertResult({
          elapsedMs: 100,
          model: "model-a",
          pass: true,
          provider: "openai",
          runId: "run-a",
          taskId: "task-a",
          timestamp: "2025-01-01T00:00:00Z",
          variant: "standard",
        });
      }).pipe(Effect.provide(layerA));

      // Query from B — should be empty
      const resultsB = yield* Effect.gen(function* () {
        const store = yield* ResultStore;
        return yield* store.getResultsByRunId("run-a");
      }).pipe(Effect.provide(layerB));

      strictEqual(resultsB.length, 0);

      // Query from A — should have the result
      const resultsA = yield* Effect.gen(function* () {
        const store = yield* ResultStore;
        return yield* store.getResultsByRunId("run-a");
      }).pipe(Effect.provide(layerA));

      strictEqual(resultsA.length, 1);
      strictEqual(resultsA[0]?.taskId, "task-a");
    }),
  );

  // ─── makeRuntime ────────────────────────────────────────────────────────────

  it.effect("makeRuntime returns a ManagedRuntime that can run effects", () =>
    Effect.gen(function* () {
      const runtime = makeRuntime(testDbPathA);

      assertDefined(runtime);
      assertTrue("runPromise" in runtime);
      assertTrue("runSync" in runtime);

      const result = yield* Effect.gen(function* () {
        const store = yield* ResultStore;

        yield* store.insertResult({
          elapsedMs: 200,
          model: "model-runtime",
          pass: false,
          provider: "openai",
          runId: "run-runtime",
          taskId: "task-runtime",
          timestamp: "2025-02-01T00:00:00Z",
          variant: "standard",
        });

        return yield* store.getResultsByRunId("run-runtime");
      }).pipe(Effect.provide(Layer.mergeAll(makeServicesLayer(testDbPathA), platformLayer)));

      strictEqual(result.length, 1);
      strictEqual(result[0]?.runId, "run-runtime");
      strictEqual(result[0]?.pass, false);
    }),
  );

  it.effect("makeRuntime with different paths creates independent runtimes", () =>
    Effect.gen(function* () {
      // Use runtimeA to insert
      const effectA = Effect.gen(function* () {
        const store = yield* ResultStore;
        yield* store.insertResult({
          elapsedMs: 300,
          model: "model-isolated",
          pass: true,
          provider: "openrouter",
          runId: "run-isolated",
          taskId: "task-isolated",
          timestamp: "2025-03-01T00:00:00Z",
          variant: "rlm",
        });
        return yield* store.getResultsByRunId("run-isolated");
      }).pipe(Effect.provide(Layer.mergeAll(makeServicesLayer(testDbPathA), platformLayer)));

      const resultA = yield* effectA;
      strictEqual(resultA.length, 1);

      // Runtime B should not see the data
      const effectB = Effect.gen(function* () {
        const store = yield* ResultStore;
        return yield* store.getResultsByRunId("run-isolated");
      }).pipe(Effect.provide(Layer.mergeAll(makeServicesLayer(testDbPathB), platformLayer)));

      const resultB = yield* effectB;
      strictEqual(resultB.length, 0);
    }),
  );
});
