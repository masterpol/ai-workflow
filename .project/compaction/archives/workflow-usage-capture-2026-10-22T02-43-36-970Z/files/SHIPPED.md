# Shipped: workflow-usage-capture

Version: **2.38.0**. Bet: 2026-10-19. Shipped locally: 2026-10-21. Appetite: big-batch. Owner approved final closure and the documented verifier fallback.

Claude lifecycle hooks and OpenCode plugin events now feed metadata-only workflow usage capture through the existing state boundary. All P0/S1–S7 scopes are complete. The approved A1 prerequisite repairs sentinel attribution, label inheritance and atomic phase replacement without changing schema 2 or the lease contract.

## Reconciliation

- S1 established payload identities, event ordering and the 250 ms hook latency budget.
- S2 adds pure bounded metadata mappers; invocation arguments reach only the phase resolver and are never persisted.
- S3 adds the bounded Claude CLI with a shared 3-second pre-acquisition budget and at most two writer attempts. No forced cancellation occurs while a lease is owned.
- S4 installs eight capture-owned Claude hook groups in template and live wiring. Existing token and Orca groups retain their positions. Measured shell p95: 100 ms; coexistence skips: 0/60.
- S5 validates exact command, type, matcher, timeout and cardinality through doctor.
- S6 captures OpenCode V2 step intervals and V1/V2 phase skills after token writes settle. Lease failures: 0/12 before and after.
- S7 documents the integration, verifies an idempotent RN-shaped scratch sync, and prepares the release.

Budget: 15 authored implementation/release files, 1325 added / 11 removed lines, within the approved 1500-line cap including A1. Two mandatory generated graph artifacts and project records are separately reported bookkeeping.

## Verification and approval

| Check | Result |
|-------|--------|
| Full Node suite, serial execution | 2360 passed, 3 existing skips, 0 failures |
| Full Bun suite | 2338 passed, 3 existing skips, 0 failures |
| Release contract tests | 38 passed |
| Doctor / setup | 0 failures / READY, 23 checks, 148 TypeScript parses |
| Knowledge graph | CLEAN; 112 entries, 319 links |
| Recursive metrics privacy-marker scan | 0 matching files |
| Required pre-ship wrapper | Exit 1: package.json or Muro verifier absent; owner explicitly approved actual-repository-check fallback |

The wrapper was not repaired and did not pass. This known package-less routing limitation remains a separate backlog item. The final Node suite passed without a sanitizer exception. Actual commands and log paths are preserved in ship-readiness.md. Audit cycle 1 completed required Orca reviews, with no confirmed source must-fix remaining. Cycle 2 V1 closes through the explicit owner-approved exception. Workers are released, ledger attempts settled, deliveries acknowledged.

## Limits and deferred work

Prompt, response and transcript content is not selected or stored. No capture instructions were added to phase prose; token/state schemas and the lease implementation remain unchanged. OpenCode user-turn timing is unverified: wait is Unavailable; V1 completions produce no interval without a verified start. OpenCode V2 compatibility is fixture-verified, not live-proven. Codex/Cursor automatic capture, gates, ships, report/schema revisions and external rollout remain outside scope. The A1 dropped count measures refused attempts, including a retry-recovered attempt.

Followups retain wrapper routing, Orca model-capability receipts, guard snapshot bounds, metrics documentation wording and pre-existing OpenCode metadata retention. workflow-v3-rollout must repeat its scratch-copy dry run before a real sync. No historical records were removed; audit evidence is preserved in the adjacent dated run archive and SHA-256 manifest. Four issue cards, one reusable pattern and two confidence updates were recorded and indexed. No rule was adopted automatically.

Preparation commit: f30f4d2. Implementation baseline: 868212b. Detailed reconciliation: ship-readiness.md; rollout evidence: rollout.md; audit decisions: audit-cycle-1.md and audit-cycle-2.md. No tag, push, publication or external project sync was requested.
