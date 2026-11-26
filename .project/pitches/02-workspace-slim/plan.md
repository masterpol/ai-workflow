# Plan: workspace-slim

**Pitch**: pitch.md  •  **Appetite**: big-batch, small end (9 files, ~500 LOC)  •  **Hill**: hill.md

## Spike results (2026-11-26, Git 2.54.0, temporary repository with marker programs)

| Command the report could use | Plain | With `-c core.fsmonitor=false -c core.hooksPath=/dev/null`, global config off |
|---|---|---|
| `ls-files -z` (tracked, untracked, ignored), `check-ignore` | `core.fsmonitor` program ran | nothing ran |
| `rev-parse --show-toplevel` | nothing ran | nothing ran |

The repository also had clean and process filters, file hooks and seven `hook.*` event settings: none fired on these commands. This covers these
commands and events only, not other Git commands or versions. The report needs no refusal of filters or hooks.

- `graphify.mts` calls Git itself only as `rev-parse --git-path hooks` (line 683); the index change is in `renderIndex`. The pending hook-risk
  check does not block this pitch. What the external `graphify` tool runs was not looked at.
- Disk here, without `.git` and `node_modules`: `.project/` 23,879 files, 344 MB, against 1,618 files and 12.6 MB tracked; `.project/evals` alone
  about 296 MB; `graphify-out/` 209 MB. Walks took under 1 s. No symlinks in the three trees checked.
- `.project/` folders differ by project (for example `decisions`, `.bundle-sync.json`, `relations.toon`, `orchestration.json`).

## Blast radius (`/impact`, done inline)

| Consumer | Effect |
|---|---|
| `setup-validator`, `workflow-doctor` | need `index.md` to exist and start with its title: unchanged |
| `graphify.test.mts` | two assertions read the diagram (`one --> two`, the supersedes arrow): move them to graph data |
| `installed-upgrade`, `pitch-archive`, `pitch-compress` tests | call `renderIndex` or exclude the file; no assertion on the two sections: full suite must stay green |
| `/knowledge-health` | its tag step needs a source: `--check --json` has no tags today |
| `docs/knowledge-graph.md`, two knowledge READMEs | describe the removed sections |
| `/fix`, `/shape`, `SETUP.md` "tag index" | refer to `graph.json`: unchanged |
| installed projects | index is regenerated on their next graph run; their knowledge README is project-owned and keeps old text after sync |
| `runtime/invariants.test.mts`, bundle sync | cover and ship a new script under `ai-framework/scripts/` with no change |

## Report contract (S1)

`node ai-framework/scripts/workspace-report.mts [--root <dir>] [--json]`

- **Scanned:** `.project/`, `graphify-out/`, `ai-framework/` and the vendor folders (`.claude`, `.agents`, `.cursor`, `.opencode`, `.codex`).
  Application code is not scanned, and the output says so.
- **Per area:** files and bytes on disk, tracked files and bytes, kind (knowledge, records, generated, local data, recovery, evidence, installed
  packages, bundle), and a fixed next step naming a tool or pitch, or `no supported action yet`.
- **A fixed table** maps path prefixes to areas. A child of `.project/` not in it is `unrecognised`: listed with its name, "ask before removing".
- **Warning** when anything under `.project/skills/packages/` is tracked.
- **Never opens a file**: sizes come from `lstat`. Prints no file names, only area labels and unrecognised folder names (printable, shortened).
- **Symlinks** are counted, never followed, also when a scanned folder or its parent is one.
- **Bounds:** 200,000 entries and depth 40. A reached bound, an unreadable folder or a failed Git listing makes the affected numbers
  `incomplete` or `unknown`, never zero.
- **Git:** only `rev-parse --show-toplevel` and `ls-files -z`, with a fresh environment (as `review-bench`), `core.fsmonitor=false`, hooks path
  off, `PATH` entries outside the project only, a timeout and an output cap. Not a Git repository: tracked is `unknown`.
- **Writes nothing**, the Git index included. Fixed error messages. Exit 0 for a report (warnings and incomplete included), 1 on failure.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Read-only workspace report | `workspace-report.mts`, `workspace-report.test.mts` (new), `workflow-doctor.mts` (script list) | ~400 | — | S2 | yes: own files, clear contract | standard |
| S2 | Smaller index and its readers | `graphify.mts`, `graphify.test.mts`, `.claude/skills/knowledge-health/SKILL.md`, `ai-framework/docs/knowledge-graph.md`, `ai-framework/templates/project/knowledge/README.md`, `.project/knowledge/README.md` | ~100 | — | S1 | yes: disjoint files, mechanical | fast |

The coordinator writes anything under `.project/` (workers' reports may not list it), including S2's `.project/knowledge/README.md` and the rebuilt index.
Release bookkeeping after both: `changelog.mts`.

## Exit criteria per scope (machine-checkable)

`N` = `node --experimental-strip-types --disable-warning=ExperimentalWarning`. Every new guard is removed once and a test must then fail, from a
green baseline (`testing.md`). Marker tests include a positive control.

### S1
- `N --test ai-framework/scripts/workspace-report.test.mts` and `bun test` on it exit 0, with cases:
  - a fixture tree gives exact file and byte counts per area, tracked apart from local
  - tracked packages raise the warning; ignored ones do not
  - an unknown `.project/` child is `unrecognised`; a hostile folder name is printed safely
  - symlinked file, folder and scanned root are not followed
  - a secret-shaped file is counted and never opened or named (read-refusing spy)
  - each bound, an unreadable folder, a failing Git call and a non-Git folder give `incomplete` or `unknown`
  - a real repository with an `fsmonitor` marker: the marker does not run, and does under plain Git
  - tree contents, times and the Git index are unchanged after a run
- `N ai-framework/scripts/workspace-report.mts --json` exits 0 here and its tracked `.project/` total equals `git ls-files .project` counted separately
- `workflow-doctor` exit 0

### S2
- `N --test ai-framework/scripts/graphify.test.mts` and `bun test` on it exit 0: no `## Tag Index` or `## Graph` in the output, the title,
  entry lists, counts and decision status stay, the two former diagram assertions hold against graph data, and `--check --json` carries tags
- `N ai-framework/scripts/graphify.mts` then `--check` exit 0; `wc -c < .project/knowledge/index.md` is under 40,960 (before: 123,000 bytes); record both
- knowledge entry count is the same before and after
- `git grep -n -i 'tag index\|mermaid' -- ai-framework/docs/knowledge-graph.md ai-framework/templates/project/knowledge/README.md .project/knowledge/README.md`
  shows no claim that `index.md` carries either

### Both
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exit 0
- Build, typecheck, lint, i18n: not applicable (`.project/context/stack.md`). No UI or AI-prompt scope.

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| A reader of the removed sections is missed | S2 | done by search | Blast-radius table; full suite; an unsearched reader outside this repo stays possible |
| The tracked listing runs a project program | S1 | done | Flags and fresh environment; marker test |
| `graphify.mts` and the hook risk | S2 | done | Only `rev-parse` in this file's own Git use; change is in `renderIndex` |
| Large trees and symlinks | S1 | done (timing) | Bounds, `incomplete`, no following |
| Hardened Git call copied from `review-bench` and drifting | S1 | no | Same rules, own tests; a shared helper is a followup |
| With global Git config off, a `safe.directory` setup fails the listing | S1 | no | Reported as `unknown`, never zero |
| The report reads as advice to delete | S1 | no | Fixed next steps; unrecognised means ask; no "safe to remove" wording, tested |
| A casing alias or mount inside a scanned folder | S1 | no | Counted as found; no write happens; not tested on Windows |

## Parallel dispatch plan

S1 and S2 touch no common file and could run together. Orca currently has room for **one** worker (three old ledger entries still hold slots of
4), so they run one after the other: S1, then S2. Each dispatch sets the configured model for its profile explicitly. The coordinator verifies
each result, then does the `.project/` edits and the release record.

## Living-spec deviations log

- 2026-11-26 (/build): dispatches name the vendor by hand (codex S1, claude S2) instead of balancing, because the configured model must be set per
  vendor and balancing picks the vendor after the placement is written. Run `run_012cb51463eb`; new local branch `feat/workspace-slim`.
- 2026-11-26 (S1, coordinator edit): the report named `workspace-recovery`, an unbuilt draft pitch, as the next step for runs, records, recovery,
  analysis, reports, evals and metrics. The pitch requires "no supported action yet" there. The brief had suggested that name. Fixed in the
  coordinator thread, with a test.
- 2026-11-26 (S2): the coordinator made the same README edit under `.project/knowledge/` and rebuilt the index.
- 2026-11-26 (verification): the first full verifier failed on 8 tests; the blast-radius table had missed two consumers. (1) The Cursor byte copy of
  `knowledge-health/SKILL.md` (mirror refreshed). (2) `consolidation-migrate.mts` refreshes a project's knowledge README only for known earlier
  templates, by hash; the previous template's hash was added, with a test, and the older fixtures are rebuilt from it. Installed projects with an
  unedited README now get the new text through that migration (corrects the plan's "keeps old text" risk). Coordinator edits; 12 files in total.
- 2026-11-26 (gates): big-batch gates `/build` per scope; S2 was started without presenting S1 for confirmation. Both are presented at the end gate.
- 2026-11-26 (/audit cycle 1): fixed in the coordinator thread. The Git boundary is now the outermost enclosing repository, not `--root`; a tracked
  path the walk does not meet makes tracked figures `incomplete`; a split index gives tracked `unknown` (one more `rev-parse --git-dir` call);
  unrecognised folders print as `Folder <restricted name>`; the packages warning ignores letter case; test gaps closed.
