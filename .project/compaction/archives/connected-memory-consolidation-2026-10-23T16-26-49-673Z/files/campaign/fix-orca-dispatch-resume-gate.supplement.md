# Source-review supplement: fix-orca-dispatch-resume-gate

Prepared 2026-10-22 from all three verified cached files (15,955 UTF-8 bytes) and all sixteen required section bodies. Bet and local ship: 2026-10-08; bug-fix, one implicit scope without shape or plan. Historical evidence, not a new execution claim. Code: [dispatch](../../../ai-framework/scripts/orca-dispatch.mts) and [CLI](../../../ai-framework/scripts/orca-run.mts). Current [vendor guide](../../../ai-framework/integrations/orca-vendors.md) carries later configuration changes. [Live smoke record](../../runs/orca-smoke-2026-10-08.md) supplied the two findings.

## What shipped

F1: dispatchScope checks the multi-agent switch and launch gate before resumeExisting, including on replay of an already-owned attempt. F2: status accepts repeated distinct --vendor values, rejects duplicate vendors and other commands still reject repeated vendor values. The two findings shared gate ordering and one CLI surface; S1 and S2 are listed shipped under one implicit bug-fix scope.

Owned implementation paths: orca-dispatch.mts, orca-run.mts and their two tests. F1 has switch-off and now-disabled-policy regressions; F2 has repeated distinct status vendors, duplicate status vendor and repeated dispatch vendor regressions. Four later configuration-priority checks bring the documented regression additions to nine. No source schema or collector changes were part of this repair.

## Root cause and fix

In the October 8 smoke, a first dispatch under an enabled local policy failed launch with launch-failed:unproven and preserved an unknown-liveness ledger claim. Policy was then replaced with disabled policy while the process switch stayed on. Replaying that attempt returned route resume, reason attempt-already-owned and exit 0, though no worker launched and current policy forbade launch. The caller treated success-shaped exit as launch success.

The existing-ok ledger branch called resumeExisting before rechecking authorization. It now checks orcaMultiAgentEnabled(root,deps,env), returns normal/orca-multi-agent-disabled when off, then evaluates the coordinator launch gate. A denial returns normal with the actual gate reason before resumeExisting can update the claim to unknown-liveness. Those two checks are read-only. The same replay under disabled policy now yields normal/policy-disabled and exit 3; the existing successful inspection replay still launches no second worker. The resume-to-exit-0 mapping was preserved: resume means an existing worker/attempt needs inspection, not a newly launched worker.

For status, parseArgs collects distinct vendor values; repeating the same vendor is duplicate-flag. Other commands allow one value and reject repeats as vendor-not-repeatable. Empty status vendors still selects all vendors. The audit also states the older vendor-only-for-status validation still fires for non-status, a wording ambiguity retained under Historical contradictions.

## Standing constraints

No schema change to the historical ai_workflow_env.json, orchestration policy or ledger. No new rule promotion: the [existing gate pattern](../../knowledge/patterns/a-gate-must-not-trust-its-own-author.md) and already codified testing guidance supplied the principle. No live worker spawned; tests used fakes and temporary Git projects with read-only probes. Runtime never reads secret env files. Mentions of removed/replaced env templates below describe historical mistakes and their reversal, not permission to restore or inspect secret files now.

## Contract and later drift

At this ship the runtime already loaded the project-root ai_workflow_env.json through runtime/select.mts; process environment wins. File true/env silent enables; file false/env true also enables. Two status tests and two dispatch tests exercise those paths. The historical log records removal of obsolete local env state and says the JSON config was absent then, giving Orca false and Node defaults. Those are observations of that tree, not current checkout settings.

The vendor integration doc was not edited by this ship: per-vendor status and a distinct resume outcome were already documented. The actual documentation repair was two stale stack-context statements naming env files as runtime input. They were changed to name the then-current JSON configuration and say secret env files are never read. No ADR-worthy new decision was claimed.

Later guide drift is explicit: configuration moves to schema-3 ai-workflow.toon; legacy JSON migrates; worker pools/self-vendor workers and 1..16 concurrency replace older limits; configured version ranges replace exact-version support; exact startup wiring checks, OpenCode service handling, assignment/overlap rules and structured refusal semantics are added. These are subsequent contracts, not omissions or behavior introduced by this bug fix. The current guide has an expanded exit table and explicitly says exit 3 alone never authorizes fallback. This supplement retains the older observation without repointing its meaning to newer prose.

## Incidents and lessons

- Canonical code/security reviewer prompts gained Hard rules after cooldown, but Cursor byte copies did not. Mirror tests failed. Copying canonical prompt bytes into the Cursor adapters fixed the check; Codex/OpenCode pointer adapters follow a different path. See [mirror issue](../../knowledge/issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check.md).
- A preflight test failed in a full-tree run but passed alone/against HEAD. The staged doctor added a Workflow settings check and the fixture lacked the new settings file; that staged branch state was distinct from F1/F2. The original section was called superseded in the old ledger, but its diagnostic distinction is retained here rather than silently omitted.
- An early attempt misread a missing-template failure and recreated an obsolete template from Git. CHANGELOG 2.18.0, the README and ignore rule showed the old template was intentionally replaced by the JSON example, already present in the branch. The recreation was reverted after verification had already passed; preflight then passed 24/24 without the obsolete file. The correct cause was the staged doctor fixture, not an accidental deletion. See [missing-file issue](../../knowledge/issues/a-missing-tracked-file-is-not-an-undeleted-deletion.md).
- A missing-path test failure describes the current tree, not the branch's intended deletion. Check recorded decisions, changelog and references before restoring files. The [replay-gate issue](../../knowledge/issues/an-idempotent-replay-path-returned-success-without-re-checking-the-gate.md) records the authorization-order lesson.
- OpenCode debug config attempted to start a managed service while a live OpenCode session already owned its port; doctor warned could not resolve config. That environmental observation was deferred, not patched by changing policy or launching a worker.

## Audit history

One October 8 inline cycle: code and security read the diff/gate branches, coverage checked five F1/F2 and four configuration-priority regressions. UX and i18n skipped for no UI/strings, eval skipped for no prompt, cross-pitch skipped because only this pitch was active. All findings tables list zero must-fix, should-fix and acknowledged items, although separate Limits/Followups still describe environmental and parity limits.

No separate scratch tree, planted canary or independent parallel reviewer. Inline audit explicitly justified the small roughly 150-line diff across two source and two test files, convention-based read-only tooling and already completed checks. Canary hardening was next-pitch work. These historical limitations are preserved, not relabelled as current audit compliance or independent proof. The bug-fix gate auto-flowed to ship when clean.

## Verification history

Recorded ship checks: Node full repository 1037 pass / 0 fail / one skipped Bun-only doctor check; setup READY, 22 checks; doctor READY WITH WARNINGS, one environmental OpenCode warning; graph CLEAN. Build/typecheck/lint/i18n commands were N/A under the stack contract, not successful runs. Diff review found no uncommitted secret env artifact or debug code in touched paths.

Final source records give orca-run 23/23, dispatch 44/44 and eleven-file Orca bundle 308/308. Earlier build stages give run 20, dispatch 42 and bundle 280; audit describes baseline run 17 then +6, dispatch 40 then +4, bundle 304 then +4. Bun touched-file parity is recorded as 66/66. Read-only live CLI repro of the existing attempt returns normal/policy-disabled/exit 3 after F1, versus resume/exit 0 before. Four file/process-priority tests are recorded passing.

Full repository Bun parity exceeded the 400-second shell budget in token-consumption/browser-runtime integrations; only scoped Bun evidence was claimed. No live worker or new independent review was performed by this source-review upgrade.

## Limits and open items

[Backlog](../../pitches/_followups.md) records managed-service config probing and full Bun parity limits. Later guide work provides OpenCode service handling, but that does not retroactively prove the old full-suite parity or host state. The later guide/config changes are preserved as drift, not absorbed into this repair's original claim.

The tracked [ship-time log](../../runs/2026-10-08-fix-orca-dispatch-resume-gate.md) is not byte-identical to cached final log.md in this review. It is supporting history only; all retained source content maps here. There is no claim that any run is a lossless replacement for the cached three files.

## Historical contradictions

- Bun 66 touched cases differs from final run 23 plus dispatch 44 = 67; the four config cases section also calls the combined result 66. Preserve the reported runtime inventories, do not silently reconcile them.
- Orca bundle is 280 at build, 304 in the audit before four added cases, 308 at final. They are different recorded stages; final evidence does not prove every earlier count was the same inventory.
- Audit says non-status vendor-only-for-status still applies while F2 prose allows one non-status vendor and specifically rejects repeated dispatch values. The intended repeat behavior and exact error reasons are retained without asserting the historical wording is consistent.
- SHIPPED says no env added and no new rule promoted; log preserves a wrongly recreated obsolete template that was removed before final ship, and says the gate lesson was already codified by cooldown. The final-state no-go is not evidence no mistaken intermediate edit occurred.
- Done-work says the ledger had 94 percent coverage and one accepted gap superseded by the wrong-fix section. This new mapping retains that original staged-doctor diagnosis as history; no prior gap acceptance becomes authority to omit unread material.
- No version for this bug-fix release is asserted in these three cached files. CHANGELOG 2.18.0 is cited as evidence of the earlier template replacement, not invented as this fix's release number.
