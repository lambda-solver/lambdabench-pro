// apps/server/src/cli.test.ts

import { describe, it } from "@effect/vitest";
import { assertDefined, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer, Ref } from "effect";
import { vi } from "vitest";
import { LamBenchClient } from "./client/LamBenchClient.js";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.doMock("@effect/platform-bun", () => ({
  BunRuntime: {
    runMain: () => {},
  },
}));

// ─── Capture ref for mock client calls ───────────────────────────────────────

const makeMockClientLayer = () =>
  Layer.effect(
    LamBenchClient,
    Effect.gen(function*() {
      const calls = yield* Ref.make<
        Array<{
          method: string;
          args: unknown;
        }>
      >([]);

      const record = (method: string, args: unknown) => Ref.update(calls, (prev) => [...prev, { args, method }]);

      return LamBenchClient.of(
        {
          calls,
          evalBatch: Effect.fnUntraced(function*(request: unknown) {
            yield* record("evalBatch", request);
            return {
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              id: "job-1",
              results: [],
              status: "queued" as const,
              totalTasks: 1,
            };
          }),
          evalSingle: Effect.fnUntraced(function*(request: unknown) {
            yield* record("evalSingle", request);
            return {
              bits: 42,
              elapsedMs: 100,
              errors: [],
              model: (request as { model: string; }).model,
              pass: true,
              score: 0.95,
              submission: "answer",
              taskId: (request as { task: string; }).task,
              timestamp: new Date().toISOString(),
              variant: (request as { variant: string; }).variant,
            };
          }),
          evalStatus: Effect.fnUntraced(function*(jobId: string) {
            yield* record("evalStatus", jobId);
            return {
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              id: jobId,
              results: [],
              status: "queued" as const,
              totalTasks: 1,
            };
          }),
          health: Effect.fnUntraced(function*() {
            yield* record("health", undefined);
            return {
              db: "connected" as const,
              status: "ok" as const,
              uptimeSeconds: 0,
              version: "1.0.0",
            };
          }),
          models: Effect.fnUntraced(function*() {
            yield* record("models", undefined);
            return [];
          }),
          resultDetail: Effect.fnUntraced(function*(runId: string) {
            yield* record("resultDetail", runId);
            return {
              bits: 10,
              elapsedMs: 100,
              errors: [],
              model: "model-a",
              pass: true,
              score: 1,
              submission: "",
              taskId: "task-1",
              timestamp: new Date().toISOString(),
              variant: "standard" as const,
            };
          }),
          results: Effect.fnUntraced(function*() {
            yield* record("results", undefined);
            return {
              categories: [],
              generatedAt: new Date().toISOString(),
              rankings: [
                {
                  avgTime: 1.0,
                  model: "model-a",
                  pct: "50.0",
                  pricePerMOutputTokens: 0.5,
                  right: 1,
                  taskBits: { "task-1": 10 },
                  taskRefs: { "task-1": 5 },
                  tasks: { "task-1": true, "task-2": false },
                  timestamp: "2024-01-01T00:00:00Z",
                  total: 2,
                },
                {
                  avgTime: 1.2,
                  model: "model-b",
                  pct: "50.0",
                  pricePerMOutputTokens: 0.3,
                  right: 1,
                  taskBits: { "task-2": 15 },
                  taskRefs: { "task-2": 8 },
                  tasks: { "task-1": false, "task-2": true },
                  timestamp: "2024-01-01T00:00:00Z",
                  total: 2,
                },
                {
                  avgTime: 0.8,
                  model: "model-c",
                  pct: "100.0",
                  pricePerMOutputTokens: 0.7,
                  right: 2,
                  taskBits: { "task-1": 12, "task-2": 18 },
                  taskRefs: { "task-1": 6, "task-2": 9 },
                  tasks: { "task-1": true, "task-2": true },
                  timestamp: "2024-01-01T00:00:00Z",
                  total: 2,
                },
              ],
              tasks: [],
            };
          }),
          taskDetail: Effect.fnUntraced(function*(taskId: string) {
            yield* record("taskDetail", taskId);
            return {
              category: "algo",
              categoryName: "Algorithms",
              description: "Test task",
              id: taskId,
              testCount: 1,
              tests: [],
            };
          }),
          tasks: Effect.fnUntraced(function*() {
            yield* record("tasks", undefined);
            return [];
          }),
          testModel: Effect.fnUntraced(function*(request: unknown) {
            yield* record("testModel", request);
            return {
              latencyMs: 100,
              ok: true,
            };
          }),
        } as unknown as LamBenchClient["Service"],
      );
    }),
  );

// ─── Dynamic imports after mocks ─────────────────────────────────────────────

const { runCli } = await import("./cli.js");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCalls = (client: LamBenchClient["Service"]) =>
  (
    client as unknown as {
      calls: Ref.Ref<Array<{ method: string; args: unknown; }>>;
    }
  ).calls;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("cli evalSingle schema compliance", () => {
  it.effect("passes all required SingleEvalRequest fields", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      yield* runCli(["eval", "single", "gpt-4", "task-1"]);

      const calls = yield* Ref.get(getCalls(client));
      const singleCall = calls.find((c) => c.method === "evalSingle");

      strictEqual(singleCall !== undefined, true);
      deepStrictEqual(singleCall?.args, {
        maxTokens: 4096,
        mode: "direct",
        model: "gpt-4",
        provider: "openrouter",
        rlmMaxDepth: 3,
        task: "task-1",
        variant: "standard",
      });
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("passes explicit variant and provider flags", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      yield* runCli([
        "eval",
        "single",
        "gpt-4",
        "task-1",
        "--variant=rlm",
        "--provider=opencode-go",
      ]);

      const calls = yield* Ref.get(getCalls(client));
      const singleCall = calls.find((c) => c.method === "evalSingle");

      strictEqual(singleCall !== undefined, true);
      deepStrictEqual(singleCall?.args, {
        maxTokens: 4096,
        mode: "direct",
        model: "gpt-4",
        provider: "opencode-go",
        rlmMaxDepth: 3,
        task: "task-1",
        variant: "rlm",
      });
    }).pipe(Effect.provide(makeMockClientLayer())));
});

describe("cli evalBatch schema compliance", () => {
  it.effect("passes all required BatchEvalRequest fields with defaults", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      yield* runCli(["eval", "batch", "model-a", "model-b"]);

      const calls = yield* Ref.get(getCalls(client));
      const batchCall = calls.find((c) => c.method === "evalBatch");

      strictEqual(batchCall !== undefined, true);
      deepStrictEqual(batchCall?.args, {
        concurrency: 2,
        mode: "both",
        models: ["model-a", "model-b"],
        tasks: [],
        variant: "both",
      });
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("passes explicit tasks and variant flags", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      yield* runCli([
        "eval",
        "batch",
        "model-a",
        "--tasks=t1,t2",
        "--variant=standard",
      ]);

      const calls = yield* Ref.get(getCalls(client));
      const batchCall = calls.find((c) => c.method === "evalBatch");

      strictEqual(batchCall !== undefined, true);
      deepStrictEqual(batchCall?.args, {
        concurrency: 2,
        mode: "both",
        models: ["model-a"],
        tasks: ["t1", "t2"],
        variant: "standard",
      });
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("stops collecting models at first flag (undefined guard)", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      yield* runCli([
        "eval",
        "batch",
        "model-a",
        "model-b",
        "--tasks=t1",
        "--variant=rlm",
      ]);

      const calls = yield* Ref.get(getCalls(client));
      const batchCall = calls.find((c) => c.method === "evalBatch");

      strictEqual(batchCall !== undefined, true);
      deepStrictEqual((batchCall.args as { models: Array<string>; }).models, [
        "model-a",
        "model-b",
      ]);
    }).pipe(Effect.provide(makeMockClientLayer())));
});

describe("cli bounds check undefined handling", () => {
  it.effect("handles args array ending without flags (undefined arg)", () =>
    Effect.gen(function*() {
      const client = yield* LamBenchClient;
      // Simulate args where idx reaches args.length (arg becomes undefined)
      yield* runCli(["eval", "batch", "model-x"]);

      const calls = yield* Ref.get(getCalls(client));
      const batchCall = calls.find((c) => c.method === "evalBatch");

      strictEqual(batchCall !== undefined, true);
      deepStrictEqual((batchCall.args as { models: Array<string>; }).models, [
        "model-x",
      ]);
    }).pipe(Effect.provide(makeMockClientLayer())));
});

describe("cli gepa optimize command", () => {
  it.effect("logs not-yet-implemented message", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["gepa", "optimize", "task-1"]);

        strictEqual(logs.length, 1);
        strictEqual(logs[0], "GEPA optimizer: not yet implemented");
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("prints usage for unknown gepa subcommand", () =>
    Effect.gen(function*() {
      const errors: Array<string> = [];
      const originalError = console.error;
      console.error = (msg: string) => {
        errors.push(msg);
      };

      try {
        yield* runCli(["gepa", "unknown"]);

        strictEqual(errors.length >= 1, true);
        const usageCall = errors.find((c) => c.includes("Usage:"));
        strictEqual(usageCall !== undefined, true);
      } finally {
        console.error = originalError;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));
});

describe("cli results filtering", () => {
  it.effect("returns all rankings when no filters provided", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        strictEqual(output.rankings.length, 3);
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("filters by model", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--model=model-a"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        strictEqual(output.rankings.length, 1);
        strictEqual(output.rankings[0].model, "model-a");
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("filters by task presence", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--task=task-1"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        // all three models have task-1 in their tasks record
        strictEqual(output.rankings.length, 3);
        strictEqual(
          output.rankings.every(
            (r: { tasks: Record<string, boolean>; }) => "task-1" in r.tasks,
          ),
          true,
        );
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("filters by task presence excluding models without task", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--task=task-3"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        // no model has task-3 in their tasks record
        strictEqual(output.rankings.length, 0);
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("limits results", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--limit=2"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        strictEqual(output.rankings.length, 2);
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("ignores limit of zero or negative", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--limit=0"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        // limit 0 is not > 0, so no slice applied
        strictEqual(output.rankings.length, 3);
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));

  it.effect("combines multiple filters", () =>
    Effect.gen(function*() {
      const logs: Array<string> = [];
      const originalLog = console.log;
      console.log = (msg: string) => {
        logs.push(msg);
      };

      try {
        yield* runCli(["results", "--task=task-1", "--limit=1"]);

        strictEqual(logs.length, 1);
        const [firstLog] = logs;
        assertDefined(firstLog);
        const output = JSON.parse(firstLog);
        // task-1 filter gives model-a and model-c; limit=1 gives first one
        strictEqual(output.rankings.length, 1);
        strictEqual("task-1" in output.rankings[0].tasks, true);
      } finally {
        console.log = originalLog;
      }
    }).pipe(Effect.provide(makeMockClientLayer())));
});
