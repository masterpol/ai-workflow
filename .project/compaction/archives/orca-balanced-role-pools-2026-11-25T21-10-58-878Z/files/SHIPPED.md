# SHIPPED: orca-balanced-role-pools

**Bet**: 2026-11-24  •  **Shipped**: 2026-11-25  •  **Version**: 2.54.0  •  **Appetite**: big-batch  •  **Mode**: Orca, Run `run_911f7939687b`

## Summary

Orca role pools now balance work. A dispatch with `assign` picks the least-loaded eligible member of its Run, counting both roles, with the plan position breaking ties (the old round-robin when loads are equal).
Dispatch takes an optional `runId`, and the pick is re-checked inside the claim lock. A recorded owner still wins, a reviewer is never the implementer, and rotation happens only after a proven-clean failure.

## Scope status

| Scope | Status | Who | Evidence |
|---|---|---|---|
| P1 least-load picker | done | Orca opencode (by hand) | no-load result identical to the old round-robin |
| P3 `runId` dispatch input | done | Orca codex (by hand) | plus an unplanned duplicate-key check |
| P2 ledger `runId`, Run-scoped load, re-check under the lock | done | Orca opencode, picked with `assign` | mutants fail |
| P4 golden case executes | done | Orca codex, picked with `assign` and `runId` | grader: 9 executed cases pass at ship of the build |
| C1 guidance, contract test, release | done | coordinator | `orca-vendors.md` owns the rule; `2-build.md` points to it |

Live: a smoke dispatch with plan position 3, where round-robin would give codex, picked opencode because it had the least load.

## No-gos honoured

- No change to launch authority, the gate, retries, rotation after a clean failure or the overlap guard. An owned task is never reassigned.
- No new config key, schema version or ledger migration (`runId` is optional and set once). No new Orca CLI call. No playbook text copied into skill Orca blocks.
- Sequencing (X1): 2.53.0 was committed before this release.

## Rabbit holes

- **Resolved as planned:** determinism and resume, what counts as load, unequal pools, tie order.
- **Surfaced new:** a member that fails before any claim never gains load (issue `a-load-balancer-that-never-charges-a-failed-launch-picks-it-forever`); the re-check design (pattern `recheck-an-optimistic-pick-under-the-claim-lock`).

## Deviations

- P3 added a duplicate-key check, and unknown or duplicate dispatch keys now exit 2 (usage) instead of 3. This is breaking for scripts that read exit codes.
- The stuck attempt `r5c-1` from an earlier pitch blocked P4 through the overlap guard; the owner approved settling it.
- Mutant tests moved off `Bun.Transpiler`, which Node lacks.
- **After the audit**, a `/code-review` before the merge led to more changes: unlaunchable members are skipped, the re-pick after `load-changed` is re-checked (up to three tries), load picks report `source: "least-loaded"`, and the Run-id grammar lives once.

## Audit

2 cycles by Orca workers; no must-fix. S1 to S5 fixed; S6 (the branch also carried 2.53.0) was resolved when PR #12 merged all of it.
**`independent: no`** (no canaries). **The post-audit code-review changes were not audited**; they have tests, and the new ones were not mutant-checked.
Record: `.project/analysis/2026-11-24-orca-balanced-role-pools-audit.md`. Raw reports: `audit-reports/`.

## Verification at ship

- Full suite on an independent clone of `main` at `a6be3f9`: **2,329 pass, 10 skip, 0 fail**. This pitch's code is unchanged since that commit.
- The five Orca test files again today: 232 pass, 0 fail under Bun and under Node.
- `pre-ship-verify.mts` fails as it does for this package-less bundle, so direct checks were run instead. No build, typecheck, lint or i18n command exists.

## Doc updates

`ai-framework/integrations/orca-vendors.md` § Assignment and a pointer in `2-build.md` were written during the build. No further doc change.

## Followups

See `_followups.md`, section "From orca-balanced-role-pools".
