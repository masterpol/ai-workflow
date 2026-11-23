---
slug: orca-bounded-control-receipts
shipped: 2026-11-23
schemaVersion: 1
---
# orca-bounded-control-receipts

The Orca caller-identity lookup is bounded by live work: it asks per terminal state other than released, in the concise view, and halves its page size when a reply is over the shared output bound.
A refused worker start keeps its error code as launch-failed:refused:code while ownership stays unknown-liveness; capturing a real refusal receipt was deferred. Recovery archive: orca-bounded-control-receipts-2026-11-23T15-50-41-227Z.
The audit had no must-fix; its fixes are author-verified and were not independently re-reviewed.

- outcome: The Orca identity lookup no longer blocks on fleet history, and a refused worker start reports its code without weakening ownership.
- docs: [Orca vendor contract](ai-framework/integrations/orca-vendors.md)
- decisions: [identity lookup and refusal reporting](.project/knowledge/decisions/orca-identity-lookup-and-refusal-reporting.md)
- knowledge: [a filtered identity query must cover every state](.project/knowledge/patterns/a-filtered-identity-query-must-cover-every-state-that-can-hold-the-caller.md), [a receipt field reaches a reason only as a token](.project/knowledge/patterns/a-receipt-field-reaches-a-reason-only-as-a-bounded-token.md), [worker-list concise view](.project/knowledge/issues/orca-worker-list-concise-view-hides-the-worker-identity-fields.md)
- code: [identity lookup](ai-framework/scripts/orca-start.mts), [dispatch classification](ai-framework/scripts/orca-dispatch.mts)
- verification: [audit synthesis](.project/analysis/2026-11-23-orca-bounded-control-receipts-audit.md), [ship log](.project/runs/2026-11-23-orca-bounded-control-receipts.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-23-orca-bounded-control-receipts.md), [hill chart](.project/runs/2026-11-23-orca-bounded-control-receipts-hill.md)
