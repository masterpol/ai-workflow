# Reports

Derived output of `/state`. Nothing here is a source of truth and nothing here is committed
(generated files here are git-ignored): `.project/status.md` and `.project/runs/` remain the
lifecycle authorities, and every fact in a report cites the file it came from.

## Structure

```
reports/
├── README.md
├── state.json      # /state: schema-v1 snapshot; each fact is { value, status, evidence[], note? }
├── state.html      # /state: self-contained page rendered from state.json
├── theme.json      # /state: theme used and the SHA-256 of each stylesheet it came from
└── settings.json   # optional, yours: { "schemaVersion": 1, "themeMode": "auto" | "fallback" }
```

Regenerate any time with `node ai-framework/scripts/state-snapshot.js --apply` then
`node ai-framework/scripts/state-render.js --apply`. Everything except `settings.json` is safe to delete.
