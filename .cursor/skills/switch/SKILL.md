---
name: switch
description: Switch between pitches. Checkpoints the current pitch, then loads the target pitch's context via the /resume flow.
---

# /switch — Switch Pitches

> **Recommended capability profile:** `fast` — templated checkpoint-and-reload, no new judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

Usage: `/switch` (choose from a list) or `/switch {slug}`.

## Steps

1. **Checkpoint the current pitch** with `/checkpoint` so nothing is lost.
2. **Choose the target.** Without a slug, list active and parked pitches from `.project/status.md` and ask. With a slug:
   - active → go to step 3
   - parked (`pitches/_parked/`) → warn that it was parked on purpose, show its park reason, and ask before moving it back to active
   - unknown → offer `/shape {slug}` for new work or `/fix` for a bug; do not create a pitch folder silently
3. **Load the target** with the `/resume {slug}` flow (pitch-only context, ~2K tokens).
4. **Update `.project/status.md`** rows only: the target's Last touched (and its move from Parked to Active if approved).

## Parallel pitches

For big-batch work, prefer one worktree per pitch (see `ai-framework/workflow/overview.md` → "Multi-pitch parallel work"). `/switch` in a shared worktree is for context, not file isolation — if both pitches edit the same files, `cross-pitch-conflict-checker` will flag it at `/audit`.
