# Load test, fixed before any compact text was written

Queries a knowledge gate would make about the batch topic:
1. "compact a finished pitch and delete its files safely"
2. "ledger coverage cap too many files in a pitch folder"
3. "retiring a pitch directory that tests still read"

Today's load per query: `graphify.mts query "<q>"`; the first 5 distinct knowledge entries in output order; the sum of their body words
(frontmatter excluded), plus the words of any `.project/rules/` file (README excluded; none exists today).

With the compact form: remove every batch source among those 5 and add the compact text once. If the compact text is proposed as a
`.project/rules/` file, add its words to **every** query, with or without a source hit, because the shape gate surfaces project rules; the
removed sources stay removed. If it is proposed as a summary knowledge entry, add it only where a source was removed. Both are reported.
Pass: the total over the three queries falls by 30% or more under the destination the pilot actually proposes.
The planted test entry is not part of this measure.

**Change before any compact text existed:** queries run with `--budget 60000`. At the default (about 2,000 tokens) the output was cut before any
knowledge entry for queries 2 and 3 (0 of 55 nodes shown; 617 and 402 found). That is itself a pilot finding. Everything above is unchanged.
