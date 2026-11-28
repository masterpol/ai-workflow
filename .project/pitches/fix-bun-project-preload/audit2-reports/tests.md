# Test-coverage review — `fix-bun-project-preload` (tests2)

Role: test-coverage-checker. Rule: `ai-framework/rules/testing.md`.
Scope: the named changed files as they stand in the work folder (not a diff).
Work folder: `…/scratchpad/bf-audit3/tests2/work` (read-only; nothing written into the repository checkout).

Environment observed: Node v24.21.0, Bun 1.4.5, macOS (darwin).

---

## 1. Contract items → the test that would fail if the item broke

| # | Contract item (`contract/expected.md`) | Guarding test(s) | Status |
|---|---|---|---|
| 1 | Workflow-started Bun **script / eval / build** load no project `bunfig.toml` preload, no project `.env`, no project TS path mapping | `ai-framework/scripts/runtime/entry.test.mts` — "workflow Bun script/eval/build ignores project preload and dotenv markers" (L97–113), "workflow Bun launches run the requested file despite a project `tsconfig.json`/`jsconfig.json` path mapping" (L132–145), "Node runDirect respawns Bun without project preload or dotenv markers" (L115–120), "a launcher without `bun-isolated.toml` / `bun-isolated-tsconfig.json`…" (L147–163); control "unisolated Bun control exposes both markers…" (L88–95) | **covered, mutation-proven** |
| 1b | Bun **test** launches keep project settings | `entry.test.mts` L45–51 asserts `bun test` gets **no** isolation flags (`["test", "--help"]`). Behavioural proof (that `bun test` still reads the project `.env`) is **not** asserted anywhere | **partially covered (arg-shape only)** — see F3 |
| 2 | Validator + doctor parse project files only when the checking process is Node, **by starting that same executable**; a Bun checking process starts no parse child whatever the env/settings say | `workflow-doctor.test.mts` "doctor never sends a project file to a Bun child" (L240–261), "doctor pins project parsing to its own Node executable…" (L263–288); `setup-validator.test.mts` "validator never sends a project file to a Bun child" (L309–321), "validator pins project parsing to its own Node executable" (L323–333) | **covered** (see F2 for a narrow gap) |
| 3 | Unparsed files give a `warn` "not parse-checked" **with a count**; never counted or shown as parsed; **also in JSON and in the validator's summary of the doctor**; warnings do not change exit codes; a parse failure shows no child stderr | `workflow-doctor.test.mts` L252–254, L283–285, L237 (no stderr); `setup-validator.test.mts` L317–319, L565–568, L299 (no stderr) | **partly covered — MUST-FIX F1: the validator's summary of the doctor can never see the warn** |
| 4 | The doctor runs the `graphify.mts` **beside its own module**; the working folder stays the checked project | `workflow-doctor.test.mts` "doctor launches its own Graphify helper from the checked project" (L328–339) — asserts the resolved path **and** `cwd: root`; "real node/bun doctor checks project knowledge without running the project's Graphify script" (L313–326) | **covered** |
| 5 | The doctor starts no `opencode` process unless `--live-opencode`; **no other workflow code passes that flag** | `workflow-doctor.test.mts` "doctor skips the OpenCode process by default" (L341–348), "real doctor runs a fake OpenCode only with `--live-opencode`" (L350–360), "doctor keeps the live OpenCode outcomes" (L362–385) | first half **covered**; the "no other workflow code passes that flag" half is **not guarded by any test** — see F4 |
| 6 | Documents claim nothing beyond this; probes were Bun 1.4.5 / OpenCode 2.4.2 on macOS only | `ai-framework/scripts/project-state.test.mts` (manifest entries must be real shipped files) covers `shipped-files.txt`; doc claims read manually — `README.md` L71–90, `ai-framework/scripts/runtime/README.md` L40–59, `ai-framework/docs/workflow-doctor.md` L25–41, `.claude|\\.cursor/skills/workflow-doctor/SKILL.md` L12–14 | **covered** (manual review: no over-claim found) |

---

## 2. Findings

### F1 — MUST-FIX — `ai-framework/scripts/setup-validator.mts:268`

**Rule violated.** `ai-framework/rules/testing.md` → "Prove the Test Can Fail" / "Each guard or bound has a test that fails when it is removed"; and the contract, `contract/expected.md` item 3: the not-parse-checked result must appear *"also in JSON and in the validator's summary of the doctor"*.

**The defect.** `checkWorkflowDoctor()` classifies the doctor's own rows with:

```ts
} else if (Array.isArray(report.results) && report.results.some((row) =>
  row && typeof row === "object" && "name" in row && row.name === "Syntax check" && "status" in row && row.status !== "info"  && row.status !== "warn")) {
  record("warn", "Workflow doctor", "some files were not parse-checked by the workflow doctor");
} else {
  record("pass", "Workflow doctor", "portable workflow contracts passed");
}
```

The doctor records the not-parse-checked notice as **`warn`** (`ai-framework/scripts/workflow-doctor.mts:471` — `record("warn", "Syntax check", …)`), and the predicate explicitly excludes `status !== "warn"`. The branch is therefore **unreachable for the only row it is written for**: the validator always records `pass / "portable workflow contracts passed"` for a doctor run whose only issue is "some files were not parse-checked".

**Concrete failure scenario.** A project with `runtime.runner: bun` in `ai-workflow.toon` (or any Node without `module.stripTypeScriptTypes`). The doctor emits `{"status":"warn","name":"Syntax check","detail":"51 file(s) not parse-checked under Bun. …"}`; `failures` is 0; the doctor exits 0. The setup validator then reports `{"status":"pass","name":"Workflow doctor","detail":"portable workflow contracts passed"}` and its human summary omits the line `Syntax check: some files were not parse-checked.` — because `syntaxSkipped` (`setup-validator.mts:343-344`) keys off a `warn` row named `"Workflow doctor"`. The operator is told the workflow is fully parse-checked when nothing was parse-checked.

**Evidence — the shipped test suite is red on this.** Command and output:

```
$ cd <work folder>
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/setup-validator.test.mts
✖ validator keeps a doctor syntax warning in JSON and the human summary
ℹ tests 46
ℹ pass 45
ℹ fail 1

  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  'pass' !== 'warn'
    at TestContext.<anonymous> (…/ai-framework/scripts/setup-validator.test.mts:342:10)
```

Same failure under Bun:

```
$ bun test ai-framework/scripts/setup-validator.test.mts
(fail) validator keeps a doctor syntax warning in JSON and the human summary
 45 pass
 1 fail
```

The test fails in isolation too (`--test-name-pattern "doctor syntax warning"` → 1 fail), so it is not order-dependent.

**Mutation proof that the test is right and the production code is wrong.** I copied the tree into `probe/` (inside the work folder), changed only the predicate in `probe/ai-framework/scripts/setup-validator.mts`:

```
- row.status !== "info"  && row.status !== "warn"
+ row.status === "warn"
```

and re-ran the same file:

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ./probe/ai-framework/scripts/setup-validator.test.mts
ℹ tests 46
ℹ pass 44   (was 43 pass / 1 fail before the mutation)
ℹ fail 0
```

i.e. **the test correctly detects the defect**; the fix belongs in `setup-validator.mts`, not in the test. The narrow fix is to treat the doctor's `Syntax check` row with status `warn` as the not-parse-checked signal (and leave every other doctor `warn` — "Caveman mode", "Graphify hooks", "Graphify runtime", … — out of that branch).

**Also note.** `ai-framework/docs/setup-validator.md` does not mention the parse-check/unparsed behaviour at all, while `ai-framework/docs/workflow-doctor.md` (L38–41), `README.md` (L74–76) and `ai-framework/scripts/runtime/README.md` (L57–59) do. Contract 6 forbids over-claiming, not under-documenting, so this is optional — but the validator doc is the natural place for the "not parse-checked" summary contract once F1 is fixed.

---

### F2 — SHOULD-FIX — `ai-framework/scripts/setup-validator.mts:285` and `ai-framework/scripts/workflow-doctor.mts:36`

**Rule violated.** `ai-framework/rules/testing.md` → "Re-verify a reviewer's claim with one command before it enters triage"; "Prove the Test Can Fail". A branch whose guard is unreachable in production is not a proven guard.

**The gap.** Both tools decide "am I running under Bun?" with

```ts
const bun = deps.proc.versions ? Boolean(deps.proc.versions.bun) : deps.runtime === "bun";
```

The `deps.proc.versions === undefined` branch (→ `deps.runtime === "bun"`) is **never exercised** by any test in the changed files. `deps.proc.versions` is always present in production (`createNodeDeps`/`createBunDeps` both set `proc.versions = process.versions`), so the branch is defensive only. The consequence if it were ever wrong: with `versions` absent and `runtime === "node"` while `execPath` is Bun, the validator/doctor would decide "not Bun" and then start a **Bun** child (`workflowInvocation` falls back to `deps.runtime` for `current`, so `command = deps.proc.execPath` = Bun) to parse a project file — precisely what contract item 2 forbids.

**Evidence.** `grep -n "proc.versions" ai-framework/scripts/setup-validator.test.mts ai-framework/scripts/workflow-doctor.test.mts` shows every occurrence assigns `proc.versions` (`{ bun: "test" }` or `{ node: "24.21.0" }` or `{ bun: "1.4.5" }`); none removes it. The matching fallback in `ai-framework/scripts/runtime/entry.mts:25` (`const current = deps.proc.versions ? … : deps.runtime;`) is likewise only covered with `versions` present.

**Suggested fix (test-only).** Add one case per tool: `deps.proc.versions` deleted and `deps.runtime = "bun"` → the tool must report the not-parse-checked `warn` and start **no** parse child; and `deps.proc.versions` deleted with `deps.runtime = "node"` → the tool must start the parse child with `deps.proc.execPath`.

---

### F3 — SHOULD-FIX — `ai-framework/scripts/runtime/entry.test.mts:45-51`

**Rule violated.** `ai-framework/rules/testing.md` → "Verification Discipline: a green build is evidence of nothing specific" (an arg-shape assertion is not evidence that the behaviour holds); "Prove the Test Can Fail".

**The gap.** Contract item 1's last sentence — *"Bun test launches keep project settings"* — is proven only by asserting the argument vector:

```ts
for (const command of ["--test", "test"]) {
  const args = [command, "--help"];
  assert.deepEqual(workflowInvocation(base, [...NODE_FLAGS, ...args], bun).args, ["test", "--help"]);
}
```

Nothing asserts the *behaviour*. I checked what Bun 1.4.5 actually does (probe inside the work folder):

```
$ bun test env.test.mts          # project .env present
ENVVAL=dotenv-value              # → bun test DOES load the project .env
$ bun test sample.test.mts       # project bunfig.toml preload = ["./preload.mts"]
(sample.test.mts: TEST-RAN)      # → bun test does NOT load the bunfig preload in 1.4.5
```

So today "keep project settings" is true only for `.env`, and only because Bun's own `bun test` happens not to honour `bunfig.toml` preloads. The workflow code asserts nothing about that; it merely passes no isolation flags, so the guarantee depends entirely on Bun's behaviour — and the contract pins the probe to Bun 1.4.5 only. A future Bun that starts honouring `bunfig.toml` preloads in `bun test` would silently break the "keeps project settings" clause in one direction and the isolation guarantee in the other, with no test noticing.

**Suggested fix (test-only).** Add a behavioural test in `entry.test.mts` (mirroring the existing `markerProject` fixture): run `workflowInvocation(...)` → `bun test <file>` against the marker project and assert the project `.env` variable **is** visible while the isolation flags are absent. That turns a documentation claim into an enforced invariant for the probed Bun version.

---

### F4 — SHOULD-FIX — no test guards `contract/expected.md` item 5's second clause

**Rule violated.** `ai-framework/rules/testing.md` → "Each guard or bound has a test that fails when it is removed"; "Fixes to shared helpers were traced through all callers".

**The gap.** Contract item 5: *"The doctor starts no `opencode` process unless `--live-opencode` is given. **No other workflow code passes that flag.**"* The first clause is well tested (`workflow-doctor.test.mts` L341–385). The second clause has **no test**. Today it happens to hold:

```
$ grep -rn "live-opencode" --include=*.mts --include=*.ts --include=*.json --include=*.toml --include=*.md .
./.claude/skills/workflow-doctor/SKILL.md:14   (prose)
./.cursor/skills/workflow-doctor/SKILL.md:14   (prose)
./README.md:78                                  (prose)
./ai-framework/docs/workflow-doctor.md:25       (prose)
./ai-framework/scripts/workflow-doctor.mts:677  (the one legitimate reader)
./ai-framework/scripts/workflow-doctor.test.mts:347,350,357,380  (tests)
./contract/expected.md:7
```

But the two places that would plausibly grow the flag are unguarded:
- `ai-framework/scripts/setup-validator.mts:261` — `run([bundleScript(deps, "workflow-doctor.mts"), "--json"])` (the validator runs the doctor as a child);
- `ai-framework/scripts/orca-run.mts:50` — `"workflow-doctor": script("ai-framework/scripts/workflow-doctor.mts", "--json")` (the Orca reconcile catalog runs the doctor four times per reconcile: `orca-run.test.mts:328` asserts `seen.length === 8`).

Adding `"--live-opencode"` to either would start a real `opencode debug config` — which runs project plugins — on every validator run and on every Orca reconcile, with **no test turning red**.

**Suggested fix (test-only).** Add a source-level guard, e.g. in `workflow-doctor.test.mts` or a small dedicated test: scan the shipped `ai-framework/**` sources (excluding `workflow-doctor.mts` itself and the test files) for `"--live-opencode"` and assert zero occurrences. The repo already uses this pattern (`orca-run.test.mts:673-683` scans `orca-run.mts` source for forbidden identifiers), so it fits the existing conventions.

---

### F5 — ACKNOWLEDGED (not a defect; recorded so it is not re-reported)

`ai-framework/scripts/orca-run.test.mts:329` builds the Bun catalog as `checkCatalog({ ...h.deps, runtime: "bun" })` while `h.deps.proc.execPath` is still the **Node** path — an artificial combination that cannot occur in production (`createNodeDeps`/`createBunDeps` keep `runtime` and `execPath` consistent). The assertion at L341 only inspects `.args`, never `.command`, so the incoherence is invisible to the test. Not a product defect and not worth changing; noting it because a future reader may mistake the fixture for a real Bun catalog.

---

## 3. What I verified beyond the diff (positive results)

These are the checks that passed and are worth recording, because they are the ones most likely to be assumed rather than proven.

**The Bun isolation really works end-to-end (not just at the arg level).** Probe project with a hostile `bunfig.toml` preload that writes a marker file:

```
$ cd probe/e2e   # project with bunfig.toml preload = ["./hostile-preload.mts"]
$ AI_WORKFLOW_RUNNER=bun node --experimental-strip-types --disable-warning=ExperimentalWarning \
    ai-framework/scripts/workflow-doctor.mts --json
preload ran? ls: /tmp/HOSTILE-PRELOAD-RAN: No such file or directory   # ← isolated
$ AI_WORKFLOW_RUNNER=bun node … ai-framework/scripts/setup-validator.mts --json
preload ran? ls: /tmp/HOSTILE-PRELOAD-RAN: No such file or directory   # ← isolated
$ bun ai-framework/scripts/workflow-doctor.mts --json
preload ran? /tmp/HOSTILE-PRELOAD-RAN                                 # ← NOT isolated
```

The last line is the documented accepted cost ("A direct `bun <script>` call or bun shebang cannot be protected; it is only documented"), so it is **not** a finding. The workflow-started path — the one the contract governs — is genuinely protected.

**The doctor starts no parse child under Bun.** Real doctor run in a Bun project:

```
$ bun ai-framework/scripts/workflow-doctor.mts --json
Syntax check rows: [{'status': 'warn', 'name': 'Syntax check',
                     'detail': '51 file(s) not parse-checked under Bun. Run with AI_WORKFLOW_RUNNER=node to check syntax.'}]
bundle-sync rows: []                       # ← no per-file "valid Node.js syntax" row at all
```

Under Node the same project yields `{'status': 'pass', 'name': 'ai-framework/scripts/bundle-sync.mts', 'detail': 'valid Node.js syntax'}`. Contract item 3's "never counted or shown as parsed" holds.

**`bunIsolationOptions()` points at the shipped files.** Mutating the shipped path in a copy of `ai-framework/scripts/runtime/entry.mts`:

```
- `--config=${shipped("./bun-isolated.toml")}`
+ `--config=${shipped("./bun-isolated-WRONG.toml")}`
```

→ 10 of 14 `entry.test.mts` tests fail. The isolation-file path is genuinely guarded, not asserted tautologically.

**The `pre-ship-verify` isolation assertion is not tautological.** Adding one extra flag to `setupCheck` in `ai-framework/hooks/scripts/pre-ship-verify.mts`:

```
- const flags = deps.runtime === "bun" ? bunIsolationOptions() : NODE_FLAGS;
+ const flags = deps.runtime === "bun" ? [...bunIsolationOptions(), "--bogus-isolation-flag"] : NODE_FLAGS;
```

→ "checks come from the recognised scripts…" fails. (`bunIsolationOptions()` is re-evaluated in the assertion, so the assertion still detects any *difference* in the produced flags — it is only blind to a change *inside* `bunIsolationOptions`, and that is separately proven above.)

**No test can reach a real `opencode` or the network.**
- The only test that executes an `opencode` binary writes a fake shell script into the fixture and sets `PATH: root` (`workflow-doctor.test.mts:296-303, 350-360`), so the real binary is unreachable.
- The doctor test's default `injected()` harness makes any `opencode` call throw `ENOENT` (L71).
- `grep -rn "fetch(\|http://\|https://"` over all six changed test files: **no matches**.

**`bun test` isolation flags are correctly omitted.** `entry.mts:31-32` (`if (rest[0] === "--test") rest[0] = "test"; flags = rest[0] === "test" ? [] : bunIsolationOptions();`) is covered by `entry.test.mts` L45-51 and L50 (`workflowInvocation(base, ["--test"], bun).args === ["test"]`).

**`bun-isolated.toml` / `bun-isolated-tsconfig.json` ship.** `ai-framework/templates/shipped-files.txt:337-338` lists both, and `ai-framework/scripts/project-state.test.mts` (`copyInstalledFiles`) asserts every manifest entry is a real regular file — so a missing file breaks the manifest test.

**Docs do not over-claim (contract item 6).** `README.md` L71-90, `ai-framework/scripts/runtime/README.md` L40-59 and `ai-framework/docs/workflow-doctor.md` L25-41 all scope the claim ("Workflow-started Bun script, eval, and build commands …", "Bun test commands retain their normal settings", "This behavior was verified with Bun 1.4.5 on macOS only", "The probes used Bun 1.4.5 and OpenCode 2.4.2 on macOS only") and every one of them names the direct-`bun` limitation. `.claude/skills/workflow-doctor/SKILL.md` and `.cursor/skills/workflow-doctor/SKILL.md` are byte-identical (`diff` → no output) and state the same limits.

---

## 4. Test-run summary (this sandbox)

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>
ai-framework/scripts/runtime/entry.test.mts        tests 14  pass 14  fail 0
ai-framework/scripts/runtime/runtime.test.mts      tests 62  pass 62  fail 0
ai-framework/scripts/workflow-doctor.test.mts      tests 92  pass 92  fail 0
ai-framework/scripts/setup-validator.test.mts      tests 46  pass 45  fail 1   ← F1
ai-framework/scripts/orca-run.test.mts             tests 37  pass 37  fail 0
ai-framework/scripts/orca-eval-grader.test.mts     tests 19  pass  8  fail 1   ← environment only (see below)
ai-framework/hooks/scripts/pre-ship-verify.test.mts tests 28  pass 27 fail 1   ← environment only (see below)

$ bun test <file>
ai-framework/scripts/runtime/entry.test.mts        28 pass  0 fail
ai-framework/scripts/workflow-doctor.test.mts      92 pass  0 fail
ai-framework/scripts/setup-validator.test.mts      45 pass  1 fail   ← F1 (same defect)
```

**Unverified in this sandbox (environment-only, not change-related).** The work folder has no `.project/`, so two bundle-repo-data tests fail for a missing-fixture reason and are **not** evidence about this change:
- `orca-eval-grader.test.mts` "opencode-agent-id-resolves-from-installed-agents" — needs `.project/evals/datasets/orca-vendor-orchestration.json` (`DATASET_FILE`, `orca-eval-grader.mts:33`), absent here.
- `pre-ship-verify.test.mts` "this repository's own manifest loads" — needs the bundle repo's `.project/context/checks.toon`, absent here.

**What I tried that did not work.**
- Reproducing the F1 defect through the real doctor + real validator in a scratch project: the doctor run had unrelated failures (an incomplete scaffold), so `checkWorkflowDoctor` short-circuited on `result.code !== 0` and never reached the row-classification branch. I therefore proved the defect with an injected-children harness (which is exactly how the shipped test exercises it) and with the predicate isolated in a standalone script (`probe/impact-probe.mjs`, output: `validator predicate matches: false`).
- Reproducing a "Bun doctor parses project files" violation: my first attempt passed the doctor script as a **relative** path (`../ai-framework/scripts/workflow-doctor.mts`), which made `inferRoot()` resolve to the wrong directory and made the doctor re-exec under Node, so it *looked* like the violation. That was my probe's path error, not a product bug; with the correct path the Bun doctor correctly emits the not-parse-checked `warn` and no parse rows.
- Running `bun test ai-framework/scripts/workflow-doctor.test.mts` while a `probe/` copy of the tree existed inside the work folder: Bun's `bun test <file>` also globbed `probe/ai-framework/...`, producing 14 spurious failures (including a leaked `DEBUG` line from my instrumented copy). After removing `probe/` the same command gives 92 pass / 0 fail. Worth recording because any reviewer who keeps a scratch copy under the work folder will hit the same confusing result.

---

## 5. Verdict

**One must-fix.** The change ships a red test on purpose-looking code: the setup validator's summary of the doctor can never report the doctor's own `warn` "not parse-checked" row, so contract item 3 ("also … in the validator's summary of the doctor") is not met, and the validator tells the operator that everything was parse-checked when nothing was. The shipped test `setup-validator.test.mts` "validator keeps a doctor syntax warning in JSON and the human summary" already catches it — fix the predicate in `setup-validator.mts:268`, do not relax the test.

**Three should-fix coverage gaps** (F2 unreachable defensive branch, F3 arg-shape-only proof of "bun test keeps project settings", F4 unguarded "no other workflow code passes `--live-opencode`"). None of them is a live defect; each is a guard that a future edit can remove without a test turning red.

**Everything else in the contract's six items is covered and mutation-proven.**
