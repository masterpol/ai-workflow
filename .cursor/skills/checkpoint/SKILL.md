---
name: checkpoint
description: Save mid-session progress on the active pitch to its checkpoint.md so /resume can pick up exactly where you left off.
---

# /checkpoint — Save Pitch Progress

> **Recommended capability profile:** `fast` — templated session snapshot, no judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

Use during long sessions, before a break, or before `/switch`.

## Steps

1. Identify the active pitch from `.project/status.md` → Active pitches (ask if more than one is active and none was named).
2. **Overwrite** `.project/pitches/{slug}/checkpoint.md` — one checkpoint per pitch, replaced each time, **< 300 tokens**:

```markdown
# Checkpoint — {slug} — YYYY-MM-DD HH:MM
Phase: {phase} • Current scope: {S#} at {hill position}
## Done this session
- ...
## Decisions (one line each, with rationale)
- ...
## Blockers
- None | ...
## Next immediate step
- {specific action}
```

3. Make sure `hill.md` reflects the scope positions reached this session, and that any drift or incident is already in `deviations.md` / `log.md` — the checkpoint points at those, it does not copy them.
4. In `.project/status.md`, update only that pitch's row (Hill, Phase, Last touched). Never write checkpoint detail into `status.md`; it is a ≤100-line index.
5. Confirm: `✓ Checkpoint saved — resume with /resume {slug} → {next step}`.
