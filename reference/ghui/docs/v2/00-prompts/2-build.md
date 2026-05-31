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
