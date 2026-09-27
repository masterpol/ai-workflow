# Build deviations

## D1 — Lock ownership safety — 2026-09-26

Age alone never permits stealing a live or permission-denied process lock: a paused owner could resume and write concurrently. New locks store PID plus Linux boot/start-tick identity when procfs is available. A proven different kernel start identity allows reclaiming a reused PID. Unsupported hosts and legacy numeric locks retain ambiguous live owners and stop after the bounded one-second wait; CLI telemetry remains best-effort.

macOS ps lstart exposes wall-clock timestamps with coarse resolution, rather than a portable kernel ownership token; it cannot safely establish the full process identity contract across clock changes and PID reuse. It is not used as reclamation authority.

Reclamation compares device/inode and contents immediately before rename; release compares the held descriptor with the current lock. These reject observed replacement locks but the final pathname rename/unlink race remains. S1 is incomplete. Full atomic ownership requires an OS-backed locking primitive/platform adapter or a different locking contract and appetite.

## D2 — Identity semantics — 2026-09-26

New identities and completion keys are tagged JSON tuples. Agent ID and agent type occupy separate positions. Type-only subagent completions receive an opaque unique identity, because a type cannot identify one completion. Explicit completion IDs remain replay-deduplicated.

Legacy v1/v2 snapshots and stored totals remain readable. Legacy colon-form dedup keys are preserved but are not mapped to ambiguous new tuples: replay of a previously stored old key can count once after migration. Existing model-note and skill-use keys keep their prior grammar.
