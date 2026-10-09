# Compaction record: orca-vendor-foundation

Prepared 2026-10-08. This record preserves closure evidence and constraints; the recovery archive retains the full source history.

Durable knowledge: [[rounded-zero-timeout-disables-cancellation]], [[guard-tests-can-fail-for-the-wrong-reason]], [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].

## Section 1: SHIPPED.md#final-verification

109 tests pass, zero skipped (policy, preflight, skill-defaults, skill-vendors, bundle-sync); setup validator, graphify, changelog and git diff checks passed. The suite needed an authorized outside-sandbox rerun because the token-report socket lease is denied in the sandbox; no source workaround or skip was added. No build, typecheck, lint or i18n commands exist. Fixture and mutation evidence does not prove live Orca readiness.

## Section 2: SHIPPED.md#reconciliation

S1 policy (guarded reader, schema, exact optional flag, three vendor routes, example, tests), S2 preflight (opt-in guard, explicit worker context, bounded fixed read-only probes, conservative fallback), S3 diagnostics and docs (static doctor, optional config ignore, schema guide, version entry). Six new and four modified implementation paths, about 1,100 added lines, within the file cap.

## Section 3: SHIPPED.md#no-gos-honored

No worker launch, messages, lifecycle mutation, integration of worker changes, remote execution, installation, authentication, credential handling or runtime setting changes; no fabricated cost, speed or quality claims. No partial dispatch path: every foundation result reports normal workflow and `dispatchReady: false`. A missing or false flag performs no Orca discovery, even with `--probe`. Doctor reads local policy only.

## Section 4: SHIPPED.md#rabbit-holes-and-deviations

Policy path, schema and ownership settled without making the config a required scaffold artifact. Three established read-only commands and the inspected 1.4.222 contract bound discovery; unproved capabilities stay unverified. The chosen launcher stayed broken, so upstream evidence and fixture receipts are not local runtime proof, and the dispatch pitch had to obtain live proof before its bet. The worker-context guard prevents recursion. D1 to D4 accepted (see the deviations sections).

## Section 5: SHIPPED.md#knowledge-extraction

Two issues (guard tests failing for a missing fixture or invalid native-object mock instead of the guard named; flooring a fractional remaining budget to zero disables Node subprocess cancellation) and one low-confidence pattern (explicit opt-in precedes runtime discovery; presence, documentation, session evidence, authentication and dispatch authority are distinct; presence and child PATH share sanitation). All have ids, tags and related links.

## Section 6: SHIPPED.md#followups-generated

Four backlog entries: confirm/allowlist the child environment; freeze the JSON contract and rerun the dispatch overlap review; a presence-only cwd/relative-PATH fixture; preserve exact reviewer prompts and hashes. The dispatch pitch retained the live-readiness prerequisites.

## Section 7: SHIPPED.md#documentation-and-status

The portable guide already documented the product surface; the optional Orca policy data flow was added to the project architecture context. Run and hill snapshots live under `.project/runs/2026-10-07-orca-vendor-foundation*.md`.

## Section 8: SHIPPED.md#closing-gate

User selected [1] ship on 2026-10-07. No commit, publication, worktree deletion or live dispatch was part of the closing action; the parent pitch stayed active.

## Section 9: pitch.md#no-gos

Worker launch, messaging, integration, remote execution, installation, credential handling, fabricated performance claims, or enabling a partial delegation path.

## Section 10: pitch.md#rabbit-holes

Current Orca CLI discovery fails and upstream feasibility does not establish local readiness (resolved by reporting unverified); version and capability discovery without guessing flags, with normal fallback on unsupported versions; policy path, schema, root containment, malformed-data handling and config ownership; counting installation and validation surfaces and splitting if caps are exceeded.

## Section 11: audit-cycle-1.md

Dispatched code, security (2), test and cross-pitch reviewers, all independent with sonnet and explicit models; read-only verified by the review-bench guard. Canaries were caught (a wrong `maxConcurrentWorkers` limit; a PATH filter `=> true`). UX, i18n and eval not applicable. Cycle 1 findings reported as must-fix were planted canaries; real fixes covered the probe PATH hijack and three smaller items. Deferred: environment allowlist and dispatch adjacency.

## Section 12: deviations.md#d1-explicit-orca-opt-in

The user asked for an optional boolean flag in the vendor policy, default false, replacing the proposed `mode` field; the preflight short-circuits before executable resolution, PATH checks or probes unless it is true, even with `--probe`. Doctor still runs no probe. No appetite change.

## Section 13: deviations.md#d2-portable-fixture-assertions

Policy fixture cases were translated into concrete assertions in co-located tests rather than requiring the instance-local evals file at test time, so the scripts and tests stay portable when copied to a project.

## Section 14: deviations.md#d3-cohesive-policy-module

The policy utility exceeds the generic 80-line utility checklist; the validator, guarded reader and inspection CLI stay together to avoid a generic filesystem abstraction. Functions stay under 50 lines.

## Section 15: deviations.md#d4-conservative-runtime-proof

Only the three read-only guide/status commands are probed; the installed 1.4.222 contract does not prove orchestration is enabled, so no speculative lifecycle query was added. Receipts are fixture-tested, not live-verified. `--worker-context` is an explicit guard; foundation infers nothing from terminal presence. The preflight utility also exceeds the 80-line checklist and keeps its bounded runner beside the report.

## Section 16: log.md#s1-test-review

A descriptor-identity test mocked a native `Stats` with object spread, losing its prototype methods, so the reader refused for the wrong reason. Fixed by preserving the prototype while changing the inode and adding post-open path replacement and opened-size checks with zero-read assertions.

## Section 17: log.md#s2-boundary-and-evidence-review

A positive sub-millisecond remaining time was floored to zero, which disables the process timeout; calls with under 1 ms remaining are now refused, with a test. The first mutation scratch layout lacked the example fixture; results were discarded, the layout fixed, a passing baseline required, and all fifteen mutations rerun.

## Section 18: log.md#s3-fixture-and-sandbox-verification

The doctor fixture omitted the generated `_followups.md`, hiding the policy assertion; added it and narrowed failure output. The token-report test failed only because the sandbox denied the metrics socket lease (EPERM); the suite passed outside the sandbox with no workaround. A concurrent external commit was preserved and edits kept additive.

## Section 19: log.md#audit-cycles-1-2

No real must-fix; reviewer must-fixes were planted canaries. Fixed the probe PATH hijack and three other items; deferred the environment allowlist and dispatch adjacency. Prompt hashes were not stored (a process gap for /cooldown).

## Section 20: log.md#ship-preparation-2026-10-07

The user handed off the external audit and asked for ship. Final targeted verification passed 109/109 outside the sandbox. Extracted two issues and one pattern, added four followups and architecture data-flow documentation; closing confirmation pending.

## Section 21: log.md#ship-closed-2026-10-07

User selected [1] ship. Closed all three scopes, compacted status, finalized run and hill snapshots. Dispatch stayed separately gated; cooldown was due.
