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
- OpenCode launches `updrift-s1-1` (new-child) and `updrift-s1-2` (no placement) failed at `agent_readiness`:
  the worker's client tried to start its own server and found port 49374 held by a stale
  `opencode serve --service` (PID 13944, started 2026-10-15). Climbing hit the same failure on 10-15.
- Codex fallback `updrift-s1-3`, `updrift-s6-1` and `updrift-s8-1` failed at `agent_readiness`: Codex showed an
  interactive update prompt (0.162.1 → 0.163.0). It was not answered. Those three terminals are still retained.
- With owner approval (standing rule), `opencode service stop`. Port free. Relaunched on OpenCode: S1 `updrift-s1-4`
  (`ctx_c675a2ef33bb`), S8 `updrift-s8-2` (`ctx_5ae0a634fff6`; adds climbing `.opencode` fixes cca360a +
  plugins/package.json), S6 `updrift-s6-2` (`ctx_36b765ef481d`). The second and third workers share the server
  that the first worker started.
- Stale ledger entry `attempt-v223-opencode-1` (10-09; Orca: outcome failed, process exited) held a slot.
  Archived to `.project/metrics/orca-ledger-archive-20261016/` with owner approval.
- S1 done. Worker `updrift-s1-4` worker_done collected, diff reviewed by the coordinator (generic only), reconciled
  `integrated` (graph-check baseline + after OK). Exits: `grep exhaustive` OK; graphify tests node 16/16, bun 16/16;
  `graphify.mts check` exit 0.
- S8 done. Worker `updrift-s8-2` worker_done collected. Reconcile first refused `apply:baseline-moved` because the S1
  commit had moved HEAD. The S8 worktree was fast-forwarded to `f36db13` (no shared files); reconcile then
  returned `integrated` with humanConfirmed (owner; `.opencode` adapters). The coordinator restored base text the
  worker had reverted (see the ledger "S8 merge notes"). Exits: docs-links exit 0; next-pitch 0; `bun ai-framework|test`
  in workflow 0; no project names; skill-defaults node 27/27 and bun 27/27 (with opencode-plugin).
  Lesson: reconcile every worker in a wave before committing any scope.
- S6 done. Worker `updrift-s6-2` worker_done collected and the diff reviewed. The worktree was fast-forwarded to
  `ea5e5c0`, then reconciled `integrated` (humanConfirmed: owner; hooks are check definitions; workflow-doctor check
  OK). Coordinator fix: in token-consumption.test.mts the concurrent-writer children inherited the
  `AI_WORKFLOW_RUNNER` from the repo's `ai_workflow_env.json` (bun). The collector, imported under `node -e`, saw
  itself as invoked directly (`process.argv[1]`), re-ran itself synchronously under bun with stdin inherited, and
  hung at the barrier. The worker missed it because its worktree had no runner setting. The children now get
  `AI_WORKFLOW_RUNNER=node`. Exits: 141/141 node, 141/141 bun (`--timeout 30000`); stuck-uphill
  `$CLAUDE_PROJECT_DIR` path count 1; `"bun ` in hooks.json 0; 1 MiB prompt, >64 KiB args, symlinked
  hill/audit log, bad packageManager covered by tests; doctor exit 0.
- S2 done (see D7). Exits: runtime node 3 upgrade failures fixed; bun runtime 174+/176 (load flake only);
  doctor `Runtime boundary` production 0 violations; X3: only new `process.env` read is `SystemRoot` (Windows
  taskkill path, not config). GAUNTLET(node) 1287 tests: 1284 pass, 2 fail (load flakes, each 3/3 alone),
  1 skip (baseline 1267/3). GAUNTLET(bun) 1283 tests: 1281 pass, 1 fail (`workflow-doctor` 5 s bun timeout,
  decision 6), 1 skip (baseline 1256/5). Linux Docker 69/0/5 skipped.
