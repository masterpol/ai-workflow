---
id: an-interactive-shell-prompt-can-consume-an-agent-launch-command
type: issue
created: 2026-10-20
updated: 2026-10-20
tags: [orca, workers, shell, launch, readiness]
related: [orca-workers-differ-from-the-coordinator-environment, status-dispatch-ready-false-is-not-launch-authority, retry-only-on-positive-proof-of-a-clean-failure]
source: state-fragment-sanitizer
severity: medium
resolved: true
confidence: medium
---

# Issue: an interactive shell prompt can consume an agent launch command

## Summary

Two Orca worker dispatches failed with `launch-failed:agent_readiness` because the worker's
interactive shell displayed a package-manager update question ("Oh My Zsh update") and swallowed
the launch command that was typed after it. The launch never reached the agent.

## Symptoms

- `dispatch` exited 3 with `launch-failed:agent_readiness`, and the route was blocked.
- The exact worker terminal showed the update question followed by a malformed launch command.
- The blocker was repeatable: a fresh terminal reproduced it, so it was not a stale resource.

## Root cause

The launch writes its command into an interactive shell session. Anything the shell itself
prompts for (a profile update, a first-run wizard, a passphrase) consumes the input line. The
launch then reports a generic readiness failure, which points at the agent rather than at the
shell that ate the command.

## Solution

The owner explicitly chose `orca=normal` for that invocation; the coordinator implemented the
scope directly and no shell configuration was edited. Both failed attempts were released and
marked failed only after positive exited-and-settled evidence.

## Prevention

- Before a controlled retry, run a shell preflight in the worker's shell and confirm it reaches
  a prompt with no pending question; close that shell cleanly afterwards.
- When a dispatch fails at `agent_readiness`, read the worker terminal before blaming the
  agent — the same class of "the coordinator's view is not the worker's view"
  ([[orca-workers-differ-from-the-coordinator-environment]]).
- Do not retry blindly: the update prompt is repeatable, so a new terminal does not fix it.
  Either suppress the prompt or take the explicit `orca=normal` route.
- A diagnostic readiness lookup that fails without creating a terminal is not a refusal
  ([[status-dispatch-ready-false-is-not-launch-authority]]).
