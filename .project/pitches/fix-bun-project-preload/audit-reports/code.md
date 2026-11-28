# Code review: security bug fix "stop workflow-started Bun loading project settings"

Scope reviewed read-only. Contract: `contract/log.md`, `contract/s1-brief.md`. Role rules read:
`ai-framework/rules/coding-standards.md`, `boundaries.md`, `testing.md`, `security.md`, plus
`.claude/agents/code-reviewer.md`. Changed files reviewed: `ai-framework/scripts/runtime/entry.mts`,
new `ai-framework/scripts/runtime/bun-isolated.toml`, `ai-framework/scripts/orca-run.mts`
(`checkCatalog`), `ai-framework/scripts/orca-eval-grader.mts` (`catalog`), `runtime/entry.test.mts`,
`runtime/runtime.test.mts`, `setup-validator.test.mts`, `orca-run.test.mts`, `orca-eval-grader.test.mts`,
`ai-framework/templates/shipped-files.txt`, `README.md`, `ai-framework/scripts/runtime/README.md`.
Callers traced: `workflowInvocation`, `runWorkflow`, `runWorkflowSync`, `runDirect`
(`runtime/cli.mts`, `runtime/select.mts`, `runtime/bun.mts`, `runtime/node.mts`, `run-tests.mts`,
`setup-validator.mts`, `pitch-compress.mts`, `orca-run.mts`, `orca-eval-grader.mts`, `orca-reconcile.mts`).

## Findings

### Finding 1 — security (must-fix / high)

**severity:** must-fix (security). The core of the fix is incomplete: workflow-started Bun processes
still load `.env` from the untrusted working folder.

**full relative file:line:** `ai-framework/scripts/runtime/entry.mts:14`

**rule violated:**
- `contract/s1-brief.md` §Behavior bullet 1: one exported helper `bunIsolationOptions` gives, **in this order**,
  `--config=<absolute path of bun-isolated.toml beside entry.mts>`, `--no-env-file`, `--no-install`.
- `contract/s1-brief.md` S1 expected behavior: "a Bun process that the workflow starts, other than a test
  run, loads no `bunfig.toml` preload and no `.env` file from its working folder."
- `contract/log.md` §Planned fix: pass `--config=`, `--no-env-file` **and** `--no-install`; triage table
  rows `--no-env-file → .env loaded = no`, `--config, --no-env-file, --no-install → no / no`, and
  `--config=<empty file> → .env loaded = yes`.
- `ai-framework/rules/security.md` §9 "Resolve config only from a trusted root" (do not let the analyzed
  project choose which config/env applies; no `.env` from the scanned project).
- Docs already claim this behavior but code does not deliver it:
  `README.md:71-74` ("skip automatic `.env` loading … Bun scripts no longer receive variables from the
  project's `.env` files"), `ai-framework/scripts/runtime/README.md:40-43` ("skip automatic `.env`
  loading … no longer receive variables from the project's `.env` files"). Both READMEs would match the
  code once `--no-env-file` is added; as shipped they overstate it.

**concrete failure scenario + command + output:**

`bunIsolationOptions()` in `ai-framework/scripts/runtime/entry.mts:12-15` is:

```ts
export function bunIsolationOptions(): string[] {
  const config = fileURLToPath(new URL("./bun-isolated.toml", import.meta.url));
  return [`--config=${config}`, "--no-install"];   // ← no "--no-env-file"
}
```

`workflowInvocation` (`entry.mts:27-30`) uses only this helper for non-test Bun launches
(`flags = rest[0] === "test" ? [] : bunIsolationOptions()`), and `checkCatalog`
(`orca-run.mts:47`) / `catalog` (`orca-eval-grader.mts:214`) use the same helper, so no caller adds
`--no-env-file`. `--config=<empty bun-isolated.toml>` suppresses `bunfig.toml` `preload`, but `.env`
loading is controlled separately by `--no-env-file`, which is not passed. Bun then auto-loads `.env`
from the child working folder (`cwd`), injecting attacker-controlled variables into workflow code.
Concretely: an untrusted project folder containing `.env` with `WORKFLOW_BUN_TEST_MARKER=workflow-dotenv-marker`
(and any other key, e.g. `AI_WORKFLOW_RUNNER`, `PATH`, `NODE_OPTIONS`-style values Bun honors, secrets)
has those values present in `process.env` of the workflow script; `bun build` additionally inlines
`WORKFLOW_BUN_TEST_*`/`BUN_*`-matching `process.env.X` references in emitted output.

The changed tests in this same tree already pin the required three options and the isolation behavior,
and they fail on the current implementation. Command run (read-only; in this sandbox `node:test`
injects `NODE_TEST_CONTEXT=child-v8` / `NODE_TEST_WORKER_ID=1`, which makes Node skip the file, so I
unset them):

```
env -u NODE_TEST_CONTEXT -u NODE_TEST_WORKER_ID node --experimental-strip-types \
  --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/entry.test.mts
```

Output (Bun 1.4.5, Node v24.21.0, macOS):

```
✖ workflow children select the declared executable in both directions (1.285875ms)
✔ child overrides win, sanitized environments retain the selected runner, invalid choices fail (0.226ms)
✖ prefixes Bun eval and build options while preserving test-run arguments (0.161667ms)
✔ sync and async workflow dispatch use the same selection and preserve spawn options (0.316042ms)
✔ unisolated Bun control exposes both markers and inlines the dotenv marker in a build (19.49175ms)
✖ workflow Bun script ignores project preload and dotenv markers (10.467333ms)
✖ workflow Bun eval ignores project preload and dotenv markers (11.10775ms)
✖ workflow Bun build leaves the dotenv variable uninlined and emits neither marker (9.696458ms)
✖ Node runDirect respawns Bun without project preload or dotenv markers (91.583666ms)
✔ loadConfig branch: readRunner takes the runner from ai-workflow.toon, falls back to the legacy file, and fails closed on invalid TOON (3.285167ms)
ℹ tests 10   ℹ pass 4   ℹ fail 6   ℹ skipped 0
EXIT=1
```

Representative assertion diffs:

```
test at ai-framework/scripts/runtime/entry.test.mts:13:1
AssertionError: Expected values to be strictly deep-equal:
+ actual - expected
[ '--config=…/ai-framework/scripts/runtime/bun-isolated.toml',
- '--no-env-file',
  '--no-install', 'script.mts', '--experimental-strip-types', 'a b' ]

test at ai-framework/scripts/runtime/entry.test.mts:37:1
AssertionError:
[ '--config=…/bun-isolated.toml', -'--no-env-file', '--no-install', '-e', 'process.exit(0)', 'a b', '--json' ]

test at ai-framework/scripts/runtime/entry.test.mts:100:3  (workflow Bun script …)
actual:   [ 0, 'workflow-dotenv-marker', '' ]
expected: [ 0, 'no dotenv', '' ]

test at ai-framework/scripts/runtime/entry.test.mts:100:3  (workflow Bun eval …)
actual:   [ 0, 'workflow-dotenv-marker\n["a b","--json"]', '' ]
expected: [ 0, 'no dotenv\n["a b","--json"]', '' ]

test at ai-framework/scripts/runtime/entry.test.mts:106:1
actual (built output): console.log("workflow-dotenv-marker");   expected: process.env.WORKFLOW_BUN_TEST_MARKER

test at ai-framework/scripts/runtime/entry.test.mts:114:1
actual:   [ 0, 'bun\nworkflow-dotenv-marker', '' ]
expected: [ 0, 'bun\nno dotenv', '' ]
```

The preload half **is** already blocked: the `workflow-preload-marker` never appears, because `--config`
points Bun at the shipped empty `bun-isolated.toml`. Only `.env` leaks. The unprotected control test
(`unisolated Bun control …`, a raw `bun ./marker.mts`) correctly shows both markers, so the fixture can
detect them.

**Fix:** `return [`--config=${config}`, "--no-env-file", "--no-install"];` (order preserved). No
caller changes needed; `checkCatalog` / `catalog` inherit it. Contract requirement "a missing config
file must stay a failure; do not fall back" is otherwise satisfied — the code never retries without the
options, and Bun stops `ENOENT` on a missing `--config` target. Nothing in `workflowInvocation` adds a
fallback.

## Verified-correct points (checked, no finding)

- **`bun-isolated.toml`** (`ai-framework/scripts/runtime/bun-isolated.toml`): comments only, no settings;
  message states why it must stay that way. Present in `ai-framework/templates/shipped-files.txt:337`
  (`ai-framework/scripts/runtime/bun-isolated.toml`); shipped-list/invariant test copies it
  (`runtime/runtime.test.mts:506`, `copyFileSync(join(here,"bun-isolated.toml"), …)`) and scans it.
- **Path resolution** (`entry.mts:13`): `fileURLToPath(new URL("./bun-isolated.toml", import.meta.url))`
  — from the module's own location, never `cwd`, never an environment value. (Tests in this sandbox ran
  from a scratch working dir; the path stayed the bundle's `runtime/`.)
- **`workflowInvocation`** (`entry.mts:18-33`): options placed **before** all other args
  `[...flags, ...rest]`. Leading `NODE_FLAGS` stripped (`while (NODE_FLAGS.includes(rest[0])) rest.shift()`)
  before isolation is re-applied; `flags` re-added for Node; `AI_WORKFLOW_RUNNER` forwarded sanitized.
- **Test-run handling** (`entry.mts:27-30`): only when runner is Bun; `--test`→`test`; no isolation when
  `rest[0]==="test"` (`test` as first arg after Node-flag removal). Node launches (`flags=NODE_FLAGS`)
  and test runs are unchanged from before.
- **`run-tests.mts`** `launch()`: probes `workflowInvocation(deps, ["--test"], …)` and
  `["--test","--help"]` for `--parallel`, then `workflowInvocation(deps, [...flags,...files], …)`;
  `NODE_TEST_CONTEXT` deleted for the child. The `--test`/`test` first-arg contract keeps it working;
  no isolation is injected into Bun test runs. (Accepted: Bun test intentionally keeps project settings.)
- **Script / `-e` / `build` / `test` argument handling** under Bun, options first: script
  (`bun --config=… … script args`); `-e` (`bun --config=… … -e code a b --json` →
  `process.argv.slice(1)===["a b","--json"]`, `require("node:fs")` works, `node -e`-style usage
  preserved); `build` (`bun --config=… … build --no-bundle …`, and `--env=…` no longer picks up `.env`,
  asserted once `--no-env-file` is present); `test` (`bun test …`, unchanged). Node `-e`, `--test`,
  script forms unchanged.
- **`orca-run.mts checkCatalog`** (`orca-run.mts:46-58`): `scriptFlags = deps.runtime === "node" ?
  NODE_FLAGS : bunIsolationOptions()`; command `deps.proc.execPath`; non-test Bun script checks
  (`workflow-doctor`, `setup-validator`, `graph-check`) get isolation; `node-tests` Bun entry
  `["test","ai-framework/"]` unchanged; Node entries `[...NODE_FLAGS, …]` and `[...NODE_FLAGS,"--test",…]`
  unchanged. Pinned in `orca-run.test.mts` (`bunOptions` = three incl. `--no-env-file`;
  `bunCatalog["node-tests"].args == ["test","ai-framework/"]`).
- **`orca-eval-grader.mts catalog`** (`orca-eval-grader.mts:211-219`): `flags = runtime==="bun" ?
  bunIsolationOptions() : []`, `args=[...flags,"-e",code]`, command `ctx.deps.proc.execPath`. Pinned in
  `orca-eval-grader.test.mts` (`evalArgs = bun ? [--config,--no-env-file,--no-install,"-e"] : ["-e"]`).
- **`setup-validator.mts`** uses `runWorkflow` (not `deps.child.run`) only when
  `command===deps.proc.execPath`, so isolation is applied once, not doubled; its own args carry no Bun
  flags. `setup-validator.test.mts` builds `expected` from `bunIsolationOptions()`; assertion shape intact.
- **`cli.mts runDirect`** respawn route (`cli.mts:13-23`): Node→Bun respawn uses
  `workflowInvocation(boot, [script,...argv], {stdio:"inherit", env: merged})`; `merged` from
  `runnerEnvironment` reads `ai-workflow.toon`/`ai_workflow_env.json`, **never `.env`**
  (`select.mts`); `result.signal` re-kills; `ENOENT` for a missing `bun` on `PATH` only. Known accepted:
  the *initial* Node launch still honors `NODE_OPTIONS`, and a direct `bun <script>` can't be protected.
- **`runWorkflow` / `runWorkflowSync`** (`entry.mts:35-41`): both call `workflowInvocation` once and pass
  through `options`; preserve `cwd`, `env`, `timeoutMs`, `stdio`, `input`. `test-helpers.mts runScript`
  uses `runWorkflowSync`. `pitch-compress` passes leading `NODE_FLAGS`, which are stripped under Bun.
- **Boundaries / rules**: no `any`, explicit return type `string[]`, no project-supplied path for
  `--config`, no logging of env/secrets, no shell, no new file outside the shipped bundle, no change to
  runner selection (`resolveRunner` untouched), no change to test-run args, no change to project check
  commands. No cross-app/shared-layer violation.
- **`bunIsolationOptions` is the single shared helper** (`orca-run`, `orca-eval-grader`, `setup-validator`
  all import it); no duplicated flag lists in production code. Only `contract/s1-brief.md` /
  `contract/log.md` (not shipped) and the changed tests pin the literal triple.

## Known, recorded and accepted (not reported, per task)

Direct `bun <script>` / bun shebang unprotected; `bun test` keeps project settings; project check
commands run project code; only Bun 1.4.5/macOS verified; Node launch honors `NODE_OPTIONS`.

## What I tried that did not work / could not verify

- **Named test command initially printed only**
  `node:test run() is being called recursively within a test file. skipping running files.` and exited 0
  with no tests run. Cause: this sandbox injects `NODE_TEST_CONTEXT=child-v8` and `NODE_TEST_WORKER_ID=1`
  into the shell; `node --test <file>` then acts as a recursive child. Fix for my run: `env -u
  NODE_TEST_CONTEXT -u NODE_TEST_WORKER_ID`. (Not a defect in the changed code; `run-tests.mts` already
  deletes `NODE_TEST_CONTEXT` for its own children.)
- **`grep -n -i "known issue"`** on both READMEs → no match; the old "Known issue with Bun" paragraph is
  gone, replaced by the new trusted-config paragraph (docs match intent, not current buggy behavior).
- **No `git diff`** available — read-only scratch copy, no `.git`; reviewed full files and greps instead.
- Did **not** run `bun test`, `pre-ship-verify`, `run-tests.mts`, or `orca-run`/`orca-eval-grader`
  end-to-end (not in my allowed command set; `orca-run` reconcile needs a real Orca + git harness), so
  the `orca-*` correctness above is by code inspection plus the repo's own pinned assertions, not my own
  live run. Did **not** independently re-run on Bun `bun test`; Bun-side real-Bun cases above ran under
  Node's `node:test` spawning real Bun 1.4.5 children.
- Did **not** verify Bun on Windows/Linux or Bun versions other than 1.4.5 (accepted unknowns). Did not
  test `BUN_OPTIONS` interactions beyond the contract's recorded `BUN_OPTIONS=--config=…` case, nor
  `bunfig.toml` keys other than `preload` (accepted unknown).
- `--no-env-file` added in my analysis is the contract-required missing piece; I verified its effect at
  the Bun level against the recorded triage table and the repo's failing assertions, but this is a
  review, not a patch — no source file was modified.

## Review summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 0 |
| acknowledged | 0 |

Verdict: **BLOCK — 1 must-fix finding.** `bunIsolationOptions()`
(`ai-framework/scripts/runtime/entry.mts:14`) omits `--no-env-file`, so workflow-started Bun still loads
`.env` from the untrusted working folder, contradicting S1, the contract, `security.md`, both READMEs,
and the repo's own pinned tests (named test command: 6 failures / EXIT=1). Add `"--no-env-file"` between
`--config=…` and `--no-install`; no caller changes are required.
