# Security review: isolation of workflow-started Bun processes

Verified with Bun 1.4.5 on macOS. All paths below are relative to the reviewed folder,
`<scratch>/bf-audit2/security/work`.
Every probe ran under `probe/` and only printed or wrote a harmless marker.

In the commands, `ISO` stands for the four shared options: `--config=<runtime>/bun-isolated.toml --no-env-file --no-install --tsconfig-override=<runtime>/bun-isolated-tsconfig.json`.

**Verdict: BLOCK.** There are three must-fix findings. The first two findings execute project code, and the third removes the isolation from one launch site.

## Findings

| tier | file:line | issue | failure scenario | fix |
|---|---|---|---|---|
| must-fix (HIGH) | `ai-framework/scripts/setup-validator.mts:287` | The Bun "parse check" runs `bun build --no-bundle` over project TypeScript, and this expands Bun macros, which executes project code. The shared options do not prevent it. | An untrusted project places a macro import in any `.ts` or `.mts` file under the scanned directories. Running the validator with the Bun runner executes the macro, and the check still reports "pass". | Parse without evaluating. Adding `--no-macros` to this build worked in my probe. |
| must-fix (HIGH) | `ai-framework/scripts/workflow-doctor.mts:26` (launched at `:456`) | `new Bun.Transpiler(...).transformSync` on project files also expands macros. | A project's `.claude/hooks/post-edit-check.mts`, or another listed script, imports a macro. The doctor under Bun executes it. A relative, absolute or `node_modules` package specifier all worked. | Do not use `Bun.Transpiler` on untrusted text. `--no-macros` does **not** stop it, and neither does `Transpiler.scan`. Use a parse that never evaluates, for example `bun build --no-bundle --no-macros`, and test it with a macro marker. |
| must-fix (HIGH) | `ai-framework/hooks/scripts/pre-ship-verify.mts:118` | `setupCheck` passes `[]` under Bun instead of `bunIsolationOptions()`. The function is imported at line 4 and never used, although the comment says the validator must not pick up the project's Bun settings. | In a project that has `tools/viewer/verify-all.ts` and holds the bundle, the pre-ship hook under Bun starts `setup-validator.mts` with the project's `bunfig.toml` preload, `.env` and path mappings. A mapping can replace the validator, so the gate can be made to pass. | `const flags = deps.runtime === "bun" ? bunIsolationOptions() : NODE_FLAGS;` |
| acknowledged (LOW) | `ai-framework/scripts/orca-run.mts:48`, `ai-framework/hooks/scripts/pre-ship-verify.mts:119` | The scripts are given as paths relative to the working folder. If such a file is missing, isolated Bun falls back to a `package.json` script with that name. | A project omits the file and defines a script under the same name, which then runs. A project that controls these paths could also just supply the file, so this adds little. | Pass an absolute path and fail if the file does not exist. |

## Evidence

### 1. Setup validator build

Direct probe. `sub/t.ts` imports `{m}` from `./mac.ts` with `{type:"macro"}`; `m` prints a marker and writes `MACRO-RAN`.

```
$ bun $ISO build --no-bundle sub/t.ts
MARK-macro-executed
console.log(1);
exit=0
MACRO-RAN  (content: harmless marker)
```

Calling `runWorkflow(deps, ["build","--no-bundle","sub/t.ts"])` with `AI_WORKFLOW_RUNNER=bun`, using the real `entry.mts`, gave the same marker.

With `--no-macros`:

```
error: Macros are disabled
exit=1
```

No marker file was written. A file that uses a macro would then fail the parse check, which is the safe result.

End to end, in `probe/e2e`, with `.project/`, `.claude/hooks/mac.ts` and `.claude/hooks/zz.ts`:

```
$ AI_WORKFLOW_RUNNER=bun node --experimental-strip-types --disable-warning=ExperimentalWarning <work>/ai-framework/scripts/setup-validator.mts --json
exit=1            (other checks fail because the probe project is minimal)
E2E-MACRO-RAN     (content: harmless marker)
"name": "TypeScript entries", "status": "pass", "detail": "2 TypeScript file(s) parse"
```

### 2. Workflow doctor transpiler

```
$ bun $ISO -e '<BUN_PARSE_SCRIPT>;console.log("parsed")' sub/t2.ts ts
MARK-macro-executed
parsed
MACRO-RAN
```

This happened for the specifiers `./mac.ts` (resolved against the working folder), an absolute path, and the package name `mpkg` in the project's `node_modules`. Adding `--no-macros` before `-e` still printed `MARK-macro-executed`. `new Bun.Transpiler(...).scan(...)` also executed the macro.

End to end, with the same macro imported from `.claude/hooks/post-edit-check.mts` and `mac.ts` in the project root:

```
$ AI_WORKFLOW_RUNNER=bun node ... <work>/ai-framework/scripts/workflow-doctor.mts --json
exit=2
E2E-MACRO-RAN     (content: harmless marker)
```

The `AI_WORKFLOW_RUNNER=node` control hit my 15 second alarm (exit 142). It had left no marker by then, but it did not finish, so it is not a complete control.

The runner can be chosen by the untrusted project itself through its root `ai-workflow.toon`, where the entry point reads that file. I established this from `runnerEnvironment` and `loadConfigEnv` by reading the code; my end-to-end probes set the process variable.

The README (lines 71 onward) and `ai-framework/scripts/runtime/README.md:40` limit their claim to preloads and path mappings. The brief's threat is wider: a workflow-started Bun launch must not load or run project-controlled code, and macros in the two parse commands do. A search of the test files under `ai-framework/` found no mention of macros.

### 3. `setupCheck`

```
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/pre-ship-verify.test.mts
tests 28, pass 26, fail 1, skipped 1
✖ checks come from the recognised scripts, with verify:base first and the document checks after it
  actual:   [ 'ai-framework/scripts/setup-validator.mts', '--json' ]
  expected: [ '--config=…bun-isolated.toml', '--no-env-file', '--no-install', '--tsconfig-override=…', 'ai-framework/scripts/setup-validator.mts', '--json' ]
```

The reviewed copy therefore does not pass its own test. As a control for what unprotected Bun does, a plain `bun n/a/b/main.ts` in the probe project printed `MARK-preload` and `MARK-dotenv`. I did not run the hook itself end to end.

`entry.test.mts`: 14 tests, 14 passed.

### 4. Fallback to a `package.json` script

```
$ bun $ISO nofile.mts      # no such file; package.json has a script named "nofile.mts"
$ echo MARK-pkgscript
MARK-pkgscript
exit=0
```

I tested a bare name only, not a name containing slashes. The application to the two relative-path launch sites is therefore **unverified**.

## What I tried that did not work

- **Preload and dotenv in the working folder:** isolated script and `-e` runs showed neither.
- **Parent-folder `bunfig.toml`, `.env` and `tsconfig.json`:** none was applied to an isolated script run.
- **Symlinks:** a symlinked script and a symlinked `bunfig.toml` in the working folder loaded nothing extra.
- **Argument order:** `--config` and `--env-file` placed after the script arrived as ordinary script arguments. With `-e`, the user arguments arrived intact.
- **Nested `tsconfig.json` beside the script:** mappings for a relative import, `node:path`, `fs` and `*` were ignored. I did not separately probe a nested `jsconfig.json`; the supplied tests cover a project-level one.
- **`package.json`:** `preload`, `bun.preload`, `imports` and `macros` keys caused nothing to load in a script or eval run.
- **`node_modules` shadowing:** packages named `fs`, `path`, `node:fs` and `child_process` did not replace the built-ins. My searches found no bare third-party import that matters; the matches were string literals or relative paths.
- **Missing shipped configs:** the two supplied tests pass. I did not repeat them by hand. The accepted behaviour for a missing TypeScript override was not re-examined.
- **The two shipped configs:** the TOML file holds only comments and the TypeScript file is `{}`. Both are listed in `ai-framework/templates/shipped-files.txt:337-338`.

## Launch sites

- **Use the shared options:** `runWorkflow` and `runWorkflowSync` (in `cli.mts`, `bundle-sync`, `legacy-upgrade`, `pitch-compress`, `review-bench`, `setup-validator`, `workflow-doctor`), `workflowInvocation` in `config-migrate`, `checkCatalog` and `evalCatalog`. Using the options does not protect the two parse commands in findings 1 and 2.
- **Missing the options:** `setupCheck` (finding 3).
- **Accepted by the brief:** test runs, project check commands and viewer scripts.
- **Not Bun launches:** Git, `uv`, `ps`, `lsof`, Orca and the runtime availability checks (`python3`, `agent-browser`). The shipped Claude hook commands I saw start Node. I found no Bun launch in the `.claude` settings that I searched; the work copy has no `.opencode` or `.codex` folder.

## Checklist (`ai-framework/rules/security.md`)

| item | result |
|---|---|
| A. Authentication | Not applicable: no server routes or user data in this change. |
| B. Authorization | Not applicable. |
| C. Data validation | Not applicable to backend validators. `resolveRunner` accepts only `node` or `bun`. |
| D. Secrets | No hardcoded secret seen in the launch code or shipped configs; this was not a full secret scan. Isolation stops project `.env` loading except at finding 3. |
| E. XSS and injection | No HTML rendering. Eval strings are fixed bundle constants. Project-code execution through macros is findings 1 and 2. |
| F. Multi-tenancy | Not applicable. |
| G1. Guarded reader | The legacy config reader refuses symlinks, non-regular files, outside paths and oversize files (read in `env.mts`). The file reads inside the two parse subprocesses were not reviewed for this; unverified. |
| G2. Bounded and linear regexes | The change adds no relevant regex that I saw. |
| G3. No project script executed | **Fail:** findings 1 and 2. Finding 3 lets project settings run. The relative script paths are noted as finding 4. |
| G4. No raw error text or absolute paths | Not changed by the isolation code as read. `workflow-doctor` forwards graphify's stderr near line 696; I did not assess whether this change introduced it. |
| G5–G8. Writer guards, re-inspection, cleanup, hook tests | Not applicable: the reviewed launch change writes no project files. |

The dependency audit does not apply: the review found no third-party dependency in the change, and I did not run an audit.

## Security summary

| Tier | Count |
|------|-------|
| must-fix | 3 |
| should-fix | 0 |
| acknowledged | 1 |

Checked: the checklist above; both named test files, run one at a time; real Bun probes; end-to-end runs of the setup validator and the doctor.

Unverified: an end-to-end run of the pre-ship hook under Bun; the `package.json` fallback with slash-containing script paths; a completed Node control for the doctor; file-read guards inside the parse subprocesses; whether tests outside the two named files pass.

Verdict: BLOCK — 3 must-fix findings require resolution.
