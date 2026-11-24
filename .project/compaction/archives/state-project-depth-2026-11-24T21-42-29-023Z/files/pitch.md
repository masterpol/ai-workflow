# Pitch: state-project-depth

**Date**: 2026-11-24  •  **Appetite**: big-batch
**Stack**: backend (workflow tooling: `facts-gather.mts`, `bundle-sync.mts`, `/state` playbook)

## Problem

In a project that has the workflow installed (LAH, for example), `/state` shows only the workflow version, pitches, knowledge and skills. The owner cannot see the project itself: its database schema, its folder structure, its stack. After a bundle update the old report stays on disk, so it can describe an older bundle or an older Archify without anyone noticing. The bundle's own repository should keep today's simple page.

## Knowledge consulted

- [decisions/archify-renders-the-state-report] — **constrains.** The 2.51.0 full replace dropped the `project`, `database` and folder-structure sections *by decision*. This pitch brings two of them back as facts rendered by Archify, not as the old bespoke renderer. Archify stays instance data, pinned, run only through `validate` and `deliver` with the update check off. Every number comes from the collector.
- [patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code] — **constrains.** The project tree is data, never code. A schema is read from files (a Drizzle snapshot, a Prisma schema), never by importing `schema.ts`, running drizzle-kit or opening a database. Reads stay bounded, symlinks are refused at every segment, no child process is started, and error text is never copied.
- [patterns/a-report-never-overwrites-a-file-it-did-not-write] — **constrains the reset.** Never delete in `.project/reports/` by name alone. A file may be removed only when it is provably ours: here, `state.html` and the draft are identified by the SHA-256 that Archify's `state.delivery.json` receipt records.
- [decisions/project-state-report-design] — **safety lessons still bind.** Bounded markdown reads downgrade truncated facts to `stale`, each section fails on its own, and the writes are atomic and exclusive.
- [patterns/parse-untrusted-values-and-re-emit-them], [patterns/allow-list-untrusted-labels-at-ingest-and-at-render] — **constrain diagram output** (critique K1/S2). Diagram IDs are generated, not derived from labels.
- [issues/snapshot-metadata-bypassed-output-scrubbing] — **constrains the new routes** (K2). Every new label and note passes through the same redaction.
- [patterns/sync-tools-refuse-symlinks-in-source-and-destination], [issues/staging-substitution-can-redirect-cleanup] — **constrain the reset** (K3).
- [issues/counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys] — **constrains counting** (K5). Counts use `Map`.
- `.project/analysis/2026-11-23-archify-v3.3.0-validation.md` and Archify's `references/explainer-authoring.md` — **enable it.** An explainer supports `@erd` (entities, fields, pk/fk/uk, relationships) and `@tree` (`id | label | parent`) natively, plus `@chart` and Mermaid charts. There is a **limit of four native diagrams per page.**

## Solution sketch (breadboard, NOT wireframe)

**Two independent scopes** (critique A2). **A** is the collector depth: places 1, 2 and 4. **B** is the sync reset: place 3 and its docs. They share no source file. B is the one to cut to a followup if A overruns the budget.

**Places**
1. `facts-gather.mts`: the collector, which gains a **depth** and three new sections.
2. `.project/reports/state.explainer.json`: the draft, which gains an ERD panel, a structure tree and a stack table.
3. `bundle-sync.mts --apply`: the update, which gains a **report reset** step.
4. `/state` playbook and `state-report.md`: the contract.

**Affordances**
- `facts-gather.mts --depth simple|project` (default `auto`). `auto` resolves to `project` when `.project/.bundle-sync.json` exists, meaning an installed project. It resolves to `simple` otherwise, meaning this bundle's own checkout. `ai-workflow.toon` can pin the value under `state.depth`. `simple` produces exactly today's page.
- New sections, only at `project` depth:
  - **`database`**: entities, columns (name, type, pk, nullable), unique keys and foreign keys. Its only source is the latest `drizzle/meta/*_snapshot.json` (structured JSON, bounded read). Prisma and anything else are `unconfigured`, with a note naming the paths that were checked (critique A3; Prisma is deferred).
    - **Staleness:** when Drizzle's `_journal.json` lists more migrations than the newest snapshot covers, the section is `stale` and the note names the gap. LAH has 12 journal entries and its newest snapshot is `0002`.
  - **`structure`**: top-level directories and their children, two levels deep, read with `readdir` only.
    - It uses a fixed skip list (`node_modules`, `.git`, `dist`, `build`, `coverage`, `graphify-out`, `storybook-static`, `.project/skills/packages` and dotfolders) and does not read `.gitignore`.
    - It reports file counts per directory and is capped at 60 nodes.
    - **Discovery budgets, separate from display caps** (S3): a maximum number of entries read per directory, of directories visited, of fields and of relationships. Reading stops at a budget, and the section becomes `stale` with an "at least" note.
  - **`stack`**: from `package.json`, the runtime and package manager (from the lockfile name), the counts of dependencies and devDependencies, and the named major frameworks found among a fixed list. It also lists script **names**, never script bodies. From `pyproject.toml`/`go.mod`/`Cargo.toml` it reports only the name and the language.
- **Output safety** (K1, K2, K5, S2, and the followup "Archify inline grammar for `@ = & $`"):
  - Diagram IDs are opaque and generated (`e1`, `e1.f3`, `d7`), unique per document, and never built from labels.
  - Relationships are resolved on the raw names before IDs are assigned.
  - Labels go through `clean()` plus redaction. Directive-shaped text (`@`, `=`, `&`, `$` and a leading `|`) is neutralised or rejected.
  - Counts and degree use a `Map`.
  - Every case is checked through a real Archify `validate`.
- Draft at `project` depth: the existing panels, plus `@erd` (1 diagram), plus `@tree` (1 diagram), plus a stack table, which stays within the four-diagram limit.
  - The ERD is capped at 30 entities. When there are more, it shows the 30 most-connected and the panel says "at least N".
- **Report reset** in `bundle-sync --apply`: after files are written, it reads `.project/reports/state.delivery.json`.
  - It removes `state.html` and `state.explainer.json` only when their SHA-256 matches the receipt. It then removes the receipt.
  - Anything unmatched is left in place and named.
  - **Safety** (K3): every path (receipt, hash read, removal) is resolved with the existing `assertNoSymlinkPath()`. The `.project/reports` directory identity (device and inode) is pinned at the hash check and rechecked before each removal. Targets are the three fixed names only, and the receipt read is bounded.
  - **Contract** (X4): the `bundle-sync.mts` header and docs promise that `.project/` is never touched. They now name this as the single, receipt-verified exception, and a negative test proves nothing else under `.project/` changes.
  - It adds a NEXT STEPS line: "reports reset; re-run `/state`". If the bundle's pinned Archify revision differs from the registry entry, it also prints the `add-skill` update command.
- The legacy pre-2.51 pages (`index.html`, `state.json`, `theme.json`, `knowledge.html` and the others) are listed for the human, never deleted automatically.

- **Regeneration never replaces an unowned file** (S1). `facts-gather --explainer` refuses to overwrite an existing draft unless it is byte-identical to the receipt's recorded draft, or there is no receipt and the file is absent. The playbook stops with the name of the file to move. An end-to-end test covers deliver → edit draft → sync → re-run, and the edit survives.

**Connections**
`/state` → `facts-gather` (depth resolves to `project`) → draft containing the ERD, tree and stack → Archify `validate` → `deliver` → receipt.
`bundle-sync --apply` → hash-checked removal of the last delivery → NEXT STEPS → the human re-runs `/state` with the updated bundle and Archify.

## Rabbit holes

**Resolved here**
- **Schema source variety.** Drizzle snapshots are the only source. Prisma, TypeScript and SQL sources are `unconfigured` with a note. There is no parser over free text, so the regex risk (K4) does not arise.
- **Telling this repository apart from an installed project.** An installed project is one with `.project/.bundle-sync.json`. The bundle checkout has no sync manifest. A `state.depth` value in `ai-workflow.toon` overrides the detection.
- **Owning what the reset deletes.** Ownership is decided by the hashes in the delivery receipt, never by file names. A user-edited `state.html` survives.
- **The four-diagram limit.** The page uses exactly two native diagrams. The stack is a table, not a diagram.

**Pushed to /plan as risk**
- **Receipt field mapping** (A4). Spike with one real `deliver`: which receipt field equals the SHA-256 of the draft file (`specification.sha256` or `explainer.preparedSha256`)? If the draft cannot be matched, the reset removes only the HTML and the receipt, and the draft rule in S1 falls back to "refuse when a draft exists".
- **Native-diagram count** (X6). Record how many native diagrams today's draft uses, and assert at most 4 at both depths.
- **Stale or missing Drizzle snapshots.** LAH's newest snapshot predates nine migrations, so the plan decides how the `stale` note is worded and tests it against a copy of LAH's journal.
- **Large schemas.** The plan must check whether Archify's `@erd` lays out 30 entities readably, and lower the cap if it doesn't. This needs one real `deliver` on a fixture.
- **Legacy reports.** If a stable marker exists in the pre-2.51 pages, the plan may add a hash-free removal behind an explicit flag. Otherwise they are only listed.

**Sequencing** (X1, X2): this ships before `workflow-v3-rollout` runs `bundle-sync` on LAH, RN and climbing. A root without `package.json` reports `stack` as `unconfigured`, matching `package-less-ship-verification`.

**Pushed to no-go**
- Prisma (deferred: a followup if a project needs it).
- The `flow-report.mts` `state.json` input and the Archify package-size watch (archify-replaces-state followups, unchanged).
- SQL-migration replay, TypeScript schema parsing, live-database introspection.
- An architecture or dataflow diagram inferred from code (that is model-written content).

## No-gos (this pitch)

- ✗ No project code run, no child process, no database connection, no network. Archify's own CLI is still run by the playbook, as today.
- ✗ No model-written text in the draft. Every entity, field, directory and count comes from the collector.
- ✗ No change to the simple-depth page beyond the depth plumbing. The bundle repository's page stays as it is.
- ✗ No deletion of anything that does not match a receipt hash. No reset outside `bundle-sync --apply`.
- ✗ No Archify bump, vendoring or auto-install. A pin change only produces a printed command.
- ✗ No return of the old `metrics`, `runs`, `doneWork` or `tokens` sections.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Ran 2026-11-24 as four Orca workers under Run `run_5412bcf5df8e`: knowledge-historian and skeptic on codex, appetite-auditor and cross-pitch-projector on claude. All four completed, were collected and were released. 25 raw rows were condensed below; the IDs are the reviewers' own.

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| X4 | cross-pitch-projector | high | contract-conflict | The `bundle-sync.mts` header promises that `.project/` is never touched. The reset breaks this. Amend the header, docs and test so that receipt-verified removal in `.project/reports/` is the one documented exception, and add a negative test that nothing else under `.project/` changes. |
| S1 | skeptic | high | rabbit-hole | Reset keeps a user-edited draft, but the next `/state` overwrites it, because `writeReport()` renames over an existing file. Regeneration must refuse to replace an unmatched file. Add an end-to-end test: deliver → edit → sync → re-run. |
| K3 | knowledge-historian | high | missed-knowledge | Reset deletion needs symlink refusal on the receipt, hash and removal paths, plus a directory-identity recheck (`sync-tools-refuse-symlinks-in-source-and-destination`, `staging-substitution-can-redirect-cleanup`). Test a linked reports directory and an ancestor swap. |
| K1 / S2 | historian, skeptic | high | rabbit-hole | Diagram IDs must not reuse `clean()` labels, because underscores, Unicode and truncation make names collide. Generate opaque unique IDs, resolve relations on the raw names, and escape or reject directive syntax. Test this through a real `validate` (`parse-untrusted-values-and-re-emit-them`, `allow-list-untrusted-labels-at-ingest-and-at-render`). |
| K2 | knowledge-historian | high | missed-knowledge | The new routes (directory, script, package and schema names, and notes) are the same leak path as `snapshot-metadata-bypassed-output-scrubbing`. Redact every new label and note, and test credential-shaped names end to end. |
| S3 | skeptic | high | rabbit-hole | Display caps (60 nodes, 30 entities) do not bound discovery. Add separate budgets for directory entries, directories visited, fields and relationships. Stop early, and mark `stale` when a budget is hit. |
| A2 / A1 | appetite-auditor | medium | decomposition | About 14 files and 1,400 LOC against caps of 15 and 1,500, so there is no headroom. Build the collector depth and the bundle-sync reset as two independent scopes, and make the reset the one cut to a followup if the build overruns. |
| A3 | appetite-auditor | medium | hidden-cost | The Prisma grammar is the largest LOC risk. Drop it and ship Drizzle only (LAH's case), saving about 250 LOC; Prisma becomes `unconfigured`. |
| A4 | appetite-auditor | medium | spike | It is unverified which receipt field equals the draft's SHA-256 (`specification.sha256` or `explainer.preparedSha256`). Spike with one real `deliver` at `/plan`. If the draft cannot be matched, reset removes only the HTML. |
| K4 | knowledge-historian | medium | missed-knowledge | Any parser over project text must be a linear, line-anchored scanner (`backtracking-regex-over-untrusted-text-is-quadratic`). This is moot if Prisma is dropped. |
| K5 | knowledge-historian | medium | missed-knowledge | Use a `Map` or null-prototype objects for directory and entity counts, and add `constructor`, `toString` and `__proto__` as fixture names (`counting-untrusted-labels-in-a-plain-object-inherits-prototype-keys`). |
| X1 | cross-pitch-projector | medium | sequencing | `workflow-v3-rollout` runs `bundle-sync` on LAH, RN and climbing. Ship this first, or record that its apply runs on the changed bundle. |
| X5 | cross-pitch-projector | medium | followups | Read the nine archify-replaces-state followups before `/plan`, and fold or defer any that touch `facts-gather`, `state-report.md` or the `/state` playbook. |
| X2 | cross-pitch-projector | low | adjacent | Agree with `package-less-ship-verification` on how a root without `package.json` is labelled. The `stack` section reports `unconfigured` there. |
| X6 | cross-pitch-projector | low | adjacent | Count the existing native diagrams in the draft, and add a test that the total stays at or under 4 at both depths. |
| A5 / A6 / X3 | appetite, cross-pitch | low | acknowledged | Tree and stack are cheap. Build the large ERD fixture in the test instead of committing it. There is no file overlap with `review-bench-hardening`. |

## Bet decision

☑ **Bet** (→ /plan), 2026-11-24, after one re-shape that folded in the critique.
- **Addressed in the pitch:** X4, S1, K3, K1/S2, K2, S3, A2 (two scopes), A3 (Drizzle only; K4 moot), K5, X1, X2, X5 (followups read, and the `@ = & $` grammar item folded in).
- **Carried to /plan as risks:** A4 (receipt-field spike), X6 (diagram count), large-ERD layout (built in the test, A6).
- **Acknowledged:** A1 (borderline budget; scope B is the cut line), A5, X3.
☐ Re-shape — named gap:
☐ Pass — moved to `.project/pitches/_parked/state-project-depth/`; reason:
