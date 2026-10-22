# Shipped: state-report-redesign
Bet: 2026-10-19  •  Shipped: 2026-10-19  •  Appetite: big-batch (12 files outside `.project/`, cap 13; 414 production LOC added, cap 1,200)

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-19 | invariants helper; rewritten to plain throws after `workflow-doctor` flagged `node:assert` in a non-test file |
| S2 | shipped | 2026-10-19 | `repoShape` detector, 15+ case matrix; OpenCode worker, applied by `git apply` (dirty overlap with another session) |
| S3 | shipped | 2026-10-19 | slate/blue workflow default theme; monorepo never scans; OpenCode worker via Orca reconcile |
| S4 | shipped | 2026-10-19 | SVG bar charts, 17 tests; layout changed to horizontal bars after review of label overlap |
| S5 | shipped | 2026-10-19 | `state-design.mts` owns stylesheet and shell; CSP first; sidebar; 72 `state-html` tests at the time |
| S6 | shipped | 2026-10-19 | headline cards, 4 charts wired, 5 empty slots, `repoShape` to theme wiring |
| S7 | shipped | 2026-10-19 | doc plus gates, done inline (shared dirty file) |

## No-gos honored
- ✅ no script, external load, web font, `style=` or `url()` in any page (asserted by `assertInert` on all 7 pages)
- ✅ no new snapshot facts besides the additive `structure.repoShape`; `schemaVersion` stays 1
- ✅ skills and mirrors untouched (`git diff --quiet 633adb3 -- .claude/skills ...` exit 0)
- ⚠️ token-share and folder-size charts replaced by completions-by-vendor and subfolders-per-folder (snapshot has no token or size data); recorded in `plan.md` corrections 1 and 2

## Rabbit holes
- ✅ resolved as planned: theme root per repo shape (monorepo never scans, spied fs), CSP ordering, chart label growth, markup-pin test churn, detection edge cases
- ⚠️ surfaced: audit found object-key inheritance in counted labels (fixed) and weak CSS/exact-match tests (fixed)

## Evidence
Four state suites: 200 pass / 0 fail (baseline 170). Full Node suite: first run 1821 tests, 1817 pass, 3 skipped, 1 failure (`old install upgrades...`, a 111 s timeout under load); retried alone (pass, 34 s) and in full: 1837 tests, 1834 pass, 0 fail, 3 skipped. `setup-validator` READY, `workflow-doctor` READY WITH WARNINGS, `graphify --check` CLEAN. Bun not run. Audit: 1 cycle, 0 real must-fix, 7 should-fix fixed, canaries caught by security-retry and tests-retry.

## Followups generated
See `_followups.md` "state-report-redesign leftovers".

## Doc updates
`ai-framework/integrations/state-report.md` (layout, charts, slots, `repoShape`, theme precedence). The `/state` skill text "theme rediscovered every run" is now stale for monorepos; the skill was frozen by the pitch and is a followup.
