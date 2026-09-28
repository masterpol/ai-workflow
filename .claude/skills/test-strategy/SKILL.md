---
name: test-strategy
description: Smart test planning and writing. Reasons through the right test types before writing. Enforces behavior tests over render-only tests. Use during /build when a scope needs new tests.
---

# /test-strategy — Smart Testing

> **Recommended capability profile:** `fast` for focused test planning; escalate to `standard` for ambiguous behavior or integration risk. Select an available model using `ai-framework/integrations/harnesses.md`.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

You are in the **TEST STRATEGY** phase.

## Your Goal
Write tests that actually fail when the feature breaks. Strategy first, implementation second. No render-only noise.

## Context Budget
~5K tokens:
- Changed files (from Develop phase)
- `ai-framework/rules/testing.md`
- 1–2 existing test files for pattern reference

---

## The Core Rule

**A test that only checks `render()` without crashing is not a test — it is noise.**

Every component, hook, and function must have at least:
- One test of actual behavior (interaction, transformation, or side effect)
- One error / edge case test (empty data, invalid input, loading state, network error)

---

## Test Type Decision Matrix

| What you're testing | Correct test type | When to use |
|---|---|---|
| Pure function / transformer / util | **Unit** | Always — no side effects, deterministic |
| Validation schema | **Unit** | Input → valid / invalid outcomes |
| Custom hook/composable with state/effects | **Hook test** | Tests hook logic isolated from UI |
| Component with user interactions | **Integration** | Tests real behavior, not implementation |
| Backend query/mutation handler | **Handler test** | Validates the data contract |
| Feature spanning multiple pages | **E2E** | Full user journey, real navigation |
| Visual appearance / CSS | **Skip** | Too fragile, too expensive |
| Vendor/third-party component internal behavior | **Skip** | Not your code |

(Substitute your project's actual test runner and E2E tool — see `.project/context/stack.md`.)

### When to write E2E tests (be selective)
Only write end-to-end tests for:
- Critical user journeys where broken = severe user impact (login, checkout, onboarding)
- Flows that cross multiple pages or require real network state
- Flows that cannot be reasonably tested with mocks

Do NOT write E2E tests for:
- Single-page interactions (use a component/integration test instead)
- "Does the button appear?" type checks
- Anything already covered by unit/integration tests

---

## Anti-Patterns — Do Not Write These

```
// ❌ BANNED — pure render test (no behavior verified)
it("renders without crashing", () => {
  render(<Card item={mockItem} />);
  expect(document.body).toBeTruthy();
});

// ❌ BANNED — snapshot test for UI (too brittle, breaks on every style change)
it("matches snapshot", () => {
  const { container } = render(<Card />);
  expect(container).toMatchSnapshot();
});

// ❌ BANNED — testing implementation details
it("calls the state setter with the right initial value", () => { ... });

// ❌ BANNED — raw DOM selector queries (use test ids or accessible/role queries)
expect(document.querySelector(".card")).toBeTruthy();
```

---

## Steps

### 1. Load transition summary
Read `status.md` — understand what was built and which files changed.

### 2. Read testing rules
Load `testing.md`.

### 3. Strategy pass
For each changed file that needs tests, reason through what to test:
1. What are the critical behaviors that must work correctly?
2. What is the right test type for each behavior (unit/hook/integration/handler/playwright)?
3. What edge cases would a bug likely hide in?

Do NOT plan render-only tests or snapshot tests. Use this reasoning to build your test plan.

### 4. Build and present test plan
Before writing a single test, produce this table and get approval:

```markdown
| File | Behavior to test | Test type | Test file |
|------|-----------------|-----------|-----------|
| Card.<ext> | Clicking delete calls onDelete with correct id | Integration | __tests__/Card.test.<ext> |
| Card.<ext> | Shows confirmation dialog before deleting | Integration | __tests__/Card.test.<ext> |
| Card.<ext> | Shows loading skeleton when item=undefined | Integration | __tests__/Card.test.<ext> |
| useItemStatus.<ext> | Returns "active" when startedAt set and endedAt null | Hook | __tests__/useItemStatus.test.<ext> |
| lib/formatDuration.<ext> | Formats 90 seconds as "1:30" | Unit | __tests__/formatDuration.test.<ext> |
| lib/formatDuration.<ext> | Returns "0:00" for 0 seconds | Unit | __tests__/formatDuration.test.<ext> |
| lib/formatDuration.<ext> | Handles negative input gracefully | Unit | __tests__/formatDuration.test.<ext> |
```

### 5. Get approval on the test plan
Confirm before writing:
- No pure render-only tests in the plan
- Each changed file has at least one behavior test + one edge case
- E2E tests only for genuinely critical journeys

### 6. Write the tests
Following patterns from `testing.md`:
- Tests in `__tests__/` folders next to source, or co-located as `*.test.<ext>`
- Verb-first test names: `"renders loading skeleton when item is undefined"`
- Mock at module level (not inside tests), using your test runner's mocking syntax (e.g.
  `vi.mock(...)` in Vitest, `jest.mock(...)` in Jest)
- Select elements with `getByRole`, `getByLabelText`, `getByTestId` — never `querySelector`
- Use `data-testid` sparingly, prefer accessible queries

### 7. Run tests
```bash
<test-command>
```

Fix failures. If a test fails because the code has a genuine bug — fix the code, not the test. If a test is asserting the wrong thing — discuss with the user before removing it.

### 8. Check coverage
```bash
<test-command> --coverage
```

Coverage targets (fail if not met):
- Utilities: ≥ 90%
- Hooks: ≥ 80%
- Components: ≥ 70%
- Backend handlers: ≥ 80%

## Output Format

```markdown
## Test Strategy: [Feature Name]

### Test Plan (approved)
[table: File | Behavior | Type | Test file]

### Tests Written
- `__tests__/ComponentName.test.<ext>` — N tests (integration)
- `__tests__/useHookName.test.<ext>` — N tests (hook)
- `__tests__/utilName.test.<ext>` — N tests (unit)

### Test Results
- Passed: N
- Failed: 0
- Skipped: N

### Coverage
| Area | Before | After | Target | Pass? |
|------|--------|-------|--------|-------|
| Utilities | 82% | 94% | 90% | ✅ |
| Components | 61% | 73% | 70% | ✅ |

### Anti-patterns Avoided
- [x] No render-only tests
- [x] No snapshot tests
- [x] No implementation detail tests

### E2E Tests
[List or "None — no cross-page journeys in this feature"]
```

## Record

Put the approved test plan under the scope's section in `plan.md` and add its test commands to that scope's exit criteria — `status.md` stays an index.

## Confirmation Gate

1. ✓ **Approve** — all tests pass, coverage met, return to the scope in `/build`
2. ↻ **Revise** — add more coverage or address failures
3. ← **Back** — log the bug to `log.md` and fix it within the current `/build` scope
4. ✕ **Stop** — pause

**Do not proceed until all tests pass and all coverage targets are met.**

## What's Next
After tests pass, run the scope's exit criteria and continue `/build`; coverage is re-checked by `test-coverage-checker` in `/audit`.
