---
id: opencode-agent-id-comes-from-the-installed-agent-list
type: decision
status: accepted
created: 2026-11-23
updated: 2026-11-23
tags: [orca, opencode, agent-id, dispatch, gate, fail-closed]
related: [retry-only-on-positive-proof-of-a-clean-failure, a-gate-spawns-exactly-what-it-probed, orca-model-preflight-can-leave-unproven-ledger-ownership, orca-workers-differ-from-the-coordinator-environment, capture-the-real-receipt-before-designing-recovery]
alternatives: [default-to-opencode2-and-fall-back-on-proof, guess-the-id-from-the-installed-opencode-major-version]
applies-to: [orca-policy, orca-launch-gate, orca-dispatch]
source: orca-api-currency-and-opencode2
---

# Decision: the OpenCode `--agent` id is read from the host's installed agents, never guessed from a version

## Summary

`orca agent installed --json` lists the ids a host can launch. The OpenCode worker's id is `opencode2` only when that id is listed, else `opencode`, else a named refusal. The vendor stays `opencode` in policy, config and ledger; the id is a launch argument only. The gate re-reads the list immediately before the spawn and checks the exact id it will pass. There is no fallback loop.

## Context

The pitch started from "OpenCode 2 should be the default, so use `opencode2`". A real launch (2026-11-23, Orca 1.4.271, OpenCode 2.2.6) with `--agent opencode2` failed at `agent_readiness` with `zsh: command not found: opencode2`: the id is an alias for a command of that name, and the OpenCode 2.2.6 binary on this host is `opencode`. `orca agent installed` listed `claude`, `claude-agent-teams`, `codex` and `opencode`. A second launch with `--agent opencode` reached `state: ready`, and the worker completed and reported.

## Why not the alternatives

- **Default to `opencode2`, fall back to `opencode` on proof.** The failed `opencode2` start carried a failed stage and a non-empty `residualResources`, which is unproven by the retry rule, so the fallback could never fire; it would only have left a terminal behind.
- **Guess from the installed major version.** The version says nothing about which alias exists; the list says it directly.

## Consequences

- An unreadable or malformed list refuses the launch (`installed-agents-unavailable`); a hostile list entry is ignored, never launched.
- `AI_WORKFLOW_ORCA_OPENCODE_AGENT` may name `opencode` or `opencode2` but the id must also be installed.
- Evidence and raw observations: `.project/analysis/2026-11-23-orca-live-receipts-s3.md`. Contract text: `ai-framework/integrations/orca-vendors.md`.
