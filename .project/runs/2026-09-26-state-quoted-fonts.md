# Ship record — state-quoted-fonts

**Date:** 2026-09-26
**Approval:** User selected “1” to ship the two completed fixes.

Font discovery accepts bounded quoted families and one same-file custom-property hop, then re-emits canonical values and revalidates them at rendering.

S1 is done. Independent audit has no unresolved findings for this pitch. Combined pre-gate verification: 285 passed, zero failures, one unrelated Linux-only skip. Affected sync/HTML/snapshot suites rerun at closure. Workflow validation and diff checks pass.

Reconciliation: .project/pitches/state-quoted-fonts/SHIPPED.md. Behavior/mutation evidence: log.md. Knowledge: decisions/effective-sync-bases-and-bounded-font-discovery. No new followup. No Git commit or external publication.
