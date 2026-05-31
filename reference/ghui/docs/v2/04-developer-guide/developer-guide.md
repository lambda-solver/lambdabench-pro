# Developer Guide

> **Purpose:** Language-agnostic build process — phase order, slice-by-slice gate
> discipline, what to test at each gate, and quality-gate requirements.
> **Method:** Build in thin vertical slices. Every module is verified before the next is started.
> **Rule:** Toolchain-neutral. Specific tool names and configs live in reference/idiom-notes.md.

---

## 1. Build Order

Build in this order. Each layer depends only on layers below it:

```
Phase 1: Domain          → pure entity definitions, no external dependencies
Phase 2: Configuration   → environment variables, application settings
Phase 3: Services        → external system boundaries (process runner, remote service, cache)
Phase 4: State           → reactive cells, async data cells, override cells
Phase 5: Commands        → action definitions, handoff registry, derivation cells
Phase 6: Input/Keymap    → keybinding definitions, layer composition
Phase 7: UI Components   → renderer primitives, modals, surfaces
Phase 8: Integration     → composition root, full suite verification
```

**Rationale:** This order follows the dependency graph from technical-spec.md §2. Each phase produces modules that the next phase consumes. Building bottom-up ensures every module compiles against already-verified dependencies.

---

## 2. The Iterative Build Loop

> **Never build all layers and then test. Build one task, verify it, then build the next.**

### The Golden Loop (runs after EVERY task, not just at phase boundaries)

```
Write task → Format-check → Compile/Typecheck → Lint → Test (all tests so far) → Fix → Commit
```

### Verification Commands (run in this order, after EACH task)

1. **Format-check** — verify code style matches project formatter config
2. **Compile/Typecheck** — verify all types/shapes are correct
3. **Lint** — verify code quality rules pass
4. **Test** — run ALL tests written so far (incremental: every prior task's tests plus the current task's new tests)

### Rule: Do not advance to the next task until the current one passes all four gates AND all previously-written tests still pass.

- If format-check fails → fix formatting, re-run.
- If compile fails → fix types/shapes before running tests.
- If lint fails → fix style before committing.
- If test fails → fix logic before writing the next task. A regression in any earlier test means the current task broke something — fix it before proceeding.

### Phase Gate (runs once at the end of each phase)

After all tasks in a phase are complete, run the FULL test suite for that phase one final time as a confirmation. This is a checkpoint, not a substitute for per-task testing.

---

## 3. Phase 1: Domain

### Tasks (in order — run the Golden Loop after EACH task)

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | errors | Error classification helpers | compile passes |
| 2 | domain | All entity types, literal value-domains, pure functions | SPEC-001, SPEC-002 (identity), SPEC-006 to SPEC-007 (detailLoaded), SPEC-008 to SPEC-010 (comments), SPEC-055 to SPEC-058a (check rollup) |
| 3 | item | ItemKind, ListMode, ListInput, Page, searchQualifier | SPEC-011, SPEC-012 (illegal query), SPEC-052 to SPEC-054 (search qualifiers) + all prior tests |
| 4 | pullRequestViews | PullRequestView definition, cache key derivation | SPEC-004 (view cache key), SPEC-048 to SPEC-051 (parseRepositoryInput) + all prior tests |
| 5 | issueViews | IssueView definition, cache key derivation | issue view cache key tests + all prior tests |
| 6 | pullRequestLoad | PullRequestLoad state type | compile passes + all prior tests |
| 7 | issueLoad | IssueLoad state type | compile passes + all prior tests |
| 8 | pullRequestCache | mergeCachedDetails, appendPullRequestPage, nextLoadAfterPage | SPEC-015 to SPEC-021 (cache merge + pagination) + all prior tests |
| 9 | mergeActions | MergeKindDefinition, merge availability, CLI arg mapping | SPEC-027 to SPEC-031 (merge actions) + all prior tests |
| 10 | workspacePreferences | Preference types | compile passes + all prior tests |
| 11 | workspaceSurfaces | Surface definitions | compile passes + all prior tests |
| 12 | themeConfig | ThemeConfig, resolveThemeId, normalizeThemeConfig | SPEC-046, SPEC-047 (theme) + all prior tests |

### Phase Gate 1 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: ALL Phase 1 tests (SPEC-001 to SPEC-012, SPEC-015 to SPEC-021, SPEC-046 to SPEC-058a)
```

---

## 4. Phase 2: Configuration

### Tasks (in order — run the Golden Loop after EACH task)

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | config | Environment variable parsing, application settings | Default values correct; env overrides work; invalid values fall back; cache path follows XDG + all Phase 1 tests |

### Phase Gate 2 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
smoke-test     # verify config loads without error
test           # MUST pass: all Phase 1 + Phase 2 tests
```

---

## 5. Phase 3: Services

Build services bottom-up. Run the Golden Loop after EACH task.

### Phase 3a: Base Services

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | ProcessRunner | Spawns external processes | Service boundary compiles; layer/factory well-formed + all prior tests |
| 2 | BrowserOpener | Opens URLs in system browser | Service boundary compiles + all prior tests |
| 3 | Clipboard | System clipboard access | Service boundary compiles + all prior tests |

**Phase Gate 3a:** format-check, compile, lint — all MUST pass.

### Phase 3b: Remote Platform Integration

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 4 | RemoteSchemas | Response shape definitions | Shape decode succeeds for sample fixtures + all prior tests |
| 5 | RemoteNormalizer | Transforms raw responses into domain entities | SPEC-008 to SPEC-010 (comment parsing), SPEC-055 to SPEC-058a (check rollup), normalizer correctness + all prior tests |
| 6 | RemoteService | ProcessRunner + schemas + normalizer + domain | SPEC-052 to SPEC-054 (search qualifiers via service), diff file parsing + all prior tests |

**Phase Gate 3b:** format-check, compile, lint, test — all MUST pass (normalizer + comment parsing + all prior).

### Phase 3c: Cache Service

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 7 | CacheService | Storage client + domain + migrations | SPEC-003 (cache key), SPEC-025 (read failure as miss), SPEC-026 (write failure silent), SPEC-059/SPEC-060 (pruning), migrations run, round-trip, disabled layer + all prior tests |

**Phase Gate 3c:** format-check, compile, lint, test — all MUST pass (cache service + all prior).

### Phase 3d: Runtime Composition

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 8 | Runtime | Merges all service layers | Smoke-test: runtime initializes without error + all prior tests |

**Phase Gate 3d:** format-check, compile, lint, smoke-test, test — all MUST pass.

---

## 6. Phase 4: State / Reactive Cells

Build cells in dependency order. Run the Golden Loop after EACH task.

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | ui/listSelection/atoms | Selection tracking | compile passes + all prior tests |
| 2 | ui/filter/atoms | Filter query and derived state | SPEC-040 to SPEC-042 (filter) + all prior tests |
| 3 | ui/modals/atoms | Active modal cell | SPEC-043/SPEC-044 (modal invariants) + all prior tests |
| 4 | ui/theme/atoms | Theme state | compile passes + all prior tests |
| 5 | ui/detail/atoms | Detail pane state | compile passes + all prior tests |
| 6 | ui/diff/atoms | Diff view state, render/wrap/whitespace modes | compile passes + all prior tests |
| 7 | ui/comments/atoms | Comment state | compile passes + all prior tests |
| 8 | ui/issues/atoms | Issue-specific state | compile passes + all prior tests |
| 9 | ui/pullRequests/atoms | PR data fetching, queue load cache, overrides | SPEC-019 to SPEC-024 (pagination + retry) + all prior tests |
| 10 | ui/notice/atoms | Flash notices | compile passes + all prior tests |
| 11 | workspace/atoms | Workspace preferences, repo rollup | compile passes + all prior tests |

### Phase Gate 4 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: ALL tests (Phase 1-4)
```

---

## 7. Phase 5: Commands

Run the Golden Loop after EACH task.

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | commands/registry | Command definition shape | compile passes + all prior tests |
| 2 | commands/handoffs | Side-effect registry (bridge to imperative hooks) | Handoff registry round-trips (register then invoke) + all prior tests |
| 3 | commands/derivations | Derived cells for command metadata | compile passes + all prior tests |
| 4 | commands/builtins | All command definitions | Command definition helper preserves literal value-domains; global commands array contains expected identifiers + all prior tests |
| 5 | commands/dispatch | Command dispatch via registry | compile passes + all prior tests |
| 6 | commands/atoms | Command snapshot cells | compile passes + all prior tests |
| 7 | commands/index | Barrel export | compile passes + all prior tests |

### Phase Gate 5 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: ALL tests (Phase 1-5)
```

---

## 8. Phase 6: Input / Keymap

Run the Golden Loop after EACH task.

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | keymap library | Workspace package (context, scope, binding) | compile passes + all prior tests |
| 2 | keymap/contexts/* | Pure context shapes | Context purity: no state/service imports + all prior tests |
| 3 | keymap/* | Keymap definitions per view/modal | No renderer hook imports in keymap files + all prior tests |
| 4 | keymap/all | Full keymap composition | Layer ordering matches priority; all context layers included + all prior tests |

### Phase Gate 6 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: ALL tests (Phase 1-6)
```

---

## 9. Phase 7: UI Components

Run the Golden Loop after EACH task.

| # | Module | What to build | Tests to write & run (incremental) |
|---|--------|--------------|-----------------------------------|
| 1 | ui/primitives | Renderer primitives | Primitives render without error + all prior tests |
| 2 | ui/modals/types | Modal state shapes | Modal tagged enumeration is exhaustive + all prior tests |
| 3 | ui/modals/* | Modal components (13 variants) | SPEC-043/SPEC-044 (modal invariants) + all prior tests |
| 4 | surfaces/* | Workspace surface compositions | SPEC-045 (surface switch resets transient state) + all prior tests |
| 5 | App | Composition root | Layout math produces valid dimensions; junction rows correct + all prior tests |
| 6 | index | Bootstrap (renderer, entry point) | compile passes + all prior tests |

**Design-Triage Carry-Over**: The reference implementation uses a single ~2800-line composition root (App.tsx). This is tagged [INCIDENTAL:reactive-runtime] in technical-spec.md §15. The target language MAY decompose this into smaller components if the target's state management paradigm supports it (e.g., Elm's nested update functions, Rust's immediate-mode redraw loop). The [ESSENTIAL] requirement is that all state flows through the reactive cell system; the physical file organization is incidental.

### Phase Gate 7 (final confirmation)

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: ALL tests (Phase 1-7)
```

---

## 10. Phase 8: Integration

Run the full suite once:

```
format-check   # MUST pass
compile        # MUST pass
lint           # MUST pass
test           # MUST pass: full suite (ALL 77 SPECs: 68 Given/When/Then + 9 PROPERTY)
coverage       # MUST meet threshold
```

This is the **only** time the full test suite runs as a single integration checkpoint. Every previous phase and task used incremental testing (all tests written so far, run after each task).

---

## 11. Testing Strategy

### Incremental Testing (the core discipline)

Tests are NOT deferred to phase boundaries. After EVERY task:
1. Write tests for the new module/functionality.
2. Run ALL tests written so far (every prior task's tests plus the new ones).
3. If any test fails (new or old), fix before proceeding to the next task.

This means the test suite grows incrementally. Task 1 runs 5 tests. Task 2 runs those 5 plus 3 new ones (8 total). Task 12 runs all 50+ tests accumulated so far. A regression in test #3 discovered at task #12 is caught immediately.

### Per-Phase Testing

| Phase | Strategy | What to test |
|-------|----------|-------------|
| Phase 1 (Domain) | Pure logic tests | No runtime needed. Test pure functions, identity rules, cache merge, pagination. |
| Phase 3b (Remote) | Boundary tests with fixtures | Shape decode for sample responses. Normalizer correctness. |
| Phase 3c (Cache) | Real storage with temp files | Migrations, round-trip, pruning, disabled implementation. |
| Phase 4 (State) | Reactive cell tests | Dependency graph, override behavior, filter computation. |
| Phase 7 (UI) | Layout math tests | Pane dimensions, scroll positions. Not visual tests. |
| Phase 8 (Integration) | Full suite + coverage | All SPECs pass (Given/When/Then AND PROPERTY). Coverage meets threshold. |

### Test Categories

1. **Pure logic tests** — no runtime, no external dependencies. Test domain functions, cache merge, pagination, filter scoring, diff algorithms.
2. **Boundary tests with real dependencies** — use real storage (temporary databases), real process spawning (mock CLI). Test service contracts.
3. **Integration tests** — full composition root, all layers wired. Test end-to-end flows.
4. **Algorithm PROPERTY + performance tests** — property-based tests for algorithm invariants (SPEC-###-P), plus edge cases and performance bounds (LCS fallback threshold, hunk normalization, whitespace minimization).

### Behavior SPEC Traceability

Preserve invariant identifiers in test names for traceability:

```
test_D001_pull_request_identity_by_repository_and_number
test_S008_cache_merge_preserves_detail_on_matching_commit
test_SPEC019_pagination_survives_duplicate_only_page
```

---

## 12. Quality-Gate Requirements

These requirements must be re-bound to the target toolchain (see reference/idiom-notes.md for the reference implementation's specific tools).

### Compiler/Type System

- Enable maximum strictness available (strict null checks, no implicit any, exact optional properties, unchecked indexed access).
- All public operations crossing module boundaries must have complete type signatures.

### Formatter

- Enforce consistent style via project formatter config.
- Format-check must pass before compile.
- Never run the formatter directly — always use the project script.

### Linter

- Enforce code quality rules via project linter config.
- Lint must pass before test.
- Never run the linter directly — always use the project script.

### Test Runner

- Coverage threshold: meet or exceed the reference implementation's coverage.
- All behavior SPECs must have corresponding tests.
- Tests must be deterministic (no flaky tests).

### Project Scripts

- **Rule:** Always use project scripts, never raw tools.
- Define scripts for: format-check, format, compile/typecheck, lint, test.
- CI runs: format-check → compile → lint → test (in this order).

### Fix Order

When checks fail, fix in this order:
1. Format (fix formatting first)
2. Compile (then fix types/shapes)
3. Lint (then fix style)
4. Test (finally fix logic)

---

## 13. Common Pitfalls

### Pitfall: Non-tracking read inside reactive cell body

```
WRONG: reading a cell without registering dependency → no reactivity
CORRECT: using the dependency-tracking parameter → registers reactive dependency
```

### Pitfall: Tracing overhead in hot-path reactive cells

```
WRONG: creating a trace span on every re-evaluation
CORRECT: using untraced cell constructors for hot paths
```

### Pitfall: Missing import extensions

```
WRONG: importing without file extension (module resolution failure)
CORRECT: importing with the correct extension for the module system
```

### Pitfall: Mutable entity attributes

```
WRONG: entity attributes are mutable
CORRECT: all entity attributes are immutable (readonly)
```

### Pitfall: Using component-local state for global state

```
WRONG: using renderer-local state for application-wide state
CORRECT: using reactive cells for all global state
```

### Pitfall: Commands closing over local variables

```
WRONG: command captures a local callback in a closure
CORRECT: command reads from reactive cells or invokes a named handoff slot
```

### Pitfall: Not catching cache errors

```
WRONG: letting cache read errors propagate to the caller
CORRECT: catching cache errors and treating them as absent
```

### Pitfall: Keeping parameterized cells alive

```
WRONG: preventing garbage collection on parameterized cells → memory leak
CORRECT: letting weak references and finalization clean up parameterized cells
```

### Pitfall: Mutating reactive cells outside an effect

```
WRONG: setting a cell value outside an effect or renderer callback → bypasses tracking
CORRECT: setting a cell inside an effect or renderer set-cell callback
```

### Pitfall: Forgetting hunk normalization after whitespace minimization

```
WRONG: returning minimized patch with stale hunk headers
CORRECT: recalculating hunk line counts from actual content after minimization
```

### Pitfall: Not handling disabled cache implementation

```
WRONG: assuming cache always returns data
CORRECT: always handling absent from cache (disabled implementation returns absent for everything)
```

### Pitfall: Missing junction rows in modal frame dividers

```
WRONG: modal divider without junction row → looks detached from side borders
CORRECT: threading divider row index through the frame's junction-rows property
```

### Pitfall: Not clamping page size

```
WRONG: sending page size > 100 → remote API rejection
CORRECT: clamping page size to [1, 100]
```

### Pitfall: Killing pagination on duplicate-only pages

```
WRONG: setting hasNextPage=no when a page contains only duplicates → permanent dead-end
CORRECT: keeping hasNextPage=yes when the cursor advances, even with duplicate-only pages
```

### Pitfall: Not handling git remote detection failure gracefully

```
WRONG: throwing an error when git is not installed or no remotes exist → app fails to start
CORRECT: silently returning null and letting user manually open a repository
```

### Pitfall: Hard-coding theme palette colors instead of loading from config

```
WRONG: defining all 27 theme palettes as constants in code → cannot customize or extend themes
CORRECT: loading palette definitions from themeConfig.ts and allowing user overrides via themeStore
```

### Pitfall: Not walking the reply chain to find thread root for review comments

```
WRONG: replying directly to a nested comment → GitHub API rejects with "parent comment not found"
CORRECT: walking the inReplyTo chain to find the thread root, then replying to the root
```

---

## 14. Algorithm Reference

### 14.1 Whitespace Minimization (LCS)

**Steps:**
1. For each hunk, collect contiguous blocks of deletions and additions.
2. Strip all whitespace from each line for comparison.
3. If (deletions+1) × (additions+1) > 40,000 → use linear greedy matching.
4. Otherwise → compute LCS matrix, backtrack to find matches.
5. Matched pairs become context lines; unmatched remain changes.
6. If hunk becomes empty → drop it.
7. If file has no remaining hunks → drop the file.
8. Re-normalize hunk line counts from actual content.

**Limits:**
- LCS cell limit: 40,000 [DERIVED:domain]
- Fallback: linear greedy matching

**Test outline:**
- Whitespace-only changes → collapsed to context
- Mixed changes → only whitespace-only lines collapsed
- Large hunk → linear fallback used
- Empty hunk after minimization → dropped
- File with no remaining hunks → dropped

### 14.2 Comment Anchoring (Split View)

**Steps:**
1. Walk hunk lines tracking oldLine, newLine, renderLine, colorLine.
2. Collect deletion and addition blocks.
3. On context line or block boundary → flush change block.
4. Flush: for each row in max(deletions, additions), align left (deletion) and right (addition).
5. alignSplitSides() pads shorter side to keep visual alignment.
6. Context lines increment both sides simultaneously.

**Test outline:**
- Equal deletions/additions → aligned on same rows
- Unequal → shorter side padded
- Context lines → both sides increment

### 14.3 Filter Scoring

**Steps:**
1. Normalize query to lowercase, trim whitespace.
2. For each field (in priority order): find indexOf(query) in lowercased field.
3. Score = fieldIndex × 1000 + matchOffset.
4. Return minimum score across all matching fields.
5. null = no match (filtered out).
6. Sort by score ascending, then by time descending for ties.

**Test outline:**
- Title match ranks before body match
- Earlier match in same field ranks before later match
- Empty query returns all items
- No match returns null

---

## 15. Framework Model Primer

### Renderer Primitives

The terminal renderer provides three core elements:
- **Container** — layout container with flexbox-like properties
- **Scrollable** — scrollable container with scroll position
- **Text** — text rendering with inline styled segments

### Layout Model

- Flexbox-like: direction, padding, gap, width, height, flexGrow
- Layout math computed in composition root, passed as props
- Two-pane layout: fixed-width list + remaining-width detail

### Modal Frame Convention

- Modals render inside a bordered frame
- Dividers MUST thread their row index through the frame's junction-rows property
- Without junction-rows, dividers look detached from side borders

### Syntax Highlighting

- Token-to-style mapping for code rendering
- Categories: keyword, string, comment, number, function, type, operator, etc.

---

## Changelog

### 2026-05-30 (v0.7.1-r6)
- Updated testing strategy to include PROPERTY tests for algorithms
- Added design-triage note to Phase 7 (composition root is [INCIDENTAL:reactive-runtime])
- Fixed SPEC count: 77 total (68 Given/When/Then + 9 PROPERTY)
- Removed §16 "Grow Without Drift" (now in separate 3-grow.md document)

### 2024-05-29 (v0.7.1-r3)
- Rewritten as toolchain-neutral build process per Quarantine Rule.
- Zero tool/library proper nouns in normative text.
- All 8 phases preserved with verification gates.
- Added behavior SPEC traceability per phase.
- Added 14 common pitfalls (neutral WRONG/CORRECT).
- Added algorithm reference with steps, limits, and test outlines.
- Added framework model primer (neutral).
- Added quality-gate requirements to re-bind.
- Specific tool names and configs quarantined to reference/idiom-notes.md.
- Added section 16: Grow Without Drift (Stage 3 — feature/change/audit protocols).

### 2024-05-29 (v0.7.1-r2)
- Added sections 15-20 (diff pipeline, keymap, renderer, hooks, theme, staleness).

### 2024-05-27 (v0.7.1)
- Initial version.
