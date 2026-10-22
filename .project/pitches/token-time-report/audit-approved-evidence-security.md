# Approved evidence-pass record: security

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (.project/metrics/token-time-report-audit/proposed-evidence-pass/guard-after.json) and scratch-integrity.json
prompt-sha256: 6de53f80f0108439065b0dbac3fd165c1ba8420d908613ec4f1e316c9b7cde41
model: claude-sonnet-5-5
cross-file interactions: reviewed

## Coordinator assessment

Fresh reviewer, original author model family; this does not prove independence from that family's blind spots. Required scope is the exact unfinished TASK.md checks, not a new full audit. All source bytes in every scratch copy match the prepared manifest except its deliberate defect; the live repository guard is clean. All four exact worker_done messages were accepted, workers released and attempt ledgers settled. The older human-owned retained resource remains untouched.

All three task checks were completed, with executed lease/no-file/refusal/release proofs and a static runtime/environment trace. The trusted-operator parent-environment behavior is explicit, not an environment-isolation claim. Source citations were misnumbered in the raw report; the actual canary site is review-bench.mts:175, confirmed by its manifest and exact source diff. Its executed POC detects that precise omission.

| Finding / check | Verified | Disposition |
|---|---|---|
| Planted defect at ai-framework/scripts/review-bench.mts:175 | yes, explicit independent finding with executed test/POC and source/manifest comparison | Scratch only; canonical source retains the guard |
| Automated raw citation check | false | Misnumbered source citation; corrected by coordinator after semantic/POC verification, without editing raw report |
| Required TASK.md checks | yes, bounded execution/static evidence as specified | Completed with the explicit proof limitations above |

Exact dispatched prompt: `.project/metrics/token-time-report-audit/proposed-evidence-pass/prompt-security.txt`. Raw completion, report and release receipts remain in that local evidence directory. Worker self-assigned metadata below is preserved verbatim; the coordinator owns the verified assessment above.

## Verbatim worker report

independent: yes
read-only: verified by scratch-only reads, POCs run in mkdtemp projects, no live diff/git commands
model: claude-sonnet-5-5
cross-file interactions: reviewed
prompt-sha256: not-computed (no prompt hash supplied in brief)

# Security evidence pass: ttr-evidence-security-00sycsjm

Role: security-reviewer. Scope: the 3 required checks in TASK.md. Everything was read from the scratch copy by absolute path.

## Verdict: BLOCK (1 HIGH finding; checks 1 and 2 pass)

## Findings

| # | Sev | File:line | Finding | Failure scenario | verified |
|---|-----|-----------|---------|------------------|----------|
| 1 | HIGH | ai-framework/scripts/review-bench.mts:149-165 (`walkTree`/`visit`; `skip` at :152 omits `SECRET_NAME`, :17) | Final guard `walkTree` never applies `SECRET_NAME`. Any regular file ≤2 MiB under `GUARD_ROOTS` is read via `fs.readBytesSync` and SHA-256-hashed, including `.project/.env`, `.claude/settings.local.json` and `.claude/credentials.json`. The contract requires secret-shaped paths to be skipped BEFORE any filesystem read and says hashing a protected file is not allowed. `readGuarded` (:84) enforces the rule, but `walkTree` does not reuse it. | `guard snapshot` on a tree holding `.claude/settings.local.json`, `.claude/credentials.json` and `.project/.env` read all three. Also: a secret file ≥2 MiB is stat'd only, but any smaller one is hashed and its digest is written to the snapshot file. A secret-shaped symlink's `readlink` target is also recorded. | YES, executed: POC `poc/guard-poc.mts` recorded `READS ["readBytesSync .project/.env","readBytesSync .project/ok.md","readBytesSync .claude/credentials.json","readBytesSync .claude/settings.local.json"]` |

Suggested fix (not applied; source edits are forbidden): in `visit`, test `SECRET_NAME.test(rel)` before `lstatSync` and return without recording or reading (or record a fixed `X:secret` marker). Add a test with a secret-shaped file and a read-recording `fs`.

No other findings that meet the evidence bar. Not findings: known deferred TTR-A1..A4 and the accepted limits (non-atomic publication, recheck-to-syscall race).

## Checklist

### 1. `withLease` / metrics-lock: PASS (executed + inspected)
- Static: `withLease` (`ai-framework/hooks/scripts/metrics-lock.mts:100`) only calls `acquire`. `acquire` calls `endpointFor`, which uses only `realpathSync` + sha256, then `deps.net.tryListen` on loopback. It creates no file or directory. `release` runs in a `finally`. A skip returns before any listener is held.
- Static: `collectSources` (`flow-report.mts:~99`) calls `metricsDirectory(root,false)`, which returns `null` instead of `mkdirSync` when `.project/metrics` is missing. `withMetricsLease` (`workflow-metrics-state.mts:646`) pins `guardedMetricsDeps` (lstat only) before the lease and rechecks the identity on every fs call. The legacy-lock check uses `lstat` only.
- Executed (`poc/lease-poc.mts`):
  - A: missing metrics dir → `ok:true`, tokens `missing`, tree stayed `".project"`.
  - B: empty metrics dir → `ok:true`, tree unchanged.
  - C: lease held by another holder → `{"ok":false,"reason":"metrics lease unavailable; event not recorded"}` after ~998 ms, no files created; the lease was then reacquirable (the refusal leaked no listener).
  - D: lease free after a successful preview.
  - E: legacy `.token-consumption.lock` → fixed refusal reason, lease free afterwards.
  - F: symlinked `.project/metrics` → `unsafe metrics directory`, the symlink target stayed empty.
- Note, not a defect: the bind on the derived loopback port is a visible side effect, but it is not a project file or directory and it is released.

### 2. `runWorkflowSync` / runtime child adapter: PASS (static; trusted-operator model)
- `runtime/entry.mts:26`: `workflowInvocation` takes `env = options.env ?? deps.proc.env`. Neither review-bench nor state-snapshot passes `env`, so the child inherits the FULL parent environment. `AI_WORKFLOW_RUNNER` is forced to the resolved runner. The command is `deps.proc.execPath`, or the bare `node` / `bun` resolved through PATH if the runner differs. Node args get `--experimental-strip-types --disable-warning=ExperimentalWarning` prepended. `shell` is not set, so `spawnSync` is called without a shell (`runtime/node.mts:203`).
- Review-bench test path (`review-bench.mts:125-130`): `--test-cmd` is a JSON array whose first element must be `node` or `bun`. Element 0 is dropped and the REST becomes node args, so the operator can run any node script or `-e` code in the scratch `cwd`. This is trusted-operator input. The timeout is 60 s and failures are mapped to `null`.
- State-snapshot reconcile path (`state-snapshot.mts:204`): fixed script, fixed args, `--json --root`, timeout 15 s.
- Review-bench `git` (`:134`): `git -C <root> rev-parse|status|diff|ls-files` with the inherited env. This is the deferred TTR-A1 (git config execution, trusted root only); not re-reported.
- Residual: the inherited env means secrets in the parent env reach test children. This is acceptable for a trusted operator, and nothing is logged.

### 3. Final guard secret exclusion + symlink/FIFO + bounded I/O: FAIL on exclusion, PASS on the rest
- Secret exclusion before any fs read: **FAIL**. See finding 1. `readGuarded` does exclude secrets before lstat, but the guard walk does not use it.
- Symlinks: PASS. `walkTree` records `L:<readlink>` and never follows. `readGuarded` refuses symlinks. POC output: `".project/link":"L:/etc/hosts"`.
- FIFOs/non-regular files: PASS. A FIFO is recorded as `O:<mode>` and never opened. POC: `".project/pipe":"O:4516"` with no read recorded for it.
- Bounds: PASS. `MAX_SNAPSHOT_BYTES` = 16 MiB is enforced on the written snapshot (:176) and on the check-side read (`readGuardedAbsolute(..., MAX_SNAPSHOT_BYTES)`, :185). Manifests and reports use `MAX_RECORD_BYTES` = 256 KiB. `WALK_CAP` = 50000, and files above 2 MiB are stat-only. `.project/metrics`, `.project/reports`, `.git` and `node_modules` are skipped. Minor, not reported as a finding: `guard check` does not shape-validate `before.tree`, so a malformed snapshot gives a TypeError message through `printable`.

## Commands run (scratch only)
- `node poc/guard-poc.mts`: output as in finding 1.
- `node poc/lease-poc.mts`: output as in checklist 1.
- Node v24.21.0. Initial attempts with `timeout` and flags failed on the environment, not on the code; they were re-run without them.
- No `.env*`, `credentials.json` or `settings.local.json` from the real tree was read. POC fixtures were synthetic files in mkdtemp dirs, removed afterwards.

## Cross-file reviewed
`hooks/scripts/metrics-lock.mts`, `scripts/workflow-metrics-state.mts` (metricsDirectory, readText, guardedMetricsDeps, withMetricsLease), `scripts/flow-report.mts` (collectSources, readHistory, publish/ownership excerpts), `scripts/runtime/entry.mts`, `runtime/node.mts` (child adapter), `scripts/review-bench.mts` (whole file). The `state-snapshot.mts:204` call site was checked via grep only.
Not reviewed: the full `flow-join`/`flow-render` bodies, `state-pages.mts`, publication staging internals past ownership inspection, Bun adapter.
