# Ghui v2 Blueprint — Combined Documentation

## Goal Statement

**Transform an existing, well-designed codebase into a language-agnostic specification, then rebuild it in a new language with equivalent or better quality.**

### The Process

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Source         │ EXTRACT │  Blueprint       │  BUILD  │  Target         │
│  Codebase       │ ──────> │  (Specs)         │ ──────> │  Codebase       │
│  (Language L₁)  │   (α)   │  (Language-      │   (γ)   │  (Language L₂)  │
│                 │         │   Agnostic)      │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
   Concrete                     Abstract                     Concrete
                                                                  │
                              ┌──────────────────┐  GROW          │
                              │  Same Blueprint   │ <──────────────┘
                              │ (source of truth) │  (Stage 3: feature / audit)
                              └──────────────────┘
```

### Conceptual model (honest version)

Extraction (α) is **deliberately lossy**: it discards `[INCIDENTAL]` implementation choices and keeps only `[ESSENTIAL]` domain truth. Building (γ) re-concretizes into a *different* program that shares the same abstract specification.

> **The round-trip is a lossy closure, NOT an identity.** P ⊑ γ(α(P)), never γ(α(P)) = P. The rebuilt program is behaviorally conformant to the blueprint; it is **not** a reconstruction of the original source, and must not be graded as one.

### What actually provides correctness (the three pillars)

1. **Essential/Incidental separation** — the tagging discipline that decides what must be preserved vs. re-solved.
2. **Grounded, property-bearing behavior specs** — Given/When/Then SPECs *plus* property invariants for every non-trivial algorithm, each cited to source and mapped to an invariant ID. This is the definition of done.
3. **Architectural fitness functions** — discrete, machine-checkable rules (dependency direction, no cycles, purity, typed boundaries) that run in CI and fail the build.

> Category theory is **not** a pillar. It is an optional conceptual lens (Appendix A) and produces **no normative reports**. All verification is stated in plain engineering language and must be backed by executed evidence.

> **Why no differential fixtures?** They require a runnable reference and don't generalize across apps. We compensate by making **property-based tests mandatory** for every algorithm — these encode invariants directly from the spec and need no reference, so they travel with the template.

---

## Directory Structure

```
blueprint/
│
├── 00-prompts/                        # Meta-tooling (reusable across any app)
│   ├── 1-extract.md                   # Stage 1: EXTRACT
│   ├── 2-build.md                     # Stage 2: BUILD
│   └── 3-grow.md                      # Stage 3: GROW WITHOUT DRIFT
│
├── 01-domain/domain.md                # READ FIRST  — the problem (Domain Notation)
├── 02-technical-spec/technical-spec.md# READ SECOND — architecture + fitness rules (Contract Notation)
├── 03-behavior-spec/behavior-spec.md  # READ THIRD  — Given/When/Then + property conformance contract
├── 04-developer-guide/developer-guide.md # READ FOURTH — build process + gates
│
└── 05-reference/                      # CONSULT ONLY — quarantined source-language material
    ├── reference-impl.md              # Exact signatures/queries/SQL, cross-linked by anchor
    └── idiom-notes.md                 # Deps+versions, toolchain config, "how the reference solved X",
                                        #   Idiom Translation Table
```

> **Appendix A** (optional category-theory framing) lives at the end of this file. Nothing in the prompts depends on it.

---

# STAGE 1 — Extract a Language-Agnostic Blueprint

You are a senior staff engineer and reverse engineer. Analyze a reference codebase and
produce a documentation suite whose PRIMARY purpose is to serve as a language-agnostic
blueprint from which a NEW application can be built in a DIFFERENT language with equal
engineering quality and verified behavioral conformance. A secondary purpose is faithful
documentation of the reference itself.

Quality benchmark is concrete: named invariants with IDs, every state-machine variant
enumerated, exact constants with values, exact external-contract shapes, WRONG/CORRECT
examples for every pitfall, and PROPERTY invariants for every non-trivial algorithm. Vague
prose is a failure. The four blueprint docs MUST contain NO source-language syntax in their
normative text (Quarantine Rule). All language-specific material is physically separated
into reference/.

================================================================================
OUTPUT — create exactly these files
================================================================================
docs/
├── domain.md             # 100% language-AGNOSTIC. The PROBLEM/domain: entities, identity,
│                         #   states, workflows, invariants, errors — written by a domain
│                         #   expert who has never seen code. ZERO framework/library/language
│                         #   nouns. Domain Notation.
├── technical-spec.md     # Language-AGNOSTIC ARCHITECTURE: layers, dependency rules, contract
│                         #   SHAPES (in→out→error-kinds), algorithms, external-API shapes,
│                         #   composition, AND the machine-checkable Fitness Functions (§FIT).
│                         #   Contract Notation.
├── behavior-spec.md      # 100% language-AGNOSTIC Given/When/Then conformance specs AND
│                         #   property specs for algorithms. The executable test contract.
├── developer-guide.md    # Language-AGNOSTIC build PROCESS: phase order, gate discipline,
│                         #   what to test at each gate, quality-gate requirements.
└── reference/
    ├── reference-impl.md #   Exact signatures, queries, SQL, CLI strings, code snippets,
    │                     #   cross-linked to blueprint by anchor.
    └── idiom-notes.md    #   Exact deps+versions, compiler/lint/format config, "how the
                          #   reference solved X" notes, and the Idiom Translation Table.
Also create docs/.digests/<module>.md working notes during Phase 0/1.

================================================================================
THE PORTABILITY TAG — apply to EVERY extracted fact (the core of the method)
================================================================================
- [ESSENTIAL]            truth about the PROBLEM/DOMAIN; must hold in ANY language.
- [INCIDENTAL]           truth about the reference IMPLEMENTATION; example only →
                         lives in reference/, NEVER required by the blueprint.
- [INCIDENTAL:<paradigm>]incidental AND tied to a paradigm the target may not share
                         (e.g. [INCIDENTAL:reactive-runtime], [INCIDENTAL:effect-system]).
                         State the ESSENTIAL invariant neutrally; quarantine the mechanism.
- [DERIVED:domain]       constant whose INTENT is essential, value re-tunable
                         (e.g. "cap quadratic work at N cells").
- [DERIVED:platform]     constant tied to an EXTERNAL contract; copy verbatim
                         (e.g. "page size ∈ [1,100]"; "retries = 6").
Constants without a value AND a source citation are a failure.

================================================================================
THE QUARANTINE RULE (the heart of portability)
================================================================================
The four blueprint docs MUST contain NO language/framework/library/tool proper nouns in
normative text.
- domain.md is STRICTEST: no type-system jargon either ("interface", "struct", "union" as
  implementation words). Use Domain Notation.
- technical-spec.md may use neutral ENGINEERING concepts (layer, boundary, contract,
  error-kind, "reactive cell", pure vs effectful) but NOT library names. Contract Notation.
- Where a concrete signature/query/SQL is needed, state the GUARANTEE neutrally and add
  (impl: reference/reference-impl.md#<anchor>).
Any banned noun found in a blueprint doc during validation MUST move to reference/ and be
replaced with neutral notation + pointer.

================================================================================
NEUTRAL NOTATIONS
================================================================================
### Domain Notation (domain.md)
Entity: <Name>
  Identity: (<key fields>)            # same identity ⇒ same entity
  Attributes: - <name>: <value-domain or one-of {...}>
  Rules: - [ESSENTIAL] <law in plain language>

### Contract Notation (technical-spec.md)
Operation: <name>
  in  : <input shape>
  out : <output shape>
  err : <error family | never>
  impl: reference/reference-impl.md#<anchor>
Error-kinds are named FAMILIES with semantics, not classes:
  RemoteError  = transport-failure | parse-failure | decode-failure
  CacheError   = read-failure (treated as miss); writes never surface errors
  IllegalInput = programmer error that must never reach a user

================================================================================
GROUNDING RULE (non-negotiable)
================================================================================
Every non-obvious claim cites path/to/file.ext:Lstart-Lend (beside the neutral statement or
in the impl: pointer). Cannot cite → [INFERRED] with basis (tests, naming, commits). Guessing
→ [ASSUMPTION — VERIFY]. Exact strings/queries/SQL are copied verbatim into reference/ and
referenced by anchor.

================================================================================
STYLE RULES (enforced)
================================================================================
- BANNED in normative text: "robust", "scalable", "handles various", "and more",
  "should typically", "in general", "etc." → replace with specifics + citations.
- Every constant: exact value + source + portability tag.
- Every algorithm: actual complexity bound + actual fallback threshold + ≥1 PROPERTY invariant.
- Enumerate fully; never truncate a variant list / state set / table with "…".
- No source-language proper nouns in the four blueprint docs.

================================================================================
PHASE 0 — Inventory & Triage (FIRST, before reading code)
================================================================================
1. File inventory + signals: full file list (exclude deps/build/vcs); LOC per file/dir;
   fan-in (most-imported); fan-out; churn (if git history available).
   (No tooling? Derive from the import graph + layout; say so.)
2. Tier every file:
   - TIER 1 (read fully): composition root; domain types; boundary interfaces; state
     definitions; command/action registry; migrations/schema; top-10 fan-in files; the
     single largest file.
   - TIER 2 (skim signatures): leaf utilities; generated/vendored code.
   - TIER 3 (ignore): deps; build output; lockfiles; snapshots.
3. Output a READING PLAN table before reading any TIER 1 file:
   | File | Tier | Why | Token budget |
4. State total budget + per-phase allocation. Over budget → MAP-REDUCE:
   MAP: per module write docs/.digests/<module>.md (≤300 tokens): public surface, observed
        invariants, external I/O, deps in/out, notable algorithms/constants with file:line.
   REDUCE: synthesize from digests; re-open files only for contradictions/gaps.
   If digests exist, LOAD them instead of re-reading (resumable).

================================================================================
PHASE 1 — Deep Archaeology (read-only)
================================================================================
1. Map the tree.
2. Entry points: manifest (deps + EXACT versions → reference/idiom-notes.md);
   compiler/lint/format config (EXACT → reference/idiom-notes.md); main/boot; README.
3. Core contracts: domain concepts; boundary operations; state definitions; commands/actions;
   persistence schema/migrations.
4. Implementation patterns: composition root; state management; I/O boundary; error
   handling/propagation.
5. Tests: enforced invariants; covered edge cases; test wiring.
   Tests are the PRIMARY source of [ESSENTIAL] facts.

================================================================================
PHASE 2 — Extraction (catalog everything; each item TAGGED + CITED)
================================================================================
- Invariants: identity; valid/illegal states; source of truth; silent vs loud failure;
  purity boundary; recomputation triggers.
- Patterns: boundary definition; error model; state management; composition; testing;
  persistence; serialization. (reference syntax → reference/)
- Decisions: Decision / Alternative rejected / Rationale / Trade-off. Infer rationale from
  tests/naming/commits; mark [INFERRED] rather than omit.
- Anti-patterns: WRONG/CORRECT + why it breaks (neutral in blueprint; concrete in reference/).
- Algorithms: neutral I/O contract; approach; complexity bound; fallback; edge cases; magic
  numbers (tagged); correctness invariants stated as PROPERTIES over inputs (these become
  property SPECs — they are the verification substitute for a runnable reference).
- External contracts: SHAPES are [ESSENTIAL] about the remote system (what is fetched,
  request/response fields, pagination model, auth model, error conditions) → technical-spec.md
  neutrally. EXACT strings → reference/.
- Cross-cutting patterns (appear across layers, owned by none): state the ESSENTIAL invariant
  neutrally; tag the mechanism [INCIDENTAL:<paradigm>]. Examples:
    • "stale async results MUST NOT overwrite fresher state"
      (mechanism: generation counter — [INCIDENTAL:reactive-runtime])
    • "UI responds immediately, server may reject, state reverts on failure"
      (mechanism: optimistic-rollback — [INCIDENTAL])
    • "instant cached response, then fresh data, cache written after success"
      (mechanism: cache-then-network — [INCIDENTAL])
Dependency graph (first-class): build from observed imports; state direction rule; enumerate
forbidden patterns with IDs.
Quality gates (extract, don't invent): test layers; coverage expectations; strictness flags;
"never run X directly" rules; CI check order; fix order.

================================================================================
PHASE 2.5 — Design-Smell Triage (do NOT skip)
================================================================================
A "perfect" codebase still contains choices forced by ITS stack that may be anti-patterns
elsewhere. For each significant structural decision, classify:
  - ESSENTIAL design: required by the domain (e.g. "summary vs detail hydration split").
  - INCIDENTAL design: an artifact of the source stack the target SHOULD reconsider (e.g. a
    very large god-component justified only because "all state lives in atoms"; a bridge/
    handoff hack reconciling an effect system with a hooks runtime).
Output a "Design Triage" table:
  | Structure | Essential or Incidental | If incidental: why it exists in source | Target guidance |
Incidental design decisions are recorded as [INCIDENTAL] and explicitly DO NOT become fitness
budgets. Do NOT enshrine a source-stack workaround as an architectural law.

================================================================================
PHASE 3 — Synthesis (this order; checkpoint after each)
================================================================================
### 3.1 domain.md (STRICTLY agnostic, Domain Notation)
1 System Overview (value prop; target user; the ONE system invariant; external deps as ROLES).
2 Domain Model (every entity; identity laws; every "one-of" fully enumerated; sub-domains;
  tag each rule). 3 User Workflows (ALL; each ≥1 invariant; pagination & retry as workflows).
4 State Machines (EVERY machine; EVERY state; valid + invalid transitions; info each state
  carries; explicitly list ILLEGAL states that MUST be unreachable, as MUST NOT rows).
5 Invariants & Laws (Domain/System/UI tables: ID, Invariant, Consequence; each tagged).
6 Error Model (families; recovery with exact counts/backoff; display rules).
7 Constants with Justifications (value + source + tag + WHY + what breaks if different). + Changelog.
→ run claim-citation check + proper-noun scan (must be 0).

### 3.2 technical-spec.md (agnostic architecture, Contract Notation)
1 Design Principles. 2 Architecture Layers (diagram FROM imports; file paths OK, library names
  NOT). 3 Dependency Rules + Forbidden Patterns table. 4 Boundary Contracts (ALL operations in
  Contract Notation + impl pointers). 5 State & Reactivity (kinds; reactivity rules; async
  boundary; memory; caches). 6 Action/Command System. 7 Error Taxonomy + recovery. 8 Extension
  Points. 9 Design Decisions (D-### with Alt/Rationale/Trade-off, cross-referenced to Phase-2.5
  triage). 10 External API Architecture (SHAPES; query patterns; pagination; auth — neutral;
  exact strings via impl). 11 Cache/Data Merge Strategy. 12 Input/Keymap System. 13 Non-Trivial
  Algorithms (neutral I/O contract; approach; limits; fallback; PROPERTY invariants). 14
  Rendering/Framework Model. 15 Composition Root Patterns. 16 Cross-Cutting Invariants
  (ESSENTIAL invariant + [INCIDENTAL:<paradigm>] mechanism). 17 FITNESS FUNCTIONS (see 3.2-FIT).
  + Changelog.
→ run contradiction sweep vs domain.md + proper-noun scan.

### 3.2-FIT  technical-spec.md §FIT — Architectural Fitness Functions (FIRST-CLASS)
The machine-checkable invariants. Each rule: ID, STATEMENT (neutral), DETECTION recipe,
SEVERITY (BLOCK | WARN). Stage 2 binds each to a concrete tool. Author at minimum:
  FIT-DEP-*  : layer→path map; "layer N imports only ≤N"; no import cycles (SCC size 1);
               domain layer imports nothing outside domain; siblings don't cross-import;
               commands never import UI; pure input/keymap contexts.
  FIT-ERR-*  : every boundary error is a typed family member; write ops are infallible where
               specified; boundaries have complete explicit contracts (no implicit-any).
  FIT-STATE-*: no global mutable state outside the state layer; pure modules do no I/O;
               per-argument caches are GC-able; reactive bodies use tracking reads.
  FIT-SIZE-* : size/complexity budgets (WARN). DERIVE these from ESSENTIAL design only; NEVER
               from a Phase-2.5 INCIDENTAL smell (do not codify a god-component).
  FIT-SPEC-* : every [ESSENTIAL] SPEC has ≥1 passing ID-named test; every domain invariant ID
               maps to ≥1 SPEC; no test references a retired SPEC; impl pointers resolve;
               Source citations resolve; every algorithm has ≥1 passing property test.
Output the layer→path mapping table (reference paths) so Stage 2 can rebind it.

### 3.3 behavior-spec.md (the agnostic test contract)
For EVERY [ESSENTIAL] invariant, workflow, and state transition:
## SPEC-### : <one-line behavior>
Tags: [ESSENTIAL]
Given <preconditions> / And <…>
When  <action>
Then  <observable outcome — MUST / MUST NOT> / And <…>
Source: path/to/file.ext:Lstart-Lend
Maps-to: D-00X / S-00X / U-00X

For EVERY non-trivial algorithm, ALSO author PROPERTY specs (this replaces fixtures as the
verification spine — it needs no reference):
## SPEC-###-P : <property name>
Tags: [ESSENTIAL] [PROPERTY]
For-all <input generator + constraints>
Invariant <a relation that MUST hold over ALL generated inputs>
Source: path/to/file.ext:Lstart-Lend
Maps-to: <algorithm / invariant ID>
e.g. "For all patches P: lineCounts(normalize(minimizeWhitespace(P))) == actualBodyCounts(...)";
     "For all (load, page) where cursor advances: itemCount never decreases AND hasNextPage is
      not forced false by a duplicate-only page."

Mandatory coverage: identity rules; every illegal-state prohibition; every fallback/limit
(pagination-survives-duplicate-page; cache-merge-preserves-detail-on-matching-key; page-size
clamp); every retry/backoff rule; every invalid state-machine transition; ≥1 property per
algorithm. Each SPEC testable without reading source. NO language.
COVERAGE BIAS: prefer MORE SPECs. Anything not covered by a SPEC will be silently dropped by
Stage 2. Redundant SPECs are cheap; missing SPECs are catastrophic. Document SPEC dependencies
(which imply which) — but NEVER drop a SPEC for being derivable.

### 3.4 developer-guide.md (agnostic build process)
1 Build Order (domain → config → boundaries → state → commands → input → UI → integration) +
  rationale. 2 Iterative Build Loop: Write → Format-check → Compile → Lint → Test(all so far) →
  Fix → Commit. 3..N Phase plan: modules per phase + a VERIFICATION GATE (checks to pass) +
  what to test + which SPECs belong to the phase. + Testing strategy per gate (pure /
  boundary-with-real-deps / integration / algorithm PROPERTY+perf). + Quality-gate REQUIREMENTS
  to re-bind. + Common Pitfalls as neutral WRONG/CORRECT. + Algorithm Reference. + Framework-
  model primer. + Changelog.
→ run the implementation dry-run.

### 3.5 reference/reference-impl.md & reference/idiom-notes.md
Quarantine ALL source-language material, anchored so blueprint impl pointers resolve: exact
signatures; queries/SQL/CLI; code per pitfall/pattern/algorithm; deps+versions and compiler/
lint/format configs; "how the reference solved X" notes; the Idiom Translation Table
(ESSENTIAL concept → INCIDENTAL reference idiom; target column left blank for Stage 2).

================================================================================
PHASE 4 — Adversarial Validation (report honestly; revise until clean)
================================================================================
1 CLAIM AUDIT — 5 random cited claims/doc; re-open source; confirm or RETRACT; <100% → fix.
2 PROPER-NOUN SCAN — scan the four blueprint docs for source-language/library/tool names; ANY
  hit → move to reference/ + neutral notation + pointer; report count (must reach 0).
3 IMPLEMENTATION DRY-RUN — plan one realistic feature using ONLY the four blueprint docs (NOT
  reference/); each insufficiency → a doc fix.
4 CONTRADICTION SWEEP — pick identifiers/counts (e.g. theme count, SPEC count, layer count) and
  confirm they agree across ALL docs and changelogs. Mismatched counts are a FAILURE.
5 COVERAGE CHECK — every TIER 1 file represented in ≥1 doc.
6 PORTABILITY CHECK — every [INCIDENTAL] item lives only in reference/ and serves a named
  [ESSENTIAL] item; no blueprint doc REQUIRES a language-specific idiom or paradigm.
7 PROPERTY CHECK — every non-trivial algorithm has ≥1 property SPEC. Missing → add it.
Output a Validation Report with concrete pass/fail counts and the diffs you made.
"All checks pass" with no evidence is itself a failure.

================================================================================
DETERMINISM
================================================================================
- Version string = manifest version (or commit SHA if none); use it consistently in EVERY doc
  header and changelog. Use the ACTUAL current date in changelog entries.
- Filenames/paths EXACTLY as specified; do not rename or pluralize.
- The four blueprint docs share one vocabulary; behavior-spec.md reuses invariant IDs from
  domain.md; technical-spec impl anchors resolve into reference/reference-impl.md.
# STAGE 2 — Build a New App from the Blueprint

You are a senior staff engineer building a NEW application in `{{TARGET_LANGUAGE}}`
from a language-agnostic blueprint produced in Stage 1, optionally adding new
features. You are graded by `behavior-spec.md` passing in the target language —
NOT by resemblance to the reference implementation.

================================================================================
INPUTS
================================================================================
- Blueprint (binding): docs/domain.md, docs/technical-spec.md, docs/behavior-spec.md
- Process (binding): docs/developer-guide.md
- Reference (consult only): docs/reference/reference-impl.md, docs/reference/idiom-notes.md
- TARGET_LANGUAGE: {{TARGET_LANGUAGE}}            # e.g. Rust, Go, Python, Swift
- TARGET_STACK (optional): {{TARGET_STACK}}        # e.g. ratatui / bubbletea / Textual; sqlite lib; test framework
- FEATURE_DELTA (optional): {{FEATURE_DELTA}}      # new features / removed features / changed behavior vs reference
- PRODUCT_NOTES (optional): {{PRODUCT_NOTES}}      # naming, scope, non-goals

================================================================================
GOVERNING RULES
================================================================================
- Satisfy EVERY [ESSENTIAL] fact and EVERY [ESSENTIAL] SPEC. These are hard.
- Re-solve EVERY [INCIDENTAL] reference idiom in idiomatic {{TARGET_LANGUAGE}};
  do NOT transliterate the reference's syntax.
- Re-tune [DERIVED:domain] constants if the language warrants; copy
  [DERIVED:platform] constants verbatim.
- Structural deviation from the reference architecture is ALLOWED and expected
  where the target language has a better idiom — as long as [ESSENTIAL]
  invariants and behavior-spec.md still hold.
- New features (FEATURE_DELTA) must not violate any existing [ESSENTIAL]
  invariant. If a new feature conflicts with one, STOP and report the conflict.

================================================================================
READING ORDER (do this before anything else)
================================================================================
1. behavior-spec.md  → becomes the failing test suite (binding).
2. domain.md         → vocabulary + invariants (binding).
3. technical-spec.md → architecture + contract SHAPES (shapes binding; impl free).
4. reference/*       → CONSULT ONLY when a contract shape is ambiguous. Treat as
                       "one prior solution," never the target. If you catch
                       yourself copying its syntax, STOP and use the Idiom Binding
                       Map instead.

================================================================================
STEP 0 — Idiom Binding Map (produce ONCE, before any code; then commit to it)
================================================================================
For every [INCIDENTAL] reference pattern, choose the idiomatic {{TARGET_LANGUAGE}}
equivalent and record it. Fill every row; no blank rows allowed before coding.

**Use the Idiom Translation Table in reference/idiom-notes.md as your starting point.**
That table already maps [ESSENTIAL] concepts to [INCIDENTAL] reference idioms.
Your job: fill the "Target Idiom" column with {{TARGET_LANGUAGE}} equivalents.

| Concept [ESSENTIAL]        | Reference idiom [INCIDENTAL] | {{TARGET_LANGUAGE}} idiom + lib |
|----------------------------|-----------------------------|---------------------------------|
| Service/boundary           |                             |                                 |
| Typed error families       |                             |                                 |
| Reactive/derived state     |                             |                                 |
| Effect/side-effect boundary|                             |                                 |
| Sum/tagged union           |                             |                                 |
| Persistence + migrations   |                             |                                 |
| External-API client        |                             |                                 |
| UI/render primitives       |                             |                                 |
| Async data + staleness     |                             |                                 |
| Command/action dispatch    |                             |                                 |
| Input/keymap layering      |                             |                                 |

**Cross-Cutting Patterns:** Also map the patterns from technical-spec.md §17:
- Staleness guard → how does {{TARGET_LANGUAGE}} handle async staleness?
- Optimistic-rollback protocol → what's the idiomatic way to do optimistic updates?
- Cache-then-network double-write → how do you compose cache + network reads?

================================================================================
STEP 0.5 — Quality-Gate Binding (write config + scripts BEFORE coding)
================================================================================
Re-bind developer-guide.md's quality requirements to the target toolchain:
- formatter, linter, max-strictness compiler/type settings available
- test runner + COVERAGE THRESHOLD (>= the blueprint's expectation)
- **PROPERTY-TEST library** (this is mandatory — it is the verification spine for algorithms)
- "use project scripts, never raw tools" rule (define the scripts)
- CI check order + fix order (mirror developer-guide.md)
- ported project style rules (e.g. immutable-by-default; no raw/untyped errors;
  no global mutable state outside the state system)
Commit these to the new repo before writing feature code.

================================================================================
STEP 1 — Target-language phase plan
================================================================================
Rewrite developer-guide.md's phases for {{TARGET_LANGUAGE}} + the chosen idioms.
Keep the SAME order (domain → config → boundaries → state → commands → input → UI
→ integration) and the SAME "one slice at a time; gate before the next module"
discipline. Insert FEATURE_DELTA items into the phase where their layer belongs.

================================================================================
STEP 2 — Write the conformance suite FIRST (TDD)
================================================================================
Translate behavior-spec.md SPECs into real tests in the target framework. They
must compile and FAIL initially. Preserve invariant IDs in test names
(e.g. test_S001_cache_failures_are_silent) so the conformance report maps back to
domain.md.

**For PROPERTY specs:** write property-based tests using the bound library (generate
inputs, assert the invariant). These are mandatory for every non-trivial algorithm.

For FEATURE_DELTA, author NEW SPEC-### entries (same Given/When/Then format, including
PROPERTY specs where relevant) and corresponding failing tests BEFORE implementing them.
Do not weaken or delete any existing SPEC to make it pass.

================================================================================
STEP 3 — Build in vertical slices, gated
================================================================================
For each slice:
1. Write minimum idiomatic code to satisfy the slice's SPEC tests + contracts.
2. Run the gate: format-check → typecheck/compile → lint → the slice's tests
   (example + property).
3. Do NOT advance until the gate is green AND the slice's SPEC tests pass.
4. Commit.
Run the FULL suite + coverage only at the Integration phase (mirror the guide).

================================================================================
STEP 4 — Honest conformance report (definition of done)
================================================================================
Output a table: every SPEC-### → PASS / FAIL / NOT-YET-IMPLEMENTED, with the
target test name; mark PROPERTY specs and FEATURE_DELTA SPECs separately.
"Done" requires ALL of:
- every [ESSENTIAL] SPEC PASS (Given/When/Then AND PROPERTY; reference + feature),
- coverage ≥ the bound threshold,
- format/lint/typecheck/tests all green,
- Idiom Binding Map has no unresolved rows,
- any blueprint ambiguity/insufficiency reported (feeds Stage-1 fixes).

================================================================================
ANTI-FAILURE RULES
================================================================================
- Do NOT port reference-language idioms literally (no fluent-but-unidiomatic
  code). Use STEP 0's mapping.
- Do NOT claim a gate/test passed without running it. If you cannot execute,
  label output UNVERIFIED and list the exact commands the human must run.
- Do NOT silently drop or weaken a SPEC. A dropped/weakened SPEC is a build failure.
- Do NOT skip property tests for algorithms — they are the primary fidelity check.
- Do NOT let a new feature break an [ESSENTIAL] invariant; report conflicts.
- Preserve [ESSENTIAL] invariant IDs in test names for traceability.
# STAGE 3 — Grow Without Drift

You maintain an application built from a language-agnostic blueprint (Stage 1) in a
target language (Stage 2). Your job is to add features, fix bugs, or refactor WITHOUT
violating the blueprint's [ESSENTIAL] invariants or eroding the architectural fitness
functions (§FIT in technical-spec.md).

================================================================================
INPUTS
================================================================================
- Blueprint (binding): docs/domain.md, docs/technical-spec.md, docs/behavior-spec.md
- Process (binding): docs/developer-guide.md
- Reference (consult only): docs/reference/reference-impl.md, docs/reference/idiom-notes.md
- Target codebase: the {{TARGET_LANGUAGE}} implementation from Stage 2
- CHANGE_REQUEST: the feature, bug fix, or refactor you need to implement

================================================================================
THE IRON LAW
================================================================================
Every change must preserve behavioral conformance:
- All existing [ESSENTIAL] SPECs (Given/When/Then AND PROPERTY) must still pass.
- All §FIT architectural fitness rules must still pass.
- If the change violates an invariant, you must first update the blueprint (domain.md,
  technical-spec.md, behavior-spec.md) and get approval BEFORE implementing.

================================================================================
STEP 1 — Classify the change
================================================================================
Determine which category your change falls into:

**ADDITIVE** (safest): New feature that adds behavior without modifying existing behavior.
- Example: "Add keyboard shortcut to copy PR URL to clipboard"
- Action: Add new SPECs, implement, verify all old SPECs still pass.

**MODIFYING** (requires care): Change to existing behavior.
- Example: "Change pagination from 50 to 100 items per page"
- Action: Update affected SPECs, verify [ESSENTIAL] invariants still hold, implement.
- If a [DERIVED:domain] constant changes, document the rationale.

**REFactoring** (structural only): Change implementation without changing behavior.
- Example: "Extract merge logic into separate module"
- Action: Verify all SPECs still pass, verify §FIT rules still pass.
- If §FIT rules fail, the refactor introduced architectural drift — fix it.

**CORRECTIVE** (bug fix): Existing behavior violates a SPEC.
- Example: "Cache merge loses detail when commit SHA changes"
- Action: Verify the SPEC exists (if not, add it), implement fix, verify SPEC passes.

================================================================================
STEP 2 — Update the blueprint (if needed)
================================================================================
If your change is ADDITIVE or MODIFYING:

1. **domain.md**: Add new entities, states, workflows, or invariants as needed.
   - Use Domain Notation.
   - Assign new invariant IDs (D-###, S-###, U-###).
   - Update the changelog with date and summary.

2. **technical-spec.md**: Add new operations, layers, or fitness rules as needed.
   - Use Contract Notation for new operations.
   - If adding a new layer, update the layer→path mapping in §FIT.
   - Update the changelog.

3. **behavior-spec.md**: Add new SPECs (Given/When/Then AND PROPERTY as appropriate).
   - Assign new SPEC IDs (SPEC-###).
   - Map each SPEC to invariant IDs.
   - Update the changelog.

4. **developer-guide.md**: If the change affects the build process, update the relevant phase.

================================================================================
STEP 3 — Write failing tests FIRST
================================================================================
Before writing any implementation code:
1. Write tests for all new/modified SPECs.
2. Verify they FAIL (red phase of TDD).
3. If they pass without implementation, the SPEC is not specific enough — refine it.

================================================================================
STEP 4 — Implement in vertical slices
================================================================================
Follow the same gated build process from Stage 2:
1. Write minimum code to satisfy the slice's SPECs.
2. Run the gate: format-check → typecheck/compile → lint → slice's tests.
3. Do NOT advance until green.
4. Commit.

After implementation:
- Run the FULL test suite (all SPECs, including old ones).
- Run the FULL §FIT check (all architectural fitness rules).
- If anything fails, fix it before proceeding.

================================================================================
STEP 5 — Verify no drift
================================================================================
After implementation, verify:

1. **Behavioral conformance**: All SPECs pass (old + new).
2. **Architectural fitness**: All §FIT rules pass.
3. **Idiom consistency**: New code uses the idioms from the Idiom Binding Map.
4. **No incidental leakage**: New code does not introduce [INCIDENTAL] patterns into
   [ESSENTIAL] blueprint docs.

If any check fails, fix it. If you cannot fix it without violating the blueprint,
STOP and escalate.

================================================================================
STEP 6 — Update documentation
================================================================================
After successful implementation:

1. **reference/reference-impl.md**: Add new signatures, queries, SQL, CLI strings.
   - Cross-link to blueprint via `impl:` anchors.

2. **reference/idiom-notes.md**: If you introduced new idioms, add them to the
   Idiom Translation Table.

3. **Changelogs**: Update all modified docs with date and summary.

================================================================================
ANTI-DRIFT RULES
================================================================================
- Do NOT weaken a SPEC to make a test pass. Fix the implementation instead.
- Do NOT disable a §FIT rule to make a refactor pass. Fix the architecture instead.
- Do NOT add [INCIDENTAL] details to [ESSENTIAL] blueprint docs.
- Do NOT skip the failing-tests-first step. TDD is non-negotiable.
- Do NOT commit code that fails any SPEC or §FIT rule.
- If you discover a SPEC is wrong, update the blueprint BEFORE fixing the implementation.
# Domain Specification

> **Version:** 0.7.1
> **Purpose:** What the system IS — the problem domain, entities, workflows, and invariants.
> Written as a domain expert who has never seen code. ZERO framework/library/language nouns.

---

## 1. System Overview

### Value Proposition

A local-first terminal application for browsing, reviewing, and managing code review items and issue trackers from a remote code hosting platform. It runs entirely in the terminal, fetches data from the platform's API via its official command-line tool, caches data locally for instant startup, and provides a keyboard-driven interface.

### Target User

A developer who reviews code changes, manages issues, prefers terminal workflows, and wants to operate without switching to a browser.

### The ONE System Invariant

**Network is authoritative; local cache accelerates.** The application always presents the freshest network data available, but renders cached data immediately rather than showing blank screens during network fetches.

### External Dependencies (as Roles)

| Role | Responsibility |
|------|---------------|
| **Remote Platform CLI** | Sole gateway to the code hosting platform's API. Handles authentication, rate limiting, and API versioning. Must be installed and authenticated. |
| **Local Database** | Persistent key-value and relational storage for cached items, queue ordering, user preferences. |
| **Terminal Renderer** | Renders the user interface in the terminal. Handles keyboard input, screen layout, and text rendering. |
| **System Clipboard** | Copy/paste operations for URLs and text. |
| **System Browser** | Opening URLs in the user's default browser. |

---

## 2. Domain Model

### Entity: PullRequest

```
Identity: (repository, number)
  — same repository + number ⇒ same pull request, regardless of other attributes.

Attributes:
  - repository: text ("owner/name" format)
  - number: whole number
  - title: text
  - body: text (long-form description, may be empty)
  - author: text (username)
  - state: one of {open, closed, merged}
  - reviewStatus: one of {draft, approved, changes, review, none}
  - checkStatus: one of {passing, pending, failing, none}
  - checkSummary: optional text (human-readable check summary)
  - checks: list of CheckItem
  - headRefOid: text (current commit identifier)
  - headRefName: text (source branch name)
  - baseRefName: text (target branch name)
  - defaultBranchName: text
  - labels: list of Label
  - additions: whole number (lines added)
  - deletions: whole number (lines removed)
  - changedFiles: whole number
  - autoMergeEnabled: yes/no
  - detailLoaded: yes/no
  - createdAt, updatedAt: points in time
  - closedAt: optional point in time
  - url: text (canonical link)

Rules:
  - [ESSENTIAL] detailLoaded is yes IFF body, labels, checks, and line counts are populated.
  - [ESSENTIAL] All attributes are immutable — updates produce new values, never mutate.
  - [ESSENTIAL] Dates are always points in time, never text representations.
```
(impl: reference/reference-impl.md#PullRequestItem)

### Entity: Issue

```
Identity: (repository, number)

Attributes:
  - repository, number, title, body, author: as PullRequest
  - state: one of {open, closed}
  - labels: list of Label
  - commentCount: whole number
  - createdAt, updatedAt: points in time
  - url: text

Rules:
  - [ESSENTIAL] Issues share identity shape with PullRequests but have a different lifecycle.
  - [ESSENTIAL] Issues cannot be "review-requested" — that concept is PullRequest-only.
```
(impl: reference/reference-impl.md#IssueItem)

### Concept: Label

```
Attributes:
  - name: text
  - color: optional text (hex color code)
```

### Concept: CheckItem

```
Attributes:
  - name: text
  - status: one of {completed, in-progress, queued, pending}
  - conclusion: one of {success, failure, neutral, skipped, cancelled, timed-out} or absent

Rules:
  - [ESSENTIAL] conclusion is only present when status is "completed".
```

### Concept: CheckRollup

```
How individual checks produce the aggregate checkStatus:

  Condition                                          → Rollup
  ─────────────────────────────────────────────────────────────
  No checks exist                                    → none
  Any check status is not "completed"                → pending
  Any check concluded failure/cancelled/timed-out    → failing
  All checks concluded success/neutral/skipped       → passing

Rules:
  - [ESSENTIAL] Evaluation order matters: pending beats failing beats passing beats none.
    A single in-progress check makes the whole rollup "pending" even if other
    checks have already failed.
```
(impl: reference/reference-impl.md#getCheckInfoFromContexts)

### Concept: Comment — one of:

```
- GeneralComment:
    Attributes: id, author, body, when (optional point in time), link (optional text)
    Rule: [ESSENTIAL] Never carries file/line/side information.

- ReviewComment:
    Attributes: id, author, body, when (optional), link (optional),
                file (text path), line (whole number),
                side: one of {LEFT, RIGHT},
                replyTo (optional comment id)
    Rule: [ESSENTIAL] Always carries file, line, and side.
    Rule: [ESSENTIAL] side LEFT = old/deleted content; RIGHT = new/added content.
```
(impl: reference/reference-impl.md#PullRequestComment)

### Concept: MergeAction — one of:

```
- MergeNow:      { method: one of {squash, merge, rebase} }
- AutoMerge:     { method: one of {squash, merge, rebase} }
- AdminMerge:    { method: one of {squash, merge, rebase} }
- DisableAuto:   { }   (no method needed)

Rules:
  - [ESSENTIAL] The merge dialog only shows methods the repository allows.
  - [ESSENTIAL] AdminMerge is only available when the viewer has admin merge permission.
  - [ESSENTIAL] AutoMerge is only available when the item is open, not already auto-merge-enabled, and not conflicting.
  - [ESSENTIAL] DisableAuto is only available when auto-merge is currently enabled.
```
(impl: reference/reference-impl.md#PullRequestMergeAction)

### Concept: MergeInfo

```
Attributes:
  - repository, number, title: as PullRequest
  - state: one of {open, closed, merged}
  - isDraft: yes/no
  - mergeable: one of {mergeable, conflicting, unknown}
  - reviewStatus, checkStatus, checkSummary: as PullRequest
  - autoMergeEnabled: yes/no
  - viewerCanMergeAsAdmin: yes/no

Rules:
  - [ESSENTIAL] "Cleanly mergeable" requires: state=open, not draft, mergeable=mergeable,
    reviewStatus not in {changes, review}, checkStatus not in {pending, failing}.
```
(impl: reference/reference-impl.md#PullRequestMergeInfo)

### Concept: RepositoryDetails

```
Attributes:
  - repository: text
  - description: optional text
  - url: text
  - stargazerCount, forkCount, openIssueCount, openPullRequestCount: whole numbers
  - defaultBranch: optional text
  - pushedAt: optional point in time
  - isArchived, isPrivate: yes/no
```
(impl: reference/reference-impl.md#RepositoryDetails)

### Sub-Domain: DiffView

```
Concept: DiffRenderMode — one of {unified, split}
  - unified: deletions above additions in a single column
  - split: deletions (left) and additions (right) aligned on the same row

Concept: DiffWrapMode — one of {none, word}
  - none: lines do not wrap
  - word: lines wrap at terminal width

Concept: DiffWhitespaceMode — one of {ignore, show}
  - ignore: whitespace-only changes are minimized (collapsed to context)
  - show: all changes displayed

Concept: DiffCommentAnchor
  Attributes:
    - file: text (file path)
    - line: whole number (original line number)
    - side: one of {LEFT, RIGHT}
    - kind: one of {addition, deletion, context}
    - renderLine: whole number (visual row in rendered output)
    - colorLine: whole number (row for syntax highlighting)
    - text: text (line content without diff prefix)

Concept: DiffFilePatch
  Attributes:
    - name: text (file path)
    - filetype: optional text (for syntax highlighting)
    - patch: text (raw unified diff)

Concept: DiffState — one of:
  - Loading
  - Ready: { patch: text, files: list of DiffFilePatch }
  - Error: { message: text }

Rules:
  - [ESSENTIAL] Scroll position is preserved when toggling render mode, wrap mode, or whitespace mode.
  - [ESSENTIAL] Whitespace minimization must not remove all hunks from a file silently —
    if all hunks become empty, the entire file is dropped from the diff view.
  - [ESSENTIAL] In split view, deletion and addition lines at the same position are visually aligned.
```
(impl: reference/reference-impl.md#DiffView)

### Sub-Domain: CommentTarget

```
Concept: CommentTarget — one of:
  - DiffComment:    (comment on a diff line)
  - IssueComment:   (comment on an issue)
  - Reply:          { inReplyTo: comment id, anchorLabel: text }
  - Edit:           { commentId: text, commentTag: one of {comment, review-comment}, anchorLabel: text }

Rules:
  - [ESSENTIAL] Reply must reference an existing comment identifier.
  - [ESSENTIAL] Edit must match the author's comment and carry the correct tag.
  - [ESSENTIAL] Diff comments are anchored to a specific file, line, and side.
```
(impl: reference/reference-impl.md#CommentModalTarget)

### Sub-Domain: Theme

```
Concept: ThemeMode — one of {fixed, system}
  - fixed: always use the specified theme
  - system: follow terminal appearance (dark/light)

Concept: ThemeTone — one of {dark, light}

Concept: ThemeConfig — one of:
  - FixedTheme:    { theme: theme identifier }
  - SystemTheme:   { darkTheme: theme identifier, lightTheme: theme identifier }

The system supports 27 named themes (e.g., "ghui", "tokyo-night", "catppuccin",
"gruvbox", "nord", "dracula", "solarized-dark", "solarized-light", etc.).

Each theme defines a ColorPalette with named color slots:
  - background, modalBackground, text, muted, separator, accent, link, inlineCode, error
  - selectedBg, selectedText, count
  - status colors: draft, approved, changes, review, none, passing, pending, failing
  - diff colors: addedBg, removedBg, contextBg, lineNumberBg, addedLineNumberBg, removedLineNumberBg

Rules:
  - [ESSENTIAL] In system mode, the active theme follows the terminal's appearance.
  - [ESSENTIAL] Theme changes apply immediately without restart.
  - [ESSENTIAL] Theme choice is persisted across sessions.
```
(impl: reference/reference-impl.md#ThemeConfig)

### Sub-Domain: ItemList

```
Concept: ItemKind — one of {pullRequest, issue}

Concept: ListMode — one of {all, authored, assigned, mentioned, review}
  - "review" is PullRequest-only; issues cannot be review-requested.
  - [ESSENTIAL] "all" requires a non-null repository scope.
    Without it, the query means "every item on the platform" — never intentional.

Concept: ListInput
  Attributes:
    - kind: ItemKind
    - mode: ListMode (restricted by kind)
    - repository: optional text
    - cursor: optional text (pagination token)
    - pageSize: whole number in [1, 100]

Concept: Page<T>
  Attributes:
    - items: list of T
    - endCursor: optional text
    - hasNextPage: yes/no

Concept: CacheKey
  Format: "{kind}:{mode}:{repository-or-underscore}"
  Example: "pullRequest:authored:_", "issue:assigned:owner/name"
  Rule: [ESSENTIAL] Two queries differing only in text filter share a cache key.
    Typing in the filter must not evict loaded pages.
```
(impl: reference/reference-impl.md#ItemListInput)

### Sub-Domain: WorkspaceSurface

```
Concept: WorkspaceSurface — one of {repos, pullRequests, issues}
  - repos: browse tracked repositories with item counts
  - pullRequests: browse and review pull requests
  - issues: browse and manage issues

Rules:
  - [ESSENTIAL] Only one surface is active at a time.
  - [ESSENTIAL] Switching surfaces resets transient state (detail view, diff view, selections).
  - [ESSENTIAL] The issue view's repository scope is synchronized to the pull request view's scope.
```

### Sub-Domain: PullRequestView

```
Concept: PullRequestView — one of:
  - RepositoryView: { repository: text }
  - QueueView:      { mode: one of {authored, review, assigned, mentioned}, repository: optional text }

Rules:
  - [ESSENTIAL] RepositoryView requires a non-null repository.
  - [ESSENTIAL] QueueView can be global (repository absent) or scoped to a repository.
```
(impl: reference/reference-impl.md#PullRequestView)

### Sub-Domain: StartupRepositoryDetection

```
Concept: GitRemoteUrl — text matching GitHub remote patterns
  Patterns accepted:
    - https://github.com/owner/repo
    - https://github.com/owner/repo.git
    - git@github.com:owner/repo.git

Concept: RemotePriority — ordering for repository detection
  Order: "origin" > "upstream" > alphabetical

Rules:
  - [ESSENTIAL] Remote URL parsing accepts both HTTPS and SSH formats.
  - [ESSENTIAL] .git suffix is stripped from repository names.
  - [ESSENTIAL] Detection prefers "origin" remote, then "upstream", then alphabetical.
  - [ESSENTIAL] Detection failure is silent — user must open repository manually.
```
(impl: reference/reference-impl.md#Startup-Repository-Detection)

### Sub-Domain: ViewSynchronization

```
Concept: ViewProjection — mapping PullRequestView to IssueView
  Rules:
    - [ESSENTIAL] RepositoryView(repo) projects to RepositoryView(repo).
    - [ESSENTIAL] QueueView(mode, null) projects to QueueView("authored", null).
    - [ESSENTIAL] QueueView(mode, repo) projects to RepositoryView(repo).
    - [ESSENTIAL] Projection is total — every PR view has a defined issue counterpart.
```
(impl: reference/reference-impl.md#View-Synchronization)

---

## 3. User Workflows

### 3.1 Browse Items

```
1. User launches the application.
2. Cached item list renders immediately (if available).
3. Background fetch refreshes from the remote platform.
4. User navigates with keyboard (up/down or j/k).
5. User opens an item with enter to see details.

Invariant: [ESSENTIAL] The list must never be empty due to a network error if cached data exists.
Invariant: [ESSENTIAL] Cache failures are silent — the user never sees a cache error.
```

### 3.2 Review a Pull Request

```
1. User selects a pull request from the list.
2. User opens diff view.
3. User navigates diff lines and adds review comments.
4. User submits review (choosing comment, approve, or request-changes).

Invariant: [ESSENTIAL] Diff comments must be anchored to a specific line and side.
Invariant: [ESSENTIAL] A review submission sends all pending review comments atomically.
```

### 3.3 Merge a Pull Request

```
1. User selects an open pull request.
2. User opens merge dialog.
3. Dialog shows allowed merge methods for the repository.
4. User selects method and confirms.
5. UI shows optimistic merge state; network confirms.

Invariant: [ESSENTIAL] The merge action validates the item is open and mergeable before sending.
Invariant: [ESSENTIAL] On merge failure, optimistic state is reverted.
```

### 3.4 Switch Workspace Surface

```
1. User presses 1, 2, or 3 to switch surface.
2. Current selection and scroll position persist per view.
3. Transient state (detail view, diff view) resets.

Invariant: [ESSENTIAL] Switching surfaces must not lose cached data.
```

### 3.5 Filter Items

```
1. User opens filter mode.
2. User types query; results filter in real-time.
3. User clears filter to return to full list.

Invariant: [ESSENTIAL] Filter is client-side only — never triggers network requests.
Invariant: [ESSENTIAL] Filter scoring ranks earlier matches in higher-priority fields first.
```

### 3.6 Submit a Review

```
1. User opens diff and navigates to a commentable line.
2. User opens comment editor, writes body.
3. User opens submit review dialog.
4. User selects review event: comment, approve, or request-changes.
5. User optionally writes a review summary body.
6. User confirms submission.

Invariant: [ESSENTIAL] Partial submission is not supported — all pending comments go atomically.
```

### 3.7 Manage Labels

```
1. User selects an item.
2. User opens label modal.
3. Modal fetches available labels for the repository.
4. User searches and toggles labels.
5. Each toggle immediately sends an add/remove request.

Invariant: [ESSENTIAL] Label operations are independent — toggling one does not affect others.
```

### 3.8 Change Theme

```
1. User opens theme modal.
2. User browses available themes with live preview.
3. User selects a theme or switches between fixed/system mode.
4. Theme applies immediately without restart.

Invariant: [ESSENTIAL] Theme changes must not affect cached data or network state.
```

### 3.9 Open Repository

```
1. User opens repository modal.
2. User types "owner/name" format (or pastes a URL).
3. System validates the repository exists.
4. On success, switches to the new repository's item list.

Invariant: [ESSENTIAL] Invalid repository names show an error, not a crash.
Invariant: [ESSENTIAL] Both URL format and shorthand "owner/name" are accepted.
```

### 3.10 Pagination (Load More)

```
1. User scrolls near the end of the list.
2. System automatically fetches the next page.
3. New items are appended, deduplicating by URL.
4. Cached detail fields are preserved across the merge.

Invariant: [ESSENTIAL] Pagination continues as long as the cursor advances and the server
  reports more pages. A page of all-duplicate items must NOT kill pagination.
Invariant: [ESSENTIAL] Total items are capped at the fetch limit (default 500).
```

### 3.11 Retry on Failure

```
1. Network fetch fails (transient error).
2. System retries with exponential backoff (base 300ms, factor 2, max 6 retries).
3. User sees "Retrying N/M" in the footer.
4. Rate limit errors and command timeouts do NOT trigger retries.

Invariant: [ESSENTIAL] Rate-limited requests show "Rate limited" and stop retrying.
Invariant: [ESSENTIAL] Command timeouts do not retry — they indicate a systemic issue.
```

### 3.12 Auto-Detect Repository on Launch

```
1. Application starts.
2. System checks if current directory is inside a git repository.
3. If yes, system reads git remotes and parses GitHub URLs.
4. Remotes are checked in priority order: "origin", "upstream", then alphabetical.
5. First valid GitHub remote sets the initial repository scope.
6. If detection fails or no git repo found, user must open repository manually.

Invariant: [ESSENTIAL] Detection failure is silent — no error shown to user.
Invariant: [ESSENTIAL] Both HTTPS and SSH remote formats are accepted.
```

---

## 4. State Machines

### 4.1 Load Status

```
States: {loading, ready, error}

Transitions:
  loading → ready     (on success)
  loading → error     (on failure)
  error   → loading   (on retry)

Invalid:
  loading + ready simultaneously
```

### 4.2 Modal System

```
States: one of 14 variants (including None)

  None
  CommandPalette     { query, selectedIndex }
  Comment            { body, cursor, error, target }
  Merge              { repository, number, selectedIndex, loading, running, info, error,
                       selectedMethod, allowedMethods, pendingConfirm }
  Close              { kind, repository, number, title, url, running, error }
  Label              { repository, query, selectedIndex, availableLabels, loading }
  PullRequestState   { repository, number, title, url, isDraft, selectedIsDraft, running, error }
  DeleteComment      { commentId, commentTag, author, preview, running, error }
  CommentThread      { scrollOffset }
  ChangedFiles       { query, selectedIndex }
  Filter             { surface, selectedIndex }
  SubmitReview       { repository, number, focus, selectedIndex, body, cursor, running, error }
  Theme              { query, filterMode, mode, tone, fixedTheme, darkTheme, lightTheme,
                       initialThemeConfig }
  OpenRepository     { query, error }

Transitions:
  None → any variant    (on open)
  any variant → None    (on close)
  any variant → any variant  (on replace — atomic)

Invalid:
  Two modals active simultaneously.
```
(impl: reference/reference-impl.md#Modal)

### 4.3 Comment Editor

```
States: {idle, editing, submitting}

Transitions:
  idle      → editing     (on start)
  editing   → submitting  (on submit)
  submitting → idle       (on success)
  editing   → idle        (on cancel)

Invalid:
  submitting → editing (must complete or fail first)
```

### 4.4 Diff View

```
States: {list, loading, ready, error, comment-editor}

Transitions:
  list    → loading          (on open-diff)
  loading → ready            (on success)
  loading → error            (on failure)
  ready   → list             (on close)
  ready   → ready            (on toggle-view: unified ↔ split)
  ready   → ready            (on toggle-wrap: none ↔ word)
  ready   → ready            (on toggle-whitespace: ignore ↔ show)
  ready   → comment-editor   (on open-comment)
  comment-editor → ready     (on submit or cancel)

Invalid:
  ready → loading (must close and reopen)
```

### 4.5 Pagination

```
States: {initial, loaded, loading-more, complete}

Transitions:
  initial      → loaded         (on first page)
  loaded       → loading-more   (on load-more trigger)
  loading-more → loaded         (on success, with more items)
  loading-more → loaded         (on failure — retry on next trigger)
  loaded       → complete       (when hasNextPage = no)

Invalid:
  complete → loading-more (no more pages)
```

### 4.6 Retry Progress

```
States: {idle, retrying}

Transitions:
  idle    → retrying   (on fetch error, attempt 1)
  retrying → retrying  (on backoff, attempt N+1; exponential: 300ms base, factor 2)
  retrying → idle      (on success)
  retrying → idle      (on max retries reached: 6)

Rules:
  - [ESSENTIAL] Rate limit errors do NOT enter retrying.
  - [ESSENTIAL] Command timeouts do NOT enter retrying.
  - [ESSENTIAL] Maximum 6 retries with exponential backoff from 300ms, factor 2.
```

---

## 5. Invariants & Laws

### Domain Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| D-001 | Two items with the same (repository, number) are the same entity. | Duplicate entries, incorrect cache keys. |
| D-002 | detailLoaded is yes IFF body, labels, checks, and line counts are populated. | UI shows incomplete data or unnecessary fetches. |
| D-003 | A review comment always carries file, line, and side. A general comment never does. | Invalid API requests, broken diff anchors. |
| D-004 | Dates are always points in time, never text representations. | Sorting errors, display inconsistencies. |
| D-005 | All entity attributes are immutable. | Accidental mutation, stale UI. |
| D-006 | "review" list mode is PullRequest-only; issues cannot be review-requested. | Invalid search queries. |
| D-007 | "all" list mode requires a non-null repository. | Unbounded global search. |
| D-008 | Page size is clamped to [1, 100]. | Remote API rejection. |
| D-009 | Diff comment anchors must map to valid render lines within the diff. | Comments attached to wrong lines. |
| D-010 | Cache key format: "{kind}:{mode}:{repository-or-underscore}". | Cache collisions, stale reads. |

### System Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| S-001 | Network is authoritative; cache accelerates. | Stale data presented as fresh, data loss. |
| S-002 | Cache failures are silent. | Application crashes on storage errors. |
| S-003 | The remote platform service never knows about local storage. | Service layer entanglement, testability loss. |
| S-004 | Local storage never knows about the user interface. | Persistence layer entanglement. |
| S-005 | The UI never invokes external processes directly. | Untracked side effects, security issues. |
| S-006 | All remote platform access goes through the official CLI tool. | Bypassing authentication, inconsistent error handling. |
| S-007 | Summary queries omit detail fields; detail queries hydrate. | Unnecessary bandwidth, slow list rendering. |
| S-008 | Cache merge preserves detail fields when summary refresh overwrites, only if the commit identifier matches. | Check icons revert to blank on every page fetch. |

### UI Invariants

| ID | Invariant | Consequence if Violated |
|----|-----------|------------------------|
| U-001 | Every mutable UI state is a reactive cell. | State inconsistency, re-rendering bugs. |
| U-002 | Commands never close over component-local state. | Commands fail when dispatched from palette or keymap. |
| U-003 | Selection is scoped per view. | Wrong item selected after view switch. |
| U-004 | Filter is client-side only. | Unnecessary network requests, poor UX. |
| U-005 | Layout math happens in the composition root, passed as props. | Inconsistent layouts, magic constants. |
| U-006 | Modal dividers connect to side borders via junction characters. | Detached visual appearance. |
| U-007 | Input layer contexts are pure — no state or service dependencies. | Input layer coupling, test difficulty. |
| U-008 | Parameterized reactive cells must not be kept alive artificially. | Memory leaks via prevented garbage collection. |

---

## 6. Error Model

### Error Families

```
RemoteError = transport-failure | parse-failure | decode-failure
  - transport-failure: the CLI process failed or timed out
  - parse-failure: the CLI output was not valid structured data
  - decode-failure: the structured data did not match the expected shape

CacheError = read-failure | write-failure
  - read-failure: treated as cache miss (transparent)
  - write-failure: ignored silently (writes never surface errors)

IllegalInput = programmer error that must never reach a user
  - e.g., list mode "all" with no repository
```

### Recovery Strategies

| Error | Recovery | Parameters |
|-------|----------|------------|
| Transport failure (transient) | Retry with exponential backoff | 6 retries, 300ms base, factor 2 |
| Transport failure (rate limit) | Do not retry; show "Rate limited" | — |
| Transport failure (timeout) | Do not retry | — |
| Parse failure | Treat as cache miss | — |
| Decode failure | Treat as cache miss | — |
| Cache read failure | Treat as miss; fetch from network | — |
| Cache write failure | Ignore silently | — |
| Illegal input | Internal error; must never reach user | — |
| Command failure (merge/close) | Revert optimistic update; show error notice | User can retry |

### Display Rules

1. **Network errors during list fetch:** show cached data with stale indicator; show error as secondary notice.
2. **Network errors during mutation:** revert optimistic update; show error notice.
3. **Cache errors:** never show to user. Log silently.
4. **Retry in progress:** show "Retrying N/M" in footer.
5. **Rate limited:** show "Rate limited" notice; stop retrying.

---

## 7. Constants with Justifications

| Constant | Value | Tag | Justification |
|----------|-------|-----|---------------|
| PR fetch limit | 500 | [DERIVED:domain] | Empirical: users rarely scroll past 500 PRs. Higher = slow pagination. |
| Page size | 50 | [DERIVED:platform] | GitHub API allows [1, 100]. 50 balances latency vs. pagination frequency. |
| Retry count | 6 | [DERIVED:domain] | 6 retries × 300ms × 2^n = max 19.2s wait. Long enough for transient errors. |
| Retry base | 300ms | [DERIVED:domain] | Fast enough for user patience, slow enough to not hammer API. |
| LCS cell limit | 40,000 | [DERIVED:domain] | O(n²) algorithm. 40k cells = ~200×200 matrix. Fits in L2 cache. |
| Load-more threshold | 8 | [DERIVED:domain] | Prefetch when 8 items from end. Balances prefetch cost vs. user wait. |
| Prune retention | 30 days | [DERIVED:domain] | Monthly cleanup cycle. Old PRs rarely accessed. |
| SQLite busy_timeout | 5000ms | [DERIVED:platform] | SQLite default. Long enough for concurrent access. |
| Detail prefetch ahead | 3 | [DERIVED:domain] | Prefetch 3 PRs ahead of selection. Matches typical scroll speed. |
| Detail prefetch behind | 1 | [DERIVED:domain] | Prefetch 1 PR behind. User rarely scrolls back immediately. |
| Detail prefetch concurrency | 3 | [DERIVED:domain] | Max 3 concurrent fetches. Avoids rate limiting. |
| Detail prefetch delay | 120ms | [DERIVED:domain] | Debounce before prefetch. Avoids fetching on fast scroll. |
| Max count prefix | 99 | [DERIVED:domain] | Vim convention. 99j moves 99 lines. Higher = unusable. |
| Flash notice duration | 2500ms | [DERIVED:domain] | Long enough to read, short enough to not clutter. |

---

## Changelog

### 2026-05-30 (v0.7.1-r5)
- Removed §7 (Coalgebraic View) — category theory framing was decorative, not operational.
- Renumbered §8 Constants to §7.
- Fixed theme count: 27 themes (was incorrectly stated as 28).
- Removed duplicate §3.12 workflow.

### 2024-05-30 (v0.7.1-r4)
- Added section 7: Constants with Justifications (14 constants with rationale).

### 2024-05-29 (v0.7.1-r3)
- Rewritten in Domain Notation per Quarantine Rule.
- Zero source-language proper nouns in normative text.
- All entities, sub-domains, workflows, state machines, invariants, and error families preserved from prior version.
- Added portability tags ([ESSENTIAL]) to all rules.
- Added impl: pointers to reference/reference-impl.md.

### 2024-05-29 (v0.7.1-r2)
- Added Diff View, Comment Target, Theme, Check System, Repository Details, Merge Info, Item List sub-domains.
- Expanded workflows, state machines, invariants.

### 2024-05-27 (v0.7.1)
- Initial version.
# Technical Specification

> **Version:** 0.7.1
> **Purpose:** Language-agnostic architecture — layers, dependency rules, contract shapes,
> algorithms, external API shapes, and composition. States WHAT each boundary guarantees,
> not which library provides it.

---

## 1. Design Principles

### P-001: Types are the specification

Every public operation crossing a module boundary must have its complete contract shape (inputs, outputs, error-kinds) defined before implementation. The contract tells the truth about what an operation needs, what it returns, and how it can fail.

### P-002: Knowledge flows down

UI → Reactive State → Services → External systems. Services never know about UI. Cache never knows about the remote platform CLI.

### P-003: Failures are data

Every error is a named family with semantics. Never throw raw/untyped errors. Never use plain text in the error channel.

### P-004: Cache is transparent

Cache failures are silent. The application never blocks on local storage. On failure, degrade to network-only behavior.

### P-005: Commands are values

A command is a pure description of an action gated by reactive state. It can be dispatched from keymap, palette, or tests without re-threading dependencies.

### P-006: All remote access goes through the official CLI

Every remote platform API call is mediated by the official CLI binary. No direct HTTP calls. This ensures consistent authentication and error handling.

---

## 2. Architecture Layers

```
Layer 0: External Systems
  - Remote Platform API (via official CLI)
  - Local Database (via storage library)
  - System clipboard
  - Default browser
  - Terminal (via renderer)

Layer 1: Infrastructure
  ProcessRunner          → spawns external processes
  BrowserOpener          → opens URLs in system browser
  Clipboard              → system clipboard access
  Config                 → environment variables, application settings
  Observability          → telemetry endpoints

Layer 2: Services
  RemoteSchemas          → pure data shape definitions (no dependencies)
  RemoteNormalizer       → transforms raw responses into domain entities
  RemoteService          → ProcessRunner + schemas + normalizer + domain
  CacheService           → storage client + domain
  MockRemoteService      → RemoteService contract, domain (for development)

Layer 3: Runtime Composition
  Runtime                → merges all service layers into a single runtime

Layer 4: Domain Logic (pure)
  domain                 → pure entity definitions
  item                   → shared list abstraction
  pullRequestViews       → view definitions + cache keys
  issueViews             → view definitions + cache keys
  pullRequestLoad        → load state types
  issueLoad              → load state types
  pullRequestCache       → cache merge logic (pure functions)
  workspacePreferences   → preference types
  workspaceSurfaces      → surface definitions
  errors                 → error classification
  themeConfig            → theme resolution (pure functions)

Layer 5: State / Reactive Cells
  ui/*/atoms             → Runtime + Domain + Services
  workspace/atoms        → Runtime + Domain

Layer 6: Commands
  commands/registry      → pure command definition shape
  commands/handoffs      → side-effect registry (bridge to imperative hooks)
  commands/derivations   → derived reactive state for command metadata
  commands/builtins      → all command definitions
  commands/dispatch      → command dispatch via registry
  commands/atoms         → command snapshot reactive cells

Layer 7: Input / Keymap
  keymap/contexts/*      → pure context shapes (no state/service dependencies)
  keymap/*               → keymap definitions per view/modal
  keymap/all             → full keymap composition

Layer 8: UI Components
  ui/primitives          → renderer primitives
  ui/modals/types        → domain (modal state shapes)
  ui/modals/*            → modal components
  ui/*                   → components
  surfaces/*             → workspace surface compositions
  App                    → composition root (everything)
  index                  → bootstrap (renderer, entry point)
```

---

## 3. Module Dependency Rules

### Rule MDG-001: No upward imports

A file may only import from the same layer or a lower layer (closer to Layer 0).

### Rule MDG-002: No cross-imports between sibling services

Services compose at the runtime layer, not by direct import.

### Rule MDG-003: Reactive cells import services; services never import reactive cells

### Rule MDG-004: Commands import reactive cells; reactive cells never import commands

### Rule MDG-005: Input contexts are pure shapes

Input context definitions must not import from reactive cells or services. Values are provided by the composition root.

### Forbidden Patterns

| ID | Pattern | Why Forbidden |
|----|---------|--------------|
| F-001 | Circular imports between services | Services compose at runtime layer. |
| F-002 | UI components importing services directly | Go through reactive cells. |
| F-003 | Domain types depending on infrastructure | Domain is pure. |
| F-004 | Commands importing UI components | Commands manipulate reactive cells; renderer reads them. |
| F-005 | Input layer importing renderer hooks | Input contexts receive imperative functions from composition root. |

---

## 4. Boundary Contracts

### 4.1 RemoteService

All operations in Contract Notation:

```
Operation: listPullRequestPage
  in  : ItemListInput<PullRequest>   # {mode, repository?, cursor?, pageSize∈[1,100]}
  out : Page<PullRequest>            # {items[], endCursor?, hasNextPage}
  err : RemoteError
  impl: reference/reference-impl.md#listPullRequestPage

Operation: listIssuePage
  in  : ItemListInput<Issue>
  out : Page<Issue>
  err : RemoteError
  impl: reference/reference-impl.md#listIssuePage

Operation: listAllPullRequests
  in  : {mode, repository?}          # cursor/pageSize managed internally
  out : list of PullRequest
  err : RemoteError

Operation: listAllIssues
  in  : {mode, repository?}
  out : list of Issue
  err : RemoteError

Operation: getPullRequestDetails
  in  : (repository: text, number: whole)
  out : PullRequest
  err : RemoteError

Operation: getRepositoryDetails
  in  : (repository: text)
  out : RepositoryDetails
  err : RemoteError

Operation: getAuthenticatedUser
  in  : ()
  out : text (username)
  err : RemoteError

Operation: getPullRequestDiff
  in  : (repository: text, number: whole)
  out : text (raw unified diff)
  err : RemoteError

Operation: listPullRequestReviewComments
  in  : (repository: text, number: whole)
  out : list of ReviewComment
  err : RemoteError

Operation: listPullRequestComments
  in  : (repository: text, number: whole)
  out : list of Comment (both general + review, sorted by time)
  err : RemoteError

Operation: listIssueComments
  in  : (repository: text, number: whole)
  out : list of GeneralComment
  err : RemoteError

Operation: getPullRequestMergeInfo
  in  : (repository: text, number: whole)
  out : MergeInfo
  err : RemoteError

Operation: getRepositoryMergeMethods
  in  : (repository: text)
  out : {squash: yes/no, merge-commit: yes/no, rebase: yes/no}
  err : RemoteError

Operation: mergePullRequest
  in  : (repository: text, number: whole, action: MergeAction)
  out : ()
  err : transport-failure

Operation: closePullRequest
  in  : (repository: text, number: whole)
  out : ()
  err : transport-failure

Operation: closeIssue
  in  : (repository: text, number: whole)
  out : ()
  err : transport-failure

Operation: createPullRequestComment
  in  : CreateCommentInput
  out : ReviewComment
  err : RemoteError

Operation: createPullRequestIssueComment
  in  : (repository, number, body)
  out : GeneralComment
  err : RemoteError

Operation: replyToReviewComment
  in  : (repository, number, inReplyTo, body)
  out : GeneralComment
  err : RemoteError

Operation: editPullRequestIssueComment
  in  : (repository, commentId, body)
  out : GeneralComment
  err : RemoteError

Operation: editReviewComment
  in  : (repository, commentId, body)
  out : GeneralComment
  err : RemoteError

Operation: deletePullRequestIssueComment
  in  : (repository, commentId)
  out : ()
  err : transport-failure

Operation: deleteReviewComment
  in  : (repository, commentId)
  out : ()
  err : transport-failure

Operation: submitPullRequestReview
  in  : SubmitReviewInput
  out : ()
  err : transport-failure

Operation: toggleDraftStatus
  in  : (repository, number, isDraft: yes/no)
  out : ()
  err : transport-failure

Operation: listRepoLabels
  in  : (repository)
  out : list of Label
  err : RemoteError

Operation: addPullRequestLabel / removePullRequestLabel
  in  : (repository, number, label)
  out : ()
  err : transport-failure

Operation: addIssueLabel / removeIssueLabel
  in  : (repository, number, label)
  out : ()
  err : transport-failure
```

**Observations from contracts alone:**
- Read operations return domain entities; writes return nothing.
- Read operations can fail with RemoteError; writes can fail with transport-failure only.
- All operations are repository-scoped.
- Pagination is explicit in the input shape.

### 4.2 CacheService

```
Operation: readQueue
  in  : (viewer: text, view: PullRequestView)
  out : PullRequestLoad | absent
  err : CacheError

Operation: writeQueue
  in  : (viewer: text, load: PullRequestLoad)
  out : ()
  err : never                        # writes never surface errors

Operation: readPullRequest
  in  : {repository, number}
  out : PullRequest | absent
  err : CacheError

Operation: upsertPullRequest
  in  : PullRequest
  out : ()
  err : never

Operation: readIssueQueue / writeIssueQueue
  in  : (viewer, view: IssueView)
  out : IssueLoad | absent / ()
  err : CacheError / never

Operation: readIssue / upsertIssue
  in  : {repository, number} / Issue
  out : Issue | absent / ()
  err : CacheError / never

Operation: readRepoRollup
  in  : (viewer)
  out : list of {repository, pullRequestCount, issueCount, lastActivityAt}
  err : CacheError

Operation: readRepositoryDetails / writeRepositoryDetails
  in  : repository / RepositoryDetails
  out : RepositoryDetails | absent / ()
  err : CacheError / never

Operation: readRepositoryDetailsFetchedAt
  in  : repository
  out : point-in-time | absent
  err : CacheError

Operation: readWorkspacePreferences / writeWorkspacePreferences
  in  : viewer / WorkspacePreferences
  out : WorkspacePreferences | absent / ()
  err : CacheError / never

Operation: prune
  in  : ()
  out : ()
  err : never
```

**Observations:**
- Writes never fail (error channel is "never").
- Reads return entity-or-absent — misses are normal.
- Queue operations are viewer-scoped (multi-tenant).
- `prune` has no arguments — uses internal clock.

### 4.3 ProcessRunner

```
Operation: run
  in  : (command: text, args: list of text, options?)
  out : {exitCode, stdout, stderr}
  err : transport-failure

Operation: runSchema
  in  : (shape, command, args)
  out : decoded value (shape-dependent)
  err : transport-failure | parse-failure | decode-failure
```

**Observations:**
- `runSchema` is polymorphic — output shape depends on the input shape.
- `runSchema` can fail three ways: process failure, output parse failure, shape decode failure.

### 4.4 Startup & Repository Detection

```
Operation: detectCurrentGitHubRepository
  in  : ()
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # detection failure is silent

Operation: parseGitRemoteUrl
  in  : text (remote URL)
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # parse failure is silent

Operation: detectSystemAppearance
  in  : ()
  out : ThemeTone                    # "dark" or "light"
  err : never                        # detection failure defaults to "dark"
```

**Observations:**
- Repository detection is best-effort — failure means user must open repository manually.
- Remote priority: "origin" > "upstream" > alphabetical.
- System appearance detection uses platform-specific commands (macOS: defaults, Linux: gsettings).

### 4.5 Theme & Preference Persistence

```
Operation: loadStoredThemeConfig
  in  : ()
  out : ThemeConfig
  err : never                        # file read failure returns default

Operation: saveStoredThemeConfig
  in  : ThemeConfig
  out : ()
  err : never                        # file write failure is silent

Operation: loadStoredDiffWhitespaceMode
  in  : ()
  out : DiffWhitespaceMode
  err : never                        # file read failure returns "ignore"

Operation: readWorkspacePreferencesFile
  in  : (path: text, viewer: text)
  out : WorkspacePreferences-or-absent
  err : never                        # file read failure or viewer mismatch returns absent

Operation: writeWorkspacePreferencesFile
  in  : (path: text, preferences: WorkspacePreferences)
  out : ()
  err : never                        # file write failure is silent
```

**Observations:**
- All persistence operations are infallible — failures are silent.
- Theme config stored in `~/.config/ghui/config.json` (or XDG_CONFIG_HOME).
- Workspace preferences stored in cache directory, viewer-scoped.

### 4.4 Startup & Repository Detection

```
Operation: detectCurrentGitHubRepository
  in  : ()
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # detection failure is silent

Operation: parseGitRemoteUrl
  in  : text (remote URL)
  out : text-or-absent (repository in "owner/name" format, or absent)
  err : never                        # parse failure is silent

Operation: detectSystemAppearance
  in  : ()
  out : ThemeTone                    # "dark" or "light"
  err : never                        # detection failure defaults to "dark"
```

**Observations:**
- Repository detection is best-effort — failure means user must open repository manually.
- Remote priority: "origin" > "upstream" > alphabetical.
- System appearance detection uses platform-specific commands (macOS: defaults, Linux: gsettings).

### 4.5 Theme & Preference Persistence

```
Operation: loadStoredThemeConfig
  in  : ()
  out : ThemeConfig
  err : never                        # file read failure returns default

Operation: saveStoredThemeConfig
  in  : ThemeConfig
  out : ()
  err : never                        # file write failure is silent

Operation: loadStoredDiffWhitespaceMode
  in  : ()
  out : DiffWhitespaceMode
  err : never                        # file read failure returns "ignore"

Operation: readWorkspacePreferencesFile
  in  : (path: text, viewer: text)
  out : WorkspacePreferences-or-absent
  err : never                        # file read failure or viewer mismatch returns absent

Operation: writeWorkspacePreferencesFile
  in  : (path: text, preferences: WorkspacePreferences)
  out : ()
  err : never                        # file write failure is silent
```

**Observations:**
- All persistence operations are infallible — failures are silent.
- Theme config stored in `~/.config/ghui/config.json` (or XDG_CONFIG_HOME).
- Workspace preferences stored in cache directory, viewer-scoped.

---

## 5. State & Reactivity

### 5.1 Reactive Cell Kinds

| Kind | Pattern | Example |
|------|---------|---------|
| Global UI cells | Static cell, kept alive | activeView, selectedIndex |
| Async data cells | Runtime-bound cell with reactive dependencies | pullRequests, username |
| Computed cells | Derived from other cells | displayedPullRequests |
| Override cells | Key-value map for optimistic updates | pullRequestOverrides |
| Function cells | Parameterized, one cell per argument | readCachedRepositoryDetails |
| Cache cells | Key-value map for in-memory caching | labelCache, repoMergeMethodsCache |

### 5.2 Reactive Dependencies

Inside a runtime-bound cell body, the `get` parameter registers a reactive dependency:

```
cell = runtime.cell(function* (get) {
  view = get(activeView)     # registers dependency on activeView
  github = require RemoteService
  # ...
})
```

**Rule:** A non-tracking read (reading a cell without registering dependency) must never be used inside a runtime cell body when reactivity is desired.

### 5.3 Async Results

UI components read async cells and handle three states:
- **waiting:** show loading indicator
- **failure:** show error (squashed from error cause)
- **value:** render data

### 5.4 Optimistic Updates

1. Write to override cell with optimistic state.
2. Fire remote service operation.
3. On success: override becomes redundant.
4. On failure: remove override, restoring server state.

### 5.5 Parameterized Cells and Garbage Collection

Function cells create one cell per argument value. These cells self-clean via weak references and finalization.

**Rule:** Never keep function cells alive artificially. It prevents garbage collection and accumulates one entry per argument value the user has ever viewed.

### 5.6 In-Memory Queue Load Cache

The queue load cache is a key-value map caching loaded pages in memory, keyed by view cache key. Repository-scoped entries are trimmed to a maximum of 8 entries to prevent unbounded growth.

---

## 6. Action / Command System

### 6.1 Command Definition Shape

```
Command:
  id: text (unique identifier)
  scope: text (category)
  shortcut: optional text (keybinding hint)
  keywords: optional list of text (search terms)
  title: text | reactive cell of text (dynamic title)
  subtitle: optional text | reactive cell of text
  when: optional reactive cell of yes/no (visibility gate)
  disabledReason: optional reactive cell of text-or-absent
  run: effect (the action to perform)
```

### 6.2 Principles

1. **Commands never close over component-local state.** Any value comes from a reactive cell.
2. **Dynamic titles/disabled reasons are reactive cells.** Palette evaluates them on every render.
3. **Hook-bound actions use handoffs.** Commands needing imperative renderer behavior invoke a named handoff slot, and the composition root registers a handler.

### 6.3 Three Command Shapes

1. **"Open this modal":** set the active modal cell to a new variant with initial state + seed data.
2. **"Toggle this cell":** update a cell's value via a transformation function.
3. **"Read selection, do thing with service":** read selection via cells, call a service operation.

### 6.4 Handoffs (the only escape hatch)

A handoff is a named slot that a renderer hook registers on mount, and commands invoke by name:

```
# In composition root:
onMount: registerHandoff("openDiffView", () => setDiffFullView(true))

# In command:
run: invokeHandoff("openDiffView")
```

Handoff identifiers: "quit", "openDiffView", "refreshPullRequests", "preserveDiffLocation", "viewAuthored", "viewReview", "viewAssigned", "viewMentioned".

### 6.5 Derivation Cells

Derivation cells compute dynamic command state (titles, subtitles, disabled reasons) from other cells. These are consumed by the command palette for live-updating command metadata.

---

## 7. Error Taxonomy

```
RemoteError = transport-failure | parse-failure | decode-failure

transport-failure:
  command: text
  args: list of text
  detail: text
  cause: opaque

parse-failure:
  command: text
  args: list of text
  stdout: text
  cause: opaque

decode-failure:
  shape: text
  cause: opaque

CacheError:
  operation: text
  cause: opaque
```

**Rule:** Every error must be a named family with a tag. Never use raw/untyped errors or plain text in the error channel.

### Recovery Strategies

| Error | Recovery | Evidence |
|-------|----------|----------|
| transport-failure (timeout) | Retry with backoff (6 retries, 300ms base, factor 2) | is-timeout predicate |
| transport-failure (rate limit) | Do not retry | is-rate-limit predicate |
| CacheError (read) | Treat as miss | catch → absent |
| CacheError (write) | Ignore silently | error channel is "never" |
| decode-failure | Treat as miss + log | map-error |

---

## 8. Extension Points

### Adding a Domain Entity

1. Add literal value-domains with const arrays in the domain module.
2. Add entity definition with all attributes immutable.
3. Add pure helper functions.
4. If cached: add cached shape, encoder, decoder in CacheService.

### Adding a Data Source

1. Add operation to RemoteService contract.
2. Implement via the json/void helper pattern.
3. Add response shape in schemas module.
4. Add parser in normalizer module.
5. Create parameterized runtime cell in the UI atoms module.
6. Wire into composition root or surface component.

### Adding a Workspace Surface

1. Add surface name to the surface definition.
2. Add labels and tab ordering.
3. Create surface component.
4. Add surface-specific reactive cells.
5. Add commands.
6. Add input context.
7. Register context in the full keymap composition.

### Adding a Modal

1. Add variant to the modal tagged enumeration with state shape.
2. Add initial state constant.
3. Add to initial states record.
4. Create modal component.
5. Add reactive cells if needed.
6. Add keymap and register in full keymap.
7. Add command.
8. Add active flag to the input context and scope predicate in keymap composition.

### Adding a Command

1. Define using the command definition helper.
2. Export from the commands barrel.
3. If handoff needed: register handoff slot, handle in composition root.
4. Add derivation cells for dynamic state.

### Adding Cache Persistence

1. Add table in new migration.
2. Add read/write to CacheService contract.
3. Implement storage operations.
4. Wire read into data-loading cell (stale-while-revalidate).
5. Wire write into success path of mutation/fetch.
6. Add to pruning if entity grows unbounded.

---

## 9. Design Decisions

### D-001: Plain domain entities over validated shapes

**Decision:** Domain entities are plain immutable records, not runtime-validated shapes.

**Rationale:** Runtime validation is for serialization boundaries (cache, API responses). Internal domain entities change frequently; adding validation overhead slows iteration.

**Trade-off:** Less runtime validation of internal data. Mitigated by compile-time types and test coverage.

### D-002: Storage library over direct database access

**Decision:** Cache uses a typed storage library, never direct database calls.

**Rationale:** The storage library provides typed queries, migrations, transactions, and error handling. Direct access bypasses all of these.

**Trade-off:** Slightly more boilerplate for simple queries. Mitigated by helper functions.

### D-003: Commands as values, not closures

**Decision:** Commands are pure definition values, not functions closing over renderer state.

**Rationale:** Makes commands dispatchable from keymap, palette, and tests without re-threading props. Dynamic state goes through reactive cells.

**Trade-off:** Commands needing imperative renderer behavior require the handoff pattern.

### D-004: One active modal cell

**Decision:** All modal state lives in a single tagged enumeration cell.

**Rationale:** Prevents modal state from leaking into global cells. Makes modal transitions atomic and exhaustive.

**Trade-off:** Modal-specific state is nested inside the enumeration, requiring pattern matching on the tag.

### D-005: Selection persistence per view key

**Decision:** Selection indices are cached per view cache key.

**Rationale:** Returning to a previously visited view restores the last selection index.

**Trade-off:** Selection map grows unbounded. Mitigated by capping to recent views.

### D-006: detailLoaded as boolean, not separate entity

**Decision:** PullRequest.detailLoaded is a boolean, not a separate summary-vs-detail type split.

**Rationale:** Prevents type explosion. Summary and detail are the same entity with different hydration levels. Cache merge logic uses the flag to preserve detail fields.

**Trade-off:** Consumers must check detailLoaded before accessing detail fields.

### D-007: Official CLI as sole remote API client

**Decision:** All remote platform API calls go through the official CLI binary, never direct HTTP.

**Rationale:** The CLI handles authentication, rate limiting, and API versioning. Avoids reimplementing the authentication flow.

**Trade-off:** Requires the CLI to be installed and authenticated. Cannot work in environments without it.

### D-008: Single composition root

**Decision:** The composition root is a single large component (~2800 lines) rather than decomposed into smaller context-providing components.

**Rationale:** All state lives in reactive cells, so there is no prop drilling. Decomposition would add indirection without reducing coupling.

**Trade-off:** Large file. Mitigated by clear internal sectioning and handoff registration.

---

## 10. External API Architecture

### 10.1 Two Query Patterns

The service uses two distinct remote API patterns:

**Search API** — for user-scoped queues (authored, review, assigned, mentioned):
- Sends a search query string with qualifiers (kind, author, repository, sort)
- Returns paginated results with cursor-based pagination

**Repository Connection** — for repo-scoped items (faster, authoritative ordering):
- Queries the repository's connection directly
- Used when mode is "all" with a non-null repository

**Routing logic:** mode "all" with a repository uses the repository connection. Everything else uses search.

### 10.2 Query Catalog

| Query | Purpose |
|-------|---------|
| pullRequestSummarySearch | Search for PR summaries via search API |
| issueSearch | Search for issues via search API |
| repositoryPullRequests | Repo-scoped PRs via repository connection |
| pullRequestDetail | Full PR detail via repository.pullRequest |
| repositoryDetails | Repository metadata |

### 10.3 Direct API Endpoints

| Endpoint | Purpose |
|---------|---------|
| repos/{repo}/pulls/{number}/files | Diff patch (paginated, slurped) |
| repos/{repo}/pulls/{number}/comments | Review comments (paginated, slurped) |
| repos/{repo}/issues/{number}/comments | Issue comments (paginated, slurped) |
| repos/{repo}/issues/comments/{id} | Edit/delete issue comment |
| repos/{repo}/pulls/comments/{id} | Edit/delete review comment |
| repos/{repo}/pulls/{number}/comments/{id}/replies | Reply to review comment |

### 10.4 CLI Subcommands

| Command | Purpose |
|---------|---------|
| pr merge | Merge a PR |
| pr close | Close a PR |
| pr review | Submit review |
| pr ready | Toggle draft status |
| pr view | Merge info |
| repo view | Repository merge methods |
| issue close | Close an issue |
| issue edit | Issue label management |
| pr edit | PR label management |
| label list | List available labels |
| api user | Authenticated user |
| git remote | List git remotes (for repository detection) |
| git remote get-url | Get URL for a specific remote (for repository detection) |

### 10.5 Helper Pattern

Two convenience wrappers around the process runner:
- **json helper:** runs a CLI command, decodes output against a shape, wraps in a span for observability.
- **void helper:** runs a CLI command, discards output, wraps in a span.

### 10.6 Generic Search Page Fetcher

A single generic function parameterized by the response shape and parser. Accepts a query string, a shape, and a parser. Returns a page fetcher that assembles CLI arguments and decodes the response.

### 10.7 Pagination via Streaming

Auto-pagination uses a streaming paginator that fetches pages lazily. Interrupting the surrounding fiber stops mid-flight. The fetch limit config caps total items.

(impl: reference/reference-impl.md#query-catalog, reference/reference-impl.md#CLI-Invocations)

---

## 11. Cache / Data Merge Strategy

### 11.1 The Core Problem

Summary queries (list pages) omit detail fields: body, labels, additions, deletions, changedFiles, checks, checkStatus, checkSummary. When a fresh summary page arrives, it would overwrite cached detail data, causing check indicators to revert to blank on every page fetch.

### 11.2 Merge Rule

```
For each fresh item:
  1. Look up cached item by URL
  2. If cached item has detailLoaded=yes AND commit identifier matches:
     → preserve body, labels, additions, deletions, changedFiles,
       checkStatus, checkSummary, checks, detailLoaded from cache
  3. Otherwise: use fresh item as-is
```

**Key rules:**
- Only merge if the cached item has detailLoaded=yes
- Only merge if the commit identifier matches — stale details for old commits are discarded
- Merge preserves all detail-only fields

### 11.3 Queue Snapshot Model

The cache stores queue ordering as snapshots:

```
queue_snapshots:
  viewer        — username or "anonymous"
  view_key      — e.g., "pullRequest:authored:_", "issue:assigned:owner/name"
  view_json     — serialized view definition
  pr_keys_json  — ordered list of item keys ["owner/name#1", "owner/name#2", ...]
  fetched_at    — point in time
  end_cursor    — pagination cursor for load-more
  has_next_page — whether more pages exist
```

The view_key prefix ("pullRequest:" vs "issue:") discriminates between PR and issue queues.

### 11.4 Atomic Read-Merge-Write

When writing a queue, the service performs an atomic transaction:
1. Read existing items for each key in the new queue
2. Apply the merge rule to preserve detail fields
3. Upsert all items
4. Write the queue snapshot

### 11.5 Disabled Layer Pattern

For mock/development mode, a disabled implementation provides no-op operations where all reads return absent and all writes are no-ops.

### 11.6 Pruning

Pruning deletes rows older than 30 days, but preserves items still referenced by any queue snapshot. This prevents orphaned items from accumulating while keeping referenced data intact.

(impl: reference/reference-impl.md#SQL-Migrations, reference/reference-impl.md#Pruning)

---

## 12. Input / Keymap System

### 12.1 Keymap Library

The keymap system is a workspace package providing:
- `context<Ctx>()` — creates a keymap definition bound to a context shape
- `.scope(predicate)` — conditionally activates a keymap layer
- Binding objects: `{id, title, keys, run, when?}`

### 12.2 Application Context Shape

The full context is the union of all active flags and narrow contexts:

```
AppContext:
  # 16+ active flags
  closeModalActive, mergeModalActive, commentModalActive, ...
  diffFullView, detailFullView, filterMode, textInputActive, ...

  # 16+ narrow contexts (one per keymap layer)
  closeModal: CloseModalCtx
  mergeModal: MergeModalCtx
  diff: DiffViewCtx
  listNav: ListNavCtx
  ...

  # Always-on actions
  openCommandPalette: () → ()
  handleQuitOrClose: () → ()
```

### 12.3 Layer Composition

The full keymap composes 21 layers in priority order:

1. **Always-on** (2 bindings): command palette opener, quit/close
2. **Modal layers** (13 layers, first matching wins)
3. **Filter mode**
4. **Full-view layers** (3, gated: no modal active)
5. **List nav** (lowest priority, gated: in list mode)

### 12.4 Scoping Predicates

```
modalActive(context) = OR of all 13 modal flags
inListMode(context) = NOT modalActive AND NOT filterMode AND NOT diffFullView AND NOT detailFullView AND NOT commentsViewActive
```

### 12.5 Diff View Keymap (vim-style)

| Binding | Action |
|---------|--------|
| j/k | Single-step anchor movement |
| ctrl+u/ctrl+d | Half-page movement (preserves viewport row) |
| shift+j/shift+k | Jump 8 lines |
| g g / shift+g | First/last comment anchor |
| z z/z t/z b | Align center/top/bottom |
| h/l | Select LEFT/RIGHT side |
| v | Toggle comment range |
| shift+v | Toggle unified/split view |
| w | Toggle word wrap |
| n/p | Next/previous thread |
| [/] | Previous/next file |
| f | Open changed files list |
| shift+r | Open submit review |
| Count prefixes (15j) | Vim count prefix support (1-99 × {j,k,up,down}) |

### 12.6 Keymap Helper Generators

```
Operation: countedVerticalBindings
  in  : moveBy function (ctx, delta) → ()
  out : list of binding configs
  approach: generate 99 × {k, up, j, down} bindings
            key format: "1 5 j" for count=15, key=j
            each binding calls moveBy(ctx, ±count)

Operation: defaultVerticalKeys
  out : { up: ["k", "up", "ctrl+p", "ctrl+k"],
          down: ["j", "down", "ctrl+n", "ctrl+j"] }
  purpose: standard vertical navigation chords (vim + arrows + emacs + readline)

Operation: confirmModalBindings
  in  : { id, close, confirm: { title, run, enabled? }, cancelTitle?, cancelKeys? }
  out : list of binding configs
  approach: escape closes, return confirms (with optional enabled gate)

Operation: selectionModalBindings
  in  : confirmModalBindings options + { move, verticalKeys? }
  out : list of binding configs
  approach: confirm bindings + up/down navigation with customizable keys
```

### 12.7 Context Purity

Keymap context shapes are pure — they must not import from reactive cells or services. The imperative functions they declare are provided by the composition root via mount effects and callbacks.

(impl: reference/reference-impl.md#Keymap-Composition)

---

## 13. Non-Trivial Algorithms

### 13.1 Patch Splitting

```
Operation: splitPatchFiles
  in  : text (raw multi-file unified diff)
  out : list of DiffFilePatch
  approach: match "diff --git" markers, split at boundaries
  edge: empty patch → empty list; no markers → single file named "diff"
  
  PROPERTY: For all patches P, length(splitPatchFiles(P)) equals the count of
            "diff --git" markers in P (or 0 if empty, 1 if no markers).
```

### 13.2 Hunk Normalization

```
Operation: normalizeHunkLineCounts
  in  : text (patch with potentially incorrect hunk headers)
  out : text (patch with corrected hunk headers)
  approach: walk each hunk body, count context/deletion/addition lines,
            rewrite @@ headers with actual counts
  why: the remote platform sometimes returns incorrect line counts
  
  PROPERTY: For all patches P, every hunk in normalizeHunkLineCounts(P) has
            header counts that match the actual line counts in the hunk body.
```

### 13.3 Whitespace Minimization

```
Operation: minimizeWhitespacePatch
  in  : text (patch)
  out : text (patch with whitespace-only changes collapsed to context)

  approach:
    For each hunk:
      1. Collect contiguous blocks of deletions and additions
      2. Compare by stripping all whitespace
      3. Find longest common subsequence of whitespace-equivalent lines
      4. Matched pairs become context lines; unmatched remain changes
      5. If hunk becomes empty, drop it
    If file has no remaining hunks, drop the file

  complexity: O(D × A) where D = deletions, A = additions per block
  fallback: [DERIVED:domain] when (D+1)×(A+1) > 40,000 cells,
            fall back to linear greedy matching
  correctness: always re-normalize hunk line counts after minimization
  
  PROPERTY: For all patches P, lineCounts(normalize(minimizeWhitespace(P)))
            equals the actual body counts in the minimized patch.
  PROPERTY: For all patches P where all changes are whitespace-only,
            minimizeWhitespace(P) produces an empty patch or drops the file.
```
(impl: reference/reference-impl.md#Diff-Algorithm)

### 13.4 Stacked Diff Files

```
Operation: buildStackedDiffFiles
  in  : list of DiffFilePatch, renderMode, wrapMode, width
  out : list of StackedDiffFilePatch (with computed vertical offsets)

  approach: sequential offset accumulation
    file[0]: headerLine=0, diffStartLine=2
    separator (1 line)
    file[1]: headerLine=N+3, diffStartLine=N+5
    ...
  each file carries headerLine, diffStartLine, diffHeight for scroll calculation
  
  PROPERTY: For all file lists F, the headerLine of file[i+1] equals
            headerLine(file[i]) + 2 + diffHeight(file[i]) + separator.
```

### 13.5 Comment Anchoring

```
Operation: getDiffCommentAnchors
  in  : DiffFilePatch, renderMode, wrapMode, width
  out : list of DiffCommentAnchor

  unified mode: deletions above additions, sequential renderLine
  split mode: alignSplitSides() pads shorter side to keep visual alignment;
              deletions and additions at same position share renderLine

  word wrap: estimatedWrappedLineCount(text, width, wrapMode)
    = max(1, ceil(charWidth(text) / max(1, width)))  when wrapMode=word
    = 1                                                when wrapMode=none
  
  PROPERTY: For all diffs D in split mode, if deletions and additions share
            a position, they MUST have the same renderLine value.
  PROPERTY: For all diffs D, renderLine values are monotonically increasing.
```

### 13.6 Filter Scoring

```
Operation: filterScore
  in  : item, query text
  out : number | absent (null = no match, filtered out)

  approach:
    fields = [title, repository, number, author, labels, body]  (priority order)
    For each field: find indexOf(query) in lowercased field
    score = fieldIndex × 1000 + matchOffset
    Return minimum score across all matching fields

  sorting: ascending by score, then descending by time for ties
  
  PROPERTY: For all items I and queries Q, if Q matches I.title at position P1
            and I.body at position P2, then filterScore(I, Q) uses P1 (title wins).
  PROPERTY: For all items I and empty query "", filterScore(I, "") = 0 (no filtering).
```
(impl: reference/reference-impl.md#Filter-Algorithm)

---

## 14. Rendering / Framework Model

### 14.1 Primitive Model

The terminal renderer provides three core elements:

| Element | Purpose |
|---------|---------|
| Container | Layout container with flexbox-like properties (direction, padding, gap, width, height) |
| Scrollable | Scrollable container with scroll position and scroll events |
| Text | Text rendering with inline styled segments |

These are terminal elements, not HTML. They render to terminal cells.

### 14.2 Layout Model

Layout uses a subset of flexbox concepts:
- `flexDirection`: "row" | "column"
- `width`, `height`: fixed or percentage
- `flexGrow`: proportional growth
- `paddingLeft`, `gap`: spacing
- `backgroundColor`: per-element background

### 14.3 Split Pane

A two-pane layout computed in the composition root:
- Left pane: fixed width (list)
- Right pane: remaining width (detail)
- Layout math (pane widths, heights) is computed once and passed as props

### 14.4 Modal Frame

Modals render inside a bordered frame. **Critical convention:** when a modal contains a horizontal divider, the divider's row index must be threaded through the frame's junction-rows property so the side borders render junction characters at that row instead of plain vertical bars.

### 14.5 Syntax Highlighting

A syntax style maps token categories (keyword, string, comment, number, function, etc.) to foreground colors and text styles (bold, italic). Used for diff code highlighting.

### 14.6 Inline Segments

Inline markdown rendering (bold, italic, code spans, links) within text elements. Segments are arrays of {text, style} objects.

---

## 15. Composition Root Patterns

### 15.1 Single Composition Root

The composition root (~2800 lines) reads reactive cells, registers handoffs, and renders the full component tree. It is the single point where all layers converge.

### 15.2 Modal Setter Factory

A generic factory creates type-safe modal state setters:

```
setMergeModal = makeModalSetter("Merge", initialMergeModalState)
# Usage:
setMergeModal({repository, number, info, allowedMethods})
# Produces: set active modal to Merge with initial state merged with overrides
```

This ensures every modal open includes all required initial state fields.

### 15.3 Generation-Based Staleness Detection

Async operations use a generation counter to detect if a refresh happened while the operation was in flight:

```
generationRef = ref(0)

refresh = () => {
  generation = ++generationRef.current
  runAsync(fetchData()).then(data => {
    if generation ≠ generationRef.current: return  # stale, discard
    applyData(data)
  })
}
```

Used for: comment loading, diff loading, detail hydration.

### 15.4 Comment Mutations Hook

Encapsulates all comment CRUD operations in a single hook. Each mutation:
1. Applies optimistic update to the relevant cell
2. Calls the remote service
3. On success: replaces optimistic data with server response
4. On failure: reverts optimistic update, shows error notice

### 15.5 Auto-Load-More

Pagination triggers automatically based on two thresholds:

| Constant | Value | Meaning |
|----------|-------|---------|
| Selection threshold | [DERIVED:domain] 8 | Items from end of list |
| Scroll threshold | [DERIVED:domain] 3 | Rows from bottom of viewport |

When the selection index is within the selection threshold of the list end, or the scroll position is within the scroll threshold of the bottom, the next page is fetched.

### 15.6 Handoff Registration

The composition root registers imperative handlers for commands that need hook-local state:

```
onMount:
  registerHandoff("quit", () => destroy renderer)
  registerHandoff("openDiffView", () => setDiffFullView(true))
  registerHandoff("refreshPullRequests", () => refreshPullRequests())
  registerHandoff("preserveDiffLocation", () => preserveDiffLocation())
```

### 15.7 Keymap Context Provision

The composition root provides all keymap context values by reading reactive cells and creating callbacks:

```
keymapContext = {
  closeModalActive: isCloseModal(activeModal),
  mergeModalActive: isMergeModal(activeModal),
  diffFullView: diffFullViewValue,
  textInputActive: isTextInputActive(activeModal),
  closeModal: { handleConfirm: () => closePullRequest(), ... },
  diff: { moveAnchor: (delta) => moveDiffAnchor(delta), ... },
  listNav: { moveUp: () => moveSelection(-1), ... },
}
```

---

## 16. Architectural Fitness Function

> **Purpose:** A machine-checkable specification of the architecture's invariants.
> This is NOT a description — it is a set of rules that MUST be implemented as an
> automated check in the target repo and run on every commit. When a rule fails,
> the build fails. This is the wall that stops features from eroding the design.

### How to read this

Each rule has: an ID, a STATEMENT (language-neutral), a DETECTION recipe (how a
check proves it), and a SEVERITY. Stage 2 binds each rule to a concrete tool in
the target language (e.g. dependency-cruiser / go-arch-lint / cargo-deny /
import-linter / a custom test). Every rule must end up GREEN in CI.

### 16.1 Dependency-Direction Rules (the spine)

#### Layer → Path Mapping

Derived from §2. Stage 2 binds these to concrete module paths in the target language.

| Layer | Name | Path pattern (reference) |
|-------|------|-------------------------|
| 0 | External Systems | (external — not in repo) |
| 1 | Infrastructure | `services/CommandRunner`, `services/BrowserOpener`, `services/Clipboard`, `config`, `observability` |
| 2 | Services | `services/githubSchemas`, `services/githubNormalize`, `services/GitHubService`, `services/CacheService`, `services/MockGitHubService` |
| 3 | Runtime Composition | `services/runtime` |
| 4 | Domain Logic (pure) | `domain`, `item`, `pullRequestViews`, `issueViews`, `pullRequestLoad`, `issueLoad`, `pullRequestCache`, `workspacePreferences`, `workspaceSurfaces`, `errors`, `themeConfig`, `mergeActions` |
| 5 | State / Reactive Cells | `ui/*/atoms`, `workspace/atoms` |
| 6 | Commands | `commands/*` |
| 7 | Input / Keymap | `keymap/*`, `packages/keymap/*` |
| 8 | UI Components | `ui/*`, `surfaces/*`, `App`, `index` |

#### Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-DEP-001 | A module in layer N may import only from layers ≤ N. | Build the import graph; assert no edge points to a higher layer. | BLOCK |
| FIT-DEP-002 | No import cycles between modules. | Tarjan SCC on import graph; assert all SCCs size 1. | BLOCK |
| FIT-DEP-003 | Domain layer (Layer 4) imports nothing outside the domain layer. | Assert domain modules' out-edges ⊆ domain. | BLOCK |
| FIT-DEP-004 | The state/reactive layer (Layer 5) is the ONLY layer holding mutable state. | Grep/AST: mutable-state primitives appear only under the state layer path. | BLOCK |
| FIT-DEP-005 | UI/presentation (Layer 8) never imports the I/O/external-client layer (Layer 1) directly; it goes through the state layer. | Assert no edge from UI modules to infrastructure modules. | BLOCK |
| FIT-DEP-006 | Sibling services (Layer 2) do not import each other; they compose only at the composition root (Layer 3). | Assert no edge between two service modules; only runtime may import both. | BLOCK |
| FIT-DEP-007 | Commands (Layer 6) never import UI components (Layer 8). | Assert no edge from commands/* to ui/*.tsx or surfaces/*. | BLOCK |
| FIT-DEP-008 | Keymap contexts (Layer 7) are pure — no imports from state (Layer 5) or services (Layer 2). | Assert keymap/contexts/* imports only from keymap library and domain. | BLOCK |

### 16.2 Boundary & Error Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-ERR-001 | Every error crossing a module boundary is a typed error-family member, never a raw/string/untyped error. | AST check on public fn return/error types at boundaries. | BLOCK |
| FIT-ERR-002 | Write operations to the local store never surface errors to callers (their error-kind is `never`/infallible). | Assert store-write signatures carry no error in their public type. | BLOCK |
| FIT-BND-001 | Every public boundary operation has a complete, explicit type/contract (no inferred-any at boundaries). | Type/compile in max-strict mode; assert zero implicit-any/unknown leaks at boundaries. | BLOCK |
| FIT-BND-002 | Remote service read operations return domain entities; write operations return nothing (void/unit). | AST: read fns return domain types; write fns return void/unit. | WARN |
| FIT-BND-003 | All remote service operations are repository-scoped (first parameter is repository identifier). | AST: every RemoteService operation takes repository as first arg. | WARN |

### 16.3 State & Purity Rules

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-STATE-001 | No global mutable state exists outside the designated state system (Layer 5). | Grep for module-level mutable globals outside state layer. | BLOCK |
| FIT-STATE-002 | Domain & pure modules (Layer 4) perform no I/O (no network/disk/process/clock). | Assert pure modules don't import I/O capabilities. | BLOCK |
| FIT-STATE-003 | Per-argument/family caches are garbage-collectable (no permanent pinning). | Assert "keep-alive/leak" markers are absent on family caches. | WARN |
| FIT-STATE-004 | Reactive cell bodies use dependency-tracking reads, not non-tracking reads. | AST: inside runtime-bound cell bodies, only tracking reads are used. | BLOCK |
| FIT-STATE-005 | Commands never close over component-local state; all values come from reactive cells or handoffs. | AST: command run functions reference only cells, services, and handoff invocations. | WARN |

### 16.4 Taste / Complexity Budgets

Derived from the reference implementation's observed sizes. Stage 2 re-tunes
these for the target language's idioms.

| ID | Statement | Detection | Severity | Reference value |
|----|-----------|-----------|----------|-----------------|
| FIT-SIZE-001 | A module's public surface ≤ MAX_EXPORTS exports (except the composition root). | Count public exports per module. | WARN | 30 |
| FIT-SIZE-002 | A function ≤ MAX_FN_LINES lines (except generated/composition code). | Line count per function. | WARN | 100 |
| FIT-SIZE-003 | Cyclomatic complexity ≤ MAX_CC per function. | Complexity linter. | WARN | 20 |
| FIT-SIZE-004 | The composition root is the ONLY module allowed to exceed MAX_COMPOSITION_LINES. | Line count; whitelist only the composition root. | WARN | 3000 |
| FIT-IMM-001 | Data structures crossing boundaries are immutable/readonly by default. | AST: boundary types declared immutable. | WARN | — |
| FIT-IMM-002 | Domain entity attributes are all immutable. | AST: domain entity fields are readonly/const. | BLOCK | — |

> WARN rules are budgets, not blockers — but the Drift Audit (§17) tracks
> their trend. A rising WARN count is an early drift signal.

### 16.5 Conformance Linkage Rules (ties code to the spec)

| ID | Statement | Detection | Severity |
|----|-----------|-----------|----------|
| FIT-SPEC-001 | Every [ESSENTIAL] SPEC in behavior-spec.md has ≥1 passing test whose name encodes the SPEC/invariant ID. | Parse SPEC IDs; assert a matching test exists and passes. | BLOCK |
| FIT-SPEC-002 | Every domain invariant ID (D/S/U-###) maps to ≥1 SPEC. | Cross-reference domain.md ↔ behavior-spec.md. | BLOCK |
| FIT-SPEC-003 | No test references a retired SPEC; no SPEC is silently weakened. | Diff SPEC set vs test set across commits. | BLOCK |
| FIT-SPEC-004 | Every impl: pointer in technical-spec.md resolves to an existing anchor in reference/reference-impl.md. | Parse impl: pointers; assert anchor exists. | BLOCK |
| FIT-SPEC-005 | Every Source: citation in behavior-spec.md points to an existing file:line in the reference. | Parse Source: citations; assert file exists and line is in range. | WARN |

### 16.6 Output the check as code

Stage 2 MUST produce an executable `fitness` check (a test target or script) that
evaluates rules 16.1–16.5 and exits non-zero on any BLOCK failure. It runs in CI BEFORE
the feature test suite.

#### Binding Table (filled by Stage 2)

| Rule family | Target language mechanism |
|-------------|--------------------------|
| FIT-DEP-* | e.g. dependency-cruiser config / go-arch-lint yaml / cargo-deny / import-linter / archtest |
| FIT-ERR-* | e.g. compiler strict flags + a boundary-types test |
| FIT-STATE-* | e.g. AST linter + grep patterns + custom test |
| FIT-SIZE-* | e.g. complexity linter + line-count script |
| FIT-IMM-* | e.g. compiler readonly enforcement + AST check |
| FIT-SPEC-* | a generated test that scans behavior-spec.md and the test registry |

#### CI Integration

```
fitness check  →  format-check  →  typecheck/compile  →  lint  →  test suite
     ↑                                                        ↑
  runs FIRST                                          runs AFTER fitness
  BLOCK failure = build fails                         SPEC regressions = build fails
```

---

## 17. Cross-Cutting Invariants

These invariants appear across multiple layers. Each states an [ESSENTIAL] requirement
neutrally, then tags the reference implementation's mechanism as [INCIDENTAL:<paradigm>].

### 17.1 Staleness Guard

**[ESSENTIAL] Invariant**: Stale async results MUST NOT overwrite fresher state.

When an async operation completes, the system MUST verify the result is still current
before applying it. If a newer operation has started, the stale result is discarded.

**[INCIDENTAL:reactive-runtime] Reference mechanism**: Generation counter
```
generationRef = ref(0)

refresh = () => {
  generation = ++generationRef.current
  runAsync(fetchData()).then(data => {
    if generation ≠ generationRef.current: discard  # stale
    applyData(data)
  })
}
```

**Used in reference**: 
- `useDetailHydration` (PR detail fetches)
- `useLoadMore` (pagination)
- `useMergeFlow` (merge operations)
- `useRepositoryDetails` (repo metadata)

### 17.2 Optimistic Rollback

**[ESSENTIAL] Invariant**: UI responds immediately to user actions; if the server rejects
the action, the UI reverts to the pre-action state and shows an error.

Optimistic updates MUST be distinguishable from server-confirmed state so they can be
selectively reverted on failure.

**[INCIDENTAL] Reference mechanism**: Local ID prefix
```
1. Generate optimistic ID ("local:{timestamp}")
2. Insert optimistic entity into state
3. Fire server request
4. On success: swap optimistic ID → server ID
5. On failure: remove optimistic entity, show error
```

**Used in reference**:
- `useCommentMutations` (all comment CRUD)
- `useMergeFlow` (merge state updates)

### 17.3 Cache-Then-Network

**[ESSENTIAL] Invariant**: Provide instant response from cache, then update with fresh
data from network. Cache writes MUST happen only after successful network fetch.

This ensures users see immediate content while still getting fresh data, and prevents
cache corruption from failed network requests.

**[INCIDENTAL] Reference mechanism**: Double-write pattern
```
1. Read from cache (SQLite)
2. If cache hit + valid: apply immediately
3. Fetch from network
4. On success: apply network data, write to cache
5. On failure: keep cache data, show error
```

**Used in reference**:
- `useDetailHydration` (PR details)
- `useRepositoryDetails` (repo metadata)
- Queue load cache (PR/issue lists)

---

## 18. Layer Effect Requirements

Each layer declares the effects it REQUIRES and the effects it PROVIDES.

| Layer | Requires | Provides |
|-------|----------|----------|
| 0 (External) | — | Process, Network, Storage, Terminal |
| 1 (Infrastructure) | Process, Storage | CommandRunner, CacheClient |
| 2 (Services) | CommandRunner, CacheClient | GitHubService, CacheService |
| 3 (Runtime) | GitHubService, CacheService | Runtime (merged services) |
| 4 (Domain) | — | Pure functions (no effects) |
| 5 (State) | Runtime | Reactive cells, async data |
| 6 (Commands) | Reactive cells | Command dispatch |
| 7 (Keymap) | — | Pure context shapes |
| 8 (UI) | Command dispatch, Reactive cells | Rendered interface |

**Rule MDG-009**: A layer may only use effects from layers below it.
**Rule MDG-010**: Layer 4 (Domain) MUST be effect-free (pure).

---

## Changelog

### 2026-05-30 (v0.7.1-r5)
- Moved §19 Idiom Translation Table to reference/idiom-notes.md (violated Quarantine Rule by naming specific libraries).
- Added PROPERTY invariants to §13 algorithms.
- Retagged §17 as Cross-Cutting Invariants with [ESSENTIAL] requirements and [INCIDENTAL] mechanisms.

### 2024-05-30 (v0.7.1-r4)
- Added section 17: Cross-Cutting Patterns (generation guard, optimistic-rollback, cache-then-network).
- Added section 18: Layer Effect Requirements (MDG-009, MDG-010).
- Added section 19: Idiom Translation Table (10 concept→idiom mappings).

### 2024-05-30 (v0.7.1-r3)
- Rewritten in Contract Notation per Quarantine Rule.
- Zero library/framework proper nouns in normative text.
- All 15 sections preserved: layers, dependency rules, boundary contracts, state/reactivity, command system, error taxonomy, extension points, design decisions, external API architecture, cache merge strategy, keymap system, algorithms, rendering model, composition root patterns.
- Added portability tags ([DERIVED:domain], [DERIVED:platform]) to constants.
- Added impl: pointers to reference/reference-impl.md.
- Added section 16: Architectural Fitness Function (24 rules across 5 categories).

### 2024-05-29 (v0.7.1-r2)
- Added sections 10-15.

### 2024-05-27 (v0.7.1)
- Initial version.
# Behavior Specification

> **Version:** 0.7.1
> **Purpose:** Language-agnostic Given/When/Then conformance specs. The executable test
> contract and definition of done. Every [ESSENTIAL] invariant, workflow, and state
> transition from domain.md has a corresponding SPEC here.
> **Rule:** Each SPEC is testable without reading source code. NO language-specific material.

---

## Identity Rules

### SPEC-001 : PullRequest identity by (repository, number)

```
Tags: [ESSENTIAL]
Given two PullRequests with the same repository and number
  And different values for all other attributes
When  compared for identity
Then  they MUST be treated as the same entity
Maps-to: D-001
Source: src/domain.ts:135-160
```

### SPEC-002 : Issue identity by (repository, number)

```
Tags: [ESSENTIAL]
Given two Issues with the same repository and number
  And different values for all other attributes
When  compared for identity
Then  they MUST be treated as the same entity
Maps-to: D-001
Source: src/domain.ts:178-190
```

### SPEC-003 : Cache key format for items

```
Tags: [ESSENTIAL]
Given a PullRequest with repository "owner/name" and number 42
When  the item cache key is computed
Then  the result MUST be "owner/name#42"
Maps-to: D-010
Source: src/services/CacheService.ts:178
```

### SPEC-004 : Cache key format for views

```
Tags: [ESSENTIAL]
Given a QueueView with mode "authored" and no repository
When  the view cache key is computed
Then  the result MUST be "pullRequest:authored:_"
Maps-to: D-010
Source: src/pullRequestViews.ts:25, src/item.ts:104-107
```

### SPEC-005 : View cache key ignores text filter

```
Tags: [ESSENTIAL]
Given two queries that differ only in text filter
When  cache keys are computed for both
Then  they MUST produce the same cache key
Maps-to: D-010
Source: src/item.ts:104-107
```

---

## Detail Loaded Invariant

### SPEC-006 : detailLoaded reflects hydration state

```
Tags: [ESSENTIAL]
Given a PullRequest from a summary query
When  the item is inspected
Then  detailLoaded MUST be no
  And body, labels, checks, and line counts MUST be empty/default
Maps-to: D-002
Source: src/domain.ts:155
```

### SPEC-007 : detail query sets detailLoaded

```
Tags: [ESSENTIAL]
Given a PullRequest fetched via the detail query
When  the item is inspected
Then  detailLoaded MUST be yes
  And body, labels, checks, and line counts MUST be populated
Maps-to: D-002
Source: src/services/GitHubService.ts:231-254
```

---

## Comment Invariants

### SPEC-008 : General comment never carries file/line

```
Tags: [ESSENTIAL]
Given a Comment with tag "comment"
When  its attributes are inspected
Then  it MUST NOT have file, line, or side attributes
Maps-to: D-003
Source: src/domain.ts:121-129
```

### SPEC-009 : Review comment always carries file/line/side

```
Tags: [ESSENTIAL]
Given a Comment with tag "review-comment"
When  its attributes are inspected
Then  it MUST have file (text path), line (whole number), and side (LEFT or RIGHT)
Maps-to: D-003
Source: src/domain.ts:109-119
```

### SPEC-010 : Diff comment side values

```
Tags: [ESSENTIAL]
Given a review comment on a diff
When  the side is inspected
Then  it MUST be one of {LEFT, RIGHT}
  And LEFT corresponds to old/deleted content
  And RIGHT corresponds to new/added content
Maps-to: D-003
Source: src/domain.ts:49-50
```

---

## List Mode Invariants

### SPEC-011 : Review mode is PullRequest-only

```
Tags: [ESSENTIAL]
Given an ItemListInput with kind "issue"
When  mode is set to "review"
Then  the system MUST reject this as an illegal combination
Maps-to: D-006
Source: src/item.ts:23
```

### SPEC-012 : Mode "all" requires repository

```
Tags: [ESSENTIAL]
Given an ItemListInput with mode "all" and repository absent
When  the search qualifier is built
Then  the system MUST throw an IllegalInput error
  And the error MUST NOT reach the user
Maps-to: D-007
Source: src/item.ts:73-76
```

### SPEC-013 : Page size clamped to [1, 100]

```
Tags: [ESSENTIAL]
Given a page size of 200
When  the list operation is invoked
Then  the effective page size MUST be 100
Maps-to: D-008
Source: src/services/GitHubService.ts:190
```

### SPEC-014 : Page size minimum clamped to 1

```
Tags: [ESSENTIAL]
Given a page size of 0
When  the list operation is invoked
Then  the effective page size MUST be 1
Maps-to: D-008
Source: src/services/GitHubService.ts:190
```

---

## Cache Merge Invariants

### SPEC-015 : Cache merge preserves detail on matching commit

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=yes and headRefOid "abc123"
  And a fresh summary PullRequest with the same URL and headRefOid "abc123"
When  mergeCachedDetails is applied
Then  the result MUST have detailLoaded=yes
  And body, labels, checks, and line counts MUST come from the cached version
Maps-to: S-008
Source: src/pullRequestCache.ts:12-31
```

### SPEC-016 : Cache merge discards detail on different commit

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=yes and headRefOid "abc123"
  And a fresh summary PullRequest with the same URL but headRefOid "def456"
When  mergeCachedDetails is applied
Then  the result MUST have detailLoaded=no
  And all attributes MUST come from the fresh version
Maps-to: S-008
Source: src/pullRequestCache.ts:17
```

### SPEC-017 : Cache merge skips non-detail-loaded cached items

```
Tags: [ESSENTIAL]
Given a cached PullRequest with detailLoaded=no
  And a fresh summary PullRequest with the same URL
When  mergeCachedDetails is applied
Then  the result MUST be the fresh item unchanged
Maps-to: S-008
Source: src/pullRequestCache.ts:17
```

### SPEC-018 : Append page deduplicates by URL

```
Tags: [ESSENTIAL]
Given an existing list with PullRequest at URL "https://example.com/pr/1"
  And an incoming page containing the same URL plus a new URL
When  appendPullRequestPage is applied
Then  the result MUST contain the existing items plus only the new URL
  And the duplicate MUST NOT appear twice
Maps-to: D-001
Source: src/pullRequestCache.ts:36-40
```

---

## Pagination Invariants

### SPEC-019 : Pagination survives duplicate-only page

```
Tags: [ESSENTIAL]
Given a current load with endCursor "cursor-A" and hasNextPage=yes
  And a new page where all items are duplicates of existing items
  And the new page has endCursor "cursor-B" (different from "cursor-A")
  And the new page has hasNextPage=yes
When  nextLoadAfterPage is applied
Then  hasNextPage MUST remain yes
  And endCursor MUST be updated to "cursor-B"
Maps-to: D-008, workflow 3.10
Source: src/pullRequestCache.ts:56-65
```

### SPEC-020 : Pagination stops at fetch limit

```
Tags: [ESSENTIAL]
Given a current load with 499 items
  And a fetch limit of 500
  And a new page with 10 items (all new)
When  nextLoadAfterPage is applied
Then  hasNextPage MUST be no (509 > 500)
Maps-to: D-008
Source: src/pullRequestCache.ts:64
```

### SPEC-021 : Pagination stops when server says no more pages

```
Tags: [ESSENTIAL]
Given a new page with hasNextPage=no
When  nextLoadAfterPage is applied
Then  the result MUST have hasNextPage=no regardless of item count
Maps-to: workflow 3.10
Source: src/pullRequestCache.ts:64
```

---

## Retry Invariants

### SPEC-022 : Transient errors trigger retry with backoff

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a transient error
When  the retry policy is applied
Then  the system MUST retry up to 6 times
  And the backoff MUST start at 300ms with factor 2
  And the user MUST see "Retrying N/6" in the footer
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:105
```

### SPEC-023 : Rate limit errors do not retry

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a rate limit error
When  the retry policy is evaluated
Then  the system MUST NOT retry
  And the user MUST see "Rate limited" notice
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:32
```

### SPEC-024 : Command timeouts do not retry

```
Tags: [ESSENTIAL]
Given a network fetch that fails with a command timeout
When  the retry policy is evaluated
Then  the system MUST NOT retry
Maps-to: workflow 3.11
Source: src/ui/pullRequests/atoms.ts:32
```

---

## Cache Failure Invariants

### SPEC-025 : Cache read failure treated as miss

```
Tags: [ESSENTIAL]
Given the local database returns an error on read
When  the cache service is queried
Then  the result MUST be absent (null)
  And no error MUST propagate to the caller
Maps-to: S-002
Source: src/services/CacheService.ts:550-591
```

### SPEC-026 : Cache write failure is silent

```
Tags: [ESSENTIAL]
Given the local database returns an error on write
When  the cache service writes data
Then  the error MUST be silently ignored
  And the write operation's error channel MUST be "never"
Maps-to: S-002
Source: src/services/CacheService.ts:593-628
```

---

## Merge Action Invariants

### SPEC-027 : Merge dialog only shows allowed methods

```
Tags: [ESSENTIAL]
Given a repository that allows squash and rebase but not merge-commit
When  the merge dialog is opened
Then  the available methods MUST include squash and rebase
  And MUST NOT include merge-commit
Maps-to: MergeAction rules
Source: src/mergeActions.ts:111-119
```

### SPEC-028 : Admin merge only when viewer has permission

```
Tags: [ESSENTIAL]
Given a PullRequest with viewerCanMergeAsAdmin=no
When  available merge kinds are computed
Then  AdminMerge MUST NOT be in the available list
Maps-to: MergeAction rules
Source: src/mergeActions.ts:100
```

### SPEC-029 : Auto-merge unavailable when already enabled

```
Tags: [ESSENTIAL]
Given a PullRequest with autoMergeEnabled=yes
When  available merge kinds are computed
Then  AutoMerge MUST NOT be in the available list
  And DisableAuto MUST be in the available list
Maps-to: MergeAction rules
Source: src/mergeActions.ts:81,90
```

### SPEC-030 : Cleanly mergeable conditions

```
Tags: [ESSENTIAL]
Given a PullRequest with state=open, isDraft=no, mergeable=mergeable,
  reviewStatus=approved, checkStatus=passing
When  MergeNow availability is checked
Then  MergeNow MUST be available
Maps-to: MergeInfo rules
Source: src/mergeActions.ts:24-31
```

### SPEC-031 : Not cleanly mergeable when checks failing

```
Tags: [ESSENTIAL]
Given a PullRequest with state=open, isDraft=no, mergeable=mergeable,
  reviewStatus=approved, checkStatus=failing
When  MergeNow availability is checked
Then  MergeNow MUST NOT be available
Maps-to: MergeInfo rules
Source: src/mergeActions.ts:31
```

---

## Diff Invariants

### SPEC-032 : Whitespace minimization collapses whitespace-only changes

```
Tags: [ESSENTIAL]
Given a diff hunk where a deletion and addition differ only in whitespace
When  minimizeWhitespacePatch is applied with mode "ignore"
Then  the matched lines MUST become context lines (space prefix)
  And the hunk MUST NOT contain the whitespace-only change
Maps-to: DiffView rules
Source: src/ui/diff.ts:229-246
```

### SPEC-033 : Whitespace minimization drops empty hunks

```
Tags: [ESSENTIAL]
Given a diff hunk where ALL changes are whitespace-only
When  minimizeWhitespacePatch is applied
Then  the hunk MUST be dropped entirely
Maps-to: DiffView rules
Source: src/ui/diff.ts:277
```

### SPEC-034 : Whitespace minimization drops files with no remaining hunks

```
Tags: [ESSENTIAL]
Given a file where all hunks become empty after whitespace minimization
When  minimizeWhitespaceDiffFiles is applied
Then  the file MUST be removed from the diff view
Maps-to: DiffView rules
Source: src/ui/diff.ts:301-306
```

### SPEC-035 : Hunk line counts recalculated after minimization

```
Tags: [ESSENTIAL]
Given a patch that has been whitespace-minimized
When  the result is inspected
Then  all @@ hunk headers MUST have line counts matching actual content
Maps-to: DiffView rules
Source: src/ui/diff.ts:298
```

### SPEC-036 : LCS fallback for large hunks

```
Tags: [ESSENTIAL]
Given a hunk with 300 deletions and 200 additions
  And (300+1) × (200+1) = 60,501 > 40,000
When  whitespaceEquivalentMatches is computed
Then  the linear greedy fallback MUST be used instead of LCS
Maps-to: DiffView rules
Source: src/ui/diff.ts:196-198
```

### SPEC-037 : Split view aligns deletion and addition rows

```
Tags: [ESSENTIAL]
Given a diff with 2 deletions and 3 additions at the same position
  And render mode is "split"
When  getDiffCommentAnchors is computed
Then  rows 0 and 1 MUST have both a LEFT and RIGHT anchor
  And row 2 MUST have only a RIGHT anchor
  And the shorter side MUST be padded for visual alignment
Maps-to: DiffView rules
Source: src/ui/diff.ts:466-487
```

### SPEC-038 : Patch splitting by diff markers

```
Tags: [ESSENTIAL]
Given a multi-file patch with 3 "diff --git" markers
When  splitPatchFiles is applied
Then  the result MUST contain exactly 3 DiffFilePatch entries
  And each entry's name MUST be extracted from the diff header
Maps-to: DiffView rules
Source: src/ui/diff.ts:308-324
```

### SPEC-039 : Empty patch produces empty list

```
Tags: [ESSENTIAL]
Given an empty string as input
When  splitPatchFiles is applied
Then  the result MUST be an empty list
Maps-to: DiffView rules
Source: src/ui/diff.ts:310
```

---

## Filter Invariants

### SPEC-040 : Filter is client-side only

```
Tags: [ESSENTIAL]
Given a user typing in the filter input
When  the filter query changes
Then  NO network request MUST be triggered
  And results MUST be computed from the currently loaded items
Maps-to: U-004
Source: src/ui/filter/scoring.ts
```

### SPEC-041 : Filter scoring prioritizes title over body

```
Tags: [ESSENTIAL]
Given two issues: one with query matching the title, one with query matching the body
When  filterByScore is applied
Then  the title-matching issue MUST rank before the body-matching issue
Maps-to: workflow 3.5
Source: src/ui/filter/scoring.ts:26-45
```

### SPEC-042 : Filter returns all items for empty query

```
Tags: [ESSENTIAL]
Given an empty filter query
When  filterByScore is applied
Then  all items MUST be returned in their original order
Maps-to: workflow 3.5
Source: src/ui/filter/scoring.ts:47-62
```

---

## State Machine Invariants

### SPEC-043 : Only one modal active at a time

```
Tags: [ESSENTIAL]
Given the Merge modal is currently active
When  the Comment modal is opened
Then  the active modal MUST be Comment
  And the Merge modal state MUST be gone
Maps-to: State Machine 4.2
Source: src/ui/modals/types.ts:221-239
```

### SPEC-044 : Modal close returns to None

```
Tags: [ESSENTIAL]
Given any modal is currently active
When  the close action is invoked
Then  the active modal MUST be None
Maps-to: State Machine 4.2
Source: src/ui/modals/types.ts:239
```

### SPEC-045 : Surface switch resets transient state

```
Tags: [ESSENTIAL]
Given the user is on the pullRequests surface with diffFullView=yes
When  the user switches to the issues surface
Then  diffFullView MUST be no
  And detailFullView MUST be no
  And commentsViewActive MUST be no
Maps-to: workflow 3.4
Source: src/commands/builtins.ts:108-120
```

---

## Theme Invariants

### SPEC-046 : Fixed theme mode returns configured theme

```
Tags: [ESSENTIAL]
Given a ThemeConfig with mode "fixed" and theme "tokyo-night"
When  resolveThemeId is called with any appearance
Then  the result MUST be "tokyo-night"
Maps-to: Theme rules
Source: src/themeConfig.ts:46-47
```

### SPEC-047 : System theme mode follows appearance

```
Tags: [ESSENTIAL]
Given a ThemeConfig with mode "system", darkTheme "ghui", lightTheme "catppuccin-latte"
When  resolveThemeId is called with appearance "dark"
Then  the result MUST be "ghui"
When  resolveThemeId is called with appearance "light"
Then  the result MUST be "catppuccin-latte"
Maps-to: Theme rules
Source: src/themeConfig.ts:46-47
```

---

## Repository Input Invariants

### SPEC-048 : Accepts shorthand owner/name format

```
Tags: [ESSENTIAL]
Given user input "kitlangton/ghui"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:44-53
```

### SPEC-049 : Accepts full GitHub URL

```
Tags: [ESSENTIAL]
Given user input "https://github.com/kitlangton/ghui"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:46
```

### SPEC-050 : Rejects invalid input

```
Tags: [ESSENTIAL]
Given user input "not a repository"
When  parseRepositoryInput is applied
Then  the result MUST be absent (null)
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:49
```

### SPEC-051 : Strips .git suffix

```
Tags: [ESSENTIAL]
Given user input "kitlangton/ghui.git"
When  parseRepositoryInput is applied
Then  the result MUST be "kitlangton/ghui"
Maps-to: workflow 3.9
Source: src/pullRequestViews.ts:51
```

---

## Search Qualifier Invariants

### SPEC-052 : Search qualifier includes kind

```
Tags: [ESSENTIAL]
Given an ItemListInput with kind "pullRequest"
When  searchQualifier is built
Then  the result MUST contain "is:pr"
Maps-to: D-006
Source: src/item.ts:50,77
```

### SPEC-053 : Search qualifier includes sort order

```
Tags: [ESSENTIAL]
Given any valid ItemListInput
When  searchQualifier is built
Then  the result MUST contain "sort:updated-desc"
  And MUST contain "is:open"
  And MUST contain "archived:false"
Maps-to: workflow 3.1
Source: src/item.ts:81
```

### SPEC-054 : Authored mode qualifier

```
Tags: [ESSENTIAL]
Given an ItemListInput with mode "authored"
When  searchQualifier is built
Then  the result MUST contain "author:@me"
Maps-to: workflow 3.1
Source: src/item.ts:57
```

---

## Check Rollup Invariants

### SPEC-055 : Any failure produces failing rollup

```
Tags: [ESSENTIAL]
Given a list of checks where all have status "completed"
  And one has conclusion "failure"
  And all others have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "failing"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-056 : All success produces passing rollup

```
Tags: [ESSENTIAL]
Given a list of checks where all have status "completed"
  And all have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "passing"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-057 : In-progress produces pending rollup

```
Tags: [ESSENTIAL]
Given a list of checks where one has status "in_progress"
  And all completed checks have conclusion "success"
When  the rollup status is computed
Then  the result MUST be "pending"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:105-145
```

### SPEC-058 : No checks produces none rollup

```
Tags: [ESSENTIAL]
Given an empty list of checks
When  the rollup status is computed
Then  the result MUST be "none"
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:106-108
```

### SPEC-058a : Pending beats failing (priority order)

```
Tags: [ESSENTIAL]
Given a list of checks where one has status "in_progress"
  And another has status "completed" with conclusion "failure"
When  the rollup status is computed
Then  the result MUST be "pending" (not "failing")
  And pending takes priority over failing in the evaluation order
Maps-to: CheckRollup rules
Source: src/services/githubNormalize.ts:136-144
```

---

## Pruning Invariants

### SPEC-059 : Pruning retains items referenced by queue snapshots

```
Tags: [ESSENTIAL]
Given a PullRequest older than 30 days
  And a queue snapshot that references it
When  prune is executed
Then  the PullRequest MUST NOT be deleted
Maps-to: S-001
Source: src/services/CacheService.ts:509-526
```

### SPEC-060 : Pruning removes unreferenced old items

```
Tags: [ESSENTIAL]
Given a PullRequest older than 30 days
  And no queue snapshot references it
When  prune is executed
Then  the PullRequest MUST be deleted
Maps-to: S-001
Source: src/services/CacheService.ts:513-518
```

---

## Algorithm Property Invariants

These property-based SPECs verify algorithm correctness across all valid inputs. They are mandatory for every non-trivial algorithm and serve as the primary fidelity check during Stage 2 implementation.

### SPEC-069-P : Patch splitting preserves diff marker count

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant length(splitPatchFiles(P)) equals the count of "diff --git" markers in P
          (or 0 if P is empty, 1 if P contains no markers)
Maps-to: §13.1 Patch Splitting
Source: src/ui/diff.ts:splitPatchFiles
```

### SPEC-070-P : Hunk normalization produces accurate line counts

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant every hunk in normalizeHunkLineCounts(P) has header counts that match
          the actual line counts in the hunk body
Maps-to: §13.2 Hunk Normalization
Source: src/ui/diff.ts:normalizeHunkLineCounts
```

### SPEC-071-P : Whitespace minimization preserves line count integrity

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P
Invariant lineCounts(normalize(minimizeWhitespace(P))) equals the actual body counts
          in the minimized patch
Maps-to: §13.3 Whitespace Minimization
Source: src/ui/diff.ts:minimizeWhitespacePatch
```

### SPEC-072-P : Whitespace minimization eliminates whitespace-only changes

```
Tags: [ESSENTIAL] [PROPERTY]
For-all patches P where all changes are whitespace-only
Invariant minimizeWhitespace(P) produces an empty patch or drops the file
Maps-to: §13.3 Whitespace Minimization
Source: src/ui/diff.ts:minimizeWhitespacePatch
```

### SPEC-073-P : Stacked diff files maintain vertical offset consistency

```
Tags: [ESSENTIAL] [PROPERTY]
For-all file lists F
Invariant the headerLine of file[i+1] equals headerLine(file[i]) + 2 + diffHeight(file[i]) + separator
Maps-to: §13.4 Stacked Diff Files
Source: src/ui/diff.ts:buildStackedDiffFiles
```

### SPEC-074-P : Comment anchoring preserves render line monotonicity

```
Tags: [ESSENTIAL] [PROPERTY]
For-all diffs D
Invariant renderLine values in getDiffCommentAnchors(D) are monotonically increasing
Maps-to: §13.5 Comment Anchoring
Source: src/ui/diff.ts:getDiffCommentAnchors
```

### SPEC-075-P : Split mode comment anchoring aligns shared positions

```
Tags: [ESSENTIAL] [PROPERTY]
For-all diffs D in split mode
Invariant if deletions and additions share a position, they MUST have the same renderLine value
Maps-to: §13.5 Comment Anchoring
Source: src/ui/diff.ts:getDiffCommentAnchors
```

### SPEC-076-P : Filter scoring prioritizes higher-priority fields

```
Tags: [ESSENTIAL] [PROPERTY]
For-all items I and queries Q
Invariant if Q matches I.title at position P1 and I.body at position P2,
          then filterScore(I, Q) uses P1 (title wins)
Maps-to: §13.6 Filter Scoring
Source: src/ui/filter/scoring.ts:filterScore
```

### SPEC-077-P : Filter scoring handles empty queries

```
Tags: [ESSENTIAL] [PROPERTY]
For-all items I and empty query ""
Invariant filterScore(I, "") = 0 (no filtering)
Maps-to: §13.6 Filter Scoring
Source: src/ui/filter/scoring.ts:filterScore
```

---

## SPEC Dependency Notes

This section documents which SPECs logically imply others. This information is useful for understanding relationships, but **never drop a SPEC for being derivable**. Redundant SPECs are cheap; missing SPECs are catastrophic. Anything not covered by a SPEC will be silently dropped during Stage 2 implementation.

**Coverage bias**: Prefer MORE SPECs. The goal is maximal behavioral coverage, not minimal specification.

**Documented dependencies**:
- SPEC-014 (page size min) can be derived from SPEC-013 (page size max) + clamping logic
- SPEC-051 (strip .git) can be derived from SPEC-048 (shorthand) + regex

**Why keep derivable SPECs?**
1. They serve as explicit test cases during implementation
2. They catch edge cases that might be missed in the derivation
3. They provide regression protection if the base SPEC changes
4. They make the specification self-documenting

---

## Changelog

### 2026-05-30 (v0.7.1-r6)
- Added 9 property SPECs (SPEC-069-P through SPEC-077-P) for algorithm correctness verification
- Renamed "Minimization Analysis" to "SPEC Dependency Notes" with emphasis on coverage over minimality
- Total: 77 SPEC entries (68 Given/When/Then + 9 Property)

### 2024-05-30 (v0.7.1-r5)
- Added Minimization Analysis section identifying independent vs. derivable SPECs.

### 2024-05-30 (v0.7.1-r4)
- Added 8 SPEC entries: git remote detection (SPEC-061 to SPEC-064), command palette scoring (SPEC-065 to SPEC-066), view synchronization (SPEC-067 to SPEC-068).
- Total: 68 SPEC entries.

### 2024-05-29 (v0.7.1-r3)
- Initial version: 60 SPEC entries covering identity rules, detail-loaded invariant, comment invariants, list mode invariants, cache merge invariants, pagination invariants, retry invariants, cache failure invariants, merge action invariants, diff invariants, filter invariants, state machine invariants, theme invariants, repository input invariants, search qualifier invariants, check rollup invariants, pruning invariants.
- All SPECs are language-agnostic Given/When/Then format.
- All SPECs cite source file:line and map to domain.md invariant IDs.
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
# Reference Implementation — Quarantined Source-Language Material

> **Purpose:** Exact TypeScript signatures, queries, SQL, CLI strings, and code snippets.
> Cross-linked from blueprint docs via `impl:` anchors.
> **Rule:** This file may contain TypeScript, Effect-TS, OpenTUI, and Bun-specific material.

---

## Domain Types

### `src/domain.ts`

```typescript
export type LoadStatus = "loading" | "ready" | "error"

export const pullRequestStates = ["open", "closed", "merged"] as const
export type PullRequestState = (typeof pullRequestStates)[number]

export const pullRequestQueueModes = ["authored", "review", "assigned", "mentioned"] as const
export type PullRequestUserQueueMode = (typeof pullRequestQueueModes)[number]
export type PullRequestQueueMode = "repository" | PullRequestUserQueueMode

export const checkConclusions = ["success", "failure", "neutral", "skipped", "cancelled", "timed_out"] as const
export type CheckConclusion = (typeof checkConclusions)[number]

export const checkRunStatuses = ["completed", "in_progress", "queued", "pending"] as const
export type CheckRunStatus = (typeof checkRunStatuses)[number]

export const checkRollupStatuses = ["passing", "pending", "failing", "none"] as const
export type CheckRollupStatus = (typeof checkRollupStatuses)[number]

export const reviewStatuses = ["draft", "approved", "changes", "review", "none"] as const
export type ReviewStatus = (typeof reviewStatuses)[number]

export type Mergeable = "mergeable" | "conflicting" | "unknown"

export const DiffCommentSide = Schema.Literals(["LEFT", "RIGHT"])
export type DiffCommentSide = Schema.Schema.Type<typeof DiffCommentSide>

export const pullRequestMergeMethods = ["squash", "merge", "rebase"] as const
export type PullRequestMergeMethod = (typeof pullRequestMergeMethods)[number]

export const pullRequestMergeKinds = ["now", "auto", "admin", "disable-auto"] as const
export type PullRequestMergeKind = (typeof pullRequestMergeKinds)[number]

export type PullRequestMergeAction =
  | { readonly kind: "now" | "auto" | "admin"; readonly method: PullRequestMergeMethod }
  | { readonly kind: "disable-auto" }

export interface RepositoryMergeMethods {
  readonly squash: boolean; readonly merge: boolean; readonly rebase: boolean
}

export const pullRequestReviewEvents = ["COMMENT", "APPROVE", "REQUEST_CHANGES"] as const
export type PullRequestReviewEvent = (typeof pullRequestReviewEvents)[number]

export interface CheckItem {
  readonly name: string; readonly status: CheckRunStatus; readonly conclusion: CheckConclusion | null
}

export interface PullRequestLabel { readonly name: string; readonly color: string | null }

export interface CreatePullRequestCommentInput {
  readonly repository: string; readonly number: number; readonly commitId: string
  readonly path: string; readonly line: number; readonly side: DiffCommentSide
  readonly startLine?: number; readonly startSide?: DiffCommentSide; readonly body: string
}

export interface SubmitPullRequestReviewInput {
  readonly repository: string; readonly number: number
  readonly event: PullRequestReviewEvent; readonly body: string
}

export interface PullRequestReviewComment {
  readonly id: string; readonly path: string; readonly line: number; readonly side: DiffCommentSide
  readonly author: string; readonly body: string; readonly createdAt: Date | null
  readonly url: string | null; readonly inReplyTo: string | null
}

export type PullRequestComment =
  | { readonly _tag: "comment"; readonly id: string; readonly author: string; readonly body: string; readonly createdAt: Date | null; readonly url: string | null }
  | ({ readonly _tag: "review-comment" } & PullRequestReviewComment)

export interface PullRequestItem {
  readonly repository: string; readonly author: string; readonly headRefOid: string
  readonly headRefName: string; readonly baseRefName: string; readonly defaultBranchName: string
  readonly number: number; readonly title: string; readonly body: string
  readonly labels: readonly PullRequestLabel[]; readonly additions: number; readonly deletions: number
  readonly changedFiles: number; readonly state: PullRequestState; readonly reviewStatus: ReviewStatus
  readonly checkStatus: CheckRollupStatus; readonly checkSummary: string | null
  readonly checks: readonly CheckItem[]; readonly autoMergeEnabled: boolean
  readonly detailLoaded: boolean; readonly createdAt: Date; readonly updatedAt: Date
  readonly closedAt: Date | null; readonly url: string
}

export interface RepositoryDetails {
  readonly repository: string; readonly description: string | null; readonly url: string
  readonly stargazerCount: number; readonly forkCount: number; readonly openIssueCount: number
  readonly openPullRequestCount: number; readonly defaultBranch: string | null
  readonly pushedAt: Date | null; readonly isArchived: boolean; readonly isPrivate: boolean
}

export type IssueState = "open" | "closed"

export interface IssueItem {
  readonly repository: string; readonly number: number; readonly state: IssueState
  readonly title: string; readonly body: string; readonly author: string
  readonly labels: readonly PullRequestLabel[]; readonly commentCount: number
  readonly createdAt: Date; readonly updatedAt: Date; readonly url: string
}

export interface PullRequestMergeInfo {
  readonly repository: string; readonly number: number; readonly title: string
  readonly state: PullRequestState; readonly isDraft: boolean; readonly mergeable: Mergeable
  readonly reviewStatus: ReviewStatus; readonly checkStatus: CheckRollupStatus
  readonly checkSummary: string | null; readonly autoMergeEnabled: boolean
  readonly viewerCanMergeAsAdmin: boolean
}
```

### `src/item.ts`

```typescript
export type ItemKind = "pullRequest" | "issue"
export const itemListModes = ["all", "authored", "assigned", "mentioned", "review"] as const
export type ItemListMode = (typeof itemListModes)[number]
export type IssueListMode = Exclude<ItemListMode, "review">

export interface ItemListInput<K extends ItemKind = ItemKind> {
  readonly kind: K; readonly mode: ListModeFor<K>
  readonly repository: string | null; readonly cursor: string | null; readonly pageSize: number
}

export interface ItemPage<T> {
  readonly items: readonly T[]; readonly endCursor: string | null; readonly hasNextPage: boolean
}

export class IllegalQueryError extends Error { readonly _tag = "IllegalQueryError" }

export const searchQualifier = (input: ItemListInput): string => {
  if (input.mode === "all" && input.repository === null) {
    throw new IllegalQueryError(`mode "all" requires a repository`)
  }
  const parts: string[] = [kindQualifier(input.kind)]
  const peopleQualifier = modeQualifier(input.mode)
  if (peopleQualifier !== null) parts.push(peopleQualifier)
  if (input.repository !== null) parts.push(`repo:${input.repository}`)
  parts.push("is:open", "archived:false", "sort:updated-desc")
  return parts.join(" ")
}

export const itemQueryCacheKey = (kind: ItemKind, query: ItemQuery): string => {
  const repo = query.repository ?? "_"
  return `${kind}:${query.mode}:${repo}`
}
```

### `src/pullRequestCache.ts`

```typescript
export const mergeCachedDetails = (
  fresh: readonly PullRequestItem[], cached: readonly PullRequestItem[] | undefined
): readonly PullRequestItem[] => {
  if (!cached) return fresh
  const cachedByUrl = new Map(cached.map(pr => [pr.url, pr]))
  return fresh.map(pr => {
    const cachedPr = cachedByUrl.get(pr.url)
    if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
    return {
      ...pr, body: cachedPr.body, labels: cachedPr.labels,
      additions: cachedPr.additions, deletions: cachedPr.deletions,
      changedFiles: cachedPr.changedFiles, checkStatus: cachedPr.checkStatus,
      checkSummary: cachedPr.checkSummary, checks: cachedPr.checks, detailLoaded: true,
    }
  })
}

export const appendPullRequestPage = (
  existing: readonly PullRequestItem[], incoming: readonly PullRequestItem[]
): readonly PullRequestItem[] => {
  const seen = new Set(existing.map(pr => pr.url))
  const mergedIncoming = mergeCachedDetails(incoming, existing)
  return [...existing, ...mergedIncoming.filter(pr => !seen.has(pr.url))]
}

export const nextLoadAfterPage = (
  current: PullRequestLoad, page: ItemPage<PullRequestItem>,
  prFetchLimit: number, fetchedAt: Date = new Date()
): PullRequestLoad => {
  const data = appendPullRequestPage(current.data, page.items)
  const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
  return {
    ...current, data, fetchedAt, endCursor: page.endCursor,
    hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit,
  }
}
```

### `src/pullRequestViews.ts`

```typescript
export type PullRequestView =
  | { readonly _tag: "Repository"; readonly repository: string }
  | { readonly _tag: "Queue"; readonly mode: PullRequestUserQueueMode; readonly repository: string | null }

export const viewCacheKey = (view: PullRequestView) =>
  itemQueryCacheKey("pullRequest", viewToPullRequestQuery(view))

export const parseRepositoryInput = (input: string) => {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i)
  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/)
  const match = urlMatch ?? shorthandMatch
  if (!match) return null
  const owner = match[1]!, repo = match[2]!.replace(/\.git$/i, "")
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null
  return `${owner}/${repo}`
}
```

---

## Check Rollup Logic

### `src/services/githubNormalize.ts`

```typescript
export const getCheckInfoFromContexts = (contexts: readonly RawCheckContext[]): Pick<PullRequestItem, "checkStatus" | "checkSummary" | "checks"> => {
  if (contexts.length === 0) {
    return { checkStatus: "none", checkSummary: null, checks: [] }
  }

  let completed = 0
  let successful = 0
  let pending = false
  let failing = false
  const checks: CheckItem[] = []

  for (const check of contexts) {
    const name = check.__typename === "CheckRun" ? (check.name ?? "check") : (check.context ?? "check")
    const status = getContextStatus(check)
    const conclusion = getContextConclusion(check)

    checks.push({ name, status, conclusion })

    if (status === "completed") {
      completed += 1
    } else {
      pending = true
    }

    if (conclusion === "success" || conclusion === "neutral" || conclusion === "skipped") {
      successful += 1
    } else if (conclusion) {
      failing = true
    }
  }

  if (pending) {
    return { checkStatus: "pending", checkSummary: `checks ${completed}/${contexts.length}`, checks }
  }

  if (failing) {
    return { checkStatus: "failing", checkSummary: `checks ${successful}/${contexts.length}`, checks }
  }

  return { checkStatus: "passing", checkSummary: `checks ${successful}/${contexts.length}`, checks }
}
```

**Priority order:** `pending` > `failing` > `passing` > `none`. A single in-progress check makes the whole rollup "pending" even if other checks have already failed.

---

## Service Contracts

### `src/services/GitHubService.ts`

```typescript
export type GitHubError = CommandError | JsonParseError | Schema.SchemaError

export class GitHubService extends Context.Service<GitHubService, {
  readonly listPullRequestPage: (input: ItemListInput<"pullRequest">) => Effect.Effect<ItemPage<PullRequestItem>, GitHubError>
  readonly listIssuePage: (input: ItemListInput<"issue">) => Effect.Effect<ItemPage<IssueItem>, GitHubError>
  readonly listAllPullRequests: (input: Omit<ItemListInput<"pullRequest">, "cursor" | "pageSize">) => Effect.Effect<readonly PullRequestItem[], GitHubError>
  readonly listAllIssues: (input: Omit<ItemListInput<"issue">, "cursor" | "pageSize">) => Effect.Effect<readonly IssueItem[], GitHubError>
  readonly getPullRequestDetails: (repository: string, number: number) => Effect.Effect<PullRequestItem, GitHubError>
  readonly getRepositoryDetails: (repository: string) => Effect.Effect<RepositoryDetails, GitHubError>
  readonly getAuthenticatedUser: () => Effect.Effect<string, GitHubError>
  readonly getPullRequestDiff: (repository: string, number: number) => Effect.Effect<string, GitHubError>
  readonly listPullRequestReviewComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestReviewComment[], GitHubError>
  readonly listPullRequestComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestComment[], GitHubError>
  readonly listIssueComments: (repository: string, number: number) => Effect.Effect<readonly PullRequestComment[], GitHubError>
  readonly getPullRequestMergeInfo: (repository: string, number: number) => Effect.Effect<PullRequestMergeInfo, GitHubError>
  readonly getRepositoryMergeMethods: (repository: string) => Effect.Effect<RepositoryMergeMethods, GitHubError>
  readonly mergePullRequest: (repository: string, number: number, action: PullRequestMergeAction) => Effect.Effect<void, CommandError>
  readonly closePullRequest: (repository: string, number: number) => Effect.Effect<void, CommandError>
  readonly closeIssue: (repository: string, number: number) => Effect.Effect<void, CommandError>
  readonly createPullRequestComment: (input: CreatePullRequestCommentInput) => Effect.Effect<PullRequestReviewComment, GitHubError>
  readonly createPullRequestIssueComment: (repository: string, number: number, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly replyToReviewComment: (repository: string, number: number, inReplyTo: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly editPullRequestIssueComment: (repository: string, commentId: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly editReviewComment: (repository: string, commentId: string, body: string) => Effect.Effect<PullRequestComment, GitHubError>
  readonly deletePullRequestIssueComment: (repository: string, commentId: string) => Effect.Effect<void, CommandError>
  readonly deleteReviewComment: (repository: string, commentId: string) => Effect.Effect<void, CommandError>
  readonly submitPullRequestReview: (input: SubmitPullRequestReviewInput) => Effect.Effect<void, CommandError>
  readonly toggleDraftStatus: (repository: string, number: number, isDraft: boolean) => Effect.Effect<void, CommandError>
  readonly listRepoLabels: (repository: string) => Effect.Effect<readonly { readonly name: string; readonly color: string | null }[], GitHubError>
  readonly addPullRequestLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly removePullRequestLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly addIssueLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
  readonly removeIssueLabel: (repository: string, number: number, label: string) => Effect.Effect<void, CommandError>
}>()("ghui/GitHubService") {
  static readonly layerNoDeps = Layer.effect(GitHubService, Effect.gen(function* () { /* ... */ }))
  static readonly layer = GitHubService.layerNoDeps.pipe(Layer.provide(CommandRunner.layer))
}
```

### `src/services/CommandRunner.ts`

```typescript
export class CommandError extends Schema.TaggedErrorClass<CommandError>()("CommandError", {
  command: Schema.String, args: Schema.Array(Schema.String),
  detail: Schema.String, cause: Schema.Defect,
}) {}

export class JsonParseError extends Schema.TaggedErrorClass<JsonParseError>()("JsonParseError", {
  command: Schema.String, args: Schema.Array(Schema.String),
  stdout: Schema.String, cause: Schema.Defect,
}) {}

export class CommandRunner extends Context.Service<CommandRunner, {
  readonly run: (command: string, args: readonly string[], options?: RunOptions) => Effect.Effect<CommandResult, CommandError>
  readonly runSchema: <S extends Schema.Top>(schema: S, command: string, args: readonly string[]) => Effect.Effect<S["Type"], CommandError | JsonParseError | Schema.SchemaError, S["DecodingServices"]>
}>()("ghui/CommandRunner") {
  static readonly layer = Layer.effect(CommandRunner, Effect.gen(function* () { /* Bun.spawn */ }))
}
```

### `src/services/CacheService.ts`

```typescript
export class CacheError extends Schema.TaggedErrorClass<CacheError>()("CacheError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}

export const pullRequestCacheKey = ({ repository, number }: PullRequestCacheKey) => `${repository}#${number}`
export const issueCacheKey = ({ repository, number }: IssueCacheKey) => `${repository}#${number}`

export class CacheService extends Context.Service<CacheService, {
  readonly readQueue: (viewer: string, view: PullRequestView) => Effect.Effect<PullRequestLoad | null, CacheError>
  readonly writeQueue: (viewer: string, load: PullRequestLoad) => Effect.Effect<void, never>
  readonly readPullRequest: (key: PullRequestCacheKey) => Effect.Effect<PullRequestItem | null, CacheError>
  readonly upsertPullRequest: (pullRequest: PullRequestItem) => Effect.Effect<void, never>
  readonly readIssueQueue: (viewer: string, view: IssueView) => Effect.Effect<IssueLoad | null, CacheError>
  readonly writeIssueQueue: (viewer: string, load: IssueLoad) => Effect.Effect<void, never>
  readonly readIssue: (key: IssueCacheKey) => Effect.Effect<IssueItem | null, CacheError>
  readonly upsertIssue: (issue: IssueItem) => Effect.Effect<void, never>
  readonly readRepoRollup: (viewer: string) => Effect.Effect<readonly RepoRollupRow[], CacheError>
  readonly readRepositoryDetails: (repository: string) => Effect.Effect<RepositoryDetails | null, CacheError>
  readonly readRepositoryDetailsFetchedAt: (repository: string) => Effect.Effect<Date | null, CacheError>
  readonly writeRepositoryDetails: (details: RepositoryDetails) => Effect.Effect<void, never>
  readonly readWorkspacePreferences: (viewer: ViewerId) => Effect.Effect<WorkspacePreferences | null, CacheError>
  readonly writeWorkspacePreferences: (preferences: WorkspacePreferencesInput | WorkspacePreferences) => Effect.Effect<void, never>
  readonly prune: () => Effect.Effect<void, never>
}>()("ghui/CacheService") { /* ... */ }
```

---

## SQL Migrations

### `src/services/CacheService.ts` — `cacheMigrations`

```sql
-- 001_initial_cache_schema
CREATE TABLE IF NOT EXISTS pull_requests (
  pr_key TEXT PRIMARY KEY, repository TEXT NOT NULL, number INTEGER NOT NULL,
  url TEXT NOT NULL, head_ref_oid TEXT NOT NULL, state TEXT NOT NULL,
  detail_loaded INTEGER NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pull_requests_repository_number_idx ON pull_requests (repository, number);
CREATE TABLE IF NOT EXISTS queue_snapshots (
  viewer TEXT NOT NULL, view_key TEXT NOT NULL, view_json TEXT NOT NULL,
  pr_keys_json TEXT NOT NULL, fetched_at TEXT NOT NULL, end_cursor TEXT,
  has_next_page INTEGER NOT NULL, PRIMARY KEY (viewer, view_key)
);

-- 002_workspace_preferences
CREATE TABLE IF NOT EXISTS workspace_preferences (
  viewer TEXT PRIMARY KEY, preferences_json TEXT NOT NULL, updated_at TEXT NOT NULL
);

-- 003_unified_queue_view_key
DELETE FROM queue_snapshots WHERE view_key NOT LIKE 'pullRequest:%' AND view_key NOT LIKE 'issue:%';

-- 004_repository_details
CREATE TABLE IF NOT EXISTS repository_details (
  repository TEXT PRIMARY KEY, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);

-- 005_issues_table
CREATE TABLE IF NOT EXISTS issues (
  issue_key TEXT PRIMARY KEY, repository TEXT NOT NULL, number INTEGER NOT NULL,
  url TEXT NOT NULL, data_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS issues_repository_number_idx ON issues (repository, number);
```

### Pruning

```sql
-- 30-day cutoff
DELETE FROM queue_snapshots WHERE fetched_at < :cutoff;
DELETE FROM pull_requests WHERE updated_at < :cutoff
  AND pr_key NOT IN (
    SELECT value FROM queue_snapshots, json_each(queue_snapshots.pr_keys_json)
    WHERE view_key LIKE 'pullRequest:%'
  );
DELETE FROM issues WHERE updated_at < :cutoff
  AND issue_key NOT IN (
    SELECT value FROM queue_snapshots, json_each(queue_snapshots.pr_keys_json)
    WHERE view_key LIKE 'issue:%'
  );
```

### Pragmas

```sql
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA journal_size_limit = 16777216;
```

---

## GraphQL Queries

### `src/services/githubSchemas.ts`

```graphql
# pullRequestSummarySearchQuery
query PullRequests($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    nodes { ... on PullRequest {
      number title isDraft reviewDecision
      autoMergeRequest { enabledAt } state merged
      createdAt updatedAt closedAt url
      author { login } headRefOid headRefName baseRefName
      repository { nameWithOwner defaultBranchRef { name } }
    }}
    pageInfo { hasNextPage endCursor }
  }
}

# issueSearchQuery
query Issues($searchQuery: String!, $first: Int!, $after: String) {
  search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
    nodes { ... on Issue {
      number title body state createdAt updatedAt closedAt url
      author { login }
      repository { nameWithOwner defaultBranchRef { name } }
      labels(first: 20) { nodes { name color } }
      comments(first: 0) { totalCount }
    }}
    pageInfo { hasNextPage endCursor }
  }
}

# repositoryPullRequestsQuery
query RepositoryPullRequests($owner: String!, $name: String!, $first: Int!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: $first, after: $after,
                 orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { ...SUMMARY_FIELDS }
      pageInfo { hasNextPage endCursor }
    }
  }
}

# pullRequestDetailQuery
query PullRequest($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      ...SUMMARY_FIELDS
      body additions deletions changedFiles
      labels(first: 20) { nodes { name color } }
      statusCheckRollup { contexts(first: 100) { nodes {
        __typename
        ... on CheckRun { name status conclusion }
        ... on StatusContext { context state }
      }}}
    }
  }
}

# repositoryDetailsQuery
query RepositoryDetails($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    description url stargazerCount forkCount isArchived isPrivate pushedAt
    defaultBranchRef { name }
    openIssues: issues(states: OPEN) { totalCount }
    openPRs: pullRequests(states: OPEN) { totalCount }
  }
}
```

---

## CLI Invocations

### `src/services/GitHubService.ts` — `ghJson` / `ghVoid` patterns

```typescript
// GraphQL search
["api", "graphql", "-f", `query=${graphqlQuery}`, "-F", `searchQuery=${searchQualifier(input)}`, "-F", `first=${input.pageSize}`, ...(cursor ? ["-F", `after=${cursor}`] : [])]

// REST diff (paginated, slurped)
["api", "--paginate", "--slurp", `repos/${repository}/pulls/${number}/files`]

// REST comments (paginated, slurped)
["api", "--paginate", "--slurp", `repos/${repository}/pulls/${number}/comments`]
["api", "--paginate", "--slurp", `repos/${repository}/issues/${number}/comments`]

// Create comment (POST)
["api", "--method", "POST", `repos/${repository}/issues/${number}/comments`, "-f", `body=${body}`]

// Create review comment (POST)
["api", "--method", "POST", `repos/${repository}/pulls/${number}/comments`,
 "-f", `body=${body}`, "-f", `commit_id=${commitId}`, "-f", `path=${path}`,
 "-F", `line=${line}`, "-f", `side=${side}`]

// Reply to review comment
["api", "--method", "POST", `repos/${repository}/pulls/${number}/comments/${inReplyTo}/replies`, "-f", `body=${body}`]

// Edit issue comment
["api", "--method", "PATCH", `repos/${repository}/issues/comments/${commentId}`, "-f", `body=${body}`]

// Edit review comment
["api", "--method", "PATCH", `repos/${repository}/pulls/comments/${commentId}`, "-f", `body=${body}`]

// Delete comments
["api", "--method", "DELETE", `repos/${repository}/issues/comments/${commentId}`]
["api", "--method", "DELETE", `repos/${repository}/pulls/comments/${commentId}`]

// Merge
["pr", "merge", String(number), "--repo", repository, ...mergeActionCliArgs(action)]
// mergeActionCliArgs: now → [methodFlag, "--delete-branch"]
//                     auto → [methodFlag, "--auto", "--delete-branch"]
//                     admin → [methodFlag, "--admin", "--delete-branch"]
//                     disable-auto → ["--disable-auto"]

// Close
["pr", "close", String(number), "--repo", repository]
["issue", "close", String(number), "--repo", repository]

// Review
["pr", "review", String(number), "--repo", repository, REVIEW_EVENT_CLI_FLAG[event], "--body", body]
// REVIEW_EVENT_CLI_FLAG: COMMENT→"--comment", APPROVE→"--approve", REQUEST_CHANGES→"--request-changes"

// Draft toggle
["pr", "ready", String(number), "--repo", repository, ...(isDraft ? [] : ["--undo"])]

// Labels
["label", "list", "--repo", repository, "--json", "name,color", "--limit", "100"]
["pr", "edit", String(number), "--repo", repository, "--add-label", label]
["pr", "edit", String(number), "--repo", repository, "--remove-label", label]
["issue", "edit", String(number), "--repo", repository, "--add-label", label]
["issue", "edit", String(number), "--repo", repository, "--remove-label", label]

// Merge info
["pr", "view", String(number), "--repo", repository, "--json", "number,title,state,isDraft,mergeable,reviewDecision,autoMergeRequest,statusCheckRollup"]

// Admin merge info (GraphQL inline)
["api", "graphql", "-F", `owner=${owner}`, "-F", `name=${name}`, "-F", `number=${number}`,
 "-f", "query=query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { viewerCanMergeAsAdmin } } }"]

// Repository merge methods
["repo", "view", repository, "--json", "squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed"]

// Authenticated user
["api", "user"]  // → { login: string }
```

---

## Diff Algorithm

### `src/ui/diff.ts`

```typescript
export const DiffView = Schema.Literals(["unified", "split"])
export const DiffWrapMode = Schema.Literals(["none", "word"])
export const DiffWhitespaceMode = Schema.Literals(["ignore", "show"])
export const DiffCommentKind = Schema.Literals(["addition", "deletion", "context"])

const MAX_WHITESPACE_LCS_CELLS = 40_000

export const splitPatchFiles = (patch: string): readonly DiffFilePatch[] => {
  const trimmed = patch.trimEnd()
  if (trimmed.length === 0) return []
  const matches = [...trimmed.matchAll(/^diff --git .+$/gm)]
  if (matches.length === 0) return [{ name: "diff", filetype: undefined, patch: trimmed }]
  return matches.map((match, index) => {
    const start = match.index ?? 0
    const end = index + 1 < matches.length ? matches[index + 1]!.index ?? trimmed.length : trimmed.length
    const filePatch = normalizeHunkLineCounts(trimmed.slice(start, end).trimEnd())
    const name = patchFileName(filePatch)
    return { name, filetype: pathToFiletype(name), patch: filePatch }
  })
}

export const minimizeWhitespacePatch = (patch: string) => {
  // Per hunk: collect deletion/addition blocks, LCS on whitespace-stripped text
  // If (deletions+1)*(additions+1) > 40000 → linear fallback
  // Matched pairs become context lines; unmatched remain changes
  // Empty hunks dropped; files with no remaining hunks removed
  // Final: normalizeHunkLineCounts on result
}

export const buildStackedDiffFiles = (files, view, wrapMode, width): readonly StackedDiffFilePatch[] => {
  let offset = 0
  return files.map((file, index) => {
    const diffHeight = patchRenderableLineCount(file.patch, view, wrapMode, width)
    const separatorBefore = index === 0 ? 0 : 1
    const headerLine = offset + separatorBefore
    const stackedFile = { file, index, headerLine, diffStartLine: headerLine + 2, diffHeight }
    offset += separatorBefore + 2 + diffHeight
    return stackedFile
  })
}

export const getDiffCommentAnchors = (file, view, wrapMode, width): readonly DiffCommentAnchor[] => {
  // Walks hunk lines, tracking oldLine/newLine/renderLine/colorLine
  // Unified: deletions above additions, sequential renderLine
  // Split: alignSplitSides() pads shorter side, deletions+additions share renderLine
  // estimatedWrappedLineCount for word wrap
}

const estimatedWrappedLineCount = (text: string, width: number, wrapMode: DiffWrapMode) => {
  if (wrapMode === "none") return 1
  return Math.max(1, Math.ceil(Bun.stringWidth(text) / Math.max(1, width)))
}
```

---

## Filter Algorithm

### `src/ui/filter/scoring.ts`

```typescript
// Score = fieldIndex * 1000 + matchOffset. Lower ranks earlier.
// null = no match (filtered out).
export const issueFilterScore = (issue: IssueItem, query: string): number | null => {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) return 0
  const fields = [
    issue.title.toLowerCase(), issue.repository.toLowerCase(),
    String(issue.number), issue.author.toLowerCase(),
    issue.labels.map(l => l.name).join(" ").toLowerCase(),
    issue.body.toLowerCase(),
  ]
  const scores = fields.flatMap((field, index) => {
    const matchIndex = field.indexOf(normalized)
    return matchIndex >= 0 ? [index * 1000 + matchIndex] : []
  })
  return scores.length > 0 ? Math.min(...scores) : null
}

export const filterByScore = <Item>(items, query, scoreItem, getTime) => {
  // Sort by score ascending, then by time descending for ties
}
```

---

## Modal State Shapes

### `src/ui/modals/types.ts`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}
  Label: LabelModalState                    // { repository, query, selectedIndex, availableLabels, loading }
  Close: CloseModalState                    // { kind, repository, number, title, url, running, error }
  PullRequestState: PullRequestStateModalState  // { repository, number, title, url, isDraft, selectedIsDraft, running, error }
  Merge: MergeModalState                    // { repository, number, selectedIndex, loading, running, info, error, selectedMethod, allowedMethods, pendingConfirm }
  Comment: CommentModalState                // { body, cursor, error, target: CommentModalTarget }
  DeleteComment: DeleteCommentModalState    // { commentId, commentTag, author, preview, running, error }
  CommentThread: CommentThreadModalState    // { scrollOffset }
  ChangedFiles: ChangedFilesModalState      // { query, selectedIndex }
  Filter: FilterModalState                  // { surface, selectedIndex }
  SubmitReview: SubmitReviewModalState      // { repository, number, focus, selectedIndex, body, cursor, running, error }
  Theme: ThemeModalState                    // { query, filterMode, mode, tone, fixedTheme, darkTheme, lightTheme, initialThemeConfig }
  CommandPalette: CommandPaletteState       // { query, selectedIndex }
  OpenRepository: OpenRepositoryModalState  // { query, error }
}>
export const Modal = Data.taggedEnum<Modal>()
```

---

## Theme System

### `src/themeConfig.ts`

```typescript
export type ThemeMode = "fixed" | "system"
export type ThemeConfig =
  | { readonly mode: "fixed"; readonly theme: ThemeId }
  | { readonly mode: "system"; readonly darkTheme: ThemeId; readonly lightTheme: ThemeId }

export const defaultThemeConfig: ThemeConfig = { mode: "fixed", theme: "ghui" }

export const resolveThemeId = (config: ThemeConfig, appearance: ThemeTone): ThemeId =>
  config.mode === "fixed" ? config.theme : appearance === "dark" ? config.darkTheme : config.lightTheme
```

### `src/ui/colors.ts` — ThemeId (28 themes)

```typescript
export type ThemeId =
  | "system" | "ghui" | "tokyo-night" | "catppuccin" | "catppuccin-latte"
  | "rose-pine" | "rose-pine-dawn" | "gruvbox" | "gruvbox-light" | "nord"
  | "dracula" | "kanagawa" | "one-dark" | "one-light" | "monokai"
  | "solarized-dark" | "solarized-light" | "everforest" | "vesper" | "vague"
  | "ayu" | "ayu-mirage" | "ayu-light" | "github-dark-dimmed" | "palenight"
  | "opencode" | "cursor"

export type ThemeTone = "dark" | "light"
```

---

## Keymap Composition

### `src/keymap/all.ts`

```typescript
export interface AppCtx {
  readonly closeModalActive: boolean; readonly pullRequestStateModalActive: boolean
  readonly mergeModalActive: boolean; readonly commentThreadModalActive: boolean
  readonly changedFilesModalActive: boolean; readonly filterModalActive: boolean
  readonly submitReviewModalActive: boolean; readonly labelModalActive: boolean
  readonly themeModalActive: boolean; readonly openRepositoryModalActive: boolean
  readonly commentModalActive: boolean; readonly deleteCommentModalActive: boolean
  readonly commandPaletteActive: boolean; readonly filterMode: boolean
  readonly diffFullView: boolean; readonly detailFullView: boolean
  readonly commentsViewActive: boolean; readonly textInputActive: boolean
  // 16 narrow contexts + 2 always-on actions
  readonly openCommandPalette: () => void; readonly handleQuitOrClose: () => void
}

const modalActive = (a: AppCtx): boolean => /* OR of all 13 modal flags */
const inListMode = (a: AppCtx): boolean =>
  !modalActive(a) && !a.filterMode && !a.diffFullView && !a.detailFullView && !a.commentsViewActive

export const appKeymap = App(
  // Always-on (2)
  { id: "command.open", keys: ["ctrl+p", "meta+k"], run: (s) => s.openCommandPalette() },
  { id: "app.quit-or-close", keys: ["ctrl+c"], run: (s) => s.handleQuitOrClose() },
  // Modal layers (13)
  closeModalKeymap.scope((a) => a.closeModalActive && a.closeModal),
  // ... 12 more modal layers
  filterModeKeymap.scope((a) => a.filterMode && a.filterModeCtx),
  // Full-view layers (3, gated by !modalActive)
  diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff),
  detailViewKeymap.scope((a) => a.detailFullView && !modalActive(a) && a.detail),
  commentsViewKeymap.scope((a) => a.commentsViewActive && !modalActive(a) && a.commentsView),
  // List nav (1, lowest priority)
  listNavKeymap.scope((a) => inListMode(a) && a.listNav),
)
```

---

## Runtime Composition

### `src/services/runtime.ts`

```typescript
export const mockPrCount = parseOptionalPositiveInt(process.env.GHUI_MOCK_PR_COUNT, null)
export const pullRequestPageSize = Math.min(100, parseOptionalPositiveInt(process.env.GHUI_PR_PAGE_SIZE, config.prPageSize) ?? config.prPageSize)

const githubServiceLayer = mockPrCount !== null
  ? MockGitHubService.layer({ prCount: mockPrCount, /* ... */ })
  : GitHubService.layerNoDeps

const cacheServiceLayer = mockPrCount !== null
  ? CacheService.disabledLayer
  : CacheService.layerFromPath(config.cachePath)

export const githubRuntime = Atom.runtime(
  Layer.mergeAll(githubServiceLayer, cacheServiceLayer, Clipboard.layerNoDeps, BrowserOpener.layerNoDeps)
    .pipe(Layer.provide(CommandRunner.layer), Layer.provideMerge(Observability.layer))
)
```

---

## Config Constants

### `src/config.ts`

```typescript
export const config = {
  prFetchLimit: 500,        // env: GHUI_PR_FETCH_LIMIT
  prPageSize: 50,           // env: GHUI_PR_PAGE_SIZE, clamped to [1, 100]
  commandTimeoutMs: 15_000, // env: GHUI_COMMAND_TIMEOUT_MS
  cachePath: "~/.cache/ghui/cache.sqlite" | null,  // env: GHUI_CACHE_PATH, "off" to disable
}
```

### Other constants from source

| Constant | Value | Source |
|----------|-------|--------|
| `PR_FETCH_RETRIES` | 6 | `src/ui/pullRequests/atoms.ts:29` |
| `MAX_REPOSITORY_CACHE_ENTRIES` | 8 | `src/ui/pullRequests/atoms.ts:30` |
| `MAX_WHITESPACE_LCS_CELLS` | 40,000 | `src/ui/diff.ts:163` |
| `LOAD_MORE_SELECTION_THRESHOLD` | 8 | `src/App.tsx:238` |
| `LOAD_MORE_SCROLL_THRESHOLD` | 3 | `src/App.tsx:238` |
| Retry backoff base | 300ms, factor 2 | `src/ui/pullRequests/atoms.ts:105` |
| Prune retention | 30 days | `src/services/CacheService.ts:510` |
| SQLite busy_timeout | 5000ms | `src/services/CacheService.ts:365` |
| SQLite journal_size_limit | 16MB | `src/services/CacheService.ts:368` |
| `DETAIL_PREFETCH_BEHIND` | 1 | `src/ui/pullRequests/useDetailHydration.ts:10` |
| `DETAIL_PREFETCH_AHEAD` | 3 | `src/ui/pullRequests/useDetailHydration.ts:11` |
| `DETAIL_PREFETCH_CONCURRENCY` | 3 | `src/ui/pullRequests/useDetailHydration.ts:12` |
| `DETAIL_PREFETCH_DELAY_MS` | 120ms | `src/ui/pullRequests/useDetailHydration.ts:13` |
| `MAX_COUNT_PREFIX` | 99 | `src/keymap/helpers.ts:3` |
| Flash notice duration | 2500ms | `src/ui/notice/useFlashNotice.ts:5` |

---

## Startup & Repository Detection

### `src/gitRemotes.ts`

```typescript
const GITHUB_REMOTE_PATTERN = /^(?:https?:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

export const parseGitRemoteUrl = (url: string): string | null => {
  const match = url.trim().match(GITHUB_REMOTE_PATTERN)
  if (!match) return null
  const owner = match[1]!, repo = match[2]!
  if (!owner || !repo) return null
  return `${owner}/${repo}`
}

export const detectCurrentGitHubRepository = (): string | null => {
  const remotes = Bun.spawnSync({ cmd: ["git", "remote"], stdout: "pipe", stderr: "pipe" })
  if (remotes.exitCode !== 0) return null
  const names = remotes.stdout.toString().split("\n").map(n => n.trim()).filter(Boolean)
  // Priority: origin first, then upstream, then alphabetical
  const orderedNames = [...names].sort((a, b) =>
    a === "origin" ? -1 : b === "origin" ? 1 : a === "upstream" ? -1 : b === "upstream" ? 1 : 0
  )
  for (const name of orderedNames) {
    const url = Bun.spawnSync({ cmd: ["git", "remote", "get-url", name], stdout: "pipe", stderr: "pipe" })
    if (url.exitCode !== 0) continue
    const repository = parseGitRemoteUrl(url.stdout.toString())
    if (repository) return repository
  }
  return null
}
```

**Remote URL patterns accepted:**
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

### `src/standalone.ts`

```typescript
// CLI entry point for standalone binary
// Parses: --help/-h, --version/-v, upgrade (rejected), unknown (edit-distance suggestion)
// Falls through to import("./index.js") for TUI launch

const editDistance = (a: string, b: string) => {
  const distances = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) distances[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1, distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return distances[a.length]![b.length]!
}

// Known commands: ["help", "version"]
// Unknown command: suggests closest match if editDistance <= 2
// "upgrade" command: prints "Use your package manager to upgrade ghui"
```

---

## Theme Persistence

### `src/themeStore.ts`

```typescript
// Config file path resolution:
//   GHUI_CONFIG_DIR > XDG_CONFIG_HOME/ghui > ~/.config/ghui (Windows: APPDATA/ghui)
// File: config.json

export const configPath = () => join(configDirectory(), "config.json")

// Stored config JSON shape:
interface StoredConfig {
  readonly theme?: unknown           // ThemeId string
  readonly themeMode?: unknown       // "fixed" | "system"
  readonly darkTheme?: unknown       // ThemeId string
  readonly lightTheme?: unknown      // ThemeId string
  readonly diffWhitespaceMode?: unknown  // "ignore" | "show"
  readonly systemThemeAutoReload?: unknown  // boolean
}

// Load operations catch all errors and return defaults:
export const loadStoredThemeId: Effect.Effect<ThemeId>        // default: "ghui"
export const loadStoredThemeConfig: Effect.Effect<ThemeConfig> // default: normalizeThemeConfig({})
export const loadStoredDiffWhitespaceMode: Effect.Effect<DiffWhitespaceMode> // default: "ignore"
export const loadStoredSystemThemeAutoReload: Effect.Effect<boolean>        // default: false

// Save operations skip write if value unchanged:
export const saveStoredThemeId = (theme: ThemeId): Effect.Effect<void>
export const saveStoredThemeConfig = (themeConfig: ThemeConfig): Effect.Effect<void>
export const saveStoredDiffWhitespaceMode = (mode: DiffWhitespaceMode): Effect.Effect<void>
```

---

## Workspace Preference File

### `src/workspacePreferenceFile.ts`

```typescript
// JSON file for workspace-level preferences (favorites, recent repos)
// Viewer-scoped: read returns null if stored viewer ≠ current viewer

export const readWorkspacePreferencesFile = (path: string, viewer: ViewerId):
  Effect.Effect<WorkspacePreferences | null> =>
  // Reads JSON, decodes via Schema, returns null on any error or viewer mismatch

export const writeWorkspacePreferencesFile = (path: string, input: WorkspacePreferencesInput | WorkspacePreferences):
  Effect.Effect<void> =>
  // mkdir -p dirname, writes JSON with tab indentation, catches all errors silently
```

---

## System Appearance Detection

### `src/systemAppearance.ts`

```typescript
export type SystemAppearance = "dark" | "light"

// macOS: defaults read -g AppleInterfaceStyle → "Dark" = dark, else light
// Linux: gsettings get org.gnome.desktop.interface color-scheme
//        gsettings get org.gnome.desktop.interface gtk-theme
//        → parse output for "dark"/"light"/"default" keywords
// Fallback: "dark" on error or unknown platform

export const appearanceFromLinuxSetting = (value: string): SystemAppearance | null => {
  const normalized = value.trim().replaceAll("'", "").replaceAll('"', "").toLowerCase()
  if (normalized.includes("dark")) return "dark"
  if (normalized.includes("light") || normalized === "default") return "light"
  return null
}

export const detectSystemAppearance = async (): Promise<SystemAppearance> => {
  if (process.platform === "darwin") return await detectMacAppearance()
  if (process.platform === "linux") return await detectLinuxAppearance()
  return "dark"
}
```

---

## Command Palette Scoring

### `src/commands.ts`

```typescript
export type CommandScope = "Global" | "View" | "Pull request" | "Issue" | "Diff" | "Comments" | "Labels" | "Navigation" | "System"

// Scope ordering for sort:
const SCOPE_ORDER: readonly CommandScope[] = [
  "Global", "View", "Pull request", "Issue", "Diff", "Comments", "Labels", "Navigation", "System"
]

export interface AppCommand {
  readonly id: string; readonly title: string; readonly scope: CommandScope
  readonly run: () => void; readonly subtitle?: string; readonly shortcut?: string
  readonly keywords?: readonly string[]; readonly disabledReason?: string | null
}

// 6-tier scoring algorithm. Lower score = better match. null = filtered out.
const commandScore = (command: AppCommand, query: string): number | null => {
  // 0: title starts with query
  // 1: searchText (title+subtitle+scope+shortcut+keywords) starts with query
  // 2: title includes query
  // 3: searchText includes query
  // 4: title acronym starts with query (e.g. "op" matches "Open Repository")
  // 5: fuzzy character match on searchText (no spaces)
  // null: no match
}

// Sorting: enabled commands first, then by score, then by original index
export const filterCommands = (commands: readonly AppCommand[], query: string) =>
  commands.flatMap((cmd, i) => {
    const score = commandScore(cmd, query)
    return score === null ? [] : [{ command: cmd, index: i, score }]
  }).sort((a, b) => {
    const enabled = Number(commandEnabled(b.command)) - Number(commandEnabled(a.command))
    return enabled || a.score - b.score || a.index - b.index
  }).map(({ command }) => command)

// Active-scope sorting: commands matching the current screen's scope rank first
export const sortCommandsByActiveScope = (commands, activeScope: CommandScope | null) =>
  // activeScope match → 0, others → 1, then SCOPE_ORDER
```

---

## View Synchronization

### `src/viewSync.ts`

```typescript
// Projects a PullRequestView onto the matching IssueView.
// Total function — every PR view has a defined issue counterpart.
export const issueViewForPullRequestView = (view: PullRequestView): IssueView => {
  if (view._tag === "Repository") return { _tag: "Repository", repository: view.repository }
  if (view.repository === null) return { _tag: "Queue", mode: "authored", repository: null }
  return { _tag: "Repository", repository: view.repository }
}
```

**Projection rules:**

| PullRequestView | IssueView |
|-----------------|-----------|
| Repository(repo) | Repository(repo) |
| Queue(mode, null) | Queue("authored", null) |
| Queue(mode, repo) | Repository(repo) |

---

## Rate Limit Classification

### `src/services/githubRateLimit.ts`

```typescript
export type GitHubRateLimitKind = "graphql" | "rest" | "secondary"

export const classifyGitHubRateLimit = (detail: string): GitHubRateLimitKind | null => {
  const text = detail.toLowerCase()
  if (text.includes("secondary rate limit") || text.includes("abuse detection")) return "secondary"
  if (text.includes("graphql_rate_limit") || text.includes("graphql rate limit")) return "graphql"
  if (text.includes("api rate limit already exceeded")) return text.includes("graphql") ? "graphql" : "rest"
  if (text.includes("rate limit exceeded")) return text.includes("graphql") ? "graphql" : "rest"
  return null
}

export const isGitHubRateLimitError = (error: unknown): boolean =>
  classifyGitHubRateLimit(errorMessage(error)) !== null
```

---

## System Atoms

### `src/services/systemAtoms.ts`

```typescript
// Parameterized runtime atoms bridging command system to services
export const submitPullRequestReviewAtom = githubRuntime.fn<SubmitPullRequestReviewInput>()(
  (input) => GitHubService.use((github) => github.submitPullRequestReview(input))
)
export const copyToClipboardAtom = githubRuntime.fn<string>()(
  (text) => Clipboard.use((clipboard) => clipboard.copy(text))
)
export const openInBrowserAtom = githubRuntime.fn<PullRequestItem>()(
  (pr) => BrowserOpener.use((browser) => browser.openPullRequest(pr))
)
export const openUrlAtom = githubRuntime.fn<string>()(
  (url) => BrowserOpener.use((browser) => browser.openUrl(url))
)
```

---

## Keyboard Adapter

### `src/keyboard/opentuiAdapter.ts`

```typescript
// Maps opentui KeyEvent → @ghui/keymap ParsedStroke
// Key normalization: "enter" → "return", lowercase
// Modifier fold: option (alt on Linux/Windows) → meta
export const normalizeOpenTuiKey = (event: KeyEvent): ParsedStroke => ({
  key: normalizeKeyName(event.name),  // "enter" → "return"
  ctrl: event.ctrl, shift: event.shift,
  meta: event.meta || event.option,   // cross-platform alt fold
})

// Fan-out hook: single useKeyboard listener dispatches to multiple handlers
// Handlers return true to mark event as handled (prevents default)
export const useOpenTuiSubscribe = (): KeySubscribe => {
  const handlersRef = useRef<Set<(stroke: ParsedStroke) => boolean | void>>(new Set())
  useKeyboard((event) => {
    if (event.defaultPrevented) return
    const stroke = normalizeOpenTuiKey(event)
    let handled = false
    for (const handler of handlersRef.current) {
      if (handler(stroke)) handled = true
    }
    if (handled) event.preventDefault()
  })
  return (handler) => { handlersRef.current.add(handler); return () => handlersRef.current.delete(handler) }
}
```

---

## Keymap Helpers

### `src/keymap/helpers.ts`

```typescript
const MAX_COUNT_PREFIX = 99

// Generates 99 × {k, up, j, down} bindings for vim count prefix
// e.g. "1 5 j" moves down by 15
export const countedVerticalBindings = <C>(moveBy: (ctx: C, delta: number) => void):
  readonly CommandConfig<C>[] => {
  const out: CommandConfig<C>[] = []
  for (let count = 1; count <= MAX_COUNT_PREFIX; count++) {
    out.push({ keys: [countSequence(count, "k"), countSequence(count, "up")], run: (s) => moveBy(s, -count) })
    out.push({ keys: [countSequence(count, "j"), countSequence(count, "down")], run: (s) => moveBy(s, count) })
  }
  return out
}

// Default vertical navigation: vim (j/k) + arrows + emacs (ctrl+p/n) + readline (ctrl+k/j)
export const defaultVerticalKeys = {
  up: ["k", "up", "ctrl+p", "ctrl+k"] as const,
  down: ["j", "down", "ctrl+n", "ctrl+j"] as const,
}

// Two-button confirm modal: escape closes, return confirms
export const confirmModalBindings = <C>(options: ConfirmModalOptions<C>): readonly CommandConfig<C>[]

// List-picker modal: confirm + up/down navigation
export const selectionModalBindings = <C>(options: SelectionModalOptions<C>): readonly CommandConfig<C>[]
```

---

## Command Runtime Atom

### `src/commands/runtimeAtom.ts`

```typescript
// Bridge atom: App.tsx mirrors hook-local computed values into this atom
// on every render via useEffect. Command derivation atoms read from here.
export interface CommandRuntimeSnapshot {
  readonly readyDiffFileCount: number
  readonly diffFileIndex: number
  readonly selectedDiffCommentAnchorLabel: string | null
  readonly selectedDiffCommentThreadCount: number
  readonly hasDiffCommentThreads: boolean
  readonly diffRangeActive: boolean
  readonly hasSelectedComment: boolean
  readonly canEditSelectedComment: boolean
}

const initialSnapshot: CommandRuntimeSnapshot = {
  readyDiffFileCount: 0, diffFileIndex: 0,
  selectedDiffCommentAnchorLabel: null, selectedDiffCommentThreadCount: 0,
  hasDiffCommentThreads: false, diffRangeActive: false,
  hasSelectedComment: false, canEditSelectedComment: false,
}

export const commandRuntimeAtom = Atom.make<CommandRuntimeSnapshot>(initialSnapshot).pipe(Atom.keepAlive)
```

---

## Theme Palette Structure

### `src/ui/colors.ts`

```typescript
export interface ColorPalette {
  readonly background: string
  readonly modalBackground: string
  readonly text: string
  readonly muted: string
  readonly separator: string
  readonly accent: string
  readonly link: string
  readonly inlineCode: string
  readonly error: string
  readonly selectedBg: string
  readonly selectedText: string
  readonly count: string
  readonly status: {
    readonly draft: string; readonly approved: string; readonly changes: string
    readonly review: string; readonly none: string
    readonly passing: string; readonly pending: string; readonly failing: string
  }
  readonly repos: {
    readonly opencode: string; readonly "effect-smol": string
    readonly "opencode-console": string; readonly opencontrol: string; readonly default: string
  }
  readonly diff: {
    readonly addedBg: string; readonly removedBg: string; readonly contextBg: string
    readonly lineNumberBg: string; readonly addedLineNumberBg: string; readonly removedLineNumberBg: string
  }
}

// "ghui" theme (default) exact values:
const ghuiColors: ColorPalette = {
  background: "#111018", modalBackground: "#1a1a2e",
  text: "#ede7da", muted: "#9f9788", separator: "#6f685d",
  accent: "#f4a51c", link: "#7fb4ca", inlineCode: "#d7c5a1", error: "#f97316",
  selectedBg: "#1d2430", selectedText: "#f8fafc", count: "#d7c5a1",
  status: {
    draft: "#f59e0b", approved: "#7dd3a3", changes: "#f87171", review: "#93c5fd",
    none: "#9f9788", passing: "#7dd3a3", pending: "#f4a51c", failing: "#f87171",
  },
  repos: {
    opencode: "#60a5fa", "effect-smol": "#34d399", "opencode-console": "#f472b6",
    opencontrol: "#f59e0b", default: "#93c5fd",
  },
  diff: {
    addedBg: "#17351f", removedBg: "#3a1e22", contextBg: "transparent",
    lineNumberBg: "#151515", addedLineNumberBg: "#12301a", removedLineNumberBg: "#35171b",
  },
}

// "system" theme: derived from terminal ANSI palette via makeSystemColors()
// Uses grayscale ramp from terminal background, maps palette slots to status colors
// diffAlpha: 0.22 for dark backgrounds, 0.14 for light

// Color utilities:
export const mixHex = (base: string, overlay: string, amount: number) => /* RGB interpolation */
export const rowHoverBackground = () => mixHex(colors.modalBackground, colors.selectedBg, 0.38)
export const lineNumberTextColor = (bg: string, fg: string) => /* contrast-based mix */
```

---

## Essential Hook Contracts

### `src/ui/pullRequests/useDetailHydration.ts`

**Contract:** Background detail hydration pipeline for PR list.

```typescript
// Constants:
const DETAIL_PREFETCH_BEHIND = 1      // neighbours behind selection
const DETAIL_PREFETCH_AHEAD = 3       // neighbours ahead of selection
const DETAIL_PREFETCH_CONCURRENCY = 3 // max simultaneous prefetches
const DETAIL_PREFETCH_DELAY_MS = 120  // debounce before prefetch starts

// Protocol:
// 1. Selected PR: hydrate with notifyError=true (shows loading state + flash on error)
// 2. Neighbours: hydrate with notifyError=false (silent prefetch after debounce)
// 3. Cache-then-network: read SQLite first, apply if detailLoaded + matching SHA,
//    then fetch from network, apply server response, write back to SQLite
// 4. Generation guard: if refreshGenerationRef changes mid-flight, discard response
// 5. Force-refresh: when queueFetchedAt advances (list refreshed), re-fetch even if
//    detailLoaded is still true (checks may have changed without SHA change)
// 6. Concurrency cap: prefetch skipped if DETAIL_PREFETCH_CONCURRENCY already in flight
```

### `src/ui/pullRequests/useLoadMore.ts`

**Contract:** Pagination "load more" state machine.

```typescript
// Gating conditions (all must pass):
// 1. pullRequestLoad is non-null
// 2. hasMorePullRequests is true
// 3. Not already loading (isLoadingMorePullRequests is false)
// 4. pullRequestLoad.endCursor is non-null
// 5. config.prFetchLimit - data.length > 0

// Protocol:
// 1. Set loading flag keyed to current cache key
// 2. Fetch next page via listOpenPullRequestPageAtom
// 3. Generation guard: if refreshGenerationRef changed, discard
// 4. Apply nextLoadAfterPage (merge + dedup + cursor advance)
// 5. Update in-memory queue cache
// 6. Persist to SQLite via writeQueueCacheAtom
// 7. Clear loading flag only if key still matches (stale guard)
```

### `src/ui/comments/useCommentMutations.ts`

**Contract:** Comment CRUD lifecycle with optimistic-rollback.

```typescript
// Core protocol: submitOptimisticComment
// 1. Insert optimistic comment with local id ("local:{timestamp}")
// 2. Fire onOptimistic callback (update thread maps, issue commentCount)
// 3. Close modal, show "Posting..." notice
// 4. Fire server request
// 5. On success: swap optimistic id → server id, show success notice
// 6. On failure: remove optimistic comment, fire onRevert, show error notice

// canEditComment: comment must belong to viewer AND have server id (not "local:" prefix)

// findReviewThreadRootId: walk inReplyTo chain to find thread root
// (GitHub /replies endpoint rejects non-root ids with "parent comment not found")

// Mutation types: submitDiffComment, submitIssueComment, submitReplyComment,
//   submitEditComment, confirmDeleteComment
```

### `src/ui/merge/useMergeFlow.ts`

**Contract:** Merge workflow state machine.

```typescript
// Flow: open → load info+methods async → cycle method → choose kind → confirm → execute

// Two-stage confirm invariant:
// If PR is draft AND kind is not method-agnostic (e.g. MergeNow):
//   First Enter → enter pendingConfirm mode (shows "Mark as ready and merge?")
//   Second Enter → execute with markReady=true (toggles draft, then merges)
//   Escape → exit pendingConfirm (back to kind selection, NOT close modal)
// If PR is not draft OR kind is method-agnostic:
//   Enter → execute immediately

// Optimistic updates:
// - markReady: set reviewStatus from "draft" to "none"
// - autoMerge: set autoMergeEnabled to optimistic value
// - merge now: mark PR as "merged" (removes from open list)

// Rollback on failure:
// - If markReady was applied: full refresh (can't undo draft toggle safely)
// - Otherwise: restore previous PR state from snapshot
```

### `src/ui/useTextInputDispatcher.ts`

**Contract:** Text input routing with strict precedence.

```typescript
// Precedence order (first match wins):
// 1. commandPaletteActive → singleLineInput editing
// 2. openRepositoryModalActive → singleLineInput editing
// 3. (no modal, no full-view) → numeric tabs (1/2/3 switch surface)
// 4. themeModalActive + filterMode → singleLineInput editing
// 5. commentModalActive → (handled by comment editor, passthrough)
// 6. submitReviewModalActive + focus="body" → insertText
// 7. changedFilesModalActive → singleLineInput editing
// 8. labelModalActive → singleLineInput editing
// 9. filterMode → singleLineInput editing
```

---

## UI Display Logic

### `src/ui/pullRequests.ts`

```typescript
// Row display computation:
export const pullRequestRowDisplay = (pr: PullRequestItem, selected: boolean): PullRequestRowDisplay => {
  // indicatorFg: merged→passing, closed→muted, autoMerge→accent, else reviewStatus color
  // rowFg: selected→selectedText, final→muted, else text
  // numberFg: selected→accent, final→muted, else count
  // checkFg: merged→passing, closed→muted, unhydrated→muted, else checkStatus color
  // checkText: unhydrated→"·" (dot), else CHECK_ICON[checkStatus]
  //   CHECK_ICON: passing→"✓", failing→"×", pending→"◐", none→"−"
  //   REVIEW_ICON: draft→"◌", approved→"✓", changes→"!", review→"◐", none→"⌥"
}

// Review icons: merged→"✓", closed→"×", autoMerge→"↻", else REVIEW_ICON[status]

// Label color: use label.color if valid hex, else hash-based HSL fallback
export const labelColor = (label: PullRequestLabel): string
export const labelTextColor = (color: string): string  // luminance > 0.6 → dark text

// groupBy: group items by key, sort by orderedKeys then alphabetical
export const groupBy = <T>(items: readonly T[], getKey: (item: T) => string, orderedKeys?: readonly string[])
```

### `src/ui/inlineSegments.ts`

```typescript
// Single-pass tokenizer for rich inline text in comments
// Regex alternation order (first match wins):
// 1. `code spans` → inlineCode color
// 2. [label](url) → link color + underline
// 3. **bold** → recursive tokenize with bold=true
// 4. https://bare-urls → link color + underline (strips trailing punctuation)
// 5. #NNN → count color (+ underline if issueReferenceRepository provided)

const INLINE_TOKEN = /(`(?:\\.|[^`])+`)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+(?:\*(?!\*)[^*\n]*)*)\*\*|(https?:\/\/[^\s<>()[\]"'`]+)|(#\d+)/g

// URL position tracking for click handling:
export const collectUrlPositions = (lines): readonly UrlPosition[]
export const findUrlAt = (positions, lineIndex, col): string | null

// Issue reference URLs use internal scheme: ghui://issue-ref/{repository}/{number}
```

### `src/ui/singleLineInput.ts`

```typescript
export interface SingleLineInputKey {
  readonly name: string; readonly sequence: string; readonly ctrl?: boolean; readonly meta?: boolean
}

// Editing operations:
// ctrl+u → clear all
// ctrl+w → delete last word (regex: /\s*\S+\s*$/)
// backspace → remove last character
// printable char → append
// ctrl/meta/empty sequence → null (not a text input key)

export const editSingleLineInput = (value: string, key: SingleLineInputKey): string | null
export const isSingleLineInputKey = (key: SingleLineInputKey): boolean
```

### `src/ui/diff/comments.ts`

```typescript
// Thread grouping: comments grouped by diffKey + path + side + line
export const diffCommentThreadMapKey = (diffKey: string, location: Pick<PullRequestReviewComment, "path" | "side" | "line">): string
  // Format: "{diffKey}:{path}:{side}:{line}"

export const groupDiffCommentThreads = (pr: PullRequestItem, comments: readonly PullRequestReviewComment[]):
  Record<string, PullRequestReviewComment[]>

// Range selection: two anchors on same path+side form a range
export const diffCommentRangeSelection = (start, end): DiffCommentRangeSelection | null
  // Returns null if different path or side; normalizes so start.line <= end.line

export const diffCommentRangeContains = (range, anchor): boolean
  // Same target + line within [start.line, end.line]

export const isLocalDiffComment = (comment) => comment.id.startsWith("local:")
```

---

## UI Primitives

### `src/ui/primitives.tsx`

```typescript
// Text fitting:
export const fitCell = (text: string, width: number, align?: "left" | "right"): string
  // Truncates with "…" if too long, pads with spaces
export const trimCell = (text: string, width: number): string
export const centerCell = (text: string, width: number): string

// Core components:
export const PlainLine = ({ text, fg?, bold? })  // Single-line text
export const TextLine = ({ children, fg?, bg?, width?, onMouse*? })  // Styled text line
export const MatchedCell = ({ text, width, query, align?, matchIndexes? })  // Search highlight
export const Divider = ({ width, junctionAt?, junctionChar?, junctions? })  // Horizontal rule
  // Supports junction characters at specific positions for modal borders
export const SeparatorColumn = ({ height, junctionRows?, junctions? })  // Vertical border
  // Renders "│" by default, "├" at junction rows

// Modal layout:
export const standardModalDims = (modalWidth, modalHeight, hasMiddleRow?): StandardModalDims
  // innerWidth = max(16, width - 2)
  // contentWidth = max(14, innerWidth - 2)
  // bodyHeight = max(1, height - fixedRows) where fixedRows = 7 or 9
```

### `src/ui/paneLayout.tsx`

```typescript
// Two-pane layout: fixed-width left + separator + remaining-width right
export const SplitPane = ({ height, leftWidth, rightWidth, left, right, junctionRows?, junctions? }) =>
  // <box flexDirection="row">
  //   <box width={leftWidth} height={height}>{left}</box>
  //   <SeparatorColumn height={height} junctionRows={...} />
  //   <box width={rightWidth} height={height}>{right}</box>
  // </box>

export const paneContentWidth = (width: number, inset?: number): number
  // max(1, width - inset * 2)

export const PaneInsetLine = ({ width, inset?, children })  // Inset text line
export const PaneDivider = ({ width })  // Full-width divider
```

### `src/ui/listSelection/SelectableRow.tsx`

```typescript
// Row background: selected → selectedBg, hovered → mix(modalBg, selectedBg, 0.38), else none
export const SelectableRow = ({ width, height?, selected, hovered, onSelect, onHoverChange, children }) =>
  // children is a function receiving rowBg: (rowBg: string | undefined) => ReactNode

// Hover state hook: keyed by string | number
export const useHoverState = <K extends string | number>() => {
  // Returns { isHovered: (key) => boolean, onHoverChange: (key) => (next: boolean) => void }
}
```

---

## Hook Composition and Lifecycle

### Hook Dependency Graph

```
App.tsx (composition root)
├── useDetailHydration
│   ├── reads: pullRequestsAtom, selectedIndex
│   ├── writes: queueLoadCacheAtom
│   └── calls: readCachedPullRequestAtom, writeCachedPullRequestAtom
├── useLoadMore
│   ├── reads: pullRequestLoadAtom, hasMorePullRequestsAtom
│   ├── writes: queueLoadCacheAtom
│   └── calls: listOpenPullRequestPageAtom, writeQueueCacheAtom
├── useCommentMutations
│   ├── reads: selectedPullRequest, selectedDiffCommentAnchor
│   ├── writes: pullRequestCommentsAtom, diffCommentThreadsAtom
│   └── calls: createPullRequestCommentAtom, replyToReviewCommentAtom, ...
├── useMergeFlow
│   ├── reads: selectedPullRequest, mergeModalAtom
│   ├── writes: mergeModalAtom, pullRequestsAtom (optimistic)
│   └── calls: getPullRequestMergeInfoAtom, mergePullRequestAtom, ...
└── useTextInputDispatcher
    ├── reads: all modal active flags
    └── writes: modal query/body atoms
```

### Lifecycle Order

1. **Mount**: All hooks initialize state
2. **Render**: Hooks read atoms, compute derived state
3. **Effect**: Hooks fire async operations (detail hydration, prefetch)
4. **User Input**: Keymap dispatches to commands, which update atoms
5. **Re-render**: Atoms notify subscribers, hooks re-read
6. **Unmount**: Hooks clean up (clear timeouts, cancel fetches)

### Hook Interaction Rules

**Rule HOOK-001**: Hooks MUST NOT call each other directly. Communicate via atoms.
**Rule HOOK-002**: Hooks MUST clean up async operations on unmount.
**Rule HOOK-003**: Hooks MUST use generation guard for async operations.

### Hook Implementation Signatures

```typescript
// useDetailHydration
export const useDetailHydration = (input: {
  selectedPullRequest: PullRequestItem | null
  pullRequests: readonly PullRequestItem[]
  refreshGenerationRef: MutableRefObject<number>
}): {
  detailHydrationState: Record<string, DetailHydrationState>
  resetHydration: () => void
}

// useLoadMore
export const useLoadMore = (input: {
  activeView: PullRequestView
  currentQueueCacheKey: string
  refreshGenerationRef: MutableRefObject<number>
}): {
  loadMorePullRequests: () => void
  isLoadingMorePullRequests: boolean
  resetLoadingMore: () => void
}

// useCommentMutations
export const useCommentMutations = (input: {
  selectedPullRequest: PullRequestItem | null
  selectedDiffCommentAnchor: DiffCommentAnchor | null
  commentModal: CommentModalState
  setCommentModal: (next: CommentModalState) => void
}): {
  submitComment: () => void
  deleteComment: (id: string) => void
}

// useMergeFlow
export const useMergeFlow = (input: {
  selectedPullRequest: PullRequestItem | null
  mergeModal: MergeModalState
  setMergeModal: (next: MergeModalState) => void
}): {
  openMergeModal: () => void
  confirmMerge: () => void
  cancelMerge: () => void
}

// useTextInputDispatcher
export const useTextInputDispatcher = (input: {
  commandPaletteActive: boolean
  openRepositoryModalActive: boolean
  // ... all modal flags
}): void
```

### `src/gitRemotes.ts`

```typescript
const GITHUB_REMOTE_PATTERN = /^(?:https?:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

export const parseGitRemoteUrl = (url: string): string | null => {
  const match = url.trim().match(GITHUB_REMOTE_PATTERN)
  if (!match) return null
  const owner = match[1]!, repo = match[2]!
  if (!owner || !repo) return null
  return `${owner}/${repo}`
}

export const detectCurrentGitHubRepository = (): string | null => {
  const remotes = Bun.spawnSync({ cmd: ["git", "remote"], stdout: "pipe", stderr: "pipe" })
  if (remotes.exitCode !== 0) return null
  const names = remotes.stdout.toString().split("\n").map(n => n.trim()).filter(Boolean)
  // Priority: origin first, then upstream, then alphabetical
  const orderedNames = [...names].sort((a, b) =>
    a === "origin" ? -1 : b === "origin" ? 1 : a === "upstream" ? -1 : b === "upstream" ? 1 : 0
  )
  for (const name of orderedNames) {
    const url = Bun.spawnSync({ cmd: ["git", "remote", "get-url", name], stdout: "pipe", stderr: "pipe" })
    if (url.exitCode !== 0) continue
    const repository = parseGitRemoteUrl(url.stdout.toString())
    if (repository) return repository
  }
  return null
}
```

**Remote URL patterns accepted:**
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `git@github.com:owner/repo.git`

### `src/standalone.ts`

```typescript
// CLI entry point for standalone binary
// Parses: --help/-h, --version/-v, upgrade (rejected), unknown (edit-distance suggestion)
// Falls through to import("./index.js") for TUI launch

const editDistance = (a: string, b: string) => {
  const distances = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) distances[0]![j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1, distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return distances[a.length]![b.length]!
}

// Known commands: ["help", "version"]
// Unknown command: suggests closest match if editDistance <= 2
// "upgrade" command: prints "Use your package manager to upgrade ghui"
```

# Idiom Notes — How the Reference Solved Things

> **Purpose:** Exact bootstrap configuration and idiomatic patterns from the reference implementation.
> **Rule:** This file contains TypeScript/Effect-TS/OpenTUI/Bun-specific material quarantined from the blueprint.

---

## Exact Dependencies

```json
{
  "dependencies": {
    "@effect/atom-react": "4.0.0-beta.59",
    "@effect/sql-sqlite-bun": "4.0.0-beta.59",
    "@opentui/core": "0.2.1",
    "@opentui/react": "0.2.1",
    "effect": "4.0.0-beta.59",
    "react": "19.2.5",
    "scheduler": "0.27.0"
  },
  "devDependencies": {
    "@effect/language-service": "0.85.1",
    "@types/bun": "1.3.12",
    "@types/react": "19.2.14",
    "oxfmt": "0.47.0",
    "oxlint": "1.62.0",
    "typescript": "6.0.2"
  }
}
```

Workspace package: `packages/keymap/` — `@ghui/keymap` (keymap composition library).

---

## Exact Compiler Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleDetection": "force",
    "lib": ["ES2022"],
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["bun"],
    "plugins": [{ "name": "@effect/language-service" }]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "dev/**/*.ts", "dev/**/*.tsx"]
}
```

---

## Exact Linter Configuration

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "require-yield": "off",
    "no-underscore-dangle": "off"
  }
}
```

---

## Exact Formatter Configuration

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 180,
  "useTabs": true,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "objectWrap": "preserve",
  "sortImports": false,
  "sortPackageJson": false,
  "ignorePatterns": ["node_modules/**", "dist/**", "coverage/**"]
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.tsx",
    "test": "bun test test",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint --tsconfig tsconfig.json src/ test/",
    "format": "oxfmt src/ test/ dev/",
    "format:check": "oxfmt --check src/ test/ dev/"
  }
}
```

**Critical rules:**
- Never run `npx oxlint .` directly — always use `bun run lint`.
- Never run `npx tsc --noEmit` directly — always use `bun run typecheck`.
- Never run `npx oxfmt .` directly — always use `bun run format`.
- Import extensions must use `.js` even for `.ts` files (NodeNext resolution).
- `verbatimModuleSyntax: true` means `import type { X }` is required for type-only imports.

---

## How the Reference Solved Key Problems

### Service Boundary: `Context.Service` + `Layer.effect`

Every service is a class extending `Context.Service` with a static `layer` factory:

```typescript
export class MyService extends Context.Service<MyService, {
  readonly doThing: (input: Input) => Effect.Effect<Output, MyError>
}>()("ghui/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    const dep = yield* OtherService
    const doThing = Effect.fn("MyService.doThing")(function* (input) { /* ... */ })
    return MyService.of({ doThing })
  }))
}
```

Services compose at `runtime.ts` via `Layer.mergeAll` + `Layer.provide`.

### Error Model: `Schema.TaggedErrorClass`

```typescript
export class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}
```

Every error has a `_tag` field for pattern matching. Never raw `Error` or `string` in error channel.

### Reactive State: `Atom` + `runtime.atom`

```typescript
// Static atom (global UI state)
export const activeViewAtom = Atom.make<PullRequestView>(initial).pipe(Atom.keepAlive)

// Async data atom (reactive to dependencies via `get` parameter)
export const pullRequestsAtom = githubRuntime
  .atom(Effect.fnUntraced(function* (get) {
    const view = get(activeViewAtom)  // registers reactive dependency
    const github = yield* GitHubService
    // ...
  }))
  .pipe(Atom.keepAlive)

// Function atom (one per argument, self-cleaning via WeakRef)
export const readCachedDetailsAtom = githubRuntime.fn<string>()(
  (repo) => CacheService.use((cache) => cache.readRepositoryDetails(repo))
)
// NEVER .pipe(Atom.keepAlive) on function atoms — prevents GC
```

**Critical:** `get(atom)` inside a `runtime.atom` body registers a reactive dependency. `Atom.get(atom)` is a non-tracking read — wrong for reactivity.

### Tagged Unions: `Data.TaggedEnum`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}; Merge: MergeModalState; Comment: CommentModalState; // ...
}>
export const Modal = Data.taggedEnum<Modal>()

// Construct: Modal.Merge({ ...initialMergeModalState, repository, number })
// Match: Modal.$is("Merge")(activeModal) — type guard
// Match: Modal.$match(activeModal, { Merge: (s) => ..., None: () => ... })
```

### Command System: Values, Not Closures

```typescript
// Commands are pure values dispatchable from keymap, palette, or tests
defineCommand({
  id: "view.authored",
  title: "Authored",
  scope: "View",
  subtitle: queueViewSubtitleAtom("authored"),  // atom for dynamic title
  disabledReason: queueViewAlreadyActiveReasonAtom("authored"),
  run: Effect.sync(() => invokeHandoff("viewAuthored")),
})

// Handoff bridge: Effect commands → imperative React hooks
// In App.tsx: useEffect(() => registerHandoff("viewAuthored", () => { ... }), [])
// In command: invokeHandoff("viewAuthored")
```

### Cache Merge: `mergeCachedDetails`

Summary queries omit detail fields. When a fresh summary page arrives, `mergeCachedDetails` preserves detail fields from cached items at the same URL + same commit SHA:

```typescript
if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
return { ...pr, body: cachedPr.body, labels: cachedPr.labels, /* ... */ detailLoaded: true }
```

### Atomic Read-Merge-Write

```typescript
const load = yield* Atom.modify(queueLoadCacheAtom, (cache) => {
  const existing = cache[cacheKey]
  const data = mergeCachedDetails(page.items, existing?.data)
  const next = { view, data, fetchedAt: new Date(), endCursor: page.endCursor, hasNextPage: ... }
  return [next, { ...cache, [cacheKey]: next }]  // [returnValue, newAtomValue]
})
```

### Generation-Based Staleness

```typescript
const refreshGenerationRef = useRef(0)
const refresh = () => {
  const generation = ++refreshGenerationRef.current
  Effect.runPromise(fetchData()).then(data => {
    if (generation !== refreshGenerationRef.current) return  // stale
    applyData(data)
  })
}
```

### Retry with Exponential Backoff

```typescript
yield* github.listPullRequestPage(input).pipe(
  Effect.retry({
    times: 6,
    schedule: Schedule.exponential("300 millis", 2),
    while: shouldRetryPullRequestFetch,  // excludes rate limits + timeouts
  }),
)
```

### Pagination: Cursor Advances = Keep Going

```typescript
const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit
// Duplicate-only pages do NOT kill pagination — cursor still advances
```

### OpenTUI Rendering

Elements are terminal primitives, not HTML:
- `<box>` — container with flexbox-like layout (`flexDirection`, `paddingLeft`, `gap`, `width`, `height`)
- `<scrollbox>` — scrollable container with `scrollTop`
- `<text>` — text with inline segments

`ModalFrame` requires `junctionRows` for dividers to connect to side borders with `├`/`┤`.

### Keymap: `@ghui/keymap` Package

```typescript
import { context } from "@ghui/keymap"

const Diff = context<DiffViewCtx>()
export const diffViewKeymap = Diff(
  { id: "diff.up", keys: ["up", "k"], run: (s) => s.moveAnchor(-1) },
  { id: "diff.down", keys: ["down", "j"], run: (s) => s.moveAnchor(1) },
  // ...
)

// In all.ts:
diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff)
```

Context types are pure TypeScript interfaces — no atom/service imports. Values provided by `App.tsx`.

### Test Framework: `bun:test`

```typescript
import { describe, expect, test } from "bun:test"

// Pure domain tests — no Effect runtime needed
describe("viewCacheKey", () => {
  test("repository view key", () => {
    expect(viewCacheKey({ _tag: "Repository", repository: "owner/name" })).toBe("pullRequest:all:owner/name")
  })
})

// Service tests — real SQLite with temp files
const tempDbPath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "test-"))
  return join(dir, "test.sqlite")
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GHUI_PR_FETCH_LIMIT` | 500 | Max total items to fetch across all pages |
| `GHUI_PR_PAGE_SIZE` | 50 | Items per page (clamped to [1, 100]) |
| `GHUI_COMMAND_TIMEOUT_MS` | 15000 | Timeout for `gh` CLI commands |
| `GHUI_CACHE_PATH` | `~/.cache/ghui/cache.sqlite` | SQLite cache path; "off" to disable |
| `GHUI_MOCK_PR_COUNT` | (none) | Enable mock mode with N fake PRs |
| `GHUI_MOCK_REPOSITORY` | (none) | Mock repository name |
| `GHUI_MOCK_USERNAME` | (none) | Mock authenticated user |
| `XDG_CACHE_HOME` | `~/.cache` | XDG cache directory |

---

# Idiom Notes — How the Reference Solved Things

> **Purpose:** Exact bootstrap configuration and idiomatic patterns from the reference implementation.
> **Rule:** This file contains TypeScript/Effect-TS/OpenTUI/Bun-specific material quarantined from the blueprint.

---

## Exact Dependencies

```json
{
  "dependencies": {
    "@effect/atom-react": "4.0.0-beta.59",
    "@effect/sql-sqlite-bun": "4.0.0-beta.59",
    "@opentui/core": "0.2.1",
    "@opentui/react": "0.2.1",
    "effect": "4.0.0-beta.59",
    "react": "19.2.5",
    "scheduler": "0.27.0"
  },
  "devDependencies": {
    "@effect/language-service": "0.85.1",
    "@types/bun": "1.3.12",
    "@types/react": "19.2.14",
    "oxfmt": "0.47.0",
    "oxlint": "1.62.0",
    "typescript": "6.0.2"
  }
}
```

Workspace package: `packages/keymap/` — `@ghui/keymap` (keymap composition library).

---

## Exact Compiler Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleDetection": "force",
    "lib": ["ES2022"],
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["bun"],
    "plugins": [{ "name": "@effect/language-service" }]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "dev/**/*.ts", "dev/**/*.tsx"]
}
```

---

## Exact Linter Configuration

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "require-yield": "off",
    "no-underscore-dangle": "off"
  }
}
```

---

## Exact Formatter Configuration

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 180,
  "useTabs": true,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "objectWrap": "preserve",
  "sortImports": false,
  "sortPackageJson": false,
  "ignorePatterns": ["node_modules/**", "dist/**", "coverage/**"]
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.tsx",
    "test": "bun test test",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint --tsconfig tsconfig.json src/ test/",
    "format": "oxfmt src/ test/ dev/",
    "format:check": "oxfmt --check src/ test/ dev/"
  }
}
```

**Critical rules:**
- Never run `npx oxlint .` directly — always use `bun run lint`.
- Never run `npx tsc --noEmit` directly — always use `bun run typecheck`.
- Never run `npx oxfmt .` directly — always use `bun run format`.
- Import extensions must use `.js` even for `.ts` files (NodeNext resolution).
- `verbatimModuleSyntax: true` means `import type { X }` is required for type-only imports.

---

## How the Reference Solved Key Problems

### Service Boundary: `Context.Service` + `Layer.effect`

Every service is a class extending `Context.Service` with a static `layer` factory:

```typescript
export class MyService extends Context.Service<MyService, {
  readonly doThing: (input: Input) => Effect.Effect<Output, MyError>
}>()("ghui/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    const dep = yield* OtherService
    const doThing = Effect.fn("MyService.doThing")(function* (input) { /* ... */ })
    return MyService.of({ doThing })
  }))
}
```

Services compose at `runtime.ts` via `Layer.mergeAll` + `Layer.provide`.

### Error Model: `Schema.TaggedErrorClass`

```typescript
export class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}
```

Every error has a `_tag` field for pattern matching. Never raw `Error` or `string` in error channel.

### Reactive State: `Atom` + `runtime.atom`

```typescript
// Static atom (global UI state)
export const activeViewAtom = Atom.make<PullRequestView>(initial).pipe(Atom.keepAlive)

// Async data atom (reactive to dependencies via `get` parameter)
export const pullRequestsAtom = githubRuntime
  .atom(Effect.fnUntraced(function* (get) {
    const view = get(activeViewAtom)  // registers reactive dependency
    const github = yield* GitHubService
    // ...
  }))
  .pipe(Atom.keepAlive)

// Function atom (one per argument, self-cleaning via WeakRef)
export const readCachedDetailsAtom = githubRuntime.fn<string>()(
  (repo) => CacheService.use((cache) => cache.readRepositoryDetails(repo))
)
// NEVER .pipe(Atom.keepAlive) on function atoms — prevents GC
```

**Critical:** `get(atom)` inside a `runtime.atom` body registers a reactive dependency. `Atom.get(atom)` is a non-tracking read — wrong for reactivity.

### Tagged Unions: `Data.TaggedEnum`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}; Merge: MergeModalState; Comment: CommentModalState; // ...
}>
export const Modal = Data.taggedEnum<Modal>()

// Construct: Modal.Merge({ ...initialMergeModalState, repository, number })
// Match: Modal.$is("Merge")(activeModal) — type guard
// Match: Modal.$match(activeModal, { Merge: (s) => ..., None: () => ... })
```

### Command System: Values, Not Closures

```typescript
// Commands are pure values dispatchable from keymap, palette, or tests
defineCommand({
  id: "view.authored",
  title: "Authored",
  scope: "View",
  subtitle: queueViewSubtitleAtom("authored"),  // atom for dynamic title
  disabledReason: queueViewAlreadyActiveReasonAtom("authored"),
  run: Effect.sync(() => invokeHandoff("viewAuthored")),
})

// Handoff bridge: Effect commands → imperative React hooks
// In App.tsx: useEffect(() => registerHandoff("viewAuthored", () => { ... }), [])
// In command: invokeHandoff("viewAuthored")
```

### Cache Merge: `mergeCachedDetails`

Summary queries omit detail fields. When a fresh summary page arrives, `mergeCachedDetails` preserves detail fields from cached items at the same URL + same commit SHA:

```typescript
if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
return { ...pr, body: cachedPr.body, labels: cachedPr.labels, /* ... */ detailLoaded: true }
```

### Atomic Read-Merge-Write

```typescript
const load = yield* Atom.modify(queueLoadCacheAtom, (cache) => {
  const existing = cache[cacheKey]
  const data = mergeCachedDetails(page.items, existing?.data)
  const next = { view, data, fetchedAt: new Date(), endCursor: page.endCursor, hasNextPage: ... }
  return [next, { ...cache, [cacheKey]: next }]  // [returnValue, newAtomValue]
})
```

### Generation-Based Staleness

```typescript
const refreshGenerationRef = useRef(0)
const refresh = () => {
  const generation = ++refreshGenerationRef.current
  Effect.runPromise(fetchData()).then(data => {
    if (generation !== refreshGenerationRef.current) return  // stale
    applyData(data)
  })
}
```

### Retry with Exponential Backoff

```typescript
yield* github.listPullRequestPage(input).pipe(
  Effect.retry({
    times: 6,
    schedule: Schedule.exponential("300 millis", 2),
    while: shouldRetryPullRequestFetch,  // excludes rate limits + timeouts
  }),
)
```

### Pagination: Cursor Advances = Keep Going

```typescript
const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit
// Duplicate-only pages do NOT kill pagination — cursor still advances
```

### OpenTUI Rendering

Elements are terminal primitives, not HTML:
- `<box>` — container with flexbox-like layout (`flexDirection`, `paddingLeft`, `gap`, `width`, `height`)
- `<scrollbox>` — scrollable container with `scrollTop`
- `<text>` — text with inline segments

`ModalFrame` requires `junctionRows` for dividers to connect to side borders with `├`/`┤`.

### Keymap: `@ghui/keymap` Package

```typescript
import { context } from "@ghui/keymap"

const Diff = context<DiffViewCtx>()
export const diffViewKeymap = Diff(
  { id: "diff.up", keys: ["up", "k"], run: (s) => s.moveAnchor(-1) },
  { id: "diff.down", keys: ["down", "j"], run: (s) => s.moveAnchor(1) },
  // ...
)

// In all.ts:
diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff)
```

Context types are pure TypeScript interfaces — no atom/service imports. Values provided by `App.tsx`.

### Test Framework: `bun:test`

```typescript
import { describe, expect, test } from "bun:test"

// Pure domain tests — no Effect runtime needed
describe("viewCacheKey", () => {
  test("repository view key", () => {
    expect(viewCacheKey({ _tag: "Repository", repository: "owner/name" })).toBe("pullRequest:all:owner/name")
  })
})

// Service tests — real SQLite with temp files
const tempDbPath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "test-"))
  return join(dir, "test.sqlite")
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GHUI_PR_FETCH_LIMIT` | 500 | Max total items to fetch across all pages |
| `GHUI_PR_PAGE_SIZE` | 50 | Items per page (clamped to [1, 100]) |
| `GHUI_COMMAND_TIMEOUT_MS` | 15000 | Timeout for `gh` CLI commands |
| `GHUI_CACHE_PATH` | `~/.cache/ghui/cache.sqlite` | SQLite cache path; "off" to disable |
| `GHUI_MOCK_PR_COUNT` | (none) | Enable mock mode with N fake PRs |
| `GHUI_MOCK_REPOSITORY` | (none) | Mock repository name |
| `GHUI_MOCK_USERNAME` | (none) | Mock authenticated user |
| `XDG_CACHE_HOME` | `~/.cache` | XDG cache directory |

---

# Idiom Notes — How the Reference Solved Things

> **Purpose:** Exact bootstrap configuration and idiomatic patterns from the reference implementation.
> **Rule:** This file contains TypeScript/Effect-TS/OpenTUI/Bun-specific material quarantined from the blueprint.

---

## Exact Dependencies

```json
{
  "dependencies": {
    "@effect/atom-react": "4.0.0-beta.59",
    "@effect/sql-sqlite-bun": "4.0.0-beta.59",
    "@opentui/core": "0.2.1",
    "@opentui/react": "0.2.1",
    "effect": "4.0.0-beta.59",
    "react": "19.2.5",
    "scheduler": "0.27.0"
  },
  "devDependencies": {
    "@effect/language-service": "0.85.1",
    "@types/bun": "1.3.12",
    "@types/react": "19.2.14",
    "oxfmt": "0.47.0",
    "oxlint": "1.62.0",
    "typescript": "6.0.2"
  }
}
```

Workspace package: `packages/keymap/` — `@ghui/keymap` (keymap composition library).

---

## Exact Compiler Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleDetection": "force",
    "lib": ["ES2022"],
    "verbatimModuleSyntax": true,
    "rewriteRelativeImportExtensions": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["bun"],
    "plugins": [{ "name": "@effect/language-service" }]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "dev/**/*.ts", "dev/**/*.tsx"]
}
```

---

## Exact Linter Configuration

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "require-yield": "off",
    "no-underscore-dangle": "off"
  }
}
```

---

## Exact Formatter Configuration

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 180,
  "useTabs": true,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": false,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "insertFinalNewline": true,
  "objectWrap": "preserve",
  "sortImports": false,
  "sortPackageJson": false,
  "ignorePatterns": ["node_modules/**", "dist/**", "coverage/**"]
}
```

---

## Package Scripts

```json
{
  "scripts": {
    "dev": "bun --watch src/index.tsx",
    "test": "bun test test",
    "typecheck": "tsc --noEmit",
    "lint": "oxlint --tsconfig tsconfig.json src/ test/",
    "format": "oxfmt src/ test/ dev/",
    "format:check": "oxfmt --check src/ test/ dev/"
  }
}
```

**Critical rules:**
- Never run `npx oxlint .` directly — always use `bun run lint`.
- Never run `npx tsc --noEmit` directly — always use `bun run typecheck`.
- Never run `npx oxfmt .` directly — always use `bun run format`.
- Import extensions must use `.js` even for `.ts` files (NodeNext resolution).
- `verbatimModuleSyntax: true` means `import type { X }` is required for type-only imports.

---

## How the Reference Solved Key Problems

### Service Boundary: `Context.Service` + `Layer.effect`

Every service is a class extending `Context.Service` with a static `layer` factory:

```typescript
export class MyService extends Context.Service<MyService, {
  readonly doThing: (input: Input) => Effect.Effect<Output, MyError>
}>()("ghui/MyService") {
  static readonly layer = Layer.effect(MyService, Effect.gen(function* () {
    const dep = yield* OtherService
    const doThing = Effect.fn("MyService.doThing")(function* (input) { /* ... */ })
    return MyService.of({ doThing })
  }))
}
```

Services compose at `runtime.ts` via `Layer.mergeAll` + `Layer.provide`.

### Error Model: `Schema.TaggedErrorClass`

```typescript
export class MyError extends Schema.TaggedErrorClass<MyError>()("MyError", {
  operation: Schema.String, cause: Schema.Defect,
}) {}
```

Every error has a `_tag` field for pattern matching. Never raw `Error` or `string` in error channel.

### Reactive State: `Atom` + `runtime.atom`

```typescript
// Static atom (global UI state)
export const activeViewAtom = Atom.make<PullRequestView>(initial).pipe(Atom.keepAlive)

// Async data atom (reactive to dependencies via `get` parameter)
export const pullRequestsAtom = githubRuntime
  .atom(Effect.fnUntraced(function* (get) {
    const view = get(activeViewAtom)  // registers reactive dependency
    const github = yield* GitHubService
    // ...
  }))
  .pipe(Atom.keepAlive)

// Function atom (one per argument, self-cleaning via WeakRef)
export const readCachedDetailsAtom = githubRuntime.fn<string>()(
  (repo) => CacheService.use((cache) => cache.readRepositoryDetails(repo))
)
// NEVER .pipe(Atom.keepAlive) on function atoms — prevents GC
```

**Critical:** `get(atom)` inside a `runtime.atom` body registers a reactive dependency. `Atom.get(atom)` is a non-tracking read — wrong for reactivity.

### Tagged Unions: `Data.TaggedEnum`

```typescript
export type Modal = Data.TaggedEnum<{
  None: {}; Merge: MergeModalState; Comment: CommentModalState; // ...
}>
export const Modal = Data.taggedEnum<Modal>()

// Construct: Modal.Merge({ ...initialMergeModalState, repository, number })
// Match: Modal.$is("Merge")(activeModal) — type guard
// Match: Modal.$match(activeModal, { Merge: (s) => ..., None: () => ... })
```

### Command System: Values, Not Closures

```typescript
// Commands are pure values dispatchable from keymap, palette, or tests
defineCommand({
  id: "view.authored",
  title: "Authored",
  scope: "View",
  subtitle: queueViewSubtitleAtom("authored"),  // atom for dynamic title
  disabledReason: queueViewAlreadyActiveReasonAtom("authored"),
  run: Effect.sync(() => invokeHandoff("viewAuthored")),
})

// Handoff bridge: Effect commands → imperative React hooks
// In App.tsx: useEffect(() => registerHandoff("viewAuthored", () => { ... }), [])
// In command: invokeHandoff("viewAuthored")
```

### Cache Merge: `mergeCachedDetails`

Summary queries omit detail fields. When a fresh summary page arrives, `mergeCachedDetails` preserves detail fields from cached items at the same URL + same commit SHA:

```typescript
if (!cachedPr?.detailLoaded || cachedPr.headRefOid !== pr.headRefOid) return pr
return { ...pr, body: cachedPr.body, labels: cachedPr.labels, /* ... */ detailLoaded: true }
```

### Atomic Read-Merge-Write

```typescript
const load = yield* Atom.modify(queueLoadCacheAtom, (cache) => {
  const existing = cache[cacheKey]
  const data = mergeCachedDetails(page.items, existing?.data)
  const next = { view, data, fetchedAt: new Date(), endCursor: page.endCursor, hasNextPage: ... }
  return [next, { ...cache, [cacheKey]: next }]  // [returnValue, newAtomValue]
})
```

### Generation-Based Staleness

```typescript
const refreshGenerationRef = useRef(0)
const refresh = () => {
  const generation = ++refreshGenerationRef.current
  Effect.runPromise(fetchData()).then(data => {
    if (generation !== refreshGenerationRef.current) return  // stale
    applyData(data)
  })
}
```

### Retry with Exponential Backoff

```typescript
yield* github.listPullRequestPage(input).pipe(
  Effect.retry({
    times: 6,
    schedule: Schedule.exponential("300 millis", 2),
    while: shouldRetryPullRequestFetch,  // excludes rate limits + timeouts
  }),
)
```

### Pagination: Cursor Advances = Keep Going

```typescript
const cursorAdvanced = page.endCursor !== null && page.endCursor !== current.endCursor
hasNextPage: page.hasNextPage && cursorAdvanced && data.length < prFetchLimit
// Duplicate-only pages do NOT kill pagination — cursor still advances
```

### OpenTUI Rendering

Elements are terminal primitives, not HTML:
- `<box>` — container with flexbox-like layout (`flexDirection`, `paddingLeft`, `gap`, `width`, `height`)
- `<scrollbox>` — scrollable container with `scrollTop`
- `<text>` — text with inline segments

`ModalFrame` requires `junctionRows` for dividers to connect to side borders with `├`/`┤`.

### Keymap: `@ghui/keymap` Package

```typescript
import { context } from "@ghui/keymap"

const Diff = context<DiffViewCtx>()
export const diffViewKeymap = Diff(
  { id: "diff.up", keys: ["up", "k"], run: (s) => s.moveAnchor(-1) },
  { id: "diff.down", keys: ["down", "j"], run: (s) => s.moveAnchor(1) },
  // ...
)

// In all.ts:
diffViewKeymap.scope((a) => a.diffFullView && !modalActive(a) && a.diff)
```

Context types are pure TypeScript interfaces — no atom/service imports. Values provided by `App.tsx`.

### Test Framework: `bun:test`

```typescript
import { describe, expect, test } from "bun:test"

// Pure domain tests — no Effect runtime needed
describe("viewCacheKey", () => {
  test("repository view key", () => {
    expect(viewCacheKey({ _tag: "Repository", repository: "owner/name" })).toBe("pullRequest:all:owner/name")
  })
})

// Service tests — real SQLite with temp files
const tempDbPath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "test-"))
  return join(dir, "test.sqlite")
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GHUI_PR_FETCH_LIMIT` | 500 | Max total items to fetch across all pages |
| `GHUI_PR_PAGE_SIZE` | 50 | Items per page (clamped to [1, 100]) |
| `GHUI_COMMAND_TIMEOUT_MS` | 15000 | Timeout for `gh` CLI commands |
| `GHUI_CACHE_PATH` | `~/.cache/ghui/cache.sqlite` | SQLite cache path; "off" to disable |
| `GHUI_MOCK_PR_COUNT` | (none) | Enable mock mode with N fake PRs |
| `GHUI_MOCK_REPOSITORY` | (none) | Mock repository name |
| `GHUI_MOCK_USERNAME` | (none) | Mock authenticated user |
| `XDG_CACHE_HOME` | `~/.cache` | XDG cache directory |

---

## Idiom Translation Table

This table maps [ESSENTIAL] concepts to [INCIDENTAL] reference idioms.
Stage 2 fills the target language column.

| Concept [ESSENTIAL] | Reference Idiom [INCIDENTAL] | Target Idiom |
|---------------------|------------------------------|--------------|
| Service boundary | `Context.Service` + `Layer.effect` | ? |
| Typed error family | `Schema.TaggedErrorClass` | ? |
| Reactive cell | `Atom.make` + `Atom.keepAlive` | ? |
| Async data cell | `runtime.atom(Effect.fnUntraced)` | ? |
| Tagged union | `Data.TaggedEnum` | ? |
| Effect composition | `Effect.gen(function* () { ... })` | ? |
| Dependency injection | `Layer.provide` | ? |
| Persistence | `@effect/sql-sqlite-bun` | ? |
| Terminal rendering | `@opentui/react` + JSX | ? |
| Keymap composition | `@ghui/keymap` package | ? |

**Rule**: Every row MUST be filled before coding begins.
**Rule**: Target idiom MUST be idiomatic, not transliterated.

---

## Appendix A — Optional conceptual framing (non-normative, generates no reports)

- **Extract = abstraction (α), Build = concretization (γ)**, forming an adjunction in the abstract-interpretation sense: α(P)⊑S ⟺ P⊑γ(S).
- **The round-trip is a closure, not an identity:** P ⊑ γ(α(P)), and γ(α(P)) ≠ P because `[INCIDENTAL]` detail is intentionally discarded. **Do not "verify γ(α(P)) = P" — it is false by construction.**
- **Observational equivalence of state machines** is the one genuinely useful formal idea; it is operationalized as **bounded-depth transition enumeration with output comparison** (Stage 2, Step 4). No "coalgebra / bisimulation / functor / reflective subcategory" vocabulary is needed or used.

The three pillars (Essential/Incidental separation, grounded + property-bearing SPECs, fitness functions) carry 100% of the operational weight. This appendix is decoration you can show a mathematician without embarrassment — and nothing in the prompts depends on it.
