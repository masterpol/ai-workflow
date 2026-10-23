# P2c-S3 batch 4 — source-review request

Prepared 2026-10-22 after all five batch-3 upgrades passed their live exits. This request authorizes source review only. No archive has been listed, inspected or opened for these two pitches during preparation; `legacy-upgrade prepare` ran without `--read-archive`.

| Pitch | Required sections | Historical evidence |
|---|---:|---|
| state-quoted-fonts | 11 | durable destination available; unresolved draft staged |
| workflow-usage-metrics | 22 | durable destination available; unresolved draft staged |

Both are tier A and remain legacy. Read-only unresolved drafts are in the active pitch campaign directory (`state-quoted-fonts.draft.toon`, `workflow-usage-metrics.draft.toon`); they are not runnable approval payloads.

Not included: codex-orca-coordinator-parity, orca-auto-start-all-phases, runner-aware-runtime-boundary-validator and state-multipage-report. Their compact-record destinations are unavailable, which is the historical destination conflict (four pitches). They keep separate gates and need a decision before any source review. The token-time-report large-source proof also remains required and has no source-read approval.

Approval authorizes receipt-gated original-source review and archive verification for exactly state-quoted-fonts and workflow-usage-metrics. It does not authorize ledger replacement or final record/supplement publication. After review, exact payloads, coverage, omissions and outcome samples need a separate apply gate. Reviewers are read-only, confined to the verified private cache and explicit durable paths (no repository-wide searches over `.project`), at most three concurrent.

Tier A stays 13/19 upgraded. The 18 prior full-suite failures remain open and unwaived.

Approve / Revise / Back / Stop.
