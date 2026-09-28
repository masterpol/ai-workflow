# Shipped: Path safety hardening

**Shipped:** 2026-09-27
**Approval:** User selected 1 at the final ship gate.
**Contract:** The user approved trusted project directories and ancestors; continuous containment against hostile ancestor replacement remains outside the guarantee.

## Scope reconciliation

S1 and P2 are done under the approved contract. Existing static-symlink and observed-ancestor-swap guards remain intact. Ledger commits now share their transaction roots and compaction journal namespace with archive/removal/recovery. New writes refuse pending compaction or legacy installer journals; old journals retain their original installer recovery command. README requires quiescing old compaction writers before migration.

## Verification

231 tests passed across nine direct/shared-caller suites. Three final focused tests passed after adding source/extracted-content preservation assertions. Real SIGKILL fixtures verify prior ledger bytes or prior absence, journal/lock cleanup and legacy recovery. Four author-run guard mutants were caught. Relevant line coverage: registry/archive 100%, compaction 99.32%. Setup validator's 21 checks, graph, syntax and whitespace checks passed. No build, typecheck, lint or i18n command is configured.

## Audit and confidence

Code, security, test and cross-pitch review completed after one fresh narrower retry per role following provider usage-limit failures. All four caught their verified scratch canaries. The migration documentation and preservation assertion findings were addressed; the latter received a fresh cycle-2 recheck. No unresolved must-fix remains for the approved contract. Narrow review coverage, unchanged-source checks, concurrent unrelated writes, invalid reviewer mutation instrumentation and the private secret-excluding guard are documented in completion-audit-summary-2026-09-27.md and per-role records. Independence means fresh context within the same model family.

## No-gos and remaining limitations

No new runtime dependency, ledger schema, retention policy, deletion approval, skill fetching or vendor-mirror change. Historical pitch and native-spike evidence remain intact. Hostile concurrent directory relocation is not solved; unsafe cleanup can retain a temporary file rather than follow a refused path. Collector work is separate and is not shipped by this approval.

## Knowledge and followups

Decision: [[compaction-recovery-shares-context-and-trusted-directories]]. The graph was regenerated. Ledger symlink refusal and mismatched transaction-context followups close with this ship; the stronger TOCTOU requirement stays open. One new followup concerns excluding secret filenames from the review bench tree guard.

## Delivery

Version 2.8.6 records the change (release script date is UTC). The full build/completion logs and final hill are preserved in .project/runs/2026-09-27-path-safety-hardening.md. This session performed workflow closure, not a Git commit, merge, deployment or publication. Cooldown is now due and was not run as part of the user's path-safety-only scope.
