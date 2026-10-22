# Audit review record: code

independent: not-completed
canary: caught
read-only: verified by review-bench guard-cycle1-check.json
prompt-sha256: 8673ed259986ff3f53fefd9614da42f0a61c5a83246b6f7b066c82f33c74a406
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-code.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-code-_7c7o_b7.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Code-reviewer audit: token-time-report and review-bench

model: claude-sonnet-5-5
cross-file interactions: reviewed
read-only: verified by working only in the scratch copy; every command used the absolute scratch path; no source or test file was edited.

## Verdict

BLOCK, with one must-fix. `ownsFormat` in `flow-render.mts:23` returns true for any markdown or html file. `--apply` therefore overwrites an unowned `flow-report.md` or `flow-report.html`. This breaks the plan's S2 ownership exit, and two scratch tests fail as a result.

## Commands and results

All commands ran in `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-code-_7c7o_b7/ai-framework/scripts`.

| Command | Result |
|---|---|
| `node --experimental-strip-types --disable-warning=ExperimentalWarning --test flow-join.test.mts flow-render.test.mts flow-report.test.mts` | 41 tests, 39 pass, 2 fail |
| `node ... --test review-bench.test.mts` | 34 pass, 0 fail |
| `node ... --test state-html.test.mts` | 79 pass, 0 fail |

The two failures are:
- `flow-render.test.mts:59`, "generator ownership needs the exact format marker, not just a schema version".
- `flow-report.test.mts:266`, "existing unowned, linked, directory and FIFO targets are refused before anything is written".

## Findings

| tier | file:line | issue | failure scenario | fix | verified |
|---|---|---|---|---|---|
| must-fix | `flow-render.mts:23` (also `:16-19`, `flow-report.mts:124`) | `if (format !== "json") return true;` makes ownership trivially true for markdown and html. `MARKER_START` is declared but never used. The plan requires that "existing generated filenames require the format's generator marker; unmarked files ... are refused and preserved". | A user's own `.project/metrics/flow-report.md` or `flow-report.html` exists as a regular file. `flow-report.mts --apply` passes `inspectOwned`, the `same` check at `flow-report.mts:169` passes, and `renameSync` at `:171` replaces the file. The user's content is lost, and only json is protected. Both failing tests demonstrate this. | `return MARKER_START[format].test(text)` for markdown and html. The tests at `flow-render.test.mts:63-64` pin the expected behaviour, including prefix text, a wrong format marker, and a cross-format marker. | yes: tests fail, and I read the code |
| acknowledged | `flow-join.mts:306` | `trace` entries redact `phase` and `scope` with `safeText`, but `class` is copied raw. `label()` admits any `SAFE` string such as `ghp_xxxxxxxxxxxxxxxxxxxx`, so a credential-shaped class would be printed. | Applies only if the usage reader lets a credential-shaped `class` through. I did not check the reader. | `class: safeText(t.class)`. | no: code read only, not run |
| acknowledged | `review-bench.mts:200-203` | `parseJson` is cast to `TreeState` with no shape check. | A snapshot that is valid JSON but lacks `tree`, such as `{}`, makes `Object.keys(before.tree)` throw a TypeError. The CLI reports it as an obscure message with exit 1, so it still fails closed. | Validate `isRecord(before.tree)` and fail with a fixed message. | no: code read only |
| acknowledged | `flow-join.mts:142,145` | `projectUsage` casts nodes and does not validate them. A malformed node raises a TypeError rather than a `Refusal`, so it is not reported as `refused`. | Only reachable if `readWorkflowState` stops validating. The comment at `:135` documents this reliance. | Optional defensive `isObj` checks. | no: code read only |

## Plan exits, point by point

| Plan exit or check | Result | Evidence |
|---|---|---|
| Exact join by pitch, phase and scope, `(none)` matches, sentinels and noncanonical keys are source-specific | checked | `flow-join.mts:215-224` (per-source key `!source:text` when not exact), `:289-293`, and the join tests pass |
| Null reporting: `reportedUsage` 0 gives `tokens` null; partial and unreported statuses; overflow gives all-null | checked | `flow-join.mts:193-211` and the tests pass |
| Nonadditive timing: stored rows are copied, never summed | checked | `:274,277,278`; vendor folds touch only `tokens`; the render note says "never the sum of its children" |
| Pending and buffered activity makes timing provisional with no extrapolation | checked | `:318` |
| Caps and overflow: 51/16/26/600 for tokens, 52/18 for usage (the S1 deviation), 100 leaf rows, separate displayed and full totals, 4 MiB output refusal | checked | `:9-13`, `:297-298`, `flow-render.mts:118-121` |
| History availability: truncated or missing is unavailable, not zero; stale; per-field availability | checked | `:161-187,247-255` |
| One lease, no preview write, ancestry pinned for history | checked by reading and by passing tests | `flow-report.mts:97-111,81-93` |
| Output ownership | **fails** | the must-fix above |
| Publication recovery: staging directory with `wx`, generation ID, link for new targets, reinspect then rename, owned-only cleanup, incomplete reporting | checked | `flow-report.mts:133-192,205-206`; the related tests pass |
| S3 state link through the existing helper | checked | `state-pages.mts:132`; `state-html` tests pass |
| Bun run, setup-validator, graphify `--check`, full suite | unverified (not run; out of scope) | |

The deviations in `deviations.md` are respected, and I did not re-raise the known limits (non-atomic fixed-file set, the path-recheck race, the multi-table static UX).

## review-bench

- **Snapshot guard:** a separate `MAX_SNAPSHOT_BYTES` of 16 MiB applies. The writer measures UTF-8 bytes including the trailing newline and refuses before writing (`:196`). The reader passes the same cap to `readGuardedAbsolute` (`:200`). Report and manifest readers keep the 256 KiB default `MAX_RECORD_BYTES` (`:219-220,233`). The cap is bounded, and the writer and reader agree on the boundary.
- **Tests:**
  - Round trip above 256 KiB and edit detection: `review-bench.test.mts:512`.
  - Oversize writer refusal with no fs calls: `:522`.
  - Symlink, FIFO and oversize snapshot refusals: `:528`.
  - All 34 pass.
- **Unchanged protections:** `readGuardedAbsolute` still does lstat, rejects symlinks and non-regular files, checks size, then reads. `writeGuarded` still uses a `wx` temp file plus rename and refuses an existing symlink. `walkTree` uses lstat and never opens FIFOs; they are recorded as `O:mode`. I found no issue.
- **Known limits (acknowledged, not new):** there is an lstat-to-read race. Files larger than 2 MiB are fingerprinted by size and rounded mtime, so a same-size edit within a millisecond would not be detected.

## Checklist walk

**Security**
- Hardcoded credentials: N/A, none found. The `SECRET` patterns in `flow-join.mts:54-56` are detectors.
- SQL injection: N/A, no database.
- XSS: checked. `esc()` encodes `& < > " '`, `renderHtml` sets a CSP with `default-src 'none'`, and there are no scripts or links. The hostile-label test passes.
- Path traversal: checked. The CLI has no destination argument and the file names are fixed. Review-bench uses `safeRelative`, realpath and `inside` checks.
- CSRF and auth: N/A, no server.
- Insecure dependencies: N/A, no external packages.
- Secrets in logs: checked. Errors are fixed strings and `failure()` maps unknown errors to a code. One residual item is the raw `class` in the first acknowledged row.

**Code Quality**
- Large functions: `joinFlowReport` is about 65 lines and `publishFiles` about 60 lines. Both are over 50, acknowledged as cohesive units. Dense one-liners match the surrounding style. The plan's 1,500-line cap was not re-measured (unverified).
- Deep nesting: checked, at most about 4 levels.
- Error handling: checked. There are no empty catches except the documented cleanup catch at `flow-report.mts:190`.
- Mutation: acceptable. Local accumulators only.
- `console.log`: none.
- Missing tests: new surfaces are covered.
- Dead code: `MARKER_START` is unused, which is the same root cause as the must-fix.

**Node/backend**
- Input validation: checked. Every disk value goes through `isObj`, `count`, `isDate` and `label`.
- Rate limiting, CORS, queries: N/A.
- N+1: N/A.
- Timeouts: N/A, no network. File sizes are bounded to 4 MiB.
- Error leakage: checked, fixed reasons only.

**Performance**
- Algorithms: checked, bounded sorts over at most 600 leaves.
- Synchronous I/O: acceptable, a CLI with bounded reads.
- Re-renders, bundle size, images: N/A.
- Caching: N/A.

**Best practices**
- TODOs: none.
- JSDoc on exports: mostly present, `flow-render.mts` includes it.
- Magic numbers: `FLOW_LIMITS` and `TOKEN_BOUNDS` are named; the 32 and 200 caps at `flow-join.mts:148,166` are inline, acknowledged.
- Formatting: consistent.

## Cross-file interactions

- `flow-report` calls `flow-join` (`project*`, `joinFlowReport`) and `flow-render` (`renderFormats`, `ownsFormat`).
- `flow-report` also uses `workflow-metrics-state` (`metricsDirectory`, `readText`, `readWorkflowState`, `withMetricsLease`).
- `flow-render` imports `FLOW_LIMITS` and types from `flow-join`.
- `state-pages` links the fixed `flow-report.html` name that `flow-render` publishes.
- The defect crosses the render and report boundary: the report trusts `ownsFormat`.

## Tried that did not work

- `timeout` is not available on this macOS. I used `--test-timeout` instead.
- One combined test loop exceeded the 20s limit and was moved to the background. It then completed.

## Not reviewed or unverified

- `workflow-metrics.md`, `coding-standards.md`, `boundaries.md` and `security.md` were not read in full, so the rule-by-rule check against them is unverified. The `security.md` section 9 claim in review-bench was checked only through the code and tests.
- `workflow-metrics-state.mts` internals (`readText`, `withMetricsLease`) were not inspected. I relied on the passing tests that fake them.
- Bun, the full suite, setup-validator and graphify `--check` were not run.
- Live POCs for the `class` redaction and the snapshot-shape findings were not written.
- The test files were not read in full; I used test names, results and targeted lines. About 14 of the 24 tool calls were used.
