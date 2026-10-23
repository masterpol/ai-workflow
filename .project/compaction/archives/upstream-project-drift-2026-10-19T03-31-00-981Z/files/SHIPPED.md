# Shipped: upstream-project-drift
Bet: 2026-10-16  •  Shipped: 2026-10-16 (release 2.23.0, commit 58cfd7f)  •  Appetite: big-batch

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| S0 | shipped | drift ledger, 178 rows (D3, D4: most climbing docs/rules and RN rewrites are project-local) |
| S1 | shipped | rules + graphify finish |
| S2 | shipped | runtime child ownership; three climbing fixes needed first (D7); Linux Docker 69/0 |
| S3 | shipped | Orca minimum version 1.4.224, pulled forward (D6) |
| S4 / S5 | shipped | task ownership; apply/admit/grader taken from climbing (D9) |
| S6 / S7 / S8 | shipped | hooks hardening; doctor/validator/skill tests (S7 applied by hand, D9); templates and phase docs |
| S10 | shipped (added, D8) | OpenCode port freed before the first OpenCode worker |
| S9 | shipped | 2.23.0, GAUNTLET node 1327/0, bun 1323/0; sync proof in the ledger (131/178 rows match, rest explained) |

## No-gos honored
- Projects (climbing, LAH, RN) untouched: `git status --porcelain` identical before and after, HEADs `02a2f91`, `48a721d`, `bfb81b6`.
- Deviation: S3 pulled forward and S10 added (owner approved).

## Rabbit holes
- Resolved: sync conflicts from local edits, runner-aware tests, Orca version grammar.
- New: flaky-under-load tests; 2.22.x attempts cannot be reconciled after 2.23.0; Codex workers stop at an update prompt.

## Verify (re-run 2026-10-16 at the unified-toon-config head, which contains this pitch)
Node suite 1494 tests / 1492 pass / 0 fail / 2 skipped; Bun 143/143 on the config files; setup-validator READY; doctor READY WITH WARNINGS (1, existing); graphify CLEAN; docs-links 0 broken. No build, typecheck, lint or i18n command exists here.

## Open at close
- Release 2.23.0 is not on `main`: it lives on `feat/upstream-project-drift`, and `feat/unified-toon-config` was cut on top of it (31 commits ahead of `main`). One merge or PR carries both. Owner decisions 7 and 8 (merge/PR) are still open.
- Sync proof used dry runs only; no project has been synced.

## Followups generated
See `_followups.md`, section "upstream-project-drift leftovers (2026-10-16)".
