# LamBench-Pro Leaderboard — Spec

## Overview

Port the LamBench lambda calculus benchmark UI (from `reference/lambench/docs/index.html`) into the existing Effect-TS React client app (`apps/client`), deploying as a static GitHub Pages site. The Solarized color palette and Vim-style tabbed interface from the reference are preserved but implemented in React + Effect Atom. A weekly GitHub Actions workflow evaluates the top 2 models from OpenRouter rankings and commits results as `apps/client/public/data/results.json`.

## Functional Requirements

### FR-001 — Leaderboard UI
The client app SHALL render a tabbed leaderboard with 6 panels: `:intelligence`, `:speed`, `:elegance`, `:value`, `:problems`, `:matrix`.

### FR-002 — Instant tab switching
Tab switching SHALL be instant (no network request on tab change). All panels share pre-loaded benchmark data from a single fetch on app load.

### FR-003 — Solarized design
The UI SHALL use the Solarized color palette (base03–base3, yellow, orange, red, magenta, violet, blue, cyan, green) mapped to CSS variables. The existing OKLCH tokens SHALL remain for light/dark mode toggle compatibility.

### FR-004 — Intelligence panel
The `:intelligence` panel SHALL show models ranked by pass rate (right/total), with ASCII bar charts and percentage scores.

### FR-005 — Speed panel
The `:speed` panel SHALL show models ranked by tasks per minute (60/avgTime), with ASCII bar charts.

### FR-006 — Elegance panel
The `:elegance` panel SHALL show models ranked by mean solution elegance (% shorter than reference solution), with ASCII bar charts.

### FR-007 — Value panel
The `:value` panel SHALL show a table: Model | Pass% | Price per 1M output tokens | Pass/Dollar ratio (passRate / pricePerMOutputTokens), sorted by Pass/Dollar desc.

### FR-008 — Problems panel
The `:problems` panel SHALL show all 120 tasks with category filter buttons and pass/fail colored dots per model. Clicking a task row SHALL open a task detail modal.

### FR-009 — Matrix panel
The `:matrix` panel SHALL show a horizontally scrollable model × task grid with ✓/✗ per cell. Clicking a row SHALL open the task detail modal.

### FR-010 — Task modal
A task detail modal SHALL show task id, category, description, sample tests (input/expected), and per-model pass/fail. It SHALL close on Escape key or overlay click.

### FR-011 — Data loading
The app SHALL fetch benchmark data from `${BASE_URL}data/results.json` on load. Loading and error states SHALL be handled gracefully.

### FR-012 — GitHub Pages deployment
The app SHALL be deployable to GitHub Pages. The Vite base URL SHALL be configurable via `VITE_BASE_URL` environment variable.

### FR-013 — Lamb interpreter
A Lamb interpreter SHALL be implemented in TypeScript/Bun (`reference/lambench/src/lamb.ts`) that can normalize lambda calculus programs and measure binary encoding size (`--to-bin`), serving as a drop-in for the `lam`/`lam-hs` binary.

### FR-014 — OpenRouter top-2 evaluation
A GitHub Actions workflow SHALL run weekly (Monday 04:00 UTC) and on manual dispatch. It SHALL fetch the top 2 models from OpenRouter rankings, evaluate them against the 120 lambda calculus tasks, and commit results to `apps/client/public/data/results.json`.

### FR-015 — Pass per dollar metric
The evaluation runner SHALL fetch model pricing from `GET https://openrouter.ai/api/v1/models` and include `pricePerMOutputTokens` in the results JSON. The value panel computes `passPerDollar = passRate / pricePerMOutputTokens`.

### FR-016 — Local dev with mock data
A seed script SHALL generate a mock `results.json` so `bun dev --filter=client` works fully offline without requiring API keys or running evaluations.

### FR-017 — Tests
Unit tests SHALL cover: VimLine, BarChart, IntelligencePanel, ValuePanel, benchmark-atom (loading states), and Lamb interpreter (parse + eval).

### FR-018 — Remove RAG components
The existing RAG Builder components (chat-box, chunker-visualizer, upload-card) and their associated atoms and RPC client SHALL be deleted. The app SHALL be fully standalone (no server dependency).

## Non-Functional Requirements

- Tab switching latency: < 16ms (synchronous React state update, no I/O)
- Initial load: fetch one JSON file, no other network requests
- Build output: static files suitable for GitHub Pages
- Color scheme: preserve existing OKLCH tokens, add Solarized tokens
- Font: JetBrains Mono Variable (already in use)
- Effect patterns: use Effect Atom with `yield*` for all Effect operations
