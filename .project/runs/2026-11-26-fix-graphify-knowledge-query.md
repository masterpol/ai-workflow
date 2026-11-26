# Graphify knowledge query fix run

Closed 2026-11-26 in bundle v2.59.2. See [the ship record](../pitches/fix-graphify-knowledge-query/SHIPPED.md) and [the audit](../pitches/fix-graphify-knowledge-query/audit.md).

- Symptom: Two of three pitch-compaction queries return zero knowledge results at the default budget. At 60,000 tokens, both show Markdown file nodes but neither shows a typed knowledge node.
- Root cause: The wrapper delegates to Graphify 0.9.80's mixed-graph seed selection and traversal, which can omit typed knowledge nodes entirely. Its renderer orders seeds and nearby high-degree nodes first, then cuts output at roughly 2,000 tokens, hiding the Markdown file hits as well.
- Planned fix: Include a small, ranked shortlist from the existing knowledge nodes in default wrapper queries. Preserve explicit Graphify query options and test the default path on queries that currently omit knowledge.

## Build verification

Approved the triage and build start. Used the prior `orca=normal` instruction for this continuation.
The wrapper ranks up to five typed knowledge paths by matches in the title, entry ID and tags.
It uses native Graphify output for queries with explicit options and graphs over 64 MiB.

- Regression test before the fix: exit 1 with `1 !== 6`. The expected knowledge heading and five paths were missing.
- Focused Graphify suite after the fix: exit 0, 42 passed, zero failures.
- Focused coverage for `graphify.mts`: 99.42% lines, 93.30% branches, 98.63% functions.
- Real CLI: both previously empty pilot queries now print five readable knowledge paths. The remaining output is identical to the native traversal with `--budget 2000`. An alternate `GRAPHIFY_OUT` directory supplies the graph for both results.
- Repository checks: Graphify and relations clean, setup validator ready (25 checks), workflow doctor ready (783 checks). This Node CLI runs without a separate application build.

The full suite passed twice. The last run started before the final `GRAPHIFY_OUT` compatibility edit, which passed the focused suite and a live custom-directory check after the edit.

```text
node --experimental-strip-types --disable-warning=ExperimentalWarning --test
Exit 0
tests 2459
suites 65
pass 2456
fail 0
cancelled 0
skipped 3
todo 0
```

The implicit build scope is complete and awaits approval to start audit.

## Ship readiness

Audit passed after two cycles. The wrapper now uses the descriptor-pinned project reader and bounds the text used in ranking. Graphs outside the project or reached through symlinks use native Graphify output. The audit records one deferred shared-reader issue.

The pre-ship verifier exited 0. Tests passed with 2,456 passes, three skips and zero failures. Setup validation, knowledge graph, process relations, workflow doctor and diff sanity passed. The focused Graphify suite passed on Bun with 42 passes and zero failures.

All three pilot questions returned five readable paths. Native stdout after the shortlist, stderr and exit status matched the explicit-budget runs. The audit record check passed.

Pending approval to close the pitch, record the bundle patch, add one knowledge issue, and track one shared-reader follow-up.

## Closure

Approved and closed on 2026-11-26 in bundle v2.59.2. The knowledge graph was rebuilt with the new issue card, and the three pilot queries passed again against the rebuilt graph. The remaining reader concern is in the follow-up backlog.
