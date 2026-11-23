# Hill chart: orca-api-currency-and-opencode2

Updated: 2026-11-23 (/plan). Position: uphill = still figuring it out, downhill = executing. All scopes start at `uphill 0%`.

| Scope | Name | Status | Hill | Blocker |
|-------|------|--------|------|---------|
| P0 | Settle the base branch | done | downhill 100% | — |
| R1a | Contract snapshot + doctor check | done, coordinator-verified | downhill 100% | — |
| R2 | Capability-based preflight | done, coordinator-verified | downhill 100% | — |
| R5a | Agent-id config key + resolver | done, coordinator-verified | downhill 100% | — |
| R1b | Docs: contract check | done, coordinator-verified | downhill 100% | — |
| R3 | Caller diagnostics | done, coordinator-verified | downhill 100% | — |
| R4a | Ledger requestId + digest | done, coordinator-verified | downhill 100% | — |
| S3 | Authorized real-launch capture | done (evidence in s3-capture.md) | downhill 100% | — |
| R4b-1 | Timeout bound + refusal request-id capture | done, coordinator-verified | downhill 100% | — |
| S3c | Timeout capture | done (evidence in s3-capture.md) | downhill 100% | — |
| S3b | Success-path capture | done (evidence in s3-capture.md) | downhill 100% | — |
| R4b-2 | Settlement via request-show | dropped (S3c: timeout receipt carries the id; no replay needed) | — | — |
| R5b-1 | Gate probes launched id + fallback | done, coordinator-verified (187 pass) | downhill 100% | — |
| R5b-2 | Dispatch passes resolved id; gate checks installed list | done, coordinator-verified (184 pass) | downhill 100% | — |
| R5c | Golden case executes | done, coordinator-verified | downhill 100% | — |
