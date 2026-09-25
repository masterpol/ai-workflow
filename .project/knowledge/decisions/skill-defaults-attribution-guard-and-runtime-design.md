---
id: skill-defaults-attribution-guard-and-runtime-design
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [skills, defaults, caveman, compress-guard, token-metrics, design]
related: [caveman-mode-is-default-everywhere, resolve-before-matching-a-protected-path-allowlist, workflow-tooling-pitches-share-standing-no-gos-and-design-answers]
source: portable-skill-defaults
---

# Decision: how the default-skills machinery attributes, guards, and reports readiness

## Summary

`portable-skill-defaults` shipped a proposal-only catalog, mode precedence, a compress guard, and a browser
readiness report. These are the design answers later work relies on; the code is in `ai-framework/scripts/`
(`skill-defaults.js`, `skill-compress-guard.js`, `browser-runtime.js`) and the behavior is documented in
`ai-framework/integrations/skill-defaults.md`.

## Decision

- **Ground before building.** The four upstream skills were inspected read-only with the installer's own
  `inspect` (no checkout, no execution) before any scope was written. That removed the planned spike on
  `caveman-stats`: the bundle tags only its own `token-consumption.js` records with the active mode and
  never parses another skill's internal hook files.
- **The token-record `mode` field resolves only the instance default** (`caveman.enabled`,
  `caveman.default`), not per-phase overrides: an agent-completion hook has no phase context. Per-phase
  resolution lives only in `skill-defaults.js` `resolveMode()`, which takes a phase argument.
- **The compress guard refuses an empty target** with its own reason string, in addition to the four named
  refusal cases; it resolves the real path and lowercases before matching protected records, and refuses any
  resolution outside the project root ([[resolve-before-matching-a-protected-path-allowlist]]).
- **`browser-runtime.js` is a single-entry report** (`agent-browser` only). It is a global, PATH-resolved CLI,
  not a per-vendor concern like skill wrapper coverage, so no per-vendor breakdown was added and no vendor
  requirement was dropped. It reports readiness and never installs anything.
- **Doctor script list is kept complete:** the doctor's `node --check` list gained `bundle-sync.js`,
  `skill-sync.js`, `skill-defaults.js`, then `skill-compress-guard.js` and `browser-runtime.js` after D2/D3.
- **Catalog entries are proposals**, never auto-installed; a human runs `/add-skill`
  ([[caveman-mode-is-default-everywhere]] records the later decision to make caveman `full` everywhere).

## Consequences

- **Pros**: no dependence on another skill's private file format; guards fail closed.
- **Cons**: `mode` on a token record cannot say which phase produced it.
- **Implications**: any new default skill that wants attribution tags this bundle's own records; a guard that
  matches protected paths must resolve before it compares.

## References

`ai-framework/integrations/skill-defaults.md`; `ai-framework/scripts/skill-compress-guard.js`;
[[workflow-tooling-pitches-share-standing-no-gos-and-design-answers]].
