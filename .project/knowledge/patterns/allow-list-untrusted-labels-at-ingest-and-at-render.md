---
id: allow-list-untrusted-labels-at-ingest-and-at-render
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [security, untrusted-input, markdown, reports]
related: [resolve-config-only-from-trusted-root, a-gate-must-not-trust-its-own-author, async-agent-launch-hook-counted-as-completion]
source: metrics-report-dimensions
---

# Pattern: Allow-list untrusted labels at ingest, and again at the place they are rendered

## Summary

A length bound and an HTML escape are not enough for text that comes from a hook payload and ends
up in a generated report. Markdown links, images, control characters and look-alike characters
survive both. Restrict names to identifier characters when they are recorded (anything else is
stored as `(other)`), and restrict again at the place a label is rendered, because some strings
(opaque ids) are deliberately stored unrestricted and can still reach the page.

## The Pattern

```js
const SAFE = /^[\w.:/@+-]+$/;          // ASCII identifier characters only (no `u` flag)
const name = (v) => (typeof v === "string" && v.trim() && SAFE.test(v.trim().slice(0, 80)) ? v.trim().slice(0, 80) : v ? "(other)" : null);
// renderer: a label taken from an id-shaped field goes through the same check
const label = (v) => (typeof v === "string" && SAFE.test(v) ? v : "(other)");
```

- Fold rejected values into one bucket so the report stays truthful about how many there were.
- Ids can stay verbatim in a machine-readable file if they are length-bounded, but any
  human-readable label built from one must be re-checked at render time.
- Keep a test per field that feeds an unsafe value through the real entry point (CLI or plugin) and
  greps every generated file.

## What happened

The first fix bounded names to 80 characters and allow-listed them. The audit's own re-check then
found that the report's "current completion" row falls back to the agent **id** when there is no
agent type, and ids were only truncated: an id of `[click](https://evil.example/x)` rendered as live
link syntax. Fixed at the renderer. The reviewer that would have re-checked it failed three times,
so the check ran as the author's own script and is recorded as such.

## When to Use

Any generated Markdown or HTML that includes text from a hook payload, a plugin event, a fetched
package, or a user.

## When NOT to Use

Free-text fields whose whole purpose is to show the text (there the content is escaped and clearly
labelled as quoted, not allow-listed).

## Examples in Codebase

`ai-framework/hooks/scripts/token-consumption.js` (`boundedName`, `boundedId`) and
`ai-framework/hooks/scripts/token-report.js` (`safeLabel`, `mdCell`); tests
`names outside the identifier allow-list…` and `an unsafe agent id is never shown as a label…`.

## Related Patterns

[[resolve-config-only-from-trusted-root]], [[a-gate-must-not-trust-its-own-author]].
