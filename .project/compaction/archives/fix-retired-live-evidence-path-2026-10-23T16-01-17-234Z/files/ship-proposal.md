# Proposed ship: fix-retired-live-evidence-path

Date: 2026-10-23. Appetite: bug-fix. State: ready for final owner approval; not closed or marked shipped.

## Result and reconciliation

The historical-record regression now reads a durable evidence asset. Its previous pitch path was removed by compaction. The exact 36,920 original UTF-8 bytes are restored at .project/records/legacy-upgrades/state-ai-authoring-live-runs.md, and only the LIVE_RECORD constant changes in state-fragment-dataset.test.mts. The test's assertions, child timeout, output cap and sanitizer limits are unchanged.

The matrix remains historical: 72 runs, 51 pass / 21 fail, 12 seeded bad rows, one Cursor not-run row, and Claim: blocked. No model rerun or new quality claim is implied. Raw SHA-256 is 868e76e9eace40c14f8014e18a16a8fa5b702de13e5489ebcc29c4e7944fc24a; it equals the approved source candidate and proof. Source came from the previously approval-gated verified cache; ordinary tests do not read recovery archives.

One implicit scope is verified. No production runtime, schema, parser, assertion, skip or timing/security limit changed. No temporary package file, commit, push, pitch deletion or downstream rollout is included.

## Verification

| Check | Result |
|---|---|
| Exact approved restoration and one-line patch | Full bytes and before/after hashes match proof |
| Final isolated production dataset command | 54/54 passed, zero failures/skips; exit 0 |
| Independent final-cycle sequential child and parent checks | 347/347 child tests; 54/54 dataset tests |
| Full supported Node suite | 86 files; 2,712 tests; 2,709 passed, zero failed, three existing skips; exit 0; 436.955 seconds |
| Full-suite reuse proof | All 172 copied implementation-source hashes remain unchanged; audit changed records/knowledge only |
| Setup / graph / relations | READY, 25 checks / CLEAN, 120 entries and 339 knowledge links / zero problems |
| Retained records and links | 46 upgraded, zero legacy/partial/problems; saved approval hashes and retained supplement bytes unchanged; 48 record/issue files, zero broken links |
| Diff | Repair is exactly one changed test-path line plus the original asset; scoped whitespace check passes |
| Application build, typecheck, lint, i18n | No such commands exist in this Node workflow bundle; setup checks parse 175 TypeScript entries |

The mandatory pre-ship wrapper still fails with “No package.json or Muro document verifier found. Define project checks before shipping.” This uses the previously owner-approved direct-check route for this package-less repository, documented in the Oct22 ship-verification run. That route does not waive failed tests. The unchanged full suite is retained rather than rerun after record-only changes; focused final checks and source-hash comparison verify the same implementation.

## Audit and remaining risk

Cycle 1 completed code, security, coverage and cross-pitch reviews; all planted controls were detected. A subsequent final dataset run recorded one unnamed child failure (346/347), causing 16 dependent parent failures. Its cause is unconfirmed. Returning to the final permitted bug-fix audit cycle, a fresh reviewer independently passed sequential child and dataset checks, verified exact bytes/bounds and identified the existing diagnostic limitation. The final isolated production dataset run passed too. Passing reruns do not establish the first failure's cause.

FRLE-D1 defers bounded failing-child diagnostics; current reporting emits aggregate counts without the failing TAP name. Reason: this is an existing observation gap outside the exact restoration scope, with no latest required exit failing. The earlier sanitizer timing-under-load backlog remains its own owner; no causal claim or limit relaxation is made here. Cycle cap is reached: any further required verification failure must stop closure and return to shaping, not start cycle 3.

## Knowledge, followups and documentation

One issue was extracted: live-test-evidence-outlived-its-pitch-path, linked to existing compaction, deletion-intent and schema-dependent-reader lessons. The graph was rebuilt and validates. No new pattern or rule was added. One diagnostic backlog item was added (FRLE-D1); existing timing and package-less wrapper items remain authoritative. No product or architecture document change is needed for a test-input ownership repair.

## Final gate and intended closing writes

Approve to close this repair / Revise / Back / Stop. On approval, publish this reconciliation as SHIPPED.md and a dated run, archive its live build log into the run without deleting sources, and move only this repair from Active to Recent ships. Keep status at most 100 lines and increment the cooldown counter once. Preserve separate P1/P2a/P2d/P2c ownership; no blanket consolidation ship, commit, push or rollout is included. All implementation, knowledge and followup work is already reviewable; only final closing records/status remain.
