# Git Workflow Skill

## Pre-Commit Checklist (MUST PASS)

**⚠️ CRITICAL: Do NOT commit or push until ALL of the following pass locally.**
**Pushing code that fails CI blocks the entire team and wastes compute credits.**

Run these commands in order and verify each exits with code 0:

```bash
# 1. Biome lint (fastest gate — catches correctness issues first)
bun lint

# 2. TypeScript type check (catches type errors before they reach CI)
#    Use --filter=<workspace> to check only modified packages for speed
bun run type-check

# 3. Biome full check — lint + format + imports + more
#    This is the gate CI uses. It is stricter than `bun lint` alone.
bun format:check

# 4. Build verification (catches bundling and import errors)
bun run build

# 5. Tests for modified packages (catches regressions)
#    Run all packages if shared code changed:
bun run test
#    Or filter to specific workspaces:
#    bun run test --filter=server
#    bun run test --filter=client
#    bun run test --filter=@repo/rag
#    bun run test --filter=@repo/domain
```

If ANY command fails:
- Fix the issue locally
- Re-run the failing command until it passes
- Only then proceed to commit

## Commit and Push

```bash
git add -A
git commit -m "type(scope): description"
git push origin main
```

## Handling Push Rejections

The `benchmark.yml` workflow auto-commits `results.json` after every push. This causes the remote `main` to diverge from your local branch.

### Problem

```
! [rejected]  main -> main (fetch first)
error: failed to push some refs
```

### Solution

```bash
# Option 1: Pull with rebase (clean history)
git pull origin main --rebase && git push origin main

# Option 2: Configure git to always rebase
git config pull.rebase true
# Then just: git pull && git push

# Option 3: Force with lease (if you know no one else pushed)
git push --force-with-lease origin main
```

### Workflow with Auto-Commits

```bash
# Before starting work, always pull latest
git pull origin main --rebase

# Make changes...

# Run full pre-commit checklist
bun lint && bun run type-check && bun format:check && bun run build && bun run test

# Commit and push
git add -A && git commit -m "..." && git push origin main

# If rejected:
git pull origin main --rebase && git push origin main
```

## Merge Conflicts in results.json

The Benchmark workflow commits `results.json` with updated benchmark data. If you modified this file locally:

```bash
# Keep remote version (has latest benchmark data)
git checkout --theirs apps/client/public/data/results.json
git add apps/client/public/data/results.json

# Then re-apply your formatting fix if needed
printf '\n' >> apps/client/public/data/results.json
git add apps/client/public/data/results.json
```

## Lint vs Format: What's the Difference?

Our project uses **Biome** (not ESLint/Prettier). Two commands sound similar but do different things:

| Command | Script | What it does | Speed |
|---------|--------|-------------|-------|
| `bun lint` | `biome lint .` | Runs **only** lint rules (correctness, complexity, style, suspicious, performance) | Fast |
| `bun format:check` | `biome check .` | Runs **everything**: lint + format + organize imports + `noUnusedImports` + all other checks | Slower |

**When to use each:**
- `bun lint` — Quick check during development. Catches the most common issues fast.
- `bun format:check` — The **real CI gate**. This is what GitHub Actions runs. It catches formatting mistakes, unused imports, and import sorting issues that `bun lint` misses.
- `bun format` (alias `bun biome check --write .`) — Auto-fixes both lint and format issues. Run this if `bun format:check` fails.

**Why run both?** `bun lint` is fast feedback during development. `bun format:check` is the comprehensive gate that matches CI. Running both ensures nothing slips through.

## Biome Lint Rules (Enforced in CI)

| Rule | What it means | Pattern to use |
|------|---------------|----------------|
| `noArrayIndexKey` | Never use `key={i}` in React `.map()` | Use content-based keys |
| `useLiteralKeys` | Prefer dot notation for known properties | `obj.field` for known keys; `obj["dynamic"]` for Record index access |
| `noExplicitAny` | Ban the `any` type | Use `unknown` + `as unknown as T` |
| `useYield` | Only use `yield*` inside generators | Plain arrows for simple mocks |

Note: `useLiteralKeys` infos on `Record<string, unknown>` bracket access are acceptable and do not fail CI.

## How Reference Projects Do It

| Project | Linter | Formatter | Type Check | Test Runner |
|---------|--------|-----------|------------|-------------|
| **Clanka** | `oxlint` | `prettier` | `pnpm tsc -b` | `vitest run` |
| **Motel** | (none) | (none) | `tsc --noEmit` | `bun test` |
| **Hazel** | `oxlint` | `oxfmt` | `turbo build typecheck` | `vitest run` |
| **This project** | `biome lint` | `biome check` | `turbo run type-check` | `vitest run` |

**Key differences:**
- Biome is an all-in-one tool (lint + format + imports) — replaces ESLint + Prettier + import plugins
- `oxlint`/`oxfmt` are faster but separate tools from the oxlint project
- Motel has minimal tooling (only typecheck) because it's a focused CLI tool

## Important Files

- `.github/workflows/check.yml` — CI lint/type-check/test
- `.github/workflows/benchmark.yml` — Auto-commits results, deploys to Pages
- `apps/client/public/data/results.json` — Auto-modified by CI

## Reference

See root `AGENTS.md` for full project conventions.
