// apps/server/src/mcp.test.ts

import { describe, it } from "@effect/vitest";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer, Schema } from "effect";
import type { Toolkit } from "effect/unstable/ai";
import { vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.doMock("@effect/platform-bun", async () => {
  const original = await import("@effect/platform-bun");
  return {
    ...original,
    BunRuntime: {
      ...original.BunRuntime,
      runMain: () => {},
    },
  };
});

vi.doMock("./client/LamBenchClient.js", async () => {
  const { Effect, Layer } = await import("effect");
  const { ServiceMap } = await import("effect");

  const Base = (ServiceMap.Service as any)()("app/MockLamBenchClient");

  class MockLamBenchClient extends Base {
    static readonly layer = () =>
      Layer.succeed(
        MockLamBenchClient,
        MockLamBenchClient.of({
          health: Effect.fnUntraced(function* () {
            return {
              status: "ok" as const,
              version: "1.0.0",
              db: "connected" as const,
              uptimeSeconds: 0,
            };
          }),
          evalSingle: Effect.fnUntraced(function* (request: unknown) {
            const req = request as {
              task: string;
              model: string;
              variant: string;
            };
            return {
              taskId: req.task,
              model: req.model,
              variant: req.variant,
              pass: true,
              bits: 42,
              score: 0.95,
              errors: [],
              elapsedMs: 100,
              submission: "answer",
              timestamp: new Date().toISOString(),
            };
          }),
          evalBatch: Effect.fnUntraced(function* () {
            return {
              id: "job-1",
              status: "queued" as const,
              totalTasks: 1,
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              results: [],
            };
          }),
          evalStatus: Effect.fnUntraced(function* () {
            return {
              id: "job-1",
              status: "queued" as const,
              totalTasks: 1,
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              results: [],
            };
          }),
          results: Effect.fnUntraced(function* () {
            return {
              rankings: [],
              tasks: [],
              categories: [],
              generatedAt: new Date().toISOString(),
            };
          }),
          resultDetail: Effect.fnUntraced(function* () {
            return {
              taskId: "task-1",
              model: "model-a",
              variant: "standard" as const,
              pass: true,
              bits: 10,
              score: 1,
              errors: [],
              elapsedMs: 100,
              submission: "",
              timestamp: new Date().toISOString(),
            };
          }),
          tasks: Effect.fnUntraced(function* () {
            return [];
          }),
          taskDetail: Effect.fnUntraced(function* () {
            return {
              id: "task-1",
              category: "algo",
              categoryName: "Algorithms",
              description: "Test task",
              testCount: 1,
              tests: [],
            };
          }),
          models: Effect.fnUntraced(function* () {
            return [];
          }),
          testModel: Effect.fnUntraced(function* () {
            return {
              status: "ok" as const,
              model: "test-model",
              provider: "openrouter" as const,
            };
          }),
        }),
      );
  }

  class ApiError {
    readonly _tag = "ApiError" as const;
    constructor(readonly cause: unknown) {}
  }

  return { LamBenchClient: MockLamBenchClient, ApiError };
});

// ─── Dynamic import after mocks ──────────────────────────────────────────────

const { ServerLayer, LambenchToolkit } = await import("./mcp.js");

type AnyToolkit = Toolkit.Any;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("mcp", () => {
  it.effect("ServerLayer is a valid Layer and can be built", () =>
    Effect.scoped(
      Effect.gen(function* () {
        yield* Layer.build(ServerLayer);
      }),
    ),
  );

  it.effect("LambenchToolkit contains all expected tools", () =>
    Effect.gen(function* () {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const toolNames = Object.keys(tools);

      strictEqual(toolNames.length, 6);
      assertTrue(toolNames.includes("lambench_eval_single"));
      assertTrue(toolNames.includes("lambench_list_tasks"));
      assertTrue(toolNames.includes("lambench_list_results"));
      assertTrue(toolNames.includes("lambench_get_task"));
      assertTrue(toolNames.includes("lambench_list_prompt_versions"));
      assertTrue(toolNames.includes("lambench_trigger_gepa"));
    }),
  );

  it.effect("EvalSingleTool has correct name and valid schemas", () =>
    Effect.gen(function* () {
      const tool = (LambenchToolkit as AnyToolkit).tools[
        "lambench_eval_single"
      ]!;

      strictEqual(tool.name, "lambench_eval_single");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListTasksTool has correct name and valid schemas", () =>
    Effect.gen(function* () {
      const tool = (LambenchToolkit as AnyToolkit).tools[
        "lambench_list_tasks"
      ]!;

      strictEqual(tool.name, "lambench_list_tasks");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListResultsTool has correct name and valid schemas", () =>
    Effect.gen(function* () {
      const tool = (LambenchToolkit as AnyToolkit).tools[
        "lambench_list_results"
      ]!;

      strictEqual(tool.name, "lambench_list_results");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("GetTaskTool has correct name and valid schemas", () =>
    Effect.gen(function* () {
      const tool = (LambenchToolkit as AnyToolkit).tools["lambench_get_task"]!;

      strictEqual(tool.name, "lambench_get_task");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );
});
