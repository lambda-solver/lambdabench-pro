import { Schema } from "effect";

// ============================================================================
// Task
// ============================================================================

export const BenchmarkTest = Schema.Struct({
  input: Schema.String,
  expected: Schema.String,
});
export type BenchmarkTest = Schema.Schema.Type<typeof BenchmarkTest>;

export const BenchmarkTask = Schema.Struct({
  id: Schema.String,
  category: Schema.String,
  categoryName: Schema.String,
  description: Schema.String,
  testCount: Schema.Number,
  /** First 3 tests only (for display) */
  tests: Schema.Array(BenchmarkTest),
});
export type BenchmarkTask = Schema.Schema.Type<typeof BenchmarkTask>;

// ============================================================================
// Category
// ============================================================================

export const BenchmarkCategory = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
});
export type BenchmarkCategory = Schema.Schema.Type<typeof BenchmarkCategory>;

// ============================================================================
// Ranking
// ============================================================================

export const Ranking = Schema.Struct({
  /** Full model id, e.g. "openrouter/google/gemini-2.5-pro" */
  model: Schema.String,
  /** Number of tasks passed */
  right: Schema.Number,
  /** Total tasks in benchmark */
  total: Schema.Number,
  /** Pass rate as formatted string, e.g. "84.2" */
  pct: Schema.String,
  /** Average wall-clock seconds per passing task */
  avgTime: Schema.Number,
  /** ISO timestamp of the evaluation run */
  timestamp: Schema.String,
  /** Per-task pass/fail map: { taskId: boolean } */
  tasks: Schema.Record(Schema.String, Schema.Boolean),
  /** Per-task solution size in bits (passing tasks only) */
  taskBits: Schema.Record(Schema.String, Schema.Number),
  /** Per-task reference solution size in bits */
  taskRefs: Schema.Record(Schema.String, Schema.Number),
  /** Price per 1M output tokens in USD, from OpenRouter API */
  pricePerMOutputTokens: Schema.Number,
  /** True when this ranking was produced by the λ-RLM evaluator */
  rlm: Schema.optional(Schema.Boolean),
  /** Recursion depth used by λ-RLM (0 = single-shot leaf call) */
  rlmDepth: Schema.optional(Schema.Number),
  /** Total LLM calls made by λ-RLM across all tasks */
  rlmAttempts: Schema.optional(Schema.Number),
});
export type Ranking = Schema.Schema.Type<typeof Ranking>;

// ============================================================================
// BenchmarkData  (shape of public/data/results.json)
// ============================================================================

export const BenchmarkData = Schema.Struct({
  rankings: Schema.Array(Ranking),
  tasks: Schema.Array(BenchmarkTask),
  categories: Schema.Array(BenchmarkCategory),
  generatedAt: Schema.String,
});
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>;

// ============================================================================
// ValueEntry  (derived client-side: intelligence / cost)
// ============================================================================

export const ValueEntry = Schema.Struct({
  model: Schema.String,
  /** Pass rate 0–100 */
  passRate: Schema.Number,
  /** Price per 1M output tokens in USD */
  pricePerMOutput: Schema.Number,
  /** passRate / pricePerMOutput  (higher = better value) */
  passPerDollar: Schema.Number,
});
export type ValueEntry = Schema.Schema.Type<typeof ValueEntry>;
