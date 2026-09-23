---
name: impact
description: Impact analysis before development. Scans the codebase to identify files, tests, patterns, and downstream consumers affected by planned changes. Run between /design and /develop.
---

# /impact — Impact Analysis

> **Recommended capability profile:** `fast` — repository/dependency-graph scan, mechanical blast-radius mapping. Select an available model using `ai-framework/integrations/harnesses.md`.

> Run between `/design` and `/develop` to understand the blast radius of planned changes.

You are in the **IMPACT ANALYSIS** phase.

## Your Goal
Before writing code, systematically identify every file, test, consumer, and pattern that will be affected by the planned changes. This prevents surprises during `/review` and reduces rework.

## When to Run
- **Recommended**: After `/design` is approved, before starting `/develop`
- **Required**: When the design plan modifies 5+ existing files or touches shared code
- **Optional**: For small changes confined to a single feature folder

## Context Budget
~5K tokens:
- Approved design plan (from `.project/design/plans/`)
- `ai-framework/rules/boundaries.md` (import matrix)
- File list from design plan (the "Files to Create/Modify" table)

## Steps

### 1. Load the design plan
Read the approved design plan and extract:
- Files to create (new)
- Files to modify (existing)
- Schema changes (if any)

### 2. Trace downstream consumers
For each **modified** file, search for:
- **Direct imports**: `grep -r "from.*[file]"` across the codebase
- **Re-exports**: Check if the file is re-exported via `index.ts` barrel files
- **Type consumers**: If types/interfaces change, find all consumers of those types
- **Test files**: Find existing tests for each modified file

Present as a dependency table:

```markdown
### Downstream Impact

| Modified File | Consumers | Tests | Risk |
|---|---|---|---|
| `<backend-workspace>/schema.<ext>` | N query/mutation files | `schema.test.<ext>` | HIGH — schema change affects all backend handlers |
| `lib/sessions/desempeno.ts` | 3 components, 1 hook | `desempeno.test.ts` | LOW — utility, no interface change |
| `components/features/sessions/index.ts` | 2 page files | none | MED — barrel re-export, verify named exports |
```

### 3. Check boundary violations
For each **new** file, validate:
- Correct layer placement per `boundaries.md`
- No planned cross-feature imports
- Import direction follows the dependency rule (inward only)

```markdown
### Boundary Check

| New File | Layer | Imports From | Valid? |
|---|---|---|---|
| `components/features/sessions/insight-card.tsx` | feature | `@/lib/sessions`, `@/hooks` | YES |
| `lib/ai/agents/feedback-agent.ts` | lib | `<backend-workspace>/client` | YES |
```

### 4. Identify affected tests
Search for test files that cover the modified code:

```markdown
### Tests to Update/Verify

| Test File | Covers | Action Needed |
|---|---|---|
| `lib/sessions/__tests__/desempeno.test.ts` | desempeno.ts | Verify — interface unchanged |
| `<backend-workspace>/__tests__/sessions.test.<ext>` | sessions.<ext> | UPDATE — new mutation added |
| (none) | insight-card.tsx | CREATE — new component needs tests |
```

### 5. Check knowledge graph for relevant warnings
Search `knowledge/issues/` for entries tagged with the same areas:
- Any known gotchas for the files being modified?
- Any patterns that should be applied?

```markdown
### Knowledge Alerts

| Entry | Relevance |
|---|---|
| `issues/missing-use-client-directive` | New client components — ensure `"use client"` is explicit |
| `patterns/ai-then-heuristic-fallback` | AI agent changes — preserve fallback chain |
```

### 6. Risk summary

```markdown
### Impact Summary

- **Files affected (direct)**: N modified + M new
- **Files affected (downstream)**: K consumers found
- **Tests to update**: X existing + Y to create
- **Boundary violations**: 0 found / N checked
- **Knowledge alerts**: Z relevant entries
- **Risk level**: LOW / MEDIUM / HIGH

### Recommendation
[Specific advice: development order, what to test first, which files are highest risk]
```

## Output
Impact analysis document appended to the design plan or presented inline.

## Confirmation Gate

```
Impact Analysis complete.

- Direct files: N modified, M new
- Downstream consumers: K affected
- Tests: X to update, Y to create
- Risk level: [LOW/MEDIUM/HIGH]

Options:
1. Proceed to /develop
2. Revise the design plan (impact revealed issues)
3. Stop — need to discuss risk
```

**Do not proceed to /develop until the user acknowledges the impact.**

## Update Status

Append to `.project/status.md`:
```markdown
### Impact Analysis
- [x] Design plan loaded
- [x] Downstream consumers traced
- [x] Boundary violations checked
- [x] Tests identified
- [x] Knowledge alerts surfaced
- Risk level: [LOW/MEDIUM/HIGH]
```

## Session Logging

```jsonl
{"type":"phase-start","timestamp":"...","phase":"impact"}
{"type":"impact-trace","timestamp":"...","modified_files":N,"new_files":M,"downstream_consumers":K}
{"type":"boundary-check","timestamp":"...","violations":0,"checked":N}
{"type":"test-check","timestamp":"...","existing":X,"to_create":Y}
{"type":"knowledge-alerts","timestamp":"...","count":Z}
{"type":"phase-end","timestamp":"...","phase":"impact","risk_level":"LOW|MEDIUM|HIGH"}
```
