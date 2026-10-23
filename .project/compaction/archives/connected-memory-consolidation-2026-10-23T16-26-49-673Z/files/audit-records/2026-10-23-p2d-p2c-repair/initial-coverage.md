# Initial coverage review — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: d20df12e082a0791639abaa1be710f9158aaba0da37c4209db9e6fde5e476718
model: gpt-6.1-sol high
cross-file interactions: reviewed

Status: INCOMPLETE: seeded failures; installed fixture source-reviewed only. All required source/test interfaces inspected, completion retry needed.

Exact loaded prompt is initial-coverage.prompt.md. These are summaries of the fresh agent reports, not invented clean results. Reported failures are in planted scratch copies; no original checkout or recovery sources were given to reviewers.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-D | must-fix, scratch only | consolidation-migrate.mts:179 | Planted unconditional publication violates dry-run | yes; reviewer reported and focused regression failed | Not present in checkout; actual options.apply guard and source hash verified |
| C-C | must-fix, scratch only | legacy-upgrade.mts:270 | Planted existence-only binding check | yes; reviewer reported and missing-binding regression failed | Not present in checkout; actual hash equality and source hash verified |
| C-R | scratch inconsistency | state-ai-authoring-live-runs.md:33 | Planted Claim: passed contradicts matrix | yes; reviewer reported and unchanged consumer failed | Not present in checkout; actual blocked claim and complete36920bytes verified |

Focused evidence: P2d30pass1fail; integration4/4. P2c111pass3fail across114 tests; graph2/2. Repair53pass1fail.

Source checklist completed: P2d guarded reads, pending transactions, local/refused template distinction, publication conflict/replay and sync/doctor read-only inventory; P2c receipt/admission, introducing-commit and drift pairs, source/section/file hash validation, preserved v1 bytes, five-stage replay and authoritative outcome-link interfaces; repair complete consumer, matrix and unchanged timing/buffer assertions. Code followed migrate/pending guard/registry and apply/archivedEvidence/validateEvidence/transaction interfaces. Security walked applicable C/D/E/G, A/B/F N/A to local CLI. Coverage checked behavior/refusal assertions and fault/replay stages.

Installed fixture omissions and exact-byte checks were not waved through: the fresh narrow completion reviews below supply the missing evidence. No production patch was required.
