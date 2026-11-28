# Run: fix-bun-project-preload (2026-11-27)

Shipped in bundle v2.62.0.

- [Reconciliation](../pitches/fix-bun-project-preload/SHIPPED.md)
- [Log](../pitches/fix-bun-project-preload/log.md), [pitch](../pitches/fix-bun-project-preload/pitch.md), [plan](../pitches/fix-bun-project-preload/plan.md) and [deviations](../pitches/fix-bun-project-preload/deviations.md)
- Audits: [bug-fix, two cycles](../pitches/fix-bun-project-preload/audit.md) and [re-shaped fix](../pitches/fix-bun-project-preload/audit-reshape.md)
- [Hill rows](2026-11-27-fix-bun-project-preload-hill.md)

The log stays in the pitch folder and is linked, not copied.

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts` after the ship records: exit 0; 2,562 tests, 2,560 pass, 2 skipped, 0 fail. Setup validator, knowledge graph, process relations, workflow doctor and diff sanity passed. No build, typecheck, lint or i18n command exists.

The changelog entry is dated 2026-11-28 because the changelog tool uses UTC; the ship happened on 2026-11-27 local time.

## For /cooldown

- Probes that were too narrow let a route through three times (wildcard path mappings, macros, the doctor's other children).
- Worker output needed coordinator repair twice: tests that did not exercise the stated case, and a rewrite that dropped security warnings.
- `/shape` classified a skill-text change as having no AI-prompt scope; the behavior cases were written only at `/audit`.
