# Plan: instruction-compression — phase-wrapper pilot

**Pitch:** [approved bounded bet](shape-revision.md). **Appetite:** big-batch. **Hill:** [hill.md](hill.md).
**State:** approved by the user on 2026-10-18; [impact.md](impact.md) acknowledged. Build start, S1 evidence and the bounded remaining-scope amendment are approved. S2 is accepted. The bounded deferral/repair revision in s3-review.md is approved and applied. S3 is deferred; R1 and the revised build are verified, awaiting completion/build-end approval in build-completion.md.

The user approved the bounded Bet on 2026-10-18. This plan covers build/audit/ship wrappers only. It preserves all decisions, permission boundaries, evidence and existing gates. Agents, rules, planner redesign, banner compaction and runtime changes remain outside scope.

## Scopes

| ID | Name | Files | Changed-line estimate | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|-----------------------|------------|---------------|-----------|----------------|
| S1 | Build wrapper and reusable proof | `.claude/skills/build/SKILL.md`, `.cursor/skills/build/SKILL.md`, `ai-framework/workflow/phases/2-build.md`, `ai-framework/scripts/workflow-contracts.test.mts`, new `ai-framework/scripts/instruction-loading.test.mts`; optional `ai-framework/integrations/orca-vendors.md`; shared dataset/version files below | 480 new churn, plus 478 existing golden-fixture lines counted once | — | — | yes: bounded build domain and checkable proof; one writer at a time because tests are shared | standard: owner-transfer, negative-fixture and evidence-validation design require reasoning |
| S2 | Audit wrapper | `.claude/skills/audit/SKILL.md`, `.cursor/skills/audit/SKILL.md`, `ai-framework/workflow/phases/3-audit.md`, both contract test files; shared version files | 240 | S1 proof infrastructure accepted | — | yes: complete audit slice, explicit clause inventory and exits; no concurrent writer | standard: reviewer completion and cycle-limit semantics require careful reconciliation |
| S3 | Ship wrapper | `.claude/skills/ship/SKILL.md`, `.cursor/skills/ship/SKILL.md`, `ai-framework/workflow/phases/4-ship.md`, both contract test files; shared version files | 180 | S1; execute after S2 to serialize shared tests | — | yes: mechanical extraction once the inventory is settled; no concurrent writer | fast; escalate to standard only if an unmapped obligation is demonstrated |

Each scope is independently deliverable after its predecessors: converted and original wrappers must coexist without weakened checks. S1 does not require S2/S3 conversions; S2 does not require S3. Do not split a wrapper, its owner transfer, Cursor copy and replacement assertions across different scope completions.

### Cumulative implementation boundary and size

Fourteen paths: six wrappers; three phase specifications; the two test files above; `.project/evals/datasets/instruction-compression.json`; `VERSION`; `CHANGELOG.md`. The existing Orca integration owner is the only optional fifteenth path, used only if S1 finds an actual missing obligation. Do not edit native adapters, overview, caveman banners, `skill-defaults.test.mts`, workflow doctor, runtime helpers, bundle-sync or package/config files.

Count added **and deleted** lines, including Cursor copies and the 478-line dataset already authored during shape: 480 + 240 + 180 + 478 = **1,378 estimated**, against the 1,500 cap. This leaves 122 lines, including any optional owner edit. Version entries are included in the scope estimates. Record planning artifacts and ignored measurements separately; do not exclude the dataset merely because it is local to this instance. Measure actual cumulative churn against the pre-shape HEAD plus current file hashes; before exceeding the cap, split/defer a phase through the existing scope gate instead of weakening proof. Do not reformat the fixture to conceal scope growth.

## Impact and clause mapping

[impact.md](impact.md) contains downstream consumers, exact assertion locations, ownership/load points, installed-project boundaries and knowledge alerts. Main conclusions: HIGH behavioral risk; shared tests require sequential writes; owner/pointer checks must replace copied-location assertions; the golden dataset is not distributed by bundle-sync.

Before shortening a wrapper, map every removed obligation to an existing owner section. Each pointer must specify **when** to read **which section**, not merely a path. Move unmatched obligations into that phase owner before deleting copies. Keep mode banners byte-identical. Read the overview's applicable gate rows before gate decisions. Keep short invocation/startup guidance available before any phase work; load detailed Orca dispatch/reconcile sections only when that invocation uses them. No unconditional Orca manual load in the off path.

## Exit criteria per scope

All commands below are implementation exits, not claims that new checks already exist. S1 creates the one new test file before its commands can run. A missing prerequisite, report or required check fails; it is never converted to a skip. Structural tests do not count as live behavior.

### Shared structural commands — after each changed scope

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/workflow-contracts.test.mts ai-framework/scripts/instruction-loading.test.mts ai-framework/scripts/skill-defaults.test.mts ai-framework/scripts/skill-vendors.test.mts ai-framework/scripts/docs-links.test.mts
bun test ai-framework/scripts/workflow-contracts.test.mts ai-framework/scripts/instruction-loading.test.mts
node ai-framework/scripts/workflow-doctor.mts
node ai-framework/scripts/setup-validator.mts
git diff --check
```

Every command exits 0. Node and Bun are installed; the project has no application build/typecheck/lint/i18n command. Those app checks are inapplicable because the changed surface is workflow prose/tests, not UI or a service. Content, links, parity, script parsing and native behavior remain required. Setup validator already invokes workflow doctor; collect each required result once when it can serve both commands' evidence rather than running duplicate diagnostics without cause.

New owner-loading tests must verify byte-copy **presence and equality**, named owner files and sections, applicable gate rows, retained invocation mechanics, bounded reads and loading in a disposable installed layout with **no `.project/evals`, registry or external skill packages**. Use existing runtime test helpers and typed `unknown` validation; no production helper, new dependency or unchecked `any`.

The default Node/Bun suite must not depend on this checkout's local eval records. An explicit live-evidence mode, described below, fails closed on missing input. Prove that negative behavior in a child process; never count a command with zero matching tests as coverage.

### S1 — Build and shared proof

1. First, use tests-only work and disposable snapshots to complete the baseline/observability spike below. Do not edit any prompt or owner until a real baseline has been captured for each currently executable vendor target. Preserve baseline file hashes and outputs. Stop for a scoped revision if native activation or observation cannot be demonstrated; do not call a manually loaded role pass native activation.
2. Create replacement coverage, then thin build and transfer any unique clauses. Preserve standalone lite-card handling, current-session evidence, hill/log discipline, three strikes, all appetite gate rows, off/bypass/refusal semantics and worker ownership. Audit and ship retain their original valid form.
3. Shared structural commands pass. `workflow-contracts.test.mts` still exercises all 14 existing contracts. Replace A's minimum-block-count premise with an explicit six-consumer/owner contract; no filtered-away missing consumer. E/M checks may follow build's validated pointer while checking substantive owner requirements. Preserve all prior conflict/mutant proofs.
4. In the new test, remove the build pointer, remove its owner/section, omit its Cursor copy, restore forbidden exit-3 fallback and remove lite-card handling in separate in-memory or disposable-fixture mutations. Every mutation must fail the intended assertion; the identical unmodified layout passes. Test both legacy and compressed forms during rollout without a permissive fallback to empty text.
5. Run all 31 golden cases through supported native targets; the build owner-loading scenario must include observed reads and decision timing. Independently score every expected/forbidden criterion and require all observed criteria to pass, with no drop greater than 0.3 from baseline. The live-evidence command exits 0:

```sh
IC_EVAL_REQUIRED=1 IC_PHASE=build IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/build-candidate.json node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/instruction-loading.test.mts
```

6. The build wrapper has fewer words than its measured 1,314-word baseline. Record loaded words, actual tool calls and elapsed time for paired routine/off and enabled scenarios. Do not claim task-context savings from the wrapper count alone. Record the structural change through `changelog.mts`, then `node ai-framework/scripts/changelog.mts --check` exits 0.

### S2 — Audit

1. Transfer/inventory the fan-out triggers and profiles, finding/evidence requirements, verification before triage, reviewer contract/read-only guard, incomplete reviews, synthesis/tiers, cycle cap, AI and cross-pitch triggers. Preserve their applicability; an unfinished required review keeps audit open regardless of finding count.
2. Thin audit, copy the Cursor file in the same change and extend the shared owner-loading tests. Replace I/L's local-section assumptions only after non-vacuous pointer/owner replacements exist. A still checks all six consumers; unrelated contracts remain intact.
3. Shared structural commands pass. Prove intended failures for omitted “Incomplete reviews” loading, missing review evidence, weakened cycle cap and absent/mismatched Cursor copies. The unmodified installed fixture passes without local eval data.
4. Run all 31 cases and independent scoring against the frozen baseline, including `owner-loading-audit`, security clean/incomplete and `audit-incomplete-review`. All observed criteria pass, with no criterion regression >0.3:

```sh
IC_EVAL_REQUIRED=1 IC_PHASE=audit IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/audit-candidate.json node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/instruction-loading.test.mts
```

5. Audit wrapper word count is below 941; report paired actual context/calls/latency. Record version history through the existing script; changelog check exits 0. Recheck cumulative file and churn limits before scope approval.

### S3 — Ship

1. Preserve actual-command final verification, failed-check return under the appetite's audit cycle cap, reconciliation, no-gos/followups, linked knowledge entries/rebuild, compacted status and human closure. Inventory wrapper-only `id`/tags/related-link detail before deletion. Native confirmation mechanics keep their current semantics.
2. Thin ship and refresh Cursor; extend structural and mutation coverage. Contract N may follow a validated pointer to the actual failure-routing owner; no local-section assertion is removed without replacement. Shared structural commands pass.
3. Mutations removing final verification, allowing ship after a failed check, removing the cycle cap or breaking ship-owner loading must fail for the intended reason. Installed-fixture checks still pass. Complete all 31 golden cases, including `owner-loading-ship`, with independent scoring and the same pass/regression thresholds:

```sh
IC_EVAL_REQUIRED=1 IC_PHASE=ship IC_EVAL_BASELINE=.project/evals/runs/instruction-compression/baseline.json IC_EVAL_REPORT=.project/evals/runs/instruction-compression/ship-candidate.json node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/instruction-loading.test.mts
```

4. Ship wrapper words are below 635; report paired actual context/calls/latency and final cumulative size. Do not declare the context-reduction objective achieved if routine loaded context did not fall; revise the arrangement or report the unmet objective at the scope gate.
5. Record the final structural version entry and run the complete Node suite, including nested runtime and hook tests, once at wave end (and once as the pre-edit baseline). Run from the project root:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/*.test.mts ai-framework/scripts/runtime/*.test.mts ai-framework/hooks/scripts/*.test.mts
node ai-framework/scripts/changelog.mts --check
node ai-framework/scripts/graphify.mts --check
git diff --check
```

All required checks exit 0. A baseline failure is recorded and resolved or separately scoped through the existing gate; no newly skipped assertion or unrelated baseline failure is described as a clean run. Do not repeat the full suite per scope unless a new failure or concern requires it. The final pre-ship hook remains a `/ship` activity, not a substitute for these exits.

## Native behavior, baseline and evidence contract

### S1 spike before prompt changes

1. Pin HEAD **and dirty-file bytes**, dataset SHA-256, criteria, actual model/effort and vendor-native entry. Current planning HEAD is `7b3bbad86b399c454004ec9b4f8bd93e5cf21b5d`; it alone is not the baseline because the fixture/records are uncommitted. Save snapshot manifests and model/tool observations under the pitch's run evidence. Baseline case inputs are exposed to the subject; expected/forbidden scoring stays with the observer.
2. Prove one phase-loading case per target before multiplying into 31 cases. Observe actual file/section reads before the first dependent decision, actions, guarded scratch-tree hashes, timing and call counts. Exercise state changes through controlled observations in a disposable project, never by executing real destructive/reconcile failures. Native adapters must actually invoke their phase; a worker merely reading a role prompt proves nothing about native phase activation.
3. CLI discovery found Claude, Codex and OpenCode; Cursor CLI was absent. Binary presence does not prove isolated native invocation or tracing. Claude/OpenCode have configured Orca worker routes. Fresh Codex-native observation and Cursor activation need separate proof; do not bypass the configured worker policy to obtain them. Record each vendor as executed/pass, executed/fail, unavailable or unverified with its exact reason. Required available targets cannot be skipped. Unavailable targets never count as passes and remain visible at the audit/ship gates.
4. Use the existing Orca contract for launches and completion. The shaping Run belongs to this same pitch/coordinator, but re-inspect `run-current` and objective before any new dispatch. No dispatch occurred during planning. Do not reuse completed lifecycle IDs. The prior OpenCode override is known to be refused; inherit its configured model and report the observed effective model instead of claiming the requested standard profile was honored.
5. Timebox the initial observability experiment to one bounded build session. If no real supported target can be observed, or a baseline reveals instruction-conflict behavior, stop the affected implementation and report the concrete missing capability/failure. Do not broaden this pilot into a native runner or instrumentation rewrite.

### Result records and machine validation

Use `.project/evals/runs/instruction-compression/baseline.json` and the three candidate files above. Keep transcripts/traces in that run directory or explicitly rooted ignored run evidence. Every record includes: stage/scope, dataset and source hashes, vendor/native entry, actual model/settings, case ID/input hash, status, observed owner reads/actions with evidence references, guard hashes, per-criterion score (0/1), independent scorer identity and rationale, calls and elapsed time. Match criterion IDs to every `expected` and `forbidden` entry; missing/extra scores, stale hashes, absent evidence, unknown statuses and reported passes for unexecuted rows fail validation.

Implement this bounded evidence checker **inside the new test file**, only in explicit `IC_EVAL_REQUIRED=1` mode. Default installed tests remain structural and fixture-based; they do not silently manufacture a live report or call vendors. The explicit command requires the real dataset, baseline/candidate files and referenced evidence. Reject missing, oversized, symlinked/nonregular or escaping paths. Tests prove failure for a deleted row, manufactured pass with no evidence, changed dataset hash and missing reports, plus a passing fixture with genuine declared observations. No new production grader or validator module is in scope.

The checker validates evidence completeness/integrity and thresholds; an independent reviewer scores the actual observed behavior. Passing JSON validation alone is never described as behavioral equivalence. Reviewers inspect the referenced trace/guard evidence before accepting scores. Normal test passes and live case totals are reported separately.

Run all 31 cases at baseline and after each completed scope, comparing to the same frozen wave baseline. For V executable vendors that is `31 × V × 4` case-runs: 248 for two, 372 for three, 496 for four; a subject/observer may batch cases, so case-runs are not assumed to equal tool/API calls. Record actual usage and time from the spike to forecast the remainder. These are workload estimates, not prices or a spend guarantee. Retain the baseline artifacts; do not mutate old run records. A changed dataset/rubric requires a new matching baseline.

## Risks inherited from shaping

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Real native invocation/trace coverage is unproven; structural checks cannot establish behavior | S1, then all | yes, first | One-case native observation before edits/full run; retain unsupported vendors as unverified; stop if no valid target or missing required coverage |
| Required baseline checks fail before compression | S1 | yes, baseline run | Record exact failure; preserve required checks and use existing gate to resolve/split; no deletion, skip or false green |
| Pointer misses section/applicability or drops a unique clause | all | no | Clause ledger in impact plus non-vacuous owner/consumer checks and intended-assertion mutants before removing duplicate text |
| Literal validators bind to old wrapper locations | all | no | Preserve 14 contracts; replace only duplicated-location premises, retain prior mutants; caveman banner/validator unchanged |
| Cursor refresh command creates missing copies but does not overwrite differing copies | all | no | Explicit `cp` for each edited canonical wrapper; require presence and byte parity in same scope |
| Installed projects lack local eval fixtures and third-party skills | S1 | no | Default tests use disposable fixtures without those paths; live mode explicitly requires local inputs; existing bundle-sync allowlists suffice |
| File/churn allowance is tight after counting golden data | all | no | 14 paths / 1,378-line estimate; optional fifteenth path fits 122-line reserve or is split; count deletions and mirrors |
| Top-level test glob omits runtime/hooks | S1/S3 | no | Exact full command above covers all three test directories, baseline and wave end |
| Rollout consumes a moving source revision | all | no | Pin rollout source; regenerate its dry-run if it changes; do not sync or edit application projects here |
| Shared test ownership creates writer overlap | all | no | Sequential scopes; per-scope authorized paths; coordinator reruns exits, no parallel writers or worktree merge claims |
| Savings are inferred from disk duplication | all | no | Report repository words separately from actual loaded context, calls, latency and behavior; no percentage claim |

## Parallel dispatch plan

1. S1 runs alone. A standard-profile worker may own the implementation slice after baseline is established; the coordinator owns live-run setup, scoring/review routing and evidence acceptance. Tests-only baseline work precedes prompt edits. Preserve current user edits and the known retained shaping terminals.
2. After S1's evidence and big-batch scope approval, run S2 alone. After its approval, run S3 alone. The shared test files are the explicit reason no scopes are parallel-safe; harness nested-dispatch support does not remove file overlap.
3. When a scope is dispatched through Orca, use coordinator `codex`, its configured alternate worker and the scope's own profile from current local configuration; never silently substitute an ordinary subagent. Workers are not alone in this checkout, must not revert others' edits and must not coordinate nested phases or workers. Use exact path ownership and fresh attempt IDs; collect only that attempt's own `worker_done`.
4. Main thread inspects actual edits, independently reruns scope exits, refreshes hill evidence and applies normal gates. Release/retain only with authoritative settlement and settle the local ledger. No commit, merge or publication is implied by this plan.

## Wireframes

Not applicable: no UI surface. This is an instruction/verification change, so application wireframes and builds would not validate it.

## Living-spec deviations log

None at plan time. During build, append any changed assumption, actual file/churn estimate, missing capability or owner-clause discovery to `deviations.md`. A relaxed gate, permission or evidence obligation is not a routine deviation and is outside the approved no-semantics-change bet.

## Confirmation gate

**Approve / Revise / Back / Stop.** Approval acknowledges `impact.md` and finalizes this draft plan. Big-batch `/build start`, per-scope and end gates still apply; this document does not auto-start implementation. All hill rows remain `uphill 0%` until build begins.


## Plan approval recorded — 2026-10-18

The user replied “Appove” to the plan/impact gate. Recorded as approval and impact acknowledgment. The draft is finalized without changing scopes, limits or exit criteria. Build preparation is in [build-start.md](build-start.md); no implementation or worker dispatch has begun.


## Approved S1 evaluation amendment — 2026-10-18

The user approved [baseline-review.md](baseline-review.md), including its six-point bounded S1 revision and explicit acceptance of listed pre-existing baseline omissions. That amendment governs S1 evaluation where it differs from the original contract above. Keep all 31 frozen criteria, independently scored without new failures or lost verified criteria; Claude native build loading is required, OpenCode decision coverage is diagnostic with limitations, and fresh matched loading runs precede edits. S2/S3 await the S1 evidence gate. File/churn limits and all workflow rules remain in force.


## S1 accepted; remaining scopes prepared — 2026-10-18

The user approved S1 evidence. A scratch-only S2 patch and measured budget are prepared in [remaining-scopes.md](remaining-scopes.md). It proposes, but does not apply, an explicit extension of the S1-only evidence disposition. The live audit/ship wrappers and shared test bytes remain unchanged during this preparation. Native S2 responses completed, but provider tracing is unavailable (`session_not_reported`); required native observation is not claimed.


## Remaining-scope amendment approved — 2026-10-18

The user approved [remaining-scopes.md](remaining-scopes.md): the frozen known-failure disposition extends explicitly to S2/S3, with no new criterion failures or loss of verified scores. Native loading remains required before each prompt edit. The six-point amendment, supported checker selector and bounded trace recovery govern remaining evaluation; all original workflow rules, budget and later gates remain.


## Approved bounded deferral and fixture repair — 2026-10-18

The user approved s3-review.md's recommended revision. Current delivery contains accepted S1 build and S2 audit compression. S3 is removed from the active delivery and explicitly deferred with its rejected observations preserved. Restore its four source/test files to their pre-S3 bytes after verifying preconditions; do not waive its failed criteria or claim ship compression passed.

R1 is the approved six-line repair in ai-framework/scripts/runtime/upgrade.test.mts, the sole added named path. It models SETUP.md's required post-sync merge of project-owned ignore rules. No production runtime, doctor or reviewer change is allowed. The 1,500-line cap remains. Verify actual upgrade tests and the complete Node suite, the shared structural commands, accepted S2 required evidence on Node/Bun, setup/doctor/changelog/graph/diff checks and exact source hashes. Existing three behavioral upgrade tests cover the repaired setup; no redundant test is added. Present R1 completion evidence together with the build-end roll-up at the next gate; approval of both is explicit before /audit. Actual audit/ship and commit/publication are not authorized by this amendment.

## Audit revision — proof cohesion and guard regressions (2026-10-18)

Build end and R1 completion are approved; actual audit is in progress. S3 remains deferred. The audit adds four test lines within the existing instruction-loading.test.mts ownership: the evaluated-model/scorer collision case and secret-name refusal cases. No instruction, runtime or score policy changes.

The test-only instruction-loading.test.mts file and its validateReport function use the cohesive-unit exception in coding-standards.md. Their shared dataset, report/context model, pinned policy vector, recursive baseline validation and adversarial fixture matrix form one proof surface. All guards return one accumulated problem list with criterion counts; splitting the validator would distribute the same context and error ledger across helpers without an independent runtime consumer. Moving it into a production module would add an unplanned surface and import/export contract; splitting fixtures into another file would widen the bounded proof's file set and require exposing private validation internals. Keep the validator and its direct positive/negative assertions together. This names the exception for the new test file and function only; it is not a general size waiver. The same rationale is recorded in deviations.md.

The same named exception covers the existing workflow-contracts.test.mts file as extended by this pitch: its 14 cross-file contracts share one trusted bundle root, string readers and in-memory mutation trees. They verify the owner/pointer system as a single corpus. Splitting by contract would duplicate the trusted root/readers or introduce a new helper outside the approved files without separating a runtime responsibility. This is a test-corpus exception, not permission to grow production utilities past their limits.
