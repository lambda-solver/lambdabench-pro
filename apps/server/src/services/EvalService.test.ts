// apps/server/src/services/EvalService.test.ts

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { beforeEach, describe, it } from "@effect/vitest";
import { assertDefined, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import type { SingleEvalRequest } from "@repo/domain/Api";
import { Effect, Layer } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import { vi } from "vitest";
import { runTaskWithLlm } from "../check/Check.js";
import { ModelCallError } from "../llm/ModelGuard.js";
import { rlmEval } from "../rlm/LambdaRlm.js";
import { EvalService, EvalServiceLive } from "./EvalService";
import type { DbTask, InsertResult } from "./ResultStore";
import { ResultStore } from "./ResultStore";
import { TaskService } from "./TaskService";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("../check/Check.js", () => ({
  runTaskWithLlm: vi.fn(),
}));

vi.mock("../rlm/LambdaRlm.js", () => ({
  defaultConfig: vi.fn((maxDepth = 3) => ({
    aCompose: 0.9,
    aLeaf: 0.95,
    accuracyTarget: 0.8,
    contextWindowChars: 100_000,
    maxDepth,
  })),
  rlmEval: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const testDbTask: DbTask = {
  category: "algo",
  categoryName: "Algorithms",
  description: "Add two numbers",
  id: "test-task",
  refBits: 10,
  refSolution: null,
  testCount: 2,
  tests: [
    { expected: "2", input: "1+1" },
    { expected: "4", input: "2+2" },
  ],
};

const makeRequest = (
  overrides?: Partial<SingleEvalRequest>,
): SingleEvalRequest =>
  ({
    maxTokens: 4096,
    model: "test-model",
    provider: "openrouter",
    rlmMaxDepth: 3,
    task: "test-task",
    variant: "standard",
    ...overrides,
  }) as SingleEvalRequest;

// ─── Mock layers ─────────────────────────────────────────────────────────────

const makeMockLayers = (onInsertResult?: (r: InsertResult) => void) => {
  const mockResultStore = Layer.succeed(
    ResultStore,
    ResultStore.of({
      cleanupExpired: () => Effect.succeed({ deletedJobs: 0, deletedResults: 0 }),
      getActiveModelConfigs: () => Effect.succeed([]),
      getAllTasks: () => Effect.succeed([]),
      getJob: () => Effect.succeed(undefined),
      getJobsByStatus: () => Effect.succeed([]),
      getLatestResults: () => Effect.succeed([]),
      getResultsByJobId: () => Effect.succeed([]),
      getResultsByRunId: () => Effect.succeed([]),
      getTask: () => Effect.succeed(undefined),
      getTasksByCategory: () => Effect.succeed([]),
      insertJob: () => Effect.void,
      insertModelConfig: () => Effect.void,
      insertResult: (result: InsertResult) =>
        Effect.sync(() => {
          onInsertResult?.(result);
        }),
      insertTask: () => Effect.void,
      updateJobStatus: () => Effect.void,
    }),
  );

  const mockTaskService = Layer.succeed(
    TaskService,
    TaskService.of({
      computeRefBits: () => Effect.succeed(undefined),
      getAllTasks: () => Effect.succeed([]),
      getTask: (taskId: string) => Effect.succeed(taskId === "test-task" ? testDbTask : undefined),
      getTasksByCategory: () => Effect.succeed([]),
      loadAndCacheTasks: () => Effect.void,
    }),
  );

  const mockLanguageModel = Layer.succeed(LanguageModel.LanguageModel, {
    generateObject: () => Effect.die(new Error("not mocked")),
    generateText: (_options: unknown) =>
      Effect.succeed({
        finishReason: "stop" as const,
        text: "mocked",
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
      }),
    streamText: () => Effect.die(new Error("not mocked")),
  } as unknown as LanguageModel.Service);

  return Layer.mergeAll(mockResultStore, mockTaskService, mockLanguageModel);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EvalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.effect(
    "returns pass=false with 'Task not found' when task is missing",
    () => {
      const captured: Array<InsertResult> = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function*() {
        const svc = yield* EvalService;

        const request = makeRequest({ task: "missing-task" });
        const result = yield* svc.evaluateSingle(request);

        strictEqual(result.taskId, "missing-task");
        strictEqual(result.model, "test-model");
        strictEqual(result.variant, "standard");
        strictEqual(result.pass, false);
        strictEqual(result.bits, 0);
        strictEqual(result.score, 0);
        deepStrictEqual(result.errors, ["Task not found"]);
        strictEqual(result.elapsedMs, 0);
        strictEqual(result.submission, "");
        assertDefined(result.timestamp);

        strictEqual(captured.length, 1);
        strictEqual(captured[0]?.taskId, "missing-task");
        strictEqual(captured[0]?.model, "test-model");
        strictEqual(captured[0]?.variant, "standard");
        strictEqual(captured[0]?.provider, "openrouter");
        strictEqual(captured[0]?.pass, false);
        strictEqual(captured[0]?.bits, 0);
        strictEqual(captured[0]?.score, 0);
        deepStrictEqual(captured[0]?.errors, ["Task not found"]);
        strictEqual(captured[0]?.submission, "");
        strictEqual(captured[0]?.elapsedMs, 0);
        assertDefined(captured[0]?.timestamp);
        assertDefined(captured[0]?.runId);
      }).pipe(
        Effect.provide(EvalServiceLive),
        Effect.provide(layers),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      );
    },
  );

  it.effect("standard eval success returns correct EvalResult", () => {
    vi.mocked(runTaskWithLlm).mockReturnValue(
      Effect.succeed({
        bits: 42,
        elapsedMs: 1234,
        errors: [],
        id: "test-task",
        pass: true,
        score: 0.95,
      }),
    );

    const captured: Array<InsertResult> = [];
    const layers = makeMockLayers((r) => captured.push(r));

    return Effect.gen(function*() {
      const svc = yield* EvalService;

      const request = makeRequest();
      const result = yield* svc.evaluateSingle(request);

      strictEqual(result.taskId, "test-task");
      strictEqual(result.model, "test-model");
      strictEqual(result.variant, "standard");
      strictEqual(result.pass, true);
      strictEqual(result.bits, 42);
      strictEqual(result.score, 0.95);
      deepStrictEqual(result.errors, []);
      strictEqual(result.elapsedMs, 1234);
      strictEqual(result.submission, "");
      assertDefined(result.timestamp);

      strictEqual(captured.length, 1);
      strictEqual(captured[0]?.taskId, "test-task");
      strictEqual(captured[0]?.model, "test-model");
      strictEqual(captured[0]?.variant, "standard");
      strictEqual(captured[0]?.provider, "openrouter");
      strictEqual(captured[0]?.pass, true);
      strictEqual(captured[0]?.bits, 42);
      strictEqual(captured[0]?.score, 0.95);
      deepStrictEqual(captured[0]?.errors, []);
      strictEqual(captured[0]?.submission, "");
      strictEqual(captured[0]?.elapsedMs, 1234);
      assertDefined(captured[0]?.timestamp);
      assertDefined(captured[0]?.runId);
    }).pipe(
      Effect.provide(EvalServiceLive),
      Effect.provide(layers),
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    );
  });

  it.effect(
    "standard eval ModelCallError is caught and returns pass=false",
    () => {
      vi.mocked(runTaskWithLlm).mockReturnValue(
        Effect.fail(new ModelCallError("test-model", 1, "connection timeout")),
      );

      const captured: Array<InsertResult> = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function*() {
        const svc = yield* EvalService;

        const request = makeRequest();
        const result = yield* svc.evaluateSingle(request);

        strictEqual(result.taskId, "test-task");
        strictEqual(result.pass, false);
        strictEqual(result.bits, 0);
        strictEqual(result.score, 0);
        assertTrue(result.errors.some((e) => e.includes("Model call failed")));
        strictEqual(result.elapsedMs, 0);
        strictEqual(result.submission, "");
        assertDefined(result.timestamp);

        strictEqual(captured.length, 1);
        strictEqual(captured[0]?.pass, false);
        assertTrue(
          (captured[0]?.errors ?? []).some((e) => e.includes("Model call failed")),
        );
      }).pipe(
        Effect.provide(EvalServiceLive),
        Effect.provide(layers),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      );
    },
  );

  it.effect("rlm eval returns correct EvalResult with metadata", () => {
    vi.mocked(rlmEval).mockReturnValue(
      Effect.succeed({
        attempts: 2,
        bits: 50,
        depth: 3,
        errors: [],
        id: "test-task",
        pass: true,
        score: 0.88,
      }),
    );

    const captured: Array<InsertResult> = [];
    const layers = makeMockLayers((r) => captured.push(r));

    return Effect.gen(function*() {
      const svc = yield* EvalService;

      const request = makeRequest({ variant: "rlm" });
      const result = yield* svc.evaluateSingle(request);

      strictEqual(result.taskId, "test-task");
      strictEqual(result.model, "test-model");
      strictEqual(result.variant, "rlm");
      strictEqual(result.pass, true);
      strictEqual(result.bits, 50);
      strictEqual(result.score, 0.88);
      deepStrictEqual(result.errors, []);
      assertTrue(result.elapsedMs >= 0);
      strictEqual(result.submission, "");
      assertDefined(result.timestamp);

      strictEqual(captured.length, 1);
      strictEqual(captured[0]?.taskId, "test-task");
      strictEqual(captured[0]?.variant, "rlm");
      strictEqual(captured[0]?.pass, true);
      strictEqual(captured[0]?.bits, 50);
      strictEqual(captured[0]?.score, 0.88);
      deepStrictEqual(captured[0]?.errors, []);
      assertDefined(captured[0]?.timestamp);
      assertDefined(captured[0]?.runId);
    }).pipe(
      Effect.provide(EvalServiceLive),
      Effect.provide(layers),
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    );
  });

  it.effect(
    "insertResult receives correct InsertResult shape including all fields",
    () => {
      vi.mocked(runTaskWithLlm).mockReturnValue(
        Effect.succeed({
          bits: 99,
          elapsedMs: 5678,
          errors: ["minor issue"],
          id: "test-task",
          pass: true,
          score: 0.75,
        }) as unknown as ReturnType<typeof runTaskWithLlm>,
      );

      const captured: Array<InsertResult> = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function*() {
        const svc = yield* EvalService;

        const request = makeRequest({ provider: "opencode-go" });
        yield* svc.evaluateSingle(request);

        strictEqual(captured.length, 1);
        const [inserted] = captured;
        assertDefined(inserted);

        // Verify every required field in InsertResult
        assertDefined(inserted.runId);
        strictEqual(inserted.taskId, "test-task");
        strictEqual(inserted.model, "test-model");
        strictEqual(inserted.variant, "standard");
        strictEqual(inserted.provider, "opencode-go");
        strictEqual(inserted.pass, true);
        strictEqual(inserted.bits, 99);
        strictEqual(inserted.score, 0.75);
        deepStrictEqual(inserted.errors, ["minor issue"]);
        strictEqual(inserted.submission, "");
        strictEqual(inserted.elapsedMs, 5678);
        assertDefined(inserted.timestamp);
      }).pipe(
        Effect.provide(EvalServiceLive),
        Effect.provide(layers),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodePath.layer),
      );
    },
  );
});
