# Plan: Recoverable pitch compaction

**Pitch**: [pitch.md](pitch.md)  •  **Appetite**: epic, decomposed into 2 sequential big-batch scopes  •  **Hill**: hill.md
**Depends on**: `portable-skill-installation` (shipped 2026-09-25, v2.4.0) — the registration
contract this pitch's own pitch.md names as its dependency. Confirmed satisfied: `add-skill`,
the shared vendor-discovery contract, and Cursor mirror materialization (`skill-vendors.js
cursor-mirrors`) all exist and are reused here read-only, not rebuilt.

## Framing: this is the sanctioned, narrow exception to a real guardrail

`CLAUDE.md` states: "Never rewrite historical records under `.project/pitches/`,
`.project/design/`, or `.project/pitches/_archive/`." This pitch's own text calls itself "a
narrow explicit maintenance exception to historical-record preservation for approved, verified
compaction only." The plan does not weaken that guardrail's wording — it builds a tool whose
entire design is the set of conditions under which a human-approved exception is safe:

1. **Only** `.project/pitches/<slug>/` (a shipped pitch's own working directory) is ever a
   deletion candidate — never `.project/pitches/_archive/` (a different, pre-existing lifecycle
   state this pitch does not touch), never `.project/design/`, never an active/parked pitch.
2. **Only** pitches with a `SHIPPED.md` are eligible at all — "done" in any looser sense does
   not qualify.
3. Deletion **only** happens after, in strict order: knowledge extraction is written, a coverage
   ledger accounts for every required section (or a human explicitly overrides a named gap with
   a logged reason), an immutable checksummed recovery archive is written and verified **outside**
   `.project/pitches/` entirely, and a human approves the specific preview at the confirmation
   gate. No step is skipped, and `--apply` is required at every mutating step — nothing here is
   ever silent or automatic.
4. Every mutating step is transactional and interruption-safe, reusing `skill-registry.js`'s
   already-audited `transact`/`recover`/`resolveFile`/`snapshot` (see "Reuse, not new plumbing"
   below) rather than a second, unaudited implementation of the same safety property.

## Reuse, not new plumbing

`skill-registry.js`'s `transact`, `recover`, `resolveFile`, `snapshot`, `digest`, and `json` are
already generic over `{ roots, state }` — nothing in them is skill-specific except the separate
`context()` helper, which this pitch does not call. `pitch-archive.js` builds its own minimal
context (`{ roots: { target: realpathSync(root) }, state: ".project/compaction" }`) and imports
those six functions directly. This is a deliberate choice over writing a second journal/lock
implementation: that code already survived a full security audit
(`.project/pitches/portable-skill-installation/audit-cycle-1.md`), and duplicating it would
duplicate its risk surface for no benefit. `.project/compaction/{lock.json,transaction.json}`
lives in its own state root, never colliding with `.project/skills/`'s.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| C1 | Inventory, extraction, coverage ledger, done-work.md | 9 | 700–950 | `portable-skill-installation` (done) | — | No: defines the ledger schema C2's `remove` gate depends on | — |
| C2 | Recovery archive, transactional deletion, restore | 4 | 450–600 | C1 (ledger schema + `pitch-compress` skill entry point) | — | No: safety-critical deletion path shares C1's skill file; sequential review, not parallel | — |

Both scopes are well under the sub-pitch cap (15 files / 1500 LOC each); no split needed.

### C1 files
Create: `.claude/skills/pitch-compress/SKILL.md` (canonical — description includes the "pitch
compress" natural-language alias the pitch names), `.agents/skills/pitch-compress/SKILL.md`
(Codex), `.opencode/commands/pitch-compress.md` (OpenCode), `ai-framework/scripts/pitch-compress.js`,
`ai-framework/scripts/pitch-compress.test.js`, `ai-framework/templates/project/done-work.md`
(empty scaffold, mirrors the existing `_followups.md` pattern).
Update: `ai-framework/scripts/setup-validator.js` (done-work.md scaffold presence check),
`VERSION`, `CHANGELOG.md`.
Cursor mirror (`.cursor/skills/pitch-compress/SKILL.md`) is **not** hand-authored — materialized
by the existing `node ai-framework/scripts/skill-vendors.js cursor-mirrors --apply` (S1–S3's own
mechanism); build only needs to run it, not write the file. `workflow-doctor.js` needs **no**
edit: it already discovers every `.claude/skills/*` directory generically and validates
mirrors/profile from the canonical file's own content — `pitch-compress` gets that for free as
long as its mirrors are plain "load the canonical file" pointers (the normal case, unlike
`workflow-doctor`/`bundle-sync`'s script-backed overrides).

### C2 files
Create: `ai-framework/scripts/pitch-archive.js`, `ai-framework/scripts/pitch-archive.test.js`.
Update: `.claude/skills/pitch-compress/SKILL.md` (same file from C1, extended with the
archive/remove/restore flow — not a new file), `VERSION`, `CHANGELOG.md`.

## Concrete contracts

### Eligibility — `pitch-compress.js inventory [--json]`

Scans `.project/pitches/*/` (excluding `_templates/`, `_archive/`, `_parked/`,
`_followups.md`). A pitch is **eligible** only if it contains a `SHIPPED.md`. Everything else
(no `SHIPPED.md`, or a `checkpoint.md`/open `hill.md` scope suggesting in-progress work) is
**preserved**, reported with its specific reason (`"no SHIPPED.md"`, `"active: hill shows N
scope(s) not done"`, etc.) — never silently skipped, matching "preserve active, parked,
undecided and unresolved work and report why." A pitch already missing its directory (compacted
in a prior run) is reported `"already compacted"` from `done-work.md`, not re-processed.

### Coverage ledger — `pitch-compress.js ledger <slug> [--json]` / `pitch-compress.js commit-ledger <slug> --file <ledger.json> --apply`

`ledger` mechanically enumerates every **required** section for one eligible pitch: every `##`
heading in `SHIPPED.md`, every `## No-gos` / `## Rabbit holes` entry in `pitch.md`, every
`audit-cycle-*.md` file, and every non-empty entry in `deviations.md`/`log.md`. This defines
what must be accounted for — it does **not** itself decide where content goes; that is a
judgment call, done the same way `/ship`'s own knowledge extraction already works (the agent
reads the source, writes real `knowledge/{patterns,issues}/*.md` entries and a `done-work.md`
section, then hand-authors the ledger mapping each required section to where it actually landed,
or to `"destination": null` with a `"gap"` status and a reason if it was judged non-extractable).
`commit-ledger --apply` **validates** that hand-authored mapping mechanically — every required
section is present, every referenced destination file/section actually exists on disk, every
new knowledge entry that `graphify.js --check` would reject fails this step too — and writes the
verified ledger to `.project/compaction/ledgers/<slug>.json`. Coverage is
`extracted-count / required-count`; anything short of `1.0` needs an explicit `--accept-gap
<section>=<reason>` per gap, recorded in the ledger, to ever reach C2's `remove` gate. This is
"a summary alone cannot prove losslessness" made mechanical: the ledger is the proof, not a
prose claim.

### `done-work.md` — `pitch-compress.js write-done-work <slug> --summary <file> --apply`

One `## <slug> — shipped <date>` section per compacted pitch, idempotent (re-running for the
same slug replaces only its own section — verified by hash-comparing the existing section
before write, never appending a duplicate). Content: a short agent-written summary, `[[wiki-link]]`
pointers to the knowledge entries this pitch produced, the recovery archive's path, and the
original `.project/runs/<date>-<slug>.md` path (which compaction never touches — see "What
compaction never touches" below). Never hand-edited outside this tool, matching the existing
`graph.json`/`CHANGELOG.md` convention of "generated, not authored."

### Recovery archive — `pitch-archive.js archive <slug> [--apply]` / `pitch-archive.js verify <slug>`

Writes `.project/compaction/archives/<slug>-<YYYY-MM-DD>/` — a byte-for-byte copy of every file
under `.project/pitches/<slug>/` at archive time, a `manifest.json` (relative path + SHA-256 per
file, matching the hashing already used throughout `skill-registry.js`), and a top-level
`ARCHIVE-CHECKSUM` file (a hash of the manifest itself, so tampering with the manifest is also
detectable). `.project/compaction/` is a **new** top-level state root, outside
`.project/pitches/` entirely — satisfies "outside the pitch tree" literally, not just in spirit.
`verify` re-hashes every archived file against the manifest and the manifest against
`ARCHIVE-CHECKSUM`, refusing to let `remove` proceed if either check fails.

### Deletion — `pitch-archive.js remove <slug> [--apply]` / `pitch-archive.js restore <slug> [--to <path>] [--apply]`

`remove` refuses unless, in order: a verified archive exists for this exact source-content hash
(re-hashed at call time — a concurrent edit after archiving is a **conflict**, not silently
archived-then-deleted), a committed ledger exists with coverage `1.0` (gaps included via
`--accept-gap` count as accounted-for, an unaddressed gap does not), and `--apply` is passed.
Uses `transact()` from `skill-registry.js` for the actual file removal (delete-only operations,
`value: null`), so an interrupted removal is recoverable the same way an interrupted `add-skill`
install already is — proven, not reimplemented. `restore` copies a verified archive back to
`.project/pitches/<slug>/` (or `--to` another path, for inspecting without restoring in place),
refusing to overwrite an existing directory without `--force`.

### What compaction never touches

`.project/pitches/_archive/` (a different, pre-existing lifecycle state), `.project/design/`,
any pitch without `SHIPPED.md`, `.project/runs/<date>-<slug>.md`/`-hill.md` (the ship-time run
log — stays as an independent, redundant recovery path alongside the new archive and the
knowledge graph), `.project/knowledge/graph.json`/`index.md` (regenerated by `graphify.js`,
never hand-written or copied by this tool, matching the parent pitch's explicit instruction).
Global skill state is irrelevant here (this pitch never touches `.project/skills/` at all).

## Exit criteria per scope (machine-checkable)

### C1
- `node --test ai-framework/scripts/pitch-compress.test.js` exits 0 and proves: `inventory`
  correctly classifies a shipped pitch as eligible and an active/parked/no-`SHIPPED.md` pitch as
  preserved-with-reason; `ledger` enumerates every required section from a fixture pitch with
  unique decisions, negative constraints, unresolved followups, and stale cross-references (the
  pitch's own named fixture shape); `commit-ledger` accepts a complete hand-authored mapping,
  rejects one missing a required section, rejects one pointing at a nonexistent destination file,
  and rejects one where a referenced new knowledge entry fails `graphify.js --check`;
  `write-done-work` is idempotent (a second run for the same slug replaces, never duplicates,
  its own section) and never touches another slug's section.
- `node --check ai-framework/scripts/pitch-compress.js` exits 0.
- `node ai-framework/scripts/setup-validator.js --json` exits 0 in a fixture missing
  `done-work.md` only after `--fix`-equivalent scaffolding restores it (matching the existing
  `_followups.md` check's own pattern).
- `node ai-framework/scripts/workflow-doctor.js --json` exits 0 with `pitch-compress` installed
  as a canonical skill, validated by the doctor's **existing** generic skill-discovery checks —
  no doctor code change, so this is also a regression check that none was needed.

### C2
- `node --test ai-framework/scripts/pitch-archive.test.js` exits 0 and proves: `archive` writes
  a byte-identical copy plus a verifiable manifest/checksum outside `.project/pitches/`; `verify`
  detects a tampered archived file and a tampered manifest, both distinctly; `remove` refuses
  without a verified archive, refuses with a ledger below coverage `1.0` and no
  `--accept-gap`, refuses when the source changed after archiving (concurrent-edit conflict, not
  silent overwrite), and only then deletes; an interrupted `remove` (simulated real process kill,
  matching S1's own interruption test pattern) is recovered by `recover()` with the original
  directory intact; a repeated `remove`/`archive` after success is idempotent (reports
  already-compacted, does not error or re-archive); `restore` reproduces the original directory
  byte-for-byte from the archive and refuses to overwrite an existing directory without
  `--force`.
- `node --check ai-framework/scripts/pitch-archive.js` exits 0.

### Final regression (both scopes)
`node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/pitch-compress.js,ai-framework/scripts/pitch-archive.js' --test-coverage-lines=90 ai-framework/scripts/pitch-compress.test.js ai-framework/scripts/pitch-archive.test.js` exits 0.
`node ai-framework/scripts/workflow-doctor.js`, `node ai-framework/scripts/setup-validator.js`,
`node ai-framework/scripts/graphify.js --check` all exit 0. A regression run of
`node --test ai-framework/scripts/bundle-sync.test.js ai-framework/scripts/add-skill.test.js
ai-framework/scripts/skill-vendors.test.js ai-framework/scripts/skill-sync.test.js
ai-framework/scripts/skill-defaults.test.js` (the whole prior skill surface) confirms zero
regression from reusing `skill-registry.js`'s exports.

## Risks

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| "Semantic review" of extraction quality can't be fully mechanical | C1 | No — resolved by design: the agent performs extraction with judgment (as `/ship` already does), the script only validates the resulting ledger mechanically | No spike; this is a design decision, not an unknown |
| Reusing `skill-registry.js`'s transaction code outside its original `.project/skills/` context | C2 | No — the functions are already generic over `{roots, state}`; verified by reading their signatures before committing this plan | Construct a minimal context object; final regression reruns the original skill suite to catch any accidental coupling |
| A pitch's `SHIPPED.md` references files that no longer exist (stale cross-references, e.g. an evidence file later moved) | C1 | No | `ledger`'s destination-existence check catches this as a gap, not a silent pass |
| Concurrent edit to a pitch directory between `archive` and `remove` | C2 | No | `remove` re-hashes source content against the archived manifest before deleting; mismatch is a conflict, matching the existing three-way-comparison precedent in `bundle-sync.js`/S1's `transact()` |
| Interrupted deletion mid-operation | C2 | No | Reuses `transact()`/`recover()` verbatim — already covered by a real subprocess-interruption test in S1 |

No spike is needed for either scope: every open question was resolved by inspecting the exact
code this pitch reuses (`skill-registry.js`'s exports) before writing exit criteria, the same
grounding approach `portable-skill-defaults`' plan used for its own upstream dependency.

## Parallel dispatch plan

C1 → C2, sequential. Not subagent-dispatched: C1 defines the ledger schema and the canonical
`pitch-compress` skill file that C2 extends in place (a second scope editing the same file in
parallel would race); C2 is the safety-critical deletion path built directly on C1's schema and
warrants a single continuous review pass rather than a parallel, harder-to-review dispatch.

## Vendor acceptance

`pitch-compress` gets a canonical skill file plus native Codex/OpenCode mirrors (C1) and a
Cursor mirror materialized by the existing `skill-vendors.js cursor-mirrors` command — the same
all-vendor contract S1–S3 and `portable-skill-defaults` already established, reused rather than
re-specified. No new vendor-resolution logic is needed; `discoverVendors()` from `skill-vendors.js`
is not even called here, since this pitch adds no per-vendor adapter beyond the one skill's own
mirrors (unlike `add-skill`, which generates a wrapper per installed skill per vendor).

## No-gos carried forward

- No application implementation or decisions on La Salle infrastructure.
- No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets in reports. Every deletion requires `--apply` and a prior human-approved
  preview; nothing here is ever automatic.
- No installation or deletion during shaping or planning — this plan performed neither; all
  contracts above were derived by reading existing, already-shipped code.
- Parent pitch: no parent behavior contract dropped to fit appetite — both sub-pitch contracts
  are represented in C1/C2 above, each well under the 15-file/1500-LOC cap.
- `/state` is **not** invoked by this pitch. The parent pitch's own critique recorded:
  "Compaction's final automatic state invocation ships only once the report command is
  available" — `project-state-report` (the pitch that will build `/state`) has not shipped.
  `pitch-compress`'s canonical `SKILL.md` documents this as a deferred follow-on step, not a
  broken promise; do not add a call to a command that does not exist.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
