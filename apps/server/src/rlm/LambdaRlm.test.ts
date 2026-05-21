/**
 * LambdaRlm.test.ts — Unit tests for the λ-RLM evaluator.
 *
 * All LLM calls and all platform I/O are mocked — no bun:* imports,
 * no @effect/platform-bun. Tests are pure Effect, runnable under Vitest.
 */

import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";

import { Effect, Layer, Ref } from "effect";

import { assertTrue, strictEqual } from "@effect/vitest/utils";

import { defaultConfig, rlmEval } from "./LambdaRlm";
import { describe, it } from "@effect/vitest";

import { LanguageModel } from "effect/unstable/ai";

import type { Task } from "../check/Check";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const task: Task = {
  desc: "Add two Church nats.",
  id: "cnat_add",
  tests: [{ expr: "@main(λf.λx.x, λf.λx.x)", want: "λa.λb.b" }],
};

// ─── Mock: LanguageModel ──────────────────────────────────────────────────────

const mockLmLayer = (responses: ReadonlyArray<string>): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const idx = yield* Ref.make(0);
      return {
        generateObject: () => Effect.die(new Error("not mocked")),
        generateText: (_options: unknown) =>
          Effect.gen(function* () {
            const i = yield* Ref.getAndUpdate(idx, (n) => n + 1);
            const text = responses[Math.min(i, responses.length - 1)] ?? "7";
            return {
              finishReason: "stop" as const,
              text,
              toolCalls: [],
              usage: { inputTokens: 0, outputTokens: 0 },
            };
          }),
        streamText: () => Effect.die(new Error("not mocked")),
      } as unknown as LanguageModel.Service;
    }),
  );

const mockLmLayerCounting = (
  callCount: Ref.Ref<number>,
  responseText = "7",
): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.succeed(LanguageModel.LanguageModel, {
    generateObject: () => Effect.die(new Error("not mocked")),
    generateText: (_options: unknown) =>
      Effect.gen(function* () {
        yield* Ref.update(callCount, (n) => n + 1);
        return {
          finishReason: "stop" as const,
          text: responseText,
          toolCalls: [],
          usage: { inputTokens: 0, outputTokens: 0 },
        };
      }),
    streamText: () => Effect.die(new Error("not mocked")),
  } as unknown as LanguageModel.Service);

// ─── Shared platform layer ────────────────────────────────────────────────────

const platformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("rlmEval", () => {
  it.layer(platformLayer)((ctx) => {
    ctx.effect("makes at least 2 LLM calls (1 probe + 1 leaf) for maxDepth=0", () =>
      Effect.gen(function* () {
        const callCount = yield* Ref.make(0);
        const cfg = { ...defaultConfig(), maxDepth: 0 };
        yield* rlmEval(task, undefined, cfg).pipe(Effect.provide(mockLmLayerCounting(callCount)));
        const total = yield* Ref.get(callCount);
        assertTrue(total >= 2);
      }),
    );

    ctx.effect("returns pass:false when all attempts produce invalid lam", () =>
      Effect.gen(function* () {
        const cfg = { ...defaultConfig(), maxDepth: 1 };
        const result = yield* rlmEval(task, undefined, cfg).pipe(Effect.provide(mockLmLayer(["7", "INVALID_NOT_LAM"])));
        strictEqual(result.pass, false);
      }),
    );

    ctx.effect("attempts count is at least 1 after a failed run", () =>
      Effect.gen(function* () {
        const cfg = { ...defaultConfig(), maxDepth: 2 };
        const result = yield* rlmEval(task, undefined, cfg).pipe(
          Effect.provide(mockLmLayer(["7", "bad", "bad", "bad"])),
        );
        assertTrue(result.attempts >= 1);
      }),
    );

    ctx.effect("total LLM calls bounded by maxDepth + 2", () =>
      Effect.gen(function* () {
        const callCount = yield* Ref.make(0);
        const maxDepth = 2;
        const cfg = { ...defaultConfig(), maxDepth };
        yield* rlmEval(task, undefined, cfg).pipe(Effect.provide(mockLmLayerCounting(callCount)));
        const total = yield* Ref.get(callCount);
        assertTrue(total <= maxDepth + 2);
      }),
    );

    ctx.effect("result carries the task id", () =>
      Effect.gen(function* () {
        const cfg = { ...defaultConfig(), maxDepth: 0 };
        const result = yield* rlmEval(task, undefined, cfg).pipe(Effect.provide(mockLmLayer(["7", "@main = λf.λx.x"])));
        strictEqual(result.id, task.id);
      }),
    );

    ctx.effect("depth field equals max(plan.depth, maxDepth)", () =>
      Effect.gen(function* () {
        const cfg = { ...defaultConfig(), maxDepth: 3 };
        const result = yield* rlmEval(task, undefined, cfg).pipe(Effect.provide(mockLmLayer(["7", "bad"])));
        strictEqual(result.depth, 3);
      }),
    );
  });
});
