# Deviations: state-multipage-report

## 2026-10-08 — S0: Orca policy valid, dispatch not ready
`.project/orchestration.json` created (copy of `ai-framework/integrations/orca-vendors.json`, git-ignored). `orca-run.mts status --root .` exit 0:
policy `valid`, `eligible: true`, codex + opencode binaries present, but `dispatchReady: false` (`runtime-not-probed`; with `--probe`: `caller-unverified`, because this
session is not launched from inside an Orca terminal). Route is `normal`. Per plan, S1/S2 do not use Orca worker dispatch; they run as harness subagents
(disjoint files, same contract). No worker launched, nothing faked.

## 2026-10-08 — S1 touched `state-theme.test.mts` (1 line)
Export-key pin test needed `insideProject` after it was exported for reuse. Plan listed `state-theme.mts` only implicitly; acceptable, files count 15 with the test.

## 2026-10-08 — stale `.state-stage` blocks --apply
Stage dir doubles as lock; a crash leaves it until removed by hand (error says so). Accepted by design.

## 2026-10-08 — correction to the S0 entry
The S0 note says dispatch was not ready because the session is "not launched from inside an Orca terminal". Wrong: `ORCA_*` pane variables are set; the gate (`orca-preflight.mts:131`) failed because `ORCA_AGENT_SESSION_ID` is unset, so the live caller cannot be matched. Same wording in the 2.19.0 CHANGELOG entry; fix on next changelog pass.

## 2026-10-08 — second correction to the S0 entry (supersedes the one above)
Orca *could* launch. `status` reports `dispatchReady: false` by design; the launch authority is `orca-launch-gate.mts` `evaluateLaunch`, which deliberately accepts `caller-unverified`. Run in this session after the fact it returned `allowed: true` for codex and opencode. Phases of this pitch that ran on ordinary subagents (S1, S2, audit cycle 1, fixes) did so because I misread `dispatchReady: false`, not because Orca was unavailable. Remaining caveat: worker vendor authentication and Codex/OpenCode completion are not live-proven here.
