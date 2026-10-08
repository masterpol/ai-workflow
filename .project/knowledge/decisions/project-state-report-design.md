---
id: project-state-report-design
type: decision
created: 2026-09-25
updated: 2026-09-27
tags: [state-report, html, theme, snapshot, design]
related: [a-report-never-overwrites-a-file-it-did-not-write, parse-untrusted-values-and-re-emit-them, a-report-over-an-untrusted-tree-runs-only-bundle-code, hardening-a-shared-reader-made-its-writer-destructive, workflow-tooling-pitches-share-standing-no-gos-and-design-answers, resolve-before-matching-a-protected-path-allowlist, a-gate-must-not-audit-its-own-instrument]
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

## Independent re-review (`independent-rereview-catch-up`, S3, 2026-09-27)

The code review at this pitch's own build-time audit was shallow (three tool calls, one finding). A later,
dedicated independent re-review (5 dispatches, 2 cycles) found what it missed:

- **`readMarkdown`'s 64 KB cap silently misreported, not just omitted.** A `done-work.md`/`status.md` past
  the cap kept reporting `status:"observed"` on facts that were actually undercounted or wrong (a shipped
  pitch invisible, an actually-listed pitch claimed "not listed"). Fixed: truncation is now flagged and the
  affected facts downgrade to `"stale"` with a note — but only where the specific claim (not just the file)
  is actually uncertain, so a confirmed positive found within the truncated portion stays `"observed"`.
- **`readSettings`/`themeChanges` had the ancestor-symlink bug this project's own pattern doc already named**
  ([[resolve-before-matching-a-protected-path-allowlist]]): they checked only the leaf file's symlink-ness,
  not whether an ancestor directory (`.project` itself) was a symlink — exactly the ordering `readSource`/
  `collect` in the same file already get right. Fixed with a shared `insideProject()` realpath-and-contain
  check.
- **A hostile or hand-edited `state.json` (the documented untrusted-input boundary) crashed the whole render**
  instead of degrading one section: `projectRows`/`pitchTable`/the skills mapping indexed a raw array element
  without the file's own `isFact` shape guard. Fixed by filtering at `list()`, the one place all three
  consume an array.
- Two should-fix items: `safeTheme`'s font branch could overwrite a fallback font with literal `undefined`
  when the key was absent (latent — no production call site triggered it); leaf strings/notes had no length
  bound before `esc()` (one huge value could produce a multi-MB page).
- The five HTML nits this decision's own build never actioned (`lang="en"` hard-coded, no `<time>`, tap-target
  size, `.none` dash noise, no `color-scheme` meta) were triaged: 4 followup, 1 rejected (the stylesheet
  already sets `color-scheme` on `:root`, so the meta tag would be redundant for this single self-contained
  page).

See `review-state.md` and `.project/pitches/independent-rereview-catch-up/audit-cycle-1.md` (which also found
and fixed the same "raw error, absolute path" and ancestor-symlink bug classes in the *review tool itself*,
`review-bench.js` — see [[a-gate-must-not-audit-its-own-instrument]]).

## Multipage report (`state-multipage-report`, 2026-10-08)

`/state` now renders `index`, `structure`, `skills`, `metrics`, `knowledge` and `pitches` pages plus the original `state.html`,
from additive snapshot sections (`structure`, `skills.base`, `skills.project`; `schemaVersion` stays 1). Decisions:
the folder scan lists names only (depth <= 3, <= 500 entries) and reuses `insideProject`; project type comes from names
present, never file contents; pages are written as a set through a pinned staging directory that is also the lock; a
generated page is only replaced when it carries the generator marker (see [[a-report-never-overwrites-a-file-it-did-not-write]]);
graph and metrics pages are linked only when they exist. Audit: 3 cycles, 2 of them through Orca workers; see
[[status-dispatch-ready-false-is-not-launch-authority]] and [[orca-workers-differ-from-the-coordinator-environment]].

## References

`ai-framework/integrations/state-report.md`; [[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]];
[[a-gate-must-not-audit-its-own-instrument]].
