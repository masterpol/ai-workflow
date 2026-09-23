---
name: bundle-sync
description: Validate structural drift between an already-unpacked project and a newer copy of the ai-workflow-portable source bundle, and apply approved updates.
---

# Bundle Sync

> **Recommended capability profile:** `standard` — reviewing a structural diff and deciding what to apply requires judgment, not just mechanical diffing.

Run this **inside a target project that already went through `/setup`** (not inside this
source bundle itself), pointing `--source` at a checkout of `ai-workflow-portable` that is
newer than what was unpacked here. It answers "what changed upstream since we installed/last
synced, and should we pull it in?" — a gap `/setup`'s re-run mode doesn't cover, since that
mode only refreshes *generated* content (`.project/context/*`, `.project/rules/*`), not the
bundle's own canonical files (skills, agents, rules, scripts, templates, hooks).

## What it compares

Only the bundle's canonical, "never forked per project" directories (per the source bundle's
own README, "One source, every vendor"):

```
ai-framework/{rules,workflow,contexts,templates,integrations,scripts,hooks}
.claude/{agents,skills,hooks}
.opencode/{commands,agents}
.codex/agents
.agents/skills
.cursor/{agents,skills}
```

`AGENTS.md`, `CLAUDE.md`, `.opencode/opencode.json`, and `.codex/config.toml` are **flagged
only, never auto-applied** — they mix canonical content with this project's own specifics or
locally connected providers. `.project/`, `.claude/settings.json`, `.claude/settings.local.json`,
and any credential file are never read from the source or written to.

## Step 1 — Dry run

```
node ai-framework/scripts/bundle-sync.js --source <path-to-ai-workflow-portable-checkout>
```

Read-only. Reports, grouped by status:
- **new** — exists in source, missing locally (something added upstream since last sync).
- **changed** — exists in both, content differs.
- **removed** — exists locally, gone from source (never auto-deleted — surface it and let the
  human decide whether it was an intentional local addition or something upstream dropped).
- **flagged** — one of the mixed-content root/config files differs; always manual.

If the source bundle has a `CHANGELOG.md`, skim entries newer than what this project last
synced (see `.project/.bundle-sync.json` if present, or ask the human what version they
installed) to explain *why* the flagged files changed, not just that they did.

## Step 2 — Gate

Present the dry-run summary to the human per this project's confirmation-gate rule —
**Approve / Revise / Back / Stop**. Call out anything in `removed` or `flagged` explicitly;
those need a human decision, not silent application.

## Step 3 — Apply (only after approval)

```
node ai-framework/scripts/bundle-sync.js --source <path> --apply
```

Copies every `new` and `changed` file from source into the project, creating directories as
needed. Never touches `removed` or `flagged` paths. Writes a sync marker to
`.project/.bundle-sync.json` (source path, source `VERSION`, timestamp, files applied) when
`.project/` exists, so the next `bundle-sync` run — or a human — can see when this project last
pulled from source.

## Step 4 — Verify

Run `node ai-framework/scripts/workflow-doctor.js` to confirm the freshly synced files still
form a consistent set of mirrors. Report any doctor failures back to the human before
considering the sync done.
