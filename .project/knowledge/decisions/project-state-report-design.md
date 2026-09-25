---
id: project-state-report-design
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [state-report, html, theme, snapshot, design]
related: [parse-untrusted-values-and-re-emit-them, a-report-over-an-untrusted-tree-runs-only-bundle-code, hardening-a-shared-reader-made-its-writer-destructive, workflow-tooling-pitches-share-standing-no-gos-and-design-answers]
source: project-state-report
---

# Decision: how `/state` builds its snapshot and themed HTML report

## Summary

`/state` writes `.project/reports/state.json` and a self-contained `state.html`. Contract:
`ai-framework/integrations/state-report.md`. Code: `state-snapshot.js`, `state-theme.js`, `state-render.js`.

## Decision

- **Facts carry a status** (observed, proposed, stale, unavailable, unconfigured) and evidence paths;
  `.project/status.md` and `.project/runs/` stay the lifecycle authorities and the report never edits them.
- **Contrast fallback is per group** (text, accent, subdued), not per pair, because pairs share tokens; if the
  assembled mode still fails, the whole mode falls back. The plan's "per-pair" wording was wrong.
- **`theme.json` is a record only**: the theme is recomputed from the stylesheets every run and the record is
  compared just to report `changed:`; reusing an editable file would be an injection path.
- **`state-render.js` reads `state.json` from disk** so the untrusted-input path is the one users hit.
- **Quoted font names are rejected** (reject, do not sanitize). Cost: `'Inter', sans-serif` and `var(--font-x)`
  fall back to the default font (followup `state-quoted-fonts`).
- **`/state` runs only the bundle's own `skill-sync.js`**, never one supplied by the analyzed project
  ([[a-report-over-an-untrusted-tree-runs-only-bundle-code]]); `pitch-compress.js` was hardened against
  symlink, FIFO and oversize records because `/state` reuses its `inventory()`, and that hardening caused and
  then fixed a `write-done-work` regression ([[hardening-a-shared-reader-made-its-writer-destructive]]).
- **Theme values are parsed and re-emitted**, never copied ([[parse-untrusted-values-and-re-emit-them]]).
- **Built while building (test-caught):** evidence cited for a file that did not exist; accessibility labels
  pointing at ids that did not exist; `partial` theme reported for a fully themed project; the reports README
  ignored by git would fail the doctor scaffold check on a fresh clone. All fixed with tests.
- **Vendors:** Claude Code and OpenCode verified live; Codex and Cursor entry points are unverified in a running
  host. About 40 tests beyond the exit criteria were added for audit findings.

## Consequences

- **Pros**: a report whose every claim cites evidence and whose HTML is inert.
- **Cons**: the scrub is best-effort; themes with quoted fonts or `var()` fall back.
- **Implications**: `/pitch-compress` does not call `/state`; compacted pitches appear from `done-work.md`.

## References

`ai-framework/integrations/state-report.md`; [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].
