# Log: upstream-project-drift

## 2026-10-16 — S0
- Base was on `fix/opencode-v2-token-consumption-plugin` (`300fa80`, not merged to `main`) with an uncommitted
  `graphify.mts`/`graphify.test.mts` edit. Work branch `feat/upstream-project-drift` created from it; the dirty
  graphify edit is carried into S1.
- Climbing `8bd0c97` (OpenCode V2) is already in base as `300fa80`; no port.

## 2026-10-16 — Baseline (before S1-S8), node v24.21.0, bun 1.4.3
Tree: `0deac9a` + uncommitted graphify edit; `ai_workflow_env.json` moved aside; 52 test files.
- **GAUNTLET(node)**: 1271 tests, 1267 pass, 3 fail, 1 skip (66 s).
- **GAUNTLET(bun)**: 1262 tests, 1256 pass, 5 fail, 1 skip (197 s).
- Shared failures (pre-existing; also fail on a clean `HEAD` worktree without the graphify edit):
  `runtime/upgrade.test.mts` — "old install upgrades with its own bundle-sync…", "a locally edited script is
  kept…", "a project whose .env selects bun…". The doctor fails inside the upgraded fixture with
  `FAIL Codex startup wiring: UserPromptSubmit not registered` and `FAIL README.md: docs links: … not linked:
  setup, token-consumption, workflow-doctor…`. Climbing rewrote this test (S2 scope); check whether S2 fixes it.
- Bun-only failures: `workflow-doctor` "validates optional local policy…" and `skill-defaults` "doctor and
  setup-validator report the live caveman state…" time out at bun's 5000 ms default (child processes under
  load; known Bun full-suite flakiness followup).

## 2026-10-16 — OpenCode V2 token-consumption fix (`300fa80`) validated
- `opencode-plugin.test.mts` + `token-consumption.test.mts`: 73/73 pass on node and on bun (4 V2 cases).
- Export shape under bun: default `{ id: "token-consumption", server: fn, setup: fn }`.
- Live run, OpenCode v2.0.29 (`opencode run "Reply with exactly: OK"`, model kimi-k2.7-code, exit 0): metrics
  `updatedAt` moved from 2026-10-09 (no OpenCode event recorded since then) to 2026-10-16T15:13:12Z; opencode
  completions 127→128, reported usage 127→128, tokens input +11,980, output +3, reasoning +19, cache read +1,536,
  reported cost $0.0118.
- Climbing's `.opencode/plugins/token-consumption.ts` is byte-identical to base. LAH and RN still carry the
  pre-V2 plugin (+54 −174 vs base): their OpenCode sessions record nothing until `workflow-v3-rollout` (or an
  earlier sync of `.opencode/`).

## 2026-10-16 — Wave 2 start (Orca)
- Interim pin 1.4.224 committed as `5a6b656` (D5). Orca start: `ready` (coordinator claude, workers codex, opencode).
- Previous binding `run_e1844e888149` ("S0 smoke…", 2026-10-08) was unrelated. With owner approval, created and
  bound `run_3bd0c1193ed8` (objective "upstream-project-drift: …(2.23.0)").
- Graphify part of S1 (dangling-edge overlay) was already in the tree: `bun test graphify.test.mts` 16/16,
  `graphify.mts --check` CLEAN. The coordinator keeps it; the S1 worker ports the rules only.
- Runner for this pitch: bun (`ai_workflow_env.json`), at the owner's request.
- S1 dispatch attempt `updrift-s1-1` refused before launch (`runtime-version-unsupported`: Orca app auto-updated
  to 1.4.227). Nothing launched. S3 pulled forward (D6).
- S3 done: `isSupportedVersion` (strict x.y.z, ≤6 digits per part, floor 1.4.224) in preflight, launch gate
  (reports the observed version), orca-start worker check. Drift fixtures moved to 1.4.223 (below floor). Table
  test + 1.4.227 probe/gate/start cases. bun 198/198, node 198/198. Mutant (`>`→`<`) fails 4 preflight tests.
  `grep 'appVersion !== SUPPORTED_VERSION|=== SUPPORTED_VERSION'` empty. Start decision `ready` on 1.4.227.
