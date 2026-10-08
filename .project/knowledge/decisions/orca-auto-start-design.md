---
id: orca-auto-start-design
type: decision
created: 2026-10-08
updated: 2026-10-08
tags: [orca, orchestration, hooks, stop-and-ask, design]
related: [status-dispatch-ready-false-is-not-launch-authority, a-blocking-hook-owns-its-runner-and-its-deadline, a-probe-child-ran-a-bare-command-with-the-parent-path, a-thin-cli-keeps-every-guard-in-the-library, opt-in-before-runtime-discovery, orca-workers-differ-from-the-coordinator-environment]
source: orca-auto-start-all-phases
---
# Decision: how Orca starts automatically on workflow phases

## Summary
With `AI_WORKFLOW_ORCA_MULTI_AGENT=true`, every phase skill call runs `decideStart` (`orca-start.mts`): switch -> `orca=normal` bypass -> worker identity -> gate. `off` is silent and free; `ready` prints one line; `blocked` stops and asks (hook exit 2, CLI exit 4). No silent fallback. Contract: `ai-framework/integrations/orca-vendors.md` "Automatic start".

## Decision
- **Readiness comes from `evaluateLaunch` with the coordinator vendor** plus worker membership, executable presence, the worker-side `orca` path and a runtime status probe; never from `status.dispatchReady` or `ORCA_AGENT_SESSION_ID` ([[status-dispatch-ready-false-is-not-launch-authority]]).
- **Worker identity**: no environment marker distinguishes a worker (observed: same `ORCA_*` pane variables); use the `--worker-context` flag and a terminal-handle lookup in `orca orchestration worker-list`; if it cannot be verified, block.
- **Bypass** is the whole token `orca=normal` in the raw invocation args, one call, never persisted, only honoured after the switch is true.
- **Claude Code wiring**: `PreToolUse` matcher `Skill` and `UserPromptExpansion`; calls with `agent_id` pass through; the CLI stays thin ([[a-thin-cli-keeps-every-guard-in-the-library]]).
- **Scope cut after critique**: core + Claude hook shipped; the 12-skill start blocks and the Codex/OpenCode/Cursor adapters are separate pitches (about 41 files projected for all of it).
- **Orchestration used to build it**: P0 slot cleanup, S1-S5 and audit cycles 1-2 ran through real Codex and OpenCode workers; workers share the coordinator checkout, so every worker diff was checked and every exit command re-run by the coordinator ([[orca-workers-differ-from-the-coordinator-environment]]).

## Consequences
Pros: switch on means Orca or a clear question, never a silent skip. Cons: only Claude Code is proven; an entry copied without the runner prefix can fail open; every phase call pays one probe (about 0.5 s) when the switch is on.
