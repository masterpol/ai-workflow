# Audit review record: cross

independent: yes
canary: caught
read-only: verified by review-bench guard-cycle1-check.json
prompt-sha256: c0a10df90c27825d79de5077900d26a9fa46dfac69fa9e1742d3fea155281bb9
model: claude-haiku-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-cross.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-cross-rzal1fgc.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Cross-pitch conflict audit: token-time-report

Scope: fresh whole-file audit of the scratch copy at `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-cross-rzal1fgc`. The scratch tree has no `.git`, so no diff was computed. Ownership comes from declared file lists in pitch artifacts, not from shared dirty files. The live repository was not read or written.

## Verdict

**BLOCK for ship until one same-repository ownership collision is resolved.** One pure overlap exists: `ai-framework/scripts/flow-report.mts` is declared as an owned edit by the active pitch `workflow-v3-rollout` and is a planned new file in `token-time-report`. The three flow test files pass under Node and Bun. No other cross-pitch overlap was proven.

## Scope and method

- Target files read in full: `flow-join.mts` (322 lines), `flow-report.mts` (223), `flow-render.mts` (121), and the sibling tests `flow-join.test.mts` (239), `flow-render.test.mts` (71), `flow-report.test.mts` (384).
- Integration only: `state-pages.mts` line 132 (the `flow-report.html` link) and `state-html.test.mts` lines 661–685 (link present, missing target, symlinked target, and "state does not generate reports").
- Contract: `token-time-report/plan.md` (160 lines), `token-time-report/deviations.md` (19 lines). `workflow-metrics.md` was counted (242 lines) but not reviewed in full because it is S3 documentation.
- Other active pitch: `workflow-v3-rollout` (`pitch.md`, `readiness.md`). Its `plan.md` does not exist. `restore-vendor-adapters` is parked in `status.md` and was excluded.
- Ownership source: pitch artifacts only.

## Role checklist (cross-pitch-conflict-checker steps 1–3)

| Check | Result | Evidence | Verified |
|---|---|---|---|
| Step 1: read other active pitch `plan.md` | N/A for v3 (no plan file). Scope list taken from `pitch.md` "Places" and affordances instead | `ls .project/pitches/workflow-v3-rollout` shows `pitch.md`, `readiness.md` only | checked |
| Step 2: `deviations.md` / `log.md` of other pitch | N/A (none present for v3). Own `deviations.md` read as contract | `ls` output; `deviations.md` 19 lines | checked |
| Step 3: intersection, pure overlap | **1 pure overlap**: `ai-framework/scripts/flow-report.mts` | v3 `pitch.md:21`; token-time `plan.md:13` (S1 new file) and `plan.md:14` (S2 extends) | checked |
| Step 3: adjacent overlap (needs import/export proof) | None proven. v3 names no other module, so no import edge can be shown | grep of v3 `pitch.md` and `readiness.md` for `.mts` and path tokens: only `flow-report.mts` matched | checked |
| Step 3: disjoint remainder (8 other implementation files) | No v3 claim found | same grep; v3 `readiness.md` names no repo file paths in this repo | checked |
| Parked pitches excluded | Yes | `status.md` parked table lists `restore-vendor-adapters` | checked |
| Current nine files exist | Yes: `flow-join.mts`, `flow-report.mts`, `flow-render.mts`, three test files, `state-pages.mts`, `state-html.test.mts`, `workflow-metrics.md` | `wc -l` listing | checked |
| Release files (`VERSION`, `CHANGELOG.md`) contention | No v3 claim found; plan defers release metadata to ship | `plan.md:69`, `plan.md:86` | checked (no collision) |
| Diff-based check against base | Not possible: no `.git` in scratch | `git status` returned "not a git repository" | unverified |

## Ownership collision (finding F1)

- `.project/pitches/workflow-v3-rollout/pitch.md:21` says: "Places: this repository's `ai-framework/scripts/flow-report.mts` (owned edit), plus each project's ..."
- `.project/pitches/token-time-report/plan.md:13` assigns `flow-report.mts` (new) to S1. Line 14 extends it in S2.
- `workflow-v3-rollout` is listed as active in `.project/status.md` (phase `shape`, last touched 2026-10-16). It has no plan, so its claim is not yet scheduled, but it is still a declared claim in this repository.
- `token-time-report/plan.md:86` says "workflow-v3-rollout operates in receiving repositories." This statement does not account for `pitch.md:21`, so the plan's cross-pitch note is incomplete.
- Overlap class: **pure**. Severity: **must-fix**.
- Merge-order recommendation: `token-time-report` ships first. It already has S1 and S2 evidence and is at audit (`status.md`). `workflow-v3-rollout` should remove or rebase its `flow-report.mts` claim (the pitch's own no-go is "no application code changes in any project", so this claim looks like a stale breadboard note) before its own `/plan`. Its later branch must rebase on the shipped `flow-report.mts`.

## Test and command evidence

| Command (scratch cwd) | Result | Verified |
|---|---|---|
| `node --experimental-strip-types --disable-warning=ExperimentalWarning --test flow-join.test.mts flow-render.test.mts flow-report.test.mts` (Node v24.21.0) | Exit 0 (background run, log in scratchpad `node-flow-tests.txt`). Summary count not parsed from the log | checked (exit code only) |
| `bun test` on the same three files | 41 pass, 0 fail, 3 files, 451 ms | checked |
| `node ai-framework/scripts/flow-report.mts --root . --format markdown` (scratch, no metrics dir) | Renders a valid report: all three sources `missing`, generation ID present, marker first line. Exit code not captured because of a pipe | checked (output), exit unverified |
| `node ... flow-report.mts --apply --format json` | Usage error text "--apply publishes every format; omit --format" and the usage line | checked |
| `node ... run-tests.mts --runtime node` (full suite) | Not run | unverified |
| `state-html.test.mts`, `state-snapshot.test.mts` (S3 exit) | Not run; S3 integration assessed by reading `state-pages.mts:132` and `state-html.test.mts:661–685` only | unverified |
| `setup-validator.mts`, `graphify.mts --check` | Not run | unverified |
| `timeout` wrapper | Not available on macOS; used a `perl alarm` wrapper and background runs instead | n/a |

Attempts that did not work: a foreground Node run piped through `grep` returned nothing (the summary lines did not match the grep), so the background run was used. `timeout` was not installed.

## Checklist walk: plan exits (S1–S3)

| Item | Status | Evidence | Verified |
|---|---|---|---|
| S1 test command exits 0 | Checked for the three flow tests: Node exit 0, Bun 41 pass | section above | checked |
| S1 behavior cases (exact join, sentinels, partial/overflow, timing nonadditive, pending provisional, refusals, bounds, history staleness, output caps) | Covered by `flow-join.test.mts` cases (lines 51–239) and `flow-report.test.mts` cases (lines 44–384); pass in both runtimes | file read + run | checked |
| S1 "no nested lease, no source writes, lease release on refusal, legacy lock" | Covered at `flow-report.test.mts:112–124`, `:173–183` | file read + run | checked |
| S2 three formats, one generation, inert HTML, CSP | Covered at `flow-render.test.mts:23–57`; CSP meta at `flow-render.mts:102` | file read + run | checked |
| S2 owned publication, staging, swap refusal, mixed-generation report | Covered at `flow-report.test.mts:216–366`; code at `flow-report.mts:128–192` | file read + run | checked |
| S2 "no second lease" on apply | `flow-report.test.mts:224–238` asserts `acquired: 1` | file read + run | checked |
| S3 link, no generation from state | `state-pages.mts:132`; `state-html.test.mts:661–685` | file read only | unverified (test not run) |
| S3 contract doc (`workflow-metrics.md`) | Not reviewed in full | — | unverified |
| Bounds (51/16/26/600, 100 rows, 4 MiB) | `flow-join.mts:9–13`, `:109–125`, `:297`; tests `flow-join.test.mts:141–150`, `:158–170` | file read | checked |
| Deviation D-S1 (usage reader 52/18 bounds) | Matches code: `flow-join.mts:13` (`USAGE_BOUNDS` 52/18) | file read | checked |
| Deviation D-S2 (multi-table static report, neutral UA styling) | Known accepted design limit, not counted as new | `flow-render.mts:90–92` | checked (excluded) |

## Cross-file interfaces reviewed

- `flow-report.mts` imports `runDirect` from `runtime/cli.mts:31` (exists), `FORMATS`, `ownsFormat`, `renderFormats` from `flow-render.mts`, `FLOW_LIMITS`, `REASONS`, `joinFlowReport`, `projectHistory`, `projectTokens`, `projectUsage`, and types from `flow-join.mts`, and `errorCode`, `metricsDirectory`, `readText`, `readWorkflowState`, `withMetricsLease` from `workflow-metrics-state.mts`. Every named export was confirmed present (`workflow-metrics-state.mts:96, 543, 560, 589, 646`).
- `flow-render.mts` imports `FLOW_LIMITS` and types from `flow-join.mts` only.
- `flow-join.mts` imports types only (`UsageRow`, `UsageState`) from `workflow-metrics-state.mts`. It does not import the CLI or any filesystem module. The "no reverse imports" rule holds: nothing in `flow-join` or `flow-render` imports `flow-report`.
- Tests import the same modules plus `runtime/test-helpers.mts` and `runtime/types.mts`. All resolve.
- `state-pages.mts:132` links `.project/metrics/flow-report.html` through the existing link helper. No `flow-report` import from `state-pages`.

## Findings

| # | Severity | File:line | Rule / check | Concrete input → wrong outcome | Command/output | Suggested fix | Verified |
|---|---|---|---|---|---|---|---|
| F1 | must-fix | `.project/pitches/workflow-v3-rollout/pitch.md:21` vs `.project/pitches/token-time-report/plan.md:13–14` | cross-pitch pure overlap | Both pitches claim `ai-framework/scripts/flow-report.mts`. If v3 is bet and built first, its branch rewrites a module that token-time has already published; merge conflict and possible loss of the apply-safety guards | Scratch grep for `flow-report` in v3 artifacts: `pitch.md:21` only | Ship `token-time-report` first; v3 removes or rebases its claim on the shipped file before its `/plan`; correct `token-time-report/plan.md:86` to name the claim | checked (text evidence) |
| F2 | should-fix (documentation) | `.project/pitches/token-time-report/plan.md:86` | cross-pitch note accuracy | Plan says v3 "operates in receiving repositories" and omits the `pitch.md:21` claim, so the audit trail shows no collision | `grep` output above | Update the cross-pitch note to cite `pitch.md:21` and the merge order in F1 | checked |

No adjacent-overlap finding: no import/export proof exists between v3 artifacts and the nine files. No release-file (`VERSION`, `CHANGELOG.md`) collision is recorded.

## Code observations (whole-file read, not cross-pitch)

No new code defect was reproduced in this pass. The read-through found the guards consistent with the plan: validation before use, pinned directory identity on each guarded call, exclusive staging, and generation-ID markers. Both accepted limits (non-atomic publication across three files, and the path recheck-to-syscall race without `openat`) were excluded as instructed. The brief asked for a targeted cross-file audit, so no deeper line-by-line code review was done.

## Not reviewed / unfinished

- Full Node suite and S3 test set (`state-html.test.mts`, `state-snapshot.test.mts`) not run. Affects S3 evidence and plan line 160 counts (2469 Node, 207/120 scoped), which are unverified here.
- `workflow-metrics.md` contract not reviewed in full.
- `setup-validator.mts` and `graphify.mts --check` not run.
- Exit code of the markdown preview POC not captured.
- Report path: the brief lists `.project/metrics/token-time-report-audit/cross-report.md` as an authorized path, but its Ownership and Observable acceptance sections require only the scratch `report.md`. Only the scratch file was written. No live repository file was touched.

## Mailbox

Mailbox poll is performed once after this file is written, as the brief requires.
