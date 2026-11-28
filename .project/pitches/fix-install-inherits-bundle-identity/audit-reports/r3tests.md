# r3tests — test-coverage review of `fix-install-inherits-bundle-identity`

Role: test-coverage-checker. Rule: `ai-framework/rules/testing.md`.
Scope: the new and changed tests in `ai-framework/scripts/setup-validator.test.mts` and
`ai-framework/scripts/entry-import.test.mts`, read against the contract in
`.project/pitches/fix-install-inherits-bundle-identity/log.md` ("Revision before ship") and
the full change in `CHANGE.patch`.

Work folder: `scratchpad/iie-audit/r3tests` (read-only; nothing was written inside the
repository checkout). All mutations were run against throwaway copies under
`scratchpad/iie-audit/mutwork`, which has been deleted.

---

## Summary

The change ships **one red test** (finding 1), and **three new behaviours have no test that
fails when the behaviour is removed** (findings 2–4). The rest of the new guard set was
verified with in-memory mutants and is genuinely covered.

| # | Severity | Subject |
|---|----------|---------|
| 1 | **blocker** | `setup-validator.test.mts:296` fails on arrival; the implementation still prints the raw error message the change promises to remove |
| 2 | **major** | The new `printable(detail)` guard (`setup-validator.mts:113`) has no test — removing it changes nothing |
| 3 | **major** | The `CLAUDE.md` caveman check no longer resolves the `@AGENTS.md` import in any test — the mutant survives |
| 4 | **minor** | No test covers the refusal of `.project/context/architecture.md` / `.project/context/stack.md`, nor an oversized context file |

Recorded as **redundant layers** (not gaps) under "Survivors" below: the symlink refusal in
`consolidation-migrate.mts` (4 independent layers), the two hard-link `nlink` checks, and the
`outside-marker` assertion in `realReport`.

---

## Finding 1 — blocker: the change ships a failing test

**Severity:** blocker (the suite is red; the change cannot ship)

**Files:**
- `ai-framework/scripts/setup-validator.test.mts:296` (the assertion)
- `ai-framework/scripts/setup-validator.mts:338` (the implementation)

**Rule violated:** `ai-framework/rules/testing.md` — "Guards and Fixes: Prove the Test Can Fail"
and "Verification Discipline". A change whose own test is red is not verified. The pitch log
claims "The verifier exited 0: 2,469 tests, 2,466 pass, 3 skipped, 0 fail"; that claim does not
hold for the code under review.

**What is wrong.** The revision changed the top-level catch to promise fixed text:

```js
// setup-validator.mts:338
deps.io.stderr.write(`Setup validator failed unexpectedly (${codeOf(error)}) ${String(error)}\n`);
```

`String(error)` on an `Error` yields `"Error: kaboom"`, so the raw message is still printed.
The new test asserts the opposite:

```js
// setup-validator.test.mts:296
assert.equal(err.join(""), "Setup validator failed unexpectedly (UNKNOWN)\n");
```

The test is right and the implementation is wrong. The pitch's own clause — "**No raw text in
output:** … now print fixed text and an error code" — and `ai-framework/docs/setup-validator.md`
("Failures show fixed text and error codes, **never child output or error messages**") both
require the message to be gone. The implementation only half-applied the change: `codeOf(error)`
was added, `String(error)` was left in.

**Concrete failure scenario.** Run the named test command:

```
$ cd scratchpad/iie-audit/r3tests
$ node --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/entry-import.test.mts
```

Output (verbatim, trimmed):

```
✖ unexpected errors exit 2 on stderr (0.72775ms)
ℹ tests 52
ℹ pass 51
ℹ fail 1

✖ failing tests:
✖ unexpected errors exit 2 on stderr (0.72775ms)
```

and the assertion detail:

```
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + 'Setup validator failed unexpectedly (UNKNOWN) Error: kaboom\n'
  - 'Setup validator failed unexpectedly (UNKNOWN)\n'
      at ai-framework/scripts/setup-validator.test.mts:296:10
```

**Fix direction.** Drop `${String(error)}` from `setup-validator.mts:338` (keep the code only),
i.e. write `Setup validator failed unexpectedly (${codeOf(error)})\n`. The test then passes as
written and the documented contract holds. If the message is deliberately wanted, the test and the
docs both have to change — but the pitch log explicitly says it must not be printed.

**Note.** `ai-framework/scripts/outcome-record.mts:140` has the same shape
(`lint failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`). That line
is not part of this change and I did not verify whether it is reachable with project-controlled
text; I flag it only as the same pattern, unverified.

---

## Finding 2 — major: the new `printable(detail)` guard has no test

**Severity:** major (new security guard, added by this change, unguarded)

**File:** `ai-framework/scripts/setup-validator.mts:113`, guard declared but untested at
`ai-framework/scripts/setup-validator.test.mts:299-303`

**Rule violated:** `ai-framework/rules/testing.md` — "**Each guard or bound has a test that fails
when it is removed**" and "Prove a guard test with an in-memory mutant. A guard test that passes
against a planted mutant has not earned its keep." The change adds a *second* sanitisation
(`printable(detail)`) next to the existing `printable(name)`; only the name half is tested.

**What is wrong.** The change widened the sanitisation from the report *name* to the report
*detail*:

```js
// setup-validator.mts:113
const entry = { status, name: printable(name), detail: printable(detail) };
```

The only new test for this is `setup-validator.test.mts:299` ("control characters in a reported
file name cannot forge report lines"), which injects a control character into a **file name**
(`cursorMirrors: () => ({ created: [".cursor/a\nPASS  forged\u001b[2m"] ... })`) and asserts on the
output. It exercises `printable(name)`. Nothing exercises `printable(detail)`.

**Concrete failure scenario.** Remove only the detail sanitisation and the whole suite stays
green:

```
$ # mutant: setup-validator.mts:113
$ perl -0pi -e 's/const entry = \{ status, name: printable\(name\), detail: printable\(detail\) \};/const entry = { status, name: printable(name), detail };/' \
      ai-framework/scripts/setup-validator.mts
$ node --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/entry-import.test.mts
✖ unexpected errors exit 2 on stderr (0.6577ms)
ℹ tests 52
ℹ pass 51
ℹ fail 1
```

Only the pre-existing finding-1 failure appears. The mutant survives.

**Why the detail matters.** Details carry project-controlled text on several paths, e.g.
`setup-validator.mts:183` prints `entry.detail` from `resolveClaudeEntry`, `:231` prints the
consolidation ledger/record details (which embed project-controlled slugs), and `:311` prints
`result.problems[].text` from the config loader. Today the reachable ones are independently
sanitised or fixed-text, so I could not construct a live leak through `printable(detail)` alone —
but that is exactly what the guard exists for, and a guard that is never exercised is a guard
that can silently be dropped.

**Suggested test.** Extend `setup-validator.test.mts:299` to inject a control character into a
**detail** as well as a name — for example a `cursorMirrors` report whose created-file name is
clean but whose companion detail carries `\u001b[31m` / `\nPASS  forged`, or a `resolveClaudeEntry`
stub returning `{ kind: "invalid", detail: "bad\u001b[2K\nPASS  forged" }` — and assert the
output contains no `\u001b` and no forged `PASS` line.

---

## Finding 3 — major: the `CLAUDE.md` caveman check resolves `@AGENTS.md` in no test

**Severity:** major (a behaviour the change rewrote, with no test that fails when the rewrite is
undone)

**Files:**
- `ai-framework/scripts/setup-validator.mts:214` (the behaviour)
- `ai-framework/scripts/setup-validator.test.mts:219-235` (the only caveman test)

**Rule violated:** `ai-framework/rules/testing.md` — "**Each guard or bound has a test that fails
when it is removed**"; "Fixes to shared helpers were traced through all callers." The change
rewrote this line from `libs.effectiveEntryText(root, file)` (which follows the `@AGENTS.md`
import) to `libs.resolveClaudeEntry(root, text).content` (which follows it too) — but no test
distinguishes the two, so the rewrite is unverified.

**What is wrong.** The caveman check for `CLAUDE.md` must read the *effective* text, i.e.
`CLAUDE.md` plus the file it imports:

```js
// setup-validator.mts:214
const effective = file === "CLAUDE.md" ? (await libs.resolveClaudeEntry(root, text)).content : text;
```

The only test is `setup-validator.test.mts:219`, and it asserts only the **AGENTS.md** result:

```js
assert.ok(warn.out.join("").includes("WARN  AGENTS.md: no caveman response-style section"));
```

There is no assertion for `CLAUDE.md`, and no test at all where `CLAUDE.md` is `@AGENTS.md`.

**Concrete failure scenario.** Replace the import resolution with the file's own text:

```
$ # mutant: setup-validator.mts:214
$ perl -0pi -e 's/const effective = file === "CLAUDE\.md" \? \(await libs\.resolveClaudeEntry\(root, text\)\)\.content : text;/const effective = text;/' \
      ai-framework/scripts/setup-validator.mts
$ node --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/entry-import.test.mts
✖ unexpected errors exit 2 on stderr (0.65525ms)
ℹ tests 52
ℹ pass 51
ℹ fail 1
```

Only finding 1's failure appears; the mutant survives.

**Observed wrong output under the mutant.** For a valid project whose `CLAUDE.md` is exactly
`@AGENTS.md` and whose caveman section lives in `AGENTS.md`, the mutant turns a correct `pass`
into a spurious warning:

```
# real-filesystem probe, project with AGENTS.md (caveman section) + CLAUDE.md == "@AGENTS.md"
# current code:
pass | CLAUDE.md | carries the caveman response-style section
# under the mutant:
warn | CLAUDE.md | no caveman response-style section: the main session agent will not apply caveman mode (copy the section from the bundle's AGENTS.md)
```

That warning is user-visible and wrong: the project *does* carry the section, through the import.

**Suggested test.** Add a case to `setup-validator.test.mts:219` where `CLAUDE.md` is
`"@AGENTS.md\n"`, `AGENTS.md` carries `## Response style (caveman mode)`, and assert
`"PASS  CLAUDE.md: carries the caveman response-style section"` (and the mirror case where the
section is missing from the imported `AGENTS.md`).

---

## Finding 4 — minor: context-file refusal and oversize are only partly covered

**Severity:** minor (shared code path is covered; two of the five files have no case of their own)

**File:** `ai-framework/scripts/setup-validator.test.mts:342-349` and `:327`

**Rule violated:** `ai-framework/rules/testing.md` — checklist "Edge cases"; "Each guard or bound
has a test that fails when it is removed."

**What is wrong.** The revision routes every project text file through the guarded reader
`readProjectText`. The validator reads five context/scaffold files:
`.project/context/product.md`, `.project/context/architecture.md`, `.project/context/stack.md`,
`.project/status.md`, plus `AGENTS.md`, `CLAUDE.md` and `SETUP.md`.

The new `realReport` tests cover:

- `AGENTS.md` / `CLAUDE.md` — symlink, hard link, oversize, FIFO (`setup-validator.test.mts:322-340`)
- `.project/context/product.md` and `.project/status.md` — symlink only (`:342-349`)
- `SETUP.md` — symlink only (`:351-358`)

Not covered: `.project/context/architecture.md` and `.project/context/stack.md` are never made
unreadable, and no context file is tested at the 1 MiB oversize bound (only `CLAUDE.md` is).

**Concrete failure scenario.** The gap is benign today because all five files go through the same
`readText` helper (`setup-validator.mts:126-132`), and the helper's failure recording *is*
covered — removing the `record("fail", relativePath, REFUSED)` line from `setup-validator.mts:131`
fails three tests:

```
$ # mutant: setup-validator.mts:131 -> catch { return null; }
$ node --test ai-framework/scripts/setup-validator.test.mts
✖ guarded reads: a symlinked, oversized or hard-linked entry file is refused and never read
✖ guarded reads: a FIFO entry file is refused instead of blocking the run
✖ guarded reads: linked context and status files are refused
ℹ tests 37
ℹ pass 33
ℹ fail 4
```

So the *helper* is guarded; only the per-file matrix is thin. I did not find a mutant that
survives because of this alone, and I am not claiming one. It is listed as minor because the
contract in the pitch log enumerates the reads file by file ("the three context files, `AGENTS.md`,
`CLAUDE.md`, `SETUP.md`, `.project/status.md`") and the matrix is incomplete for that list.

**Suggested test.** In `setup-validator.test.mts:342`, symlink `architecture.md` and `stack.md`
alongside `product.md` and extend the expected `refusedNames` list; add an oversize case for
`.project/context/product.md` next to the existing oversize case for `CLAUDE.md`.

---

## Verified: the new guards that *are* covered

I planted in-memory mutants of each new guard and confirmed each is caught by a named test. This
is the evidence that the rest of the revision is properly guarded.

| Guard removed / weakened | Caught by |
|---|---|
| `install &&` dropped from `inherited()` (`setup-validator.mts:166`) | `setup-validator.test.mts:182` |
| `install` hard-coded to `false` (`:165`) | `setup-validator.test.mts:182`, `:200`, `:351` |
| `install` hard-coded to `true` (`:165`) | `setup-validator.test.mts:182` |
| `BUNDLE_IDENTITY` reworded (`:26`) | `setup-validator.test.mts:214` |
| `BUNDLE_SETUP_TITLE` reworded (`:34`) | `setup-validator.test.mts:209` |
| `inherited(content)` → `inherited(own)` on the CLAUDE.md branch (`:185`) | `setup-validator.test.mts:200` |
| `inherited()` for `AGENTS.md` removed entirely (`:171`) | `setup-validator.test.mts:182`, `:351` |
| `printable(name)` removed from `record()` (`:113`) | `setup-validator.test.mts:299` |
| `record(..., REFUSED)` removed from `readText` (`:131`) | `setup-validator.test.mts:322`, `:335`, `:342` |
| `entry-import.mts` echoes the rejected import line again (`:55`) | `entry-import.test.mts:62` |
| `entry-import.mts` no longer rejects a malformed AGENTS.md import (`:55`) | `entry-import.test.mts:46`, `:62`, `:89` |

The three "pinning" tests are worth calling out — they are what stops a rewording of the bundle's
own sentence from silently disabling the check, and they fail loudly as intended.

`ai-framework/scripts/installed-upgrade.test.mts:39` (`ownProjectSpecifics`) is outside my two
assigned files but is part of the same change. I read it: it asserts the identity sentence is
*present* before replacing it, in both fixtures (`:59`, `:190`), so a fixture that silently lost
the sentence fails rather than passing vacuously. Sound.

---

## Survivors (recorded as redundant layers, not missing tests)

`ai-framework/rules/testing.md` requires survivors to be recorded and classified. Every guard I
removed was still enforced by another layer, so these are redundant layers rather than missing
tests:

1. **Symlink refusal in `ai-framework/scripts/consolidation-migrate.mts`** — four independent
   layers: the `stat.isSymbolicLink()` check in `inspect()` (`:37`), `!before.isFile()` (lstat on a
   symlink reports `isFile() === false`, `:57`), `O_NOFOLLOW` on the open (`:59`), and the
   `opened.dev`/`opened.ino` comparison against the pre-open `lstat` (`:62`). Removing any three of
   the four still refuses the file; only removing all four lets an outside file be read, and the
   `refusedNames` assertion in `setup-validator.test.mts:319` catches that. Verified by probe:
   `readProjectText` threw `"Not a plain bounded file: AGENTS.md"` with the lstat and `O_NOFOLLOW`
   layers removed, and `"File changed while opening: AGENTS.md"` with the dev/ino layer also
   removed.

2. **The two hard-link `nlink !== 1` checks** — `before.nlink !== 1` (`:57`) and
   `opened.nlink !== 1` (`:62`) are redundant with each other: removing either alone leaves the
   other catching the hard link, so no test fails. Removing both (plus the dev/ino check) is needed
   for a hard link to be read. The test at `setup-validator.test.mts:328-332` therefore guards the
   *pair*, which is the correct unit.

3. **The `outside-marker` assertion in `realReport`** (`setup-validator.test.mts:314`) — I could not
   make it fail. It asserts the validator's stdout+stderr contains no `outside-marker`, but the
   validator never echoes the content of `AGENTS.md`/`CLAUDE.md`, and the symlink is refused before
   any read, so the marker has no path to the output even with the symlink layers removed. It is a
   defence-in-depth net, not an active guard. Not a gap, but worth knowing it is not doing the
   work in that test.

---

## Checklist, item by item

`ai-framework/rules/testing.md` → "Testing Checklist for New Features", read against this change:

- [x] **Each guard or bound has a test that fails when it is removed** — *partially satisfied.*
  Verified for 11 guards (table above). Not satisfied for the `printable(detail)` guard
  (finding 2) and for the `CLAUDE.md` caveman import resolution (finding 3). The hard-link and
  symlink guards survive single-mutant removal because they are layered (recorded above).
- [x] **Fixes to shared helpers were traced through all callers** — the removed
  `ValidatorLibs.effectiveEntryText` seam was traced: `effectiveEntryText` is still exported by
  `ai-framework/scripts/entry-import.mts:70` and still used by
  `ai-framework/scripts/skill-defaults.test.mts:311` and `ai-framework/scripts/bundle-sync.mts:556`,
  so removing it from `ValidatorLibs` broke no caller. `setup-validator.mts` is the only consumer of
  the seam and it now uses `resolveClaudeEntry` in both places it needs it.
- [x] **Unit tests for utility functions** — `entry-import.mts` keeps 15 tests; `setup-validator.mts`
  keeps 37. No utility lost its unit test.
- [x] **Validation schema tests** — not applicable (no schema changed).
- [x] **Component render tests** — not applicable (no UI).
- [x] **User interaction tests** — not applicable (CLI, read-only).
- [x] **Authorization paths tested** — not applicable (no auth).
- [x] **Edge cases (empty state, error state, loading state)** — the error/refusal edges are covered
  by the `realReport` family (symlink, hard link, oversize, FIFO) and by the in-memory
  `makeDeps` family (missing file, thrown reader). One gap: `.project/context/architecture.md` and
  `.project/context/stack.md` are never made unreadable (finding 4).
- [x] **Accessibility** — not applicable.

Additional rule checks:

- [x] **macOS tmpdir realpath** — `realReport` (`setup-validator.test.mts:306`) applies
  `realpathSync` to the `mkdtempSync` result before using it, and `entry-import.test.mts:25` does
  the same. Compliant.
- [x] **Prove a guard test with an in-memory mutant** — done for every guard listed above; the
  method and the surviving mutants are recorded.
- [x] **Re-verify a reviewer's claim with one command** — the pitch log's "10 new or updated
  assertions failed on the previous code … then 55 of 55 passed on Node and Bun" and "The verifier
  exited 0: 2,469 tests, 2,466 pass, 3 skipped, 0 fail" do **not** reproduce: the named test
  command yields 51 pass / 1 fail / 0 skipped across the two files under review (finding 1).
- [x] **Naming convention** — the new tests use `describe`-free `test("<verb phrase>")` names that
  start with a verb ("an install that kept the bundle's own project specifics fails", "guarded
  reads: a FIFO entry file is refused instead of blocking the run", "a rejected directive is
  described without echoing its text"). Compliant.
- [x] **Mocking discipline** — the new `realReport` helper uses the real filesystem rather than an
  inline mock, because the guard under test *is* a filesystem guard (symlink, FIFO, hard link);
  an inline mock could not prove it. Compliant, and the right call.

---

## What I tried that did not work

- **Making the `outside-marker` assertion fail.** I removed the symlink layers one at a time
  (`stat.isSymbolicLink()` in `inspect()`, `!before.isFile()`, `O_NOFOLLOW`, and the
  `opened.dev`/`opened.ino` check) and, in each case, the file was still refused by a remaining
  layer, so the marker never reached the output and the assertion never fired. Only with all four
  removed did the file get read — and even then the `refusedNames` assertion fired first. So the
  `doesNotMatch(/outside-marker/)` line cannot currently be shown to fail; I recorded it as a
  defence-in-depth net rather than claiming it as coverage.

- **Reaching a live control-character leak through `printable(detail)`.** I probed three candidate
  paths: a malformed `ai-workflow.toon` (the loader replaces it with a fixed refusal text), a
  `schemaVersion: 3` file with a raw control character in a key (the TOON scanner rejects the line
  before it becomes a key), and a ledger file whose slug contains `\u001b[31m` (the consolidation
  path already applies `printable` internally). In all three the outer `printable(detail)` was not
  the thing that stopped the leak. I therefore report finding 2 as an **unguarded guard** with the
  mutant proof, and explicitly state that I could not construct a live leak through it — the
  severity is "the guard has no test", not "the guard is exploitable".

- **Proving the hard-link guard is untested.** My first mutant removed only the pre-open
  `before.nlink !== 1` check and the suite stayed green, which looked like a gap. The probe showed
  the post-open `opened.nlink !== 1` check caught it instead; a second mutant removing only the
  post-open check was also green, because the pre-open check caught it. The two checks are
  redundant with each other, so the test correctly guards the pair. Recorded under Survivors.

- **Reproducing the pitch log's green-suite claim.** `node --test ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/entry-import.test.mts`
  yields 52 tests / 51 pass / 1 fail. The log's "55 of 55 passed on Node and Bun across the three
  affected files" does not reproduce for these two files, and the red test is the same one
  reported in finding 1.

---

## Files touched

None in the repository. This report is the only file written:
`scratchpad/iie-audit/reports/r3tests.md`.

## Unverified / out of scope

- `ai-framework/scripts/outcome-record.mts:140` has the same `String(error)` shape as finding 1 but
  is not part of this change; I did not verify whether it is reachable with project-controlled text.
- `ai-framework/scripts/workflow-doctor.mts:1096` reads the caveman section with its own regex; it
  is not part of this change and I did not review it.
- The `resolveClaudeEntry` unpinned second read of `AGENTS.md` is a known, recorded item and is not
  reported here.
- I ran the suite on Node v24.21.0 only. The pitch log claims a Bun run as well; Bun was not
  available in this session, so the Bun half of that claim is **unverified**.
