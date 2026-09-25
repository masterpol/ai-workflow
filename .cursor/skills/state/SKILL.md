---
name: state
description: Report what this project is and where it stands — workflow version, pitches, knowledge, skills, token metrics, database — as an evidence-backed snapshot that separates observed facts from proposals and unconfigured areas. Trigger phrases include "project state", "state report", and "/state".
---

# State

> **Recommended capability profile:** `fast` — reads a generated snapshot and reports it; no judgment beyond keeping observed and proposed apart.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

`ai-framework/scripts/state-snapshot.js` (facts) and `ai-framework/scripts/state-render.js` (HTML
report) do the mechanical work. This playbook is how to run it
and how to report it without overstating anything. Full contract:
`ai-framework/integrations/state-report.md`.

## Step 1 — Preview

```sh
node ai-framework/scripts/state-snapshot.js
```

Read-only. Prints how many facts were observed, proposed, stale, unavailable, or unconfigured and
whether anything would be written. Add `--json` for the full snapshot.

## Step 2 — Write the snapshot (only if the user wants it kept)

```sh
node ai-framework/scripts/state-snapshot.js --apply
```

Writes `.project/reports/state.json` atomically (generated files in `.project/reports/` are git-ignored derived
output). Rerunning with no change reports `unchanged`.

## Step 3 — Render the HTML report (only if the user wants it)

```sh
node ai-framework/scripts/state-render.js            # preview: theme used, whether the page would change
node ai-framework/scripts/state-render.js --apply    # write .project/reports/state.html and theme.json
```

Renders the `state.json` from Step 2 (run that first) into one self-contained page: no scripts, no
external loads, all project text escaped, links only to real project files. The theme is
rediscovered from the project's own CSS custom properties on every run; report any `changed:`
line and any fallback the output names (a low-contrast pair, an `oklch()` value, a rejected
value) — those are the project's stylesheet problems, not the report's. `themeMode: "fallback"`
in `.project/reports/settings.json` (`{ "schemaVersion": 1, "themeMode": "auto" | "fallback" }`)
forces the documented fallback theme; that file survives every bundle sync.

## Step 4 — Report

Summarize from the snapshot, in this order: workflow (installed version, sync attention), project
(what it is), pitches (active / shipped / compacted), knowledge and skills, token metrics,
database. Hold to these rules — they are the point of the command:

- **Status decides wording.** `observed` is stated as fact. `proposed` is "proposed, not decided".
  `unconfigured` is "not set up". `stale` says why. `unavailable` gives the note's reason — never
  fill the gap with a guess.
- **The database is `unconfigured` unless the snapshot shows checked-in schema, and even then say
  only "schema files exist"** — the collector never connects, so a live deployment is never claimed.
- **Token metrics are as complete as the snapshot says.** Report `partial` as partial, with the
  reported/total counts; never present a total as if every vendor reported.
- **Cite the evidence path** for any fact the user may want to verify.
- **`.project/status.md` and `.project/runs/` stay the lifecycle authority.** If the snapshot
  flags a pitch directory that `status.md` does not list, say so; do not edit `status.md` from
  here.

## What this skill never touches

Secret-bearing files (`.env*`, `credentials.json`, `settings.local.json`), session transcripts,
any database or network, and anything outside `.project/reports/` for writes, and never runs a script from the project's own
stylesheets — CSS is only ever parsed as text. It does not
compact pitches — `/pitch-compress` does, and it does not call this command.
