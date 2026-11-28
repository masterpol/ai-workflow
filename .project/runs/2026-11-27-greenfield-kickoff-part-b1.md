# Run: greenfield-kickoff, part B1 (2026-11-27)

Shipped in bundle v2.61.0. The pitch stays open for part B2, so its full log stays live and is linked, not copied.

- [Reconciliation](../pitches/04-greenfield-kickoff/SHIPPED-part-b1.md)
- [Build log](../pitches/04-greenfield-kickoff/log.md) and [deviations](../pitches/04-greenfield-kickoff/deviations.md)
- [Audit](../pitches/04-greenfield-kickoff/audit-b1.md)
- [Hill rows](2026-11-27-greenfield-kickoff-part-b1-hill.md)

## Final verification

`node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0: 2537 tests, 2534 pass, 3 skipped, 0 fail. Setup validator, knowledge graph, process relations, workflow doctor and diff sanity passed. No build, typecheck, lint or i18n command exists.

The changelog entry is dated 2026-11-28 because the changelog tool uses UTC; the ship happened on 2026-11-27 local time.
