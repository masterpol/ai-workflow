# Testing Rules

**This file ships stack-agnostic on purpose.** It describes the testing *philosophy* this
workflow expects; it does not prescribe a runner, mocking library, or file layout — those are
detected and written up by `/setup` (or your own conventions) into a project-specific testing
guide, e.g. `.project/context/stack.md` or a generated `testing-conventions.md`.

## The Testing Rule: Test as You Build

Every feature delivery includes tests. Not after. Not "we'll add them later." Tests are part of
the definition of done.

## What Gets Tested — Decision Matrix

| Code Type | Test? | Why |
|-----------|-------|-----|
| Business-logic mutations/handlers (create, update, delete) | Always | Correctness, authorization, data integrity |
| Read queries with filtering/transformation | Always | Data access correctness |
| Trivial pass-through reads (simple `.get()` by id) | Skip | Framework handles it, no branching logic |
| Auth/authorization helpers | Always | Security-critical |
| Validation schemas | Always | Form/input correctness |
| Custom hooks or composables with real state logic | Always | State transitions, edge cases |
| Hooks that just wrap a data-fetch call with no logic | Skip | Trivial wrapper |
| Container/data-fetching components | Light test | Verify loading/error/empty states render |
| Presentation components (props → UI) | Always | Conditional rendering, prop variations |
| Thin route/page wrappers (pure composition) | Skip | Covered by E2E instead |
| Pure utility functions | Always | Cheap, high value |
| Third-party/vendor UI components | Never | Tested upstream |

## File Organization

Tests live next to what they test, in `__tests__/` folders or co-located as `*.test.ts(x)` —
follow whatever convention your project's test runner already uses. Don't invent a second
convention.

## Naming Convention

```
describe("<UnitName>", () => {
  test("<does the thing>", () => { ... })
})
```

- `describe`: component or function name
- `test`: plain English, starts with a verb (renders, shows, hides, throws, returns, rejects)
- Don't prefix with "should" or "it should"

## Mocking Discipline

- Check for an existing shared mock/fixture factory before writing an inline mock.

## Guards and Fixes

These clauses were promoted from recurring pitch deviations; each is keyed to a knowledge
entry under `.project/knowledge/` and supersedes ad-hoc handling.

- **Event units for completion evidence.** Hooks count completions by the lifecycle unit the
  hook declares (e.g. `SubagentStop`, request completion). A hook that fires at *launch*
  (lifecycle event fired before work is done) cannot count as a completion. Async-agent
  launch events are recorded as model notes, never as completion rows; the matching
  `SubagentStop` or completion event is what counts. See
  `.project/knowledge/issues/async-agent-launch-hook-counted-as-completion.md`.
- **macOS tmpdir realpath.** `os.tmpdir()` resolves through `/private/var` on macOS.
  Helpers that hand callers a path (fixtures, scratch dirs, output files) MUST keep the
  `mkdtempSync` result for `existsSync`/`statSync` checks. Callers that need the symlink-
  resolved form must opt in explicitly (`{ resolve: true }`); the default keeps the alias so
  exact-path assertions stay meaningful. See
  `.project/knowledge/issues/macos-tmpdir-realpath-alias-breaks-path-assertions.md`.
- **Prove a guard test with an in-memory mutant.** A guard test's value is the proof that it
  actually guards: run it against an in-memory mutation of the thing it claims to catch and
  confirm the test fails for the right reason. A guard test that passes against a planted
  mutant has not earned its keep. See
  `.project/knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md`.
- **Schema bumps move with their dependents.** Bumping a schema or config version constant
  changes the emitter, the reader's refusal text/regex, any migrator and every fixture literal
  in the same commit (`grep -rn "schemaVersion: <old>"`). Run the whole suite before marking the
  scope done; a scope closed with a red suite hands the red to the next pitch. See
  `.project/knowledge/issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version.md`.
- Only write inline mocks when the test needs custom behavior (specific return values, spy
  references).
- When 2+ tests need the same mock, promote it to a shared factory.
- If your test runner treats identifiers starting with `use` as hooks (common with
  `eslint-plugin-react-hooks`), never name a mock variable `useXxx` — it will pattern-match as a
  hook call and produce lint/build failures that don't show up when just running tests. Use
  `xxxMock` or `mockedXxx` instead.

## Verification Discipline: a green build is evidence of nothing specific

A passing build, a passing typecheck, or a passing lint each proves only what that specific tool
checks — never assume any of them incidentally validates something they don't actually inspect.
This shows up repeatedly, in different forms, in the same family of mistake:

- A build tool that transpiles but doesn't type-check will happily emit working output from code
  with real type errors in it.
- A mock/alias substitution mechanism (a module alias, a dependency-injection override, an
  environment-based swap) can be misconfigured in a way that's invisible to a build — the build
  still succeeds, it just bundles or calls the *real* implementation instead of your mock, with no
  error at any stage.
- A merge/override utility for build config (aliases, environment, plugin lists) can silently keep
  a pre-existing entry ahead of one you just added, regardless of the declared order in your own
  override — reviewing your own source's ordering proves nothing about the tool's actual resolved
  order.

**When you add or change a mock, alias, or build-config override meant to redirect one
implementation to another, verify with evidence that the redirection actually took effect at
runtime — not just that the build exited 0.** Concretely: add a temporary, unique marker (a string
literal, a distinguishing log line) inside the mock/override, rebuild, and grep the actual output
artifact (bundle, compiled file) for that marker AND for a signature unique to the real
implementation you meant to replace (an import name, a distinctive symbol). Remove the marker once
confirmed. A clean build or a passing type check is necessary but never sufficient evidence for
this class of change.

## Coverage Targets (starting point — adjust per project)

- Utilities: 90%+
- Hooks/composables: 80%+
- Components: 70%+
- Business-logic handlers: 80%+

## Guards and Fixes: Prove the Test Can Fail

Promoted at the 2026-09-25 cooldown: mutation checks found real test gaps in four pitches, and one
cycle-1 fix introduced a data-loss regression that only a re-review of the fix caught.

- ✅ For every security guard or bound, remove or loosen it once and confirm a test fails. Record
  survivors: a survivor is either a missing test or a redundant layer, and the record says which.
- ✅ Re-verify a reviewer's claim with one command before it enters triage (a name, a line, a
  percentage). A short "clean" review is an unreviewed area, not a pass.
- ✅ After a fix, re-review the fix. Trace a change to a shared helper through every caller.
- ✅ Give long-running review agents hard limits (command time, tool-call budget); a stalled agent
  leaves no partial findings.

## Testing Checklist for New Features

- [ ] Each guard or bound has a test that fails when it is removed
- [ ] Fixes to shared helpers were traced through all callers
- [ ] Unit tests for utility functions
- [ ] Validation schema tests
- [ ] Component render tests (all prop variations, conditional rendering)
- [ ] User interaction tests (click, type, submit)
- [ ] Authorization paths tested (happy path + rejection)
- [ ] Edge cases (empty state, error state, loading state)
- [ ] Accessibility (role queries, labels)

## E2E Scope

Reserve end-to-end tests for critical user journeys (auth, core happy path, payment/checkout if
applicable) — not for coverage padding. Unit + component tests should cover everything else.
