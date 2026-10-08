# Reports

Derived output of `/state`. Nothing here is a source of truth and nothing here is committed
(generated files here are git-ignored): `.project/status.md` and `.project/runs/` remain the
lifecycle authorities, and every fact in a report cites the file it came from.

## Structure

```
reports/
├── README.md
├── state.json      # /state: schema-v1 snapshot; each fact is { value, status, evidence[], note? }
├── state.html      # /state: full single-page report rendered from state.json
├── index.html      # /state: overview with links to the pages below
├── structure.html  # /state: folder diagram by project type, with related decisions
├── skills.html     # /state: base skills versus project skills
├── metrics.html    # /state: token metrics, links to the full metrics reports
├── knowledge.html  # /state: knowledge counts, links to the knowledge graph
├── pitches.html    # /state: active, shipped and compacted pitches
├── theme.json      # /state: theme used and the SHA-256 of each stylesheet it came from
└── settings.json   # optional, yours: { "schemaVersion": 1, "themeMode": "auto" | "fallback" }
```

Regenerate any time with `node ai-framework/scripts/state-snapshot.mts --apply` then
`node ai-framework/scripts/state-render.mts --apply`. Everything except `settings.json` is safe to delete. A leftover `.state-stage` directory (from a crashed
render) blocks the next `--apply` until you remove it.
