---
name: resume
description: Resume work on a pitch. Reads the status index, loads only that pitch's context (~2K tokens), and offers to continue from its current phase and scope.
---

# /resume — Resume a Pitch

> **Recommended capability profile:** `fast` — templated status reload, no new judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

Usage: `/resume` or `/resume {slug}`.

## Steps

1. **Read `.project/status.md`** (the index). If it is missing, the workflow isn't set up — suggest `/setup`.
2. **Pick the pitch.** Use `{slug}` if given. Otherwise: one active pitch → use it; several → list them (Pitch | Hill | Phase | Last touched) and ask; none → list parked pitches and suggest `/shape` for new work or `/fix` for a bug. Stop there.
3. **Load only this pitch's context**, in order, stopping once the next step is clear:
   - `pitches/{slug}/checkpoint.md` (if present — the fastest route back)
   - `hill.md` — scope positions
   - `plan.md` — only the current scope's section and exit criteria
   - the last few entries of `log.md` and `deviations.md`
   - `pitch.md` — only if the phase is `shape` or the next step depends on appetite/no-gos
   Do not bulk-read other pitches, `runs/`, or all of `knowledge/`; traverse `knowledge/graph.json` only for entries tagged to this pitch's area.
4. **External updates.** If `.project/notion-config.json` exists, run `/sync pull` and surface changes to this pitch.
5. **Freshness.** If the pitch was last touched more than 7 days ago, say so and ask whether the context still holds before continuing.
6. **Present and gate:**

```markdown
## Resuming: {slug}
Phase: {phase} • Appetite: {appetite} • Last touched: {date}
Scopes: S1 done · S2 downhill-75 · S3 uphill-25
Next step: {from checkpoint or hill/plan}
Open: {blockers, open deviations, stuck-uphill warnings}
```

Options: **Continue** (invoke the phase skill at the next step) / **Switch** (`/switch`) / **Stop**. Never auto-advance.
