---
name: resume
description: Resume a previous session. Reads status, loads context efficiently, and continues from where you left off.
---

# /resume — Resume Previous Session

> **Recommended capability profile:** `fast` — templated status reload, no new judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

You are resuming a previous workflow session.

## Your Goal
Read the workflow status, load minimal context efficiently, and offer to continue from the current phase.

## Steps

### 1. Read Status
Read `.project/status.md` to determine the current state.

If the file does not exist, inform user and suggest `/request`.

### 2. Handle Based on State

#### If no active tasks:
```markdown
No work in progress.

## Recent Completions
[List from status.md if available]

To start something new:
- `/request` — start a new feature
- `/fix` — fix a known bug
- `/sync` — check Notion for task updates
- `/setup` — regenerate project context
```
**Stop here.** Do not proceed further.

#### If active task exists:

### 3. Check Notion for External Updates
If `.project/notion-config.json` exists:
1. Pull task status changes from Notion (via `/sync pull`)
2. Show any tasks that were updated externally (e.g., reprioritized, completed)
3. Factor external changes into the resume flow

### 4. Load Context Efficiently (NEW)
Instead of re-reading all documents:

1. **Read transition summary** from status.md — contains key decisions
2. **Note progress checklist** — what's done vs pending
3. **Check for session log** in `runs/` — for additional context
4. **Load only what's needed** for current phase (see context budgets)

### 4. Search for Additional Context (NEW)
```
Search knowledge/ for:
- Patterns relevant to this feature
- Decisions that might apply

Search runs/ for:
- Previous sessions on this task (if multi-session)
```

### 5. Present Summary
Show the user:

```markdown
## Resuming: [feature-name]

### Current State
- **Phase**: [phase]
- **Workflow**: [full/fix]
- **Last Updated**: [date]
- **Session Duration**: [if multi-session, show total]

### Progress
[Checklist from status.md]
- [x] Completed items
- [ ] Pending items

### Key Context
**From transition summary:**
- [Key decision 1]
- [Key decision 2]

**From knowledge search:**
- Related pattern: [if found]
- Related decision: [if found]

### Next Step
[From status.md]

### Session History
[If runs/ log exists]
- Previous sessions: [count]
- Total decisions logged: [count]
```

### 6. Offer Options
```markdown
Options:
1. ✓ **Continue** — pick up from [current phase] at [next step]
2. ↻ **Restart phase** — redo [current phase] from the beginning
3. ← **Back** — go to the previous phase
4. 🔄 **Switch task** — work on a different task (/switch)
5. ✕ **Abandon** — clear status and start fresh
```

### 7. Act on Choice

| Choice | Action |
|--------|--------|
| Continue | Load phase context, invoke phase skill from next step |
| Restart | Invoke phase skill from beginning |
| Back | Invoke previous phase's skill |
| Switch | Run `/switch` |
| Abandon | Reset status.md, offer to start new |

## Multi-Task Support (NEW)

If status.md shows multiple tasks:

```markdown
## Active Tasks

| Task | Phase | Status | Last Updated |
|------|-------|--------|--------------|
| sessions-ux | develop | active | 2026-02-28 |
| auth-flow | design | paused | 2026-02-27 |
| bugfix-123 | — | blocked | 2026-02-26 |

Which task would you like to resume?
1. **sessions-ux** (active) — Continue development
2. **auth-flow** (paused) — Resume design phase
3. **bugfix-123** (blocked) — Unblock and continue

Enter number or task name: _
```

## Context Loading by Phase

When continuing, load appropriate context:

| Phase | Load |
|-------|------|
| Request | product.md, similar features from knowledge/ |
| Analyze | Requirements doc, architecture.md |
| Design | Requirements + analysis summary, patterns from knowledge/ |
| Develop | Design plan, target files, relevant rules |
| Review | Changed files, review rules |
| Test | Test targets, testing rules |
| Finish | Status summary, doc checklist |

## Session Log Integration (NEW)

If `runs/YYYY-MM-DD-[feature].jsonl` exists:

1. Show session statistics
2. Highlight key decisions made
3. Note any checkpoints saved
4. Show how many exchanges in current session

```markdown
### Session History
- Sessions: 2 (started 2026-02-27)
- Decisions logged: 5
- Last checkpoint: "Schema + backend complete"
- Exchanges this session: 0 (fresh start)
```

## Important Rules
- **Load transition summaries** — don't re-read full documents
- **Use knowledge search** — find relevant patterns
- **Check session logs** — for accurate context
- **Follow context budgets** — don't overload
- **Show progress** — user should know exactly where they are
- **Check freshness** — if > 7 days old, ask if context is still relevant
- **Don't auto-advance** — always wait for user choice
