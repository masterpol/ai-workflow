# Audit: test-execution-performance

Appetite small-batch (cap 2 cycles, auto-flow when zero must-fix). Scratch copy `review-bench-lFdQyZ` with one planted canary (drop the `node_modules` skip, `run-tests.mts:60`; breaks the discovery test). Three fresh reviewers, no earlier findings shown.

independent: yes
canary: caught (all three cited `discover` / `run-tests.mts:53-67` and the failing discovery test)
read-only: verified by git-status-diff (the `review-bench guard check` snapshot of 3.4 MB exceeded the reader limit, so the guard was not used; the real tree shows only expected paths changed)
prompt-sha256: 33b00894bb491adbbddb8346db1cda3118ef2ad6af91885a44540385927fc3e7
model: sonnet (code, security, test-coverage; set explicitly per dispatch)
cross-file interactions: reviewed (all three; `workflowInvocation`, `types.mts`, `test-helpers.mts`)

Dispatched: code (3 findings) | security (6) | test (6) | ux n/a | i18n n/a | eval n/a | cross-pitch: disjoint (`author-run`: `workflow-v3-rollout` has no planned files; no shared path).

## Cycle 1 findings

| ID | Source | File | Issue | Tier | verified | Disposition |
|----|--------|------|-------|------|----------|-------------|
| M0 | code, security, test | run-tests.mts:60 (scratch) | Full mode includes `node_modules` tests | must-fix | refuted for the repo: planted canary; the real file skips `node_modules` at line 60 | none (canary) |
| S1 | code, security | run-tests.mts select | Symlinked parent directory escapes containment (lexical check) | should-fix | confirmed: temp project, `ai-framework/escape` symlink, `--list` printed the path, exit 0 | fixed: realpath comparison |
| S2 | author (found while verifying S1) | run-tests.mts select | Symlinked `--root` (macOS `/var` vs `/private/var`) wrongly refused | should-fix | confirmed | fixed: same realpath change |
| S3 | code, security, test | run-tests.mts:74 | `..x` directory names refused by `startsWith("..")` | should-fix | confirmed by reading the code | fixed: `=== ".."` or `startsWith("../")` |
| S4 | security | run-tests.mts parseArgs | `--cache --coverage` swallows the next option as a value | should-fix | confirmed by reading the code | fixed: an option value that starts with `-` is refused |
| S5 | test | run-tests.test.mts | `--list`, Bun `--coverage`, null-status path, `--root` default untested | should-fix | confirmed | fixed except the `--root` default (acknowledged) |
| S6 | test, security | run-tests.test.mts | Refusal cases assert only nonzero exit | should-fix | confirmed; the stronger assertion also exposed a runtime-dependent case | fixed: exit 2 plus per-case reason; `--runtime node` added to the coverage case |
| S7 | test | run-tests.test.mts | Real-bundle test asserted only a count | should-fix | confirmed | fixed: asserts no `node_modules` path |
| A1 | security | run-tests.mts | No SIGINT/SIGTERM forwarding; signal not reported | acknowledged | not reproduced | log only; exit is nonzero |
| A2 | test | run-tests.test.mts | `--root` default (`inferRoot`) untested | acknowledged | exercised by the real-bundle test and the live runs | log only |
| A3 | test | run-tests.test.mts | `NODE_TEST_CONTEXT` inherited by the mutation test's outer script | acknowledged | not reproduced; test passes on both runtimes | log only |

## Cycle 2 (narrow, `author-run`)

No independent re-review of the fixes; they are listed as author-run. Mutation proofs in a temp copy:
- Lexical containment restored: the refusal-table test and the `..x`/symlinked-root test turn red (2 failed).
- `?? 1` changed to `?? 0`: the null-status test and the mutation proof turn red.
- Dash guard removed: the refusal-table test turns red.

## Evidence (current session)

- `run-tests.test.mts`: 11 pass / 0 fail on Node; 11 pass / 0 fail on Bun.
- Line counts: `run-tests.mts` 136, `run-tests.test.mts` 176 (caps 200 each).
- `node ai-framework/scripts/run-tests.mts --runtime node`: exit 0, 75 files, 2428 pass, 3 skip, 0 fail, 89.6 s.
- `docs-links.test.mts` 17 pass; `workflow-doctor.mts` exit 0; `setup-validator.mts` exit 0.

## Result

Must-fix queue: empty. Required reviews complete. Audit clean after cycle 2.
