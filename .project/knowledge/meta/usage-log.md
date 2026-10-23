# Knowledge Usage Log

| Date | Audit | Healthy | Stale | Unused | Promoted |
|------|-------|---------|-------|--------|----------|
| 2026-10-18 | Full | 84/84 | 0 | 0 | 0 |
| 2026-10-21 | Cooldown graph + usage proxy | 112/112 mechanical | 0 | 39 literal-reference proxy | 0 |
| 2026-10-23 | Full | 126/126 mechanical | 0 | 0 outside-knowledge-unreferenced | 0 |

Notes: added `local-eval-data-is-gitignored` (pattern) and seeded `graphify` and
`orca-policy` (entities) per the 2026-10-18 health audit.

October 21: no entry is 60 days old. The 39 reference-proxy misses exclude recovery archives and conceptual references; no unused-entry conclusion or archive action follows. See runs/cooldown-2026-10-21.md.

October 23: graph CLEAN (0 broken links, 0 orphans); newest entry 0 days, oldest 28 days. 9 entries cite repo paths that no longer exist, all retired config or compacted-pitch files cited as history; no removals.
