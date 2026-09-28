---
id: parse-untrusted-values-and-re-emit-them
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [security, untrusted-input, css, reports, injection]
related: [allow-list-untrusted-labels-at-ingest-and-at-render, resolve-config-only-from-trusted-root, a-report-over-an-untrusted-tree-runs-only-bundle-code]
source: project-state-report
---

# Pattern: parse an untrusted value against a grammar and re-emit it from the parsed numbers

## Summary

When project-supplied text ends up inside another language (a CSS custom property that becomes part of
a stylesheet), do not sanitize it and do not copy it. Parse it against a strict grammar, reject
anything outside the grammar, and write the output from the parsed result, so no byte of the input
survives. Then validate again at the place it is written.

## The Pattern

- Accept only forms you can fully parse: `#rgb`/`#rrggbb`, `rgb()`, `hsl()` (and shadcn's bare
  `240 10% 4%`), a length with a unit and a bound, an unquoted font-family list of `[A-Za-z0-9 ,_-]`.
- Emit from the numbers: every accepted color becomes `#rrggbb`, so `url(`, `;`, braces, quotes,
  `!important`, and escapes cannot survive because they were never copied.
- Reject, do not sanitize: a value that fails falls back to a documented default and the reason is
  recorded, so the report is honest about what it used.
- Re-validate in the renderer (`safeTheme`) even though discovery already validated: a theme object
  can also arrive from a hand-edited record, and the writer must not trust its caller.
- A recorded file that describes the last run (`theme.json`) is a record only. Recompute from the
  sources every time and compare, instead of reading the record back as input.
- Constraints that cross values (contrast between a text and a background token) are checked on the
  assembled result, not just per token, and fall back at the smallest group that repairs them.

## What happened

Design plan: "per-pair fallback". Implementation: tokens are shared between pairs (a muted foreground
sits on both the muted and the page background), so a single pair cannot be replaced independently;
fallback works per group with a final whole-mode check. Recorded as a deviation. Hostile-value tests,
including values handed straight to the renderer, and a mutation check per guard kept the design honest.

## When to Use

Any generator that puts text from a scanned project, a package, or a payload into CSS, SQL, a shell
command, a URL, or markup.

## When NOT to Use

Values whose purpose is to be displayed as text: escape those at output instead.

## Examples in Codebase

`ai-framework/scripts/state-theme.js` (`parseColor`, `parseLength`, `parseFontFamily`, `safeTheme`,
`assemble`); tests in `ai-framework/scripts/state-html.test.js`.

## Related Patterns

[[allow-list-untrusted-labels-at-ingest-and-at-render]], [[resolve-config-only-from-trusted-root]].
