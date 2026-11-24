# Plan: state-project-depth

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md  •  **Mode**: Orca (Run `run_5412bcf5df8e`, coordinator claude)

## Settled at /plan (spikes run before writing this)

- **Receipt fields (A4), settled on LAH's real delivery.** `sha256(state.explainer.json)` equals `specification.sha256`, and `sha256(state.html)` equals `artifact.sha256`. `explainer.preparedSha256` is Archify's internal prepared form and is not used. Both files are therefore matched by hash.
- **Native-diagram count (X6).** Today's draft uses 0 native diagrams: only `facts`, `comparison` and `callout` blocks. At project depth it gains 2, the ERD and the tree, so the total is 2 of the 4 allowed.
- **Diagram form.** The draft is JSON. A native diagram is a block `{ id, type: "diagram", diagramType: "erd" | "tree", spec: { schema_version: 1, diagram_type, meta: { title }, ... } }` (Archify `schemas/explainer.schema.json`, `explainer/diagrams.mjs`).
  - ERD spec: `entities[{ id, label, attributes[{ name, type, key? }] }]` and `relationships[{ id, from, to, fromCardinality, toCardinality }]`. `layout: { mode: "auto" }`, or the grid if auto is refused.
  - Tree spec: `nodes[{ id, label, parent? }]`.
  - IDs must match `^[a-zA-Z][a-zA-Z0-9_-]*$`.
- **`state.depth` in `ai-workflow.toon` is dropped. Depth comes from `--depth` or `auto` only.** Deviation: a new config key reaches the config schema, the migrator and their tests. In R5a of the last pitch, that grew to 8 or more files. `auto` (an installed project means `project` depth) covers the request. A pin in the toon can be a followup.
- **Prisma is out** (pitch re-shape A3).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| A1 | Project fact readers | `ai-framework/scripts/facts-project.mts` (new), `facts-project.test.mts` (new) | ~260 + ~260 | — | B1 | **yes**, Orca worker **codex**. New files only, self-contained, the interface is fixed below, and the exit is a test command. | standard |
| A2 | Depth, draft diagrams, safe regeneration | `facts-gather.mts`, `facts-gather.test.mts` | ~150 + ~220 | A1 merged | B1 | **yes**, Orca worker **claude**. Two owned files, and the exit is tests plus a real Archify validate. | standard |
| B1 | Report reset in `bundle-sync --apply` | `bundle-sync.mts`, `bundle-sync.test.mts` | ~130 + ~180 | — | A1, A2 | **yes**, Orca worker **codex**. Disjoint from A, with its own tests. | standard |
| C1 | Docs, doctor list, release | `ai-framework/integrations/state-report.md`, `.claude/skills/state/SKILL.md` + `.cursor/skills/state/SKILL.md` (mirror), `.claude/skills/bundle-sync/SKILL.md` + its Cursor mirror, `ai-framework/templates/project/reports/README.md`, `workflow-doctor.mts` (one line), `CHANGELOG.md`, `VERSION` | ~110 | A2, B1 | — | **no**. Coordinator integration: shared docs and mirror sync. | — |

Files total: 6 code files plus 9 docs/release files, 15 at most (the big-batch cap; A1 notes the budget). **Cut line:** if A1 and A2 overrun 1,200 LOC, B1 moves to a followup pitch and C1 drops its bundle-sync docs.

### A1 interface (fixed, so A2 can be written against it)

```ts
// facts-project.mts
export interface ProjectBudgets { entriesPerDir?: number; dirsVisited?: number; treeNodes?: number;
  entities?: number; fieldsTotal?: number; relationships?: number }
export function createProjectFacts(deps: RuntimeDeps, helpers: {
  read: (root: string, rel: string, maxBytes?: number) => { text?: string; missing?: true; error?: string };
  clean: (text: unknown) => string }, budgets?: ProjectBudgets): {
  database(root: string): Fact;   // value: { dialect, entities: [{ name, columns: [{ name, type, pk, nullable }], unique: string[][] }], relationships: [{ from, fromColumns, to, toColumns }], total: { entities, relationships } } | null
  structure(root: string): Fact;  // value: { nodes: [{ path, label, parent: string | null, files: number }], total: { dirs, files } } | null
  stack(root: string): Fact;      // value: { manager, language, dependencies, devDependencies, frameworks: string[], scripts: string[] } | null
}
```

Names in `value` are **raw** (bounded but not cleaned), so that A2 can resolve relationships and generate IDs. Notes and errors are fixed text. A2 cleans every label as it emits it.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### A1 — Project fact readers
- `bun test ai-framework/scripts/facts-project.test.mts` exit 0, covering:
  - **Drizzle:** the latest `drizzle/meta/NNNN_snapshot.json` is parsed (tables, columns, pk, notNull, uniques, foreignKeys). The journal has more entries than the newest snapshot covers, which gives `stale` with a note naming both numbers; the fixture copies LAH's shape (12 entries, snapshot `0002`). There is no snapshot (`unconfigured`, and the note names the paths checked), an invalid JSON snapshot (`unavailable`, fixed reason) and an oversize file (`unavailable`).
  - **Structure:** depth of 2. The skip list is honoured. Symlinked directories are refused (not followed, not listed). Every budget hit (entries per directory, directories visited, nodes) gives `stale` and "at least". `constructor`, `toString` and `__proto__` are counted as ordinary directories through a `Map`.
  - **Stack:** `package.json` gives the dependency counts, the script **names** (never bodies) and the frameworks from a fixed list. The manager comes from the lockfile name (`bun.lock`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`). With no `package.json`, the stack is `unconfigured`. `pyproject.toml`, `go.mod` and `Cargo.toml` give only the language.
  - **Budgets:** a 5,000-entry directory and a schema with 3,000 fields stop at their budgets (built inside the test, not committed). A test fails if any reader calls `child`, `net` or a DB API (injected deps that throw).
- `git status --porcelain` lists only the two A1 files.
- `grep -nE "require\(|import\(|child|spawn|exec" ai-framework/scripts/facts-project.mts` prints nothing beyond the runtime import lines.

### A2 — Depth, draft diagrams, safe regeneration
- `bun test ai-framework/scripts/facts-gather.test.mts` exit 0, covering:
  - **Depth:** `auto` on a root with `.project/.bundle-sync.json` gives `project`, and without one gives `simple`. `--depth simple` output is **byte-identical** to today's draft for the same fixture (a golden fixture is captured before editing).
  - **Diagrams:** project depth adds exactly one `erd` and one `tree` diagram block. A test asserts the native-diagram count is at most 4 at both depths.
  - **IDs:** every diagram ID matches `^[a-zA-Z][a-zA-Z0-9_-]*$`, is unique within the document and is generated (`e<n>`, `d<n>`). Names that differ only by `_` or `-`, names that collide after truncation, names with `|`, newlines, `@`, `=`, `&`, `$` or directives, and credential-shaped directory, script or table names all produce valid, redacted labels, with relationships still pointing at the right entities.
  - **ERD cap:** over 30 entities, the 30 most-connected are kept and the panel says "at least". The degree is counted with a `Map`.
  - **Safe regeneration (S1):** `--explainer` writes when the destination is absent. It replaces the destination only when the file's SHA-256 equals `specification.sha256` in a valid, bounded, non-symlink `state.delivery.json`. Otherwise it fails with `report-not-owned` and names the file. An end-to-end test covers deliver (a fake receipt), editing the draft, then re-running; the edit survives.
- **Real Archify validate** (runs when Archify is installed here, skips with a printed reason otherwise): the project-depth draft of a fixture that contains the hostile names gives `validate ... --json` `errors: 0`.
- **Live check:** on a copy of LAH, `facts-gather --explainer` followed by Archify `validate` and `deliver` exits 0, and the page shows the ERD (9 tables, with the stale note) and the tree.

### B1 — Report reset in `bundle-sync --apply`
- `bun test ai-framework/scripts/bundle-sync.test.mts` exit 0, covering:
  - **Matching files:** when `state.html` and `state.explainer.json` match the receipt hashes, they are removed along with the receipt. A NEXT STEPS `reports` line says "re-run /state".
  - **Edited files:** an edited `state.html` or draft is kept and named, and the receipt is kept when any target is kept.
  - **Refusals:** a symlinked `.project/reports`, a symlinked receipt or target, or an oversize or invalid receipt means nothing is removed and a fixed reason is given. If the directory identity (device and inode) changes between the hash check and the removal, the removal is refused.
  - **Dry run:** a dry run removes nothing and lists what `--apply` would remove.
  - **Negative test:** every other file under `.project/` is byte-identical after `--apply`, apart from the marker.
  - **Legacy pages:** the pre-2.51 pages (`index.html`, `state.json`, `theme.json`) are listed, never removed.
  - **Archify pin:** when the source `state-report.md`'s pinned commit (read with one anchored line match, bounded) differs from the registry's `tt-a1i/archify/archify` revision, NEXT STEPS prints the `add-skill install ... --ref <pin>` command. When they are equal, or Archify is not installed, nothing is printed.
- The header comment of `bundle-sync.mts` names the receipt-verified `.project/reports` removal as the single exception (`grep -n "receipt" ai-framework/scripts/bundle-sync.mts`).
- `git status --porcelain` lists only the two B1 files.

### C1 — Docs, doctor list, release
- `node ai-framework/scripts/workflow-doctor.mts` READY. `facts-project.mts` and its test are in the doctor's syntax-check list.
- `cmp .claude/skills/state/SKILL.md .cursor/skills/state/SKILL.md` and the same for bundle-sync exit 0.
- `node ai-framework/scripts/docs-links.mts ai-framework/integrations ai-framework/templates` exit 0.
- `node ai-framework/scripts/setup-validator.mts`, `graphify.mts --check`, `graphify-relations.mts --check` and `changelog.mts --check` exit 0.
- Full suite on an independent clone: the only failures are the known pre-existing ones (`installed-upgrade` b26b45b, and the two bundle-copy timeouts in a long-lived checkout).

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Receipt field mapping (A4) | B1, A2 | done | Settled above from LAH's real receipt |
| Archify `@erd` layout of 30 entities is unreadable or refused | A2 | yes, inside the A2 live check | Lower the cap until `deliver` passes. Try `layout.mode: "auto"` first, then the grid |
| `readdirSync` materialises one whole directory before the budget applies (there is no streaming API in `RuntimeDeps`) | A1 | no | Documented residual: the budget bounds processing and output, but one directory listing is still loaded. Adding `opendirSync` to the runtime is a followup |
| Stale Drizzle snapshot wording | A1 | no | The note gives both numbers: "journal lists N migrations; newest snapshot covers M" |
| Workers editing the shared checkout concurrently | A1, B1 | no | Disjoint authorized paths and the overlap guard. A2 starts after A1 is collected |
| `workflow-v3-rollout` syncs before this ships (X1) | C1 | no | Recorded in the ship notes. The rollout is still in shape |

## Parallel dispatch plan

- **Wave 1 (parallel):** A1 to **codex** and B1 to **codex**. They have disjoint files and both are new or self-contained. Two live workers, within `maxConcurrentWorkers` 3.
- **Wave 2:** A2 to **claude**, after A1 is collected and its tests are re-run by the coordinator. The A1 interface above is binding.
- **Integration:** C1 is done by the coordinator. Each worker is released after its `worker_done` is collected (a standing rule). The coordinator re-runs every exit command itself.
- The vendor is chosen per scope by complexity: all three are standard-profile code with tests. Claude takes A2 because it needs the real Archify validate loop and the judgement on the end-to-end ownership test.

## Wireframes (UI scopes only, light)

None. There is no UI scope; the page is rendered by Archify.

## Living-spec deviations log

- 2026-11-24 (/plan): the `state.depth` toon pin was dropped (see "Settled"). The receipt mapping was settled without a separate spike scope.
- 2026-11-24 (/build A1): the coordinator widened the fixed framework list (TanStack Start/Router, Remix, Solid, Vite, Prisma) after the live LAH check showed only `react` and `drizzle-orm`. One test expectation was updated.
- 2026-11-24 (/build A2): Archify's `erd` schema allows only the `grid` layout, so entities get explicit row and column positions (6 columns). Foreign-key attributes carry `references: <entityId>.<column>`. At most 5 relationship ends are drawn per table, because real validate refused a hub with 21 ends, and a note says how many are not drawn. ERD labels are capped at 28 characters. The old test that replaced a draft without a receipt now expects `report-not-owned`.
- 2026-11-24 (/build C1): A2's test imported `node:crypto` directly, which the doctor's runtime-boundary check flags. It was switched to `deps.crypto.sha256Hex`.
- Open for /audit: the B1 reset runs on every `--apply`, including one that applies no files.

- 2026-11-24 (/audit): three cycles. Fixed M1 (ERD validity), M2 (reset pins the hashed descriptor), M3 (marker EACCES), and should-fix S1 to S7. Added a `<name>.written-sha256` ownership marker beside the draft. The reset is now gated on applied or pruned files. Record: `.project/analysis/2026-11-24-state-project-depth-audit.md`.
