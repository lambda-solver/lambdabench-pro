<!-- PLAN_HASH: 1uophcevig6hq -->
# LamBench-Pro Leaderboard on GitHub Pages
Swarm: lambench-pro-leaderboard
Phase: 1 [IN PROGRESS] | Updated: 2026-04-24T19:56:10.823Z

---
## Phase 1: Domain schemas [IN PROGRESS]
- [ ] 1.1: Create packages/domain/src/Benchmark.ts with Effect Schema types: Ranking (model, right, total, pct, avgTime, timestamp, tasks pass map, taskBits, taskRefs, pricePerMOutputTokens), BenchmarkData (rankings, tasks, categories, generatedAt), ValueEntry (model, passRate, price, passPerDollar). Export schemas and TypeScript types. All schemas use Schema.Struct, Schema.Array, Schema.Record(key,value) per Effect 4 beta API. [SMALL] ← CURRENT

---
## Phase 2: Lamb interpreter [IN PROGRESS]
- [ ] 2.1: Write reference/lambench/src/lamb.ts: minimal Lamb interpreter in Bun TypeScript. Parser: tokenize and parse @name=term, lambda x., application f(a,b), variables, @refs. Evaluator: normal-order beta reduction to full normal form (normalize under lambdas). Printer: canonical variable names (a,b,c,...). --to-bin flag: BLC encoding. NOTE: lamb.ts is a CLI script run by Bun, NOT an Effect program - plain TS is correct here since it replaces an external binary. [LARGE]
- [ ] 2.2: Update reference/lambench/src/check.ts: if lam-hs and lam not found, default LAM_BIN to 'bun <abs-path>/lamb.ts'. Add reference/lambench/src/lamb.test.ts with unit tests for parse+eval (identity, cnat_add(0,0), bool not). NOTE: check.ts and bench.ts are also plain Bun scripts (not Effect programs) - keep them in their existing style. [SMALL] (depends: 2.1)

---
## Phase 3: Evaluation runner and build script [PENDING]
- [ ] 3.1: Create reference/lambench/src/eval-runner.ts: fetch GET https://openrouter.ai/api/v1/models with OPENROUTER_API_KEY, fetch https://openrouter.ai/rankings HTML to determine top 2 model IDs by rank, output {modelId, pricePerMOutput}[] for top 2. Fallback: TOP_MODELS env var. Modify reference/lambench/src/bench.ts to accept --price-per-m flag and embed pricePerMOutputTokens in report JSON. Plain Bun scripts, no Effect. [MEDIUM]
- [ ] 3.2: Modify reference/lambench/scripts/build.ts to output apps/client/public/data/results.json (BenchmarkData schema shape) alongside or instead of docs/index.html. Include generatedAt ISO timestamp and pricePerMOutputTokens per ranking. Add reference/lambench/scripts/seed-data.ts: generates mock results.json with 2 sample models for local dev. Plain Bun scripts. [MEDIUM] (depends: 3.1)

---
## Phase 4: Client atom and CSS [PENDING]
- [ ] 4.1: Update apps/client/src/lib/atom.ts: remove RpcClient layer, use Layer.empty (static site, no server). Delete rpc-client.ts, atoms/chat-atom.ts, atoms/chunker-atom.ts, atoms/upload-atom.ts. Create apps/client/src/lib/atoms/benchmark-atom.ts using Effect Atom pattern: runtime.fn(() => Effect.gen(function*() { ... })) to fetch and decode results.json via FetchHttpClient. Use AsyncResult.match in components. Compute ValueEntry[] client-side. [MEDIUM]
- [ ] 4.2: Add Solarized CSS variables to apps/client/src/index.css alongside existing OKLCH tokens: --sol-base03 through --sol-base3, --sol-yellow, --sol-orange, --sol-red, --sol-magenta, --sol-violet, --sol-blue, --sol-cyan, --sol-green. Light mode: Solarized light background. Dark mode: Solarized dark. Map to custom Tailwind tokens in @theme inline block. [SMALL]

---
## Phase 5: UI primitives [PENDING]
- [ ] 5.1: Create apps/client/src/components/leaderboard/VimLine.tsx: Vim-style line with optional line number (ln) and content (lc) columns. Create BarChart.tsx: ASCII block bar with Solarized color thresholds (>=70% green, >=45% blue, >=20% yellow, else red). Create TabLine.tsx: sticky top tab strip with tab buttons using Solarized tokens. All pure React components using cn() and existing Tailwind patterns. [SMALL]
- [ ] 5.2: Create apps/client/src/components/leaderboard/TaskModal.tsx: modal overlay showing task id, category, description lines, sample tests (input/expected), per-model pass/fail icons. Closes on Escape key (useEffect keydown) or overlay click. Uses VimLine for rows. Pure React component. [SMALL]

---
## Phase 6: Leaderboard panels [PENDING]
- [ ] 6.1: Create IntelligencePanel.tsx, SpeedPanel.tsx, ElegancePanel.tsx in apps/client/src/components/leaderboard/. Each receives BenchmarkData as props (no async inside). Intelligence: sorted by right desc, VimLine+BarChart per model. Speed: 60/avgTime desc. Elegance: mean shorter% = (1-bits/ref)*100. Pure React components using Solarized CSS vars. [MEDIUM]
- [ ] 6.2: Create ValuePanel.tsx: table Model|Pass%|Price/1M output|Pass/Dollar sorted by passPerDollar desc, styled with Solarized tokens. Create ProblemsPanel.tsx: category filter buttons, task list with pass/fail dots per model, click opens TaskModal via onTaskClick prop. Create MatrixPanel.tsx: scrollable model x task grid with checkmark/cross per cell, row click opens TaskModal. Pure React components. [MEDIUM] (depends: 6.1)

---
## Phase 7: App shell and Vite config [PENDING]
- [ ] 7.1: Rewrite apps/client/src/app.tsx: useAtomValue(benchmarkAtom) for data (or useAtom), useState for active tab (instant switch, no re-fetch), render TabLine + 6 panels + StatusLine. Use AsyncResult.match for loading/error/success states. Remove all RAG imports. Delete chat-box.tsx, chunker-visualizer.tsx, upload-card.tsx, components/chunker/ directory. Update app.test.tsx for new structure. [MEDIUM] (depends: 4.1, 6.2)
- [ ] 7.2: Update apps/client/vite.config.ts: base from VITE_BASE_URL env var defaulting to /. Remove @repo/rag from optimizeDeps. Create apps/client/.env.example with VITE_BASE_URL=/ docs. Update apps/client/package.json: remove @repo/rag dependency. Update main.tsx if needed to remove server-dependent providers. [SMALL] (depends: 7.1)

---
## Phase 8: GitHub Actions workflows [PENDING]
- [ ] 8.1: Create .github/workflows/benchmark.yml: schedule cron 0 4 * * 1 + workflow_dispatch. Steps: checkout, setup bun, install deps, run eval-runner to get top 2 models, run bench.ts for each, run build.ts to write results.json, commit+push results.json, vite build with VITE_BASE_URL, deploy to GitHub Pages via actions/upload-pages-artifact + actions/deploy-pages. Env: OPENROUTER_API_KEY secret, VITE_BASE_URL var. [MEDIUM]
- [ ] 8.2: Update .github/workflows/check-client.yml: fix actions/checkout from v6 to v4 (v6 does not exist). Add deploy job triggered on main push that builds and deploys current results.json to GitHub Pages (reuses existing results.json without re-running eval). Setup action must also use correct version. [SMALL] (depends: 8.1)

---
## Phase 9: Tests [PENDING]
- [ ] 9.1: Write client tests using vitest-browser-react pattern: app.test.tsx (6 tabs present, tab switching works with mock BenchmarkData). VimLine.test.tsx (renders ln+lc). BarChart.test.tsx (correct color class per threshold). IntelligencePanel.test.tsx (sorted by pass rate). ValuePanel.test.tsx (passPerDollar = passRate/price). benchmark-atom.test.ts (mock fetch, AsyncResult Initial->Success state). All tests import from @effect/atom-react for hook testing context. [MEDIUM] (depends: 7.1)
- [ ] 9.2: Write reference/lambench/src/lamb.test.ts: unit tests for Lamb interpreter. Test: identity function, cnat_add(0,0)=la.lb.b, cnat_add(1,1)=la.lb.a(a(b)), bool not, --to-bin returns non-empty string. Uses bun:test. [SMALL] (depends: 2.2)

---
## Phase 10: Seed data and local dev verification [PENDING]
- [ ] 10.1: Run bun reference/lambench/scripts/seed-data.ts to generate apps/client/public/data/results.json with 2 mock model entries. Verify bun dev --filter=client starts and leaderboard loads from mock data with all 6 tabs rendering. Run bun build --filter=client to verify production build succeeds for GitHub Pages. [SMALL] (depends: 3.2, 9.1)
