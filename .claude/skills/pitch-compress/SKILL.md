---
name: pitch-compress
description: Compact a shipped pitch's full history into durable knowledge and a compact done-work record, with a coverage ledger, an immutable recovery archive, and transactional deletion. Trigger phrases include "pitch compress" and "/pitch-compress".
---

# Pitch Compress

> **Recommended capability profile:** `standard` — bounded extraction and coverage judgment against an existing pitch record, not open-ended architecture.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

`ai-framework/scripts/pitch-compress.js` (inventory, coverage ledger, `done-work.md`) and
`ai-framework/scripts/pitch-archive.js` (recovery archive, transactional deletion, restore) do
the mechanical work. This playbook is what decides *what* gets extracted and confirms the
ledger is actually complete before anything is ever deleted.

## The one rule this whole skill exists to enforce

`CLAUDE.md` says never rewrite historical records under `.project/pitches/`. This skill is the
single, narrow, human-approved exception — and only stays an exception, not a violation, by
never skipping a step: extract → commit a complete ledger → archive and verify → human approves
the specific preview → only then delete. Every mutating step requires `--apply`. Nothing here is
ever automatic.

## Step 1 — Inventory

```sh
node ai-framework/scripts/pitch-compress.js inventory [--json]
```

Lists every pitch under `.project/pitches/` (excluding `_templates/`, `_archive/`, `_parked/`).
Only a pitch with a `SHIPPED.md` is **eligible**. Everything else — active, parked, no
`SHIPPED.md`, or a hill chart still showing open scopes — is **preserved**, with the specific
reason. Present the full list to the human; do not silently narrow it. A pitch whose directory
is already gone (compacted in a prior run) reports `already compacted` from `done-work.md`.

## Step 2 — Build the coverage ledger (real extraction work, not a script)

```sh
node ai-framework/scripts/pitch-compress.js ledger <slug> [--json]
```

This mechanically lists every **required** section for the chosen pitch: every `##` heading in
`SHIPPED.md`, every entry under `pitch.md`'s No-gos and Rabbit holes, every `audit-cycle-*.md`
file, every non-empty section of `deviations.md`/`log.md`. That list is what must be accounted
for — it is not itself the extraction.

Read every required section and do the actual extraction, exactly as `/ship`'s knowledge
extraction already works:
- Genuinely reusable lessons → `.project/knowledge/patterns/*.md` or `.project/knowledge/issues/*.md`,
  with a real `id`, `tags`, and at least one `related`/`[[wiki-link]]`. Run
  `node ai-framework/scripts/graphify.js --check` before committing the ledger — a new entry
  that fails validation must fail the ledger commit too, not pass silently.
- Decisions, negative constraints, and requirements worth remembering but not "patterns" →
  `.project/knowledge/decisions/*.md` or the appropriate requirements/records location.
- A short, honest summary of what shipped → goes into `done-work.md` in Step 3.
- Anything genuinely not worth preserving (e.g. a resolved false-positive audit finding) → mark
  it a `gap` in the ledger with a one-line reason, not silently dropped from the ledger.

Write the mapping as JSON (`{"sections":[{"source":"...","status":"extracted"|"gap","destination":"path"|null,"reason":"..."}]}`)
and commit it:

```sh
node ai-framework/scripts/pitch-compress.js commit-ledger <slug> --file <ledger.json> --apply
```

This **mechanically** validates: every required section is present in the mapping, every
non-gap destination file actually exists, every gap has a reason, and `graphify.js --check`
still passes. It writes the verified ledger to `.project/compaction/ledgers/<slug>.json` and
reports coverage. Every destination must be a real, nonempty file inside the project and
**outside** the pitch being compacted (anything inside it is deleted with it, so it proves
nothing). A `gap` you declare in the mapping is not an accepted gap: commit fails with
`Unaccepted gap(s)` until a human has reviewed each one and it is passed explicitly —
`--accept-gap "SHIPPED.md#some-section=why this is safe to drop"`, repeatable, one per gap. The
acceptance is recorded in the ledger, shown at the Step 5 gate, and re-checked by `remove`
(a ledger with an unaccepted gap never opens the deletion gate, even if hand-placed). A summary
claiming "everything extracted" is never sufficient by itself; the ledger is the proof.

## Step 3 — Write done-work.md

```sh
node ai-framework/scripts/pitch-compress.js write-done-work <slug> --summary <summary.md> --apply
```

Writes (or, on a rerun, replaces only) this pitch's own section in `.project/done-work.md`: a
short agent-written summary, `[[wiki-link]]`s to the knowledge entries this pitch produced, and
pointers to the recovery archive (once Step 4 creates it) and the untouched
`.project/runs/<date>-<slug>.md` ship-time log. Never hand-edit `done-work.md` directly —
regenerated the same way `graph.json`/`CHANGELOG.md` already are.

## Step 4 — Archive (recovery, before anything is removed)

```sh
node ai-framework/scripts/pitch-archive.js archive <slug> --apply
node ai-framework/scripts/pitch-archive.js verify <slug>
```

Writes `.project/compaction/archives/<slug>-<date>/` — a byte-for-byte copy of the pitch
directory plus a checksummed manifest, **outside** `.project/pitches/` entirely. `verify`
re-hashes everything. Do not proceed to Step 5 unless `verify` passes clean.

## Step 5 — Gate

Present to the human, per this project's confirmation-gate rule — **Approve / Revise / Back /
Stop**: the ledger's coverage and any accepted gaps, the archive location and verification
result, and the exact list of files `remove` would delete. This is the one point where a human
must explicitly say yes to a deletion — never proceed past it without that approval.

## Step 6 — Remove (only after approval)

```sh
node ai-framework/scripts/pitch-archive.js remove <slug> --apply
```

Refuses unless the source content still matches what was archived (a concurrent edit since
Step 4 is a conflict, not a silent overwrite), the committed ledger has coverage `1.0`
(including accepted gaps), and `--apply` is passed. Uses the same transaction/recovery machinery
`add-skill` already relies on, so an interrupted removal is recoverable, not corrupting.

## Restore

```sh
node ai-framework/scripts/pitch-archive.js restore <slug> [--to /absolute/path] --apply
```

Reproduces the original pitch directory byte-for-byte from its verified archive. Refuses to
overwrite an existing directory without `--force`.

## What this skill never touches

`.project/pitches/_archive/` (a separate, pre-existing lifecycle state), `.project/design/`, any
pitch without `SHIPPED.md`, `.project/runs/`'s ship-time logs, or `.project/knowledge/graph.json`/
`index.md` (regenerated by `graphify.js`, never hand-written or copied here). This skill never
invokes `/state` and does not wait on it. After a removal you may run `/state` (snapshot, then
render) so the report reflects the compacted pitch — compacted pitches appear from `done-work.md`
— but that is a separate, explicit step the human chooses.
