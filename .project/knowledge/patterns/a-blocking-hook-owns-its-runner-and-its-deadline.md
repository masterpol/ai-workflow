---
id: a-blocking-hook-owns-its-runner-and-its-deadline
type: pattern
created: 2026-10-08
updated: 2026-10-08
tags: [hooks, claude-code, fail-closed, runner, timeout]
related: [one-boundary-selects-the-child-runner, async-agent-launch-hook-counted-as-completion, a-gate-must-not-trust-its-own-author, a-local-workflow-env-file-changes-which-runner-path-tests-spawn]
source: orca-auto-start-all-phases
---
# Pattern: a hook that must block owns its deadline and its runner

## Summary
A `PreToolUse` hook protects a gate only if every failure path ends in exit 2. Two paths ended elsewhere: a timed-out `PreToolUse` command hook lets the tool call continue, and a script that re-execs the configured runner before `main` exits 1 (non-blocking) when that runner is missing. Both let a phase start with no readiness check while the user had asked for one.

## The Pattern
- The script enforces its own deadline below the host timeout (5 s script, 8 s hook, 4 s decision budget) and exits 2 itself, including after synchronous probes that cannot yield to a timer.
- The hook command forces the runner: `AI_WORKFLOW_RUNNER=node node ...`, so a missing optional runner cannot prevent the script from deciding. Test the exact command string from the settings file under `sh`, with the switch on (exit 2) and off (exit 0, silent).
- Off path first: read the switch, return before any policy read, PATH lookup or spawn; import the decision library lazily after the switch is true.
- Capture real payloads before wiring: typed `/commands` fire `UserPromptExpansion` (`command_name`, `command_args`), not `PreToolUse(Skill)`; a subagent's call carries `agent_id`.
- Known residual: the prefix is POSIX shell syntax; an entry copied without it fails open on a missing runner (followup: fail-closed exit code in `runDirect`).
