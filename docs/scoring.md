# Architecture Document Scoring & Ranking

> **Scope**: Comparative evaluation of three `architecture-and-domain.md` documents across Completeness, Accuracy, Clarity, Diagram Quality, Code Examples, Cross-references, Professionalism, and File Map Completeness.
> **Documents Evaluated**:
>
> - `docs/architecture-and-domain.md` — **LamBench Pro** (959 lines)
> - `reference/motel/docs/architecture-and-domain.md` — **Motel** (1,157 lines)
> - `reference/clanka/docs/architecture-and-domain.md` — **Clanka** (847 lines)

---

## 1. Evaluation Criteria

| # | Criterion                 | Weight | Description                                                                                                                                                                                                                              |
| - | ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Completeness**          | 20%    | Coverage of domain types, services, workflows, API contracts, file map, and supplementary sections (e.g., MCP tools, indexes, database triggers, configuration). A complete document leaves no major architectural surface undocumented. |
| 2 | **Accuracy**              | 15%    | Factual correctness of type signatures, service responsibilities, workflow sequencing, schema definitions, and file paths against the source codebase. Inaccurate documentation is worse than missing documentation.                     |
| 3 | **Clarity**               | 15%    | Readability, logical section ordering, narrative flow, scannability, and effective use of headings, bullets, and "Key points" summaries. Clarity ensures readers can locate information quickly.                                         |
| 4 | **Diagram Quality**       | 15%    | Mermaid diagram correctness, visual readability, thematic consistency, appropriate diagram type selection (class, ER, flowchart, sequence), and meaningful labels. Diagrams should complement text, not replace it.                      |
| 5 | **Code Examples**         | 10%    | Quality, relevance, and accuracy of inline TypeScript/schema snippets; inclusion of actual signatures versus pseudo-code or Mermaid class notation. Code examples prove the documentation is grounded in real implementation.            |
| 6 | **Cross-references**      | 5%     | Internal anchor links, TOC quality, bidirectional section navigation, and explicit references to source files. Strong cross-references reduce cognitive load when tracing concepts to code.                                              |
| 7 | **Professionalism**       | 10%    | Writing quality, terminology consistency, absence of placeholders/TODOs, version/metadata headers, and overall polish. Professionalism signals that the document is maintained and authoritative.                                        |
| 8 | **File Map Completeness** | 10%    | Coverage of source files, per-file responsibility descriptions, line counts where applicable, logical categorization, and inclusion of root-level configuration files. The file map is the primary navigation aid for new developers.    |

---

## 2. Per-Document Scoring

### 2.1 LamBench Pro (`docs/architecture-and-domain.md`)

#### Criterion 1: Completeness (20%) — Score: 7 / 10

**Justification**: The document covers domain types, server/client architecture, and six workflows. However, it omits explicit HTTP API endpoint tables (endpoints appear only inside a Mermaid class diagram), lacks an MCP tools section (Phase 3 is mentioned as "planned" but not documented), and notes placeholder packages (`packages/ai`, `packages/observability`) without elaboration, and describes `packages/rag` ("Chunking, PDF, Chroma") as not used by lambench but does not elaborate on its architecture. The database section documents tables but omits index definitions and trigger logic that exist in `ResultStore.ts`.

**Specific Examples**:

- Lines 171–203: API endpoints are rendered as Mermaid classes (`HealthGroup`, `EvalGroup`, etc.) rather than scannable tables. A reader searching for the `POST /api/eval/single` request body schema must decode it from a class diagram instead of reading a table row.
- Line 345: `apps/server-mcp` is labeled "(planned Phase 3)" with no further detail. No MCP tool names, input schemas, or use cases are provided.
- Lines 351–353: `packages/ai` and `packages/observability` are marked as placeholders; `packages/rag` has a defined purpose ("Chunking, PDF, Chroma") but is noted as not used by lambench. The monorepo diagram includes them, but the document does not explain what the placeholders will eventually contain or why they are currently empty.
- Missing: Index definitions for SQLite tables, FTS configuration (if any), environment variable documentation, and CLI flag documentation beyond the workflow diagram in section 3.4.

#### Criterion 2: Accuracy (15%) — Score: 8 / 10

**Justification**: Domain types and SQLite schema align with `packages/domain/src/Benchmark.ts` and `apps/server/src/services/ResultStore.ts`. The API contract diagram accurately reflects the `effect/unstable/httpapi` groups. The CLI pipeline workflow (section 3.4) correctly represents the `eval → run → build` command sequence. Minor deductions for mixing "planned" and "existing" items without clear visual distinction, which could mislead readers about implementation status.

**Specific Examples**:

- Lines 221–271: SQLite ER diagram correctly lists columns for `BENCHMARK_RESULTS`, `BATCH_JOBS`, `TASKS`, and `MODEL_CONFIGS`, matching `ResultStore.ts` schema initialization.
- Line 637: "HTTP API (planned)" appears in a sequence diagram, blurring the boundary between implemented and future architecture. A reader might assume the HTTP API is already implemented because it appears in a workflow alongside implemented services like `EvalService`.
- Lines 793–831: The CLI Pipeline Workflow correctly shows `resolveTopModels()`, `DEV_MOCK_MODELS`, `fetchRankings()`, and the `Effect.forEach` concurrency pattern, matching `apps/server/src/index.ts` and related modules.

#### Criterion 3: Clarity (15%) — Score: 8 / 10

**Justification**: The three-part structure (Domain → Architecture → Workflows) is intuitive. Subsections follow a logical dependency chain: types first, then components, then runtime behavior. Deductions for workflow diagrams that are dense and lack sufficient narrative explanation. The λ-RLM algorithm detail (section 3.6) expects the reader to infer phase semantics from node labels alone, which is demanding for readers unfamiliar with recursive lambda calculus evaluation strategies.

**Specific Examples**:

- Lines 617–665: The standard evaluation sequence diagram is clear, but the accompanying text is only one sentence ("One LLM call per task."). There is no explanation of what `ModelGuard.guardedGenerate` does (timeout? retry? exclusion?) or how `Check.ts` parses the LLM output.
- Lines 886–912: The λ-RLM algorithm detail flowchart (section 3.6) has no bullet explanation; readers must decode `executeΦ`, `isLeaf?`, `selectBest`, and `selfCorrect` from node names. A numbered step list (like Clanka's Agent Loop) would dramatically improve comprehension.
- Lines 833–870: The Client Data Flow sequence diagram is well-labeled and includes a helpful note about tab switching via CSS `display:none`, demonstrating how prose can augment a diagram effectively.

#### Criterion 4: Diagram Quality (15%) — Score: 7 / 10

**Justification**: Fifteen diagrams provide extensive visual coverage. However, thematic consistency is broken: section 2.1 uses the `base` Mermaid theme while all other diagrams use `dark`. Several diagrams (e.g., section 2.3 Server Architecture) are extremely dense with 15+ nodes, reducing readability. The ER diagrams are well-formed, but the repetition of nearly identical SQLite schemas in sections 1.3 and 2.6 is redundant.

**Specific Examples**:

- Lines 279–319: System Context diagram uses `theme: base` with custom `primaryColor: '#1e3a5f'`, while every other diagram uses `theme: dark`. This inconsistency is jarring when scrolling through the document.
- Lines 374–448: The Server Architecture graph contains 18 nodes and 22 edges. Dependencies like `LR --> CH`, `LR --> LP`, `LR --> LCE` are correct but visually crowded. Subgraph grouping (e.g., "Server Eval / Check", "Server LLM") helps, but the overall density still makes tracing a single dependency path difficult.
- Lines 209–271 and 565–613: Sections 1.3 and 2.6 both show ER diagrams for the same four tables with only minor annotation differences. Consolidating these into one authoritative diagram would improve maintainability.

#### Criterion 5: Code Examples (10%) — Score: 6 / 10

**Justification**: The document relies almost entirely on Mermaid class diagrams for type representation. It lacks actual TypeScript interface or schema code snippets. Readers cannot see Effect Schema declarations, type generics, or service method signatures in real code form. This is a significant gap for an Effect-TS project where `Schema.Struct`, `Schema.optional`, and branded types are central to understanding the domain.

**Specific Examples**:

- Lines 34–113: `BenchmarkTest`, `BenchmarkTask`, etc., are shown as Mermaid classes with `+string input` notation rather than `Schema.Struct({ input: Schema.String, expected: Schema.String })` or TypeScript interfaces.
- No inline snippets demonstrate `Effect.fn` signatures, `Layer.effect` composition, or `Schema.decode` usage. For example, `EvalService.evaluateSingle` is referenced in a sequence diagram but its actual method signature is never shown.
- Lines 121–203: The API Contract Domain section shows request/response types as Mermaid classes. Showing the actual `HttpApiEndpoint.post` or `Schema.Struct` definitions from `Api.ts` would be far more useful for developers implementing clients.

#### Criterion 6: Cross-references (5%) — Score: 7 / 10

**Justification**: The TOC (lines 7–12) provides anchor links to all major sections. File map tables reference source paths. Deductions for minimal bidirectional linking: workflows do not link back to the services or types they consume, and the domain type sections do not reference the workflows that use them.

**Specific Examples**:

- Lines 8–10: TOC links to `#1-core-domain-types-schema`, `#2-architecture--components`, and `#3-main-workflows`. This is functional but minimal.
- Lines 927–944: File map lists `services/ResultStore.ts` but does not hyperlink or reference the earlier ER diagrams (lines 221–271, 565–613) that describe the same schema. A "See Database Schema" cross-reference would help.
- Lines 617–665: The standard evaluation workflow references `EvalService`, `TaskService`, `Check.ts`, `ModelGuard`, and `OpenRouterClient`, but none of these are linked back to their architecture descriptions in section 2.3.

#### Criterion 7: Professionalism (10%) — Score: 7 / 10

**Justification**: Writing is clear and consistent. Deductions for explicit placeholders ("(placeholder)", "(planned Phase 3)") and the absence of a version or date header. The document footer notes it was "generated from codebase analysis," which is professional, but the body contains structural gaps that undermine confidence in the document's completeness.

**Specific Examples**:

- Line 345: `apps/server-mcp` labeled "(planned Phase 3)" reads as unfinished. A professional document should either document the planned architecture in detail or omit it entirely.
- Lines 351–353: `packages/ai` and `packages/observability` labeled "(placeholder)" reduce perceived completeness. If these packages are truly empty, they should not appear in the architecture diagram.
- Missing: No version number, no date stamp, no author attribution, and no "last updated" indicator. Motel (0.1.0) and Clanka (0.2.62) both provide this metadata.

#### Criterion 8: File Map Completeness (10%) — Score: 8 / 10

**Justification**: The Appendix A file map covers Domain, Server, and Client files with concise responsibility descriptions. Deductions for missing line counts and the omission of root-level configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`). The file map also omits test files and reference directory contents.

**Specific Examples**:

- Lines 918–955: Three tables list 24 files with one-line descriptions each, but no line counts or dependency links. For example, `services/ResultStore.ts` is described as "SQLite persistence service (CRUD + retention)" without indicating it is ~400+ lines.
- Missing: `package.json`, `turbo.json`, `bench.config.json`, `tsconfig.json`, and test files (e.g., `ResultStore.test.ts`). Motel includes these in its categorized tables.
- Lines 956: `components/leaderboard/*.tsx` uses a glob pattern instead of listing individual components, which reduces precision.

---

### 2.2 Motel (`reference/motel/docs/architecture-and-domain.md`)

#### Criterion 1: Completeness (20%) — Score: 9 / 10

**Justification**: The document is exhaustive. It documents primitive types, event/span/trace/log/AI types, architecture (system context, monorepo, services, layers, DB), four workflows, ~30 HTTP API endpoints across 11 route groups, 19 MCP tools across 6 categories, database indexes, FTS5 triggers, and a multi-table file map with line counts. No major architectural surface is omitted. Even edge concerns like AI attribute constants (`AI_ATTR_MAP`) and full-text search keys (`AI_FTS_KEYS`) are documented. Minor gap: error type documentation (e.g., parse failures, 404 responses, timeout errors) is absent and would improve Completeness.

**Specific Examples**:

- Lines 922–1006: HTTP API endpoints are tabulated by group (Health, Ingest, Services, Traces, Spans, Logs, AI Calls, Stats, Facets, Docs, Additional Routes). Each row includes Method, Path, and a detailed Description.
- Lines 1009–1061: MCP tools are grouped into Connection & Discovery, Trace Tools, Span Tools, Log Tools, AI Tools, and Stats & Docs. Every tool has a concise but complete description of its parameters and behavior.
- Lines 704–736: Database indexes are listed per table, and FTS5 triggers (`span_attr_fts_ai`, `span_attr_fts_ad`, `span_attr_fts_au`) are explicitly named and described.

#### Criterion 2: Accuracy (15%) — Score: 9 / 10

**Justification**: Type definitions match `src/domain.ts` exactly. API endpoints correspond to `src/httpApi.ts`. The SQLite schema, indexes, and FTS5 triggers accurately reflect `src/services/TelemetryStore.ts`. File map line counts are precise where provided. Minor deduction for a few files marked with "—" for line counts instead of precise numbers, which slightly weakens an otherwise impeccable accuracy record.

**Specific Examples**:

- Lines 32–197: `TraceSpanEvent`, `TraceSpanItem`, `TraceItem`, `LogItem`, `AiUsage`, `AiCallSummary`, and `AiCallDetail` definitions align with `src/domain.ts` field-for-field.
- Lines 704–730: Index definitions (`idx_spans_service_time`, `idx_logs_trace_time`, etc.) match the DDL in `TelemetryStore.ts`. The composite index ordering (e.g., `(service_name, start_time_ms DESC)`) is preserved exactly.
- Lines 1066–1076: `src/domain.ts` listed as ~291 lines, `src/config.ts` as ~39 lines, and `src/registry.ts` as ~89 lines — all verified against actual source.

#### Criterion 3: Clarity (15%) — Score: 9 / 10

**Justification**: Excellent progression from data → architecture → runtime → API → tools → file map. Each workflow section includes a "Key points" bullet summary that extracts critical semantics from the diagram. Tables make scannable reference material. The document never assumes the reader knows OTel terminology; it defines `TraceSpanStatus`, `StringRecord`, and `scopeName` explicitly.

**Specific Examples**:

- Lines 774–779: "Key points" after the OTLP Ingest Flow diagram explain worker-thread offloading, upsert semantics, batching of 500 rows for FTS updates, and denormalized trace summary upserts. This is a model of how to augment a diagram with actionable prose.
- Lines 818–823: Trace Query Flow "Key points" explain cursor pagination (`nextCursor`), FTS5 search filters (`aiText`), and the role of the `trace_summaries` denormalized table.
- Lines 865–870: MCP Tool Invocation "Key points" note that all 19 tools are `Tool.Readonly`, that `Locator` resolves instances via registry or `MOTEL_URL`, and that `motel_status` should be called first — practical guidance that a diagram alone cannot convey.

#### Criterion 4: Diagram Quality (15%) — Score: 8 / 10

**Justification**: Consistent `base` theme with custom dark palette across all 8 diagrams. Diagram types are well chosen: class diagram for domain, ER diagram for DB, flowcharts for workflows and layer composition. The system context diagram is simple but effective. Minor deduction for fewer diagrams than LamBench Pro and a relatively sparse system context diagram that does not show data flow directionality as clearly as LamBench Pro's.

**Specific Examples**:

- Lines 242–395: Domain class diagram uses `theme: base` with `background: '#0a0a0a'` and cyan borders (`#00f0ff`), consistent with all subsequent diagrams. The dark palette is visually cohesive.
- Lines 610–700: ER diagram includes 7 entities and 7 relationship edges, correctly modeling the SQLite schema with cardinality notation (`||--o{`).
- Lines 536–583: Layer Composition diagram clearly separates HTTP Stack, Query Services, Persistence, and Transport into subgraphs, making the dependency hierarchy immediately apparent.

#### Criterion 5: Code Examples (10%) — Score: 8 / 10

**Justification**: Good TypeScript interface snippets for domain types. The `AI_ATTR_MAP` and `AI_FTS_KEYS` tables are excellent reference material that go beyond simple type definitions. Deductions for lacking service method signatures or Layer composition code (e.g., no `Effect.fn` or `Layer.effect` snippets). Developers reading this document would know the data shapes but not how to call the services programmatically.

**Specific Examples**:

- Lines 32–58: `TraceSpanEvent` and `TraceSpanItem` shown as inline TypeScript interfaces with field comments (`// Event name`, `// ISO 8601 timestamp`).
- Lines 201–238: `AI_ATTR_MAP` table maps 23 normalized keys to OTel attribute keys — highly useful for developers writing queries against `span_attributes`.
- Missing: No snippet shows `TelemetryStore.insertSpans` or `TraceQueryService.listTraces` method signatures. No `Layer.provide` composition example.

#### Criterion 6: Cross-references (5%) — Score: 8 / 10

**Justification**: Strong TOC with 6 top-level sections and numerous sub-anchors. Sections naturally reference source files (e.g., "defined in `src/httpApi.ts`"). File map tables link conceptual sections back to physical files. The workflow diagrams reference services that were introduced in section 2.3. Minor deduction for absence of explicit "See also" links between related subsections (e.g., between AI Call types and the AI Calls API endpoints).

**Specific Examples**:

- Line 19: "All domain types are defined in `src/domain.ts`" explicitly anchors the domain section to source.
- Line 922: "All endpoints are defined in `src/httpApi.ts` using `effect/unstable/httpapi` and exposed via `src/localServer.ts`." This single sentence provides three source-file cross-references.
- Lines 1066–1157: File map is organized by architectural layer, so readers can trace from "I need to understand persistence" → `src/services/TelemetryStore.ts`.

#### Criterion 7: Professionalism (10%) — Score: 9 / 10

**Justification**: Version header (0.1.0), clear purpose statement, consistent terminology, no placeholders. Writing is concise and authoritative. The document uses precise OTel terminology (`severityText`, `scopeName`, `operationName`) consistently. Minor deduction for some files in the file map showing "—" instead of line counts, which slightly undermines the otherwise precise tone.

**Specific Examples**:

- Lines 3–4: Version and purpose metadata establish context immediately ("Local OpenTelemetry ingest + TUI viewer for development, backed by SQLite").
- No "TODO", "FIXME", "placeholder", or "planned" labels appear anywhere in the document. Every described feature is implemented.
- Lines 137–165: `AiCallSummary` and `AiCallDetail` use consistent field ordering and naming conventions, demonstrating editorial discipline.

#### Criterion 8: File Map Completeness (10%) — Score: 10 / 10

**Justification**: The file map is the strongest of the three documents. It is organized into 8 categories (Core Domain, HTTP API, Services, Runtime, MCP, TUI, Web UI, AI Agent Skill) with line counts where available and one-line responsibility descriptions for every file. Root-level files like `package.json` and `tsconfig.json` are included. Test files are mentioned.

**Specific Examples**:

- Lines 1066–1157: 5 tables cover ~60 files with responsibilities and line counts (e.g., `src/services/TelemetryStore.ts` | ~2370 | SQLite persistence...).
- Lines 1135–1149: Web UI files are listed separately from TUI files, clarifying the dual-interface architecture.
- Lines 1151–1157: AI Agent Skill files (`skills/motel-debug/SKILL.md`, etc.) are included, showing that even ancillary content is catalogued.

---

### 2.3 Clanka (`reference/clanka/docs/architecture-and-domain.md`)

#### Criterion 1: Completeness (20%) — Score: 8 / 10

**Justification**: Strong coverage of domain types, architecture, workflows, and a comprehensive tool reference. Includes a unique "Comparison with Motel Patterns" section that adds cross-project architectural context not present in the other documents. As a library (not an application), it has no HTTP API or MCP server surface to document, which limits its maximum completeness score relative to Motel. Deductions for missing Layer factory implementation code, limited persistence/file-map detail, and no discussion of testing strategies or configuration.

**Specific Examples**:

- Lines 748–773: Tool Reference table documents all 20 tools with parameters, success types, dependencies, and purpose. This is a complete API surface for library consumers.
- Lines 777–793: Comparison matrix with Motel adds valuable architectural context not present in the other documents. It explicitly contrasts Clanka's MCP client role against Motel's MCP server role.
- Missing: No `Layer` composition examples or `ManagedRuntime` setup details despite section 2.4 being titled "Layer Composition Diagram." No discussion of `vitest.config.ts` or test strategy.

#### Criterion 2: Accuracy (15%) — Score: 9 / 10

**Justification**: Type signatures and service definitions are highly accurate. The `Agent` interface, `AgentExecutor` capabilities, and tool parameter schemas match source code. Class diagrams correctly model inheritance (`AgentTools <|-- AgentToolsWithSearch`) and dependencies (`AgentExecutor --> AgentTools`). The Agent Loop flowchart accurately represents the recursive `StreamText → ProcessParts → ExecuteScript → Feedback → StreamText` cycle. Minor deduction because some generic type parameters in snippets are abbreviated for brevity (e.g., `Effect.Effect<A, E, R>` in `AgentModelConfig`).

**Specific Examples**:

- Lines 19–36: `Agent` interface accurately shows `MutableRef.MutableRef<Prompt.Prompt>`, `send` returning `Stream.Stream<Output, ...>`, and `steer` returning `Effect.Effect<void>`.
- Lines 48–59: `AgentExecutor` correctly extends `Context.Service` with `capabilities`, `execute`, and `executeUnsafe` methods.
- Lines 160–164: `McpClientError` correctly uses `Schema.TaggedErrorClass` with `Schema.Defect` as the cause field, matching Effect 4 beta.52 patterns.

#### Criterion 3: Clarity (15%) — Score: 9 / 10

**Justification**: Excellent readability. The Agent Loop section (2.5) uses a numbered list (1–8) to explain the flowchart, making complex recursion accessible to readers who might not immediately grasp the cycle from the diagram alone. Tool descriptions are consistent. The document header includes version, framework, license, and repository URL. Minor deduction for some repetition between section 1.3 (AgentTools) and section 4 (Tool Reference), which present overlapping information in different formats.

**Specific Examples**:

- Lines 573–586: Eight numbered steps explain the Agent Loop with precise terminology ("Only one tool (`execute`) is exposed to the LLM; the actual toolkit is injected into the VM sandbox"). Step 8 explicitly documents the retry policy: `exponential(100, 1.5) |> spaced(5000) |> jittered`.
- Lines 75–95: AgentTools base set table and extended set table are clearly separated and labeled. Columns (Tool, Parameters, Success, Purpose) are consistent.
- Lines 748–773: Tool Reference table repeats the same 20 tools from section 1.3. Consolidating these into one section would reduce redundancy.

#### Criterion 4: Diagram Quality (15%) — Score: 8 / 10

**Justification**: Ten diagrams with consistent `base` theme. The Agent Loop flowchart (section 2.5) is particularly effective, with color-coded node styles for each phase (`Start`, `ConcatPrompt`, `StreamText`, etc.). Two class diagrams provide good coverage of both domain types and service dependencies. Minor deduction for some workflow diagrams being overly simplistic LR flowcharts with only 4–7 nodes. For example, the Single Agent Execution diagram (section 3.1) lacks error paths and timeout branches.

**Specific Examples**:

- Lines 531–571: Agent Loop flowchart uses distinct `fill` colors per phase (`Start: #1e3a5f`, `ConcatPrompt: #2d1b4e`, `StreamText: #1a472a`) and correctly models the retry cycle with a `Timeout → Retry` loopback edge.
- Lines 605–623: Single Agent Execution diagram is a simple 7-node LR flowchart. It does not show the `ErrorRetry` output path or the turn timeout branch, which are documented in prose but not visualized.
- Lines 241–348: Class diagram in section 1.12 correctly models 14 classes and their relationships, including the `AgentTools <|-- AgentToolsWithSearch` inheritance edge.

#### Criterion 5: Code Examples (10%) — Score: 9 / 10

**Justification**: Best code examples of the three documents. Full TypeScript interfaces for `Agent`, `AgentExecutor`, `McpClient`, and `AgentModelConfig` are shown with actual generic parameters and Effect types. Tool parameters are documented in both table and prose form. The inclusion of `Context.Reference` and `Layer.succeed` patterns demonstrates real Effect 4 idioms, not just data shapes.

**Specific Examples**:

- Lines 19–36: `Agent` interface includes full `Effect.Effect` and `Stream.Stream` type parameters, not pseudo-code. The `send` method's requirement for `Scope.Scope | LanguageModel.LanguageModel | ...` is shown explicitly.
- Lines 182–189: `ConversationMode` shown as a `Context.Reference<boolean>` with a `Layer.succeed` factory, demonstrating actual Effect 4 dependency injection patterns.
- Lines 209–219: `AgentModelConfig` shows a higher-order type signature for `systemPromptTransform` that accepts and returns `Effect.Effect<A, E, R>`, which is sophisticated and accurately represented.

#### Criterion 6: Cross-references (5%) — Score: 7 / 10

**Justification**: TOC with anchor links is present. Some natural cross-references exist (e.g., "AgentExecutor also provides `layerRpc`"). Deductions for limited explicit linking between the class diagram (1.12) and the type descriptions (1.1–1.11), and between the Layer Composition diagram (2.4) and the architecture text (2.3). Readers must manually correlate diagram nodes with prose sections.

**Specific Examples**:

- Line 66: "AgentExecutor also provides `layerRpc` and `layerRpcServer` for remote execution" references related functionality without a section anchor. A link to section 2.4 (Layer Composition) would help.
- Lines 241–348: Class diagram in 1.12 repeats information from 1.1–1.11 without explicit "see section X" pointers. For example, the `McpClient` class in the diagram is described in section 1.5, but no cross-reference connects them.
- Lines 396–411: Monorepo structure table lists modules but does not link them to the architecture diagrams in sections 2.3 and 2.4 where those modules appear as nodes.

#### Criterion 7: Professionalism (10%) — Score: 9 / 10

**Justification**: Version (0.2.62), framework (Effect-TS 4 beta.52+), license (MIT), and repository URL are stated upfront. Writing is precise and consistent. No placeholders, TODOs, or speculative language. The "Comparison with Motel Patterns" section demonstrates architectural maturity. Minor deduction for repetition between the AgentTools section (1.3) and the Tool Reference section (4), which could be consolidated into a single authoritative reference.

**Specific Examples**:

- Lines 3–6: Header metadata is complete and professional, including repository URL (`https://github.com/Effectful-Tech/clanka`).
- Lines 748–773: Tool Reference table uses consistent column headers and concise descriptions. No tool is described with ambiguous language.
- Lines 777–793: Comparison matrix uses consistent dimensions (Role, Service API, Core focus, UI, MCP integration, Schema usage, Layer composition, Runtime, Concurrency) and accurate characterizations of both projects.

#### Criterion 8: File Map Completeness (10%) — Score: 7 / 10

**Justification**: The file map is presented as a tree structure with brief comments. It covers the main `src/` directory, `examples/`, `.specs/`, and root config files. Deductions for lack of line counts, lack of categorized tables (unlike Motel), and minimal responsibility descriptions for some files. The tree format is readable but less scannable than tables.

**Specific Examples**:

- Lines 796–843: Tree lists ~35 files but descriptions are sparse (e.g., `src/Agent.ts` | Agent service, loop, sub-agent spawning — only 6 words). Contrast with Motel's `src/services/TelemetryStore.ts` | ~2370 | SQLite persistence: schema init, CRUD, ingest, queries, FTS5, retention, AI call queries.
- Missing: No line counts, no categorization by architectural layer (Domain, Runtime, Tools, etc.). Root config files are listed but not described.
- Lines 829–830: `*.test.ts` and `fixtures/` are mentioned without specifics. Listing actual test files would improve completeness.

---

## 3. Score Summary Table

| Criterion             | Weight   | LamBench Pro | Motel    | Clanka   |
| --------------------- | -------- | ------------ | -------- | -------- |
| Completeness          | 20%      | 7.0          | **9.0**  | 8.0      |
| Accuracy              | 15%      | 8.0          | **9.0**  | **9.0**  |
| Clarity               | 15%      | 8.0          | **9.0**  | **9.0**  |
| Diagram Quality       | 15%      | 7.0          | **8.0**  | **8.0**  |
| Code Examples         | 10%      | 6.0          | 8.0      | **9.0**  |
| Cross-references      | 5%       | 7.0          | **8.0**  | 7.0      |
| Professionalism       | 10%      | 7.0          | **9.0**  | **9.0**  |
| File Map Completeness | 10%      | 8.0          | **10.0** | 7.0      |
| **Weighted Total**    | **100%** | **7.30**     | **8.80** | **8.35** |

### Score Breakdown by Document

| Document         | Raw Score | Weighted Score | Rank |
| ---------------- | --------- | -------------- | ---- |
| **Motel**        | 70.0 / 80 | **8.80**       | 1st  |
| **Clanka**       | 66.0 / 80 | **8.35**       | 2nd  |
| **LamBench Pro** | 58.0 / 80 | **7.30**       | 3rd  |

### Score Distribution Visualization

| Score Range | Document     | Interpretation                                                                                              |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 8.80–10.00  | Motel        | Exceptional — comprehensive, accurate, and polished. Suitable as a reference standard.                      |
| 8.00–8.79   | Clanka       | Very Good — excellent code examples and clarity, limited by library scope and file map depth.               |
| 7.00–7.99   | LamBench Pro | Good — visually rich and broad in workflow coverage, but structurally incomplete and lacking code examples. |

---

## 4. Rankings

### 1st Place: Motel (8.80 / 10)

**Why it excels**: Motel's document is the most comprehensive and professionally structured of the three. It leaves no architectural surface undocumented: every domain type, service, workflow, API endpoint, MCP tool, database index, FTS5 trigger, and source file is catalogued. The file map is organized into logical categories with line counts, making it a genuine navigation aid rather than a simple listing. The "Key points" summaries after every workflow diagram extract critical semantics without forcing the reader to decode Mermaid nodes — this pattern is notably absent from LamBench Pro's workflow sections. HTTP API endpoints and MCP tools are presented in scannable tables rather than diagrams alone, which is essential for reference documentation. The consistent `base` Mermaid theme and absence of placeholders reinforce a polished, production-ready tone. For developers onboarding to Motel, this document serves simultaneously as an architecture overview, API reference, and file navigation guide.

**What others could learn from it**: LamBench Pro should adopt Motel's table-first approach for API endpoints and MCP tools. Clanka could learn from Motel's "Key points" pattern for explaining complex flowcharts. Both should emulate Motel's categorized file map with line counts.

### 2nd Place: Clanka (8.35 / 10)

**Why it ranks highly**: Clanka's strongest asset is code example quality. It displays real TypeScript interfaces with full Effect generic parameters (`Stream.Stream<Output, AgentFinished | AiError.AiError, ...>`), which is invaluable for developers consuming the library. The numbered Agent Loop explanation (section 2.5) is a model of clarity for complex recursive behavior — it breaks down an 8-step cycle into digestible prose that complements the flowchart perfectly. The "Comparison with Motel Patterns" section (section 5) demonstrates architectural self-awareness and helps readers situate Clanka within the broader Effect ecosystem. Its primary limitations are structural: as a library, it has no HTTP API or MCP server surface to document, which caps its Completeness score at 8 rather than 10. The file map is a flat tree rather than a categorized table, and some repetition exists between the AgentTools description (section 1.3) and Tool Reference (section 4).

**What could improve its score**: Restructuring the file map into categorized tables with line counts (per Recommendation 1) would add ~0.5 points. Consolidating AgentTools sections would add ~0.2 points. Adding Layer factory code examples could add ~0.3 points, potentially bringing it to 9.00.

### 3rd Place: LamBench Pro (7.30 / 10)

**Why it trails**: LamBench Pro's document is visually rich (15 diagrams) but structurally incomplete relative to Motel. The absence of HTTP API endpoint tables, MCP tool documentation, and explicit code snippets forces readers to infer implementation details from Mermaid diagrams. Placeholder labels ("(planned Phase 3)", "(placeholder)") and inconsistent Mermaid themes (`base` vs. `dark`) reduce professionalism. The file map lacks line counts and omits root-level configuration files. While the workflow coverage is broad (6 workflows), the density of diagrams is not matched by explanatory prose, leaving some workflows (notably λ-RLM) under-explained. The document reads more like a design proposal than a definitive architecture reference.

**What could improve its score**: Adding HTTP API tables (+0.5), TypeScript code snippets (+0.5), unifying Mermaid themes (+0.2), expanding the file map (+0.3), and removing placeholders (+0.2) could collectively raise the score to ~8.5–8.7, placing it in the "Very Good" tier.

---

## 5. Improvement Recommendations

### LamBench Pro

1. **Add HTTP API Endpoint Tables**: Convert the Mermaid class diagram in section 1.2 into scannable tables (Method, Path, Request Body, Response, Description), following Motel's section 4 pattern. This improves scannability and searchability. For example:

   | Method | Path               | Request Body        | Response     | Description                  |
   | ------ | ------------------ | ------------------- | ------------ | ---------------------------- |
   | `POST` | `/api/eval/single` | `SingleEvalRequest` | `EvalResult` | Run a single task evaluation |

2. **Include TypeScript Code Snippets**: Replace some Mermaid class diagrams with actual `Schema.Struct` or TypeScript interface definitions from `packages/domain/src/Benchmark.ts`. Showing `Effect.fn` signatures for key services (e.g., `EvalService.evaluateSingle`) would significantly improve Code Examples score. At minimum, include the `Schema` declarations for `BenchmarkTask`, `EvalResult`, and `BatchJob`.

3. **Eliminate Placeholders or Quarantine Them**: Move all "planned" and "placeholder" content to a dedicated "Future Architecture" appendix, or remove placeholder packages from the monorepo diagram until they are implemented. This raises Professionalism score. If Phase 3 (MCP) must be mentioned, document the planned tool names and schemas rather than leaving a blank label.

4. **Unify Mermaid Theme**: Standardize all diagrams on a single theme (`dark` or `base`). If `dark` is preferred, update section 2.1 (System Context) to match the rest of the document. Consistent theming is a subtle but important signal of editorial care.

5. **Expand File Map with Line Counts and Config Files**: Add line counts for major files (e.g., `ResultStore.ts`, `TaskService.ts`) and include root-level files (`package.json`, `turbo.json`, `tsconfig.json`, `bench.config.json`) to match Motel's file map depth. Consider adding a "Tests" category for test files.

### Motel

1. **Add Service Method Signatures**: Include brief TypeScript snippets for key service methods (e.g., `TraceQueryService.listTraces`, `TelemetryStore.insertSpans`) to complement the existing type definitions. This would raise Code Examples from 8 to 9+. A single snippet showing `Effect.fn("TraceQueryService.listTraces")(function* (filters) { ... })` would suffice.

2. **Fill Missing Line Counts**: Several files in the file map show "—" instead of line counts (e.g., `src/otlp.ts`, `src/queryFilters.ts`, `src/cli.ts`). Providing approximate counts would complete the File Map perfection. If line counts are truly unavailable, estimate them or omit the column rather than using a dash.

3. **Add a Service Dependency Matrix**: A table showing which services depend on which layers (beyond the layer composition diagram) would improve cross-referencing between sections 2.3 and 2.4. For example:

   | Service             | Provided By             | Depends On                   |
   | ------------------- | ----------------------- | ---------------------------- |
   | `TraceQueryService` | `TraceQueryServiceLive` | `TelemetryStoreReadonlyLive` |

4. **Include Error Type Documentation**: The document focuses on happy-path types and workflows. Briefly documenting error schemas (e.g., parse failures, 404 responses, timeout errors) would improve Completeness. Motel's use of Effect means every service method has a typed error channel that is currently invisible in the documentation.

### Clanka

1. **Restructure File Map into Categorized Tables**: Replace the flat tree with tables organized by layer (Agent, Executor, Tools, Infrastructure, CLI, Examples), including line counts and dependency notes. This would match Motel's standard. For example:

   | File           | Lines | Responsibility                          |
   | -------------- | ----- | --------------------------------------- |
   | `src/Agent.ts` | ~450  | Agent service, loop, sub-agent spawning |

2. **Consolidate AgentTools Description**: Merge section 1.3 (AgentTools toolkit) with section 4 (Tool Reference) to eliminate repetition. One authoritative table with full schema parameters and descriptions is preferable to two partial tables. If both sections are needed for narrative flow, make section 4 a "Quick Reference" and section 1.3 the "Detailed Description."

3. **Add Layer Factory Code Examples**: Section 2.4 discusses Layer composition but shows only a diagram. Including actual `Layer.effect` or `Layer.provide` code for `Agent.layerLocal` would improve both Code Examples and Completeness. For example:

   ```typescript
   Agent.layerLocal({ directory: ".", tools: AgentTools.tools });
   ```

4. **Add Error Handling Documentation**: Document the error channel types (`AgentFinished`, `AiError.AiError`, `McpClientError`) and how they propagate through the agent loop. This is a significant gap in an Effect-based architecture document where the error channel is as important as the success channel. Show how `AgentFinished` is used as a typed error to signal normal completion.

5. **Expand Cross-references**: Add explicit "See section X" links between the class diagram (1.12) and individual type sections (1.1–1.11), and between the Layer Composition diagram (2.4) and the service descriptions (2.3). For example, after describing `AgentModelConfig` in section 1.10, add: "See also the Layer Composition diagram (section 2.4) for how this config is wired into the runtime."

---

## 6. Side-by-Side Feature Matrix

| Feature                                | LamBench Pro             | Motel                         | Clanka                          |
| -------------------------------------- | ------------------------ | ----------------------------- | ------------------------------- |
| **Total Lines**                        | 959                      | 1,157                         | 847                             |
| **Top-Level Sections**                 | 3 + Appendix             | 6                             | 6                               |
| **Numbered Subsections**               | ~19                      | ~45                           | ~22                             |
| **Mermaid Diagrams**                   | 15                       | 8                             | 10                              |
| **Formal Tables**                      | 3                        | ~35+                          | 5                               |
| **Domain Types Documented**            | 14 + 5 API groups        | 13 + primitives               | 15 + unions                     |
| **Services / Modules Documented**      | 17                       | 12                            | 10 + infra                      |
| **Workflows Documented**               | 6                        | 4                             | 5                               |
| **HTTP API Endpoints Documented**      | 10 (in diagram only)     | ~30 (in tables)               | N/A                             |
| **MCP Tools Documented**               | 0 (planned, not covered) | 19 (in tables)                | N/A (client only)               |
| **File Map Tables**                    | 3 (no line counts)       | 5 (with line counts)          | 1 tree (no line counts)         |
| **File Map Files Listed**              | ~24                      | ~60                           | ~35                             |
| **Code Snippet Instances**             | 0 (diagrams only)        | ~11 (interface blocks)        | ~12 (interface blocks + tables) |
| **Mermaid Theme Consistency**          | Mixed (`base` + `dark`)  | Consistent (`base`)           | Consistent (`base`)             |
| **Version / Metadata Header**          | No                       | Yes (0.1.0)                   | Yes (0.2.62)                    |
| **Comparison / Cross-Project Section** | No                       | No                            | Yes (vs. Motel)                 |
| **Placeholder / TODO Count**           | 3                        | 0                             | 0                               |
| **Database Indexes Documented**        | No                       | Yes (12 indexes + 3 triggers) | No (not applicable)             |
| **Environment Variables Documented**   | No                       | No (in AGENTS.md)             | No                              |
| **Test Files Referenced**              | No                       | Yes                           | Yes (glob only)                 |

### Matrix Notes

- **Diagrams**: LamBench Pro has the most diagrams (15) but sacrifices thematic consistency. Motel uses fewer diagrams (8) but each is tightly coupled to explanatory prose. Clanka balances quantity (10) with thematic consistency. The optimal count appears to be 8–10 diagrams with consistent theming and strong prose accompaniment.

- **Tables**: Motel's heavy use of tables (~35+) for API endpoints, MCP tools, indexes, and file maps makes it the most scannable document. LamBench Pro relies primarily on diagrams for information that would be more accessible in tabular form. Clanka strikes a balance but could use more tables for file map and Layer composition details.

- **Domain Types**: All three documents cover roughly comparable numbers of types, but Clanka's inclusion of union members (`AgentStart`, `ScriptDelta`, etc.) as first-class documented items gives it the highest nominal count. Motel's inclusion of primitive types (`TraceSpanStatus`, `StringRecord`, `DateFromString`) and AI attribute constants adds depth that raw type counts do not capture.

- **HTTP API / MCP**: These categories are not applicable to Clanka (a library). LamBench Pro plans to add MCP in Phase 3 but currently documents neither the API endpoints in tables nor any MCP tools. Motel is the only document that fully covers both surfaces, which is a major factor in its Completeness score.

- **File Map**: Motel's file map is ~2.5× larger in listed files and includes line counts, making it a substantially more complete navigation aid. LamBench Pro's file map is adequate for a quick overview but insufficient for deep codebase navigation. Clanka's tree format is readable but lacks the scannability of tables.

- **Code Examples**: Clanka leads in code example quality by showing real Effect 4 generic types. Motel provides good interface blocks but no service method signatures. LamBench Pro shows no actual code, relying entirely on Mermaid class notation, which is the weakest approach for a TypeScript project.

- **Professionalism**: Motel and Clanka both score 9/10 due to version headers, consistent terminology, and absence of placeholders. LamBench Pro's 7/10 reflects its placeholder labels and missing metadata. The presence of even one "(placeholder)" label can undermine reader confidence in the entire document's accuracy.

---

_Document generated from direct analysis of `docs/architecture-and-domain.md` (LamBench Pro), `reference/motel/docs/architecture-and-domain.md` (Motel), and `reference/clanka/docs/architecture-and-domain.md` (Clanka). Scores are weighted composites across 8 criteria rated on a 1–10 scale._
