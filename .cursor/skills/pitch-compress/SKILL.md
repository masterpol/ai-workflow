---
name: pitch-compress
description: Compact a shipped pitch's full history into durable knowledge and a compact done-work record, with a coverage ledger, an immutable recovery archive, and transactional deletion. Trigger phrases include "pitch compress" and "/pitch-compress".
---

# Pitch Compress

> **Recommended capability profile:** `standard` — bounded extraction and coverage judgment against an existing pitch record, not open-ended architecture.

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.mts resolve-mode --phase utility --args-text "$ARGUMENTS"` (pass the raw, unparsed invocation text — the script extracts a `caveman=<mode>` token if present and ignores everything else; no `caveman=` mention is not an error, it just falls through to the instance/bundle default). If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this skill's other instructions; pass the same resolved mode to any subagent this skill dispatches. If not installed, proceed normally — this is optional, never required.

`ai-framework/scripts/pitch-compress.mts` (inventory, coverage ledger, `done-work.md`) and
`ai-framework/scripts/pitch-archive.mts` (recovery archive, transactional deletion, restore) do
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
node ai-framework/scripts/pitch-compress.mts inventory [--json]
```

Lists every pitch under `.project/pitches/` (excluding `_templates/`, `_archive/`, `_parked/`).
Only a pitch with a `SHIPPED.md` is **eligible**. Everything else — active, parked, no
`SHIPPED.md`, or a hill chart still showing open scopes — is **preserved**, with the specific
reason. Present the full list to the human; do not silently narrow it. A pitch whose directory
is already gone (compacted in a prior run) reports `already compacted` from `done-work.md`.

## Step 2 — Build the coverage ledger (real extraction work, not a script)

```sh
node ai-framework/scripts/pitch-compress.mts ledger <slug> [--json]
```

This mechanically lists every **required** section for the chosen pitch: every `##` heading in
`SHIPPED.md`, every entry under `pitch.md`'s No-gos and Rabbit holes, every `audit-cycle-*.md`
file, every non-empty section of `deviations.md`/`log.md`. That list is what must be accounted
for — it is not itself the extraction.

Read every required section and do the actual extraction, exactly as `/ship`'s knowledge
extraction already works:
- Genuinely reusable lessons → `.project/knowledge/patterns/*.md` or `.project/knowledge/issues/*.md`,
  with a real `id`, `tags`, and at least one `related`/`[[wiki-link]]`. Run
  `node ai-framework/scripts/graphify.mts --check` before committing the ledger — a new entry
  that fails validation must fail the ledger commit too, not pass silently.
- Decisions, negative constraints, and requirements worth remembering but not "patterns" →
  `.project/knowledge/decisions/*.md` or the appropriate requirements/records location.
- A short, honest summary of what shipped → goes into `done-work.md` in Step 3.
- Anything genuinely not worth preserving (e.g. a resolved false-positive audit finding) → mark
  it a `gap` in the ledger with a one-line reason, not silently dropped from the ledger.

Write the mapping as JSON (`{"sections":[{"source":"...","status":"extracted"|"gap","destination":"path"|null,"reason":"..."}]}`)
and commit it:

```sh
node ai-framework/scripts/pitch-compress.mts commit-ledger <slug> --file <ledger.json> --apply
```

This **mechanically** validates: every required section is present in the mapping, every
non-gap destination file actually exists, every gap has a reason, and `graphify.mts --check`
still passes. It writes the verified ledger to `.project/compaction/ledgers/<slug>.json` and
reports coverage. Every destination must be a real, nonempty file inside the project and
**outside** the pitch being compacted (anything inside it is deleted with it, so it proves
nothing). A `gap` you declare in the mapping is not an accepted gap: commit fails with
`Unaccepted gap(s)` until a human has reviewed each one and it is passed explicitly —
`--accept-gap "SHIPPED.md#some-section=why this is safe to drop"`, repeatable, one per gap. The
acceptance is recorded in the ledger, shown at the Step 5 gate, and re-checked by `remove`
(a ledger with an unaccepted gap never opens the deletion gate, even if hand-placed). A summary
claiming "everything extracted" is never sufficient by itself; the ledger is the proof.

### Ledger version 2 (the authoring format)

A mapping with `"schemaVersion": 2` is the format to write; a mapping without one still commits the original version 1 byte for byte, so
existing ledgers and tooling keep working. Version 2 asks for what version 1 let an author skip:

```json
{"schemaVersion": 2,
 "sections": [{"source": "SHIPPED.md#summary", "class": "decision", "disposition": "extracted",
               "destination": ".project/knowledge/decisions/x.md", "helps": "Why X was chosen over Y."},
              {"source": "log.md#a-false-alarm", "class": "omit", "disposition": "omitted", "reason": "resolved-false-positive"}],
 "otherFiles": [{"path": "pitch.md", "disposition": "omitted", "reason": "superseded"}]}
```

- `class` is `behavior | decision | know-how | rule | limit | omit`; `disposition` is `extracted | merged | omitted` and `omit` goes with `omitted`.
- Every kept section needs a `helps` line (what this lets a future agent do) and a real `destination`. A destination under `.project/pitches/` is refused, and
  `behavior` and `decision` content cannot point at `.project/done-work.md` or an outcome record: those only link.
- An omission needs a `reason` from the closed set `duplicate | superseded | process-noise | resolved-false-positive | failed-approach | other`. A
  `failed-approach` also names the destination of its lesson; `other` is a gap and needs `--accept-gap`, exactly as in version 1.
- `otherFiles` accounts for every file in the pitch that no section covers (`pitch.md`, plans, notes, data, a `deviations.md` or `log.md` with no sections). `bodyHash` and file `hash`
  are computed by the tool and stored; one you supply must match the live content, so a judgment made against older text is refused.
- `pitch-archive.mts remove` reads both versions and refuses on any doubt (stale hash, unlisted file, unknown version) before deleting anything.
- A folder of many files (staging, reviewer prompts, snapshots) is accounted for by one **group** entry in `otherFiles`: a `path` ending in `/` (relative to the pitch folder) with a `disposition` and a `reason`, or a `destination` and `helps`. The tool computes the file `count` and a tree `hash` over every member's path and hash, and a `count` or `hash` you supply must match. A file added, dropped, renamed or edited inside the folder invalidates the entry, and `remove` re-checks it. A file belongs to one entry, so a group cannot overlap a single entry or another group. Limits: 200 ledger entries, 2000 files outside the covered sections.
- A destination is judged by what it is, not how it is spelled: a path that resolves (through a symlink, another letter case or a character the disk folds) into a pitch folder, `.project/pitches` or the compaction folder is refused, for version 1 as well as version 2. `SHIPPED.md`, `deviations.md` and `log.md` also appear in `otherFiles` with a whole-file hash, because text outside their sections belongs to no section.

`/ship` is unchanged by this: it does not yet write version 2 or an outcome record. That arrives with the `ship-consolidate-step` pitch.

## Step 3 — Write done-work.md

```sh
node ai-framework/scripts/pitch-compress.mts write-done-work <slug> --summary <summary.md> --apply
```

Writes (or, on a rerun, replaces only) this pitch's own section in `.project/done-work.md`: a
short agent-written summary, `[[wiki-link]]`s to the knowledge entries this pitch produced, and
pointers to the recovery archive (once Step 4 creates it) and the untouched
`.project/runs/<date>-<slug>.md` ship-time log. Never hand-edit `done-work.md` directly —
regenerated the same way `graph.json`/`CHANGELOG.md` already are.

A pitch that has an outcome record (`.project/records/shipped/<slug>.md`, format and lint in `ai-framework/scripts/outcome-record.mts`) is also listed in the generated
index at the top of `done-work.md`: `node ai-framework/scripts/done-work-index.mts --apply` rewrites only that block, never a legacy entry.

## Step 4 — Archive (recovery, before anything is removed)

```sh
node ai-framework/scripts/pitch-archive.mts archive <slug> --apply
node ai-framework/scripts/pitch-archive.mts verify <slug>
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
node ai-framework/scripts/pitch-archive.mts remove <slug> --apply
```

Refuses unless the source content still matches what was archived (a concurrent edit since
Step 4 is a conflict, not a silent overwrite), the committed ledger has coverage `1.0`
(including accepted gaps), and `--apply` is passed. Uses the same transaction/recovery machinery
`add-skill` already relies on, so an interrupted removal is recoverable, not corrupting.

## Restore

```sh
node ai-framework/scripts/pitch-archive.mts restore <slug> [--to /absolute/path] --apply
```

Reproduces the original pitch directory byte-for-byte from its verified archive. Refuses to
overwrite an existing directory without `--force`.

## Keep a pitch small while it is built

A pitch that cannot be compacted usually grew files nothing consumes. Before shipping, keep only what is not derivable:

- A `prepare` draft is never kept: re-run `prepare`. An approved input that is the proposal unwrapped is never kept beside the proposal. A supplement that is already published at its final path is that copy; keep the file only once.
- Keep one result file per batch (preview, evidence and result together). Record each pitch's approved payload hash in it; the upgraded ledger already carries the approval hash.
- Stage campaign files under `.project/compaction/staging/<campaign>/`, not in the pitch folder, and delete them after the batch result is written.
- Snapshot a shared log once. When a pitch ships in several tracks, each track's run holds its reconciliation, its hill rows and a link to the one full snapshot.
- Keep a reviewer's result, not its prompt, unless the prompt changes the result's meaning; a prompt's hash is enough.

If a pitch is still too large, account for the bulk with a group entry above, never by raising a limit.

## What this skill never touches

`.project/pitches/_archive/` (a separate, pre-existing lifecycle state), `.project/design/`, any
pitch without `SHIPPED.md`, `.project/runs/`'s ship-time logs, or `graphify-out/graph.json`/
`index.md` (regenerated by `graphify.mts`, never hand-written or copied here). This skill never
invokes `/state` and does not wait on it. After a removal you may run `/state` (snapshot, then
render) so the report reflects the compacted pitch — compacted pitches appear from `done-work.md`
— but that is a separate, explicit step the human chooses.
