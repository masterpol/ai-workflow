---
name: switch
description: Switch between active tasks. Checkpoints current work and loads context for another task.
---

# /switch — Switch Tasks

> **Recommended capability profile:** `fast` — templated checkpoint-and-reload, no new judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

You are switching focus from one task to another.

## Your Goal
Safely checkpoint the current task and load context for a different task, preserving progress on both.

## Usage

```
/switch                    # Show all tasks and select one
/switch auth-flow          # Switch directly to "auth-flow" task
```

## Steps

### 1. Checkpoint Current Task
Before switching:
1. Read current `status.md` to identify active task
2. Create a checkpoint (see `/checkpoint`)
3. Mark current task as `paused`

### 2. Show Task List
If no task specified, present available tasks:

```markdown
## Available Tasks

| Task | Phase | Status | Last Updated |
|------|-------|--------|--------------|
| sessions-ux | develop | paused (was active) | 2026-02-28 |
| auth-flow | blocked | waiting on design | 2026-02-27 |
| bugfix-toast | request | paused | 2026-02-26 |

Which task would you like to switch to?
Enter task name or number: _
```

### 3. Validate Target Task
If task specified:
1. Check if it exists in status.md tasks table
2. If blocked, warn user and ask to confirm
3. If doesn't exist, offer to create new task

### 4. Load Target Task Context
For the target task:
1. Read its linked documents (requirement, design plan)
2. Read any session checkpoint from runs/
3. Load appropriate rules for the phase

### 5. Update Status
1. Set target task as `active`
2. Update `## Current Focus` section
3. Show the task state:

```markdown
## Switched to: [task-name]

**Phase**: [phase]
**Last worked**: [date]
**Progress**:
- [x] Completed item 1
- [ ] Pending item 2

**Next step**: [from checkpoint or status]

### Context Loaded
- Requirement: `requirements/features/...`
- Design: `design/plans/...` (if applicable)
- Rules: coding-standards.md, [relevant rules]

Ready to continue. Run the phase command or describe what to do next.
```

### 6. Log the Switch
If runs/ is active, log:
```json
{"type":"task-switch","timestamp":"...","from":"task-a","to":"task-b"}
```

## Special Cases

### Switching to Blocked Task
```
⚠️ Task "auth-flow" is blocked.
Reason: Waiting on design review

Options:
1. Switch anyway (unblock it)
2. Choose a different task
3. Cancel
```

### Creating New Task
If task doesn't exist:
```
Task "[name]" not found.

Options:
1. Create it now (runs /request)
2. Choose from existing tasks
3. Cancel
```

### No Other Tasks
If only one task exists:
```
No other tasks available.

Options:
1. Create a new task (/request)
2. Continue with current task
```

## Important Rules
- **Always checkpoint first** — Don't lose progress on current task
- **Load minimal context** — Follow context-management rules
- **Show progress** — User should see exactly where they're picking up
- **Update status.md** — Keep single source of truth current
- **Log switches** — Track in runs/ for history
