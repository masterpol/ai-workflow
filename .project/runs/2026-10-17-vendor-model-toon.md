# Run: vendor-model-toon (2026-10-16 → 2026-10-17)

Small-batch, shipped as v2.29.0 on `feat/unified-toon-config` (`df9683d` baseline, `8b9dcba` completion + audit). Records: `.project/pitches/vendor-model-toon/` (pitch, plan, hill, log, audit, SHIPPED).

- /build: S1 baseline (schemaVersion 3, models type + validator, example toon); completion pass added strict validation, `convertV2` migrator, README section after a state check found the baseline incomplete.
- /audit: Orca fan-out (codex x2, opencode x1), canary caught by all; 0 real must-fix; 2 should-fix fixed.
- Verify: Node 1464/1470 (3 pre-existing upgrade.test failures); setup-validator READY; graphify CLEAN.
- Knowledge: pattern `a-version-migrator-edits-the-token-not-the-model`; issue card for the v3 bump ripple already existed (`a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version`).
- Orca: stale OpenCode service killed before dispatch; OpenCode launch with `--model` unsupported, ran on its default.
