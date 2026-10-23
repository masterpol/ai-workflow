# Ship verification: connected-memory-consolidation

Date: 2026-10-22. Result: blocked; no ship approval requested and no pitch closed.

## Authority and scope

Original invocation: `$ship .project/pitches/connected-memory-consolidation orca=normal`.
Orca startup confirmed `bypassed` / `orca-normal`; no workers were dispatched.
The owner approved the direct-check fallback after the mandatory wrapper failed with
`No package.json or Muro document verifier found. Define project checks before shipping.`
This approval replaces the wrapper route only; it does not waive a failing test.

The proposed release covers P1 (six scopes, including S1b) and P2a (six scopes), all marked done
in the hill chart. P2d (three scopes) and P2c (five scopes) remain unstarted and active, in the
separate-ship order required by plan R14. The umbrella pitch must not be marked wholly shipped.

## Direct verification

| Check | Result |
|-------|--------|
| `node ai-framework/scripts/run-tests.mts --runtime node` | Failed: 83 files; 2,618 tests; 2,614 passed, one failed, three skipped; exit 1; 106.281 seconds. |
| `node ai-framework/scripts/setup-validator.mts` | Passed: READY, 24 checks, 46 valid v1 ledgers, 170 TypeScript entries parse. |
| `node ai-framework/scripts/graphify.mts --check` | Passed: CLEAN, 119 knowledge entries, no relation errors. |
| `node ai-framework/scripts/graphify-relations.mts --check` | Passed: 50 entries, 135 mirrors, 41 reads, 20 dispatches, eight phase-doc edges, zero problems. |
| `node .project/pitches/connected-memory-consolidation/precision.mts /tmp/connected-memory-ship-precision` | Passed: before 0/12, after 12/12; every exercised relation type passes. No declared writes edges exist. |
| `node ai-framework/scripts/graphify.mts` | Passed: graph and knowledge index rebuilt; 23 stub nodes. Rebuilt graph has 6,921 nodes, 13,266 links and zero isolated OpenCode adapters. |
| Legacy preservation and mirror comparisons | Passed: all 46 ledger files and all legacy done-work narrative entries equal HEAD byte for byte; AGENTS/CLAUDE and the pitch-compress canonical/Cursor copy are identical. |
| Scoped implementation `git diff --check` | Passed for ai-framework, canonical/Cursor skills, entry files, SETUP, CHANGELOG and VERSION. |
| Whole-checkout `git diff --check` | Trailing blank-line warnings in the followups backlog, this pitch's pitch.md, workflow-v3-rollout/pitch.md and the forced cooldown run. Existing records were preserved. |
| Build, typecheck, lint, i18n | Not applicable: no commands exist for these checks in this repository, per stack.md. TypeScript parsing is covered by setup-validator. |

Changed-path inspection found no changed secret files; runtime logging in maintenance scripts is intentional.
Full test output is local diagnostic data at `/tmp/connected-memory-ship-tests.log`; graph build output is
at `/tmp/connected-memory-ship-graph.log`. The durable results and decisive failure are recorded here.

## Blocking failure

`ai-framework/scripts/state-fragment-dataset.test.mts:435`:
`[dataset-mapping] the live record is valid and its single Claim line equals the computed claim`.

The test opens `.project/pitches/state-ai-authoring/live-runs.md`, which no longer exists, and fails
with `ENOENT`. This matches the pre-existing failure documented in the build log's full-suite section;
the current run independently reproduces it. It is a missing durable evidence source, not the older
load-dependent sanitizer failure also mentioned in the backlog.

The audit has consumed all three big-batch cycles. Ship stops under the final-verification and audit
loop rules. No fourth audit cycle, SHIPPED.md, shipped status, cooldown count increment or pitch deletion
was produced. Knowledge extraction and final reconciliation remain pending successful verification.

## Next action

Repair the stale live-evidence dependency through a separate fix/shape entry, preserving the live-claim
validation contract. Do not fabricate a live run, silently skip the assertion or make ordinary tests read
recovery archives. Rerun the full suite and the affected ship checks before preparing the final ship gate.
