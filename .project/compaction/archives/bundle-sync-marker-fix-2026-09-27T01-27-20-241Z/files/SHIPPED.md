# Shipped: Bundle sync marker fix

**Shipped:** 2026-09-26
**Approval:** User selected “1” at the ship gate for the two completed fixes.

## Scope reconciliation

S1 is done. Marker files retain each unapplied entry's prior effective base; repeated unverified/conflict/local/removal runs remain correctly classified.

## Verification

Combined relevant verification before the gate: 286 tests, 285 passed, zero failures, one unrelated Linux-only collector test skipped on macOS. The three affected sync/HTML/snapshot suites were rerun at closure. Workflow doctor, setup validator, graph check, and git diff --check pass. No build, typecheck, lint, or i18n command is configured.

## Audit

Fresh read-only code, security, test, and cross-pitch reviews completed. No unresolved findings for this pitch. See audit-cycle-1.md. Independent-rereview-catch-up must review settled source and rerun tests after any later patch.

## No-gos honored

Instance customization and existing sync overwrite policy remain protected. Report CSS stays bounded and validated. No external stylesheet loading, general CSS evaluation, historical deletion, or application changes were added.

## Rabbit holes and deviations

The planned per-entry marker and font lookup contracts are implemented; deviations.md records no implementation deviation for this pitch. Detailed behavior and mutation evidence is in log.md.

## Knowledge and followups

Design contracts extracted to decisions/effective-sync-bases-and-bounded-font-discovery. No new followup for this pitch. Separate path-safety-hardening and collector-robustness remain incomplete and are not shipped by this approval.

## Delivery

Closed in workflow records. No Git commit, merge, deployment, or publication performed.
