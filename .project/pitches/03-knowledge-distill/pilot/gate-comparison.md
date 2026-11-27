# Gate-question comparison

2026-11-27. Re-shape measurement with no code. The owner chose their own `/shape` knowledge-gate questions as the real use. [Questions and needed cards](gate-questions.json)

## Method

- Five questions, one each from pitches 01, 02, 04, 06 and 07. The coordinator wrote them from each pitch's "Knowledge consulted" section, and the owner approved them. The "needed" cards for each question are the cards that pitch cited, 9 in all.
- Each question ran through `graphify.mts query` at its default settings on the current checkout. The words counted are the whole output (the ranked list and the native traversal) plus whole card files, frontmatter included.
- **Read top 5**: the query output plus all five ranked cards.
- **Read needed only**: the query output plus the needed cards that the ranked list showed. This policy is cheap because it is incomplete: a needed card that was not shown is simply missed.
- **Catalog route** (best case for the loader): one 5-card catalog chosen with hindsight to cover whole questions (Q1, Q2 and Q5), and a selector that always picks exactly the needed cards. The cost is the pilot's router instruction (77 words), five 16-word descriptions, the question, the route, and the selected cards. Any other question falls back to the catalog cost plus "read top 5".

## Result

| Question | Needed cards in ranked top 5 | Query output | Read top 5 | Read needed only | Catalog route |
|---|---|---:|---:|---:|---|
| Q1 | 2 of 2 | 393 | 2,227 | 1,446 | catalog, 1,229 |
| Q2 | 2 of 2 | 491 | 2,687 | 1,114 | catalog, 797 |
| Q3 | 0 of 2 | 371 | 1,521 | 371 (both missed) | fallback, 1,694 |
| Q4 | 0 of 2 | 464 | 2,093 | 464 (both missed) | fallback, 2,265 |
| Q5 | 0 of 1 | 374 | 2,297 | 374 (missed) | catalog, 852 |
| **Total** | **4 of 9** | | **10,825** | **3,769** | **6,837** |

Compared with reading the top 5, the best-case catalog route loads 36.8% fewer words. That requires a catalog picked after the fact for these exact questions and a selector that never errs, and two of the five questions still fall back. Compared with reading only the needed cards that were shown, the catalog route loads 81% more words. That cheaper policy, however, missed 5 of the 9 needed cards.

## Reading

1. **The real gate problem is finding the cards, not the number of words.** The ranked query surfaced 4 of the 9 cards the owner actually cited, and none at all for Q3, Q4 and Q5.
2. **One topic does not cover the real use.** The five questions need 9 cards from at least four topics. The planned catalog holds 5 cards on one topic, so most gate questions would fall back or need a catalog per question.
3. **The 30% saving holds only in a best case that cannot exist ahead of time.** A catalog built before the questions are known would cover fewer of them.

## Limits

One run, five questions, words rather than tokens or cost, and no answers graded. "Needed" means the cards each pitch cited: the owner may have found them by other means, and not every cited card was strictly needed. The coordinator wrote the questions knowing the target cards, which should favour the ranked query, and it still missed 5 of 9. No knowledge, rule or script file changed.
