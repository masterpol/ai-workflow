# S1 completion evidence

Date: 2026-10-07. Scope: policy inspection and portable example only.

## Behavior delivered

`.project/orchestration.json` controls vendor routing. `use-orca-orchestration` is an optional boolean; false or missing disables eligibility. The example sets false. Legacy `mode` is refused rather than silently accepted. Invalid configuration, unsafe file paths, and unsupported schemas preserve normal execution. Even eligible policy returns `dispatchReady: false` and `route: normal`.

Policy inspection performs no external command, write, installation, or credential read. S2 has not been implemented; it must enforce the same opt-in before executable discovery or runtime probes.

## Approved test strategy

Use unit behavior tests for schema/routing/fallback; filesystem integration tests for bounded reads and unsafe paths; subprocess tests for public CLI output and FIFO race behavior. Scope acceptance in the approved plan authorized these tests. Golden policy permutations are concrete assertions, not a dependence on project-local shaping files.

## Executed commands and outcomes

`node --test --experimental-test-coverage ai-framework/scripts/orca-policy.test.js` — exit 0:

```text
ℹ tests 43
ℹ suites 0
ℹ pass 43
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 473.767125
ℹ   orca-policy.js | 100.00 |    98.28 |  100.00 |
```

Coverage columns: lines, branches, functions. Measured on this macOS host, not a cross-platform claim.

`node --check ai-framework/scripts/orca-policy.js` — exit 0, no output.

The test `validates the shipped example as disabled, and normalizes CLI diagnostics` parses and validates the portable JSON example; it passed in the current run.

`node ai-framework/scripts/orca-policy.js report --vendor codex --json` — exit 0; current instance has no policy:

```json
{
  "policyStatus": "missing",
  "eligible": false,
  "reason": "policy-missing",
  "route": "normal",
  "dispatchReady": false
}
```

`node ai-framework/scripts/setup-validator.js` — exit 0:

```text
Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 21 checks. Use --json for automation or --no-color for plain text.
```

`node ai-framework/scripts/graphify.js --check` — exit 0:

```text
Graph status: CLEAN
Dry run (--check) — no files written.
```

`git diff --check` — exit 0, no output.

## Guard mutation checks

Disposable bundle copy, 20 weakened-guard variants, completed without runner failures: 17 detected, 3 survived. Full outcomes: `s1-mutations.json`.

- Removing the symlink predicate alone survives because nonregular-path checks and no-follow open still refuse the path.
- Removing the initial inode comparison alone survives because the post-open path check independently compares it. Removing both comparisons is detected.
- Removing no-follow open alone survives because the before/after path and descriptor checks still refuse symlinks.

Other detected mutations include unknown fields, worker ownership/uniqueness, role routes, bounds, schema/version and flag handling, containment, opened-descriptor checks, post-open replacement, growing files, and nonblocking FIFO protection. Initial self/duplicate worker tests and the byte-bound test had masked gaps; they were corrected before this final run.

## Preservation and remaining work

All preexisting modified source files match their pre-build SHA-256 hashes. Only pitch records and the three new S1 implementation files changed. S1 totals 473 lines across policy, tests, and example; the overall foundation estimate remains within its 1500-LOC cap with S2/S3 pending.

Deviations D1–D3 are recorded. Foundation release/version entry is scheduled with S3 as one logical change. Independent audit, runtime preflight, doctor integration, and dispatch are not complete.
