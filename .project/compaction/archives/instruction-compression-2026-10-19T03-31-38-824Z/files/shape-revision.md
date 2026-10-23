# Shaping revision: instruction-compression

**Date:** 2026-10-18. **Appetite:** big-batch, first wave only (≤15 implementation files / ≤1,500 changed lines / one week). **Decision:** Bet approved by the user on 2026-10-18.

This revision bounds the next bet; the original pitch preserves the broader proposal. Critique is recorded in [critique.md](critique.md).

## Problem

Build, audit and ship wrappers repeat their phase specifications, increasing routine context and maintenance cost. Shorten these three wrappers while preserving every decision, permission boundary and evidence obligation.

## Knowledge consulted

Keep one instruction owner per topic; prove replacement checks with mutations; refresh Cursor copies in the same change; distinguish unexecuted cases from passes. Sources: `one-owner-per-instruction-topic-guarded-by-contract-tests`, `prove-a-guard-test-with-an-in-memory-mutant`, `canonical-mirror-sync`, `a-grader-reports-executed-and-unexecuted-cases-separately`.

## Solution sketch

Keep invocation mechanics and required inputs in each wrapper. Before phase decisions, load the applicable sections of its phase specification and the overview's gate matrix. Load detailed Orca guidance at enabled dispatch/reconcile steps. Transfer unique requirements to existing owners before removing duplicates. Keep the current caveman banners intact.

Projected implementation boundary: three canonical wrappers and three Cursor copies (6); their three phase specifications (3); `workflow-contracts.test.mts` and one new owner-loading contract test (2); the shared golden dataset (1); `VERSION` and `CHANGELOG.md` (2). Total: 14. At most one existing integration owner may also change (15); otherwise split the work before implementation. Planning records and ignored run evidence are tracked separately. `/plan` must measure changed-line estimates before fixing scopes.

The [golden dataset](../../evals/datasets/instruction-compression.json) has 31 live-only scenarios, currently not-run. Before edits, capture the same-vendor baseline; afterwards require every observed criterion to pass, with no regression greater than 0.3. Keep unavailable vendors explicitly unverified. One before/after run across four vendors costs 248 case-runs; record actual calls and latency separately. Fixture parsing is not a behavioral pass.

## Rabbit holes

- **Resolve here:** the conflict fix shipped; the broad sweep exceeds appetite. Only this first wave is proposed for bet.
- **Push to /plan:** inventory unique wrapper clauses and downstream owner sections; prove missing-file, missing-section and changed-behavior mutations fail before retiring old assertions.
- **Push to /plan:** pin baseline revision, dataset and settings; compare actual loaded context, calls and latency, not repository word totals alone. Include nested runtime and hook test suites.
- **Push to /plan:** pin the source revision used by `workflow-v3-rollout`; do not sync a changing compression checkout or overwrite application customizations.
- **Push to no-go:** third-party skills, banner sweep, focused-agent rewrites, planner redesign and rule compaction. Shape these as separate bounded pitches after the pilot ships; do not treat them as approved scopes.

## No-gos

No semantic changes, new gates, skipped reviews, weakened checks, secret reads, third-party edits or unsupported savings claims. No live baseline claimed from this shaping session. No compression implementation before the normal plan/build gates.

## Bet decision

☒ Bet on this bounded first wave; proceed to `/plan`.
☐ Revise / Back / Stop.

Approval record: the user replied “Approve” to the bounded-candidate gate. This accepts the pilot and the recorded critique dispositions/mitigations; the full sweep remains deferred. Plan and build approvals remain separate.
