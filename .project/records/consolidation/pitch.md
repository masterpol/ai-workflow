# Pitch: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/pitch.md` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


**Date**: 2026-10-21  •  **Appetite**: epic as briefed (≈25–35 files with mirrors) → decompose into 5 pitches (P1, P2a, P2b, P3a, P3b), each within big-batch (see Critique findings; the P1–P3 breadboard below groups them)
**Stack**: workflow tooling (TypeScript `.mts` scripts, skills, agents, templates, 4 vendor mirrors)

Evidence, measurements, destination matrix and scenarios A–H: `shaping-evidence.md`.

## Problem

An agent starting `/ship` cannot find, through the graph, which agents, rules and docs that phase depends on, and
after a pitch ships its useful outcome is either stranded in a 350 KB pitch folder or flattened into a growing
narrative (`done-work.md`: 78.9 KB, entries up to 7.3 KB). Future agents cannot learn how the project works now,
why, and which rules apply without reopening a pitch.

## Knowledge consulted

- decisions/`pitch-compaction-gate-and-recovery-design` — the deletion gate, `--apply`, accepted gaps: keep, extend.
- decisions/`project-state-report-design` — `/state` separates observed/proposed; history must not read as current.
- decisions/`workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — standing no-gos apply; it is itself
  inherited-no-go content, a sign decisions need a `status`/scope field.
- patterns `a-gate-must-not-trust-its-own-author`, `subprocess-revalidation-against-on-disk-code` — extraction judged
  by the author needs mechanical checks; validators run against on-disk code.
- rules `canonical-mirror-sync`, `machine-data-format` (TOON), `context-management`, `tool-use` (search, don't bulk-load).

Verified: not an indexing or staleness problem. Skill, agent, rule and phase files have 0 outbound doc edges; the 44
isolated nodes are all `.opencode` adapters. 18/35 compaction ledgers "extract" sections into `done-work.md` itself.

## Solution sketch (breadboard)

**P1 `connected-process-graph`** (big-batch). Places: `graphify.mts` overlay, new `ai-framework/workflow/relations.toon`,
`--check`. Ops: read manifest (declared `phase-doc`, `dispatches`, `reads`, `writes`) → derive `mirrors` and doc→doc
path-reference edges → add to `links` → validate (targets exist, every canonical file has an edge or
`standalone: reason`, adapters have `mirrors`). Each edge type names the query that uses it.

**P2 `durable-consolidation-core`** (big-batch). Places: `/ship` (new final "Consolidate" activity), `pitch-compress.mts`
ledger v2, templates (decision `status`/`supersedes`, outcome record), `.project/records/shipped/<slug>.md`,
`product.md`/`architecture.md`/contract docs, generated `done-work.md` index. Ops: reconcile → classify each source section
(`behavior|decision|know-how|rule|limit|omit`) → write to its single owner (edit in place, merge-first) → commit ledger v2
(`helps` line per kept item, closed omission reasons, size budgets) → outcome record (links only) → graph rebuild/check →
ship gate shows coverage, omissions by reason, doc/decision diffs. Rules reach `ai-framework/rules/` only via `/cooldown`.

**P3 `retire-and-report`** (big-batch). Places: `pitch-archive.mts`, `state-history.mts`/`state-snapshot.mts`,
`/pitch-compress` skill, `/cooldown`. Ops: retirement state file (`extracted→ledger→archived→verified→approved→removed`,
idempotent resume) → surviving-reference scan → remove behind the existing human gate → `/state` sources capabilities,
decisions (accepted vs superseded), rules and history from durable records, one row per slug, archives never read.
Then backfill 9 uncompacted shipped pitches one per run (small first, `token-time-report` as the big-batch proof).

Order: P1 independent; P2 → P3. Legacy 37 `done-work` entries stay readable as `legacy` while P2a ships (dual-read). **Amended 2026-10-21 (human, /plan Revise): all already-compacted pitches (46 at `b26b45b`) are upgraded by P2c; see Amendment.**

## Rabbit holes

**Resolved here**
- Frontmatter vs manifest for relations → one `relations.toon` (4-vendor mirrors + frontmatter invariant test make frontmatter costly).
- New `history/` folder? → no; extend `.project/records/` (`shipped/`); `done-work.md` becomes a generated index.
- In `/ship` or after? → inside `/ship` (required, ledger gates the close); deletion stays a separate approval.
- Where do decisions live? → `.project/knowledge/decisions/`; add status fields; drop the empty `design/decisions/` reference.

**Pushed to /plan as risk** (owner: planner)
- Ledger v2 dual-read with 35 v1 ledgers and `state-history.mts` parsers (bounded-parse security rule §9).
- How `.project/decisions/*.md` (TOON grammars) join the single ADR home without breaking `machine-data-format`.
- Size-budget numbers (record cap, new-entry default) — calibrate on `test-execution-performance` and `token-time-report`.
- Installed-project migration: `setup`, `setup-validator`, `bundle-sync` and templates carry schema, not instance records.
- Anti-gaming: `helps` lines and omission reasons are author-written; keep the human sample at the gate.

**Pushed to no-go**: automated quality scoring of extracted text. ~~migrating the 37 legacy entries wholesale~~ — lifted by the 2026-10-21 Amendment: upgrade is required, but still one pitch per run behind a human gate, never a bulk rewrite.

## No-gos

- ✗ No implementation or pitch deletion in this phase; no deletion ever without the existing archive-verify-approve gate.
- ✗ No edges added only to remove isolated nodes; no tag-overlap linking.
- ✗ No new top-level history folder; no second source of truth for behavior, decisions or rules.
- ✗ No automatic rule creation by consolidation; `/cooldown` approval stays.
- ✗ No routine reads of recovery archives by retrieval or `/state`.
- ✗ No rewriting of `_archive/`, `.project/design/`, or existing archives; standing workflow-tooling no-gos apply.
- ✗ No application-specific content (La Salle) in this repo.

## Critique findings

Ran knowledge-historian, skeptic, appetite-auditor (cross-pitch-projector skipped: no other active pitch). Advisory; the
historian judged relevance from titles and greps, so re-read its entries at /plan.

| ID | Sev | Finding | Addition to the pitch |
|---|---|---|---|
| A2/A3 | high | P2 ≈21 files/2100 LOC, P3 ≈17/1700 vs cap 15/1500; P1 ≈10/1200 fits | **Split into 5**: P1 `connected-process-graph`; P2a `consolidation-schemas` (ledger v2 dual-read, decision status, record template, generated index, setup-validator; no `/ship` change); P2b `ship-consolidate-step` (`/ship` + `/pitch-compress` skills, product/architecture docs, proof on `test-execution-performance`); P3a `retire-safely` (reference scan, retirement state, per-slug lock); P3b `state-from-records`. Order: P1 ∥; P2a → P2b → P3a; P3b after P2a. Backfill of 9 pitches = individual `/pitch-compress` runs, not a pitch |
| S1 | high | Derived doc→doc edges would flood (56 prose mentions of one phase path in 30 files, fenced examples, 4 mirror copies) | P1 derives edges only from resolved, existing, non-fenced paths, to the canonical file never a mirror; edge-count budget and before/after query-precision check per edge type; resolved in P1, not /plan |
| S2 | high | Slug-keyed readers outlive the folder (`state-snapshot` pitches/compacted, `flowRows`, metrics, `runs/`, `status.md`); scan covers only the path | P3a/b: inventory of every slug-keyed reader; scan also bare slugs and `pitches/X` fragments; acceptance: removing a fixture pitch leaves `/state` and token-time reports stable |
| S3, K2, K4 | high | State file location/lock/hash; journal recovery gap; replay path that skipped the gate | State file outside the pitch, per-slug lock (cf. `metrics-lock.mts`), content-hash conflict check, version-gated parser, one compaction transaction context (no second journal); a resumed run re-runs verify and approval, never trusts saved state |
| K1 | high | Ledger binds to section keys, not content; extra files never required; destinations may be another pitch's file (`_followups.md` "Ledger required-set design") | Ledger v2 stores a per-section body hash and an "other files" entry; refuses destinations under `.project/pitches/`; decided in P2a |
| K3, K5 | high | Hardening a shared reader made its writer destructive; editing a canonical alone breaks mirror byte-identity | Test that a reader change cannot make the writer delete; P1 reuses the existing mirror byte-identity check; "single owner" gets a contract test |
| S-extra | med | `setup-validator` and 3 `bundle-sync` tests hardcode the `done-work` shape; state-pages/render also mention archives | Generated index preserves the 37 legacy entries verbatim and writes only marked sections (`a-report-never-overwrites-a-file-it-did-not-write`); "no archive reads" proven by a repo-wide test; P1 `--check` ≈100 manifest entries is data volume to budget |
| K8, K10, K11 | med | Display bucket ≠ lifecycle identity; TOON grammar decision governs `relations.toon` and `.project/decisions`; schema bump left 98 stale tests | Key `/state` rows on retirement state; follow `data-files-use-their-own-toon-grammar-...`; plan lists tests/migrators carrying the old versions |

Counts in the evidence file (189 sections, 18/35 ledgers) are to be asserted by a script at plan time so the baseline cannot drift.

## Bet decision

**Bet** (human Approve, 2026-10-21): P1 `connected-process-graph` and P2a `consolidation-schemas`, which may run in parallel.
P2b, P3a and P3b stay un-bet; each is bet in order (P2a → P2b → P3a; P3b after P2a) after its predecessor ships.
Critique findings were addressed by the 5-way split and the additions above, not merely acknowledged.
Nothing was implemented or deleted during shaping.

## Amendment (2026-10-21, human at /plan Revise)

Two requirements added after planning found the baseline had drifted (46 compacted pitches, 0 uncompacted):

1. **P2c `legacy-upgrade`** (new, big-batch tooling + a campaign of per-pitch runs): every currently compacted pitch gets the new
   treatment (ledger v2, outcome record, generated-index line, legacy `done-work` narrative retired). Replaces M3 "legacy stays legacy".
   Boundaries kept: one pitch per run, human gate per pitch (batches of ≤5 at most), no deletion of archives or ledgers (v1 ledger kept as a sibling),
   archive reads only when explicitly approved and logged (not "routine" retrieval).
2. **P2d `installed-sync`** (new, big-batch): a sync strategy so projects that installed this workflow get P1/P2a/P2c safely. `bundle-sync` still never
   writes `.project/`; it names next steps; a project-side migration tool does the instance work; relations manifest gets a project-local overlay.

Bet status: P1 and P2a stay bet. P2c and P2d are added at the human's request; their ordering is in `plan.md`. P2b, P3a, P3b remain un-bet.

