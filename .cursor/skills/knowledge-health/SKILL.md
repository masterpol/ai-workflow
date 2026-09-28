---
name: knowledge-health
description: Audit knowledge graph. Checks for stale entries, unused patterns, issue-to-rule promotion candidates, and overall health. Run periodically or after every 3-5 features.
---

# /knowledge-health — Knowledge Graph Audit

> **Recommended capability profile:** `standard` — staleness/promotion judgment on top of graphify.js's mechanical checks. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

You are performing a **knowledge health check** — auditing the knowledge graph for quality, staleness, and improvement opportunities.

## When to Run
- After completing 3-5 features (periodic health check)
- When `/search` returns irrelevant results
- When the same issue recurs despite being in `knowledge/issues/`
- When the user asks "is our knowledge graph useful?"

## Context Budget
~4K tokens:
- `knowledge/index.md`
- `knowledge/meta/usage-log.md` (if exists)
- Recent status.md completions

## Steps

### 1. Inventory all knowledge entries
Read `knowledge/index.md` and count entries by type:
```markdown
## Knowledge Inventory
- Decisions: N entries
- Patterns: N entries
- Entities: N entries
- Issues: N entries
- Total: N entries
```

### 2. Check for staleness
For each entry, check:
- **Age**: Entries older than 60 days without updates may be stale
- **Referenced files**: Do the files mentioned in `## Examples in Codebase` still exist?
- **Related entries**: Are the `related:` links still valid?

```markdown
## Staleness Report

| Entry | Type | Last Updated | Status |
|-------|------|-------------|--------|
| ai-then-heuristic-fallback | pattern | 2026-02-28 | OK — files exist |
| duplicate-error-utility | issue | 2026-03-01 | OK — recently added |
| [old-entry] | pattern | 2025-12-15 | STALE — referenced file deleted |
```

### 3. Check usage (pattern references)
Search `pitches/*/` (pitch, plan, log, deviations, SHIPPED) and `runs/*.md` for references to each knowledge entry:

```markdown
## Usage Report

| Entry | Times Referenced | Last Used | Verdict |
|-------|-----------------|-----------|---------|
| ai-then-heuristic-fallback | 4 | 2026-03-02 | ACTIVE — core pattern |
| prompt-registry-single-source | 3 | 2026-03-02 | ACTIVE |
| [unused-entry] | 0 | never | UNUSED — consider removing |
```

### 4. Issue-to-Rule Promotion Check
Scan `knowledge/issues/` for patterns that should graduate to rules:

**Promotion criteria** (any TWO of these):
- The same class of issue has occurred 2+ times
- The issue has a clear, automatable prevention rule
- The prevention is broadly applicable (not a one-off edge case)

```markdown
## Promotion Candidates

| Issue | Occurrences | Proposed Rule | Target File |
|-------|-------------|---------------|-------------|
| duplicate-error-utility | 2 (review + strict-review) | "Never define getErrorMessage locally" | coding-standards.md |
| missing-directive | 2 (review + retro) | "Always add the required framework directive on hook-using components" | <your generated frontend-framework rule> |
```

### 5. Cross-reference validation
Run `node ai-framework/scripts/graphify.js --check --json` and use its report directly instead of
re-deriving this by hand — it already computes:
- Orphaned entries (no `related`/`[[wiki-links]]` and no `tags`)
- Broken links (a `related`/wiki-link target that doesn't resolve to any known entry id)
- Duplicate ids
- Frontmatter `type` that doesn't match its folder

That leaves judgment calls for you: missing links (entries that *should* be related but aren't —
the script can't infer intent) and circular dependencies (not itself a problem, but worth noting
if the loop obscures which entry is authoritative).

### 6. Tag coverage
Check that tags are consistent and cover the codebase:
```markdown
## Tag Distribution
| Tag | Count | Coverage |
|-----|-------|----------|
| backend | 8 | Good |
| frontend | 4 | Could use more patterns |
| auth | 3 | Good |
| testing | 0 | GAP — no test-related knowledge yet |
| ai | 5 | Good |
| error-handling | 2 | Good |
```

### 7. Generate recommendations

```markdown
## Health Summary

### Score: [Good / Needs Attention / Critical]

### Actions Recommended
1. **Remove** [stale-entry] — referenced files no longer exist
2. **Promote** [issue-name] to rule in [rule-file] — recurring pattern
3. **Update** [entry-name] — related links broken
4. **Add** test-related knowledge — gap in coverage
5. **Link** [entry-a] ↔ [entry-b] — should be related

### Stats
- Healthy entries: N / M total (N%)
- Stale entries: X
- Unused entries: Y
- Promotion candidates: Z
- Broken links: W
```

### 8. Update usage log
Create/update `knowledge/meta/usage-log.md`:
```markdown
# Knowledge Usage Log

| Date | Audit | Healthy | Stale | Unused | Promoted |
|------|-------|---------|-------|--------|----------|
| 2026-03-02 | Full | 18/21 | 1 | 2 | 0 |
```

## Confirmation Gate

```
Knowledge health audit complete.

Score: [Good / Needs Attention / Critical]
- N healthy, X stale, Y unused
- Z entries recommended for promotion to rules

Actions:
1. Apply recommended changes (remove stale, promote, fix links)
2. Review individual entries before changing
3. Skip — just wanted the report
```

