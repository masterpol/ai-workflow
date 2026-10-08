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
  [Graphify](https://github.com/Graphify-Labs/graphify), run through [uv](https://docs.astral.sh/uv/),
  turns that plus your code and docs into one graph (`graphify-out/graph.json`) every phase can
  query with `node ai-framework/scripts/graphify.mts query "<question>"`. Install uv once, then run
  `node ai-framework/scripts/graphify.mts setup` — see
  [Knowledge Graph](ai-framework/docs/knowledge-graph.md).
- **One entry file per vendor, self-triggering.** `CLAUDE.md` (Claude Code) and `AGENTS.md`
  (OpenCode/Codex/Cursor) are what each tool auto-reads at session start. Both carry first-run
  detection: if `.project/` doesn't exist, the tool reads `SETUP.md` and installs itself — see
  [Set up](ai-framework/docs/setup.md).
- **Generated and canonical data stay separate.** `.project/` is a scaffold for both generated
  context/rule companions and canonical project records such as pitches, designs, and knowledge
  entries. Only generated outputs — project specifics, `.project/rules/*`, and
   `graphify-out/graph.json` + `index.md` — should be regenerated instead of hand-edited.
- **Consumption is compact and local.** A post-agent collector keeps current and previous usage,
  lifetime totals, and a small idempotency window in one JSON snapshot, plus regenerated Markdown
  and HTML views. It never retains prompts, responses, or transcripts.

## Set up

1. **Copy** the contents of this folder to the root of your target project.
2. **Open the project** with your AI tool (Claude Code / OpenCode / Codex / Cursor).

That's it — each supported tool detects that `.project/` is missing and self-triggers `SETUP.md`.
If yours doesn't, ask it to *"read `SETUP.md` and set up the workflow."* What setup does, OpenCode
model setup and verification: [Set up](ai-framework/docs/setup.md).

## Choose the script runtime

Scripts use Node by default. Use [.env.example](.env.example) as a template for a new project-root `.env`.
To use Bun, add or update this setting in `.env`:

```dotenv
AI_WORKFLOW_RUNNER=bun
```

Process environment variables override `.env`. Bun must be installed and available on `PATH`.
Orca multi-agent dispatch is off unless `AI_WORKFLOW_ORCA_MULTI_AGENT=true` (see
[Orca vendors](ai-framework/integrations/orca-vendors.md)); any other value keeps the normal workflow.
Run scripts directly as `node ai-framework/scripts/<name>.mts` on Node 22.18 or later, or
`bun ai-framework/scripts/<name>.mts`. Node 22.12–22.17 requires
`--experimental-strip-types --disable-warning=ExperimentalWarning` before the script path;
the shipped hooks include these flags. A Node launch with `AI_WORKFLOW_RUNNER=bun` starts Bun
for the same TypeScript entry. See [Runtime details](ai-framework/scripts/runtime/README.md)
and [upgrading existing installs](ai-framework/docs/versioning-and-sync.md).

## Documentation

| Topic | What it covers |
|---|---|
| [Set up](ai-framework/docs/setup.md) | Install, what setup does, OpenCode model setup |
| [Token Consumption](ai-framework/docs/token-consumption.md) | Local usage metrics and their views |
| [Workflow Doctor](ai-framework/docs/workflow-doctor.md) | Diagnose and safely repair an installed workflow |
| [Setup Validator](ai-framework/docs/setup-validator.md) | Verify generated context, entry files and mirrors |
| [Knowledge Graph](ai-framework/docs/knowledge-graph.md) | Graphify (uv) project graph: code, docs, decisions, patterns, issues |
| [Version Log & Bundle Sync](ai-framework/docs/versioning-and-sync.md) | Changelog and updating an installed project |
| [What you get](ai-framework/docs/what-you-get.md) | Inventory of the bundle |
| [One source, every vendor](ai-framework/docs/vendors.md) | Canonical sources and per-vendor adapters |
| [The pipeline](ai-framework/docs/pipeline.md) | Phases, gates and the core skills |
| [How to improve this flow](ai-framework/docs/extending.md) | When and how to extend the workflow |
| [Design notes](ai-framework/docs/design-notes.md) | Rationale and safety notes |
