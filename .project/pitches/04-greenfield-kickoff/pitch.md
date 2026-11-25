# Pitch: greenfield-kickoff

**Date**: 2026-11-25  •  **Appetite**: big-batch (15 files, at the cap); the second half of a two-pitch epic
**Stack**: ai-prompts (a new interview skill) + workflow tooling (an empty-project check)

## Problem

Someone starting a new project installs the workflow and gets nothing to work with. `/setup` builds the project documents by **scanning
existing code**, and is told not to invent conventions. In an empty project the scan finds nothing, so the product, stack, architecture
and rules stay blank, and the first `/shape` has no statement of what the project is for or how it should behave.

What the owner asked for: when the project is empty, ask for the main intention, the technology, rules, libraries and what the project must
achieve; set up the first version; then work with the normal flow. That first piece of work should help define how the project behaves.

## Knowledge consulted

- issues/`a-workflow-command-can-be-shadowed-by-a-host-built-in` — a new command name must be checked against each host first.
- issues/`installed-skill-wrappers-ship-as-orphans` — what ships to a new project must not carry this repository's own instance data.
- issues/`package-less-bundle-ship-wrapper-cannot-select-checks` — a new project with no `package.json` cannot pass ship verification today.
- patterns/`a-source-scanner-fails-closed-on-what-it-cannot-read` — "empty" means a completed scan, never an unreadable or capped one.
- issues/`snapshot-metadata-bypassed-output-scrubbing`, `a-word-boundary-credential-check-misses-joined-and-long-names` — secrets escape through saved and derived text.
- patterns/`one-owner-per-instruction-topic-guarded-by-contract-tests`, issues/`instruction-copies-drift-into-contradictions` — one owner for the write rules.
- patterns/`a-pitch-can-pass-its-own-tests-and-break-on-the-real-file` — test against a real install, not a hand-made empty folder.
- patterns/`a-golden-dataset-case-counts-only-when-a-named-test-passes`, `a-report-never-overwrites-a-file-it-did-not-write`.
- decisions/`workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — count every mirror and test; define recovery before writing code.

## Solution sketch (breadboard)

**Places**: a new `kickoff` skill (Cursor, Codex and OpenCode adapters) · `project-state.mts` (read-only check) · `/setup` · one
definition template · `SETUP.md` and the entry files.

**Who owns what is written** (the one place these rules live):

| File | Written | Read by later phases |
|---|---|---|
| `.project/kickoff/draft.toon` | while interviewing: **the only write before approval**; labelled statements, no raw replies; removed after a complete publication | never |
| `.project/context/definition.md` | on approval; owned by the kickoff, **never rewritten by a `/setup` scan** | yes: the source of intent |
| product, stack, architecture, rules, decisions, behaviors, followups, entry-file project section | on approval, derived from the definition, with its labels | yes |
| `first-version` pitch | on approval, as a **shape draft** | by `/shape` |

**Affordances**
1. **Detect** (`project-state.mts`): `empty`, `existing` or `unclear`, with evidence. A saved draft is checked first (resume wins).
   `empty` only after a completed scan that found no application files. Shipped bundle files are excluded **by path**, never by whole
   folder or base name; anything unrecognised, unreadable, linked or past the scan budget gives `unclear`.
2. **Route**: `empty` → kickoff. `existing` → `/setup` as today, with no override into the interview. `unclear` → the person chooses
   "new project" or "existing project", and the choice and its evidence are recorded.
3. **Interview**, a few related questions at a time: purpose (intention, users, what it must achieve and how success is seen, non-goals);
   the first behaviors, each with a given/when/then example; technology and libraries (fixed, preferred, forbidden; when unknown, at most
   three options with trade-offs and one recommendation, versions marked unverified unless checked); rules and constraints.
   Required: purpose, users, one behavior, non-goals. The rest may be "decide later".
4. **Labels** `decided`, `proposed` or `open` on every statement, kept through every derived file. A template field nobody answered is
   `open`. No rule file is created without a stated or accepted rule. Text shipped with the bundle is never a fact about the project.
5. **Secrets**: never asked for; a pasted one is not copied into the draft or any derived file; only "needs a credential for X" is kept.
6. **Gate:** show the definition **and every derived file's content that adds a claim** (including behavior examples);
   **Approve / Revise / Back / Stop**.
7. **Publish** the derived files; if interrupted, the draft is still there, and the next run resumes publication without duplicating a
   decision or the pitch, showing a difference before touching anything it did not write.
8. **Hand over:** create `first-version` as a draft for `/shape`, which applies the normal rules (knowledge gate, appetite, rabbit holes,
   critique when due, eval cases if it is AI work) and its own bet gate. Its first scope creates the project's check commands and check
   manifest; until then no command is listed as available and every unbuilt fact is marked **intended**.
   **If the technology is still `open`, the definition is saved and no `first-version` draft is created.**

**Connections**: install → detect → kickoff → draft → gate → definition and derived files → `first-version` draft → `/shape` → normal flow.

## Rabbit holes

**Resolved here**
- Draft versus "nothing before approval"? → One draft file is the stated exception; the eval allows only it.
- A new command, or a mode of `/setup`? → A separate `kickoff` skill; `/setup` detects and routes.
- A new pipeline phase? → No, a utility skill. Phase lists in hooks and metrics stay unchanged.
- Does the kickoff write the application? → **No** (owner confirmed 2026-11-25): the first version is built by the normal flow.
- What stops a later `/setup` refresh erasing intent? → `definition.md` is kickoff-owned; refresh and merge keep it and the labels.
- Does shipping update the definition automatically? → Not in this pitch (followup).
- Copied bundle identity in `AGENTS.md`/`CLAUDE.md`? → The kickoff treats the shipped "Project specifics" as not user data and replaces
  it after showing the difference. **Shipping neutral entry files is a separate fix** (see Dependencies).

**Pushed to /plan as risk**
- Is `kickoff` free in each host (owner-assisted, before writing; fallback `project-kickoff`)?
- The shipped-file list the detector excludes by path, and fixtures built from a **real `SETUP.md` install**: nested and monorepo code,
  SQL/notebook/infrastructure only, documents only, manifest only, a user file inside a harness folder, a symlink, an unreadable folder.
- The draft's schema and the publication order and resume rule.
- Later commands on an empty project: `/shape` with an empty graph, `/state` with no code, Graphify without `uv`.
- A check that the definition's derived files pass `setup-validator`.

**Pushed to no-go** (followups or later pitches)
- **`starter-install`**: one command that creates a new project with a clean `.project/` and neutral entry files.
- Starter templates or code generators; importing requirements from other tools.
- Updating the definition at ship; a separate behavior-file template (the existing requirements template is used).

## No-gos (this pitch)

- ✗ No application code, scaffolding tool or package install during the kickoff.
- ✗ No invented technology, library or rule: unstated means `open`.
- ✗ No write before approval except the draft.
- ✗ No overwriting a document the kickoff did not write without showing the difference and asking.
- ✗ No secrets asked for or stored, in the draft or anywhere else.
- ✗ No automatic shape approval, bet, plan or build.
- ✗ No change to how `/setup` treats an existing project, **except** that it preserves a kickoff-owned definition.

## Evaluation (AI-prompt scope)

Golden cases: `.project/evals/datasets/greenfield-kickoff.json` (12 cases after critique, **specified, none run**). Each case is marked
`test` (bound to a named test that runs in the suite: detection, routing, adapter parity, the draft and publication file rules) or
`live-only` (interview behavior, run by the owner in a host and recorded; an unrun case is recorded `not-run`, never as passing).

## Size and dependencies

**Files (15, at the cap):** the skill and its Cursor, Codex and OpenCode adapters (4); `project-state.mts` and its test, which also holds
the adapter-parity and case-binding checks (2); the `/setup` skill and its Cursor mirror (2); the definition template (1);
`relations.toon`; the doctor's script list; `SETUP.md`; `AGENTS.md`; `CLAUDE.md`; the eval dataset. Lines are projected **at or slightly
over 1500** with no room for audit fixes.
**Split trigger:** if `/plan` counts more than 15 files or 1500 lines, split into (a) detection, routing and the definition's ownership,
then (b) the interview and hand-over.

**Dependencies, in order:**
1. **A bug found by this critique, to fix first (small, separate):** `SETUP.md` copies this repository's `AGENTS.md` and `CLAUDE.md`,
   including its own "Project specifics", into every new project (verified 2026-11-25), and `setup-validator` accepts it as complete.
2. **`package-less-ship-verification`** (re-shaped, bet pending): it owns the check-manifest format that `first-version` must create.
3. Audit coordination: `review-bench-hardening` decides whether `SETUP.md` is in the guard's hashed roots.
4. `workflow-v3-rollout` should pin a release; root entry files are merged by hand there, so routing text needs a reviewed merge.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-11-25 as Orca workers (Run `run_33d7f05ccf79`): knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector,
eval-regression-projector. 29 findings, 10 high. Raw reports: `critique/`.

| Findings | Subject | Disposition |
|---|---|---|
| skeptic K1, historian K3 | the saved draft contradicts "nothing before approval" | **Addressed**: ownership table; one draft path; eval updated |
| skeptic K2 | bundle identity copied into new projects (verified) | **Addressed** in the kickoff; **separate fix** listed first |
| skeptic K3, historian K1 | empty detection and fail-closed scanning | **Addressed**: path-level exclusion, `unclear`, no override |
| skeptic K4, historian K4 | what happens after the kickoff; partial publication | **Addressed**: kickoff-owned definition; resume rule; ship update cut |
| skeptic K5, cross-pitch X1 | zero-code `/plan`, check manifest ownership | **Addressed**: technology required for hand-over; first scope creates checks; depends on package-less |
| skeptic K6 | derived files invite invention; hand-over skipped shaping rules | **Addressed**: labels everywhere; hand-over is a `/shape` draft |
| historian K2 | secrets in drafts and derived records | **Addressed**: scrub rule everywhere; eval extended |
| historian K5, eval E6 | real-install fixtures; files the kickoff did not write | **Addressed** (plan risks and cases) |
| eval E1 | command shadowing untested | **Acknowledged**: owner-assisted check at `/plan`; no automatic host test exists |
| eval E2, E4, E5 | unbound cases, adapter drift, non-linear interviews | **Addressed**: `test` or `live-only` per case; parity check; two cases added |
| eval E3, appetite A6 | the first version cannot ship without package-less | **Acknowledged**: ordered dependency |
| appetite A1–A5 | at the cap; mirrors, relations, doctor list; unrun eval | **Addressed**: file list corrected, behavior template cut, split trigger; live cases stay unverified until run |
| cross-pitch X2–X4 | guard roots, rollout pin, root-file merges | **Acknowledged**: listed under dependencies |

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/greenfield-kickoff/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.
