# Audit cycle 1: metrics-report-dimensions

Run 2026-09-24. Reviewers: code-reviewer (fast), security-reviewer (standard), test-coverage-checker (fast), cross-pitch-conflict-checker (fast). Skipped: ux-reviewer (no UI), i18n-checker (no i18n strings), eval-runner (no AI-prompt scope). Every finding below was re-checked by the main thread before triage; S1, S2 and S3 were reproduced with a live script first.

## Findings and disposition

| ID | Source | Reported | Verified | Tier | Disposition |
|----|--------|----------|----------|------|-------------|
| T1 | test-coverage | CLI entry (`main()`, skill-use path) has no automated test; S3 exit criterion only ran by hand | yes (no test references a child process) | must-fix (missing automated exit criterion) | Fixed: 2 spawn-based CLI tests |
| T2 | test-coverage | OpenCode plugin hooks untested (15.9% lines) | yes | must-fix | Fixed: `opencode-plugin.test.js`, 5 tests; plugin now 92.3% lines |
| S1 | security | Names with Markdown syntax (links, images) and control characters land verbatim in the report | reproduced: `[click](https://evil.example/x)` appeared in the `.md` | should-fix, fixed | `boundedName` now allow-lists `[\w.:/@+-]`, 80 characters; anything else is stored as `(other)`. `metricScope` now goes through `mdCell` too. Also closes A1 (control characters) |
| S2 | security | `.project` or `.project/metrics` as a symlink out of the root makes the collector write there | reproduced: 3 files written into and one overwritten in the target directory | should-fix, fixed | `staysUnderRoot` realpath check on `.project` before `mkdir` and on the metrics directory before the lock; 6 assertions in one test, including that an in-root symlink still works |
| S3 | security | Ids and `status` unbounded (100 KB ids grew the snapshot to 20 MB; free-text `stop_reason` stored verbatim) | reproduced (`agentId` 5000 chars, `status` 315 chars stored) | should-fix, fixed | Ids truncated to 128; `status` allow-listed like names; costs above 1e6 USD and token counts above 1e12 treated as unreported |
| S5 | security | An implausible cost value makes float reversal underflow and wedges that identity | plausible from code; fixed at the source | should-fix, fixed | Bounded cost/tokens (see S3), tolerance widened to 1e-6; regression test |
| A2 | security | `JSON.parse` error text quotes the start of stdin on stderr | yes | acknowledged, fixed (one line) | Fixed message `stdin is not valid JSON`; test asserts the payload is not echoed |
| A3 | security | `agentModels` eviction uses key order; all-digit agent ids sort first and evict the newest | yes by code reading | acknowledged, fixed | Keys are prefixed `agent:`; test with ids 100 down to 0 |
| A4 | security | Plugin reads event fields outside its `try`, and its per-session maps never shrink | yes | acknowledged, fixed | Whole handler inside the `try`; maps capped at 200 sessions |
| S4 | security | Lock file with a live or reused PID is never reclaimed; the reclaim rename can remove a fresh lock | reproduced by the reviewer (1.2 s stall, no reclaim); code is not part of this diff | should-fix, **deferred** | Pre-existing collector lock code, untouched by this pitch. Logged in `_followups.md` |
| P1 | security | Identity key collisions from `filter(Boolean).join(":")` | reproduced by the reviewer | acknowledged, **deferred** | Pre-existing identity logic, same class as `bare-prefix-match-crosses-entities`; logged in `_followups.md` |
| X1 | cross-pitch | `workflow-doctor.js:506` script list edited by two pitches | working tree only holds this pitch's hunks; the other pitch's plan says whichever ships second rebases | reviewer said must-fix; downgraded to acknowledged | Merge-order note for `/ship` |
| X2 | cross-pitch | `harnesses.md`, `README.md`, `VERSION`/`CHANGELOG` shared with `project-state-report` | yes | acknowledged | Rebase at ship |
| C1 | code-reviewer | none | n/a | n/a | Reviewer reported no findings (fast profile; weight it lightly) |
| K-cov | test-coverage | Lock-timeout `Atomics.wait` line uncovered | yes | acknowledged | Timing-dependent, pre-existing |

Not a finding of this pitch: one `skill-defaults.test.js` mirror test failed once mid-audit while another workstream was editing skill mirrors; it passed on every later run (22 of 22).

## Evidence after patches
- `node --test` on the collector, renderer and plugin tests plus `skill-defaults.test.js`: 74 tests, 74 pass.
- Coverage: `token-consumption.js` 98.92% lines, `token-report.js` 100%, plugin 92.31%.
- `workflow-doctor.js`: READY, 744 checks.
- Reproductions re-run: a symlinked metrics directory now returns `metrics directory resolves outside the project root` and the target's file still reads `precious`; a payload with a link-syntax agent type, an image-syntax model, a 5000-character agent id and a 315-character `stop_reason` now stores `(other)`, `(other)`, 128 characters, `(other)`, and the string `evil` appears in none of the three outputs.
