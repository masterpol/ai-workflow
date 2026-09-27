# Shipped: Native safety feasibility

**Bet / shipped:** 2026-09-26 • **Appetite:** small-batch
**Approval:** User selected “1” at the ship gate.

## Reconciliation

S1 shipped: four scratch deliverables, 386 lines. Coordinated filesystem/process experiments, reproducible tests, initial measured evidence and recommendations complete the feasibility scope. No production dependency or writer integration was included.

Directory-relative operations survived pathname symlink swaps but followed captured directories moved outside the root. Advisory locks excluded paused holders and released on holder death; parent death did not release a paused helper's lock until it resumed and processed EOF. Lock inode replacement demonstrated split ownership. Linux remains unverified; Windows unsupported by this spike.

## Verification and audit

Final supported-host suite: 4 passed, 0 failed, 0 skipped. Python unavailable: 3 passed, 0 failed, 1 explicit capability skip. Setup validator: 21 checks passed; graph check CLEAN (24 entries, 62 links); diff and secret-file-name checks passed. Build, typecheck, lint and i18n commands are not configured.

Independent code, security, test and cross-pitch reviews completed with caught scratch canaries and clean repository guards. One real missing-runtime mutation-test defect was fixed and independently rechecked. No unresolved must-fix or should-fix. See audit.md and per-role records.

## No-gos and documentation

No production Python dependency, installation, compilation, manifest change, unsafe fallback, Windows claim, historical rewrite or concurrent implementation edit. No claim of attacker-proof containment or locking. No architecture/product documentation update or version bump applies to scratch-only evidence.

## Knowledge and remaining work

Extracted decisions/inode-anchoring-and-stable-inode-locks; graph rebuilt. No duplicate backlog items added. Existing path-safety-hardening and collector-robustness pitches remain incomplete and own their re-shape/runtime/platform/migration decisions. This ship does not close either production promise.

## Delivery

Closed in workflow records; full log and hill snapshot archived under `.project/runs/`. No Git commit, merge, deployment or external publication performed. Cooldown due in two ships.
