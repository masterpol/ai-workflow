# Critique: instruction-compression

**Date:** 2026-10-18. **Coordinator:** Codex. **Orca Run:** `run_fda64cf7e993`.

All five required perspectives completed through Orca and supplied their own successful `worker_done`. The input was the original broad pitch and the initial 20-case dataset. The coordinator verified claims and proposes the bounded revision in `shape-revision.md`; user disposition and Bet remain pending. No prompt implementation or live golden-case execution occurred.

## Findings and proposed dispositions

| ID | Perspective | Severity | Finding / evidence | Proposed disposition |
|----|-------------|----------|--------------------|----------------------|
| K1 | knowledge-historian | high | Canonical edits require same-change Cursor refresh (`rules/canonical-mirror-sync.md`). | Addressed in proposed first-wave file budget; parity remains required. |
| K2 | knowledge-historian | high | Literal-marker checks can accept echoed commands; replacement guards need passing baselines and intended-assertion mutant failures (`issues/substring-hook-wiring-check-accepts-echoed-commands`, `issues/guard-tests-can-fail-for-the-wrong-reason`). | Require replacement owner-loading coverage before deleting assertions; no skipped tests. |
| K3 | knowledge-historian | medium | Raw invocation extraction and optional skill ownership must survive compaction (`issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments`, `decisions/caveman-mode-is-default-everywhere`). | Keep banners intact in first wave; add raw-argument cases. |
| K4 | knowledge-historian | medium | New reference documents must be shipped and discoverable (`patterns/checks-on-doc-structure-name-the-owning-file`). | Use existing owners in first wave; require installed-project loading coverage. |
| K5 | knowledge-historian | medium | Executed, parse-only and live-only evidence must remain separate (`patterns/a-grader-reports-executed-and-unexecuted-cases-separately`). | Every golden case now declares live-only/not-run. Hide expectations from subject; score independently. |
| S1 | skeptic | high | A pointer can silently lose applicability or an owner section (`issues/instruction-copies-drift-into-contradictions`). | Add phase-specific loading and missing-section scenarios; plan mutation checks for missing owners and sections. |
| S2 | skeptic | high | Banner shortening could break tested `--args-text` extraction (`skill-defaults.test.mts:256`). | Defer banner compaction; preserve current banners and checks. |
| S3 | skeptic | medium | No live baseline exists; JSON presence cannot prove before/after behavior. | Baseline is required before compression edits; unavailable vendors stay unverified. |
| A1 | appetite-auditor | high | Full proposal exceeds 15 files / 1,500 LOC: reviewer projected ~40 named-surface files, ~100 with banners/copies, and >2,000 churned lines (estimates). Coordinator counted 44 canonical prompts; the full banner sweep alone involves 88 paths with Cursor copies. | Propose only build/audit/ship pilot: 14 named implementation files, maximum 15. Remaining surfaces need separate pitches and gates. LOC must be estimated in plan. |
| A2 | appetite-auditor | medium | Vendor-eval workload was unbudgeted: initially 160 case-runs per full vendor comparison. | Expanded dataset is 31 cases: 248 minimum case-runs for four vendors × two stages; no calls authorized merely by this estimate. Plan available coverage, runtime and spend before execution. |
| X1 | cross-pitch-projector | medium after verification | `workflow-v3-rollout` syncs this source into other repositories. Its readiness record lists 139/136 real local conflicts in climbing/RN. This is a downstream source-revision risk; the other pitch projects no concurrent edits to these canonical source files here. | Pin rollout input and refresh dry-runs if it changes. No automatic ordering blocker or application edits. Broader agent/rule rewrite deferred. |
| E1 | eval-regression-projector | medium | Initial cases omitted non-security reviewer verification, launch authority, installed-wrapper loading, per-phase owner loading and free-form mode extraction. | Added 11 scenarios covering those categories. Dataset remains unexecuted; additions are design coverage, not passing results. |

## Claims refuted or narrowed by the coordinator

- Historian claimed the Orca owner lacked exit-3 semantics. Refuted: `integrations/orca-vendors.md`, “CLI, grader and live-smoke status,” explicitly says “Exit code 3 alone never authorizes the normal path.” No owner change is justified by that finding.
- Cross-pitch review treated an unexecuted dataset as an unmet Bet hard gate. The shape specification requires a golden case before Bet; behavioral baseline execution is required before editing the compressed instructions. No live equivalence claim is made at this gate.
- Eval reviewer reported 21 initial cases; the coordinator parsed 20 unique IDs. Final dataset has 31. Case counts above use measured values.
- Projected cross-repository delivery conflicts are not proof of simultaneous source-file ownership in this checkout. Preserve that distinction when planning rollout sequencing.

## Orca recovery and completion evidence

| Perspective | Attempt | Dispatch | Outcome / resource decision |
|-------------|---------|----------|-----------------------------|
| knowledge-historian | `shape-20261018-a1` | `ctx_79b51e4eb195` | Own successful report collected; release returned retained / user_takeover; leave terminal untouched. |
| skeptic | `ic-shape-20261018-2-a2` | `ctx_9f67420bfc3a` | Own successful report collected; release returned retained / user_takeover. |
| appetite-auditor | `ic-shape-20261018-3-a1` | `ctx_08c4d4bed7fc` | Own successful report collected; terminal released. |
| cross-pitch-projector | `ic-shape-20261018-4-a1` | `ctx_ab533877db5f` | Own successful report collected; terminal released. |
| eval-regression-projector | `ic-shape-20261018-5-a1` | `ctx_5649833ce8e8` | Own successful report collected; release returned retained / user_takeover. |

The initial skeptic attempt `ic-shape-20261018-2-a1` returned `launch-failed:unproven`. The coordinator stopped and asked; the user chose diagnosis and recovery. A safe diagnostic against an already completed Task reproduced `capability_unsupported`: “This OpenCode TUI cannot verify launch-time model selection.” The runtime validates this refusal before Task creation. No skeptic Task/Dispatch existed for that attempt; local ownership was marked failed on this evidence. Omitting only the model override allowed the new attempt to launch. No policy, global settings or source script changed. OpenCode roles inherited host configuration; the observed terminal footer reported Kimi K2.7 Code. Claude fast roles requested the configured fast model; requested settings alone are not proof of effective settings.

Full briefs, deliveries, diagnostic receipts and transcript tails are under ignored `.project/metrics/instruction-compression/critique/`. Completion deliveries were processed before acknowledgment. Local ledger settlement and final validation are recorded in `validation.md`.
