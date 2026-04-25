/**
 * EvalRunner.ts — Fetches top models from OpenRouter rankings + pricing.
 *
 * Replaces reference/lambench/src/eval-runner.ts.
 * Uses BunHttpClient instead of FetchHttpClient.
 * DEV_MODE=true returns mock models without credentials.
 */

import { Effect, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const OpenRouterModel = Schema.Struct({
  id: Schema.String,
  pricing: Schema.Struct({
    completion: Schema.String,
  }),
});

const OpenRouterModelsResponse = Schema.Struct({
  data: Schema.Array(OpenRouterModel),
});

export const TopModel = Schema.Struct({
  modelId: Schema.String,
  pricePerMOutput: Schema.Number,
});
export type TopModel = Schema.Schema.Type<typeof TopModel>;

// ─── Errors ──────────────────────────────────────────────────────────────────

export class EvalRunnerError {
  readonly _tag = "EvalRunnerError";
  constructor(readonly message: string) {}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const parseRankingsHtml = (html: string): ReadonlyArray<string> => {
  const pattern = /href="\/models\/([\w-]+\/[\w.-]+)"/g;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const match of html.matchAll(pattern)) {
    const id = match[1]!;
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
};

export const topModelsFromEnv = (env: string): ReadonlyArray<TopModel> =>
  env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((modelId) => ({ modelId, pricePerMOutput: 0 }));

export const DEV_MOCK_MODELS: ReadonlyArray<TopModel> = [
  { modelId: "google/gemini-2.5-pro", pricePerMOutput: 10.0 },
  { modelId: "anthropic/claude-opus-4", pricePerMOutput: 15.0 },
];

// ─── Effects ─────────────────────────────────────────────────────────────────

export const fetchModels = Effect.fn("fetchModels")(function* (apiKey: string) {
  const client = yield* HttpClient.HttpClient;
  const request = HttpClientRequest.get(
    "https://openrouter.ai/api/v1/models",
  ).pipe(
    HttpClientRequest.setHeader("Authorization", `Bearer ${apiKey}`),
    HttpClientRequest.setHeader("Content-Type", "application/json"),
  );
  const response = yield* client.execute(request);
  const body = yield* response.json;
  const decoded = yield* Schema.decodeUnknownEffect(OpenRouterModelsResponse)(
    body,
  );
  return decoded.data;
});

export const fetchRankings = Effect.fn("fetchRankings")(function* () {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.execute(
    HttpClientRequest.get("https://openrouter.ai/rankings?view=coding"),
  );
  const html = yield* response.text;
  return parseRankingsHtml(html);
});

export const getTopModels = Effect.fn("getTopModels")(function* (
  apiKey: string,
  n: number,
) {
  const [rankedIds, allModels] = yield* Effect.all(
    [fetchRankings(), fetchModels(apiKey)],
    { concurrency: 2 },
  );

  const priceMap = new Map(
    allModels.map((m) => [m.id, parseFloat(m.pricing.completion) * 1_000_000]),
  );

  const top: TopModel[] = [];
  for (const id of rankedIds) {
    if (top.length >= n) break;
    const price = priceMap.get(id);
    if (price !== undefined) top.push({ modelId: id, pricePerMOutput: price });
  }

  if (top.length < n) {
    const already = new Set(top.map((m) => m.modelId));
    const fallback = allModels
      .filter((m) => !already.has(m.id))
      .slice(0, n - top.length)
      .map((m) => ({
        modelId: m.id,
        pricePerMOutput: parseFloat(m.pricing.completion) * 1_000_000,
      }));
    top.push(...fallback);
  }

  return top as ReadonlyArray<TopModel>;
});

// ─── Resolver ────────────────────────────────────────────────────────────────

export const resolveTopModels = (
  devMode: boolean,
  apiKey: string | undefined,
  fallbackEnv: string | undefined,
): Effect.Effect<
  ReadonlyArray<TopModel>,
  EvalRunnerError,
  HttpClient.HttpClient
> => {
  if (devMode) {
    return Effect.andThen(
      Effect.log("[dev] DEV_MODE=true — using mock top-models"),
      Effect.succeed(DEV_MOCK_MODELS),
    );
  }
  if (!apiKey) {
    return fallbackEnv
      ? Effect.succeed(topModelsFromEnv(fallbackEnv))
      : Effect.fail(
          new EvalRunnerError(
            "OPENROUTER_API_KEY not set and no TOP_MODELS fallback. Set DEV_MODE=true for local dev.",
          ),
        );
  }
  return getTopModels(apiKey, 2).pipe(
    Effect.catch((e) =>
      fallbackEnv
        ? Effect.succeed(topModelsFromEnv(fallbackEnv))
        : Effect.fail(
            new EvalRunnerError(e instanceof Error ? e.message : String(e)),
          ),
    ),
  );
};
