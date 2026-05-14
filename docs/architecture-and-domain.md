# LamBench Pro — Architecture & Domain Documentation

> **Scope**: This document describes the core domain types, system architecture, component interactions, and main workflows of the LamBench Pro application. It covers the implemented foundation (Phase 1), the HTTP API and local server (Phase 2), and planned future phases (Phases 3–6). No implementation code is included — only structural diagrams and type descriptions.

---

## Table of Contents

1. [Core Domain Types (Schema)](#1-core-domain-types-schema)
2. [Architecture & Components](#2-architecture--components)
3. [Main Workflows](#3-main-workflows)

---

## 1. Core Domain Types (Schema)

The domain is defined in `packages/domain/src/Benchmark.ts` and `packages/domain/src/Api.ts` using **Effect Schema** (Effect 4 beta.41). All types are pure data — no runtime behaviour, no I/O.

### 1.1 Benchmark Domain (`packages/domain/src/Benchmark.ts`)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
classDiagram
    class BenchmarkTest {
        +string input
        +string expected
    }

    class BenchmarkTask {
        +string id
        +string category
        +string categoryName
        +string description
        +number testCount
        +BenchmarkTest[] tests
    }

    class BenchmarkCategory {
        +string id
        +string name
    }

    class Ranking {
        +string model
        +number right
        +number total
        +string pct
        +number avgTime
        +string timestamp
        +Record~string,boolean~ tasks
        +Record~string,number~ taskBits
        +Record~string,number~ taskRefs
        +number pricePerMOutputTokens
        +boolean rlm (optional)
        +number rlmDepth (optional)
        +number rlmAttempts (optional)
    }

    class BenchmarkData {
        +Ranking[] rankings
        +BenchmarkTask[] tasks
        +BenchmarkCategory[] categories
        +string generatedAt
    }

    class ValueEntry {
        +string model
        +number passRate
        +number pricePerMOutput
        +number passPerDollar
    }

    class EvalResult {
        +string taskId
        +string model
        +string variant
        +boolean pass
        +number bits
        +number score
        +string[] errors
        +number elapsedMs
        +string submission
        +string timestamp
    }

    class BatchJob {
        +string id
        +string status
        +string createdAt
        +string completedAt (optional)
        +number totalTasks
        +number completedTasks
        +EvalResult[] results
    }

    class ModelConfig {
        +string id
        +string provider
        +string displayName (optional)
        +number pricePerMOutput (optional)
        +boolean isActive
    }

    BenchmarkData --> Ranking
    BenchmarkData --> BenchmarkTask
    BenchmarkData --> BenchmarkCategory
    BenchmarkTask --> BenchmarkTest
    BatchJob --> EvalResult
```

### 1.2 API Contract Domain (`packages/domain/src/Api.ts`)

The HTTP API is defined schema-first using `effect/unstable/httpapi`. Every endpoint, request body, and response is typed via Effect Schema. Auto-generated OpenAPI spec is available at `/openapi.json`.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
classDiagram
    class SingleEvalRequest {
        +string model
        +string task
        +string variant (default: "standard")
        +string provider (default: "openrouter")
        +number maxTokens (default: 4096)
        +number rlmMaxDepth (default: 3)
        +string mode (default: "direct")
    }

    class BatchEvalRequest {
        +string[] models
        +string[] tasks (default: [])
        +string variant (default: "both")
        +number concurrency (default: 2)
        +string mode (default: "both")
    }

    class HealthStatus {
        +string status
        +string version
        +string db
        +number uptimeSeconds
    }

    class ModelTestRequest {
        +string provider
        +string model
    }

    class ModelTestResponse {
        +number latencyMs
        +boolean ok
    }

    class HealthGroup {
        +GET /api/health → HealthStatus
    }

    class EvalGroup {
        +POST /api/eval/single → SingleEvalRequest → EvalResult
        +POST /api/eval/batch → BatchEvalRequest → BatchJob
        +GET /api/eval/status/:jobId → BatchJob
    }

    class ResultsGroup {
        +GET /api/results → BenchmarkData
        +GET /api/results/:runId → EvalResult
    }

    class TasksGroup {
        +GET /api/tasks → BenchmarkTask[]
        +GET /api/tasks/:taskId → BenchmarkTask
    }

    class ModelsGroup {
        +GET /api/models → ModelConfig[]
        +POST /api/models/test → ModelTestRequest → ModelTestResponse
    }

    class Api {
        +HealthGroup
        +EvalGroup
        +ResultsGroup
        +TasksGroup
        +ModelsGroup
    }
```

### 1.3 SQLite Persistence Domain (`apps/server/src/services/ResultStore.ts`)

The persistence layer uses `bun:sqlite` with WAL mode. Four tables store all domain data.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
erDiagram
    BENCHMARK_RESULTS {
        integer id PK
        text run_id
        text job_id FK
        text task_id
        text model
        text variant
        text provider
        integer pass
        integer bits
        real score
        text errors
        text submission
        integer elapsed_ms
        text timestamp
        datetime created_at
    }

    BATCH_JOBS {
        text id PK
        text status
        text config
        integer total_tasks
        integer completed_tasks
        datetime created_at
        datetime completed_at
    }

    TASKS {
        text id PK
        text category
        text category_name
        text description
        integer test_count
        text tests
        integer ref_bits
        text ref_solution
    }

    MODEL_CONFIGS {
        text id PK
        text provider
        text display_name
        real price_per_m_output
        integer is_active
        datetime created_at
    }

    BENCHMARK_RESULTS ||--o{ BATCH_JOBS : "belongs_to"
```

---

## 2. Architecture & Components

### 2.1 System Context

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 
  'background': '#0a0a0a',
  'primaryColor': '#1e3a5f',
  'primaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'lineColor': '#ffffff',
  'secondaryColor': '#2d1b4e',
  'tertiaryColor': '#1a472a',
  'fontFamily': 'monospace',
  'fontSize': '14px'
}}}%%
flowchart TB
    subgraph Users["👤 Users"]
        DEV["Developer<br/>Runs benchmarks & views UI"]
        AGENT["AI Agent<br/>Queries via MCP (Phase 3)"]
    end

    subgraph Core["🖥️ LamBench Pro"]
        LB["Local Server<br/>SQLite + Effect Services + HTTP API"]
    end

    subgraph External["☁️ External Systems"]
        OR["OpenRouter<br/>LLM Inference API"]
        OCG["OpenCode-Go<br/>User Session Provider"]
    end

    DEV -->|"curl /api/eval/single<br/>Browse leaderboard<br/>GET /api/results"| LB
    AGENT -->|"MCP tool calls (planned)"| LB
    LB -->|"@effect/ai-openrouter"| OR
    LB -->|"Session credentials"| OCG

    style DEV fill:#1e3a5f,stroke:#00f0ff,stroke-width:2px,color:#fff
    style AGENT fill:#1e3a5f,stroke:#00f0ff,stroke-width:2px,color:#fff
    style LB fill:#2d1b4e,stroke:#ff9900,stroke-width:3px,color:#fff
    style OR fill:#1a472a,stroke:#00ff88,stroke-width:2px,color:#fff
    style OCG fill:#1a472a,stroke:#00ff88,stroke-width:2px,color:#fff
    style Users fill:#0f172a,stroke:#334155,stroke-width:1px,color:#94a3b8
    style Core fill:#0f172a,stroke:#334155,stroke-width:1px,color:#94a3b8
    style External fill:#0f172a,stroke:#334155,stroke-width:1px,color:#94a3b8
```

### 2.2 Monorepo Structure

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
graph TB
    subgraph "Monorepo Root"
        direction TB
        ROOT["lambench-pro/"]
    end

    subgraph "Apps"
        direction TB
        CLIENT["apps/client\nReact 19 + Vite + Tailwind\nEffect Atom + Solarized UI"]
        SERVER["apps/server\nBun + Effect 4 + SQLite\nCLI + HTTP API + MCP"]
        MCP["apps/server-mcp\nEffect MCP Server\n(planned Phase 3)"]
    end

    subgraph "Packages"
        direction TB
        DOMAIN["packages/domain\nShared Effect Schemas\nBenchmark.ts + Api.ts"]
        AI["packages/ai\nLanguageModel stubs\n(placeholder)"]
        RAG["packages/rag\nChunking, PDF, Chroma\n(not used by lambench)"]
        OBS["packages/observability\n(placeholder)"]
    end

    subgraph "Reference"
        direction TB
        REF_LAMBENCH["reference/lambench\nOriginal CLI tool"]
        REF_MOTEL["reference/motel\nInspiration for server refactor"]
        REF_HAZEL["reference/hazel\nProduction Effect 4 patterns"]
        REF_SMOL["reference/effect-smol\nEffect library source"]
    end

    CLIENT --> DOMAIN
    SERVER --> DOMAIN
    MCP --> DOMAIN
    SERVER --> AI
```

### 2.3 Server Architecture — Effect Service Layers

The server is built entirely with **Effect 4** service pattern (`ServiceMap.Service`, `Layer.effect`, `Effect.fn`). Every external dependency (DB, filesystem, HTTP, LLM) is injected via Layer composition.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
graph TB
    subgraph "HTTP Layer (apps/server/src/)"
        API["httpApi.ts\nEffect HttpApi + OpenAPI"]
        LOC["localServer.ts\nBunHttpServer + static SPA"]
        RUN["runtime.ts\nManagedRuntime + Layer composition"]
        SRV["server.ts\nEntry point"]
    end

    subgraph "Server Services (apps/server/src/services/)"
        RS["ResultStore\nSQLite CRUD + retention"]
        TS["TaskService\nLoad .tsk/.lam → cache in SQLite"]
        ES["EvalService\nSingle eval orchestration"]
        BS["BatchService\nBatch job CRUD + concurrent run"]
        LC["LamConfig\nEnv var configuration"]
    end

    subgraph "Server Eval / Check"
        CH["Check.ts\nTask parser + lam runner + scorer"]
        LR["LambdaRlm.ts\nλ-RLM 5-phase algorithm"]
        LP["LambdaPlan.ts\nOptimal decomposition planner"]
        LCE["LamCodeExtractor.ts\nLLM output → lambda code"]
    end

    subgraph "Server LLM"
        ORC["OpenRouterClient.ts\n@effect/ai-openrouter Layer factory"]
        MG["ModelGuard.ts\nTimeout + retry + exclusion"]
        LPROMPT["LlmPrompts.ts\nPure prompt builders"]
    end

    subgraph "Server Lamb"
        LAMB["Lamb.ts\nLambda calculus interpreter\n(AST → normalise → BLC)"]
    end

    subgraph "Server Build / CLI"
        BR["BuildResults.ts\nres/*.txt → results.json"]
        ER["EvalRunner.ts\nFetch top models from OpenRouter"]
        MER["ModelEvalRunner.ts\nStandard + RLM per model"]
        RW["RunWriter.ts\nWrite res/*.txt files"]
    end

    subgraph "Server Entry"
        IDX["index.ts\nCLI entry: eval | run | build"]
    end

    API --> ES
    API --> BS
    API --> RS
    API --> TS
    LOC --> API
    LOC --> RUN
    SRV --> LOC
    RUN --> BS
    RUN --> ES
    RUN --> TS
    RUN --> RS
    ES --> CH
    ES --> LR
    ES --> RS
    ES --> TS
    BS --> ES
    BS --> RS
    BS --> TS
    TS --> RS
    CH --> LAMB
    CH --> LPROMPT
    CH --> MG
    LR --> CH
    LR --> LP
    LR --> LCE
    LR --> MG
    LR --> LPROMPT
    MG --> ORC
    MER --> CH
    MER --> LR
    MER --> RW
    MER --> BR
    BR --> RW
    IDX --> ER
    IDX --> MER
    IDX --> BR
```

### 2.4 Service Dependency Graph (Layer Composition)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
graph BT
    subgraph "Runtime Layer Stack"
        A["BunRuntime.runMain"]
        B["BunServices.layer\n(FileSystem, Path, etc.)"]
        C["BunHttpClient.layer"]
        I["BunHttpServer.layer\n(port 9000, localhost)"]
    end

    subgraph "HTTP Stack"
        J["HttpRouter.serve\n(ApiLayer + StaticLayer)"]
        K["HttpMiddleware.tracer"]
    end

    subgraph "Application Layers"
        D["ResultStoreLive(dbPath)\nprovides: ResultStore"]
        E["TaskServiceLive(dbPath)\nprovides: TaskService\ndepends: ResultStoreLive"]
        F["EvalServiceLive\nprovides: EvalService\ndepends: ResultStore + TaskService"]
        G["BatchServiceLive\nprovides: BatchService\ndepends: ResultStore + EvalService + TaskService"]
        H["makeOpenRouterLayer(model)\nprovides: LanguageModel\ndepends: OpenRouterClientLayer"]
    end

    A --> B
    A --> C
    A --> I
    D --> B
    E --> D
    F --> E
    F --> D
    G --> F
    G --> E
    G --> D
    H --> C
    J --> K
    J --> D
    J --> E
    J --> F
    J --> G
    I --> J
```

### 2.5 Client Architecture (React + Effect Atom)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
graph TB
    subgraph "Client (apps/client/src/)"
        direction TB
        APP["app.tsx\nShell: tab state, AsyncResult.match, statusline"]

        subgraph "Atoms"
            ATOM["benchmark-atom.ts\nFetches + decodes results.json"]
            RUNTIME["atom.ts\nEffect Atom runtime (FetchHttpClient)"]
        end

        subgraph "Panels"
            IP["IntelligencePanel\nRank by pass rate"]
            SP["SpeedPanel\nRank by avg time"]
            EP["ElegancePanel\nRank by brevity"]
            VP["ValuePanel\nRank by pass/$"]
            PP["ProblemsPanel\nTask browser"]
            MP["MatrixPanel\nModel × task grid"]
        end

        subgraph "Shared"
            VL["VimLine.tsx\nLine-number gutter"]
            BC["BarChart.tsx\nASCII █ bar"]
            BRW["BenchmarkRow.tsx\nModel name + bar + stats"]
            TM["TaskModal.tsx\nTask detail overlay"]
            TL["TabLine.tsx\nVim-style tab strip"]
        end

        APP --> TL
        APP --> IP
        APP --> SP
        APP --> EP
        APP --> VP
        APP --> PP
        APP --> MP
        APP --> TM
        APP --> ATOM
        ATOM --> RUNTIME
        IP --> BRW
        SP --> BRW
        EP --> BRW
        VP --> BRW
        BRW --> VL
        BRW --> BC
    end
```

### 2.6 Database Schema (SQLite)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
erDiagram
    BENCHMARK_RESULTS {
        integer id PK "AUTOINCREMENT"
        text run_id "Indexed"
        text job_id "Indexed, FK → batch_jobs"
        text task_id "Indexed"
        text model "Indexed"
        text variant "'standard' | 'rlm' | 'both'"
        text provider "'openrouter' | 'opencode-go'"
        integer pass "0 or 1"
        integer bits "Solution size in BLC bits"
        real score "0.0–1.0"
        text errors "JSON string[]"
        text submission "Lambda source"
        integer elapsed_ms "Wall-clock ms"
        text timestamp "ISO string"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    BATCH_JOBS {
        text id PK "UUID"
        text status "'queued' | 'running' | 'completed' | 'failed'"
        text config "JSON string"
        integer total_tasks
        integer completed_tasks "DEFAULT 0"
        datetime created_at "DEFAULT CURRENT_TIMESTAMP"
        datetime completed_at
    }

    TASKS {
        text id PK "e.g. 'snat_add'"
        text category "e.g. 'snat'"
        text category_name "e.g. 'Scott Naturals'"
        text description
        integer test_count
        text tests "JSON {input,expected}[]"
        integer ref_bits "Reference solution size"
        text ref_solution
    }

    MODEL_CONFIGS {
        text id PK "e.g. 'google/gemini-2.5-pro'"
        text provider "'openrouter' | 'opencode-go'"
        text display_name
        real price_per_m_output
        integer is_active "DEFAULT 1"
        datetime created_at
    }
```

---

## 3. Main Workflows

### 3.1 Single Task Evaluation (Standard)

A single `POST /api/eval/single` request with `variant: "standard"`. One LLM call per task. The `mode` field is accepted in the request but only `"direct"` is fully implemented; `"agent"` mode is planned for Phase 6.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
sequenceDiagram
    actor User
    participant HTTP as "HTTP API (localServer.ts)"
    participant ES as "EvalService"
    participant TS as "TaskService"
    participant CH as "Check.ts"
    participant MG as "ModelGuard"
    participant ORC as "OpenRouterClient"
    participant RS as "ResultStore"

    User->>HTTP: POST /api/eval/single<br/>{model, task, variant:"standard"}
    HTTP->>ES: evaluateSingle(request)
    ES->>TS: getTask(taskId)
    TS-->>ES: DbTask
    ES->>CH: runTaskWithLlm(task, refBits)
    CH->>CH: buildSolvePrompt(task)
    CH->>MG: guardedGenerate(prompt, model)
    MG->>ORC: LanguageModel.generateText
    ORC-->>MG: raw response
    MG-->>CH: submission string
    CH->>CH: extractLamCode(raw)
    CH->>CH: runTask(task, submission)
    CH->>CH: lamRun(submission + test)
    CH->>CH: binSize(submission)
    CH->>CH: taskScore(bits, refBits)
    CH-->>ES: CheckResult + elapsedMs
    ES->>RS: insertResult(EvalResult)
    RS-->>ES: void
    ES-->>HTTP: EvalResult
    HTTP-->>User: JSON response
```

### 3.2 Single Task Evaluation (λ-RLM)

The λ-RLM algorithm runs 5 phases: task detection → planning → Φ execution → self-correction.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
sequenceDiagram
    actor User
    participant ES as "EvalService"
    participant LR as "LambdaRlm.ts"
    participant LP as "LambdaPlan.ts"
    participant CH as "Check.ts"
    participant MG as "ModelGuard"
    participant ORC as "OpenRouterClient"

    User->>HTTP: POST /api/eval/single<br/>{variant:"rlm"}
    HTTP->>ES: evaluateSingle(request)
    ES->>LR: rlmEval(task, refBits, config)

    rect rgb(15,35,65)
        Note over LR: Phase 1: context₀ = buildSolvePrompt(task)
    end

    rect rgb(65,45,15)
        Note over LR,ORC: Phase 2: Task Detection (1 LLM call)
        LR->>MG: guardedGenerate(probe, "probe")
        MG->>ORC: generateText
        ORC-->>MG: digit response
        MG-->>LR: taskType string
        LR->>LP: parseTaskType(response)
    end

    rect rgb(15,55,35)
        Note over LR,LP: Phase 3: Optimal Planning (0 LLM calls)
        LR->>LP: plan(taskType, n, contextWindow, α, Aₗ, A⊕)
        LP-->>LR: LambdaPlan {k*, τ*, depth, cost}
    end

    rect rgb(55,55,15)
        Note over LR: Phase 4: Log cost estimate
    end

    rect rgb(55,15,45)
        Note over LR,CH: Phase 5: executeΦ + self-correction
        LR->>LR: effectiveDepth = max(plan.depth, config.maxDepth)
        LR->>CH: leafCall → buildSolvePrompt → guardedGenerate
        CH->>MG: generateText
        MG->>ORC: generateText
        ORC-->>MG: raw
        MG-->>CH: submission
        CH->>CH: runTask → lamRun → binSize
        CH-->>LR: LlmCheckResult

        alt result.pass == false && depthRemaining > 0
            LR->>LR: selfCorrect(state, task, plan, config)
            LR->>CH: buildRetryPrompt(prior, errors)
            CH->>MG: generateText
            MG->>ORC: generateText
            ORC-->>MG: raw
            MG-->>CH: submission
            CH->>CH: runTask
            CH-->>LR: LlmCheckResult
        end
    end

    LR-->>ES: LlmCheckResult {pass, bits, score, attempts, depth}
    ES->>RS: insertResult
```

### 3.3 Batch Evaluation Workflow

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
sequenceDiagram
    actor User
    participant HTTP as "HTTP API (localServer.ts)"
    participant BS as "BatchService"
    participant ES as "EvalService"
    participant RS as "ResultStore"

    User->>HTTP: POST /api/eval/batch<br/>{models, tasks, variant, concurrency}
    HTTP->>BS: createBatchJob(request)
    BS->>TS: getAllTasks() (if tasks empty)
    BS->>BS: totalTasks = models × tasks × (variant=="both" ? 2 : 1)
    BS->>RS: insertJob({id, status:"queued", config, totalTasks})
    BS-->>HTTP: BatchJob {queued}
    HTTP-->>User: {id, status, totalTasks}

    User->>HTTP: GET /api/eval/status/:jobId
    HTTP->>BS: getBatchJob(jobId)
    BS->>RS: getJob(jobId) + getResultsByJobId(jobId)
    BS-->>HTTP: BatchJob with partial results
    HTTP-->>User: progress update

    Note over BS,RS: Async execution (triggered by server or CLI)
    BS->>BS: runBatchJob(jobId)
    BS->>RS: updateJobStatus(jobId, "running")
    BS->>ES: Effect.forEach(requests, evaluateSingle, {concurrency})
    ES-->>BS: EvalResult[]
    BS->>RS: insertResult per task
    BS->>RS: updateJobStatus(jobId, "running", completedTasks)
    BS->>RS: updateJobStatus(jobId, "completed", finalCount)
```

### 3.4 CLI Pipeline Workflow (`bun src/index.ts [eval] [run] [build]`)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
flowchart TD
    A["bun src/index.ts eval run build"] --> B["Phase 1: eval"]
    A --> C["Phase 2: run"]
    A --> D["Phase 3: build"]

    B --> B1["resolveTopModels()"]
    B1 --> B2{"devMode?"}
    B2 -->|yes| B3["DEV_MOCK_MODELS"]
    B2 -->|no| B4["fetchRankings() + fetchModels()"]
    B4 --> B5["Match ranked IDs to pricing"]
    B5 --> B6["Write top-models.json"]

    C --> C1["loadBenchConfig()"]
    C1 --> C2["loadAllTasks()"]
    C2 --> C3["loadRefBitsMap()"]
    C3 --> C4["Effect.forEach(models, runModelEval, {concurrency:1})"]
    C4 --> C5["runModelEval(model, tasks, refBitsMap, rlmMaxDepth)"]
    C5 --> C6["Effect.all([standardEval, rlmEval], {concurrency:2})"]
    C6 --> C7["writeResultFile → res/*.txt"]
    C7 --> C8["build() → results.json"]

    D --> D1["loadAllResults() → parse res/*.txt"]
    D1 --> D2["latestPerModel() → dedupe by model"]
    D2 --> D3["loadAllTasks() → parse tsk/*.tsk"]
    D3 --> D4["loadTopModels() → pricing map"]
    D4 --> D5["Build Ranking[] + BenchmarkData"]
    D5 --> D6["Write apps/client/public/data/results.json"]
```

### 3.5 Client Data Flow

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
sequenceDiagram
    actor User
    participant Browser as "Browser"
    participant React as "React App"
    participant Atom as "benchmarkAtom"
    participant Runtime as "Atom Runtime"
    participant HTTP as "HTTP / Static"
    participant JSON as "results.json"

    User->>Browser: Open lambench UI
    Browser->>React: Mount App
    React->>Atom: useAtomValue(benchmarkAtom)
    Atom->>Runtime: Effect.gen → HttpClient.get
    Runtime->>HTTP: GET /data/results.json
    HTTP->>JSON: Read static file
    JSON-->>HTTP: JSON body
    HTTP-->>Runtime: Response
    Runtime->>Atom: Schema.decodeUnknownEffect(BenchmarkData)
    Atom-->>React: AsyncResult.Success
    React->>React: Render TabLine + active panel
    React-->>Browser: DOM

    Note over React,Atom: Tab switching is instant — all panels pre-rendered, visibility toggled via CSS display:none
```

### 3.6 λ-RLM Algorithm Detail (Internal)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 
  'background': '#111827',
  'lineColor': '#e5e7eb',
  'primaryTextColor': '#ffffff',
  'secondaryTextColor': '#ffffff',
  'tertiaryTextColor': '#ffffff',
  'primaryBorderColor': '#00f0ff',
  'secondaryBorderColor': '#ff9900',
  'tertiaryBorderColor': '#ff3366',
  'fontSize': '14px'
}}}%%
flowchart TD
    A["rlmEval(task, refBits, config)"] --> B["Phase 1: context₀ = buildSolvePrompt(task)"]
    B --> C["Phase 2: Task Detection"]
    C --> D["probe = buildTaskDetectionProbe(preview, n)"]
    D --> E["guardedGenerate(probe)"]
    E --> F["parseTaskType(response)"]
    F --> G["Phase 3: plan(taskType, n, K, α, Aₗ, A⊕)"]
    G --> H["LambdaPlan {k*, τ*, depth, costEstimate}"]
    H --> I["Phase 4: Log cost"]
    I --> J["Phase 5: effectiveDepth = max(plan.depth, config.maxDepth)"]
    J --> K["executeΦ(input)"]

    K --> L{"isLeaf?"}
    L -->|yes| M["leafCall → LLM → runTask → lamRun → binSize"]
    L -->|no| N["splitText(context, k*)"]
    N --> O["Effect.all(chunks.map(Φ), {concurrency:k*})"]
    O --> P["selectBest(partials)"]
    P --> Q["sum attempts"]
    Q --> K

    M --> R["selfCorrect(state, task, plan, config)"]
    R --> S{"result.pass == true or depthRemaining <= 0?"}
    S -->|yes| T["Return LlmCheckResult"]
    S -->|no| U["buildRetryPrompt(task, prior, errors)"]
    U --> V["leafCall → LLM → runTask"]
    V --> R
```

---

## Appendix A: File Map

### Domain (`packages/domain/src/`)
| File | Purpose |
|------|---------|
| `Benchmark.ts` | All shared schemas: Task, Ranking, EvalResult, BatchJob, ModelConfig |
| `Api.ts` | HttpApi groups: Health, Eval, Results, Tasks, Models |

### Server (`apps/server/src/`)
| File | Purpose |
|------|---------|
| `server.ts` | Server entry point — `BunRuntime.runMain(Layer.launch(ServerLive))` |
| `localServer.ts` | BunHttpServer, router, static SPA fallback, middleware |
| `httpApi.ts` | Typed Effect HTTP API with OpenAPI auto-generation (`/openapi.json`) |
| `httpApi.test.ts` | Integration tests for all API endpoints (32 tests) |
| `runtime.ts` | ManagedRuntime with Layer composition and `dbPath` validation |
| `index.ts` | CLI entry point (eval / run / build commands) |
| `services/ResultStore.ts` | SQLite persistence service (CRUD + retention) |
| `services/TaskService.ts` | Load .tsk/.lam files, cache in SQLite |
| `services/EvalService.ts` | Single evaluation orchestration |
| `services/BatchService.ts` | Batch job creation, execution, resumption |
| `services/LamConfig.ts` | Environment variable configuration |
| `check/Check.ts` | Task parser, lam interpreter, scorer, LLM-based runner |
| `lamb/Lamb.ts` | Lambda calculus AST, parser, evaluator, printer, BLC encoder |
| `rlm/LambdaRlm.ts` | λ-RLM 5-phase algorithm |
| `rlm/LambdaPlan.ts` | Optimal decomposition planner (pure math) |
| `rlm/LamCodeExtractor.ts` | Extract lambda code from raw LLM output |
| `llm/OpenRouterClient.ts` | Layer factory for @effect/ai-openrouter |
| `llm/ModelGuard.ts` | Timeout, retry, exclusion logic |
| `llm/LlmPrompts.ts` | Pure prompt builder functions |
| `eval/EvalRunner.ts` | Fetch top models from OpenRouter |
| `eval/ModelEvalRunner.ts` | Standard + RLM eval per model |
| `build/BuildResults.ts` | Aggregate res/*.txt → results.json |
| `run/RunWriter.ts` | Write eval results to res/*.txt |
| `config/BenchConfig.ts` | Load and validate bench.config.json |

### Client (`apps/client/src/`)
| File | Purpose |
|------|---------|
| `app.tsx` | Shell: tab state, AsyncResult.match, statusline |
| `lib/atoms/benchmark-atom.ts` | Effect Atom that fetches + decodes results.json |
| `lib/atom.ts` | Atom runtime with FetchHttpClient layer |
| `components/leaderboard/*.tsx` | Six panels + VimLine + BarChart + TaskModal |
| `components/theme-toggle.tsx` | Solarized light/dark toggle |
| `main.tsx` | React 19 entry point |

---

*Document generated from codebase analysis. Covers Phase 1 (foundation services), Phase 2 (HTTP API + local server), and planned Phases 3–6 (MCP, provider refactor, web UI refresh, agent mode).*
