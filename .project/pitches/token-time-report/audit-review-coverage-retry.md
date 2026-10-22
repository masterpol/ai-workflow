# Audit review record: coverage-retry

independent: not-completed
canary: caught
read-only: verified by review-bench guard-retry-check.json with exact coordinator-patch and secret-exclusion accounting
prompt-sha256: ae9a46756b425a8f0f8b648e8281733919a1e8ab9a020ce8a0d581dd31f838a9
model: claude-haiku-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-coverage-retry.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-coverage-retry-1ejnao4g.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Coordinator findings ledger

| Finding | Verified | Disposition |
|---|---|---|
| Foreign-file ownership defect | yes, scratch tests and POC | Planted scratch canary; absent from live source |
| Target mtime check survives mutation | yes, reviewer POC | Retain as a redundant conservative refusal layer; content and inode checks independently protect publication |
| Required coverage evidence / report table | no | Incomplete; audit remains open |

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Coverage review: token-time-report S1–S3 (fresh retry, read-only)

**Verdict: BLOCK.** Two tests fail on the unmodified scratch snapshot. The cause is one guard in `flow-render.mts` that accepts any Markdown or HTML file as "owned", so `--apply` overwrites user files. Required checks are partly unverified (listed below), so this is not a PASS either way.

Scope: scratch copy only (`ai-framework/scripts`, `ai-framework/hooks`, `.project/pitches/token-time-report/plan.md`). Node v24.21.0. No live file, git status, or other scratch copy was read. No source or test was edited. In-memory mutants ran in copies under `poc/`, which lives in this scratch directory.

## 1. Selected tests (as run, unmodified scratch snapshot)

| Command (node --experimental-strip-types --disable-warning=ExperimentalWarning --test …) | Result |
|---|---|
| `flow-join.test.mts flow-report.test.mts` (run once combined, then per file) | flow-join 15 tests, all pass. flow-report 22 tests, 21 pass, **1 fail**: `flow-report.test.mts:266` ("existing unowned, linked, directory and FIFO targets…") |
| `flow-render.test.mts` | 4 tests, 3 pass, **1 fail**: `flow-render.test.mts:63` ("generator ownership needs the exact format marker…") |
| `review-bench.test.mts` | 34 pass, 0 fail, ~4.5 s |
| `state-html.test.mts` | 79 pass, 0 fail, ~5.7 s |

Not run (out of scope or not required by the brief): `state-snapshot.test.mts` (named in plan S3 exit criteria, not in brief list), Bun, full suite, `setup-validator`, graph check, coverage (`run-tests --coverage`).

## 2. Defect found (BLOCK)

**F1 — severity high — `ai-framework/scripts/flow-render.mts:22-23` — rule: Guards and Fixes ("prove the guard"), plan S2 ownership exit criterion.**

- Code: `ownsFormat` returns `true` for every non-JSON format (`if (format !== "json") return true;`). The `MARKER_START` regexes at lines 16-19 are defined but never used.
- Concrete input: an existing `.project/metrics/flow-report.md` containing `# my own notes`, then `node ai-framework/scripts/flow-report.mts --root <project> --apply`.
  - Wrong outcome: exit 0, the user's file is replaced by a generated report, and stdout says it was published. The guard at `flow-report.mts:124` is bypassed for markdown and html.
  - Expected by test: exit 1, `publication refused: flow-report.md exists and is not a report this tool wrote; left unchanged`, file preserved.
- Evidence (run): `flow-report.test.mts:266` → actual `[0, 'flow-report: published flow-report.json, flow-report.md, flow-report.html (generation 46bb6061-…)…']`, expected `[1, '']`. `flow-render.test.mts:67` assertion `!ownsFormat("markdown", \`intro\n${text("markdown")}\`)` is false.
- Fix, verified in POC only (`poc/fixPOC`): replace line 23 with `if (format !== "json") return MARKER_START[format].test(text);`. Result: flow-render 4/4, flow-report 22/22 (26 total), and the unowned symlink/directory/FIFO cases now run and pass.
- Verified: yes (ran the tests, read `ownsFormat` and its only caller `inspectOwned`).

**F2 — severity medium — `ai-framework/scripts/flow-report.test.mts:49-67` (`unownedScenario`) — test gap.**

- The loop aborts at the first failing case (`flow-report.md`, the second of five). The symlink (line 53), directory (line 54) and FIFO (line 55) cases never ran in the unfixed snapshot. They pass once F1 is fixed, so their guards are real but were unexercised.
- Verified: yes (fixPOC run).

## 3. Survivor (recorded, not a defect in the shipped behavior)

**F3 — severity low — `ai-framework/scripts/flow-report.mts:169` (`now.mtimeMs === prior.stat.mtimeMs` clause) — rule: Guards and Fixes "remove the guard once and confirm a test fails".**

- Mutant: remove the mtime clause, on the fixed base (`poc/mutMtimeFixed`). Result: flow-report 22/22 pass. No test fails.
- Classification: redundant layer. Inode, device, size and content checks still run. Only a same-content rewrite that changes mtime would differ, and that is harmless. Either drop the clause or add a test that depends on it. The rule says the record must say which; this record says redundant layer, pending the owner's choice.
- Verified: yes (POC run).

## 4. Guard mutant results (in-memory, in POC copies, fixed base where noted)

| Guard (file:line) | Mutant | Result | Failing test(s) |
|---|---|---|---|
| `flow-report.mts:69` inode identity in `pinChain.verify` | drop `stat.ino !== pinned[i].ino` | **caught** (5 fail) | :296 swap, :266 unowned, :340 staging swap, :384 ancestor-swap |
| `flow-report.mts:169` mtime | drop clause | **survivor** (F3) | none on fixed base |
| `flow-join.mts:118` leaves bound | `++leaves > 600` → never refuse | **caught** | :141 "projection bounds refuse over-limit sources" |
| `flow-join.mts:198` checked add | overflow check disabled | **caught** | :94 overflow test |
| `flow-render.mts:76` / `checked()` generation-ID validation | remove the check | **caught** (2 fail) | :23 all-formats test (line 40 throws assertion), :63 |
| `flow-render.mts:23` `ownsFormat` markdown/html | (current code = mutant of intended guard) | **fails on real code** (F1) | :266, :63 |

Not mutated, so unverified: the 4 MiB output cap (`flow-render.mts:121`, tested by :71-75 which pass), the 4 MiB source bound (`FLOW_LIMITS.sourceBytes`), the short-write guard (`flow-report.mts:151`, tested by :351), the staging `EEXIST` refusal (tested by :268, passes), and the lease-release path.

## 5. Rule-body walk (ai-framework/rules/testing.md, read in full)

| Section | Status | Evidence |
|---|---|---|
| The Testing Rule (test as you build) | checked, partial | Tests exist for every new module; a test currently fails, so the feature is not done |
| Decision matrix | checked | Pure joiner (`flow-join`) → unit tests 15; presentation renderer → artifact tests 4; `state-pages` link → `state-html` tests. Trivial wrappers: N/A |
| File organization (co-located `*.test.mts`) | checked | All new tests sit beside sources |
| Naming convention | checked as style only, not reported | `describe`/`test` shape not used; many names do not start with a verb (e.g. `existing unowned…`, `importing the CLI…`). No "should" prefix. No wrong outcome, so not a finding |
| Mocking discipline (shared factory) | checked | `createTestDeps`, `tempFixture`, `harness`, `captureIo` are shared. Inline overrides only where needed (`lstatSync` swap, `apply(…, fs)`) |
| Guards and Fixes: event units | N/A | No hook or completion-event code in scope |
| Guards and Fixes: macOS tmpdir realpath | checked | `runtime/test-helpers.mts:23` keeps the alias unless `{resolve}`. `workflow-metrics-state.mts:544` canonicalizes the root before pinning; `flow-report.mts:199` pins from the canonical directory. No alias-induced false refusal in this suite |
| Guards and Fixes: mutant proof | checked, with F1 and F3 | Section 4 |
| Guards and Fixes: `use…` mock names | checked | Grep found no `use…` identifiers in the five test files |
| Verification Discipline (alias/build-config redirection) | N/A | No mock alias, module override or build config added in these files. Bun not run (excluded) |
| Coverage targets (utilities 90%, handlers 80%) | **unverified** | Coverage not measured (not in brief run list) |
| Guards and Fixes: re-review fix, trace shared helper | checked | `ownsFormat` has one non-test caller (`flow-report.mts:124`), read in full. `FILE_NAMES` matches state-pages' `flow-report.html` link |
| Guards and Fixes: hard limits on review agents | checked | 28-call budget and 20 s per command kept |

## 6. Role steps 1–4 and canonical checklist

- Step 1 (each guard/bound has a failing-when-removed test): partially met. Caught: identity, leaves bound, overflow, generation ID. Survivor: mtime (F3). Failing on real code: ownership markdown/html (F1). Unverified: output cap, source bound, short write, lease release.
- Step 2 (fixes traced through callers): checked for `ownsFormat`; `joinFlowReport` and `renderFormats` callers were read in `flow-report.mts` only.
- Step 3 (unit tests for utilities): checked for `flow-join` (15).
- Step 4 (validation schema tests): checked for `projectTokens`/`projectUsage`/`projectHistory` via flow-join tests (:124, :141, :152, :172, :213).
- Checklist: component render tests (N/A, static renderer, covered by flow-render artifact tests); user interaction (N/A, CLI); authorization/rejection paths (checked via lease, refusal and swap tests, but the unowned-target set fails); edge cases empty/error/loading (checked: `_No rows._`, `unavailable`, `missing` source tests); accessibility (static HTML assertions at flow-render.test.mts:53-55 only, no browser check).

## 7. Function-to-assertion mapping (selected)

- `flow-join.mts` `projectTokens` → :83, :124, :141. `projectUsage` → :114, :152. `projectHistory` → :172, :213. `joinFlowReport` → :51, :158, :233. `fold`/`cells` overflow → :94. `sourceInfo` staleness → :192. `safeText`/`SECRET` → :206. `label`/`SAFE` → :66, :124.
- `flow-report.mts` `parseArgs` → :44. `main`/preview → :65, :216. `collectSources`/lease → :112, :126. `readHistory` → :137, :153. `inspectOwned` → :266 (fails, F1). `publishFiles` → :300, :316, :340, :351. `applyReport` → :224, :240, :268.
- `flow-render.mts` `renderMarkdown`/`renderHtml`/`renderJson` → :23, :43. `renderFormats` cap → :71. `ownsFormat` → :63 (fails), :266. `checked` → :23.
- `state-pages.mts` flow link line 132 → `state-html.test.mts:655-690` (present, missing → unavailable at :668, symlink not linked at :682-685). `safeEvidencePath` helper not read (unverified).

## 8. Plan exit criteria (plan.md S1–S3)

- S1 `flow-join` + `flow-report` exit 0: **not met** (F1 at :266).
- S2 `flow-render` + `flow-report` + `flow-join` exit 0: **not met** (F1 at :63, :266).
- S3 `state-html` exit 0: met (79/79). `state-snapshot` and `setup-validator` / graph: **unverified** (not run).

## 9. Cross-file interactions

Reviewed:
- flow-report → flow-render: `renderFormats`, `ownsFormat`, `FILE_NAMES`. The ownership defect crosses this boundary (F1).
- flow-report → flow-join: `joinFlowReport`, `projectX`, `FLOW_LIMITS`. Checked against join tests.
- flow-report → workflow-metrics-state: `metricsDirectory` (:543-557 read), `readText`, `readWorkflowState`, `withMetricsLease`. Canonicalization and pinning look consistent.
- state-pages ↔ flow-report: file name `flow-report.html` matches in both files.

Not reviewed or unverified:
- `workflow-metrics-state.mts` lease implementation and `readText` internals (only the pinned call sites read).
- `state-pages.mts` `safeEvidencePath` body.
- `state-snapshot.test.mts` (not run).
- `review-bench.mts` relation to the flow modules: tests pass, imports not traced.
- Repository-wide callers of `ownsFormat` (only in-scope files read; no repo grep, per constraints).

## 10. Tried and failed

- First mutant batch, copying only `ai-framework/scripts`, failed to load (`hooks/scripts/metrics-lock.mts` not found, since `workflow-metrics-state.mts` imports `../hooks/`). Those results were discarded. The rerun copied `scripts` and `hooks`, and all results in section 4 come from the rerun.

## 11. Unverified required items

- Coverage percentages (not measured).
- `state-snapshot.test.mts` (not in brief run list, required by plan S3).
- Bun runs, full Node suite, `setup-validator`, graph check (coordinator-run per brief).
- Output cap, source-bound, short-write and lease-release mutants (not run).
- Live-path authorized file `.project/metrics/token-time-report-audit/coverage-retry-report.md`: not written (ownership limited to scratch report.md).
