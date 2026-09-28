---
id: a-report-over-an-untrusted-tree-runs-only-bundle-code
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [security, untrusted-input, reports, symlinks, redos]
related: [subprocess-revalidation-against-on-disk-code, resolve-config-only-from-trusted-root, resolve-before-matching-a-protected-path-allowlist, parse-untrusted-values-and-re-emit-them]
source: project-state-report
---

# Pattern: a read-only report over a project tree treats the tree as data, never as code

## Summary

A command that describes a project ("what is here, what state is it in") reads files the project's
authors control. Its safety is a short list of rules applied at one reader, not per call site.

## The Pattern

1. **Execute only the bundle's own code.** If the report needs another script, resolve it from the
   running script's directory (`__dirname`), never from the analyzed project. A project that ships its
   own `skill-sync.js` must not get it run by `/state`.
2. **One reader for every source.** It refuses symlinks, non-regular files (a FIFO blocks forever),
   paths whose realpath leaves the project, and files over a size bound. Directory listings need the
   same check: `readSource` covering files does not cover `readdir` on a symlinked `.project/runs`.
3. **Bound input before any regex, and again after any transformation that can grow it.** Unicode
   NFKC turns one character into up to 18. Prefer linear regexes (`[^<>]+` not `[^>]+`, `[ \t]*` not
   `\s*`) and cap the source (64 KB for markdown, 8 KB into the scrubber).
4. **Never copy error text.** Keep the error code; messages carry absolute paths and file fragments.
5. **Scrub is a second layer.** Keyword and provider-token patterns, then bound to the field length.
   Say in the docs that it is best-effort; the real protection is the fixed source allowlist.
6. **Terminal output strips control characters** (project-controlled strings reach `console.log`).
7. **Atomic, exclusive writes** through the shared symlink-refusing resolver: temp file with `wx` and
   a random suffix, then rename.
8. **Failure isolation per section.** One unreadable or oversized source marks only its own section
   `unavailable` with a reason.

## What happened

Four of these were found by audit, not by the plan: the project-script execution (found while
building), the quadratic regexes (60 KB → 1 s, a 1 MB file would have taken minutes), symlinked
directories, and terminal escapes from a recorded theme file. The NFKC amplification was found by
the last re-check of the fix for the previous one.

## When to Use

`/state`, any inventory, doctor, or validator that a user runs over a project they did not write.

## When NOT to Use

Tools that are explicitly meant to run project code (a build, a test runner, the project's own
`graphify.js` during a human-approved compaction).

## Examples in Codebase

`ai-framework/scripts/state-snapshot.js` (`readSource`, `readMarkdown`, `failure`, `printable`,
`writeAtomic`, `makeScrubber`); `ai-framework/scripts/pitch-compress.js` (`readText`).

## Related Patterns

[[subprocess-revalidation-against-on-disk-code]], [[resolve-config-only-from-trusted-root]],
[[resolve-before-matching-a-protected-path-allowlist]], [[parse-untrusted-values-and-re-emit-them]].
