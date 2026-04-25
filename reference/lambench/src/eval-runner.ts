/**
 * eval-runner.ts
 *
 * Fetches the top 2 models from OpenRouter rankings and their pricing.
 * Written in Effect-TS style throughout.
 *
 * Usage:
 *   bun eval-runner.ts                 # prints JSON to stdout
 *   bun eval-runner.ts --out file.json # writes JSON to file
 *
 * Env:
 *   OPENROUTER_API_KEY  (required)
 *   TOP_MODELS          (optional fallback, comma-separated, e.g. "google/gemini-2.5-pro,anthropic/claude-opus-4")
 */

import { Effect, Layer, pipe, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from "effect/unstable/http";
import { writeFileSync } from "fs";

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** A single model entry from GET /api/v1/models */
const OpenRouterModel = Schema.Struct({
  id: Schema.String,
  pricing: Schema.Struct({
    completion: Schema.String, // price per token as string, e.g. "0.000015"
  }),
});

const OpenRouterModelsResponse = Schema.Struct({
  data: Schema.Array(OpenRouterModel),
});

/** Output shape: top model with pricing */
export const TopModel = Schema.Struct({
  modelId: Schema.String,
  pricePerMOutput: Schema.Number, // USD per 1M output tokens
});
export type TopModel = Schema.Schema.Type<typeof TopModel>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse the OpenRouter rankings HTML page and extract ranked model IDs in order. */
const parseRankingsHtml = (html: string): ReadonlyArray<string> => {
  // The rankings page lists models; we extract model IDs from anchor hrefs like /models/provider/name
  const modelPattern = /href="\/models\/([\w-]+\/[\w.-]+)"/g;
  const seen = new Set<string>();
  const ordered: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = modelPattern.exec(html)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
};

// ─── Effects ─────────────────────────────────────────────────────────────────

/** Fetch all models with pricing from OpenRouter API. */
const fetchModels = (apiKey: string) =>
  Effect.gen(function* () {
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

/** Fetch the rankings HTML page to get ordered model IDs. */
const fetchRankings = () =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const request = HttpClientRequest.get(
      "https://openrouter.ai/rankings?view=coding",
    );
    const response = yield* client.execute(request);
    const html = yield* response.text;
    return parseRankingsHtml(html);
  });

/** Get the top N models, merging rankings order with pricing data. */
const getTopModels = (apiKey: string, n: number) =>
  Effect.gen(function* () {
    // Run both fetches concurrently
    const [rankedIds, allModels] = yield* Effect.all(
      [fetchRankings(), fetchModels(apiKey)],
      { concurrency: 2 },
    );

    // Build a price lookup by model id
    const priceMap = new Map(
      allModels.map((m) => [
        m.id,
        parseFloat(m.pricing.completion) * 1_000_000, // per-token → per-1M
      ]),
    );

    // Resolve top N from ranked list (only models that appear in /api/v1/models)
    const top: TopModel[] = [];
    for (const id of rankedIds) {
      if (top.length >= n) break;
      const price = priceMap.get(id);
      if (price !== undefined) {
        top.push({ modelId: id, pricePerMOutput: price });
      }
    }

    // If ranking page gave fewer than n, fill from models sorted by some heuristic
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

    return top;
  });

/** Fallback: parse TOP_MODELS env var. */
const topModelsFromEnv = (env: string): ReadonlyArray<TopModel> =>
  env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((modelId) => ({ modelId, pricePerMOutput: 0 }));

// ─── Dev-mode mock data ───────────────────────────────────────────────────────

/** Mock top-models used when DEV_MODE=true — no credentials needed. */
const DEV_MOCK_MODELS: ReadonlyArray<TopModel> = [
  { modelId: "google/gemini-2.5-pro", pricePerMOutput: 10.0 },
  { modelId: "anthropic/claude-opus-4", pricePerMOutput: 15.0 },
];

// ─── Program ─────────────────────────────────────────────────────────────────

/** Resolve the top models from whichever source is available. */
const resolveTopModels = (
  devMode: boolean,
  apiKey: string | undefined,
  fallbackEnv: string | undefined,
): Effect.Effect<ReadonlyArray<TopModel>, Error, HttpClient.HttpClient> => {
  if (devMode) {
    return Effect.andThen(
      Effect.log(
        "[dev] DEV_MODE=true — using mock top-models, skipping live fetch",
      ),
      Effect.succeed(DEV_MOCK_MODELS),
    );
  }
  if (!apiKey) {
    if (!fallbackEnv) {
      return Effect.fail(
        new Error(
          "OPENROUTER_API_KEY not set and no TOP_MODELS fallback provided.\n" +
            "  Tip: set DEV_MODE=true in .env to use mock data without credentials.",
        ),
      );
    }
    return Effect.succeed(topModelsFromEnv(fallbackEnv));
  }
  return getTopModels(apiKey, 2).pipe(
    Effect.catchAll((e) =>
      fallbackEnv
        ? Effect.succeed(topModelsFromEnv(fallbackEnv))
        : Effect.fail(e instanceof Error ? e : new Error(String(e))),
    ),
  );
};

const program = Effect.gen(function* () {
  const devMode = process.env.DEV_MODE === "true";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const fallbackEnv = process.env.TOP_MODELS;
  const outFlag = process.argv.indexOf("--out");
  const outFile = outFlag >= 0 ? process.argv[outFlag + 1] : undefined;

  const top = yield* resolveTopModels(devMode, apiKey, fallbackEnv);
  const json = JSON.stringify(top, null, 2);

  if (outFile) {
    writeFileSync(outFile, json);
    yield* Effect.log(`Written top models to ${outFile}`);
  } else {
    process.stdout.write(json + "\n");
  }
});

const runnable = program.pipe(Effect.provide(FetchHttpClient.layer));

if (import.meta.main) {
  Effect.runPromise(runnable).catch((e) => {
    process.stderr.write("error: " + (e?.message ?? String(e)) + "\n");
    process.exit(1);
  });
}

export {
  fetchModels,
  fetchRankings,
  getTopModels,
  parseRankingsHtml,
  topModelsFromEnv,
};
