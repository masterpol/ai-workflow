---
id: the-ship-command-is-ship-pitch-and-the-phase-stays-ship
type: decision
status: accepted
created: 2026-11-25
updated: 2026-11-25
tags: [commands, skills, upgrade, bundle-sync]
related: [a-workflow-command-can-be-shadowed-by-a-host-built-in, prove-ownership-by-shipped-content-before-removing-a-renamed-file]
alternatives: [rename-the-phase-too, keep-a-ship-alias, require-prune-for-old-files]
applies-to: [ship, bundle-sync]
source: rename-ship-command-to-finish
---

# Decision: the command a person types is `ship-pitch`; the phase keeps the name `ship`

## Summary
A host's built-in `/ship` shadowed the workflow command. Only the command was renamed (the owner chose `ship-pitch` over `finish`).

## Decision
- The phase id stays `ship` wherever it is data: `--phase ship`, metrics values, `SHIPPED.md`, `records/shipped/`, `4-ship.md`, `pre-ship-verify.mts`.
- No `ship` alias. History is not rewritten.
- `bundle-sync --apply` removes the old adapters without `--prune`, only when their content is one this bundle shipped and the source has the renamed
  skill (owner approval, amending "only under `--prune`", because leftovers failed an upgraded project's doctor and graph).

## Limits (kept)
- A customized `ship` skill in an installed project is never deleted. What the close-out does, and its gate, did not change.
- Never replace the word "ship" blindly; only command forms.
- Left out: a general check of every workflow command against host built-ins, and renaming other commands that may collide.
