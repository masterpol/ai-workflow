---
id: pitch-compaction-gate-and-recovery-design
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [pitch-compress, compaction, deletion, recovery, gates, design]
related: [a-gate-must-not-trust-its-own-author, bare-prefix-match-crosses-entities, hardening-a-shared-reader-made-its-writer-destructive, workflow-tooling-pitches-share-standing-no-gos-and-design-answers]
source: pitch-compaction
---

# Decision: how `/pitch-compress` decides a deletion is safe

## Summary

`pitch-compaction` is the single, human-approved exception to "never rewrite `.project/pitches/`". Its gates
and recovery design are recorded here; the code is `pitch-compress.js` and `pitch-archive.js` and the
playbook is `.claude/skills/pitch-compress/SKILL.md`.

## Decision

- **Every mutating step needs `--apply`; deletion needs a verified archive, a complete ledger, an unchanged
  source, and a human gate.** Nothing is automatic.
- **Each gap needs an explicit human acceptance** (`commit-ledger --accept-gap SECTION=REASON`, recorded in
  the ledger and re-checked by `remove`). An earlier deviation collapsed this into "a ledger exists", which
  let a ledger declare every section a gap and pass at coverage 0 (reproduced live); it was reversed at
  audit ([[a-gate-must-not-trust-its-own-author]]).
- **Reuse the audited transaction machinery.** `pitch-archive.js` runs on `skill-registry.js`'s
  `transact`/`recover` with a `{roots, state}` context; interruption is tested with real `SIGKILL`
  subprocesses, not a fabricated journal.
- **The interrupted-transaction guard lives in `archive`, `remove` and `restore` themselves**, not only the
  CLI wrapper, so a direct import cannot bypass it.
- **`remove` leaves the emptied pitch directory behind** (its "already removed" detection handles both a
  missing and an emptied directory); `inventory` treats an empty directory whose slug is in `done-work.md`
  as compacted.
- **Archive lookup is anchored to the exact timestamp shape** and `verify` rejects a manifest for another
  slug ([[bare-prefix-match-crosses-entities]]); `restore` refuses an unverified archive and checks
  containment before each write; ledger destinations must be real, nonempty, in-project files outside the
  pitch being deleted.
- **`inventory` reports a non-slug directory name as preserved** instead of throwing and hiding the rest.
- **`done-work.md` is generated**, one section per pitch, replaced in place on a rerun; never hand-edited.
- **The playbook was written whole in C1**, including the C2 steps, because one coherent document should not
  be split across two edits; C2's scripts and tests were still built and verified separately.

## Consequences

- **Pros**: a removal is recoverable (archive, plus git history) and each skipped section is a named decision.
- **Cons**: extraction is real human/agent work, and the ledger's destination check is only mechanical.
- **Implications**: a change to a shared reader used by these scripts must be traced through their writers
  ([[hardening-a-shared-reader-made-its-writer-destructive]]).

## References

`.claude/skills/pitch-compress/SKILL.md`; [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].
