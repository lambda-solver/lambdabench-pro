# LamBench Pro — Evolutionary Workflow Synthesis (Ideas Document)

> **Status:** Architecture Exploration  
> **Date:** 2026-05-04  
> **Scope:** How to evolve from static λ-RLM evaluation into a self-improving, program-synthesis benchmark platform using evolutionary strategies (GEPA, ES) over composable workflows.  
> **References:** `apps/server/src/rlm/`, `apps/server/src/check/`, `apps/server/src/services/`, `reference/motel/`, `reference/effect-smol/`

---

## 1. Vision

**Current state:** LamBench Pro evaluates LLMs on lambda-calculus tasks using a fixed λ-RLM pipeline (task detection → analytical planning → Φ combinator chain → self-correction). The pipeline is hand-engineered and domain-specific.

**Target state:** A streaming evaluation platform where:
1. **Evals arrive as input/output pairs** with descriptions (like LAMBADA-style tasks or unit tests).
2. **A program synthesizer** builds candidate workflows by composing functions (Split, Map, Filter, LLM-call, Oracle-check, Merge, etc.).
3. **An evolutionary loop** (GEPA / CMA-ES / genetic programming) refines the best workflows over generations.
4. **Workflows become more abstract** over time — they discover reusable subroutines, prompt templates, and decomposition strategies that generalize across tasks.
5. **The system itself improves** — the evolutionary process is also a benchmark; we measure which strategies produce the most generalizable programs.

This is **program synthesis via evolutionary computation**, where the search space is not code tokens but **workflow topologies + node parameters**.

---

## 2. Core Concepts

### 2.1 Workflow as a Program

A **workflow** is a directed acyclic graph (DAG) of **nodes**. Each node is either:

| Node Type | Role | Example |
|-----------|------|---------|
| **Leaf** | LLM call with a prompt template | `llm_solve(task_prompt)` |
| **Transform** | Pure function on data | `split_text(k)`, `extract_code()`, `parse_json()` |
| **Compose** | Aggregation over multiple inputs | `select_best(results[])` , `majority_vote(results[])` |
| **Oracle** | Domain-specific verifier | `lam_check(submission)` , `unit_test_run(code)` |
| **Meta** | Control flow | `retry_until_pass(max_n)`, `branch_on_type(task_type)` |

**Key insight from λ-RLM:** The existing `executeΦ` function in `LambdaRlm.ts` is already a workflow engine:
```
Φ(P, depth) = if leaf: LLM(P) → Oracle(P, submission)
              else: Split(P, k) → Map(Φ, chunks) → selectBest(results)
```
This is a **recursive workflow** with a fixed topology. We want to make the topology itself evolvable.

### 2.2 Genome = Workflow Topology + Node Parameters

The **genome** encodes everything needed to reconstruct a workflow:

```typescript
type Genome = {
  /** Unique identifier for this genome */
  readonly id: string;
  /** Generation number */
  readonly generation: number;
  /** DAG topology as adjacency list */
  readonly topology: ReadonlyArray<Edge>;
  /** Per-node configuration (prompt templates, k values, model IDs, etc.) */
  readonly nodeParams: ReadonlyRecord<string, NodeParams>;
  /** Fitness score from last evaluation (cached) */
  readonly fitness?: FitnessVector;
  /** Lineage: parent genome IDs + operator used */
  readonly lineage: Lineage;
};

type Edge = {
  readonly from: NodeId;
  readonly to: NodeId;
  /** Which output port of 'from' feeds which input port of 'to' */
  readonly portMapping: PortMapping;
};
```

**Topology constraints:**
- Exactly one **Source** node (receives task input)
- Exactly one **Sink** node (produces final result)
- No cycles (DAG)
- All intermediate nodes must be reachable from Source and reach Sink

### 2.3 Phenotype = Executable Effect Program

The **phenotype** is the realized Effect program produced by compiling a genome:

```typescript
type CompiledWorkflow = Effect.Effect<
  WorkflowResult,
  WorkflowError,
  WorkflowRequirements  // LanguageModel | FileSystem | etc.
>;
```

Compilation traverses the DAG and wires nodes using `Effect.gen` and `Effect.all`:
- Sequential edges → `yield*` (generator sequencing)
- Parallel edges (Map) → `Effect.all(children, { concurrency: k })`
- Retry edges → `Effect.retry` or `Effect.suspend` loop

This leverages Effect's **structured concurrency** and **error channels** natively.

### 2.4 Streaming Evals

Evaluations arrive as a stream of **eval specimens**:

```typescript
type EvalSpecimen = {
  readonly id: string;
  readonly description: string;        // Natural language task description
  readonly input: unknown;              // Task input (code, text, math problem)
  readonly expectedOutput: unknown;     // Ground truth (for oracle verification)
  readonly domain: string;              // "lambda-calc", "algorithm", "math", etc.
  readonly difficulty: number;          // 1–10, for curriculum learning
  readonly tags: ReadonlyArray<string>;
};
```

These are stored in SQLite (extending the existing `tasks` table in `ResultStore`) and consumed by the evolutionary loop.

---

## 3. Domain Types (Proposed)

### 3.1 Workflow Domain (`packages/domain/src/Workflow.ts`)

```typescript
import { Schema } from "effect";

// ─── Node Definitions ───────────────────────────────────────────────────────

export const NodeType = Schema.Literals([
  "source",      // Entry point: receives task input
  "sink",        // Exit point: produces WorkflowResult
  "llm_call",    // Leaf: calls LanguageModel.generateText
  "transform",   // Pure data transformation
  "compose",     // Aggregation: selectBest, majorityVote, merge
  "oracle",      // Domain verifier: lam_check, unit_test
  "branch",      // Conditional routing
  "loop",        // Retry / iterate until condition
]);

export const LlmCallParams = Schema.Struct({
  promptTemplate: Schema.String,        // e.g., "Solve: {{taskDesc}}\n{{input}}"
  modelId: Schema.String,               // "openai/gpt-4o", "anthropic/claude-3-5-sonnet"
  maxTokens: Schema.Number,
  temperature: Schema.Number,           // Mutable parameter for evolution
  systemPrompt: Schema.optional(Schema.String),
});

export const TransformParams = Schema.Struct({
  operation: Schema.Literals([
    "split_text", "extract_code", "parse_json",
    "count_tokens", "truncate", "join"
  ]),
  config: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export const ComposeParams = Schema.Struct({
  strategy: Schema.Literals([
    "select_best",      // Choose highest-scoring result
    "majority_vote",    // Most common answer
    "merge_concat",     // Concatenate partials
    "merge_summarize",  // LLM-based summary of partials
  ]),
  // For select_best: which metric to optimize
  metric: Schema.optional(Schema.Literals(["pass", "score", "bits", "speed"])),
});

export const OracleParams = Schema.Struct({
  oracleType: Schema.Literals([
    "lam_run",          // Existing lambda calculus checker
    "unit_test",        // Run code against test cases
    "exact_match",      // String equality
    "semantic_similarity", // Embedding-based similarity
  ]),
  config: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export const BranchParams = Schema.Struct({
  condition: Schema.Literals([
    "task_type",        // Route based on detected task type
    "input_size",       // Route based on input length
    "confidence",       // Route based on LLM confidence score
    "custom",           // Evaluated by a small classifier LLM call
  ]),
  branches: Schema.Array(Schema.String), // Target node IDs
});

export const LoopParams = Schema.Struct({
  maxIterations: Schema.Number,
  condition: Schema.Literals([
    "until_pass",       // Retry until oracle passes
    "until_no_improvement", // Retry until score stops improving
    "fixed_n",          // Exactly N iterations
  ]),
});

export const NodeParams = Schema.Union(
  LlmCallParams,
  TransformParams,
  ComposeParams,
  OracleParams,
  BranchParams,
  LoopParams,
);

// ─── Genome ─────────────────────────────────────────────────────────────────

export const Edge = Schema.Struct({
  from: Schema.String,
  to: Schema.String,
  fromPort: Schema.optional(Schema.String),
  toPort: Schema.optional(Schema.String),
});

export const Genome = Schema.Struct({
  id: Schema.String,
  generation: Schema.Number,
  topology: Schema.Array(Edge),
  nodes: Schema.Record(Schema.String, NodeParams),
  fitness: Schema.optional(FitnessVector),
  lineage: Lineage,
});

// ─── Fitness ────────────────────────────────────────────────────────────────

export const FitnessVector = Schema.Struct({
  passRate: Schema.Number,        // % of tasks passed
  avgScore: Schema.Number,        // Normalized score average
  avgBits: Schema.Number,         // Average solution size (lower = better for lambda)
  avgTimeMs: Schema.Number,       // Average wall-clock time
  avgCost: Schema.Number,         // Average API cost per task
  generalization: Schema.Number,  // Performance on unseen tasks vs training tasks
  complexity: Schema.Number,      // Workflow node count (parsimony pressure)
});
```

### 3.2 Population Domain

```typescript
export const Population = Schema.Struct({
  id: Schema.String,
  generation: Schema.Number,
  /** All genomes in this generation */
  genomes: Schema.Array(Genome),
  /** Pareto frontier indices (non-dominated solutions) */
  paretoIndices: Schema.Array(Schema.Number),
  /** Hypervolume indicator for this generation */
  hypervolume: Schema.Number,
  /** Eval specimens used for fitness evaluation */
  evalSetId: Schema.String,
  createdAt: Schema.String,
});
```

### 3.3 Execution Trace Domain

For debugging and learning from evolution, persist every workflow execution:

```typescript
export const ExecutionTrace = Schema.Struct({
  traceId: Schema.String,
  genomeId: Schema.String,
  specimenId: Schema.String,
  /** Per-node execution results */
  nodeExecutions: Schema.Array(Schema.Struct({
    nodeId: Schema.String,
    nodeType: NodeType,
    input: Schema.Unknown,
    output: Schema.Unknown,
    elapsedMs: Schema.Number,
    error: Schema.optional(Schema.String),
  })),
  finalResult: WorkflowResult,
  totalElapsedMs: Schema.Number,
  totalCost: Schema.Number,
});
```

---

## 4. Architecture

### 4.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVAL STREAM (Input/Output Pairs)                      │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│     │ Task A  │  │ Task B  │  │ Task C  │  │ Task D  │  │  ...    │        │
│     └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
└──────────┼────────────┼────────────┼────────────┼────────────┼──────────────┘
           │            │            │            │            │
           ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TASK SERVICE (SQLite)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ tasks table  │  │ eval_sets    │  │ ref_bits     │  │ task_embeddings  │ │
│  │ (existing)   │  │ (groupings)  │  │ (existing)   │  │ (new: for sim)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │            ▲
           │            │ curriculum: easy → hard
           ▼            │
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVOLUTIONARY ENGINE (Effect Service)                     │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │  Population     │───▶│  Selection      │───▶│  Variation Operators    │  │
│  │  Service        │    │  Service        │    │  (Crossover, Mutation)  │  │
│  │                 │◀───│                 │◀───│                         │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│           │                                                             │   │
│           ▼                                                             │   │
│  ┌─────────────────────────────────────────────────────────────────────┐│   │
│  │  Fitness Service                                                    ││   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ ││   │
│  │  │ Compile     │  │ Execute     │  │ Score       │  │ Aggregate  │ ││   │
│  │  │ Genome →    │  │ Workflow    │  │ (Oracle)    │  │ (Multi-    │ ││   │
│  │  │ Effect DAG  │  │ on Task     │  │             │  │ objective) │ ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ ││   │
│  └─────────────────────────────────────────────────────────────────────┘│   │
│           │                                                             │   │
│           ▼                                                             │   │
│  ┌─────────────────────────────────────────────────────────────────────┐│   │
│  │  Generation Loop (Effect.suspend tail recursion)                     ││   │
│  │                                                                      ││   │
│  │  while (not converged) {                                             ││   │
│  │    parents = select(population, strategy="tournament")               ││   │
│  │    offspring = crossover(parents) + mutate(offspring)                ││   │
│  │    fitness = evaluate(offspring, eval_set)                           ││   │
│  │    population = replace(population, offspring, strategy="elite")     ││   │
│  │    persist(generation, population, pareto_frontier)                  ││   │
│  │  }                                                                   ││   │
│  └─────────────────────────────────────────────────────────────────────┘│   │
└─────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESULT STORE (SQLite)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ genomes      │  │ populations  │  │ fitness_hist │  │ execution_traces │ │
│  │ (DAG JSON)   │  │ (metadata)   │  │ (per-genome) │  │ (per-run)        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HTTP API + CLIENT UI                                  │
│                                                                              │
│  GET  /api/workflows                → List best workflows per domain        │
│  GET  /api/workflows/:id            → Genome + fitness details              │
│  POST /api/evolve/start             → Start evolution with config           │
│  GET  /api/evolve/:id/status        → Generation progress, hypervolume      │
│  GET  /api/evolve/:id/population    → Current population + Pareto frontier  │
│  POST /api/workflows/:id/run        → Run a workflow on a task              │
│  GET  /api/traces/:id               → Execution trace visualization         │
│                                                                              │
│  UI: Real-time evolution viewer (React + Effect Atom)                        │
│      - Live Pareto frontier plot (score vs cost vs complexity)               │
│      - Workflow DAG visualization (interactive, collapsible)                 │
│      - Generation-over-generation improvement curves                         │
│      - Heatmap: which nodes appear in top-10% workflows                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Service Layer Design

Inspired by the existing `ServiceMap.Service` pattern in `apps/server/src/services/`:

#### `EvolutionService` — Orchestrates the Generational Loop

```typescript
export class EvolutionService extends ServiceMap.Service<
  EvolutionService,
  {
    /** Initialize a new evolutionary run */
    initialize(config: EvolutionConfig): Effect.Effect<EvolutionRun, never>;
    /** Run one generation (selection → variation → evaluation → replacement) */
    step(runId: string): Effect.Effect<GenerationResult, EvolutionError>;
    /** Resume a paused evolutionary run */
    resume(runId: string): Effect.Effect<void, EvolutionError>;
    /** Get current population and Pareto frontier */
    getPopulation(runId: string): Effect.Effect<Population, never>;
    /** Get best genome by a specific metric */
    getBest(runId: string, metric: FitnessMetric): Effect.Effect<Genome | null, never>;
  }
>()("lambench/EvolutionService") {}
```

**Key design decision:** The generational loop uses `Effect.suspend` for tail recursion (same pattern as `LambdaRlm.ts` `selfCorrect`), not `while` or `for` loops inside `Effect.gen`.

#### `GenomeCompiler` — Compiles Genome → Effect DAG

```typescript
export class GenomeCompiler extends ServiceMap.Service<
  GenomeCompiler,
  {
    compile(genome: Genome): Effect.Effect<CompiledWorkflow, CompileError>;
    /** Validate topology (DAG, connected, typed ports) */
    validate(genome: Genome): Effect.Effect<void, ValidationError>;
    /** Pretty-print a genome as a Mermaid diagram */
    toMermaid(genome: Genome): string;
  }
>()("lambench/GenomeCompiler") {}
```

#### `FitnessEvaluator` — Multi-Objective Fitness

```typescript
export class FitnessEvaluator extends ServiceMap.Service<
  FitnessEvaluator,
  {
    evaluate(
      genome: Genome,
      specimens: ReadonlyArray<EvalSpecimen>,
    ): Effect.Effect<FitnessVector, FitnessError>;
    /** Compute Pareto frontier from a population */
    paretoFront(population: Population): Effect.Effect<ReadonlyArray<number>, never>;
    /** Hypervolume indicator for diversity tracking */
    hypervolume(frontier: ReadonlyArray<Genome>): Effect.Effect<number, never>;
  }
>()("lambench/FitnessEvaluator") {}
```

#### `VariationOperator` — Crossover + Mutation

```typescript
export class VariationOperator extends ServiceMap.Service<
  VariationOperator,
  {
    /** Combine two parent genomes into one or more offspring */
    crossover(parents: [Genome, Genome]): Effect.Effect<ReadonlyArray<Genome>, never>;
    /** Stochastically modify a genome */
    mutate(genome: Genome, rate: number): Effect.Effect<Genome, never>;
    /** Random initialization for generation 0 */
    randomInit(config: InitConfig): Effect.Effect<Genome, never>;
  }
>()("lambench/VariationOperator") {}
```

---

## 5. Evolutionary Strategies

### 5.1 GEPA (Genetic Evolutionary Prompting Algorithm)

GEPA is a **genetic programming** approach where:
- **Individuals** are prompt templates or workflow topologies
- **Fitness** is task pass rate on an eval set
- **Crossover** swaps subtrees between workflow DAGs
- **Mutation** randomly changes:
  - Node type (e.g., `llm_call` → `branch`)
  - Edge connections (rewire topology)
  - Node parameters (temperature, model ID, prompt text)
  - Add/remove nodes

**Node mutation examples:**
```typescript
// Temperature mutation (Gaussian noise)
mutateParam("temperature", x => clamp(x + N(0, 0.1), 0, 2))

// Model mutation (swap to similar-capability model)
mutateParam("modelId", x => randomFrom(["gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro"]))

// Prompt mutation (paraphrase via LLM)
mutateParam("promptTemplate", x => llmParaphrase(x))

// Topology mutation (insert a retry loop)
mutateTopology(g => insertNode(g, "loop", between("nodeA", "nodeB")))
```

### 5.2 CMA-ES for Continuous Parameters

For **fixed-topology** workflows where only continuous parameters vary (temperature, k values, maxTokens), use **CMA-ES** (Covariance Matrix Adaptation):
- Much more sample-efficient than genetic programming
- Learns correlations between parameters (e.g., higher temperature → need more retries)
- Can be warm-started from GP-discovered topologies

### 5.3 Coevolution: Workflow × Eval Set

Inspired by **adversarial coevolution**:
- **Population A:** Workflows (getting better at solving tasks)
- **Population B:** Eval specimens (getting harder to defeat top workflows)
- Each generation, the hardest specimens for current top workflows are added to the eval set
- Prevents overfitting to a static benchmark

### 5.4 Curriculum Learning

Instead of evaluating on all tasks every generation:
1. **Generation 0–5:** Easy tasks only (difficulty ≤ 3)
2. **Generation 6–15:** Medium tasks added (difficulty ≤ 6)
3. **Generation 16+:** Full task suite

This mirrors how human engineers learn — master simple cases before tackling hard ones.

---

## 6. Effect-TS Integration Patterns

### 6.1 Workflow Compilation

The GenomeCompiler turns a DAG into nested `Effect` expressions. For the existing λ-RLM Φ chain:

```typescript
// Genome topology:
// source → split(k=3) → [llm_call, llm_call, llm_call] → select_best → sink

// Compiled Effect:
const compiled = Effect.gen(function* () {
  const input = yield* sourceNode();           // Get task
  const chunks = splitText(input, 3);          // Transform
  const partials = yield* Effect.all(          // Parallel Map
    chunks.map(chunk =>
      Effect.suspend(() => llmNode(chunk))     // Leaf LLM calls
    ),
    { concurrency: 3 }
  );
  const best = selectBest(partials);           // Compose
  return best;                                 // Sink
});
```

**Key patterns from `LambdaRlm.ts`:**
- `Effect.suspend` for lazy recursion (avoids eager evaluation / stack overflow)
- `Effect.all` with `{ concurrency }` for parallel branches
- `Effect.catchIf` + `absorbToCheckResult` for graceful degradation

### 6.2 Durable Evolution Runs

For long-running evolutionary searches (potentially hours/days), use **Effect's unstable workflow module** (`Effect.unstable.workflow`):

```typescript
import * as Workflow from "effect/unstable/workflow";

// Each generation step is a durable activity
const generationStep = Workflow.Activity.make("generationStep", {
  input: Schema.Struct({ runId: Schema.String, generation: Schema.Number }),
  output: Schema.Struct({ population: Population, hypervolume: Schema.Number }),
  run: ({ runId, generation }) =>
    Effect.gen(function* () {
      const evo = yield* EvolutionService;
      const result = yield* evo.step(runId);
      return result;
    }),
});

// The workflow engine memoizes activity results by (executionId, activityName, attempt)
// If the process crashes, resume replays the workflow from the last completed activity
```

**Alternative (simpler):** Application-level checkpointing in SQLite:
```typescript
const checkpoint = (runId: string, generation: number, population: Population) =>
  ResultStore.insertCheckpoint({ runId, generation, population: JSON.stringify(population) });

const resume = (runId: string) =>
  Effect.gen(function* () {
    const last = yield* ResultStore.getLastCheckpoint(runId);
    if (last) return { generation: last.generation, population: JSON.parse(last.population) };
    return yield* initialize(runId);
  });
```

### 6.3 Observability

Leverage Effect's built-in tracing:

```typescript
// Each workflow execution gets a span
const executeWorkflow = Effect.fn("executeWorkflow")(function* (genome, specimen) {
  yield* Effect.logAnnotate("genomeId", genome.id);
  yield* Effect.logAnnotate("specimenId", specimen.id);
  yield* Effect.logAnnotate("generation", genome.generation);
  // ... execution
});

// Traces show up in the TUI / OpenTelemetry collector
// Per-node timing, error rates, LLM token usage
```

### 6.4 Concurrency Control

The existing `BatchService.ts` pattern with `Ref` for mutable counters extends to evolution:

```typescript
const runGeneration = Effect.gen(function* () {
  const completedRef = yield* Ref.make(0);
  const total = population.genomes.length * evalSet.length;

  yield* Effect.forEach(
    population.genomes,
    (genome) =>
      Effect.gen(function* () {
        const fitness = yield* evaluateGenome(genome, evalSet);
        yield* Ref.update(completedRef, n => n + evalSet.length);
        const completed = yield* Ref.get(completedRef);
        yield* Effect.log(`Progress: ${completed}/${total} evaluations`);
        return fitness;
      }),
    { concurrency: config.parallelism }  // Control LLM API parallelism
  );
});
```

---

## 7. Integration with Existing LamBench Pro

### 7.1 Reuse Existing Infrastructure

| Existing Component | Reuse in Evolution |
|-------------------|-------------------|
| `ResultStore` (SQLite) | Add tables: `genomes`, `populations`, `fitness_history`, `execution_traces` |
| `TaskService` | Already loads `.tsk` files → use as eval specimen source |
| `Check.ts` / `lamRun` | Use as `oracle` node type for lambda calculus domain |
| `LlmPrompts.ts` | Seed prompt templates for initial population |
| `ModelGuard.ts` | Wrap all LLM calls in `guardedGenerate` (timeout + retry) |
| `OpenRouterClient.ts` | Provide `LanguageModel` layer per-workflow-node |
| `BatchService.ts` | Pattern for generational loop: fork as child fiber, track progress |
| `httpApi.ts` | Add endpoints: `/evolve/*`, `/workflows/*`, `/traces/*` |
| `runtime.ts` | Add `EvolutionServiceLive`, `GenomeCompilerLive`, etc. to Layer merge |

### 7.2 Schema Extensions

Extend `packages/domain/src/Api.ts`:

```typescript
export const EvolveGroup = HttpApiBuilder.group("EvolveGroup", (g) =>
  g
    .post("/evolve/start", { payload: Schema.Struct({ config: EvolutionConfig }) })
    .get("/evolve/:id/status", { path: Schema.Struct({ id: Schema.String }) })
    .get("/evolve/:id/population", { path: Schema.Struct({ id: Schema.String }) })
    .post("/evolve/:id/pause", { path: Schema.Struct({ id: Schema.String }) })
    .post("/evolve/:id/resume", { path: Schema.Struct({ id: Schema.String }) })
);

export const WorkflowGroup = HttpApiBuilder.group("WorkflowGroup", (g) =>
  g
    .get("/workflows", { query: Schema.Struct({ domain: Schema.optional(Schema.String) }) })
    .get("/workflows/:id", { path: Schema.Struct({ id: Schema.String }) })
    .post("/workflows/:id/run", {
      path: Schema.Struct({ id: Schema.String }),
      payload: Schema.Struct({ specimenId: Schema.String }),
    })
);
```

---

## 8. Implementation Roadmap

### Phase A: Foundation (2–3 weeks)
1. **Domain types** — `Workflow.ts`, `Evolution.ts` schemas in `packages/domain/`
2. **GenomeCompiler** — DAG → Effect compilation (reuse `LambdaRlm.ts` patterns)
3. **Node library** — Implement 5 core node types: `llm_call`, `transform`, `compose`, `oracle`, `branch`
4. **SQLite schema** — Add `genomes`, `populations`, `execution_traces` tables to `ResultStore`

### Phase B: Evolution Engine (2–3 weeks)
1. **Variation operators** — Random init, subtree crossover, parameter mutation
2. **Fitness evaluator** — Multi-objective scoring (pass rate, score, cost, complexity)
3. **Selection strategies** — Tournament, NSGA-II (multi-objective)
4. **Generation loop** — `EvolutionService` with checkpointing

### Phase C: Streaming & UI (2 weeks)
1. **Eval stream ingestion** — HTTP endpoint for streaming eval specimens
2. **Real-time UI** — Pareto frontier plot, workflow DAG viz, generation curves
3. **Trace viewer** — Per-node execution inspection

### Phase D: Advanced Strategies (2–3 weeks)
1. **CMA-ES integration** — For continuous parameter optimization
2. **Coevolution** — Adversarial eval specimen generator
3. **Curriculum learning** — Difficulty-based eval set scheduling
4. **Meta-evolution** — Evolve the variation operators themselves

---

## 9. Open Questions

1. **Genome encoding:** Adjacency list vs. tree-based (for easier crossover)? For DAGs, adjacency list is more natural but crossover is harder.
2. **Type safety:** How to ensure port types match when mutating topology? Use Schema validation at compile time, or dynamic type checking?
3. **LLM cost:** Evaluating a population of 100 genomes × 50 tasks × 3 LLM calls = 15,000 API calls per generation. Need aggressive caching and mock-oracle fallback.
4. **Generalization:** How do we prevent overfitting to the eval set? Hold-out test set + coevolution.
5. **Abstraction discovery:** How do we evolve reusable sub-workflows (functions)? Maybe allow genomes to reference other genomes as subroutines.

---

## 10. Key References from Codebase

| File | Pattern to Adopt |
|------|-----------------|
| `apps/server/src/rlm/LambdaRlm.ts` | `Effect.suspend` recursion, `Effect.all` parallel mapping, `absorbToCheckResult` error handling |
| `apps/server/src/rlm/LambdaPlan.ts` | Analytical planning (k*, τ*, cost estimate) as a node type |
| `apps/server/src/check/Check.ts` | Oracle pattern: `runTask` as domain verifier |
| `apps/server/src/services/BatchService.ts` | `Ref`-based progress tracking, idempotent job execution |
| `apps/server/src/services/ResultStore.ts` | SQLite persistence with WAL, JSON columns for complex types |
| `apps/server/src/llm/ModelGuard.ts` | `guardedGenerate` wrapper for resilient LLM calls |
| `reference/motel/src/services/TelemetryStore.ts` | Worker-thread offload for heavy writes (ingest eval traces) |
| `reference/motel/src/services/AsyncIngest.ts` | Bun Worker + RPC pattern for concurrent evaluation |
| `reference/effect-smol/packages/ai/openrouter/src/OpenRouterLanguageModel.ts` | `LanguageModel.make` for per-node model configuration |

---

## 11. Effect Libraries to Use

| Library | Purpose |
|---------|---------|
| `effect` (core) | `Effect.gen`, `Effect.all`, `Effect.suspend`, `Effect.catch`, `ServiceMap.Service`, `Layer` |
| `@effect/platform-bun` | `BunRuntime`, `BunHttpServer`, `BunServices.layer` |
| `@effect/ai-openrouter` | `LanguageModel` layer factory per-workflow-node |
| `effect/unstable/workflow` | Durable execution for long-running evolutionary searches (optional) |
| `effect/unstable/persistence` | `PersistedQueue` for eval specimen backlog (optional) |
| `@effect/atom-react` | Real-time UI state management (client-side) |
| `@effect/vitest` | Property-based testing for genome compilation, variation operators |
| `bun:sqlite` | Persistence for genomes, populations, traces |

---

*This document is a living architecture exploration. As implementation progresses, refine the schemas, add concrete examples, and update the roadmap based on empirical results from early experiments.*
