# Shipped: unified-toon-config
Bet: 2026-10-16  •  Shipped: 2026-10-16  •  Appetite: big-batch  •  Version: 2.25.0

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| a1 | shipped | `runtime/config.mts` primitives (parser, `inspectPath`, `readBoundedFile`, `wxRename`, `oexLock`, `loadConfig`) |
| a2 | shipped | 7 parser-guard mutants; d5-d7 contract fixes |
| a3 | shipped | 5 writer/path mutants, alias, subprocess, lock tests; d8-d10 (dual-hash/`.rejected` proofs moved to b3) |
| c1.1 / c1.2 | shipped | readers via `loadConfig`, grader on `wxRename`, 11 reader-test files, no-race tests |
| c2.1-c2.4 | shipped | doctor + setup-validator checks, root and framework docs, build SKILL mirrors, hook notes |
| b1-b3 | shipped | `config-migrate.mts` (50+ tests, 20+ mutants), Bun gate, bundle-sync checks |
| d | shipped | legacy window note (`X11_no_remove`), modes cutover (`loadModes`), orphaned docs/flags |
| reshape | shipped (unplanned) | owner redesign: `engines`/`orchestration` -> `integrations.orca`, **schemaVersion 2**, per-coordinator `workers` (d42) |

## No-gos honored
- Legacy files never deleted by the migrator; no `flock`; no regex backtracking on the TOON file (a ReDoS found by audit was fixed).
- Deviation: `maxConcurrentWorkers` widened to 1..16 by the owner (d46/d47); `orca-policy` follows.

## Rabbit holes
- Resolved: parser grammar subset, symlink/TOCTOU guards, fail-closed fallback, mutant harness.
- New: Orca `worker-list` output now exceeds the 256 KiB cap, blocking Orca-requested phases (followup).

## Audit
2 cycles, orca=normal (Orca blocked by the above), reviewers `independent: no` (no canary). Cycle 1: 1 must-fix (ReDoS) + 15 should-fix fixed. Cycle 2: 1 must-fix (raw value in refusal text) + 7 should-fix fixed. Deviations d1-d55.

## Verify
Full Node suite 1494 tests / 1492 pass / 0 fail / 2 skipped; Bun config, migrator, bundle-sync 143/143; setup-validator READY; doctor READY WITH WARNINGS (1, existing); graphify CLEAN; docs-links 0 broken. `pre-ship-verify.mts` fails in this repo (no package.json or Muro verifier): not applicable here, replaced by the above. No build, typecheck, lint or i18n command exists.

## Followups generated
See `.project/pitches/_followups.md` "unified-toon-config leftovers".
