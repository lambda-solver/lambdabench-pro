# LamBench Pro

A lambda calculus benchmark leaderboard for AI models. Evaluates the top OpenRouter models weekly on 120 lambda calculus tasks and publishes results as a Solarized/Vim-style tabbed leaderboard on GitHub Pages.

**Live site:** https://lambda-solver.github.io/lambdabench-pro/

## What It Does

- **Benchmarks AI models** on 120 lambda calculus tasks (identity, church numerals, booleans, BLC encoding, etc.) using a pure Bun interpreter — no external binary needed
- **Fetches the top 2 models** automatically from OpenRouter rankings each week
- **Publishes results** as a static React app on GitHub Pages with six leaderboard panels
- **Tracks over time** by committing `results.json` to the repo after each run

## Leaderboard Panels

| Tab | Metric |
|-----|--------|
| `:intelligence` | Models ranked by pass rate (problems solved) |
| `:speed` | Models ranked by average response time |
| `:elegance` | Models ranked by solution brevity vs. reference |
| `:value` | Pass rate per dollar (cost efficiency) |
| `:problems` | Browse tasks by category, click for details |
| `:matrix` | Full model × task pass/fail grid |

## Project Structure

```
.
├── apps/
│   └── client/                  # React leaderboard UI (Vite + Effect Atom)
│       └── public/data/
│           └── results.json     # Committed benchmark results (seed data included)
├── packages/
│   └── domain/                  # Shared Effect Schema types (BenchmarkData, Ranking, etc.)
├── reference/
│   └── lambench/                # Benchmark runner (standalone Bun scripts)
│       ├── src/
│       │   ├── lamb.ts          # Pure Bun lambda calculus interpreter
│       │   ├── lamb.test.ts     # 19 unit tests
│       │   ├── check.ts         # Evaluates model outputs against tasks
│       │   └── eval-runner.ts   # Fetches top models from OpenRouter
│       └── scripts/
│           ├── build-results.ts # Writes apps/client/public/data/results.json
│           └── seed-data.ts     # Generates mock results for local dev
└── .github/
    └── workflows/
        └── benchmark.yml        # Weekly CI: eval → commit → Pages deploy
```

## Quick Start

```bash
# Install monorepo dependencies
bun install

# Start the leaderboard UI (port 3000)
bun dev --filter=client
```

Open http://localhost:3000 — the UI loads from the committed `results.json` seed data, no API key needed.

## Running the Benchmark Locally

```bash
cd reference/lambench
bun install

# Copy env and configure
cp .env.example .env
# Edit .env: set DEV_MODE=true for mock data, or add OPENROUTER_API_KEY for real runs

# Run the full pipeline
bun src/eval-runner.ts       # Fetch/resolve top models
bun src/check.ts             # Evaluate model outputs
bun scripts/build-results.ts # Write results.json
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEV_MODE` | `true` | Skip live fetch, use mock models — no API key needed |
| `OPENROUTER_API_KEY` | — | Required for real runs (`DEV_MODE=false`) |
| `TOP_MODELS` | — | Comma-separated model IDs to override auto-fetch |
| `VITE_BASE_URL` | `/` | Base path for the client (set to `/lambdabench-pro/` for Pages) |

## CI / GitHub Pages

The `benchmark.yml` workflow runs every **Monday at 04:00 UTC** (and on `workflow_dispatch`):

1. Fetches the top 2 models from OpenRouter
2. Runs all 120 lambda calculus tasks against each model
3. Commits updated `results.json` to `main`
4. Builds the Vite client with `VITE_BASE_URL=/lambdabench-pro/`
5. Deploys to GitHub Pages

To trigger a deploy without running the benchmark (e.g. after a UI change), use `workflow_dispatch` with `skip_benchmark: true`.

To set up in your own fork:
1. Add `OPENROUTER_API_KEY` as a repository secret (`Settings → Secrets → Actions`)
2. Enable GitHub Pages via Actions (`Settings → Pages → Source: GitHub Actions`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun 1.2+ |
| Language | TypeScript 5.9 |
| UI framework | React 19 + Vite 8 |
| State management | Effect Atom (`@effect/atom-react`) |
| Schema / validation | Effect Schema 4-beta |
| Styling | Tailwind CSS 4 + Solarized palette |
| Monorepo | Turborepo |
| Linting / formatting | Biome 2.4 |
| Tests | Vitest 4 (38 unit tests) |

## Development Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun dev --filter=client` | Start UI dev server (port 3000, HMR) |
| `bun run build --filter=client` | Production build |
| `bun test` | Run all tests (Vitest) |
| `bun lint` | Lint with Biome |
| `bun format` | Format with Biome |
| `bun run type-check` | TypeScript check across all packages |

> **Tip:** Run `bun dev --filter=client` in a separate terminal while using OpenCode. Vite's HMR picks up every file save and updates the browser in ~100 ms.

## Learn More

- [Effect](https://effect.website/docs/introduction)
- [OpenRouter](https://openrouter.ai)
- [Original LamBench](https://github.com/VictorTaelin/lambench)
- [Turborepo](https://turborepo.com/docs)
