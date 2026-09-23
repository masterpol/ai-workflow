---
name: changelog
description: Record a version-log entry in this bundle's VERSION and CHANGELOG.md whenever a structural improvement is added (new/changed skill, agent, rule, script, template, or hook).
---

# Changelog

Run `node ai-framework/scripts/changelog.js` from the bundle root. Read-only mode: `--check`.
Write mode requires `--bump`, `--category`, and `--summary`. See
`.claude/skills/changelog/SKILL.md` for the full flag reference and when to invoke it.
