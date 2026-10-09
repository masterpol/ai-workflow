# Audit cycle 1 — state-multipage-report

Dispatched: code (1, sonnet, independent: no) | security (1, opus, independent: no) | test-coverage (1, sonnet, independent: no) | ux (1, sonnet, independent: no) | eval (n/a: no prompts) | i18n (n/a) | cross-pitch (n/a: one active pitch)
Independence: `no` for every role — no canary was planted in the scratch copy, so none can claim `independent: yes` under the reviewer contract. Reviewers ran in a scratch copy; `review-bench guard check` after the dispatch: `clean: true`, `changed: []` (read-only: verified by guard snapshot/check). Cross-file interactions: reviewed by code and security; test-coverage reviewer ran two suites only; UX reviewer did not open index.html or pitches.html and rendered nothing in a browser.

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Verified |
|----|--------|------|-------|----------|
| M1 | security | state-render.mts:38 `esc` (+ pages) | A `state.json` field `{"toString":1}` makes `String()` throw; the whole render fails and writes nothing, violating "hostile state.json degrades one section" (R5/S1) | yes: my run with skills.base[0].value.id = {"toString":1} → `state-render: No default value`, exit nonzero |
| M2 | security | state-pages.mts:159-163 | Stale-page cleanup deletes any `*.html` carrying the public marker, including a user's own file | yes: my run, `team-notes.html` with the marker was gone after `--apply` |
| M3 | test-coverage | state-snapshot.test.mts:767 | Symlink/ancestor-symlink scan test passes with all three guards removed (`Dirent.isDirectory()` is already false for links): R5/K1 mitigation untested | reviewer mutation run (66/66 green with guards removed); not re-run by me → fixed by adding the test and re-mutating |
| M4 | code | state-pages.mts:139-150 | 512 KB cap not honoured: pitches/decisions/evidence not bounded by `limit`; PoC gave 1.06 MB structure.html and 1.17 MB pitches.html, written anyway; contradicts state-report.md | reviewer PoC; contract text read by me |
| M5 | ux | structure.html | Tree is a wall (134 of ~150 roles "unclassified", no collapse) | yes: grep count 134 "unclassified", 0 `<details>` |

## Should-fix (fix this pass)
| ID | Source | Issue | Disposition |
|----|--------|-------|-------------|
| S1 | code | `insideProject` `startsWith("..")` drops real dirs named `..foo`; shared with theme/settings | fix (line read by me: confirmed) |
| S2 | security | `writeSet` rethrows raw fs errors with absolute paths | fix |
| S3 | code+security | "nothing was replaced" false after first rename | fix wording to "N of M" |
| S4 | security | `name`/readme title unbounded; `generatedAt` escaped twice | fix |
| S5 | ux | skills tables side by side, no h3; nav tap target; `tr:target`; metrics partial lead; links buried / silently omitted when missing; narrow-screen tree indent | fix |
| S6 | test | MAX_VISITED, decision caps, hostile tree path assertion, byte cap via render --apply | fix (tests) |

## Acknowledged → log.md
Check-then-use race on path (Node has no openat); folder names not allow-listed at ingest (render allow-lists, XSS probe passed); unbounded read of `*.html` in stale loop (moot once deletion is removed); decisions table repeats a decision per folder (defer: group by decision); knowledge page lacks "top tags/recent decisions" from the pitch sketch (defer → followup); `.ssh`/`.aws` dir names listed (names only).

## False positives
None refuted. UX reviewer's "must-fix" labels re-tiered by me; its `.status-inferred` remark has no matching status in the snapshot contract.

## Fixes applied (coordinator re-ran every check)
- M1: `{"toString":1}` in skills.base id and structure role → 7 of 7 pages written, exit 0 (before: "No default value", nothing written).
- M2: user `team-notes.html` carrying the marker survives a rewriting `--apply` (before: deleted).
- M3: author's mutation table accepted as author-run evidence (not independent); two guards are redundant by construction (stated by author). Cycle 2 reviewer to re-mutate.
- M4/M5/S1-S6: state-snapshot 76/76, state-html 65/65, state-theme 18/18, pitch-compress 48/48, workflow-doctor 6 pass 1 skipped, skill-registry 16/16, skill-defaults 27/27. Rendered pages: 1 `<details>`, 0 "unclassified", no `<script`.
- Guard check vs pre-audit snapshot lists exactly the fixed files plus this record: no unexpected writes.
Open: cycle 2 re-review (security + test-coverage) not yet run; Orca dispatch for it pending the user's decision.
