# Re-shape knowledge distill around selective source loading

2026-11-26. The revised pilot completed. The original [pitch](pitch.md), [plan](plan-summary-pilot.md), and [failed pilot](pilot/result.md) remain the record of the summary approach.

**Date**: 2026-11-26, sections completed 2026-11-27  •  **Appetite**: big-batch (proposed 2026-11-27; the plan's 320–450 lines can pass the small-batch cap of 400)
**Stack**: ai-prompts (model-based source selection) + workflow tooling

## Problem

A person or agent with a question on one dense topic reads several whole knowledge cards to answer it, including cards the question does not need. A shorter rewrite lost a qualification and loaded more text, so the saving has to come from opening fewer originals without missing a rule or its exception.

## Knowledge consulted

- patterns/`a-gate-must-not-trust-its-own-author` — the selector's confidence cannot authorize loading or action; checks bind to current source bytes.
- patterns/`a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash` — a general rule with a boundary. The pilot's separate per-file companion is a [planted fixture](pilot/planted-entry.md), not a knowledge card (corrected 2026-11-27, K1); no real companion pair is shown yet.
- patterns/`one-owner-per-instruction-topic-guarded-by-contract-tests` — the catalog's descriptions must not become a second copy of a rule.
- `ai-framework/rules/security.md` §9 — guarded reads for the project-local catalog and sources.
- fix `fix-graphify-knowledge-query` (shipped 2026-11-26, v2.59.2) — a plain query now prints up to five ranked knowledge paths before the traversal.

## Solution sketch (breadboard)

**Places**: a loader script · one project-local topic catalog · its usage doc · the existing Graphify query (fallback).

**Affordances**: `catalog` prints the topic, fingerprint, source IDs and descriptions, no card bodies · `load` takes a route (IDs or fallback), expands companions, checks cap and hashes, prints whole unchanged cards · any refusal goes to the full search with a fixed reason.

**Connections**: caller → `catalog` → caller's own model picks IDs → `load` → originals, or full search. The loader calls no model. No phase calls the loader.

**AI success criterion**: every [golden case](../../evals/datasets/knowledge-selective-routing.json) passes (4 specified, none run) and the three original questions load at least 30% fewer words, fallbacks charged.

## Rabbit holes

**Resolved here**
- Rewrite or shorten cards? → No; originals only.
- Let the selector's confidence skip fallback? → No; a refusal or insufficient evidence uses the full search, and workflow actions and approvals use the full procedure.
- Wire it into phases? → No; opt-in only.

**Pushed to /plan as risk** (owner: R1 builder)
- A material exception outside the catalog goes unnoticed.
- A stale hash forces repeated fallback; refresh stays manual.
- A catalog must list real companions; the pilot's pair came from a planted fixture.

**Pushed to no-go**
- Global or automatic discovery, several topics, excerpts.

## No-gos (this pitch)

- ✗ No knowledge card or rule is edited, moved or deleted.
- ✗ No change to `graphify.mts`, to default search or to any phase gate.
- ✗ The loader makes no model call and runs no model-supplied text as a path, command or flag.
- ✗ No savings claim beyond the measured topic and runs.

## Proposed scope

Reduce the knowledge text a workflow phase reads by selecting a few full source cards within an explicitly bounded topic. Keep original cards authoritative and preserve their conditions, exceptions and evidence. Leave full search available when routing lacks evidence, several sources disagree, or the task needs fuller context.

Offer an opt-in, read-only loader for one named topic. The caller supplies a bounded catalog of source IDs and brief descriptions. The selector proposes up to three IDs, and a deterministic gate verifies the IDs and current source bytes before loading the originals. A catalog can declare that a broad rule needs a companion card. If the pair would exceed the cap, the catalog is stale, or source selection fails, use the existing full search. Give the answerer a way to request the same fallback when the selected sources cannot support an answer.

## Boundaries

- This experiment is read-only against project knowledge. The original summary and publication scopes stay on hold.
- Start with one explicitly selected topic. Do not assume the five-card pilot proves global discovery or works on another project.
- Fallback reads count toward the original 30% reduction target. Keep the fallback available even when a read makes that query miss the savings target.
- Keep every applicable rule and exception in the selected source. Preserve uncertainty and distinguish conflicting rules before an agent applies either.
- Freeze the shortlist policy before running held-out probes. Reevaluate a change with fresh holdouts.

## Initial evidence

The [hand-routed excerpt retry](pilot/retry-excerpt-check.md) saved 30.10% with three words to spare. That narrow margin motivated the selective full-card comparison.

## Revised pilot result

The [selective routing replay](pilot/selective-routing.md) compared lexical ranking, a short catalog with model-based selection, and the cost of excerpts followed by source verification. The strongest candidate selected full cards using the catalog, then loaded the companion card that carries the per-file exception. It saved 54.21% on the three original questions and 41.82% on eight additional cases including one full fallback. Independent readers answered all ten in-scope questions. The ledger answer required a recheck after adding its companion.

The selectivity result covers one known topic and one model routing run. It leaves broader coverage open. A named topic can omit an unknown exception even when its selected sources seem sufficient. The opt-in loader must tell the reader which topic it used and defer consequential action to the full workflow procedure. Further evaluation must test that candidate.

## Critique findings

| Perspective | Finding | Disposition |
|---|---|---|
| Knowledge historian | Preserve the failed selector and frozen evidence. Report source recall separately from live answers. | Retained both lexical attempts and separated executed checks from unexecuted acceptance cases. |
| Skeptic | A missing exception can survive a confident shortlist. Full fallback can cost more than default search. | Require configured companion cards and charge fallback. Test an out-of-catalog exception before widening use. |
| Appetite auditor | Limit product work to one opt-in topic and one loader. | Plan one CLI entry, focused tests, and a short usage section. Defer generic discovery, excerpts, and phase wiring. |
| Cross-pitch projector | The prior Graphify fix and workspace-slim still share uncommitted files. | Prefer a separate entry point so those Graphify hunks can stay isolated. |
| Eval regression projector | Paraphrase, conflict, uncertainty and cold cases need independent coverage. | Eight probes were frozen before replay. The proposed acceptance dataset adds stale companion and out-of-catalog checks. |

## Critique round 2 (2026-11-27, Orca)

Five perspectives, `run_7330b09909dc`, run one at a time: Codex (skeptic, eval), OpenCode (historian, cross-pitch), Claude (appetite). All reports collected, terminals released. Full text and each report's "not verified" notes are in [critique/](critique/). Dispositions below are **proposed**; the owner decides. The table above is the earlier critique.

| ID | Severity | Finding | Proposed disposition |
|---|---|---|---|
| [S1](critique/skeptic.md) | medium | No named user, recurring question or catalog owner | Address before any build |
| S2 | medium | The 54% saving compares with five whole cards; plain queries now rank knowledge paths first. The required source ranked second for two questions and was missing for one (stubbed traversal) | Address before any build: measure again |
| S3 | medium | Fallback prints on two output paths and can be undercounted | Plan: capture process output |
| [E1](critique/eval-regression-projector.md) | high | No case tests the selector on a reworded question | Add a frozen case |
| E2 | high | No case makes the answerer ask for fallback after a valid load | Add a research-only case |
| E3 | high | Two variants share one case ID, so one can be skipped unseen | Split the IDs; add a negative control |
| E4 | medium | Regression criteria, scale and baseline are undefined | Define before receipts |
| [K1](critique/knowledge-historian.md) | medium | A planted fixture was cited as a knowledge card (confirmed: no such card) | Citation fixed; a real companion is still open |
| K2 | medium | TOON data grammar and reader-refusal rules not cited | Plan: cite and bind them |
| K3 | medium | The loader's own checks have no scheduled independent review | Plan: add it |
| K4 | medium | Golden cases not bound to named tests; two are live-only yet "run all four" | Plan: report executed and unrun apart |
| [X1](critique/cross-pitch-projector.md) | high, proposed low | Untracked `fix-graph-query-hides-knowledge` plans a `graphify.mts` change | Its log describes the change already shipped as `fix-graphify-knowledge-query` (v2.59.2); looks like a leftover. Owner to confirm; not touched |
| X2–X4 | medium/low | Eval files, sync rollout and ignore rules touch pitches 04, 06, 07 | Plan note |
| [A1](critique/appetite-auditor.md) | medium | About 550–800 lines (a judgment), not 320–450 | Keep big-batch |
| A2 | medium | README link, VERSION, CHANGELOG and doctor step missing (about 6 files) | Plan: add |
| A3 | medium | The guarded reader is unnamed; the config reader does not fit | Plan: name it |
| A4 | medium | Live evaluation has no scope or estimate | Plan: separate R2 |

**Shaper recommendation (2026-11-27): Re-shape, measure before building.** With no code: name one real user and question set (S1), then compare ranked paths plus the cards actually needed against the catalog route, counting text the same way (S2, E4). If no user exists or the saving is under 30%, Pass. `plan.md` predates these findings and should not be approved as written.

**Measured 2026-11-27 ([gate comparison](pilot/gate-comparison.md)).** User (S1): the owner, at the `/shape` knowledge gate; five approved questions from pitches 01, 02, 04, 06 and 07. The ranked query surfaced 4 of the 9 cards those pitches cited, and none for three of the five questions. The questions need 9 cards from at least four topics, against a 5-card, single-topic catalog. A best-case catalog picked after the fact saves 36.8% against reading the top 5 cards, with two of five questions falling back. It loads 81% more than reading only the shown cards, but that policy misses 5 of 9 needed cards. **Shaper recommendation: Pass on the topic loader.** The measured gap is retrieval recall, which suits a separate small fix to ranked-query recall, using these questions as its test set.

## Bet decision

The owner selected **Bet** on 2026-11-26 for the opt-in single-topic loader. The original summary and publication scopes remain stopped. The [revised implementation plan](plan.md) defines the catalog, load accounting and rollout boundary.

**2026-11-27:** after critique round 2 the owner chose ☑ **Re-shape**. Named gap: S1 (no real user or question set) and S2 (saving not measured against ranked queries). Next: a no-code comparison on the named user's questions; Pass if no user exists or the saving is under 30%. `plan.md` stays on hold.

**2026-11-27: ☑ Pass**, approved by the owner after the [gate comparison](pilot/gate-comparison.md). Reason: on the owner's real gate questions the gap is finding the right cards (4 of 9 found), not words loaded, and a single-topic catalog cannot cover questions that span at least four topics. The loader is not built; `plan.md` is not approved. Parked in place, see [parking decision](parking-decision.md).
