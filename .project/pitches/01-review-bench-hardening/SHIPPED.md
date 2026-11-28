# Shipped: review-bench-hardening
Bet: 2026-11-25  •  Shipped: 2026-11-26  •  Appetite: small-batch (4 files as planned)  •  Version: 2.58.0 and 2.58.1

`review-bench` inspects a repository without running its Git programs on the covered routes, and the ways its gates passed wrongly in the pitch
are closed.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-11-26 | Git isolation; filters and submodules refused (codex) |
| S2 | shipped | 2026-11-26 | `--max`, NUL listings, containment, snapshot shape, `SETUP.md` root (claude) |
| S3 | shipped | 2026-11-26 | exact citation, per-section record, `3-audit.md`, decision entry (opencode, second launch) |
| S4 | shipped, added | 2026-11-26 | `guard` hashes every reported path, with the executable bit (codex; coordinator fix after review) |

## Pitch cases

All eight rows of the pitch table now give the safe result, rerun by the coordinator through the command line.

## No-gos

- ✅ No weakening of symlink, FIFO, secret-name or size refusals, or of caps.
- ✅ No execution of anything from the inspected tree **on the covered routes**. The first build broke this (configured hooks, `PATH`); fixed in
  audit. `link/..` in the operator's own `PATH` still reaches an in-project `git` (followup). `prepare` runs project tests by design.
- ✅ No sandbox. ✅ No existing audit record edited.

## Rabbit holes

- ✅ Convention-based read-only kept; the boundary is a decision entry.
- ✅ Per-section check run over 135 records: 128 passed before, 121 pass now; 7 would now fail. Two are 2026-11-25 records of earlier pitches.
- ⚠️ Repository filters (for example in-repository Git LFS) and submodules are refused; LFS not tested.
- ✅ `SETUP.md` added to the guard.
- ⚠️ New: configured hooks (Git 2.54) ignore `core.hooksPath`; other scripts here rely on that flag (high followup, untested).

## Behavior changes

`guard` and `count` also refuse: filter or `hook.*` keys in effective repository config, submodules, assume-unchanged or skip-worktree files, and
a `--root` that is not the top level. `count` keeps both sides of a move and checks that `--since` names a commit it prefixes. New audit records
need one heading per reviewer role, strict claim and canary lines and a table with a `verified` header. Wide citation ranges (over 40 lines) do
not count.

## Audit

Two cycles with Orca reviewers, then one review of S4: [audit.md](audit.md). Build was not ready after its own checks: cycle 1 found real
must-fixes. No open confirmed must-fix. Cycle 2's first reviewer disqualified itself; the retry completed. Only security was re-dispatched in
cycle 2. **Not re-reviewed:** the executable-bit fix made after the S4 review. Deferred items are in the backlog.

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts`: **exit 0** on the tree with these records and knowledge cards (115 s). 2,434 tests: 2,431 pass,
3 skip, 0 fail. `tests`, `setup-validator`, `knowledge-graph`, `process-relations`, `workflow-doctor` and `diff-sanity` passed. `review-bench.test.mts`:
79 pass on Node and Bun.

Not applicable, no such command (`.project/context/stack.md`): build, typecheck, lint, i18n. Not run: full suite under Bun (the bench tests pass
on Bun); Windows; Linux; Git versions other than 2.54.0; Git LFS. Verified in this checkout with uncommitted changes, not on a clean clone.

## Rollback

Revert `review-bench.mts`, its test and the `3-audit.md` contract text together. No data or application runtime is involved.

## Knowledge

- New: `issues/config-defined-git-hooks-ignore-core-hookspath` (unresolved), `decisions/review-bench-isolation-boundary`.
- Updated: the Git-against-a-worker-tree pattern, `a-gate-must-not-audit-its-own-instrument`, `issues/guard-tests-can-fail-for-the-wrong-reason`.
- No `log.md`. For `/cooldown`: unreviewed last fixes shipped again; Orca dispatch without a model; no command to settle a stopped attempt.

## Followups

In `_followups.md` under the three "From review-bench-hardening" headings. **High:** other Git callers may run configured hooks (unverified).
Medium: `.git` not hashed; `canary-check` reads prose; manifest beside the scratch tree; crafted Markdown passes `record-check`; `PATH`
`link/..`. The rest are low.

## Docs

`ai-framework/workflow/phases/3-audit.md` (reviewer contract) and the decision entry. No other doc change needed.
