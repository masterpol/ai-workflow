# Context Management

## Purpose

Optimize token usage, maintain relevant context across sessions, and ensure the AI has the right information without overwhelming the context window.

## Token Budget Guidelines

### Per-Phase Budgets

| Phase | Context Budget | Priority Loading |
|-------|---------------|------------------|
| Request | ~4K tokens | product.md, architecture.md, similar requirements |
| Analyze | ~6K tokens | requirement doc, architecture.md, relevant ADRs |
| Design | ~8K tokens | requirement + analysis, related design plans, rules |
| Develop | ~10K tokens | design plan, target files, relevant rules |
| Review | ~6K tokens | changed files, coding-standards.md |
| Test | ~4K tokens | test targets, testing.md, coverage report |
| Finish | ~3K tokens | status.md, checklist |

### Context Loading Priority

**Always load (every phase):**
1. `status.md` — current workflow state (~200 tokens)
2. Active feature's requirement doc (~500-1000 tokens)

**Load when relevant:**
3. Design plan (Design, Develop, Review phases)
4. Applicable rules (filtered by file types being touched)
5. Related knowledge nodes (searched, not bulk-loaded)

**Never bulk-load:**
- All ADRs (search instead)
- All requirements (load only current)
- All rules (filter by relevance)

## Context Pruning Strategies

### Phase Transitions

When moving between phases, create a **transition summary** in `status.md`:

```markdown
## Phase Transition: Analyze → Design

### Key Decisions from Analyze
- Use discriminated union for step types (activity | feedback | branching)
- Store hints as array in step schema, not a separate table
- Estimated 3 new backend functions needed

### Open Questions
- Should branching rules live in the step record or a separate table?

### Files to Touch
- schema definition (schema change)
- backend/sessions module (new functions)
- components/features/sessions/ (UI updates)
```

This summary becomes the primary context for the next phase instead of re-reading all previous docs.

### Long Sessions

For sessions exceeding 15-20 exchanges, create a **checkpoint**:

```markdown
## Session Checkpoint — 2026-02-28 14:30

### Progress
- [x] Schema updated with new fields
- [x] upsertActivitySteps mutation working
- [ ] UI components pending

### Key Decisions Made
- Using Zod discriminated union for step validation
- HintsAccordion component for progressive disclosure

### Current Blockers
None

### Next Immediate Step
Create StepRenderer component with conditional rendering
```

Use `/checkpoint` to generate this automatically.

### Large Documents

When a design plan or requirement exceeds 1500 tokens:

1. **Extract actionable sections** — Load only the parts relevant to current work
2. **Create a summary header** — First 200 tokens should be a TL;DR
3. **Use section links** — Reference specific sections instead of loading all

Example requirement doc structure:
```markdown
# Feature: Sessions UX Overhaul

## TL;DR (always load)
Add step-level instructions, hints accordion, and branching rules to sessions.
Schema changes in `sessions` and `sessionActivitySteps`. ~3 new mutations.

## Detailed Requirements (load when needed)
[... full details ...]

## Acceptance Criteria (load in Test phase)
[... criteria ...]
```

## Context Loading Protocol

### Before Each Skill Runs

1. **Read `status.md`** — Understand current state
2. **Identify context needs** — What does this phase require?
3. **Load minimal context** — Only what's needed for this phase
4. **Search don't load** — For ADRs, past requirements, use search

### Context Search vs Bulk Load

| Need | Action |
|------|--------|
| Current feature requirement | Load directly |
| Related past feature | Search by keyword, load if relevant |
| Specific ADR | Search by topic, load if found |
| All ADRs | NEVER — search instead |
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

1. **`status.md`** — Current workflow state (always read first)
2. **`knowledge/`** — Extracted patterns and decisions (searchable)
3. **`runs/`** — Session logs (for history search)

### Resume Protocol

When resuming a workflow:

1. Read `status.md` to get current phase and links
2. Read the transition summary (if present)
3. Load only the phase-appropriate context
4. Ask user to confirm understanding before proceeding

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
✓ Read status.md, search runs/, check knowledge/
```

### 4. Inline History
```
❌ Keeping full conversation history in prompts
✓ Summarize periodically, reference checkpoints
```

## Integration with Workflow

### Phase Start
Each phase skill should:
1. Check token budget for the phase
2. Load only required context
3. Note what was loaded for the user

### Phase End
Each phase skill should:
1. Create transition summary if moving to next phase
2. Update status.md with key decisions
3. Suggest checkpoint if session is long

### Finish Phase
The `/finish` skill should:
1. Extract key learnings to `knowledge/`
2. Archive the session to `runs/`
3. Clean up status.md for next task
