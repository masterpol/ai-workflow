# Cooldown report — 2026-10-23 (forced)

Run with `--force` at 2 ships since the previous cooldown (connected-memory-consolidation, fix-retired-live-evidence-path). Coordinator review; no workers dispatched.

## Knowledge health
Graph check: 126 entries (17 decisions, 54 patterns, 53 issues, 2 entities), 354 edges; 0 broken links, 0 orphans. No entry is 60 days old; no archives.

## Per-item decisions (user-approved individually)

| ID | Decision | Result |
|----|----------|--------|
| R1 | Promoted | `security.md` section G: publish-time re-inspection, inode-checked cleanup, marker-only replacement (from `a-writer-reinspects-the-target-at-the-publish-step`, `a-report-never-overwrites-a-file-it-did-not-write`) |
| R2 | Promoted | `coding-standards.md` "Resolve Caller-Supplied Limits Once" (from `a-caller-supplied-limits-object-can-defeat-a-hard-cap`) |
| R3 | Left as a pattern (recommended action; initial promotion reverted) | `path-containment-compares-real-paths` has one pitch of evidence; revisit when it recurs |
| F1 | Promoted | pitch draft `pitches/review-bench-hardening/pitch.md`, indexed in `status.md` |

## Parked pitches
`_parked/` is empty.

## Followups
Candidate pitches approved earlier remain unshaped. Nothing deleted.
