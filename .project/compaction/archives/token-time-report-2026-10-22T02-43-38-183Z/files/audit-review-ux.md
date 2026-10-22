# Audit review record: ux

independent: yes
canary: caught
read-only: verified by review-bench guard-cycle1-check.json
prompt-sha256: 1c01825549f7233d1aba8b7d040753e9978ff81ddd8b1860a94bbc3e2e07702c
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-ux.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-ux-rlv2ttpr.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# UX audit: token-time-report (flow-join / flow-report / flow-render, state link)

Reviewer: ux-reviewer pass, claude-sonnet-5-5. Scratch copy only, whole files read. This is a code-inspection review. No browser was used, so there are no visual, contrast or geometry measurements.

Verdict: **BLOCK on one must-fix (F1)**, which is a keyboard-scroll defect plus a red test. Everything else is should-fix or acknowledged.

## Commands run (all in the scratch directory)

1. `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/flow-join.test.mts ai-framework/scripts/flow-render.test.mts ai-framework/scripts/flow-report.test.mts` gave **41 tests, 40 pass, 1 fail**.
   - The failure is "hostile labels stay inert in Markdown and HTML and the page has no active or external content".
   - The assertion at `flow-render.test.mts:55` expects `class="scroll" role="region" aria-labelledby="t0" tabindex="0"`.
   - The actual HTML has `tabindex="-1"`.
2. POC `poc1.mts` (scratch only) rendered HTML and Markdown from a stale, token-only report.
   - It found 7 occurrences of `tabindex="-1"`, and no `tabindex="0"`.
   - The tokens source showed status `stale` with the reason "source is more than seven days old".
   - With no usage source, the time-totals table renders every cell as the literal text `unavailable`.
3. Greps: `tabindex` across the scripts; the state link in `state-pages.mts:132` and `state-html.test.mts:661-685`; the sibling `state-render.mts:93`; and the `workflow-metrics.md` contract text.
4. Orca mailbox polled once before completion. It returned 0 messages. A heartbeat was sent.

## Cross-file interfaces reviewed

- **join to render:** `FlowReport`, `FlowNode`, `TokenCell` and `FLOW_LIMITS` are consumed by `flow-render.mts`. Source status, windows and timing are only rendered, never recomputed, and the tables are shared by all three formats, so semantics cannot drift between them. Checked.
- **render to report CLI:** `FORMATS`, `FILE_NAMES`, `ownsFormat` and `renderFormats` are used by `flow-report.mts`. The marker regex and the generation ID format agree, and the output cap returns null, which is refused with a message. Checked.
- **report to state:** `state-pages.mts:132` links the fixed `.project/metrics/flow-report.html` through the existing link helper. `state-html.test.mts:661-685` covers present, missing and symlinked targets, and shows /state never generates the report. The link label "Joined token/time report" matches what the renderer writes (`<h1>Flow report</h1>`). The names differ slightly ("Flow report" vs "Joined token/time report"). That is acknowledged, not a defect. The renderer writes no back-link to /state (see F5).
- **Sibling consistency:** `state-render.mts:93` wraps scroll regions with `tabindex="0"`; flow-render uses `-1` (see F1).
- **Contract:** `workflow-metrics.md` lines 195-236 document the commands, apply, and staging recovery. They match the CLI behaviour I read. I did not diff the full contract text line by line.

## Heuristic walk (internal static report, so the internal-tool exception in `ui-ux-review.md:394` is applied with common sense)

| Heuristic | Score | Evidence |
|---|---|---|
| H1 Visibility of status | 2 | Source table shows status, since, updated, reason, so unavailable, partial and stale are all visible as text. Stale appears only as the word "stale" in the Status column and has no banner (F4). The provisional note appears only above the "Observation windows" table, not beside the time tables (F3). |
| H2 Real-world match | 2 | Labels are honest: "Wait ms (lower bound)", "stored, not summed from children", "vendor-defined agent completion event". Raw milliseconds and ISO strings are not human-formatted (F6, acknowledged). |
| H3 User control | N/A, scored 2 | A static document with no actions. The print or save path is the browser's. |
| H4 Consistency | 1 | The sibling state pages use `tabindex="0"`, `role="group"` and `aria-label`; this report uses `role="region"` with `tabindex="-1"` (F1). The recorded neutral-UA-style deviation is accepted. |
| H5 Error prevention | N/A | No destructive actions in the page. Apply-side prevention is the CLI's job, and it is out of scope as an accepted design limit. |
| H6 Recognition over recall | 2 | Every table has a caption, `th scope=col` headers and row headers. Field names like `unjoinableLeafRows` leak raw identifiers in the Details cell (F6). |
| H7 Flexibility / responsive | 1 | Wide tables sit in an `overflow-x:auto` region, and the viewport meta is present, so layout is OK on paper. The region is not keyboard-focusable (F1), so keyboard users cannot scroll to hidden columns. This violates the plan exit "keyboard-readable ... scrollable wide tables". Not measured at 360px. |
| H8 Simplicity | 2 | Eight tables is a lot, but the plan and deviation S2 accept the multi-table structure. Two cases show tables used where a single value would do (F7). |
| H9 Error recovery | 2 | Missing, unsupported and refused sources show fixed reasons. The CLI error text names the recovery step, including the staging directory removal. |
| H10 Help | 2 | A Notes section and per-table notes explain units and non-comparability. There is no legend for the status vocabulary (observed, stale, partial, unreported, overflow). |

Component architecture (`component-architecture.md`): N/A in the framework sense because there is no UI framework. The code is a single pure module with one `tables()` model shared by Markdown and HTML, which fits the rule's intent. Checked.

## Findings

| # | Severity | Location | Rule | Input to wrong outcome | Verified | Suggested fix |
|---|---|---|---|---|---|---|
| F1 | **must-fix** | `flow-render.mts:99` (test `flow-render.test.mts:55`) | `ui-ux-review.md:137` (keyboard nav needs tabindex), plan S2 exit "keyboard-readable", H7 | Any report with a table wider than the viewport (the 13-column scope table, always at 360px). The scroll `<div>` has `tabindex="-1"`, so it is not in the tab order. Keyboard-only users cannot focus and scroll it, and `:focus-visible` styling at `flow-render.mts:91` is effectively unreachable. The test expects `0`, so the suite is red: 40 of 41 pass. | yes, by command 1 and POC 2 | Change to `tabindex="0"`. Re-run the render test. Also fix the S2/S3 evidence text if it claims a green suite. |
| F2 | should-fix | `plan.md:160` (build rollup) versus command 1 | Plan "Observable acceptance" | The plan states S1-S3 are done with the full suite passing, but the scratch scoped run is red. Either the scratch copy differs from the evidence run, or F1 was introduced afterward. | yes (red run); cause unverified | Re-run the scoped exit command at the real source and reconcile. |
| F3 | should-fix | `flow-render.mts:57,62,65` | H1, plan "honest timing labels" | When timing is provisional, the note shows only in the "Observation windows" table. The "Time totals" and "Pitch, phase and scope rows" tables show raw Active and Wait numbers with no provisional marker, so a reader who scrolls to them sees them as final. | yes, by inspection and POC output | Repeat a short provisional note on the time tables when `t.provisional === true`. Active ms is also unlabelled as "settled only"; consider "Active ms (settled)". |
| F4 | should-fix | `flow-render.mts:55-56` | H1 | A stale source (older than 7 days) is only the plain word "stale" in a table cell. Nothing at the top of the page says the numbers below come from a stale source. In the POC the tokens source was stale. | yes (POC showed status `stale`); no visual proof | Add a short status summary line above the tables, for example "tokens: stale; usage: missing". Text only, no colour needed. |
| F5 | acknowledged | `flow-render.mts:103` | H3 | The page has no link back to the /state report, although /state links forward to it. | yes, by inspection | Optional relative link. Skip if an active link policy forbids it; the plan says no active user-supplied link, and this would be a fixed one. |
| F6 | acknowledged | `flow-render.mts:56` and `flow-join.mts:313-315` | H2, H6 | The Details cell prints raw `key=value` pairs such as `unjoinableLeafRows=0` and `ageMs=0`, about 20 for usage. Dense but accurate for an internal tool. | yes | Acceptable under the internal-tool exception. |
| F7 | acknowledged | `flow-render.mts:62,97` | H8, accessibility | In "Time totals" the first value (Active ms) is rendered as `<th scope="row">`, so a number is a row header. When usage is missing the whole row is the word "unavailable", repeated 7 times. | yes (POC) | Optional: render the single-row table with `<td>` cells, or collapse to one "unavailable" line. |

## Checks done on plan exits (UX relevant)

- Same semantics across formats: checked, because both formats use the same `tables()` output and the tests pass for it, except the F1 assertion.
- Standalone, inert, CSP: checked. The CSP is `default-src 'none'; style-src 'unsafe-inline'`, there is no script and there are no links, and hostile labels are escaped (the POC output shows `&#60;img ...&#62;`).
- Markdown escaping: checked in the POC and the existing tests.
- Captions and headers: checked, with caption, `th scope=col` and `th scope=row` on every table.
- Unavailable, partial and stale: statuses are present (checked); prominence is weak (F3, F4).
- Honest timing labels: "Wait ms (lower bound)" is checked; the provisional marker coverage is partial (F3).
- /state link: checked, covering present, missing and unsafe targets and no generation.
- Dark mode: `color-scheme: light dark` is set, with no explicit colours. Only `#8886` borders are set. Contrast is unverified, with no browser run.

## Things I tried that did not work

- `timeout 20 ...` does not exist on this macOS shell (`command not found: timeout`), so the first test run and POC failed to launch. I re-ran without it. Each run finished well under 20 s.
- I did not open any browser. All H1 to H10 scores come from code inspection only.

## Not reviewed / unverified

- Visual rendering, contrast, 360px geometry, and the actual focus ring: **unverified**.
- Fully diffing `workflow-metrics.md` against the CLI: not done, spot check only.
- `state-pages.mts` and `state-html.test.mts` beyond the flow-report link and its tests: not reviewed.
- The publish-path race and the non-atomic three-file set were skipped as accepted design limits. The multi-table neutral-UA style was also skipped, as an accepted design limit.
- I did not run `flow-report.test.mts` publication cases individually. They are included in the 41 tests, which passed apart from F1.
