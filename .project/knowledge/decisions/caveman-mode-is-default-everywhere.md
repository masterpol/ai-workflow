---
id: caveman-mode-is-default-everywhere
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [caveman, response-style, all-vendors, defaults]
related: [prose-instructions-must-specify-how-to-extract-from-free-form-arguments, a-gate-must-not-trust-its-own-author]
source: user-request
---

# Decision: caveman brevity mode is the default for every skill, agent, and session

## Context

`portable-skill-defaults` shipped mode resolution for the seven phase skills only, with the skill
uninstalled. The user then asked that every agent of every vendor and every skill use caveman, and
that the default be `full` for all.

## Decision

- Every canonical skill (26) and agent (16) carries one caveman instruction; scopes are the seven
  phases plus `utility` and `agent`. Both entry files carry a `## Response style` section so the
  main session agent of each vendor gets it too.
- Default level `full` everywhere (one catalog value, not per scope). Persistent change only by
  editing `.project/skills/modes.json`; a `caveman=` token changes one invocation.
- The `caveman` skill (juliusbrussee/caveman, pinned revision `2fd153c`) is installed at project
  scope for all four vendors, phases: the seven plus `manual`.
- Enforced, not documented: `workflow-doctor.js` fails when any canonical skill/agent/entry file
  lacks the instruction, fails on a malformed mode file, and reports live state (active / inert /
  disabled / under-covering) so carrying the instruction is never mistaken for it being on.

## Consequences

- Third-party instructions now shape every session's response style; disabling is one edit
  (`enabled: false`) or `add-skill disable`.
- New skills/agents cannot silently opt out — the doctor fails them.
- Per-vendor verification is uneven and stated as such (`harnesses.md`): only Claude Code was
  exercised end to end.
- Registry-installed upstream skills are exempt from the per-file requirement (not our content).

## Related

- [[prose-instructions-must-specify-how-to-extract-from-free-form-arguments]] — why the
  instruction passes raw invocation text to `--args-text` instead of asking the agent to parse it.
- [[a-gate-must-not-trust-its-own-author]] — why the doctor checks the files instead of trusting
  that they were all updated.
