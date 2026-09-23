---
name: ship
description: Close a pitch cleanly after /audit passes. Final /verify gauntlet, pitch ↔ implementation reconciliation, knowledge extraction, status compaction.
---

# Ship

> **Recommended capability profile:** `fast` — templated reconciliation + extraction. Select an available model using `ai-framework/integrations/harnesses.md`.

Phase 4 of the new pipeline. See `ai-framework/workflow/phases/4-ship.md` for full activities.

## When to use

- After `/audit` with zero must-fix findings

## Activities (in order)

1. **Final /verify** — 6-phase gauntlet using the real commands from `.project/context/stack.md`: `<build-command>` · `<typecheck-command>` · `<lint-command>` · `<test-command>` (non-watch) · `<i18n-check-command>` (i18n projects only) · git diff (no .env / no debug). Skip a step only when the project has no such command, and say so. If any fails, back to `/audit` cycle 2.
2. **Reconciliation → SHIPPED.md** — pitch ↔ implementation: scope statuses, no-gos honored, rabbit holes resolved, followups generated.
3. **Knowledge extraction** — `log.md` triage (promote non-trivial incidents to `knowledge/issues/`), `deviations.md` review (flag patterns for `/cooldown`), new reusable patterns → `knowledge/patterns/`. Give every new entry a real `id`, `tags`, and at least one `related` link or `[[wiki-link]]` to an existing entry — an entry with neither is invisible to graph traversal. Then run `node ai-framework/scripts/graphify.js` to rebuild `knowledge/graph.json` + `index.md` so the new entries are traversable immediately.
4. **Status compaction** — pitch row → "Recent ships"; full log → `runs/{date}-{slug}.md`; status.md ≤100 lines.
5. **Followups** — should-fix deferred at /audit + emerged rabbit holes → `pitches/_followups.md`.
6. **Doc updates** — only if architecture/product surface changed or ADR-worthy decision made.

## Output

- `pitches/{slug}/SHIPPED.md`
- Updated `knowledge/{issues,patterns}/`, rebuilt `knowledge/graph.json` + `index.md`
- Compacted `status.md`
- Archived `runs/{date}-{slug}.md`

## Confirmation gate

`/ship: pitch ready to close.` — presents verify results, reconciliation summary, knowledge extractions, followup count. Options: **[1] ship** / **[2] hold**.

## Transition

- **[1] ship** → `/cooldown` if this is the 5th ship since the last one, otherwise back to
  `/shape` for the next pitch
- **[2] hold** → stay in `/ship`, address the blocker
