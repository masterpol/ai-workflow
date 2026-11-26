# Distillation retry using question-specific excerpts

Date: 2026-11-26. This is a shaping experiment. The original pilot and its frozen evaluation remain the record of that attempt.

## Result

Graphify v2.59.2 returns five paths for each of the [three original questions](load-method.md). The 769-word summary still raises total load to 3819 words with the original substitution rule. Three question-specific packets below reduce the measured total from 3555 to 2479 words (30.27%). Packets consist of complete source blocks with source links. The ledger packet also adds a short condition that limits its scope.

| Pilot question | Baseline words | Batch-source words removed | Packet words added | Revised total |
|---|---:|---:|---:|---:|
| 1 | 1430 | 843 | 52 | 639 |
| 2 | 1113 | 431 | 87 | 769 |
| 3 | 1012 | 0 | 59 | 1071 |
| Total | 3555 | 1274 | 198 | 2479 |

The baseline counts whitespace-delimited words in the first five Graphify knowledge paths, excluding frontmatter, plus 0 project-rule words per query. The revised count drops only original batch hits and adds the entire packet, including source links. Question 3 adds a directly relevant source packet even though its default shortlist missed the original. Other shortlisted entries remain in the count.

This measures the size of manually routed packets. It leaves 9 words of margin against the original 30% target. Any live fallback reads must be included in that same total. Independent answer quality, live routing, reads triggered by the packets, owner usability, and cost still need evidence before S1 or S2 can start.

## Packets

### 1. compact a finished pitch and delete its files safely

- **Every mutating step needs `--apply`; deletion needs a verified archive, a complete ledger, an unchanged source, and a human gate.** Nothing is automatic.
- **Reuse the audited transaction machinery.** `pitch-archive.js` runs on `skill-registry.js`'s `transact`/`recover` with a `{roots, state}` context; interruption is tested with real `SIGKILL` subprocesses, not a fabricated journal. [Source](../../../knowledge/decisions/pitch-compaction-gate-and-recovery-design.md)

### 2. ledger coverage cap too many files in a pitch folder

For bulk judged together. Let one entry cover a folder prefix. Bind it by the member count and a hash over every member's path and hash in a fixed order, computed by the tool and recomputed by the gate. Any add, drop, rename or edit changes the hash. Refuse overlap (a file belongs to one entry), refuse a group that matches nothing, and keep a separate bound on total files. Put the coverage rule in one pure function used by both the writer and the remover. [Source](../../../knowledge/patterns/a-bounded-ledger-needs-a-group-entry-bound-by-a-tree-hash.md)

### 3. retiring a pitch directory that tests still read

Before retiring a pitch directory, inventory test and tool consumers of its source paths as well as prose links. Move required full assets to durable ownership, prove complete bytes against an approved original, update the consumer, and run its unchanged regression. Do not make ordinary tests read recovery archives. Check recorded deletion intent before restoring any old path. [Source](../../../knowledge/issues/live-test-evidence-outlived-its-pitch-path.md)

## Revised pilot boundary

Keep all four originals authoritative and byte-identical. Build an index of exact source passages with stable IDs and source hashes. Select passages per question from that index and keep the applicable conditions with each passage. If the match is ambiguous, the source changed, or the answer depends on an omitted qualification, load the relevant original and count that read. Keep the original full-card query as the fallback.

Freeze a new pilot before attempting automated selection. Retain the original three load queries and one held-out paraphrase per intent. A separate checker should see only the packets and frozen questions during the first answer pass. Compare answer quality with the originals and include any fallback reads in the load total. Require coverage for the missing qualifier in Q15, the opposite rules for bulk versus individual judgment, stale source hashes, a request with little overlap, and an unresolved incident. A miss on any applicable qualification still blocks publication. The full 26-question baseline applies across the linked originals and routed packets, with all reads charged to the relevant task.

Proposed next scope is one disposable pilot of retrieval, exact excerpts and fallback. Product scripts, skill adapters, publication, source edits and default Graphify behavior stay outside that pilot.

## Independent check status

Orca Run `run_39050f839b57` was created for the retry. It refused the reviewer brief before launch with `brief-control-character:change`. The brief put multiline packet text in the single-line change field. The independent check has no result.

Later runs used `orca=normal`. See [the check results and revised excerpts](retry-excerpt-check.md).
