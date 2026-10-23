# Deviations: test-execution-performance

| Scope | Planned | Shipped | Why |
|-------|---------|---------|-----|
| S1 | Worker cap derived from an injected CPU count | Fixed cap `MAX_WORKERS = 64` | `OsDeps` has no CPU count; adding one would touch runtime adapters, a no-go. The cap only refuses absurd values. |
| S1 | Full suite is 70 files | 74 existing + the new test = 75 | Other pitches added tests since research; discovery is dynamic so the count is informational. |
