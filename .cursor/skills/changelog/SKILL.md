---
name: changelog
description: Record a version-log entry in this bundle's VERSION and CHANGELOG.md whenever a structural improvement is added (new/changed skill, agent, rule, script, template, or hook).
---

# Changelog

> **Recommended capability profile:** `fast` — deterministic version bump and log entry. Use the paid fast route because the change summary can reference broad project/source content.

Run this in **this repo (`ai-workflow-portable`)**, not in a project that has unpacked the
bundle. It is how the bundle tracks its own history, so `bundle-sync` (run inside target
projects) has a real `VERSION`/`CHANGELOG.md` to diff against.

## When to run it

Any time you finish a change described in README's "How to improve this flow" — a new or
edited rule, subagent, skill, script, template, or hook — run this **after**
`node ai-framework/scripts/workflow-doctor.js` passes, as the last step before considering the
change done. One invocation per logical change, not per file.

## How to run it

```
node ai-framework/scripts/changelog.js --check
```
Read-only: prints the current `VERSION` and the latest `CHANGELOG.md` entry. Use this first to
see what the next bump should build on.

```
node ai-framework/scripts/changelog.js \
  --bump patch|minor|major \
  --category Added|Changed|Fixed|Removed \
  --summary "one short line describing the improvement" \
  [--detail "additional bullet" ...] \
  [--files "path/one,path/two"]
```

Picking `--bump`:
- **patch** — bug fix, doc correction, wording cleanup with no behavior change.
- **minor** — new skill/agent/rule/template, or a backward-compatible change to an existing one
  (this is the common case for this bundle).
- **major** — a breaking structural change: a skill/agent renamed or removed, a directory moved,
  a mirror contract changed in a way that would break an already-unpacked project's copy.

`--files` is optional but worth setting whenever the change touched multiple paths — it feeds
`bundle-sync`'s dry-run report in target projects with a human-readable "what changed" hint
alongside the automatic file diff.

## What it writes

- `VERSION` — a single semver line at the bundle root.
- `CHANGELOG.md` — a new `## [x.y.z] - YYYY-MM-DD` section prepended above prior entries, under
  the declared `--category` heading.

Never hand-edit past `CHANGELOG.md` entries or the `VERSION` file — always go through this
script so the version and log stay consistent with each other.
