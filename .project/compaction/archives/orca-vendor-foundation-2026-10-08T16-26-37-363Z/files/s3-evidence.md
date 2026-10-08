# S3 evidence — diagnostic integration and portable documentation

Date: 2026-10-07. User approved S2 and continuation to S3. All foundation build scopes are complete; audit has not started.

## Result

Workflow doctor imports the policy reader, never preflight, and reports the optional local configuration. Absent/disabled policy is informational; valid opt-in passes policy validation with runtime unverified and dispatch disabled. Present malformed, unsupported-schema, or refused policy produces a failure with fixed diagnostic text. No policy contents or raw policy errors are emitted. Both new production scripts join the normal syntax-check list.

The integration guide documents the JSON flag, all schema fields and bounds, vendor selection, default/probe behavior, launcher precedence, caller evidence limits, worker-context guard, and normal fallback. It explicitly distinguishes this foundation from future dispatch and makes no guaranteed quality, speed, or cost claims. The local `.project/orchestration.json` is ignored; the portable example remains source content. No optional policy is added to scaffold requirements or automatically created.

Changelog skill ran once after doctor passed, recording one logical structural addition from 2.9.1 to 2.10.0. No historical entry was edited by hand.

## Verification

- Planned five-file suite: 105 passing, zero skipped. Command: `node --test ai-framework/scripts/orca-policy.test.js ai-framework/scripts/orca-preflight.test.js ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/bundle-sync.test.js`.
- That suite initially passed 104 checks in the sandbox, with one existing token-report case unable to acquire its local socket lease (`metrics lock unavailable (EPERM)`). The case reproduced alone and a diagnostic call confirmed the denied lease. The authorized outside-sandbox rerun passed all 105; no unrelated test/source changes were made to bypass the check.
- New doctor integration cases in a disposable bundle exercise absent/disabled/valid/malformed/unsupported/refused policy, directory and symlink refusal, fixed diagnostics, no rewrite under `--fix`, and no Orca or alternate-vendor execution. An additional explicit assertion confirms `--fix` does not create an absent optional policy in an installed project; the final preflight suite was rerun after this assertion.
- Combined policy/preflight coverage: 58 passing, 100% production-module lines and functions; policy branches 98.31%, preflight branches 96.03%. The final extra assertion leaves production code unchanged.
- Current doctor: exit 0, zero failures, 743 passing checks; absent Orca policy reported informational. The existing live OpenCode config check warned because the sandbox refused its log-file write. This does not affect static Orca diagnostics and is not claimed as live OpenCode verification.
- Setup validator: READY, 21 checks. Knowledge graph: CLEAN, 28 entries. Syntax check of doctor passed. Changelog check shows 2.10.0. `git check-ignore .project/orchestration.json` confirms local-policy exclusion. Final `git diff --check` passes.

## Scope and remaining limits

Foundation has six new and four modified implementation paths, approximately 1,084 added implementation lines including tests/docs/release entry, within the planned 15-file / 1,500-line ceiling. S3 adds only the policy diagnostic, two syntax-list entries, and one check invocation to workflow doctor; existing OpenCode model-routing edits remain intact. No package dependencies, harness adapters, entry instructions, setup-validator source, or runtime settings changed by this scope.

During S3, the shared checkout gained external commit `8c7474d` (`update-opencode-add-orchestration`), which included earlier S1/S2 files and existing OpenCode changes. This agent did not create, amend, or revert that commit. S3 builds on its current contents; the pre-build inventory is historical evidence, not a restore target.

D1-D4 remain documented: explicit flag replaces proposed mode; portable tests do not require local shaping records; cohesive utilities exceed generic size guidance; runtime evidence stays conservative. No new scope deviation is required. The selected Orca launcher remains broken; no successful live Orca probe, authentication proof, worker dispatch, peer messaging, or reconciliation is claimed. Dispatch remains in its separately gated pitch.

## Next gate

Approve foundation build / Revise scope / Back to plan / Stop. Approval advances to the required independent audit fan-out, then the separate ship gate. It does not authorize live dispatch.
