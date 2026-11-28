# Set up

← [Back to README](../../README.md)

- **Folder-in-project.** Put the `ai-workflow-portable` folder directly inside your project. Open the
  project in your AI tool and ask it to “read `ai-workflow-portable/SETUP.md` and set up the workflow.”
  Setup runs the check from the source folder before copying files. It can tell a new project from an
  existing one.
- **Copy-to-root.** Copy this bundle's contents to your project root and open the project in your AI tool.
  The root entry file starts setup when `.project/` is missing. The check sees the bundle's own root
  files, reports `unclear` and asks whether the project is new or existing. If setup does not start,
  ask the tool to “read `SETUP.md` and set up the workflow.”

**OpenCode model setup:** connect OpenCode Go before starting a routed workflow — every bundled
OpenCode route uses it: `opencode-go/minimax-m3.1-flash` for short fast work, `opencode-go/minimax-m3`
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
   plus the project-specifics section of `AGENTS.md` and the full `CLAUDE.md` mirror. It **replaces** the copied
   "Project specifics" section, which describes this bundle, and keeps the workflow sections around it.
5. Drafts stack-specific rule companions into `.project/rules/` — only for what the scan found
   evidence of (frontend framework, styling system, backend/ORM, mobile target, AI structured
   output). Folds in real conventions from your `README.md`/`CONTRIBUTING.md`; if none are
   documented, queues a follow-up instead of inventing any.
6. **Gates generated project content** — shows the planned framework, scaffold, context, and rule
   writes, then waits for Approve / Revise / Selective / Cancel. The setup status marker may be
   updated before a gate so an interrupted setup can be resumed.
7. Verifies the install end-to-end (see below) and reports a punch list of what's wired vs. what
   you still need to decide. The [setup validator](setup-validator.md) fails an install whose entry files still
   carry the bundle's own project specifics.

**Project state.** A first-time run first checks the project with `project-state.mts`, which reports one of four states:

- `existing`: the project has application, manifest, infrastructure, notebook, SQL or document files. Setup runs as it always has.
- `empty`: a completed scan found only the bundle and its scaffold. The project kickoff is not available yet, so setup continues and writes `open` for every field it cannot scan.
- `unclear`: the project has only starter files, or the scan could not judge it. A symlink, an unreadable file, a scan over budget or an unknown file in a harness folder can trigger this state. Setup asks you to choose new or existing project and records the choice in `.project/status.md`.
- `resume`: a saved kickoff draft exists. Setup leaves it as it is.

Re-runs skip the check. Refresh all, Merge and Selective never rewrite `.project/context/definition.md`.

---

See also: [token-consumption](token-consumption.md) · [workflow-doctor](workflow-doctor.md) · [setup-validator](setup-validator.md) · [knowledge-graph](knowledge-graph.md)
