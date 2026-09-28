# Build deviations

## D1 — Lock ownership safety — 2026-09-26

Age alone never permits stealing a live or permission-denied process lock: a paused owner could resume and write concurrently. New locks store PID plus Linux boot/start-tick identity when procfs is available. A proven different kernel start identity allows reclaiming a reused PID. Unsupported hosts and legacy numeric locks retain ambiguous live owners and stop after the bounded one-second wait; CLI telemetry remains best-effort.

macOS ps lstart exposes wall-clock timestamps with coarse resolution, rather than a portable kernel ownership token; it cannot safely establish the full process identity contract across clock changes and PID reuse. It is not used as reclamation authority.

Reclamation compares device/inode and contents immediately before rename; release compares the held descriptor with the current lock. These reject observed replacement locks but the final pathname rename/unlink race remains. S1 is incomplete. Full atomic ownership requires an OS-backed locking primitive/platform adapter or a different locking contract and appetite.

## D2 — Identity semantics — 2026-09-26

New identities and completion keys are tagged JSON tuples. Agent ID and agent type occupy separate positions. Type-only subagent completions receive an opaque unique identity, because a type cannot identify one completion. Explicit completion IDs remain replay-deduplicated.

Legacy v1/v2 snapshots and stored totals remain readable. Legacy colon-form dedup keys are preserved but are not mapped to ambiguous new tuples: replay of a previously stored old key can count once after migration. Existing model-note and skill-use keys keep their prior grammar.

## D3 — Completion plan built without a separate pre-bet critique — 2026-09-27

The completion plan said a pre-bet critique was required before finalizing. The user approved the plan
directly and asked for the implementation; no critique dispatch ran. The outer `/audit` is the first
independent look at this design.

## D4 — S1's reclaim contract and its tests retired — 2026-09-27

The five pathname-lock tests (live/EPERM owner retained, Linux reused-PID reclaim, replacement lock during
reclaim, dead-PID reclaim, orphan-age reclaim) tested a mechanism the approved plan replaces. They were
removed with it, not weakened. Structured identity (D2) and its tests are unchanged.

## D5 — Cross-project endpoint collisions are real, not theoretical — 2026-09-27

Two unrelated projects share a port with probability ~1/10,000 per pair; while one holds, the other skips.
The contract accepts this, but it made one full parallel test run flaky (1 in 7 observed). Followup opened.
