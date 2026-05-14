// apps/server/src/services/ResultStore.test.ts

import { existsSync, unlinkSync } from "node:fs";
import { describe, it } from "@effect/vitest";
import {
  assertDefined,
  assertTrue,
  assertUndefined,
  deepStrictEqual,
  strictEqual,
} from "@effect/vitest/utils";
import { Effect } from "effect";
import { afterAll, afterEach, beforeAll } from "vitest";
import { ResultStore, ResultStoreLive, SqlError } from "./ResultStore";

const testDbPath = "apps/server/test-data/ResultStore.test.db";

const cleanupDbFiles = () => {
  const paths = [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`];
  for (const p of paths) {
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
};

describe("ResultStore", () => {
  beforeAll(() => {
    cleanupDbFiles();
  });

  afterEach(() => {
    cleanupDbFiles();
  });

  afterAll(() => {
    cleanupDbFiles();
  });

  // ─── Layer creation ───────────────────────────────────────────────────────

  it.effect("creates SQLite file, WAL mode, and all tables", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      // Verify file was created on disk
      assertTrue(existsSync(testDbPath));

      // Verify we can query tables — if tables were not created this would error
      const results = yield* store.getLatestResults();
      deepStrictEqual(results, []);

      const tasks = yield* store.getAllTasks();
      deepStrictEqual(tasks, []);

      const configs = yield* store.getActiveModelConfigs();
      deepStrictEqual(configs, []);
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Results ──────────────────────────────────────────────────────────────

  it.effect("insertResult + getResultsByRunId", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertResult({
        runId: "run-1",
        taskId: "task-1",
        model: "gpt-4",
        variant: "default",
        provider: "openai",
        pass: true,
        bits: 4,
        score: 0.95,
        errors: ["err1"],
        submission: "sub-1",
        elapsedMs: 1234,
        timestamp: "2025-01-01T00:00:00Z",
      });

      const results = yield* store.getResultsByRunId("run-1");
      strictEqual(results.length, 1);
      strictEqual(results[0]?.runId, "run-1");
      strictEqual(results[0]?.taskId, "task-1");
      strictEqual(results[0]?.model, "gpt-4");
      strictEqual(results[0]?.variant, "default");
      strictEqual(results[0]?.provider, "openai");
      strictEqual(results[0]?.pass, true);
      strictEqual(results[0]?.bits, 4);
      strictEqual(results[0]?.score, 0.95);
      deepStrictEqual(results[0]?.errors, ["err1"]);
      strictEqual(results[0]?.submission, "sub-1");
      strictEqual(results[0]?.elapsedMs, 1234);
      strictEqual(results[0]?.timestamp, "2025-01-01T00:00:00Z");
      assertDefined(results[0]?.id);
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  it.effect("getResultsByJobId", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertResult({
        runId: "run-2",
        jobId: "job-1",
        taskId: "task-a",
        model: "claude-3",
        variant: "haiku",
        provider: "anthropic",
        pass: false,
        elapsedMs: 500,
        timestamp: "2025-01-02T00:00:00Z",
      });

      yield* store.insertResult({
        runId: "run-3",
        jobId: "job-1",
        taskId: "task-b",
        model: "claude-3",
        variant: "haiku",
        provider: "anthropic",
        pass: true,
        elapsedMs: 600,
        timestamp: "2025-01-02T01:00:00Z",
      });

      const results = yield* store.getResultsByJobId("job-1");
      strictEqual(results.length, 2);
      strictEqual(results[0]?.runId, "run-3");
      strictEqual(results[1]?.runId, "run-2");
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  it.effect("insertJob + getJob + updateJobStatus", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertJob({
        id: "job-1",
        status: "pending",
        config: { model: "gpt-4" },
        totalTasks: 10,
      });

      const job = yield* store.getJob("job-1");
      assertDefined(job);
      strictEqual(job.id, "job-1");
      strictEqual(job.status, "pending");
      deepStrictEqual(job.config, { model: "gpt-4" });
      strictEqual(job.totalTasks, 10);
      strictEqual(job.completedTasks, 0);
      strictEqual(job.completedAt, null);

      yield* store.updateJobStatus("job-1", "completed", 10);

      const updated = yield* store.getJob("job-1");
      assertDefined(updated);
      strictEqual(updated.status, "completed");
      strictEqual(updated.completedTasks, 10);
      assertDefined(updated.completedAt);
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Tasks ────────────────────────────────────────────────────────────────

  it.effect("insertTask + getTask + getAllTasks", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertTask({
        id: "task-1",
        category: "math",
        categoryName: "Mathematics",
        description: "Add two numbers",
        testCount: 3,
        tests: [{ input: "1+1", expected: "2" }],
        refBits: 2,
        refSolution: "lambda x. x + x",
      });

      yield* store.insertTask({
        id: "task-2",
        category: "logic",
        categoryName: "Logic",
        description: "Boolean AND",
        testCount: 2,
        tests: [{ input: "true && false", expected: "false" }],
      });

      const task = yield* store.getTask("task-1");
      assertDefined(task);
      strictEqual(task.id, "task-1");
      strictEqual(task.category, "math");
      strictEqual(task.categoryName, "Mathematics");
      strictEqual(task.description, "Add two numbers");
      strictEqual(task.testCount, 3);
      deepStrictEqual(task.tests, [{ input: "1+1", expected: "2" }]);
      strictEqual(task.refBits, 2);
      strictEqual(task.refSolution, "lambda x. x + x");

      const all = yield* store.getAllTasks();
      strictEqual(all.length, 2);
      strictEqual(all[0]?.id, "task-1");
      strictEqual(all[1]?.id, "task-2");
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Model Configs ────────────────────────────────────────────────────────

  it.effect("insertModelConfig + getActiveModelConfigs", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertModelConfig({
        id: "gpt-4",
        provider: "openai",
        displayName: "GPT-4",
        pricePerMOutput: 30,
        isActive: true,
      });

      yield* store.insertModelConfig({
        id: "gpt-3.5",
        provider: "openai",
        displayName: "GPT-3.5",
        pricePerMOutput: 2,
        isActive: false,
      });

      const active = yield* store.getActiveModelConfigs();
      strictEqual(active.length, 1);
      strictEqual(active[0]?.id, "gpt-4");
      strictEqual(active[0]?.provider, "openai");
      strictEqual(active[0]?.displayName, "GPT-4");
      strictEqual(active[0]?.pricePerMOutput, 30);
      strictEqual(active[0]?.isActive, true);
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Retention ────────────────────────────────────────────────────────────

  it.effect("cleanupExpired deletes old results and jobs", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertResult({
        runId: "old-run",
        taskId: "task-old",
        model: "old-model",
        variant: "default",
        provider: "openai",
        pass: true,
        elapsedMs: 100,
        timestamp: "2020-01-01T00:00:00Z",
      });

      yield* store.insertJob({
        id: "old-job",
        status: "completed",
        config: {},
        totalTasks: 1,
        completedTasks: 1,
      });

      const resultBefore = yield* store.getResultsByRunId("old-run");
      strictEqual(resultBefore.length, 1);

      // Backdate rows so retention policy picks them up
      const { DatabaseSync } = yield* Effect.promise(
        () => import("node:sqlite"),
      );
      const rawDb = new DatabaseSync(testDbPath);
      rawDb.exec(
        "UPDATE benchmark_results SET created_at = datetime('now', '-1 days')",
      );
      rawDb.exec(
        "UPDATE batch_jobs SET created_at = datetime('now', '-1 days')",
      );
      rawDb.close();

      const cleanup = yield* store.cleanupExpired(0, 1000);
      assertTrue(cleanup.deletedResults >= 1);
      assertTrue(cleanup.deletedJobs >= 1);

      const resultAfter = yield* store.getResultsByRunId("old-run");
      strictEqual(resultAfter.length, 0);

      const jobAfter = yield* store.getJob("old-job");
      assertUndefined(jobAfter);
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── getJobsByStatus ──────────────────────────────────────────────────────

  it.effect("getJobsByStatus filters by status", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertJob({
        id: "job-pending-1",
        status: "pending",
        config: {},
        totalTasks: 1,
      });

      yield* store.insertJob({
        id: "job-running-1",
        status: "running",
        config: {},
        totalTasks: 2,
      });

      yield* store.insertJob({
        id: "job-pending-2",
        status: "pending",
        config: {},
        totalTasks: 3,
      });

      const pending = yield* store.getJobsByStatus("pending");
      strictEqual(pending.length, 2);
      const pendingIds = pending.map((j) => j.id).sort();
      deepStrictEqual(pendingIds, ["job-pending-1", "job-pending-2"]);

      const running = yield* store.getJobsByStatus("running");
      strictEqual(running.length, 1);
      strictEqual(running[0]?.id, "job-running-1");
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── getTasksByCategory ───────────────────────────────────────────────────

  it.effect("getTasksByCategory filters tasks", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertTask({
        id: "task-math-1",
        category: "math",
        categoryName: "Mathematics",
        description: "Desc 1",
        testCount: 1,
        tests: [],
      });

      yield* store.insertTask({
        id: "task-math-2",
        category: "math",
        categoryName: "Mathematics",
        description: "Desc 2",
        testCount: 2,
        tests: [],
      });

      yield* store.insertTask({
        id: "task-logic-1",
        category: "logic",
        categoryName: "Logic",
        description: "Desc 3",
        testCount: 3,
        tests: [],
      });

      const mathTasks = yield* store.getTasksByCategory("math");
      const mathIds = mathTasks.map((t) => t.id);
      assertTrue(mathIds.includes("task-math-1"));
      assertTrue(mathIds.includes("task-math-2"));

      const logicTasks = yield* store.getTasksByCategory("logic");
      strictEqual(logicTasks.length, 1);
      strictEqual(logicTasks[0]?.id, "task-logic-1");
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );

  // ─── Error handling ───────────────────────────────────────────────────────

  it.effect("SqlError is returned (not thrown) on duplicate primary key", () =>
    Effect.gen(function* () {
      const store = yield* ResultStore;

      yield* store.insertJob({
        id: "dup-job",
        status: "pending",
        config: {},
        totalTasks: 1,
      });

      const exit = yield* store
        .insertJob({
          id: "dup-job",
          status: "running",
          config: {},
          totalTasks: 2,
        })
        .pipe(Effect.exit);

      const error = yield* Effect.flip(exit);
      assertTrue(error instanceof SqlError);
      assertTrue(error.message.includes("UNIQUE constraint failed"));
    }).pipe(Effect.provide(ResultStoreLive(testDbPath))),
  );
});
