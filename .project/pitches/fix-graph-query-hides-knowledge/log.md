# fix-graph-query-hides-knowledge (bug-fix)

- **Symptom:** `graphify.mts query "<question>"` often shows no knowledge entry, or not the relevant one. Seen in the knowledge-distill pilot.
- **Root cause (read in the tool's source, `graphify` 0.9.80, `serve.py` `_subgraph_to_text`):** nodes are printed seeds first, then by hop
  distance and by number of links, and the output is cut at about 3 characters per token (default 2,000 tokens). Knowledge cards are rarely
  seeds (seeds often come from code names) and have few links, so code and heading nodes fill the cut. `graphify.mts` passes `query` straight
  through. A larger budget is not a fix: the tool's own matching also misses some cards.
- **Planned fix:** before the tool's output, `graphify.mts query` prints a short ranked list of knowledge entries that match the question, scored
  from the entry files with a deterministic word match (rarer words count more). The tool's output stays unchanged.

## Measurement (2026-11-26, this repository)

17 questions: the first sentence of the Symptom or Summary section of every third issue card that has one (`questions.json`). Target: that card.

| | target shown | no knowledge at all | output |
|---|---|---|---|
| tool, default budget | 9 / 17 | 4 / 17 | about 2,100 tokens |
| tool, `--budget 60000` | 11 / 17 | 1 / 17 | about 69,000 tokens |
| prototype: title, id, tags; first 5 / first 8 | 15 / 17 and 16 / 17 | — | about 350 tokens for 8 lines |
| prototype: also whole text; first 5 | 17 / 17 (**biased**: the question is taken from the text) | — | same |

Limits: issue cards only, one repository, 17 questions, and each question comes from its own target, so real gate questions are likely harder.
The prototype is scratch code, not product code.

**Expected:** the relevant card appears in a short knowledge list at the top, at the default budget.
**Boundaries:** `ai-framework/scripts/graphify.mts` and its test; no change to `graph.json`, to the external tool or to the tool's own output.
**Exit criteria:** a failing-then-passing test; on `questions.json`, target in the first 8 for at least 15 of 17, with title, id and tags alone
scored separately so the bias stays visible; `--check` and the full verifier pass.
**Note:** this changes the context agents receive from a query, so the audit treats it as an AI-prompt scope: it needs a golden case recorded in
`.project/evals/datasets/`.
