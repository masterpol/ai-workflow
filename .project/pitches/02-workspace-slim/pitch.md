# Pitch: workspace-slim

**Date**: 2026-11-25, re-shaped 2026-11-26  •  **Appetite**: big-batch, small end (about 9 files, under 600 LOC); **deletes nothing**
**Stack**: workflow tooling (a read-only report script, the generated knowledge index)

## Problem

Projects that use the workflow keep growing, and a person cannot see what takes the space, which of it is tracked in Git, or what could
safely be done about it. This repository's `index.md` is 120 KB, three quarters of it data that `graph.json` already holds.

## Knowledge consulted

- decisions/`workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — recovery before mutation; count every mirror.
- patterns/`a-report-over-an-untrusted-tree-runs-only-bundle-code`, `a-report-never-overwrites-a-file-it-did-not-write` — the report.
- issues/`config-defined-git-hooks-ignore-core-hookspath` (**unresolved**) — the report asks Git what is tracked, and `graphify.mts` calls Git.
- issues/`deleting-a-file-breaks-shipped-outcome-records-that-link-to-it`, patterns/`a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash` — why
  removal stays out.
- rules/`security` section 9 — one guarded reader, bounded input, no project program run.

## Solution sketch (breadboard)

**Places**: `workspace-report.mts` (new) and its test · `graphify.mts` (index) · `/knowledge-health` · the docs that describe the index.

**Affordances**
1. **Report** (read-only, run as a script, text or JSON): files and bytes by area; which are tracked; what is generated; for each area what could
   be done and by which tool or pitch, including "installed packages are tracked" and "no supported action yet" (evidence folders, recovery
   copies). An unrecognised folder is listed and asked about, never called disposable. It writes nothing.
2. **Smaller index:** `index.md` keeps the entry lists and counts; the tag index and diagram leave it (same data in `graph.json`). One line
   names where to find them. Size measured before and after.
3. **Readers updated:** `/knowledge-health` takes tags from the graph; the knowledge READMEs and the graph doc stop describing the removed
   sections. The title the doctor and setup validator check stays.

**Connections**: person → report → picks a fix or pitch. `graphify.mts` → smaller `index.md` → readers.

## Rabbit holes

**Resolved here**
- A `/slim` skill, approval and apply step? → **Cut.** With nothing to apply but a generated file, a script is enough.
- Move resolved backlog items? → **Cut:** only 3–13% of backlog text is clearly marked, and more would need the tool to judge.
- Remove records, evidence or recovery copies? → **Not here:** `workspace-recovery`.
- Stop tracking `graph.json`? → **Not here** (followup "Local-only knowledge graph").
- AI-prompt scope? → **No:** no new prompt or skill; `/knowledge-health` only changes where it reads tags. The owner may overrule at the bet.

**Pushed to /plan as risk**
- Every reader of the two sections, by search and tests, including the project template copies.
- How the report asks Git what is tracked without running a project's programs; whether configured hooks fire on that command.
- `graphify.mts` also needs the hook-risk check: fix it first, or name who edits the file first.
- How the report treats very large trees and symlinks (caps, refusals, no following).

**Pushed to no-go** (followups)
- Any action taken by the report.

## No-gos (this pitch)

- ✗ No file with content is deleted or moved; no knowledge entry, decision, rule or backlog item is edited.
- ✗ The report writes nothing and runs nothing from the project it reads.
- ✗ No change to `graph.json`'s data, to Git history or to recovery archives.

## Order

1. **First, separately (`/fix`, not in this pitch):** exclude `.project/skills/packages/` in the graph and `.gitignore` blocks and `SETUP.md`, warn
   when packages are tracked, then untrack them in LAH and rebuild its graph. Expected to be the largest size drop (not measured after).
2. This pitch. Tandem `knowledge-distill` still edits `graphify.mts` after it.
3. Later: `workspace-recovery`.

Files (about 9): report script and test, `graphify.mts` and test, doctor script list, `knowledge-health/SKILL.md`, `docs/knowledge-graph.md`, the
project template's knowledge README, this repository's copy of it.

## Evaluation

No AI-prompt scope, so no golden-case gate. `.project/evals/datasets/workspace-slim.json` stays as written; its report, index-reader,
unknown-folder and knowledge-kept cases become ordinary tests, and `followups-triage` is out of scope.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-11-25 as Orca workers (Run `run_80b5ab62c6c7`) over **both tandem pitches**: skeptic, knowledge-historian, appetite-auditor,
cross-pitch-projector, eval-regression-projector. Raw reports: `critique/`. Two findings re-checked by the coordinator: the index composition
and the ledgers naming knowledge files.

| Findings (slim) | Subject | Disposition |
|---|---|---|
| appetite A1, A3 | about 2,200 LOC against a 1,500 cap | **Addressed**: all deletion and recovery work cut to `workspace-recovery` |
| appetite A4, cross-pitch X5, X6 | the ignore fix is separate; shared registration files; rollout overwrites | **Addressed**: fix listed first and apart; one integrator; rollout noted |
| historian K6 | one-line entries would save little | **Addressed**: retargeted at the tag index and diagram |
| skeptic S1; historian K1–K3; eval E2–E4; cross-pitch X2, X4 | recovery from Git, failed-proof rollback, archive readers | **Moved** to `workspace-recovery` with the findings |
| eval E1; appetite A8 | unbound live-only cases | **Addressed**: every case bound or marked |

## Validation 2026-11-26 (of the 2026-11-25 shape, which led to this re-shape)

| Claim | Today | Holds? |
|---|---|---|
| Ignore fix comes first, separately | **not done**: `.graphifyignore`, `SETUP.md` and the graph's ignore block still omit `.project/skills/packages/`; LAH still tracks 624 package files (23.8 MB) and a 65.1 MB graph | open (followup, high) |
| Sizes | LAH, RN, climbing unchanged. This repo: `.project/` 1618 files, 12.6 MB; recovery copies grew 913 → 1073 files, 6.2 → 7.5 MB | yes |
| Index bulk is tag index and diagram | 88.5 of 120.2 KB (74%) here; removing both leaves about 32 KB | yes |
| The index is text agents load | The one instruction found that tells an agent to read it for work is `/knowledge-health` (inventory counts). Other mentions call it a human catalog; phases are told to query the graph. The setup validator and doctor only need it to exist and start with its title. No test was found asserting the two sections | **weaker than stated** |
| Moving resolved backlog items saves text | Items that open with a resolved marker: 2.9 of 87.2 KB here (3%), RN 11%, climbing 13%, LAH 6% (heading-based resolved sections add 0–2%). A looser reading would mean the tool judging what is resolved, which is a no-go | **no: small gain** |
| `slim` is free as a command | no skill, command or adapter of that name in this repo; host built-ins not checked | partly |
| Golden cases | 6 cases, each bound or `live-only`; none run | yes |

New since shaping: `graphify.mts`, which this pitch changes first, is on the 2026-11-26 high-risk list (configured Git hooks, untested), so a fix
there would come before or with it. The owner also asked about not tracking the graph at all (followup "Local-only knowledge graph").

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-26, owner chose the whole re-shaped scope over the report-only split  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/workspace-slim/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.

Critique was not re-run for the 2026-11-26 re-shape: the scope is a subset of what was critiqued. New since that run: the Git-hook risk.
