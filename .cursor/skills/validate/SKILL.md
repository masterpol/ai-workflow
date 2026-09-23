---
name: validate
description: Quick self-check between /develop and /review. Runs TypeScript, boundary checks, size limits, and import validation. Catches obvious issues before the full review phase.
---

# /validate — Pre-Review Self-Check

> **Recommended capability profile:** `fast` — deterministic mechanical checks (typecheck, boundaries, size, imports). Select an available model using `ai-framework/integrations/harnesses.md`.

> Run after `/develop`, before `/review`. Catches mechanical issues so `/review` can focus on logic and design quality.

You are in the **VALIDATE** phase — a fast automated gate.

## Your Goal
Run a quick battery of automated checks on the files changed during `/develop`. Fix anything that would fail in `/review` before getting there.

## When to Run
- **Automatically suggested**: After `/develop` completes
- **Manually**: Any time you want to check code quality before review
- Skip for trivial changes (single-line fixes, i18n key additions)

## Context Budget
~3K tokens:
- List of files changed (from `status.md` or git diff)
- `ai-framework/rules/boundaries.md`
- `ai-framework/rules/coding-standards.md` (size limits)

## Checks

### 1. Type/Compile Check
Run your project's type-check or build-check command (see `.project/context/stack.md`):
```bash
<typecheck-command> 2>&1 | head -50
```
- **Pass**: 0 errors
- **Fail**: List errors by file, fix before proceeding

### 2. File Size Limits
Per `coding-standards.md` (adjust the table to whatever your project's own generated rule says):

| File Type | Max Lines |
|---|---|
| Route/page entry file | 50 |
| Component | 150 |
| Hook/composable | 100 |
| Utility | 80 |
| Backend handler/mutation | 200 |

Check each changed file against its limit.

### 3. Import Boundary Violations
Per `boundaries.md`, verify:
- No outward imports (feature → feature, shared → feature)
- No deep imports bypassing barrel files
- No feature module importing directly from a sibling feature module

### 4. Complexity Quick-Check
Flag files with:
- More than 5 local state declarations
- More than 3 side-effect/lifecycle hooks
- More than 7 props in a component
- Nested ternaries deeper than 1 level

### 5. i18n Hardcoded Strings (skip if the project is single-locale)
Scan changed UI files for hardcoded user-facing strings:
- Strings inside markup that aren't wrapped in the project's translation function
- Exclude: className/CSS-class strings, test ids, aria attributes with valid values

### 6. Auth Guard Check (backend files only)
For any modified mutation/handler that touches user data:
- Verify an auth check is present
- Verify queries are scoped by user/org

## Output Format

```markdown
## Validate Results

| Check | Status | Details |
|---|---|---|
| Type/compile check | PASS | 0 errors |
| File sizes | WARN | `data-grid.<ext>` is 142/150 lines (close to limit) |
| Boundaries | PASS | No violations in 8 files |
| Complexity | PASS | All within limits |
| i18n | FAIL | 2 hardcoded strings in `insight-card.<ext>` |
| Auth guards | PASS | All mutations have auth |

### Issues to Fix (before /review)
1. `insight-card.<ext>:34` — hardcoded "No data available" → use translation key `insights.emptyState`
2. `insight-card.<ext>:67` — hardcoded "Loading..." → use translation key `common.loading`

### Warnings (review will check)
- `data-grid.<ext>` at 142 lines — consider splitting if it grows

### Verdict: FIX 2 issues, then proceed to /review
```

## Auto-Fix
For simple issues (hardcoded strings, missing framework-required directives), offer to fix them:

```
Found 2 fixable issues. Should I auto-fix?
1. Yes — fix and re-validate
2. No — I'll fix manually
```

## Confirmation Gate

```
Validate complete: [N passed, M warnings, K failures]

Options:
1. Proceed to /review (all clear or warnings only)
2. Fix issues first (failures found)
3. Back to /develop (need more changes)
```

## Update Status

Append to `.project/status.md`:
```markdown
### Validate
- TypeScript: PASS
- File sizes: PASS (1 warning)
- Boundaries: PASS
- Complexity: PASS
- i18n: FIXED (2 strings wrapped)
- Auth guards: PASS
```

## Session Logging

```jsonl
{"type":"phase-start","timestamp":"...","phase":"validate"}
{"type":"check","timestamp":"...","name":"typescript","status":"pass","errors":0}
{"type":"check","timestamp":"...","name":"file-sizes","status":"warn","details":"student-grid.tsx 142/150"}
{"type":"check","timestamp":"...","name":"boundaries","status":"pass","files_checked":8}
{"type":"check","timestamp":"...","name":"i18n","status":"fail","hardcoded_strings":2}
{"type":"auto-fix","timestamp":"...","file":"insight-card.tsx","fixes":2}
{"type":"phase-end","timestamp":"...","phase":"validate","passed":5,"warnings":1,"failures":0}
```
