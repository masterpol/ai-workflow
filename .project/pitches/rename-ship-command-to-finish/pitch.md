# Pitch: rename-ship-command-to-finish

> **Amended 2026-11-25 by the owner:** the new command is **`/ship-pitch`**, not `/finish`. Read every `finish` below as `ship-pitch`.

**Date**: 2026-11-25  •  **Appetite**: big-batch, with a declared mechanical-rename exception (see "Size")
**Stack**: workflow tooling (skill adapters, startup and metrics hooks, bundle-sync, docs)

## Problem

Claude Code has a built-in `/ship`, so the workflow's `/ship` no longer loads. A person who types `/ship` gets the built-in instead of the
workflow's close-out. In the 2026-11-24 session it pushed the branch, opened a pull request and started a code review: outward-facing
actions the owner had not asked for in that form, and none of the ship playbook ran. Asking the model to run it answered "A custom /ship
isn't loaded, because Claude Code has a built-in command of that name. To use the custom one, rename it." The close-out was then done by
reading the playbook by path.

## Knowledge consulted

- [issues/deleting-a-file-breaks-shipped-outcome-records-that-link-to-it] — moving a skill file can break graph builds through record
  links. A grep of `.project/records/` on 2026-11-25 found no link to the ship skill, phase doc or verifier; re-check at /plan with the
  same target extraction the graph uses.
- [issues/installed-skill-wrappers-ship-as-orphans] — a fix in a new script does not help a project still running its old one; installed
  projects need to be told what to do.
- [patterns/word-boundary-replacement-does-not-see-a-prefixed-property] — a search-and-replace of "ship" would hit `SHIPPED.md`,
  `pre-ship-verify`, `shipped:` and the ordinary verb. Only command forms may change.
- [rules/canonical-mirror-sync] — the Cursor skill is a byte copy and changes in the same commit.

## Solution sketch (breadboard)

**The decision that sizes this:** rename the **command a person types** (`ship` → `finish`). Keep **`ship` as the phase's name** everywhere it
is data: `--phase ship`, caveman and skill phase lists, metrics values, `SHIPPED.md`, `records/shipped/`, `4-ship.md`, `pre-ship-verify.mts`.
The collision is only with the command name.

**Places and affordances**
- **Entry points:** `.claude/skills/finish/` (canonical), its Cursor copy, `.agents/skills/finish/`, `.opencode/commands/finish.md`;
  the four `ship` ones are removed. The skill text keeps its steps and says "the ship phase".
- **Command to phase:** the places that turn a typed command or skill name into a phase learn that `finish` means `ship`: the Claude
  startup hook, the Codex prompt hook, and workflow metrics capture. /plan finds the full list; one shared mapping is preferred.
- **Graph:** `relations.toon` points at the new skill path.
- **Guidance:** every instruction that tells a person or an agent to type or run `/ship` says `/finish`.
- **Guard:** a test fails if a non-history file tells anyone to run `/ship`, or if a `ship` skill or command adapter comes back.
- **Installed projects:** `bundle-sync` prints a next step when the target still has a `ship` skill or command: remove it (`--prune`
  removes it only when unmodified; a customized one is the owner's to move).

**Connections**: `/finish` → the startup hook reports phase `ship` → the playbook → the same records as before.

## Size

About 52 non-history files mention the command or its adapter paths (32 contain `/ship` or `$ship`; 23 name the paths; the sets
overlap). Estimated: 4 adapters, about 6 hook and test files, `relations.toon`, `bundle-sync` and its test, one guard test, and about
35 files of one-line text edits. That is over the 15-file cap. **Exception asked for:** the text edits are mechanical, one rule
("the command is `/finish`"), and enforced by the guard test. The logic changes stay within about 12 files. Splitting the sweep into a
second pitch is rejected: it would leave the docs telling people to run a command that does the wrong thing.

## Rabbit holes

**Resolved here** (with answer):
- Rename the phase too? → No. It would touch stored metrics values, outcome records and history for no user benefit.
- Keep a `ship` alias? → No. The built-in shadows it, and a leftover adapter in another harness would keep two names alive.
- Rewrite history? → No. `.project/pitches`, `runs`, `records`, knowledge entries and `CHANGELOG.md` keep `/ship`.

**Pushed to /plan as risk** (with named owner):
- Is `finish` free in every host? Not verified. The coordinator checks Claude Code's command list first, then OpenCode, Codex and Cursor
  where they can be run. Fallback name if taken: `ship-pitch`.
- Metrics: do old events recorded under the command `ship` and new ones under `finish` join to one phase? (planner, with a test)
- Text that says "→ /ship" inside gate and transition lines is matched by tests that pin instruction structure
  (`instruction-loading`, `graphify-relations`); find them before editing (planner).

**Pushed to no-go** (deferred):
- A general collision check of every workflow command against host built-ins (a followup for the doctor).
- Renaming `checkpoint`, `plan`, `resume` or other commands that may collide: report what the check finds, change nothing.

## No-gos (this pitch)

- ✗ No rename of the phase id, `SHIPPED.md`, `records/shipped/`, `4-ship.md`, `pre-ship-verify.mts` or any stored value.
- ✗ No change to what the close-out does or to its gate.
- ✗ No blind search-and-replace of the word "ship".
- ✗ No edits to historical records.
- ✗ No deleting a customized `ship` skill in an installed project.

## AI-prompt classification

Judged **not** an AI-prompt scope: the instructions keep their meaning and only the command name changes, so there is no golden eval case.
This is a judgment call for the owner or the critique to overturn, since the edited files are model-facing instructions.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Not run (see Bet decision).

## Bet decision

☑ **Bet** (→ /plan) — 2026-11-25: the owner ran `/plan` on this pitch. **`/critique` was not run**, although big-batch normally fires it; no findings were reviewed before the bet. The size exception stands, and `plan.md` corrects the logic-file estimate from about 12 to about 20.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/rename-ship-command-to-finish/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.
