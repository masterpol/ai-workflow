# Pitch: knowledge-distill

**Date**: 2026-11-25  •  **Appetite**: big-batch (about 12 files; split trigger below); in tandem with `workspace-slim`; **deletes nothing**
**Stack**: ai-prompts (a condensing skill) + workflow tooling (statement ledger and checks)

## Problem

A project's learnings pile up as many separate entries. Few ever become the short rules an agent can apply, so each phase either loads more
text or misses a lesson. The owner wants the rules and learnings kept, in a compact form, with nothing lost.

## What was measured (2026-11-25)

| | LAH | RN | climbing-lab-monorepo | this repo |
|---|---|---|---|---|
| entries | 98 | 136 | 58 | 149 |
| words (about tokens) | 37,700 (~50k) | 21,600 (~29k) | 15,300 (~20k) | 43,400 (~58k) |
| issues marked resolved | 28 | 48 | 26 | 57 |
| entries ever promoted into a rule | 0 | 0 | 0 | 1 |
| near-duplicate pairs | 0 | **35** | 1 | 0 |

"Near-duplicate" is word overlap of 35% or more, a rough screen: it neither proves two entries mean the same nor finds paraphrases. One RN
entry is 4,344 words and reads like a design document filed as knowledge (from its name and size; its content was not reviewed). Knowledge is
**not** a disk problem. The gain is less text to load and learnings that become rules.

## Knowledge consulted

- patterns/`one-owner-per-instruction-topic-guarded-by-contract-tests`, issues/`instruction-copies-drift-into-contradictions` — merged text must not contradict.
- patterns/`a-gate-must-not-trust-its-own-author`, `a-gate-must-not-audit-its-own-instrument` — whoever condenses cannot certify nothing was lost.
- patterns/`a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash` — coverage that cannot be claimed without being shown.
- issues/`deleting-a-file-breaks-shipped-outcome-records-that-link-to-it` — ids and links must keep resolving.
- `/cooldown` (issue → pattern → rule promotion) and `/pitch-compress` (coverage ledger) — reuse their shapes rather than a second system.

## Solution sketch (breadboard)

**Idea:** write the compact form and **load it instead of** the originals. Originals stay where they are, so no link, record or ledger breaks
and nothing needs recovering. (Compaction ledgers name knowledge files and require them: 39 of 40 in LAH, 10 of 10 in RN.)

**Places**: a `distill` skill and adapters · `distill.mts` (candidates, ledger, checks) · the knowledge graph (a "distilled into" mark).

**Affordances**
1. **Candidates** (read-only): groups by shared tags and links, repeated lessons among resolved issues, near-duplicates, oversized entries.
2. **One small batch at a time.**
3. **Statement ledger:** every rule, learning, limit, exception and "not verified" note in each source, with where it appears in the compact
   text, or **"stays only in the original"** with a reason the person approves.
4. **Compact result:** a short rule in `.project/rules/` (or one summary entry) with its sources, keeping conditions, exceptions and
   qualifications, and the structured fields the graph and search use (tags, applies-to, status).
5. **Independent check:** a different agent, given only the originals and then only the result (never the author's ledger), writes its
   questions **first and they are frozen**; any miss blocks the item. One retry with a new checker; after that the item is deferred and the
   rejected draft kept.
6. **Gate, per item:** originals and result side by side; **Approve / Revise / Back / Stop**.
7. **Publish, bound to what was checked:** the check result and the approval carry the hash of the exact output, the ledger and the sources;
   any change voids them. Sources get a `distilled-into` mark; search and the index show the compact form first and the originals on request.
8. **Report** words loaded before and after; statements covered and left in originals.

**Undo:** remove the compact text and the marks.

## Rabbit holes

**Resolved here**
- Remove originals? → **No** (cut at critique). Fewer files is the other pitches' job.
- How is "nothing lost" shown? → Originals are untouched. The ledger and the independent check protect the **loaded** form from dropping or
  widening a rule; no test is claimed to prove meaning is preserved.
- Change bundle rules (`ai-framework/rules/`)? → No.

**Pushed to /plan as risk**
- What a "statement" is, so coverage can be checked (spike first; if it cannot, say so and rely on the check and the person).
- How search, the graph and each phase's knowledge gate prefer the compact form without hiding an original that matters.
- Keeping the checker away from the draft on a host without sub-agents.
- Cost per batch and a stop rule. **Pilot one batch end to end** in RN before building the rest.

**Pushed to no-go**
- Whole-base runs; search infrastructure; rewriting bundle rules; condensing pitch or run records.

## No-gos (this pitch)

- ✗ No original deleted, moved or rewritten (only the mark is added).
- ✗ No rule wider than its sources; conditions, exceptions and qualifications are kept.
- ✗ The author never certifies the result; a check or approval does not survive a change to what it saw.
- ✗ No unattended publish; no change to `ai-framework/rules/`.

## Tandem with `workspace-slim`

Run together (owner, 2026-11-25). No shared recovery is needed now. `graphify.mts` changes land after the sibling's index change.
**Size:** about 12 files, near 1,500 LOC with the pilot. **Split trigger:** if the plan or the pilot passes the cap, ship candidates, ledger and
one rule per batch first; add the search preference later.

## Evaluation (AI-prompt scope)

Golden cases: `.project/evals/datasets/knowledge-distill.json` (6, specified, none run): similar-but-opposite entries, full statement
coverage, links, unverified claims, promotion, and a failed independent check.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Same run as `workspace-slim` (`run_80b5ab62c6c7`); raw reports in `.project/pitches/02-workspace-slim/critique/`.

| Findings (distill) | Subject | Disposition |
|---|---|---|
| historian K4, K5; cross-pitch X1, X3 | removing originals breaks ledgers, records and links; aliases do not keep files | **Addressed**: originals stay |
| skeptic S2; historian K7, K8; eval E6, E7 | a pass not bound to the output; checker isolation; tuning until green | **Addressed**: hash binding, frozen questions, one retry, then defer |
| skeptic S3 | meaning lost from structured fields and search | **Addressed** (field rule) and plan risk |
| appetite A2, A6, A7 | over the cap; dependency on recovery | **Addressed**: recovery dependency gone; pilot and split trigger |
| eval E5, E8 | live-only judgment cases; cross-pitch restore case | **Acknowledged**: judgment stays live and per item; the restore case no longer applies |

## Validation 2026-11-26 (at /plan; scope above unchanged)

`workspace-slim` has shipped, so its `graphify.mts` change is in place. Entry counts moved a little. Two claims are weaker: phases load 3–5 hits,
not the base, and rules are surfaced in addition, so "less text to load" is unproven and may reverse; RN's 35 near-duplicate pairs did not
reproduce (3 or 7 on entry bodies). The golden dataset now has seven cases, not six. See `plan.md`, "Spike results".

## Re-shape 2026-11-26 (after the pilot said stop; pilot records in `pilot/`)

**Candidate smaller goal:** have `/cooldown` propose rules from repeated resolved lessons, with no loading claim. Measured before writing it:

| Question | Finding |
|---|---|
| Is it new? | **No.** `/cooldown` already promotes issue → pattern → rule (3+ pitch references, or a recurring class), approving each item |
| Has it produced rules? | Yes. `testing.md` and `security.md` carry rules marked as promoted at the 2026-09-25 cooldown, and 13 knowledge cards are named in rule files (naming alone does not show promotion). The earlier "0 / 1 entries ever promoted" is therefore wrong or measured something else |
| Why not lately? | Cooldown is 11 ships overdue; the status note says recent promotions waited for individual approval that was not given |
| How much repeated material? | Cards with a recorded recurrence heading: this repo 7 (3 with two or more), LAH 1, RN 0, climbing 0. Only this heading style was counted, so other projects may be undercounted |
| A real gap found | `/cooldown` and its phase doc name only `ai-framework/rules/` as the destination and never `.project/rules/`. `ai-framework/` is the bundle that sync copies into projects, so a project's own lesson written there sits in bundle files. LAH and climbing keep project rules in `.project/rules/`. No harmed project was looked for |

**Recommendation: Pass** (park this pitch with its pilot). The destination gap is a small separate change (the cooldown skill, its mirror and the
phase doc) for `/shape-lite`; the three twice-recurred cards are ready candidates for the next `/cooldown`.

**If re-shaped instead:** small-batch, "`/cooldown` lists lessons recorded as recurring and offers each to the right rule folder, project or
bundle". It would change an AI instruction, so it needs a golden case and `/critique` before a bet.

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-26, recorded from the owner running `/plan` on this pitch  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/knowledge-distill/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.
