# Shipped: orca-role-pools
Bet: 2026-10-16  •  Shipped: 2026-10-17  •  Appetite: big-batch  •  Version: 2.27.0 (one release, owner decision)

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| S0 (added) | shipped | baseline repair: `config-migrate` emits schemaVersion 3, stale v2 fixtures fixed (98 red tests at HEAD) — D1 |
| S1 | shipped | policy keeps every pool member, drops the 2-worker cap, allows self-membership, reports `pools` next to `roles` |
| S2 | shipped | `orca-start` probes every distinct pool member in pool order |
| S3 | shipped | config already rejected empty/dup pools (pin tests), example pool, `orca-vendors.md`; `config.mts` unchanged — D3 |
| S4 | skipped | live Orca concurrency spike not run (needs funded, supervised workers); default stays 3, ceiling 16 unchanged, "unverified above 3" documented — D5 |
| S5 | shipped | pure `orca-assign.mts` (round-robin by plan position, reviewer != implementer, circular rotation); 9 tests incl. determinism x1000 and in-memory mutants |
| S6 | shipped | `assign` in `dispatchScope`/`dispatchWithRetries`/`orca-run`; `resolveAssignment`; ledger `reserve` refuses overlapping live `authorizedPaths`; ledger schema unchanged |
| S7 | shipped | grader cap parameter, build skill + Cursor mirror, dispatch docs, 2.27.0 (bumped in S7 — D8) |

## No-gos honored
- Unbounded concurrency: 16 stays the ceiling. Launch authority unchanged: the gate decides on the coordinator identity before and after assignment. Swarm behavior and fan-out review: not built. Review keeps split semantics.

## Rabbit holes
- Resolved: policy truncated pools silently (fixed first); round-robin vs retry/resume (pure function + recorded owner wins); ledger schema (no change, `vendor`/`taskKey` carry it); coordinator in its own pool (allowed, gate unchanged); reviewer independence (blocked + `humanAction`); same-file contention (live-overlap refusal at `reserve`, `orca-apply` backstop).
- Open: concurrency above 3 live workers; case-insensitive path overlap on macOS; no in-place v2→v3 config conversion.
- Deviations D1–D9 in `deviations.md` (pool size is at most 3 distinct vendors; the 16 is concurrency across scopes).

## Audit
2 cycles, big-batch cap 3. Security, code and test-coverage reviewers (sonnet) plus cross-pitch (haiku), each on a scratch copy with a planted canary, all caught. 1 real must-fix (failed-then-settled attempt treated as owner) fixed; 6 should-fix fixed with ~30 mutant-driven tests; cycle 2 re-review clean and exposed a missing `unknown-liveness` holder test, fixed. See `audit.md`. Gap: review-prompt SHA-256 hashes were not recorded.

## Verify
Full Node suite 1635 tests / 1629 pass / 3 fail / 3 skipped; the 3 failures are `runtime/upgrade.test.mts` (an old-install fixture trips the agent-model-sweep doctor: Codex startup wiring, README links, mandatory `ai-workflow.toon`), unrelated to this pitch. setup-validator READY; graphify CLEAN (76 entries); doctor READY WITH WARNINGS (1, existing Runtime boundary: tests). Bun not run. No build, typecheck, lint or i18n command exists. git diff: no secret files, no debug output. Orca was requested; the start hook reported ready; no workers were dispatched.

## Upgrade note
A coordinator can now list itself and several workers, and a role can be a pool (`implementation[2]: a,b`). Dispatch callers may pass `assign` instead of `vendor`. A scope whose `authorizedPaths` overlap a live attempt of another scope is refused (`authorized-paths-overlap`): give parallel scopes disjoint paths. `orca-start` now fails if any pool member's executable is missing.

## Followups generated
See `.project/pitches/_followups.md` (orca-role-pools section): live concurrency spike, case-folded path overlap, in-place v2→v3 conversion, review-prompt hashes, upgrade.test fixture vs mandatory toon, local `ai-workflow.toon` vanishing.
