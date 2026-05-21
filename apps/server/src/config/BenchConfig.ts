/**
 * BenchConfig.ts — Load and validate bench.config.json.
 *
 * bench.config.json sits at apps/server/bench.config.json (committed to git).
 * The only thing that stays in .env is OPENROUTER_API_KEY.
 *
 * Schema:
 *   models       — model IDs to evaluate (standard + λ-RLM)
 *   rlmMaxDepth  — λ-RLM self-correction depth (default 3)
 *   tasks        — task ID filter; empty array = all tasks
 */

import { Effect, FileSystem, Schema } from "effect";

// ─── Schema ──────────────────────────────────────────────────────────────────

export const BenchConfig = Schema.Struct({
  /** Max concurrent LLM calls per eval variant (default 2) */
  concurrency: Schema.optional(Schema.Number),
  /** Model IDs to evaluate, e.g. ["google/gemini-2.5-pro", "minimax/minimax-m2.5:free"] */
  models: Schema.Array(Schema.String),
  /** λ-RLM self-correction depth (default 3) */
  rlmMaxDepth: Schema.optional(Schema.Number),
  /** Task ID filter — absent or empty array means run all tasks */
  tasks: Schema.optional(Schema.Array(Schema.String)),
});
export type BenchConfig = Schema.Schema.Type<typeof BenchConfig>;

/** BenchConfig with all optional fields resolved to their defaults. */
export interface ResolvedBenchConfig {
  readonly models: ReadonlyArray<string>;
  readonly rlmMaxDepth: number;
  readonly tasks: ReadonlyArray<string>;
  readonly concurrency: number;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

const CONFIG_PATH = new URL("../../bench.config.json", import.meta.url).pathname;

export const loadBenchConfig = Effect.fn("loadBenchConfig")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const text = yield* fs.readFileString(CONFIG_PATH);
  const raw: unknown = JSON.parse(text);
  const cfg = yield* Schema.decodeUnknownEffect(BenchConfig)(raw);
  return {
    concurrency: cfg.concurrency ?? 1,
    models: cfg.models,
    rlmMaxDepth: cfg.rlmMaxDepth ?? 3,
    tasks: cfg.tasks ?? [],
  } satisfies ResolvedBenchConfig;
});
