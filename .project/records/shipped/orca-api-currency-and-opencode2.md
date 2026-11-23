---
slug: orca-api-currency-and-opencode2
shipped: 2026-11-23
schemaVersion: 1
---
# orca-api-currency-and-opencode2

The Orca scripts check themselves against a committed contract snapshot and require advertised capabilities when Orca lists them.
The OpenCode worker's agent id is read from the host's installed agents, not guessed as `opencode2`.
Dispatch captures Orca's request id and bounds Orca's wait with `--timeout-ms`; an id or an absent lookup is never proof of a clean failure.
The audit fixed one fail-closed gap (a non-string failed stage). Three owner-authorized real launches supplied the receipts.
Orca 1.4.272 is not installed, so the snapshot comes from 1.4.271 and no newer version is claimed tested.

- outcome: Orca mode finds contract drift on the day it ships, and OpenCode workers launch under the id the host actually has.
- docs: [Orca vendor contract](ai-framework/integrations/orca-vendors.md)
- decisions: [OpenCode agent id from the installed agent list](.project/knowledge/decisions/opencode-agent-id-comes-from-the-installed-agent-list.md)
- knowledge: [capture the real receipt before designing recovery](.project/knowledge/patterns/capture-the-real-receipt-before-designing-recovery.md), [a failed stage of any type is not positive proof](.project/knowledge/issues/a-failed-stage-of-any-type-is-not-positive-proof.md), [a doctor check stays offline](.project/knowledge/patterns/a-doctor-check-stays-offline-and-the-live-check-is-its-own-command.md), [a hand-written fixture lags](.project/knowledge/issues/a-hand-written-fixture-lags-when-the-contract-grows.md)
- code: [contract](ai-framework/scripts/orca-contract.mts), [dispatch](ai-framework/scripts/orca-dispatch.mts), [launch gate](ai-framework/scripts/orca-launch-gate.mts), [policy resolver](ai-framework/scripts/orca-policy.mts)
- verification: [audit synthesis](.project/analysis/2026-11-23-orca-api-currency-and-opencode2-audit.md), [ship log](.project/runs/2026-11-23-orca-api-currency-and-opencode2.md)
- followups: [backlog](.project/pitches/_followups.md)
- archive: [full log](.project/runs/2026-11-23-orca-api-currency-and-opencode2.md), [hill chart](.project/runs/2026-11-23-orca-api-currency-and-opencode2-hill.md)
