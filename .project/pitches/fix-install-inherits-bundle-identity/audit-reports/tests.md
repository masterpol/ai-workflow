# Test-coverage audit: fix-install-inherits-bundle-identity

## Checklist / walk-through

### 1. Run `setup-validator.test.mts`

Command:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
```

Result: **FAIL** — 29 pass, 1 fail.

The new regression test added by this change fails in the scratch copy:

```
✖ an install that kept the bundle's own project specifics fails; the bundle checkout itself passes
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  1 !== 0
      at TestContext.<anonymous> (.../setup-validator.test.mts:193:10)
```

### 2. Root cause of the failing regression test

**Severity: must-fix**
**File: `ai-framework/scripts/setup-validator.mts:139`**
**Rule violated: ai-framework/rules/testing.md — “Prove a guard test with an in-memory mutant” / every guard must have a test that fails when removed; also “A guard test that passes against a planted mutant has not earned its keep.”**

The implementation checks the wrong file to detect an installed project:

```ts
// setup-validator.mts:138-140
// Same test as the doctor: only the bundle checkout has SETUP.md at its root, so elsewhere the bundle's sentence was copied.
const install = !(await exists("README.md"));
const inherited = (content: string): boolean => install && content.includes(BUNDLE_IDENTITY);
```

The comment says the detector is “only the bundle checkout has SETUP.md,” but the code checks `README.md`. In the same file, `workflow-doctor.mts:1038` uses `await exists(absolute("SETUP.md"))` for the same purpose, so this is an inconsistency, not a deliberate design.

**Concrete failure scenario:**

- The new test at `setup-validator.test.mts:192` constructs a fake bundle checkout by adding `SETUP.md` to the in-memory file store:
  ```ts
  const bundle = makeDeps({ ...files, "SETUP.md": "# Setup\n" }, healthy);
  assert.equal(await main(["--no-color"], bundle.deps, libs), 0);
  ```
- Because the in-memory store has no `README.md`, `install` is `true`, the bundle-identity sentence is still present, and the validator fails (exit 1) instead of passing.
- A real installed project that **does** have a `README.md` would be treated as the bundle checkout (`install = false`) and the inherited-identity check would be skipped entirely — the bug this pitch is meant to fix would still pass silently.

**What I tried:** I re-read the doctor’s bundle-detection logic and confirmed it uses `SETUP.md`. I ran only `setup-validator.test.mts` and the failure reproduced consistently. I did not mutate the source because this is a read-only review.

### 3. New tests in `setup-validator.test.mts`

#### 3a. “an install that kept the bundle's own project specifics fails; the bundle checkout itself passes” (`setup-validator.test.mts:182-194`)

- Correctly asserts the install path fails (lines 188-191).
- The second half (line 192-193) is the planted mutant that exposes the bug above; it currently fails.
- The assertion strings exactly match the `inheritedDetail` constant, so they are not vacuous.
- **Gap:** the test only covers the case where *both* `AGENTS.md` and `CLAUDE.md` carry the identity sentence. It does not cover the case where one file inherited it and the other did not.

#### 3b. “the bundle's own entry files still carry the identity sentence the install check looks for” (`setup-validator.test.mts:196-199`)

- Reads the real `AGENTS.md` and `CLAUDE.md` from disk and asserts they contain `BUNDLE_IDENTITY`.
- This is a legitimate guard against silent rewording; if the bundle sentence changes, the constant and tests must be updated.
- **Not vacuous** — it would fail if someone rewrote the project-specifics paragraph.

#### 3c. Missing coverage for `@AGENTS.md` import path

**Severity: should-fix**
**File: `ai-framework/scripts/setup-validator.test.mts:182-194` / `ai-framework/scripts/setup-validator.mts:150-158`**
**Rule violated: ai-framework/rules/testing.md — “Business-logic mutations/handlers … Always” (validation logic); also “Each guard or bound has a test that fails when it is removed.”**

The CLAUDE.md inherited-identity check operates on `entry.content` after `libs.resolveClaudeEntry`. When `entry.kind === "import"`, the effective content is the merged `@AGENTS.md` target. If a project’s `AGENTS.md` still carries the bundle identity and `CLAUDE.md` imports it, the validator should still fail.

The test mock at line 83 always returns `kind: "plain"`. The only `kind: "import"` tests are the invalid-target case (line 177) and the throw-unexpected-error case (line 272); neither tests inherited identity through an import. **No test fails if the `inherited(content)` check is accidentally placed before `resolveClaudeEntry` or if it only inspects `own` instead of `content`.**

### 4. Changed fixtures in `installed-upgrade.test.mts`

Command:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/installed-upgrade.test.mts
```

Result: **FAIL** — 1 pass, 2 fail.

Both long-running fixtures fail before reaching the new code:

```
✖ installed b26b45b project upgrades in two passes...
  AssertionError [ERR_ASSERTION]: git -c core.hooksPath=/dev/null ls-tree -r --name-only b26b45b
  fatal: not a git repository (or any of the parent directories): .git
  128 !== 0

✖ fresh setup gets consolidation scaffold and passes verification without migration
  Error: ENOENT: no such file or directory, open '.../tests/README.md'
```

The scratch copy lacks the Git history and the `README.md` file, so these tests cannot run here. Per the task instructions, they are marked **unverified** in this report.

### 5. Fixture helper analysis: `ownProjectSpecifics`

**File: `ai-framework/scripts/installed-upgrade.test.mts:39-44`**

```ts
function ownProjectSpecifics(root: string): void {
  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    assert.ok(read(root, file).includes(BUNDLE_IDENTITY));
    write(root, file, read(root, file).replace(BUNDLE_IDENTITY, "This temporary project is an installed-upgrade fixture"));
  }
}
```

- The helper is called in both fixtures that set up a completed installation (`baseline` at line 59 and the fresh-setup test at line 190).
- It asserts the bundle identity was actually present before replacing it, so a fixture that accidentally copies already-modified entry files would fail loudly.
- The replacement string is arbitrary and unlikely to collide with other text; it does not normalize line endings or multiple occurrences, but `BUNDLE_IDENTITY` appears once per file in the bundle copy.
- **Does not hide the regression** under normal circumstances, but it *does* mean the fixture no longer exercises the validator’s inherited-identity check. That is intentional: the fixtures model a correctly completed setup, and the regression test lives in `setup-validator.test.mts`. However, because `setup-validator.test.mts`’s regression test is itself broken (see item 2), the overall fix is not verified end-to-end.

### 6. Other observations

- The `inheritedDetail` string is duplicated in the source and asserted verbatim in the test. This is fine, but it means any wording change must touch both places.
- The test name says “the bundle checkout itself passes,” but the implementation currently does not make it pass. This is a clear mismatch between test intent and implementation.

## Summary table

| severity | file:line | rule violated | issue |
|----------|-----------|---------------|-------|
| must-fix | `ai-framework/scripts/setup-validator.mts:139` | `ai-framework/rules/testing.md` guard-test discipline / pitch exit criterion | Bundle-vs-install detection checks `README.md` instead of `SETUP.md`, contradicting the comment and `workflow-doctor.mts:1038`. The new regression test fails, and real installs with a `README.md` would silently pass the inherited-identity check. |
| should-fix | `ai-framework/scripts/setup-validator.test.mts:182-194` | `ai-framework/rules/testing.md` validation/auth-path coverage | No test covers inherited identity when `CLAUDE.md` loads `AGENTS.md` via `@AGENTS.md` (`kind: "import"`). |
| unverified | `ai-framework/scripts/installed-upgrade.test.mts` | — | Tests cannot run in the scratch copy because Git history and `README.md` are missing; fixtures were reviewed statically and `ownProjectSpecifics` looks correct but cannot be exercised. |

## Commands run

```sh
# From /private/tmp/claude-501/.../scratchpad/iie-audit/tests
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/installed-upgrade.test.mts
```
