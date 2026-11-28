# Audit — greenfield-kickoff part A

2026-11-27. Big-batch gate, three cycles (the cap). Orca Run `run_69f5d8ac4323`, workers run one at a time, every dispatch with an explicit model.

Dispatched: code (2) | security (3) | test coverage (1) | cross-pitch (1) | live eval (1) | UX and i18n (no surface)

## Code reviewer, cycle 1

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 05bcd2dbd765b9de0115f06022007870c4a9745c91b7cea0a1cc0b9e933635fc
cross-file interactions: reviewed detector, tests, setup skill, mirror, SETUP.md and the setup doc together
canary: caught

[Report](audit-reports/code.md) · [Prompt](audit-reports/code.prompt.txt)

## Security reviewer, cycle 1

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: f18af0aa5913ee1cdc705015938d4525c7f913a9fab1ae74374d0e24658f41b9
cross-file interactions: reviewed the detector, its runner bootstrap and the setup instructions that consume its output
canary: caught

[Report](audit-reports/security.md) · [Prompt](audit-reports/security.prompt.txt)

## Test coverage checker

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 76b891e18a9fbf8ea5af5a8016f05431182a8c9d24e2a5117941f83962887ab6
cross-file interactions: reviewed fixtures against the detector and the shipped list
canary: caught

[Report](audit-reports/tests.md) · [Prompt](audit-reports/tests.prompt.txt)

## Cross-pitch conflict checker

model: opencode-go/minimax-m3.1-flash, OpenCode
independent: no (no planted canary)
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 0460104ce7ae97f0d473060bce250c9fe1e75bcc0f96f1fc598182cd6a640f2d
cross-file interactions: reviewed the diff against the active pitch records

[Report](audit-reports/cross.md) · [Prompt](audit-reports/cross.prompt.txt)

## Eval runner

model: claude-sonnet-5-5 (medium), Claude
independent: no (no planted canary)
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: b845ea3af42d4e4d37c4de1650d3815c695e20dd67501004a0ea817387aee0b9
cross-file interactions: not reviewed (live behavior tasks only)

[Report](audit-reports/eval.md) · [Prompt](audit-reports/eval.prompt.txt)

## Code reviewer, cycle 2

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: e6724dc9edfd8f457f840cb89ea9b4a190f4f5b4e62b3b86882529783f4261f9
cross-file interactions: reviewed the changed functions and both installer branches
canary: caught

[Report](audit-reports/code2.md) · [Prompt](audit-reports/code2.prompt.txt)

## Security reviewer, cycle 2

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 333e4c2a5bb7e64fb544124b91083de7b2ec17a618cbd4c55bd1bf21c2aaf0e8
cross-file interactions: reviewed the access refusal and the status-note instructions
canary: caught

[Report](audit-reports/security2.md) · [Prompt](audit-reports/security2.prompt.txt)

## Security reviewer, cycle 3 first attempt

model: gpt-6.2-sol (medium), Codex
independent: no (dispatched after the bench refused its planted defect; coordinator error)
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 5c173e33a29d896c005741886141d9e0ee2a252bec104f4aa9bcfa3f12875d00
cross-file interactions: reviewed the access check and the installer handoff

[Report](audit-reports/security3.md) · [Prompt](audit-reports/security3.prompt.txt)

## Security reviewer, cycle 3

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 942b65578c69b4b7e3984681ebd13d61b671e868e81931e391ca0e6278f86ffe
cross-file interactions: reviewed the detector, runtime adapter and both installer branches
canary: caught

[Report](audit-reports/security4.md) · [Prompt](audit-reports/security4.prompt.txt)

## Findings

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| Must-fix, **open** | security 1 | With Bun as the runner or invoked directly, a script run from a project folder first runs that project's `bunfig.toml` preload. The detector is one of 34 scripts that start this way; Node, the default, is not affected | **Open: owner decision at this gate.** Predates this pitch and sits in the shared startup. A direct `bun` invocation cannot be protected by the startup code | Reproduced: a preload in a scratch project ran before an unrelated script. The environment-file half is unverified |
| Must-fix | code 1 | On the Claude route setup ran the check twice, the second time after setup wrote files | Fixed in the instructions: once per setup, later step reuses the result and answer | Confirmed by reading; no live run of the fixed text |
| Should-fix | code 1, security 1, code 2 | Unreadable files were judged by name; permission bits alone were not enough | Fixed with a read-access check. The runtime adapter lacked `R_OK`, so the first version only tested existence; the two older tests caught it. `R_OK` added to the adapter | Tests red then green |
| Should-fix | code 1 | The 32-path evidence cap could hide the paths that caused `unclear` | Fixed: those come first | Test red then green |
| Should-fix | code 1 | `angular.json` or a `.vcxproj` alone reported `unclear` | Fixed | Tests red then green |
| Should-fix | security 1, 2; code 2 | Choice note: no link refusal, linked `.project`, a file name could close a fenced block, indented block needed a blank line, other installers lacked the handoff | Fixed in the instructions | Source; renderer probe by the reviewer; not exercised live |
| Should-fix | security 1, code 1 | A whole directory listing is read before the entry budget applies | Deferred: the runtime has no incremental listing | Reviewer probe |
| Should-fix | security 1 | Paths can be swapped for links between check and use | Deferred with the shared reader's same concern | Static; no race run |
| Should-fix | security 3 | `SETUP.md` Step 3 copies the scaffold without checking for a linked `.project` | Deferred: instructions this pitch did not change | Static |
| Should-fix | tests | Reason strings are mostly unasserted; the shipped-list and fixture checks share a source; the Git comparison is the only independent one | Deferred | 103 mutants, 47 survivors, none changing the state on its own (reviewer figures, not re-run) |
| Should-fix | cross-pitch | Installed skills add paths the shipped list lacks, so such a project is `unclear` (pitch 07 owns that surface); the list is generated from the working folder | Deferred; `unclear` is the safe result | Source |
| Acknowledged | security 1 | The installed copy's own shipped list and scaffold decide exclusions | By design: the installed bundle is the authority for itself | Source |
| Acknowledged | code 1 | The detector exceeds the utility and function size guidance | Accepted as one scanning unit; recorded in deviations | Diff |
| Acknowledged | cross-pitch | Merge order: this ships before pitch 07 edits the doctor and `SETUP.md`, and before pitch 06 pins a release | Order recorded | Pitch records |
| Refuted | tests | "The scaffold comparison has no test that can fail" | Dropped: removing the match fails 28 tests | Coordinator mutant |
| Refuted in part | tests | "The secret-name exclusion is dead code" | Kept: without it `.env.yaml` would count as a project file; test added | Source and new test |

Planted defects were caught by all six reviews that had one (budget doubled, control characters kept, refusals ignored, refusal order merged, platform condition inverted, existence check instead of read check).

## Eval gate

Live, one Claude run, no baseline, so no regression delta is claimed.

- **Re-run with "Refresh all"** on a set-up project with a hand-made `definition.md`: the file is byte-identical afterwards, and the check was not run. This is a partial observation of golden case `setup-refresh-keeps-definition`, which stays not-run until part B creates a real definition.
- **First run on the `SETUP.md` route:** the check reported `unclear`, setup stopped to ask new or existing, and no project file changed.
- The run used the setup skill as it stood before the audit's instruction fixes.
- Other vendors not-run. The owner's live host smoke test is not-run.

## Evidence

- `pre-ship-verify.mts` exit 0 on the final tree: see the build log.
- `project-state.test.mts`: 43 pass on Node and on Bun. The fail-closed mutant fails (author-run).
- Repository guard clean after every review.
- No reviewer saw the last blank-line wording together with real `R_OK` code as one tree; the final security copy held the final files plus its planted defect.

## Owner decision at the audit gate (2026-11-27)

The coordinator offered: approve with an override, fix Bun first as a separate `/fix`, go back to `/shape`, or stop. The owner answered **Approve**, taking the recommended option: ship part A and fix the Bun startup separately.

This is an override of the tier rule, which blocks `/ship-pitch` while a security high is open. The finding stays a high must-fix, unfixed. Reason given with the recommendation: it predates part A, sits in the startup shared by every script, and does not affect the default Node runner.
