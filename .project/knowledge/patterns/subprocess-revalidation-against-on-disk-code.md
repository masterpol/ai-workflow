---
id: subprocess-revalidation-against-on-disk-code
type: pattern
created: 2026-09-25
updated: 2026-09-25
tags: [sync, migration, schema-versioning, subprocess]
related: [dual-hash-tracking-for-transformed-content]
source: portable-skill-installation
---

# Pattern: Re-validate a just-synced contract as a subprocess, not an in-process require

## Summary

A long-running process that both (a) writes new versions of its own modules to disk (a sync,
an update, a migration) and (b) needs to validate state against the CURRENT contract those
modules define has a problem: `require()` is cached. Once a module is loaded, writing a new
version of that file to disk does not change what the running process sees — validating
"in-process" after step (a) silently validates against the stale, pre-sync code, defeating the
whole point of checking "does this still work with what we just installed?"

## The Pattern

Spawn the validation as a **subprocess** of the current, on-disk entry point, after the sync's
own file writes have completed:

```js
// After bundle-sync.js's own apply loop has written any new files, including possibly a newer
// version of skill-sync.js itself:
const result = execFileSync(process.execPath, [path.join(root, "ai-framework/scripts/skill-sync.js"), "reconcile", "--json", ...(apply ? ["--apply"] : [])], { cwd: root });
```

This guarantees the check runs against exactly what is now on disk — including a schema or
contract that this very sync just changed — rather than the orchestrating process's already-
loaded (pre-sync) module. It also composes cleanly: the sync tool doesn't need to know anything
about the internals of what it's validating, just that a script exists and returns structured
JSON.

## When to Use

- A tool that updates its own codebase (or a codebase it depends on) and then needs to check
  compatibility/consistency against the NEW version of that code, in the same run.
- Any "detect incompatible versions immediately after a partial update" requirement — surfacing
  the problem now, rather than leaving it to blow up unexpectedly on the next unrelated
  invocation.

## When NOT to Use

- If the validating code and the code being validated never change together in the same
  operation, an in-process call is simpler and avoids subprocess overhead.
- Don't reach for this to avoid a real circular dependency between two modules that are
  genuinely meant to import each other — restructure the dependency instead (see this pitch's
  own `skill-sync.js`, which calls `skill-registry.js`/`skill-vendors.js` directly rather than
  re-entering `add-skill.js`'s `run()`, specifically to avoid `add-skill.js` ↔ `skill-sync.js`
  becoming circular — that's a design fix, not something a subprocess should paper over).

## Examples in Codebase

- `ai-framework/scripts/bundle-sync.js` — runs `skill-sync.js reconcile` as a subprocess after
  its own apply loop, so a sync that updates `skill-registry.js`'s schema validation is checked
  with the new code immediately, not the pre-sync in-memory version.

## Related Patterns

- [[dual-hash-tracking-for-transformed-content]] — often shows up in the same kind of
  fetch/sync pipeline.
