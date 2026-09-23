---
name: fix
description: Bug fix with shortened workflow. Searches knowledge for similar issues, skips Analyze and Design phases. Use for known bugs with clear reproduction steps.
---

# /fix — Bug Fix (Shortened Workflow)

> **Recommended capability profile:** use `fast` for a simple bug with a clear reproduction; use `standard` for an unknown root cause or multi-file fix. Select an available model using `ai-framework/integrations/harnesses.md`.

You are using the **SHORTENED** workflow for bug fixes.

## Workflow
```
Request → Develop → Review → Test → Finish
```
(Skips Analyze and Design phases)

## Agent Recommendations

Consider delegating to specialized agents when conditions match:

| Condition | Agent | Profile | Why |
|-----------|-------|---------|-----|
| Unknown root cause, architectural issue | `architect` | deep | Trace systemic root cause |
| Dead code or unused imports after fix | `refactor-cleaner` | fast | Safe cleanup |
| Build/type errors after fix | `build-error-resolver` | standard | Minimal diff to get build green |

Agents are advisory — use your judgment on whether to invoke.

## Context Budget
This workflow should be lightweight:
- Knowledge search for similar issues (~1K tokens)
- Affected files only
- Minimal rules (scalable-reviewer, boundaries)

## Steps

### 1. Request (Quick)
- Understand the bug description
- Ask for reproduction steps if not provided
- **Search knowledge/issues/ for similar problems** (NEW)
- Search codebase for the affected code
- Identify root cause

If similar issue found in knowledge/:
```markdown
Found similar issue: [issue name]
- Previous root cause: [...]
- Previous solution: [...]

Does this look related?
```

### 2. Develop (Fix)
- Read relevant coding rules from `ai-framework/rules/`
- Apply `ai-framework/rules/coding-standards.md` in strict mode
- **Verify boundaries** — fix should be in correct layer (NEW)
- Implement the minimal fix
- Don't refactor surrounding code

### 3. Review (Self-Check)
- Verify fix doesn't break existing functionality
- Check against coding standards
- **Check boundaries respected** (NEW)
- Run the strict review checklist from `coding-standards.md`
- **Run your project's full build command** to catch lint/type errors invisible in dev mode
- Fix any unused imports/vars, untyped `any`-equivalents, or missing hook/effect deps before
  proceeding
- Ensure error handling is adequate

### 4. Test
- Add/update tests to cover the bug scenario
- Run your project's test command to verify no regressions
- Test edge cases related to the bug

### 5. Finish
- Update documentation if needed
- **Offer to add to knowledge/issues/** (NEW)
- **Offer to run `/retro`** — extract the lesson, classify root cause, optionally update rules/
- Ask the user what to do next

## Update Status

**Update** `.project/status.md`:

```markdown
# Workflow Status

## Tasks
| Task | Phase | Status | Priority | Updated |
|------|-------|--------|----------|---------|
| fix-[bug-name] | fix | active | high | [today] |

## Current Focus: fix-[bug-name]

### Phase: Fix (Sub-phase: request)
- [ ] Bug understood
- [ ] Knowledge searched for similar issues
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Review passed
- [ ] Tests added
- [ ] Finish complete

### Bug Description
[What's broken]

### Reproduction Steps
[How to reproduce]

### Similar Issues Found
[From knowledge/issues/ or "None found"]

### Root Cause
_Investigating..._

### Files Modified
[Update as you fix]

### Next Step
Understand the bug and identify root cause.
```

Update `Sub-phase` as you progress: request → develop → review → test → finish.

## Session Logging

Log to `.project/runs/YYYY-MM-DD-fix-[bug-name].jsonl`:

```jsonl
{"type":"session-start","timestamp":"...","feature":"fix-[name]","workflow":"fix","model_used":"sonnet"}
{"type":"phase-start","timestamp":"...","phase":"fix","sub_phase":"request"}
{"type":"knowledge-search","timestamp":"...","query":"similar issues","found":"issue-x"}
{"type":"root-cause","timestamp":"...","description":"...","file":"..."}
{"type":"phase-start","timestamp":"...","phase":"fix","sub_phase":"develop"}
{"type":"file-modified","timestamp":"...","path":"...","change":"..."}
{"type":"phase-end","timestamp":"...","phase":"fix","sub_phases_completed":5,"agents_invoked":[]}
{"type":"session-end","timestamp":"...","outcome":"completed","add_to_knowledge":true}
```

## Confirmation Gates

Even in the shortened workflow, **every step requires user confirmation**:

1. After **Request**: confirm bug understanding and root cause before fixing
2. After **Develop**: confirm the fix looks correct before reviewing
3. After **Review**: confirm review results before testing
4. After **Test**: confirm test results before finishing
5. After **Finish**: confirm and offer to add to knowledge/issues/

At each gate, offer: Approve / Revise / Back / Stop.

## Knowledge Integration (NEW)

### Before Fixing
Search `knowledge/issues/` for:
- Similar bugs
- Related root causes
- Solutions that worked

### After Fixing
Offer to add to knowledge:
```markdown
This bug fix could help in the future.

Would you like to add it to knowledge/issues/?
- Root cause: [...]
- Solution: [...]
- Prevention: [...]

[Yes / No]
```

## When NOT to Use /fix

Use the full workflow instead if:
- Bug requires schema/data model changes
- Multiple components are affected
- Root cause is unclear (needs analysis)
- Architectural refactoring is needed
- The fix is larger than ~50 lines of changes

## Output
- Bug fixed with minimal, focused changes
- Boundaries respected
- Test covering the bug scenario
- Knowledge updated (if accepted)
- Session logged

## See Also
- `/retro` — run after fix to extract lessons and optionally update rules
