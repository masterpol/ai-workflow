# Test-coverage re-check — greenfield-kickoff part B1, second review (B1c2)

Role: test-coverage-checker (`.claude/agents/test-coverage-checker.md`), rule `ai-framework/rules/testing.md`.
Scope: the edits in `DELTA.patch` (made after the first review) and the functions and rules they touch in
`ai-framework/scripts/project-state.mts` and its test file.

Contract checked: `.project/pitches/04-greenfield-kickoff/plan-b1.md` (with its Living-spec deviations log),
`build/b1-s1-brief.md`, `build/b1-s2-brief.md`.

## Summary

The three new test cases in `DELTA.patch` are sound: each one independently detects the exact mutant it is
aimed at, and each kills it for the right reason. The source-folder skip logic (`hasBundleSetup` and its three
conditions) is fully covered — removing any one of the three conditions makes the suite go red.

One blocking defect is outstanding: the delivered tree is **red on Node and on Bun** because the implementation
includes `.rst` in the starter-file rule, which the B1-S1 brief explicitly excludes and the delivered test
asserts against. That failure is not recorded in the pitch's log, which still claims `0 fail`.

Two documentation claims are untested; one of them (the copy-to-root route's expected state) is contradicted by
the delivered test suite and by direct execution.

---

## Findings

### 1. HIGH — the delivered test suite is red; the starter-file rule includes `.rst` against an explicit brief

**Location:** `ai-framework/scripts/project-state.mts:46` (rule), asserted by `ai-framework/scripts/project-state.test.mts:259-267`

**Rule violated:** `ai-framework/rules/testing.md` — "Each guard or bound has a test that fails when it is
removed" and the Testing Checklist "Edge cases"; concretely, the B1-S1 brief is the contract and it says the
starter set is "`README`, `LICENSE`, `LICENCE`, each bare, `.md` or `.txt`; and `.gitignore`. **Nothing else:
not `.gitattributes`, not `COPYING`, not `CHANGELOG.md`, not `README.rst`**". The delivered implementation
matches `.rst` as well.

The implementation:

```ts
const ROOT_STARTER_FILE = /^(?:(?:readme|licen[cs]e)(?:\.(?:md|txt|rst))?|\.gitignore)$/i;
```

`.rst` in the extension alternation makes `README.rst` (and `LICENSE.rst`) count as a starter file, so a project
whose only root file is `README.rst` reports `unclear` ("The only project files are starter files.") where the
brief and the test require `existing`.

**Concrete failure scenario.** A project whose root holds only `README.rst` (a common reStructuredText
documentation file, and `.rst` is in the detector's own `PROJECT_EXTENSIONS` at `project-state.mts:74`) is told it
is a starter-only repository. Setup then asks the person to choose New project or Existing project instead of
continuing unchanged — the wrong branch, on a file the brief says is not a starter file.

**Command run and output.**

```
$ node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
ℹ tests 62
ℹ pass 61
ℹ fail 1

✖ failing tests:

test at ai-framework/scripts/project-state.test.mts:260:3
✖ reports existing with README.rst alone or beside a starter file (132.566667ms)
  AssertionError [ERR_ASSERTION]: {"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":["README.rst"]}
  + actual - expected

  + 'unclear'
  - 'existing'

      at assertState (file:///.../ai-framework/scripts/project-state.test.mts:77:10)
      at TestContext.<anonymous> (file:///.../ai-framework/scripts/project-state.test.mts:263:22)
```

The same failure reproduces on Bun:

```
$ bun test ai-framework/scripts/project-state.test.mts
 61 pass
 2 fail
```

(Bun's second failure is the Git manifest test, which cannot run in this scratch copy because it is not the Git
checkout. Node's run of the same file skips it by the pattern above.)

**Why this matters for the review.** The pitch log
(`.project/pitches/04-greenfield-kickoff/log.md`) records the B1-S1 evidence as "`project-state.test.mts`: 55
pass, 0 fail on Node and on Bun" and the B1-S2 evidence as "60 pass, 0 fail". The tree now has 62 tests with 1
failure. The failure is therefore either introduced after those runs and never re-recorded, or it was masked. It
is not covered by the deviations log: `deviations.md` has no entry authorising `.rst`, and the plan's
Living-spec deviations log has none either. Under `plan-b1.md`'s "Living-spec deviations log" discipline, an
unlogged rule change is a contract violation on its own.

**Note on the test, not the rule.** The *test* at `project-state.test.mts:259` is correct per the brief — it
lists `README.rst` among the root files that must report `existing`. The implementation is what deviates.

**Suggested fix (not applied — read-only review).** Drop `rst` from the alternation in
`ai-framework/scripts/project-state.mts:46`, or record an owner-approved deviation in `deviations.md` and
change the test. The first matches the brief and the plan; the second is a legitimate route if `.rst` was
intended.

---

### 2. MEDIUM — the copy-to-root route's documented expected state (`unclear`) contradicts the delivered behaviour (`empty`), and no test covers the claim

**Location:** `SETUP.md:84` (the DELTA leaves this line in place and the new sentence at `SETUP.md:88` routes
around it), and the same claim at `.claude/skills/setup/SKILL.md:78`, `README.md:59`,
`ai-framework/docs/setup.md:11`

**Rule violated:** `ai-framework/rules/testing.md` — "a green build is evidence of nothing specific"; the
documented instruction text has no test that pins its claim, and the claim is false against the delivered code.

`SETUP.md:82-84` says:

> **Copy-to-root.** The framework files are already in place. From the project root, run this before Steps 2–5
> write anything: … Expect `unclear` because the scan sees the bundle's root files, such as `README.md` and
> `VERSION`.

Two things are wrong with this.

(a) `README.md` and `VERSION` are never copied to the project root. `SETUP.md`'s own Step 1 copy list (lines
104-113) copies only `ai-framework/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `.opencode/`, `.codex/`, `.agents/`
and `.cursor/`. Neither `README.md` nor `VERSION` appears in `ai-framework/templates/shipped-files.txt` (427
lines; the only `README` entries are `ai-framework/scripts/runtime/README.md` and the scaffold's
`ai-framework/templates/project/*/README.md`).

(b) With exactly the Step 1 files in place, the detector reports `empty`, not `unclear`.

**Concrete failure scenario.** A person on the copy-to-root route runs the check as `SETUP.md` instructs, reads
`empty`, and — following the skill's routing at `.claude/skills/setup/SKILL.md:93` — proceeds with "the project
kickoff is not available yet", silently skipping the New-project / Existing-project question that the setup
skill at line 78 and the README at line 59 both promise will happen. The person is never asked; the documented
question does not occur.

**Command run and output.** I built a project containing exactly the Step 1 copy list and ran the installed
script from the project root:

```js
// .probe2/probe-copyroot2.mjs
cpSync(bundleRoot + "/ai-framework", proj + "/ai-framework", { recursive: true });
cpSync(bundleRoot + "/.claude",     proj + "/.claude",     { recursive: true });
cpSync(bundleRoot + "/AGENTS.md",   proj + "/AGENTS.md");
cpSync(bundleRoot + "/CLAUDE.md",   proj + "/CLAUDE.md");
cpSync(bundleRoot + "/.codex",      proj + "/.codex",      { recursive: true });
cpSync(bundleRoot + "/.agents",     proj + "/.agents",     { recursive: true });
execFileSync(process.execPath, [script, "--json"], { cwd: proj });
```

```
copy-to-root (Step 1 files only) state: empty
reasons: ["The completed scan found only workflow, scaffold, or incidental files."]
evidence (first 8): []
evidence count: 0
```

The delivered test suite already asserts this, and contradicts the documentation:

```
$ grep -n "untouched Step 1 install" -A 6 ai-framework/scripts/project-state.test.mts
168:test("untouched Step 1 install and copied scaffold are empty and byte-identical after a scan", (t) => {
169-  const root = installedFixture(t);
170-  const before = snapshot(root);
171-  assert.deepEqual(assertState(root, "empty").evidence, []);
172-  assert.deepEqual(snapshot(root), before);
173-});
```

`installedFixture` is built from the shipped manifest, i.e. it is the real Step 1 install, and the test names
the state `empty` in its own title.

**Scope note.** This line is **not** in `DELTA.patch`; it is pre-existing text that the DELTA's new sentence at
`SETUP.md:88` ("Where that routing says to continue with Step 1, it means continue setup: here, Step 1 below
comes next.") now sits next to. I report it because the DELTA's added sentence depends on that routing being
correct, and because the DELTA does not add the test that would pin the documented copy-to-root state.

**Suggested fix (not applied).** Either correct the copy-to-root paragraph in `SETUP.md`, the setup skill (and
its Cursor mirror), `README.md` and `ai-framework/docs/setup.md` to state the state the detector actually
produces, or change the detector so the route really does report `unclear`. Then add a test that runs the
documented command against a Step 1 install and asserts the documented state — that is the missing test.

---

### 3. LOW — the DELTA's new "treat the result as `unclear`" rule for `$` and backtick paths is over-broad; the prescribed quoting already handles them

**Location:** `SETUP.md:71-74` (added by `DELTA.patch` lines 12-14)

**Rule violated:** `ai-framework/rules/testing.md` — the testing checklist's "Edge cases"; more precisely this is
an untested instruction whose stated exception is wider than the real failure, and no test pins it either way.

The DELTA adds:

> If the source folder has another name or path, use that path throughout setup and keep it quoted as one
> argument. If the path holds a quote, a backslash, `$` or a backtick, do not put it in a command: treat the
> result as `unclear`.

The quoted one-argument form the same sentence prescribes handles `$`, a backtick, a double quote and a single
quote correctly, because the shell never interprets inside double quotes and the path is passed to Node as one
argument.

**Concrete failure scenario.** A person whose source folder is named e.g. `docs$` follows the DELTA's advice,
declines to run the command, and reports `unclear` — so setup asks the New/Existing question instead of letting
the check distinguish an empty project from a real one. The check would have reported `empty` correctly.

**Command run and output.** I ran the installed script with the quoted one-argument path for each special
character, in a project whose only content is the source folder:

```
"workflow download"  quoted one-arg => empty
"w$o"                quoted one-arg => empty
"w`o"                quoted one-arg => empty
"w\"o"               quoted one-arg => empty
"w'o"                quoted one-arg => empty
```

Only a **backslash** genuinely fails, and it fails inside Node's ESM loader, before the detector runs at all —
so no `unclear` result is ever produced by that command:

```
script path: /private/var/folders/.../ps-probe-bs-leAhNB/w\o/ai-framework/scripts/project-state.mts
node:internal/modules/esm/resolve:234
  throw new ERR_INVALID_MODULE_SPECIFIER;
TypeError [ERR_INVALID_MODULE_SPECIFIER]: Invalid module ".../w%5Co/ai-framework/scripts/project-state.mts"
must not include encoded "/" or "\" characters imported from /private/var/folders/...
```

The instruction is therefore correct for a backslash only in effect, because `.claude/skills/setup/SKILL.md:97`
already says "Command fails, exits non-zero, or prints anything other than the expected JSON: treat as
`unclear`". The advice is wrong for `$` and a backtick, and it for a double or single quote, where the quoted
form works.

**Suggested fix (not applied).** Narrow the sentence to a backslash, or drop the character list and rely on the
skill's existing "command fails → treat as `unclear`" rule. Note that the DELTA's quoting instruction itself is
correct and valuable — I verified it fixes the space case and keeps the source-folder skip applied.

---

### 4. LOW — the `MAX_SETUP_BYTES` bound in `hasBundleSetup` is untested

**Location:** `ai-framework/scripts/project-state.mts:23` (bound), `ai-framework/scripts/project-state.mts:125-133`
(the function)

**Rule violated:** `ai-framework/rules/testing.md` — "Each guard or bound has a test that fails when it is
removed"; a survivor is either a missing test or a redundant layer.

`hasBundleSetup` reads the candidate folder's `SETUP.md` through `readProjectText(directory, "SETUP.md",
MAX_SETUP_BYTES, deps)`. `readProjectBytes` throws when `stat.size > cap`, and `hasBundleSetup` swallows it and
returns `false`, so an oversized `SETUP.md` correctly fails closed (the folder is not skipped).

**Concrete failure scenario.** If the bound were loosened (or `readProjectText`'s cap were removed), a folder
holding a huge `SETUP.md` would be read into memory during the scan. The behaviour is right today, but nothing in
the suite would fail if it regressed.

**Command run and output.** I built a source folder whose `SETUP.md` is the bundle title followed by 70,000
bytes (over the 64 KiB bound) and ran the installed script from the project root:

```
oversized SETUP.md => state: unclear | evidence: ["ai-workflow-portable/ai-framework/hooks/hooks.json", ...]
```

The folder was not skipped, i.e. it fails closed as intended — but this is my probe, not a test in the suite.
The suite has no case for an oversized or unreadable `SETUP.md`; the closest is
`project-state.test.mts:156` ("a linked setup file is refused as a source marker"), which covers the symlink
case only.

**Suggested fix (not applied).** Add one case to the existing source-folder group: a source folder whose
`SETUP.md` exceeds `MAX_SETUP_BYTES` is not skipped (state `unclear`, evidence includes the folder).

---

## What the DELTA got right (verified, not a finding)

These were checked by mutation and by execution, and are recorded so the coordinator knows they were covered.

**The three new test cases each kill the mutant they target.** `DELTA.patch` adds
`["a nested license only", "docs/LICENSE"]`, `["a nested ignore file only", "app/.gitignore"]` and
`["a root name that only ends like a starter file", "OLDREADME.md"]` to the "a real install with … is
existing" table at `project-state.test.mts:202-220`. These guard the `^…$` anchoring of `ROOT_STARTER_FILE`
against the "root only" rule the brief specifies. Removing the anchors:

```
$ node -e '… replace "/^(?:(?:readme|licen[cs]e)(?:\.(?:md|txt|rst))?|\.gitignore)$/i"
                with "/(?:(?:readme|licen[cs]e)(?:\.(?:md|txt|rst))?|\.gitignore)/i" …'
$ node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts

✖ a real install with documents only is existing
  AssertionError: {"schemaVersion":1,"state":"unclear","reasons":["The only project files are starter files."],"evidence":["docs/README.md"]}
    actual: 'unclear'   expected: 'existing'
✖ a real install with a nested license only is existing
  … "evidence":["docs/LICENSE"]        actual: 'unclear'   expected: 'existing'
✖ a real install with a nested ignore file only is existing
  … "evidence":["app/.gitignore"]      actual: 'unclear'   expected: 'existing'
✖ a real install with a root name that only ends like a starter file is existing
  … "evidence":["OLDREADME.md"]        actual: 'unclear'   expected: 'existing'
```

Each new case fails independently and for the right reason (the state flips to `unclear` with the starter
reason), not incidentally. Two more mutants were also killed: dropping the case-insensitive flag (12 tests
fail) and dropping the extension alternation (10 tests fail). The starter-file rule's guards are well covered.

**The source-folder skip's three conditions are each covered.** `hasBundleSetup` and the
`depth === 0 && target === bundle && hasBundleSetup(...)` condition at `project-state.mts:260` implement the
B1-S2 brief's three skip conditions (direct child of the root; the running script's own folder; a `SETUP.md`
that passes `isBundleSetup`). Removing each one in turn:

```
s1_no_title_check  => SUITE FAILED: an installed copy with its own setup title is still scanned from its parent,
                                      a linked setup file is refused as a source marker
s2_no_depth_check  => SUITE FAILED: a source copy two levels down is still scanned
s3_no_identity_check => SUITE FAILED: only the running source copy is skipped
```

All three are detected. The DELTA did not touch this code, so this is a confirmation rather than a new result.

**The DELTA's quoted command form works.** `SETUP.md:69` now reads
`node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json`. I ran the documented
folder-in-project route end to end (bundle folder as a direct child of the project root, script invoked from
inside that folder with `--root .`):

```
$ cd .probe/proj && node "ai-workflow-portable/ai-framework/scripts/project-state.mts" --root . --json
{"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
```

The source-folder skip applies, so the check reports `empty` for a project that holds only the bundle — which is
the point of the whole B1-S2 change.

**The DELTA's new routing sentence at `SETUP.md:88`** ("Where that routing says to continue with Step 1, it
means continue setup: here, Step 1 below comes next.") is a correct disambiguation: `.claude/skills/setup/SKILL.md:85`
and `:94` use "Step 1" for the skill's own step, while `SETUP.md`'s Step 1 is the copy step. The added sentence
resolves the ambiguity without changing the skill.

## What I tried that did not work

- **Verifying the copy-to-root route through the shipped manifest.** I first built the fixture by copying
  `ai-framework/`, `SETUP.md`, `AGENTS.md` and `CLAUDE.md` by hand and got `existing` with evidence `["SETUP.md"]`.
  That was my fixture's error, not the product's: `SETUP.md` is not in the Step 1 copy list. I rebuilt the
  fixture from the Step 1 list exactly and got `empty`. The corrected result is the one reported in finding 2;
  the `existing` result was an artefact and is not a finding.
- **Running the check through a shell for the special-character probe.** My first attempt at a folder named
  `w$`f\o` was mangled by my own shell quoting and produced `Cannot find module … w$/`f\\o/…`, which says
  nothing about the product. I moved the probe into a Node script that passes the path as an argv element, so
  the shell is out of the picture; that is how the numbers in finding 3 were produced.
- **Testing the backslash case the way the DELTA prescribes** (a shell command with the path quoted). The
  failure is in Node's ESM resolver, not in the shell, so no shell form of the command can make it work. The
  DELTA's advice to avoid the command is the only available route for a backslash path, which is why the
  finding is scored LOW rather than higher.
- **Mutation testing the starter-file rule's case sensitivity and extension set separately from the anchor.**
  Both mutants were killed, but each also failed several pre-existing tests, so the run does not isolate which
  of the DELTA's new cases contributes what. The per-case attribution in the "What the DELTA got right" section
  comes from the anchor mutant only, where each of the three new cases failed on its own line.
- **Confirming the source-folder skip under a symlinked invocation.** I checked that `import.meta.filename` is
  the realpath (Node resolves it), so a symlinked script invocation still matches `bundle` and the skip still
  applies. I did not construct a full symlinked-project scenario; that path is exercised by the recorded
  "path-swap races" item and is out of scope here.

## Unverified items

- The B1-S2 exit commands other than the project-state suite (`runtime/invariants.test.mts`,
  `setup-validator.mts`, `workflow-doctor.mts`, `graphify-relations.mts --check`, `pre-ship-verify.mts`) were
  not run; the review's remit was the DELTA and the touched detector code. The `pre-ship-verify` figure in the
  log ("2,534 tests, 2,531 pass, 3 skipped, 0 fail") predates the current tree and cannot be reconciled with
  finding 1 without re-running it.
- Whether the `.rst` extension was intentional is a question for the owner: I found no deviation-log entry
  authorising it, but I did not read the worker's own report for B1-S1 (it is not in this work folder).
- The live host route was not exercised, and no live host has run the instructions — recorded and accepted.

## Recommended order of work

1. Fix finding 1 (`.rst`) so the suite is green again, and reconcile the log's "0 fail" figures with the tree.
2. Fix or record finding 2 (copy-to-root expected state) and add the test that pins it.
3. Narrow finding 3's character list in `SETUP.md`.
4. Add the size-bound case for `hasBundleSetup` (finding 4).
