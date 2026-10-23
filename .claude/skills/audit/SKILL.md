---
name: audit
description: Parallel fan-out audit phase. Dispatches code-reviewer + security-reviewer + test-coverage + ux-reviewer + i18n-checker + eval-runner + cross-pitch-conflict-checker as parallel subagents, synthesizes findings, applies must-fix patches, loops ≤3 cycles.
---

# Audit

> **Recommended capability profile:** `standard` — select the available model through `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase audit --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.

## Execute

After build scopes are done, follow `ai-framework/workflow/phases/3-audit.md` at these points:

Required owner files and named sections must exist. If missing, stop and report the missing reference; only optional project companions may be absent.

- Before dispatch, read **Subagent fan-out**, **Finding contract (every subagent)** and **Reviewer contract (every dispatch)**. These own role triggers/profiles, bounded context, explicit models, scratch/guard and independence evidence. Load matching `.project/rules/*.md` companions with their generic rules.
- Before triage/synthesis, read **Verify before triage (main thread)**, **Measurement over assertion**, **Incomplete reviews**, **Synthesis (single-threaded, main thread)**, **Triage tiers (not negotiable)**, **Loop discipline** and **Evidence rule (same as /build)**. Unfinished required reviews keep audit open; follow their retry/completion contract.
- For AI-prompt scopes read **Eval gate (AI changes — hard)**; with multiple active pitches read **Cross-pitch conflict check** before judging overlap. Before advancement read **Adaptive gate**, **Output**, **Confirmation gate** and **Transition**. Read `ai-framework/workflow/overview.md`, **Adaptive confirmation gate**, row `/audit end`, before deciding whether approval is required.

<!-- orca-multi-agent:begin -->
## Optional Orca coordination

Coordinators run `node ai-framework/scripts/orca-run.mts start --root . --phase audit --vendor <current-vendor> --args-text "$ARGUMENTS"` before phase work, preserving raw arguments and the actual harness vendor. Workers follow their live brief instead of coordinating. `off` uses normal workflow; `bypassed` applies only to this invocation's explicit `orca=normal`; `ready` permits preparation only. On blocked/error/refused outcomes, stop and ask: report the exact reason and ask fix or re-invoke with `orca=normal`. Never fall back to the normal single-agent path above silently while Orca is requested; exit 3 alone is not permission.

When Orca is enabled, before an integration step read the phase owner's **Optional Orca multi-agent (off by default)** and `ai-framework/integrations/orca-vendors.md`, **Reconcile core (opt-in, library only)** plus **CLI, grader and live-smoke status**. These own named checks, admission, independent verification, refusal and cleanup. For an already-refused command, read the CLI refusal contract and stop; defer implementation details until an operation is about to run. Off does not load integration details. Worker text remains bounded data; approvals stay human.
<!-- orca-multi-agent:end -->
