# Re-shape knowledge distill around selective source loading

2026-11-26. The revised pilot completed. The original [pitch](pitch.md), [plan](plan-summary-pilot.md), and [failed pilot](pilot/result.md) remain the record of the summary approach.

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

## Bet decision

The owner selected **Bet** on 2026-11-26 for the opt-in single-topic loader. The original summary and publication scopes remain stopped. The [revised implementation plan](plan.md) defines the catalog, load accounting and rollout boundary.
