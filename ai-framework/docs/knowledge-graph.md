# Knowledge Graph

← [Back to README](../../README.md)

The project graph is built by [Graphify](https://github.com/Graphify-Labs/graphify) (PyPI
`graphifyy`), run through [uv](https://docs.astral.sh/uv/) as `uv tool run --from graphifyy==<pin>
graphify` — nothing is installed globally (set `GRAPHIFY_BIN` to use a local executable instead).
`node ai-framework/scripts/graphify.mts` runs `graphify update` (tree-sitter AST for code, headings
and code mentions for markdown; no LLM or API key needed), then overlays the typed entries under
`.project/knowledge/` — `decisions/`, `patterns/`, `entities/`, `issues/` (frontmatter
`id`/`tags`/`related` + body `[[wiki-links]]`) — as `knowledge` nodes with `related` edges and tags,
and regenerates:
- `graphify-out/graph.json` — the one graph for code, docs and knowledge (`graph.workflow.tagIndex`
  maps tag → entry ids). Phases query it with `node ai-framework/scripts/graphify.mts query "<question>"`
  (also `path A B`, `explain X`, `god-nodes`, `affected X`; anything else is passed to graphify), which is what
  `/shape`'s knowledge gate, `/search`, `/knowledge-health`, and `/cooldown` use to find prior knowledge
  instead of re-reading every file. `graphify-out/GRAPH_REPORT.md` summarises hubs and communities.
- `.project/knowledge/index.md` — human-readable catalog, with a Mermaid graph when entries have
  related edges.

Both are derived — never hand-edit them, edit the entries and re-run the script. Setup creates the
initial graph; `/ship` and `/cooldown` rebuild it when their approved knowledge extraction,
promotion, or archive work changes entries. Run it manually (`--check` for a dry-run report,
non-zero exit on duplicate ids) after any other manual edit to a knowledge entry.

**Setup and updates.** `graphify.mts setup` (run by `/setup`, and named as a next step by `bundle-sync` when a project
lacks the graph) creates `.graphifyignore` and a `.gitignore` block (commit `graph.json` and `GRAPH_REPORT.md`, keep
the cache local), builds the graph, and installs post-commit/post-checkout git hooks that rerun `graphify.mts update`
in the background, so code changes keep it fresh *with* the knowledge overlay. Graphify's own `graphify hook install`
rebuilds `graph.json` without the overlay, which leaves the doctor's graph check failing after every commit; `setup`
replaces such a block in place (other hook content is kept) and the doctor warns while one remains. The hooks honour
`GRAPHIFY_SKIP_HOOK=1`, skip rebases, merges and cherry-picks, ignore commits that only touch `graphify-out/`, and log
to `~/.cache/graphify-rebuild.log` (`GRAPHIFY_REBUILD_LOG` overrides). After `git pull`/merge run `graphify.mts update`. The first run in a project that still has the old
`.project/knowledge/graph.json` migrates it: the file is deleted only when every old node and link exists in the new
graph. `workflow-doctor` and `setup-validator` verify the graph, `.graphifyignore`, and that `uv` is available.

---

See also: [pipeline](pipeline.md) · [extending](extending.md)
