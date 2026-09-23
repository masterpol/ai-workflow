# Phase 5: Cooldown

## Purpose

The framework's only standalone learning surface. Every other phase weaves learning inline; `/cooldown` is the batched retrospective that promotes recurring patterns into rules, prunes stale knowledge, and triages the followups backlog.

Replaces the old `/retro + /extract + /learn + /knowledge-health` quartet.

## Trigger

- **Automatic**: every 5 ships (counted via `runs/` entries)
- **Manual**: `/cooldown` command at any time

## Activities (in order)

### 1. Knowledge health audit

Runs `/knowledge-health` (existing skill), which leads with `node ai-framework/scripts/graphify.js --check --json` for the mechanical checks (orphans, dead/broken links, duplicate ids), then adds judgment on top. Outputs:
- Stale entries (60+ days unused)
- Orphan entries (no inbound references) — from graphify
- Confidence distribution across issues/patterns/decisions
- Dead links (referenced files moved or deleted) — from graphify

### 2. Issue → pattern → rule promotion

Walk the knowledge graph — traverse `.project/knowledge/graph.json` (`edges`/`related`, `tagIndex`) rather than re-reading every entry:

| Source state | Action proposed |
|---|---|
| Issue with `confidence: high` (3+ references in pitches) | Promote to **rule** at `ai-framework/rules/` |
| Pattern with `confidence: high` | Promote to **hard rule** referenced by relevant subagent prompts |
| Issue with `confidence: low` for 60+ days | Archive (move to `_archive/`) |
| Same root cause across 2+ ships | Bundle into a candidate rule |

User approves each promotion individually before write.

### 3. Parked pitches review

For each pitch in `.project/pitches/_parked/`:
- Has the context shifted enough to bet now?
- Were no-gos that blocked it lifted by other ships?
- Should it be deleted (no longer relevant)?

Output: list of revival candidates for the next `/shape` cycle.

### 4. Followups triage

For each item in `pitches/_followups.md`:
- Bundle related items into a candidate pitch (e.g., "all the deferred mobile responsive items" → one big-batch pitch)
- Promote standalone urgent items to next /shape
- Discard items whose context expired

### 5. Output: cooldown report

Single-file report at `.project/runs/cooldown-{date}.md`:

```markdown
# Cooldown report — YYYY-MM-DD
Ships since last cooldown: 5
Triggered: automatic / manual

## Knowledge health
- Stale: {n} entries (proposed for archive)
- Orphans: {n}
- Confidence distribution: low {N} | medium {N} | high {N}

## Promotions proposed
| Source | Target rule file | Reason | Approve? |
|--------|-----------------|--------|----------|
| issue/wizard-lossy-round-trip (3 refs) | ai-framework/rules/data-roundtrip.md | Recurring class | ☐ |

## Parked pitches review
- {slug}: revive (context shifted) / keep parked / discard

## Followups bundled into candidate pitches
- "mobile-polish-batch" — bundles 4 items
- "rag-eval-deepening" — bundles 3 items

## Archive proposed
- knowledge/issues/{slug} — 60+ days unused, low confidence
```

### 6. User approval gate

User reviews the report and explicitly approves:
- Rule promotions (each individually)
- Parked pitch revivals
- Archive moves

Approved actions are then applied: rules written, pitches moved, archives moved. If any archive
or promotion changed what's in `.project/knowledge/`, rebuild the graph:
`node ai-framework/scripts/graphify.js`.

## Adaptive frequency

Default: every 5 ships. The framework counts ships in `runs/` since last `cooldown-*.md`.

User can override: `/cooldown --force` to run early; `/cooldown --skip` to defer one cycle (logged with reason).

## Output

- `.project/runs/cooldown-{date}.md` — the report
- Approved rule promotions written to `ai-framework/rules/`
- Approved pitch revivals moved out of `_parked/`
- Approved archives moved to `_archive/`
- Rebuilt `.project/knowledge/graph.json` + `index.md` if knowledge entries changed

## Confirmation gate

Per-item approval (not single Approve/Revise) — user confirms each promotion / revival / archive individually. Items not approved stay in their current state.

## Transition

→ User-directed (start new `/shape`, iterate on candidate pitches, or stop)
