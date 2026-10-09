# Compaction record: fix-workflow-runner-env

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[one-boundary-selects-the-child-runner]].

## Section 1: SHIPPED.md#final-verification

Bun full suite 985 pass, 1 skip, 0 fail (46 files). Node parity on 13 boundary/test suites: 296 pass, 1 Bun-specific skip, 0 fail (run at build time, not repeated at ship). setup-validator READY (22 checks), graphify CLEAN, changelog ok, `git diff --check` clean, no secrets in the tree. No build/typecheck/lint/i18n commands exist.

## Section 2: SHIPPED.md#reconciliation

Runner selection at workflow entry and every child boundary shipped: `runtime/entry.mts` is the single selection point; six workflow scripts and `runtime/test-helpers.mts` spawn through it; `workflow-notice.mts` replaced three inline `node -e` hooks. Closed symptoms: a Bun test process with env runner `node` now runs Node; a Node process with `options.env` runner `bun` now runs Bun; `review-bench.mts` no longer hardcodes a node-prefixed test command. Release 2.16.2.

## Section 3: SHIPPED.md#no-gos-honored

No metrics schema change; no change to historical pitch, ship or audit records. Routine checks ran on the configured Bun runner, with explicit Node runs labeled parity checks. The OpenCode live config probe remains skipped under Bun (pre-existing).

## Section 4: SHIPPED.md#known-behavior-change

Hook stdin over 64 KiB now exits 1 with a message instead of being echoed; the old inline hooks read stdin unbounded.

## Section 5: SHIPPED.md#knowledge-extracted

Pattern `one-boundary-selects-the-child-runner`: one function owns runner selection for sync and async children; explicit child overrides beat the parent setting, process env beats dotenv, Node flags apply only to Node, direct entries re-execute in both directions, and a missing selected executable fails with no fallback.

## Section 6: SHIPPED.md#followups

Six acknowledged audit items moved to `_followups.md`: no test for the hooks.json wiring of the three notice entries; hooks still bootstrap with a literal `node`; fail-open versus exit 1 above 64 KiB; parse-check args picked from `deps.runtime`; an empty child runner selects Node; Node 22.12-22.17 flag handling unproven.

## Section 7: log.md#verified-triage

The resolver reported processRunner null, selectedRunner bun. Two probes reproduced both defects (Bun process with env runner node kept the Bun executable; Node process with options.env runner bun kept Node). The existing helper test titled to respect bun actually set node and asserted only exit 0, so it could not detect the mismatch.

## Section 8: log.md#approved-build-2026-10-08

The user approved the triaged fix. `runtime/entry.mts` owns sync and async child selection; sanitized child environments keep the runner setting without reintroducing removed variables; `selectRuntime` exports only the canonical runner, not other dotenv keys. bundle-sync, state-snapshot, pitch-compress, setup-validator, workflow-doctor and review-bench use the boundary; the shared test helper delegates to it. Tests assert observable behavior: real children report the actual executable, missing executables fail without fallback, invalid declarations fail, env filtering is intact, Bun syntax checks catch invalid TypeScript. The concurrent runtime-test-helpers ship was preserved.

## Section 9: log.md#build-evidence

Bun: 984 passed, 1 skip, 0 failed across 46 files; Bun parser test 6/6; Node parity on 13 suites 296 passed; final workflow-doctor JSON 766 results and setup-validator 23 results with 0 failures; `git diff --check` passed. Build stopped at the confirmation gate before audit.
