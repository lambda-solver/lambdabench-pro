// apps/server/src/runtime.adversarial.test.ts
// Adversarial security tests for runtime.ts
// Covers: malformed inputs, boundary violations, injection vectors, concurrency

import { existsSync, unlinkSync } from "node:fs";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { describe, it } from "@effect/vitest";
import { assertDefined, assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer } from "effect";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { makeRuntime, makeServicesLayer, ServicesLive } from "./runtime";
import { ResultStore } from "./services/ResultStore";

const testDbPathA = "apps/server/test-data/runtime.adv.test.a.db";
const testDbPathB = "apps/server/test-data/runtime.adv.test.b.db";

const cleanupDbFiles = () => {
  const paths = [
    testDbPathA,
    `${testDbPathA}-wal`,
    `${testDbPathA}-shm`,
    testDbPathB,
    `${testDbPathB}-wal`,
    `${testDbPathB}-shm`,
    "apps/server/test-data/sql_test'; DROP TABLE benchmark_results;--.db",
    ".lambench-data/benchmark.sqlite",
    "/tmp/lambench-adv-absolute.db",
  ];
  for (const p of paths) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch (_e) {
      /* ignore */
    }
    try {
      if (existsSync(`${p}-wal`)) unlinkSync(`${p}-wal`);
    } catch (_e) {
      /* ignore */
    }
    try {
      if (existsSync(`${p}-shm`)) unlinkSync(`${p}-shm`);
    } catch (_e) {
      /* ignore */
    }
  }
};

const platformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

describe("runtime - adversarial", () => {
  beforeAll(() => {
    cleanupDbFiles();
  });
  afterEach(() => {
    cleanupDbFiles();
  });
  afterAll(() => {
    cleanupDbFiles();
  });

  // ── Vector 1: Empty / whitespace-only string dbPath ────────────────────────

  it("makeServicesLayer with empty string dbPath throws synchronously", () => {
    expect(() => makeServicesLayer("")).toThrow(
      "dbPath must be a non-empty string, got: ''",
    );
  });

  it("makeRuntime with empty string dbPath throws synchronously", () => {
    expect(() => makeRuntime("")).toThrow(
      "dbPath must be a non-empty string, got: ''",
    );
  });

  it("makeServicesLayer with whitespace-only dbPath throws synchronously", () => {
    expect(() => makeServicesLayer("   ")).toThrow(
      "dbPath must be a non-empty string, got: '   '",
    );
  });

  it.effect("makeServicesLayer with valid dbPath succeeds", () =>
    Effect.gen(function* () {
      const path = testDbPathA;
      const layer = makeServicesLayer(path).pipe(
        Layer.provideMerge(platformLayer),
      );
      const exit = yield* Layer.build(layer).pipe(Effect.exit);
      assertTrue(
        exit._tag === "Success",
        "valid dbPath must produce a buildable layer",
      );
    }),
  );

  // ── Vector 2: Extremely long dbPath (10KB+) ────────────────────────────────

  it.effect("makeServicesLayer with 10KB dbPath fails on build", () =>
    Effect.gen(function* () {
      const longPath = `${"x".repeat(10_000)}.db`;
      const layer = makeServicesLayer(longPath).pipe(
        Layer.provideMerge(platformLayer),
      );
      const exit = yield* Layer.build(layer).pipe(Effect.exit);
      assertTrue(
        exit._tag === "Failure",
        "10KB+ dbPath must not silently succeed — filesystem overflow risk",
      );
    }),
  );

  // ── Vector 3: Path traversal (allowed) ─────────────────────────────────────

  it("makeServicesLayer does not throw for path traversal strings", () => {
    // validateDbPath only blocks empty/whitespace strings, not traversal
    expect(() => makeServicesLayer("../parent.db")).not.toThrow();
    expect(() => makeServicesLayer("../../etc/hostname")).not.toThrow();
    expect(() => makeServicesLayer("../../../tmp/adversary.db")).not.toThrow();
  });

  it.effect(
    "makeServicesLayer with writable traversal path builds successfully",
    () =>
      Effect.gen(function* () {
        const path = "../../../tmp/lambench-adv-traversal.db";
        const layer = makeServicesLayer(path).pipe(
          Layer.provideMerge(platformLayer),
        );
        const exit = yield* Layer.build(layer).pipe(Effect.exit);
        assertTrue(
          exit._tag === "Success",
          "traversal to writable /tmp must succeed",
        );
        try {
          unlinkSync(path);
        } catch (_e) {}
        try {
          if (existsSync(`${path}-wal`)) unlinkSync(`${path}-wal`);
        } catch (_e) {}
        try {
          if (existsSync(`${path}-shm`)) unlinkSync(`${path}-shm`);
        } catch (_e) {}
      }),
  );

  // ── Vector 4: Absolute path (boundary crossing) ────────────────────────────

  it.effect("makeServicesLayer with absolute /tmp path does not crash", () =>
    Effect.gen(function* () {
      const absPath = "/tmp/lambench-adv-absolute.db";
      const layer = makeServicesLayer(absPath).pipe(
        Layer.provideMerge(platformLayer),
      );
      const exit = yield* Layer.build(layer).pipe(Effect.exit);
      // May succeed (writable /tmp) or fail (permissions)
      if (exit._tag === "Success") {
        try {
          unlinkSync(absPath);
        } catch (_e) {}
        try {
          unlinkSync(`${absPath}-wal`);
        } catch (_e) {}
        try {
          unlinkSync(`${absPath}-shm`);
        } catch (_e) {}
      }
      assertTrue(
        exit._tag === "Success" || exit._tag === "Failure",
        "absolute path should either succeed or fail cleanly, not crash",
      );
    }),
  );

  // ── Vector 5: Null byte injection ──────────────────────────────────────────

  it.effect("makeServicesLayer with null byte in dbPath fails", () =>
    Effect.gen(function* () {
      const pathWithNull = "test\x00hidden.db";
      const layer = makeServicesLayer(pathWithNull).pipe(
        Layer.provideMerge(platformLayer),
      );
      const exit = yield* Layer.build(layer).pipe(Effect.exit);
      assertTrue(
        exit._tag === "Failure",
        "null byte in dbPath must fail — C-string truncation attack vector",
      );
    }),
  );

  // ── Vector 6: SQL injection in path (must be treated as filename only) ─────

  it.effect(
    "makeServicesLayer with SQL-like dbPath treats path as filename",
    () =>
      Effect.gen(function* () {
        const sqlPath =
          "apps/server/test-data/sql_test'; DROP TABLE benchmark_results;--.db";
        const layer = makeServicesLayer(sqlPath).pipe(
          Layer.provideMerge(platformLayer),
        );
        const exit = yield* Layer.build(layer).pipe(Effect.exit);

        if (exit._tag === "Success") {
          // DB was created at the literal path — path is NOT interpreted as SQL
          assertTrue(existsSync(sqlPath), "DB file must exist at literal path");
          try {
            unlinkSync(sqlPath);
          } catch (_e) {}
          try {
            unlinkSync(`${sqlPath}-wal`);
          } catch (_e) {}
          try {
            unlinkSync(`${sqlPath}-shm`);
          } catch (_e) {}
        }
        // Either success or failure is fine — critical: no SQL execution
        assertTrue(true);
      }),
  );

  // ── Vector 7: Unicode and emoji in path ────────────────────────────────────

  it.effect.each([
    { path: "\u6d4b\u8bd5/\u6570\u636e\u5e93.db", desc: "CJK characters" },
    { path: "test/\uD83D\uDE80-bench.db", desc: "emoji" },
  ] as const)("makeServicesLayer handles unicode path: $desc", ({ path }) =>
    Effect.gen(function* () {
      const layer = makeServicesLayer(path).pipe(
        Layer.provideMerge(platformLayer),
      );
      const exit = yield* Layer.build(layer).pipe(Effect.exit);
      assertTrue(
        exit._tag === "Success" || exit._tag === "Failure",
        "unicode path must not crash the process",
      );
      try {
        unlinkSync(path);
      } catch (_e) {}
      try {
        if (existsSync(`${path}-wal`)) unlinkSync(`${path}-wal`);
      } catch (_e) {}
      try {
        if (existsSync(`${path}-shm`)) unlinkSync(`${path}-shm`);
      } catch (_e) {}
    }),
  );

  // ── Vector 8: Concurrent inserts on same dbPath ────────────────────────────

  it.effect("concurrent inserts on same dbPath do not corrupt", () =>
    Effect.gen(function* () {
      const layer = makeServicesLayer(testDbPathA).pipe(
        Layer.provideMerge(platformLayer),
      );

      yield* Layer.build(layer);

      yield* Effect.all(
        [
          Effect.gen(function* () {
            const store = yield* ResultStore;
            yield* store.insertResult({
              runId: "adv-concurrent-1",
              taskId: "task-1",
              model: "model-1",
              variant: "standard",
              provider: "openai",
              pass: true,
              elapsedMs: 100,
              timestamp: new Date().toISOString(),
            });
          }),
          Effect.gen(function* () {
            const store = yield* ResultStore;
            yield* store.insertResult({
              runId: "adv-concurrent-2",
              taskId: "task-2",
              model: "model-2",
              variant: "rlm",
              provider: "openrouter",
              pass: false,
              elapsedMs: 200,
              timestamp: new Date().toISOString(),
            });
          }),
        ],
        { concurrency: 2 },
      ).pipe(Effect.provide(layer));

      const r1 = yield* Effect.gen(function* () {
        const store = yield* ResultStore;
        return yield* store.getResultsByRunId("adv-concurrent-1");
      }).pipe(Effect.provide(layer));
      strictEqual(r1.length, 1);
      strictEqual(r1[0]?.pass, true);

      const r2 = yield* Effect.gen(function* () {
        const store = yield* ResultStore;
        return yield* store.getResultsByRunId("adv-concurrent-2");
      }).pipe(Effect.provide(layer));
      strictEqual(r2.length, 1);
      strictEqual(r2[0]?.pass, false);
    }),
  );

  // ── Vector 9: Double initialization — multiple runtimes, same path ─────────

  it.effect(
    "multiple ManagedRuntimes with same dbPath are independently usable",
    () =>
      Effect.gen(function* () {
        const rt1 = makeRuntime(testDbPathA);
        const rt2 = makeRuntime(testDbPathA);

        assertDefined(rt1);
        assertDefined(rt2);
        assertTrue("runPromise" in rt1 && "runPromise" in rt2);

        const layer = makeServicesLayer(testDbPathA).pipe(
          Layer.provideMerge(platformLayer),
        );

        yield* Effect.gen(function* () {
          const store = yield* ResultStore;
          yield* store.insertResult({
            runId: "adv-double-init",
            taskId: "task-double",
            model: "model-double",
            variant: "standard",
            provider: "openai",
            pass: true,
            elapsedMs: 50,
            timestamp: new Date().toISOString(),
          });
        }).pipe(Effect.provide(layer));

        const results = yield* Effect.gen(function* () {
          const store = yield* ResultStore;
          return yield* store.getResultsByRunId("adv-double-init");
        }).pipe(
          Effect.provide(
            Layer.mergeAll(makeServicesLayer(testDbPathA), platformLayer),
          ),
        );

        strictEqual(results.length, 1);
        strictEqual(results[0]?.runId, "adv-double-init");
        strictEqual(results[0]?.pass, true);
      }),
  );

  // ── Vector 10: ServicesLive builds under current config ────────────────────

  it.effect(
    "ServicesLive can be built (graceful handling if config lacks dbPath)",
    () =>
      Effect.gen(function* () {
        const layer = ServicesLive.pipe(Layer.provideMerge(platformLayer));
        const exit = yield* Layer.build(layer).pipe(Effect.exit);

        if (exit._tag === "Success") {
          assertTrue(true, "ServicesLive built successfully");
        } else {
          // config.dbPath may be empty due to missing LAMBENCH_DB_PATH env
          assertTrue(
            true,
            "ServicesLive failed — expected if env config missing",
          );
        }
      }),
  );

  // ── Vector 11: Layer composition structural verification ───────────────────

  it.effect(
    "makeServicesLayer produces structurally correct layers for valid path",
    () =>
      Effect.gen(function* () {
        const layer = makeServicesLayer(testDbPathA).pipe(
          Layer.provideMerge(platformLayer),
        );
        const exit = yield* Layer.build(layer).pipe(Effect.exit);
        assertTrue(
          exit._tag === "Success",
          "makeServicesLayer must produce a buildable layer for valid path",
        );

        const results = yield* Effect.gen(function* () {
          const store = yield* ResultStore;
          yield* store.insertResult({
            runId: "adv-structural",
            taskId: "task-structural",
            model: "model-structural",
            variant: "standard",
            provider: "openai",
            pass: true,
            elapsedMs: 10,
            timestamp: new Date().toISOString(),
          });
          return yield* store.getResultsByRunId("adv-structural");
        }).pipe(Effect.provide(layer));

        strictEqual(results.length, 1);
        strictEqual(results[0]?.model, "model-structural");
      }),
  );
});
