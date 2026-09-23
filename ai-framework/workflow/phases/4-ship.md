# Phase 4: Ship

## Purpose

Close the pitch cleanly: final verification, pitch ↔ implementation reconciliation, knowledge extraction, status compaction.

## Trigger

- Completion of `/audit` with zero must-fixes
- `/ship` command

## Activities (in order)

### 1. Final /verify (mandatory)

Runs the 6-phase gauntlet one last time, using the real commands recorded in `.project/context/stack.md` (skip a line only when the project has no such command, and say so in the summary):

```
✓ <build-command> exit 0
✓ <typecheck-command> exit 0
✓ <lint-command> exit 0
✓ <test-command> exit 0 (non-watch mode)
✓ <i18n-check-command> exit 0 (i18n projects only)
✓ git diff: no uncommitted .env / no debug code
```

If any fails, `/ship` aborts and drops back to `/audit` cycle 2. Catches drift between audit-fixes and final state — twice in recent history this caught what audit missed.

### 2. Pitch ↔ implementation reconciliation → SHIPPED.md

```markdown
# Shipped: {slug}
Bet: YYYY-MM-DD  •  Shipped: YYYY-MM-DD  •  Appetite: big-batch (within budget: 6 days)

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-04-23 | as planned |
| S2 | shipped | 2026-04-25 | +1 deviation: switched compute-on-write → compute-on-read |
| S3 | deferred | — | followup pitch: ai-route-edge-runtime |

## No-gos honored
- ✅ no migration for existing rows
- ⚠️ violated: i18n shipped EN+ES even though no-go'd (reason: would have shipped broken Spanish UI)

## Rabbit holes
- ✅ resolved as planned: react-pdf SVG support
- ⚠️ surfaced new: react-pdf font-loading on edge runtime → followup

## Followups generated
- ai-route-edge-runtime (med, deferred S3)
- font-loading edge-compat investigation (low)
```

### 3. Knowledge extraction (mandatory, structured)

Three deterministic moves:

- **`log.md` triage**: each incident logged during `/build` is checked. New + non-trivial → promote to `knowledge/issues/` card. Matching existing → bump that card's `confidence` field.
- **`deviations.md` review**: patterns surfacing across this + recent pitches → flag for `/cooldown` rule-promotion review.
- **New patterns**: scopes solving problems reusably → create `knowledge/patterns/` entry at `confidence: low`.

Every new or bumped card needs a real `id`, `tags`, and at least one `related`/`[[wiki-link]]` to
an existing entry — otherwise it can't be found by graph traversal later. Once entries are
written, run `node ai-framework/scripts/graphify.js` to rebuild `knowledge/graph.json` +
`index.md` so the new knowledge is traversable immediately, not just on the next `/cooldown`.

### 4. Status compaction (≤100 lines hard cap)

- Pitch's full log → `runs/{date}-{slug}.md`
- Pitch's hill chart → `runs/{date}-{slug}-hill.md`
- Top-level `status.md`: pitch row dropped from "Active"; 5-line "Recent ship" entry appended

New `status.md` shape:

```markdown
# Workflow Status

## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |
|-------|------|-------|----------|--------------|

## Parked pitches
- {slug} — reason

## Recent ships (last 5)
- YYYY-MM-DD {slug} → runs/{date}-{slug}.md

## Open rabbit holes across active pitches
- […]

## Followups backlog (not yet pitched)
→ .project/pitches/_followups.md ({N} items)

## /cooldown due in: {N} ships
```

### 5. Followups handling

Should-fix items deferred during `/audit` + emerged-rabbit-holes from reconciliation flow into `pitches/_followups.md` — single-file backlog of one-line items. **Not auto-promoted**. They wait for the next `/shape` cycle or `/cooldown` to review.

### 6. Doc updates (conditional, recorded)

Update only if:
- Architecture changed (new integration, new package)
- Product surface changed (user-visible feature)
- ADR-worthy decision (→ `design/decisions/`)

Otherwise: explicit "no doc updates needed because {reason}" logged in SHIPPED.md.

## Output

- `pitches/{slug}/SHIPPED.md`
- Updated `.project/knowledge/{issues,patterns}/`, rebuilt `knowledge/graph.json` + `index.md`
- Compacted `.project/status.md`
- Archived `runs/{date}-{slug}.md` and `runs/{date}-{slug}-hill.md`
- Updated `pitches/_followups.md` if any deferred items

## Confirmation gate

```
/ship: pitch {slug} ready to close.
- Verify: ✅ all 6 phases green
- Reconciliation: {n}/{total} scopes shipped, {m} deferred
- Knowledge: {x} issues promoted, {y} new patterns, {z} rule changes proposed
- Status: compacted to {N} lines
- Followups: {k} items added to backlog

[1] ship — close pitch, archive runs, free worktree (if any)
[2] hold — keep pitch active for more iteration
```

## Transition

→ User-directed (start new `/shape`, iterate, or stop)
→ `/cooldown` auto-fires if this is the 5th ship since last cooldown
