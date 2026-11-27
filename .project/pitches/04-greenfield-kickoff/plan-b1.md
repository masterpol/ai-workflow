# Plan: greenfield-kickoff, part B1 (make detection reachable)

**Pitch**: [pitch.md](pitch.md)  •  **Part A**: [plan.md](plan.md), [shipped](SHIPPED-part-a.md)  •  **Appetite**: big-batch  •  **Hill**: [hill.md](hill.md)

Drafted and approved by the owner on 2026-11-27.

## Split of part B

The rest of the pitch is about 22 files, over the big-batch limit of 15, so part B splits again. This is a count from the files that reference an existing utility skill and from the pitch's file list, not from written code.

| Part | Content | Files |
|---|---|---|
| **B1 (this plan)** | A real install can report `empty` or `existing`; a starter-only repository asks. | about 10 |
| **B2 (outline)** | `kickoff` skill with Claude, Cursor, Codex and OpenCode adapters; pipeline doc, relations, shipped list; definition template; draft and publication file rules with tests; routing `empty`, `resume` and "New project" into the interview; `first-version` hand-over; entry files; eval dataset. | about 17 or more |

B2 is also over the limit. Its plan must split or cut before any build. It is planned after B1 ships. The host command-name check for `kickoff` (fallback `project-kickoff`) belongs to it.

## Owner decisions (2026-11-27)

1. **Install route: move the source folder out.** After Step 1 copies the files, setup asks to move the bundle's source folder out of the project, then runs the check. The README switches to this one route.
2. **Starter-only repository: `unclear`.** When root README, LICENSE or `.gitignore` files are the only project files, the check reports `unclear` and lists them.

**Evidence for decision 1** (coordinator simulation: `git archive` of `8f3e764` without `.project/` and `graphify-out/`, then the shipped files copied into place). With the source folder present, an empty project and one holding `package.json` and `src/app.ts` printed byte-identical `unclear` results with no project path in them. With it removed they reported `empty` and `existing`. A real folder copy can carry more local files.

**Amends the part A contract and the pitch:** the pitch's `existing` rule covered any document file. `pitch.md` is not edited; this section records the change.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| B1-S1 | Starter-only rule | `ai-framework/scripts/project-state.mts`, `project-state.test.mts` | 50–80 | — | — | Yes: two files, clear tests. Orca implementation pool. | standard |
| B1-S2 | One install route that moves the source folder | `SETUP.md`, `README.md`, `ai-framework/docs/setup.md`, `.claude/skills/setup/SKILL.md`, `.cursor/skills/setup/SKILL.md`, `.project/evals/datasets/greenfield-kickoff.json`, and `AGENTS.md` plus `CLAUDE.md` if the spike needs them | 100–180 | S1 (its wording) | — | Yes: disjoint from S1. It moves a user's folder, so not `fast`. | standard |

Scopes run one at a time: parallel writers need separate worktrees. The release record is written at `/ship-pitch`.

## Spike first (B1-S2), before any instruction text

Record the answers in `deviations.md`.

1. **Later steps that read the source folder.** Step 3 merges the bundle's root `.gitignore`, and the agent is reading `SETUP.md` from inside the folder. Every such reference must use the new location.
2. **An interrupted setup.** The copied `CLAUDE.md` and `AGENTS.md` say to read `SETUP.md` when `.project/` is missing. After a move there is none at the root. Leading answer: the bootstrap asks the person where the source folder went. That adds both entry files.
3. **Where it can move.** A harness sandbox may refuse writes outside the project. If the move cannot be done, the person can do it or decline.
4. **The README route.** Today it copies the contents to the root, and each tool starts setup by itself. On the new route the entry files are not at the root yet, so the person must ask the tool to read `ai-workflow-portable/SETUP.md`. If the spike cannot keep automatic start, report that to the owner before building.

If the spike shows the move cannot be made safe, stop and return to the owner.

## Exit criteria

### B1-S1
- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/project-state.test.mts` exits 0, and so does `bun test` on the same file.
- New tests, each failing first, built on the real-install fixture:
  - only `README.md`, only `LICENSE`, only `.gitignore`, and all three: `unclear`, each path in `evidence`, with its own reason;
  - `README.md` plus `src/app.ts`: `existing`;
  - `docs/README.md` alone: still `existing`;
  - a root document that is not a starter file: `existing`;
  - no project files: still `empty`.
- Starter files are matched only at the root, ignoring case: `README`, `LICENSE`, `LICENCE` (each bare, `.md` or `.txt`) and `.gitignore`.
- The rule applies only after a scan with no refusal.

### B1-S2
- The setup mirror diff is empty: `diff <(sed 1,6d .claude/skills/setup/SKILL.md) <(sed 1,6d .cursor/skills/setup/SKILL.md)`.
- The instructions state all of these: show the source and destination; move only after approval; never delete; refuse when the destination exists, the source is a link, or the source's `SETUP.md` does not start with the bundle's title; a declined or failed move continues setup and expects `unclear`.
- `grep -n "copy-to-root\|contents of this folder to the root" README.md SETUP.md ai-framework/docs/setup.md` finds no remaining second route.
- **Simulation (coordinator):** follow the new instructions on a disposable empty project, a starter-only project and a project with code. Expect `empty`, `unclear` and `existing`. The input is a copy of the committed bundle, not the shipped list.
- Dataset case `source-folder-move` is added, `live-only`: it expects the question before the move and no deletion. It stays `not-run` until the owner runs it, and is never reported as a pass.
- Owner live smoke in one host on the new route, recorded; unrun is recorded `not-run`.
- `setup-validator`, `workflow-doctor` and `graphify-relations --check` exit 0.

### Part B1 at `/ship-pitch`
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 0.

## Blast radius

| Changed | Consumers | Handling |
|---|---|---|
| `project-state.mts` | Setup routing only; the JSON shape and states are unchanged | Existing tests that expect `existing` for root starter files are updated deliberately |
| `SETUP.md` | New installs; `bundle-sync` (merged by hand); setup-validator and doctor read its first line | Title unchanged; changelog note |
| Setup skill | Claude, Cursor mirror, thin Codex and OpenCode adapters | Mirror diff |
| Entry files, only if needed | Every harness; setup-validator and contract tests read them | Full verifier |

## Risks

| Risk | Scope | Spike? | Mitigation |
|---|---|---|---|
| Moving a folder that holds the person's own work | S2 | Yes | Move, never delete; title check; refuse an existing destination; approval first |
| Setup cannot resume after the move | S2 | Yes | Spike item 2 |
| Losing automatic setup start on the README route | S2 | Yes | Spike item 4; owner decides if it is lost |
| A README with real requirements | S1 | No | `unclear` asks and lists it; nothing is treated as empty |
| `node_modules` exceeds the scan budget | — | No | Unchanged; a project with installed packages still reports `unclear` |

## Review

`/audit` uses reviewers from a vendor other than the implementer, each with a model set. Security review covers the move instructions.

## Living-spec deviations log

(Empty at plan time.)
