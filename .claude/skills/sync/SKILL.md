---
name: sync
description: Bidirectional sync between local workflow tasks and a Notion database. Use when the user asks to sync, push, or pull tasks with Notion.
---

# /sync — Sync Tasks with Notion

> **Recommended capability profile:** `fast` — mechanical field mapping and API calls, no judgment beyond conflict reporting. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

> Bidirectional sync between local workflow tasks and a Notion database.

You are running the **SYNC** skill. This connects the local AI development workflow to a Notion task board.

## Prerequisites
- Notion MCP server must be configured in `.mcp.json`
- The Notion integration must have access to the target page

## First-Time Setup

If `.project/notion-config.json` does not exist or has no `databaseId`:

1. **Ask the user for the Notion page name or URL** to use as the parent page for the task
   database (e.g. "`<Project Name>` Tasks"). Do not guess a page name — search only once you
   have one to look for.
2. **Find the parent page** using `notion-search` with the name/URL the user gave you.

3. **Create the database** using `notion-create-database` with this schema:

```json
{
  "parent_id": "<page_id>",
  "title": "<Project Name> Tasks",
  "properties": {
    "Task": { "type": "title" },
    "Status": {
      "type": "select",
      "select": {
        "options": [
          { "name": "Backlog", "color": "default" },
          { "name": "Active", "color": "blue" },
          { "name": "In Progress", "color": "yellow" },
          { "name": "Completed", "color": "green" },
          { "name": "Deferred", "color": "orange" }
        ]
      }
    },
    "Priority": {
      "type": "select",
      "select": {
        "options": [
          { "name": "High", "color": "red" },
          { "name": "Medium", "color": "yellow" },
          { "name": "Low", "color": "green" }
        ]
      }
    },
    "Category": {
      "type": "select",
      "select": {
        "options": [
          { "name": "Feature", "color": "blue" },
          { "name": "Refactor", "color": "purple" },
          { "name": "Security", "color": "red" },
          { "name": "Tech Debt", "color": "orange" },
          { "name": "Bug Fix", "color": "pink" }
        ]
      }
    },
    "Source Feature": { "type": "rich_text" },
    "Phase": {
      "type": "select",
      "select": {
        "options": [
          { "name": "Request", "color": "default" },
          { "name": "Analyze", "color": "gray" },
          { "name": "Design", "color": "blue" },
          { "name": "Develop", "color": "yellow" },
          { "name": "Review", "color": "orange" },
          { "name": "Test", "color": "green" },
          { "name": "Finish", "color": "green" }
        ]
      }
    },
    "Local ID": { "type": "rich_text" },
    "Created": { "type": "date" },
    "Updated": { "type": "date" }
  }
}
```

3. **Save the database ID** to `.project/notion-config.json`:
```json
{
  "databaseId": "<id>",
  "createdAt": "YYYY-MM-DD",
  "lastSyncAt": null
}
```

## Sync Operations

### Push (Local → Notion)

1. **Read local tasks** from:
   - `.project/status.md` — active/completed tasks
   - TaskList tool — pending deferred tasks
   - `.project/runs/` — recently completed work

2. **Query Notion database** using `notion-query-data-sources` to get existing entries

3. **For each local task**:
   - Search Notion by "Local ID" property
   - If found: compare status/priority — update if changed locally (use `notion-update-page`)
   - If not found: create new page (use `notion-create-pages`)

4. **Map statuses**:
   | Local Status | Notion Status |
   |---|---|
   | pending | Backlog |
   | active | Active |
   | in_progress | In Progress |
   | completed | Completed |
   | deferred | Deferred |

5. **Page content** should include:
   - Task description as body text
   - Source feature reference
   - Any relevant context from the workflow

### Pull (Notion → Local)

1. **Query Notion database** for tasks updated since `lastSyncAt`

2. **For each Notion task**:
   - Match by "Local ID" to find the corresponding local task
   - If status changed in Notion (e.g., user moved it to "In Progress" or "Completed"):
     - Update the local task via TaskUpdate
     - Report the change to the user
   - If a NEW task was created in Notion (no Local ID):
     - Report it to the user and ask if they want to create a local task

3. **Update `lastSyncAt`** in `.project/notion-config.json`

### Full Sync (Default)

Run both Push then Pull. Report a summary:

```markdown
## Sync Summary

### Pushed (Local → Notion)
- Created: N new tasks
- Updated: M tasks
- Unchanged: K tasks

### Pulled (Notion → Local)
- Status changes: X tasks
- New in Notion: Y tasks (not yet local)

Last synced: YYYY-MM-DD HH:MM
```

## Usage Modes

### Manual: `/sync`
Run full bidirectional sync on demand.

### After `/ship`
`/ship` can suggest: "Run `/sync` to push completed work and new tasks to Notion?"

### During `/resume`
The resume skill will:
1. Pull from Notion to check for status changes
2. Show any tasks that were updated externally
3. Factor external changes into the resume flow

## Arguments

- `/sync` — full bidirectional sync (default)
- `/sync push` — push only (local → Notion)
- `/sync pull` — pull only (Notion → local)
- `/sync setup` — force re-run first-time setup

## Error Handling

- If Notion MCP server is not available: inform user to restart Claude Code
- If API rate limited: wait and retry (max 3 attempts)
- If database not found: re-run setup
- If page update fails (known issue with notion-update-page): log warning, skip update, report to user

## Config File

`.project/notion-config.json` (gitignored):
```json
{
  "databaseId": "xxx-xxx-xxx",
  "createdAt": "2026-03-09",
  "lastSyncAt": "2026-03-09T14:30:00Z",
  "taskMap": {
    "local-task-1": "notion-page-id-1",
    "local-task-2": "notion-page-id-2"
  }
}
```

The `taskMap` tracks which local tasks map to which Notion pages for efficient updates.

## Output
- Sync summary with counts
- Any conflicts or issues found
- Updated config with new lastSyncAt
