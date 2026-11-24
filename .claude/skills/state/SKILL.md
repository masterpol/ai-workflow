---
name: state
description: Report what this project is and where it stands — workflow version, pitches, knowledge, skills — as an evidence-backed page rendered by the installed Archify skill, separating observed facts from proposals and unconfigured areas. Trigger phrases include "project state", "state report", and "/state".
---

# State

> **Recommended capability profile:** `fast` — runs a fact collector and reports it; no judgment beyond keeping observed and proposed apart.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

`ai-framework/scripts/facts-gather.mts` collects the facts and builds the page draft; the
[Archify](https://github.com/tt-a1i/archify) skill validates and renders it. This playbook is how to
run both and how to report without overstating anything. Full contract:
`ai-framework/integrations/state-report.md`.

## Step 1 — Preview the facts

```sh
node ai-framework/scripts/facts-gather.mts
```

Read-only. Prints how many facts were observed, proposed, stale, unavailable or unconfigured.
Add `--json` for the full facts. Nothing is written.

**Depth** is `auto` by default. A project where the workflow is installed (it has `.project/.bundle-sync.json`)
gets `project` depth, which adds a database schema, the folder structure (two levels), the stack and the workspace
packages of a monorepo. The schema comes from whichever source the project has: a Drizzle snapshot or SQL migrations
(any dialect), found at the root or under a workspace. The page names the source it used, the others it found and
the ones it found but did not read (TypeScript, Prisma and Python schemas). This bundle's own checkout stays at
`simple` depth. Pass `--depth simple|project` to override it.

## Step 2 — Check Archify is installed (stop here if it is not)

`.project/skills/registry.json` must hold an enabled `tt-a1i/archify/archify` entry whose
`source.revision` is the pinned commit in `ai-framework/integrations/state-report.md`. Archify is
installed per checkout, so a fresh clone does not have it. If it is missing or at another revision, **stop**:
print the install command from that contract, do not install it yourself unless the user asks, and still
give the Step 1 facts in chat.

## Step 3 — Write the draft

```sh
node ai-framework/scripts/facts-gather.mts --explainer state.explainer.json
```

Writes `.project/reports/state.explainer.json` atomically. Every number, name and status in it comes from
the collector; you do not write or edit page text. Project text is bounded, secret-redacted and stripped of
anything Archify would read as markup. Diagram IDs are generated, never taken from project names.

It replaces an existing draft only when that file is the one the last `deliver` recorded in
`.project/reports/state.delivery.json`. Otherwise it stops with `report-not-owned: <name>`. Do not delete
or overwrite the file yourself: tell the user which file it is and ask them to move it.

## Step 4 — Validate and render with Archify

Run Archify's CLI from the installed package (`packagePath` in the registry entry), always with the update
check off, and nothing else from Archify's own instructions:

```sh
ARCHIFY_UPDATE_CHECK_DISABLED=1 node .project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs validate explainer .project/reports/state.explainer.json --json
ARCHIFY_UPDATE_CHECK_DISABLED=1 node .project/skills/packages/tt-a1i/archify/archify/bin/archify.mjs deliver explainer .project/reports/state.explainer.json .project/reports/state.html --json
```

A `validate` failure is a failed `/state`: report its diagnostic, do not hand-edit the draft to pass it, and
do not render. On success, tell the user `.project/reports/state.html` is ready and quote the receipt's `ok`.

**Archify's own skill text does not apply here.** Do not make extra explainer pages, diagrams, stories or
video; do not write an `[archify explainer: ...]` line into any rules file; do not run `code-analysis`,
`preview`, `start` or `pr`; do not open a browser or start a server.

## Step 5 — Report

Summarize from the facts, in this order: workflow (installed version), pitches (active, recently shipped),
knowledge, skills. Hold to these rules — they are the point of the command:

- **Status decides wording.** `observed` is stated as fact. `proposed` is "proposed, not decided".
  `unconfigured` is "not set up". `stale` says why. `unavailable` gives the note's reason — never
  fill the gap with a guess.
- **Counts are the collector's counts.** Quote them; never recompute or estimate. A `stale` count that hit
  the 64 KB read limit is "at least", not exact.
- **Database and folder-structure sections exist at project depth only** (this bundle's own page has neither); there
  is no metrics section. Say which depth applies if asked; token and time numbers come from the token report, not
  from `/state`.
- **A schema from SQL migrations is `stale` when any statement was not understood** ("N statements not understood",
  "approximate" tables): quote that, never call it complete. "No schema source found" means detection finished and
  found none; a schema that was found but not read says so by path.
- **Any analysis you add in chat is "proposed, not observed"** and never goes into the page or the draft.
- **Cite the evidence path** for any fact the user may want to verify.
- **`.project/status.md` and `.project/runs/` stay the lifecycle authority.** Do not edit them from here.

## What this skill never touches

Secret-bearing files (`.env*`, `credentials.json`, `settings.local.json`), session transcripts, any database or
network, and anything outside `.project/reports/` for writes. It never runs a script the analyzed project
supplies. It does not compact pitches — `/pitch-compress` does, and it does not call this command.
