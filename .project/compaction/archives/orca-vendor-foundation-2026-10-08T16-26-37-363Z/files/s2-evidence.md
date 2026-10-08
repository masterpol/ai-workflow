# S2 evidence — bounded read-only preflight

Date: 2026-10-07. S1 continuation was approved by the user with “Approve S1 and continue S”; interpreted as S2. S2 is complete; S3 has not started.

## Result

Added `ai-framework/scripts/orca-preflight.js` and its behavior tests. Policy validation happens first. Missing, false, malformed, refused, unconfigured, or empty policy routes perform no executable selection, PATH availability checks, or subprocess calls, even with `--probe`. Worker context also stops coordinator selection before environment inspection.

Enabled configuration supports static candidate diagnostics, then optional bounded read-only probes. Only three fixed argv sequences are permitted: `skills get orca-cli --json`, `skills get orchestration --json`, and `status --json`. One selected executable is used; failure never selects another launcher. No shell, worker launch, message, installation, authentication, setting change, or lifecycle mutation occurs. Five-second per-call and twenty-second total budgets and 256 KiB output limits apply. Less than one millisecond remaining refuses another call, preventing a rounded-zero timeout from disabling cancellation.

Every outcome remains `route: normal` and `dispatchReady: false`. Executable presence does not prove authentication. Even plausible caller evidence and an unknown experimental-feature field do not establish orchestration readiness.

## Pinned installed contract and limits

Read the installed Orca 1.4.222 compiled CLI implementation and bundled guide strings without executing its alternate launcher. `handlers/skill-guide-get.js` returns guide fields `name`, `full`, and `markdown`. `runtime/status.js` provides a successful envelope with `result.target.kind`, runtime `state`, `reachable`, and `appVersion`. `handlers/core.js` can add `result.caller`; `runtime/status-caller.js` uses injected `ORCA_AGENT_SESSION_ID`, calls `orchestration.callerShow`, and can return a nonlive refusal. A conservative accepted caller requires `live: true` and an `orcaSessionId` equal to the injected session. Fake receipts exercise that shape; this is not a captured successful live response.

Installed guide hashes from `out/cli/bundled-skill-guides.js`:

- ORCA_CLI_MARKDOWN: 21,764 bytes; SHA-256 `9b6a6ae9712a666b3fbb062c2c5ddbb6c67a8e60a213897c27abafbb5dc474e3`.
- ORCHESTRATION_FULL_MARKDOWN: 43,504 bytes; SHA-256 `05928a5eb3ba8ba2c2431d64d20fa85036a1d9da612a75677c5dcb67023351ce`.

The pinned status contract does not establish an enabled orchestration setting or complete worker capabilities. Guide markers are documentation evidence only. Unknown readiness remains unverified; an unrelated runtime version is refused. Public verification and the exact selected-launcher error are in the parent investigation records. No live Orca probe or vendor authentication occurred during S2. No alternate launcher was selected. Windows executable selection has fixture coverage; only the current macOS host exercised real timeout/output-limit fixture subprocesses.

## Verification

- Combined policy and preflight tests with experimental coverage: 57 passing, zero skipped; 100% lines and functions for both production modules. Policy branch coverage 98.31%; preflight 96.03%.
- Local Node fixture subprocesses prove timeout termination and overflow handling; fake Orca receipts prove permitted argv, launcher stability, budgets, caller checks, and conservative fallback.
- Fifteen weakened guards were detected in disposable mutation copies, after an unmodified baseline passed. Results in `s2-mutations.json`. Initial scratch layout omitted the example file and was discarded; the recorded run copies it at the correct relative path. The final additive experimental-field assertion was added after this mutation run.
- `node --check ai-framework/scripts/orca-preflight.js`: passed.
- `node ai-framework/scripts/setup-validator.js`: READY, 21 checks.
- `node ai-framework/scripts/graphify.js --check`: CLEAN, 28 entries.
- `git diff --check`: passed.

Implementation size: preflight module 141 lines and tests 284 lines, 425 total; cumulative S1/S2 implementation 898 lines, below the 1,500-line pitch ceiling. No external dependencies or changes to native adapters.

Compared existing-source hashes with the pre-build inventory. Forty-one entries remained identical; seven changed externally during this session: OpenCode architect/planner/shape adapters, OpenCode configuration, token-plugin tests, harness documentation, and workflow doctor. This scope did not edit those files. README, model-routing rules, and skill-vendors tests also show external changes absent from that inventory. Preserve their current contents during S3 integration and audit; do not restore stale hashes.

## Next gate

Approve completed S2 and continue S3 / Revise / Back / Stop. S3 adds static doctor diagnostics, portable documentation, local-config ignore, and the structural version entry. Live dispatch stays in its separately gated pitch.
