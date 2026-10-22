# Audit record: security (cycles 1 and 2, workflow-usage-state)

independent: yes
canary: caught
read-only: verified by review-bench guard check (repo unchanged across each dispatch) and a scratch copy outside the project
prompt-sha256: 6a95c31ed1615d8041e7165eb7e83239345e326dba5b5db424c6c0ad9d59506e
model: sonnet
cross-file interactions: reviewed

Cycle 1 prompt: `audit-prompts/security.txt` (hash above is of the file as dispatched; the stored copy has the scratch path shortened). Canary: `migrateV1Text` duplicate-key guard removed in the scratch copy, caught at `workflow-metrics-state.mts:546-552` (canary line 549), `review-bench canary-check` = caught.

| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| SE1 | must-fix | workflow-metrics-state.mts:343 | forced-fold loop never ends when a hand-edited `frontier` is later than every open record end; a writer then spins under the lease | verified: proof of concept on the real module hung for 8 s (killed); fixed by validation plus a loop guard; PoC now finishes, two mutants killed (see audit.md) |
| SE2 | should-fix | workflow-metrics-state.mts:546-552 | `migrateV1Text` accepts a duplicate `"schemaVersion"` key | refuted: planted canary, scratch copy only; the real file keeps the token-count guard and the real test passes |
| SE3 | should-fix | workflow-metrics-state.mts:630 | comment says the runtime exposes no `O_NOFOLLOW`; it does (it lacks `O_WRONLY`, `O_APPEND`, `O_CREAT`) | verified, fixed (comment) |
| SE4 | acknowledged | recordDroppedCapture | a FIFO swapped in between the `lstat` and `openSync("a")` could block the open | verified by reading; same class as the accepted symlink window (deviations S6); needs the same user |

Checklist result per item: bounded input PASS; validators PASS except SE1; path and symlink safety PASS (accepted S6 window); fixed error text PASS; no secrets in output PASS; parser differentials FAIL only on the canary (SE2); resource exhaustion FAIL on SE1 (fixed); TOCTOU acceptable (SE4). Files read fully: state module, report module, `metrics-lock.mts`, contract doc. Not verified by this reviewer: the CLI stdin cap (CLI not in the scratch copy) and Bun.

## Cycle 2 (narrow re-check of the SE1 fix)

independent: yes
canary: caught
read-only: verified by review-bench guard check (repo unchanged across the dispatch) and a scratch copy outside the project
prompt-sha256: 7d7502278199b9086df5feef76b258e170056beb53d27b1f057b34917034bc68
model: sonnet
cross-file interactions: reviewed

Canary: the `validUsage` frontier comparison inverted in the scratch copy, caught at `workflow-metrics-state.mts:479` (canary line 479).

| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| SE5 | none | settleUsage, fold, addRecord, validUsage, recordWorkflowEvent | seven further hand-edited states (equal ends, `s` below the frontier, empty list with a frontier, far-future `lastStopAt`, huge ends, null frontier, frontier 0) all terminate | verified by the reviewer's proofs of concept with a watchdog, each finished in about 2 ms |
| SE6 | acknowledged | settleUsage cut-back | the cut-back test would hang rather than fail if the guard were removed | verified: I removed the guard and the test never returned; a synchronous loop cannot be timed out by the test runner |
| SE7 | acknowledged | add() | a hand-edited counter at `MAX_SAFE_INTEGER` makes every later write fail with "metric counter overflow" | verified by reading; a local denial of the collector, not a hang, and the lease is released |
| SE8 | acknowledged | takeDroppedMarker | `restore` skips the rename when a new marker exists, so a failed write plus a concurrent drop under-counts | verified by reading; the count is documented as a lower bound |

Not verified by this reviewer: the full test file against the real (correct) module, the marker tests beyond reading, and `recordWorkflowEvent` end to end under a hostile state. Files read fully: none (target functions and callers by line range).
