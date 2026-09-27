---
id: inode-anchoring-and-stable-inode-locks
type: decision
created: 2026-09-26
updated: 2026-09-26
tags: [path-safety, filesystem, locking, collector, feasibility, platform]
related: [a-gate-must-not-trust-its-own-author, workflow-tooling-pitches-share-standing-no-gos-and-design-answers, hardening-a-shared-reader-made-its-writer-destructive]
source: native-safety-feasibility
---

# Decision: Inode anchoring and stable-inode locks

## Observations

The scratch spike on macOS with Python 3.14.7 demonstrated that directory-relative open/rename/unlink survive a pathname symlink swap, but still operate outside the original root if the captured directory is moved there. Leaf O_NOFOLLOW refusal was reproduced. Inode anchoring does not prove continuous root containment or a complete component resolver.

Cooperative advisory locks excluded paused holders and released on holder death. A paused helper retained ownership after supervisor death until resumed and able to process stdin EOF. Replacing the lock inode allowed simultaneous locks on different inodes; a legacy writer ignoring the lock could still mutate.

## Decision and consequences

Do not close the original path and collector safety promises from API availability or these primitives alone. Path safety requires an explicit containment threat-model decision. Collector integration requires a stable lock inode, participation by every writer, migration excluding older collectors and supervision tied to the actual holder lifetime. Never reclaim a kernel-held lock merely because the supervisor died or a time budget expired.

Python remains an experimental runtime, not an adopted production dependency. Linux is unverified and Windows unsupported by the spike. Future production integration needs its own approved runtime/platform contract, tests and appetite.

Evidence: `.project/analysis/native-safety-feasibility/report.md` and `evidence.json`; audit records under `.project/pitches/native-safety-feasibility/` include an independently rechecked correction to mutation-test gating when Python is unavailable. Both parent production scopes remain incomplete.
