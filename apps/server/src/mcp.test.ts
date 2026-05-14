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
  const { LamBenchClient, ApiError } = await import(
    "./client/LamBenchClient.js"
  );
  const { Effect, Layer } = await import("effect");

  class MockLamBenchClient extends LamBenchClient {
    static override readonly layer = () =>
      Layer.succeed(
        LamBenchClient,
        LamBenchClient.of({
          health: () =>
            Effect.succeed({
              status: "ok" as const,
              version: "1.0.0",
              db: "connected" as const,
              uptimeSeconds: 0,
            }),

          evalSingle: (request: unknown) => {
            const req = request as {
              task: string;
              model: string;
              variant: string;
            };
            return Effect.succeed({
              taskId: req.task,
              model: req.model,
              variant: req.variant as "standard" | "rlm" | "both",
              pass: true,
              bits: 42,
              score: 0.95,
              errors: [] as readonly string[],
              elapsedMs: 100,
              submission: "answer",
              timestamp: new Date().toISOString(),
            });
          },

          evalBatch: () =>
            Effect.succeed({
              id: "job-1",
              status: "queued" as const,
              totalTasks: 1,
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              results: [],
            }),

          evalStatus: () =>
            Effect.succeed({
              id: "job-1",
              status: "queued" as const,
              totalTasks: 1,
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              results: [],
            }),

          results: () =>
            Effect.succeed({
              rankings: [],
              tasks: [],
              categories: [],
              generatedAt: new Date().toISOString(),
            }),

          resultDetail: () =>
            Effect.succeed({
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
            }),

          tasks: () => Effect.succeed([]),
          taskDetail: () =>
            Effect.succeed({
              id: "task-1",
              category: "algo",
              categoryName: "Algorithms",
              description: "Test task",
              testCount: 1,
              tests: [],
            }),

          models: () => Effect.succeed([]),
          testModel: () =>
            Effect.succeed({
              ok: true,
              latencyMs: 0,
            }),
        }),
      );
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
    Effect.sync(() => {
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
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools.lambench_eval_single;

      if (!tool) throw new Error("lambench_eval_single tool missing");
      strictEqual(tool.name, "lambench_eval_single");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListTasksTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools.lambench_list_tasks;

      if (!tool) throw new Error("lambench_list_tasks tool missing");
      strictEqual(tool.name, "lambench_list_tasks");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListResultsTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools.lambench_list_results;

      if (!tool) throw new Error("lambench_list_results tool missing");
      strictEqual(tool.name, "lambench_list_results");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("GetTaskTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools.lambench_get_task;

      if (!tool) throw new Error("lambench_get_task tool missing");
      strictEqual(tool.name, "lambench_get_task");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );
});
