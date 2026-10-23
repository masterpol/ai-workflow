---
slug: native-safety-feasibility
shipped: 2026-09-27
schemaVersion: 1
---
# native-safety-feasibility

A scratch-only spike measured directory-relative and inode-anchored primitives on one macOS host.
It changed no production code and does not certify other platforms.
Assurance limits and the date discrepancy remain separately recorded.

- outcome: Scratch measurements informed the inode-anchoring decision without changing the runtime contract.
- docs: none
- decisions: [inode anchoring and stable inode locks](.project/knowledge/decisions/inode-anchoring-and-stable-inode-locks.md)
- knowledge: none
- code: none
- verification: [historical closure](.project/records/pitch-compression/native-safety-feasibility.md)
- followups: [assurance limits](.project/records/legacy-upgrades/native-safety-feasibility.md#assurance-limits)
- archive: [compact record](.project/records/pitch-compression/native-safety-feasibility.md), [source supplement](.project/records/legacy-upgrades/native-safety-feasibility.md)
