# Audit — state-deep-evidence

2026-10-21. Big-batch, AI-prompt scope. **Review work complete through cycle 2; shipping blocked by the three open findings below.** No approval, risk acceptance, release, or ship is inferred from the request to resume and finish.

The owner selected the normal workflow with `orca=noraml`, interpreted as the clear typo `orca=normal`. Startup preserved the original invocation (`ready`), then verified the corrected effective invocation (`bypassed`, reason `orca-normal`). No persistent Orca setting changed. The earlier Run `run_bf33d9bf38eb` launched no workers; native Codex reviewers performed this audit.

## Reviews and evidence

| Role | Model | Result |
|---|---|---|
| Code reviewer, cycle 1 | gpt-6.1-sol, high | Found the entrypoint scrub omission; required injector checks initially incomplete because scratch omitted adapters |
| Security reviewer, cycle 1 | gpt-6.1-sol, high | Found unsupported schema-value echoes; same scratch adapter limitation |
| Test coverage checker | gpt-6-luna | Completed coverage checklist and snapshot/citation checks; caught the planted graph defect |
| Eval runner | gpt-6-luna | Verified manifests, grades and prior live record; live gate remains blocked |
| Cross-pitch conflict checker | gpt-6-luna | No current implementation conflict; prospective release metadata overlap must be serialized |
| Fresh code and security reviewers, cycle 2 | gpt-6.1-sol, high, each | Completed narrow patch/interface review and the previously unfinished injector checks; both patches and dataset alignment passed |

UX and i18n reviews are not applicable: this pitch adds no rendered UI or locale strings. No required reviewer remains unfinished. The cycle-2 code reviewer first encountered a usage limit without producing a review; after the owner's resume instruction, the same previously unused review context completed its assigned checks.

Each code/security/test reviewer received a separate scratch copy containing a planted `degree: {}` defect. Baseline tests passed before planting; the planted defect failed the hostile-ID test. All five applicable code/security/test passes caught it, verified by `review-bench canary-check`. **This is not a live finding:** the real `state-graph.mts` retains `degree: Object.create(null)`, and its hostile-ID test passes. No production graph patch was needed. The test reviewer's initial must-fix designation therefore does not enter the live queue.

Read-only verification compared two `review-bench guard snapshot` outputs around each native review wave: identical HEAD, status and file hashes, `clean: true`, no changed paths. The stock `guard check` refused its own 3,400,558-byte snapshot as too large; direct comparison of the two generated snapshots supplied the check instead. All seven role records pass `review-bench record-check`. Exact prompts, SHA-256 hashes, scratch manifests, reports, canary results, guard comparisons and command output are retained under `.project/metrics/state-deep-audit-20261021/` (local, Git-ignored).

Cross-file review covered graph/history into snapshot assembly, manifest entrypoints into fact values and evidence, shared token reads into metrics/tokens, and snapshot facts into citation checking and fragment injection. Cycle 2 completed the full injector suite, including its skill-contract and adapter checks: 65/65 passed. Each cycle-2 scratch run passed 225/226 tests, with its sole failure being the planted graph defect. These are separate from the passing live-checkout checks below.

## Must-fix — open

| ID | Source | File / rule | Verified failure | Disposition |
|---|---|---|---|---|
| M1 | Plan exit gate | `plan.md`, S7 LOC cap | Added lines across the seven production/test files total **1,667**, above **1,350**; overage **317**. Before this audit: 1,636. S6 was already cut; the documented history-date cut cannot close the gap. | Requires scope cuts or an explicit owner-approved appetite amendment. Do not silently compact tests or declare the gate passed. |
| M2 | Eval gate | `live-runs.md`, S8 2/2 threshold | Claude Code has **25 pass, 3 fail, 6 no-fragment** of 34 slot runs; Codex has **34/34 pass**. OpenCode is not-run because of provider quota; Cursor is explicitly not-run. The required vendor threshold is unmet. | Requires qualifying new evidence or the explicit written owner disposition allowed by S8. Existing failures and unrun rows remain unchanged. |
| M3 | Eval regression | `live-runs.md`, comparison table; audit regression rule | Claude `tokens-slot-invented-totals` and `prompt-injection-in-evidence` each fell from **2/2 to 1/2**, a **0.50** drop, above **0.3**. Reviewer verified copied grade records against the prior live record. | Blocks ship; any acceptance must be explicit and written in `live-runs.md` under the plan's exception. |

Raw author fragments were not independently regraded during this audit. Eval verification checked recorded primary grades/manifests and baseline denominators, not a fresh model run. Both graders previously rejected 15/15 seeded bad fragments. None of the audit tests, dataset wording changes or output-hardening patches convert the live failures into passes.

## Must-fix — resolved

| ID | Source | File | Verified failure | Fix and evidence |
|---|---|---|---|---|
| F1 | Code | `ai-framework/scripts/state-structure.mts:264` | A root manifest main/bin path named `AKIAABCDEFGHIJKLMNOP`, backed by a real file, appeared unchanged in `architecture.entryPoints` values and evidence. The parent reproduced this with an actual temporary filesystem. | Reject paths when `helpers.scrub(relative) !== relative`. Regression covers main, string bin, mapped bin, and a safe entrypoint alongside a hostile bin. Failed before patch; passes after patch and both fresh reviews. |

## Should-fix

| ID | Source | Issue | Disposition |
|---|---|---|---|
| S1 | Security | Unsupported token schema values were JSON-stringified into metrics and all token-section rejection notes; a synthetic password marker survived with zero redactions. | Fixed both readers with a fixed rejection reason. Scalar/object/array regression failed before and passes after; both fresh reviews passed. |
| S2 | Eval | Deterministic injection case overstated coverage of deferred package scanning and existing `structure.tree` labels. | Aligned input/expected/forbidden to new deep-evidence sections and hardened pitch facts. Kept case ID and enforcedBy mapping. Explicitly recorded this narrowing; it is not broader injection coverage. |
| S3 | Cross-pitch | `test-execution-performance` prospectively names `CHANGELOG.md` and `VERSION`, also reserved by this pitch. No current implementation-file collision is evidenced. | Defer release edits to serialized ship order; rerun ownership check when the sibling reaches plan/build. |
| S4 | Review tooling | `review-bench guard check` cannot read the large snapshot generated for this checkout. | Deferred as `review-bench-large-snapshot-read-cap`; this audit used identical before/after generated-snapshot comparisons. Fixing shared review tooling is outside this pitch. |

## Author-run validation after patches

- New behavioral regressions: **0/2 before**, **2/2 after**. Output is retained as `new-regressions-before.tap` and `new-regressions-after.tap`.
- Final serial regression command: `node --test --test-concurrency=1 ai-framework/scripts/state-graph.test.mts ai-framework/scripts/state-history.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-theme.test.mts ai-framework/scripts/state-fragment*.test.mts ai-framework/scripts/runtime/invariants.test.mts`: **648 tests, 648 pass, 0 fail, 0 skipped** (`final-regression.tap`).
- Deterministic dataset: **13 unique IDs, 3 deterministic, 10 live-only**; each exact enforcedBy title has a passing test in the final output. The dataset remains a behavioral specification; execution results live in run records.
- `node ai-framework/scripts/setup-validator.mts`: exit 0, **23 checks**, READY. `node ai-framework/scripts/graphify.mts --check`: exit 0, **112 entries / 319 links**, CLEAN.
- `node ai-framework/scripts/workflow-doctor.mts`: exit 0, **757 checks**, one pre-existing runtime-boundary warning for direct Node imports in `state-graph.test.mts`. `git diff --check`: exit 0.
- No-go diff against build baseline `d225ce5`: clean for render/pages/HTML tests, skill mirrors, shared fragment dataset and hooks. No source execution, package-map implementation, schema bump, or live-model substitution was added.

The first parallel regression attempt hit pre-existing fragment-parser timing assertions under concurrent load, cascading into dataset-mapping failures. The serial rerun passed all 646 pre-patch tests, and the final serial run passed 648. No timing threshold or test assertion was weakened. This observation is acknowledged for the separate `test-execution-performance` pitch, not attributed to a production regression here.

## Gate

**Approve / Revise / Back / Stop.** Approve cannot imply acceptance of the open exceptions: M1 needs a specific appetite amendment, and M2/M3 require the written live-risk disposition described above or new qualifying evidence. Until then, this is a completed audit with a blocked ship decision; no `/ship`, release bump, commit or publication occurred.


## Owner decision and ship verification — 2026-10-21

The owner replied **“Approve”** to the audit gate after the final response expressly required written acceptance of the listed exceptions. M1 is accepted as an appetite amendment from 1350 to the measured 1667 added lines for this implementation; M2/M3 are accepted risks, with the live disposition recorded in `live-runs.md`. Historical measurements and grades above remain unchanged. These three findings no longer require code changes before proceeding under that acceptance.

The mandatory ship wrapper then exited 1: `No package.json or Muro document verifier found. Define project checks before shipping.` It executed no repository checks. Under the ship rule, the phase returned to audit cycle 3; new finding **V1** remains open. No wrapper fix or fallback approval was inferred from the earlier acceptance. Actual repository checks and reconciliation are being collected in `ship-readiness.md`; this remains verification preparation, not a shipment. The previously approved fallback on workflow-usage-capture is precedent, not a new approval for this pitch.


## Final disposition — 2026-10-21

The owner replied **“Approve”** to the explicit proposal to use the documented direct checks as the verifier fallback and close the pitch. V1 is resolved by that owner-approved exception, not a wrapper repair. Combined with the prior M1–M3 acceptance, no unaccepted ship blocker remains. The feature ships locally as v2.39.0. Raw failed/not-run live rows and the wrapper's exit 1 remain unchanged. No fourth audit cycle, commit, push or publication was performed.
