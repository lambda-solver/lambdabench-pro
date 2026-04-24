<!-- PLAN_HASH: 4ht8qjf8zgyg -->
# LamBench-Pro Leaderboard on GitHub Pages
Swarm: lambench-pro-leaderboard
Phase: 1 [COMPLETE] | Updated: 2026-04-24T20:42:16.062Z

---
## Phase 1: Domain schemas [COMPLETE]
- [x] 1.1: Create packages/domain/src/Benchmark.ts with Effect Schema types: Ranking (model, right, total, pct, avgTime, timestamp, tasks pass map, taskBits, taskRefs, pricePerMOutputTokens), BenchmarkData (rankings, tasks, categories, generatedAt), ValueEntry (model, passRate, price, passPerDollar). Export schemas and TypeScript types. All schemas use Schema.Struct, Schema.Array, Schema.Record(key,value) per Effect 4 beta API. [SMALL]

---
## Phase 2: Lamb interpreter [COMPLETE]
- [x] 2.1: Write reference/lambench/src/lamb.ts: minimal Lamb interpreter in Bun TypeScript. Parser: tokenize and parse @name=term, lambda x., application f(a,b), variables, @refs. Evaluator: normal-order beta reduction to full normal form. Printer: canonical variable names. --to-bin flag: BLC encoding. [LARGE]
- [x] 2.2: Update reference/lambench/src/check.ts: LAM_BIN defaults to 'bun <abs-path>/lamb.ts'. Add reference/lambench/src/lamb.test.ts with unit tests for parse+eval (identity, cnat_add, bool not). 19 tests all pass. [SMALL] (depends: 2.1)

---
## Phase 3: Evaluation runner and build script [COMPLETE]
- [x] 3.1: Create reference/lambench/src/eval-runner.ts: fetch top 2 models from openrouter.ai/api/v1/models + /rankings HTML, output model IDs + pricePerMOutput. TOP_MODELS env fallback. Effect-TS style with Effect.gen + Effect.runPromise. [MEDIUM]
- [x] 3.2: Create reference/lambench/scripts/build-results.ts: reads res/*.txt + tsk/*.tsk + top-models.json, writes apps/client/public/data/results.json in BenchmarkData schema. Add seed-data.ts generating mock results.json with 2 sample models. [MEDIUM] (depends: 3.1)

---
## Phase 4: Client atom and CSS [COMPLETE]
- [x] 4.1: Update apps/client/src/lib/atom.ts: Atom.runtime(FetchHttpClient.layer). Create benchmark-atom.ts: runtime.atom(Effect.gen) fetching results.json, decoding with Schema.decodeUnknownEffect, exporting computeValueEntries. Stub out old RAG atoms. [MEDIUM]
- [x] 4.2: Add Solarized CSS variables to apps/client/src/index.css: --sol-base03 through --sol-base3 and accent colors. Light mode: Solarized light. Dark mode: inverted base. Map to @theme inline Tailwind tokens. [SMALL]

---
## Phase 5: UI primitives [COMPLETE]
- [x] 5.1: Create VimLine.tsx (Vim-style line number + content), BarChart.tsx (ASCII block bar, Solarized color thresholds >=70% green/>=45% blue/>=20% yellow/else red), TabLine.tsx (6-tab strip: intelligence/speed/elegance/value/problems/matrix). [SMALL]
- [x] 5.2: Create TaskModal.tsx: overlay showing task id, description, sample tests, per-model pass/fail. Closes on Escape or overlay click. [SMALL]

---
## Phase 6: Leaderboard panels [COMPLETE]
- [x] 6.1: Create IntelligencePanel.tsx (sorted by right desc + BarChart), SpeedPanel.tsx (60/avgTime desc), ElegancePanel.tsx (mean shorter% vs reference bits). All receive BenchmarkData as props. [MEDIUM]
- [x] 6.2: Create ValuePanel.tsx (pass%/price/pass-per-dollar table), ProblemsPanel.tsx (category filter + task list + onTaskClick), MatrixPanel.tsx (scrollable model x task grid + onTaskClick). [MEDIUM] (depends: 6.1)

---
## Phase 7: App shell and Vite config [COMPLETE]
- [x] 7.1: Rewrite apps/client/src/app.tsx: useAtomValue(benchmarkAtom), useState<TabId> for instant tab switching, AsyncResult.match for loading/error/success, render TabLine + 6 panels + statusline. Stub out RAG component files. [MEDIUM] (depends: 4.1, 6.2)
- [x] 7.2: Update vite.config.ts: base from VITE_BASE_URL env. Remove @repo/rag from package.json. Create .env.example. Fix server port to 3000. [SMALL] (depends: 7.1)

---
## Phase 8: GitHub Actions workflows [COMPLETE]
- [x] 8.1: Create .github/workflows/benchmark.yml: weekly cron 0 4 * * 1 + workflow_dispatch. Steps: checkout, bun install, eval-runner, check.ts eval, build-results.ts, commit results.json, build client with VITE_BASE_URL, deploy to GitHub Pages. [MEDIUM]
- [x] 8.2: Fix .github/workflows/check-client.yml: actions/checkout@v6 -> @v4. Remove Playwright install from check job (tests need it only in CI). Ensure all jobs use @v4. [SMALL] (depends: 8.1)

---
## Phase 9: Tests [COMPLETE]
- [x] 9.1: Client tests: benchmark-atom.test.ts (6 unit tests for computeValueEntries), app.test.tsx (5 browser tests for tabs/statusline/loading), VimLine.test.tsx, BarChart.test.tsx, IntelligencePanel.test.tsx, ValuePanel.test.tsx. [MEDIUM] (depends: 7.1)
- [x] 9.2: reference/lambench/src/lamb.test.ts: 19 unit tests covering identity, cnat_add, bool_not, BLC encoding, all passing via bun test. [SMALL] (depends: 2.2)

---
## Phase 10: Seed data and local dev verification [COMPLETE]
- [x] 10.1: Run seed-data.ts to generate results.json. Verify bun build --filter=client succeeds (347 modules, no errors). Type-check clean across all packages. [SMALL] (depends: 3.2, 9.1)
