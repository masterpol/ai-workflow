# Initial security review — cycle1

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check; final repo guard clean
prompt-sha256: 76274c1ae4e641795b89b9a84b55ea6b7a40e9ad7a5ded229726311bc61fbfc6
model: gpt-6.1-sol high
cross-file interactions: reviewed

Status: BLOCK/INCOMPLETE: seeded failures, omitted installed-fixture inputs and missing exact original comparison. No additional candidate security issue reported.

Exact loaded prompt is initial-security.prompt.md. These are summaries of the fresh agent reports, not invented clean results. Reported failures are in planted scratch copies; no original checkout or recovery sources were given to reviewers.

| ID | severity | file:line | issue | verified | disposition |
|---|---|---|---|---|---|
| C-D | must-fix, scratch only | consolidation-migrate.mts:179 | Planted unconditional publication violates dry-run | yes; reviewer reported and focused regression failed | Not present in checkout; actual options.apply guard and source hash verified |
| C-C | must-fix, scratch only | legacy-upgrade.mts:270 | Planted existence-only binding check | yes; reviewer reported and missing-binding regression failed | Not present in checkout; actual hash equality and source hash verified |
| C-R | scratch inconsistency | state-ai-authoring-live-runs.md:33 | Planted Claim: passed contradicts matrix | yes; reviewer reported and unchanged consumer failed | Not present in checkout; actual blocked claim and complete36920bytes verified |

Focused evidence: P2d30pass1fail; sync/doctor4/4; fresh subset1pass1missing-fixture failure. P2c45pass3fail; refs19/19; graph3/3. Repair53pass1fail.

Source checklist completed: P2d guarded reads, pending transactions, local/refused template distinction, publication conflict/replay and sync/doctor read-only inventory; P2c receipt/admission, introducing-commit and drift pairs, source/section/file hash validation, preserved v1 bytes, five-stage replay and authoritative outcome-link interfaces; repair complete consumer, matrix and unchanged timing/buffer assertions. Code followed migrate/pending guard/registry and apply/archivedEvidence/validateEvidence/transaction interfaces. Security walked applicable C/D/E/G, A/B/F N/A to local CLI. Coverage checked behavior/refusal assertions and fault/replay stages.

Installed fixture omissions and exact-byte checks were not waved through: the fresh narrow completion reviews below supply the missing evidence. No production patch was required.
