# Implementation plan for selective source loading

2026-11-26. The owner selected **Bet** for the [revised pitch](re-shape-retrieval.md). This draft is the proposed successor to the [original summary plan](plan-summary-pilot.md). Build approval is pending. [Hill chart](hill.md) · [Pilot evidence](pilot/selective-routing.md)

## Scope

| Scope | Files | Estimate | Dependencies | Parallel | Dispatch |
|---|---|---:|---|---|---|
| R1. Opt-in topic loader and its fallback | `ai-framework/scripts/knowledge-load.mts`, `ai-framework/scripts/knowledge-load.test.mts`, `ai-framework/docs/selective-knowledge.md` | 320–450 lines including tests | Existing runtime, guarded reader and Graphify query | None | Coordinator implements one coupled CLI contract. Independent live evaluation follows. |

One directly executable CLI, one topic at a time. Keep `graphify.mts` and phase gates on their current entry points. Defer global discovery, rewritten excerpts, source publishing, vendor adapters, and changes to default search.

## Command and data contract

1. `node ai-framework/scripts/knowledge-load.mts catalog <catalog.toon>` prints one JSON object with a topic, the catalog SHA-256, and the source IDs and short descriptions for the selector. It opens no card bodies. The caller can use its existing agent to select IDs. The loader makes no model calls.
2. `node ai-framework/scripts/knowledge-load.mts load <catalog.toon> <question> <route-json> --research` accepts the catalog fingerprint and either a list of source IDs or an explicit fallback. With a valid selection it emits the topic and the complete, unchanged source texts as JSON. The caller uses the evidence to answer the question.
3. A non-research request, explicit fallback, stale or invalid catalog, invalid route, exceeded cap, missing source, or failed hash check goes to the existing Graphify query path with a fixed reason on stderr. No selected card is emitted before the full selection passes validation. A caller that finds the evidence insufficient can request fallback through the same command and charge all text already seen. Workflow actions and approvals use the full procedure.

The schema v1 catalog is a project-local TOON data file under `.project/knowledge/catalogs/`. It contains a topic, up to five source IDs, one description and exact SHA-256 per source, and optional companion IDs. Each source has a root-relative Markdown path in one of the four existing knowledge categories. IDs, paths, field lengths, sizes, unknown keys, and the declared frontmatter ID and type are checked. The route is bounded transient JSON. Expand companions to closure, deduplicate and reapply the three-card cap before opening bodies. Verify the full source bytes against catalog hashes before emitting any result. Direct fallback calls the trusted bundle Graphify entry with a validated plain question and returns its status. Use fixed refusal codes and never pass model text as a path, command, or flag.

## Blast radius

| Boundary | Consumers and tests | Risk |
|---|---|---|
| New CLI and documentation | Agents and people who expressly invoke it. No existing caller or default changes. | Low integration risk |
| `runDirect`, project data parser and descriptor-pinned reader | New consumer of existing library contracts. Add real-file fixtures for refused paths, symlinks, oversized input, and changed bytes. Keep existing callers and helpers untouched. | Medium |
| Graphify query fallback | Reuse the existing exported entry point. Test that its stdout and exit status reach the caller and no mutation or setup command can be selected. Run existing Graphify tests. | Medium |
| Catalog and model selection | Fictional companion in the pilot stays a fixture. An actual catalog must list its own evidence. Silence or apparent confidence cannot authorize a workflow action. | High for unsupported inference |

Keep runtime effects behind `RuntimeDeps`. Use the guarded reader behavior described in `security.md` §9 and the existing TOON data grammar. There are no stack-specific rule companions beyond the project README. Do not resolve prior Graphify worktree edits as part of R1.

## Exit criteria

- `node --test ai-framework/scripts/knowledge-load.test.mts ai-framework/scripts/graphify.test.mts` and `bun test ai-framework/scripts/knowledge-load.test.mts` pass. Exercise the documented CLI through a disposable project and a stub native Graphify. Cover catalog-only output, exact source bytes, companion expansion, stale catalog and source bytes, missing files, capped or duplicate routes, unsafe and symlinked paths, explicit or operational fallback, and fallback propagation. Confirm that removing a guard in a disposable copy fails the relevant assertion.
- Run the four [golden cases](../../evals/datasets/knowledge-selective-routing.json) through the real command on a disposable catalog and current knowledge fixtures. Record executed case IDs, baseline and candidate scores, route and answer traces, and word counts under `.project/evals/runs/`. A result check in the focused test reads this receipt when supplied and rejects missing cases, missing fallback costs, any failing assertion, any criterion regression above 0.3, or original-workload savings below 30%. The receipt is mandatory at the live build exit. Keep the pilot replay distinct from that execution.
- Re-run the original three load questions under both policies. Count the same model-visible boundaries in both runs. Include catalog text, selector input and output, rendered card bodies, any previous excerpts, and complete fallback traversal and reads. Report words and observed call count. Report billed cost or latency only with a captured measurement.
- `node ai-framework/scripts/graphify-relations.mts --check`, `node ai-framework/scripts/setup-validator.mts`, and the pre-ship verifier pass. This Node/Bun CLI has no separate application build, UI, or i18n step.

## Risks

| Risk | Check at build or audit |
|---|---|
| The selector confidently omits a material exception outside the catalog | Independent out-of-catalog action case escalates before authorizing action. Reject the candidate if it proceeds on partial evidence. |
| Fallback erases savings | Count the prior context and the fallback end to end. Keep safe fallback even if a query costs more than baseline. |
| A stale hash forces repeated fallback | Keep catalog refresh explicit and inspectable. No automatic update to pinned sources or publishing in this scope. |
| Shared Graphify edits get mixed with the new work | Keep application edits to the three R1 paths. Verify Graphify behavior without changing its file. |

## Approval

Approve the impact and plan together to start R1. Initial state is uphill 0%. The original summary scopes retain their prior stop result.
