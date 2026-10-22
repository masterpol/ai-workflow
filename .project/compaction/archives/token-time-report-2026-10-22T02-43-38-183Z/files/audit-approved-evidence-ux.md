# Approved evidence-pass record: ux

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (.project/metrics/token-time-report-audit/proposed-evidence-pass/guard-after.json) and scratch-integrity.json
prompt-sha256: da1558be27c6fc19128148e84f5707c114742978032f0c76232ed490283b4a73
model: claude-sonnet-5-5
cross-file interactions: reviewed

## Coordinator assessment

Fresh reviewer, original author model family; this does not prove independence from that family's blind spots. Required scope is the exact unfinished TASK.md checks, not a new full audit. All source bytes in every scratch copy match the prepared manifest except its deliberate defect; the live repository guard is clean. All four exact worker_done messages were accepted, workers released and attempt ledgers settled. The older human-owned retained resource remains untouched.

All three task checks were performed, including separate POCs so the planted keyboard defect did not suppress provisional-warning and escaping assertions. Browser geometry/contrast are outside this static-code review scope. Framework-only rules were justified N/A. Minor row-header/title repetition is retained as the existing TTR-A4 follow-up, not a live blocker.

| Finding / check | Verified | Disposition |
|---|---|---|
| Planted defect at ai-framework/scripts/flow-render.mts:100 | yes, explicit independent finding with executed test/POC and source/manifest comparison | Scratch only; canonical source retains the guard |
| Automated raw citation check | true | Matches manifest line range |
| Required TASK.md checks | yes, bounded execution/static evidence as specified | Completed with the explicit proof limitations above |

Exact dispatched prompt: `.project/metrics/token-time-report-audit/proposed-evidence-pass/prompt-ux.txt`. Raw completion, report and release receipts remain in that local evidence directory. Worker self-assigned metadata below is preserved verbatim; the coordinator owns the verified assessment above.

## Verbatim worker report

# ux-reviewer evidence pass — token-time-report (static, read-only)

Verdict: **BLOCK** (1 verified defect, 2 non-blocking notes). Browser geometry/contrast not reviewed (out of scope).

## Findings
| ID | Sev | File:line | Finding | Verified |
|----|-----|-----------|---------|----------|
| UX-1 | must-fix | ai-framework/scripts/flow-render.mts:100 | Scroll region emits `tabindex="-1"`: not in the Tab order, so the wide tables' scroll regions are not keyboard-focusable. Contract (REVIEW-CONTRACT.md:393, plan S2 "keyboard-readable") and the focus style at :92 both require focusable. Fix: `tabindex="0"`. | YES: POC printed 8x `-1`; `node --test flow-render.test.mts` fails assertion at flow-render.test.mts:55 (expects `tabindex="0"`, actual `-1`). |
| UX-2 | note | flow-render.mts:98 | In "Time totals" the single body row's first cell (a number, e.g. `0`) is `<th scope="row">`; the header row is the metric names, so the row header is a value, not a label. Same class as deferred TTR-A4; not counted as new. | YES: POC html shows `<th scope="row">0</th>`. |
| UX-3 | note | flow-render.mts:99-100 | Heading `h2`, `caption` and region `aria-labelledby` all repeat the table title, so a screen reader hears it up to 3 times. Neutral multi-table static UI accepted limit. | YES (static markup). |

## Check 1 — component-architecture (pure static renderer)
- Applies: line-count limit (cohesive-unit exception recorded in COHESIVE-UNITS.md; flow-render.mts 122 lines, one responsibility, shared table model + escaping). Pure-module split: renderer imports only the sanitized model, no fs. PASS.
- Mobile-first: viewport meta present, 16px gutter, `.scroll{overflow-x:auto}` for wide tables, no max-width hacks. Static inspection only. PASS.
- N/A (framework-only), justified: hooks/composables extraction, sub-component extraction, server/client hydration mismatch, responsive-state defaults, touch targets (no interactive controls beyond scroll regions and no buttons), component tree/props. There is no framework, state or client script (CSP `default-src 'none'`, no script).

## Check 2 — focused proofs (POC: scratch poc/poc.mts, run with node)
1. Three provisional warnings: with a pending activity, the timing note appears exactly 3x in Markdown and 3x in HTML (windows, time totals, rows tables; `provisional=true`). With nothing pending: 0x, `provisional=false`. PASS. (Note: `provisional===null` yields no note by design at flow-render.mts:50; value shows "unavailable".)
2. Inert Markdown labels: vendor labels `https://evil.example/x`, `user@example.com`, `www.evil.com` pass validation and render as `https:\/\/evil\.example\/x`, `user\@example\.com`, `www\.evil\.com`; no raw URL/email/`](`/tag survives in Markdown; HTML has no `<a`, `<script`, `href=`. Labels `[x](javascript:alert(1))` and `<script>` are rejected by validation (no vendor row). PASS.
3. Semantic attributes: 8 tables = 8 captions = 8 regions with aria-labelledby; `th scope=col` 53, `th scope=row` 25; 0 duplicate ids; `lang="en"`, viewport, CSP present. **FAIL on keyboard attribute** (UX-1).

## Check 3 — state link
- state-pages.mts:132 adds `.project/metrics/flow-report.html` via the existing `links` helper (:125) with `safeEvidencePath`; unsafe/missing gives "label: unavailable" text, not a link. Filename equals `FILE_NAMES.html` (flow-render.mts:13) and the publish directory is `metricsDirectory(root,true)` (flow-report.mts:197), i.e. `.project/metrics`. Tests state-html.test.mts:661-685 cover present, missing, symlink, no generation, no refresh. PASS.
- Source-status model: link shows existence only; it does not convey stale/refused/unsupported or incomplete-set status (those live inside the report). Matches contract "links an existing safe HTML target"; label "Joined token/time report" is not misleading. Note only.

## Commands
- `node poc/poc.mts` (scratch) — output summarized above.
- `node --test ai-framework/scripts/flow-render.test.mts` (scratch copy) — 1 failure at :55 (tabindex); other assertions not reached in that test, covered by the separate POC above.
- `orca orchestration check` — no messages.

## Reviewed / not reviewed
Reviewed: flow-render.mts (whole), flow-join.mts (types, NOTES, build), flow-report.mts (publish names/dir), state-pages.mts links, state-html.test.mts flow section, rules component-architecture/ui-ux-review, REVIEW-CONTRACT, COHESIVE-UNITS.
Not reviewed: browser rendering, geometry, contrast, full suites, Bun, security/publication paths, deferred TTR-A1..A4, accepted limits (not claimed fixed).
