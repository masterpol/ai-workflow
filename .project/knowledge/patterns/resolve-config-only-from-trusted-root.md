---
id: resolve-config-only-from-trusted-root
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [security, subprocess, untrusted-content]
related: [dual-hash-tracking-for-transformed-content]
source: portable-skill-installation
---

# Pattern: When invoking a tool over untrusted content, resolve its config only from a trusted root

## Summary

Running a third-party binary (a formatter, linter, compiler) over content that was just fetched
from an untrusted source is common. The binary itself often auto-discovers its own config by
walking up from the target file — if the untrusted content can place a file that looks like
that config (or a plugin the config references), it can potentially steer the tool's own
behavior. The fix isn't to sandbox the binary; it's to never let discovery start from anywhere
the untrusted content controls.

## The Pattern

```js
// Discover config ONLY from the trusted root — never from the untrusted content's own directory.
function discoverFormatter(trustedRoot) {
  const configPath = CONFIG_NAMES.map((name) => path.join(trustedRoot, name)).find(fs.existsSync);
  // ...
  return configPath ? { bin, configPath } : null;
}

// Invoke with an EXPLICIT --config pointing at the trusted path, disabling the tool's own
// upward auto-discovery entirely — untrusted content can never be walked past to find it.
execFileSync(formatter.bin, ["--config", formatter.configPath, "--write", ...targets]);
```

Two things make this a complete mitigation rather than a partial one:
1. The config path variable must be assigned exactly once, from the trusted root, before the
   untrusted content is ever touched — not merged, overridden, or "preferred" against anything
   found near the content being processed.
2. Prefer a tool flag that explicitly disables the tool's own cascading discovery (most
   formatters' `--config` does this) over hoping the tool "just happens" to prefer an explicit
   flag over what it would find on its own — verify this is actually the tool's documented
   behavior, don't assume it.

## When to Use

- Any time a subprocess formats, lints, compiles, or otherwise processes content fetched from
  an untrusted source (a third-party package, an installed plugin/skill, a user upload).

## When NOT to Use

- If the tool has no config-discovery mechanism at all (pure stdin/stdout transform with only
  CLI flags), there's nothing to pin — this pattern doesn't apply.

## Examples in Codebase

- `ai-framework/scripts/skill-sync.js` (`discoverFormatter`/`formatFiles`) — Prettier's
  `--config` always resolves from the receiving project's own root, never from the fetched
  skill's package content, even if that content contains a same-named config file. Covered by
  a spy-based regression test in `skill-sync.test.js` that asserts the `--config` argument
  actually passed to the binary.

## Related Patterns

- [[dual-hash-tracking-for-transformed-content]] — the companion pattern for tracking what the
  trusted-config-pinned transform actually produced.
