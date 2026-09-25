# Audit cycle 2: metrics-report-dimensions

Run 2026-09-24 to 2026-09-25. Narrow re-check of the areas cycle 1 changed (`audit-cycle-1.md`).

## Reviewer results (be precise about what was and was not independent)

| Check | Who | Result |
|---|---|---|
| Test quality: do the new tests fail when the fixed code regresses | test-coverage-checker (fast) | Report delivered: 74 tests pass, 7 of 7 mutants it tried were caught. The agent's task then ended on a rate-limit error, and its checklist miscounts some tests, so its mutation table was **re-run by the main thread** (below) |
| Security re-check of the cycle 1 fixes | security-reviewer (standard) | **Did not complete.** Three dispatches: rate limit (no report), stalled 600 s (no report), stalled 600 s on a narrower scope (no report). No independent security verdict exists for cycle 2 |
| Security re-check, author-run substitute | main thread | Scripts below. This is the fix's author checking their own work, which the knowledge base warns against (`a-gate-must-not-trust-its-own-author`), so treat it as evidence, not as a review |

## Mutation check (main thread, scratch copies, never the repo)
Baseline 0 failures. Each mutant below was applied alone to a copy and the collector and plugin tests run:

| Mutant | Failures |
|---|---|
| remove the name allow-list | 2 |
| remove metrics-directory containment | 1 |
| remove `.project` containment | 1 |
| remove the `agent:` key prefix | 3 |
| remove id truncation | 1 |
| status not allow-listed | 1 |
| remove float tolerance | **0** on first run, then 1 after adding a 0.1 / 0.7 reversal test |
| remove the cost bound | 1 |
| change the JSON-parse error text | 1 |

## A gap found in the cycle 1 fix, fixed here
`boundedName` allow-lists names, but ids (agent id, session id) were only truncated, and the Current Completion row shows the agent id when there is no agent type. Reproduced: `agent_id` = `[click](https://evil.example/x)` appeared as live link syntax in the `.md` report. Fixed in `token-report.js` (`safeLabel`: a label that fails the identifier allow-list renders as `(other)`), with a regression test. Ids in `token-consumption.json` stay verbatim up to 128 characters; that file is machine-readable, and the state report reads only `lifetime` from it.

## Author-run adversarial checks (scripts in the scratchpad)
- Ten unsafe values (Markdown link and image, HTML with `onerror`, newline, ANSI title escape, fullwidth look-alikes, bidi override, pipe, backtick, `javascript:`) in ten payload fields (vendor, agent type, model, effort, status, agent id only, session id, `tool_use_id`, skill, skill-event vendor): none is rendered live in the `.md` or `.html` reports.
- Symlinks: dangling metrics symlink throws `ENOENT` and creates nothing outside; root that is itself a symlink works; in-root metrics symlink works; metrics path that is a regular file throws `EEXIST`; symlinked `.project` is refused and nothing is created in its target. The CLI catches every throw and exits 0.
- Bounds: 2,000 events at the maximum allowed cost and tokens gave 4e15 tokens and about 2e9 cost, no `Infinity` or `NaN`, snapshot 6 KB. 2,000 events with 9,000-character ids and 60 distinct names gave a 3 KB snapshot.
- Acknowledged, not fixed: summed token counts stop being exact integers past 2^53 (about 9e15), which would take thousands of events each carrying the maximum accepted value, far beyond real payloads; anyone able to forge that already controls local hook input.

## Measurements at the end of cycle 2
- `node --test` collector, renderer and plugin suites: 54 pass; `skill-defaults.test.js`: 22 pass. Earlier combined run of all four: 76 pass.
- Coverage: `token-consumption.js` 98.92% lines, `token-report.js` 100%, plugin 92.31%.
- `workflow-doctor.js` and `setup-validator.js` currently report blocking failures caused by `ai-framework/scripts/state-render.js` line 80 (`SyntaxError: Unexpected token 'const'`), a file belonging to the `project-state-report` workstream and mid-edit. Neither is caused by this pitch; both were READY (744 and 21 checks) immediately after this pitch's last change, before that file changed.

## Deferred (unchanged from cycle 1)
Lock reclaim for live or reused PIDs and identity-key collisions: both in `_followups.md`.

## Must-fix open: none. Not independently verified: the cycle 2 security re-check.
