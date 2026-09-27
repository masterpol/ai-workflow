# Build evidence

## S1 — 2026-09-26

`node --test ai-framework/scripts/state-html.test.js ai-framework/scripts/state-snapshot.test.js`: 85 tests pass, zero failures. Tests verify canonical quoted families, numeric quoted names, hostile renderer input rejection, same-file one-hop lookup, final declaration order, mode override, cycles, nested references, unresolved/cross-file references and var fallbacks.

`node -e "require('./ai-framework/scripts/state-theme')"` exits 0. An in-memory mutation bypassing the family-name grammar causes the hostile-font test to fail (exit 1). Existing HTML markup/CSP and contrast tests pass.
