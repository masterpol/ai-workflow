---
name: search
description: Search knowledge graph, past sessions, ADRs, and requirements. Find relevant context quickly.
---

# /search — Search Project Knowledge

> **Recommended capability profile:** `fast` — repository/graph search and ranking, no judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

You are searching the project's accumulated knowledge to find relevant context.

## Your Goal
Find and return relevant information from the project's knowledge base, past sessions, decisions, and documentation.

## Usage Patterns

```
/search "authentication flow"        # General search
/search knowledge "patterns"         # Search knowledge/ folder
/search runs "decision:JWT"          # Search past sessions
/search adrs "caching"              # Search ADRs
/search requirements "session"       # Search requirements
```

## Steps

### 1. Parse Search Query
Identify:
- **Scope**: `knowledge`, `runs`, `adrs`, `requirements`, or all (default)
- **Query**: The search terms
- **Filters**: Any specific filters (e.g., `decision:`, `error:`)

### 2. Search by Scope

#### All (default)
Search across all sources, prioritize by relevance:
1. Knowledge graph (patterns, decisions, entities, issues)
2. Current feature's docs (requirement, design plan)
3. ADRs
4. Recent runs
5. Other requirements

#### Knowledge (`/search knowledge "query"`)
Start from `.project/knowledge/graph.json` rather than grepping every file — it's the
pre-built, traversable index: match the query against `nodes[].title`/`tags`/`id` first
(and check `tagIndex` for a tag-shaped query), then follow `edges`/`related` one hop out to
pull in adjacent entries the query didn't directly match. Fall back to reading the raw files
under `.project/knowledge/` only for content the graph doesn't index (full body text). If
`graph.json` looks missing or stale, rebuild it: `node ai-framework/scripts/graphify.js`.
- `decisions/` — Technical decisions
- `patterns/` — Code patterns
- `entities/` — Key architectural entities
- `issues/` — Known problems and solutions

#### Runs (`/search runs "query"`)
Search `.project/runs/`:
- Session logs (JSONL files)
- Look for matching events, decisions, errors

#### ADRs (`/search adrs "query"`)
Search `.project/design/decisions/`:
- Architecture Decision Records
- Match in title, context, decision, consequences

#### Requirements (`/search requirements "query"`)
Search `.project/requirements/`:
- Feature requirements
- Bug reports

### 3. Rank Results
Order by:
1. **Exact matches** in title/id
2. **Matches in summary/TL;DR**
3. **Matches in body**
4. **Recency** (newer content preferred for ties)

### 4. Present Results
Format:

```markdown
## Search Results for "[query]"

Found [N] results across [scopes searched]

### Top Matches

#### 1. [Title] — [type: decision/pattern/requirement/etc]
- **Location**: `path/to/file.md`
- **Relevance**: [why this matched]
- **Summary**: [first 100 words or TL;DR]

#### 2. [Title] — [type]
...

### Additional Matches
- [Title](path) — [one-line summary]
- [Title](path) — [one-line summary]
...

### Search Tips
- Narrow scope: `/search knowledge "query"`
- Filter type: `/search runs "decision:topic"`
- No results? Try broader terms or check spelling
```

### 5. Offer Actions
After presenting results:
```
Would you like to:
1. Read full content of result #[N]
2. Refine search with different terms
3. Continue with current task
```

## Special Filters

### Decision filter (`decision:`)
```
/search runs "decision:JWT"
→ Finds session events of type "decision" mentioning JWT
```

### Error filter (`error:`)
```
/search runs "error:hydration"
→ Finds session events of type "error" mentioning hydration
```

### Date filter (`since:`)
```
/search runs "since:2026-02-01"
→ Only sessions from February 2026 onwards
```

## Search Tips
- **Start broad**: General query across all sources
- **Then narrow**: Scope to specific folder if too many results
- **Use filters**: For specific types of information
- **Check knowledge first**: Often has the distilled answer

## Important Rules
- **Summarize, don't dump** — show relevant snippets, not full files
- **Rank by relevance** — most useful results first
- **Offer to read full** — if user wants more detail
- **Note freshness** — indicate if results are old
- **Handle no results** — suggest alternative queries
