# Audit: fix-workflow-runner-env

Appetite: bug-fix (cap 2 cycles, auto-advance if zero must-fix). Cycles run: 1.

Dispatched: code-reviewer, security-reviewer, test-coverage-checker, cross-pitch-conflict-checker. Model: sonnet (explicit per dispatch). independent: no (no canary planted; reviewers saw the contract and build log). Scratch copy of the working tree, no `.git`, no `.env*`.
Read-only: verified by `review-bench.mts guard snapshot|check`. Guard reported `.project/status.md` and `.project/pitches/orca-vendor-reconcile/log.md` touched at 10:11:39 during the audit. The reviewers worked only in the scratch copy and `orca-vendor-reconcile/log.md` has no content diff against HEAD, so this is recorded as an unattributed external touch, not a reviewer write.
cross-file interactions: reviewed (entry/cli/select/env/node, six workflow child sites, test-helpers, hooks.json against hook scripts).

## Result: 0 must-fix, 0 should-fix

| Reviewer | Verdict | Tests run (Bun, focused) |
|---|---|---|
| code-reviewer | no findings, 3 acknowledged | 24 pass; 153 pass, 4 skip |
| security-reviewer | PASS, 3 acknowledged | 19 pass |
| test-coverage-checker | no findings, 3 acknowledged | 97 pass, 4 skip; 139 pass |
| cross-pitch-conflict-checker | no findings, 2 notes | 19 pass; 6 live hook probes |

Live probes confirmed: process env beats declared runner under Bun and Node bootstraps; missing selected executable fails with no fallback (`"bun" was not found on PATH`); invalid runner value exits 1; dev-server block exits 2; push guidance passes input through; 70000-byte stdin exits 1.

## Acknowledged (for /cooldown)

- Hooks still start with a literal `node` bootstrap, so Node is a prerequisite on a Bun-only host. This is the documented design.
- No test asserts the `hooks.json` command wiring for the three `workflow-notice.mts` entries.
- Oversized stdin (>64 KiB) now exits 1 with no pass-through. The previous inline hooks read stdin unbounded (verified in `git show HEAD:ai-framework/hooks/hooks.json`) and always echoed it. Deliberate bound; exit 1 is non-blocking.
- `setup-validator.mts` and `workflow-doctor.mts` choose parse-check args from `deps.runtime`, not the effective runner. No input found that disagrees, since `selectRuntime` exports the runner.
- An explicit child `AI_WORKFLOW_RUNNER=""` selects Node even when the process env says Bun.
- `review-bench.mts` runs operator-supplied `-e` arguments; unchanged by this fix.

## Unverified by reviewers

Node parity suites, full Bun suite, `bundle-sync`/`setup-validator` sibling tests, Node 22.12-22.17 flag handling, `boundaries.md` item walk (code reviewer read it as a template, conflict checker did not read it). The build log's own evidence (Bun 984 pass; Node parity 296 pass) stands as author-run.

## Gate

Zero must-fix at bug-fix appetite: auto-advance to /ship.
