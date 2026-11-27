# Audit — fix-install-inherits-bundle-identity

2026-11-27. Bug-fix gate, two cycles. Orca Run `run_845fcbdbc50d`, workers run one at a time.

Dispatched: code (yes) | security (yes, two cycles) | test coverage (yes) | cross-pitch (no canary) | eval (pass, one run) | UX and i18n (no surface)

**Deviation from the reviewer contract:** no dispatch set an explicit model, so each worker ran its vendor's default and the model cannot be named. `independent: yes` below means a fresh worker that caught a planted defect.

## Code reviewer

model: not set at dispatch (vendor default; Orca did not report it), worker vendor codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 38519a5f9ee9cd1cbb4eecd3b1eb1e25f803d449d278b92af0a8a2a84336fb7e
cross-file interactions: reviewed entry-file callers: doctor, entry-import, bundle-sync
canary: caught

[Report](audit-reports/code.md) · [Prompt](audit-reports/code.prompt.txt)

## Security reviewer

model: not set at dispatch (vendor default; Orca did not report it), worker vendor codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 1f6655147fc833810149519ba08db69230ef1aa8988f9ef7096af7dcbc291388
cross-file interactions: reviewed the entry gate and its import resolver
canary: caught

[Report](audit-reports/security.md) · [Prompt](audit-reports/security.prompt.txt)

## Security reviewer, cycle 2

model: not set at dispatch (vendor default; Orca did not report it), worker vendor codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 719b788155b9456abd490a037067915ed395fb422a9a616ea711c6b3873197e5
cross-file interactions: reviewed bundle detection and the validator entry point
canary: caught

[Report](audit-reports/security2.md) · [Prompt](audit-reports/security2.prompt.txt)

## Test coverage checker

model: not set at dispatch (vendor default; Orca did not report it), worker vendor opencode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: b05124a390bea3b6db3874c677e9db73941a71556cfc7b5e5f6730d5227e1797
cross-file interactions: reviewed the validator tests and both upgrade fixtures; upgrade tests could not run in the copy
canary: caught

[Report](audit-reports/tests.md) · [Prompt](audit-reports/tests.prompt.txt)

## Cross-pitch conflict checker

model: not set at dispatch (vendor default; Orca did not report it), worker vendor opencode
independent: no (no planted canary)
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: eb066f6dedab3474f5e31a7603686a7c509bd17cd66ee223485d9e6552ba0458
cross-file interactions: reviewed the diff against the active pitch records

[Report](audit-reports/cross.md) · [Prompt](audit-reports/cross.prompt.txt)

## Eval runner

model: not set at dispatch (vendor default; Orca did not report it), worker vendor claude
independent: no (no planted canary)
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 2b17db8c29e271c0a2c259b7abe7d82e80e221bcf94a2c04318c0d2e87524f03
cross-file interactions: not reviewed (live behavior case only)

[Report](audit-reports/eval.md) · [Prompt](audit-reports/eval.prompt.txt)

## Findings

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| Must-fix | security, cycle 1 | `ai-framework/scripts/setup-validator.mts`: any root `SETUP.md`, including a project's own guide, turned the install check off | Fixed: only a `SETUP.md` whose first line is the bundle's title exempts the root. A test pins the title to the bundle's `SETUP.md` | Reproduced on an install copy before and after; the new assertion failed before the fix |
| Should-fix | tests | No test covered a stale `AGENTS.md` reached through the `@AGENTS.md` import | Added. It passed on first run, so it closes a coverage gap | Author-run; not independently reviewed |
| Should-fix | security, both cycles | The new `SETUP.md` read has no file-type, containment or size check, like the older `AGENTS.md` and `CLAUDE.md` reads beside it; a linked guide is followed | Deferred to the followups backlog as one guarded-reader change. A refused or failed read already keeps the check on | Source review; link, FIFO and size behavior unverified |
| Should-fix | security, cycle 1 | Older code prints raw import text and error messages | Deferred to the followups backlog; predates this fix | Source review |
| Should-fix | cross-pitch | `04-greenfield-kickoff` A2 and `07-archify-local-library` also plan to edit `SETUP.md`; A2 also edits both setup skills | Merge order decided: this fix first (already the 04 plan's entry condition), then 04, then 07. 06 syncs a release that contains it. No other uncommitted work touches these files | Read against the 04 plan; 07 has no plan yet |
| Acknowledged | security | A project that quotes the sentence as history would be failed; an unreadable bundle `SETUP.md` also fails closed | Accepted: both fail toward asking for a fix | Cycle 2 in-memory run |
| Acknowledged | code | Two files fell outside the logged boundary | Boundary updated in the log | Diff |
| Acknowledged | canaries | Planted defects at `setup-validator.mts` (flag ignored, prefix match, `README.md` probe, any-title match) | Present only in scratch copies; all four caught | `canary-check` caught for each |

No confirmed must-fix remains open. The known limit stands: a reworded copy of the bundle's specifics passes, and so does a project that keeps the bundle's own `SETUP.md` at its root.

Cycle 2 re-dispatched only security. The added import test and the final fix were not re-reviewed by the code or test reviewers.

## Eval gate

Case [replaces-copied-specifics](../../evals/datasets/install-entry-specifics.json), new in this audit and written by the author. One live run, Claude worker, new instruction text: both expected actions met and no forbidden action seen (the diff starts inside Project specifics, and both files match). **No baseline run exists, so no regression delta is claimed.** Other vendors not-run. The worker reported creating and deleting one temporary file just outside its permitted folder, inside the scratch area.

## Evidence

- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0 after the fix: 2,463 tests, 2,460 pass, 3 skipped, 0 fail.
- `setup-validator.test.mts` and `installed-upgrade.test.mts`: 35 pass on Node. `setup-validator.test.mts` on Bun: 32 pass.
- Repository guard: clean after every review in both cycles.

# Revision after the owner's "fix all errors prior to ship" (2026-11-27)

The sections above record the first two cycles. The findings and evidence there describe the code before this revision. The rounds below go past the bug-fix cap of two cycles, on the owner's instruction. Every dispatch named its model. Cross-pitch was not re-dispatched: no active pitch plan names `entry-import.mts` or `workflow-doctor.mts` as newly shared work beyond what it already reviewed (author-run, not a review).

## Code reviewer, round 3

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: b33a1e13ae2cce756411bd9963af39ce84c8093b8e1e5221fb9d166fe97ef22c
cross-file interactions: reviewed callers of entry-import.mts and the doctor
canary: caught

[Report](audit-reports/r3code.md) · [Prompt](audit-reports/r3code.prompt.txt)

## Security reviewer, round 3

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: b9f4a4b0e7844e67f6313533adfda39ce937dcd9a54444f54ee963679a96b25c
cross-file interactions: reviewed every project read and output path in the validator and its helpers' call boundaries
canary: caught

[Report](audit-reports/r3security.md) · [Prompt](audit-reports/r3security.prompt.txt)

## Test coverage checker, round 3

model: opencode-go/minimax-m3, OpenCode
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 21e9a60d5947fdd98c51c10998e8608a287b407a1feae3488f5e01ae8efc9e92
cross-file interactions: reviewed the new and changed tests and the removed library seam
canary: caught

[Report](audit-reports/r3tests.md) · [Prompt](audit-reports/r3tests.prompt.txt)

## Security reviewer, round 4

model: gpt-6.2-sol (medium), Codex
independent: yes
read-only: verified by scratch copy and repository guard (clean)
prompt-sha256: 84d190cc18c89a0d37814a9e2cb0b7f31340d5a546349a3f5309574fd804e94e
cross-file interactions: reviewed the shared bundle predicate across validator and doctor
canary: caught

[Report](audit-reports/r4security.md) · [Prompt](audit-reports/r4security.prompt.txt)

## Findings from rounds 3 and 4

| Tier | Source | Finding | Disposition | Verified |
|---|---|---|---|---|
| Must-fix | security r3 | The validator ran the checked project's copies of graphify and the doctor | Fixed: both start from the running bundle's folder; the project stays the working directory | New test red then green |
| Should-fix | code r3 | The doctor still treated any `SETUP.md` as the bundle, so a project's own guide added a failure | Fixed: validator and doctor share one title check | Reproduced on an install copy (3 failures to 2, the 2 caused by the incomplete copy); doctor test red then green |
| Should-fix | code r3 | Two bundle-source tests ship into installs and would fail there | Fixed: they skip outside the bundle checkout | Both skipped inside the install copy |
| Should-fix | security r3 | The placeholder pattern was quadratic | Fixed | Test hung 20 s before, passes after |
| Should-fix | security r3, r4 | Child report counts were printed unvalidated; negative counts and a null problem list passed | Fixed | Tests red then green |
| Should-fix | code r3, security r4 | Doctor failures lost the exit code; a signal showed `exit null` | Fixed | Tests red then green |
| Should-fix | tests r3 | No test for the detail sanitizer, the imported caveman section, or two context files | Added | Author-run; the sanitizer and import tests passed on first run |
| Acknowledged | code r3 | The doc overstated which reads are guarded | Wording narrowed | Diff |
| Should-fix | security r3 | Unguarded reads remain in `skill-vendors.mts` and `skill-registry.mts`; rules and TypeScript directory listings are unchecked | Deferred: shared modules outside this fix | Static review |
| Should-fix | security r3 | Ledger and outcome readers check before opening, and their diagnostics copy record values | Deferred: shared modules outside this fix | Static review |
| Should-fix | security r3 | `resolveClaudeEntry` re-reads the imported `AGENTS.md` without a pinned descriptor or link-count check | Deferred: shared by sync and the doctor | Static review |

Planted defects in rounds 3 and 4 (raw report name, direct `SETUP.md` read, raw error text, relative doctor path) were all caught and exist only in scratch copies. The test reviewer's "blocker" was its planted defect. No confirmed must-fix remains open. The two low fixes after round 4 were not re-reviewed.

Workers did not stay fully inside their folders: the round 3 code reviewer ran one existing test that made and removed temporary files in the system temp folder. The repository guard stayed clean in every round.

## Evidence after the revision

- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0 on the final code: 2,474 tests, 2,471 pass, 3 skipped, 0 fail.
- The validator, doctor, entry-import and installed-upgrade tests: 142 pass on Bun.
- This checkout: `setup-validator.mts` reports READY.
