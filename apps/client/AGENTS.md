# Client AGENTS.md

> See root `/AGENTS.md` for monorepo conventions.

## Commands

| Command                                  | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `bun dev --filter=client`                | Start dev server (port 3000, Vite HMR)       |
| `bun test --filter=client`               | Run client tests (Vitest + Playwright)       |
| `bun run build --filter=client`          | Production build → `apps/client/dist/`       |
| `bun run type-check`                     | TypeScript check across all packages         |
| `bunx playwright install chromium`       | **One-time local setup** — download Chromium |

> Tests use Vitest's browser mode with Playwright/Chromium. CI installs it
> automatically (`bunx playwright install chromium --with-deps`). Locally you
> must run the install command once; it is not bundled with `bun install`.

## Dev Workflow

Run the dev server in a **separate terminal** and leave it running. OpenCode edits files; Vite HMR picks up every save and hot-reloads the browser in ~100 ms — no restart needed.

```bash
# Terminal 1 — keep running
bun dev --filter=client   # → http://localhost:3000

# Terminal 2 — OpenCode session
# Make changes here; browser updates live
```

## Architecture

This client is a **static leaderboard** — no backend API. It fetches `public/data/results.json` at startup and renders everything client-side.

```
src/
├── lib/
│   ├── atom.ts                        # Effect Atom runtime (FetchHttpClient layer)
│   └── atoms/
│       └── benchmark-atom.ts          # Fetches + decodes results.json
├── components/
│   ├── leaderboard/                   # Six leaderboard panels + shared primitives
│   │   ├── TabLine.tsx                # Vim-style tab strip (centered, sticky top)
│   │   ├── VimLine.tsx                # Single buffer line with line-number gutter
│   │   ├── BarChart.tsx               # ASCII block bar (single █ glyph, gradient color)
│   │   ├── IntelligencePanel.tsx      # Ranked by pass rate
│   │   ├── SpeedPanel.tsx             # Ranked by avg response time
│   │   ├── ElegancePanel.tsx          # Ranked by solution brevity
│   │   ├── ValuePanel.tsx             # Ranked by pass/dollar
│   │   ├── ProblemsPanel.tsx          # Task browser with category filter
│   │   ├── MatrixPanel.tsx            # Model × task pass/fail grid
│   │   └── TaskModal.tsx              # Task detail overlay
│   └── theme-toggle.tsx
└── app.tsx                            # Shell: tab state, AsyncResult.match, statusline
```

## State Management: Effect Atom

Uses `@effect/atom-react` — **not** standard Jotai.

```typescript
// lib/atom.ts — runtime with FetchHttpClient
import { Atom } from "@effect/atom"
import { FetchHttpClient } from "effect/unstable/http"
export const runtime = Atom.runtime(FetchHttpClient.layer)

// lib/atoms/benchmark-atom.ts
export const benchmarkAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get(resultsUrl())
    const body = yield* response.json
    return yield* Schema.decodeUnknownEffect(BenchmarkDataSchema)(body)
  })
)

// Component usage
const result = useAtomValue(benchmarkAtom)
AsyncResult.match(result, {
  onInitial: () => <Loading />,
  onFailure: (e) => <Error />,
  onSuccess: (s) => <View data={s.value} />,
})
```

Key rules:
- `useAtomValue(atom)` returns `AsyncResult<A, E>` — match with `AsyncResult.match`
- `onSuccess` receives `Success<A,E>` — access data via `.value`
- Import: `import { AsyncResult } from "effect/unstable/reactivity"`
- `Schema.decode` does not exist — use `Schema.decodeUnknownEffect(schema)(input)`

## Styling: Tailwind CSS 4 + Solarized

- **Config**: CSS-based (`src/index.css`), no JS config file
- **Palette**: Solarized tokens via CSS variables — `var(--sol-base3)`, `var(--sol-green)`, etc.
- **Merging**: Always use `cn()` from `@/lib/utils` for dynamic classes
- **Font**: JetBrains Mono Variable (`font-mono`) throughout
- **Theme**: Light = Solarized Light, Dark = Solarized Dark (toggled via `.dark` class)

### Solarized token reference

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--sol-base3` | `#fdf6e3` | `#002b36` | Page background |
| `--sol-base2` | `#eee8d5` | `#073642` | Tab bar, statusline |
| `--sol-base1` | `#93a1a1` | `#586e75` | Comments, dim text |
| `--sol-base00` | `#657b83` | `#839496` | Body text |
| `--sol-green` | `#859900` | same | ≥70% bar fill |
| `--sol-blue` | `#268bd2` | same | ≥45% bar fill, model names |
| `--sol-yellow` | `#b58900` | same | ≥20% bar fill, headings |
| `--sol-red` | `#dc322f` | same | <20% bar fill |

## BarChart

Uses a single `█` glyph repeated for both filled and empty portions — **never mix `█` and `░`** as they have different vertical metrics in JetBrains Mono and will misalign. The empty portion is rendered at reduced opacity.

```tsx
<BarChart pct={75} width={28} />
```

## VimLine

Every content row is a `<VimLine n={lineNum}>`. Provides the line-number gutter (4ch wide) and a `flex-1` content area.

```tsx
<VimLine n={1}>
  <span className="text-[var(--sol-blue)]">model-name</span>
  <BarChart pct={pct} />
  <span className="text-[var(--sol-magenta)]"> 95/120</span>
</VimLine>
```

## Data File

`public/data/results.json` is committed to git (not gitignored). It contains seed data with 2 model rankings across 120 tasks. The weekly CI workflow overwrites it and redeploys Pages.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_BASE_URL` | `/` | Base path — set to `/lambdabench-pro/` for GitHub Pages |

## Deployment

Every push to `main` triggers a GitHub Actions workflow that builds the client and deploys to GitHub Pages at:
**https://lambda-solver.github.io/lambdabench-pro/**

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._
