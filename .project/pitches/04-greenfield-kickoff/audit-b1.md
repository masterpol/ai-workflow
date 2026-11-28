# Audit — greenfield-kickoff part B1

2026-11-27. Big-batch gate, one cycle. Orca Run `run_0dafbef3520c`. Codex wrote the code, so no reviewer is Codex. Reviewers were named by hand, each with an explicit model: Claude is outside the configured review pool and was used for security and the live test to include a second vendor.

Dispatched: code (1) | security (1) | test coverage (1) | cross-pitch (1) | live eval (1) | UX and i18n (no surface)

## Code reviewer

model: opencode-go/kimi-k2.7-code, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (one unrelated file differed; see below)
prompt-sha256: d26ce4f75c83cc840e0116d189273a74524b1836bbf6d9861af20e2f0f12972b
cross-file interactions: reviewed detector, tests, setup guide, setup skill and mirror
canary: caught

[Report](audit-b1-reports/code.md) · [Prompt](audit-b1-reports/code.prompt.txt)

## Security reviewer

model: claude-sonnet-5-5 (medium), Claude
independent: yes (listed the parent reports folder, saw prompt file names, opened none)
read-only: verified by scratch copy and repository guard (one unrelated file differed; see below)
prompt-sha256: f7fc0d5fae65f3cbe58b4a58fb1332884c6613bf1ce569345d1b625eda7c3154
cross-file interactions: reviewed the detector, its imports and the new setup command
canary: caught

[Report](audit-b1-reports/security.md) · [Prompt](audit-b1-reports/security.prompt.txt)

## Test coverage checker

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (one unrelated file differed; see below)
prompt-sha256: 03e11e10c0087d277e6a411a1064def513e8237d2f657eae39b149e3aa5b3bcf
cross-file interactions: reviewed fixtures against the detector and the shared guarded reader
canary: caught

[Report](audit-b1-reports/tests.md) · [Prompt](audit-b1-reports/tests.prompt.txt)

## Cross-pitch conflict checker

model: opencode-go/minimax-m3.1-flash, OpenCode
independent: no (no planted canary)
read-only: verified by scratch folder and repository guard (one unrelated file differed; see below)
prompt-sha256: 535025ccae86155055fc8b479fdb7730dcd8bce7788bb27eb02df2210d7c68a3
cross-file interactions: reviewed the diff against pitch records 05, 06 and 07

[Report](audit-b1-reports/cross.md) · [Prompt](audit-b1-reports/cross.prompt.txt)

## Eval runner

model: claude-sonnet-5-5 (medium), Claude
independent: no (no planted canary; listed file names in the parent reports folder, opened none)
read-only: verified by repository guard (clean) and byte comparison of the three test projects
prompt-sha256: a8275cea38f8ee7fc29b7f7c9e7fd97a740d0a7fb67ec80a6e6df9d2e11c9cde
cross-file interactions: not reviewed (live behavior run only)

[Report](audit-b1-reports/eval.md) · [Prompt](audit-b1-reports/eval.prompt.txt)

## Repository guard

The check after the four reviewers showed one new file, `critique-out/ws-appetite-auditor.md`. No audit prompt or report mentions it. Its content is an old critique of `workspace-slim` and `knowledge-distill` from Run `run_80b5ab62c6c7`, whose worker had sent the coordinator a message saying it recreated that file after a server restart. That worker as the author is the likely explanation, not proven. The file was left in place and is not committed. Nothing else differed. The guard after the eval run was clean.

## Findings

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| Should-fix | security | A renamed source path was shown unquoted in the setup command | Fixed: quoted, and a path with quote, backslash, dollar or backtick is treated as `unclear` | Reading; the live run used the quoted default path |
| Should-fix | tests | The root-only starter rule rested on one test case | Fixed: three more cases; four fail against an unanchored rule | Coordinator run |
| Should-fix | eval | "Continue with Step 1" could mean the guide's copy step or the skill's scan step | Fixed with one sentence, added after the live run | Reading; not run live |
| Should-fix | cross-pitch | On the folder route the copied entry files tell a later session to read a root `SETUP.md` that is not there | Deferred; present before B1, recorded in the spike | Source |
| Should-fix | cross-pitch | Merge order for the setup guide, setup doc and doctor | Recorded: B1 before pitch 07, both before pitch 06 pins a release and hand-merges the two routes | Pitch records |
| Should-fix | eval | The guide lists `.opencode/package.json`, which Git ignores, expects 18 agents where 16 ship, and gives no root fallback for an empty folder | Deferred; none introduced by B1 | Git and the guide before B1 |
| Acknowledged | cross-pitch | Shared status and backlog files; pitch 05 order relative to 06 | Noted for cooldown | Records |
| Acknowledged | tests | The 64 KiB marker limit would stop the skip if the guide grew past it; two tests copy the real guide and would fail | Kept | Guide is 26,968 bytes before the audit edit |
| Refuted | cross-pitch | `entry-import.mts` might not ship with the detector | Dropped: it is in the shipped list, and `ai-framework/scripts` is synced | Shipped list and `bundle-sync.mts` |
| Refuted | tests | The depth test cannot fail | Dropped: an effect of the planted canary, which disabled the skip | The reviewer's own corrected-limit run; coordinator condition removal |
| Not a finding | code, security, tests | The three high or must-fix reports | Each is that reviewer's planted canary; the real files do not hold them | Real source and suite |

No must-fix. The open security high from part A (Bun `bunfig.toml` preload) is unchanged by B1 and stays open under the owner's earlier override.

## Eval gate

One Claude run as an Orca worker, no baseline, so no regression delta is claimed. Three disposable projects holding a copy of all tracked files in `ai-workflow-portable/`: the check ran from the source folder before any write and reported `empty`, `unclear` (starter files) and `existing`; the worker stopped at the copy approval or the new-or-existing question; the projects are byte-identical afterwards. This is a partial observation of golden case `check-before-copy`, which stays not-run because it is owner-run in a host. The "Step 1" sentence was added afterwards. Copy-to-root and other vendors were not run.

## Evidence

- `pre-ship-verify.mts` on the final tree: exit 0; 2,537 tests, 2,534 pass, 3 skipped, 0 fail.
- Its first run after the audit fixes failed one test, `setup-validator`'s linear-time check (15.2 s against a 10 s limit; also with that file run alone). Cause: `opencode debug config`, run by the workflow doctor, hung until its 15 s limit while an OpenCode background service from this audit's reviewer launches held the port. After `opencode-service.mts free`, the test took 0.4 s and all 42 passed. No code changed between the two verifier runs.
- `project-state.test.mts`: 63 pass on Node and Bun.
- The three added test cases and the guide's quoting and "Step 1" sentences have no second review.

## Cycle 2 (requested by the owner)

The owner ran `/audit` again after the cycle 1 gate. It was treated as a narrow second review of the edits made during cycle 1, in the same Run. Each reviewer had its own parent folder. Code and cross-pitch were not repeated: their findings led to no edit.

## Security reviewer, cycle 2

model: claude-sonnet-5-5 (medium), Claude
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: dd67e038465bc9ada9e93f8a3ea9fa7b6938efb7779dc0e9db10b69c6fab1576
cross-file interactions: reviewed the detector, the quoting instructions and the setup skill mirror
canary: caught

[Report](audit-b1-reports/security2.md) · [Prompt](audit-b1-reports/security2.prompt.txt)

## Test coverage checker, cycle 2

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: a43ecbe387ccafb8e391570b4d31b08085b3c6e4c1f5a4d444caf5cb2c330d96
cross-file interactions: reviewed the new test cases against the detector and the instructions
canary: caught

[Report](audit-b1-reports/tests2.md) · [Prompt](audit-b1-reports/tests2.prompt.txt)

## Eval runner, cycle 2

model: claude-sonnet-5-5 (medium), Claude
independent: no (no planted canary; listed the eval parent folder and saw a prompt file name, opened none)
read-only: verified by repository guard (clean) and byte comparison of the three test projects
prompt-sha256: 67f844385e27dc3614801794c56c6cdf6a9b485295a182fcdccaa28eb4eb158d
cross-file interactions: not reviewed (live behavior run only)

[Report](audit-b1-reports/eval2.md) · [Prompt](audit-b1-reports/eval2.prompt.txt)

| Tier | Source | Cycle 2 finding | Disposition | Verified |
|---|---|---|---|---|
| Not a finding | security, tests | The depth must-fix and the `.rst` high | Each is that reviewer's planted canary | Real source and suite |
| Refuted | tests | Copy-to-root reports `empty`, so the documents are wrong | Dropped: the reviewer copied only the Step 1 list. Copying the whole bundle, as the route says, reports `unclear` | Coordinator run on all tracked files |
| Refuted | tests | Refusing paths with `$` or a backtick is over-broad | Dropped: a shell expands both inside double quotes. The reviewer's probe passed the path without a shell | Coordinator shell probe |
| Should-fix | tests | No test covers the 64 KiB limit on the source-folder marker | Deferred: the reviewer's probe showed an oversized file fails closed, and a fix would add unreviewed edits | Reviewer probe |
| Acknowledged | security | Quoting under PowerShell (typographic quotes) and `cmd.exe` (`%`) is untested; the refusal does not say it also covers later commands; a leading-dash path made the command fail | Backlog | Reviewer statements; dash probe by the reviewer |

Cycle 2 confirmed the three added test cases fail against an unanchored rule and found no new defect in the real files. No file under review changed, so no third cycle ran.

Eval: a second Claude run on the final guide, three fresh projects: the check ran from the source folder before any write and reported `empty`, `unclear` (starter files) and `existing`; it asked or stopped for approval; the projects are byte-identical. It read the new "Step 1" sentence as intended. Still a partial observation with no baseline; `check-before-copy` stays not-run.
