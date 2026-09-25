# Portable AI Development Workflow

A self-contained, tool-agnostic bundle of a ShapeUp-style, 5-phase AI development pipeline —
specialized subagents, coding/security rules, a persistent traversable knowledge graph,
hill-chart progress tracking, and cost-aware model routing. Works with **Claude Code, OpenCode,
Codex, and Cursor** — install once, open with whichever tool you have.

## Concepts (read this first)

- **Phases, not chat.** Work moves through named phases — `/shape → /critique → /plan → /build →
  /audit → /ship`, with `/cooldown` every 5 ships — instead of open-ended conversation. Each
  phase has a playbook, a purpose, and (for most) a confirmation gate.
- **Confirmation gates.** A gated phase always ends with **Approve / Revise / Back / Stop** —
  the AI never auto-advances through one. Which phases are gated adapts to the work's size
  (small-batch / big-batch / bug-fix / hotfix) — see the gate matrix in
  `ai-framework/workflow/overview.md`.
- **Subagents are role prompts, not magic.** `.claude/agents/*.md` are canonical prompts (e.g.
  `security-reviewer`, `code-reviewer`, `ux-reviewer`, `architect`). A harness with native
  subagent dispatch runs them in parallel; one without just opens the file and adopts it as a
  focused pass. Full roster: `ai-framework/integrations/harnesses.md`.
- **Rules are stack-agnostic on purpose.** `ai-framework/rules/*.md` (15 files) hold universal
  principles with placeholders instead of a named framework. `/setup` fills those placeholders
  with your actual stack's conventions and writes the result to `.project/rules/` — the
  portable rule files themselves never get edited per-project.
- **The knowledge graph is real, not a folder of notes.** `.project/knowledge/` holds
  `decisions/`, `patterns/`, `entities/`, `issues/` entries with frontmatter ids/tags/links.
  `graphify.js` turns that into a traversable graph every phase can query — see
  [Knowledge Graph](#knowledge-graph) below.
- **One entry file per vendor, self-triggering.** `CLAUDE.md` (Claude Code) and `AGENTS.md`
  (OpenCode/Codex/Cursor) are what each tool auto-reads at session start. Both carry first-run
  detection: if `.project/` doesn't exist, the tool reads `SETUP.md` and installs itself — see
  [Set up](#set-up).
- **Generated and canonical data stay separate.** `.project/` is a scaffold for both generated
  context/rule companions and canonical project records such as pitches, designs, and knowledge
  entries. Only generated outputs — project specifics, `.project/rules/*`, and
   `knowledge/graph.json` + `index.md` — should be regenerated instead of hand-edited.
- **Consumption is compact and local.** A post-agent collector keeps current and previous usage,
  lifetime totals, and a small idempotency window in one JSON snapshot, plus regenerated Markdown
  and HTML views. It never retains prompts, responses, or transcripts.

## Set up

1. **Copy** the contents of this folder to the root of your target project.
2. **Open the project** with your AI tool (Claude Code / OpenCode / Codex / Cursor).

That's it — no need to separately ask it to run setup. Every supported tool auto-reads a root
file this bundle ships (`CLAUDE.md` for Claude Code, `AGENTS.md` for OpenCode/Codex/Cursor), and
each one detects `.project/` is missing and self-triggers `SETUP.md` on its own. If your tool
doesn't auto-read either file, just ask it to *"read `SETUP.md` and set up the workflow."*

**OpenCode model setup:** connect OpenAI and OpenCode Zen before starting a routed workflow —
the bundled OpenCode routes deliberately avoid Anthropic for now, since some installations only
have OpenAI/Zen connected and a route through an unconnected provider errors instead of falling
back. The bundled routes use Zen's free `opencode/space-bunny-free` model only for short,
non-sensitive fast work, and OpenAI GPT-5.6 for standard and deep work (different reasoning
effort per profile). Run `opencode debug config` to confirm that OpenCode resolves the
configuration. For confidential work, replace the free fast-route adapters with the documented
paid OpenAI route in `ai-framework/integrations/harnesses.md`.

What setup actually does (`SETUP.md`, driven by the `/setup` skill in Claude Code — other
harnesses follow the same doc manually):

1. Places the framework files and every harness adapter (merges instead of overwriting anything
   you already have; never touches `settings.local.json` or credentials).
2. Scaffolds `.project/` from `ai-framework/templates/project/` — context, rules, knowledge,
   design, requirements, pitches, runs, status.
3. Initializes the knowledge graph (`node ai-framework/scripts/graphify.js` — empty at this
   point, but now it exists and every later phase can rebuild it the same way).
4. Scans the actual project (`package.json`, framework/test/deploy config, `.env.example` —
   **never** `.env`/`.env.local`) and drafts `.project/context/{product,architecture,stack}.md`
   plus the project-specifics section of `AGENTS.md` and the full `CLAUDE.md` mirror.
5. Drafts stack-specific rule companions into `.project/rules/` — only for what the scan found
   evidence of (frontend framework, styling system, backend/ORM, mobile target, AI structured
   output). Folds in real conventions from your `README.md`/`CONTRIBUTING.md`; if none are
   documented, queues a follow-up instead of inventing any.
6. **Gates generated project content** — shows the planned framework, scaffold, context, and rule
   writes, then waits for Approve / Revise / Selective / Cancel. The setup status marker may be
   updated before a gate so an interrupted setup can be resumed.
7. Verifies the install end-to-end (see below) and reports a punch list of what's wired vs. what
   you still need to decide.

### Token Consumption

After agent completion, the collector updates these Git-ignored local files:

- `.project/metrics/token-consumption.json` is the only stored metric state. It holds current and
  previous completion consumption, increase/decrease comparison inputs, lifetime aggregates, and a
  bounded deduplication list.
- `.project/metrics/token-consumption.md` and `.project/metrics/token-consumption.html` are
  regenerated views for a quick report or browser dashboard. They open with a **Usage** summary
  (most used vendor and model, and the basis it was ranked on), followed by tables by vendor,
  model, agent, reasoning effort, and skill.

The by-model, by-agent, by-effort, and by-skill tables start counting when the snapshot moves to
schema v2 (the report prints the date) and are not back-filled. A harness that does not report a
field shows `Unreported`; a completion with no nonzero cost shows `Unpriced`. Only skill names are
recorded, never a skill's arguments. Completion counts are per assistant message for OpenCode and
per subagent run for Claude Code and Codex, so they are not comparable across vendors.

OpenCode reports per-message token fields and actual cost. Claude Code reports a completion for
every subagent and can supplement foreground agents with final-request usage, which is labelled
partial. Codex records all subagent completions but its hook payload supplies no token or cost
fields, so those values are reported as unavailable rather than zero. Cursor has no verified
completion-hook payload and is not wired automatically.

**Re-running setup:** `/setup` (or re-reading `SETUP.md`) detects existing context docs and
offers Refresh all / Merge / Selective / Cancel. Merge mode shows a diff and preserves manual
edits where possible; Refresh all overwrites selected generated documents only after your
explicit approval.

**Verify the install** — run the workflow doctor (below), then a dry run: give the AI a tiny
first task and run `/shape` (or read `.claude/skills/shape/SKILL.md`) to confirm the pipeline
flows end to end.

**Troubleshooting:**
- *Tool didn't self-trigger setup* — it may not auto-read `CLAUDE.md`/`AGENTS.md` on your
  version; explicitly ask it to read `SETUP.md`.
- *`CLAUDE.md` still looks like a bootstrap stub after setup* — setup was interrupted before its
  Step 4; re-run `/setup` to regenerate the full mirror.
- *Something looks missing or broken* — run `node ai-framework/scripts/workflow-doctor.js`; it
  diagnoses far more precisely than guessing, and `--fix` can restore missing `.project` files
  without touching anything you've written.

## Workflow Doctor

Run `node ai-framework/scripts/workflow-doctor.js` from the project root to validate **every**
skill and agent this bundle ships — not a fixed list. It discovers all `.claude/skills/*/` and
`.claude/agents/*.md` at run time, derives each one's `fast`/`standard`/`deep` profile from what
the canonical file itself declares, and checks that both the OpenCode and Codex mirrors exist,
load the canonical file (or, for a script-backed skill like `workflow-doctor` itself, the script
it wraps), and carry the model that profile implies — plus core rules, hook and script syntax,
scaffold templates, the knowledge graph, and OpenCode's resolved configuration when available.
It also requires the caveman-mode instruction in every canonical skill, agent, and (in this bundle)
both entry files, validates `.project/skills/modes.json`, and reports the live state — active, inert
(skill not installed), disabled, or under-covering the workflow — so "carries the instruction" is
never mistaken for "is on".
Checks run concurrently and print color-coded progress as each completes. Skills installed with
`add-skill` are recognized from `.project/skills/registry.json` and checked for ownership, vendor
coverage and activation instead of canonical mirror rules. It does not validate Cursor mirrors
(the setup validator does) or installed hook wiring in a target project's `.claude/settings.json`.

- `--fix` restores missing template files and the generated `_followups.md` backlog only when a
  non-symlink `.project/` directory already exists. Run it only after approving the repair; it
  never overwrites existing project files or credentials.
- `--json` for machine-readable output; `--no-color` for plain text.

When a project knowledge scaffold exists, the doctor also runs `graphify.js --check` and
validates the structural consistency of `knowledge/graph.json` and `knowledge/index.md` before
reporting the workflow ready. Run it after adding or changing any skill, agent, rule, template,
or the knowledge graph — nothing needs manual registration for the doctor to pick it up; see
[One source, every vendor](#one-source-every-vendor) below.

## Setup Validator

After `/setup` completes in a target project, run
`node ai-framework/scripts/setup-validator.js`. It is read-only and verifies the generated
`.project` context and scaffold, filled project specifics, full `CLAUDE.md` mirror, knowledge
graph, and a Cursor mirror for every canonical skill and agent, then runs the workflow doctor as a prerequisite. A missing `.project`
in this portable bundle is expected; it becomes a setup failure only when run in a target project.
Use `--json` for automation or `--no-color` for plain text. Repair failures by re-running `/setup`
through its confirmation gates, rather than hand-editing generated artifacts.

## Knowledge Graph

Setup builds a real, traversable knowledge graph from `.project/knowledge/` — not just a folder
of markdown. `node ai-framework/scripts/graphify.js` scans `decisions/`, `patterns/`,
`entities/`, and `issues/` (frontmatter `id`/`tags`/`related` + body `[[wiki-links]]`) and
regenerates:
- `.project/knowledge/graph.json` — machine-readable nodes, edges, and a tag index. This is
  what `/shape`'s knowledge gate, `/search`, `/knowledge-health`, and `/cooldown` traverse to
  find prior knowledge instead of re-reading every file.
- `.project/knowledge/index.md` — human-readable catalog, with a Mermaid graph when entries have
  related edges.

Both are derived — never hand-edit them, edit the entries and re-run the script. Setup creates the
initial graph; `/ship` and `/cooldown` rebuild it when their approved knowledge extraction,
promotion, or archive work changes entries. Run it manually (`--check` for a dry-run report,
non-zero exit on duplicate ids) after any other manual edit to a knowledge entry.

## Version Log & Bundle Sync

This repo tracks its own history in `VERSION` and `CHANGELOG.md` at the root. Run
`node ai-framework/scripts/changelog.js --check` for the current version and latest entry, or
see [How to improve this flow](#how-to-improve-this-flow) for when to add one — never hand-edit
either file, always go through the `changelog` skill/script.

A project that already unpacked this bundle can pull upstream improvements without re-running
`/setup` (which only refreshes generated `.project/` content, not the bundle's own canonical
files) — run `node ai-framework/scripts/bundle-sync.js` from that project's root for a dry-run
comparison against the public GitHub `main` branch, then `--apply` after reviewing it. Use
`--source <path-to-a-newer-checkout>` only for offline or unpublished changes. See
`.claude/skills/bundle-sync/SKILL.md` for exactly what is compared, what is flagged for manual
review, and the post-sync verification step.

## What you get

```
ai-framework/      Portable core — rules/ workflow/ templates/ integrations/ scripts/ hooks/
.claude/           Claude Code role prompts, skills, and hooks (canonical — see below)
.opencode/         OpenCode commands and native role adapters (thin mirrors)
.codex/            Codex configuration and native role adapters (thin mirrors)
.agents/           Codex-native phase skills (thin mirrors)
AGENTS.md          Cross-tool entry point (OpenCode/Codex/Cursor auto-read this)
CLAUDE.md          Claude Code entry point — self-triggers setup on first load
SETUP.md           The AI-followable install guide (start here)
```

`.cursor/{agents,skills}/` aren't shipped in the bundle — `SETUP.md` generates them at install
time as mirrors of `.claude/agents/` and `.claude/skills/`, since Cursor uses the same format
(`node ai-framework/scripts/skill-vendors.js cursor-mirrors --apply` creates missing ones).

External skills (for example from skills.sh) are added with `/add-skill`, which installs one
verified skill for every vendor in the project with an explicit scope and workflow phases. See
`ai-framework/integrations/skills.md`.

## One source, every vendor

> **Caveman mode** rides the same architecture: one instruction, carried by every canonical skill
> and agent (and both entry files), resolved per invocation by `skill-defaults.js`. Vendor mirrors
> point at the canonical files or are byte copies — see
> [`ai-framework/integrations/skill-defaults.md`](ai-framework/integrations/skill-defaults.md).

Every skill, agent, and command is written **once**, canonically, and every vendor consumes
that same source — no vendor maintains its own copy of the logic:

- **Skills** — canonical at `.claude/skills/<name>/SKILL.md`. Mirrored as
  `.opencode/commands/<name>.md` (OpenCode) and `.agents/skills/<name>/SKILL.md` (Codex), and at
  install time as `.cursor/skills/<name>/` (Cursor). Every skill has all three mirrors —
  not just the 7 pipeline phases (`workflow-doctor.js` enforces this, so no count is kept here).
- **Agents** — canonical at `.claude/agents/<name>.md`. Mirrored as `.opencode/agents/<name>.md`
  and `.codex/agents/<name>.toml`, and at install time as `.cursor/agents/<name>.md`.
- **A mirror is a pointer, never a fork.** Every mirror's entire content is "load the canonical
  file and follow it exactly," plus a `model:`/frontmatter line picked from the profile the
  canonical file itself declares. If you ever find a mirror with actual logic in it instead of a
  pointer, that's drift — fix it by deleting the logic and pointing back at the canonical file.
- **The profile is declared once, in the canonical file** — a skill's
  `> **Recommended capability profile:** `fast`/`standard`/`deep`` line, or an agent's `model:`
  frontmatter (`claude-haiku-*` → fast, `claude-sonnet-*` → standard, `claude-opus-*` → deep).
  Nothing in this bundle hardcodes a second copy of that assignment — the mirrors' models and
  `workflow-doctor.js`'s checks both derive from it.

**This is enforced, not just documented.** `workflow-doctor.js` doesn't check a fixed list —
it discovers every directory under `.claude/skills/` and every file under `.claude/agents/` at
run time, derives each one's expected profile from its own canonical content, and fails if a
mirror is missing, doesn't load the canonical file, or doesn't carry the model that profile
implies. Add a new skill or agent with a declared profile and working mirrors, and the doctor
validates it automatically on the next run — nothing to register by hand. Run it after adding or
changing any skill or agent to confirm all four vendors would actually work.

## The pipeline

```
(brainstorm) → /shape → /critique → bet → /plan → /build → /audit → /ship
                                                            every 5 ships → /cooldown
```

| Phase | Does | Capability profile |
|-------|------|--------------------|
| shape | frame problem, appetite, rabbit holes, no-gos | deep |
| critique | pre-bet red-team | fast + standard |
| plan | independent scopes with machine-checkable exits | deep / standard |
| build | execute, hill-tracked, verify-before-done | standard |
| audit | review / security / test / ux / i18n / eval fan-out | standard |
| ship | reconcile, extract knowledge, compact status | fast |
| cooldown | issue→pattern→rule promotion, prune, triage | standard |

Full mechanics — workflow variants (big-batch/small-batch/bug-fix/hotfix), the adaptive gate
matrix, hill-chart positions, multi-pitch parallel work — live in
`ai-framework/workflow/overview.md`; per-phase detail in `ai-framework/workflow/phases/*.md`.

### Beyond the core pipeline

`.claude/skills/` ships more than the 7 pipeline phases — every one of them is a native command
in every supported vendor, not just Claude Code (see [One source, every vendor](#one-source-every-vendor) below):

| Category | Skills |
|---|---|
| Core pipeline | `shape`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown` |
| Navigate & maintain | `search`, `resume`, `switch`, `checkpoint`, `workflow-doctor`, `setup-validator`, `dependency-security`, `knowledge-health`, `impact`, `fix` |
| Bundle maintenance | `changelog` (this repo only — version-log an improvement), `bundle-sync` (target projects — pull structural updates from a newer source checkout) |
| Engineering depth | `eval-harness`, `test-strategy`, `ui-design` |
| Integrations | `sync` (Notion task sync) |

## How to improve this flow

This bundle is meant to be edited. `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` are the
canonical prompts and playbooks. OpenCode, Codex, and `.agents/` adapters are thin shims that
load canonical files; keep their behavior there rather than forking it. Cursor is different:
setup copies the canonical Claude files into `.cursor/`, so refresh those copied mirrors when the
canonical source changes.

After any registered change below, run `node ai-framework/scripts/workflow-doctor.js`. It catches
missing registered adapters, stale OpenCode model routes, core template/rule regressions, and
knowledge graph inconsistencies; manually verify any artifact that has not been registered with
it, including Codex model-profile choices. Once the doctor passes, run `/changelog` (or
`node ai-framework/scripts/changelog.js`, see `.claude/skills/changelog/SKILL.md`) to record the
change in `VERSION`/`CHANGELOG.md` — that log is what `/bundle-sync` diffs against in projects
that already unpacked this bundle.

**Add or edit a coding rule**
Edit `ai-framework/rules/*.md`. Keep it stack-agnostic — placeholders like
`<backend-workspace>`, `<ext>`, `<build-command>` instead of naming a framework. Per-project
concrete conventions belong in `.project/rules/`, generated by `/setup`, never in
`ai-framework/rules/` itself. Re-run `/setup` in an installed project to regenerate the
companion. Nothing to register — `workflow-doctor.js` discovers every file under
`ai-framework/rules/` automatically.

**Add a new subagent role**
1. Write the canonical prompt at `.claude/agents/<name>.md` with a Claude-compatible `model:`
   frontmatter value drawn from a `claude-haiku-*` (fast) / `claude-sonnet-*` (standard) /
   `claude-opus-*` (deep) family — that's the single declaration its profile is derived from
   everywhere else. Add the "Sub-agent dispatch" clause every other agent file carries (copy
   it from any existing one) so `workflow-doctor.js` doesn't flag it as undocumented.
2. Mirror it: `.opencode/agents/<name>.md` (thin shim, `model:`/`reasoningEffort:` per the
   profile's OpenCode model) and `.codex/agents/<name>.toml` (`model =` / optionally
   `model_reasoning_effort =`).
3. Add the name to the matching profile list in `ai-framework/integrations/harnesses.md`'s
   Role Profiles table (documentation only — the doctor doesn't read this table).
4. Run `node ai-framework/scripts/workflow-doctor.js` — it discovers the new agent from
   `.claude/agents/` automatically, derives its profile from `model:`, and checks both mirrors.
   Nothing to register by hand.
A mobile-focused example of this exact pattern is described in `SETUP.md` Step 5 / the `/setup`
skill's Step 2b (generated only for projects that need it).

**Add a new phase or cross-harness slash command**
1. Write the canonical playbook at `.claude/skills/<name>/SKILL.md`, with a
   `> **Recommended capability profile:** `fast`/`standard`/`deep`` line right under the H1 —
   the single declaration every mirror's model is derived from. (A skill whose profile genuinely
   depends on the situation, like `/plan`, can state that in prose; then add a one-line override
   in `workflow-doctor.js`'s `skillProfileOverrides` naming the baseline profile the command
   defaults to — see the existing `plan`/`fix`/`test-strategy` entries for the pattern.)
2. Mirror it: `.opencode/commands/<name>.md` (frontmatter `model:` matching the declared
   profile + "Load `.claude/skills/<name>/SKILL.md` and follow it exactly") and
   `.agents/skills/<name>/SKILL.md` (same pointer).
3. If it's a new pipeline phase (not a utility skill), also add the detailed canonical spec at
   `ai-framework/workflow/phases/N-<name>.md` and update the pipeline table + adaptive gate
   matrix in `ai-framework/workflow/overview.md`.
4. Run `node ai-framework/scripts/workflow-doctor.js` — it discovers the new skill from
   `.claude/skills/` automatically and checks both mirrors exist, load the canonical file, and
   carry the model its declared profile implies. Nothing to register by hand; a skill with no
   declared profile shows as a `WARN`, not silence.

**Extend the knowledge graph**
Edit `ai-framework/scripts/graphify.js` for new frontmatter fields or a new entry type; keep
`ai-framework/templates/project/knowledge/templates/*.md` and
`ai-framework/templates/project/knowledge/README.md`'s documented schema in sync with whatever
you add. Validate with a scratch `.project/knowledge/` fixture before trusting it against real
data — `graphify.js`'s header comment explains its contract.

**Add a hook**
Write the script under `ai-framework/hooks/scripts/` (cross-harness) or `.claude/hooks/`
(Claude-only), wire the entry into `ai-framework/hooks/hooks.json` (a wiring *template* — it's
not auto-loaded, `SETUP.md` Step 6 copies chosen entries into the target project's
`.claude/settings.json`), and document what it does and when it fires in that same step.

**Add a harness adapter (a 5th tool)**
Mirror the `.opencode/`/`.codex/` pattern in a new top-level directory, add a column to
`ai-framework/integrations/harnesses.md`'s capability-profile table, and add its entry-file
convention and setup nuances to `SETUP.md` Steps 1–2 and `AGENTS.md`'s harness table.

**Change what ships in `.project/` by default**
Edit `ai-framework/templates/project/` — this is the scaffold `/setup` Step 3 and
`workflow-doctor.js --fix` both copy from. It should stay generic; anything project-specific
belongs in the generated `.project/`, not the template.

## Design notes

- **Keep local settings and secrets out of distribution.** Never copy or commit a harness-local
  `settings.local.json`, credentials, `.env`, or `.env.local` file with this bundle. Setup
  preserves an existing local settings file and generates `.project/` data and entry-file
  specifics from the target project.
- **Model routing is profile-based with bundled defaults.** The core workflow uses
  `fast`/`standard`/`deep`; OpenCode adapters pin provider-qualified model IDs, while Codex
  adapters use Codex-native model identifiers. Connect the required OpenCode providers or
  explicitly change the affected adapters. See `ai-framework/integrations/harnesses.md`.
- **Portability is the AI's job, not a bash script's** — `SETUP.md` drives any assistant to
  place files, convert per-tool integration, and fill templates, so it works cross-platform
  (including Windows) and cross-tool. The few scripts that do exist (`graphify.js`,
  `workflow-doctor.js`, the hooks) are deterministic *checks and generators*, not the
  installer — the AI still drives placement, gating, and judgment calls.

See `SETUP.md` for the full step-by-step and `ai-framework/workflow/overview.md` for the
pipeline mechanics.
