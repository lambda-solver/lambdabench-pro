---
name: meta-skill
description: Complete skill catalog with agent-specific routing trees and universal reference table. Load this first to discover which domain-specific skills apply to your task.
license: MIT
compatibility: opencode
---

# Meta-Skill: Skill Router

> **MANDATORY**: The architect MUST inject this skill into EVERY agent delegation via `SKILLS: file:.opencode/skills/meta-skill/SKILL.md`. This skill contains the complete catalog of all available skills and guidance on which skills to load for your task.

## How to Use This Skill

When you receive a task:
1. Identify your agent type below
2. Check the task domain (Effect, React, Testing, etc.)
3. Load the skills matching your domain from your agent's tree
4. If you need a skill not listed under your agent, check "Universal Reference" — it lists ALL skills so you know what exists

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
- `file:.opencode/skills/development/tmux-workflow/SKILL.md` — tmux sessions, dev servers

**Bend/HVM**
- `file:.opencode/skills/bend-hvm/01-syntax/SKILL.md` — ADTs, pattern matching, HVM
- `file:.opencode/skills/bend-hvm/02-execution/SKILL.md` — Lazy evaluation, reduction
- `file:.opencode/skills/bend-hvm/03-patterns/SKILL.md` — Recursion, fold/unfold
- `file:.opencode/skills/bend-hvm/04-concurrency/SKILL.md` — Parallel trees, fork/join
- `file:.opencode/skills/bend-hvm/05-testing/SKILL.md` — Bend unit tests, property tests
- `file:.opencode/skills/bend-hvm/06-memory/SKILL.md` — Interaction nets, GC, layout
- `file:.opencode/skills/bend-hvm/07-benchmarking/SKILL.md` — Profiling HVM, IPS
- `file:.opencode/skills/bend-hvm/08-ffi/SKILL.md` — C interop, native bindings

**Meta**
- `file:.opencode/skills/customize-opencode/SKILL.md` — opencode config, agents, plugins

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
| oxlint | `file:.opencode/skills/effect-ts/oxlint/SKILL.md` | Custom oxlint rules |
| react-animation | `file:.opencode/skills/react/animation/SKILL.md` | react/motion animations |
| tanstack-query | `file:.opencode/skills/tanstack/01-query/SKILL.md` | Server state, caching |
| tanstack-router | `file:.opencode/skills/tanstack/02-router/SKILL.md` | Type-safe routing |
| tmux-workflow | `file:.opencode/skills/development/tmux-workflow/SKILL.md` | tmux sessions, dev servers |
