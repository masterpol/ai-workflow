---
id: a-measured-redundant-layer-is-not-a-deleted-layer
type: pattern
created: 2026-10-20
updated: 2026-10-20
tags: [testing, mutation, security, defense-in-depth, verification]
related: [prove-a-guard-test-with-an-in-memory-mutant, guard-tests-can-fail-for-the-wrong-reason, a-gate-must-not-audit-its-own-instrument]
source: state-fragment-sanitizer
confidence: medium
---

# Pattern: a redundant layer is measured and recorded, not deleted on a survivor

## Summary

When a mutation survives, the default reflex is to delete the layer it was supposed to prove.
Deleting it silently trades a proven redundancy for an unproven absence. The alternative is to
measure the redundancy — how many inputs behave identically with and without the layer — record
it as a measured redundancy with its number, and keep the layer.

## The Pattern

1. Run the mutant against the real input space, not one example.
2. Report the count of inputs where the output is byte-identical with and without the layer.
3. Record the layer as `redundant-layer: <measured reason>` with the number attached.
4. Keep the layer in production. Do not weaken it to make the mutant observable.
5. Say plainly in the ship record that the layer is redundant *under the approved decision*, not
   that it is proven necessary.

## What happened

A sanitizer's rejection-message formatter had two layers: a printable-character filter and a
final grammar check. Removing the printable call survived all 148 sanitizer tests. The pitch
chose to measure it instead of deleting it: 7 507 differential inputs produced identical
messages, and the printable filter changed none of the 2 250 validated intermediate messages.
The layer stayed, and the surviving mutant is recorded as a measured redundancy with its
number — not as a kill.

## When to Use

- A mutant survives a whole test suite, and the layer it targets is a defense-in-depth layer
  whose removal would change behaviour that no test currently observes.
- The measured cost of keeping the layer is low and the cost of an unobserved regression is not.

## When NOT to Use

- The survivor shows the layer is wrong, not merely redundant (it mangles valid input, or it
  is the only thing enforcing a stated rule). Then fix or remove it deliberately.
- The layer has measurable cost — a hot path, a dependency, or a size budget — and no owner
  decision protects it.

## Related

- [[prove-a-guard-test-with-an-in-memory-mutant]] — the survivor is only meaningful when the
  unmodified baseline passed in the same layout.
- [[guard-tests-can-fail-for-the-wrong-reason]] — a survivor may be a coverage gap rather than a
  redundancy; the measurement distinguishes them.
- [[a-gate-must-not-audit-its-own-instrument]] — author-run mutant proofs are not independent
  review.
