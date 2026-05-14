# LamBench Pro — Motel-Inspired Server Refactor
Swarm: default
Phase: 1 [COMPLETE] | Updated: 2026-04-29T17:47:24.386Z

---
## Phase 1: Foundation — Adapt Motel SQLite + Core Services [COMPLETE]
- [x] 1.1: Create ResultStore.ts adapting motel's TelemetryStore.ts patterns (bun:sqlite, WAL mode, CRUD, retention, Context.Service) [LARGE]
- [x] 1.2: Add ResultStore unit tests for CRUD, retention, and WAL mode behaviour [MEDIUM] (depends: 1.1)
- [x] 1.3: Create TaskService.ts that loads .tsk and .lam files from disk and caches them in SQLite tasks table [MEDIUM]
- [x] 1.4: Add TaskService unit tests for task loading, parsing, and ref_bits computation [SMALL] (depends: 1.3)
- [x] 1.5: Create LamConfig.ts adapting motel's config.ts pattern (env var parsing, defaults, parsePositiveInt) [SMALL]
- [x] 1.6: Create EvalService.ts that orchestrates single-task evaluation using existing Check.ts and Lamb.ts [LARGE] (depends: 1.1, 1.3, 1.9)
- [x] 1.7: Create BatchService.ts for batch job orchestration: create job, run evaluations concurrently, update status, allow status polling and resumption on restart [LARGE] (depends: 1.1, 1.6, 1.9)
- [x] 1.8: Add BatchService unit tests for job lifecycle, concurrent execution, and resumption logic [MEDIUM] (depends: 1.7)
- [x] 1.9: Update packages/domain/src/Api.ts and Benchmark.ts with shared schemas for EvalResult, BatchJob, ModelConfig, and HttpApi groups needed by server, client, and typed client [MEDIUM]

---
## Phase 2: HTTP API + Local Server — Adapt Motel Patterns [IN PROGRESS]
- [ ] 2.1: Create httpApi.ts adapting motel's httpApi.ts pattern (OpenApi annotations, HttpApiGroup, HttpApiEndpoint) for Lambench endpoints [LARGE] (depends: 1.9)
- [ ] 2.2: Create localServer.ts adapting motel's localServer.ts pattern (BunHttpServer, router, static SPA serve, query param parsing) [LARGE]
- [ ] 2.3: Create runtime.ts adapting motel's runtime.ts pattern (ManagedRuntime, Layer composition for all services) [MEDIUM]
- [ ] 2.4: Wire httpApi handlers into localServer.ts using the runtime [MEDIUM] (depends: 2.1, 2.2, 2.3)
- [ ] 2.5: Add handler integration tests for health, eval/single, eval/batch, results, and tasks endpoints [MEDIUM] (depends: 2.4)
- [ ] 2.6: Document Motel architecture in reference/motel/docs/architecture-and-domain.md (domain types, services, HTTP API, MCP, workflows) [LARGE]
- [ ] 2.7: Document Clanka architecture in reference/clanka/docs/architecture-and-domain.md (domain types, agent executor, tools, MCP client, workflows) [LARGE]
- [ ] 2.8: Create comprehensive comparison document analyzing LamBench, Motel, and Clanka architectures with evaluation and recommendations [LARGE] (depends: 2.6, 2.7)

---
## Phase 3: CLI + MCP + Typed Client — Adapt Motel Patterns [PENDING]
- [ ] 3.1: Create MotelClient.ts typed HTTP client generated from httpApi.ts using AtomHttpApi or Effect HTTP client [MEDIUM] (depends: 2.1)
- [ ] 3.2: Create cli.ts adapting motel's cli.ts pattern (command routing, JSON output, typed client usage) [LARGE] (depends: 1.5, 3.1)
- [ ] 3.3: Create mcp.ts adapting motel's mcp.ts pattern (McpServer.layerStdio, Toolkit.make, tool handlers) [MEDIUM]
- [ ] 3.4: Add MCP tool invocation tests verifying each tool returns correct schema [SMALL] (depends: 3.3)
- [ ] 3.5: Update index.ts argv-to-mode switch to route between CLI commands and server mode [SMALL] (depends: 3.2)

---
## Phase 4: Provider Refactor [PENDING]
- [ ] 4.1: Create LlmService domain service and OpenRouterLlmService backing service using @effect/ai-openrouter [MEDIUM]
- [ ] 4.2: Create OpenCodeGoLlmService backing service that uses user's opencode-go credentials [MEDIUM] (depends: 4.1)
- [ ] 4.3: Refactor ModelGuard.ts to accept LlmService instead of direct OpenRouterClient calls [MEDIUM] (depends: 4.1)
- [ ] 4.4: Refactor Check.ts to accept LlmService via ModelGuard instead of direct OpenRouterClient calls [MEDIUM] (depends: 4.3)
- [ ] 4.5: Refactor LambdaRlm.ts to accept LlmService via ModelGuard instead of direct OpenRouterClient calls [MEDIUM] (depends: 4.4)
- [ ] 4.6: Run full server test suite after provider refactor to confirm zero regressions in Lamb.ts, Check.ts, and LambdaRlm.ts [MEDIUM] (depends: 4.5)
- [ ] 4.7: Update ModelEvalRunner.ts and EvalService.ts to use LlmService-based evaluation [MEDIUM] (depends: 4.2, 4.6)

---
## Phase 5: Web UI Refresh [PENDING]
- [ ] 5.1: Update benchmark-atom.ts to fetch from /api/results via AtomHttpApi instead of static results.json [MEDIUM]
- [ ] 5.2: Create API client layer in client (api.ts) for tasks and results endpoints [SMALL]
- [ ] 5.3: Ensure Solarized theme, VimLine, BarChart, and all 6 panels render identically with live data [MEDIUM]
- [ ] 5.4: Update client build to support both local server proxy and static export for GitHub Pages [SMALL] (depends: 5.1)
