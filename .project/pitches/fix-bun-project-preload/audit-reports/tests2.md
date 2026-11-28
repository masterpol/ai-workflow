# Test-coverage review — Bun isolation of workflow-started processes

Scope: the security fix that isolates workflow-started Bun processes from the project's
settings. Files under review: `ai-framework/scripts/runtime/entry.mts`,
`ai-framework/scripts/runtime/bun-isolated.toml`,
`ai-framework/scripts/runtime/bun-isolated-tsconfig.json`,
`ai-framework/scripts/orca-run.mts`, `ai-framework/scripts/orca-eval-grader.mts`,
`ai-framework/hooks/scripts/pre-ship-verify.mts`, their tests,
`ai-framework/scripts/runtime/runtime.test.mts`,
`ai-framework/scripts/setup-validator.test.mts`,
`ai-framework/templates/shipped-files.txt`, `README.md`,
`ai-framework/scripts/runtime/README.md`.

Role: test-coverage-checker. Rule applied: `ai-framework/rules/testing.md` (Guards and Fixes).

Every mutation below was applied inside the work folder only, the output was captured, and the
file was restored afterwards. All seven mutated files were re-verified byte-identical to their
originals at the end of the review (`entry.mts` 3837 bytes, `orca-run.mts` 23348,
`orca-eval-grader.mts` 57887, `pre-ship-verify.mts` 16588, `setup-validator.mts` 23928,
`bun-isolated.toml` 182, `bun-isolated-tsconfig.json` 3).

## Baseline (before any mutation)

| Test file | tests | pass | fail | failing test |
|---|---|---|---|---|
| `ai-framework/scripts/runtime/entry.test.mts` | 14 | 12 | **2** | `prefixes Bun eval and build options while preserving test-run arguments`; `workflow Bun build leaves the dotenv variable uninlined and emits neither marker` |
| `ai-framework/scripts/setup-validator.test.mts` | 42 | 40 | **2** | `under the bun runtime .mts entries are transpile-checked`; `the bundle's own entry files still carry the identity sentence the install check looks for` (environmental: the review copy has no `CLAUDE.md`) |
| `ai-framework/scripts/orca-run.test.mts` | 37 | 37 | 0 | — |
| `ai-framework/scripts/orca-eval-grader.test.mts` | 19 | 18 | 1 | `opencode-agent-id-resolves-from-installed-agents` (environmental, unrelated to this change) |
| `ai-framework/hooks/scripts/pre-ship-verify.test.mts` | 28 | 27 | 0 | — |

**Three baseline failures are pre-existing and are themselves the primary finding.**

Command used throughout (the runner aborts with a "recursive run" warning if `NODE_TEST_CONTEXT`
leaks in the environment, so it is unset):

```
unset NODE_TEST_CONTEXT NODE_TEST_WORKER_ID
node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>
```

## Findings

### F1 — High — `ai-framework/scripts/runtime/entry.mts:32`: the shipped code leaves
`bun build` unisolated, contradicting the README, the contract, and two shipping tests

Rule violated: `ai-framework/rules/testing.md` (Guards and Fixes) — a guard must assert the
behavior the product documents; a test that fails against the shipped code is not a passing
guard, it is a red build. Also a contract violation:
`contract/expected.md` states that "A Bun process that the workflow starts, other than a test
run, runs the file it was asked to run. It loads no `bunfig.toml` preload, no `.env` file and
no `tsconfig.json` or `jsconfig.json` path mapping from the project." A `build` invocation is
such a process.

Line 32 reads:

```ts
flags = rest[0] === "test" || rest[0] === "build" ? [] : bunIsolationOptions();
```

`build` is excluded from isolation alongside `test`, so a workflow-started `bun build` runs with
the project's own settings: the project's `bunfig.toml` preload, the project's `.env`, and the
project's `tsconfig.json`/`jsconfig.json` path mapping are all in scope.

This contradicts three places in the change under review:

- `README.md:71` — "Workflow-started Bun script, eval, and **build** commands use the bundle's
  empty Bun and TypeScript …"
- `ai-framework/scripts/runtime/README.md:40` — "Workflow-started Bun script, eval, and
  **build** commands use the adjacent `bun-isolated.toml` and `bun-isolated-tsconfig.json`…"
- `ai-framework/scripts/setup-validator.test.mts:312` — asserts the setup-validator's Bun
  transpile check runs with `[...bunIsolationOptions(), "build", "--no-bundle", …]`

Concrete failure scenario. The setup-validator is a workflow-started Bun process. Its
"TypeScript entries" check runs `bun build --no-bundle <file>` in the *project* root
(`ai-framework/scripts/setup-validator.mts:287`, reached through `runWorkflow`, which routes to
`workflowInvocation`). With the project root as the working directory and no isolation flags, Bun
loads that project's `.env` and that project's TypeScript path mapping.

Probe (project with `.env` containing `PROBE_SECRET=PROBE-FAKE-SECRET-abc123` and a file
`export const x = process.env.PROBE_SECRET;`):

```
$ cd probe/p6
$ bun build --no-bundle --env=PROBE_* ai-framework/scripts/demo.mts
export const x = "PROBE-FAKE-SECRET-abc123";
```

The project's `.env` value is read and inlined into the build output. Whether a value is inlined
depends on the build's `--env=` prefix, so the exposure is not uniform across builds — but the
project's `.env` is loaded into the Bun process regardless, and a project `tsconfig.json`
`paths` mapping is in scope for the build.

The two shipping tests that *do* cover this fail against the shipped code, which is the clearest
evidence that the code is wrong and not the tests:

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/entry.test.mts
ℹ tests 14  ℹ pass 12  ℹ fail 2
  FAIL: prefixes Bun eval and build options while preserving test-run arguments
  FAIL: workflow Bun build leaves the dotenv variable uninlined and emits neither marker

$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
ℹ tests 42  ℹ pass 40  ℹ fail 2
  FAIL: under the bun runtime .mts entries are transpile-checked
  FAIL: the bundle's own entry files still carry the identity sentence the install check looks for
```

Proof that the code, not the tests, is at fault — isolating `build` as well makes **both** suites
green:

```
# one-line change inside the work folder:
#   flags = rest[0] === "test" || rest[0] === "build" ? [] : bunIsolationOptions();
# -> flags = rest[0] === "test" ? [] : bunIsolationOptions();

$ node … --test ai-framework/scripts/runtime/entry.test.mts
ℹ tests 14  ℹ pass 14  ℹ fail 0

$ node … --test ai-framework/scripts/setup-validator.test.mts
ℹ tests 42  ℹ pass 41  ℹ fail 1
  FAIL: the bundle's own entry files still carry the identity sentence the install check looks for
```

(The one remaining setup-validator failure is the environmental `CLAUDE.md` one, present at
baseline and unrelated.)

**This is also the reason the fix is not verified end to end today**: the change cannot be
declared green while these three tests fail. The fix should be either
(a) `entry.mts:32` isolating `build` as well — which then makes the setup-validator's Bun
transpile check use the isolated flags and matches both READMEs — or (b) deliberately
documenting and testing that `build` is exempt, which would mean changing
`README.md:71`, `ai-framework/scripts/runtime/README.md:40` and
`setup-validator.test.mts:312` instead. Option (a) is the one consistent with the contract
sentence "other than a test run".

Note on the recorded-accepted list: it accepts "bun test runs intentionally keep project
settings". It does **not** accept an exemption for `build`. The `build` exemption is therefore in
scope of this finding.

### F2 — Medium — `ai-framework/scripts/runtime/entry.test.mts:147-163`: the missing-config
test can pass for the wrong reason when the launch dies before running the script

Rule violated: `ai-framework/rules/testing.md` (Guards and Fixes) — a guard must fail when the
behavior is broken, not merely when a marker string is absent from the output.

The two missing-config tests assert only:

1. none of `preloadMarker` / `dotenvMarker` / `redirectMarker` appear in `stdout + stderr`
   (line 159);
2. for `bun-isolated.toml` only, `result.status !== 0` (line 160);
3. the missing file's *name* appears in the output (line 161).

They never assert that the requested script actually executed. A launcher that fails before
running anything satisfies (1) and (3) whenever the file name appears in the error text, so the
test would pass without proving that the shipped config's absence still leaves the project's
mapping defeated.

For `bun-isolated.toml` the guard is stronger — line 160 asserts a non-zero status — but even
there the *reason* the launch failed is not pinned: the assertion is satisfied by any failure,
not by the specific "Bun could not read its config" failure. In practice Bun stops the launch
when the `--config` file is missing, so the guard does hold today.

For `bun-isolated-tsconfig.json` there is no status assertion at all, precisely because Bun
prints an error and continues (recorded and accepted). That is safe today only because Bun
happens not to fall back to the project `tsconfig.json` when the override file is missing.
Verified directly:

```
$ bun --config=<runtime>/bun-isolated.toml --no-env-file --no-install \
      --tsconfig-override=/nonexistent/missing.json ./marker.mts
PROBE-ORIGINAL-MARKER
error: Cannot find tsconfig file "/nonexistent/missing.json"
```

The original file ran and the project's redirect mapping did not apply — so the accepted
behaviour holds. But the *test* does not assert this; it asserts only that the redirect marker
is absent, which is equally true if the script never ran.

Concrete failure scenario: a future change makes `bunIsolationOptions()` fall back to the
project's `tsconfig.json` when the shipped override is missing (a natural-looking "be robust if
the file is absent" edit). The project mapping then applies and the redirect marker appears —
this is caught (see the mutation below). A different future change, however, that makes the
launch die earlier (for example Bun rejecting a flag combination, or the config file becoming
unreadable because the install dropped it) would leave the test green while the script never
runs, and the contract sentence "A missing shipped config must not let project code run" would
no longer be verified.

Recommended fix (not applied — this is a read-only review): assert that the script actually ran
in the missing-config tests, e.g. assert the output contains the script's own output
(`"no dotenv"` for the marker project) in addition to the absence of the three markers. That
single assertion pins both "no project code ran" and "the requested file still ran".

### F3 — Low — `ai-framework/scripts/runtime/entry.test.mts:132-145`: the path-mapping
test's second case (`-e` + `await import`) does not exercise the mapping it claims to

Rule violated: `ai-framework/rules/testing.md` (Guards and Fixes) — a test must assert the
behavior under audit, not a nearby one.

The test loops over two invocations (line 137):

```ts
for (const args of [["./marker.mts"], ["-e", `await import(${JSON.stringify(base.path.join(options.cwd, "marker.mts"))});`]]) {
```

The first case runs a file *by path*. The second imports the file by **absolute path**. A
project `tsconfig.json` `paths` mapping with a wildcard `"*": ["./redirect.mts"]` only replaces
a *module specifier* that Bun resolves through the mapping; an absolute filesystem path is not
a module specifier and is never subject to `paths`. So the second case cannot be redirected even
by a completely unfixed Bun, and its assertion (`"no dotenv"`) is satisfied for the same reason
in both the fixed and unfixed worlds.

Proof: the control at line 135-136 shows the fixture *can* redirect a path-run launch. Nothing
shows the `-e`/`import` case can be redirected at all. Removing `--tsconfig-override` from
`bunIsolationOptions()` (mutation below) does fail both the `tsconfig.json` and the
`jsconfig.json` variants, but it is the *first* case in the loop that detects it.

Concrete failure scenario: the second case is dead weight. A future change that breaks only the
`import` path — for example a rewrite of `bunIsolationOptions()` that passes
`--tsconfig-override` only for file launches — would leave the `-e` case asserting nothing about
the mapping, and the suite would still be green.

Recommended fix (not applied): make the second case use a **module specifier** that a project
mapping can rewrite (for example `import("marker.mts")` resolved against the project root), and
keep the positive control for that form too, so the test proves the fixture can redirect the
exact form under audit.

### F4 — Low — `ai-framework/templates/shipped-files.txt:337-338`: the manifest lists the two
shipped config files but nothing asserts they are non-empty-by-accident or that the manifest
entry is load-bearing

Rule violated: `ai-framework/rules/testing.md` (Guards and Fixes) — a guard that cannot fail is
not a guard.

`ai-framework/templates/shipped-files.txt` lists:

```
ai-framework/scripts/runtime/bun-isolated-tsconfig.json
ai-framework/scripts/runtime/bun-isolated.toml
```

The manifest is exercised indirectly: `ai-framework/scripts/project-state.test.mts:32-45`
(`copyInstalledFiles`) copies every manifest entry and asserts each source is a regular file, so
a *missing* file is caught. That is good.

What is **not** asserted anywhere is the *content* of the two files — that `bun-isolated.toml`
carries no `preload` and no other setting, and that `bun-isolated-tsconfig.json` carries no
`paths` mapping. There is no test that reads either file and asserts it is inert.

This is mitigated in practice: the behavioral tests use the real shipped files, so a preload or a
wildcard mapping added to either file breaks them. Verified:

```
# appending `preload = ["./evil-preload.mts"]` to the shipped bun-isolated.toml
ℹ tests 14  ℹ pass 6  ℹ fail 7
  FAIL: prefixes Bun eval and build options while preserving test-run arguments
  FAIL: workflow Bun script ignores project preload and dotenv markers
  FAIL: workflow Bun eval ignores project preload and dotenv markers
  FAIL: workflow Bun build leaves the dotenv variable uninlined and emits neither marker
  FAIL: Node runDirect respawns Bun without project preload or dotenv markers
  FAIL: workflow Bun launches run the requested file despite a project tsconfig.json path mapping
  FAIL: workflow Bun launches run the requested file despite a project jsconfig.json path mapping

# replacing the shipped bun-isolated-tsconfig.json with
#   {"compilerOptions":{"baseUrl":".","paths":{"*":["./redirect.mts"]}}}
ℹ tests 14  ℹ pass 7  ℹ fail 7   (same set of failures plus the two baseline ones)
```

So the gap is a *redundancy* gap rather than a live hole: the content is covered only
indirectly and through behavioural coupling, so a future change that stops the behavioral tests
from using the real shipped files (for example a test fixture that copies a stub instead)
would silently remove the only coverage of the files' contents.

Recommended fix (not applied): add a cheap content assertion next to the manifest check, e.g.
read both shipped files and assert the toml parses to no settings and the tsconfig parses to
`{}` (no `compilerOptions.paths`).

## Coverage that is adequate

Each of the following was verified by mutation: the guard fails when the behavior is removed.

| Contract behavior / audit focus | Guard | Mutation that it catches |
|---|---|---|
| No project `bunfig.toml` preload | `entry.test.mts:101-105` ("workflow Bun script/eval ignores project preload and dotenv markers") | remove `--config=…` from `bunIsolationOptions()` → 10 of 14 fail |
| No project `.env` | `entry.test.mts:101-105` | remove `--no-env-file` → 9 of 14 fail |
| No project path mapping (`tsconfig.json` **and** `jsconfig.json`) | `entry.test.mts:132-145`, with a positive control at line 135-136 that proves the fixture can redirect | remove `--tsconfig-override=…` → both config variants fail |
| Missing shipped config must not let project code run | `entry.test.mts:147-163` | fall back to the project's `tsconfig.json` when the shipped override is missing → `a launcher without bun-isolated-tsconfig.json …` fails; fall back to the project's `bunfig.toml` when the shipped config is missing → `a launcher without bun-isolated.toml …` fails |
| Shipped config files carry no preload / no wildcard mapping | behavioural, via the real shipped files | see F4 |
| Node launches unchanged | `entry.test.mts:14-25`, `entry.test.mts:53-64` | any change to `NODE_FLAGS` or to the Node branch fails |
| Test-run arguments unchanged (`--test` → `test`, args preserved) | `entry.test.mts:45-50` | any change to the `rest[0] === "test"` handling fails |
| Grader catalog isolates Bun eval checks | `orca-eval-grader.test.mts:124-130` (`the grader's eval checks isolate Bun launches and leave Node unchanged`) | `orca-eval-grader.mts:214` → `deps.runtime === "bun" ? [] : []` → this test fails |
| Grader catalog in the real dataset run | `orca-eval-grader.test.mts:140-144` | same mutation → fails |
| `orca-run` check catalog isolates Bun script checks | `orca-run.test.mts:329-343` (`--check names map to the fixed catalog argv and checks receive only the worker env allowlist`) | `orca-run.mts:47` → `const scriptFlags = NODE_FLAGS;` → this test fails |
| `pre-ship-verify` `setupCheck` isolates the validator under Bun, while the project's own viewer scripts keep project settings | `pre-ship-verify.test.mts:143-145` | `pre-ship-verify.mts:118` → `const flags = NODE_FLAGS;` → `checks come from the recognised scripts, with verify:base first and the document checks after it` fails |
| A direct `bun <script>` call is not protected (documented only) | documented in `README.md:77-81` and `ai-framework/scripts/runtime/README.md:45-51`; recorded and accepted | not applicable |
| `bun test` keeps project settings (recorded and accepted) | `entry.test.mts:45-50` asserts the argv shape; not asserted behaviorally | — |

## What I tried that did not work

- **Running the suites with the output piped** (`| grep`, `| tee`) made Node's test runner
  abort with `Warning: node:test run() is being called recursively within a test file`, so no
  summary was produced. The cause is environmental: `NODE_TEST_CONTEXT=child-v8` and
  `NODE_TEST_WORKER_ID=1` leak into the shell from a Node test child and make the runner think
  it is already inside a test child. Unsetting both variables (`unset NODE_TEST_CONTEXT
  NODE_TEST_WORKER_ID`) makes the runs deterministic; all commands above use that form. This is
  not a defect in the reviewed code.
- **`--test-reporter=tap`** also produced the recursive abort and an empty TAP stream.
- **`node --experimental-strip-types … <file>.test.mts` without `--test`** produced no
  `ℹ`/`✖` summary lines at all (only the raw V8-serialized event stream), so it was not usable
  for the summary extraction.
- **Proving the `.env` leak on the setup-validator's own `bun build`** by inspecting the build
  output failed: `setup-validator.mts:287` runs `bun build --no-bundle <file>` **without**
  `--env=`, and Bun only inlines `process.env.X` into the output when the build carries an
  `--env=` prefix or `--define`. With no prefix the value is *not* inlined
  (`export const x = process.env.PROBE_SECRET;`), though the project's `.env` is still loaded
  into the Bun process. The inlining is only observable when the build requests it. I therefore
  report the `.env` exposure as "the project's `.env` is loaded into the workflow-started Bun
  build process", not as "the secret is written into the output" — the latter is only true for
  builds that pass `--env=`.
- **Proving a Bun path-mapping redirect during `bun build`** did not reproduce: with
  `--tsconfig-override` pointing at the shipped `{}` file, `bun build --no-bundle ./marker.mts`
  still built the original file, and without the override it did the same. A directly-specified
  entry file is not resolved through the `paths` mapping, so the mapping half of the `build`
  gap does not reproduce the same way the preload and `.env` halves do. The `build` finding
  therefore rests on the code path (no isolation flags at all) plus the red shipping tests,
  not on a reproduced redirect.
- **Testing whether the missing-config test passes when the launch dies for an unrelated
  reason** could not be done by mutation alone: adding a bogus Bun flag
  (`--totally-bogus-flag-xyz`) is tolerated by Bun 1.4.5 (the script still ran and printed
  `no dotenv`), so it did not reproduce the "launch never ran" scenario. F2 is therefore
  reported as a structural weakness in the assertions (the script's own output is never
  asserted) with the accepted Bun behaviour confirmed by direct probe, not as a reproduced
  false pass.

## Unverified

- Behaviour on Bun versions other than 1.4.5, and on platforms other than macOS. The change
  itself records that only Bun 1.4.5 on macOS is verified.
- `ai-framework/scripts/runtime/runtime.test.mts` was read but not mutated: it copies the two
  shipped config files at line 506 into its fixture but contains no assertion about them. The
  `setup-validator.test.mts` `CLAUDE.md` failure and the `orca-eval-grader.test.mts`
  `opencode-agent-id-resolves-from-installed-agents` failure are environmental in this review
  copy and were not investigated further.
- Whether the `build` exemption was deliberate in the original change was not determinable from
  the reviewed files; the only evidence available is the two READMEs, the setup-validator test
  and the contract sentence, all of which point the same way.
