# Shaping evidence — 2026-10-21

Orca Run: `run_d3b6ac5bc706`; objective: Shape token-time-report: bounded read-only joined token and workflow time report; pre-bet critique only. Created after run-current returned null; coordinator `term_1cbc70ba-633b-4237-a76c-881b1335ba38`.

Read the original seed and workflow-usage-capture/shaping-draft.md before reshaping. Checked workflow-usage-state, workflow-usage-capture and state-deep-evidence ship status. Prior seed is preserved beside the current pitch.

Graph queries: `token time report metrics phase duration`, `token attribution workflow usage`; broad results were truncated, then checked matched code and knowledge paths directly. No knowledge entries changed.

Live metadata inspected read-only around 2026-10-21T23:34Z:
- token-consumption.json schema 3; flows since 2026-10-19T17:16:45.380Z.
- Flow leaves contain vendor rows with completions, reportedUsageCount, unavailableCount, tokens, costUsd and pricedCount. No per-flow effort or token components. See token-consumption.mts FlowPitch/Flows/Row.
- workflow-usage.json schema 2; usage since 2026-10-21T14:17:56.438Z; 244 native events, 42 turns started, 37 finished, 35 gaps measured, 5 unmeasured, 6 over cap. These are snapshot observations, not stable totals.
- Usage pitch keys: (unknown), state-deep-evidence, (unattributed). Real data is sparse and not evidence of full capture.
- usage.total activeMs 4776727; waitMs 28383474; captureDropped 0, supersededTurns 3. Open/pending intervals require explicit report treatment.
- Workflow usage timing rows have no vendor dimension. Pitch transitions/trace exist; failed outcomes exist only in older summary groupings, not each phase/scope leaf.
- state-history.mts supplies observed/partial/unavailable history fields. Existing /state tokens ownership stays unchanged.

Projected implementation file budget (9): flow-report.mts, flow-report.test.mts, flow-render.mts, flow-render.test.mts, state-pages.mts, its existing state HTML test, integrations/workflow-metrics.md, VERSION, CHANGELOG.md. Plan must check whether guarded reader reuse requires another module. Workflow records and critique evidence are separate administrative artifacts; all implementation/tests/release files count toward the 15-file cap.

The other active pitch, workflow-v3-rollout, targets receiving repositories and bundle-sync/config migration. Verify no shared source change is planned; future report propagation occurs through normal rollout, not this pitch.

## Orca interruption

Critique startup returned ready. Historian launched as `ctx_645df4e32462` (`attempt:ttr-shape-historian-20261021`); skeptic launched as `ctx_daac41929990` (`attempt:ttr-shape-skeptic-20261021`). Appetite launch returned `route: blocked`, `reason: launch-failed:unproven`, `attemptKey: attempt:ttr-shape-appetite-20261021`, with action to inspect worker-list before retry. Worker-list showed only the two live Claude workers; absence of an appetite row is not proof of a clean failed launch. No retry or overlap dispatch was performed. Unknown-liveness ownership remains reserved. Owner choice requested per AGENTS.md: fix Orca or explicitly re-invoke with orca=normal.

Setup validator passed all 23 checks before status-index update. Critique remains incomplete; pitch is not bet-ready.

## Cleanup after interruption

Both launched Claude workers submitted their own successful worker_done and wrote their authorized critique files. Both runtime terminals were released with archived output. Skeptic collection returned `invalid-files`: collectReport rejects every `.project` segment, including the review report path authorized in this brief. The original completion payload was preserved, never edited to bypass validation. Historian payload has the same protected-path shape. Deliveries were processed and acknowledged; local ledger settlement remains unresolved and must be recovered explicitly. This is a coordinator brief-placement mistake, not evidence the reviews did not run.

Independent inspection: both critique files exist, source changes are absent, and `git diff --check` passed. The reports remain unsynthesized while critique is stopped.

## Owner-authorized recovery

Owner requested “Fix Orca”. Reused Run `run_d3b6ac5bc706` after checking objective and coordinator. Read the known issue `orca-model-preflight-can-leave-unproven-ledger-ownership` and rechecked installed runtime 1.4.237, OpenCode 2.1.1 and the current runtime source. Model-pin support permits 1.18.30/1.18.32 or 2.0.16; the local model check precedes `createStartingWorkerDispatch`. Current runtime chunk SHA-256: `2b7f9bc63ddfa31b37fd9ed96ed4525448a929953510eebc9768ffa54558ce0e`. Proof excerpts saved locally at `.project/metrics/token-time-report-recovery/preflight-proof.json`. Appetite preflight classified failed, then settled through the ledger API; no duplicate OpenCode worker launched. Remaining review briefs use the already configured Claude alternate and fast model, without changing app binaries or global vendor configuration.

Historian and skeptic were manually recovered through the ledger API from their original, dispatch-matching, successful worker_done messages, inspected report artifacts and runtime release proof. Their actual message IDs were retained as reportId, then attempts settled. This was explicit owner-authorized recovery, not an accepted collectReport result; no payload or protected-path validator was altered. API results are saved locally in `ledger-recovery.json`. New briefs keep review artifacts under local metrics and use reportPath without implementation filesModified, allowing normal collection.

## Critique dispositions prepared

Historian K1–K8 and skeptic S1–S3 are accepted as design constraints: keep missing/refused distinct; never call a writing transaction just to read; pin directory identities across the lease and publication; replace only marked generated filenames with reinspection; Map/null-prototype maps; allowlist and scrub every external label and metadata field in every format; preserve separate overflow buckets and explain independently folded rows; reuse the existing /state link contract. Named injected-race and hostile-key regression cases belong to the plan exits.

Skeptic S3's reference to “6 over cap intervals” concerns wait-gap caps, not pitch folds: the live snapshot had pitchFolds=0. The asymmetric pitch-fold fixture is still required as a boundary case. The report must not imply that live pitch folding was observed.

These constraints add no collector or source-schema scope. Guarded-reader extraction remains the file-budget swing item.

## Final critique dispositions and budget

All four required perspective reports exist. Appetite/overlap completion messages passed normal collection (accepted=true); reports copied from local metrics into this pitch for durable review. Historian/skeptic recovery remains explicitly manual as recorded above. No AI-prompt scope; eval-regression-projector not applicable.

A1–A3 resolved: the pure joiner gets a named module and test. Reuse exported `readText`, `readWorkflowState` and `withMetricsLease` from workflow-metrics-state.mts without changing them; add a report-local, bounded validator for token v3 flow fields instead of exporting or extracting the collector's private readSnapshot. No write transaction is called and collector behavior does not change. Missing/refused remain distinct. This avoids the suggested collector-change exception. Fixtures can be constructed in tests and do not require separate files.

Revised implementation budget, including release files (11 files, estimated 1,296 changed lines):

| File | Estimated changed lines |
|---|---:|
| ai-framework/scripts/flow-report.mts | 210 |
| ai-framework/scripts/flow-report.test.mts | 300 |
| ai-framework/scripts/flow-join.mts | 140 |
| ai-framework/scripts/flow-join.test.mts | 200 |
| ai-framework/scripts/flow-render.mts | 150 |
| ai-framework/scripts/flow-render.test.mts | 200 |
| ai-framework/scripts/state-pages.mts | 5 |
| ai-framework/scripts/state-html.test.mts | 30 |
| ai-framework/integrations/workflow-metrics.md | 50 |
| VERSION | 1 |
| CHANGELOG.md | 10 |

These are planning estimates, not measured implementation. A4–A5: /plan must stop and split if guarded snapshot/join plus renderer/publication cannot fit 1,500 LOC or 15 files. Candidate split: first a JSON join report; then Markdown/HTML and /state linking. No reduced deliverable is silently substituted for this pitch.

X1–X3: no projected direct source overlap with workflow-v3-rollout, which targets receiving repositories. This pitch does not change its base snapshot or ship to those projects; inclusion in any rollout requires that rollout's own base-version review. VERSION/CHANGELOG are selected and serialized at ship against then-current release state. Lease tests use injected dependencies; no live port benchmark or flake repair joins this scope. Importing a module does not itself add that unchanged file to the diff. Old readiness flake observations remain historical, not evidence of a new report regression.

Validation: setup-validator READY, 23 checks passed; git diff --check passed. No implementation source or global vendor configuration changed.

Final cleanup: both recovery workers released with captured archives; both accepted attempts settled through the ledger API; completion delivery acknowledged. Run fleet: four released workers. No live or unknown attempt from this shaping invocation remains. Pitch awaits the owner’s Bet / Re-shape / Pass decision.
