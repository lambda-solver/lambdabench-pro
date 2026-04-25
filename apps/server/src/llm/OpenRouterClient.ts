/**
 * OpenRouterClient.ts — Layer factory for OpenRouter via @effect/ai-openrouter.
 *
 * Provides a `LanguageModel.LanguageModel` service backed by OpenRouter.
 * Reads `OPENROUTER_API_KEY` via `Config.redacted` so it can be supplied
 * through `ConfigProvider` in tests or from the environment in production.
 *
 * Usage:
 *   const layer = makeOpenRouterLayer("minimax/minimax-m2.5:free")
 *   // layer: Layer<LanguageModel, ConfigError, HttpClient>
 */

import { Config, Layer } from "effect"
import { OpenRouterClient, OpenRouterLanguageModel } from "@effect/ai-openrouter"
import { FetchHttpClient } from "effect/unstable/http"
import type { LanguageModel } from "effect/unstable/ai"

// ─── Re-exports used by absorb boundaries in LambdaRlm and Check ─────────────

/**
 * Typed error for any failure originating from the LLM call chain.
 * Used at absorb boundaries to convert AiError into a failed check result
 * without leaking into the typed error channel.
 */
export class LlmError {
  readonly _tag = "LlmError"
  constructor(readonly message: string) {}
}

/** A single message in an OpenAI-compatible chat conversation. */
export type ChatMessage = {
  readonly role: "user" | "assistant" | "system"
  readonly content: string
}

// ─── Layer factory ────────────────────────────────────────────────────────────

const OpenRouterClientLayer = OpenRouterClient.layerConfig({
  apiKey: Config.redacted("OPENROUTER_API_KEY"),
}).pipe(Layer.provide(FetchHttpClient.layer))

/**
 * Build a `LanguageModel.LanguageModel` layer backed by OpenRouter for the
 * given model ID. Reads `OPENROUTER_API_KEY` via `Config.redacted`.
 *
 * @param model - OpenRouter model identifier, e.g. "nvidia/nemotron-3-super-120b-a12b:free"
 */
export const makeOpenRouterLayer = (model: string) =>
  OpenRouterLanguageModel.layer({
    model,
    config: { max_tokens: 500 },
  }).pipe(Layer.provide(OpenRouterClientLayer))
