# Security review: Bun project preload fix

Reviewed the named code as it stands, in the work copy, with Node 24.21.0 and Bun 1.4.5 on macOS. Paths below are relative to the work folder. `$W` is the work folder.

## Findings

| tier | file:line | issue and rule | failure scenario | fix |
|------|-----------|----------------|------------------|-----|
| must-fix | ai-framework/scripts/workflow-doctor.mts:454 | `checkSyntax` copies `deps.proc.env` without pinning `AI_WORKFLOW_RUNNER: "node"`. This breaks contract item 2 (parse only by starting the same Node executable, whatever the environment says). The validator does pin it (ai-framework/scripts/setup-validator.mts:290). | A caller of `main()` has a Node checking process and `AI_WORKFLOW_RUNNER=bun` in `deps.proc.env`. The doctor then starts a bare-name `bun` from `PATH` for the parse children, with the checked project as working folder. The shipped test at ai-framework/scripts/workflow-doctor.test.mts:263 fails. | `const env = { ...deps.proc.env, AI_WORKFLOW_RUNNER: "node" };` |
| should-fix (existing behavior; I did not compare it with an earlier version) | ai-framework/scripts/workflow-doctor.mts:546, 515-528 | `--fix` takes its template from the checked project, and `copyFile` follows symlinks. Rule: security.md section 9 and checklist G (guarded reader, refuse symlinks). | An untrusted project ships `ai-framework/templates/project/leak.md` as a symlink to a file outside it. `--fix` copies that file's content into `.project/leak.md`, where it can be committed or shared. No code runs, and `--fix` must be given. | Take the template from beside the doctor module, or lstat each source and refuse links and non-regular files. |
| acknowledged | ai-framework/scripts/skill-defaults.mts:147, 179 (reached from workflow-doctor.mts:597) | The doctor also starts `python3 --version` and `agent-browser --version` with the checked project as working folder, whether or not those skills are installed. | No project code ran in my probe (`agent-browser` was a fake; a real one is not on `PATH` here). I did not verify whether a real `agent-browser`, or a version-manager shim for `python3`, reads project configuration on `--version`. The bare-name `PATH` lookup itself is accepted and is not reported. | Run these checks with a neutral working folder, or skip them in the doctor. |
| acknowledged | ai-framework/scripts/workflow-doctor.mts:767 | `checkGraphHooks` reads the hook files with no file-type or size check. The project's git config chooses the folder through `core.hooksPath`. Checklist G. | With `core.hooksPath` set to a project folder that holds a FIFO named `pre-commit`, a direct doctor run hung until my 15 s kill and printed nothing. This is denial of service only. | Use lstat and a size bound before reading. |
| acknowledged | ai-framework/scripts/workflow-doctor.mts:691, 712, 1187 | Raw child stderr or an error stack goes to output; other checks also print `error.message`. Rule: security.md section 9, never copy error text into output. | Observed: a project with no template folder gave exit 2 and printed an `ENOENT ... scandir '<absolute path>'` stack. Lines 691 and 712 are from reading the code only, and 691 needs `--live-opencode`. The syntax-parse path did not show child stderr. | Print the error code only. |
| acknowledged | ai-framework/scripts/workflow-doctor.mts:154 | Under Bun, the "Runtime boundary" row says `pass ... 0 unparsed`. It comes from a lexical scanner, not a syntax parse. Relates to contract item 3. | A Bun doctor run on a project containing `const = ;` in a `.mts` file printed both `pass Runtime boundary ... 0 unparsed` and `warn Syntax check 8 file(s) not parse-checked`. A reader could take the first row to mean the files parsed. | Say "unscanned", or "lexical scan only". |

### Must-fix evidence

`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/workflow-doctor.test.mts` gave 92 tests, 91 passed, 1 failed. The failing test expected the command `.../v24.21.0/bin/node` with `AI_WORKFLOW_RUNNER: 'node'` and got `command: 'bun'` with `AI_WORKFLOW_RUNNER: 'bun'`.

I copied the code to `probe/fixcopy`. With `--test-name-pattern="pins project parsing"`, the test failed as shipped and passed after only the one-line pin above.

Reach is limited. On the command-line path, `cli.execute` and `selectRuntime` set the runner to match the running process, based on my reading of `runtime/cli.mts` and `runtime/select.mts`. So I found this only through a direct `main(argv, deps)` call, as the test makes. I found no command-line exploit. I rate it must-fix because a contract guarantee and its shipped test both fail.

## Probes that found no problem

- **Bun isolation.** The probe folder had a `bunfig.toml` preload, `.env`, `.env.local`, `.env.production`, `.env.development`, and `tsconfig.json`/`jsconfig.json` mappings (including `*`, `fs` and `node:*`). With the four isolation flags, script, `-e` and `build` launches from that folder wrote no marker, and the script and eval launches saw no `EVIL_*` variables. `build` output contained the real sibling module. An unisolated control run wrote the mapping marker, so the mapping probe was live. The control did not separately prove that the preload would fire. A child started by an isolated eval with `--no-env-file` saw no variables; this does not test a bare grandchild.
- **Hostile project, doctor under Node and Bun.** The project had a preload, `.env` files with `NODE_OPTIONS`, `BUN_OPTIONS`, `GRAPHIFY_BIN` and runner settings, TypeScript mappings, a runner setting in `ai_workflow_env.json`, marker-writing copies of `graphify.mts`, the doctor, validator, entry, hooks and plugin files, a Bun macro import, and a git `core.fsmonitor` script and `pre-commit` hook. No marker was written. Isolated Bun was launched with the flags by my command, as the documents prescribe.
- **Setup validator, same project.** No marker was written under Node or Bun. Under Node it reported 8 files parsed and failed the broken one without showing stderr. Under Bun it reported 9 files "not parse-checked" and no parsed count. In that run its doctor child exited 2 because the template folder was missing, and I did not rerun the validator after adding it. The doctor-warning summary under a hostile project is therefore covered only by the tests and code reading.
- **Child processes.** The `PATH` log for the doctor runs showed `python3 --version`, `agent-browser --version`, `uv --version` and `git rev-parse --git-path hooks`. It showed no `opencode` and no bare `node` or `bun`. Parse children started through `execPath` do not appear in a `PATH` log.
- **git and uv.** `git rev-parse` did not run the fsmonitor script. `uv --version` exited 0 with a syntactically invalid `uv.toml` in the folder, which suggests it does not read it. I did not test other uv configuration files.
- **Bundle Graphify.** The doctor and validator validated knowledge with the project's marker-writing `graphify.mts` present, and it did not run.
- **OpenCode.** Without `--live-opencode`, the doctor reported static checks only. A search of non-test `.mts`, `.ts`, `.sh` and `.json` files under `ai-framework` (excluding the doctor and some runtime files) found no caller that passes the flag. The fake `opencode` on `PATH` during the test runs recorded no calls.
- **Other launch sites.** By reading the code, `checkCatalog`, `evalCatalog` and `setupCheck` apply the isolation flags under Bun. `run-tests.mts` keeps `--test` first, so Bun test launches keep project settings.
- **Documents.** I read the changed passages in `README.md`, the runtime README, `workflow-doctor.md` and the Claude skill, and found no promise beyond the code apart from what the must-fix affects. The compared `--live-opencode` passage matches in the Cursor skill; I did not compare the rest of that file.

## Named tests, run one at a time

| test file | result |
|-----------|--------|
| runtime/entry.test.mts | 14/14 passed |
| runtime/runtime.test.mts | 62/62 passed |
| setup-validator.test.mts | 46/46 passed |
| workflow-doctor.test.mts | 91/92; the failure is the must-fix |
| orca-run.test.mts | 37/37 passed |
| orca-eval-grader.test.mts | 8 passed, 1 failed, 10 skipped |
| hooks/scripts/pre-ship-verify.test.mts | 27/28 passed |

The other two failures are `opencode-agent-id-resolves-from-installed-agents` ("case ... graded") and "this repository's own manifest loads" (got `undefined`). The work copy has no `.project/` folder, so I infer they come from missing records. I did not confirm that. These runs also had a fake `opencode` first on `PATH`.

## Checklist (ai-framework/rules/security.md)

| item | result |
|------|--------|
| A. Authentication | Not applicable: no server handlers or routes in the reviewed code. |
| B. Authorization | Not applicable. |
| C. Data validation | No backend or client forms. The validator checks the shape of child JSON reports (`isCount`). |
| D. Secrets | No hardcoded secret seen in the code I read; no dedicated secret scan was run. |
| E. XSS / injection | No HTML rendering. The reviewed launches pass argument arrays. The `-e` parse program is constant and the file is passed as an argument. |
| F. Multi-tenancy | Not applicable. |
| G. Guarded reader | Gaps: `--fix` template symlinks and the hook FIFO, listed above. Many other doctor reads are also unguarded by code reading and were not probed. |
| G. Linear regexes, capped input | Not verified. |
| G. No project script executed | No execution observed in the doctor, validator or Bun isolation probes. |
| G. No raw errors or paths in output | Gaps listed above. |
| G. Writers, publish guards, cleanup, injected-hook tests | `--fix` checks destinations for symlinks by code reading. Atomic publication, re-inspection and the related tests were not verified; they look outside this change. |
| Section 9: trusted configuration root | The Bun configs resolve beside `entry.mts`, and Graphify resolves beside the doctor. The `--fix` template does not. |

A dependency audit was not run; I saw no dependency manifest in the work copy's root listing.

## Security summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 1 |
| acknowledged | 4 |

Checked: the probes, tests and checklist items above.
Unverified: real `agent-browser` and version-manager behavior; the cause of the two other test failures and the 10 skipped tests; the validator's doctor-warning summary on the hostile project; regex and input bounds; writer guards; OpenCode live behavior (not run, by instruction); platforms other than macOS.

Verdict: BLOCK. One must-fix finding requires resolution.
