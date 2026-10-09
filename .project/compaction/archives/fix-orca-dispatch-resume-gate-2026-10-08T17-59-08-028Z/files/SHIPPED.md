# Shipped: fix-orca-dispatch-resume-gate

Bet: 2026-10-08 • Shipped: 2026-10-08 • Appetite: bug-fix (single implicit scope, no `/shape`, no `/plan`)

Originated from a live Orca smoke (`runs/orca-smoke-2026-10-08.md`) that produced two real findings.

## Scopes

| ID | Status | Notes |
|----|--------|-------|
| S1 | shipped | F1 — `dispatchScope()` re-checks the switch and the launch gate before `resumeExisting()` |
| S2 | shipped | F2 — `parseArgs` accepts repeated `--vendor` on `status`; rejects it elsewhere |

Single implicit bug-fix scope; the two findings shared one root-cause area (`orca-dispatch.mts` gate ordering) and one CLI surface.

## No-gos honored

- ✅ No schema change to `ai_workflow_env.json`, `.project/orchestration.json` or the ledger format.
- ✅ No new rule promoted at ship; the fix follows `patterns/a-gate-must-not-trust-its-own-author`, which the cooldown had already codified.
- ✅ No live worker spawned. The smoke and the fix were verified with fakes, temp git repos and read-only probes only.
- ✅ No `.env` read and none added. Runtime already sourced `ai_workflow_env.json`; only stale documentation was corrected.

## Rabbit holes

- ✅ Resolved as planned: the CLI's exit-code contract (`resume` mapped to 0) was the ambiguity. Resolved by making the library refuse instead of changing the exit mapping, so a `resume` still means "a worker exists, inspect it" and a forbidden policy can no longer produce one.
- ⚠️ Surfaced: `workflow-doctor` reports `WARN | OpenCode | could not resolve config` because `opencode debug config` starts a managed service whose port is already held by the running OpenCode session. Environmental, not a code defect; recorded as a followup.
- ⚠️ Surfaced and reverted: an earlier build step recreated `.env.example` from `HEAD` on the belief that it had been deleted. CHANGELOG 2.18.0 records that file as **replaced** by `ai_workflow_env.example.json`, which was present all along. The recreation is removed; the mistaken fix is written up in `log.md` rather than quietly dropped.

## Verification (final gauntlet, all six phases)

| Phase | Result |
|-------|--------|
| `<build-command>` | N/A — `stack.md`: no build step; `.mts` runs directly on Node |
| `<typecheck-command>` | N/A — `stack.md`: no typecheck command |
| `<lint-command>` | N/A — `stack.md`: no lint command |
| `<test-command>` | 1037 pass / 0 fail / 1 skipped (Node full suite, non-watch) |
| `<i18n-check-command>` | N/A — not an i18n project |
| `git diff` | no uncommitted `.env`; no debug code in touched files |

Validators: `setup-validator.mts` READY (22 checks), `workflow-doctor.mts` READY WITH WARNINGS (1, environmental), `graphify.mts --check` CLEAN.

## Followups generated

- `workflow-doctor` OpenCode config probe cannot run inside a live OpenCode session (service port already bound). Acknowledged, not fixed here.
- Bun full-suite parity for the whole repository exceeds the 400 s shell budget (`token-consumption` / `browser-runtime` integration tests). Bun parity was verified on the touched files only (66/66).

## Doc updates

`ai-framework/integrations/orca-vendors.md` — the `--vendor` repeat behaviour and the resume-gate refusal are now observable CLI behaviour. Not updated in this ship: the doc already described `status` per-vendor and the exit-code table already listed `resume` as a distinct outcome from `launched`, so no wording became false. No ADR-worthy decision (the fix follows an existing codified pattern).
