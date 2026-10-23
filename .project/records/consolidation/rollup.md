# Shipped: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/SHIPPED.md` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


Date: 2026-10-23. Appetite: big-batch x4 (P1, P2a, P2c, P2d). State: shipped after four separate owner-approved track ships and an owner-approved umbrella closure. Releases: 2.42.0 (P1), 2.43.0 (P2a), 2.44.0-2.45.1 (P2d) and 2.46.0-2.48.1 (P2c).

The workflow now represents its own process as a graph, keeps shipped work as bounded v2 outcome records with independently checked coverage ledgers, ships an installed-project migration and two-pass sync, and has upgraded all 46 legacy compacted pitches to v2 outcomes with retained supplements, preserving every original v1 ledger and recovery archive.

## Track receipts

| Track | Receipt | Approved proposal hash | Run |
|---|---|---|---|
| P1 connected-process-graph | [p1.SHIPPED.md](tracks.md#p1-connected-process-graph) | sha256:102d99e5231e732abab4fdfd20f61755692e73c6f90f5f3cbc475750fb34a05d | [run](../../runs/2026-10-23-connected-process-graph.md) |
| P2a consolidation-schemas | [p2a.SHIPPED.md](tracks.md#p2a-consolidation-schemas) | sha256:84277ec6a545590e4a785aef8e5425e1acfb5ecd1ab55fa986019070f61b3a02 | [run](../../runs/2026-10-23-consolidation-schemas.md) |
| P2d installed-sync | [p2d.SHIPPED.md](tracks.md#p2d-installed-sync) | sha256:2e7b794a8deaf2f82eebf8ca2439875f2d9336bfb3911ace0071826e36ee31da | [run](../../runs/2026-10-23-installed-sync.md) |
| P2c legacy-upgrade | [p2c.SHIPPED.md](tracks.md#p2c-legacy-upgrade) | sha256:01023861e631103c4c9b2e8445f33699531f9484ba9bb893a80e543687bd9fe2 | [run](../../runs/2026-10-23-legacy-upgrade.md) |

All 20 scopes are done (P1 six, P2a six, P2c five, P2d three); the separate repair `fix-retired-live-evidence-path` shipped under its own receipt ([run](../../runs/2026-10-23-fix-retired-live-evidence-path.md)).

## Exceptions and open items carried forward (none waived silently)

- Token-time-report retained bytes 26,788 of 274,950 (9.74%) against a 5% target: owner-approved named exception ([closing exceptions](closing-exceptions.approved.toon)).
- `state-history.mts` archive-read fallback predates the campaign; deferred to the un-bet P2b. The original literal scan criterion did not pass.
- Batch-3 broad archive search was unauthorized and its output is excluded from provenance; later approvals do not authorize it retroactively.
- A parallel Claude session duplicated five archive-read receipts for batch 9 and overwrote its unresolved drafts; nothing from it was applied ([log](../../runs/2026-10-23-connected-memory-consolidation.md), "parallel-session reconciliation").
- P2a crossed the 1,500-line checkpoint (about 1,520) with owner approval; its final regex and mutation evidence is author-run; P1's lexical audit query omits reviewers (CMC-G1).
- The package-less pre-ship wrapper fails ("No package.json or Muro document verifier found"); the owner-approved direct-check route was used. Bun is not claimed as a new whole-suite pass.
- Full supported Node suite: 86 files, 2,712 tests, 2,709 passed, 0 failed, 3 existing skips (436.955 s).

## Followups and what stays un-bet

CMC-A1 (grammar pin adoption), CMC-A2 (bounded FIFO test), CMC-G1 (sparse relations), FRLE-D1 (failing-child diagnostics) and the package-less wrapper remain in [_followups.md](../../pitches/_followups.md). P2b ship-consolidate-step, P3a retire-safely and P3b state-from-records remain un-bet. Downstream rollout has not run; the workflow-v3-rollout carry is separate. Cooldown is due (five ships since the forced review); no cooldown decision is pre-approved.

## Approval and closure

The owner approved this umbrella closure on 2026-10-23, separately from the four track ships. Closure publishes this rollup, the dated archive [runs/2026-10-23-connected-memory-consolidation.md](../../runs/2026-10-23-connected-memory-consolidation.md) and moves the umbrella to Recent ships. The live log, hill, plan and the other pitch files are left byte-identical. Nothing is committed or pushed.
