# SETUP — Portable AI Development Workflow

> **You are an AI assistant** (Claude Code, OpenCode, Codex, Cursor, or similar). A human dropped this
> bundle into their project and asked you to set it up. Read this whole file first, then
> execute the steps in order. Every step that writes files ends with a confirmation gate —
> **show the human what you plan to do and wait for approval before writing.**

This bundle installs a ShapeUp-style, 5-phase AI development workflow with specialized
subagents, coding rules, a knowledge graph, and cost-aware model routing. It provisions the
same workflow for Claude Code, OpenCode, Codex, and Cursor so the target project can be opened
with any supported harness after setup.

---

## What's in this bundle

```
ai-workflow-portable/
├── SETUP.md                     ← you are here
├── README.md                    ← human-facing orientation
├── AGENTS.md                    ← cross-tool workflow index (copied to project root)
├── ai-framework/                ← PORTABLE core (stack-agnostic)
│   ├── rules/                   ← 15 stack-agnostic coding/security/architecture rules
│   ├── workflow/                ← pipeline overview + 6 phase specs
│   ├── hooks/                   ← lifecycle hooks + verification and consumption scripts
│   ├── templates/project/       ← scaffold for the per-project .project/ dir
│   └── integrations/            ← model profiles + harness guidance
├── .claude/                     ← Claude Code role prompts, skills, and hooks
├── .opencode/                   ← OpenCode commands + native role adapters
├── .codex/                      ← Codex configuration + native role adapters
└── .agents/                     ← Codex-native phase skills
```

Nothing here is project-specific. Secrets, local settings, and prior project data are
intentionally **excluded**. The per-project layer (`.project/` and `AGENTS.md` project specifics)
is generated in Steps 3–4.

---

## Step 0 — Orient

Before touching anything:

1. Confirm the current working directory is the **root of the target project** (where
   `package.json` / `pyproject.toml` / `go.mod` / `.git` lives).
2. Identify **which tool you are** so you can perform the final verification in Step 7. Setup
   still installs every supported harness:
    - Claude Code → uses `.claude/` and requires the `CLAUDE.md` mirror (auto-loaded every session).
    - OpenCode → uses `.opencode/` and reads `AGENTS.md`.
    - Codex → uses `.codex/`, `.agents/skills/`, and `AGENTS.md`.
    - Cursor → uses `.cursor/` + reads `AGENTS.md`.
3. Read `ai-framework/workflow/overview.md` so you understand the pipeline you're installing.

---

## Step 1 — Place the framework files

Copy the portable core and **all** harness adapters to the project root. Do not copy generated
dependency directories such as `.opencode/node_modules/`; install dependencies separately only
if a harness requires them.

- `ai-workflow-portable/ai-framework/` → `<root>/ai-framework/`
- `ai-workflow-portable/.claude/` → `<root>/.claude/`  *(merge if `.claude/` already exists — never overwrite an existing `settings.local.json`)*
- `ai-workflow-portable/AGENTS.md` → `<root>/AGENTS.md`  *(see Step 2 for tool nuances)*
- `ai-workflow-portable/CLAUDE.md` → `<root>/CLAUDE.md`  *(the self-triggering bootstrap — see below)*
- `ai-workflow-portable/.opencode/{opencode.json,commands/,agents/}` → `<root>/.opencode/`
- `ai-workflow-portable/.codex/` → `<root>/.codex/` and `ai-workflow-portable/.agents/` → `<root>/.agents/`
- `.claude/agents/*.md` → `<root>/.cursor/agents/` and `.claude/skills/*/` → `<root>/.cursor/skills/`
  *(Cursor uses the same agent and skill format; create these mirrors during setup.)*

**Every one of these is the "first run" artifact for its vendor** — the file that vendor's tool
auto-reads at session start, which is what lets it detect that `.project/` doesn't exist yet and
self-trigger the rest of setup without the human separately asking:
- Claude Code auto-loads `CLAUDE.md` → its bootstrap sends it to read `SETUP.md`.
- OpenCode, Codex, and Cursor auto-read `AGENTS.md` → its header sends them to read `SETUP.md`.

Placing all of them in Step 1, before Step 4 fills anything in, is what makes the *next* session
(in any supported tool) self-triggering — do not skip placing any of them, even for a harness
that isn't currently installed locally.

If the project already has `.claude/`, `.opencode/`, `.codex/`, `.agents/`, or `.cursor/`,
**merge** rather than replace: keep the human's existing files, add the files from this bundle
that do not exist yet, and list any name collisions for the human to resolve. For existing
`AGENTS.md`, `.opencode/opencode.json`, and `.codex/config.toml`, show a diff and merge only the
bundle settings that are absent. Never overwrite `settings.local.json` or a harness's existing
provider, model, or credential settings.

**If the project already has a `CLAUDE.md`** that predates this bundle (a human-authored one,
unrelated to this workflow): do not overwrite it. Instead show a diff and propose appending an
`## AI Workflow (ai-workflow-portable)` section — the same first-run/normal-session content
from the bundle's `CLAUDE.md` — so the human's existing instructions are preserved and this
workflow's bootstrap still fires. Only replace the whole file if the human explicitly approves.

**Gate:** list every path you will create/merge, then wait for approval.

---

## Step 2 — Wire all harnesses

Complete every section below. The target project will then carry the native integration for each
supported harness; the person using the project only needs to open it with their preferred tool.

### 2a — Claude Code
Nothing extra to convert — Claude Code auto-discovers `.claude/agents/` and `.claude/skills/`.
- Verify skills appear as `/shape`, `/plan`, `/build`, `/audit`, `/ship`, `/cooldown`.
- (Optional) Wire the post-edit hook — see **Step 6**.
- `AGENTS.md` is the shared project entry point; Step 4 can generate a `CLAUDE.md` mirror.

### 2b — OpenCode

OpenCode reads `AGENTS.md`, `.opencode/commands/`, and `.opencode/agents/` natively.

- Keep `.opencode/opencode.json`; OpenCode discovers the native phase wrappers in `.agents/skills/`.
- `.opencode/plugins/token-consumption.js` automatically records completed assistant message
  usage and actual cost into the local metrics snapshot.
- The included adapters intentionally do not pin a provider/model. Select available models by the
  `fast` / `standard` / `deep` profiles in `ai-framework/integrations/harnesses.md`.
- Quit and restart OpenCode after changing its config, commands, agents, or skills.

### 2c — Codex

Codex reads `AGENTS.md`, native skills in `.agents/skills/`, and native subagents in
`.codex/agents/*.toml`.

- Keep `.codex/config.toml`; it sets only a practical concurrency cap and does not override the
  user's provider or global model.
- The included role adapters use Codex models by profile. If a workspace restricts a model, remove
  `model` and `model_reasoning_effort` from that adapter so it inherits the allowed parent model.
- Ask Codex to spawn the named independent role agents, wait for results, then synthesize them.
- Review and trust `.codex/hooks.json` through `/hooks`; its `SubagentStop` hook records every
  completion, although Codex does not expose per-agent token or cost fields to that hook.

### 2d — Cursor
Cursor reads `AGENTS.md` at the project root as its primary instruction file, and (since
Cursor 2.4) auto-discovers `.cursor/agents/` and `.cursor/skills/`.
- Step 1 already mirrors the Claude agent and skill files into `.cursor/`; no conversion is
  needed. Invoke them with `/agent-name` and `/skill-name`.
- (Optional) Convert the most-used rules into `.cursor/rules/*.mdc` for auto-attachment —
  wrap each rule body with frontmatter `--- \n description: ... \n globs: ... \n alwaysApply: false \n ---`.
  This is optional; rules also work when referenced on demand from `ai-framework/rules/`.
- Cursor uses a **different hook schema** than Claude Code — skip Step 6 or adapt event
  names (`PostToolUse` → `afterFileEdit`, etc.) into `.cursor/hooks/hooks.json`.

### 2e — Other CLI agents
`AGENTS.md` at the project root is the contract — it indexes the pipeline, the agents, and the
rules so the model can follow them.
- Ensure `AGENTS.md` is at the project root (Step 1).
- The subagents in `.claude/agents/` become **role prompts**: when the pipeline calls for
  e.g. `security-reviewer`, open that file and adopt it as a system/role instruction for a
  focused pass. There's no automatic dispatch — you drive it by reading the relevant file.
- Skills in `.claude/skills/*/SKILL.md` are **playbooks**: read the matching `SKILL.md` when
  the human types (or you reach) that phase, and follow it.
- Select an available model using the capability profiles in `ai-framework/integrations/harnesses.md`.

---

## Step 3 — Scaffold the per-project data directory

Create `.project/` from `ai-framework/templates/project/`. Structure to create:

```
.project/
├── context/            ← product.md, architecture.md, stack.md   (filled in Step 4)
├── rules/              ← stack-specific rule companions, generated in Step 4/5 (only the ones your stack needs)
├── knowledge/          ← decisions/ patterns/ entities/ issues/ meta/ + templates/
├── design/             ← decisions/ plans/ wireframes/
├── requirements/       ← features/ bugs/
├── pitches/            ← _templates/ (hill, pitch, plan) + _followups.md + _parked/ + _archive/
├── runs/               ← session + phase history
└── status.md           ← ≤100-line index (from template)
```

Steps:
1. Copy the tree from `ai-framework/templates/project/` into `.project/`.
2. Seed an empty backlog: create `.project/pitches/_followups.md` with a single `# Followups` heading.
3. Create empty `.project/pitches/_parked/` and `.project/pitches/_archive/` dirs (add `.gitkeep` if your VCS needs it).
4. **Initialize the knowledge graph:** run `node ai-framework/scripts/graphify.js` from the project
   root. It scans `.project/knowledge/{decisions,patterns,entities,issues}/`, and writes
   `.project/knowledge/graph.json` (machine-readable — nodes, edges, tag index) and
   `.project/knowledge/index.md` (human-readable catalog). At this point the scaffold is empty, so
   this just produces the initial empty graph — the point is that it exists and every later phase
   that writes a knowledge entry can rebuild it the same way, so the graph never drifts from the
   entries on disk. See `ai-framework/scripts/graphify.js`'s header comment for how it works.

**Gate:** show the tree you'll create, then wait for approval. Step 4 (graphify) only writes
derived/generated files inside the just-approved `.project/knowledge/`, so it runs immediately
after approval, not behind a second gate.

---

## Step 4 — Generate project context + entry file

The workflow needs three context docs and a root entry file, all derived from the *actual*
project — never guessed.

**If the active installer is Claude Code:** run `/setup` — the skill scans the repo and drafts `AGENTS.md`
project specifics, the full `CLAUDE.md` mirror (required — see below), and
`.project/context/{product,architecture,stack}.md`, then gates for approval.

**If the active installer is OpenCode, Cursor, Codex, or another harness:** do the scan manually, following
`.claude/skills/setup/SKILL.md`. Concretely:
1. Read `package.json` / lockfile / framework configs / `.env.example` (**never** read `.env`,
   `.env.local`, or any secret-bearing file).
2. Draft `.project/context/product.md` (what it is, features, users), `architecture.md`
   (services, routing, data flow, auth, deploy), and `stack.md` (deps, scripts, env vars, aliases).
3. Draft the root entry file:
    - All harnesses → `AGENTS.md` (extend the one placed in Step 1 with project specifics)
    - `CLAUDE.md` → **required**, not optional, whichever tool runs setup. Replace the Step-1
      bootstrap with a full, self-contained mirror of `AGENTS.md`'s content (pipeline table,
      subagent index, rules index, confirmation-gate rule, this project's specifics) — not just a
      pointer. Claude Code auto-loads this file every session, so it is the workflow's primary
      chance to "use itself well": everything a session needs for phase 1 of any task should be
      readable from this one file without a hop to `AGENTS.md`.
   Both files point at `ai-framework/workflow/overview.md`, `ai-framework/rules/`, and
   `.project/`, and restate the confirmation-gate rule.

**Gate:** present all drafts; write only on approval.

---

## Step 5 — Generate stack-specific rules (and agents, if needed)

`ai-framework/rules/` ships with 15 rules, all stack-agnostic on purpose — universal principles
with placeholders (`<backend-workspace>`, `<ext>`, `<build-command>`, etc.) instead of a named
framework or vendor. Nothing here needs replacing; instead, `/setup` **generates the concrete
companion** for each placeholder-bearing rule that your detected stack actually uses, and writes
it to `.project/rules/`. This is the same scan from Step 4 — reuse its findings.

Based on what Step 4's scan detected, draft into `.project/rules/` only the files that apply:

- **A coding-standards companion (fills in `coding-standards.md`'s placeholders — import order,
  file naming, error-handling helper name, code-organization size limits) — always applies,
  every project needs it.** Before drafting, check if `.project/rules/coding-standards.md`
  already exists:
    - **Already set up** → reuse it as-is. Don't regenerate or overwrite it outside the normal
      re-run flow (Refresh all / Merge / Selective) in Step 0 of this doc — re-running `/setup`
      later is how it gets refreshed, not a second silent draft now.
    - **Not set up yet** → verify the project's actual dependencies and config before drafting
      anything: the linter/formatter config (ESLint/oxlint/Biome/etc. — real enabled rules, not
      assumed defaults), `tsconfig`'s actual strictness flags, the real path aliases, and any
      existing project rules doc (`.claude/rules.md`, a `CONVENTIONS.md`, etc. — see the
      README/conventions check below, which applies here first). Only fall back to inferring
      from bare dependency presence (e.g. "zod is installed → use it for schema validation")
      when nothing is documented and no config makes it unambiguous — and say so in the summary
      rather than presenting an inference as a discovered fact.
- A frontend-framework companion (fills in `component-architecture.md`'s placeholders with your
  actual framework's conventions) — skip if there's no frontend.
- A styling companion, if a styling system was detected (Tailwind, CSS modules, styled-components, etc.).
- A backend companion (fills in `boundaries.md` / `ci-deployment.md`'s backend placeholders with
  your actual backend/ORM's auth-guard, validator, and schema-migration conventions) — skip if
  there's no backend.
- A mobile companion, only if a mobile target (Expo/React Native or similar) was detected. If the
  project also needs a mobile-focused coding *agent*, draft one into `.claude/agents/` (mirrored
  into `.opencode/agents/` and `.codex/agents/*.toml` per the existing thin-shim pattern) — this
  bundle does not ship one by default since it only applies to a subset of projects.
- An AI-structured-output companion, only if the project makes LLM calls with structured/schema'd output.

**README/conventions check:** read the project's `README.md`, `CONTRIBUTING.md`, and any
existing project-local rules doc (`.claude/rules.md`, `CONVENTIONS.md`, a `docs/style-guide.md`,
etc. — check for one before assuming there isn't one) for documented coding conventions. If real
conventions are documented, fold them into the relevant `.project/rules/` file instead of
inventing anything — this is the primary source for the coding-standards companion above.
**If none are documented, do not invent conventions** — add an entry to
`.project/pitches/_followups.md` asking the human to define baseline conventions (naming,
formatting, testing philosophy, commit style), and note the gap in the setup summary.

**Gate:** present the list of `.project/rules/` files (and any agent) you propose to generate,
with a one-line rationale each, before writing.

---

## Step 6 — Verify lifecycle hooks

Claude Code's `.claude/settings.json` ships with the token-consumption hooks enabled. Merge it
with an existing settings file; never overwrite `settings.local.json`. The collector writes only
three regenerated, Git-ignored local files under `.project/metrics/`:

- `token-consumption.json` — bounded machine-readable snapshot with current, previous, and
  lifetime aggregates.
- `token-consumption.md` — readable comparison and totals.
- `token-consumption.html` — standalone visual dashboard.

The remaining hooks are opt-in. `ai-framework/hooks/hooks.json` is a **wiring template** (not
auto-loaded) — copy the entries you want into `.claude/settings.json`:

- `.claude/hooks/post-edit-check.js` — deterministic PostToolUse gate, stack-agnostic on
  purpose (secrets, `console.log`, oversized files, TODO/FIXME, TS syntax if `typescript` is
  installed). It does not check framework-specific conventions (client/server component
  boundaries, a specific backend's validator API, import-alias rules) — add a project-specific
  hook for those if your stack needs them.
- `ai-framework/hooks/scripts/stuck-uphill-detector.js` — SessionStart hook that warns when a
  pitch scope sits at the same uphill position across 3+ sessions (rabbit-hole detector).
- `ai-framework/hooks/scripts/pre-ship-verify.js` — **not** an event hook; it's a build-gate
  script the `/ship` phase runs. Leave it in place; the ship playbook invokes it.

Minimal merge for the post-edit and hill-chart hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "node .claude/hooks/post-edit-check.js" } ] }
    ],
    "SessionStart": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "node ai-framework/hooks/scripts/stuck-uphill-detector.js" } ] }
    ]
  }
}
```

The hooks have zero external dependencies (post-edit-check optionally uses the project's local
`typescript` if present) and never block an agent on collector parse or write errors. OpenCode's
plugin enables automatically after restart. Codex requires hook trust through `/hooks`. Cursor has
no verified completion-hook payload, so it is intentionally not wired.

---

## Step 7 — Verify

Confirm the install works end-to-end:

1. **Files present:** `ai-framework/`, `.claude/agents/` (18), `.claude/skills/` (pipeline
   skills), `.opencode/{opencode.json,commands/,agents/}`, `.codex/` + `.agents/`,
   `.cursor/{agents/,skills/}`, `.project/` scaffold, `AGENTS.md`, and the full `CLAUDE.md`
   mirror (not the Step-1 bootstrap stub — confirm it was replaced in Step 4).
2. **Each harness resolves its entry points:** Claude Code loads `/shape` from
   `.claude/skills/`; OpenCode loads `/shape` from `.opencode/commands/` and can dispatch its
   `.opencode/agents/`; Codex exposes the `shape` skill from `.agents/skills/` and its
   `.codex/agents/`; Cursor discovers the mirrored `.cursor/skills/` and `.cursor/agents/`.
   Verify directly in each harness that is available locally; otherwise report its files as
   installed but untested.
3. **Knowledge graph is live:** run `node ai-framework/scripts/graphify.js --check`. It must
   exit clean (status `CLEAN` or `OK WITH WARNINGS`, not `NEEDS ATTENTION`) and confirm
   `.project/knowledge/graph.json` and `.project/knowledge/index.md` exist — this is what lets
   `/shape`'s knowledge gate, `/search`, `/knowledge-health`, and `/cooldown` traverse prior
   knowledge instead of re-reading every file under `.project/knowledge/`.
4. **Dry run:** using the active harness, ask the human for a tiny first task and run `/shape` (or read the shape
   playbook) to confirm the pipeline flows: shape → plan → build → audit → ship.

Report a short punch list of what's wired vs. what the human still needs to decide (e.g. a
conventions follow-up queued in Step 5 because the README didn't document any).

---

## The pipeline (what you just installed)

```
(brainstorm) → /shape → /critique → bet → /plan → /build → /audit → /ship
                                                            every 5 ships → /cooldown
```

| Phase | Purpose | Recommended model |
|-------|---------|-------------------|
| `/shape` | Frame problem, appetite, rabbit holes, no-gos | deep |
| `/critique` | Pre-bet red-team (big-batch + AI scopes) | fast×3 + standard×2 |
| `/plan` | Decompose into independent scopes with checkable exits | deep (big) / standard (small) |
| `/build` | Execute scopes, hill-tracked, verification-before-done | standard |
| `/audit` | Parallel review/security/test/ux/i18n/eval fan-out | standard |
| `/ship` | Reconcile pitch↔impl, extract knowledge, compact status | fast |
| `/cooldown` | Promote issue→pattern→rule, prune, triage backlog | standard |

Select available models by profile; never use an unsupported provider/model identifier. Full routing:
`ai-framework/integrations/harnesses.md` and `ai-framework/rules/model-routing.md`. Full pipeline:
`ai-framework/workflow/overview.md`.

---

## Guardrails (apply during setup and after)

- **Never** read or copy secret-bearing files (`.env`, `.env.local`, `credentials.json`,
  `settings.local.json`).
- **Never** overwrite the human's existing files without showing a diff and getting approval.
- **Never** auto-advance a gated phase — always Approve / Revise / Back / Stop.
- Document only what you can verify from source; ask when uncertain.
