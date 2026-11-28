---
id: a-parse-check-can-run-the-code-it-reads
type: pattern
confidence: low
created: 2026-11-27
updated: 2026-11-27
tags: [security, bun, parsing, trust-boundary, untrusted-input]
related: [a-report-over-an-untrusted-tree-runs-only-bundle-code, bun-runs-a-project-preload-before-any-workflow-script, resolve-config-only-from-trusted-root]
source: fix-bun-project-preload
---

# Pattern: parse untrusted source only with an engine that cannot evaluate it

## Summary
A syntax check is not automatically read-only. Bun macros run while Bun parses a file.

## What happened
Two checks parsed project TypeScript under Bun: `bun build --no-bundle` and `Bun.Transpiler`. Both ran a project's macro, and the setup validator
still reported the file as parsed. `--no-macros` stopped the build in a probe and did not stop the transpiler.

## How to apply
- Prefer removing the evaluating engine over adding flags to it. Here the checks parse only on Node, by type stripping, which ran nothing in marker tests.
- When no safe parser is available, report a separate "not parse-checked" warning. Never count those files as parsed.
- Test with a marker the parser would execute, and add a control showing the marker can run.
- Finding another trusted interpreter is its own problem (`PATH`, symlinks, wrappers). Skipping with a warning may be safer than searching.

## Related
[[a-report-over-an-untrusted-tree-runs-only-bundle-code]], [[bun-runs-a-project-preload-before-any-workflow-script]].
