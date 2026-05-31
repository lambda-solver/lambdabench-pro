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
