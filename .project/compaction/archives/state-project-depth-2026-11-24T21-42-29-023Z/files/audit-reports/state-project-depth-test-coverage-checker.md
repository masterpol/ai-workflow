# Test coverage review: state-project-depth, audit cycle 1

Read-only review against `pitch.md`, scopes A1/A2/B1 of `plan.md`, `.claude/agents/test-coverage-checker.md`, and `ai-framework/rules/testing.md`. Reviewed the requested source, sibling tests, doctor change and documentation; `bundle-sync.mts` was compared with main. No production defect is claimed by a surviving mutant: the findings below identify regression coverage gaps.

**Findings: 0 must-fix, 3 should-fix, 1 acknowledged.**

| severity | file:line | rule or check violated | concrete failure scenario with the command you ran and its output | suggested fix |
|---|---|---|---|---|
| should-fix | ai-framework/scripts/bundle-sync.mts:344 | testing.md: every security guard must have a test that fails when removed | In the scratch copy, `python3 mutate.py bundle-sync` changed the final target rehash condition to `if (false)`. `bun test ai-framework/scripts/bundle-sync.test.mts --test-name-pattern 'report reset\|Archify pin\|apply changes no other'` still returned exit 0, **26 pass, 0 fail**. `bun rehash-probe.mts` injects an edit after preflight hashes, before unlink: baseline reports `report-changed` and `late edit survived: true`; the mutant removes the edited file and prints `late edit survived: false`. This guard is necessary, not redundant. | Add a test that injects a same-path target edit after preflight and before removal; assert the edited target survives, a fixed `report-changed` reason is returned, and remaining files survive. Prove the test fails with this mutant. |
| should-fix | ai-framework/scripts/facts-project.mts:89 | testing.md: every discovery bound needs a failing mutant test | `python3 mutate.py facts-project` removed only the composite-primary-key processing ceiling. `bun test ai-framework/scripts/facts-project.test.mts` returned exit 0, **21 pass, 0 fail**. `bun pk-budget-probe.mts` supplies 3,000 empty composite-primary-key entries: baseline prints `{"status":"stale","note":"discovery budget reached; counts are at least the reported totals"}`; the mutant prints `{"status":"observed"}`. Existing 3,000-field coverage does not exercise constraint discovery. | Add a fixture exceeding the constraint-processing budget independently of columns, assert bounded work plus stale/lower-bound wording, and prove it rejects the mutant. Cover the analogous unique-constraint ceiling too. |
| should-fix | ai-framework/scripts/facts-gather.test.mts:464 | pitch S1 requires deliver → edit → sync → re-run preservation | `sed -n '464,482p' ai-framework/scripts/facts-gather.test.mts` shows the named end-to-end test fabricates a receipt, edits the draft and calls facts-gather again, but never calls bundle-sync. `bun test ai-framework/scripts/facts-gather.test.mts` passes **29 tests**; separate reset tests pass, but no test composes reset receipt retention with subsequent regeneration. | Extend one integration case to execute sync against the delivered, edited fixture before re-running facts-gather; assert edited bytes survive both actions and the refusal names the draft. |
| acknowledged | ai-framework/scripts/workflow-doctor.mts:1047 | new doctor list entries have no regression assertion | `python3 mutate.py workflow-doctor` separately removed the new production entry, the new test entry, and both entries. Every mutant returned exit 0 from `bun test ai-framework/scripts/workflow-doctor.test.mts`: **81 pass, 0 fail**. The added files could silently fall out of the explicit syntax-check list. | Extend the existing doctor syntax-list test to exercise both new paths (missing and invalid/present), asserting named check records. |

## Verification and reproduction

Scratch root: `/private/tmp/state-coverage-o0w9s9xk`. All mutations, probes, copied fixtures and logs are there; no source file in the checkout was edited. Run commands below from that scratch root. `mutate.py` contains each literal replacement, saves logs and restores the copied source after each mutation. Source copies were made before the mutation runs. No secret files were opened or copied.

Baseline results:

| command | result |
|---|---|
| `bun test ai-framework/scripts/facts-project.test.mts` | exit 0; 21 pass |
| `bun test ai-framework/scripts/facts-gather.test.mts` | exit 0; 29 pass, including all three real Archify validate cases |
| `bun test ai-framework/scripts/bundle-sync.test.mts --test-name-pattern 'report reset\|Archify pin\|apply changes no other'` | exit 0; 26 pass, 24 filtered |
| `bun test ai-framework/scripts/bundle-sync.test.mts --test-name-pattern '^consolidation\|^dry run\|^changed\|^bundle docs\|^prune \|^archify-replaces\|^preserves\|^two target\|^registry-owned\|^flagged\|^SETUP'` | exit 0; 12 pass, 38 filtered; 14.92 s |
| `bun test ai-framework/scripts/bundle-sync.test.mts --test-name-pattern '^a newly\|^an unsupported\|^global\|^instance\|^ai-workflow\|^simulated\|^mutation check\|^report settings\|^keeps unverified\|^first sync\|^a skill installed\|^the sync names'` | exit 0; 12 pass, 38 filtered; 14.49 s |
| `bun test ai-framework/scripts/workflow-doctor.test.mts` | exit 0; 81 pass |

The three bundle-sync groups cover all 50 test names without overlap. A single invocation exceeded the 18-second command budget, so the same suite was partitioned. Initial incomplete-copy failures (missing integration JSON and `.claude/settings.json`) were fixture setup errors; after copying those non-secret dependencies, all listed baselines passed. They are not repository findings.

Twelve mutants attempted, three per changed production source file (including doctor): **7 killed, 5 survived**. Markdown playbooks/contracts and test sources are not production mutation targets.

| source | mutant (command: `python3 mutate.py <source-stem>`) | result / detecting named test |
|---|---|---|
| facts-project.mts | select oldest snapshot instead of newest | killed; `Drizzle reads only the newest snapshot and journal, including columns, keys and relationships`; 20 pass, 1 fail |
| facts-project.mts | remove directories-visited bound | killed; `structure budgets mark lower bounds; display cap does not cap discovery`; 20 pass, 1 fail |
| facts-project.mts | remove composite-primary-key bound | survived; 21 pass (finding above) |
| facts-gather.mts | disable existing-file receipt ownership refusal | killed; `writeReport writes when absent and replaces only a file the delivery receipt vouches for` and `end to end: deliver, edit the draft, re-run, and the edit survives`; 27 pass, 2 fail |
| facts-gather.mts | raise ERD cap from 30 to 300 | killed; `the ERD keeps the 30 most-connected entities, says at least, and counts degree through a Map`; 28 pass, 1 fail |
| facts-gather.mts | make auto depth always simple | killed; `--depth auto is project with a bundle-sync marker and simple without one; the flag validates`; 28 pass, 1 fail |
| bundle-sync.mts | delete edited targets as if hash matched | killed; both `report reset preserves edited <file> and the receipt` cases; 24 pass, 2 fail |
| bundle-sync.mts | raise receipt read limit from 64 KiB to 256 KiB | killed; `report reset refuses oversize receipt with fixed text and no deletion`; 25 pass, 1 fail |
| bundle-sync.mts | disable final target rehash | survived; 26 pass (finding above) |
| workflow-doctor.mts | drop new production syntax entry | survived; 81 pass |
| workflow-doctor.mts | drop new test syntax entry | survived; 81 pass |
| workflow-doctor.mts | drop both new syntax entries | survived; 81 pass |

## Exit-criterion map

Named tests below are in the corresponding co-located `<source>.test.mts`. Each plan exit is mapped, including exits that are historical/manual evidence rather than tests.

| scope / criterion | named test or check | assessment |
|---|---|---|
| A1 test command exits 0 | facts-project baseline above | passed, 21 tests |
| A1 newest Drizzle snapshot; tables/columns/PK/nullability/unique/FK | `Drizzle reads only the newest snapshot and journal, including columns, keys and relationships` | passed; newest-selection mutant killed |
| A1 LAH-shaped stale journal (12 vs snapshot 0002) | `LAH journal with twelve entries and snapshot 0002 is stale with both counts` | passed |
| A1 no/invalid/oversize snapshot | `no snapshot (including Prisma-only trees) is unconfigured and names checked paths`; `invalid and oversized snapshots fail with fixed reasons` | passed |
| A1 structure depth 2 and fixed skip list | `structure stops at depth two, skips generated and dot directories, counts prototype keys` | passed |
| A1 refuse linked directories | `structure refuses linked directories, files, roots and ancestors` | passed |
| A1 entries/visited/node budgets yield stale and at least | `structure budgets mark lower bounds; display cap does not cap discovery`; `5000 directory entries stop processing at the entry budget with only lstat and readdir` | passed; visited-bound mutant killed |
| A1 constructor/toString/__proto__ counting with Map | `structure stops at depth two, skips generated and dot directories, counts prototype keys`; `directory names cannot collide with aggregate counter keys; dot files are counted`; `schema names remain raw and bounded, including prototype keys and hostile labels` | passed |
| A1 stack counts, script names/no bodies, fixed frameworks | `stack reads dependency counts, fixed frameworks and script names, never bodies` | passed |
| A1 manager for all four lockfiles | four generated `manager comes from <lock>` tests | passed |
| A1 absent package, Python/Go/Rust language only | `no package is unconfigured; non-JS manifests report only the language without reading bodies` | passed |
| A1 5,000 entries / 3,000 fields and no process/network/DB | `5000 directory entries stop processing at the entry budget with only lstat and readdir`; `schema entity, field and relationship budgets are independent of the 30-entity rendering cap`; `all readers avoid process, network and database APIs` | passed; independent composite-key guard remains uncovered, finding above |
| A1 only its two files in git status | no test: scope-local historical ownership check | cannot reconstruct at integration; current checkout contains all scopes |
| A1 forbidden API/import grep | `grep -nE 'require\(\|import\(\|child\|spawn\|exec' ai-framework/scripts/facts-project.mts` | no output; grep exit 1 means no matches, as required |
| A2 test command exits 0 | facts-gather baseline above | passed, 29 tests |
| A2 auto depth, explicit simple golden bytes | `--depth auto is project with a bundle-sync marker and simple without one; the flag validates`; `--depth simple output is byte-identical to the golden draft captured before the change` | passed; auto mutant killed |
| A2 exactly one ERD/tree and no more than four diagrams | `project depth adds exactly one erd and one tree diagram, a stack block, and stays within four diagrams` | passed |
| A2 generated valid unique IDs, collision/hostile/secret labels, correct relations | `hostile names give generated, valid, unique ids and inert redacted labels; relations still resolve` | passed |
| A2 30 most-connected cap, lower-bound note, Map degree | `the ERD keeps the 30 most-connected entities, says at least, and counts degree through a Map` | passed; cap mutant killed |
| A2 absent/owned/unowned draft, valid bounded non-link receipt | `writeReport writes when absent and replaces only a file the delivery receipt vouches for`; existing symlink destination/path tests | passed; ownership mutant killed |
| A2 fake deliver/edit/rerun edit preservation | `end to end: deliver, edit the draft, re-run, and the edit survives` | passes plan wording; pitch additionally requires sync in the sequence, finding above |
| A2 real hostile draft Archify validate errors:0 | `the project-depth draft with hostile names passes archify validate with no errors (skipped when Archify is not installed)` (test title includes backticks around command) | ran, passed; installed Archify package copied to scratch, no skip |
| A2 live LAH copy validate/deliver, 9-table stale ERD and tree | no automated LAH test; hill.md records successful live evidence | recorded evidence only; not independently rerun |
| B1 test command exits 0 | bundle-sync partitioned suite above | all 50 pass; single invocation time-limited |
| B1 matching receipt-owned files removed and reports guidance | `report reset removes only matching receipt-owned files and names re-run /state`; `apply changes no other project records beyond the marker and verified delivery` | passed |
| B1 edited HTML/draft kept and named, receipt retained | two `report reset preserves edited <file> and the receipt` cases | passed; ownership mutant killed |
| B1 linked reports/receipt/target, oversize/invalid receipt refuse all | five generated `report reset refuses a symlinked <entry> before removing anything`; four `report reset refuses <label> receipt with fixed text and no deletion` | passed; receipt-bound mutant killed |
| B1 device/inode/ancestor changes refuse removal | four `report reset rechecks directory identity after hash checks (<replacement>)`; `report reset checks directory identity again before the second removal` | passed; final content-rehash guard lacks a test, finding above |
| B1 dry-run byte preservation and would-remove list | `report reset dry run lists removals without changing any byte` | passed |
| B1 all other .project files unchanged except marker | `apply changes no other project records beyond the marker and verified delivery` | passed |
| B1 legacy pages listed, never removed | `report reset lists all pre-2.51 pages and never removes them` | passed |
| B1 bounded anchored pin row; differing revision prints command; equal/absent silent | `Archify pin guidance comes only from one bounded anchored source row`; `NEXT STEPS prints the source Archify pin command only for an installed differing revision` | passed |
| B1 header documents receipt exception | `git diff main -- ai-framework/scripts/bundle-sync.mts` | header explicitly documents the receipt-verified reports exception; manual check, no named test |
| B1 only its two files in git status | no test: scope-local historical ownership check | cannot reconstruct at integration; current checkout contains all scopes |

## Checked, nothing found

- All 181 tests in the four reviewed sibling suites passed on complete scratch fixtures (bundle-sync split into three groups).
- Real Archify validation ran for simple, hostile project-depth, and 30-entity drafts; none skipped.
- New exported `createProjectFacts`, gather/depth/render/write surfaces, and `makeSync` report-reset/pin helpers have named behavioral assertions.
- Existing invalid input, fixed-reason errors, symlink refusal, foreign-key resolution, secret redaction and simple golden-output checks are present and passing.
- Requested source/docs agree on receipt hash fields, automatic depth and the receipt-verified reset exception. Markdown contracts are not required to have unit tests.
- No new auth/access surface applies. The known every-apply reset issue, whole-directory listing residual and deferred schema formats were excluded as requested.

## Unverified

- The whole repository test suite and C1 release/graph/setup/doctor READY checks were outside this bounded review. Four focused suites passed; this does not establish a green repository-wide suite.
- A single unfiltered bundle-sync invocation did not finish within the 18-second budget; all 50 cases passed through partitions instead.
- Historical A1/B1 scope-only git-status exits cannot be replayed after scopes merged into the shared checkout. No assertion that the initial checkout was clean is made.
- Live LAH validate/deliver was not repeated. `.project/pitches/state-project-depth/hill.md:11` records the coordinator's successful copy-based run; I independently ran installed Archify against hostile and capped synthetic fixtures only.
- A full deliver → edit → sync → regenerate integration test is absent; separate regeneration/reset tests do not prove this composition.
- Mutants sampled three guards per production file; remaining guards were reviewed through tests, not exhaustively mutated. No numerical line/branch coverage was collected.
