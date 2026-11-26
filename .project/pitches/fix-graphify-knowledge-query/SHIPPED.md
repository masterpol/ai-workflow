# Graphify knowledge query fix

Shipped 2026-11-26 in bundle v2.59.2. Appetite: bug fix.

## Reconciliation

The single scope in [log.md](log.md) shipped. Plain queries prepend up to five ranked paths from typed knowledge entries in the project graph. The wrapper then runs the native traversal. Explicit query options and graphs outside the guarded read criteria use native output.

The audit prompted reuse of the descriptor-pinned project reader. The shortlist uses regular files within the project and a 64 MiB graph limit. It also bounds the question, labels and tags used for ranking. The scoped documentation describes the query behavior.

## Verification

- The regression failed before implementation. It also failed when the graph-size limit was raised in a disposable audit copy. The focused suite passed on Node and Bun with 42 tests each.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exited 0. The full suite had 2,456 passes, three skips and zero failures. Setup validation, knowledge graph, process relations, workflow doctor and diff sanity passed. The bundle has no build, typecheck, lint or i18n command.
- All three pilot questions returned five readable paths. The native part of stdout, stderr and exit status matched the explicit-budget runs before and after the graph rebuild.
- The [audit](audit.md) closed with no blocking findings. The final test additions for out-of-project graph paths passed focused and pre-ship tests after the independent review.

## Knowledge and follow-up

- Added [the issue card](../../knowledge/issues/default-graphify-query-can-hide-knowledge-entries.md) and rebuilt the knowledge graph. The rebuilt graph includes the typed issue node and both related links.
- Recorded the shared-reader concurrent ancestor replacement concern in [the backlog](../_followups.md). See [deviations.md](deviations.md).
- Archived the [run](../../runs/2026-11-26-fix-graphify-knowledge-query.md). This implicit bug-fix scope used its log for tracking.
