# Plan: connected-memory-consolidation

> Moved from `.project/pitches/connected-memory-consolidation/plan.md` on 2026-10-23 when the pitch folder was compacted. The content is unchanged; only link targets were rewritten. The original bytes are in the compaction recovery archive.


**Pitch**: pitch.md  •  **Appetite**: big-batch ×4 (bet: P1 `connected-process-graph`, P2a `consolidation-schemas`, **P2c `legacy-upgrade`**, **P2d `installed-sync`** — the last two added at /plan Revise, see pitch Amendment; P2b, P3a, P3b un-bet)  •  **Hill**: hill.md
**Planned**: 2026-10-21 at `b26b45b`  •  **Revision 2** (same day): adds P2c and P2d, local relations overlay in P1  •  **Orca**: bypassed (`orca=normal`); nested dispatch uses ordinary subagents.

Scope IDs are prefixed by track: `P1-S*` (graph) and `P2a-S*` (schemas). Tests run with
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test <file>`; there is no build, typecheck, lint or
i18n command here (`.project/context/stack.md`), so those exits are skipped and said so.

## Baseline drift found at plan time (supersedes `shaping-evidence.md` numbers)

Measured by `baseline.mts` (this folder; rerun it, don't trust prose). The shaping numbers were taken at `46c9290`; commit
`b26b45b` then compacted the nine uncompacted shipped pitches.

| Quantity | Pitch said | Now (`b26b45b`) |
|---|---|---|
| ledgers (all `schemaVersion: 1`) | 35 | **46** |
| ledgers pointing ≥1 section at `done-work.md` / such sections | 18 / 189 | **27 / 232** (7 ledgers 100%) |
| `done-work.md` entries / bytes / median / max entry | 37 / 78.9 KB / 1.5 KB / 7.3 KB | **46 / 90.8 KB / 1.35 KB / 7.3 KB** |
| uncompacted shipped pitches | 9 | **0** (only this pitch and `workflow-v3-rollout` remain) |
| knowledge decisions | 16 | 16 |
| canonical files in graph / with any cross-file edge / isolated `.opencode` adapters | "0 outbound doc edges" / 44 | 66 / 11 (includes doc→code) / 44; graph built at `46c9290`, stale |

Consequences carried into this plan:
- "37 legacy entries" is **46 legacy entries** everywhere (P2a-S5 preserves all 46 verbatim).
- Scenario B(i) and C (backfill `test-execution-performance`, `token-time-report` as the big-batch proof) **no longer have
  an uncompacted subject**. P2a proves schemas on synthetic fixtures. Scenario C's big-batch proof is now an upgrade of the
  already-compacted `token-time-report` in P2c; the fresh-ship end-to-end proof (scenario A) still belongs to P2b.
- All 46 compacted pitches are the **legacy set**. Revision 2: they are not left as legacy; **P2c upgrades every one** (27 whose
  ledgers point at `done-work.md` need real work; 19 already have durable destinations and need mostly mechanical work).
- This repo is also the first "installed project" for the sync work: P2d treats a copy of its pre-change state as the upgrade fixture.

## Scopes

LOC includes tests. Track totals: P1 ≈ 1300 (cap 1500), P2a ≈ 1900 (**over cap, see Risks R1**), P2d ≈ 1100 (over cap: see R14), P2c tooling ≈ 950 plus the campaign (data, not code).

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| P1-S1 | Relations manifest reader + validator | new `ai-framework/scripts/graphify-relations.mts` + `.test.mts` | 450 | — | P1-S2, P2a-S1, P2a-S3 | no: defines the schema every other P1 scope consumes | — (main, deep) |
| P1-S2 | Derived doc→doc path-reference edges | new `ai-framework/scripts/graphify-refs.mts` + `.test.mts` | 300 | — | P1-S1, P2a-S1, P2a-S3 | yes: new disjoint files, pure function, self-contained exit | standard |
| P1-S3 | Populate `relations.toon` | new `ai-framework/workflow/relations.toon` | ~110 entries (data) | P1-S1 | P1-S2, P2a-* | yes: one data file, exit is the S1 validator on the real tree | standard |
| P1-S4 | Graphify integration (overlay + `--check` + stats) | `graphify.mts`, `graphify.test.mts` | 250 | P1-S1, P1-S2, P1-S3, **P2a-S3** | — | no: shares `graphify.mts` with P2a-S3 (single writer) | — (main) |
| P1-S5 | Acceptance, docs, release record | `ai-framework/workflow/overview.md`, `AGENTS.md`, `CLAUDE.md` (sync), `CHANGELOG.md`/`VERSION` (via `changelog.mts`), regenerated `graphify-out/graph.json` | 150 | P1-S4 | — | no | — |
| P2a-S1 | Ledger v2 commit + dual-read in `pitch-compress.mts` | `pitch-compress.mts`, `pitch-compress.test.mts` | 550 | — | P1-*, P2a-S3 | no: security-bounded parse, gate semantics | — (main, deep) |
| P2a-S2 | Remove-gate reads v1 and v2, never destructive on doubt | `pitch-archive.mts`, `pitch-archive.test.mts` | 300 | P2a-S1 | P2a-S3, P2a-S4 | no: the deletion gate (K3/K5) | — (main, deep) |
| P2a-S3 | Decision `status`/`supersedes` in graph + templates | `graphify.mts`, `graphify.test.mts`, `.project/knowledge/templates/decision.md`, `ai-framework/templates/project/knowledge/templates/decision.md`, `.project/knowledge/README.md` (+ template copy) | 350 | — | P1-S1..S3, P2a-S1, P2a-S2 | no: edits `graphify.mts` first (before P1-S4) | — (main) |
| P2a-S4 | Outcome-record template + lint | new `ai-framework/scripts/outcome-record.mts` + `.test.mts`; `ai-framework/templates/project/records/shipped/{_template.md,.gitkeep}`; `.project/records/shipped/.gitkeep` | 400 | P2a-S1 (shared `helps`/path rules) | P2a-S2, P2a-S3 | yes: new disjoint files, clear exit; main reviews the size-cap numbers | standard |
| P2a-S5 | Generated `done-work.md` index, dual-read of slug rows | new `ai-framework/scripts/done-work-index.mts` + `.test.mts`; `pitch-compress.mts` (`doneWorkSlugs`), `state-snapshot.mts` + `.test.mts`, `ai-framework/templates/project/done-work.md`, `bundle-sync.test.mts` | 450 | P2a-S1, P2a-S4 | — | no: edits shared readers | — (main) |
| P2a-S6 | Validators, skill doc, release record | `setup-validator.mts` + test, `workflow-doctor` scaffold test, `bundle-sync` test, `.claude/skills/pitch-compress/SKILL.md` + `.cursor` byte copy, `SETUP.md`, `CHANGELOG.md`/`VERSION` | 300 | P2a-S2, P2a-S4, P2a-S5 | — | no | — |

| P1-S1b | Project-local relations overlay + registry-owned exemption | `graphify-relations.mts` (S1 file), `.test.mts` | +120 | P1-S1 | P1-S2 | no: same files as S1 | — (main) |
| P2d-S1 | Project-side migration tool `consolidation-migrate.mts` | new `ai-framework/scripts/consolidation-migrate.mts` + `.test.mts` | 450 | P2a-S4, P2a-S5, P1-S4 | P2c-S1 | no: writes instance data, safety-critical | — (main, deep) |
| P2d-S2 | `bundle-sync` next steps + `workflow-doctor` legacy info | `bundle-sync.mts` + test, `workflow-doctor.mts` + test, `ai-framework/docs/versioning-and-sync.md`, `.claude/skills/bundle-sync/SKILL.md` + `.cursor` copy | 300 | P2d-S1 | P2c-S1 | no: shared sync code | — (main) |
| P2d-S3 | Installed-project upgrade fixture, end to end | new `ai-framework/scripts/installed-upgrade.test.mts` (+ fixture builder in `state-test-helpers.mts` style helper) | 350 | P2d-S1, P2d-S2 | P2c-S2 | yes: new test file only, exit is the test | standard |
| P2c-S1 | Legacy status + prepare (dry-run, no archive read) | new `ai-framework/scripts/legacy-upgrade.mts` + `.test.mts` | 500 | P2a-S1, P2a-S4, P2a-S5 | P2d-S1 | no: judgment-heavy contract with the gate | — (main, deep) |
| P2c-S2 | Legacy apply (v2 ledger replace, outcome record, index, retire entry), resumable | `legacy-upgrade.mts`, `.test.mts` (+ `pitch-compress.mts` hook only if S1 exposes none) | 450 | P2c-S1, P2a-S2 | P2d-S3 | no | — (main, deep) |
| P2c-S3 | Campaign tranche A: the 19 ledgers that already have durable destinations | data only: `.project/compaction/ledgers/*`, `.project/records/shipped/*`, `.project/done-work.md`; one `/pitch-compress`-style run per pitch | 19 runs | P2c-S2 | — | yes, per pitch: self-contained, exit is the lint + status command; ≤5 per human gate | standard |
| P2c-S4 | Campaign tranche B-small: pointer ledgers with ≤ 12 sections pointing at `done-work.md` | same files | 22 runs | P2c-S3 first proof | — | yes per pitch, archive read approved per pitch | standard |
| P2c-S5 | Campaign tranche B-large: ledgers with > 12 sections pointing at `done-work.md`: `agent-model-sweep` 13, `instruction-compression` 33, `orca-role-pools` 22, `unified-toon-config` 22, `upstream-project-drift` 21 | same files | 5 runs | P2c-S4 | — | yes per pitch for drafting; main reviews the gate sample | standard (deep for `instruction-compression`) |

Cross-track ordering (single-writer files): `graphify.mts`/`graphify.test.mts` → P2a-S3, then P1-S4. `pitch-compress.mts` →
P2a-S1, then P2a-S5. `CHANGELOG.md`/`VERSION` → P1-S5 and P2a-S6 each add one entry, serially (second run reads the
first's version). `AGENTS.md`/`CLAUDE.md` change only in P1-S5, in one commit. `bundle-sync.mts` → P2d-S2 only. `legacy-upgrade.mts` → P2c only. `.project/done-work.md` and the ledgers → only through `legacy-upgrade.mts` (never hand-edited).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Common to every scope: its own test file passes; `node ai-framework/scripts/setup-validator.mts` exit 0 at scope end for
scopes that touch generated or mirrored files; if a canonical `.claude/skills/*/SKILL.md` or `.claude/agents/*.md` changed,
`node ai-framework/scripts/skill-defaults.test.mts` (byte-identity of vendor mirrors) is part of the run.
Inherited constraints (from `ai-framework/rules/` and `.project/rules/`, searched not bulk-loaded): `security.md` §9
(bounded parse, only bundle code executed, no symlink follow), `machine-data-format` (new agent-loaded data = TOON via
`runtime/data-file.mts`, never `JSON.parse` on it), `canonical-mirror-sync` (Cursor byte copy in the same commit),
`tool-use` (graph query before grep), `testing` (behavior tests, no render-only).
Rules promoted by the 2026-10-21 forced cooldown (`runs/cooldown-2026-10-21-forced.md`), now binding here:
- `coding-standards.md` "Producer and Reader Share One Bound" (C5): ledger v2 and the outcome record (writers: `pitch-compress`, `legacy-upgrade`; readers: `pitch-archive`, `setup-validator`, `state-snapshot`, lint) share one exported size/count constant per artifact, and a test commits an artifact at the maximum supported size (e.g. the 34-section `token-time-report` ledger, the 7.3 KB legacy entry) and reads it back through every reader. Applies to P2a-S1, S2, S4, S5, P1-S1 (manifest size), P2c-S2.
- `testing.md` "Schema bumps move with their dependents" (C8): ledger `schemaVersion` 2, manifest `schemaVersion`, outcome-record version: emitter, refusal text, migrator and every fixture literal move in one commit; `grep -rn "schemaVersion: 1"` inventory is the P2a-S1 exit and the full suite runs before any such scope is `done`.
- `testing.md` "macOS tmpdir realpath" (C9): all temp-project fixtures (P2d-S3, `legacy-upgrade`, `done-work-index`, `consolidation-migrate`) compare `realpath`ed paths.
- `3-audit.md` "Measurement over assertion" (C4): the 10-line gate sample and the query-precision checks are measured, not asserted by the drafting subagent.

### P1-S1 — Relations manifest reader + validator
- `node --test ai-framework/scripts/graphify-relations.test.mts` exit 0, covering: valid manifest parses; refusal ≠ absent (a refused file is never rewritten); unknown relation kind, missing target file, entry with neither edges nor `standalone: <reason>`, canonical file (skill/agent/rule/phase doc glob) absent from the manifest, and an adapter without a derivable canonical each produce a distinct error.
- `mirrors` derivation test: `.opencode/agents/x.md`, `.opencode/commands/x.md`, `.codex/agents/x.toml`, `.agents/skills/x/SKILL.md`, `.cursor/{agents,skills}` map to the canonical `.claude` file; derivation never targets a mirror; a mirror whose canonical is missing fails.
- `rg -n "JSON.parse" ai-framework/scripts/graphify-relations.mts` returns nothing for manifest input (uses `readData`).
- Manifest carries `schemaVersion`; a newer unknown version is a refusal that names the version and says to sync the bundle scripts (an old install must never misread a newer manifest).

### P1-S1b — Project-local overlay and registry exemption (so installed projects pass `--check`)
- `node --test ai-framework/scripts/graphify-relations.test.mts` exit 0 with new tests: an optional `.project/relations.toon` overlay adds entries for the project's own skills, agents and rules (same schema, same validation); an overlay entry that shadows or contradicts a bundle entry is an error; bundle coverage is checked only for bundle-owned files; a skill/agent owned by the local skill registry (`ownedPaths` from `skill-sync.mts`, e.g. `caveman`) needs no entry and is reported as `registry-owned`, not as an orphan (`installed-skill-wrappers-ship-as-orphans`).
- A project with no overlay and no extra skills passes; a project with an unlisted local skill fails with a message naming the overlay file to edit.
- `bundle-sync` classification: `ai-framework/workflow/relations.toon` is bundle-owned (three-way sync applies); `.project/relations.toon` is outside `SYNCED_DIRS` and is never written (asserted in P2d-S3).

### P1-S2 — Derived path-reference edges
- `node --test ai-framework/scripts/graphify-refs.test.mts` exit 0, fixtures prove: a path inside a fenced block yields no edge; a path that does not resolve to an existing file yields none; a path naming a mirror resolves to the canonical file; self-references and duplicates collapse to one edge; a file mentioned 56 times from 30 files yields one edge per source file (the S1 flood case).
- Edge-count budget is enforced in code (per source file and total) and the test asserts that exceeding it is an error, not truncation.

### P1-S3 — Populate `relations.toon`
- `node ai-framework/scripts/graphify.mts --check` is not required here; instead the S1 validator run against the real tree (`node ai-framework/scripts/graphify-relations.mts --check`, exposed by S1) exits 0 with 0 errors and 0 canonical files unlisted.
- Every entry's `reads` names only rules/context that gate that phase or role (spot-check: ≤ 6 `reads` per skill or agent; `rg` count script in the test fixture asserts the cap).
- `wc -c ai-framework/workflow/relations.toon` ≤ 16 KiB; `node ai-framework/scripts/toon-convert.mts --report ai-framework/workflow/relations.toon` prints stored vs minified-JSON size (report only; no saving is claimed unless it prints one).

### P1-S4 — Graphify integration
- `node --test ai-framework/scripts/graphify.test.mts` exit 0 with new tests: overlay adds `workflow_overlay` links named `mirrors`, `phase-doc`, `dispatches`, `reads`, `writes`, `references`; a rebuild replaces (never duplicates) them; `--check` exits 1 when a skill has no manifest entry (**scenario H: "adding a skill without a manifest entry fails `--check`"**); `--json` stats carry per-edge-type counts.
- `node ai-framework/scripts/graphify.mts --check` exit 0 on this repo with the real manifest (CLEAN or warnings only).
- `node ai-framework/scripts/graphify.mts` (real build, `uv` present) exit 0, then `node -e` assertion script: 0 isolated `.opencode` adapter nodes; every canonical skill/agent/rule/phase file has ≥1 workflow edge or a `standalone` reason; total `references` edges ≤ the budget from P1-S2.
- Query precision check per edge type (S1 critique): a fixture list of ≥8 questions with expected targets, run through `node ai-framework/scripts/graphify.mts query`; each edge type must return its expected target in the top results, and the result is recorded in `log.md` with before/after counts. An edge type that fails the check is dropped, not tuned around.

### P1-S5 — Acceptance, docs, release record
- Scenario H commands, results appended to `log.md`: `graphify explain` on each of the 8 phases returns skill, phase doc, roles and gating rules within 1 hop and no unrelated community members; `graphify query "who reviews /audit"` returns the `dispatches` targets.
- `node --test ai-framework/scripts/instruction-loading.test.mts` exit 0 (AGENTS.md and CLAUDE.md stay in sync).
- `node ai-framework/scripts/changelog.mts` records the version entry; `node ai-framework/scripts/setup-validator.mts` exit 0; `node --test` over the full suite via `node ai-framework/scripts/run-tests.mts` exit 0.

### P2a-S1 — Ledger v2 commit + dual-read
- `node --test ai-framework/scripts/pitch-compress.test.mts` exit 0 with all existing v1 tests unchanged, plus v2 tests: mapping without `schemaVersion` still commits as v1 byte-for-byte the same record; `schemaVersion: 2` requires per section `class` ∈ {behavior, decision, know-how, rule, limit, omit}, `disposition` ∈ {extracted, merged, omitted}, a `helps` line for extracted/merged, a closed `reason` for omitted (`other` needs `--accept-gap`; `failed-approach` needs a lesson destination), a per-section `bodyHash`, and an "other files" entry for pitch files not covered by a section (K1).
- Refusals tested: destination under `.project/pitches/` (K1, `_followups.md` "Ledger required-set design"); `.project/done-work.md` or the outcome record as destination for `behavior` or `decision` class (scenario G); a hash that no longer matches the live section; an unsupported `schemaVersion` (3, 0, "2"); an oversize or non-object mapping (bounded parse, `security.md` §9).
- `rg -n "schemaVersion: 1" ai-framework/scripts/pitch-compress.mts` shows v1 still written for v1 input only.
- Test inventory (K11): a recorded list in `log.md` of every test asserting a ledger `schemaVersion` or shape (`pitch-compress.test`, `pitch-archive.test`, `bundle-sync.test`, `setup-validator.test`, `state-*` if any), each green after the change.

### P2a-S2 — Remove gate reads v1 and v2, never destructive on doubt
- `node --test ai-framework/scripts/pitch-archive.test.mts` exit 0 with all existing tests unchanged, plus: `remove` accepts a committed v2 ledger with `merged`/`omitted` sections; refuses (and leaves every file present) a v2 ledger with an unaccepted `other` omission, a stale `bodyHash`, a missing "other files" entry, a destination under the pitch, `schemaVersion` ∉ {1, 2}, or a malformed file.
- **K3 contract test:** a table-driven test over ledger shapes {absent, empty, v0, v1 ok, v2 ok, v2 bad hash, v3, truncated JSON, symlink} asserting `remove` deletes only for the two ok rows and never throws after a partial delete. A reader change cannot make the writer destructive.
- v1 remove path is byte-for-byte unchanged: the existing remove fixtures from `pitch-archive.test.mts` run against a v1 ledger copied from `.project/compaction/ledgers/` (one real ledger, read-only fixture, no archive read).

### P2a-S3 — Decision `status` / `supersedes`
- `node --test ai-framework/scripts/graphify.test.mts` exit 0 with new tests: frontmatter `status: accepted|superseded|deprecated`, `supersedes`, `superseded_by`, `alternatives`, `applies-to` parse; entries with no `status` read as `accepted` with **no** warning (the 16 existing decisions stay valid); `superseded` without a resolving `superseded_by`, a `superseded_by` whose target does not list `supersedes` back, and an unknown status value are errors; `supersedes`/`superseded_by` produce a `supersedes` overlay edge; `index.md` shows status and counts accepted vs superseded separately.
- `node ai-framework/scripts/graphify.mts --check` exit 0 on this repo (16 decisions unchanged, 0 new errors).
- `rg -n "ADR-XXX|design/decisions" .project/knowledge/templates/decision.md ai-framework/templates/project/knowledge/templates/decision.md` returns nothing (template drops the empty-home reference; the phase doc `4-ship.md` still names it and is P2b's edit).
- Spike result (R4) recorded in `log.md`: how `.project/decisions/*.md` (no frontmatter, `**Status**:` line) are indexed; default is a read-only parse of that line into decision nodes without touching those files.
- Cursor/agents mirrors: `diff -r .project/knowledge/templates ai-framework/templates/project/knowledge/templates` for `decision.md` is empty.

### P2a-S4 — Outcome-record template + lint
- `node --test ai-framework/scripts/outcome-record.test.mts` exit 0: a conforming record passes; fails on missing field (`outcome`, `docs`, `decisions`, `knowledge`, `code`, `verification`, `followups`, `archive`), a link target that does not exist or is under `.project/pitches/<slug>/`, prose beyond the 3–6 line cap, a heading that restates a section, or size above the cap; the cap is identical for a small and a big-batch fixture (scenario C precondition).
- Size-cap numbers are calibrated (R3) from the two largest existing `done-work`/`pitch-compression` records and recorded in `log.md`; the test asserts the constant, not a re-derivation.
- `test -f ai-framework/templates/project/records/shipped/_template.md` and `test -f .project/records/shipped/.gitkeep`; `node ai-framework/scripts/workflow-doctor.mts --json` reports 0 failures (scaffold restore picks up the new template files).
- Graph: `node ai-framework/scripts/graphify.mts --check` exit 0 with a sample record (a throwaway fixture, not committed).

### P2a-S5 — Generated `done-work.md` index
- `node --test ai-framework/scripts/done-work-index.test.mts` exit 0: regeneration writes only inside `<!-- done-work-index:start/end -->` markers; **the 46 legacy `## slug — shipped` entries are byte-identical before and after** (test hashes the real `.project/done-work.md` entries section); running twice is a no-op; a file the generator did not write (no markers) is only appended to, never rewritten (`a-report-never-overwrites-a-file-it-did-not-write`); symlink target refused.
- Dual-read: `pitch-compress.mts` `doneWorkSlugs` and `state-snapshot.mts` count a slug once whether it has a legacy entry, an index line, or both (precedence: outcome record > legacy entry > live pitch dir); `node --test ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/pitch-compress.test.mts` exit 0.
- `node --test ai-framework/scripts/bundle-sync.test.mts` exit 0 after the 3 shape-hardcoding tests are updated to the new header.
- `node ai-framework/scripts/pitch-compress.mts inventory` output is identical before and after (46 compacted, 1 no-SHIPPED.md, 1 active), diffed in the run.

### P2a-S6 — Validators, install carry, skill doc, release record
- `node --test ai-framework/scripts/setup-validator.test.mts` exit 0 with a new check "Consolidation records": every ledger is a valid v1 or v2, every `records/shipped/*.md` passes the S4 lint, decision statuses resolve (info when none exist, fail on invalid). `node ai-framework/scripts/setup-validator.mts` exit 0 on this repo.
- Install carry is owned by P2d (below); this scope only guarantees the new template files exist under `ai-framework/templates/project/` so `workflow-doctor --fix` can restore them.
- `cmp .claude/skills/pitch-compress/SKILL.md .cursor/skills/pitch-compress/SKILL.md` exit 0 and `node --test ai-framework/scripts/skill-defaults.test.mts` exit 0; the skill documents ledger v2 as the authoring format and states `/ship` is unchanged until P2b.
- `node ai-framework/scripts/changelog.mts` records the entry; `node ai-framework/scripts/run-tests.mts` (full suite) exit 0.
- Repo-wide guard test (asserts the "no archive reads" no-go for the code P2a adds): `rg -n "compaction/archives" ai-framework/scripts/{outcome-record,done-work-index}.mts` returns nothing.

### P2d-S1 — Project-side migration tool
- `node --test ai-framework/scripts/consolidation-migrate.test.mts` exit 0. Contract: `node ai-framework/scripts/consolidation-migrate.mts` is a dry run that prints a plan; `--apply` performs it; every step is idempotent and individually reported; it runs from the project root and only ever writes under `.project/`.
- Steps and tests: (1) create `.project/records/shipped/` (missing-only); (2) refresh `.project/knowledge/templates/decision.md` and `README.md` **only when the project's copy equals a known previous bundle version's copy** (hash list in the tool), otherwise report `local` and print the diff, never overwrite; (3) add the generated-index markers to `.project/done-work.md` without touching any existing entry (byte-hash of entries before == after); (4) report, never rewrite, v1 ledgers, legacy done-work entries and status-less decisions (they stay valid via dual-read).
- Refusals tested: symlinked `.project` or target file, oversize file, interrupted run (re-run resumes, no duplicate markers), a hand-edited done-work header (kept, reported).
- Unknown future `schemaVersion` of any file it reads is a refusal with text, not a repair.

### P2d-S2 — `bundle-sync` next steps and doctor
- `node --test ai-framework/scripts/bundle-sync.test.mts ai-framework/scripts/workflow-doctor.test.mts` exit 0 with new tests: after syncing a bundle that ships the migration tool, `nextSteps` contains one `consolidation` step naming `node ai-framework/scripts/consolidation-migrate.mts`, plus a count of legacy compacted pitches; `bundle-sync` still writes nothing under `.project/` (existing guarantee asserted again); workflow-doctor reports legacy ledgers/entries as `info` (never `fail`) with the upgrade command.
- `rg -n "consolidation-migrate" ai-framework/docs/versioning-and-sync.md .claude/skills/bundle-sync/SKILL.md` finds the documented two-pass order: first pass syncs scripts using the old tool, second pass uses the new one (lesson from `installed-skill-wrappers-ship-as-orphans`: a fix inside the new script cannot help the first sync).
- `cmp .claude/skills/bundle-sync/SKILL.md .cursor/skills/bundle-sync/SKILL.md` exit 0 and `skill-defaults.test.mts` exit 0.

### P2d-S3 — Installed-project upgrade fixture (end to end)
- `node --test ai-framework/scripts/installed-upgrade.test.mts` exit 0. The fixture is a temp project built from this repo's **pre-change** state (git ref `b26b45b` via `git archive`, or a committed minimal snapshot if git is unavailable), including v1 ledgers, 46 legacy done-work entries, status-less decisions, one registry-owned skill and one project-local skill with an overlay.
- Sequence asserted: dry-run sync lists changes and the `consolidation` next step; `--apply` (pass 1, then pass 2); `setup-validator.mts` exit 0; `graphify.mts --check` exit 0; `consolidation-migrate.mts --apply` exit 0 and idempotent on re-run; `.project/done-work.md` entries byte-identical; `.project/relations.toon`, ledgers, `.project/knowledge/*` entries untouched (hash table); a project that skips the migrate step still passes `setup-validator` and `/state`-facing readers (dual-read proof).
- Fresh-install case (from approved candidate `bundle-sync-stale-ledger`, item c): a second temp project is seeded the way `/setup` seeds a new install from this bundle; it must contain the example `ai-workflow.toon`, `.project/records/shipped/`, the done-work index markers, `ai-framework/workflow/relations.toon` and the decision template, and pass `setup-validator.mts` and `graphify.mts --check` with no migrate step.
- Negative cases: a project locally editing `relations.toon` gets a `conflict`, not an overwrite; a project on the previous version running the **new** `--check` without syncing scripts is not possible (scripts and manifest sync together) and the test records that.

### P2c-S1 — Legacy status + prepare
- `node --test ai-framework/scripts/legacy-upgrade.test.mts` exit 0. `legacy-upgrade.mts status [--json]` classifies every compacted slug as `legacy` (v1 ledger, no outcome record), `partial` (some artifacts), or `upgraded` (v2 ledger + lint-clean outcome record + index line), and states which tier it is in: A (no section points at `done-work.md`) or B-small/B-large (pointer sections ≤/> 12).
- On this repo it prints 46 slugs, 19 tier A, 22 B-small, 5 B-large (tier B = 27), matching `baseline.mts`.
- `prepare SLUG` is read-only: builds a draft v2 ledger and outcome record from the v1 ledger, the slug's `done-work` entry, the existing `.project/records/pitch-compression/<slug>.md` (when present) and the knowledge entries the ledger's destinations name. It **never reads `.project/compaction/archives/`**; the test uses a read-spy on the fs dep to prove it. Sections whose class/`helps` cannot be derived without content judgment are emitted as `needs-decision`.
- `prepare --read-archive` is refused unless `--approve-archive-read "<reason>"` is given, and appends one line (slug, reason, date) to `.project/compaction/archive-reads.log`; tested, including that a read without the flag fails.

### P2c-S2 — Legacy apply
- `node --test ai-framework/scripts/legacy-upgrade.test.mts` exit 0 with apply tests: `apply SLUG --file <approved.json>` is `--apply`-gated; it (1) commits a v2 ledger through the P2a-S1 validator (so every v2 refusal still applies), replacing `ledgers/<slug>.json` via the compaction transaction (expected hash of the v1 file) and keeping the previous file as `ledgers/<slug>.v1.json`, (2) writes `.project/records/shipped/<slug>.md` that passes the P2a-S4 lint, (3) regenerates the index, (4) replaces that slug's legacy `## slug — shipped` entry with its index line, only after (1)–(3) verified, (5) rebuilds the graph and runs `--check`.
- Interrupt test: kill after each of the 5 steps; a rerun resumes at the first incomplete step, produces no duplicate record/entry, and never leaves a slug with neither a legacy entry nor an index line. A v1 ledger is never lost (sibling copy asserted).
- A slug counts once in `status`, `/state` snapshot readers and the index (one row per slug) before, during and after upgrade.
- No archive file or `ledgers/*.v1.json` is modified or deleted by any step (hash table); `pitch-archive.mts verify` still passes for the slug's archive.
- Conflict test: if the destination file named by a v1 section changed since commit, report and stop rather than overwrite.

### P2c-S3 / S4 / S5 — Campaign tranches (per-pitch exit, repeated)
For every slug, before it is marked `done` in the tranche table in `log.md`:
- `node ai-framework/scripts/legacy-upgrade.mts status --json` shows that slug `upgraded`.
- `node ai-framework/scripts/outcome-record.mts lint .project/records/shipped/<slug>.md` exit 0 (size cap identical for small and big pitches; links resolve; no restated prose).
- `node ai-framework/scripts/graphify.mts --check` exit 0 and `node ai-framework/scripts/graphify.mts explain <slug>` reaches the record's docs/decisions/knowledge in one hop.
- Human gate evidence: coverage, omissions by reason, and a ≥10-line sample are shown and approved; for tier B, the archive read is logged in `archive-reads.log` with the approval reason.
- Anti-gaming: no behavior/decision section ends with `destination: .project/done-work.md`; omissions use only the closed reasons.
Tranche exits:
- S3 done when `status` shows all 19 tier-A slugs `upgraded`.
- S4 done when every B-small slug is `upgraded` (the first one is the proof run and is shown to the human before the rest of the tranche proceeds).
- S5 done when every B-large slug is `upgraded`; `token-time-report` (34 ledger sections, largest source) is the scenario-C big-batch proof wherever it falls in tier order, run early as the S3/S4 proof (record within the same size cap as a small record; retained bytes ≤ 5% of source bytes; ≤ 3 new knowledge entries unless justified).
Campaign closing criteria (checked once, in S5): `legacy-upgrade.mts status` shows 0 `legacy`/`partial`; `baseline.mts` shows `sectionsPointingAtDoneWork` = 0 for behavior/decision classes and `ledgersPointingAtDoneWork` = 0; `.project/done-work.md` contains 46 index lines and 0 legacy narrative entries (bytes recorded vs 90 788); `node ai-framework/scripts/setup-validator.mts` exit 0; repo-wide `rg "compaction/archives" ai-framework/scripts` shows reads only in the archive/verify/restore tools and the approval-gated `legacy-upgrade.mts` path. An individual slug may be recorded as `exception` (with human-written reason) rather than upgraded; exceptions are counted and listed, not hidden.

## Risks (inherited from pitch rabbit holes and critique)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| **R1** P2a ≈ 2000 LOC / 29 files vs big-batch cap 15 files / 1500 LOC (critique A2 said ≈15 after the split; this plan counts tests and the shared-reader edits) | all P2a | no | Build in the order S1→S2→S3→S4→S5→S6 with a LOC checkpoint after each; at cumulative diff > 1500 stop and ask the human. Hammer candidates, in cut order: S6 install-carry tests (keep the validator check), S5 `state-snapshot` dual-read (keep only if index lines are emitted), S4 lint rules beyond size + links. Do not silently exceed the appetite. |
| **R2** Ledger v2 dual-read with 46 v1 ledgers and parsers (`pitch-archive` remove-gate at `schemaVersion !== 1`, any `state-*` reader); bounded-parse rule §9 | P2a-S1, S2 | no | v1 input stays v1 byte-for-byte; unsupported version = refusal; K3 table-driven test; real v1 ledger used as a read-only fixture. |
| **R3** Size-budget numbers (record cap, new-entry default) | P2a-S4 | **yes**, time-boxed in S4 | Calibrate on `token-time-report` and `test-execution-performance` `pitch-compression` records and done-work entries; cap is a constant in code, recorded in `log.md`. Retained-bytes ≤5% of source is a P2b/scenario-C check, not P2a. |
| **R4** How `.project/decisions/*.md` (TOON-grammar docs, no frontmatter) join the single ADR home without breaking `machine-data-format` | P2a-S3 | **yes**, ≤1 hr | Default: leave files untouched, parse their `**Status**:` line into read-only decision nodes. Fallback: list them under "indexed elsewhere" and defer. |
| **R5** `helps` lines and omission reasons are author-written (anti-gaming) | P2a-S1 | no | Closed `reason` set, `other` needs per-item acceptance, `bodyHash` binds ledger to content; the human aggregate sample stays at the P2b ship gate. |
| **R6** Derived edges flood the graph (critique S1) | P1-S2, S4 | no | Resolved existing non-fenced paths only, canonical not mirror, hard budgets in code, per-edge-type precision check; a failing edge type is dropped. |
| **R7** `graphify.mts` / `graphify.test.mts` edited by both tracks | P2a-S3, P1-S4 | no | Single-writer order: P2a-S3 lands and passes first; P1-S4 rebases onto it. Never two subagents on these files. |
| **R8** Mirror byte-identity: editing a canonical skill alone breaks `skill-defaults.test.mts` (K5) | P2a-S6 | no | Cursor byte copy regenerated in the same commit (`skill-vendors.mts cursor-mirrors --apply`); codex/opencode/agents stubs are pointers. |
| **R9** `graphify` needs `uv` for a real build | P1-S4, S5 | no | `uv` present (`/opt/homebrew/bin/uv`). Unit tests use the stub graphify already in `graphify.test.mts`; real-build checks are exit criteria, and if `uv` is unreachable the scope is blocked, not marked done. |
| **R10** Stale graph (`built_at_commit` `46c9290`) skews before/after counts | P1-S4 | no | Rebuild graph first and record that as the "before" in `log.md`. |
| **R11** Tests that carry the old shapes (98 stale tests precedent, K11) | P2a-S1, S5, S6 | no | Inventory recorded in `log.md` (P2a-S1 exit); each listed test updated or confirmed unaffected. |
| **R12** `CHANGELOG.md`/`VERSION` collide between tracks | P1-S5, P2a-S6, P2d-S2 | no | Serialize; each reads the version the previous wrote. |
| **R13** Installed projects fail `graphify --check` on skills/agents/rules the bundle manifest does not list (own skills, registry installs) | P1-S1b, P2d-S3 | no | Local overlay + `registry-owned` exemption; fixture proves a project with both passes; bundle coverage only for bundle-owned files. |
| **R14** P2d and P2c add ≈ 2000 LOC of code beyond P1/P2a; four big-batch pitches in one folder strain one plan/hill | P2c, P2d | no | Each is its own pitch/ship; build order P1, P2a before P2d, P2c; the campaign is data runs, not code. If P2d exceeds 1500 LOC, ship S1+S3 first and S2 after. |
| **R15** Rewriting the committed v1 ledger could weaken the deletion-gate evidence for an already-removed pitch | P2c-S2 | no | v1 file kept as sibling; the v2 commit passes through the same validator; archives untouched; `pitch-archive verify` re-run per slug; a new ledger reader never accepts a hash of content it cannot see (removed pitches rely on the archive, not on live-section hashes). |
| **R16** Upgrading from `done-work` pointers needs content that now exists only in archives (archive read vs "no routine archive reads" no-go) | P2c-S4, S5 | no | Explicit per-slug approval flag, logged in `archive-reads.log`, never used by retrieval or `/state`; tier A needs no archive read. |
| **R17** Judgment quality of 46 batch-drafted records (author-written `helps`/reasons) | P2c-S3..S5 | no | Standard-model drafting in subagents, but the main thread runs the exit commands and the human sees counts-by-reason plus a sample for every batch of ≤5; closed reason set. |
| **R18** Old install syncs from the new bundle with its old `bundle-sync.mts` (the first pass cannot know new rules) | P2d-S2, S3 | no | Two-pass order documented and tested in the fixture; migration lives in a new script that arrives with the sync. |
| **R20** `/ship` for these pitches will hit the package-less `pre-ship-verify.mts` blocker (cooldown C6, candidate `package-less-ship-verification`, 4+ prior ships) | ship of P1/P2a/P2d/P2c | no | Not fixed here (separate candidate). Plan for the owner-approved direct-check gauntlet again and name the exact commands in each scope exit (already machine-checkable); do not create a temporary `package.json`. |
| **R19** The 14 `.project/records/pitch-compression/*.md` records overlap the new outcome records | P2c-S1 | no | Records stay (not deleted, not duplicated); the outcome record links to them in its `archive` field; `prepare` uses them as a source. |

## Parallel dispatch plan

- Wave 1 (disjoint files): main thread does **P1-S1** and **P2a-S1** (both define schemas; neither touches a file the other does). Nested subagents: **P1-S2** (standard) in parallel; **P2a-S3** is main-thread work started once S1's files compile, because it owns `graphify.mts` first.
- Wave 2: **P1-S3** (standard subagent, needs the S1 schema and validator) and **P2a-S2** (main, deep) in parallel; **P2a-S4** (standard subagent, needs S1's shared path/`helps` rules).
- Wave 3 (serial, shared files): **P1-S4** after P2a-S3 and P1-S1..S3 → **P2a-S5** → **P1-S5** → **P2a-S6**.
- Justification for each `yes`: P1-S2 and P2a-S4 create new files only, are pure functions with their own test exit; P1-S3 is one data file whose correctness is checked by a command. Harness supports nested dispatch (Claude Code). Models chosen by the scope's own complexity (data entry and pure-function work = `standard`; none needs `deep`). Subagents must not touch `graphify.mts`, `pitch-compress.mts`, `pitch-archive.mts` or any `CHANGELOG`/`VERSION` file. The main thread re-runs each subagent scope's exit commands itself before marking `done` (evidence required).
- **Revision 2 ordering.** After Waves 1–3: **P2d-S1** (main) → **P2d-S2** (main) with **P2d-S3** (standard subagent, test file only) → **P2c-S1** → **P2c-S2** → campaign S3 → S4 → S5. P2d precedes the campaign so the sync strategy is proven before 46 instance upgrades are written here. Campaign slugs inside a tranche are dispatched as standard subagents in groups of at most 3 in parallel (disjoint slugs, disjoint record files); they never run `legacy-upgrade.mts apply` themselves, the main thread does, after the human gate. P1-S1b runs right after P1-S1 on the main thread.
- Expected shape: a stuck-uphill scope is most likely P2a-S1 (hash/`other files` design) or P1-S4 (precision check); both are deliberately main-thread.

## Downstream rollout

Installed-project delivery of all four tracks is tracked in `../workflow-v3-rollout/consolidation-carry.md` (amended pitch there).
P2d-S3's fixture is the shared evidence; the rollout re-runs scratch-copy dry runs per real project at release time.

## Wireframes

No UI scopes (no HTML or interface surface changes; `/state` rendering is untouched in P2a). `<build-command>` does not exist for this repository.

## P2d-S1 implementation and test strategy (2026-10-22)

The existing approved S1 exit criteria are the behavior-test plan: a real temporary installed project
proves dry-run/apply, known-version template refresh, local edit preservation, legacy-byte preservation,
idempotency, interruption replay and path/size/version refusals. Tests are colocated in
`consolidation-migrate.test.mts`; no UI or network E2E tests apply. Node coverage measures the new utility.

The migration is one cohesive utility (180 lines): it shares one preflight change list, one guarded
reader and one per-file publication path. Its recovery path is to rerun that same preflight after any
interruption. Splitting the reader/publisher into a general framework for one caller would fragment
the preservation proof without reducing the transaction's responsibilities. This is the named
cohesive-unit exception under coding-standards; the file and its tests remain within the S1 estimate.
The whole P2d track still observes the 1,500-line stop in R14.

## P2d-S2 implementation and test strategy (2026-10-22)

The approved S2 exits are tested through the existing real sync fixtures and injected doctor:
one consolidation next step, unique legacy-pitch counts, unchanged instance-record hashes,
informational doctor severity and actionable migration instructions. Refused inventory has a
separate warning/unavailable result; it is never interpreted as zero. Existing mirror and
documentation checks cover the two-pass instructions and canonical/Cursor byte identity.

`legacyInventory` is extracted within the S1 migration module, so migration, sync and doctor
share its descriptor-pinned, bounded reader and schema refusal behavior. No generic scanner or
second parser is introduced. The cohesive-unit exception for S1 still applies to that module.

## P2d-S3 fixture and safety acceptance (2026-10-22)

The approved end-to-end criteria run against selected files exported from b26b45b, excluding secret
paths, recovery archives and historical pitches. The fixture adds one real registry installation
and a project-local skill/overlay, replays old/new sync passes, verifies dual-read before migration,
then checks scaffold migration/replay, preservation hashes and a local manifest conflict. Fresh
setup copies the bundle scaffold and generates context/backlog/index inputs; its graph uses the real
knowledge renderer and overlay on an empty structural base. P1 owns full Graphify extraction proof.

A separate copy-behavior regression proves lowercase registry ownership excludes whole installed-skill
directories, independent of the skills present in this checkout. Rollout input item 9 additionally
requires pending-compaction refusal: the migration reuses requireNoPendingCompaction and its test
asserts all project bytes remain unchanged on refusal. These are behavioral integration tests;
there is no UI or application build for this scope.

## P2c-S1 preparation contract and test strategy (2026-10-22)

The approved status/prepare exits use real temporary project trees: legacy/partial/upgraded states,
pointer-tier boundaries, deduplication, read-only default preparation, archive I/O spies, approval
receipt ordering, source integrity and refusal behavior. New tests live beside legacy-upgrade.mts.
Migration/archive regressions and the installed-project/sync/doctor suites cover shared-helper changes.

The 194-line utility is a cohesive-unit exception under coding-standards: status and preparation
share one ledger parser, bounded inventory and evidence conventions, while approved archive access
must remain visibly ordered after its receipt. Separate independent parsers were rejected; existing
project I/O is reused from consolidation-migrate.mts, and archive bounds are exported by pitch-archive.mts.
The new tool plus its tests are 383 lines, within S1's estimate before the small shared-helper edits.

Preparation outputs are intentionally incomplete: class, disposition, helps, source-section hashes
and other-file judgments require decisions. A draft outcome has an explicit draft marker that the
final outcome linter rejects. Evidence carries whole-file hashes and explicitly truncated excerpts;
it does not claim an excerpt or preserved summary is the original pitch section.

S2 must resolve source-hash provenance before applying any removed-pitch upgrade: tier-A compact
records may be summaries rather than original source bodies. Never compute an original section's
bodyHash from a summary. Any required archive access still needs its own explicit per-slug approval.
Before S5, update the active baseline measurement script's entry enumeration to exclude generated
index headings and preserved .v1 ledger siblings; the original recorded baseline remains unchanged.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

## P2c-S2 evidence and recovery contract (2026-10-22)

The approved five-stage apply exit is tested with removed synthetic pitch folders and real SIGKILL
at each completed stage. One existing compaction transaction atomically preserves the original v1
bytes and replaces the active ledger; later stages infer completion from matching artifacts. The
same approved payload is bound into the committed ledger, and replay revalidates sources, original
commit evidence, outcome lint and destination bindings. A pending journal still uses the established
compaction recovery path rather than an independent migration journal.

The v2 validator and section parser are shared with pitch-compress through a read-only verified-evidence
hook. Outcome proposals use the same linter as published files, with an in-memory input hook. No pitch
folder is restored for validation, and no body hash is derived from a compact summary. Every actual
archive-reading invocation, including dry-run validation and replay, requires explicit per-slug
approval and records its receipt before archive I/O. This also applies to tier A: its source bodies
are absent from the v1 ledger and cannot be reconstructed from durable summaries.

Version 1 has no destination content hashes. The stronger since-commit refusal therefore compares
the unchanged original ledger and all old destination files with the Git commit that introduced it.
Missing or shallow history, changed ledger bytes, or changed old destinations stop the run. New
mapping destinations require explicit hashes in the approved bindings. Tests distinguish changes
before preparation from changes afterward; current-evidence hashes never replace historical proof.

The legacy utility remains one cohesive unit: its parser, receipt boundary, bounded source evidence,
approval binding, five publication stages and replay checks share the same state. Splitting the
state machine into independently callable writers would weaken stage ordering and replay proof.
The size exception extends the S1 exception; the total tooling and tests remain below the 950-line
estimate before the small shared hooks. New approval data uses the shared TOON/JSON reader.


## P2c-S3 live navigation repair (2026-10-22)

The first three approved live upgrades satisfied ledger, record and archive checks but exposed a
missing campaign exit: Graphify indexed each outcome page and slug heading without outbound links.
The existing inferred-reference overlay scans workflow sources only, and Graphify treats the
outcome format's project-root-relative destinations differently from ordinary Markdown links.

Repair this planned exit within S3: derive typed outcome-link edges from shared, validated outcome
fields, preserving root filenames and the linter's path normalization. Read record sources through
the existing pinned reader and inspect targets through the same path guard. Refuse protected
compaction and secret paths before target I/O. Use existing source-directory, record-byte and
per-field link bounds rather than weakening the P1 inferred-reference budget or its hub filter.
Attach each record's navigation to its matching slug heading, with the page/stub as fallback.
The graph check must also work in installed projects that have outcomes without a workflow layout.

The test strategy extends the already approved one-hop navigation exit with a reproducing real-tree
unit/integration test, a maximum-supported-link artifact, shared-target flood, comments/anchors/path
normalization, invalid/oversized/symlink refusals and protected-target I/O spies. Rebuild must replace
these overlay edges without duplication. Review all affected graph and reader tests, then rerun the
three actual explain commands. No UI or application build applies. This is a small shared-reader
repair beyond S3's originally data-only file set; it does not change the approved payload contents.
