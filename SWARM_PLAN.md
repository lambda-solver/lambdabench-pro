# Migrate OpenRouterClient to @effect/ai-openai SDK
Swarm: openrouter-sdk-migration
Phase: 1 [PENDING] | Updated: 2026-04-25T11:42:53.275Z

---
## Phase 1: Replace OpenRouterClient with @effect/ai-openai [PENDING]
- [ ] 1.1: Rewrite apps/server/src/llm/OpenRouterClient.ts to be a thin layer factory: export OpenRouterClient as a Layer.Layer<LanguageModel.LanguageModel, never, HttpClient.HttpClient> that composes OpenAiClient.layer({ apiUrl: 'https://openrouter.ai/api/v1', apiKey: Redacted.make(process.env["OPENROUTER_API_KEY"] ?? "") }) with OpenAiLanguageModel.layer({ model }). The model argument must be passed in at construction time. Keep LlmError and ChatMessage exported for use in the absorb boundaries in LambdaRlm and Check. Remove the complete() service method entirely — callers will use LanguageModel.generateText directly. [MEDIUM]
- [ ] 1.2: Update apps/server/src/index.ts appLayer: call makeOpenRouterLayer(process.env["LLM_MODEL"] ?? "minimax/minimax-m2.5:free") to get the LanguageModel layer. Compose it with BunServices and BunHttpClient in Layer.mergeAll. Remove the old OpenRouterClient.layer reference. [SMALL] (depends: 1.1)

---
## Phase 2: Wire LanguageModel into LambdaRlm and Check [PENDING]
- [ ] 2.1: Update apps/server/src/rlm/LambdaRlm.ts: replace every (yield* OpenRouterClient).complete(modelId, messages) call with yield* LanguageModel.generateText({ prompt: messages[0]!.content }).pipe(Effect.map(r => r.text)). For multi-turn messages, use Prompt.make(messages) as the prompt input. Remove the modelId field from LambdaRlmConfig — model is now baked into the layer. Keep the absorbToCheckResult boundary unchanged (it catches unknown, so AiError is absorbed correctly). Update PhiEffect service requirements: replace OpenRouterClient with LanguageModel.LanguageModel. [MEDIUM] (depends: 1.1)
- [ ] 2.2: Update apps/server/src/check/Check.ts runTaskWithLlm: remove the modelId parameter. Replace (yield* OpenRouterClient).complete(modelId, [...]) with yield* LanguageModel.generateText({ prompt: buildSolvePrompt(task) }).pipe(Effect.map(r => r.text)). The AiError is caught at the existing Effect.catch boundary and replaced with the fallback lambda expression string. Update runAllTasksForModel signature to remove modelId param; update its call sites in ModelEvalRunner. [MEDIUM] (depends: 1.1)
- [ ] 2.3: Update apps/server/src/eval/ModelEvalRunner.ts: inside runModelEval, build a per-model LanguageModel layer with makeOpenRouterLayer(model.modelId) and provide it to the runAllTasksForModel and runRlmForAllTasks calls via Effect.provide. Remove modelId threading from runRlmForAllTasks. This is the correct Effect pattern: compose a fresh layer per evaluation run rather than passing modelId as a parameter. [MEDIUM] (depends: 2.1, 2.2)

---
## Phase 3: Update tests [PENDING]
- [ ] 3.1: Rewrite apps/server/src/llm/OpenRouterClient.test.ts: the old tests intercepted raw HTTP via mockHttpLayer. Replace with a mock LanguageModel layer: Layer.succeed(LanguageModel.LanguageModel, { generateText: () => Effect.succeed(mockResponse), generateObject: ..., streamText: ... }). Test that makeOpenRouterLayer(modelId) returns a Layer<LanguageModel>. Add an integration-style test (skipped by default) that actually calls OpenRouter with OPENROUTER_API_KEY from env. [MEDIUM] (depends: 1.1)
