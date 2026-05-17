import { Effect, Schema } from "effect";

// ============================================================================
// Task
// ============================================================================

export const BenchmarkTest = Schema.Struct({
  expected: Schema.String,
  input: Schema.String,
});
export type BenchmarkTest = Schema.Schema.Type<typeof BenchmarkTest>;

export const BenchmarkTask = Schema.Struct({
  category: Schema.String,
  categoryName: Schema.String,
  description: Schema.String,
  id: Schema.String,
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
  /** Average wall-clock seconds per passing task */
  avgTime: Schema.Number,
  /** Full model id, e.g. "openrouter/google/gemini-2.5-pro" */
  model: Schema.String,
  /** Pass rate as formatted string, e.g. "84.2" */
  pct: Schema.String,
  /** Price per 1M output tokens in USD, from OpenRouter API */
  pricePerMOutputTokens: Schema.Number,
  /** Number of tasks passed */
  right: Schema.Number,
  /** True when this ranking was produced by the λ-RLM evaluator */
  rlm: Schema.optional(Schema.Boolean),
  /** Total LLM calls made by λ-RLM across all tasks */
  rlmAttempts: Schema.optional(Schema.Number),
  /** Recursion depth used by λ-RLM (0 = single-shot leaf call) */
  rlmDepth: Schema.optional(Schema.Number),
  /** Per-task solution size in bits (passing tasks only) */
  taskBits: Schema.Record(Schema.String, Schema.Number),
  /** Per-task reference solution size in bits */
  taskRefs: Schema.Record(Schema.String, Schema.Number),
  /** Per-task pass/fail map: { taskId: boolean } */
  tasks: Schema.Record(Schema.String, Schema.Boolean),
  /** ISO timestamp of the evaluation run */
  timestamp: Schema.String,
  /** Total tasks in benchmark */
  total: Schema.Number,
});
export type Ranking = Schema.Schema.Type<typeof Ranking>;

// ============================================================================
// BenchmarkData  (shape of public/data/results.json)
// ============================================================================

export const BenchmarkData = Schema.Struct({
  categories: Schema.Array(BenchmarkCategory),
  generatedAt: Schema.String,
  rankings: Schema.Array(Ranking),
  tasks: Schema.Array(BenchmarkTask),
});
export type BenchmarkData = Schema.Schema.Type<typeof BenchmarkData>;

// ============================================================================
// ValueEntry  (derived client-side: intelligence / cost)
// ============================================================================

export const ValueEntry = Schema.Struct({
  model: Schema.String,
  /** passRate / pricePerMOutput  (higher = better value) */
  passPerDollar: Schema.Number,
  /** Pass rate 0–100 */
  passRate: Schema.Number,
  /** Price per 1M output tokens in USD */
  pricePerMOutput: Schema.Number,
});
export type ValueEntry = Schema.Schema.Type<typeof ValueEntry>;

// ============================================================================
// EvalResult
// ============================================================================

export const EvalResult = Schema.Struct({
  bits: Schema.Number,
  elapsedMs: Schema.Number,
  errors: Schema.Array(Schema.String),
  model: Schema.String,
  pass: Schema.Boolean,
  score: Schema.Number,
  submission: Schema.String,
  taskId: Schema.String,
  timestamp: Schema.String,
  variant: Schema.Literals(["standard", "rlm", "both"]),
});
export type EvalResult = Schema.Schema.Type<typeof EvalResult>;

// ============================================================================
// BatchJob
// ============================================================================

export const BatchJob = Schema.Struct({
  completedAt: Schema.optional(Schema.String),
  completedTasks: Schema.Number,
  createdAt: Schema.String,
  id: Schema.String,
  results: Schema.Array(EvalResult),
  status: Schema.Literals(["queued", "running", "completed", "failed"]),
  totalTasks: Schema.Number,
});
export type BatchJob = Schema.Schema.Type<typeof BatchJob>;

// ============================================================================
// ModelConfig
// ============================================================================

export const ModelConfig = Schema.Struct({
  displayName: Schema.optional(Schema.String),
  id: Schema.String,
  isActive: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(true)),
  ),
  pricePerMOutput: Schema.optional(Schema.Number),
  provider: Schema.Literals(["openrouter", "opencode-go"]),
});
export type ModelConfig = Schema.Schema.Type<typeof ModelConfig>;
