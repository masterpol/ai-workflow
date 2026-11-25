# Audit cycle 1: test coverage

**Model:** Codex, based on GPT-6; the exact deployed model identifier is not exposed to this worker. **Checklist walked:** Yes, `ai-framework/rules/testing.md`, including guard mutation proof, utility and hook tests, preservation bounds, shared callers, and edge cases. UI, accessibility, and authorization cases are not applicable to this command rename. **Cross-file interactions reviewed:** Yes: shared mapping → Claude/Codex startup hooks and metrics → stored flow/report phases; phase → renamed skill adapters and loading contracts; bundle-sync retirement → customization protection; renamed README → consolidation hash migration.

**Disposition:** One verified must-fix. Verification is partial: bounded test runs timed out; those results remain unverified rather than being counted as failures or passes. Read-only repository review; only this report was created. All copies, probes, logs, fixtures, and mutations were confined to `/private/tmp/rsc-audit-test-coverage-checker/`, with `TMPDIR` set there. No workflow phase or worker was launched.

## Findings

| ID | Severity (must-fix/should-fix/nit) | file:line | defect | failure scenario with the command you ran and its output | verified (yes/no) |
|---|---|---|---|---|---|
| TC-01 | must-fix | ai-framework/scripts/command-name-guard.test.mts:20 | S4 promises recursive coverage of `.claude/`, `.agents/`, and `.opencode/`, but the guard scans selected children only. Old command guidance in other bundle-owned files under those roots can return undetected. Scan the promised roots with explicit exclusions and test each root. | Ran `python3 /private/tmp/rsc-audit-test-coverage-checker/guard.py`; it planted each of `/ship`, `$ship`, `skills/ship/`, and `commands/ship.md` in `<root>/rsc-guard-probe.md`, then ran `node --test ai-framework/scripts/command-name-guard.test.mts`. All 12 mutants at the three omitted root levels returned exit 0; the same forms in configured scanned roots returned exit 1. | yes |

## Scope-to-evidence map

The deviations log amends S3: plain `--apply` also retires an unmodified adapter; other removals continue to require `--prune`. The checks below use that approved behavior.

| Criterion | Named test or check | Result |
|---|---|---|
| S1: both runners on mapping and three hooks | `phase-commands.test.mts`, `orca-start-hook.test.mts`, `orca-start-codex-hook.test.mts`, `token-consumption.test.mts` | Mapping and metrics pass both; Claude passes Bun; Codex passes all 19 cases in Bun split runs. Full startup-hook Node runs timed out: unverified. Changed ship-specific Node cases pass and catch mutants. |
| S1: new invocation forms map to ship, old forms do nothing | `ship-pitch maps to the stored ship phase and ship is not a command`; `ship-pitch Skill and slash command reach the start decision with phase ship`; `ship-pitch slash and dollar prompts reach the start decision with phase ship`; `ship-pitch invocation forms record metrics phase ship while ship has no phase` | Verified by passing tests and semantic mutants. |
| S1: other commands unchanged | `every other workflow command keeps its phase and skill directory`; startup hooks’ `every phase` tests | Mapping passes both; every-phase startup coverage passes Bun; complete Node startup suite unverified. |
| S1: historical and new events share report phase | `report joins a stored ship event and a new ship-pitch event in phase ship` | Passes both; changing FLOW_PHASES to map keys is caught. |
| S1: no private phase command lists | Read three hooks; exact old-list substring check | All three return false; each imports the shared mapping. |
| S1: wrong mapping mutant fails | `ship-pitch maps to the stored ship phase and ship is not a command` | Exit 1, actual ship-pitch versus expected ship. |
| S2: all four old adapters absent | Filesystem existence checks for three skill directories and OpenCode ship.md | All absent. |
| S2: Cursor byte mirror, frontmatter, preserved phase | Byte comparison plus reading new canonical adapter | Byte-identical; `name: ship-pitch`; still `--phase ship`. Codex/OpenCode pointers target new canonical path. |
| S2: loading/contracts/defaults/graphify suites both runners | `instruction-loading`, `workflow-contracts`, `skill-defaults`, `graphify`, `graphify-relations`, `graphify-refs` tests | All except complete skill-defaults pass both; loading has one intentional live-evidence skip. Skill-defaults complete runs time out: unverified; Bun light partition passes 25 tests. |
| S2: relation check and four Git renames | `node ai-framework/scripts/graphify-relations.mts --check`; `git diff HEAD --find-renames --summary`; untracked adapter listing | Relations: 50 entries, 0 problems. Git shows deletions plus untracked replacements; final committed rename detection is unverified before staging/commit. |
| S3: suite and next-step presence/absence | `a target without the old ship skill gets no ship-command-rename step`; `the old ship skill is named in next steps and --apply --prune removes only the unmodified copy` | Both changed cases pass Bun and Node; assertions cover paths, built-in shadowing, new name, and removal/customization guidance. Whole bundle-sync suite timed out: unverified. |
| S3: customized file preserved, ordinary removals retained | `--apply without --prune removes the unmodified old ship files, keeps a customized one, and leaves other retired files alone`; preceding prune test | Changed tests pass both runners. Removing customization protection is caught. |
| S4: every old form in every promised root | Real planted-file probes, `guard.py`; built-in `the guard refuses each old form and leaves the phase name alone` | Broken at three root levels (TC-01); all actually configured scanned roots catch all four forms, including Cursor and Codex. |
| S4: reintroduced old adapters rejected | Real adapter probes followed by `node --test ai-framework/scripts/command-name-guard.test.mts` | All four return exit 1, including empty old skill directories. |
| S4: phase-name artifacts preserved | Inspected source diff and deleted adapters alongside new untracked copies; old-list and mapping tests | No observed stored phase rename; preserved phase paths appear in replacements. Raw deleted-line grep also flags intentional moved skill content, so its output alone is not a defect. |
| S4: links, no history sweep | `node ai-framework/scripts/docs-links.mts ai-framework/docs ai-framework/integrations .claude/skills`; `git status --short`, diff scope review | 48 files, 0 broken links. No existing pitch/run/record history observed changed by sweep; new pitch and release entry are present. |
| C1: doctor, validator, module syntax list | `node ai-framework/scripts/workflow-doctor.mts`; `node ai-framework/scripts/setup-validator.mts`; source list inspection | READY (778 checks); READY (25 checks, 162 TypeScript entries parse). Mapping module and both new tests are in doctor list. |
| C1: graph/changelog/version | `node ai-framework/scripts/graphify.mts --check`; `node ai-framework/scripts/changelog.mts --check` | CLEAN; exit 0 with VERSION 2.56.0 and matching entry. |
| C1: full suite on independent clone | No complete all-repository suite run under this worker’s per-command bound | Unverified. Tested a secret-filtered independent filesystem copy, without Git metadata; do not treat it as an independent Git clone. |
| C1: fresh live invocation | Explicitly known unverified in task; not attempted | Unverified; not a new finding. |
| C1: version chosen when changelog written | `changelog --check`, deviations log | 2.56.0 agrees across VERSION, entry and log. |

## Source mutation ledger

Each mutation changed only the scratch copy, ran the named sibling test under Node, and restored the original bytes. No syntax-error-only mutants were used. Detailed commands and captured assertion output are in `<source-basename>-mutants.json` and matching logs under the scratch directory.

| Source | Mutant | Test/check | Result |
|---|---|---|---|
| ai-framework/scripts/bundle-sync.mts | require prune for retired adapters | `bundle-sync.test.mts`; pattern `^--apply without --prune` | caught; exit 1 |
| ai-framework/scripts/bundle-sync.mts | delete modified adapters | `bundle-sync.test.mts`; pattern `^--apply without --prune` | caught; exit 1 |
| ai-framework/scripts/bundle-sync.mts | omit rename next step | `bundle-sync.test.mts`; pattern `^the old ship skill` | caught; exit 1 |
| ai-framework/scripts/consolidation-migrate.mts | remove pre-rename hash | `consolidation-migrate.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/scripts/consolidation-migrate.mts | remove original hash | `consolidation-migrate.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/scripts/consolidation-migrate.mts | accept customized template | `consolidation-migrate.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-codex-hook.mts | pass command as phase | `orca-start-codex-hook.test.mts`; pattern `ship-pitch slash` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-codex-hook.mts | drop new command | `orca-start-codex-hook.test.mts`; pattern `ship-pitch slash` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-codex-hook.mts | restore old command | `orca-start-codex-hook.test.mts`; pattern `ship-pitch slash` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-hook.mts | pass command as phase | `orca-start-hook.test.mts`; pattern `ship-pitch Skill` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-hook.mts | drop new command | `orca-start-hook.test.mts`; pattern `ship-pitch Skill` | caught; exit 1 |
| ai-framework/hooks/scripts/orca-start-hook.mts | restore old command | `orca-start-hook.test.mts`; pattern `ship-pitch Skill` | caught; exit 1 |
| ai-framework/scripts/phase-commands.mts | wrong stored phase | `phase-commands.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/scripts/phase-commands.mts | restore old alias | `phase-commands.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/scripts/phase-commands.mts | wrong skill directory | `phase-commands.test.mts`; pattern `(whole sibling file)` | caught; exit 1 |
| ai-framework/hooks/scripts/token-consumption.mts | wrong new phase | `token-consumption.test.mts`; pattern `ship-pitch|stored ship` | caught; exit 1 |
| ai-framework/hooks/scripts/token-consumption.mts | restore old command | `token-consumption.test.mts`; pattern `ship-pitch|stored ship` | caught; exit 1 |
| ai-framework/hooks/scripts/token-consumption.mts | drop stored ship from flow phases | `token-consumption.test.mts`; pattern `ship-pitch|stored ship` | caught; exit 1 |

All 18 required semantic mutants were caught. In particular, the bundle-sync deletion mutant produced ENOENT while reading the customized OpenCode adapter; the migration hash mutants failed the known-template assertions; and the stored-phase mutant split the metrics phase into `(other)`.

## Guard probe matrix

`python3 /private/tmp/rsc-audit-test-coverage-checker/guard.py` ran the real test file once per planted file/form; it did not replace the guard with a duplicate implementation.

| Probe location | /ship | $ship | skills/ship/ | commands/ship.md |
|---|---|---|---|---|
| ai-framework | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .claude | survived (exit 0) | survived (exit 0) | survived (exit 0) | survived (exit 0) |
| .claude/skills | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .claude/agents | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .cursor | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .codex | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .agents | survived (exit 0) | survived (exit 0) | survived (exit 0) | survived (exit 0) |
| .agents/skills | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .opencode | survived (exit 0) | survived (exit 0) | survived (exit 0) | survived (exit 0) |
| .opencode/commands | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .opencode/agents | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |
| .opencode/plugins | caught (exit 1) | caught (exit 1) | caught (exit 1) | caught (exit 1) |

The guard also deliberately ignores every `.test.mts` file, not just itself and the bundle-sync test: planted comments in `ai-framework/rsc-probe.test.mts` and `.codex/rsc-probe.test.mts` returned exit 0. This is an additional coverage boundary; fixture-heavy existing tests explain the need for exceptions, but the scope text should describe the actual exception. The guard is demonstrably capable of failing in its scanned non-test roots; no claim that the entire guard is vacuous is made.

## Attempts that did not complete

Full-file Node/Bun baseline runs used a 17-second subprocess ceiling and Bun `--timeout 15000`; startup-hook Node, Codex full-file, skill-defaults, and bundle-sync runs exceeded that ceiling. Splitting Codex recovered all Bun cases, and restricting bundle-sync to all three changed cases passed both runtimes. The first combined bundle-sync mutation probes hit a five-second limit; rerunning one relevant test per mutant caught all three within six seconds each. Split Node hook/default tests still exceeded the bound; they are unverified, not product failures. The complete bundle-sync suite, complete skill-defaults suite, full repository suite, and independent Git-clone release proof remain unverified. No runtime assertion failure occurred on an unmutated test run that completed.

The original invocation of `git diff HEAD` was reviewed by relevant source/test scopes and summary, plus the untracked mapping, guard, tests and replacement adapters; the generated graph was validated with its check command rather than reproduced in the report. Secret files were excluded before copying and were not opened.
