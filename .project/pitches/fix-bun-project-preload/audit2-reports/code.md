# Code review: Bun isolation / parse-check fix

## How this review was run

- Read the changed source files listed in the worker task plus `contract/expected.md`, `ai-framework/rules/coding-standards.md`, `ai-framework/rules/boundaries.md` and `.claude/agents/code-reviewer.md`.
- Ran each named `.test.mts` file one at a time with:
  `node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>`.
- Did not modify any repository file.

## Findings

### 1. must-fix — `ai-framework/scripts/setup-validator.mts:303`

**Rule violated:** `contract/expected.md` item 3:

> Unparsed files (under Bun, or a Node without `module.stripTypeScriptTypes`) give a `warn` "not parse-checked" result with a count. They are never counted or shown as parsed, also in JSON and in the validator's summary of the doctor.

**Concrete failure:** When the Node parser child exits with code `3` (no `module.stripTypeScriptTypes`), the validator correctly records the warning at line 301, but then counts that same file as "parsed" at line 303 because the filter is `result.code !== 1`:

```typescript
const unparsed = outcomes.filter(({ result }) => result.code === 3).length;
if (unparsed > 0) record("warn", "TypeScript entries", `${unparsed} file(s) not parse-checked: this Node has no module.stripTypeScriptTypes`);
const parsed = outcomes.filter(({ result }) => result.code !== 1).length;
if (parsed > 0) record("pass", "TypeScript entries", `${parsed} TypeScript file(s) parse`);
```

A file that exits `3` therefore produces both a `warn` and a `pass` line. In JSON output the `pass` line claims the file was parsed, which the contract explicitly forbids. The same filter also counts any non-syntax error (e.g. a killed child or spawn failure with `code: null`) as parsed.

**Command / output:**

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
```

```
✖ validator warns for old Node and counts only parsed files (0.948583ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    [
      {
        detail: '1 file(s) not parse-checked: this Node has no module.stripTypeScriptTypes',
        name: 'TypeScript entries',
        status: 'warn'
      },
  +   {
  +     detail: '1 TypeScript file(s) parse',
  +     name: 'TypeScript entries',
  +     status: 'pass'
  +   }
    ]
```

**Fix:** Count only `result.code === 0` as parsed, e.g.:

```typescript
const parsed = outcomes.filter(({ result }) => result.code === 0).length;
```

This keeps the warning line, removes the spurious pass line for unparsed files, and matches the existing test expectation.

---

### 2. unverified — `ai-framework/hooks/scripts/pre-ship-verify.test.mts:486`

**Rule violated:** N/A (test environment limitation, not a code defect).

**Concrete failure:** `pre-ship-verify.test.mts` contains a bundle-only test that loads `.project/context/checks.toon`. The review work folder does not contain a `.project/` directory, so `loadManifest` returns `null` and the test fails with `actual: undefined`.

**Command / output:**

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/pre-ship-verify.test.mts
```

```
✖ this repository's own manifest loads (0.851167ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + undefined
  - [ [ 'tests', true, 600000 ], ... ]
```

This is not a bug in `pre-ship-verify.mts`; it is an unverified test because the required project manifest is absent from the review copy.

---

### 3. unverified — `ai-framework/scripts/orca-eval-grader.test.mts:169`

**Rule violated:** N/A (test environment limitation, not a code defect).

**Concrete failure:** `orca-eval-grader.test.mts` tries to grade the case `opencode-agent-id-resolves-from-installed-agents` from `.project/evals/datasets/orca-vendor-orchestration.json`. That dataset file is bundle-only data and is not present in the review work folder, so `gradeAll` returns no cases and the test fails.

**Command / output:**

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-eval-grader.test.mts
```

```
✖ opencode-agent-id-resolves-from-installed-agents (1.97475ms)
  AssertionError [ERR_ASSERTION]: case opencode-agent-id-resolves-from-installed-agents graded
```

The broader dataset-dependent tests are skipped for the same reason (`# the Orca grader dataset is bundle-repo data`). This case is unverified because the dataset fixture is missing.

---

## Tests run and results

| File | Result |
|------|--------|
| `ai-framework/scripts/runtime/entry.test.mts` | pass (14/14) |
| `ai-framework/scripts/runtime/runtime.test.mts` | pass (62/62) |
| `ai-framework/hooks/scripts/pre-ship-verify.test.mts` | 27/28 pass; 1 unverified (missing `.project/context/checks.toon`) |
| `ai-framework/scripts/orca-run.test.mts` | pass (37/37) |
| `ai-framework/scripts/orca-eval-grader.test.mts` | 8/19 pass; 10 skipped (missing dataset); 1 unverified (missing dataset) |
| `ai-framework/scripts/setup-validator.test.mts` | 45/46 pass; 1 fail (parsed-count bug) |
| `ai-framework/scripts/workflow-doctor.test.mts` | pass (92/92) |

## Review summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 0 |
| acknowledged | 0 |
| unverified (missing fixtures) | 2 |

**Verdict: BLOCK** — one must-fix finding in `setup-validator.mts` violates the contract that unparsed files must not be reported as parsed.
