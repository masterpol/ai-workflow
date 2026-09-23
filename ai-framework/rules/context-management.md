# Context Management

## Purpose

Optimize token usage, maintain relevant context across sessions, and ensure the AI has the right information without overwhelming the context window.

## Token Budget Guidelines

### Per-Phase Budgets

Guidelines, not hard limits — tune them at `/cooldown` if a phase keeps overrunning.

| Phase | Context Budget | Priority Loading |
|-------|---------------|------------------|
| /shape | ~6K tokens | product.md, architecture.md, knowledge-gate matches from `graph.json` |
| /critique | ~3K per perspective | pitch.md + only the slice each perspective needs |
| /plan | ~8K tokens | pitch.md, impacted files list, filtered rules |
| /build | ~10K per scope | plan.md scope section, target files, filtered rules + `.project/rules/` companion |
| /audit | ~4K per subagent, ~6K synthesis | diff slice + the rules that subagent applies |
| /ship | ~4K tokens | pitch.md, plan.md, hill.md, deviations.md, log.md |
| /cooldown | ~6K tokens | `_followups.md`, graph.json tag index, recent `runs/` ship reports |

### Context Loading Priority

**Always load (every phase):**
1. `status.md` — the pitch index (~200 tokens)
2. The active pitch's `checkpoint.md` (if present) and `hill.md`

**Load when relevant:**
3. `plan.md` — only the current scope's section during `/build`
4. Applicable rules (filtered by file types being touched), plus the matching `.project/rules/` companion
5. Related knowledge nodes (traversed via `knowledge/graph.json`, not bulk-loaded)

**Never bulk-load:**
- All pitches (load only the active one)
- All knowledge entries (traverse the graph instead)
- All rules (filter by relevance)

## Context Pruning Strategies

### Phase Transitions

Each phase's output artifact *is* its transition summary — `pitch.md` (shape), `plan.md` (plan), `hill.md` + `log.md` + `deviations.md` (build), the audit cycle report (audit), `SHIPPED.md` (ship). The next phase reads those instead of re-reading conversation history. Never write transition summaries into `status.md`; it is a ≤100-line index.

### Long Sessions

For sessions exceeding 15-20 exchanges, run `/checkpoint`: it overwrites `pitches/{slug}/checkpoint.md` (< 300 tokens — done this session, decisions, blockers, next immediate step) and touches only the pitch's row in `status.md`.

### Large Documents

When a design plan or requirement exceeds 1500 tokens:

1. **Extract actionable sections** — Load only the parts relevant to current work
2. **Create a summary header** — First 200 tokens should be a TL;DR
3. **Use section links** — Reference specific sections instead of loading all

Example requirement doc structure:
```markdown
# Feature: Example Feature

## TL;DR (always load)
One-paragraph summary of what changes and where.
Key schema/data changes and the rough number of new endpoints or functions.

## Detailed Requirements (load when needed)
[... full details ...]

## Acceptance Criteria (load when writing exit criteria and tests)
[... criteria ...]
```

## Context Loading Protocol

### Before Each Skill Runs

1. **Read `status.md`** — find the active pitch; then its `checkpoint.md`/`hill.md`
2. **Identify context needs** — What does this phase require?
3. **Load minimal context** — Only what's needed for this phase
4. **Search don't load** — For ADRs, past requirements, use search

### Context Search vs Bulk Load

| Need | Action |
|------|--------|
| Current feature requirement | Load directly |
| Related past feature | Search by keyword, load if relevant |
| Specific decision | Traverse `knowledge/graph.json` by tag, load if found |
| All knowledge entries | NEVER — traverse the graph instead |
| Applicable rules | Filter by file extensions being touched |

### Rule Filtering Logic

```
If touching UI component files → load component-architecture.md
If touching backend/data-access files → load your project's generated backend rule(s)
If touching *.test.* → load testing.md
If touching styles → load your project's generated styling rule (if /setup created one)
Always load → coding-standards.md, boundaries.md, security.md
```

Stack-specific rule files (backend patterns, styling system, framework conventions) are generated
by `/setup` into `.project/rules/` based on your project's actual stack — this filtering logic
should reference whatever `/setup` produced there, not a fixed list of framework names.

## Session Continuity

### Cross-Session Memory

The framework maintains context across sessions via:

1. **`status.md`** — the pitch index (always read first)
2. **`pitches/{slug}/`** — the active pitch's artifacts and `checkpoint.md`
3. **`knowledge/graph.json`** — extracted decisions, patterns, entities, issues (traversable)
4. **`runs/`** — archived ship reports and `/cooldown` reports (history search)

### Resume Protocol

`/resume {slug}` loads only that pitch's context (see `.claude/skills/resume/SKILL.md`) and asks the user to confirm before continuing.

### Multi-Session Large Features

For features spanning multiple sessions:

1. **End of session**: Run `/checkpoint` to save state
2. **Start of session**: Run `/resume` to restore context
3. **Context cascade**: Each checkpoint builds on the last

## Token Estimation

### Quick Estimates

| Content Type | Tokens (approx) |
|--------------|-----------------|
| 100 lines of code | ~400 tokens |
| 1 KB of markdown | ~250 tokens |
| Average requirement doc | ~600 tokens |
| Average design plan | ~1200 tokens |
| Average rule file | ~400 tokens |
| Full architecture.md | ~800 tokens |

### When Approaching Limits

If context is getting large:

1. **Summarize completed work** — Replace detailed history with summary
2. **Archive to checkpoint** — Save full state, load summary
3. **Split the task** — Break into smaller, focused tasks
4. **Offload to knowledge/** — Extract patterns for future reference

## Anti-Patterns

### 1. Loading Everything
```
❌ Loading all rules, all ADRs, all requirements "just in case"
✓ Load status.md, current requirement, relevant rules only
```

### 2. No Transition Summaries
```
❌ Re-reading full requirement doc every phase
✓ Create transition summary with key decisions
```

### 3. Ignoring Previous Sessions
```
❌ Starting fresh, asking questions already answered
✓ Read status.md and the pitch's checkpoint.md, traverse knowledge/graph.json
```

### 4. Inline History
```
❌ Keeping full conversation history in prompts
✓ Summarize periodically, reference checkpoints
```

## Integration with Workflow

### Phase Start
Each phase skill should:
1. Check the phase's token budget above
2. Load only the required context
3. Note what was loaded for the user

### Phase End
Each phase skill should:
1. Write its output artifact into `pitches/{slug}/` (that is the transition summary)
2. Update only the pitch's row in `status.md`
3. Suggest `/checkpoint` if the session is long

### Ship
`/ship` extracts key learnings to `knowledge/`, archives the pitch's log and hill chart to `runs/`, and compacts `status.md` (see `ai-framework/workflow/phases/4-ship.md`).
