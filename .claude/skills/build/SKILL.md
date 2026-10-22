---
name: build
description: Execute a planned pitch scope by scope. Hill-tracked progress, parallel dispatch where flagged in plan.md, evidence-required completion before marking done. Bug-fix and hotfix workflows enter here directly (skip /shape + /plan).
---

# Build

> **Recommended capability profile:** `standard` — select the available model through `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase build --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.

## Execute

After approved `/plan`, or for a direct bug-fix/hotfix, execute the owning phase playbook:

- Before the first scope, read `ai-framework/workflow/phases/2-build.md`: **Per-scope inner loop**, **Verification-before-completion (hard rule)**, **Three-strike rule (in-session thrash guard)**, **Parallel subagents**, **Adaptive gate**, **Stuck-uphill detector (built-in warning)**, and **log.md and deviations.md discipline**. Load applicable `.project/rules/*.md` companions with their generic rules. These own context loading, standalone `/shape-lite` cards, evidence, hill updates and escalation. Read **Inline UX 5-question check (UI scopes only)** or **Bug-fix variant** when applicable.
- Before gate decisions, read **Adaptive confirmation gate** in `ai-framework/workflow/overview.md`, rows `/build start`, `/build per scope`, `/build end`. Before completing build, read the phase owner's **Output**, **Confirmation gate** and **Transition** sections; use their evidence and approval requirements.

<!-- orca-multi-agent:begin -->
## Optional Orca coordination

Coordinators run `node ai-framework/scripts/orca-run.mts start --root . --phase build --vendor <current-vendor> --args-text "$ARGUMENTS"` before phase work, passing the original invocation arguments unchanged and the actual harness vendor (Codex: `codex`; the CLI defaults to Claude). A dispatched worker follows its live brief instead of coordinating.

`off` uses normal workflow; `bypassed` permits it only for this invocation's explicit `orca=normal`. `ready` permits preparation, not dispatch. On `blocked`, an error or refused command, stop and ask: report the exact reason and ask whether to fix it or re-invoke with `orca=normal`. Never fall back to the normal single-agent path above silently while Orca is requested; exit 3 alone is not permission.

When Orca is enabled, before coordination read **Optional Orca coordination** in the build phase owner and **Automatic start (every workflow phase)** plus **CLI, grader and live-smoke status** in `ai-framework/integrations/orca-vendors.md`. Before dispatch/collection read **Dispatch core (opt-in, library only)** there; before reconciliation read **Reconcile core (opt-in, library only)**. For an already-refused command, read the CLI refusal contract and stop; defer Dispatch/Reconcile implementation details until an operation is actually about to run. Codex also reads **Codex startup and coordinator preparation** before dispatch; before the first OpenCode worker read **OpenCode port before the first OpenCode worker**. Follow the owners' Run binding, assignment, liveness, completion, independent verification and cleanup contracts. Do not load integration details when Orca is off.
<!-- orca-multi-agent:end -->
