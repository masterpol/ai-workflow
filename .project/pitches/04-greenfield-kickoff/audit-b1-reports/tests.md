# Test-coverage review: greenfield-kickoff part B1

Role: test-coverage-checker. Rule applied: `ai-framework/rules/testing.md` (the "Testing Rule: Test as You Build", the "Guards and Fixes: Prove the Test Can Fail" clause and its in-memory-mutant clause, the "Verification Discipline" clause, and the macOS-tmpdir-realpath clause).

Scope: the new starter-only rule (`ROOT_STARTER_FILE`) and the new `hasBundleSetup` / running-bundle-source-folder skip in `ai-framework/scripts/project-state.mts`, with their tests in `ai-framework/scripts/project-state.test.mts`; the contract in `.project/pitches/04-greenfield-kickoff/plan-b1.md` (including the Living-spec deviations log) and `build/b1-s1-brief.md` / `build/b1-s2-brief.md`.

Everything below was run against the audit copy in `.../scratchpad/b1-audit/tests` only. No file in the repository checkout was written or modified.

## Summary

The suite is **red as shipped**: 2 of 59 tests fail on both Node and Bun, and both failures come from one line of production code. The B1-S2 feature ("check before copying", i.e. skip the running bundle's source folder so an empty project reports `empty` instead of `unclear`) **never activates**: the byte bound used to read the source folder's `SETUP.md` is smaller than that file, so the title check can never succeed and the folder is never skipped. The two red tests are exactly the ones that catch it, so the defect is detected, but the feature is not in the delivered state.

The starter-only rule (`ROOT_STARTER_FILE`, part (a)) is genuinely guarded: two independent mutations of it are both caught by the suite.

**Findings:** 3 (1 high, 1 medium, 1 low).

---

## Finding 1 — HIGH: the source-folder skip can never fire, because the `SETUP.md` read bound is smaller than the file

**File and line:** `ai-framework/scripts/project-state.mts:23` (`const MAX_SETUP_BYTES = 64;`), used at `ai-framework/scripts/project-state.mts:128` inside `hasBundleSetup`, which gates the skip at `ai-framework/scripts/project-state.mts:260`.

**Rule violated:** "Testing Rule: Test as You Build" (the changed behaviour must have a test that passes) and the plan's exit criterion "`.project/pitches/04-greenfield-kickoff/plan-b1.md` → B1-S2, `SETUP.md` runs the check from the bundle's source folder before Step 1 writes anything, and the check skips that folder" (Living-spec deviations log, first entry).

**Failure scenario.** `hasBundleSetup` calls the shared guarded reader `readProjectText(directory, "SETUP.md", MAX_SETUP_BYTES, deps)`. That reader is `readProjectBytes` in `ai-framework/scripts/consolidation-migrate.mts:54-72`, and it rejects the file *before* reading it:

```
if (!before.isFile() || before.nlink !== 1 || before.size > cap) throw new Error(`Not a plain bounded file: ${relative}`);
```

The bound is therefore a bound on the **whole file**, not on the part that is inspected. `isBundleSetup` (`ai-framework/scripts/entry-import.mts:16`) only needs the first line, but the reader demands the entire file fit inside the cap. The bundle's own `SETUP.md` is 26,968 bytes and `MAX_SETUP_BYTES` is 64, so the read always throws, `hasBundleSetup`'s `catch` returns `false`, and the running source folder is always scanned. The whole B1-S2 behaviour ("an empty project with the bundle folder inside it reports `empty`") is unreachable. The failure is fail-safe in shape — the scan degrades to `unclear` — but it is exactly the old behaviour the owner's Living-spec deviation replaced, so the delivered feature is absent while the documentation asserts it is present (`SETUP.md:72-74`: "The check skips the running source folder when it is a direct child of the project root").

Command and output:

```
$ node --input-type=module -e '
import { readProjectText } from "./ai-framework/scripts/consolidation-migrate.mts";
import { createNodeDeps } from "./ai-framework/scripts/runtime/node.mts";
const deps = createNodeDeps();
for (const cap of [64, 128, 4096, 32768, 65536]) {
  try {
    const t = readProjectText(process.cwd(), "SETUP.md", cap, deps);
    console.log("cap", cap, "-> isBundleSetup:", isBundleSetup(t));
  } catch (e) { console.log("cap", cap, "-> THREW:", e.message); }
}'
THREW: Not a plain bounded file: SETUP.md      # cap 64  (the shipped value)
THREW: Not a plain bounded file: SETUP.md      # cap 128
THREW: Not a plain bounded file: SETUP.md      # cap 4096
isBundleSetup: true                            # cap 32768
isBundleSetup: true                            # cap 65536
```

The suite, run as instructed:

```
$ node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
✖ checks the project before copying from a renamed source folder (252.300ms)
✖ only the running source copy is skipped (414.43025ms)
ℹ tests 59
ℹ pass 57
ℹ fail 2
```

Failure detail for the first test:

```
AssertionError [ERR_ASSERTION]: {"schemaVersion":1,"state":"unclear",
  "reasons":["Found an unrecognized project file.","Evidence capped at 32 paths."],
  "evidence":["workflow download/.00-local-data", ...]}
  'unclear' !== 'empty'
  at TestContext.<anonymous> (.../project-state.test.mts:111:10)
```

Bun reproduces it identically (`bun test ai-framework/scripts/project-state.test.mts` → `57 pass`, `3 fail` — the third is "the shipped manifest matches Git", which fails only because the audit copy is not a Git checkout and is excluded from my scope). So the failure is runner-independent and not an artifact of the audit copy.

**Proof that this one line is the whole defect.** I copied the audit tree to a scratch directory (outside the audited files), changed only `MAX_SETUP_BYTES` to `1024 * 1024`, and re-ran the same command:

```
$ node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts
ℹ tests 59
ℹ pass 59
ℹ fail 0
```

Setting the cap to 4096 instead — still below the file size — restores exactly the same 2 failures, so the guard on the cap is real and the boundary is sharp:

```
$ # cap = 4096
✖ checks the project before copying from a renamed source folder
✖ only the running source copy is skipped
ℹ tests 59  ℹ pass 57  ℹ fail 2
```

**Divergence from the established pattern in this codebase.** `setup-validator.mts:28,46,168` performs exactly the same "read `SETUP.md`, then `isBundleSetup(text)`" check with the same shared reader, and uses `const MAX_PROJECT_FILE_BYTES = 1024 * 1024`. B1-S2 introduced a second, much smaller bound for the same operation. Following the existing pattern (`MAX_PROJECT_FILE_BYTES`-scale bound, or a reader that reads only the first line) removes the defect.

**Note on the design, beyond the one-line fix.** With `readProjectBytes`, *any* bound smaller than the file size is fatal, so a fixed cap of, say, 64 KiB would silently break again the first time `SETUP.md` grows past it, and the failure mode is a silent regression to `unclear` rather than an error. The two red tests do catch that regression, because the fixture copies the real `SETUP.md` (`project-state.test.mts:87`), so the coupling is guarded — but the coupling is to the file's *current* size, and nothing documents or asserts the relationship. Reading only the first line (the marker is 40 bytes) would remove the coupling entirely.

---

## Finding 2 — MEDIUM: "a source copy two levels down is still scanned" passes for the wrong reason and cannot fail today

**File and line:** `ai-framework/scripts/project-state.test.mts:136-143` (test "a source copy two levels down is still scanned"), guarding `ai-framework/scripts/project-state.mts:260` (`depth === 0 && ...`).

**Rule violated:** `ai-framework/rules/testing.md` → "Guards and Fixes: Prove the Test Can Fail" and "Prove a guard test with an in-memory mutant: A guard test that passes against a planted mutant has not earned its keep."

**Failure scenario.** The test's job is to prove the `depth === 0` guard: a running source folder that is *not* a direct child of the scanned root must still be scanned. Because `hasBundleSetup` currently always returns `false` (Finding 1), the skip never happens for *any* reason, so the depth guard is never exercised. The test would still pass with the depth guard deleted.

I verified this with an in-memory mutant, following the mutant pattern already used in this file (`project-state.test.mts:288-301`). I built the same real fixture the test builds (the full shipped list plus `SETUP.md` plus the three local files), then ran the fixture's own copy of the script with and without the guard:

```
$ # baseline source: "if (depth === 0 && target === bundle && hasBundleSetup(target, stat, deps)) continue;"
$ # mutant source:   "if (target === bundle && hasBundleSetup(target, stat, deps)) continue;"
BASELINE two-levels-down: {"state":"unclear", "ev":["downloads/ai-workflow-portable/.00-local-data", ...]}
MUTANT(no depth guard) two-levels-down: {"state":"unclear", "ev":["downloads/ai-workflow-portable/.00-local-data", ...]}
```

Byte-identical. The mutant survives: the test does not currently guard the depth condition.

For contrast, with the cap corrected (Finding 1) the same mutant *is* caught, so the test is a genuine guard in the fixed state and only needs Finding 1 repaired before it earns its keep:

```
FIXED-CAP, two levels down          : {"state":"unclear","evHasLocalData":true}   <- guard holds
FIXED-CAP + NO-DEPTH-GUARD, two levels down: {"state":"empty","evHasLocalData":false} <- mutant caught
```

**Why this matters separately from Finding 1.** The same mutation procedure applied to the *other* three new B1-S2 tests shows they are sound today, so the gap is confined to the depth condition:

- "checks the project before copying from a renamed source folder" (line 106) — red now, fails for the right reason once the cap is fixed.
- "only the running source copy is skipped" (line 126) — red now, fails for the right reason once the cap is fixed. Its two assertions together (`evidence.includes("ai-workflow-portable/.00-local-data")` and `evidence.every(r => r.startsWith("ai-workflow-portable/"))`) correctly pin both halves: the non-running copy is scanned and the running copy is not.
- "an installed copy with its own setup title is still scanned from its parent" (line 145) — green today, and green for the right reason: it uses its own `SETUP.md` title (`# Set up this application`), so `isBundleSetup` is false on content, not on size. It passes with the cap fixed as well.
- "a linked setup file is refused as a source marker" (line 156) — green today, and green for the right reason: `readProjectBytes` refuses the symlink at `consolidation-migrate.mts:43` before the size check. It passes with the cap fixed as well.

**Recommended fix (either order works).** Repair Finding 1 first; then re-run the depth mutant to confirm the test fails for the depth reason. If the depth guard is expected to be independently provable before Finding 1 lands, the test needs a fixture whose `SETUP.md` is small enough to fit inside `MAX_SETUP_BYTES` — but that would only prove the depth condition against a marker the production code cannot actually read, so the better route is to fix the bound.

---

## Finding 3 — LOW: the starter-only rule is guarded, but its "root only" boundary is proved by exactly one test case

**File and line:** `ai-framework/scripts/project-state.test.mts:208` (the `docs/README.md` case inside the `existing` table) guarding `ai-framework/scripts/project-state.mts:46` (`ROOT_STARTER_FILE`) and `ai-framework/scripts/project-state.mts:321-323`.

**Rule violated:** "Guards and Fixes: Prove the Test Can Fail" — a surviving mutant must be recorded, and the record must say whether it is a missing test or a redundant layer.

**Failure scenario.** `ROOT_STARTER_FILE` is applied to the whole relative path (`scan.files.every((relative) => ROOT_STARTER_FILE.test(relative))`), and it is anchored with `^`/`$` and contains no `/`, so the "root only" property is achieved by the anchor rather than by an explicit check on the path. I probed that with two in-memory mutants of the production file:

```
MUTANT A (the starter-only branch removed entirely):      8 tests fail, 6 of them the starter tests
MUTANT B (ROOT_STARTER_FILE's ^ anchor removed):          1 extra test fails: "a real install with documents only is existing"
```

So the rule itself is well guarded (mutant A is caught six times over) and the root-only anchor is guarded — but by a **single** data point, the `docs/README.md` row at line 208. If that row were reworded or the table reordered in a way that dropped the case, mutant B would survive silently.

**Recommended fix.** Add one more nested starter path to the `existing` table — for example `src/README.md` and `docs/LICENSE` — so the root-only property rests on more than one path shape. Cost is one table row; no production change.

**Positive result for part (a).** The starter-only rule matches the contract in `.project/pitches/04-greenfield-kickoff/build/b1-s1-brief.md:8` exactly. I checked the regex `^(?:(?:readme|licen[cs]e)(?:\.(?:md|txt))?|\.gitignore)$/i` against every name the brief lists and against its exclusions:

| Name | Required | Regex | Test |
|---|---|---|---|
| `README` / `README.md` / `README.txt` | starter | starter | line 238 |
| `LICENSE` / `LICENSE.md` / `LICENSE.txt` | starter | starter | line 238 |
| `LICENCE` / `LICENCE.md` / `LICENCE.txt` | starter | starter | line 238 |
| `.gitignore` (any case) | starter | starter | line 238 |
| `README.rst` | existing | existing | line 256 |
| `.gitattributes` | existing | existing | line 256 |
| `CHANGELOG.md` | existing | existing | line 256 |
| `COPYING` | existing | existing | line 256 |
| `docs/README.md` | existing | existing | line 208 |

Case-insensitivity is covered (`Readme.txt`, `licence.md`, `.GITIGNORE`, `LICENCE.txt`), bare-name forms are covered (`README`, `LICENSE`, `LICENCE`), and the brief's other requirements are met: `README.md` + `src/app.ts` → `existing` (line 249); a starter file beside a refused entry → `unclear` with the refusal reason and **without** the starter reason (line 266, `assert.deepEqual(result.reasons, ["Found an unrecognized project file."])`); and the rule runs only after a clean scan, because the `scan.issues.length > 0` branch (`project-state.mts:314`) returns before the starter branch (`project-state.mts:321`). The regex carries no `g` flag, so `every()` is not subject to `lastIndex` statefulness.

---

## Things I checked that are not findings

- **The shipped-list-derived fixture** (`copyInstalledFiles`, `project-state.test.mts:32-45`) shares its source with the detector's exclusion authority (`readShippedPaths` reads the same `ai-framework/templates/shipped-files.txt`). Recorded as known and excluded by the brief; noted here only for completeness, not as a finding.
- **The `skipOutsideBundle` gate** (`project-state.test.mts:17`) keys on the SETUP.md text containing `ai-workflow-portable`. It is the same heuristic already used in `setup-validator.test.mts:212`, so it is consistent with the codebase rather than a new invention.
- **The eval dataset** `.project/evals/datasets/greenfield-kickoff.json` parses as valid JSON; the new `check-before-copy` case has the shape the brief requires (`live-observed`, `specified-not-run`, `live-only` binding, and the three forbidden behaviours). It is unrun by design and correctly recorded as such.
- **`ai-framework/scripts/runtime/invariants.test.mts`** passes 8/8, as the B1-S1 and B1-S2 briefs require.
- **`setup-validator.mts` and `workflow-doctor.mts`** report missing generated artifacts (`.project/status.md`, `graphify-out/graph.json`, `.project/rules`, `.project/context/*`). These are missing because the audit copy is a partial tree, not because of B1; they are outside this scope and unrelated to the changed behaviour.
- The two B1-S2 tests that are gated on `skipOutsideBundle` do run in the audit copy (`SETUP.md` contains `ai-workflow-portable` 10 times), so the skip gate is not hiding them.
- The three probes `copySourceFolder` plants inside the source copy (`project-state.test.mts:88-90`) are sufficient: `.DS_Store` is excluded by the OS-metadata rule, but `.project/local.md` (refused: "Found a workflow file outside the bundled scaffold") and `.00-local-data` (refused: "Found an unrecognized project file") both reach the evidence, satisfying the brief's requirement for at least one local file the shipped list does not name.
- The copy-to-root route's documented "expect `unclear`" (`SETUP.md:82`) remains accurate and is unaffected by Finding 1.

## What I tried that did not work

- **Isolating the depth-guard mutant by patching the audited file in place.** I would not write into the audit copy, so I first tried building a mutant via the `data:text/javascript;base64` import trick that `project-state.test.mts:290-301` already uses. That approach cannot work for this mutant: the mutant has to run *from inside the fixture folder* so that `BUNDLE_ROOT` (`inferRoot(import.meta.filename)`) resolves to the fixture, and `import.meta.filename` is not available in a `data:` URL module. I switched to writing the mutant into a scratch copy of the fixture's own script and running it as a subprocess, which is what the audit's own `scanFromCopy` helper does.
- **Running the whole suite against mutants in the audit tree.** I did not do this in place. Instead I copied the tree to a scratch directory outside the audited files and ran the suite there. This is sound because the fixture builder reads the manifest and `SETUP.md` from the same tree it copies, so the copy is self-consistent; the copy also preserves the `skipOutsideBundle` gate (verified: the copied `SETUP.md` contains `ai-workflow-portable` 10 times, so the gated tests still ran rather than being skipped).
- **Testing whether the size bound could be satisfied by reading only the first line.** It cannot with the shared reader: `readProjectBytes` rejects the file on `before.size > cap` *before* opening it, so there is no way to read a prefix through `readProjectText`. The bound must exceed the file's size, or the reader must change.
- **Trying to make the depth guard provable with a small `SETUP.md` in the fixture.** This is not a sound fix: a fixture `SETUP.md` small enough to fit in `MAX_SETUP_BYTES` proves the depth condition only against a marker that the production code cannot actually read from the real bundle. I did not pursue it.
- **Confirming the failure is not macOS tmpdir realpath aliasing.** The `macOS tmpdir realpath` clause in `testing.md` was a plausible alternative explanation (the scan compares `realpathSync` values). It is not: `tempFixture` resolves by default (`runtime/test-helpers.mts:20-23`), and I confirmed directly that `realpathSync(copyFolder) === path.join(realpathSync(root), "workflow download")` in the fixture, so the `target === bundle` precondition holds and the title check is the only failing precondition.

## Recommended order of work

1. Raise `MAX_SETUP_BYTES` in `ai-framework/scripts/project-state.mts:23` to a bound that admits the bundle's `SETUP.md` (the codebase's existing `MAX_PROJECT_FILE_BYTES = 1024 * 1024` is the in-repo precedent), or change the reader so the bound applies to the first line only. Re-run `node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts` — it must be 59/59 — and `bun test ai-framework/scripts/project-state.test.mts`.
2. With the cap fixed, re-run the depth mutant (drop `depth === 0` from `project-state.mts:260`) and confirm that "a source copy two levels down is still scanned" now fails for the depth reason (Finding 2).
3. Add one more nested starter path to the `existing` table at `project-state.test.mts:208` so the root-only property does not rest on a single case (Finding 3).
4. Re-run the B1 exit commands: the project-state suite under Node and Bun, `ai-framework/scripts/runtime/invariants.test.mts`, `setup-validator.mts`, `workflow-doctor.mts`, `graphify-relations.mts --check`, and `ai-framework/hooks/scripts/pre-ship-verify.mts`.

## Unverified items

- `ai-framework/scripts/setup-validator.mts`, `ai-framework/scripts/workflow-doctor.mts` and `ai-framework/hooks/scripts/pre-ship-verify.mts` were not run to a clean exit in the audit copy, because the copy lacks the generated `.project/` artifacts and `graphify-out/` they require. Their behaviour on a complete checkout is unverified here.
- The DOCS.patch content (`SETUP.md`, `README.md`, `ai-framework/docs/setup.md`, `.claude/skills/setup/SKILL.md`, `.cursor/skills/setup/SKILL.md`, the eval dataset) was read as a patch, not as applied files, so the mirror-diff exit criterion (`diff <(sed 1,6d .claude/skills/setup/SKILL.md) <(sed 1,6d .cursor/skills/setup/SKILL.md)`) was not evaluated.
- No live host was run, so the `check-before-copy` eval case stays `not-run`, as the contract requires.
