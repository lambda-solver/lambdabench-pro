/**
 * LambdaPlan.ts — λ-RLM planning algorithm.
 *
 * Computes the optimal decomposition plan for a given input size:
 *   k* = ⌈√(n · c_in / c_⊕)⌉   — minimises T(n) = k·T(n/k) + C_⊕(k)
 *   d  = ⌈log_k*(n/K)⌉          — recursion depth
 *   τ* = min(K, ⌊n/k*⌋)         — leaf chunk size
 *   Ĉ  = k*^d·C(τ*) + d·C_⊕(k*) + C(500)  — cost estimate
 *
 * Pure functions are wrapped in Effect.sync so all call sites can yield*
 * consistently without switching between effect and non-effect styles.
 */

// ─── Task types ───────────────────────────────────────────────────────────────

/** Classification of the input task, used to select the ⊕ operator and pipeline. */
export enum TaskType {
  SUMMARIZATION = "summarization",
  QA = "qa",
  TRANSLATION = "translation",
  CLASSIFICATION = "classification",
  EXTRACTION = "extraction",
  ANALYSIS = "analysis",
  GENERAL = "general",
}

// ─── Composition operators (⊕) ────────────────────────────────────────────────

/** The reduction operator applied when merging partial results from child nodes. */
export enum ComposeOp {
  CONCATENATE = "concatenate",
  MERGE_SUMMARIES = "merge_summaries",
  SELECT_RELEVANT = "select_relevant",
  MAJORITY_VOTE = "majority_vote",
  MERGE_EXTRACTIONS = "merge_extractions",
  COMBINE_ANALYSIS = "combine_analysis",
}

/** Maps each TaskType to its canonical composition operator. */
export const COMPOSITION_TABLE: Record<TaskType, ComposeOp> = {
  [TaskType.SUMMARIZATION]: ComposeOp.MERGE_SUMMARIES,
  [TaskType.QA]: ComposeOp.SELECT_RELEVANT,
  [TaskType.TRANSLATION]: ComposeOp.CONCATENATE,
  [TaskType.CLASSIFICATION]: ComposeOp.MAJORITY_VOTE,
  [TaskType.EXTRACTION]: ComposeOp.MERGE_EXTRACTIONS,
  [TaskType.ANALYSIS]: ComposeOp.COMBINE_ANALYSIS,
  [TaskType.GENERAL]: ComposeOp.MERGE_SUMMARIES,
};

/** Relative cost weight of one ⊕ reduction step (c_⊕ in the cost formula). */
export const C_COMPOSE: Record<ComposeOp, number> = {
  [ComposeOp.CONCATENATE]: 0.01,
  [ComposeOp.MERGE_SUMMARIES]: 2.0,
  [ComposeOp.SELECT_RELEVANT]: 1.5,
  [ComposeOp.MAJORITY_VOTE]: 0.05,
  [ComposeOp.MERGE_EXTRACTIONS]: 0.05,
  [ComposeOp.COMBINE_ANALYSIS]: 2.0,
};

/** Relative cost per input character (c_in in the cost formula). */
export const C_IN = 1.0;

// ─── Pipeline flags ───────────────────────────────────────────────────────────

/** Controls which optional combinators are included in the Φ chain. */
export type PipelineFlags = {
  /** When true, a relevance Filter step is inserted before Map(Φ). */
  readonly useFilter: boolean;
};

/** Maps each TaskType to its pipeline configuration. */
export const PLAN_TABLE: Record<TaskType, PipelineFlags> = {
  [TaskType.SUMMARIZATION]: { useFilter: false },
  [TaskType.QA]: { useFilter: true },
  [TaskType.TRANSLATION]: { useFilter: false },
  [TaskType.CLASSIFICATION]: { useFilter: false },
  [TaskType.EXTRACTION]: { useFilter: true },
  [TaskType.ANALYSIS]: { useFilter: false },
  [TaskType.GENERAL]: { useFilter: false },
};

// ─── Task detection ───────────────────────────────────────────────────────────

/** Maps digit responses (1–7) from the Phase 2 probe to TaskType values. */
export const TASK_DIGIT_MAP: Record<number, TaskType> = {
  1: TaskType.SUMMARIZATION,
  2: TaskType.QA,
  3: TaskType.TRANSLATION,
  4: TaskType.CLASSIFICATION,
  5: TaskType.EXTRACTION,
  6: TaskType.ANALYSIS,
  7: TaskType.GENERAL,
};

/**
 * Parse the first digit from a Phase 2 LLM probe response and map to TaskType.
 * Falls back to GENERAL when no valid digit is found.
 */
export const parseTaskType = (response: string): TaskType => {
  const digit = response.split("").find((ch) => /\d/.test(ch));
  if (digit === undefined) return TaskType.GENERAL;
  return TASK_DIGIT_MAP[parseInt(digit, 10)] ?? TaskType.GENERAL;
};

// ─── LambdaPlan ───────────────────────────────────────────────────────────────

/** Result of Phase 3 optimal planning. All fields are read-only. */
export type LambdaPlan = {
  readonly taskType: TaskType;
  readonly composeOp: ComposeOp;
  readonly pipeline: PipelineFlags;
  /** Optimal branching factor k*. */
  readonly kStar: number;
  /** Leaf chunk size τ* (chars). */
  readonly tauStar: number;
  /** Recursion depth d = ⌈log_k*(n/K)⌉. Always 0 for lambda tasks. */
  readonly depth: number;
  /** Relative cost estimate Ĉ. */
  readonly costEstimate: number;
  /** Total input length n (chars). */
  readonly n: number;
};

// ─── plan() ───────────────────────────────────────────────────────────────────

/**
 * Resolve the initial kStar from the cost-minimisation formula.
 *   k* = ⌈√(n · c_in / c_⊕)⌉  (expensive ⊕)
 *   k* = ⌈n / K⌉               (near-free ⊕, flat fan-out)
 * Capped at K_STAR_MAX=20 to avoid exponential leaf blowup.
 */
const initialKStar = (n: number, K: number, cCompose: number): number => {
  const K_STAR_MAX = 20;
  return cCompose > 0.1
    ? Math.min(K_STAR_MAX, Math.max(2, Math.ceil(Math.sqrt((n * C_IN) / cCompose))))
    : Math.min(K_STAR_MAX, Math.max(2, Math.ceil(n / K)));
};

/** Compute depth d = ⌈log_{k*}(n/K)⌉ for a given kStar. */
const computeDepth = (n: number, K: number, kStar: number): number =>
  Math.max(1, Math.ceil(Math.log(n / K) / Math.log(kStar)));

/**
 * Advance kStar by 1 until the accuracy constraint is satisfied or the
 * ceiling is reached. Pure tail recursion — no while loop, no mutation.
 */
const satisfyAccuracyConstraint = (
  kStar: number,
  d: number,
  n: number,
  K: number,
  aLeaf: number,
  aCompose: number,
  accuracyTarget: number,
): { kStar: number; d: number } => {
  const maxK = Math.max(2, Math.floor(n / K));
  if (Math.pow(aLeaf, d) * Math.pow(aCompose, d) >= accuracyTarget || kStar >= maxK) {
    return { kStar, d };
  }
  const nextK = kStar + 1;
  return satisfyAccuracyConstraint(
    nextK,
    computeDepth(n, K, nextK),
    n, K, aLeaf, aCompose, accuracyTarget,
  );
};

/**
 * Phase 3 — compute k*, τ*, d analytically (0 LLM calls).
 *
 * Minimises T(n) = k·T(n/k) + C_⊕(k):
 *   k* = ⌈√(n · c_in / c_⊕)⌉   (capped at 20)
 *
 * Subject to accuracy constraint A(K)^d · A_⊕^d ≥ α:
 *   increments k* (reducing d) until satisfied or k* hits the ceiling.
 *
 * τ* = min(K, ⌊n/k*⌋)
 * Ĉ  = k*^d · C(τ*) + d · C_⊕(k*) + C(500)  [probe cost included]
 *
 * Fast-path: when n ≤ K returns depth=0, kStar=1 immediately.
 * This is always triggered for lambda calculus tasks (n < 2KB, K = 100K).
 */
export const plan = (
  taskType: TaskType,
  n: number,
  contextWindowChars = 100_000,
  accuracyTarget = 0.8,
  aLeaf = 0.95,
  aCompose = 0.9,
): LambdaPlan => {
  const K = contextWindowChars;
  const composeOp = COMPOSITION_TABLE[taskType];
  const pipeline = PLAN_TABLE[taskType];
  const cCompose = C_COMPOSE[composeOp];

  // Fast-path: fits in one context window — no splitting needed.
  if (n <= K) {
    return {
      taskType, composeOp, pipeline,
      kStar: 1, tauStar: n, depth: 0,
      costEstimate: C_IN * n + C_IN * 500,
      n,
    };
  }

  const rawKStar = initialKStar(n, K, cCompose);
  const rawD = computeDepth(n, K, rawKStar);
  const { kStar, d } = satisfyAccuracyConstraint(
    rawKStar, rawD, n, K, aLeaf, aCompose, accuracyTarget,
  );

  const tauStar = Math.min(K, Math.max(1, Math.floor(n / kStar)));
  const costEstimate =
    Math.pow(kStar, d) * C_IN * tauStar + d * cCompose * kStar + C_IN * 500;

  return { taskType, composeOp, pipeline, kStar, tauStar, depth: d, costEstimate, n };
};

// ─── splitText() ─────────────────────────────────────────────────────────────

/**
 * Compute the word-boundary-snapped end position for chunk i.
 * Looks within ±20% of chunkSize for the nearest space.
 */
const snappedEnd = (text: string, start: number, chunkSize: number): number => {
  const raw = start + chunkSize;
  if (raw >= text.length) return text.length;
  const margin = Math.max(1, Math.floor(chunkSize / 5));
  const searchStart = Math.max(start, raw - margin);
  const searchEnd = Math.min(text.length, raw + margin);
  const spaceIdx = text.slice(searchStart, searchEnd).lastIndexOf(" ");
  return spaceIdx > 0 ? searchStart + spaceIdx + 1 : raw;
};

/**
 * Accumulate k chunks via Array.reduce over indices — no mutation, no for loop.
 * Each step appends the next slice and advances the start cursor.
 */
const buildChunks = (
  text: string,
  k: number,
  chunkSize: number,
): ReadonlyArray<string> =>
  Array.from({ length: k }, (_, i) => i).reduce<{
    chunks: string[];
    start: number;
  }>(
    ({ chunks, start }, i) => {
      if (start >= text.length) return { chunks, start };
      if (i === k - 1) return { chunks: [...chunks, text.slice(start)], start: text.length };
      const end = snappedEnd(text, start, chunkSize);
      return { chunks: [...chunks, text.slice(start, end)], start: end };
    },
    { chunks: [], start: 0 },
  ).chunks.filter((c) => c.length > 0);

/**
 * Split text into k approximately equal chunks, snapping boundaries to the
 * nearest word boundary within ±20% of chunk_size.
 *
 * Returns fewer than k chunks when text is shorter than k characters.
 * Never returns empty strings.
 */
export const splitText = (text: string, k: number): ReadonlyArray<string> => {
  if (k <= 1) return [text];
  const chunkSize = Math.max(1, Math.floor(text.length / k));
  return buildChunks(text, k, chunkSize);
};
