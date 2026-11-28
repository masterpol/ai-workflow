# Audit — fix-bun-project-preload

2026-11-27. Bug-fix: two review cycles, the cap. Orca Run `run_1603d83fac93`. Codex wrote the first version, so no reviewer is Codex. Reviewers were named by hand, each with an explicit model; Claude is outside the configured review pool and was used for security to include a second vendor. The coordinator wrote the cycle 1 patch.

**Result: two confirmed must-fix findings are open at the cycle cap. The fix must not ship as it stands.**

Dispatched, cycle 1: code (1) | security (1) | test coverage (1) | cross-pitch (1). Cycle 2: security (1) | test coverage (1). No UI, translation or AI-prompt surface.

## Code reviewer

model: opencode-go/kimi-k2.7-code, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: cac0ee8b7260011d7cf358ae1c41f28a0c4decdbc8116fab2f9e5587840f152f
cross-file interactions: reviewed the callers of the shared launcher and both README files
canary: caught

[Report](audit-reports/code.md) · [Prompt](audit-reports/code.prompt.txt)

## Security reviewer

model: claude-sonnet-5-5 (medium), Claude
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: f2ae95a0d03964d1cd3d59d6f16c04c5fa6675e12c4a53fa1997755e248445ef
cross-file interactions: reviewed process launch sites; plugins and vendor adapters were not in the copy
canary: caught

[Report](audit-reports/security.md) · [Prompt](audit-reports/security.prompt.txt)

## Test coverage checker

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 2ffe264ae8f7a72c56e7637883df4260efff611e8291c4294dc71b898b8a631e
cross-file interactions: reviewed fixtures against the launcher and both Orca catalogs
canary: caught

[Report](audit-reports/tests.md) · [Prompt](audit-reports/tests.prompt.txt)

## Cross-pitch conflict checker

model: opencode-go/minimax-m3.1-flash, OpenCode
independent: no (no planted canary)
read-only: verified by scratch folder and repository guard (clean)
prompt-sha256: a903fcb07eca0986dfbc1669dc764401fee7f1bcd789e1486cb4895737b147c1
cross-file interactions: reviewed the change against pitch records 04 to 07

[Report](audit-reports/cross.md) · [Prompt](audit-reports/cross.prompt.txt)

## Security reviewer, cycle 2

model: claude-sonnet-5-5 (medium), Claude
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 6e2c197cbb7cee3653f02188a3007859dcda6d64118ebc69aae516b5566fddac
cross-file interactions: reviewed launch sites, including the two parse checks
canary: caught

[Report](audit-reports/security2.md) · [Prompt](audit-reports/security2.prompt.txt)

## Test coverage checker, cycle 2

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 0616d9273f4afabb1e28a3d04ee5b463b89f69045c342c34d37d98c3f693d7ac
cross-file interactions: reviewed the new tests against the launcher, catalogs and verifier
canary: caught

[Report](audit-reports/tests2.md) · [Prompt](audit-reports/tests2.prompt.txt)

## Findings

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| **Must-fix, open** | security 2 | The setup validator's Bun parse check, `bun build --no-bundle`, expands macros in project TypeScript. Project code runs and the check still passes | Open. In the coordinator's probe, adding `--no-macros` stopped it. The same command exists before this fix | Coordinator: the real validator ran a marker macro and reported "TypeScript entries" passing |
| **Must-fix, open** | security 2 | The workflow doctor's `Bun.Transpiler` parse also expands macros; `--no-macros` does not stop it | Open. The same parser call exists before this fix. A probe with the transpiler's `macro: false` option printed a macros error and ran no project code; not yet tested through the doctor | Coordinator: the parser call ran a marker macro under all four options. The doctor was not run end to end by the coordinator |
| Must-fix | security 1 | A project `tsconfig.json` or `jsconfig.json` wildcard path mapping replaced the trusted script | Fixed in cycle 1 with a shipped empty TypeScript config. The triage probe had missed the two wildcard keys | Coordinator before and after; four tests fail without the option |
| Should-fix | security 1 | `pre-ship-verify` started its own validator under Bun without the options | Fixed in cycle 1 | Test fails without it |
| Should-fix | tests 1 | The grader's Bun catalog had no test outside a Bun run, and nothing guarded a missing config | Fixed in cycle 1 | Each test fails against a planted change |
| Should-fix | tests 2 | The missing-config tests do not assert that the requested script ran | Open | Reading |
| Acknowledged | tests 2 | No test asserts directly that the two shipped configs are inert | Open; behavior tests fail if either gains a setting | Reviewer mutation |
| Acknowledged | security 2 | A missing script path under Bun falls back to a `package.json` script of that name | Backlog | Reviewer, bare name only; not rechecked |
| Acknowledged | cross-pitch | Pitch 06 must pin a release holding this fix; part B2 must regenerate the shipped list after it | Backlog | Pitch records |
| Refuted | tests 2 | The `-e` import-by-full-path test case cannot be redirected | Dropped | Coordinator: a full-path import was redirected without the override |
| Refuted | cross-pitch | Sync might not carry `ai-framework/templates/` | Dropped: it is in `SYNCED_DIRS` | `bundle-sync.mts` |
| Not a finding | code, security, tests, both cycles | The remaining must-fix and high reports | Each is that reviewer's planted canary | Canary check; real source |

## State of the change

- Closed for workflow-started Bun launches, in the cases probed: the project's `bunfig.toml` preload, `.env` loading and TypeScript path mappings.
- Still open: project code runs through macros in the two parse checks.
- The cycle 2 security review is the only independent review of the cycle 1 patch. It reported nothing else against the isolation options.
- The README sentences about preloads and path mappings are accurate but do not mention macros.

## Evidence

- Red before the cycle 1 patch: 5 of 14 launcher tests, one Orca run test, one verifier test, and the grader test file (missing export) failed.
- After the patch, the nine related test files passed on Node, and five of them on Bun (140 pass).
- With the new protection removed in scratch copies, the matching tests failed: TypeScript override, silent config fallback, grader catalog, verifier check.
- The real detector, with a hostile `tsconfig.json`, preload and `.env`, ran normally.
- `pre-ship-verify` on the code under cycle 2 review: exit 0; 2,548 tests, 2,545 pass, 3 skipped, 0 fail.
