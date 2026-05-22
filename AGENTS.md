# AGENTS.md

> Note: This file is the authoritative source for coding agent instructions. If
> in doubt, prefer AGENTS.md over README.md. See nested AGENTS.md files in each
> workspace for app-specific patterns.

> **SKILLS:** Every agent MUST load `file:.opencode/skills/meta-skill/SKILL.md` first to discover which domain-specific skills apply to your task. The meta-skill contains the complete skill catalog with agent-specific routing trees.

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
| Linting    | oxlint 1.65+ with `@mpsuesser/oxlint-plugin-effect`             |
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

## Skills

Skills provide specialized instructions and workflows for specific tasks. The architect MUST inject the meta-skill into EVERY agent delegation.

### Meta-Skill (Mandatory for All Agents)

**`file:.opencode/skills/meta-skill/SKILL.md`** — Complete skill catalog with agent-specific routing trees and universal reference table. Load this first to discover which domain-specific skills you need for your task.

> **Note:** This meta-skill MUST be loaded by the architect into the context of EVERY agent delegation. The architect is responsible for injecting this skill; agents do not load it themselves.

### How Skill Routing Works

1. The architect injects `meta-skill` into every delegation via `SKILLS:`
2. You (the agent) read the meta-skill to find your agent type's skill tree
3. You load the domain-specific skills matching your task (Effect, React, Testing, etc.)
4. If you need a skill not in your agent's tree, check the "Universal Reference" table — all 37 skills are listed there

### Anti-patterns to Avoid

- **Never skip the meta-skill** — it contains the complete routing guidance
- **Never pass Effect skills for non-Effect code** — React visual tests don't use `Effect.fn` or `Effect.gen`
- **Never skip domain skills for "simple" tasks** — even one-line changes can violate project conventions
- **Never pass `01-test-services` to `coder` for non-Effect tests** — mock layers are only for Effect service tests
- **Always forward `SKILLS_USED_BY_CODER` to `reviewer`** — the reviewer cannot verify skill compliance without knowing what skills the coder received
- **Always pass `02-vitest-patterns` for ANY test file** — covers `@effect/vitest` imports, `it.effect`, `it.layer`, proper assertions
- **Always pass React skills for React code** — `01-fp-style` minimum; add `02-component-composition` for compound components (Card, Accordion, etc.); add `04-anti-patterns` to catch JSX repetition, prop drilling, useEffect misuse
