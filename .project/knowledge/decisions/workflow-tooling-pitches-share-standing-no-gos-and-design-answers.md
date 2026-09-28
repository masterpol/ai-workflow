---
id: workflow-tooling-pitches-share-standing-no-gos-and-design-answers
type: decision
created: 2026-09-25
updated: 2026-09-25
tags: [workflow, tooling, no-gos, installer, bundle-sync, architecture]
related: [resolve-config-only-from-trusted-root, subprocess-revalidation-against-on-disk-code, dual-hash-tracking-for-transformed-content, a-gate-must-not-trust-its-own-author, macos-tmpdir-realpath-alias-breaks-path-assertions]
source: portable-skill-installation
---

# Decision: workflow-tooling pitches share the same no-gos, and the installer's design answers stand

## Summary

The five workflow-tooling pitches shipped on 2026-09-25 (installation, defaults, compaction, metrics, state
report) were bet with the same three no-gos and rabbit-hole answers. Recording them once keeps the
constraints alive after each pitch's history is compacted.

## Context

`portable-skill-installation` was the first of the ordered set; its `pitch.md` fixed the constraints the
later pitches inherited and its `deviations.md` recorded the design choices the rest of the skill stack
builds on. Compacting the pitch removes those files, so what still matters is kept here.

## Decision

Standing no-gos for workflow-tooling pitches:
- No application implementation and no decisions on La Salle infrastructure.
- No silent override of instance customization, no automatic historical deletion, no invented token
  savings, and no secrets in reports.
- No installation or deletion during shaping.

Standing rabbit-hole answers:
- Instance data stays local; only portable machinery and defaults sync (`.project/skills/` registry,
  packages, and modes are outside every `bundle-sync` synced directory).
- The planner pins upstream contracts, counts every mirror and test, and splits the pitch if the appetite
  is exceeded.
- The implementer defines transaction and recovery boundaries and host capability tests before any
  mutation code exists.

Design choices from the installer that later work relies on (details in `ai-framework/integrations/skills.md`):
- Skills are fetched as exact Git objects, never a checkout, so filters and hooks never run; an
  ambiguous upstream (several variants of one name) aborts until `--path` selects one, and the choice is
  persisted for updates.
- Cursor mirrors are produced by `skill-vendors.js cursor-mirrors` (a script, so it is testable); it
  creates only missing files and reports differing ones.
- `bundle-sync` runs `skill-sync.js reconcile` as a subprocess so a sync that updates the reconciler
  validates against the just-applied code ([[subprocess-revalidation-against-on-disk-code]]).
- Formatting is Prettier-only, discovered from the receiving project, with config resolved only from the
  trusted project root ([[resolve-config-only-from-trusted-root]]) and dual hashes for ownership
  ([[dual-hash-tracking-for-transformed-content]]).
- Deferred by decision: the ancestor-symlink TOCTOU race in `resolveFile` (needs a co-resident writer);
  tracked in `.project/pitches/_followups.md` and the `path-safety-hardening` candidate.

## Consequences

- **Pros**: the constraints survive compaction; new workflow pitches can be checked against one entry.
- **Cons**: an entry that summarizes five pitches can drift from a pitch that later relaxes a no-go.
- **Implications**: a pitch that relaxes any no-go here must say so explicitly and update this entry
  ([[a-gate-must-not-trust-its-own-author]]).

## References

- Skill stack docs: `ai-framework/integrations/skills.md`; playbook `.claude/skills/add-skill/SKILL.md`.
- Test-suite gotcha met twice while building it: [[macos-tmpdir-realpath-alias-breaks-path-assertions]].
