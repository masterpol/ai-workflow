# Audit review record: ux-recheck

independent: not-completed
canary: caught
read-only: verified by review-bench guard-retry-check.json with exact coordinator-patch and secret-exclusion accounting
prompt-sha256: dafd550b6c1209638af647ce1b046f22401e037f977525eeb3038cd7e9d681a9
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. Guard snapshots/checks verified original files, within the documented size/mtime limitation for files larger than 2MiB.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-ux-recheck.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-ux-recheck-pkjkj3rc.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# UX recheck report: flow-render slice (caveman=full, static review)

**Verdict: BLOCK.** One tested defect: wide-table scroll regions are not keyboard-focusable. The test that should catch it fails.

Scope: whole `flow-render.mts` and `flow-render.test.mts`. Also read whole `flow-join.mts` (timing and source-status model) and the `state-pages.mts` link at line 132. Contract: plan.md S1-S3 and `workflow-metrics.md`.
Not assessed: browser geometry, contrast and real keyboard behavior in a browser (out of scope per brief). No browser was run.

## Rule-body sections (ui-ux-review.md; read in full)

The rule's "Skip for internal admin tools (use common sense)" applies. This is a static internal report, so I applied the H1-H10 walk as a lens, not a hard gate. The ≥2 / H8≥3 pass bar is reported but not treated as binding.

| Rule section | Result |
|---|---|
| H1 status | Checked. See findings F2 and F6. |
| H2 real world | Checked. Metric names (`cacheHitRatio`) and source `details` keys (`captureDropped`) leak to a developer audience. Acceptable for an internal tool. |
| H3 control | N/A. Static page, no actions. |
| H4 consistency | Checked. Same title, header and note pattern on all 8 tables. The Markdown and HTML paths come from one `tables()` model. |
| H5 prevention | N/A. No input. |
| H6 recognition | Checked. See F3. |
| H7 flexibility | Checked statically. See F1 (blocker). Mobile geometry is not assessed. |
| H8 minimalism | Checked. 8 sections plus notes, all tabular, no collapsing. See score. |
| H9 error recovery | N/A for the page. Refusal reasons are shown in the Sources table. |
| H10 help | Checked. See F6. |
| Project-specific patterns (progressive disclosure, sidebars, sheets) | N/A to a static report. |
| Review checklist: Visibility, Language, Control, Consistency, Error, Recognition, Efficiency, Simplicity, Recovery, Help | Checked or N/A as per the H rows above. Touch targets ≥44px, 360/768/1920 widths, spacing ≥16px and contrast are **unverified (not assessed)**. |
| Scoring rubric | See table below. |

## Role checklist (ux-reviewer.md)

- Inputs: diff slice replaced by whole files, as instructed. `component-architecture.md` and `.project/rules/{frontend-framework,styling}.md` are **unverified** (not in scratch, and they target app components).
- Process steps 1-4 done. The `.project/knowledge/patterns/` cross-check is unverified (not in scratch).
- Findings below are limited to ones I am more than 80% sure of.

## H1-H10 scores

| Heuristic | Score | Evidence |
|---|---|---|
| H1 status | 2 | Provisional note sits directly above each time table: windows (`flow-render.mts:58`), time totals (`:63`) and pitch rows (`:65`). The test counts exactly 3 occurrences in both HTML and Markdown (`flow-render.test.mts:59-60`). Source status is shown as text (`observed`/`stale`/`missing`/`refused`), not by color alone. Deduction: F2. |
| H2 match | 2 | Plain labels such as "Wait ms (lower bound)" and "Time totals (stored, not summed from children)". Internal metric keys remain visible. |
| H3 control | N/A (scored 2 by default) | Static page. |
| H4 consistency | 3 | One model drives all three formats. Identical headers, notes and `unavailable` wording. |
| H5 prevention | N/A (2) | No input. |
| H6 recognition | 2 | Deduction: F3. |
| H7 flexibility | **1** | F1. The scroll region has `tabindex="-1"`. |
| H8 simplicity | 3 (static internal tool) | Tables only, no decoration, no animation. The 13-column rows table is dense (F3). |
| H9 recovery | 2 | Refusal reason in the Sources table. No next-step hint. |
| H10 help | 2 | Notes section and per-table explanatory notes. Empty states are bare (F6). |

H7 = 1 fails the "all ≥2" pass bar. This is why the verdict is BLOCK.

## Required checks

- **Provisional warning beside each time table.** PASS (static). Three time-bearing tables carry `timingNote` when `t.provisional === true`. The transitions and trace table has no time columns.
- **Inert Markdown/HTML.** PASS (static plus test). Labels, notes and the generation ID are escaped. Every cell goes through `esc` (all five characters `& < > " '`) or `mdCell`. The generation ID is validated against a UUID regex before use, and the test feeds `"><script>`. The HTML has no `href`, `src` or event attributes, and its CSP is `default-src 'none'`. Control characters are stripped by `text()`. The test passes the hostile-label assertions that come before line 55.
- **Keyboard scrolling.** **FAIL.** See F1.
- **Captions and headers.** PASS with nits. Every table has `<caption>`, `<th scope="col">` headers and a `<th scope="row">` first cell. See F4 and F5.
- **Windows and source status model** (`flow-join.mts`). PASS. `stale`, `missing`, `refused` and `unsupported` each carry a reason. `aligned` is exposed. Unavailable values are `null`, rendered as `unavailable`, never zero.
- **state-pages link** (`state-pages.mts:132`). PASS. It uses the same `links()` helper as its siblings. When `safeEvidencePath` rejects the path, it renders the label plus the `OFF` text instead of a dead link.

## Selected tests (scratch, Node 24.21)

Command:
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/flow-render.test.mts ai-framework/scripts/flow-join.test.mts`

Result: 19 tests, 18 pass, **1 fail**.

The failure is "hostile labels stay inert in Markdown and HTML…", at `flow-render.test.mts:55`. The assertion expects `class="scroll" role="region" aria-labelledby="t0" tabindex="0"`. The rendered HTML has `tabindex="-1"`. All assertions before line 55 passed. Lines 56-60 never ran, because the assertion at line 55 threw first. The provisional-note counts at lines 59-60 are therefore verified only by code reading, not by an executing test.

## Findings

| # | Severity | Location | Rule | Concrete input → wrong outcome | Verified | Fix |
|---|---|---|---|---|---|---|
| F1 | **must-fix (BLOCK)** | `flow-render.mts:100` (emitted `tabindex="-1"`); CSS `:92` | H7 keyboard; plan S2 "keyboard-readable… scrollable wide tables"; `workflow-metrics.md:231` "keyboard-focusable scroll regions" | Any report → each `.scroll` div has `tabindex="-1"`, which removes it from the Tab order. The 13-column rows table (`:64`) overflows horizontally on a narrow window. A keyboard-only user cannot focus the region and so cannot scroll it with the arrow keys. The explicit `-1` overrides the default scroller focusability some browsers apply. The `:focus-visible` style at `:92` cannot be reached by Tab. | **Yes**: the scratch test fails and the output shows `tabindex="-1"`. Browser behavior not assessed. | Emit `tabindex="0"`, which is what the test and contract expect. Keep the region label. |
| F2 | should-fix | `flow-render.mts:50-51,58` | H1 | `t.provisional === null` (usage source missing or refused) → no `timingNote`, and the time tables show only `unavailable` cells. The reader is not told *why* nothing is shown beside the table. The reason exists only in the Sources table. | Static read of the `provisional === true` condition. | Add a note beside the time tables when timing is unavailable, naming the usage source status. |
| F3 | should-fix | `flow-render.mts:64-66` | H6 | The rows table has 13 columns. The row header is the `Level` cell ("pitch"/"phase"/"scope"). The identifying `Path` is column 2, so it is not the row header. Scroll right to see the time or token columns and the path scrolls out of view. Many rows read "pitch/phase/scope" with no visible identity. | Static read of the row construction. Geometry not assessed. | Put `Path` first so it becomes the `scope="row"` header. Optionally make that column sticky. |
| F4 | acknowledged | `flow-render.mts:63,98` | H4 | Time totals has one data row, whose first cell is the value `0`. It is rendered as `<th scope="row">0</th>`. A screen reader announces a number as a row header. | Seen in the test output (`<th scope="row">0</th>`). | Render value-only rows with `<td>`, or add a "Stored total" label column. |
| F5 | acknowledged | `flow-render.mts:97,100` | H1/accessibility | The `<h2 id=tN>` text, the region `aria-labelledby` and the `<caption>` all carry the same title. A screen reader may announce the title two or three times. | Static read. | Drop the caption or the region label. Low value. |
| F6 | acknowledged | `flow-render.mts:83,100` | H10 | `rows.length === 0` renders a bare "No rows." (Markdown `_No rows._`). No hint about what to do, for example "usage source missing". The pitch transitions table is also empty whenever usage is absent. | Static read. | Optional: reuse the source status reason in the empty text. |

I did not raise a finding for Markdown escaping noise (`.` and `/` are backslash-escaped, so raw text such as `2026-10-21T12:00:00\.000Z` is harder to read). It renders correctly, and the escaping is the safe choice.

I did not raise a finding on bidi or Unicode control characters. Labels reach the renderer already passed through the joiner's `SAFE` ASCII regex, so the path is not reachable today. The renderer's `text()` strips only C0 and DEL, so this is a defense-in-depth note only.

## Cross-file interactions

- `flow-join.mts` → `flow-render.mts`: reviewed. The `FlowReport` fields used by `tables()` match the joiner's output types. Null/unavailable values stay explicit, and omitted counts are surfaced. The joiner's `FLOW_LIMITS.outputBytes` is used by `renderFormats`.
- `flow-render.mts` → `state-pages.mts:132`: reviewed. The link target is the fixed name `flow-report.html`, which matches `FILE_NAMES.html`. The label is "Joined token/time report".
- `flow-report.mts` (CLI/apply): exists in the scratch copy but was **not reviewed**. It is not in the named slice.
- `workflow-metrics.md`: only the grep hits were checked. Full-document consistency is **unverified**. The line-231 claim of keyboard-focusable scroll regions conflicts with F1.

## What I tried that failed

- `timeout 20 node …` failed because `timeout` does not exist on this macOS. I re-ran with a `perl alarm` wrapper.
- I did not open the HTML in a browser, so no geometry, contrast or keyboard claim is made.

## Unverified required items

- Browser rendering: geometry, contrast, touch targets, 360/768/1920 widths, and actual Tab/arrow scrolling.
- `component-architecture.md`, `.project/rules/*` and the `.project/knowledge/patterns/` cross-check.
- Full `workflow-metrics.md` consistency (grep hits only).
- `flow-report.mts` publication path.
- Test lines 56-60, which never ran because of the line-55 failure.

**Not PASS.** Required checks are incomplete, and F1 is a tested defect.
