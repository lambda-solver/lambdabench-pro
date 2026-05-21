// apps/server/src/mcp.test.ts

import { Effect, Schema } from "effect";
import { assertTrue, strictEqual } from "@effect/vitest/utils";
import { describe, it } from "@effect/vitest";

import type { Toolkit } from "effect/unstable/ai";
import { vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

// Mock @effect/platform-bun so tests can run in Node.js (not Bun runtime)
vi.doMock("@effect/platform-bun", async () => {
  const effectLib = await import("effect");
  // Create a minimal Stdio mock layer manually
  const Stdio = (await import("effect/Stdio")).Stdio;
  const mockStdio = {
    args: effectLib.Effect.succeed([]),
    stderr: () => effectLib.Sink.drain,
    stdin: effectLib.Stream.empty,
    stdout: () => effectLib.Sink.drain,
  } as never;
  return {
    BunRuntime: { runMain: () => {} },
    BunStdio: {
      layer: effectLib.Layer.succeed(Stdio, mockStdio),
    },
  };
});

vi.doMock("./client/LamBenchClient.js", async () => {
  const { LamBenchClient, ApiError } = await import("./client/LamBenchClient.js");
  const effectLib = await import("effect");

  class MockLamBenchClient extends LamBenchClient {
    static override readonly layer = () =>
      effectLib.Layer.succeed(
        LamBenchClient,
        LamBenchClient.of({
          evalBatch: () =>
            effectLib.Effect.succeed({
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              id: "job-1",
              results: [],
              status: "queued" as const,
              totalTasks: 1,
            }),

          evalSingle: (request: unknown) => {
            const req = request as {
              task: string;
              model: string;
              variant: string;
            };
            return effectLib.Effect.succeed({
              bits: 42,
              elapsedMs: 100,
              errors: [] as ReadonlyArray<string>,
              model: req.model,
              pass: true,
              score: 0.95,
              submission: "answer",
              taskId: req.task,
              timestamp: new Date().toISOString(),
              variant: req.variant as "standard" | "rlm" | "both",
            });
          },

          evalStatus: () =>
            effectLib.Effect.succeed({
              completedTasks: 0,
              createdAt: new Date().toISOString(),
              id: "job-1",
              results: [],
              status: "queued" as const,
              totalTasks: 1,
            }),

          health: () =>
            effectLib.Effect.succeed({
              db: "connected" as const,
              status: "ok" as const,
              uptimeSeconds: 0,
              version: "1.0.0",
            }),

          models: () => effectLib.Effect.succeed([]),

          resultDetail: () =>
            effectLib.Effect.succeed({
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
            }),

          results: () =>
            effectLib.Effect.succeed({
              categories: [],
              generatedAt: new Date().toISOString(),
              rankings: [],
              tasks: [],
            }),

          taskDetail: () =>
            effectLib.Effect.succeed({
              category: "algo",
              categoryName: "Algorithms",
              description: "Test task",
              id: "task-1",
              testCount: 1,
              tests: [],
            }),

          tasks: () => effectLib.Effect.succeed([]),

          testModel: () =>
            effectLib.Effect.succeed({
              latencyMs: 0,
              ok: true,
            }),
        }),
      );
  }

  return { ApiError, LamBenchClient: MockLamBenchClient };
});

// ─── Dynamic import after mocks ──────────────────────────────────────────────

const { ServerLayer, LambenchToolkit } = await import("./mcp.js");

type AnyToolkit = Toolkit.Any;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("mcp", () => {
  it.effect("ServerLayer is a valid Layer", () =>
    Effect.sync(() => {
      // Verify ServerLayer is a valid Layer object (has the Layer shape)
      assertTrue(typeof ServerLayer === "object" && ServerLayer !== null);
    }),
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
      const tool = tools["lambench_eval_single"];

      if (!tool) throw new Error("lambench_eval_single tool missing");
      strictEqual(tool.name, "lambench_eval_single");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListTasksTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools["lambench_list_tasks"];

      if (!tool) throw new Error("lambench_list_tasks tool missing");
      strictEqual(tool.name, "lambench_list_tasks");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("ListResultsTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools["lambench_list_results"];

      if (!tool) throw new Error("lambench_list_results tool missing");
      strictEqual(tool.name, "lambench_list_results");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );

  it.effect("GetTaskTool has correct name and valid schemas", () =>
    Effect.sync(() => {
      const tools = (LambenchToolkit as AnyToolkit).tools;
      const tool = tools["lambench_get_task"];

      if (!tool) throw new Error("lambench_get_task tool missing");
      strictEqual(tool.name, "lambench_get_task");
      assertTrue(Schema.isSchema(tool.parametersSchema));
      assertTrue(Schema.isSchema(tool.successSchema));
    }),
  );
});
