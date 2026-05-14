# Git Workflow Skill

## Pre-Commit Checklist

Before every commit and push, ALL Biome checks must pass:

```bash
# 1. Run linter (must show 0 errors)
bun lint

# 2. Run format check (must show no fixes needed)
bun format:check

# 3. Run type check
bun run type-check

# 4. Run tests (at least for modified packages)
bun run test --filter=server
```

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

# Run checks
bun lint && bun format:check

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

## Biome Lint Rules (Enforced in CI)

| Rule | What it means | Pattern to use |
|------|---------------|----------------|
| `noArrayIndexKey` | Never use `key={i}` in React `.map()` | Use content-based keys |
| `useLiteralKeys` | Prefer dot notation for known properties | `obj.field` for known keys; `obj["dynamic"]` for Record index access |
| `noExplicitAny` | Ban the `any` type | Use `unknown` + `as unknown as T` |
| `useYield` | Only use `yield*` inside generators | Plain arrows for simple mocks |

Note: `useLiteralKeys` infos on `Record<string, unknown>` bracket access are acceptable and do not fail CI.

## Important Files

- `.github/workflows/check.yml` — CI lint/type-check/test
- `.github/workflows/benchmark.yml` — Auto-commits results, deploys to Pages
- `apps/client/public/data/results.json` — Auto-modified by CI

## Reference

See root `AGENTS.md` for full project conventions.
