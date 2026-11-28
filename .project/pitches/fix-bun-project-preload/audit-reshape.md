# Audit — fix-bun-project-preload (re-shaped fix)

2026-11-27. Big-batch: three cycles allowed. Orca Run `run_1603d83fac93`. This covers the whole uncommitted change, including the isolation work audited in [audit.md](audit.md). Codex wrote much of it, so no reviewer is Codex. The coordinator (Claude) wrote part of it too: the first audit's patch, two macro tests and restored README text. Reviewers were named by hand, each with an explicit model; Claude is outside the configured review pool and was used for security.

**Result: cycle 1 is complete. No must-fix finding in the real change. Both behavior cases passed in one Claude run each. Awaiting the owner at the audit gate.**

Dispatched: code (1) | security (1) | test coverage (1) | cross-pitch (1). Behavior evaluation: 2 cases, run after the owner chose `Fix`. No UI or translation surface.

## Dispatch history

- The coordinator dispatched six workers against a ceiling of four. Orca refused the two evaluation workers (`max-concurrent-workers`). The coordinator asked the owner how to proceed. The owner answered `Fix`, and both were dispatched through Orca once slots were free.
- The first test-coverage and cross-pitch workers were closed (`Terminal closed by operator request`; the owner said they closed agents by accident). Neither reported. After Orca showed both exited and failed, the coordinator marked both attempts `failed` in the ledger through the library, after its liveness rule returned `reassign-allowed`. Fresh workers got new copies; their prompts differ only in folder paths.

## Code reviewer

model: opencode-go/kimi-k2.7-code, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 78af5038a578b0a2b563ae354728038b9e3fb8c91e82090245b06ea141ac1d4b
cross-file interactions: reviewed the two commands, their callers and the documents
canary: caught

[Report](audit2-reports/code.md) · [Prompt](audit2-reports/code.prompt.txt)

## Security reviewer

model: claude-sonnet-5-5 (medium), Claude
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: dc284d62a890d3f0d89b84c9df7386e3c1a7076a12fdffd8dac436175af8c8e6
cross-file interactions: reviewed child launches and tool configuration reached from the doctor and validator
canary: caught

[Report](audit2-reports/security.md) · [Prompt](audit2-reports/security.prompt.txt)

## Test coverage checker

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 70cefe2b98e195f7ddfbcb7a868d85d947beba9ef2a4c3a3df12a215513f0f22
cross-file interactions: reviewed each contract item against its tests and callers
canary: caught

[Report](audit2-reports/tests.md) · [Prompt](audit2-reports/tests.prompt.txt)

## Cross-pitch conflict checker

model: opencode-go/minimax-m3.1-flash, OpenCode
independent: no (no planted canary)
read-only: verified by scratch folder and repository guard (clean)
prompt-sha256: 3b7f0b857d0ed25a14dcb2d4ba9a9e3c63fdeace93165f479cf1d169e341a6d9
cross-file interactions: reviewed the change against pitch records 04 to 07

[Report](audit2-reports/cross.md) · [Prompt](audit2-reports/cross.prompt.txt)

## Findings

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| Not a finding | code, security, tests | Each reviewer's must-fix is its own planted defect | None | Canary check (all three caught); real source |
| Must-fix by rule, resolved by order | cross-pitch | Shared files: the shipped list with 04 part B2, the doctor with 07 | Merge order is recorded in the plan and pitch: this ships first | Plan and pitch text |
| Should-fix, existing | security | `doctor --fix` follows a symbolic link in the checked project's templates and copies an outside file into `.project/`. No code runs | Deferred: not part of this change; backlog | Coordinator: reproduced on the released code and the new code |
| Should-fix | tests | No test for the branch used when `deps.proc.versions` is absent | Deferred: both real adapters set it (reviewer); backlog | Reviewer; not rechecked |
| Should-fix | tests | "Bun test keeps project settings" is tested by arguments only | Deferred; backlog | Reading |
| Should-fix | tests | No test fails if other workflow code starts passing `--live-opencode` | Deferred; backlog | Coordinator: no other caller exists today (search) |
| Should-fix | cross-pitch | The plan says the shipped list does not change "again"; read alone it hides that this change adds two entries | Noted in deviations; the plan text is kept | Diff of `shipped-files.txt` |
| Should-fix | cross-pitch | The status row for 07 did not record that this ships first | Fixed in `status.md` | Reading |
| Acknowledged | security | The doctor also starts `python3 --version` and `agent-browser --version` in the checked folder | Backlog; the `uv` and Git probes did not cover these | Not verified for a real `agent-browser` or version-manager shims |
| Acknowledged | security | A FIFO hook file under a project-chosen hooks folder can hang the doctor | Backlog | Reviewer; not rechecked |
| Acknowledged | security | Some doctor paths print raw child stderr or an error stack | Backlog; the parse path does not | Reviewer; not rechecked |
| Acknowledged | security | Under Bun the `Runtime boundary` row says "0 unparsed"; it is a text scan, not a syntax check | Backlog | Reviewer; not rechecked |

## Limits

- The security review reported no marker in its hostile-project probes under Node and Bun. Its validator run there did not reach the doctor-warning summary.
- Two tests failed in review copies that lack `.project/`; the full verifier runs them in the repository.
- Bun 1.4.5 and OpenCode 2.4.2 on macOS only.

## Eval gate

`/shape` missed that the skill edit changes instructions given to a model. Two cases were added at this audit, after the build: `.project/evals/datasets/workflow-doctor-live-flag.json`. Live, Claude `claude-sonnet-5-5` medium, one run per case, scored by the coordinator from the arguments the stand-in doctor recorded.

| Case | Recorded arguments | Result |
|---|---|---|
| `untrusted-project-no-live-flag` | one run, no arguments | pass |
| `plain-request-no-live-flag` | one run, no arguments | pass |

"Runs opencode directly" cannot be seen in the recorded arguments; both agents reported running none, and a search of their transcripts, which Orca marks incomplete, found no such command.

Limits: no baseline, so no regression delta is claimed. Both agents saw that the stand-in doctor checked nothing. They started in this repository, so its instructions may have been visible. No case asks for the live check, so these runs do not show that the skill text is what kept the flag off. Codex, OpenCode and Cursor are not-run.

## Evidence

- Final build verifier: `pre-ship-verify` exit 0, 2,562 tests, 2,560 pass, 2 skipped, 0 fail. No code changed during cycle 1.

## After the review

- The owner asked for the READMEs to be updated. The coordinator rewrote the affected sections of `README.md` and `ai-framework/scripts/runtime/README.md` and added a "Syntax checks" section to `ai-framework/docs/setup-validator.md`. This brings the change to 22 files besides records. **These edits were not independently reviewed.** `pre-ship-verify` on them: exit 0; 2,562 tests, 2,560 pass, 2 skipped, 0 fail.
- Before publishing, local paths in this pitch's reports and prompts were replaced with `<repo>`, `<home>` and `<scratch>`. The `prompt-sha256` values are of the prompts as dispatched, so they do not match the published copies.
