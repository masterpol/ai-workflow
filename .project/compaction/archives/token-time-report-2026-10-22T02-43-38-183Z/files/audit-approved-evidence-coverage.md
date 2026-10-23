# Approved evidence-pass record: coverage

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (.project/metrics/token-time-report-audit/proposed-evidence-pass/guard-after.json) and scratch-integrity.json
prompt-sha256: 93dda6c19f8dd5d0ec5982583658b9eca7363d16a53c64c34b067544f7c1e358
model: claude-sonnet-5-5
cross-file interactions: reviewed

## Coordinator assessment

Fresh reviewer, original author model family; this does not prove independence from that family's blind spots. Required scope is the exact unfinished TASK.md checks, not a new full audit. All source bytes in every scratch copy match the prepared manifest except its deliberate defect; the live repository guard is clean. All four exact worker_done messages were accepted, workers released and attempt ledgers settled. The older human-owned retained resource remains untouched.

Independent coverage targets, 102 state-snapshot tests, 79 state-html tests, guard regression, output-size guard, snapshot caps and bounded short-write mutant were checked. The 1e12 source/per-file-read cap mutants are discarded: the bounded reader allocates maxBytes+1, so huge allocations confound the reported failures. The coordinator reran a finite 4MiB-to-8MiB source-cap mutant; it fails at the intended oversized-source reason assertion (author-run supplementary evidence, not claimed independent). The reviewer independently executed the normal oversized-source assertion, and the direct output-cap and snapshot-cap mutants have named intended failures. No claim that every individual cap has an independently isolated mutant is made. The stalled-write mutant is caught by a 15-second timeout, explicitly distinguished from an assertion failure. Raw citations were misnumbered; the actual canary site is review-bench.mts:175, and both the executed guard test and walkfix POC detect that exact omission.

| Finding / check | Verified | Disposition |
|---|---|---|
| Planted defect at ai-framework/scripts/review-bench.mts:175 | yes, explicit independent finding with executed test/POC and source/manifest comparison | Scratch only; canonical source retains the guard |
| Automated raw citation check | false | Misnumbered source citation; corrected by coordinator after semantic/POC verification, without editing raw report |
| Required TASK.md checks | yes, bounded execution/static evidence as specified | Completed with the explicit proof limitations above |

Exact dispatched prompt: `.project/metrics/token-time-report-audit/proposed-evidence-pass/prompt-coverage.txt`. Raw completion, report and release receipts remain in that local evidence directory. Worker self-assigned metadata below is preserved verbatim; the coordinator owns the verified assessment above.

## Verbatim worker report

# test-coverage-checker evidence pass — token-time-report (scratch copy only, no source/test edits)

Verdict: **BLOCK** — one tested defect (secret-shaped file hashed by guard snapshot); everything else met.

## Findings
| ID | Sev | file:line | Finding | Verified |
|----|-----|-----------|---------|----------|
| C1 | High | ai-framework/scripts/review-bench.mts:183 (walkTree `visit`, 174-184) | `walkTree` has no `SECRET_NAME` check. A secret-shaped file under a guard root (e.g. `.project/credentials.json`) gets `lstat`ed then `fs.readBytesSync` + sha256 hashed. Contract: skip BEFORE any filesystem read; hashing a protected file not allowed. Only `readGuarded` (line 105) has the check. | YES. `node --test review-bench.test.mts` → 35 tests, 34 pass, 1 fail: `guard never reads secret-shaped files` (review-bench.test.mts:522; its readBytesSync trap fires). POC mutant `walkfix` (add `if (SECRET_NAME.test(rel)) return;` before `path.join` in `visit`) → 35/35 pass. Fix is one line; not applied (read-only). |
| C2 | Info | tests, short-write guard flow-report.mts:151 | Mutant `!(n > 0)` → `n < 0`: stalled-write test hangs forever (killed by 15s alarm, exit 142). Guard is not redundant; it is detected only as a hang/timeout, not an assertion failure. | YES (POC shortwrite) |
| C3 | Info | flow-report.mts:123,159,168 output-cap readText | Raising each cap to 1e12 makes 3-7 flow-report tests fail per mutant, including the short-write and ownership tests. Mutant is coarse (could also change readText behavior), so "caught" is shown but "fails for the intended reason" per cap is not proven. No surviving mutant. | Partially (failures observed; reason per line not isolated) |

No redundant surviving guard found: every mutant below was killed.

## Checklist
1. Coverage (independent, quoted globs, Node v24.21.0): flow-join 100.00% line, flow-render 100.00% line, flow-report 100.00% line (branch 95.49/96.63/90.97; flow-render funcs 97.67). Utility >=90% and CLI >=80% targets MET. 41/41 tests pass, 0.8s.
2. Bounds / short write mutants (cwd = scratch copy `m_<name>`, script `poc.sh`):
   | Mutant | Result |
   |---|---|
   | flow-render.mts:121 outputBytes check disabled | KILLED: `a format that would exceed the output cap makes the whole render fail rather than truncate` |
   | flow-report.mts:45 sourceBytes disabled | KILLED: 4+ tests (oversized-source refusal, preview, hostile labels, history) |
   | flow-report.mts:123 / 159 / 168 outputBytes disabled | KILLED (see C3) |
   | flow-report.mts:151 short-write refusal disabled | KILLED by timeout (C2) |
   | review-bench MAX_SNAPSHOT_BYTES write-side check (line 196) removed | KILLED: `guard refuses an oversized snapshot before publishing it` |
   | review-bench MAX_SNAPSHOT_BYTES constant lifted (read + write) | KILLED: oversized-snapshot test and `main: guard check refuses ... oversize snapshot` |
   Read cap 16MiB for snapshots vs 256KiB `MAX_RECORD_BYTES` default for manifests: separate constants (review-bench.mts:20-22), confirmed.
3. Regression: state-snapshot.test.mts 102/102 pass; state-html.test.mts 79/79 pass; review-bench.test.mts (35-case guard suite) 34/35 — fails on C1. Each command <1.5s (separate invocations).
4. Guard-to-test map (fails when guard removed):
   - Secret exclusion in `readGuarded` (line 105): removal killed `prepare refuses symlinks, secret-shaped names, traversal, ...`.
   - Secret exclusion in guard snapshot walk: **guard absent** (C1); the test exists and fails now. With the one-line fix it passes, and the test would fail again if removed.
   - Snapshot caps: write-side line 196 → `guard refuses an oversized snapshot...`; read-side (readGuardedAbsolute maxBytes) → `main: guard check refuses a symlink, a FIFO and an oversize snapshot...`.
   - Output/source caps: see item 2.

## Commands run (all in scratch root)
- `node --test --experimental-test-coverage --test-coverage-include='**/flow-join.mts' --test-coverage-include='**/flow-render.mts' --test-coverage-include='**/flow-report.mts' ai-framework/scripts/flow-{join,render,report}.test.mts`
- `node --test state-snapshot.test.mts`, `state-html.test.mts`, `review-bench.test.mts` (from ai-framework/scripts)
- `./poc.sh` (sed mutants on scratch copies, `perl alarm 15` per run)

## Cross-file
Reviewed: flow-join.mts (limits line 9), flow-render.mts:121, flow-report.mts:45,123,151-168, review-bench.mts 20-25,98-122,170-215, review-bench.test.mts 522-544. Not reviewed: state-pages.mts link logic beyond passing tests, workflow-metrics-state.mts internals, live checkout (not touched), full-suite/Bun/browser (out of scope). Known deferred TTR-A1..A4 and accepted limits not re-raised. Used ~14 of 18 tool calls; rules files not re-read item-by-item beyond contract text in REVIEW-CONTRACT.md.
