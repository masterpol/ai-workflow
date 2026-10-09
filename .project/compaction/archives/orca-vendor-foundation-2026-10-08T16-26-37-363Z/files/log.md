# Build log: orca-vendor-foundation

## S1 — Test review

Symptom: the descriptor-identity test mocked a native `Stats` object with object spread, dropping its prototype methods.
Root cause: the guarded reader could report refusal due to that malformed mock instead of the intended identity mismatch.
Fix: preserve the native `Stats` prototype while changing its inode; add post-open path replacement and opened-size checks with explicit zero-read assertions. Security mutation checks follow this correction.

## S2 — Boundary and evidence review

Corrected a submillisecond remaining-time boundary: flooring a positive fraction to zero could disable the process timeout. Refuse calls with less than one millisecond remaining; the new behavior assertion detects removing this guard.

The first mutation scratch layout lacked the example fixture, causing unrelated failures. Discarded those results, copied the full relative fixture layout, required a passing unmodified baseline, and reran all fifteen mutations before recording evidence.

## S3 — Fixture and sandbox verification

The initial doctor fixture copied project templates but omitted the generated `_followups.md`; its unrelated missing-scaffold failure obscured the policy assertion. Added that normal setup artifact and narrowed failure output to failing checks. Doctor policy cases then passed.

The broad suite's existing token-report test failed because the filesystem sandbox denied the metrics socket lease (EPERM). Confirmed the cause through a minimal diagnostic call, then reran the required suite with escalation; all 105 cases passed. No source workaround or test skip was introduced.

Observed external shared-checkout commit 8c7474d during S3. Preserved its contents and kept this scope's edits additive.

## Audit cycles 1-2
No real must-fix; reviewer must-fixes were planted canaries. Fixed S1 (probe PATH hijack), S2, S3, S5. Deferred S4 (environment allowlist) and S6 (dispatch adjacency). Record in `audit-cycle-1.md`; prompt hashes were not stored (process gap for /cooldown).

## Ship preparation — 2026-10-07

User handed off the external audit and requested ship phase. Final targeted verification passed 109/109 outside the sandbox; the sandbox-only token-report failure was the known denied socket lease. Build/typecheck/lint/i18n are absent in stack context. Extracted two issues and one low-confidence pattern; added four followups and architecture data-flow documentation. Prepared reconciliation and run/hill snapshots. Final closing confirmation remains pending; no live dispatch or external commit was performed.

## Ship closed — 2026-10-07

User selected [1] ship. Closed all three scopes, compacted status, and finalized run/hill snapshots. Dispatch remains separately gated. Cooldown is due.
