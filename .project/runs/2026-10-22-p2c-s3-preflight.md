# P2c-S3 tranche A preflight — 2026-10-22

This is preparation evidence, not a committed coverage ledger or upgrade approval. No recovery archive was listed, inspected or opened. All 19 active ledgers still have schemaVersion 1.

| Pitch | Required v1 sections | Historical destination check |
|---|---:|---|
| bundle-sync-marker-fix | 11 | Pass; source approval needed |
| codex-orca-coordinator-parity | 20 | 4 changed destination(s); stopped |
| fix-workflow-runner-env | 9 | Pass; source approval needed |
| independent-rereview-catch-up | 25 | Pass; source approval needed |
| native-safety-feasibility | 10 | Pass; source approval needed |
| opencode-handoff | 7 | Pass; source approval needed |
| orca-auto-start-all-phases | 12 | 2 changed destination(s); stopped |
| orca-vendor-dispatch | 7 | Pass; source approval needed |
| orca-vendor-foundation | 21 | Pass; source approval needed |
| orca-vendor-orchestration | 2 | Pass; source approval needed |
| orca-vendor-reconcile | 7 | Pass; source approval needed |
| orca-vendor-reconcile-integration | 8 | Pass; source approval needed |
| readme-split | 8 | Pass; source approval needed |
| runner-aware-runtime-boundary-validator | 12 | 2 changed destination(s); stopped |
| runtime-test-helpers | 9 | Pass; source approval needed |
| state-multipage-report | 18 | 1 changed destination(s); stopped |
| state-quoted-fonts | 11 | Pass; source approval needed |
| ts-runtime-injection | 7 | Pass; source approval needed |
| workflow-usage-metrics | 22 | Pass; source approval needed |

All introducing-commit ledger byte comparisons passed. Fifteen pitches have unchanged old destinations. Four have historical destination conflicts; these are unresolved, not accepted exceptions.

## Historical destination conflicts

- codex-orca-coordinator-parity: `.project/pitches/_followups.md`, `ai-framework/integrations/orca-vendors.md`, `.project/knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md`, `.project/knowledge/issues/review-guard-hashes-ignored-secret-files.md`
- orca-auto-start-all-phases: `.project/knowledge/decisions/orca-auto-start-design.md`, `.project/pitches/_followups.md`
- runner-aware-runtime-boundary-validator: `.project/knowledge/patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md`, `.project/pitches/_followups.md`
- state-multipage-report: `.project/pitches/_followups.md`

## First proposed source-review batch

The following draft files contain proposed outcome links plus unresolved section mappings and absent original-body hashes. They must not be passed to apply as approvals. Compact summaries are insufficient source proof.

| Pitch | Draft |
|---|---|
| bundle-sync-marker-fix | draft |
| fix-workflow-runner-env | draft |
| readme-split | draft |

Requested authorization: read and verify the recovery sources for bundle-sync-marker-fix, fix-workflow-runner-env and readme-split, with a receipt per slug. This permits source review only. It does not authorize applying ledger or record changes. After source review, present coverage, omissions by reason and at least ten lines of the proposed record before its mutation gate.

The approved plan at P2c-S2 evidence and recovery contract requires explicit per-slug approval for each archive-reading invocation, including tier A. Source review cannot be completed before that authorization.

## Current-session evidence

- Orca startup: bypassed by original orca=normal invocation.
- legacy-upgrade status: 46 legacy; 19 A, 22 B-small, 5 B-large; no partial/upgraded records.
- All 19 read-only prepare calls succeeded.
- Git object comparison: 19 exact original ledger matches; 15 unchanged destination sets, 4 conflicts; no missing historical destinations.
- Three unresolved TOON drafts saved with create-only publication.
- No compaction transaction, active ledger replacement, final outcome record publication or legacy narrative retirement ran.
- Codex workflow metrics accepted phase.started and skill.used for build S3 before preparation; the activity pauses at the source-read approval gate.
