# Set up

← [Back to README](../../README.md)

1. **Copy** the contents of this folder to the root of your target project.
2. **Open the project** with your AI tool (Claude Code / OpenCode / Codex / Cursor).

That's it — no need to separately ask it to run setup. Every supported tool auto-reads a root
file this bundle ships (`CLAUDE.md` for Claude Code, `AGENTS.md` for OpenCode/Codex/Cursor), and
each one detects `.project/` is missing and self-triggers `SETUP.md` on its own. If your tool
doesn't auto-read either file, just ask it to *"read `SETUP.md` and set up the workflow."*

**OpenCode model setup:** connect OpenCode Go before starting a routed workflow — every bundled
OpenCode route uses it: `opencode-go/space-bunny` for short fast work, `opencode-go/minimax-m3`
for standard work and `opencode-go/kimi-k2.7-code` for deep work. Run `opencode debug config` to
confirm that OpenCode resolves the configuration. For confidential work, switch the fast-route
adapters to the standard route (see `ai-framework/integrations/harnesses.md`).

What setup actually does (`SETUP.md`, driven by the `/setup` skill in Claude Code — other
harnesses follow the same doc manually):

1. Places the framework files and every harness adapter (merges instead of overwriting anything
   you already have; never touches `settings.local.json` or credentials).
2. Scaffolds `.project/` from `ai-framework/templates/project/` — context, rules, knowledge,
   design, requirements, pitches, runs, status.
3. Initializes the knowledge graph (`node ai-framework/scripts/graphify.mts` — empty at this
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

---

See also: [token-consumption](token-consumption.md) · [workflow-doctor](workflow-doctor.md) · [setup-validator](setup-validator.md) · [knowledge-graph](knowledge-graph.md)
