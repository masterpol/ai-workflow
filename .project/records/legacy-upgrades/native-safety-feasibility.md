# Source-review supplement: native-safety-feasibility

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/native-safety-feasibility.md) for the scratch-only feasibility spike. Results are historical measurements on one macOS host (Python 3.14.7), not a runtime or platform certification. Durable decision: [inode anchoring and stable inode locks](../../knowledge/decisions/inode-anchoring-and-stable-inode-locks.md). Source records date the ship 2026-09-26 while the index entry says 2026-09-27; the discrepancy is unresolved and the outcome record keeps the index date.

## Problem and plan contract

Maintainers could not close the remaining path and collector races with pathname checks, and needed measured evidence for a safe primitive before changing the dependency-free runtime contract. Knowledge consulted: refused paths must never become fresh writes; ownership must hold at the protected operation; totals and stored records survive migration; capability and transaction boundaries precede mutation code; security.md section 9 and testing.md. Sources: Python os (directory-relative APIs, supports_dir_fd) and fcntl (flock, nonblocking) documentation.

One scope (S1), four scratch files (bench.py, bench.test.js, evidence.json, report.md), at most 400 lines, no production change. Exit contract: tests use explicit pipe/barrier coordination, isolated fixtures, child deadlines of at most 5 seconds and test deadlines of at most 30 seconds, with descendant and fixture cleanup on failure and no sleep-based ordering. A negative feasibility result can pass. evidence.json (capabilities, scenario outcomes, platform coverage) and report.md (recommendations for both parents, observations separated from hypotheses) are test-validated. Missing capabilities yield explicit unsupported results; Linux stays unverified unless run there.

## Audit triage

The single must-fix (M1) was rated medium by the code reviewer and promoted by the main thread because it broke a required exit criterion: with Python unavailable, mutation tests demanded rejection while the baseline reported unsupported (unavailable-PATH focused run: 1 pass, 1 fail, "Missing expected rejection"). The fix validated the capability baseline and skipped capability-dependent mutants explicitly; a fresh cycle-2 reviewer confirmed 2 pass / 1 skip / 0 fail. Security review walked section 9 with no real defect. Cross-pitch review found disjoint implementation files; shared status bookkeeping must be merged by row. Four scratch canaries (false containment evidence, missing leaf O_NOFOLLOW, false immediate parent-death release, invented collector file overlap) were reviewer probes absent from real source.

## Assurance limits

Reviewers were told not to report as defects: directory relocation escapes continuous containment; same-user inode replacement splits advisory locks; legacy writers do not cooperate; Linux unverified. Individual absent-API flags were not all separately injected (missing flock, missing runtime and all-capabilities gating were). No separate surviving-process inventory was taken. Generic UI/utility percentage coverage targets were inapplicable; evidence is deterministic scenario coverage plus guard-removal checks, which does not imply production resolver, migration or platform coverage. Line count was 384 at build completion and 386 after the audit fix.

Whole files left out of the ledger: five per-reviewer audit records (scratch canary bookkeeping summarized in the audit triage above), the reviewer prompt text (only the known-limitations list is kept here), the hill chart and the ship-readiness note that duplicates the shipped record.
