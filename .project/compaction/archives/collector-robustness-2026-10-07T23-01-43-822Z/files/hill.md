# Hill chart: Collector robustness

**Initialized**: 2026-09-26

| Scope | Position | Last moved | Notes |
|---|---|---|---|
| S1 | superseded by C2 + C3 | 2026-09-27 | Structured identity kept (D2); pathname-lock reclaim replaced by the kernel lease and its tests retired (D4). |
| C2 | done | 2026-09-27 | `metrics-lock.js` + 11 tests; audit F1 (late accept error dropped the lease) fixed. 1 recorded survivor (late-listen guard). macOS only. |
| C3 | done | 2026-09-27 | Async `recordEvent`, awaited CLI and plugin, legacy-lock skip, README migration; 6-process exact-totals test. |

Files changed (plan cap 9): `metrics-lock.js`, `metrics-lock.test.js`, `token-consumption.js`,
`token-consumption.test.js`, `.opencode/plugins/token-consumption.js`, `opencode-plugin.test.js`,
`token-report.test.js`, `skill-defaults.test.js`, `README.md` = **9 of 9**.
