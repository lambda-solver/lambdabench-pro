// apps/server/src/services/EvalService.test.ts

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import { beforeEach, describe, it } from "@effect/vitest";
import {
  assertDefined,
  assertTrue,
  deepStrictEqual,
  strictEqual,
} from "@effect/vitest/utils";
import type { SingleEvalRequest } from "@repo/domain/Api";
import { Effect, Layer } from "effect";
import { LanguageModel } from "effect/unstable/ai";
import { vi } from "vitest";
import { runTaskWithLlm } from "../check/Check.js";
import { ModelCallError } from "../llm/ModelGuard.js";
import { rlmEval } from "../rlm/LambdaRlm.js";
import { EvalService, EvalServiceLive } from "./EvalService";
import { type DbTask, type InsertResult, ResultStore } from "./ResultStore";
import { TaskService } from "./TaskService";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("../check/Check.js", () => ({
  runTaskWithLlm: vi.fn(),
}));

vi.mock("../rlm/LambdaRlm.js", () => ({
  defaultConfig: vi.fn((maxDepth = 3) => ({
    contextWindowChars: 100_000,
    accuracyTarget: 0.8,
    aLeaf: 0.95,
    aCompose: 0.9,
    maxDepth,
  })),
  rlmEval: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const testDbTask: DbTask = {
  id: "test-task",
  category: "algo",
  categoryName: "Algorithms",
  description: "Add two numbers",
  testCount: 2,
  tests: [
    { input: "1+1", expected: "2" },
    { input: "2+2", expected: "4" },
  ],
  refBits: 10,
  refSolution: null,
};

const makeRequest = (
  overrides?: Partial<SingleEvalRequest>,
): SingleEvalRequest =>
  ({
    model: "test-model",
    task: "test-task",
    variant: "standard",
    provider: "openrouter",
    maxTokens: 4096,
    rlmMaxDepth: 3,
    ...overrides,
  }) as SingleEvalRequest;

// ─── Mock layers ─────────────────────────────────────────────────────────────

const makeMockLayers = (onInsertResult?: (r: InsertResult) => void) => {
  const mockResultStore = Layer.succeed(
    ResultStore,
    ResultStore.of({
      insertResult: Effect.fnUntraced(function* (result: InsertResult) {
        onInsertResult?.(result);
      }),
      getResultsByRunId: Effect.fnUntraced(function* () {
        return [];
      }),
      getResultsByJobId: Effect.fnUntraced(function* () {
        return [];
      }),
      getLatestResults: Effect.fnUntraced(function* () {
        return [];
      }),
      insertJob: Effect.fnUntraced(function* () {
        return undefined;
      }),
      updateJobStatus: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getJob: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getJobsByStatus: Effect.fnUntraced(function* () {
        return [];
      }),
      insertTask: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getTask: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getTasksByCategory: Effect.fnUntraced(function* () {
        return [];
      }),
      getAllTasks: Effect.fnUntraced(function* () {
        return [];
      }),
      insertModelConfig: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getActiveModelConfigs: Effect.fnUntraced(function* () {
        return [];
      }),
      cleanupExpired: Effect.fnUntraced(function* () {
        return { deletedResults: 0, deletedJobs: 0 };
      }),
    }),
  );

  const mockTaskService = Layer.succeed(
    TaskService,
    TaskService.of({
      loadAndCacheTasks: Effect.fnUntraced(function* () {
        return undefined;
      }),
      getTask: Effect.fnUntraced(function* (taskId: string) {
        return taskId === "test-task" ? testDbTask : undefined;
      }),
      getAllTasks: Effect.fnUntraced(function* () {
        return [];
      }),
      getTasksByCategory: Effect.fnUntraced(function* () {
        return [];
      }),
      computeRefBits: Effect.fnUntraced(function* () {
        return undefined;
      }),
    }),
  );

  const mockLanguageModel = Layer.succeed(LanguageModel.LanguageModel, {
    generateText: (_options: unknown) =>
      Effect.succeed({
        text: "mocked",
        usage: { inputTokens: 0, outputTokens: 0 },
        toolCalls: [],
        finishReason: "stop" as const,
      }),
    generateObject: () => Effect.die(new Error("not mocked")),
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
      const captured: InsertResult[] = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function* () {
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
        strictEqual(captured[0]!.taskId, "missing-task");
        strictEqual(captured[0]!.model, "test-model");
        strictEqual(captured[0]!.variant, "standard");
        strictEqual(captured[0]!.provider, "openrouter");
        strictEqual(captured[0]!.pass, false);
        strictEqual(captured[0]!.bits, 0);
        strictEqual(captured[0]!.score, 0);
        deepStrictEqual(captured[0]!.errors, ["Task not found"]);
        strictEqual(captured[0]!.submission, "");
        strictEqual(captured[0]!.elapsedMs, 0);
        assertDefined(captured[0]!.timestamp);
        assertDefined(captured[0]!.runId);
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
        id: "test-task",
        pass: true,
        bits: 42,
        score: 0.95,
        errors: [],
        elapsedMs: 1234,
      }),
    );

    const captured: InsertResult[] = [];
    const layers = makeMockLayers((r) => captured.push(r));

    return Effect.gen(function* () {
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
      strictEqual(captured[0]!.taskId, "test-task");
      strictEqual(captured[0]!.model, "test-model");
      strictEqual(captured[0]!.variant, "standard");
      strictEqual(captured[0]!.provider, "openrouter");
      strictEqual(captured[0]!.pass, true);
      strictEqual(captured[0]!.bits, 42);
      strictEqual(captured[0]!.score, 0.95);
      deepStrictEqual(captured[0]!.errors, []);
      strictEqual(captured[0]!.submission, "");
      strictEqual(captured[0]!.elapsedMs, 1234);
      assertDefined(captured[0]!.timestamp);
      assertDefined(captured[0]!.runId);
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

      const captured: InsertResult[] = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function* () {
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
        strictEqual(captured[0]!.pass, false);
        assertTrue(
          (captured[0]!.errors ?? []).some((e) =>
            e.includes("Model call failed"),
          ),
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
        id: "test-task",
        pass: true,
        bits: 50,
        score: 0.88,
        errors: [],
        attempts: 2,
        depth: 3,
      }),
    );

    const captured: InsertResult[] = [];
    const layers = makeMockLayers((r) => captured.push(r));

    return Effect.gen(function* () {
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
      strictEqual(captured[0]!.taskId, "test-task");
      strictEqual(captured[0]!.variant, "rlm");
      strictEqual(captured[0]!.pass, true);
      strictEqual(captured[0]!.bits, 50);
      strictEqual(captured[0]!.score, 0.88);
      deepStrictEqual(captured[0]!.errors, []);
      assertDefined(captured[0]!.timestamp);
      assertDefined(captured[0]!.runId);
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
          id: "test-task",
          pass: true,
          bits: 99,
          score: 0.75,
          errors: ["minor issue"],
          elapsedMs: 5678,
        }) as unknown as ReturnType<typeof runTaskWithLlm>,
      );

      const captured: InsertResult[] = [];
      const layers = makeMockLayers((r) => captured.push(r));

      return Effect.gen(function* () {
        const svc = yield* EvalService;

        const request = makeRequest({ provider: "opencode-go" });
        yield* svc.evaluateSingle(request);

        strictEqual(captured.length, 1);
        const inserted = captured[0]!;

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
