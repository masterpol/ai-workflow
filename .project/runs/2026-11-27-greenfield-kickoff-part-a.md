# Run: greenfield-kickoff, part A (2026-11-27)

Shipped in bundle v2.60.0. The pitch stays open for part B, so its full log stays live and is linked, not copied.

- [Reconciliation](../pitches/04-greenfield-kickoff/SHIPPED-part-a.md)
- [Build log](../pitches/04-greenfield-kickoff/log.md) and [deviations](../pitches/04-greenfield-kickoff/deviations.md)
- [Audit](../pitches/04-greenfield-kickoff/audit.md)
- [Hill rows](2026-11-27-greenfield-kickoff-part-a-hill.md)

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0: 2,517 tests, 2,514 pass, 3 skipped, 0 fail. Setup validator, knowledge graph, process relations, workflow doctor and diff sanity passed. `git diff --check` is clean. No build, typecheck, lint or i18n command exists.
