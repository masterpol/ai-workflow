# Shipped: package-less-ship-verification
Bet: 2026-11-25  •  Shipped: 2026-11-25  •  Appetite: small-batch  •  Version: 2.57.0

`pre-ship-verify.mts` can now pass in a project without a `package.json`, and in one that has only `verify:base`.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-11-25 | `package.json` route fixes, check source and result printed, "no checks configured" |
| S2 | shipped | 2026-11-25 | check manifest, this repository's manifest, ship doc; converting a missing executable applies to manifest checks only |

Files: 4 as planned (verifier, its test, `4-ship.md`, `checks.toon`), plus release and workflow records.

## No-gos honored

- ✅ No temporary or generated `package.json`.
- ✅ No weaker required check for a project that passed before. One case is stricter: a symlinked manifest path now fails a `package.json`
  project even with no manifest.
- ✅ No shell, no command strings, no application-specific command added.
- ✅ Ship gate unchanged.

## Rabbit holes

- ✅ Manifest, not `stack.md` parsing; no new `ai-workflow.toon` key; viewer fallback kept and made conditional.
- ✅ Check list and dirty-checkout tests: spiked. The reported failure did not reproduce, so no clean-clone step and no test change.
- ✅ Timeout and output cap: suite measured at 97–111 s and about 228 KB (Node only); 600 s timeout, 4 MiB cap unchanged.
- ⚠️ New: a timing-ratio test can block a ship under load (followup, knowledge card).

## Audit

One cycle, three Orca reviewers, no confirmed must-fix. Record: [audit-cycle-1.md](audit-cycle-1.md).
**Accepted by the owner running `/ship-pitch` after being told:** the audit's own fixes were not independently re-reviewed, and the test
coverage review is `independent: no`. Three issues the security reviewer rated must-fix were lowered to should-fix because the code predates
this change; they are in the backlog.

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts`: **exit 0** on the finished tree (109 s). Tests 2,382: 2,379 pass, 3 skip, 0 fail. Passed from the manifest: `tests`,
`setup-validator`, `knowledge-graph`, `process-relations`, `workflow-doctor`; plus built-in `diff-sanity`. No manual substitute.
One earlier run on the audited tree exited 1 on the timing test below, then passed on rerun. After the close-out records were written, another
run exited 1 on the same test (a different case, ratio 3.52): 2 failures in 5 full runs.

Not applicable, no such command (`.project/context/stack.md`): build, typecheck, lint, i18n. Not run: full suite under Bun; Windows.
The passing run was in this checkout with uncommitted changes.

**Clean clone of the commit (`aab578c`), after close-out:** the verifier **exited 1** on the same timing test ("quoted noise", 5.36, 8.3 ms to
44.7 ms); the other 2,371 tests passed, 10 skipped. That makes 3 failures in the last 6 full runs. Run directly in the clone: `graphify --check`
and `graphify-relations --check` passed; `setup-validator` and `workflow-doctor` failed because the Git-ignored, mandatory `ai-workflow.toon`
is absent. Both pass with the example config copied in, and both fail the same way on the base commit.

## Knowledge

- Updated: `issues/package-less-bundle-ship-wrapper-cannot-select-checks` (resolved), `patterns/a-planted-canary-makes-a-reviewer-finding-checkable`.
- New: `issues/a-wall-clock-ratio-test-can-block-a-ship-under-load` (low confidence).
- No `log.md`: no build incident. For `/cooldown`: shipping with audit fixes not re-reviewed also happened on `rename-ship-command-to-finish`
  and `state-project-sources`; decide whether it needs a rule.

## Followups generated

Eight in `_followups.md` under "From package-less-ship-verification": unguarded verifier reads (med); `diff-sanity` below the Git root (med);
raw verifier output (low); interrupted check left running (med, unverified); viewer route paths (low); local-only knowledge graph (owner
question); stale Orca ledger entries (low); flaky timing test (med). Plus one note closing the older package-less entries.

## Docs

`ai-framework/workflow/phases/4-ship.md` documents the routes and manifest. No other doc or decision record: no new integration or architecture change.
