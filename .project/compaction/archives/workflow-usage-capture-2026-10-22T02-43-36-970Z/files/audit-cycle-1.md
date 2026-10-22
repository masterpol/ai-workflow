# Audit cycle 1 — incomplete

Date: 2026-10-21. Build target: 1051eb6. Owner approved repairing the brief and retrying Orca.
Startup again returned ready / launch-allowed. The existing Run objective and coordinator were verified
and reused: run_6b7b13c50a79, term_05ddb0fd-931b-42c2-9375-71fd2211ddbc.

All four brief change fields were flattened; local calls to workerBrief accepted each (all below 4 KiB
per field and 16 KiB total). Prompt files and SHA-256 values are preserved under the metrics audit folder.
The source guard's overlarge-snapshot limitation remains documented; a separate secret-excluding witness
checks file mode/content hashes for 1237 paths, HEAD and porcelain status. It reports clean=true after
review. No production code was edited.

| Required role | Attempt / Dispatch | Outcome | Next action |
|---------------|--------------------|---------|-------------|
| code | capture-audit-code-c1-20261020 / ctx_20627a94eebc | worker_done accepted; canary caught; required checks unfinished | fresh narrower retry, once phase unblocked |
| security | capture-audit-security-c1-20261020 / ctx_0dd04b4610a8 | worker_done accepted; canary caught; required checks unfinished | fresh narrower retry, once phase unblocked |
| coverage | capture-audit-coverage-c1-20261020 / no proven dispatch ID | blocked: launch-failed:unproven; ledger unknown-liveness | inspect/recover ownership before any retry |
| cross-pitch | not dispatched | deferred after refusal | dispatch once phase unblocked |

Code and security requested claude-sonnet-5-5 explicitly; coverage requested OpenCode's configured fast
model opencode-go/minimax-m3.1-flash-free. Observed runtime model fields are absent, so requested placement
is recorded without inventing a verified provider model. UI/i18n/eval reviewers are not applicable.

The code/security worker reports identify the scratch-only injected prompt marker at workflow-capture.mts:37.
Both review-bench canary-check commands exit 0 with caught=true. The source emit function has no marker;
this is the planted defect, not a product must-fix. Both reports leave required checks unfinished; code also
records one accidental read of the shared source before returning to scratch. The witness confirms no writes.
No clean-audit or independent=yes claim is made. Raw reports and checkable records are preserved under
.project/metrics/workflow-usage-capture-audit/{code,security}-{report.txt,record.md}.

Other observations await main-thread verification: pending-cap eviction of phase segments, SessionEnd
unmatched finishes/prompt-id mismatch, V2 steps Map retention, bounded capture latency in tool hooks, and
manual/native activity-key source sharing. These are unverified review observations rather than confirmed
must-fixes. No patch is made from an unverified finding.

Both successful Dispatches were released through worker-release after accepting their own reports, their
ledger attempts were settled, and both FIFO deliveries were acknowledged. Final worker-list shows both
resources released. Coverage's unknown-liveness ownership is deliberately preserved: worker-list shows no
OpenCode row, which is absence and does not prove no process or launch existed. No worker was stopped,
abandoned, retried or launched around that record. The bound Run remains available.

Audit stops on the refused OpenCode launch per AGENTS.md/orca-vendors.md. Required decision: fix/recover
Orca, or explicitly re-invoke audit with orca=normal. Audit remains open and cannot advance to ship.


## Recovery and final synthesis — 2026-10-21

The owner approved investigating and repairing the OpenCode launch. Startup returned ready and the
existing Run/coordinator binding was verified. Read-only runtime inspection found the precise preflight:
this Orca build supports model pinning only for OpenCode 1.18.30, 1.18.32 and 2.0.16. Installed OpenCode
reports 2.1.1. Runtime model-support verification precedes createStartingWorkerDispatch; unsupported
versions refuse before Task/Dispatch or agent-terminal creation. The durable journal has only the successful
Claude starts in that launch interval. This code-path/version proof, rather than worker-list absence alone,
justifies classifying the old coverage ledger entry failed. The proof, source-chunk hash and selected
snippets are opencode-recovery-proof.json in the metrics audit folder. No runtime/app/config source changed.

Remaining roles used the already configured alternate Claude vendor through Orca, with explicit existing
worktree placement and claude-sonnet-5-5. Fresh narrower code/security rechecks completed the missing
checks, then coverage and cross-pitch reviews completed. This is completion of cycle 1, not a new patch
cycle: no production correction was required. Runtime receipts now verify requested AND effective Sonnet
for all six successful Dispatches; prior absent-model observations are superseded by this evidence.

| Role | Completing Dispatch | Required result | Canary evidence |
|------|---------------------|-----------------|-----------------|
| code | ctx_0f3315dc8e9f plus initial pass | complete: wiring, argv/writer interaction, scripts, negative tests and docs | first marker caught automatically; new planted timeout quoted and demonstrated |
| security | ctx_8d1cf78aa0b3 plus initial pass | complete: privacy, identifiers, bounded input/output, leases/errors, exact commands | first marker caught automatically; new comparison mutant quoted and demonstrated |
| coverage | ctx_628fa77cd995 | complete: APIs, intervals, boundaries, retry/deadline, wiring, migration, privacy | marker canary-check caught=true |
| cross-pitch | ctx_e84a99690ad0 | complete: ownership, overlap, adjacency, merge order and interface | marker canary-check caught=true |

All reviewers are fresh alternate-vendor agents; records say independent:no rather than claiming the
same-model-family independence defined by the reviewer contract. Their complete scoped review results
and source read-only witness are distinct from that independence label. Code/security first-pass reports
were incomplete; their fresh rechecks and the other completed reviewer passes cover the named missing
checks. Optional platform/whole-suite checks outside each bounded review are still unverified as reviewer
work. Main-thread checks below are labelled author-run, not substituted for missing reviews.

### Must-fix

None confirmed in the source. All reported must-fixes were planted scratch canaries: marker emission,
timeout 30 and substring command comparison. The actual source emits no prompt field and keeps timeout 5
and exact command comparison at workflow-doctor.mts:383. The source's 196-test combined run exits 0.
No source patch was made from a canary finding. Code/security retry automatic citation checks return false
because of approximate/offset line references; their exact quoted mutant operators and failing test output
prove detection. Their first-pass automatic checks both returned caught=true. Raw reports are preserved.

### Should-fix

| ID | Observation | Verified | Disposition |
|----|-------------|----------|-------------|
| S1 | workflow-metrics.md:125-128 still calls the core event table planned | ambiguous wording confirmed; core itself still does not wire hooks | defer documentation clarification to workflow metrics docs maintenance; harnesses.md already states current wiring |
| S2 | OpenCode plugin steps metadata has no cap/TTL for never-ended steps | present unchanged at build base 868212b:129,147,169 | defer existing collector hardening to OpenCode token-plugin maintenance; capture does not add Map entries |

Both deferred items are named in _followups.md. They do not invalidate the capture contract or any plan exit.

### Refuted or acknowledged observations

- Coverage's claim that absent wiring, duplicate and unexpected-event checks lack tests is refuted by
  workflow-doctor.test.mts:942-977. The exact four tests were rerun: 4 pass, 0 fail. No duplicate tests added.
- SessionEnd prompt-id mismatch was unverified speculation: approved S1 observed prompt_id on SessionEnd
  (spike-s1-payloads.md:61-66) and on submit/stop. Adapter fallback matches the approved contract.
- Unmatched SessionEnd finishes are counted by the state as unmatched evidence; capture intentionally
  does not read state or infer an open interval. This is the approved mapper/state boundary.
- Phase segments compete under the documented pending cap; eviction is bounded and counted. Losing labels
  after capacity eviction is a conservative unknown, not fabricated attribution or a new unbounded store.
- Refused lease attempts include a recovered first try in the drop counter: explicitly documented and
  approved at S3; no conversion to dropped-event counts is attempted here.
- Tool-hook capture delay is bounded by the approved pre-acquisition budget; lease-busy paths and no
  forced cancellation after acquisition are covered by existing tests and measurements.
- Manual/native activity-key source sharing is local-caller trust, already disclosed in workflow-metrics.md.
- Native null-session/other-label branches are outside valid mapper output; the mapper validates session
  identity and resolver labels. Direct additional internal-branch tests are not a missing public contract.
- Source-checker fixture failure in a scratch doctor's unrelated config test came from a missing TOON
  template in that copy; the source tests pass. It is not a production regression.

### Cross-pitch result

No pure implementation overlap. workflow-v3-rollout and test-execution-performance are shaped, with no
active implementation diffs. Shared VERSION/CHANGELOG bookkeeping requires sequencing: capture ships first;
performance work must use the new base. Rollout must repeat its scratch-copy dry run before any real sync,
as already recorded in rollout.md. No runtime settings, timeouts or assertions were changed for performance.

### Author-run verification

```text
node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  workflow-capture.test.mts opencode-plugin.test.mts workflow-doctor.test.mts
  workflow-metrics-state.test.mts runtime/migrate.test.mts (full repository paths in log)
exit 0; 196 tests; 195 pass; 0 fail; 1 existing Bun-only skip

node --experimental-strip-types --disable-warning=ExperimentalWarning --test
  --test-name-pattern='doctor (rejects (duplicate|missing) capture registration|warns for an install|rejects capture on an unexpected)'
  ai-framework/scripts/workflow-doctor.test.mts
exit 0; 4 pass; 0 fail

node ai-framework/scripts/workflow-doctor.mts --json
exit 0; failures: 0
node ai-framework/scripts/setup-validator.mts
exit 0; READY; 23 checks; 148 TypeScript entries parse
node ai-framework/scripts/graphify.mts --check
exit 0; CLEAN; 107 knowledge entries; 308 links
python3 /tmp/capture-audit-witness.py check
exit 0; clean=true; changed=[]; headChanged=false; statusChanged=false
```

The build's full-suite evidence remains explicit: Bun 2338 pass / 3 skip / 0 fail; Node reproduces only the
owner-approved sanitizer timing failure and dataset cascades. Audit makes no claim that full Node is green.

All six successful workers supplied their own accepted worker_done reports, were released, and have settled
ledger entries. All FIFO deliveries were processed and acknowledged. The old failed OpenCode preflight is
classified failed, with recovery proof; no unknown-liveness attempt remains. Final Run fleet: six released.

Final evidence records pass review-bench record-check. Metrics reports, exact prompts/hashes, canary
manifests, launch/collection/release receipts and witness are under the metrics audit folder or their named
/tmp paths. Scope source files remain unchanged from 1051eb6. Audit cycle 1 is complete with zero confirmed
must-fix findings; two bounded existing/documentation follow-ups are deferred. Big-batch audit-end approval
is required before /ship. Feature release bump and ship reconciliation are still pending.
