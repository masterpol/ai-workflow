# Audit cycles 1-2 — orca-vendor-foundation

Dispatched: code (1, independent: yes) | security (2, independent: yes) | test (1, independent: yes) | cross-pitch (1, independent: yes) | ux, i18n, eval: not applicable
Model: sonnet for every dispatch (explicit per dispatch).
read-only: verified by `review-bench.js guard snapshot|check`; both cycles reported clean, no head or status change.
canary: caught. Cycle 1 canary (`maxConcurrentWorkers` limit 30 vs 3) caught by code, test and security reports via `canary-check`. Cycle 2 canary (PATH filter `=> true`) caught by the security report. The cross-pitch checker worked in the repo, not the scratch copy, so no canary applies.
cross-file interactions: reviewed (code and security, cycle 1); cycle 2 security reviewed preflight only (not reviewed for policy and doctor); test reviewer cycle 1 not reviewed.
prompt hash: not recorded. Exact prompt texts were not stored, so `review-bench.js record-check` will fail on this record. Tracked as a process gap for /cooldown.

## Must-fix
None. Every must-fix a reviewer reported was the planted canary and is absent from the real files.

## Findings
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| S1 | security | orca-preflight.js:33-36,51 | Probe child resolved PATH with empty/relative entries from the inspected repo | confirmed by code reading and reviewer PoC in cycle 2 (spawn ran a planted `orca`) | fixed: child PATH reduced to absolute entries (filter before slice); test added, mutation reverts to fail |
| S2 | test | orca-preflight.test.js:44-72 | Skip paths did not assert dispatchReady/route/authentication | confirmed | fixed: assertNormal in each branch |
| S3 | test | orca-policy.test.js | Bounds under-tested (30, string, null) | confirmed | fixed: cases added |
| S4 | security | orca-preflight.js:51 | Probe child inherits the full environment | plausible, operator-controlled | deferred to dispatch pitch (allowlist needs confirmed Orca variable set) |
| S5 | security | orca-preflight.js:23 | `.` and `..` accepted as override names | confirmed, failed closed | fixed: dot-only names refused |
| S6 | cross-pitch | dispatch pitch vs preflight, doctor, VERSION, CHANGELOG, evals dataset, harness docs | adjacency with unplanned dispatch pitch | unverified | deferred: ship foundation first, freeze `report --json`, re-run at dispatch /plan |
| S7 | security c2 | orca-preflight.test.js | No test that the presence check itself ignores relative entries with a real file in cwd | plausible | acknowledged; presence and child share one helper |

## Acknowledged
Bare `catch {}` in the CLIs is deliberate. An unreachable `typeof command` check at orca-preflight.js:22 is redundant. The doctor integration test fails in a scratch copy lacking `.claude`; it passes in the repo. The `timeout` binary is absent on macOS (reviewer tooling only).

## Evidence
- `node --test orca-policy.test.js orca-preflight.test.js`: 62 tests, 62 pass, 0 fail (was 58).
- Mutation: reverting the PATH sanitizing and the dot-only regex fails the new test (61 pass, 1 fail); restored: 62 of 62.
- Workflow doctor: READY, 744 checks. `git diff --check` clean.
