# Audit cycle 3 — state-fragment-sanitizer

**Result: CLEAN.** All required reviews are complete; zero confirmed live must-fix findings.
Final big-batch audit cycle (3 of 3). Await owner audit-end approval before /ship.

## Changes and verified fixes

A7 is fixed. Parser exports its existing resolveLimits validator, now containing throwing
Proxy traps as null. configuration() takes one validated plain Limits copy, checks its
maxDepth against DEFAULT_LIMITS.maxDepth, and passes the same private copy to both parse
passes. Parser-only raised-depth controls remain legal. No duplicate limits validation
was added. Existing API consumers remain compatible.

The original live reproduction now returns:

```text
{"result":{"ok":false,"reason":"depth-limit","count":1,"token":"g"},"reads":1}
```

Before the fix, the same depth21 input was accepted after four changing descriptor reads.
The new regression also rejects explicit maxDepth21 and a throwing limits Proxy, and accepts
the depth20 boundary. resolveLimits tests cover valid partials, independent copies, ordinary
getters and throwing Proxy traps.

Should-fix test gaps from cycle2 are closed: every D2 forbidden control character (with
TAB/LF/CR positive controls), 64/65 data text, nested tspan, 200/201 binding path and
64/65 binding text. The final four fragment/mapping suites pass323 tests.

The integration doc now states the own-data snapshots, tspan parent requirement, explicit
ASCII digit scope and review responsibilities. It removes the obsolete pre-audit claim.
Integration is still deliberately unwired and the nine authoring/injector cases remain
deferred. VERSION remains2.35.0: the audit fixes are part of the same logical change.

## Independent review completion

| Required role | Current evidence | Explicit model | Canary | Cross-file | independent | verified |
|---------------|------------------|----------------|--------|------------|-------------|----------|
| code reviewer | full parser/validator/dataset review complete in cycle2; final changed functions and helper export complete in cycle3; evidence full review complete in cycle2 | Sonnet5.5 medium main; Opus5.5 high evidence | caught hard-depth guard; earlier status/unbound canaries caught | reviewed | yes | reports, record-checks, guard |
| security reviewer | full A–G reviews complete in cycle2; new limits snapshot/export and callers complete in cycle3 | Sonnet5.5 medium main; Opus5.5 high evidence | caught hard-depth guard; earlier escaping/mismatch canaries caught | reviewed | yes | reports, record-checks, guard |
| test coverage checker | four current suites and changed exports/controls/boundaries complete | Sonnet5.5 medium (escalated from incomplete fast work) | caught removed U+2066–2069 controls | reviewed | yes | report, record-check, guard |
| cross-pitch conflict checker | all four scoped static ownership checks complete | Sonnet5.5 medium (escalated after unreliable fast reviews) | caught synthetic approved source ownership collision | reviewed | yes | report, record-check, guard |

Fresh reviewers were not shown earlier findings or sibling reports. Scratch manifests were
kept outside their trees. Actual changed production/test bytes match the pre-canary
manifest hashes, for all seven files in every code/security/test scratch. The canaries
were never applied to live code. Every final canary-check returns caught:true, and every
record-check returns ok:true with no issues. Evidence lives in the ignored audit3 directory.

One code reviewer briefly wrote and deleted a temporary test-output file under /tmp outside
its assigned scratch. It disclosed this minor process deviation; the live checkout guard
remained clean. It did not inspect or modify live project source. Read-only verification
is the measured guard, not an assumption that tools technically could not write elsewhere.

UX, i18n and eval roles do not trigger: no UI or locale surface and no AI-prompt/model change.
This pitch is a deterministic library, so no live-model or browser evidence is claimed.

## Must-fix

Empty. Final raw reviewer high findings are the planted depth/control/ownership canaries.
Coordinator re-read the actual live guards and compared pre-canary hashes before dropping
these as real findings. The depth snapshot defect A7 itself is fixed and regression-tested.

Cross reviewer completed its scoped checklist after explicit file-inventory inputs and
standard-profile escalation. The real rollout remains shaped, with no plan.md; sanitizer
readiness.md is observed absent, not a review prerequisite. The temporary approved rollout
R1 plan and related fixture metadata are scratch-only. Its overlap and contradictory
metadata findings are canary-induced, not actual ownership conflicts. No historical
rollout record was edited. Real source scopes are disjoint at present; any future rollout
must use a committed/shipped bundle revision and reconcile version bookkeeping in sequence.

## Should-fix

No outstanding actionable findings in this pitch. Cycle1 data-copy, tspan, shared-reject
and directive fixes passed complete cycle2 review. Cycle2 boundary gaps are fixed here.
The rollout's old readiness measurement is historical evidence; future rollout planning
must choose and revalidate its actual release base. This is owned by workflow-v3-rollout,
not a reason to rewrite its old report.

## Acknowledged

- D6 counts ASCII digit runs and uses JS numeric equality; worded and other-script numeric
  claims remain authoring responsibilities. D2's exact Unicode ranges remain the contract.
- Pre first-newline browser semantics, hard-link filename limitations and trusted bundle
  snapshot assumptions remain the recorded cycle1 limitations. No unpromised browser test.
- Config.limits is typed as an optional Partial although runtime always stores a complete
  validated copy. It is harmless; no type-only cleanup added after review.
- Wall-clock fuzz checks are sensitive to heavy concurrent harness load. One cycle2 run
  exceeded1s and is preserved. Final regression uses serialized file scheduling and retains
  every original timing assertion and bound.

## Final verification (coordinator, current session)

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=1 ai-framework/scripts/state-*.test.mts ai-framework/scripts/runtime/invariants.test.mts
node ai-framework/scripts/workflow-doctor.mts
node ai-framework/scripts/setup-validator.mts
node ai-framework/scripts/graphify.mts --check
node ai-framework/scripts/docs-links.mts ai-framework/integrations/state-report.md
node ai-framework/scripts/changelog.mts --check
git diff --check
```

Every command exits0. Verbatim regression tail:

```text
1..531
# tests 531
# suites 0
# pass 531
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 12433.466417
```

Other current outputs:

```text
Workflow status: READY
All workflow contracts, adapters, hooks, model routes, and scaffold templates passed.
Validated 752 checks. Use --json for machine-readable output or --no-color for plain text.
PASS  TypeScript entries: 144 TypeScript file(s) parse
Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 23 checks. Use --json for automation or --no-color for plain text.
Graph status: CLEAN
Dry run (check) — no files written.
1 file(s) checked, 0 broken link(s)
VERSION: 2.35.0
```

Author-run mutation proofs, rerun against final source (not presented as independent reviews):
parser45 rows killed or proven redundant, zero unexplained; validator16/16 killed;
evidence15/15 killed; formatter M50 killed, M51 measured redundant; dataset M52 killed.
All52 planned M rows resolved:51 killed, one measured redundant. Five audit regression
guards also proved with baseline0/mutant1 and the expected named ERR_ASSERTION:

```text
hard-depth-ceiling: baseline0, mutant1, named ERR_ASSERTION
all-d2-controls: baseline0, mutant1, named ERR_ASSERTION
options-snapshot: baseline0, mutant1, named ERR_ASSERTION
citation-snapshot: baseline0, mutant1, named ERR_ASSERTION
tspan-parent: baseline0, mutant1, named ERR_ASSERTION
```

Raw logs/scripts are in `.project/metrics/state-fragment-sanitizer/audit3/`. Production
budgets: parser266/350, validator266/300, evidence134/150; total666/800 lines.
No application build/typecheck/lint exists; setup parses TypeScript and runtime invariants
check import/boundary behavior. No extra packages or global configuration changes.

## Orca evidence and resource accounting

User explicitly resumed Orca after cycle2's dispatch_inactive status-message error.
Startup ready; verified the same bound Run run_76430abd338c and coordinator; runtime epoch
76f8e25d-36c5-4261-8bb8-c635edc084c3 unchanged. No native-agent fallback.

| Role | Dispatch | Own report | Cleanup |
|------|----------|------------|---------|
| code | ctx_c8009fcc840f | msg_6e362022f60f | released, closed_agent_terminal, transcript captured |
| security | ctx_8334262b3d6f | msg_ac88e4a394af | released, closed_agent_terminal, transcript captured |
| test | ctx_2684ed2c9824 | msg_183373da8f09 | retained:user_takeover, processAction none |
| cross | ctx_bc52a088b7cc | msg_d082042685b1 | retained:user_takeover, processAction none |

Own report IDs are pinned by the ledger and original mail. All four authoritative worker_done messages
collected; delivery729c7ff85b0c acknowledged; all logical attempts settled after inspection.
Retained terminals are user-owned, not forcibly closed and not claimed as released.
No unknown-liveness attempts. No patch reconciliation needed: reviewers changed no live
source, and all fixes were applied by coordinator before scratch preparation.

Measured read-only guard after all reviews and before coordinator-only doc reconciliation:

```text
clean: true
headChanged: false
statusChanged: false
changed: []
```

Exact prompts, SHA256 values, raw reports, canary manifests, release receipts, check logs
and source hashes are covered by the verified local evidence manifest. Existing graph
diffs preserved. No commits, external publication or runtime integration performed.

**Audit-end gate:** Approve -> /ship; Revise; Back -> /build; Stop.
