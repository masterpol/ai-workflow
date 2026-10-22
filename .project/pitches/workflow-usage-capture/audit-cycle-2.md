# Audit cycle 2 — ship-wrapper routing decision pending

Date: 2026-10-21. The ship playbook returns a failed required verification to audit. Startup returns
ready / launch-allowed; no worker patches await integration. Cycle 1 source reviews remain complete;
no production source changed after that review. This cycle checks the verifier failure and records the
required decision; it does not repeat unchanged reviews or claim an author check is an independent review.

| ID | Tier | Check | Evidence | Disposition |
|----|------|-------|----------|-------------|
| V1 | must-fix gate | pre-ship-verify.mts project-check routing | exit 1: No package.json or Muro document verifier found | explicit documented fallback approval or separate wrapper repair required |

The current bundle intentionally has no root package.json or Muro document verifier. The same wrapper
limitation is already tracked at _followups.md:366,463,473; workflow-usage-state's prior ship records
using the actual stack commands. No temporary package or unrelated application verifier was fabricated.
Actual test/doctor/setup/graph results are in ship-readiness.md when preparation finishes. They do not
turn this wrapper's exit into zero. No version was published, pitch closed or ship status compacted.

The owner may explicitly authorize the existing package-less-bundle fallback and close the release after
reviewing the real verification results, or hold for a durable wrapper fix. A wrapper fix would add scope
outside the 15 implementation files and needs its own review. Until the decision, V1 stays open and the
pitch remains active. The existing cycle cap is three; this is cycle 2 with no implementation patch.


## Final closure — 2026-10-21

The owner explicitly approved the documented package-less verification fallback and closing v2.38.0 with “Approve”. V1 is resolved by that approved exception, not by a wrapper repair: pre-ship-verify.mts still exits 1 because neither package.json nor a Muro verifier exists. The actual repository checks passed: Node 2360 passed / 3 existing skips / 0 failed; Bun 2338 passed / 3 existing skips / 0 failed; release contracts 38 passed; doctor 0 failures; setup READY; graph CLEAN (112 entries, 319 links); privacy marker scan 0 files. The final Node run needs no sanitizer exception. No production source changed after audit.

Release 2.38.0 is shipped locally; all P0/S1–S7 scopes are complete. SHIPPED.md records reconciliation and limits. The status index is compacted; historical pitch, run and audit evidence is preserved. The durable wrapper repair remains in the followups backlog. No tag, push, publication or application rollout is implied. The due cooldown review follows without applying unapproved proposals.
