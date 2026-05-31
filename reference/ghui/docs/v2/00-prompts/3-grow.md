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
