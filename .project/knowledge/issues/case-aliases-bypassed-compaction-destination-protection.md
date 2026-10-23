---
id: case-aliases-bypassed-compaction-destination-protection
type: issue
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, filesystem, safety, validation]
related: [a-gate-must-not-trust-its-own-author, resolve-before-matching-a-protected-path-allowlist, pitch-compaction-gate-and-recovery-design]
source: consolidation-schemas
severity: high
resolved: true
---

# Issue: a destination alias could place preservation evidence inside the removed tree

## Observation

The P2a audit reproduced `.project/Pitches/x` passing a lexical destination check on the
case-insensitive development filesystem. A later removal could delete the supposedly retained
content. Lowercasing alone also missed filesystem equivalence such as the long-s character.

## Resolution and limits

Compare protected directory identities through device/inode checks along resolved ancestors,
in addition to lexical spelling checks. Validate destinations at ledger commit and again at the
destructive gate. Outcome decisions and behavior also reject identity aliases of done-work and
the outcome record itself. Keep whole-file hashes for log, deviations and SHIPPED content even
when section parsing finds no headings. The three-cycle audit fixed the reproduced bypasses;
this does not claim continuous root identity or elimination of all lstat/read races.

## Prevention

Test the actual filesystem's alias behavior and hand-placed gate artifacts. Evidence must
survive the action it authorizes; a successful earlier validator is insufficient.
