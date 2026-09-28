---
id: compaction-recovery-shares-context-and-trusted-directories
type: decision
created: 2026-09-27
updated: 2026-09-27
tags: [compaction, recovery, transactions, path-safety, threat-model, migration]
related: [pitch-compaction-gate-and-recovery-design, inode-anchoring-and-stable-inode-locks, hardening-a-shared-reader-made-its-writer-destructive]
source: path-safety-hardening
---

# Decision: shared compaction recovery context and trusted directories

The user approved the revised path-safety contract on 2026-09-27. Portable Node pathname operations reject static symlinks and observed ancestor replacement, but cannot guarantee continuous containment against a hostile process that changes an ancestor after the final check. Project directories and ancestors must remain under cooperating control during managed transactions. The earlier continuous-containment promise remains unresolved; this decision narrows the supported contract explicitly rather than claiming that promise was implemented.

Ledger commits and archive/remove recovery now share one context constructor, target root and `.project/compaction` journal namespace. A journal written under a different namespace is not recoverable merely because both operations use the same transaction library. Tests kill the real ledger-commit process after the write, then exercise the archive CLI to restore exact prior bytes or prior absence.

Older ledger commits used the installer context and `.project/skills/transaction.json`. Pending installer or legacy journals block new compaction mutations conservatively and remain untouched. Recover them using `add-skill.js recover --scope project --apply` with the correct project root; use `pitch-archive.js recover --apply` for new compaction journals. Stop old compaction processes, including long-lived imported copies, before migration. An absent legacy journal cannot prove an old writer will not resume under its separate lock.

A refused path remains an error. Unsafe cleanup may leave a temporary file in a moved directory; following the replacement path to clean it would be worse. Recovery still checks conflicts, and deletion still requires a verified archive, complete extraction ledger and explicit human approval.

Evidence: `.project/pitches/path-safety-hardening/completion-log-2026-09-27.md`, the compaction test suites and README's managed-write safety section. No new runtime dependency or metrics schema change is part of this decision.
