// apps/server/src/services/TaskService.test.ts

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { describe, it } from "@effect/vitest";
import { assertDefined, assertInclude, assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer } from "effect";
import { existsSync, unlinkSync } from "node:fs";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ResultStoreLive } from "./ResultStore.js";
import { TaskService, TaskServiceLive } from "./TaskService";

const testDbPath = "apps/server/test-data/TaskService.test.db";

const cleanupDbFiles = () => {
  const paths = [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`];
  for (const p of paths) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

const platformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

const makeTestLayer = (dbPath: string) =>
  TaskServiceLive.pipe(
    Layer.provide(ResultStoreLive(dbPath)),
    Layer.provide(platformLayer),
  );

const runWithTestLayer = (dbPath: string) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(makeTestLayer(dbPath)),
    Effect.provide(platformLayer),
  );

describe("TaskService", () => {
  beforeAll(() => {
    cleanupDbFiles();
  });

  afterEach(() => {
    cleanupDbFiles();
  });

  afterAll(() => {
    cleanupDbFiles();
  });

  // ─── loadAndCacheTasks ──────────────────────────────────────────────────────

  it.effect(
    "loadAndCacheTasks loads all 120 .tsk files into SQLite",
    () =>
      Effect.gen(function*() {
        const svc = yield* TaskService;
        yield* svc.loadAndCacheTasks();

        const all = yield* svc.getAllTasks();
        strictEqual(all.length, 120);
      }).pipe(runWithTestLayer(testDbPath)),
    15_000,
  );

  // ─── getTask ────────────────────────────────────────────────────────────────

  it.effect("getTask retrieves a cached task by ID", () =>
    Effect.gen(function*() {
      const svc = yield* TaskService;
      yield* svc.loadAndCacheTasks();

      const task = yield* svc.getTask("snat_add");
      assertDefined(task);
      strictEqual(task.id, "snat_add");
      strictEqual(task.category, "snat");
      strictEqual(task.categoryName, "Scott Naturals");
      assertInclude(task.description, "Add two Scott nats. Return A + B.");
      assertTrue(task.testCount > 0);
      strictEqual(task.tests.length, task.testCount);
    }).pipe(runWithTestLayer(testDbPath)));

  it.effect("getTask returns undefined for unknown task ID", () =>
    Effect.gen(function*() {
      const svc = yield* TaskService;
      yield* svc.loadAndCacheTasks();

      const task = yield* svc.getTask("nonexistent_task");
      strictEqual(task, undefined);
    }).pipe(runWithTestLayer(testDbPath)));

  // ─── getAllTasks ────────────────────────────────────────────────────────────

  it.effect("getAllTasks returns all cached tasks with correct shape", () =>
    Effect.gen(function*() {
      const svc = yield* TaskService;
      yield* svc.loadAndCacheTasks();

      const all = yield* svc.getAllTasks();
      strictEqual(all.length, 120);

      const ids = all.map((t) => t.id).toSorted();
      assertTrue(ids.includes("snat_add"));
      assertTrue(ids.includes("algo_maz"));
      assertTrue(ids.includes("cbin_log"));
      assertTrue(ids.includes("ctre_bfs"));

      const first = all[0];
      assertDefined(first);
      assertDefined(first.id);
      assertDefined(first.category);
      assertDefined(first.categoryName);
      assertDefined(first.description);
      assertDefined(first.tests);
      assertTrue(first.testCount >= 0);
    }).pipe(runWithTestLayer(testDbPath)));

  // ─── getTasksByCategory ─────────────────────────────────────────────────────

  it.effect(
    "getTasksByCategory returns tasks filtered by category prefix",
    () =>
      Effect.gen(function*() {
        const svc = yield* TaskService;
        yield* svc.loadAndCacheTasks();

        const snatTasks = yield* svc.getTasksByCategory("snat");
        assertTrue(snatTasks.length > 0);
        for (const t of snatTasks) {
          strictEqual(t.category, "snat");
          strictEqual(t.categoryName, "Scott Naturals");
        }

        const algoTasks = yield* svc.getTasksByCategory("algo");
        assertTrue(algoTasks.length > 0);
        for (const t of algoTasks) {
          strictEqual(t.category, "algo");
          strictEqual(t.categoryName, "Algorithms");
        }

        const empty = yield* svc.getTasksByCategory("xyz");
        strictEqual(empty.length, 0);
      }).pipe(runWithTestLayer(testDbPath)),
  );

  // ─── computeRefBits ─────────────────────────────────────────────────────────

  it.effect(
    "computeRefBits returns positive bit size for tasks with a .lam reference",
    () =>
      Effect.gen(function*() {
        const svc = yield* TaskService;

        const bits = yield* svc.computeRefBits("cnat_add");
        assertDefined(bits);
        assertTrue(bits > 0);
      }).pipe(runWithTestLayer(testDbPath)),
  );

  it.effect(
    "computeRefBits returns undefined for tasks without a .lam reference",
    () =>
      Effect.gen(function*() {
        const svc = yield* TaskService;

        const bits = yield* svc.computeRefBits("nonexistent_task");
        strictEqual(bits, undefined);
      }).pipe(runWithTestLayer(testDbPath)),
  );

  // ─── Idempotency ────────────────────────────────────────────────────────────

  it.effect(
    "loadAndCacheTasks twice does not duplicate entries in the database",
    () =>
      Effect.gen(function*() {
        const svc = yield* TaskService;
        yield* svc.loadAndCacheTasks();
        yield* svc.loadAndCacheTasks();

        const all = yield* svc.getAllTasks();
        strictEqual(all.length, 120);
      }).pipe(runWithTestLayer(testDbPath)),
  );
});
