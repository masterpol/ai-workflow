# Reports

Derived output of `/state`. Nothing here is a source of truth and nothing here is committed
(generated files here are git-ignored): `.project/status.md` and `.project/runs/` remain the
lifecycle authorities, and every fact in a report cites the file it came from.

## Structure

```
reports/
├── README.md
├── state.explainer.json   # /state: the draft built from facts by facts-gather.mts
└── state.html             # /state: the page Archify renders from that draft
```

Regenerate any time (see `ai-framework/integrations/state-report.md`):
`node ai-framework/scripts/facts-gather.mts --explainer state.explainer.json`, then Archify `validate` and
`deliver`. Everything here is safe to delete. Files left by the previous `/state` (`state.json`, `index.html`,
`theme.json`, `settings.json`, `fragments/`) are not read any more and are never deleted for you.
