# Shaping evidence: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/shaping-evidence.md` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


Companion to `pitch.md` (investigation + acceptance scenarios). Measured 2026-10-21 at `46c9290`.
Nothing was implemented or deleted.

## 1. Is the "disconnected files" problem real?

Graph: 7568 nodes, 13785 links (`graphify-out/graph.json`, built from `9e7682e0`; HEAD is `46c9290`, so the
graph is behind HEAD. `graphify.mts --check` reports CLEAN: it validates knowledge entries only).

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Missing indexing | No | 4085 document nodes; every skill, agent, rule, phase doc and pitch file is present |
| Stale graph | Minor | Commit lag only; does not explain the shape of the gaps |
| Intentionally isolated | Partly | 44 fully isolated nodes, all `.opencode/agents/*` (16) and `.opencode/commands/*` (28): thin adapter stubs that point at the canonical prompt/skill but carry no edge to it |
| **Missing relationships** | **Yes, the main cause** | Sampled `.claude/skills/ship`, `.claude/agents/{code-reviewer,architect}`, `ai-framework/rules/security`, `ai-framework/workflow/phases/4-ship`: **0 edges leave the file** (only `contains` to their own headings). Doc-to-doc semantic edges exist only as 336 `related` edges among `.project/knowledge/` entries. Relations: calls 3051, contains 6626, imports 2080, references 1239 (mostly doc→code), related 336 |

Consequences: `graphify query "pitch compaction done-work knowledge extraction"` returned test helpers
(`done()`, `pitch()`, `knowledge()`) and raw `plan.md`/`log.md` sections of a shipped pitch, not the `/ship`,
`/pitch-compress` or `/state` playbooks. Process files that explicitly name each other in prose
("See `ai-framework/workflow/phases/4-ship.md`") produce no edge. `.project/pitches` contributes 713 low-signal
nodes that the graph will lose when folders are retired. `.cursor/*` and `.agents/*` mirrors double the node
count for skills/agents with no `mirrors` edge to dedupe them.

## 2. What already works (extend, do not replace)

- `/pitch-compress` + `pitch-compress.mts` + `pitch-archive.mts`: inventory, per-section coverage ledger,
  byte-for-byte checksummed archive, transactional `remove`, restore, `--accept-gap` human acceptance, ledger
  destinations must be real files outside the pitch. 35 ledgers, 37 compacted pitches.
- `/ship` knowledge extraction (step 3) with `id`/`tags`/`related` rule and graph rebuild.
- Knowledge overlay in `graphify.mts` (typed entries, `related`, tag index, broken-link and orphan checks).
- `.project/records/pitch-compression/` (14 per-pitch records, graph-indexed): precedent for one-file-per-pitch history.
- `/cooldown` issue→pattern→rule promotion with per-item approval.
- `/state` reads `done-work.md`, knowledge counts from the graph, and `.project/compaction/archives`.

## 3. What fails the brief

1. **Compaction is optional and detached.** `/ship` never invokes it. 9 shipped pitch folders are uncompacted
   (state-ai-authoring, state-deep-evidence, state-fragment-sanitizer, state-report-redesign,
   test-execution-performance, token-attribution, token-time-report 352K, workflow-usage-capture, workflow-usage-state).
2. **`done-work.md` is a growing narrative, not documentation.** 453 lines, 37 entries, 78.9 KB, median 1.5 KB,
   max 7.3 KB (`instruction-compression`). Entries recount audit cycles, "no-gos held" and release numbers.
   Size tracks the pitch, the opposite of selective retention. `/state` parses it as the compaction source.
3. **Coverage is satisfied by pointing at the narrative.** 189 ledger sections across 18 of 35 ledgers use
   `.project/done-work.md` itself as the "extracted" destination; 8 ledgers use it for every section
   (e.g. `instruction-compression` 33/33, `unified-toon-config` 22/22). Mechanical coverage 1.0, no durable typed home.
4. **No home for current behavior.** `.project/context/product.md` (1.9 KB) and `architecture.md` (2.9 KB)
   describe a 7.5k-node repo; nothing updates them after ship (`/ship` step 6 is "only if...").
5. **Three decision homes, no supersession.** `.project/knowledge/decisions/` (16, graph-indexed),
   `.project/decisions/` (2 TOON grammar docs), `.project/design/decisions/` (empty template; named by the
   `4-ship.md` phase doc). The decision template and `graphify.mts` have no `status`/`supersedes` field
   (checked those two files only). Several "decisions" are really inherited pitch no-gos.
6. **Deletion safety lacks a reference scan.** `pitch-archive.mts` has no check that surviving files stop
   pointing at `.project/pitches/<slug>/`; destination existence is the only check.
7. **/state reaches into archives.** `state-history.mts` lists `.project/compaction/archives` and resolves
   `archives/<name>/files` (line ~165) for history; the brief wants routine retrieval without archives.
8. **Retention has no budget or reason taxonomy.** A section is `extracted` or `gap`; every gap needs
   per-item human acceptance, which pushes authors toward the cheap `done-work.md` pointer instead of omitting.

## 4. Design recommendations

### 4.1 Process connections (capability 1)

Edge types, each tied to a named query that consumes it. No tag-overlap or "everything relates" links.

| Edge | From → To | Source of truth | Query it serves |
|---|---|---|---|
| `mirrors` | adapter/mirror → canonical (`.opencode/*`, `.cursor/*`, `.agents/*` → `.claude/*`) | derived from path + name; `canonical-mirror-sync` rule | "which file is canonical?"; dedupe results |
| `phase-doc` | skill ↔ `ai-framework/workflow/phases/N-*.md` | declared | "what does /ship do end to end?" |
| `dispatches` | skill/phase → agent | declared | "who reviews in /audit?" |
| `reads` | skill/agent → rule file / context doc | declared | "which rules apply at /build?" |
| `writes` | skill → record kind (pitch file, knowledge, outcome record, status) | declared | "where does /ship put output?" |
| `promoted-from` | rule → knowledge entry | knowledge `related`/`source` | "why does this rule exist?" |
| `constrains` / `supersedes` | decision → rule/decision | decision frontmatter | "what binds this area, what is current?" |
| `references` (doc→doc) | any doc → file it names in backticks/links | derived | already exists doc→code; extend to doc→doc |

**Recommendation: one declared manifest** `ai-framework/workflow/relations.toon` (machine-data format rule)
plus derived path-reference and `mirrors` edges, overlaid by `graphify.mts` like knowledge entries. Not
frontmatter: skills/agents are mirrored to four vendors and guarded by `agent-frontmatter-invariant.test.mts`;
a single manifest is installed once and validated once. Validator (`graphify.mts --check`): declared targets
exist; every canonical skill, agent and rule file has at least one edge or an explicit `standalone: <reason>`;
adapters without a `mirrors` edge fail. Rules stay "search, don't bulk load": `reads` edges name only rules
that gate that phase or role.

### 4.2 Where consolidation lives (capability 2)

**Recommendation: a required final activity of `/ship` ("Consolidate"), with retirement as its own gated sub-step.**

- Why not a separate post-ship step: evidence item 1. A step nobody is forced to run left 9 pitches unconsolidated,
  and the author has full context only at ship time. Why not auto-delete inside ship: `[1] ship / [2] hold` is not a
  deletion gate, and `/pitch-compress` already owns that gate.
- Flow: reconcile (SHIPPED.md) → classify and extract → commit ledger v2 → write outcome record → rebuild graph →
  **ship gate shows coverage, omissions by reason, and doc/decision diffs** → on approval pitch is `consolidated`
  → separate approval runs archive → verify → remove (existing `/pitch-compress` machinery).
- Extraction is judgment work: dispatch a `standard`-profile sub-agent (nested dispatch is allowed); `/ship` stays `fast`.
- Failure behavior: a persisted retirement state file per slug
  (`extracted → ledger-committed → archived → verified → approved → removed`). Each step is idempotent and
  `--apply`-gated; rerun resumes at the first incomplete step; any mismatch (source changed since archive, ledger
  coverage <1.0, dangling references, graph check failing) stops with the exact reason and leaves the pitch intact.
  A pitch that is shipped but not consolidated shows as `shipped-unconsolidated` in `/state` and `/cooldown`;
  consolidated but not retired shows as `retirement-pending`. Declining deletion is a valid end state.

### 4.3 Destinations and single ownership (capability 2)

| Content | One owner | Rule |
|---|---|---|
| Current functionality, behavior, contracts, dependencies, known limits | `.project/context/product.md`, `architecture.md`, plus existing `ai-framework/integrations/*.md` contract docs | Edit in place; each capability/contract carries `since` and an evidence path (test or code). Not a changelog |
| Architectural decisions | `.project/knowledge/decisions/` (single home; retire the `design/decisions/` reference; index `.project/decisions/*`) | Template gains `status: accepted\|superseded\|deprecated`, `supersedes`, `superseded_by`, `alternatives`, `applies-to`; superseded entries stay, marked, and drop out of "current" queries |
| Reusable know-how, pitfalls | `.project/knowledge/{patterns,issues}/` | Merge-first: nearest graph neighbours are checked; `merged-into` or `new` with non-duplication reason |
| Binding rules | `ai-framework/rules/` and `.project/rules/` | Unchanged: only `/cooldown` promotion with per-item approval. Consolidation may only queue a candidate |
| Delivery history | **`.project/records/shipped/<slug>.md`** (one short file per pitch) | Links only plus 3–6 lines: outcome, `docs`, `decisions`, `knowledge`, `code`, `verification`, `followups`, `archive`. No restated behavior or decision text |
| Work queue | `.project/pitches/_followups.md` | Item text lives here; a limit that affects current behavior also appears under "Known limits" in the owning doc, and the record links both |

Dedicated history folder verdict: **no new top-level `history/`**. `.project/records/` already holds
graph-indexed per-pitch records; a `shipped/` subfolder extends it. `done-work.md` becomes a **generated index**
(one line per pitch: slug, date, link, `legacy` flag), no prose, so it cannot compete as a source of truth.
`runs/` stays the git-ignored ship-time log; `CHANGELOG.md` stays the version log.

### 4.4 Selective retention (capability 3)

Ledger schema v2 (v1 still read):

- Per source section: `class` (`behavior | decision | know-how | rule | limit | omit`), `disposition`
  (`extracted | merged | omitted`), `destination` (typed, durable, outside the pitch, **not** `done-work.md` and
  not the outcome record for behavior/decision classes), `helps` (one line: the future decision or action).
- `omitted` takes a closed `reason`: `narrative | file-list | intermediate-attempt | repeat-audit |
  resolved-debug | in-code | no-future-use`, plus `failed-approach` only with a lesson destination. Reviewed in
  aggregate at the gate (counts + a sample); `other` needs per-item acceptance (today's `--accept-gap`).
- Budgets: outcome record ≤ fixed size cap independent of pitch size; new knowledge entries default ≤3 per pitch
  with a justification above that; validator reports retained bytes vs source bytes.
- Rule: if `helps` cannot be written, the section is `omitted`.

### 4.5 Retirement and recovery (capability 4)

Keep `pitch-archive.mts` transactional `remove`. Add: (a) surviving-reference scan (no file outside the pitch,
archive and `_archive/` may reference `.project/pitches/<slug>/`; fix or fail); (b) require committed v2 ledger,
outcome record and `consolidated` state; (c) archive stays out of the graph (already ignored) and out of `/state`
reads: `state-history.mts` must source audit/lesson facts from the outcome record instead of `archives/*/files`.

### 4.6 Graph and /state (capability 5)

- Rebuild + `--check` after consolidation and after removal; check adds "no node references a retired pitch path".
- Outcome records carry typed links, so `explain <slug>` reaches docs, decisions, knowledge and code in one hop.
- `/state` evidence: *current capabilities/architecture* from context docs + contract docs; *decisions* from
  knowledge decisions with `status: accepted`, superseded counted separately; *rules* from the relations manifest
  `reads`/`constrains` edges; *unresolved work* from followups + "Known limits"; *history* from `records/shipped`
  only. One row per slug (precedence: outcome record > legacy `done-work` entry > live pitch dir) so a slug never
  counts twice. History is labelled historical and never placed in a "current" fact.

## 5. Migration approach

1. **M0 graph relations** (no data moves): manifest, derived edges, validator. Independent of everything else.
2. **M1 schemas, dual-read**: ledger v2, outcome-record template, decision `status`, validators; v1 ledgers and
   legacy `done-work.md` entries remain valid and readable.
3. **M2 backfill by trial, one pitch per run**: `test-execution-performance` (small), then `token-time-report`
   (big, 352K) as the big-batch proof, then the other 7. Each ends at a human gate; no deletion without approval.
4. **M3 legacy 37 entries**: no mass rewrite. They stay readable and are listed `legacy` in the generated index.
   Upgrade on demand: `/cooldown` flags a legacy entry when a decision it cites is superseded, a followup
   resolves, or a reference dies. Opening a legacy archive for upgrade needs human approval.
5. **M4 decisions**: choose the single ADR home, add status fields, mark inherited-no-go entries; touch older entries
   only when a new decision supersedes them.
6. Installation template and `setup-validator` ship the new records dir, manifest and templates so installed
   projects get the same flow; `bundle-sync` carries the schema, not instance records.

## 6. Acceptance scenarios

Baselines: done-work median 1.5 KB / max 7.3 KB per entry; 189 ledger sections pointing at `done-work.md`;
0 skill/agent/rule/phase files with an outbound doc edge; 44 isolated nodes; 9 unconsolidated shipped pitches.

**A. Newly shipped pitch.** Ship `X` end to end. Result: ledger v2 coverage 1.0; `product.md`/`architecture.md`
(or a contract doc) edited where behavior changed; decisions carry `status`; one `records/shipped/X.md` with no
restated prose; graph rebuilt, `--check` CLEAN. After approved retirement, `rg "pitches/X/"` outside archive,
`_archive/` and git history returns nothing; `explain X` reaches every destination. Declining retirement leaves the
pitch intact and `/state` shows `retirement-pending`.

**B. Older shipped pitch.** (i) Uncompacted `test-execution-performance` goes through the same flow in one run.
(ii) A legacy compacted pitch (`unified-toon-config`) is untouched, appears once in the generated index as
`legacy`, and `/state` counts it once. Upgrade is on demand only, never required for graph or state validity.

**C. Big-batch concision.** Consolidate `token-time-report` (352K, largest). Outcome record within the same size
cap as a small-batch record; retained bytes ≤ 5% of source bytes; ≤3 new knowledge entries unless justified;
every extracted item has `helps`; the entry set contains no task-by-task narrative, file list or audit recap
(reviewer spot-check of 10 sampled lines).

**D. Superseded decision or rule.** Pitch `Y` reverses decision `D`. `D` gets `status: superseded`,
`superseded_by: Y-decision`, rationale kept in one "why it changed" line; Y-decision `supersedes: D`. `graphify
query` for the area returns the current decision first and flags `D` as superseded; `/state` counts it as
superseded, not accepted. A rule change still goes through `/cooldown` approval and updates the `promoted-from`
edge; the old rule text is not duplicated.

**E. Interrupted consolidation, safe retry.** Kill the process after ledger commit, after archive, and during
`remove`. Each rerun resumes at the first incomplete step, produces no duplicate knowledge entries or records
(idempotent by slug), never deletes before `verify` and approval passes, and the pitch folder is either fully
present or fully removed with a restorable archive. A source edit between archive and remove is a reported
conflict, not an overwrite.

**F. Traversal and /state after removal.** With `X`'s folder removed and archives unread (assert no read under
`.project/compaction/archives` during the run): `graphify query/explain` answer "how does X's feature behave, why
was it built this way, which rules apply" using context docs, decisions, knowledge and rules; `--check` reports 0
dangling references; `/state` lists X once under history, current capabilities come from docs, and no chronology
text appears in current-state facts.

**G. Explicit omission with accountability.** A pitch with 6 low-value sections (a resolved false-positive audit
finding, a file list, a debugging trace, a repeated audit recap, an abandoned approach with no lesson, an
intermediate attempt). Each is `omitted` with a closed reason; the gate shows counts by reason plus a sample;
coverage still reports 1.0; an `other` reason demands individual acceptance; a section with no reason or a
`destination: done-work.md` for behavior/decision class fails commit.

**H. Connections (capability 1).** `graphify explain` on each of the 8 phases returns its skill, phase doc, roles
and gating rules in ≤ 1 hop, with no unrelated community members. `graphify query "who reviews /audit"` returns
the `dispatches` targets. 0 isolated adapter nodes. 0 canonical skill/agent/rule files without an edge or declared
`standalone`. Adding a skill without a manifest entry fails `--check`.
