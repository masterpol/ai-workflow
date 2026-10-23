---
id: graphify
type: entity
created: 2026-10-18
updated: 2026-10-23
confidence: high
tags: [knowledge-graph, ast, tooling, service]
related: [a-source-scanner-fails-closed-on-what-it-cannot-read, resolve-before-matching-a-protected-path-allowlist, local-eval-data-is-gitignored]
source: knowledge-health-audit
---

# Entity: Graphify (knowledge-graph front end)

## Summary

The script that builds the project's machine-readable graph (`graphify-out/graph.json`) and the
human-readable catalog (`.project/knowledge/index.md`). It runs Graphify
([github.com/Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), PyPI package
`graphifyy`, pinned) through `uv` for the AST + markdown scan, then overlays the typed
knowledge entries under `.project/knowledge/` as `knowledge` nodes and `related` edges. One
graph backs every phase that needs it: `/shape`'s knowledge gate, `/search`, `/knowledge-health`,
and `/cooldown`.

## Location

- Main script: `ai-framework/scripts/graphify.mts`
- Output graph: `graphify-out/graph.json`
- Output catalog: `.project/knowledge/index.md`
- Config: `.graphifyignore` (created on first `setup`)

## Responsibilities

- Run `graphify update <root>` to scan code (tree-sitter AST) and markdown (headings + code
  mentions).
- Overlay typed knowledge entries from `.project/knowledge/{decisions,patterns,entities,issues}/`
  using their frontmatter `id`, `type`, `tags`, `related` fields and any double-bracket wiki-links.
- Validate (`--check`): duplicate ids, broken links, orphans, folder/type mismatches — exits 1
  on error-level problems.
- Install (`setup`): write `.graphifyignore`, append the rebuild-on-commit / post-checkout
  block to `.gitignore`, and wire git hooks so the graph never drifts from on-disk entries.
- Overlay the validated bundle workflow manifest and optional project-local relations, including
  canonical/mirror adapters, phase documents, dispatches and rule reads. Registry-owned local
  skills are reported separately; an unlisted local skill still needs a project overlay entry.
- Add file nodes for declared files omitted by the upstream scanner, including build skills and
  TOML adapters. Derive bounded references only from existing, non-fenced paths, with canonical
  targets and explicit hub/budget checks.
- Overlay typed outcome links from durable shipped records. A valid record is not sufficient
  evidence of useful navigation: test the expected destination relations independently.

## Dependencies

- Depends on: `uv` (runtime), `graphifyy` (Python package, pinned), the workflow runtime
  helpers under `ai-framework/scripts/runtime/`.
- Used by: `/shape`'s knowledge gate, `/search`, `/knowledge-health`, `/cooldown`, and
  `node ai-framework/scripts/graphify.mts query` for ad-hoc traversal.

## Key APIs

```typescript
// Subcommands
graphify.mts update          // rebuild the graph and catalog (default)
graphify.mts check [--json]  // validate entries; exit 1 on error
graphify.mts setup           // first-time install: uv, .graphifyignore, git hooks
graphify.mts query "..."     // pass-through to graphify
graphify.mts path            // pass-through
graphify.mts explain         // pass-through
graphify.mts god-nodes       // pass-through
```

## Interactions

```
graphify (PyPI) ──AST/markdown──▶ graphify-out/graph.json
                                          ▲
.project/knowledge/*.md ──overlay────────┘
                                          │
                                          ▼
graphify.mts ──writes──▶ .project/knowledge/index.md
                                          │
                                          ▼
                /shape /search /knowledge-health /cooldown
```

## Notes

- Never hand-edit `graphify-out/graph.json` or `.project/knowledge/index.md`; rebuild with
  `node ai-framework/scripts/graphify.mts`.
- `GRAPHIFY_BIN` overrides the resolved `uv tool run --from graphifyy` invocation with a
  local executable for offline or pre-release use.
- Production code imports no `node:*` module; every fs/path/process effect goes through
  `RuntimeDeps` so test fixtures can inject them.
- The connected-memory-consolidation P1 acceptance measured typed one-hop `explain` relations:
  12/12 after versus 0/12 before. This is not a semantic ranking result for lexical `query`.
  On 2026-10-23, `query 'who reviews /audit'` reached the audit playbook but omitted reviewers;
  the accepted D7 measurement deviation remains explicit.
