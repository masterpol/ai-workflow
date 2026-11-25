# Pitch: workspace-slim

**Date**: 2026-11-25  •  **Appetite**: big-batch (about 12 files, under 1500 LOC); **deletes nothing**
**Stack**: workflow tooling (a report-and-compact script, a skill) + ai-prompts

## Problem

Projects that use the workflow keep growing, in files to commit, in repository size and in text an agent may load. A person cannot see what
takes the space or what is safe to shrink, and the existing compaction tools add files while they shrink others.

## What was measured (2026-11-25, tracked files)

| | LAH | RN | climbing-lab-monorepo | this repo |
|---|---|---|---|---|
| `.project/` | 1270 files, 26.9 MB | 314 files, 1.0 MB | 776 files, 5.4 MB | 1568 files, 12.4 MB |
| `graphify-out/graph.json` | **65 MB** | 6.9 MB | 13 MB | 7.5 MB |
| installed skill packages tracked in Git | **624 files, 23 MB** | 0 | 3 | 0 |
| compaction recovery copies | 405 files, 1.7 MB | 93 files | 115 files | **913 files, 6.2 MB** |
| session evidence under `records/` | — | — | **~430 files, 3.5 MB** (JSON, logs, images, CPU profiles) | upgrade records 1.1 MB |
| **knowledge entries** | 98, 302 KB | 136, 171 KB | 58, 118 KB | 149, 320 KB |
| `knowledge/index.md` | 60 KB | 85 KB | 29 KB | 116 KB |
| followups backlog | 42 KB | 13 KB | 16 KB | 80 KB |

**Reading it.** Knowledge is not what makes the projects big: entries are 118–320 KB per project, typically 1–3 KB each. The size comes from
(1) installed packages in Git and in the graph, (2) recovery copies, (3) evidence dumps. Where knowledge costs something is **text to load**:
an index of up to 116 KB and a backlog of up to 80 KB.

**A defect found while measuring, to fix first and separately.** In LAH, **58.9 of 67.5 MB of graph data (87%) comes from
`.project/skills/packages/`**, and the commit-time graph hook rewrites and stages that file on every commit. The bundle's graph ignore list
does not exclude the folder, its `.gitignore` block does not either, and `SETUP.md`'s minimum ignore list omits it. LAH has no ignore rule
for it. 597 of LAH's tracked package files are the Archify package **committed by the assistant on 2026-11-24** with the 2.54.0 update,
against `state-report.md`, which says the package is per-checkout and Git-ignored. (Whether the graph noise changes query answers was not
shown: one test query returned no package results.) Untracking them stops the growth; Git history keeps them unless rewritten.

## Knowledge consulted

- decisions/`workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — recovery defined before mutation code; count every mirror.
- issues/`deleting-a-file-breaks-shipped-outcome-records-that-link-to-it` — removal can break the graph through record links.
- patterns/`prove-ownership-by-shipped-content-before-removing-a-renamed-file`, `pin-the-descriptor-you-hashed-before-removing-or-replacing` — deleting safely.
- patterns/`a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash` — accounting for a folder of many files.
- patterns/`a-gate-must-not-audit-its-own-instrument` — the proof that nothing was lost cannot come from the code that removed it.
- `/pitch-compress`, `/knowledge-health`, `/cooldown` — what exists: per-pitch compaction with a coverage ledger, a read-only health audit, and promotion of issues to rules. None reports a project's size or handles evidence, old archives, the index or the backlog.

## Solution sketch (breadboard)

**Places**: a `slim` skill and its adapters · `slim.mts` (report, backlog move) · `graphify.mts` (the generated index).

**Affordances**
1. **Report** (read-only): files and bytes by area, what is loaded often, and for each area what could be done and by which tool, including
   "installed packages are tracked" and "no supported action yet" for evidence folders and recovery copies. An unrecognised folder is listed
   and asked about, never classified as disposable.
2. **A smaller index.** The entry lines are already one line each. The bulk is the tag index and the diagram: about 85 of 116 KB here and
   43 of 59 KB in LAH. Those two move out of `index.md` (the same data is in `graph.json`), **after every reader of the file is named** and
   the saving is measured before and after.
3. **Backlog:** items already marked resolved move, text unchanged, to a resolved file beside it. Nothing is marked resolved by the tool.
4. **Gate:** the exact diff is shown; **Approve / Revise / Back / Stop**.
5. **Check after applying:** every line removed from the backlog is present in the resolved file; the knowledge entry and rule counts are
   unchanged; the graph, record links and setup validator pass.

**Connections**: `/slim` → report → plan → gate → apply → check.

## Rabbit holes

**Resolved here**
- Remove records, evidence or recovery copies? → **Not in this pitch** (cut at critique): see `workspace-recovery`.
- Shorter entry lines? → No; they are not the bulk.
- Merge or summarise knowledge? → The sibling pitch `knowledge-distill`.

**Pushed to /plan as risk**
- Who reads `index.md` (`/knowledge-health` takes its inventory from it; the doctor and setup validator expect the file).
- What counts as "marked resolved" in a backlog written by hand over months; anything ambiguous stays.
- Is `slim` free as a command in each host?

## No-gos (this pitch)

- ✗ No file with content is deleted; no knowledge entry, decision or rule is edited.
- ✗ No item marked resolved, merged or reworded by the tool.
- ✗ No change before the person approves the diff.
- ✗ No Git history rewrite and no change to recovery archives or their format.

## Evaluation (AI-prompt scope)

Golden cases: `.project/evals/datasets/workspace-slim.json` (specified, none run). Cases about removing files now expect a refusal.
Each is bound to a named test or marked `live-only`.

## Tandem with `knowledge-distill`

Run together (owner, 2026-11-25). Neither deletes content, so neither blocks the other. **`graphify.mts` belongs to this pitch first**: the
index change lands before the sibling adds its marking. One person integrates the shared registration files (doctor list, process graph).

## Order and size

1. **First, separately (small fix):** ignore `.project/skills/packages/` in the graph and `.gitignore` blocks and in `SETUP.md`; warn in the
   doctor when packages are tracked; in LAH, untrack them and rebuild the graph. **This is the largest drop in files and size.**
2. Then this pitch and `knowledge-distill`.
3. Later: `workspace-recovery`.
About 12 files: 4 skill adapters, `slim.mts` and test, `graphify.mts` and test, process-graph entry, doctor list, `/knowledge-health` if it
reads the removed sections, the dataset.

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

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/workspace-slim/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.
