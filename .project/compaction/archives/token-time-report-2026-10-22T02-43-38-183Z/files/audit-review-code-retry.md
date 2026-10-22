# Audit review record: code-retry

independent: not-completed
canary: caught
read-only: verified by review-bench guard-retry-check.json with exact coordinator-patch and secret-exclusion accounting
prompt-sha256: f4b76948ddf178f77611701098c5cece6cf1a1ae5f6c8295dffed4382f9faed6
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-code-retry.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-code-retry-1aeunwu5.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Code review: flow-render / flow-report / review-bench (scratch whole-file slice)

model: claude-sonnet-5-5
independent: not-completed
read-only: verified by scratch-only cwd, no live repository reads, no source or test edits
cross-file interactions: reviewed

Verdict: **BLOCK**. One tested defect (the Markdown and HTML ownership check is a no-op) fails two scratch tests. It lets `--apply` overwrite foreign `flow-report.md` and `flow-report.html` files. This is not a PASS.

## Findings

| # | Severity | Location | Rule | Concrete input -> wrong outcome | Evidence and fix | verified |
|---|----------|----------|------|--------------------------------|------------------|----------|
| 1 | BLOCK (high) | `ai-framework/scripts/flow-render.mts:22-23` (`MARKER_START` at lines 16-19 is never used) | security.md §9 "write atomically through a resolver that refuses foreign targets", the 🚫 absent/refused rule, security checklist G last item; plan S1-S3 contract "existing target must be a regular file this renderer wrote in this format" | `ownsFormat("markdown" or "html", anything)` returns `true`. A user's own `.project/metrics/flow-report.md` or `.html` passes `inspectOwned` (flow-report.mts:124). `--apply` then replaces it by `renameSync` (flow-report.mts:171). A user-authored note is silently destroyed. | `node --test flow-render.test.mts` fails: "generator ownership needs the exact format marker", assertion at test line 67 (`!ownsFormat("markdown", "intro\n"+md)` is false). `flow-report.test.mts` fails: "existing unowned, linked, directory and FIFO targets are refused before anything is written". I read the test at flow-report.test.mts:251 (a "# my own notes" md fixture) but did not isolate which assertion failed. Fix: replace `if (format !== "json") return true;` with a check that `MARKER_START[format].test(text)` for markdown and html. | yes (ran tests) |
| 2 | Medium | `ai-framework/scripts/review-bench.mts:258` | security.md §9 / fail closed | `count --max ten` (any non-numeric value): `Number("ten")` is `NaN`, `count > NaN` is false, and the exit code is 0. The appetite cap never trips on a typo. | POC in `poc/` with 2 changed files: `--max 0` gives exit 1, `--max ten` gives exit 0. Fix: reject a non-finite `--max` with `fail("--max must be a number")`. | yes (POC) |
| 3 | Low-Medium | `ai-framework/scripts/review-bench.mts:211` | correctness of the bookkeeping filter | `git diff --name-only` and `ls-files` without `-z` quote non-ASCII names, e.g. `".project/knowledge/caf\303\251.md"` including the leading quote. The `.project/knowledge/` prefix test fails, so a bookkeeping file is counted against the appetite cap. | POC: count=2, listing contains `"\".project/knowledge/caf\\303\\251.md\""`. Fix: use `-z`, or `-c core.quotePath=false` plus unquoting. | yes (POC) |
| 4 | Low | `ai-framework/scripts/flow-report.mts:42,46,55` | informational / misclassification | A pinned-directory swap during a read throws `unsafe directory` inside `lstatSync`. `readText` turns it into `state read refused (<code>)`, which `unsafeText` does not match, so the source shows the reason "unreadable" instead of "unsafe". The status is still refused and nothing is written. | Read from the code only. | no (code reading) |
| 5 | Low | `ai-framework/scripts/review-bench.mts:222` | accuracy | The `canary-check` regex has no left boundary, and `[:#L ]*` allows a bare space. A report line like "review-bench.mts 276 lines" can count as a citation. | Code reading only. | no |
| 6 | Low | `ai-framework/scripts/review-bench.mts:200-203` | validation | `guard check` casts the snapshot to `TreeState` without validating it. `{}` throws a TypeError. The message is printed after `printable`, and the exit is 1, the same as a dirty result. | Code reading only. | no |
| 7 | Info | `ai-framework/scripts/review-bench.mts:242` | accuracy | The `record-check` "verified column" test matches any pipe line containing the word `verified`. | Code reading only. | no |

## Rule-body walk
Both rule files were read in full before the source. `security.md` was read in full, including §9 and checklist G.

### coding-standards.md
- Import order: checked. The `import type` lines sit first in a few files, and the groups are minimal and consistent with the siblings. No finding.
- File naming: checked. kebab-case `.mts` with `.test.mts` companions.
- TypeScript strict:
  - `any`: none found. `unknown` is used with guards.
  - Exported functions have explicit return types: checked. `parseArgs`, `collectSources`, `publishFiles`, the renderers and the review-bench exports all declare them.
  - Discriminated unions: `Collected`, `Raw`, `Loaded` are used. No flag-contradiction types.
  - Exhaustive switch: N/A. There is no `switch`; the format ternary at flow-render.mts:114 covers the three members of `Format`, but the final branch is a bare else without a `never` check (info only).
- Naming: checked. Constants are UPPER_SNAKE. Boolean names are not uniformly `is/has` (`formatGiven`, `same`), which is style only, and I report no finding for it.
- Error handling:
  - No empty `catch {}`. `catch { /* reason */ }` blocks carry reasons (flow-report.mts:190).
  - `catch {}` in `realOrNearest` (review-bench.mts:70) is intentional probing.
  - `getErrorMessage` centralisation: `failure()` is defined separately in flow-report.mts and workflow-metrics-state.mts. It is a small duplication with different allow-lists. N/A as a finding.
- Comments: they explain why. No finding.
- Code quality / DRY: the pin-and-verify Proxy is duplicated between `pinChain` (flow-report.mts:64-79) and `guardedMetricsDeps` (workflow-metrics-state.mts:628). It is a candidate to share, but not a defect.
- Cohesive-unit exceptions: `publishFiles` (about 60 lines) and `flow-report.mts` (223 lines) exceed the 50-line function and 80-line utility defaults. I could not see `plan.md` or `deviations.md` in the scratch, so I could not confirm the documented exception. unverified.
- Export & Download checklist: N/A. The CLI writes local files rather than offering a browser download. The concurrency guard is the exclusive staging directory. Filenames are fixed and not user-controlled.
- Prompt governance: N/A. Revert completeness: N/A. CSS scoping: N/A (a single static page). Library version verification: N/A, no third-party imports. Data-model migration: N/A.
- Code Organization Checklist:
  - Function length: `publishFiles` is over 50 lines (see the cohesive-unit item). The other functions are under 50.
  - No `any`: checked.
  - Named exports: checked.
  - Explicit error handling: checked.

### boundaries.md
Checked. The layer map is the template, and there is one workspace. `flow-render` imports `flow-join`, which is a pure dependency. `flow-report` imports `flow-render`, `flow-join` and `workflow-metrics-state`, all inside the bundle. `review-bench` imports only the runtime layer. There is no cross-app import and no dependency placement issue. The remaining items are N/A.

### security.md
- §1, §2, §5, §6, §7 (auth, tenancy, uploads, API routes): N/A, no servers.
- §3 Secrets: checked. `SECRET_NAME` refuses secret-shaped files in `readGuarded`. No secrets are logged.
- §4 XSS:
  - HTML (flow-render.mts:90-105): every cell goes through `esc`. The CSP meta is `default-src 'none'`. There is no script and no external reference.
  - Markdown (flow-render.mts:75): `mdCell` escapes punctuation. `text()` strips control characters from cell data. Report notes bypass `text()`; I assume the notes are bundle constants and did not trace them in flow-join (unverified).
  - JSON: structure comes from `JSON.stringify`.
- §8 Anti-patterns: none found.
- §9 Scripts over a project tree:
  - Guarded reader: `readText` (workflow-metrics-state.mts:557-571) refuses symlinks, non-regular files and oversize files. It opens with O_NOFOLLOW and O_NONBLOCK, compares the fstat identity, and bounds the read to `maxBytes+1`. The `readHistory` ancestry pin is checked. A listing check: the review-bench `walkTree` does not follow symlinks and does not read FIFOs. Checked.
  - Regex bound: the review-bench regexes run over text capped at 256 KB. The flow-render ID regexes are fixed-width and linear. Checked.
  - Execute only bundle code: review-bench runs `node` or `bun` through `runWorkflowSync` on files copied into the scratch directory, with the command restricted to those two binaries. Checked.
  - Parse and re-emit untrusted values: checked, with the open point on notes above.
  - Never copy error text; write atomically: flow-report returns error codes, not messages (`failure`, `publish failed (code)`). Writes use a staging directory opened `wx`, then link or rename. review-bench's `writeGuarded` uses `wx` plus rename. Partly, because of finding 1 for markdown and html, so **not met** for those two files.
  - Absent vs refused: `lstatIfPresent` returns null only on ENOENT. A refused target throws `Refused`. `readJson` keeps "missing" distinct from "refused". Checked.
  - Trusted-root config: N/A.
  - Accepted design limits (not-atomic three-file set, OS path-check-to-syscall race, static multi-table report with neutral UA styling): not raised as findings.

## Selected tests (scratch, node 22 `--experimental-strip-types`)
- `flow-render.test.mts`: 4 tests, 3 pass, 1 fail ("generator ownership needs the exact format marker"). Caused by finding 1.
- `flow-report.test.mts`: 22 tests, 21 pass, 1 fail ("existing unowned, linked, directory and FIFO targets are refused before anything is written"). The cause is consistent with finding 1, but I did not isolate it.
- `review-bench.test.mts`: 34 tests, 34 pass. This does not cover findings 2 and 3.
- Not run by instruction: the full suite, Bun, setup-validator and graph check.

## Cross-file interactions
- flow-report.mts:124 calls `ownsFormat`; `inspectOwned` trusts it for all three formats. Reviewed, and it fails for markdown and html (finding 1).
- flow-report.mts `readStores` inside `withMetricsLease` and the guarded-dependency Proxy: the same proxy shape as `guardedMetricsDeps`, and `closeSync` is excluded in both. The lease is a net listener, so a preview creates no files. Reviewed, no finding.
- The `readText` and `readWorkflowState` reader contract (missing / valid / refused) is consumed correctly by `readJson` and `readStores`. The only imperfection is finding 4.
- `renderFormats` size cap and `applyReport`: a null return makes publication refuse before any write. Reviewed.
- Not reviewed: flow-join.mts internals (outside the named slice), `runtime/*`, `metrics-lock.mts`, the plan.md S1-S3 text and `workflow-metrics.md` (not present in my scratch copy). Contract conformance is therefore unverified except where the tests encode it.

## Tried that failed or was not possible
- `timeout` is not installed on this host. I used `perl alarm` instead.
- The scratch copy has no `.project/pitches/token-time-report/plan.md` or `deviations.md`, so the size-limit exception and the S1-S3 exit criteria could not be checked directly.
- I did not mutation-test the other ownership paths.

## Unverified required items
1. The documented cohesive-unit exception for the `publishFiles` length.
2. Provenance of `report.notes` (flow-join).
3. The plan.md S1-S3 contract text and `workflow-metrics.md`.
4. Findings 4 to 7 (code reading only).
