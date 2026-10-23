# Audit cycle1 — P2d and P2c (separate from completed P1/P2a audit)

Date:2026-10-23. Required code, security, coverage and cross-pitch reviews complete for both tracks. Candidate findings: **zero must-fix, zero should-fix, zero acknowledged production defects**. No applicable required check remains unverified. UI/i18n/eval N/A: local migration, retention and tooling, no UI, translated strings, new dependency or AI prompt.

## Independence and evidence

Code and coverage completion reviews are fresh gpt-6.1-sol high and caught the comparison defect. Security source review and comparison detection were fresh gpt-6.1-sol high; its P2d installed runtime was finished by a resumed amendment and is explicitly independent:no for that completion. Code and coverage independently passed installed acceptance too. Cross-pitch used a fresh gpt-6-luna high initial pass and fresh gpt-6.1-sol high complete-inventory retry. No author-run check is presented as a required reviewer. All exact loaded prompts, source/control manifests and validated records are in audit-records/2026-10-23-p2d-p2c-repair/.

Read-only witness: review-bench guard snapshot/check returned clean:true, headChanged:false, statusChanged:false, changed:[]; all430 source hashes still equal the checkout. Reviewers only received scratch copies, never recovery archives. No implementation changed during audit.

## Required checks completed

P2d: whole migration/guard/test review, sync/doctor read-only integration, old/refused/local inputs, publication/replay, installed two-pass and fresh installation. Independent code31/31 migration,4/4 integration,2/2 fresh,1/1 installed (24.391s); coverage31/31,10/10,2/2 fresh,1/1 installed (24.660s). Security31/31,6/6 plus resumed installed suite3/3 in26.030s, after two retained25s timeouts. The last attempt used an explicitly bounded35s scratch-runtime allowance; production timing/security limits were unchanged.

P2c: whole legacy/source/transaction/nav interface review; receipt before I/O, approval and introducing-commit proof, exact drift acceptance, all source hashes, five-stage SIGKILL replay, new destination bindings and repeated checks, v1 bytes and authoritative graph outcomes. Fresh completion selected guards passed code17/17, coverage16/16, security14/14; original broad refs/outcome/graph tests passed apart from deliberate binding controls. All46 source judgments remain their separately owner-approved content reviews, not an inferred source review from this audit.

Repair: separate bug-fix audit below. Exact36920bytes and raw hash match original candidate/proof. All three completion reviewers independently counted72runs,51pass/21fail,12seededbad and oneCursor not-run. Candidate consumer54/54. Assertions,120000ms timeout and16MiB output bound unchanged.

## Controls, limitations and triage

All three initial seeded defects (dry-run publication, missing destination equality, false historical claim) were caught by code/security/coverage. Cross reviewers caught the planted rollout ownership conflict. Fresh completions also rejected the separate false-claim comparison. These are scratch defects, not production bugs: original source hashes and live guards were verified before triage. All failed reports are preserved as incomplete/blocking first passes; none was called clean prematurely.

The first installed copy omitted config/mirror inputs; completing all synchronized directories and registry ownership fixed the instrument. An isolated742-path b26b45b selected snapshot supplies Git history, excluding secrets/recovery sources; only copied test BASE_REF changes to its audit-baseline tag. Fresh retry scopes completed the missing checks. No fourth P1/P2a audit cycle occurred. These are P2d/P2c cycle1 reviews plus the audit owner's one incomplete-review completion retry.

The cross-pitch instrument initially omitted shared hook and release slices. Actual ownership now names pitch-compress verified-evidence exports, P2d2.44–2.45.1, P2c2.46–2.48.1 and sequential coordinator writes. Other candidates remain un-bet/downstream only. These instrument clarifications are resolved; no production change or deferred must-fix.

Owner-approved closing exceptions remain: TTR9.74%retained versus5% and pre-existing state-history fallback deferredP2b; no coverage gap or slug-upgrade exception. Previous full live suite remains valid because audited implementation hashes did not change:86files,2709pass,0fail,3existing skips.

## Audit-end gate

Approve → separate P1/P2a/P2d/P2c ship preparation and reconciliation under planR14 / Revise / Back to build / Stop. No final ship, commit, push, cooldown increment or downstream rollout is inferred. The exact evidence-path bug fix has a clean separate audit and auto-flows to its own ship preparation; final closure is still gated.
