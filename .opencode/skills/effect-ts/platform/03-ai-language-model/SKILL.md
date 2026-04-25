---
name: 03-ai-language-model
description: Effect-TS 4 AI — LanguageModel.generateText, @effect/ai-openai layer factory, and mocking in tests
license: MIT
compatibility: opencode
---

# AI / LanguageModel

**Packages**: `effect/unstable/ai`, `@effect/ai-openai`
**Version**: `effect@4.0.0-beta.41`, `@effect/ai-openai@4.0.0-beta.41`

## Import paths

```typescript
import { LanguageModel } from "effect/unstable/ai"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { Redacted } from "effect"
```

## LanguageModel service

`LanguageModel.LanguageModel` is a `Context.Service` — inject it via a Layer,
consume it anywhere with `yield* LanguageModel.generateText(...)`.

```typescript
// Generate text — primary usage
const response = yield* LanguageModel.generateText({ prompt: "hello" })
const text: string = response.text

// The prompt field accepts a plain string, Message array, or Prompt object
```

## Building an OpenRouter layer factory

OpenRouter is OpenAI-compatible — point `apiUrl` at it and use any OpenRouter
model ID as the `model`.

```typescript
import { Context, Layer, Redacted } from "effect"
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai"
import { BunHttpClient } from "@effect/platform-bun"
import { LanguageModel } from "effect/unstable/ai"

/**
 * Build a Layer<LanguageModel.LanguageModel, never, never> for the given
 * OpenRouter model ID. Provide BunHttpClient.layer (or FetchHttpClient.layer)
 * before composing into the app layer.
 */
export const makeOpenRouterLayer = (
  model: string,
): Layer.Layer<LanguageModel.LanguageModel, never, never> =>
  OpenAiLanguageModel.layer({ model }).pipe(
    Layer.provide(
      OpenAiClient.layer({
        apiUrl: "https://openrouter.ai/api/v1",
        apiKey: Redacted.make(process.env["OPENROUTER_API_KEY"] ?? ""),
      }),
    ),
    Layer.provide(BunHttpClient.layer),
  )
```

## Wiring in appLayer (index.ts)

```typescript
const appLayer = Layer.mergeAll(
  BunServices.layer,
  BunHttpClient.layer,
  makeOpenRouterLayer(process.env["LLM_MODEL"] ?? "minimax/minimax-m2.5:free").pipe(
    Layer.provide(BunHttpClient.layer),
  ),
)
BunRuntime.runMain(program.pipe(Effect.provide(appLayer)))
```

## Per-model layer in eval runners

When evaluating multiple models, build and provide a fresh layer per run:

```typescript
const llmLayer = makeOpenRouterLayer(model.modelId).pipe(
  Layer.provide(BunHttpClient.layer),
)

const results = yield* runAllTasksForModel(tasks, refBitsMap).pipe(
  Effect.provide(llmLayer),
)
```

## Callers use LanguageModel directly — no modelId parameter

Remove `modelId` from function signatures. The model is baked into the Layer.

```typescript
// ✅ model resolved from context
export const runTaskWithLlm = Effect.fn("runTaskWithLlm")(function* (task: Task) {
  const response = yield* LanguageModel.generateText({
    prompt: buildSolvePrompt(task),
  }).pipe(
    Effect.map((r) => r.text),
    Effect.catch((_e) => Effect.succeed(`fallback // error: ${String(_e)}`)),
  )
  return yield* runTask(task, extractLamCode(response))
})

// ❌ old pattern — don't thread modelId through function signatures
export const runTaskWithLlm = Effect.fn("runTaskWithLlm")(function* (
  task: Task,
  modelId: string,   // ❌ remove this
) { ... })
```

## Effect type requirement

Functions that call `LanguageModel.generateText` require
`LanguageModel.LanguageModel` in their `R` (requirements) parameter:

```typescript
type PhiEffect = Effect.Effect<
  Result,
  never,
  LanguageModel.LanguageModel | FileSystem.FileSystem | Path.Path
>
```

## Mocking in tests

`LanguageModel.LanguageModel` is a plain `Context.Service` — mock it with
`Layer.succeed` or `Layer.effect` like any other service.

```typescript
import { LanguageModel } from "effect/unstable/ai"

const mockLmLayer = (
  responses: ReadonlyArray<string>,
): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const idx = yield* Ref.make(0)
      return {
        generateText: Effect.fnUntraced(function* (_options) {
          const i = yield* Ref.getAndUpdate(idx, (n) => n + 1)
          return {
            text: responses[Math.min(i, responses.length - 1)] ?? "",
            usage: { inputTokens: 0, outputTokens: 0 },
            toolCalls: [],
            finishReason: "stop" as const,
          }
        }),
        generateObject: () => Effect.die(new Error("not mocked")),
        streamText:     () => Effect.die(new Error("not mocked")),
      } as unknown as LanguageModel.Service
    }),
  )

// Usage in tests
const result = await Effect.runPromise(
  myEffect.pipe(
    Effect.provide(mockLmLayer(["@main = λf.λx.f(x)"])),
    Effect.provide(BunFileSystem.layer),
    Effect.provide(Path.layer),
  ),
)
```

## Key facts

- `LanguageModel.generateText` returns `{ text, usage, toolCalls, finishReason }`
- `apiKey` must be `Redacted.make(string)` — never a raw string
- HTTP headers in Effect are **lowercased**: `headers["authorization"]`, not `headers["Authorization"]`
- `@effect/ai-openai` is NOT in `apps/server/package.json` by default — add it when needed:
  `"@effect/ai-openai": "4.0.0-beta.41"`
