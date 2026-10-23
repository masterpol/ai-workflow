# Source-review supplement: orca-vendor-foundation

Prepared 2026-10-22 from verified recovery sources. This supplements the unchanged [compact record](../pitch-compression/orca-vendor-foundation.md) for the 2026-10-07 foundation release 2.10.0. Results below are historical evidence, not a new runtime certification. The compact record points to its three knowledge entries with wiki identifiers only; their files are [rounded-zero timeout](../../knowledge/issues/rounded-zero-timeout-disables-cancellation.md), [guard tests failing for the wrong reason](../../knowledge/issues/guard-tests-can-fail-for-the-wrong-reason.md) and [shared no-gos and design answers](../../knowledge/decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md).

## Scope and policy contract

Foundation delivered a read-only policy reader, a bounded preflight and static doctor diagnostics. It could not launch workers, send messages, change Orca settings, install tools or authorize dispatch; the separate dispatch pitch activates delegation. Current behavior is owned by the [Orca vendor guide](../../../ai-framework/integrations/orca-vendors.md); the code is [policy](../../../ai-framework/scripts/orca-policy.mts) and [preflight](../../../ai-framework/scripts/orca-preflight.mts).

Policy v1 lived at `.project/orchestration.json`, resolved under the real project root and never created automatically. Fields: `schemaVersion`, optional `use-orca-orchestration` (default false), `maxConcurrentWorkers` 1-3, `maxRetriesPerTask` 0-2 and `coordinators` limited to claude, codex and opencode, each with unique alternate `workers` and `roles` (implementation, review). Unknown fields, unsafe keys, the legacy `mode` field, symlinks, non-regular files and inputs over 64 KiB are refused, and refusal stays distinct from absence. The portable example sits outside `templates/project` because doctor requires every scaffold template, which would have made the optional policy mandatory. Models and effort overrides were deferred.

Preflight resolved one executable (ORCA_CLI_COMMAND, then dev or Linux session names, then `orca`), never retried another, and ran only three fixed argv probes with `shell: false`, 5 seconds per call, 20 seconds total and 256 KiB output. Presence of a vendor executable was never authentication proof.

## Verification and mutation evidence

Test counts moved with scope: 43 policy tests (100% lines, 98.28% branches), 57 after S2, 58 and 62 after audit fixes, a 105-test five-file suite at S3 and 109 at ship. Preflight branch coverage was 96.03%. S1 weakened 20 guards: 17 detected and 3 survived because an independent layer still refused (the symlink predicate, the initial inode comparison and no-follow open); removing both inode layers is detected. S2 weakened 15 guards, all detected, after an initial layout lacking the example fixture was discarded and a passing baseline was required. Doctor reported READY with 743 passing checks in the S3 record and 744 in the audit record; the sandbox refused a log write for the live OpenCode config check and the token-report lease (EPERM), so the suite was rerun outside the sandbox with no skips. Lessons: [rounded-zero timeout](../../knowledge/issues/rounded-zero-timeout-disables-cancellation.md), [guard tests failing for the wrong reason](../../knowledge/issues/guard-tests-can-fail-for-the-wrong-reason.md), [opt-in before runtime discovery](../../knowledge/patterns/opt-in-before-runtime-discovery.md).

## Pinned runtime contract

Evidence came from the installed Orca 1.4.222 compiled CLI and bundled guides, read without running the broken alternate launcher. Guide sizes and hashes: orca-cli 21,764 bytes (sha256 9b6a6ae9712a666b3fbb062c2c5ddbb6c67a8e60a213897c27abafbb5dc474e3) and orchestration 43,504 bytes (sha256 05928a5eb3ba8ba2c2431d64d20fa85036a1d9da612a75677c5dcb67023351ce). The status contract did not establish an enabled orchestration setting. The accepted-caller rule (live true and session id equal to the injected one) was exercised with fixtures only; no live probe, authentication, dispatch or messaging occurred.

## Review and release provenance

Audit ran two cycles with canaries caught (a concurrency limit and a PATH filter replaced by `=> true`); every reviewer must-fix was a canary. Real fixes: probe PATH hijack by empty or relative entries, skip-path assertions, bounds tests and dot-only override names. Deferred: full child-environment inheritance (S4) and dispatch-pitch adjacency (S6). Acknowledged: no test that presence ignores a relative-cwd file (S7), bare catches, a redundant type check, a doctor test failing in scratch copies without `.claude`. Cycle 2 security reviewed preflight only, a test reviewer did not review cross-file interactions, and exact prompts and hashes were not stored, so `record-check` cannot pass on that record. The compact record's statement that cycle-1 findings reported as must-fix were planted canaries is narrower than the source, which says every reported must-fix in both cycles was a canary.

The release is 2.10.0; the S3 changelog run recorded 2.9.1 to 2.10.0 and an earlier S3 note said 2.9.0. External commit 8c7474d appeared in the shared checkout during S3 and contained earlier S1 and S2 files; this work neither created nor reverted it, and the pre-build inventory is historical evidence, not a restore target. Size history: shaped at 7 files and about 550 lines, planned at 10 files and about 1,200 lines, shipped at about 1,084 added lines. The pitch named an enable/off mode that a boolean flag replaced, and named `.js` scripts that are now `.mts`.

## Open items

Cross-platform live verification and child-environment allowlisting were open at close; compare with later work before calling them current defects.

Whole files left out of the ledger: the hill chart (positions superseded by the shipped record) and the pre-build inventory (stale hashes, not a restore target).
