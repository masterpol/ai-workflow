---
name: bundle-sync
description: Validate structural drift between an already-unpacked project and a newer copy of the ai-workflow-portable source bundle, and apply approved updates.
---

# Bundle Sync

> **Recommended capability profile:** `standard` — reviewing a structural diff and deciding what to apply requires judgment, not just mechanical diffing.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

Run this **inside a target project that already went through `/setup`** (not inside this
source bundle itself). It fetches `https://github.com/masterpol/ai-workflow.git` at `main` into
a temporary directory and answers "what changed upstream since we installed/last
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
only, never auto-applied** (the `## Response style (caveman mode)` section in `AGENTS.md`/`CLAUDE.md`
arrives this way — merge it by hand; `setup-validator.js` warns while it is missing) — they mix canonical content with this project's own specifics or
locally connected providers. `.project/`, `.claude/settings.json`, `.claude/settings.local.json`,
and any credential file are never read from the source or written to.

## Step 1 — Dry run

```
node ai-framework/scripts/bundle-sync.js [--base-ref <git-ref>]
```

Read-only. Every differing file is compared three ways — local copy, source, and **base** (the
bundle version this project was last synced from) — so project customizations are never
mistaken for stale files:

Use `--source <path-to-ai-workflow-portable-checkout>` only to compare an offline checkout or
an unpublished branch. Use `--repo <https-url>` to compare a different public repository; the
default is the public GitHub repository above.

- **Base** comes from the hash manifest in `.project/.bundle-sync.json`, written by every
  `--apply`. On a project's **first** sync there is no manifest yet: pass `--base-ref` with the
  source-repo commit or tag that was originally unpacked (check the source's `CHANGELOG.md` /
  `git log`, or ask the human). Without a base, differing files are reported as `unverified` and
  are not overwritten.

Statuses:
- **new** — added upstream; applied.
- **changed** — local copy equals base, upstream moved; applied. Case-only renames
  (`skill.md` → `SKILL.md`) are handled here.
- **local** — the project edited it and upstream did not; **kept**.
- **conflict** — both edited; **kept**. Merge by hand: take the upstream file and re-apply the
  project's edit, then keep its Cursor mirror identical to the canonical file.
- **unverified** — no base known; kept unless `--overwrite-unverified`.
- **removed** — gone upstream, tagged `unmodified` / `modified` / `unverified` versus base.
  Files owned by this project's skill registry (installed with `/add-skill`, tracked in
  `.project/skills/registry.json`) never appear here — they were never part of the canonical
  bundle, so they are excluded from the comparison entirely rather than misread as removed.
- **flagged** — `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.codex/config.toml`: always manual.

Every dry run and apply also reports a **skill registry** section (from
`ai-framework/scripts/skill-sync.js reconcile`, covered by this same approval — never a second
gate): each installed skill's vendor coverage is checked against whatever vendor descriptors and
wrapper template are now on disk. `current`/`clean` needs nothing; `needs-reconciliation` means a
project vendor (existing or newly registered) is missing that skill's adapter and `--apply` will
render it — package content is never re-fetched or reformatted, only vendor wrapper files;
`conflict` means an owned file was edited locally or a target collides with something unowned,
and that skill is left untouched; `incompatible`/`coverage-unresolved`/`pending-transaction`
block the whole registry until resolved (an unsupported schema, an unregistered vendor layout, or
an interrupted `add-skill` transaction — run `add-skill recover` first). Global skill registries
are never read or touched by a project sync.

If the source bundle has a `CHANGELOG.md`, read the entries newer than the manifest's
`sourceVersion` to explain *why* files changed, not just that they did.

### Next steps (what a sync cannot do for the project)

Every dry run and apply ends with a **NEXT STEPS** list, computed from the source being synced.
These are instance-owned files or choices bundle-sync deliberately never writes, so they are
named instead of left for the next doctor run to fail on:

1. **Missing scaffold files** (a template added in this bundle version, e.g. `.project/done-work.md`):
   `node ai-framework/scripts/workflow-doctor.js --fix` — restores missing files only.
2. **Entry files** (`AGENTS.md`/`CLAUDE.md`) lacking the `## Response style (caveman mode)` section:
   copy it from the source `AGENTS.md` by hand (these files are flagged, never auto-applied).
3. **Recommended default skills not installed** (currently `caveman`): the instruction that
   references it now exists in every skill and agent but is inert until it is installed —
   run the printed `/add-skill ...` command. The choice to install stays with the human.

A project synced from an **older** bundle version runs its own older `bundle-sync.js` for that
first apply, which cannot print this list; re-run `bundle-sync.js` once afterwards (now the new
script) to see it. Skills installed with `/add-skill` are instance data on **both** sides: a
target's own installs are never overwritten or pruned, and a source checkout's own installs are
never shipped (keep them untracked — this repo gitignores them — because an older script in a
target has no such protection and would copy a tracked wrapper as an orphan).

## Step 2 — Gate

Present the dry-run summary to the human per this project's confirmation-gate rule —
**Approve / Revise / Back / Stop**. Call out anything in `removed` or `flagged` explicitly;
those need a human decision, not silent application.

## Step 3 — Apply (only after approval)

```
node ai-framework/scripts/bundle-sync.js [--base-ref <ref>] --apply [--prune]
```

Writes `new` and `changed` files; never touches `local`, `conflict`, or `flagged` paths.
`--prune` deletes `removed` files only when they are `unmodified` versus base. Records the
source hashes as the next sync's base in `.project/.bundle-sync.json`. Do this on a branch so the
whole sync is one reviewable diff. On macOS, `git mv -f` any case-only renames afterwards — git
there ignores filename case by default and would otherwise keep the old lowercase name.

After applying, check that `.project/context/stack.md` maps the workflow placeholders
(`<build-command>`, `<typecheck-command>`, `<lint-command>`, `<test-command>`,
`<i18n-check-command>`) to the project's real commands — newer phase docs resolve them there.

## Step 4 — Verify

Run `node ai-framework/scripts/workflow-doctor.js` to confirm the freshly synced files still
form a consistent set of mirrors. Report any doctor failures back to the human before
considering the sync done.
