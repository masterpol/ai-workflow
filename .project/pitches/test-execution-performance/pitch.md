# Pitch: test-execution-performance

**Date**: 2026-10-20 • **Appetite**: small-batch (≤5 files / ≤400 LOC / ≤1 day)
**Stack**: Node/Bun tooling

## Problem

Growing tests delay feedback. Inconsistent commands miss hidden hook tests and undermine runtime comparisons.

## Knowledge consulted

See [research.md](research.md): subprocess revalidation, independently runnable fixtures, testing/performance rules, and project conventions.

## Solution sketch

**Places:** test command, behavior tests, testing guide, VERSION/CHANGELOG.
**Affordances:** full discovery or explicit files; runtime/workers; timing and exit status.
**Connections:** select files, launch through existing runtime dependencies, preserve failures, record timing. Full mode covers `ai-framework/` and `.claude/hooks/` (70 files); targeted runs are visibly partial.

Compare Node default/4 workers/cache and Bun default/4 isolated workers. Require three uncontended full runs preserving cases/outcomes before promoting settings. Target ≥20% lower median per runtime; report a no-go if unproven. Keep full delivery verification. Sample gains do not establish full-suite gains.

## Rabbit holes

- **Resolved:** file/test concurrency differ; shared environment mutations preclude blanket concurrency. Both runtimes catch failing nested assertions despite different counts.
- **Plan owner:** idle baseline, fixed snapshot, effective child runtime, case parity, supported Bun flags; refuse unsupported settings.
- **Plan owner:** measure cache gains; disable cache for precise coverage.

## No-gos

No assertion removal, added skips/retries, shortened deadlines, global isolation removal, automatic dependency selection, runtime-default changes, test-matrix rewrites, CI sharding, verification integration, or model behavior changes.

## Bet decision

**Bet** (2026-10-21), recorded when the plan was approved. Non-AI small-batch: critique not required. Plan: [plan.md](plan.md).
