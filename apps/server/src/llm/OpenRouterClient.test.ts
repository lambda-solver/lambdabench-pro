/**
 * OpenRouterClient.test.ts
 *
 * Unit tests mock at the LanguageModel service level (fast, offline).
 * Integration test uses configLayer to supply the real key inline —
 * skipped when OPENROUTER_API_KEY is absent from process.env.
 */

import { describe, it } from "@effect/vitest"
import { strictEqual, assertTrue } from "@effect/vitest/utils"
import { Effect, Layer, Ref } from "effect"
import { FetchHttpClient } from "effect/unstable/http"
import { LanguageModel } from "effect/unstable/ai"
import { configLayer } from "../test/effect-helpers"
import { LlmError, makeOpenRouterLayer } from "./OpenRouterClient"

// ─── Mock helper ──────────────────────────────────────────────────────────────

const mockLanguageModelLayer = (
  respond: () => Effect.Effect<string, LlmError>,
): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.succeed(LanguageModel.LanguageModel, {
    generateText: (_options: unknown) =>
      respond().pipe(
        Effect.map((text) => ({
          text,
          usage: { inputTokens: 0, outputTokens: 0 },
          toolCalls: [],
          finishReason: "stop" as const,
        })),
      ),
    generateObject: () => Effect.die(new Error("generateObject not mocked")),
    streamText: () => Effect.die(new Error("streamText not mocked")),
  } as unknown as LanguageModel.Service)

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe("LanguageModel mock (OpenRouterClient replacement)", () => {
  it.effect("generateText returns text from mock layer", () =>
    Effect.gen(function* () {
      const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
        Effect.map((r) => r.text),
        Effect.provide(
          mockLanguageModelLayer(() => Effect.succeed("@main = λf.λx.f(x)")),
        ),
      )
      strictEqual(result, "@main = λf.λx.f(x)")
    }),
  )

  it.effect("LlmError is caught by Effect.catch at call site", () =>
    Effect.gen(function* () {
      const result = yield* LanguageModel.generateText({ prompt: "hello" }).pipe(
        Effect.map((r) => r.text),
        Effect.catch((_e) => Effect.succeed("fallback")),
        Effect.provide(
          mockLanguageModelLayer(() =>
            Effect.fail(new LlmError("upstream error")),
          ),
        ),
      )
      strictEqual(result, "fallback")
    }),
  )

  it.effect("LlmError carries the original message", () =>
    Effect.gen(function* () {
      const err = new LlmError("rate limited")
      strictEqual(err.message, "rate limited")
      strictEqual(err._tag, "LlmError")
    }),
  )
})

// ─── Integration test ─────────────────────────────────────────────────────────

const apiKey = process.env["OPENROUTER_API_KEY"]

describe("makeOpenRouterLayer (real OpenRouter)", () => {
  it.effect.skipIf(!apiKey)(
    "generates a non-empty text response",
    () =>
      Effect.gen(function* () {
        const layer = makeOpenRouterLayer("minimax/minimax-m2.5:free").pipe(
          Layer.provide(FetchHttpClient.layer),
        )

        const result = yield* LanguageModel.generateText({
          prompt: "Reply with exactly the word: hello",
        }).pipe(
          Effect.map((r) => r.text),
          Effect.provide(layer),
          Effect.provide(configLayer({ OPENROUTER_API_KEY: apiKey })),
        )
        assertTrue(result.length > 0)
      }),
    60_000,
  )
})
