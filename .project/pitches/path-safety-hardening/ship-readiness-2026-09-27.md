# Ship readiness: path safety hardening

Status: implementation and audit complete; final ship decision pending.

## Reconciliation

S1's bounded write defenses and P2's recovery integration are complete under the explicitly
approved trusted-directory contract. Ledger commits use the same roots/journal/lock as archive
and removal recovery. Pending installer journals are preserved and block new transactions;
old journals require their original installer recovery route. Migration requires stopping old
compaction processes before running the new version.

The original promise of continuous containment against hostile ancestor renames is not
implemented. The user approved narrowing that contract before P2. Recovery and deletion gates,
ledger schema and historical records remain protected. No Python/native dependency, skill
source/vendor change or collector implementation was made in this task.

## Evidence

231 tests passed across nine relevant suites (110 direct, 121 shared callers); all three final
focused interruption/refusal tests passed after adding source/extracted preservation assertions.
Four guard mutants were caught. Relevant line coverage: 100% for registry/archive, 99.32% for
compaction. Syntax checks, diff check, setup's 21 checks and knowledge validation pass. This
repository has no build, typecheck, lint or i18n command.

Four fresh narrow reviewer retries completed after the first attempts hit a provider usage
limit. All caught their scratch canaries; real findings were addressed. A fresh cycle-2 test
review verified the new preservation assertions. No unresolved must-fix remains under the
approved contract. Read completion-audit-summary-2026-09-27.md for coverage and guard limits.

## Knowledge and followups

Decision: compaction-recovery-shares-context-and-trusted-directories (graph regenerated).
The stronger hostile-directory guarantee remains open. One new bench-hardening followup
records that its tree guard must skip secret filenames; this audit used a private safe copy.
Existing ledger symlink/context items have completion evidence and can close on ship approval.
Version 2.8.6 records the implementation and migration changes (release script uses UTC date).

## Closure prepared

On approval: create SHIPPED.md, preserve a dated run and final hill, move only this pitch from
active status to recent ships and update the ship counter. Collector status belongs to its
own ongoing work and must be preserved. No commit, merge, deployment or publication is part
of this closure. The next cooldown becomes due after this ship, subject to its own item gates.

[1] ship — close path-safety-hardening under the approved contract.
[2] hold — retain this ready-to-ship state.

## Decision

User selected **1 — ship**. Closure completed; see SHIPPED.md and the dated run.
