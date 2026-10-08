# Shipped: fix-workflow-runner-env

Shipped: 2026-10-08. Appetite: bug-fix. Release: 2.16.2 (`Fixed`). Audit: 1 cycle, 0 must-fix, 0 should-fix; `independent: no` (see `audit.md`).

## Final verification

| Step | Result |
|---|---|
| Build / typecheck / lint / i18n | Not applicable: no such command in this repo (`stack.md`) |
| Tests | Bun full suite 985 pass, 1 skip, 0 fail (46 files, 129 s). Node parity on 13 boundary/test suites (build run): 296 pass, 1 Bun-specific skip, 0 fail. Node parity not repeated at ship time |
| Workflow checks | `setup-validator.mts` READY (22 checks), `graphify.mts --check` CLEAN, `changelog.mts --check` ok |
| Diff | `git diff --check` clean; no `.env`, credentials or `settings.local.json` in the tree |

## Reconciliation

| Scope | Status | Evidence |
|---|---|---|
| Runner selection at workflow entry and child boundaries | shipped | `runtime/entry.mts` single selection point; six workflow scripts and `runtime/test-helpers.mts` spawn through it; `workflow-notice.mts` replaces three inline `node -e` hooks. Live probes in `audit.md` |

Reproduced symptoms closed: Bun test process with env runner `node` now runs Node; Node test process with `options.env` runner `bun` now runs Bun; `review-bench.mts` no longer hardcodes a node-prefixed test command.

## No-gos honored

No metrics schema change. No change to historical pitch, ship or audit records. Routine checks ran on the configured Bun runner; explicit Node runs were labeled parity checks. OpenCode live config probe remains skipped under Bun (pre-existing).

## Known behavior change

Hook stdin over 64 KiB exits 1 with a message instead of being echoed. The old inline hooks read stdin unbounded.

## Knowledge extracted

- `patterns/one-boundary-selects-the-child-runner.md`

## Followups

Six acknowledged audit items moved to `_followups.md`.
