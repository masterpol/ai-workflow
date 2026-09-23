# Session Runs

## Purpose

Event-sourced logs of AI development sessions. Enables searching past sessions, understanding decision history, and resuming work accurately.

## Structure

```
runs/
├── README.md           # This file
├── index.md            # Recent runs summary
└── YYYY-MM-DD-feature-name.jsonl  # Event logs per session
```

## Event Log Format

Each session is stored as a JSONL file (one JSON object per line):

```jsonl
{"type":"session-start","timestamp":"2026-02-28T10:00:00Z","feature":"sessions-ux-overhaul","workflow":"full"}
{"type":"phase-start","timestamp":"2026-02-28T10:00:05Z","phase":"request"}
{"type":"user-message","timestamp":"2026-02-28T10:00:10Z","content":"I need to add step hints..."}
{"type":"assistant-response","timestamp":"2026-02-28T10:00:30Z","summary":"Understood. Creating requirement doc..."}
{"type":"file-created","timestamp":"2026-02-28T10:01:00Z","path":"requirements/features/2026-02-28-sessions-ux.md"}
{"type":"phase-end","timestamp":"2026-02-28T10:05:00Z","phase":"request","outcome":"approved"}
{"type":"decision","timestamp":"2026-02-28T10:10:00Z","description":"Using discriminated union for step types","rationale":"Type safety for different step behaviors"}
{"type":"phase-start","timestamp":"2026-02-28T10:10:05Z","phase":"analyze"}
...
{"type":"session-end","timestamp":"2026-02-28T12:00:00Z","outcome":"completed","phases_completed":["request","analyze","design","develop"]}
```

## Event Types

### Session Events
- `session-start` — New session begins
- `session-end` — Session concludes
- `session-pause` — User paused workflow
- `checkpoint` — Mid-session state save

### Phase Events
- `phase-start` — Phase begins
- `phase-end` — Phase completes (with outcome: approved/revised/back/stop)

### Interaction Events
- `user-message` — User input (summarized, not verbatim)
- `assistant-response` — AI response (summarized)
- `question` — Clarifying question asked
- `approval` — User approved something

### Decision Events
- `decision` — Technical decision made
- `tradeoff` — Trade-off acknowledged
- `assumption` — Assumption recorded

### Work Events
- `file-created` — New file created
- `file-modified` — Existing file changed
- `file-deleted` — File removed
- `test-run` — Tests executed (with result)
- `error` — Error encountered

## Index Format

The `index.md` provides a quick overview:

```markdown
# Recent Runs

## Active
- **sessions-ux-overhaul** (2026-02-28) — Phase: develop, Status: in_progress

## Completed (Last 10)
| Date | Feature | Workflow | Phases | Duration |
|------|---------|----------|--------|----------|
| 2026-02-27 | auth-flow | full | 7/7 | 3.5 hrs |
| 2026-02-26 | bugfix-toast | fix | 4/4 | 45 min |
...

## Search Recent Runs
Use `/search runs "query"` to find specific sessions.
```

## Usage

### Automatic Logging
Each workflow skill automatically appends events to the current session log.

### Searching History
```
/search runs "authentication"    # Find sessions about auth
/search runs "decision:JWT"      # Find decisions about JWT
/search runs "error:hydration"   # Find sessions with hydration errors
```

### Resuming from Logs
When `/resume` runs, it reads the latest session log to:
1. Show what happened in previous sessions
2. Reconstruct context from decisions made
3. Continue from the exact point of pause

## Privacy & Size

### What's Logged
- Summaries of interactions, not full transcripts
- File paths, not full file contents
- Decision descriptions, not all reasoning

### What's NOT Logged
- Full user messages (summarized only)
- Full AI responses (summarized only)
- Sensitive data (API keys, credentials)

### Retention
- Active sessions: Keep full logs
- Completed sessions: Archive after 30 days
- Key decisions: Extract to `knowledge/` before archiving

## Integration with Workflow

### Phase Start
```jsonl
{"type":"phase-start","timestamp":"...","phase":"develop","context_loaded":["design-plan.md","coding-standards.md"]}
```

### Phase End
```jsonl
{"type":"phase-end","timestamp":"...","phase":"develop","outcome":"approved","files_changed":5,"decisions":2}
```

### Checkpoint
```jsonl
{"type":"checkpoint","timestamp":"...","progress":["schema updated","mutation working"],"next_step":"Create UI components"}
```
