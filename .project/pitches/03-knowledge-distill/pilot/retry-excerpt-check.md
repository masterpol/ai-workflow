# Independent check of the excerpt retry

2026-11-26. Ran with `orca=normal`. Two fresh reviewers saw only the supplied packets and four questions. The first reviewer reported opening its role prompt and using only the packets as evidence. The second included all applicable conditions and exclusions from the supplied text. Neither reviewer was given the historical answers or the load calculation.

## Results

| Probe | Initial excerpts | Revised excerpts |
|---|---|---|
| A. What is required for deletion? | Pass. Quoted the mutation and deletion requirements. | Pass. Quoted the same requirements. |
| B. How is interruption exercised? | Incomplete. Answer gave real subprocesses and omitted the journal exclusion. | Pass. Quoted the transaction machinery and the full interruption rule, including the journal exclusion. |
| C. May files requiring individual judgments, such as approval files, be covered by one folder hash? What should you do if the available evidence is insufficient? | Insufficient. Identified the bulk condition and asked for the source before deciding. | Pass for the general rule. Quoted the separate per-file requirement and asked for the source if classification of a specific file mattered. |
| D. What protects tests when a pitch directory is retired? | Pass. Listed the inventory, durable ownership, byte verification, consumer update, and unchanged regression. | Pass. Included those steps and the recovery limits. |

## Revised excerpt text

Packet 1 bolds the existing phrase **not a fabricated journal**. Packet 2 adds this sentence and its source link after “For bulk judged together.”

> Individual judgments require per-file entries. [Boundary](planted-entry.md)

The boundary comes from the planted test fixture. It is part of the experiment's input. The project knowledge files were untouched.

## Load and remaining evidence

The same three hand-routed packets now total 204 words, including all links. The revised load is **2,485 of 3,555 words**, a **30.10% reduction** with **three words of margin**. Reading the 103-word planted source in this simulation would raise the total to 2,588 words and lower the reduction to **27.20%**.

The revised excerpts passed all four probes at the level asked. The check did not run all 26 historical questions. Real routing, held-out questions, actual fallback costs, owner usability, and cost acceptance still need evidence before implementation scopes can start.

For the next pilot, freeze the test set first. Run the full-card baseline, selective full-card loading, and excerpt loading against the same questions. Record each source actually opened. This comparison will show whether excerpts improve on simply opening fewer full cards.
