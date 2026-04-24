# AGENTS.md — Master Rules & Workflow

## Table of Contents

| Section | Location |
|---------|----------|
| Project Brain | [MEMORY.md](./MEMORY.md) |
| Directory Structure | [below](#directory-structure) |
| Workflow | [below](#workflow) |
| Branch Strategy | [below](#branch-strategy) |
| Code Style | [below](#code-style) |
| Definition of Done | [below](#definition-of-done) |
| Phase Flow | [phases/README.md](./phases/README.md) |
| Skill Index | [skills/README.md](./skills/README.md) |

## Directory Structure

```
.opencode/
├── CLAUDE.md                          # Entry point → AGENTS.md + MEMORY.md
├── AGENTS.md                          # Master rules, workflow, code style, DoD
├── MEMORY.md                          # ★ PROJECT BRAIN (read every session)
│
├── state/                             # Operational tracking
│   ├── current-feature.md             #   Active feature + current phase
│   ├── progress.md                    #   Completed / in-progress / blocked
│   ├── decisions-log.md               #   Quick-ref of all decisions
│   └── tech-debt.md                   #   Known debt with priority
│
├── templates/                         # Enforced document formats
│   ├── prd.md                         #   PRD template
│   ├── adr.md                         #   ADR template
│   ├── issue.md                       #   GitHub issue template
│   ├── pr.md                          #   PR description template
│   ├── security-report.md             #   Security audit output
│   └── test-plan.md                   #   Test plan template
│
├── commands/                          # AI trigger commands
│   ├── new-feature.md                 #   Full workflow entry
│   ├── resume.md                      #   Resume from last session
│   ├── status.md                      #   Show progress
│   ├── done-feature.md                #   PR + memory update
│   ├── audit.md                       #   Security + quality audit
│   ├── refactor.md                    #   Refactoring workflow
│   ├── benchmark.md                   #   HVM/Bend profiling
│   ├── spec.md                        #   View/edit spec
│   └── test.md                        #   Run & validate tests
│
├── skills/                            # Domain knowledge (reference)
│   ├── bend-hvm/                      #   Bend language + HVM runtime
│   ├── effect-ts/                     #   Effect-TS ecosystem
│   ├── react/                         #   React patterns
│   ├── tanstack/                      #   TanStack Query patterns
│   └── infrastructure/                #   CI/CD, containers, deploy
│
├── phases/                            # Workflow execution (numbered)
│   ├── 01-requirements/
│   ├── 02-prd/
│   ├── 03-grill/
│   ├── 04-adr/
│   ├── 05-schema-contract/
│   ├── 06-tdd/
│   ├── 07-integration/
│   ├── 08-benchmarking/
│   ├── 09-security-audit/
│   ├── 10-db-optimizer/
│   ├── 11-code-review/
│   ├── 12-pr-creation/
│   ├── 13-pr-review/
│   └── 14-memory-update/
│
├── checklists/                        # Cross-cutting quality gates
│   ├── pre-implementation.md
│   ├── pre-pr.md
│   ├── pre-merge.md
│   └── definition-of-done.md
│
├── adrs/                              # Stored ADR documents
│   └── README.md
│
└── specs/                             # Feature specifications
    └── README.md
```

## Workflow

### PRD-Driven Development

The **PRD** (Product Requirements Document) is the main spec document. It drives the entire workflow.

```
User Request
    ↓
01-requirements/       ← Clarify requirements
    ↓
02-prd/                ← Create PRD (main spec)
    ↓
03-grill/              ← Stress-test the plan
    ↓
04-adr/                ← Record architecture decisions
    ↓
05-schema-contract/    ← Define interfaces (contract-first)
    ↓
BRANCH CREATED         ← feature/<name>
    ↓
06-tdd/                ← Implement with tests (vertical slices)
    ↓
07-integration/        ← E2E + contract testing
    ↓
08-benchmarking/       ← HVM performance validation
    ↓
09-security-audit/     ← OWASP, auth, injection
    ↓
10-db-optimizer/       ← N+1, indexing
    ↓
11-code-review/        ← Quality review
    ↓
12-pr-creation/        ← Create PR
    ↓
13-pr-review/          ← Review PR
    ↓
MERGE + DELETE BRANCH
    ↓
14-memory-update/      ← Update MEMORY.md + state/
```

### Phase Gates

Each phase has a checklist that MUST pass before proceeding:

| Phase | Gate |
|-------|------|
| 01-requirements | All ambiguities resolved |
| 02-prd | Scope locked, acceptance criteria defined |
| 03-grill | All decision tree branches resolved |
| 04-adr | Key decisions documented |
| 05-schema-contract | Interfaces defined, types match |
| 06-tdd | Tests pass, coverage met |
| 07-integration | Cross-boundary scenarios pass |
| 08-benchmarking | Performance baseline established |
| 09-security-audit | OWASP items clear |
| 10-db-optimizer | No N+1, indexes verified |
| 11-code-review | Style, patterns, strictness |
| 12-pr-creation | PR description complete |
| 13-pr-review | Approved, CI green |
| 14-memory-update | MEMORY.md updated |

## Branch Strategy

**All new features MUST be developed on a feature branch, never directly on `main`.**

```
main
  └── feature/<name>      ← New branch for each feature
       ↓
  PR created when working
       ↓
  Review + merge when approved
       ↓
  Delete branch
```

**Rules:**
1. Create branch from `main`: `git checkout -b feature/<name>`
2. Commit changes to feature branch only
3. Create PR when feature works and tests pass
4. Merge to `main` after review approval
5. Delete feature branch after merge

**Branch naming:**
- `feature/<name>` — New features
- `fix/<name>` — Bug fixes
- `refactor/<name>` — Code refactoring
- `docs/<name>` — Documentation updates

## Code Style

### Core Principles

- **Zero Tolerance for Errors**: All automated checks must pass
- **Clarity over Cleverness**: Clear, maintainable solutions
- **Conciseness**: Keep code and wording concise
- **Reduce comments**: Code is self-documenting; JSDoc acceptable

### Effect-TS Patterns

```ts
// Prefer Effect.fnUntraced over Effect.gen
const fn = Effect.fnUntraced(function*(param: string) {
  // ...
})

// Class syntax for services
class MyService extends ServiceMap.Service<MyService, {
  readonly doSomething: (input: string) => number
}>()("MyService") {}
```

### Validation Steps

```bash
pnpm lint-fix          # Auto-format
pnpm test <file>       # Run tests
pnpm check:tsgo        # Type check
pnpm docgen            # Check JSDoc compiles
```

## Definition of Done

A feature is **done** when:

- [ ] PRD written and approved
- [ ] All decision tree branches resolved
- [ ] ADRs documented for key decisions
- [ ] Schema contracts defined
- [ ] TDD vertical slices complete
- [ ] Integration tests pass
- [ ] Benchmark baseline established (HVM)
- [ ] Security audit passed
- [ ] DB optimizer check passed
- [ ] Code review passed
- [ ] PR created and reviewed
- [ ] CI green
- [ ] Merged to main
- [ ] MEMORY.md updated
- [ ] Branch deleted

## Skills

### Loading Skills

```typescript
task(
  category="deep",
  load_skills=["effect-ts/patterns", "phases/pr-review"],
  prompt="Implement auth service and review it"
)
```

### GEPA Evolution

```bash
bun run packages/gepa/tests/test-effect-skills-llm.ts
```

See `agents/skill-evolver/instructions.md` for details.
