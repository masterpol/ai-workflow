---
id: a-gate-must-not-trust-its-own-author
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [safety, deletion, validation, gates]
related: [resolve-before-matching-a-protected-path-allowlist, bare-prefix-match-crosses-entities]
source: pitch-compaction
---

# Pattern: A safety gate must not accept the claims of whoever it is gating — and must re-check at the destructive step

## Summary

A gate protects against the agent (or script) that wants to proceed. If that same party writes
the evidence the gate reads — and also decides which shortfalls count as acceptable — the gate
only checks that the paperwork is well-formed, not that the property it exists to guarantee
holds. And a gate that ran earlier, in a different step, protects nothing if the destructive step
trusts that its input "could only have come through the validated path."

## What happened

`pitch-compress` gates file deletion on a coverage ledger proving each section of a shipped pitch
was preserved somewhere. Three separate holes let the ledger's author defeat it, each reproduced
with a live script before being fixed:

- **Self-accepted gaps.** The mapping let its author mark a section a "gap" with a reason, and the
  deletion gate only checked a ledger existed. Marking every section a gap gave coverage 0 and
  `remove` deleted everything. (My own build had also *weakened the plan's requirement* — an
  explicit per-gap human acceptance — into "a ledger exists", and logged it as a routine
  deviation. That reinterpretation was the bug.)
- **Evidence that doesn't survive the action.** A destination "proving" content was preserved
  could be a file inside the very directory the operation deletes — coverage 1.0, nothing kept.
- **Trusting the upstream check.** `remove()` assumed a ledger could only exist if `commit-ledger`
  had validated it. A hand-placed ledger skipped that entirely.

## The Pattern

1. **Separate claim from acceptance.** Anything the gated party can declare ("this gap is fine")
   needs an independent, explicit acceptance recorded alongside it — and the gate checks the
   acceptance, not the claim.
2. **Re-check at the destructive step.** The function that actually deletes re-reads and
   re-validates the evidence itself. Do not rely on "the earlier step already validated this."
3. **Make the evidence outlive the action.** A proof-of-preservation must be checked to still exist
   *after* the operation — reject any location the operation itself removes (resolved by real path).
4. **Test with the adversary's inputs.** Construct the hostile artifact directly (a hand-written
   ledger, an all-gap mapping, a self-referential destination), not just malformed ones.

## When NOT to Use

A gate on a reversible, low-stakes action doesn't need this weight. It earns its cost when the
step is destructive or hard to undo.

## Prevention (process)

When a build deviates from a plan in a way that **relaxes a safety property**, that is not a
routine deviation. Flag it explicitly for approval instead of recording it and proceeding; here it
was the plan's own wording that was right and my "simplification" that was wrong.

## Examples in Codebase

- `ai-framework/scripts/pitch-compress.js` (`commitLedger`, `checkDestination`, `--accept-gap`)
- `ai-framework/scripts/pitch-archive.js` (`requireCompleteLedger`, called from `remove()`)
- Found in `.project/pitches/pitch-compaction/audit-cycle-1.md`.

## Related Patterns

- [[resolve-before-matching-a-protected-path-allowlist]] — same family: a check that looks correct
  lexically but is defeated by what the value actually resolves to.
- [[bare-prefix-match-crosses-entities]] — the sibling defect found in the same audit.
