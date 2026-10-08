# Pitch: orca-vendor-reconcile

> **Revised 2026-10-08 (critique C1-C9).** This pitch is now **reconcile-core** only: `orca-reconcile.mts` and its tests (diff admission, baseline and dirty-work handling, snapshot/apply/rollback, evidence copy, re-measure, combined checks, settlement-before-cleanup). The executable grader, audit/ship mirrors, loaders, docs and the single release step moved to `../orca-vendor-reconcile-integration/pitch.md`, which depends on this one.

**Date**: 2026-10-08 • **Appetite**: big-batch (≤15 files / ≤1500 LOC); revised estimate 2 files / ~1150 LOC plus a 20-30% fix-pass budget (reconcile-core only)
**Stack**: Node.js workflow tooling (`.mts` on injected `RuntimeDeps`) / agent instructions
**Depends on**: `../orca-vendor-dispatch/pitch.md` (dispatch-core)
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Dispatched workers return changes. The coordinator must integrate only verified work onto an explicit baseline, preserve unrelated dirty work, and finish the normal audit/ship gates.

## Solution sketch

`orca-reconcile.mts` plus tests: explicit shared baseline; flag overlapping dirty files instead of guessing ownership; copy accepted evidence outside worker resources and verify before cleanup; re-measure changed files, checks and counts rather than accepting worker claims; safe conflict recovery; combined checks; audit-phase mirrors (4); executable grader for `.project/evals/datasets/orca-vendor-orchestration.json`; live smoke criteria; CHANGELOG/VERSION.

## Rabbit holes (push to /plan)

- Baseline and dirty-work attribution (`issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file`); symlink-safe evidence copy; settlement proven before cleanup and reassignment; coordinator-only verification (`a-gate-must-not-trust-its-own-author`).

## No-gos

As dispatch-core: no scheduler, remote support, forced parallelism, permission bypass, automatic commits/publication.

## Bet decision

☑ **Bet** — 2026-10-08, user decision. Dispatch-core shipped (v2.14.1). Critique C1-C5 addressed by the split and rabbit holes; C6-C7 to be cited at /plan. Live Codex/OpenCode completion and peer messaging remain unobserved (dispatch S0 gap): any scope that needs a live worker is a /plan gate.
☐ Re-shape ☐ Pass

## Knowledge consulted (added by critique)

`patterns/retry-only-on-positive-proof-of-a-clean-failure` and `issues/async-agent-launch-hook-counted-as-completion` (settlement and cleanup need a parsed positive receipt; unproven means no cleanup, no reassignment); `patterns/sync-tools-refuse-symlinks-in-source-and-destination` and `patterns/resolve-before-matching-a-protected-path-allowlist` (lstat every component, realpath before matching, `--` and no refs starting with `-`); `issues/hardening-a-shared-reader-made-its-writer-destructive` (trace every caller of any reader changed); `patterns/a-gate-spawns-exactly-what-it-probed` (typed allow-list of check commands, switch first); `issues/reviewer-reports-contradicted-by-measurement` (re-measure, never trust claims); `issues/rounded-zero-timeout-disables-cancellation`; `patterns/prove-a-guard-test-with-an-in-memory-mutant` and `issues/guard-tests-can-fail-for-the-wrong-reason`; `issues/macos-tmpdir-realpath-alias-breaks-path-assertions`; `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers`.

## Critique findings (2026-10-08)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| C1 | appetite-auditor | high | scope-overrun | Original 9 files / ~1000 LOC was too low (honest 14-16 files, 1800-2000 LOC). Split: reconcile-core (this pitch) and reconcile-integration (grader, mirrors, docs, release). Budget a 20-30% fix pass; dispatch needed two audit cycles and 8 must-fix items. |
| C2 | skeptic | high | rabbit-hole | Diff admission policy: applying a worker diff is code execution and path writing on worker-controlled input. Run git with `core.hooksPath=/dev/null`, `GIT_CONFIG_NOSYSTEM`, scrubbed env and no attribute filters; reject symlinks, gitlinks (mode 160000), `..`/absolute/aliased paths, case-fold collisions, mode flips; derive the changed set from `git diff --raw -z --no-renames --binary` against the baseline, never from worker mail. |
| C3 | skeptic | high | rabbit-hole | Partial application and rollback in a dirty tree: pre-apply snapshot (tree object or backup of touched files), `git apply --check` for every worker before any write, all-or-nothing per worker, rollback of only touched paths, refuse when the baseline SHA moved, deterministic worker order, per-worker ledger state (applied/rejected/rolled-back) so reruns are idempotent. |
| C4 | skeptic | medium | rabbit-hole | Combined checks run untrusted code and can attest themselves: scrubbed env and timeout, checks run from baseline check definitions, any diff touching check definitions (scripts, test configs, `ai-framework/scripts/`, hooks, the grader) needs human confirmation, baseline run first to separate flaky from worker-caused. |
| C5 | skeptic | medium | rabbit-hole | Cleanup after `retained / user_takeover`: never remove a worktree a human touched or one holding unaccepted edits; evidence copied and hash-verified before any removal; no `worktree remove --force` or `prune` on a retained tree; final state `integrated-uncleaned` with leftover paths; cleanup idempotent and resumable; late mail after release must not change a settled state. |
| C6 | knowledge-historian | high | missed-knowledge | Cite and apply the retry/positive-proof, symlink, shared-reader-hardening and gate-pins-probe entries listed above; make "unproven settlement means no cleanup, no reassignment" a scope exit. |
| C7 | knowledge-historian | medium | missed-knowledge | Re-measure instead of trusting claims; deadline arithmetic (no zero-rounded budget); mutant-proven guard tests; realpath-aware macOS assertions; cite the standing no-gos decision instead of restating. |
| C8 | appetite-auditor | medium | hidden-scope | The executable grader needs its own scenario fixtures and independent review (`a-gate-must-not-audit-its-own-instrument`): fix which dataset cases it executes versus parses. Now in reconcile-integration. |
| C9 | appetite-auditor | medium | borderline | Mirrors and loaders count toward the file cap; docs, CHANGELOG and VERSION are one release step. Now in reconcile-integration. |

Dispositions pending the user. Recommended: address C1-C5 (done: split and rabbit holes added above), cite C6-C7 at /plan.

