# Deviations: orca-engines-range

| # | Plan said | Reality | Why |
|---|-----------|---------|-----|
| d1 | `registerEngineValidator("orca", …)` calls `parseRange` | `config.mts` calls `parseRange` directly in the Orca block | A registered validator is optional third-party hook; the built-in check must always run. The hook is unchanged. |
| d2 | Invalid range → distinct `engine-range-invalid` launch reason | Config validation now reports it first, so gate and start show `policy-malformed`. `engine-range-invalid` stays as defence in depth in `engineRange`/preflight/gate/start (unit-tested via `engineRange`) | Fail-closed either way; the exact range error is in doctor's "Config validators" detail. |
| d3 | Doctor warns on a bare-version (exact pin) engine | Not done | A bare version is a legitimate pin; documented in `orca-vendors.md` instead. |
| d4 | Test helper `orcaPolicyToonText` unchanged | Its engine is now `">=1.4.224"` | Keeps TOON and legacy-file start decisions byte-identical (default range text). |
| d5 | Migrator unchanged apart from default | Added `SAFE_RANGE` so range characters can be written | `scalar()` rejected `>`/`=`. |
