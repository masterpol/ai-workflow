# Audit cycle 2 — state-fragment-sanitizer

Status: OPEN, stopped after an Orca command error. No clean audit or ship approval claimed.
Cycle 3 (final big-batch cycle) has not started.

## Review completion

| Role/slice | Explicit model | Required checks | Canary | independent | verified |
|------------|----------------|-----------------|--------|-------------|----------|
| code parser/validator/dataset | claude-sonnet-5-5 medium | complete, including helpers and plan | caught status guard | yes | source report, canary-check, guard clean |
| security parser/validator | claude-sonnet-5-5 medium | complete A–G | caught escaping | yes | source report, canary-check, guard clean |
| code evidence | claude-opus-5-5 high | complete | caught unbound guard | yes | source report, canary-check, guard clean |
| security evidence | claude-opus-5-5 high | complete A–G | caught mismatch guard | yes | source report, canary-check, guard clean |
| test coverage | claude-sonnet-5-5 medium | complete scoped checks | caught SKIP guard | yes | source report, canary-check, guard clean |
| cross-pitch | claude-haiku-5-5 high | INCOMPLETE C9 | caught synthetic ownership conflict | not-completed | source report, canary-check, guard clean |

All six record-checks pass, all six canaries caught. Test review escalated one profile after
the incomplete fast review. Both code/security models differ from original corresponding
module implementers. Fresh reviewers saw no previous findings. Cross-file interactions
reviewed as recorded; out-of-scope injector/browser/live-model checks remain deferred.

Cross reviewer says sanitizer readiness.md was absent, and marks C9 INCOMPLETE. Its supplied
static scope did not require such a file, and no such live file was provided/observed. Still,
the audit owner treats a report labelled INCOMPLETE as unfinished; it is not counted clean.
The reported source-ownership collision is a scratch-only canary: the real rollout pitch is
shaped, with no plan.md. Do not edit rollout history to remove a nonexistent live collision.
Real rollout readiness has a stale 2.30.0 reference; future rollout planning must rebase its
chosen bundle revision after sanitizer ship. VERSION/CHANGELOG are sequential bookkeeping;
no actual simultaneous source-edit overlap is established.

## Must-fix / missing exit

**A7 — trusted limits check/use can bypass the sanitizer hard depth ceiling.**
Security-main F3 initially rated informational. Coordinator verified on the LIVE unchanged
source: a Proxy limits object returns maxDepth 20 for the first two descriptor reads and 100
thereafter. A depth-21 SVG then returns ok:true; four reads were measured. This violates D1's
explicit sanitizer depth ceiling even though it requires caller-supplied executable JS and
is not reachable from plain fragment text. Treat as a missing promised exit, not remote XSS.

Reproduction and output: `.project/metrics/state-fragment-sanitizer/audit2/depth-proxy-before.mts`
and `depth-proxy-before.log`. Not fixed yet.

Proposed narrow repair: reuse the parser's existing resolveLimits validator to take one
plain resolved copy before the depth check and both parse passes. Export that helper (or
an equally small shared snapshot API) instead of duplicating its validation; sanitize must
check the resolved maxDepth <= DEFAULT_LIMITS.maxDepth. Keep parser-only raised depth tests.
Add a regression proving one descriptor read, depth-21 refusal, explicit >20 option refusal,
and no raw Proxy trap error if the helper is hardened. Fresh focused code/security/test
rechecks needed in cycle 3. Respect parser350/validator300/evidence150/total800 budgets.

## Should-fix / acknowledged

Cycle-1 patches are confirmed by complete cycle-2 reviews and the coordinator: bounded
own-data option and citation copies, shared reject, tspan parent, directive consistency,
combined number pipeline and exact geometry/href caps. No new live high/critical injection
was confirmed. Reviewer high findings in the scratch copies were the planted canaries.

Test reviewer requests fuller D2 control-range coverage, 64-character data-text boundary,
nested tspan, and binding path/text exact caps. These are small meaningful regressions to
add with A7 before final test review. Existing non-ASCII digit behavior is D6's intentional
ASCII policy. Large-number normalization and pre first-newline behavior remain the cycle-1
acknowledged limits. Arbitrary executable Proxy/getter snapshots remain outside the trusted
bundle snapshot contract; no shared facts() edit is proposed.

## Current-session checks

Author-run independent of reviewers (all logs retained):

- Parser mutants: 45 rows, all killed or measured redundant, zero unexplained.
- Validator mutants: 16/16 killed (13 planned and three extra).
- Evidence mutants: 15/15 killed.
- M50 killed; M51 and extra grammar removal measured redundant.
- M52 killed by exact named skipped-only negative control.
- Three new regression guards proved: options-snapshot, citation-snapshot, tspan-parent.
  Each same-layout baseline exits0; mutant exits1 with named ERR_ASSERTION.

All 52 planned M rows remain resolved: 51 killed and M51 measured redundant, no deferred row.

First full regression ran concurrently with all mutation harnesses and failed 15 checks:
raised-cap 5 MB geometry took 1371.611708ms, exceeding the unchanged1000ms bound; the
dataset child failure cascaded into its14 mapping assertions. This is retained as a real
failed run, not hidden. Workload-sensitive timing is acknowledged.

After mutation harnesses finished, serialized test scheduling passed without weakening
assertions or changing timeout caps:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=1 ai-framework/scripts/state-*.test.mts ai-framework/scripts/runtime/invariants.test.mts
```

```text
1..526
# tests 526
# suites 0
# pass 526
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 12230.623333
```

Current production: parser264, validator266, evidence134, total664 lines (all within caps).
No additional version bump during audit; this remains logical feature version2.35.0.
The documentation still needs its pre-audit wording reconciled before ship.

## Orca stop and cleanup

Run run_76430abd338c, runtime epoch76f8e25d-36c5-4261-8bb8-c635edc084c3.
A late status message to completed cross dispatch ctx_d167ef89fbd2 returned exit1:
`dispatch_inactive: Dispatch ctx_d167ef89fbd2 is completed; its worker will never read that mailbox.`
Request689ddd99-cb3a-4331-a4a3-e36d42b50da1. The message was only a request to finalize;
no source/launch action was rejected. Nevertheless the phase owner's explicit any-command
error stop rule applies. No silent switch to native agents or normal mode.

All finished own worker_done reports were collected; all processed deliveries acknowledged.
All six cycle-2 workers released with closed_agent_terminal. All six ledger entries settled
after inspecting reports, guard, canaries and evidence hashes. Cycle1 has seven settled
attempts plus one failed test-review attempt, also released; no unknown liveness remains.

Guard after all reviews, BEFORE any prospective further source edits:
`clean:true, headChanged:false, statusChanged:false, changed:[]`.
Complete reports/prompts/manifests/receipts/check logs and verified SHA256 manifest are
under `.project/metrics/state-fragment-sanitizer/audit2/`. Reports and proof artifacts are
local ignored evidence, not commits.

Resume with explicit owner choice: fix/re-invoke Orca or use orca=normal. Then repair A7,
add promised boundary regressions, perform only final cycle3 affected-role checks, and
finish remaining review completion before any clean-audit claim. Big-batch audit-end gate
remains Approve -> ship / Revise / Back -> build / Stop. No commit or release made.
