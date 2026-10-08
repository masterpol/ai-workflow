# Shipped: orca-auto-start-all-phases

**Shipped**: 2026-10-08  •  **Version**: 2.20.0  •  **Appetite**: big-batch, narrowed after critique (core + Claude hook)  •  **Audit**: 2 cycles, zero must-fix at exit

## Pitch ↔ implementation

| Pitch promise | Result |
|---|---|
| Switch on: Orca decision runs on every workflow phase; switch off or unset: normal workflow, no side effects | Done for Claude Code: `decideStart`, `orca-run.mts start`, a `PreToolUse(Skill)` + `UserPromptExpansion` hook for the 12 phase skills. Off is silent and spawns nothing |
| Switch on but Orca not ready: stop and ask, never fall back silently | Done: blocked -> hook exit 2 / CLI exit 4 with the reason and "re-invoke with orca=normal"; `build`/`audit`/`ship` prose and Cursor mirrors say stop and ask |
| `orca=normal` per-call override | Done: whole token in the raw args, one call, only after the switch is true; quoted or embedded tokens ignored |
| Readiness from the launch authority | Done: `evaluateLaunch` with the coordinator vendor + worker membership, presence, worker-side `orca` path, status probe |
| Start block in each of the 12 skills and mirrors; Codex/OpenCode/Cursor triggers | NOT in this pitch (cut after critique A1: about 41 files). Later pitches |
| Use Orca orchestration for the work | Done: P0, S1-S5 and both audit cycles ran through real Codex and OpenCode workers; critique too |

## Scopes
P0 done, S0 done, S1 done, S2 done, S3 done, S4 done, S5 done. 15 delivery files (at the cap): `orca-start.mts`/test, `orca-run.mts`/test, `orca-start-hook.mts`/test, `hooks.json`, `.claude/settings.json`, `orca-vendors.md`, 3 skills + 3 Cursor mirrors. About 1,000 lines. VERSION/CHANGELOG are bookkeeping.

## No-gos honored
Orca never started or probed when the switch is not exactly `true`; no silent fallback; dispatch core, ledger, reconcile and launch-gate checks untouched; worker output never chose commands, paths, vendors or approvals; gates stay human; Codex/OpenCode/Cursor triggers not claimed live; no `.env*` read; no new configuration file.

## Rabbit holes
R1 typed commands: observed live, `UserPromptExpansion`. R2 exit 2 blocks; timeout lets the call through, so the script owns a 5 s deadline. R5 readiness source: `evaluateLaunch`. R10 deadline + output separation: done. R11 worker identity: no env marker exists (observed), flag + terminal-handle lookup, unverifiable -> blocked. R12 refusal after ready: prose changed, dispatch core untouched. R13 bypass grammar: tested. R14 off path re-exec: the hook still goes through `runDirect` (invariants require it) but its command forces `AI_WORKFLOW_RUNNER=node`, so a missing optional runner cannot make it fail open (found and fixed in audit). R15 validator overlap: production files clean; the two test files' direct `node:*` imports are a followup. R3/R4/R6/R7/R8/R9: adapters and skill rollout deferred; per-phase minimum = the start line; deadline budgets done; worker-side `orca` path check done; appetite narrowed.

## Deviations (see deviations.md and audit-cycle-1/2.md)
Hook keeps `runDirect` (partly met R14, closed by the runner prefix); one gate check for the coordinator then per-worker membership, not per-worker gate calls; `start` needs `--root`; coordinator finished build's second Orca section. Audit found and fixed a relative-PATH hijack of the worker lookup and a fail-open hook; both reproduced by the coordinator before fixing.

## Verification at ship
Node full suite 1149 tests: 1148 pass, 0 fail, 1 skipped. Bun full suite 1140 tests: 1139 pass, 0 fail, 1 skipped. setup-validator READY, graphify CLEAN. No build, typecheck, lint or i18n command exists in this repo (skipped). Live: the hook printed "Orca: ready (coordinator claude, workers codex, opencode)" on real phase-skill calls (checkpoint, audit, ship); blocked, bypass, off and bad-stdin paths run by hand. One intermittent `token-consumption` test failure appeared only while the Bun suite ran at the same time (passes 3/3 alone and in the final clean run; also fails on a clean HEAD sometimes).

## Knowledge extracted
Issue `a-probe-child-ran-a-bare-command-with-the-parent-path`; pattern `a-blocking-hook-owns-its-runner-and-its-deadline`; decision `orca-auto-start-design`. Earlier today: `status-dispatch-ready-false-is-not-launch-authority`, `orca-workers-differ-from-the-coordinator-environment`.

## Followups
Four added to `_followups.md` (fail-closed `runDirect` exit for hooks, test files off direct `node:*` imports, the 12-skill rollout and host adapters, coordinator-side launch-gate probe env).
