# Shipped: installed-sync

Track: P2d. Parent campaign: connected-memory-consolidation. Bet: 2026-10-21. Prepared: 2026-10-23. Appetite: big-batch; explicit qualifications below. State: shipped 2026-10-23 after explicit owner approval of the exact proposal (hash below). Releases already recorded: 2.44.0, 2.45.0 and 2.45.1.

An installed project receives a bounded dry-run/apply migration and explicit two-pass sync instructions. Inventory counts each legacy slug once, refuses unsafe/unavailable inputs instead of reporting zero, and preserves local overlay, managed skills and instance data.

## Scope reconciliation

| Scope | Result | Behavior |
|---|---|---|
| P2d-S1 | done; proposed for ship | Bounded project migration |
| P2d-S2 | done; proposed for ship | Sync next steps and doctor inventory |
| P2d-S3 | done; proposed for ship | Old/new installed and fresh project acceptance |

No planned scope in this track is silently deferred. Historical scope counts and intermediate failures stay in [hill](../hill.md), [log](../log.md), [plan](../plan.md) and [deviations](../deviations.md). All 20 scopes across the four tracks are done; four distinct ship approvals/receipts are required by R14.

## Ownership and release attribution

consolidation-migrate, bundle-sync next steps/pending guard, workflow-doctor informational inventory, installed-upgrade and runtime upgrade fixtures, versioning docs and bundle-sync canonical/Cursor mirrors.

## Deviations, no-gos and rabbit holes

D16–D21 and subsequent log clarifications retain the cohesive migration-unit exception and owner-approved fixture resume after three failures. The acceptance copy excludes source-owned skill directories and preserves target local files. Real Graphify rendering uses an empty AST base in installed fixtures; this is not a full upstream AST scan or deployment. No P2d 1500-line stop was crossed in the recorded scope accounting; whole shared-file sizes are not attributed as owned LOC.

No secret files were used for closing evidence. No commit, push, recovery deletion or downstream rollout is included. P2b ship-consolidate-step, P3a retire-safely and P3b state-from-records remain un-bet. The workflow-v3-rollout carry is separate. Both explicit campaign closing exceptions are retained in [owner acceptance](../closing-exceptions.approved.toon).

## Audit acceptance

Separate clean P2d/P2c cycle1, owner approved. Code and coverage fresh independent installed passes: 24.391s and 24.660s. Security source/control review fresh; installed runtime resumed 3/3 in 26.030s under a bounded 35s scratch allowance after two retained 25s timeouts, explicitly independent:no for that completion. Production limits unchanged.

## Verification and its limits

The owner-approved direct-check route is documented in [ship verification](../../../runs/2026-10-22-connected-memory-consolidation-ship-verification.md). The package-less pre-ship wrapper still refuses with “No package.json or Muro document verifier found.” It was run and failed; it is not reported as passed. No temporary manifest or changed security/timing bound was used.

Supported full Node command: node ai-framework/scripts/run-tests.mts --runtime node --workers 1. Result: 86 files, 2712 tests, 2709 passed, zero failed, three existing skips, exit 0, 436.955 seconds. This is reused after records/knowledge-only closing edits because the 172 implementation-file hashes remain unchanged. The interrupted sandbox attempt is not a pass. No application build, compiler, package lint or i18n command exists for this bundle; setup validates the 175 TypeScript scripts. No UI, translated strings, new dependency or AI prompt applies. Bun is not represented as a newly completed whole-suite gate.

The separate evidence-path repair is already shipped: exact original 36920 bytes, one consumer path constant, final 54/54 parent and independent 347/347 child checks. Historical 72 runs, 51 pass/21 fail, twelve seeded bad, one Cursor not-run and Claim: blocked remain unchanged. The initial child346/347 failure cause is unconfirmed; FRLE-D1 diagnostics and existing timing work remain deferred.

Final setup, graph, relations, outcome lint/navigation, provenance, mirror and content/link checks are recorded in the shared ship verification run. Original sixteen decision files, all retained source supplements, v1 bytes and approval hashes remain intact. Later legitimate maintenance of living knowledge/index/backlog destinations does not rewrite apply-time binding evidence.

## Knowledge, followups and documentation

Existing installed-skill-wrappers-ship-as-orphans issue confidence raised to high; no new duplicate issue. Source/instance boundary flagged for cooldown. Full incident dispositions and read accounting: [knowledge extraction](../knowledge-extraction.md). Four new knowledge entries and two existing updates are shared totals, not four new entries per track. No rule promotion. Versioning-and-sync and bundle-sync playbooks describe actual two-pass delivery. Downstream rollout is tracked separately and has not run.

## Approval and closure

The owner approved this exact proposal on 2026-10-23 without revision. Approved proposal hash: sha256:2e7b794a8deaf2f82eebf8ca2439875f2d9336bfb3911ace0071826e36ee31da (receipt: [p2d.approved.toon](p2d.approved.toon)). Closure publishes this record and [the dated run](../../../runs/2026-10-23-installed-sync.md), and increments the cooldown counter once. The umbrella stays active until the P1 and P2a receipts exist (P2c is already shipped). No commit, push, recovery deletion or downstream rollout is included.

