# Test-coverage review — fix-bun-project-preload

Reviewer role: test-coverage-checker. Rule applied: `ai-framework/rules/testing.md`
("Guards and Fixes", "Prove the Test Can Fail").

Scope reviewed: the S1 change set named in `contract/log.md` and `contract/s1-brief.md`:
`ai-framework/scripts/runtime/entry.mts` (`bunIsolationOptions`, `workflowInvocation`),
new `ai-framework/scripts/runtime/bun-isolated.toml`, `ai-framework/scripts/orca-run.mts`
(`checkCatalog`), `ai-framework/scripts/orca-eval-grader.mts` (`catalog`),
`ai-framework/scripts/runtime/entry.test.mts`, `ai-framework/scripts/runtime/runtime.test.mts`,
`ai-framework/scripts/setup-validator.test.mts`, `ai-framework/scripts/orca-run.test.mts`,
`ai-framework/scripts/orca-eval-grader.test.mts`,
`ai-framework/templates/shipped-files.txt`, `README.md`,
`ai-framework/scripts/runtime/README.md`.

All probing was done on copies inside the review work folder; every mutated file was restored
and verified byte-identical to its original before the review ended (`diff` clean for
`entry.mts`, `orca-eval-grader.mts`, `runtime.test.mts`; `orca-run.mts` verified by the content
of lines 2/47/48).

---

## Findings

### F1 — High — `ai-framework/scripts/orca-run.mts:47` — the Bun check catalog is not isolated, and the shipped test suite is RED because of it

**Rule violated:** `ai-framework/rules/testing.md`, "Each guard or bound has a test that fails when
it is removed" / "Prove the Test Can Fail" — here inverted: the guard test exists and correctly
fails, which proves the *implementation* is missing the guard. Also violates the S1 exit criterion
"The direct launches in `orca-run.mts` and `orca-eval-grader.mts` use the same options."

`checkCatalog` imports `bunIsolationOptions` (line 2) but never calls it. The Bun branch
builds an **empty** flag list:

```ts
// ai-framework/scripts/orca-run.mts:47-48
const scriptFlags = deps.runtime === "node" ? NODE_FLAGS : [];
const script = (file: string, ...rest: string[]): CheckSpec => ({ command: deps.proc.execPath, args: [...scriptFlags, file, ...rest] });
```

So under Bun, `workflow-doctor`, `setup-validator` and `graph-check` are launched as bare
`bun ai-framework/scripts/workflow-doctor.mts --json` from the project's working folder. That is
exactly the launch shape the fix is supposed to protect, so a project `bunfig.toml` preload and a
project `.env` are still loaded into these three reconcile checks.

**Concrete failure scenario (command run and output):**

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-run.test.mts
✖ --check names map to the fixed catalog argv and checks receive only the worker env allowlist (433.169916ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  [
  -   '--config=/private/tmp/.../ai-framework/scripts/runtime/bun-isolated.toml',
  -   '--no-env-file',
  -   '--no-install',
      'ai-framework/scripts/workflow-doctor.mts',
      '--json'
    ]
  ...
  actual: [ 'ai-framework/scripts/workflow-doctor.mts', '--json' ],
  expected: [ '--config=/private/tmp/.../runtime/bun-isolated.toml', '--no-env-file', '--no-install', 'ai-framework/scripts/workflow-doctor.mts', '--json' ],
  at TestContext.<anonymous> (file:///.../ai-framework/scripts/orca-run.test.mts:340:12)
ℹ tests 37
ℹ pass 36
ℹ fail 1
ℹ skipped 0
```

The same failure reproduces under Bun:

```
$ bun test ai-framework/scripts/orca-run.test.mts
 36 pass
 1 fail
Ran 37 tests across 1 file. [5.26s]
```

**Proof the test is right and the implementation is wrong:** I changed line 47 to
`const scriptFlags = deps.runtime === "node" ? NODE_FLAGS : bunIsolationOptions();` (inside the
review work folder only), and the suite went green on both runtimes:

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-run.test.mts
ℹ tests 37
ℹ pass 37
ℹ fail 0
ℹ skipped 0
$ bun test ai-framework/scripts/orca-run.test.mts
 37 pass
 0 fail
```

I then restored line 47 to the shipped value and re-confirmed the failure returns (36/37 on Node
and on Bun). So `orca-run.test.mts:329-342` is a correctly-written guard test that is currently
red. The red test is the evidence; the missing `bunIsolationOptions()` call in the implementation
is the defect. This is a shipping blocker for the exit criterion
"The changed test files pass on Node and on Bun with Bun tests not skipped."

Note the `bunIsolationOptions` import at `orca-run.mts:2` is currently unused — a lint-visible
symptom of the same omission.

---

### F2 — High — `ai-framework/scripts/orca-eval-grader.mts:214` — the grader's Bun check catalog has no reachable test

**Rule violated:** `ai-framework/rules/testing.md`, "Each guard or bound has a test that fails when
it is removed" and "Prove a guard test with an in-memory mutant. A guard test that passes against a
planted mutant has not earned its keep." The S1 brief requires the grader's "non-test Bun launches
use the same helper"; nothing proves it.

The implementation is correct:

```ts
// ai-framework/scripts/orca-eval-grader.mts:213-215
function catalog(ctx: Ctx): Record<string, CheckSpec> {
  const flags = ctx.deps.runtime === "bun" ? bunIsolationOptions() : [];
  const evaluate = (code: string): CheckSpec => ({ command: ctx.deps.proc.execPath, args: [...flags, "-e", code] });
```

but there is **no test that can fail if it regresses**. The only assertion of these flags is at
`ai-framework/scripts/orca-eval-grader.test.mts:131-136`:

```ts
const evalArgs = deps.runtime === "bun"
  ? [`--config=${urlPath(new URL("./runtime/bun-isolated.toml", import.meta.url))}`, "--no-env-file", "--no-install", "-e"]
  : ["-e"];
assert.ok(checkArgs.length > 0, "grader ran at least one eval check");
for (const args of checkArgs) assert.deepEqual(args.slice(0, -1), evalArgs);
```

That assertion is **doubly gated** and never executes in a normal project:

1. It lives inside the test at `orca-eval-grader.test.mts:120`, which carries the `REAL` option.
   `REAL` is defined at line 21 as
   `{ ...SLOW, skip: deps.fs.existsSync(deps.path.join(ROOT, DATASET_FILE)) ? false : "the Orca grader dataset is bundle-repo data (not synced into projects)" }`.
   The dataset (`DATASET_FILE`) lives under `.project/evals/` and `bundle-sync` never ships it, so
   in every installed project — and in this review folder — this test is skipped.
2. Even when it does run, the Bun branch only executes when `deps.runtime === "bun"`. The test
   never forces a Bun runtime; `deps` comes from `createTestDeps()` (line 15), which resolves the
   runtime from the actual process. Under `node --test` the Bun branch of `evalArgs` is dead code.

**Concrete failure scenario (command run and output):** I replaced the implementation's
`bunIsolationOptions()` call with an empty list (the exact regression the contract forbids) and
the suite stayed green:

```
$ sed -i '' 's|  const flags = ctx.deps.runtime === "bun" ? bunIsolationOptions() : \[\];|  const flags = ctx.deps.runtime === "bun" ? [] : []; // MUTANT|' ai-framework/scripts/orca-eval-grader.mts
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/orca-eval-grader.test.mts
✔ an always-pass grader is detected by the mutation harness
✔ a hostile worker summary is data: it changes no route, vendor, path or approval
✔ fixture scopes pass explicit trusted authority independently of a hostile worker summary
✔ unknown case ids are not passes, and a missing dataset is reported as an error
✔ the dataset reader refuses a symlinked file, a symlinked parent and an oversize file
✔ the module imports no node: module, uses no any and guards its main with one direct-entry call
✔ loadConfig branch: the grader's written policy is read through loadConfig/readPolicy as legacy, and a TOON file beside it wins
ℹ tests 18
ℹ pass 7
ℹ fail 1
ℹ skipped 10
✖ failing tests:
✖ opencode-agent-id-resolves-from-installed-agents (0.528334ms)
```

The one failure (`opencode-agent-id-resolves-from-installed-agents`) is a **pre-existing sandbox
fixture gap**, not the mutant: the grader dataset is absent from this work folder, so `gradeAll`
returns no case for it. It fails identically with the pristine implementation, so it is not a
signal about the mutation. The mutation itself produced **zero** additional failures — the
grader's Bun isolation is entirely unguarded. I restored the file and verified it byte-identical
to the original.

**Why this matters beyond the grader:** `catalog()` in the grader is the same shape as
`checkCatalog()` in `orca-run.mts`. F1 shows the `orca-run` twin actually regressed. The grader
twin is currently correct but has no test that would notice if it regressed the same way. A
minimal guard is a non-skipped test that calls the catalog with `runtime: "bun"` and asserts the
exact args — `catalog` is currently not exported, so this needs a small export or a
`deps.runtime = "bun"` fixture-based grade.

---

### F3 — Medium — `ai-framework/scripts/runtime/entry.test.mts` — "a missing config file must stay a failure" is unguarded

**Rule violated:** `ai-framework/rules/testing.md`, "Each guard or bound has a test that fails when
it is removed"; `contract/s1-brief.md` states it explicitly: *"A missing config file must stay a
failure. Do not fall back to launching without the options."* No test asserts it.

The shipped implementation is correct — `bunIsolationOptions()` always returns
`["--config=<abs path>", "--no-env-file", "--no-install"]` and never probes the filesystem:

```ts
// ai-framework/scripts/runtime/entry.mts:12-15
export function bunIsolationOptions(): string[] {
  const config = fileURLToPath(new URL("./bun-isolated.toml", import.meta.url));
  return [`--config=${config}`, "--no-env-file", "--no-install"];
}
```

But nothing holds that line in place. **Concrete failure scenario (command run and output):** I
planted the exact forbidden fallback — skip the `--config` option when the file is absent, which
re-opens the original security hole — and the full entry suite stayed green:

```
$ sed -i '' 's|  return \[`--config=${config}`, "--no-env-file", "--no-install"\];|  if (!existsSync(config)) return ["--no-env-file", "--no-install"];\n  return [`--config=${config}`, "--no-env-file", "--no-install"];|' ai-framework/scripts/runtime/entry.mts
$ sed -i '' 's|^import \* as path from "node:path";|import * as path from "node:path";\nimport { existsSync } from "node:fs";|' ai-framework/scripts/runtime/entry.mts
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/entry.test.mts
✔ workflow children select the declared executable in both directions
✔ child overrides win, sanitized environments retain the selected runner, invalid choices fail
✔ prefixes Bun eval and build options while preserving test-run arguments
✔ sync and async workflow dispatch use the same selection and preserve spawn options
✔ unisolated Bun control exposes both markers and inlines the dotenv marker in a build
✔ workflow Bun script ignores project preload and dotenv markers
✔ workflow Bun eval ignores project preload and dotenv markers
✔ workflow Bun build leaves the dotenv variable uninlined and emits neither marker
✔ Node runDirect respawns Bun without project preload or dotenv markers
✔ loadConfig branch: readRunner takes the runner from ai-workflow.toon, falls back to the legacy file, and fails closed on invalid TOON
ℹ tests 10
ℹ pass 10
ℹ fail 0
ℹ skipped 0
```

The mutant is not cosmetic. In a scratch project with a marker preload and a marker `.env`
(inside the review work folder only), the fallback behaviour re-enables the preload that the
whole pitch exists to stop:

```
$ bun --no-env-file --no-install ./marker.mts
PRELOAD-RAN
env MARK = undefined
```

versus the correct behaviour, which is a hard failure:

```
$ bun --config=/nonexistent/x.toml --no-env-file --no-install ./marker.mts
ENOENT: /nonexistent/x.toml: No such file or directory (open())
while reading config "/nonexistent/x.toml"
```

So a silent fallback would restore the vulnerability with no test failing. The guard that is
missing is a test that (a) removes or points away from `bun-isolated.toml` and (b) asserts the
launch fails rather than proceeding with reduced options — e.g. a fixture whose runtime dir has
no `bun-isolated.toml`, asserting a non-zero status and that the preload marker did **not**
appear.

I restored `entry.mts` and verified it byte-identical to the original.

---

## What the tests do cover well (verified by mutation)

The real-Bun tests in `entry.test.mts` are genuinely strong. I confirmed each of the three
options and the test-run exemption is guarded, by mutating the implementation and re-running.
Every mutant below produced the expected red.

| Mutation in `entry.mts` | Result |
|---|---|
| Drop `--no-env-file` from `bunIsolationOptions()` | 4 fail / 6 pass — caught |
| Drop `--config=...` from `bunIsolationOptions()` | 5 fail / 5 pass — caught |
| `flags = []` for every Bun launch (the original bug) | 6 fail / 4 pass — caught |
| Remove the `test`-run exemption (`flags = bunIsolationOptions()` always) | 5 fail / 5 pass — caught |

Sample output for the original-bug mutant (`flags = rest[0] === "test" ? [] : []`):

```
✖ workflow Bun script ignores project preload and dotenv markers (10.647459ms)
✖ workflow Bun eval ignores project preload and dotenv markers (13.182333ms)
✖ workflow Bun build leaves the dotenv variable uninlined and emits neither marker (10.177583ms)
✖ Node runDirect respawns Bun without project preload or dotenv markers (81.21725ms)
ℹ tests 10
ℹ pass 4
ℹ fail 6
ℹ skipped 0
```

Specific strengths worth recording:

- **`entry.test.mts:87` — the unisolated control.** `unisolated Bun control exposes both markers
  and inlines the dotenv marker in a build` launches raw `bun ./marker.mts` and raw
  `bun build --no-bundle --env=WORKFLOW_BUN_TEST_* ./marker.mts` in the same fixture and asserts
  **both** markers appear and that the dotenv value is inlined. This proves the fixture can detect
  the markers, so the other four tests cannot pass for the wrong reason. This is the single most
  important test in the change and it is correct.
- **`entry.test.mts:100` — script and `-e` launches.** Both go through the real `runWorkflowSync`
  with `AI_WORKFLOW_RUNNER=bun` and a real Bun child, asserting the exact stdout (`"no dotenv"`)
  and empty stderr. The `-e` case also asserts `process.argv.slice(1)` is `["a b","--json"]`,
  covering the S1 brief's "Check whether `node -e` style argument handling still works when the
  options come first under Bun."
- **`entry.test.mts:106` — build launch.** Asserts `process.env.WORKFLOW_BUN_TEST_MARKER` is *not*
  inlined (so `--no-env-file` reaches the bundler) and that neither marker appears anywhere in
  stdout+stderr.
- **`entry.test.mts:114` — the Node → Bun respawn.** A real `node` process runs `./direct.mts`,
  which calls `runDirect` from `runtime/cli.mts`; the fixture asserts stdout is exactly
  `"bun\nno dotenv"`. This exercises `cli.mts:16` → `workflowInvocation` on the respawn path, i.e.
  the route a user actually takes, and it is a real process, not a mocked spawn.
- **`entry.test.mts:65-66` — the skip condition.** `skipBun` is
  `spawnSync(bunExecutable, ["--version"]).error?.code === "ENOENT"`. Only a genuinely absent
  `bun` executable skips; a broken or slow `bun` does not. The skip is bounded to the real-Bun
  tests, and the pure-argument tests are never skipped.
- **Skip count is 0 on this machine**, as the brief requires. Verified under both runners:
  `node --test ai-framework/scripts/runtime/entry.test.mts` → `tests 10, pass 10, fail 0, skipped 0`;
  `bun test ai-framework/scripts/runtime/entry.test.mts` → `10 pass, 0 fail`.
- **`run-tests.test.mts:139`** asserts `viaEnv.launches[0].args[0] === "test"`, which pins that a
  Bun *test* run is not prefixed with isolation options — the contract's "test runs are unchanged".
- **`setup-validator.test.mts:309-314`** asserts that under `runtime: "bun"` the parse check is
  launched as `[...bunIsolationOptions(), "build", "--no-bundle", ...]`. It passes, and it is a
  real guard: `setup-validator.mts:144` routes through `runWorkflow` → `workflowInvocation`, so the
  options are applied by the shared launcher rather than by a bespoke call site.
- **`runtime.test.mts:506`** — the added
  `copyFileSync(join(here, "bun-isolated.toml"), join(runtime, "bun-isolated.toml"))` is
  load-bearing and correctly placed. The fixture's copy loop above it (lines 503-505) only copies
  `*.mts` files, so without this line the copied runtime has no config file. I removed the line
  and the Bun-respawn tests failed with exactly the right error:
  `ENOENT: .../ai-framework/scripts/runtime/bun-isolated.toml: No such file or directory (open())
  while reading config "..."` at `runtime.test.mts:646`. I also confirmed the failure at the
  process level with a standalone fixture in the review folder.

---

## Unverified / sandbox gaps (not change defects)

These failures exist in the pristine work folder and are caused by files that `bundle-sync` does
not ship into projects, or by files the review folder does not carry. They are **not** caused by
the change and I did not report them as findings.

| File | Result | Cause |
|---|---|---|
| `ai-framework/scripts/orca-eval-grader.test.mts` | 7 pass / 1 fail / 10 skipped | The `opencode-agent-id-resolves-from-installed-agents` case needs the bundle's `.project/evals` dataset, absent here. Fails identically before and after any mutation. This gap is what hides F2. |
| `ai-framework/scripts/setup-validator.test.mts` | 41 pass / 1 fail | `the bundle's own entry files still carry the identity sentence…` needs `CLAUDE.md` at the work-folder root; not present in this folder. The changed test `under the bun runtime .mts entries are transpile-checked` **passes**. |
| `ai-framework/scripts/run-tests.test.mts` | 10 pass / 1 fail | `the real bundle's full selection is every test file under both roots` needs `.claude/hooks/post-edit-check.test.mts`; `.claude/` in this folder contains only `agents/`. |
| `ai-framework/scripts/runtime/runtime.test.mts` | 62 pass / 0 fail / 0 skipped | Passes. Note: running it *together with* `entry.test.mts` in one `node --test` invocation produces no output (the `node:test run() is being called recursively within a test file` warning) because the entry fixture spawns nested runners. Run the files separately to read the counts. Same artifact for `run-tests.test.mts`. |

## Things I tried that did not work

- `node --test <entry.test.mts> <orca-run.test.mts>` in a single invocation: the parent's reporter
  output is swallowed by the nested runners the entry fixture spawns. Running the files separately
  gives full counts.
- `node --test --test-reporter=tap` on `entry.test.mts`: also produced no output in the combined
  case; `--test-reporter=spec` worked for `runtime.test.mts`.
- `node --test --test-name-pattern="bun runtime" ai-framework/scripts/setup-validator.test.mts`:
  hung/aborted rather than filtering, because that file itself invokes `node --test` recursively.
- Redirecting the runner output to a file (`> probe/out 2>&1`) for `runtime.test.mts` produced a
  0-byte file with exit 0; `--test-reporter=spec` on the same file produced full output. Used
  the latter.
- Trying to run `setup-validator.test.mts` under a name pattern to isolate the Bun assertion
  did not work (see above); I verified that assertion by reading the implementation path
  (`setup-validator.mts:144` → `runWorkflow` → `workflowInvocation`) and by confirming the test
  itself is green in the captured full-file output (`probe/setup-validator.out`).

## Recommended actions, in order

1. Fix `ai-framework/scripts/orca-run.mts:47` to
   `const scriptFlags = deps.runtime === "node" ? NODE_FLAGS : bunIsolationOptions();`.
   This makes `orca-run.test.mts` green on Node and Bun and closes the exit criterion
   "The direct launches in `orca-run.mts` and `orca-eval-grader.mts` use the same options."
2. Add a non-skipped test that exercises `orca-eval-grader.mts`'s `catalog()` with
   `runtime: "bun"` and asserts the exact args, so the grader's Bun branch stops depending on
   the bundle-only dataset.
3. Add a test that the launcher still fails when `bun-isolated.toml` is absent — assert a
   non-zero exit and that the preload marker did not appear — so the forbidden fallback cannot be
   introduced silently.

## Report status

Items F1, F2 and F3 are verified by command and output above. `runtime.test.mts`'s full count
was read from a `--test-reporter=spec` run (62 pass / 0 fail / 0 skipped); the combined
two-file invocation's missing output is a runner artifact, not a skipped test.
