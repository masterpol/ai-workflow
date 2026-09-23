---
name: setup
description: Scan project and generate context docs (product, architecture, stack) plus cross-harness entry instructions. Use on first-time setup or after major project changes.
---

# /setup — Project Setup & Context Generation

> **Recommended capability profile:** `standard` — project-scan inference and stack-detection judgment. Select an available model using `ai-framework/integrations/harnesses.md`.

You are running the **SETUP** phase. This command scans the current project and generates (or updates) the framework's project-specific documents.

## Your Goal
Read the project's source files to understand what exists, generate the context documents and `AGENTS.md` project specifics, then present findings for confirmation before writing. `CLAUDE.md` is **required**, not optional: Claude Code auto-loads it every session, so it must end this phase as a full, self-contained mirror of `AGENTS.md` (not the bootstrap stub the bundle ships in Step 1 of `SETUP.md`, and not a bare pointer) — that is what lets the workflow make the best use of itself.

## Update Status (Before Starting)

`.project/status.md` is the pitch index (format in `ai-framework/workflow/overview.md`). **Never overwrite an existing one** — on a re-run it holds active and parked pitches. If it does not exist yet, create it from `ai-framework/templates/project/status.md` during Step 5. Setup progress is reported in the conversation, not written into `status.md`.

## Step 0: Detect Existing Setup

First, check if context documents already exist:
- Check for `.project/context/product.md`
- Check for `.project/context/architecture.md`
- Check for `.project/context/stack.md`
- Check for `AGENTS.md` and `CLAUDE.md` in project root
- If `.project/` doesn't exist **at all**, this is a first-time run reached via the `CLAUDE.md`
  bootstrap (or a human explicitly asking for setup) — skip straight to Step 1, there is nothing
  to detect yet.
- If `CLAUDE.md` exists, check whether it's still the bootstrap stub (contains "Bootstrap file
  shipped by `ai-workflow-portable/`") or already a full mirror. A bootstrap-stub `CLAUDE.md`
  with `.project/` already present means a previous setup run was interrupted before Step 4
  finished — treat it as needing regeneration regardless of what the user picks below.

### If files exist (re-run mode):

Present this to the user:

```
Existing context documents detected:
- [✓/✗] .project/context/product.md
- [✓/✗] .project/context/architecture.md
- [✓/✗] .project/context/stack.md
- [✓/✗] AGENTS.md project specifics
- [✓/✗] CLAUDE.md full mirror (⚠️ still the bootstrap stub — needs regenerating, if applicable)

How would you like to proceed?
1. 🔄 Refresh all — re-scan and overwrite everything
2. 🔀 Merge — re-scan and show diff, keep manual edits where possible
3. 📋 Selective — choose which files to regenerate
4. ✕ Cancel — keep everything as-is
```

**Wait for user choice before proceeding.**

- **Refresh all**: Re-scan and overwrite (same as first-time setup)
- **Merge**: Re-scan, then for each file show what changed since last generation. Present side-by-side: current content vs new scan results. Let the user pick per-section what to keep.
- **Selective**: Let the user pick which files to regenerate. Skip the rest.
- **Cancel**: Do nothing.

### If no files exist (first-time mode):
Proceed directly to Step 1.

## Step 1: Scan Project Structure

Explore the project to build a complete picture:

**Package & Config** (adapt to what exists)
- Read `package.json` — name, dependencies, scripts
- Read `tsconfig.json` — compiler options, path aliases
- Look for framework config: `next.config.*`, `nuxt.config.*`, `vite.config.*`, `angular.json`, etc.
- Look for styling config: `tailwind.config.*`, `postcss.config.*`, etc.
- Look for test config: `vitest.config.*`, `jest.config.*`, `.mocharc.*`, etc.
- Look for deployment config: `vercel.json`, `netlify.toml`, `Dockerfile`, etc.
- Read `.env.example` or `.env.template` — extract required env vars (**never** read `.env.local`, `.env`, or any file that may contain secrets)
- Look for component library config: `components.json` (shadcn), etc.

**Routing & Pages** (adapt to framework)
- Glob for page/route files based on detected framework
- Look for middleware, routing config, i18n config

**Backend** (detect what's used)
- Look for: `convex/`, `prisma/`, `drizzle/`, `supabase/`, API routes, `server/`, etc.
- Read schema files if found
- List backend functions/endpoints

**Components & Code**
- Glob for component files (`.tsx`, `.vue`, `.svelte`, etc.)
- Glob for hooks/composables
- Glob for utility/helper files

**i18n** (if applicable)
- Look for translation files, locale config

**Testing** (if applicable)
- Glob for test files
- Note test runner and patterns

## Step 2: Generate Documents

Draft these documents based on scan results:

### `.project/context/product.md`
- Product name and purpose (inferred from README, pages, package.json)
- Key features (based on routes, components, backend functions)
- Target users (inferred from auth setup, content)
- Brand identity (from theme config)

### `.project/context/architecture.md`
- System overview diagram (based on detected services)
- Routing structure
- Data flow (based on backend and state management)
- Auth approach (if detected)
- Deployment setup

### `.project/context/stack.md`
- All dependencies categorized with versions
- Available scripts
- Environment variables (from `.env.example`)
- Path aliases
- Key commands

### `AGENTS.md` project specifics (project root)
Extend the existing cross-harness entry file with:
- Project name and description (from scan)
- Framework location pointer
- Critical priorities (inferred from stack — e.g., TypeScript strict if tsconfig says so)
- Quick reference table
- Workflow commands table
- Confirmation gate rule (always included)
- Project essentials (package manager, locale, deployment, etc.)

### `CLAUDE.md` (required project root mirror)
Replace the bootstrap stub (or bare pointer, if one exists from an older run) with a full,
self-contained mirror: the pipeline table, subagent index, rules index, harness/model routing
pointer, the confirmation-gate rule, guardrails, and this project's specifics from the scan —
everything `AGENTS.md` has, restated so Claude Code never needs a hop to `AGENTS.md` for phase-1
context. Keep the two in sync; if a future edit changes one, note in the summary that the other
needs the same update.

## Step 2b: Generate Stack-Specific Rules (and an Agent, if needed)

`ai-framework/rules/` ships stack-agnostic — universal principles with placeholders
(`<backend-workspace>`, `<ext>`, `<build-command>`, etc.) instead of a named framework or
vendor. This is the step that fills those placeholders in with what Step 1 actually found, and
writes the result to `.project/rules/` — nothing in `ai-framework/rules/` itself is edited.

Only generate the files your scan actually supports evidence for. Do not generate a file "just
in case" — an absent file is a correct signal that this project doesn't need one.

- **`coding-standards.md`** — always applies, every project needs it. **First check if
  `.project/rules/coding-standards.md` already exists**: if it does, reuse it as-is — this
  step only drafts a *new* one, it never silently overwrites an existing companion (a refresh
  goes through Step 0's Refresh all / Merge / Selective choice instead). If it doesn't exist
  yet, verify before drafting: the actual linter/formatter config (real enabled rules, not
  assumed defaults — e.g. read `.oxlintrc.json`/`.eslintrc*`/`biome.json`, whichever exists),
  `tsconfig`'s real strictness flags, the real path aliases, and any existing project rules doc
  (see the README/conventions check below — check for one there first). Fill in
  `coding-standards.md`'s placeholders (import order groups, file naming, the error-helper name,
  code-organization size limits) with what you verified. Only infer from bare dependency
  presence (e.g. "zod is installed → likely the validation library") when nothing is documented
  and no config resolves it unambiguously — and label it as an inference in the summary, not a
  discovered fact.
- **`frontend-framework.md`** — if a frontend framework was detected (Step 1's routing/component
  scan). Fill in `component-architecture.md`'s placeholders with this project's actual
  conventions: component file layout, the real size limit if `coding-standards.md` was
  overridden locally, the project's actual state-management approach.
- **`styling.md`** — if a styling system config was detected (`tailwind.config.*`, CSS modules,
  styled-components, etc.). Concrete breakpoints, spacing scale, and the project's real
  component-library name (referenced generically as "your component library" in
  `ui-ux-review.md` and `.claude/agents/ux-reviewer.md`).
- **`backend.md`** — if a backend/ORM was detected (Step 1's backend scan: `convex/`, `prisma/`,
  `drizzle/`, `supabase/`, API routes, `server/`, etc.). Fill in `boundaries.md` and
  `ci-deployment.md`'s backend placeholders with the real auth-guard pattern, validator API, and
  schema-migration convention for what was actually found.
- **`mobile.md`** — only if a mobile target (Expo/React Native or similar) was detected. If the
  project's mobile surface is large enough to warrant a dedicated coding subagent, also draft
  `.claude/agents/mobile-developer.md` (role prompt following the same structure as the other
  `.claude/agents/*.md` files) plus its thin pointer-shim mirrors in `.opencode/agents/` and
  `.codex/agents/*.toml`. This bundle does not ship that agent by default — it's generated only
  when the scan shows it's needed.
- **`ai-structured-output.md`** — only if the project calls an LLM with structured/schema'd
  output (an AI SDK dependency plus a schema/validator import near the call site).

**README/conventions check:** read `README.md`, `CONTRIBUTING.md`, and any existing
project-local rules doc (`.claude/rules.md`, `CONVENTIONS.md`, a style-guide under `docs/`,
etc. — check whether one exists before assuming it doesn't) for documented coding conventions —
naming, formatting, commit style, testing philosophy. If the project documents real
conventions, fold them into the relevant file above instead of inventing anything — this is the
primary source for `coding-standards.md`. **If nothing is documented, do not invent
conventions.** Instead:
- Add an entry to `.project/pitches/_followups.md` naming the gap (e.g. "No documented testing
  philosophy — ask [owner] to define one").
- Note the gap explicitly in the Step 3 summary below, rather than silently generating a rule
  file with assumed conventions.

## Step 3: Present Findings to User

Before writing any files, present a summary:

```
## Project Scan Results

### Product
- Name: [from package.json]
- Purpose: [inferred]
- Key Features: [list]

### Architecture
- Framework: [name + version]
- Backend: [type + version]
- Routes: [count] pages
- Data Model: [tables/models found]
- Components: [count] total

### Stack
- Dependencies: [count] production, [count] dev
- Key Libraries: [top 10]
- Package Manager: [detected]
- Test Runner: [detected]

### Files to Generate
1. AGENTS.md project specifics (project root)
2. CLAUDE.md full mirror (project root, required)
3. .project/context/product.md
4. .project/context/architecture.md
5. .project/context/stack.md
6. .project/knowledge/graph.json + index.md (built by `graphify.js` after writes — Step 5b)

### Stack-Specific Rules (.project/rules/)
- [list each file this scan supports, e.g. "frontend-framework.md — React + Vite conventions"]
- [if a mobile target was detected and warrants a dedicated subagent: "agents/mobile-developer.md — plus .opencode/.codex shim mirrors"]
- [if no file applies for a category, omit it rather than listing "none"]

### Conventions Check
- [if README/CONTRIBUTING documented real conventions: "Folded into [file] from README.md"]
- [if nothing was documented: "⚠️ No documented conventions found for [area] — queued a follow-up in .project/pitches/_followups.md asking [owner] to define one"]

Options:
1. ✓ Approve — write all files
2. ↻ Revise — tell me what to adjust
3. 📋 Selective — choose which files to write
4. ✕ Cancel — don't write anything
```

## Step 4: Wait for Confirmation

**Do NOT write any files until the user explicitly approves.**

The user can:
- **Approve** → write all documents
- **Revise** → adjust the draft and present again (loop, no limit)
- **Selective** → pick which files to write
- **Cancel** → abort, nothing written

## Step 5: Write Documents

Only after user approval, write the approved files — including the context docs, `AGENTS.md`/`CLAUDE.md`, and any approved `.project/rules/*.md` companions or `.claude/agents/mobile-developer.md` (with its `.opencode`/`.codex` shim mirrors) from Step 2b. If a conventions gap was flagged, write the corresponding entry to `.project/pitches/_followups.md`.

## Step 5b: Build the Knowledge Graph

Run `node ai-framework/scripts/graphify.js` from the project root — no separate approval needed,
it only writes derived files inside the `.project/knowledge/` just approved in Step 5. It scans
`.project/knowledge/{decisions,patterns,entities,issues}/` and regenerates:
- `.project/knowledge/graph.json` — machine-readable nodes/edges/tag-index for other phases and
  skills to traverse (`/shape`'s knowledge gate, `/search`, `/knowledge-health`, `/cooldown`).
- `.project/knowledge/index.md` — the human-readable catalog.

On a first-time setup this just produces the initial empty graph (nothing has been written to
`knowledge/` yet) — that's expected. On a re-run with existing entries, report its output:
entry counts, and any `broken link` / `orphan` / `duplicate id` problems it flags. Duplicate ids
are an error (exit code 1); surface those to the user before finishing. If the script reports
problems that require editing an existing entry, note them in the Step 6 summary rather than
silently fixing content the user hasn't approved changing.

## Step 6: Final Confirmation

```
Setup complete! Generated files:
- [list of files written]

Knowledge graph: [N] entries, [N] links — .project/knowledge/graph.json + index.md
[if graphify reported problems: "⚠️ [N] issue(s) flagged — see graphify output above"]

You can re-run /setup anytime to refresh these docs after major changes.
Review the files and let me know if anything needs adjusting.
```

## Important Rules
- **Never read `.env.local`**, `.env`, or any file likely containing secrets
- **Never guess** — only document what you can verify from source files
- **Ask when uncertain** — if something is ambiguous, ask the user
- **Adapt to any stack** — don't assume a specific framework or backend. Detect what's actually there
- **Preserve manual edits** — in merge mode, highlight what the user added vs what was auto-generated
