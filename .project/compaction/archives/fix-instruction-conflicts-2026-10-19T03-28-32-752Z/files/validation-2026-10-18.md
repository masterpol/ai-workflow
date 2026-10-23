# Validation of applied instruction-conflict fixes

Validated the existing working-tree changes on `feat/unified-toon-config`, then corrected the issues below. Existing
pitch history and unrelated edits were preserved. The corrections are recorded in versions 2.31.2 and 2.31.3.

## Confirmed issues corrected

| Issue | Correction | Verification |
|---|---|---|
| A zero-finding `INCOMPLETE` review could satisfy the audit auto-advance wording | The audit contract and skill keep the audit open, preserve verified findings, retry unfinished checks once and record `not-completed` when necessary | Contract I and the strengthened gate assertions in E |
| Critique both triggered and skipped for an AI small-batch pitch | Only non-AI small-batch work skips critique within `/shape`; the overview and skill agree | Contract J |
| Bug-fix/hotfix direct routing conflicted with an unqualified pre-bet critique requirement | The shape contract and critique skill explicitly preserve the overview's direct variants while retaining AI evaluation in audit | Contract J; no new approval gate introduced |
| Shortened AI-scope descriptions omitted model-output handling; audit's eval section still named only prompts and call sites | Scope descriptions include output handling, and the audit eval section consumes the full behavior-based definition | Contract K |
| Audit loop prose granted three cycles regardless of appetite | Retry instructions honor the appetite's applicable cycle cap, then stop with unresolved must-fix findings | Contract L |
| A standalone lite card could reach build without the plan/hill files build expected | Build uses the approved card as the implicit scope and consumes its Exit check, progress and evidence | Contract M |
| Small-batch wording said build never stops, including on failure | Only routine approval is skipped; verification, failure and escalation rules remain applicable | Manual cross-file check |
| A security reviewer with no scratch path had no explicit safe response | It reports `INCOMPLETE` and requests the scratch path instead of substituting the live checkout | Manual cross-file check |
| Some contract tests silently skipped missing canonical files or used a negative gate regex without asserting the required condition | Required canonical files are read directly, and audit rows must positively require no must-fix findings and complete reviews | Contracts A, B/C, E, G, H |
| Repeated real CLI launches exceeded Bun's default five-second test timeout | Four affected integration tests have explicit 30-second budgets; assertions and cases remain intact | Bun targeted integration reruns and Node affected-suite rerun |
| A parser performance assertion counted time the process was descheduled during concurrent tests | The quoted-comma parser checks retain the 50 ms bound using CPU time | Node and Bun parser regression checks; final full Node suite |

Corresponding Cursor copies were refreshed from canonical files. No externally installed skill was rewritten.

## Test evidence

- New contract assertions failed against the pre-fix files. The initial regression expansion exposed four failures;
  the second expansion exposed three additional failures. All 13 contract tests now pass on Node and Bun.
- Full Node run: 60 test files, 1,692 tests, 1,690 passed, zero failed, two skipped.
- Node rerun of the six affected suites: 200 tests passed, zero failed.
- Full Bun run: 60 test files, 1,689 tests, 1,686 passed, two skipped and one timeout failure. That process had loaded
  the Codex hook test before its timeout correction. The complete corrected hook file was rerun: 18 passed, zero failed.
  This is full-suite coverage plus a successful corrected-file rerun, not a claim that the broad Bun invocation itself
  exited successfully.
- Earlier Bun failures in the canonical-command and hostile-snapshot CLI loops were reproduced, corrected and rerun
  successfully. The subsequent broad run passed those tests. The Claude and Codex hook loop reruns also passed.
- Workflow doctor: zero failures across 752 checks. Setup validator: zero failures across 24 checks.
- Documentation links: 71 files checked, zero broken links. Knowledge graph check: clean.
- Cursor mirror report: 44 current, zero missing, zero differing. `git diff --check`: clean.

Full-run test lists were enumerated recursively from `ai-framework/scripts`, `ai-framework/hooks/scripts` and
`.claude/hooks`. Absolute paths were supplied so Bun included the hidden `.claude` hook test file.

## Review evidence and disposition

Orca Run: `run_320b1626df73`. Four read-only Claude reviewer attempts returned their own `worker_done` messages.
Each message was collected through the dispatch library; all four terminals were released, ledger entries settled
and deliveries acknowledged. No reclaimable worker remains.

Initial passes covered code/ownership, security and test/eval coverage. A fresh recheck inspected the relevant whole
files and identified the additional eval-trigger, cycle-cap and lite-card issues; their corrections were verified
by regression tests in the main thread. Reviewer suggestions were checked against the actual checkout before patching.

The initial repository guard was clean after the first review wave. The recheck guard was also clean before the
coordinator's later test edits. Reviewers made no repository edits. Suggestions treating retained Bash permission
alone as a proven boundary failure were not accepted: the existing scratch-copy and guard contract still applies.
An alleged absent eval floor without a baseline was not reproduced; the agent already declares an absolute-floor
gate independently of baseline deltas.

These reviews are not certified as independent: no canary-based independence claim was made. Scratch snapshots did
not include `.project/evals`, so a reviewer's snapshot-only dataset absence was not treated as evidence of absence
in the live repository. The live repository contains the Orca orchestration dataset; no live golden-case evaluation
of workflow prompt behavior across all four vendors was performed or scored.

This record reports static contract, runtime-test and limited reviewer evidence. It does not mark the pitch shipped,
approve the separate instruction-compression pitch, or establish universal vendor behavior. Changes remain uncommitted.
