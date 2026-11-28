# Pilot result: **stop**

| Go condition (fixed before the run) | Result |
|---|---|
| Every block has a destination or an approved "stays only in the original" | **met**: 28 of 28 rows, no extra or missing ids, every named heading exists, none left in originals |
| At least one item passes the independent check | **not met**: 25 of 26; Q15 missed ([check.md](check.md)); retry not run |
| Words loaded for the three queries fall by 30% or more | **not met**: they rise 17% as a summary entry (the proposal), 68% as a rule ([load.md](load.md)). Best case for this batch is 26% |
| The owner finds the compact text usable | not judged ([compact draft](compact-rejected-draft.md)) |
| Cost is written down and accepted | written: 3 agent runs, 227 s from the first dispatch to the answers; setup and grading by the coordinator not timed; acceptance not asked |

**By the plan's stop rule, S1 and S2 are not built.** Next step: back to `/shape`.

## What the pilot showed

1. **Condensing barely shortens real entries when nothing may be lost:** 1,041 words became 769 (26% less).
2. **It can add to what is loaded:** only one of three queries returned a batch source (one of five hits, 246 words), which the 769-word compact
   text would replace. A rule file would be added to every query.
3. **A complete block ledger did not stop a lost qualification:** 28 of 28 blocks were mapped, and "not a fabricated journal" was still dropped.
   Only the independent check found it. A publish check on blocks alone would have passed this.
4. The separate question writer and answerer worked: the answerer could not rely on having seen the originals.
5. Outside this pitch: at its default size, `graphify.mts query` showed **no knowledge entry** for two of three realistic questions; knowledge nodes
   were cut by the output limit.

## Golden cases

These are observations of a hand-run pilot. **No `distill` skill exists, so every dataset case stays not-run for the skill.** One vendor per role.

| Case | Pilot observation |
|---|---|
| `similar-but-different` | **fail**: the two opposite rules were kept apart with their conditions and the difference was reported, but the differing statements were not quoted (the brief did not ask) |
| `unverified-claim` | pass: the unconfirmed cause stays unconfirmed |
| `no-statement-lost` | **fail**: one qualification omitted although the ledger showed every block covered |
| `independent-check-fails` | partly observed: the failing question and source are reported, nothing published, questions kept and the draft kept; the retry was not run, so not a pass |
| `promotion`, `links-still-resolve`, `output-changed-after-check` | not-run |

## Source untouched

Knowledge and rule files are byte-identical and their Git status is unchanged. Everything ran on copies in a scratch folder.
