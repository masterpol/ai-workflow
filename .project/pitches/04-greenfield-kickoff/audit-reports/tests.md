# Test-coverage review: greenfield-kickoff part A (A1 detector)

**Role**: test-coverage-checker. **Rule**: `ai-framework/rules/testing.md`.
**Target**: `ai-framework/scripts/project-state.mts`, `ai-framework/scripts/project-state.test.mts`,
`ai-framework/templates/shipped-files.txt` (plus `CHANGE.patch` setup-instruction changes).
**Contract**: `.project/pitches/04-greenfield-kickoff/plan.md` ("Detector output contract", A1, A2),
as amended by `deviations.md` and `log.md`.

## Verdict

The suite is **strong on the state machine and on every path that changes the reported state**.
It is **weak on everything that only changes a reason string, on the defence-in-depth guards
that duplicate another layer, and on the branches whose inputs the fixture builder supplies
from the same file the detector reads.**

Concretely: of **103 mutants** applied to `project-state.mts` (in copies of the tree, inside my
work folder), **54 were killed, 47 survived, 2 could not be applied**. Every survivor was
verified by hand; none is a harness artefact — a **no-op baseline mutant survives** (control),
and a **throw-on-every-scan mutant is killed** (control).

The 47 survivors cluster into four families:

| Family | Count | What it means |
|---|---|---|
| A. Dead code — the guard cannot change any output | 6 | The guard is unreachable-as-written; a missing test hides a dead branch |
| B. Redundant layer — another layer already produces the same state | 12 | Two guards, one observable effect; only one of them is ever tested |
| C. Unasserted wording — state and evidence unchanged, only the reason text moves | 15 | The reason strings are a user-facing contract (`/setup` reads them) and are never asserted |
| D. Constant-only changes — the bound is never reached in any fixture | 14 | The bound is real but no fixture drives the tree near it |

**No survivor changes a reported `state` on its own.** The two changes that do change a state
(the `scan.issues.length > 0` fail-closed conjunct and the entry budget) are both killed.

---

## F-1 — HIGH — the `.env*` / `credentials.json` / `settings.local.json` exclusion is dead code

**File**: `ai-framework/scripts/project-state.mts:163` (inside `isProjectFile`)
**Rule violated**: `ai-framework/rules/testing.md` → "Guards and Fixes → Prove the Test Can Fail":
*"For every security guard or bound, remove or loosen it once and confirm a test fails. Record
survivors: a survivor is either a missing test or a redundant layer, and the record says which."*
Also `security.md` §9 (never name a secret file) as the intent of the guard.

**Mutant M19** — delete the line
`if (lower.startsWith(".env") || lower === "credentials.json" || lower === "settings.local.json") return false;`

**Command and output**:

```
$ cd <work>/gk-audit/tests
$ node mutate2.mjs "$PWD" mutants2.json 8      # (mutant set containing M19)
M19 isProjectFile secret exclusion removed	SURVIVED	fail=0 pass=35
```

Behavioural probe, **baseline** vs **M19 mutant**, same fixture (a directory containing one
secret-named file and nothing else):

```
BASE  .envrc               -> state=unclear evidence=[".envrc"]               reasons=["Found an unrecognized project file."]
BASE  credentials.json     -> state=unclear evidence=["credentials.json"]     reasons=["Found an unrecognized project file."]
BASE  settings.local.json  -> state=unclear evidence=["settings.local.json"]  reasons=["Found an unrecognized project file."]
BASE  .env                 -> state=unclear evidence=[".env"]                 reasons=["Found an unrecognized project file."]
BASE  .env.pro             -> state=unclear evidence=[".env.pro"]             reasons=["Found an unrecognized project file."]

M19   .envrc               -> state=unclear evidence=[".envrc"]               reasons=["Found an unrecognized project file."]
M19   credentials.json     -> state=unclear evidence=["credentials.json"]     reasons=["Found an unrecognized project file."]
M19   settings.local.json  -> state=unclear evidence=["settings.local.json"]  reasons=["Found an unrecognized project file."]
```

**Failure scenario**: the two versions are **byte-for-byte indistinguishable**. `isProjectFile`
returning `false` only means "not a project file"; control then falls to the `else` branch at
`project-state.mts:196`, which refuses the file as *"Found an unrecognized project file."* and
puts its **name in the evidence array anyway**. The guard never prevents a secret file name from
reaching the output. The only thing it changes is *which* refusal reason is used, and both are
`unclear`.

This matters for the rule's intent: the guard reads as "never mention a secret file", but the
secret file's **name is printed in `evidence[]` in both versions**. The real protection (never
opening or printing file *contents*) is enforced elsewhere and is tested
(`project-state.test.mts:271`, "production scans never open target file content or spawn a process").

**Fix**: either delete the exclusion (it is dead) and rely on the unrecognized-file refusal, or —
if the intent is that secret names must not appear in `evidence[]` — make that true and assert
it (a test that `evidence` never contains `.env*`, `credentials.json` or `settings.local.json`).
Right now the code says one thing and does another. The `assertState` helper
(`project-state.test.mts:65-73`) has no rule against secret names, which is why nothing catches it.

---

## F-2 — HIGH — the whole fixture is derived from the same manifest the detector reads

**File**: `ai-framework/scripts/project-state.test.mts:20-36` (`installedFixture`), combined with
`ai-framework/scripts/project-state.mts:183-191` (the `.project/` scaffold branch) and
`ai-framework/scripts/project-state.mts:23` (`SHIPPED_MANIFEST`).
**Rule violated**: `ai-framework/rules/testing.md` → "Prove a guard test with an in-memory mutant"
(a guard test that cannot fail against a real divergence has not earned its keep) and
`Verification Discipline` (*"a passing build is evidence of nothing specific"*). This is the exact
defect the pitch's own `log.md` records: *"fixtures were built from the same shipped list they
check."*

**Mechanism**:

- `installedFixture` (`test.mts:23`) reads `ai-framework/templates/shipped-files.txt` and copies
  **exactly** those paths.
- `test.mts:28` additionally maps every `ai-framework/templates/project/<rest>` manifest entry to
  `.project/<rest>`.
- The detector's `.project/` branch (`project-state.mts:185-186`) resolves
  `.project/<rest>` back to `ai-framework/templates/project/<rest>` **in the bundle** and treats it
  as scaffold when that file exists.
- The detector's `shipped.has(relative)` check (`project-state.mts:182`) reads **the same
  manifest file**.

So "the file is shipped" and "the file is scaffold" are both decided by the same artefact the
fixture was built from. **The fixture cannot, by construction, present a file the detector's
exclusions do not cover** — except for the five paths the developers already had to add by hand
after the fact (`.opencode/package.json` and friends, and the three OS-metadata names), which
`log.md` and `deviations.md` record as two separate discoveries.

**Evidence that this is not merely theoretical**: the fixture's own assertions at
`test.mts:24-25` assert the manifest entries are Step-1 paths and are not secret-named — i.e.
the fixture asserts the manifest's *shape*, never its *completeness* against the real install.

**Failure scenario**: a bundle file that `SETUP.md` Step 1 copies but which is **not** in
`shipped-files.txt` (exactly the class of bug that produced the `.opencode/package.json`
`unclear` incident recorded in `log.md`) is invisible to this suite. The suite would still be
green; a real install would still be `unclear`.

**The one guard that does catch it — "the shipped manifest matches Git"
(`test.mts:416`) — is skipped in this checkout** (`skipOutsideBundle`, `test.mts:17-18`: the
scratch tree has no `.git`, and the guard requires `SETUP.md` to contain `ai-workflow-portable`).
It is also the only test that compares the manifest against an independent source, and it is
excluded from the named test command this audit was given
(`--test-skip-pattern='the shipped manifest matches Git'`). So **in the audited tree the
manifest has no independent check at all.**

**Fix**: add a fixture that is *not* built from the manifest — copy the bundle's real Step-1
tree (as `SETUP.md` describes it) and assert the detector reports `empty`; and/or keep the
manifest-vs-Git test in the default command and make it fail rather than skip outside a bundle
checkout.

---

## F-3 — MEDIUM — the `.project/` scaffold branch has no test that can fail

**File**: `ai-framework/scripts/project-state.mts:183-191`
**Rule violated**: `testing.md` → "Each guard or bound has a test that fails when it is removed"
and `Prove a guard test with an in-memory mutant`.

The `.project/` branch has three outcomes: (a) the scaffold counterpart exists → return silently
(the file is scaffold); (b) it does not exist → `refuse(relative, "Found a workflow file outside
the bundled scaffold.")`; (c) the scaffold cannot be inspected → `refuse(relative, "Cannot inspect
the scaffold (…)")`.

- **M17** (`.project/` scaffold comparison removed) → **SURVIVED** (fail=0 pass=35). Removing
  (a) entirely leaves every fixture `empty`/as expected, because the fixture's `.project/` files
  *are* the scaffold.
- **M56** (`Cannot inspect the scaffold` refusal replaced by a silent `return`) → **SURVIVED**.

**Only** outcome (b) is tested — `test.mts:129` adds `.project/context/local.md`, and
`ai-framework/templates/project/context/` contains only `README.md`, so the counterpart genuinely
does not exist. That is the one branch with a real failing case.

Outcome (c) — the scaffold cannot be inspected — is **untested**, and no fixture can reach it,
because the scaffold lives in the bundle, not in the scanned tree.

**Failure scenario**: if `ai-framework/templates/project/` were renamed, moved, or its bundle path
broke, `inspectRelative` would throw `ENOENT` → outcome (a) → `undefined` → the file is refused
as "outside the bundled scaffold" → the whole install reports `unclear`. No test in this suite
would notice, because every `.project/` file the fixture creates is created *from* that same
directory.

**Fix**: one test that removes or renames the scaffold in a staged copy of the bundle and asserts
the detector's answer; or an in-memory mutant that breaks `inspectRelative` for the scaffold path
and asserts the "Cannot inspect the scaffold" reason.

---

## F-4 — MEDIUM — reason strings are a user-facing contract and are never asserted

**File**: `ai-framework/scripts/project-state.mts:84-146, 189-191, 194-197, 215, 237, 241, 247, 253`
**Rule violated**: `testing.md` → "Guards and Fixes → Prove the Test Can Fail" (a branch whose
only output is a message is a branch; if the message is the contract, it must be asserted).

`/setup` is instructed to read the detector's `reasons` and act on them (`CHANGE.patch`: *"When
the only unrecognised evidence is …"*, and `plan.md` A2: *"For `unclear`, `/setup` asks the person
to choose new or existing and records the choice with its evidence"*). The `reasons` strings are
therefore part of the contract between A1 and A2. Yet the suite asserts reasons only four times,
each with a loose regex or substring:

- `test.mts:186` — `reason.includes("EACCES")`
- `test.mts:223` — `/budget/i`
- `test.mts:230` — `/depth/i`
- `test.mts:362` — `/capped/i`

**15 survivors** are exactly this class — the state and the evidence are unchanged, only the
reason text moves, so no assertion fails:

| Survivor | Mutant | Reason text change |
|---|---|---|
| M11 | symlink branch in `visitDirectory` removed | "Found a symbolic link." → "Found a special filesystem entry." |
| M40 | unknown errno maps to `ENOENT` instead of `EIO` | reason code text changes |
| M85–M95 (9) | one errno code dropped from `FILESYSTEM_CODES` | e.g. `ELOOP`/`ESTALE`/`EPERM`/`EINVAL`/`EIO`/`ENOTDIR`/`ENAMETOOLONG`/`EMFILE`/`EBUSY`/`EILSEQ` fall back to `EIO` in the reason |
| M33, M34, M36, M37 | manifest self-check / sort order / max length / CRLF normalisation removed | only changes *whether* the manifest is refused, and the refusal reason text |
| M46, M100 | evidence path leading-slash normalisation removed | only affects a path that cannot occur in the current fixtures |
| M47 | `"readme"` dropped from `PROJECT_FILENAMES` | "README.md" then refuses as "unrecognized project file" — same state |
| M48 | `.git` dropped from `IGNORED_FILES` | `.git` is a directory in every fixture, so the entry never matches |

**Worked example (M11)**, baseline vs mutant, symlinked directory inside a project root:

```
BASELINE symlinked SUBDIR -> "unclear" ["Found a symbolic link."] ["linked"]
M11      symlinked SUBDIR -> "unclear" ["Found a special filesystem entry."] ["linked"]
```

Same state, same evidence, different reason. The suite is green either way.

**Fix**: for each refusal path, assert the exact reason (or at least the stable prefix), so the
reason text is a checked contract rather than free text. At minimum, the symlink refusal, the
five `FILESYSTEM_CODES` reasons and the three `.project/` refusal messages.

---

## F-5 — MEDIUM — the two `checkedDirectory` symlink guards are redundant with a layer that *is* tested

**File**: `ai-framework/scripts/project-state.mts:109` (in `checkedDirectory`) and
`project-state.mts:112`
**Rule violated**: `testing.md` → "Guards and Fixes": *"a survivor is either a missing test or a
redundant layer, and the record says which."*

| Survivor | Mutant |
|---|---|
| M25 | root symlink check removed (`project-state.mts:266`) |
| M26 | root not-a-directory check removed (`project-state.mts:267`) |
| M27 | `checkedDirectory` symlink check removed (`project-state.mts:109`) |
| M28 | `checkedDirectory` permission check removed (`project-state.mts:111`) |
| M29 | `checkedDirectory` realpath-equality check removed (`project-state.mts:112`) |
| M31 / M32a | ESTALE before-list / after-list check removed (`project-state.mts:211`, `:251`) |

All six survive. Behavioural probe, **baseline**:

```
BASELINE symlinked ROOT   -> "unclear" ["Cannot inspect the project root (ELOOP)."]
BASELINE symlinked SUBDIR -> "unclear" ["Found a symbolic link."] ["linked"]
BASELINE root is a FILE   -> "unclear"
BASELINE dir mode 0       -> "unclear" ["Cannot inspect the project root (EACCES)."]
BASELINE nested mode-0 dir-> "unclear" ["Cannot list directory safely (EACCES)."] ["app.ts","secret"]
```

With **M28** applied (permission check deleted), the nested mode-0 directory is still `unclear`
— because `readdirSync` on a mode-0 directory *also* raises `EACCES`, and the `catch` at
`project-state.mts:214` converts it into the same refusal. The permission check is a **second
line of defence that is never the first to fire**, so removing it changes nothing observable.

With **M25** removed, the root symlink is still refused: `realpathSync` resolves the link, and
`checkedDirectory(resolved)` compares `before` (the link's lstat) with the resolved directory via
`sameDirectory` (`project-state.mts:269`), which sees different `dev`/`ino` → `ESTALE` → refused.
Same outcome, different reason.

With **M31**/**M32a** removed, the "directory changed during listing" detection is lost, but the
suite's only race test (`test.mts:304`, "a directory that changes during listing cannot produce
empty") still passes because the *before*-list check at `project-state.mts:211` catches the same
swap. Two checks, one effect; only one is exercised.

**Failure scenario**: these are defence-in-depth layers, and that is a legitimate design — but the
suite does not know which layer is which, so a future change that removes the *first* line of
defence will not be caught by the test that currently "proves" the guard. The recorded
sibling pattern is the same one the pitch already hit: *"the full verifier failed after the worker
reported green"* (`log.md`).

**Fix**: state the redundancy in a comment and keep the *outermost* layer tested; or, for the
permission check, assert the specific reason (`EACCES` from `checkedDirectory`) rather than the
state, so the intended layer is the one under test.

---

## F-6 — LOW — budget and length bounds are never exercised near their limit

**File**: `ai-framework/scripts/project-state.mts:16-21`
**Rule violated**: `testing.md` → "Each guard or bound has a test that fails when it is removed".

| Survivor | Mutant |
|---|---|
| M52 | depth guard `>` changed to `>=` (`project-state.mts:203`) |
| M59 | `MAX_EVIDENCE_LENGTH` 240 → 100000 (`project-state.mts:20`) |
| M61 | `MAX_MANIFEST_BYTES` raised (`project-state.mts:21`) |
| M62 | `MAX_RELATIVE_LENGTH` 4096 → 100000 (`project-state.mts:18`) |
| M64 | evidencePath stops stripping `Cf` (`project-state.mts:94`) |
| M66/M67/M68 | `safeComponent` stops rejecting `:` / NUL / empty name (`project-state.mts:89-91`) |
| M97 | evidencePath stops stripping `Cc` (`project-state.mts:94`) |
| M07 / M08 | `safeComponent` stops rejecting `..` / `/` (`project-state.mts:89-91`) |

**M52** is the sharpest: the depth-budget test (`test.mts:226`) builds
`${"d/".repeat(MAX_SCAN_DEPTH + 1)}app.ts`, i.e. depth 33 against a limit of 32. Moving the
guard from `>` to `>=` changes which depth is refused but **not whether** a fixture at depth 33 is
refused — the test still sees `unclear` with a depth reason. The off-by-one is invisible.

**M59** (evidence length bound): the only long-path fixture
(`test.mts:347-352`, `src/${"a".repeat(120)}/${"z".repeat(210)}.ts`) produces an evidence string
of about 337 characters, so raising the bound from 240 to 100000 does change the output — but the
test asserts only `result.evidence[0].length < longPath.length` (`test.mts:352`), which stays
true for both the truncated (240) and untruncated (337) forms. The truncation itself is never
asserted. Same for **M10** (`evidencePath` length bound removed — also a survivor) and **M64**
(stripping `Cf` — the fixture's `\u202e` is a `Cf` character, but the test only asserts the
character is *absent*, and it is absent in the mutant too because the filename simply loses it).

**Fix**: assert the exact evidence string for the long-path fixture (e.g. `length === 240` and a
trailing `…`), and add a fixture exactly at `MAX_SCAN_DEPTH` to pin `>` versus `>=`.

---

## F-7 — LOW — `assertState` cannot fail on an empty evidence array for `unclear`

**File**: `ai-framework/scripts/project-state.test.mts:65-73`
**Rule violated**: `testing.md` → vacuous assertion (the helper accepts a result that says
nothing).

```ts
function assertState(root: string, state: string, overrides: RuntimeDeps = deps) {
  const result = detectProjectState(root, overrides);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.state, state, JSON.stringify(result));
  assert.ok(result.reasons.length > 0);
  assert.ok(result.reasons.every((reason) => !reason.includes(root)));
  assert.ok(result.evidence.every((relative) => !path.isAbsolute(relative)));
  return result;
}
```

`result.evidence.every(...)` on an **empty** array is `true` — a vacuous assertion. Every call
site that uses `assertState` for `unclear` (e.g. `test.mts:268`, `test.mts:266`) is therefore
satisfied by an `unclear` result with **no evidence at all**, which the contract
(`plan.md`: *"`unclear` — Something could not be judged"*) does not require but which would make
the `/setup` prompt useless. The call sites that matter pass a separate explicit
`assert.deepEqual(result.evidence, [...])` (`test.mts:135`, `:185`, `:195`, `:222`, `:342`), so
this is a latent weakness of the shared helper rather than a live wrong answer.

`assert.ok(result.reasons.length > 0)` is also weak: it does not check that the reasons describe
*this* scan.

**Fix**: in `assertState`, assert `result.evidence.length > 0` whenever `state !== "empty"`, and
assert the exact reason set for each `unclear` case.

---

## F-8 — LOW — the plan's required case list is not fully matched by the suite

**File**: `.project/pitches/04-greenfield-kickoff/plan.md:55-65` vs
`ai-framework/scripts/project-state.test.mts`
**Rule violated**: `testing.md` → the plan's machine-checkable exit criteria are the contract.

The plan lists ten required fixture cases. All ten are present, but two are covered only
partially:

- *"an unreadable folder"* — covered twice: once by `test.mts:190` (a real mode-0 directory at
  the **root** of the project) and once by `test.mts:167` (a `readdirSync` injection at a
  **nested** path). The nested case is the one with the mutation proof
  (`PROJECT_STATE_TEST_MUTANT=1`, verified below). The root case is skipped on Windows
  (`test.mts:190`) and there is no Windows equivalent.
- *"a scan past its budget"* — `test.mts:201` injects a synthetic 4097-entry listing through
  `readdirSync`. That is a good test of the accounting, but it never exercises the real
  `MAX_SCAN_ENTRIES` against a real tree, so the bound's practical usefulness is unmeasured.

Also: the plan requires *"Golden case `not-actually-empty` is bound to a test whose name starts
with `[not-actually-empty]`"*. `test.mts:100` satisfies this, and it is present and passing.

**Plan-required mutation proof — verified working:**

```
$ PROJECT_STATE_TEST_MUTANT=1 node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
✖ fail-closed: a refused directory stays unclear and preserves known evidence
ℹ tests 35
ℹ pass 34
ℹ fail 1
```

Exactly one test fails, for the right reason (`existing` where `unclear` is expected). This
satisfies `plan.md:69` for that one guard. **It is the only guard with a mutation proof in the
suite**, which is the gap this report is about.

---

## Checklist, item by item

| `testing.md` checklist item | Result |
|---|---|
| Each guard or bound has a test that fails when it is removed | **Partial.** 54/103 mutants killed. 47 survivors listed above: 6 dead-code, 12 redundant-layer, 15 unasserted-wording, 14 bound-never-reached. |
| Fixes to shared helpers were traced through all callers | Not applicable — this scope adds no shared-helper change. The pre-existing `readProjectText` reuse is the only shared call. |
| Unit tests for utility functions | Done for the exported surface (`detectProjectState`, `main`, `MAX_SCAN_*`). Internal helpers (`safeComponent`, `evidencePath`, `errorCode`, `stateResult`) are covered only indirectly. |
| Validation schema tests | Done — `test.mts:373` asserts the exact JSON key set `{evidence, reasons, schemaVersion, state}`. |
| Component render tests | Not applicable. |
| User interaction tests | Not applicable (CLI). `main` is covered for `--json`, `--root`, usage errors, duplicate flags, and a missing `--root` value (`test.mts:365-396`). |
| Authorization paths tested (happy + rejection) | Not applicable. |
| Edge cases (empty, error) | Done for the four states (`empty`, `existing`, `unclear`, `resume`) — `test.mts:365` asserts each state through `main`. |
| Accessibility | Not applicable. |
| Read-only fixture unchanged after a run | Done and strong — `test.mts:75-80` and `:100-107` snapshot the tree before and after. |
| No process spawned by the detector | Done — `test.mts:271` refuses `child.run`, `child.runSync`, `child.runBytesSync`, and every write API. |
| Golden case binding `[not-actually-empty]` | Done — `test.mts:100`. |
| Plan's mutation proof | Done for one guard only (`plan.md:69`). |

---

## What I tried that did not work

1. **My first mutation harness reported every mutant as KILLED.** The harness summarised the
   test output with `/# fail (\d+)/`, but Node's default reporter prints `ℹ fail 0`; the regex
   never matched, so `failCount` was `-1`, and the run was classified by an exit code that was
   never 0 because `execFileSync` exceeded the default 1 MB `maxBuffer` on the TAP output.
   **Control mutant S00 (a no-op — the unmodified baseline) was reported KILLED**, which is what
   exposed the fault. Fixed by using `--test-reporter=tap`, `maxBuffer: 64 MB`, and matching
   `/(?:# fail |fail )(\d+)/`. After the fix: **S00 SURVIVED (fail=0 pass=35)** and
   **S01 (throw on every scan) KILLED**.
2. **The staged copy failed all 35 tests** for a reason unrelated to the mutation:
   `cpSync`'s filter `!src.includes("/.git")` also matched `.gitkeep`
   (`ai-framework/templates/project/pitches/_archive/.gitkeep`), so every staged copy was missing
   scaffold files and `installedFixture` threw `ENOENT`. Fixed by filtering on
   `path.basename(src) !== ".git"`.
3. **Two mutants could not be applied** (the anchor string appeared 0 or 2 times): the
   after-listing ESTALE check (M32) and the `ENFILE` errno entry (M96). M32 was re-anchored on a
   unique multi-line context and applied as **M32a** (survived).
4. **Running the mutants in worker threads** initially failed three times because `process.argv`
   is not populated in a Node worker thread — the module-level `path.resolve(process.argv[2])`
   and `readFileSync(process.argv[3])` threw. Fixed by passing `root` and the mutant through
   `workerData`.
5. **I could not exercise `bun test`** (the plan's second exit command). Bun is not installed in
   this environment, so the Bun half of `plan.md:54` is **unverified** by this review.

## Commands

```sh
# baseline (canary restored to the repo's version)
node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
# -> tests 35, pass 35, fail 0

# mutation harness (copies of the tree inside the work folder)
node mutate2.mjs "$PWD" all.json 8
# -> KILLED 54, SURVIVED 47, NOT-APPLIED 2 (of 103)

# built-in mutation proof
PROJECT_STATE_TEST_MUTANT=1 node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
# -> pass 34, fail 1 ("fail-closed: a refused directory ...")

# the planted canary (baseline -> canary), for the record
#   "if (scan.issues.length > 0) {" -> "if (scan.issues.length > 0 && scan.files.length === 0) {"
# -> fail=5 pass=30 (killed by 5 tests)
```

## Note on the audited tree

The scratch copy under audit shipped with a **planted mutation** in
`ai-framework/scripts/project-state.mts:289`
(`if (scan.issues.length > 0)` → `if (scan.issues.length > 0 && scan.files.length === 0)`),
which made 5 of the 35 tests fail out of the box. I restored the repo's version before
measuring, and I report the baseline behaviour throughout. The mutation is **not** a defect in
the change under review; the canary is killed by the suite, which is the desired outcome. I
report it only because it changed the starting state of the tree I was handed.
