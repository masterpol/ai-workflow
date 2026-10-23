# Audit record: code (cycle 1, workflow-usage-state)

independent: yes
canary: caught
read-only: verified by review-bench guard check (repo unchanged across the dispatch) and a scratch copy outside the project
prompt-sha256: 098d2f30cb8d45e5834fa8a2d84f28620abf8de81f6dc23261ca0546a16b293e
model: sonnet
cross-file interactions: reviewed

Prompt: `audit-prompts/code.txt`. Canary: the pending-TTL comparison inverted in the scratch copy, caught at `workflow-metrics-state.mts:356` (canary line 356), `review-bench canary-check` = caught.

| ID | Severity | File | Issue | verified |
|----|----------|------|-------|----------|
| C1 | must-fix | workflow-metrics-state.mts:356 | TTL comparison inverted, deletes agent starts younger than 6 h | refuted: planted canary, scratch copy only; repo line 356 uses `>` and the TTL tests pass |
| C2 | should-fix | workflow-metrics-state.mts:685 | `captureDropped` add sat outside the `try` that restores the marker, so a counter overflow lost the marker | verified, fixed (add moved inside the `try`; test "a counter overflow while consuming the marker restores it" and a mutant that moves it back) |
| C3 | acknowledged | recordDroppedCapture / takeDroppedMarker | a writer that opened the marker before the rename appends its byte to the consumed file, which is then unlinked | verified by reading; the count is documented as "at least" |

Checklist: interval fold PASS; LRU fold conservation in both stores PASS (70-pitch probe on a patched copy); supersede and eviction FAIL only on the canary; `validState` against the writers PASS; counter overflow PASS except C2; untrusted JSON PASS; no-gos PASS; migration and report PASS; escaping PASS. The reviewer did not open the four rule files (it mapped them from the contract) and read the test files only in part.
