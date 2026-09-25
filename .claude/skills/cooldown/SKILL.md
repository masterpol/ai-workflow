---
name: cooldown
description: Periodic learning surface. Promotes recurring issues → patterns → rules, triages the followups backlog into candidate pitches, reviews parked pitches, archives stale knowledge. Runs every 5 ships.
---

# Cooldown

> **Recommended capability profile:** `standard` — pattern-promotion judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

Phase 5 of the new pipeline. See `ai-framework/workflow/phases/5-cooldown.md` for full activities.
> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase cooldown [--arg $ARGUMENT]`. If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.


## When to use

- Automatically: every 5 ships (counted in `runs/` since last `cooldown-*.md`)
- Manually: `/cooldown` at any time
- `/cooldown --force` to override the 5-ship gate; `/cooldown --skip` to defer with logged reason

## Activities (in order)

1. **Knowledge health audit** — run `node ai-framework/scripts/graphify.js --check --json` for the mechanical part (dead links, orphans, duplicate ids, entry counts — it rebuilds nothing in `--check` mode, so also run it without `--check` afterward if you want the graph refreshed); then scan `.project/knowledge/{issues,patterns,decisions}/` for what the script can't see: stale (60+ days, low confidence), confidence distribution.
2. **Issue → pattern → rule promotion** — promote to a candidate rule at `ai-framework/rules/` when EITHER: (a) an issue has 3+ pitch refs, OR (b) the same issue class appears in ≥2 later `pitches/*/deviations.md` — a recurring lesson, **even if the issue is marked `resolved`** (resolved means fixed once, not codified). Scan `deviations.md` across pitches for repeated issue references, not just issue metadata. Patterns with high confidence → hard rule. User approves each individually.
3. **Parked pitches review** — for each pitch in `_parked/`: revive / keep / discard?
4. **Followups triage** — bundle related `_followups.md` items into candidate pitches; promote urgent standalones; discard expired items.
5. **Output report** → `.project/runs/cooldown-{date}.md`

## Per-item approval

User confirms each proposed action individually:
- Rule promotions (source → target file)
- Knowledge archives (entry → `_archive/`)
- Parked pitch revivals / discards
- Followup bundles (items → candidate pitch slug)

Items not approved stay in current state.

## Transition

→ User-directed: start a new `/shape` for the next pitch, iterate on a candidate pitch surfaced
by followups triage, or stop. Cooldown doesn't feed into a fixed next phase the way the main
pipeline does.

## Output

- `.project/runs/cooldown-{date}.md`
- Approved rules written to `ai-framework/rules/`
- Approved archives moved to `_archive/`
- Updated `_followups.md`
- Rebuilt `knowledge/graph.json` + `index.md` (after any promotion/archive changes entries)
