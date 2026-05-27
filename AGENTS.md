# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

> **SKILLS:** This AGENTS.md file is the complete skill catalog with agent-specific routing trees. The architect MUST always pass this file to every agent delegation — agents read it to discover which domain-specific skills apply to their task.

## Commands

| Command                                                          | Purpose                                           |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| `bun install`                                                    | Install dependencies                              |
| `bun dev`                                                        | Start all apps (client:3000, server:9000)          |
| `bun dev --filter=client`                                        | Start client only                                 |
| `bun dev --filter=server`                                        | Start server only                                 |
| `bun run build`                                                  | Build all apps                                    |
| `bun run type-check`                                             | TypeScript check (all packages)                   |
| `bun lint`                                                       | oxlint check (all packages)                       |
| `bun lint:fix`                                                   | oxlint auto-fix (all packages)                    |
| `bun format`                                                     | oxfmt format (all packages)                       |
| `bun format:check`                                               | oxfmt format check (all packages)                 |
| `bun run test`                                                   | Run all tests via turbo (Vitest)                  |
| `bun run test --filter=server`                                   | Run server tests only                             |
| `bun run test --filter=client`                                   | Run client unit tests only                        |
| `bun test --filter=server -- src/file.test.ts`                   | Run single server test file                       |
| `vitest run --config apps/client/vitest.visual.config.ts`        | Run client visual regression tests                |
| `tmux new-session -d -s server 'bun dev --filter=server'`       | Start server in tmux session                      |
| `tmux new-session -d -s client 'bun dev --filter=client'`       | Start client in tmux session                      |
| `tmux new-session -d -s storybook 'bun run storybook'`            | Start Storybook in tmux session                   |
| `tmux attach -t <name>`                                         | Attach to tmux session to see live logs           |
| `tmux kill-session -t <name>`                                   | Kill a tmux session                               |
| `tmux ls`                                                        | List all running tmux sessions                    |
| `lsof -ti:9000 \| xargs kill -9`                                 | Kill process on port 9000                         |

## Tech Stack

| Layer      | Technology                                                      |
| ---------- | --------------------------------------------------------------- |
| Runtime    | Bun 1.2+                                                        |
| Language   | TypeScript 5.9                                                  |
| Effect     | `effect@4.0.0-beta.52`                                          |
| UI         | React 19, Vite 8, Tailwind CSS 4                                |
| Testing    | Vitest 4, `@effect/vitest`                                      |
| Linting    | oxlint 1.65+ with `@mpsuesser/oxlint-plugin-effect` (only oxlint — no Biome, ESLint, or Prettier) |
| Formatting | oxfmt 0.50+                                                     |

## Reference Projects

Consult these for canonical Effect 4 patterns. **Read only — never modify.**

| Reference       | Location                 | Use for                                                  |
| --------------- | ------------------------ | -------------------------------------------------------- |
| **Hazel**       | `reference/hazel/`       | Mock layers, `serviceShape`, HTTP API patterns           |
| **Clanka**      | `reference/clanka/`      | LanguageModel mocking, Toolkit, AI patterns               |
| **effect-smol** | `reference/effect-smol/` | `Effect.fn`, `Layer`, `Context.Service` canonical API    |

---

_This document is a living guide. Update it as the project evolves and new patterns emerge._

## CLI Command Discipline

Always use the **package.json script commands** defined in the [Commands](#commands) table above. Never invoke tools directly:

| Use this                          | NOT this                    |
| --------------------------------- | --------------------------- |
| `bun lint`                        | `npx oxlint .`              |
| `bun lint:fix`                    | `npx oxlint --fix .`        |
| `bun run build`                   | `npx tsc --noEmit`          |
| `bun run type-check`              | `npx tsc --noEmit`          |
| `bun format`                      | `npx oxfmt . --write`       |
| `bun format:check`                | `npx oxfmt . --check`       |
| `bun run test`                    | `npx vitest run`            |
| `bun run test --filter=client`    | `cd apps/client && npx vitest run` |

Rationale: Package scripts encapsulate project-specific configuration (config files, plugins, workspace filters). Direct invocations bypass these settings and may produce different results.

## Skills

Skills provide specialized instructions and workflows for specific tasks. **The architect MUST always pass this AGENTS.md file to every agent delegation** — agents read it to discover which domain-specific skills apply to their task.

### How Agents Use This File

When you receive a task:
1. Identify your agent type below
2. Check the task domain (Effect, React, Testing, etc.)
3. Load the skills matching your domain from your agent's tree using the `skill` tool
4. If you need a skill not listed under your agent, check "Universal Reference" — it lists ALL skills so you know what exists

### Anti-patterns to Avoid

- **Never skip skill discovery** — even "simple" tasks can violate project conventions
- **Never pass Effect skills for non-Effect code** — React visual tests don't use `Effect.fn` or `Effect.gen`
- **Never skip domain skills for "simple" tasks** — even one-line changes can violate project conventions
- **Never pass `01-test-services` to `coder` for non-Effect tests** — mock layers are only for Effect service tests
- **Always forward `SKILLS_USED_BY_CODER` to `reviewer`** — the reviewer cannot verify skill compliance without knowing what skills the coder received
- **Always pass `02-vitest-patterns` for ANY test file** — covers `@effect/vitest` imports, `it.effect`, `it.layer`, proper assertions
- **Always pass React skills for React code** — `01-fp-style` minimum; add `02-component-composition` for compound components (Card, Accordion, etc.); add `04-anti-patterns` to catch JSX repetition, prop drilling, useEffect misuse

## Skill Tree by Agent

### coder
Load skills matching the code domain you are implementing:

**Effect Core**
- `file:.opencode/skills/effect-ts/core/01-fundamentals/SKILL.md` — Effect.gen, yield*, pipe, combinators
- `file:.opencode/skills/effect-ts/core/02-services-layers/SKILL.md` — Context.Service, Layer.effect, DI
- `file:.opencode/skills/effect-ts/core/03-error-model/SKILL.md` — TaggedErrorClass, defects, union errors
- `file:.opencode/skills/effect-ts/core/04-resources/SKILL.md` — Scope, acquireRelease, lifecycle
- `file:.opencode/skills/effect-ts/core/05-concurrency/SKILL.md` — Effect.all, fibers, Ref, structured concurrency
- `file:.opencode/skills/effect-ts/core/06-streams/SKILL.md` — Stream creation, transformation, sinks

**Effect Patterns**
- `file:.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md` — Effect.fn, Context.Service, conventions
- `file:.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md` — Plain generators, catchAll, for loops
- `file:.opencode/skills/effect-ts/patterns/03-error-handling/SKILL.md` — Effect.catch, catchTag, absorb
- `file:.opencode/skills/effect-ts/patterns/04-observability/SKILL.md` — Logging, spans, tracing, metrics

**Effect Platform**
- `file:.opencode/skills/effect-ts/platform/01-atoms/SKILL.md` — useAtomValue, Atom.make, React atoms
- `file:.opencode/skills/effect-ts/platform/02-http-client/SKILL.md` — HttpClient, requests, decoding
- `file:.opencode/skills/effect-ts/platform/03-ai-language-model/SKILL.md` — LanguageModel, OpenRouter, mocking

**Effect Schema**
- `file:.opencode/skills/effect-ts/schema/01-validation/SKILL.md` — Schema.decode, struct/union, brands
- `file:.opencode/skills/effect-ts/schema/02-transformations/SKILL.md` — Schema.transform, codecs
- `file:.opencode/skills/effect-ts/schema/03-api-contracts/SKILL.md` — HttpApi REST contracts, routes

**React**
- `file:.opencode/skills/react/patterns/01-fp-style/SKILL.md` — Pure components, hooks, Tailwind
- `file:.opencode/skills/react/patterns/02-component-composition/SKILL.md` — Render props, compound components
- `file:.opencode/skills/react/patterns/03-state-management/SKILL.md` — Lifting state, TanStack Query
- `file:.opencode/skills/react/patterns/04-anti-patterns/SKILL.md` — JSX repetition, useEffect misuse
- `file:.opencode/skills/react/animation/SKILL.md` — react/motion animations, gestures

**TanStack**
- `file:.opencode/skills/tanstack/01-query/SKILL.md` — Server state, caching, mutations
- `file:.opencode/skills/tanstack/02-router/SKILL.md` — Type-safe routing, layouts, params

**Testing**
- `file:.opencode/skills/effect-ts/testing/01-test-services/SKILL.md` — Mock services, Layer.succeed
- `file:.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md` — it.effect, it.scoped, assertions
- `file:.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md` — Schema Arbitrary, fast-check
- `file:.opencode/skills/effect-ts/testing/04-bun-test/SKILL.md` — Bun runner, zero-config tests

**Infrastructure**
- `file:.opencode/skills/effect-ts/oxlint/SKILL.md` — Custom oxlint rules with Effect
- `file:.opencode/skills/tmux/SKILL.md` — tmux sessions, dev servers
- `file:.opencode/skills/git/SKILL.md` — Git workflow, pre-commit checklist, push handling

**Bend/HVM**
- `file:.opencode/skills/bend-hvm/01-syntax/SKILL.md` — ADTs, pattern matching, HVM
- `file:.opencode/skills/bend-hvm/02-execution/SKILL.md` — Lazy evaluation, reduction
- `file:.opencode/skills/bend-hvm/03-patterns/SKILL.md` — Recursion, fold/unfold
- `file:.opencode/skills/bend-hvm/04-concurrency/SKILL.md` — Parallel trees, fork/join
- `file:.opencode/skills/bend-hvm/05-testing/SKILL.md` — Bend unit tests, property tests
- `file:.opencode/skills/bend-hvm/06-memory/SKILL.md` — Interaction nets, GC, layout
- `file:.opencode/skills/bend-hvm/07-benchmarking/SKILL.md` — Profiling HVM, IPS
- `file:.opencode/skills/bend-hvm/08-ffi/SKILL.md` — C interop, native bindings

### reviewer
Load the same domain skills the coder received (via `SKILLS_USED_BY_CODER`), plus:

**Always**
- `file:.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md` — Verify conventions

**Effect code review**
- `file:.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md` — Catch anti-patterns

**React code review**
- `file:.opencode/skills/react/patterns/04-anti-patterns/SKILL.md` — Catch React anti-patterns

### test_engineer
Load skills matching the test type:

**All tests**
- `file:.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md` — it.effect, assertions

**Effect service tests**
- `file:.opencode/skills/effect-ts/testing/01-test-services/SKILL.md` — Mock layers, DI

**Property tests**
- `file:.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md` — Arbitrary, fast-check

**Bun runner**
- `file:.opencode/skills/effect-ts/testing/04-bun-test/SKILL.md` — Bun test runner

### sme
Load domain skills for the consultation area:

**Effect domain**
- `file:.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md` — Effect conventions

**Other domains**
- Check coder/reviewer trees for relevant domain skills

### critic
- `file:.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md` — Plan feasibility
- `file:.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md` — Anti-pattern detection

### docs
- Context-specific skills from coder/reviewer trees as needed

### explorer
- No specific skills required; factual mapping only

## Universal Reference — All Skills

If a skill you need is not listed under your agent type above, it still exists here. Load any skill from this list if your task requires it.

| Skill | Location | Description |
|-------|----------|-------------|
| 01-atoms | `file:.opencode/skills/effect-ts/platform/01-atoms/SKILL.md` | Atom reactivity, React integration |
| 01-best-practices | `file:.opencode/skills/effect-ts/patterns/01-best-practices/SKILL.md` | Effect.fn, Context.Service, conventions |
| 01-fp-style | `file:.opencode/skills/react/patterns/01-fp-style/SKILL.md` | Pure components, hooks, Tailwind |
| 01-fundamentals | `file:.opencode/skills/effect-ts/core/01-fundamentals/SKILL.md` | Effect.gen, yield*, pipe, runtime |
| 01-syntax | `file:.opencode/skills/bend-hvm/01-syntax/SKILL.md` | ADTs, pattern matching, HVM |
| 01-test-services | `file:.opencode/skills/effect-ts/testing/01-test-services/SKILL.md` | Mock services, Layer.succeed, DI |
| 01-validation | `file:.opencode/skills/effect-ts/schema/01-validation/SKILL.md` | Schema.decode, struct/union, brands |
| 02-anti-patterns | `file:.opencode/skills/effect-ts/patterns/02-anti-patterns/SKILL.md` | Plain generators, catchAll, loops |
| 02-execution | `file:.opencode/skills/bend-hvm/02-execution/SKILL.md` | Lazy evaluation, reduction |
| 02-http-client | `file:.opencode/skills/effect-ts/platform/02-http-client/SKILL.md` | HttpClient, requests, decoding |
| 02-services-layers | `file:.opencode/skills/effect-ts/core/02-services-layers/SKILL.md` | Context.Service, Layer.effect, DI |
| 02-transformations | `file:.opencode/skills/effect-ts/schema/02-transformations/SKILL.md` | Schema.transform, codecs |
| 02-vitest-patterns | `file:.opencode/skills/effect-ts/testing/02-vitest-patterns/SKILL.md` | it.effect, it.scoped, assertions |
| 03-ai-language-model | `file:.opencode/skills/effect-ts/platform/03-ai-language-model/SKILL.md` | LanguageModel, OpenRouter, mocking |
| 03-api-contracts | `file:.opencode/skills/effect-ts/schema/03-api-contracts/SKILL.md` | HttpApi REST contracts |
| 03-error-handling | `file:.opencode/skills/effect-ts/patterns/03-error-handling/SKILL.md` | Effect.catch, catchTag, absorb |
| 03-error-model | `file:.opencode/skills/effect-ts/core/03-error-model/SKILL.md` | TaggedErrorClass, defects, unions |
| 03-patterns | `file:.opencode/skills/bend-hvm/03-patterns/SKILL.md` | Recursion, fold/unfold |
| 03-property-testing | `file:.opencode/skills/effect-ts/testing/03-property-testing/SKILL.md` | Schema Arbitrary, fast-check |
| 03-state-management | `file:.opencode/skills/react/patterns/03-state-management/SKILL.md` | Lifting state, TanStack Query |
| 04-anti-patterns | `file:.opencode/skills/react/patterns/04-anti-patterns/SKILL.md` | JSX repetition, useEffect misuse |
| 04-bun-test | `file:.opencode/skills/effect-ts/testing/04-bun-test/SKILL.md` | Bun runner, zero-config |
| 04-concurrency | `file:.opencode/skills/bend-hvm/04-concurrency/SKILL.md` | Parallel trees, fork/join |
| 04-observability | `file:.opencode/skills/effect-ts/patterns/04-observability/SKILL.md` | Logging, spans, tracing, metrics |
| 04-resources | `file:.opencode/skills/effect-ts/core/04-resources/SKILL.md` | Scope, acquireRelease, lifecycle |
| 05-concurrency | `file:.opencode/skills/effect-ts/core/05-concurrency/SKILL.md` | Effect.all, fibers, Ref |
| 05-testing | `file:.opencode/skills/bend-hvm/05-testing/SKILL.md` | Bend unit tests, property tests |
| 06-memory | `file:.opencode/skills/bend-hvm/06-memory/SKILL.md` | Interaction nets, GC, layout |
| 06-streams | `file:.opencode/skills/effect-ts/core/06-streams/SKILL.md` | Stream creation, sinks |
| 07-benchmarking | `file:.opencode/skills/bend-hvm/07-benchmarking/SKILL.md` | Profiling HVM, IPS |
| 08-ffi | `file:.opencode/skills/bend-hvm/08-ffi/SKILL.md` | C interop, native bindings |
| customize-opencode | `file:.opencode/skills/customize-opencode/SKILL.md` | opencode config, agents, plugins |
| oxlint | `file:.opencode/skills/effect-ts/oxlint/SKILL.md` | oxlint rules, lint vs format, CI, custom rules |
| react-animation | `file:.opencode/skills/react/animation/SKILL.md` | react/motion animations |
| tanstack-query | `file:.opencode/skills/tanstack/01-query/SKILL.md` | Server state, caching |
| tanstack-router | `file:.opencode/skills/tanstack/02-router/SKILL.md` | Type-safe routing |
| tmux-workflow | `file:.opencode/skills/tmux/SKILL.md` | tmux sessions, dev servers |
| git-workflow | `file:.opencode/skills/git/SKILL.md` | Git pre-commit checklist, push handling |

### Architect Requirement

The architect MUST always pass this AGENTS.md file to every agent delegation. This ensures all agents have access to the complete skill catalog, routing trees, and project conventions.
