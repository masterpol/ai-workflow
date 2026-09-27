# Compaction record: native-safety-feasibility

Prepared 2026-09-26. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable decision: [[inode-anchoring-and-stable-inode-locks]].

## Section 1: SHIPPED.md#reconciliation

Four scratch deliverables, 386 lines. Directory-relative open/rename/unlink survived symlink swaps but followed moved captured directories outside root. Paused locks excluded contenders and released on holder death; parent death did not release a paused helper until resume/EOF. Replacing the lock inode split ownership. Linux unverified; Windows unsupported.

## Section 2: SHIPPED.md#verification-and-audit

Supported host: 4 passed, 0 failed/skipped. Python unavailable: 3 passed, 0 failed, 1 explicit capability skip. Setup: 21 checks; graph: 24 entries/62 links, CLEAN; diff and secret-name checks passed. No configured build/typecheck/lint/i18n. Fresh code/security/test/cross reviews caught scratch canaries with clean repository guards. Missing-runtime mutation gating was fixed and independently rechecked; no open finding. Independence is fresh agents in the same model family, not immunity to shared blind spots.

## Section 3: SHIPPED.md#no-gos-and-documentation

No production Python dependency, installation, compilation, manifest change, unsafe fallback, Windows claim, historical rewrite or concurrent implementation edit. No attacker-proof containment/locking claim. Scratch-only evidence required no architecture/product documentation change or bundle version bump.

## Section 4: SHIPPED.md#knowledge-and-remaining-work

[[inode-anchoring-and-stable-inode-locks]] retains measured limits. Existing path-safety-hardening and collector-robustness own threat-model/runtime/platform/migration decisions; neither scope closes. No duplicate backlog item.

## Section 5: SHIPPED.md#delivery

User selected 1 at the 2026-09-26 ship gate. Full log and final hill preserved in dated runs. Only this pitch moved to recent ships; cooldown due in two ships at closure. No commit, merge, deployment or publication.

## Section 6: pitch.md#no-gos

No production Python dependency, installation, compilation or dependency manifest; no unsafe fallback or Windows claim; no historical/concurrent-review implementation edits; no complete filesystem attacker-proof claim. Bound hostile same-user lock-inode replacement explicitly.

## Section 7: pitch.md#rabbit-holes

macOS Python 3.14.7 exposes directory-relative APIs and flock, proving availability only. Normal lock files must remain linked and unreplaced; every writer must cooperate. Planner owns moved-directory containment, helper/parent crash and timeout, legacy interoperability, Linux verification and unsupported-platform refusal.

## Section 8: log.md#2026-09-26-s1-complete

Approved bounded tests used coordinated barriers, isolated fixtures and deadlines. Removing O_NOFOLLOW or flock caused failures; outcome mutants were rejected. Initial four deliverables totalled 384 lines, supported suite 4/4 passed (550.7 ms). Captured directories escaped root; lock replacement split ownership; stopped helpers retained locks after supervisor death until resume/EOF. Setup 21 passed; diff passed; parents stayed incomplete.

## Section 9: log.md#2026-09-26-audit-complete-ready-for-ship-gate

Four fresh reviewers caught canaries and clean guards. Missing Python originally caused Missing expected rejection; baseline capability validation and explicit mutation skip fixed this required-exit defect. Final 386 lines; normal 4 pass, unavailable 3 pass/1 skip; fresh code recheck 2 pass/1 skip. No open must/should-fix. Per-API absence flags were not all separately injected; no separate surviving-process inventory, though teardown was inspected/exercised. Deterministic scenario and guard evidence does not establish production/platform coverage. Scratch canaries were reviewer probes, not real defects. No duplicate backlog or production change.

## Section 10: log.md#2026-09-26-shipped

User selected 1; closed only feasibility, archived full log/final hill, kept both production parents incomplete. Cooldown due in two ships at closure. No commit, merge, deployment or publication.
