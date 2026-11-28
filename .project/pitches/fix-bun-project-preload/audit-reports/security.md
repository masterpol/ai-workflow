# Security review: workflow-started Bun loading project settings

Verdict: **BLOCK**. There are 2 must-fix findings and 1 should-fix finding. I used Bun 1.4.5 on macOS with marker-only probes under `work/probe/`.

In this report, `W` means `<scratch>/bf-audit/security/work`.

## Findings

| tier / severity | file:line | issue | failure scenario | fix |
|---|---|---|---|---|
| must-fix / CRITICAL | W/ai-framework/scripts/runtime/entry.mts:14 | The isolation options do not stop Bun reading the working folder's `tsconfig.json` or `jsconfig.json` `paths`. | An untrusted project maps `*` to its own file. Its code then runs in place of the trusted workflow script, with exit status 0. | Add `--tsconfig-override=<absolute path of a shipped, trusted, empty tsconfig>`. Resolve it as the TOML path is resolved, ship it, and add real-Bun tests. |
| must-fix / HIGH | W/ai-framework/scripts/runtime/entry.mts:29 | `-e` launches get no isolation options. | Under Bun, the workflow doctor's `-e` parse check runs the project's `bunfig.toml` preload and loads its `.env`. | Exempt only `test`: `flags = rest[0] === "test" ? [] : bunIsolationOptions();` |
| should-fix / MEDIUM | W/ai-framework/hooks/scripts/pre-ship-verify.mts:116 (used at :125) | `nodeCheck` runs `deps.proc.execPath` directly through `deps.child.run`, bypassing the shared launcher. | With a Bun parent and `tools/viewer/verify-all.ts` present, the "workflow setup" check starts Bun with only the Node flags. The preload runs and `.env` loads. | Build this launch with `workflowInvocation`, or run it through `runWorkflow`. Decide separately how the project-owned viewer scripts should launch. |

### 1. tsconfig and jsconfig `paths` replace the trusted script

Rules: `security.md` section 9, "Execute only bundle code" and "Resolve config only from a trusted root".

Setup in `W/probe/p4`: `tsconfig.json` is `{"compilerOptions":{"baseUrl":".","paths":{"*":["./evil/mod.ts"]}}}`, and `evil/mod.ts` only prints `MARK_TSCONFIG_EXEC`.

Command: `node --experimental-strip-types --disable-warning=ExperimentalWarning d.mts`. It calls the real `runWorkflowSync` with runner `bun` and the probe folder as the working folder.

```
== s.mts status 0 "MARK_TSCONFIG_EXEC\n"
== ./s.mts status 0 "MARK_TSCONFIG_EXEC\n"
== W/probe/p4/s.mts status 0 "MARK_TSCONFIG_EXEC\n"
== W/probe/trusted/t.mts status 0 "MARK_TSCONFIG_EXEC\n"
== W/probe/trusted/u.mts status 0 "MARK_TSCONFIG_EXEC\n"
== W/ai-framework/scripts/graphify-relations.mts --help status 0 "MARK_TSCONFIG_EXEC\n"
== W/ai-framework/scripts/run-tests.mts --list status 0 "MARK_TSCONFIG_EXEC\n"
== build --no-bundle s.mts status 0 "console.log(\"trusted script ran\");\n"
```

- The result was the same with `jsconfig.json`. A script outside the project, given by absolute path, was also replaced.
- A `tsconfig.json` in a parent of the working folder also took effect. I ran from `probe/p4/sub`.
- With separate keys, `"*"` and `"/*"` redirected. `"./*"`, `"node:*"`, the exact keys `"node:fs"` and `"fs"`, and the exact key `"./lib/real.mjs"` did not. This is why the triage probe in `contract/log.md` saw no redirect: it did not cover these two wildcard keys. Its conclusion about `tsconfig` is incomplete.
- `-e` code that ran `await import('W/probe/trusted/u.mts')` under all three options printed `MARK_TSCONFIG_EXEC` and then `after import`. Fixing finding 2 alone therefore does not protect imports made by `-e` code.
- `build --no-bundle` of a relative file was not redirected.
- A failed check can look successful, because the replacement exits 0 and chooses its own output. This affects every caller of `bunIsolationOptions()`, including `checkCatalog` and the grader catalog. I observed the hijack through the shared launcher and direct Bun commands; I did not run those two catalogs against the hostile `tsconfig.json`.

Tested fix: adding `--tsconfig-override=W/probe/trusted/tsconfig.empty.json` (content `{}`) to the three options made `u.mts` print `trusted import ran REAL`. This held for a `"*"` mapping in `tsconfig.json` and, separately, in `jsconfig.json`.

README claims to recheck after the fix: `W/README.md` and `W/ai-framework/scripts/runtime/README.md` list what these launches skip. The documented route of a Node launch with `AI_WORKFLOW_RUNNER=bun` is not safe in an untrusted checkout while this finding is open.

### 2. `-e` launches are not isolated

Rules: the contract (`contract/s1-brief.md`, Behavior: options for scripts, `-e` and `build`) and `security.md` section 9, "Resolve config only from a trusted root".

The named command, `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/entry.test.mts`, gave 10 tests, 8 passed, 2 failed, 0 skipped. The failures are "prefixes Bun eval and build options while preserving test-run arguments" and "workflow Bun eval ignores project preload and dotenv markers". The second shows:

```
actual:   [ 0, 'workflow-preload-marker\nworkflow-dotenv-marker\n["a b","--json"]', '' ]
expected: [ 0, 'no dotenv\n["a b","--json"]', '' ]
```

The copy under review therefore does not meet its own exit criteria.

My probe through `runWorkflowSync`:

```
== -e ["-e","console.log(\"e env=\"+process.env.PROBE_ENV)"]
 status 0 MARK_PRELOAD
e env=MARK_ENV
```

Passing the Node flags before `-e` gave the same result.

Reachable caller: `W/ai-framework/scripts/workflow-doctor.mts:456` sends `["-e", BUN_PARSE_SCRIPT, ...]` through `runWorkflow` (line 396), with the project root as the working folder. I passed the same parse source and argument shape to `runWorkflow` from a Bun parent, without running the whole doctor:

```
doctor -e parse: 0 "MARK_PRELOAD env=MARK_ENV\n"
```

The grader's `evaluate` adds the options itself and does not go through this branch.

### 3. `pre-ship-verify` launches the parent's Bun directly

Rules: `security.md` section 9, "Resolve config only from a trusted root", and the contract's expected behavior for workflow-started Bun.

From `W/probe/p3`, under Bun with the three options on the parent, `d.mts` called the real `buildChecks(null, deps)[0]` and ran its command and arguments with `deps.child.run`, as `runCheck` does:

```
pre-ship nodeCheck: workflow setup --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/setup-validator.mts --json
 -> "MARK_PRELOAD env=MARK_ENV\n"
```

Limits on this finding: the script path is relative to the working folder, and the viewer checks that follow run project-owned scripts, which is project code. Those later checks use the same `nodeCheck` helper, so they also get the project preload and `.env`. I rate it MEDIUM for that reason. It is still a Bun launch that the workflow starts without the shared launcher, and it is not a `package.json` or `checks.toon` command.

## What did not get through

- **Preload and `.env` on script launches:** the options blocked them. This held for top-level and `[run]` `preload`, `[define]`, and `.env`, `.env.local`, `.env.development` and `.env.production`. The unisolated control showed the preload, dotenv and define markers.
- **Other `bunfig.toml` keys:** only those listed above were tested. I did not test each remaining key.
- **`package.json`:** `preload`, `bun.preload` and `imports` showed no effect on the probe script. That script did not import `#a`.
- **`node_modules`:** with no hostile config, nothing from it loaded. Auto-install of a missing bare package failed with `Cannot find package`.
- **Script arguments:** `--config`, `--env-file` and `--preload` placed after the script stayed ordinary arguments and did not change isolation.
- **Build:** `build --no-bundle` did not inline the probe variable under the options.
- **Missing config:** a nonexistent `--config` path made Bun stop with `ENOENT`.
- **Config selection:** the TOML path comes from `import.meta.url`. By reading the code, no environment value or project file selects it. The shipped TOML contains comments only and is in `shipped-files.txt`.
- **`BUN_OPTIONS`:** an inherited `BUN_OPTIONS=--preload=./pre.js` did run the preload despite the options. This comes from the caller's environment, like `NODE_OPTIONS`. Putting that line in the project's `.env` had no effect under `--no-env-file`. I do not count it as a finding. The README names only `NODE_OPTIONS`, so it could mention `BUN_OPTIONS` too.
- **Nested self-launch:** a raw `spawnSync(process.execPath, ["s.mts"])` from an isolated parent did not inherit isolation and loaded the preload, define and `.env`. Every nested self-launch therefore needs the options itself.
- **`bun test --help` (the `run-tests.mts` worker probe):** it printed help, and I saw no preload or dotenv marker.

## Launch search

I searched the `.mts`, `.ts`, `.js` and `.mjs` files in the work copy, excluding tests, for spawn, exec, fork, worker, `execPath` and `child.run` calls. I also read part of `hooks/hooks.json` and searched for Bun command strings.

- `setup-validator.mts` and `workflow-doctor.mts` send `execPath` launches to `runWorkflow`. That is affected by findings 1 and 2.
- `bundle-sync.mts`, `cli.mts` and `run-tests.mts` use the shared launcher.
- `checkCatalog` in `orca-run.mts` adds the options. Under a Bun parent, the `graph-check` arguments began with the options; my printed slice showed `--no-env-file --no-install`. The grader catalog adds them too (code reading). Both are affected by finding 1.
- `pre-ship-verify.mts:112` returns `execPath` plus a package-manager JavaScript CLI on Windows. It runs project check commands, which is accepted, and Windows is unverified.
- `pre-ship-verify.mts:116` is finding 3.
- The hook commands I read in `hooks.json` start Node.
- The other launches I saw in search output start external tools such as `git`, `uv`, Orca, `opencode` or a formatter. I did not trace every command variable, or what an external tool's shebang may start. `skill-sync.mts` can run the project's `node_modules/.bin/prettier`, which is project code and outside this change.
- The work copy has no `.opencode`, `.cursor` or `.codex` folders, so plugins and vendor adapters are **unverified**.

## Security checklist

| Item | Result |
|---|---|
| A. Authentication | Not applicable: the reviewed changes have no handlers or routes. |
| B. Authorization | Not applicable. |
| C. Data validation | Not applicable to schemas. The runner value is limited to `node` or `bun` by `resolveRunner`. |
| D. Secrets | No hardcoded secret matched my pattern search of `entry.mts`, `orca-run.mts` and `orca-eval-grader.mts`. Other changed files were not scanned. I saw no secret logging in the code I read. |
| E. XSS and injection | No HTML rendering. The inline eval sources I read are constants, with paths passed as arguments or fixed in the code. Config-driven code execution fails (findings 1 and 2). |
| F. Multi-tenancy | Not applicable. |
| G. Guarded reader | The legacy settings reader refuses symlinks, non-regular files, outside paths and oversize files (code reading). The TOON `loadConfig` reader was not reviewed. |
| G. Linear, capped regexes | The changed launch code I read adds no regex over project content. The `--parallel` regex in `run-tests.mts` reads Bun help output. |
| G. No project-supplied script is executed | **Fail** (findings 1, 2 and 3). |
| G. No raw error text or absolute path in output | The changed launcher adds no output. The rest was not assessed. |
| G. Writer, publish and cleanup guards (four items) | Not applicable: the launcher change adds no writer or deletion. |
| Dependency audit | Not run. I found no package manifest in the work copy's listing, and the contract says shipped scripts import only `node:` modules and relative files. |

## Unverified

- Other Bun versions, Windows and Linux (already accepted).
- Plugins and vendor adapters, which are absent from the work copy.
- The remaining `bunfig.toml` keys, and tsconfig settings other than `paths`, including `extends`, JSX and decorator settings.
- `--tsconfig-override` beyond entry and relative imports: `build`, `-e`, and a `tsconfig.json` beside a script in another directory.
- Diffs for the changed test files. I ran only `entry.test.mts`; the other exit commands were not run.

I wrote the report only to this scratch path. I did not write the `.project/pitches/fix-bun-project-preload/audit-out/security.md` path also listed in the brief, because the brief forbids writing inside the repository checkout.

## Security summary

| Tier | Count |
|------|-------|
| must-fix | 2 |
| should-fix | 1 |
| acknowledged | 0 |

Checked: checklist items as tabled above, the named test command, real-Bun probes in `work/probe/`, and the launch-site search.

Unverified: see the list above.

Verdict: **BLOCK**. The 2 must-fix findings require resolution.
