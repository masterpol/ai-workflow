# Run: orca-engines-range (2026-10-16)

Small-batch, shipped as v2.26.0 on branch `feat/unified-toon-config`. Full records: `.project/pitches/orca-engines-range/` (pitch, plan, hill, deviations, audit, SHIPPED).

- /plan: Orca start hook blocked first (`worker-identity-unavailable`: `worker-list` output 265 KB over the 256 KiB cap, followup already filed); re-invoked and the hook then reported ready. 4 scopes, no dispatch.
- /build: S1 semver-range + npm fixtures; S2 wiring in preflight/gate/start; S3 config/doctor/migrator; S4 docs + changelog. Deviations d1-d5.
- /audit: 1 cycle, reviewers sonnet/sonnet/haiku on a scratch copy with a planted canary (caught 3/3); hardening of `versionDetail`, +4 coverage gaps fixed.
- Verify: Node 1560 tests / 1558 pass / 0 fail / 2 skipped; setup-validator READY; graphify CLEAN.
