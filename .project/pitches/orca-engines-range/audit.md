# Audit: orca-engines-range (cycle 1 of 2, small-batch)

Dispatched: code-reviewer (sonnet), security-reviewer (sonnet), test-coverage-checker (haiku); `independent: yes`, fresh agents, scratch copy under the session scratchpad.
Canary: planted in the scratch copy only (`orca-preflight.mts` echoed `String(appVersion)` raw, contradicting its own comment). Caught by all three reviewers.
Read-only: reviewers worked in the scratch copy; `review-bench guard check` on the repo lists only the files the author edited after the snapshot (author's own fixes below), so a reviewer write cannot be separated by that check alone. cross-file interactions: reviewed (preflight/gate/start/config/migrate).
Not run: ux-reviewer, i18n-checker, eval-runner (no UI, i18n or AI-prompt scope); cross-pitch-conflict-checker (one active pitch touches these files).

| # | tier | finding | verified | disposition |
|---|------|---------|----------|-------------|
| 1 | must-fix (all 3) | raw `appVersion` echoed into diagnostics | refuted for the repo: it is the planted canary; real code only echoes a strict x.y.z (`orca-preflight.mts:156`) | no repo change; hostile-version tests added (`orca-launch-gate.test.mts`) |
| 2 | should-fix (security) | `versionDetail` echoed unescaped engine text and unvalidated found | confirmed unreachable today, defence in depth | fixed: printable-ASCII only, found must be strict x.y.z; test added |
| 3 | should-fix (coverage) | no test for `compareVersions`, wildcard hyphen ends, 6-digit boundary, error positions | confirmed | fixed: 320 more npm fixture rows, 4 unit tests |
| 4 | acknowledged | empty engine: config problem vs `engineRange` default | confirmed; policy-malformed blocks first | logged |
| 5 | acknowledged | `DEFAULT_ENGINE` (migrator) duplicates `DEFAULT_ENGINE_RANGE` | confirmed | logged for /cooldown |
| 6 | acknowledged | `engine-range-invalid` branches unreachable via config | confirmed (deviation d2) | logged |
| 7 | acknowledged | engineRange uses default floor when config refused (TOCTOU only) | not reachable in normal flow | logged |

npm-parity differential run by the code reviewer: 340 extra ranges x 21 versions, 0 mismatches.

Evidence after fixes: full suite `ℹ tests 1560 / pass 1558 / fail 0` (2 skipped), semver-range suite 57 pass.
