---
id: legacy-upgrade-drift-acceptance-binds-both-versions
type: decision
status: accepted
created: 2026-10-23
updated: 2026-10-23
tags: [compaction, migration, provenance, approvals]
related: [a-gate-must-not-trust-its-own-author, pitch-compaction-gate-and-recovery-design]
source: legacy-upgrade
applies-to: [legacy-upgrade]
---

# Decision: accept reviewed destination drift by binding both versions

## Context

Some durable destinations changed after their v1 ledger was committed. Rejecting all drift
blocked legitimate upgrades; silently replacing old bindings would erase the historical proof.

## Decision

The owner approved deviation D30: retain the original destination hash, require the reviewed
current hash and a nonempty per-destination reason, and bind this exact acceptance into the
human-approved proposal. Strict refusal remains the default. A wrong original hash, wrong
current hash, later edit, unused acceptance, blank reason or unsafe destination still refuses.
Use introducing-commit proof for hashless v1 ledgers; missing history is a refusal.

## Consequences

This is narrow migration approval, not permission to refresh arbitrary bindings or overwrite
destinations. Apply-time hashes prove the reviewed state at that time; subsequent legitimate
knowledge/backlog maintenance need not preserve that historical current hash forever. Preserve
the original v1 sibling, archive and approval receipt so both versions remain auditable.
