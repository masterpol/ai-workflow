# Audit: readme-split

## Cycle 1 (2026-10-07)

Dispatched: code-reviewer (standard/sonnet), security-reviewer (standard/sonnet), test-coverage-checker (haiku), cross-pitch-conflict-checker (haiku). Fresh agents, scratch copy, one parallel turn. Prompt hash: not recorded.
independent: no — no canary was planted in the scratch copy, so none counts as `independent: yes` under the contract.
read-only: verified by `review-bench.js guard snapshot|check`: changed set = this pitch's own fixes + `ts-runtime-injection` files from a concurrent session; no path a reviewer could have written.
cross-file interactions: reviewed (docs-links ↔ workflow-doctor, installed-project path).
Not verified by reviewers: verbatim-move diff (author-run: 0 lost lines, see log.md), coding-standards/testing checklist walk (code-reviewer).

| # | Source | Tier | Finding | Verified | Outcome |
|---|---|---|---|---|---|
| 1 | security | should-fix | `decodeURI` throws on `%ZZ` → uncaught crash | yes (reproduced) | fixed: reported as `malformed escape`; test added |
| 2 | security | should-fix | quadratic link regex (200k `[` = 42 s) | reviewer-measured; post-fix 40k-repeat line 0.03 s | fixed: `[^\][]*` + 10k-char line cap; test added |
| 3 | security, code | should-fix | symlink loop / dangling link / unreadable dir crash `collect` | yes (ELOOP reproduced) | fixed: `lstat`, skip symlinks, guarded `readdir`; test added |
| 4 | code | should-fix | doctor `docsLinkCheck` unguarded throw aborts run | read-only | fixed: try/catch → `record("fail")` |
| 5 | code | should-fix | slug strips `_` (GitHub keeps it) | reviewer fixture | fixed; test added |
| 6 | tests | should-fix | `--json`, exit 2 missing-input, duplicate-anchor target unasserted | yes | fixed: 4 tests added |
| 7 | tests | should-fix | no dedicated doctor test (indirect via `skill-defaults.test.mts`, mutation caught) | yes | acknowledged → followup |
| 8 | cross-pitch | claimed must-fix ×3 | `workflow-doctor.js` / `architecture.md` edited by foundation (shipped, uncommitted) and ts-runtime-injection | refuted: diff hunks disjoint (`git diff -U0`), foundation shipped, no concurrent edit of same lines | false positive; commit-ordering note only |
| 9 | cross-pitch | should-fix | ts T4 `.js` renames / `bundle-sync` list will touch `ai-framework/docs` patterns | plausible | acknowledged → ts-runtime-injection plan to re-run doctor |
| 10 | code | acknowledged | reference-style/HTML links, setext headings, percent-encoded anchors, query strings unsupported; "not linked" is substring match | yes | acknowledged (documented limits) |
| 11 | tests | acknowledged | plan says 9 README checks; code has 10 | trivial | acknowledged |

Must-fix: 0. Re-run after fixes: docs-links 10/10, bundle-sync 17/17, doctor 0, setup-validator 0, graphify --check 0, `docs-links README.md ai-framework/docs SETUP.md` 0 broken.
Cycle 2 not needed (no must-fix; fixes verified by re-running the failing checks above).
