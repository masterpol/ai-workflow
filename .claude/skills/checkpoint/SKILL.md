---
name: checkpoint
description: Save mid-session progress. Creates a snapshot of current work for easy resumption later.
---

# /checkpoint — Save Session Progress

> **Recommended capability profile:** `fast` — templated session snapshot, no judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

You are saving a mid-session checkpoint to preserve context for resumption.

## Your Goal
Capture the current session state, decisions made, and next steps so the workflow can be resumed accurately later.

## When to Use
- Long sessions (15+ exchanges)
- Before taking a break
- When switching to another task
- After significant progress within a phase

## Steps

### 1. Read Current State
Read `.project/status.md` to understand:
- Current task and phase
- What has been accomplished
- What's pending

### 2. Gather Session Context
Identify:
- **Key decisions made** in this session
- **Files created or modified**
- **Progress within current phase** (checklist items)
- **Open questions or blockers**
- **Immediate next step**

### 3. Create Checkpoint Summary
Generate a checkpoint block:

```markdown
## Session Checkpoint — [YYYY-MM-DD HH:MM]

### Progress This Session
- [x] Completed item 1
- [x] Completed item 2
- [ ] Pending item 3

### Key Decisions Made
1. [Decision] — [Rationale]
2. [Decision] — [Rationale]

### Files Changed
- `path/to/file1.ts` — [what changed]
- `path/to/file2.tsx` — [what changed]

### Current Blockers
- [Blocker if any, or "None"]

### Next Immediate Step
[Specific action to take when resuming]
```

### 4. Update Status File
Add the checkpoint to `.project/status.md`:
- Update the `## Phase Progress` section with current checklist
- Add or update `## Session Info` with timestamp
- Include the checkpoint summary

### 5. Log to Runs (if tracking)
If `.project/runs/` exists and a session log is active, append:

```json
{"type":"checkpoint","timestamp":"...","progress":[...],"next_step":"...","decisions_count":N}
```

### 6. Confirm with User
Present:
```
✓ Checkpoint saved.

Current state:
- Task: [task name]
- Phase: [phase]
- Progress: [X/Y items complete]

When you return, use /resume to continue from:
→ [next immediate step]

Options:
1. Continue working
2. Switch to another task (/switch)
3. End session
```

## What Gets Saved
- Progress checklist state
- Decisions made (summary, not full reasoning)
- Files touched
- Next step
- Session timestamp

## What Doesn't Get Saved
- Full conversation history (too large)
- File contents (reference paths instead)
- Implementation details (reference design doc instead)

## Important Rules
- **Be concise** — checkpoint should be < 300 tokens
- **Focus on resumability** — what does someone need to continue?
- **Don't duplicate** — reference docs instead of copying content
- **Update, don't append** — replace old checkpoint with new one
