# Hill chart: Collector robustness

**Initialized**: 2026-09-26

| Scope | Position | Last moved | Notes |
|---|---|---|---|
| S1 | superseded by C2 + C3 | 2026-09-27 | Structured identity kept (D2). Its pathname-lock reclaim is replaced by the kernel lease in C2; the reclaim tests were retired with it. |
| C2 | downhill 90% | 2026-09-27 | `metrics-lock.js` + 10 tests (cross-process contention, paused holder, holder death, deadline, squatter port, canonical endpoint, fail-closed errors, release on throw, refused connections, no stray handles). Mutation checks pending in this log. |
| C3 | downhill 90% | 2026-09-27 | Async `recordEvent`; CLI and both plugin callbacks await; legacy-lock skip; README migration. 6-process exact-totals test. Awaiting build gate. |
