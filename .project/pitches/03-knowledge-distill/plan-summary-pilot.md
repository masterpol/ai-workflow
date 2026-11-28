# Plan: knowledge-distill

**Pitch**: pitch.md  •  **Appetite**: big-batch (10 files, ~1,000 LOC after the split)  •  **Hill**: hill.md
**Shape of this plan:** S0 is a pilot with a stop rule. S1 and S2 are built only if the owner says **go** at the pilot gate.

## Spike results (2026-11-26, read-only)

| | this repo | RN | LAH | climbing |
|---|---|---|---|---|
| entries / words | 155 / 41,863 | 136 / 18,720 | 98 / 35,542 | 58 / 13,549 |
| five median entries, words (share of base) | 1,140 (3%) | 475 (3%) | 1,860 (5%) | 820 (6%) |
| `.project/rules/` today, words | 0 | 0 | 3,636 | 6,422 |
| blocks per entry, median / max | 6 / 23 | 3 / 170 | 11 / 55 | 4 / 20 |
| sentences per block, median / 90th percentile | 1 / 3 | 1 / 2 | 1 / 3 | 2 / 4 |
| resolved issues | 60 | 48 | 28 | 26 |
| tags with 5 or more entries | 29 | 30 | 21 | 16 |

1. **What can be counted: blocks, not claims.** A block (paragraph, list item, table row or code block) can be listed mechanically, so a
   publish check can require every block of every source to have a destination or an approved "stays only in the original". Whether a block's
   claims survived is judgment: it stays with the independent check and the owner. A five-entry batch is about 15–55 ledger rows.
2. **The base is not what gets loaded.** The shape instructions ask for 3–5 knowledge hits and forbid bulk loading: roughly 500–1,900 words.
   17 skill, agent and phase files also name `.project/rules/`, and the shape gate surfaces constraints from those files. Learnings turned into
   rules can therefore **add** to what a phase reads: climbing's rules (6,422 words) already outweigh five median entries (820) eight times. How
   much of a rule folder an agent really reads was not measured.
3. **Without a preference in search and the gates, originals still surface** and the compact form is extra text. That preference was part of
   "load instead of".
4. **Near-duplicates did not reproduce.** The pitch reports 35 pairs in RN and does not name its measure. Word overlap of 35% or more on entry
   bodies gives 3 (words of four letters or more) or 7 (all words); including frontmatter gives 46 or 126.
5. Unknown frontmatter keys are not read by the graph builder's entry parser (by reading `graphify.mts`), so a `distilled-into` line is inert
   until something uses it.

## Split (the pitch's own trigger)

A full build needs the skill and three adapters, the script and test, graph changes and test, registration, and preference text in the shape,
shape-lite, search, fix and phase files with their mirrors: 18 files or more, over the 15 cap. This plan builds candidates, ledger, checks,
publish and the skill. **Deferred to a follow-up pitch:** the graph "distilled into" edge and the search and gate preference.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Pilot: one batch end to end, by hand | records under `pitches/03-knowledge-distill/pilot/` only; no product file | — | pilot source chosen | — | yes: author and checker must be separate fresh agents | author standard; checker standard |
| S1 | `distill.mts`: candidates, block ledger, check and approval binding, publish | `ai-framework/scripts/distill.mts`, `distill.test.mts` (new), `workflow-doctor.mts` | ~750 | S0 **go** | — | yes: own new files | deep (it writes project knowledge) |
| S2 | `distill` skill and registration | `.claude/skills/distill/SKILL.md`, `.agents/…`, `.cursor/…`, `.opencode/commands/distill.md`, `ai-framework/workflow/relations.toon`, `docs/what-you-get.md`, dataset run record | ~250 | S1 | — | no: instruction text, coordinator | — |

## S0 pilot

On a **disposable copy** of the source project's `.project/` in a scratch folder; the source project is only read.

1. Pick one batch of 3–5 related entries; keep the candidate list used.
2. List every block of every source (a throwaway script; not product code).
3. Author agent writes the compact text and the block ledger.
4. Checker agent, in a folder holding only the originals, writes and saves its questions; then, in a folder holding only the compact text,
   answers them. One miss blocks the item. One retry with a new checker, then defer.
5. Owner reads originals and result side by side.
6. Measure three real queries a gate would make about the batch's topic: words loaded today (the top 5 hits plus the rule files that
   gate would surface), and with the compact form preferred in place of its sources.

**Go only if all hold** (proposed thresholds; change them at this gate, not after seeing results):
- every block has a destination or an owner-approved "stays only in the original"
- at least one item passes the independent check on the first or second checker
- words loaded for the three queries fall by **30% or more** in total, counting any rule text now surfaced
- the owner judges the compact text usable in place of the originals
- agent runs and time per batch are written down and the owner accepts them

**If the load test fails:** stop S1 and S2 and go back to `/shape`. A smaller goal to weigh there: turn repeated resolved lessons into proposed
rules inside `/cooldown`, with no loading claim.

## Exit criteria per scope (machine-checkable)

`N` = `node --experimental-strip-types --disable-warning=ExperimentalWarning`.

### S0
- `test -f` on `pilot/batch.md`, `pilot/ledger.json`, `pilot/questions.md`, `pilot/check.md`, `pilot/load.md`, `pilot/result.md`
- a one-line script check: ledger row ids equal the block ids of the sources (no missing, no extra); output pasted
- source project `git status --porcelain` is identical before and after
- `pilot/result.md` states each go condition as met or not met, and each exercised golden case as pass, fail or not-run
- cases exercised live: `no-statement-lost`, `unverified-claim`, `similar-but-different` (planted pair in the copy), `independent-check-fails`
  (if no item fails naturally, one planted dropped exception)

### S1
- `N --test ai-framework/scripts/distill.test.mts` and `bun test` on it exit 0, with the dataset's bound cases:
  - publish refuses a ledger that does not cover every source block (`no-statement-lost`)
  - publish refuses an item with no passing check record (`independent-check-fails`), a second retry, and an author named as checker
  - publish refuses a changed output, ledger or source after the check or approval (`output-changed-after-check`)
  - originals are byte-identical except one added `distilled-into` line; graph, record-link and ledger checks pass (`links-still-resolve`)
  - writes only the new compact file and that line; refuses `ai-framework/rules/`, symlinks and paths outside `.project/`
  - candidates writes nothing
- each guard removed once fails a test, from a green baseline
- `rules/security.md` section 9: one guarded reader, bounded input, no project program run, absent kept apart from refused, atomic writes

### S2
- `N ai-framework/scripts/graphify-relations.mts --check`, `graphify.mts --check`, `setup-validator.mts`, `workflow-doctor.mts` exit 0
- `N ai-framework/scripts/skill-vendors.mts cursor-mirrors` reports no difference
- golden cases (AI scope), run live on a disposable copy with each result recorded: `similar-but-different`, `unverified-claim`, `promotion`
  all pass; any case not run is recorded `not-run`, never pass. Per vendor: only the vendors actually run are claimed
- `N ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0
- Build, typecheck, lint, i18n: not applicable (`.project/context/stack.md`). No UI scope.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| "Statement" cannot be checked mechanically | S0, S1 | done | Blocks are mechanical; claims stay with check and owner; the skill says so and claims no more |
| No text saved, or more text loaded | S0 | done in part | 30% load condition before any code |
| Preferring the compact form hides an original that matters | deferred | no | Not built here; originals keep surfacing |
| Checker sees the draft or the ledger | S0, S2 | no | Separate folders, questions saved before the output exists for it; separate fresh agent. On a host without sub-agents: a fresh session run by the owner, else recorded not independent and publish refused. A folder rule is not a barrier (seen 2026-11-25), so the record says how isolation was done |
| Cost per batch | S0 | in pilot | Measured; stop rule |
| Pilot sends another project's knowledge to model vendors | S0 | no | Owner chooses source and vendors at this gate |
| New skill misses a mirror or registration | S2 | no | Exit commands; search by path (card `changing-a-shipped-template-or-skill-has-hidden-consumers`) |
| A host command named `distill` already exists | S2 | no | Not checked; check before naming (`/ship` was shadowed) |

## Parallel dispatch plan

S0 first, then the pilot gate. S1 then S2, in order. Orca currently has room for one worker (old ledger entries hold slots), so nothing runs in
parallel; each dispatch sets the configured model for its profile.

## Living-spec deviations log

(Empty at /plan time.)
