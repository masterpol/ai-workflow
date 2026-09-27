# Compaction record: bundle-sync-marker-fix

Prepared 2026-09-26. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable decision: [[effective-sync-bases-and-bounded-font-discovery]].

## Section 1: SHIPPED.md#scope-reconciliation

S1 completed marker construction from per-entry outcomes; repeated unverified, conflict, local and removal runs retain correct classification.

## Section 2: SHIPPED.md#verification

The ship-time combined run reported 286 tests: 285 passed, zero failed, one unrelated Linux-only collector test skipped on macOS. The affected sync/HTML/snapshot suites were rerun at closure. Workflow doctor (746 checks), setup validator (21 checks), graph check and git diff --check passed. Build, typecheck, lint and i18n commands are not configured.

## Section 3: SHIPPED.md#audit

Fresh read-only code, security, test and cross-pitch reviews found no unresolved findings for this slice; code review ran 101 tests. UI, i18n and AI eval were inapplicable. independent-rereview-catch-up must review settled source and rerun affected suites after later fixes; it had no overlapping implementation edit in this reviewed slice.

## Section 4: SHIPPED.md#no-gos-honored

Instance customization and overwrite policy remain protected. No external stylesheets, general CSS evaluation, historical deletion or application edits. Shared font slice retains bounded renderer validation.

## Section 5: SHIPPED.md#rabbit-holes-and-deviations

No implementation deviation. Marker state describes the effective prior base of target content rather than every current upstream source file. Removed/prune outcomes use the same per-entry rule.

## Section 6: SHIPPED.md#knowledge-and-followups

Design is preserved in [[effective-sync-bases-and-bounded-font-discovery]]. No new followup; the two production safety pitches remain incomplete.

## Section 7: SHIPPED.md#delivery

User selected 1 at the 2026-09-26 ship gate. Workflow records closed; no Git commit, merge, deployment or publication occurred. path-safety-hardening and collector-robustness remain incomplete; this approval does not ship them. No new followup was added.

## Section 8: pitch.md#no-gos

No automatic application of unverified files, no marker schema bump without test evidence, and no unrelated skill reconciliation changes.

## Section 9: pitch.md#rabbit-holes

Resolved effective-base semantics. Planner owned removed/prune outcome risk, covered by repeated-run tests. New conflict UI, forced overwrites and .project synchronization remain excluded.

## Section 10: audit-cycle-1.md

Fresh read-only code, security, test and cross-pitch reviews found no unresolved findings for this slice; code review ran 101 tests. UI, i18n and AI eval were inapplicable. independent-rereview-catch-up must review settled source and rerun affected suites after later fixes; it had no overlapping implementation edit in this reviewed slice. Per-file bases were checked across repeated unverified/local/conflict/retained-removal/prune runs. The historical pre-gate audit status is superseded by SHIPPED.md approval.

## Section 11: log.md#s1-2026-09-26

16 bundle-sync tests passed within the 132-test shared caller run, zero failures. Fixtures assert pending unverified files, persistent conflicts, retained local bases, prune-eligible removed files, protection of locally modified removals and disappearance of pruned entries. bundle-sync.js --help exited 0 but performs an ordinary comparison dry run; no apply or file write occurred.
