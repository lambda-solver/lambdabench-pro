// apps/server/src/services/TaskService.test.ts

import { existsSync, unlinkSync } from "node:fs";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { describe, it } from "@effect/vitest";
import {
  assertDefined,
  assertInclude,
  assertTrue,
  strictEqual,
} from "@effect/vitest/utils";
import { Effect, Layer } from "effect";
import { afterAll, afterEach, beforeAll } from "vitest";
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
      Effect.gen(function* () {
        const svc = yield* TaskService;
        yield* svc.loadAndCacheTasks();

        const all = yield* svc.getAllTasks();
        strictEqual(all.length, 120);
      }).pipe(
        Effect.provide(TaskServiceLive(testDbPath)),
        Effect.provide(platformLayer),
      ),
    15000,
  );

  // ─── getTask ────────────────────────────────────────────────────────────────

  it.effect("getTask retrieves a cached task by ID", () =>
    Effect.gen(function* () {
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
    }).pipe(
      Effect.provide(TaskServiceLive(testDbPath)),
      Effect.provide(platformLayer),
    ),
  );

  it.effect("getTask returns undefined for unknown task ID", () =>
    Effect.gen(function* () {
      const svc = yield* TaskService;
      yield* svc.loadAndCacheTasks();

      const task = yield* svc.getTask("nonexistent_task");
      strictEqual(task, undefined);
    }).pipe(
      Effect.provide(TaskServiceLive(testDbPath)),
      Effect.provide(platformLayer),
    ),
  );

  // ─── getAllTasks ────────────────────────────────────────────────────────────

  it.effect("getAllTasks returns all cached tasks with correct shape", () =>
    Effect.gen(function* () {
      const svc = yield* TaskService;
      yield* svc.loadAndCacheTasks();

      const all = yield* svc.getAllTasks();
      strictEqual(all.length, 120);

      const ids = all.map((t) => t.id).sort();
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
    }).pipe(
      Effect.provide(TaskServiceLive(testDbPath)),
      Effect.provide(platformLayer),
    ),
  );

  // ─── getTasksByCategory ─────────────────────────────────────────────────────

  it.effect(
    "getTasksByCategory returns tasks filtered by category prefix",
    () =>
      Effect.gen(function* () {
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
      }).pipe(
        Effect.provide(TaskServiceLive(testDbPath)),
        Effect.provide(platformLayer),
      ),
  );

  // ─── computeRefBits ─────────────────────────────────────────────────────────

  it.effect(
    "computeRefBits returns positive bit size for tasks with a .lam reference",
    () =>
      Effect.gen(function* () {
        const svc = yield* TaskService;

        const bits = yield* svc.computeRefBits("cnat_add");
        assertDefined(bits);
        assertTrue(bits > 0);
      }).pipe(
        Effect.provide(TaskServiceLive(testDbPath)),
        Effect.provide(platformLayer),
      ),
  );

  it.effect(
    "computeRefBits returns undefined for tasks without a .lam reference",
    () =>
      Effect.gen(function* () {
        const svc = yield* TaskService;

        const bits = yield* svc.computeRefBits("nonexistent_task");
        strictEqual(bits, undefined);
      }).pipe(
        Effect.provide(TaskServiceLive(testDbPath)),
        Effect.provide(platformLayer),
      ),
  );

  // ─── Idempotency ────────────────────────────────────────────────────────────

  it.effect(
    "loadAndCacheTasks twice does not duplicate entries in the database",
    () =>
      Effect.gen(function* () {
        const svc = yield* TaskService;
        yield* svc.loadAndCacheTasks();
        yield* svc.loadAndCacheTasks();

        const all = yield* svc.getAllTasks();
        strictEqual(all.length, 120);
      }).pipe(
        Effect.provide(TaskServiceLive(testDbPath)),
        Effect.provide(platformLayer),
      ),
  );
});
