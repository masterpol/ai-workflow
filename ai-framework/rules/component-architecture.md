# Component Architecture Patterns

**This file ships stack-agnostic on purpose.** The patterns below apply to whatever
component/module system your project uses (a component tree, a widget hierarchy, a set of
composable functions — whatever your framework calls its building blocks). Concrete paths,
naming conventions, and framework-specific extension mechanisms belong in a project-specific
version of this file. Run `/setup` to detect your stack and generate one, or record real
examples yourself under `.project/knowledge/patterns/` as you build them.

## The Core Principle: Build for Reuse from Day One

Every component should be designed as if it will be reused — because it probably will. This
doesn't mean over-engineering; it means writing focused, composable pieces that can be
assembled into larger features.

## Mobile-First Design Principle

**Design for the smallest supported screen first, then enhance for larger screens/viewports.**

Most projects serve users across a range of screen sizes, including small viewports (phones,
narrow windows, low-resolution displays). Every component must:

- Render correctly at your project's minimum supported viewport width
- Use mobile-first (min-width) breakpoints in your styling system — avoid hacking desktop
  styles down onto mobile with max-width overrides
- Meet minimum touch-target sizing for interactive elements (commonly ~44×44px)
- Default responsive state to the mobile/narrow value first, so server-rendered or
  initial-render output doesn't mismatch the client on small screens

See your project's generated styling rule (if `/setup` created one) for concrete breakpoint
conventions, or `.project/knowledge/` for patterns already established in this codebase.

## Component Size Rules

### The Hard Line-Count Limit

**A component/module file must not exceed your project's line-count limit for logic + markup
(150 lines is a reasonable default). This is a hard limit, not a guideline.**

When a file approaches this limit, stop and split before adding more code. The split is almost
always obvious in hindsight:
- Data fetching → extract a custom hook/composable (`use-<feature>-data.*`)
- Complex state/event logic → extract a custom hook/composable (`use-<feature>-setup.*`)
- A repeated UI block → extract a sub-component
- Inline UI that has its own state → extract a component

> **Why hard?** Large components are harder to read on small screens, harder to review in PRs,
> harder to test in isolation, and break faster when requirements change. "I'll split it later"
> never happens. Split it now.

**Signs you've exceeded the spirit of this rule even under the limit:**
- You're scrolling to find a specific piece of logic
- A `// ── Section ─────` comment is hiding complexity
- You have more than a handful of local state/ref/effect declarations in one file

### The same limit applies to non-component modules

The line-count limit also covers library/utility modules and backend handler files. Common
splits:
- A large handler or route → extract validation, the core operation, and the response shaping
  into separate helper files
- A large data-access function → extract the access-check + read into a helper; the public
  function stays a thin wrapper
- A large stateful integration (e.g. a rich-text or drag-and-drop extension for a specific
  library) → split into `<name>-types.*` (types/constants), `<name>-behavior.*`
  (the integration/commands), and `<name>-transform.*` (pure transform logic, testable in
  isolation)

Once you have a real split that landed well in your codebase, record the before/after file
names and sizes in `.project/knowledge/patterns/` so future sessions can reuse the shape.

### Enforcement during `/build`

Before a scope is marked `done`, check the line count on every file you wrote or grew
significantly. Any file over the limit must be split as part of the same scope, not deferred.
Do **not** wait for the user to request a refactor — splitting after the fact costs more tokens
AND the original author has lost context that would have made the split obvious during the
first pass.

If a split would change the public surface (re-exports, import paths from other files), include
those import-path updates in the same diff so the working tree stays green.

### The 3-Responsibility Rule
A component should do at most one of these heavily:
1. Fetch / manage data (container / hook)
2. Handle complex user interaction logic (hook)
3. Render UI (presentation component)

If it's doing all 3 at scale, split into layers. See Component Layers below.

## Component Layers

Structure features into 3 layers. Not every feature needs all 3, but know where each concern
lives.

### Layer 1: Data Components (Containers)
Fetch data, manage mutations, handle auth checks. Pass data down.

```pseudocode
component SchoolListContainer:
  schools = fetchQuery(listSchools)
  deleteSchool = mutation(removeSchool)

  if schools is loading: return SchoolListSkeleton()
  if schools is empty: return EmptyState(message: "No schools yet", action: CreateSchoolButton())

  return SchoolList(schools, onDelete: deleteSchool)
```

### Layer 2: Presentation Components (Pure UI)
Receive data via props/inputs. No hooks, no direct data fetching. Easy to test, easy to reuse.

```pseudocode
component SchoolList(schools, onDelete?):
  return list of SchoolCard(school, onDelete) for each school in schools
```

### Layer 3: Primitive Components (Atoms)
Small, single-purpose UI elements, usually thin wrappers around your design-system primitives
with domain-specific content.

```pseudocode
component SchoolCard(school, onDelete?):
  return Card(
    title: school.name,
    badge: school.status,
    footer: onDelete ? DeleteButton(onConfirm: () => onDelete(school.id)) : null
  )
```

## When to Extract

### Extract a component when:
- The same UI pattern appears in 2+ places
- A section of UI has its own loading/error states
- A piece of UI has its own event handlers or local state
- You need to test a piece of logic in isolation
- The parent component exceeds the line-count guideline

### Extract a hook/composable when:
- The same data-fetching + transformation pattern appears in 2+ components
- A component has complex state logic (multiple pieces of local state and effects working
  together)
- You want to test state logic without rendering UI
- A mutation/action needs the same error handling in multiple places

### Extract a utility when:
- Pure data transformation (no framework, no side effects)
- String formatting, date formatting, slug generation, validation helpers
- Shared across both frontend and backend

## Folder Structure by Feature

Adapt the shape below to your project's actual layout (single app, monorepo, etc.) — the
principle is what matters, not the literal folder names.

```text
<web-workspace>/components/
├── ui/                              # Design-system primitives — DO NOT MODIFY directly
│   ├── button.*
│   ├── card.*
│   └── ...
├── shared/                          # Shared across features
│   ├── empty-state.*                # Generic empty state
│   ├── confirm-dialog.*             # Reusable confirmation modal
│   ├── data-table.*                 # Generic data table wrapper
│   ├── loading-skeleton.*           # Common skeleton patterns
│   └── page-header.*                # Page title + description + actions
├── layout/                          # App-level layout
│   ├── dashboard-sidebar.*
│   ├── dashboard-topbar.*
│   └── role-gate.*
├── features/                        # Feature-specific (domain)
│   ├── schools/
│   │   ├── school-card.*            # Presentation
│   │   ├── school-list.*            # Presentation
│   │   ├── school-list-container.*  # Data container
│   │   ├── create-school-form.*     # Form with mutation
│   │   └── school-settings.*        # Settings panel
│   ├── members/
│   │   ├── member-list.*
│   │   ├── member-list-container.*
│   │   ├── invite-form.*
│   │   └── member-role-badge.*
│   └── onboarding/
│       ├── role-selector.*
│       └── school-join.*
```

### Rules:
- `components/ui/` — design-system primitives only. Never modify directly.
- `components/shared/` — reusable across features. No domain-specific logic.
- `components/layout/` — app shell components, used in layouts.
- `components/features/<domain>/` — feature-specific. Can import from `shared/` and `ui/`,
  never from other features.

### Cross-feature dependency?
Move the shared piece to `components/shared/`. Never import directly between feature folders.

## Props Design

### Accept the minimum data needed
```pseudocode
// ✅ Good: only needs what it renders
SchoolCardProps { school }

// 🚫 Bad: takes the whole world
SchoolCardProps { school, currentUser, memberships, onDelete, onEdit, onInvite, isAdmin }
```

If a component needs too many props, it's doing too much. Split it.

### Use callback props for actions
```pseudocode
// ✅ Good: parent controls behavior
SchoolCardProps { school, onDelete?(id) }

// 🚫 Bad: component owns the mutation
SchoolCardProps { school }
// Inside: deleteSchool = mutation(removeSchool)  ← hard to reuse
```

Exception: container components at the top of a feature can own mutations directly.

### Make actions optional for reuse
```pseudocode
SchoolCard(school)                          // read-only
SchoolCard(school, onDelete: handleDelete)  // with actions
```

## Page Components (Routes)

Pages are thin. They compose feature containers, set metadata, and handle route params —
nothing more.

```pseudocode
page SchoolsPage:
  metadata: { title: "Schools" }

  return Page(
    header: PageHeader(title: "Schools", description: "Manage schools and organizations",
                        action: CreateSchoolButton()),
    body: SchoolListContainer()
  )
```

## Dual-Path Rendering Parity

When the same content is rendered through multiple paths (e.g. an editable view, a read-only
view, and an export/print view), **all paths must be updated together**. A change to one
renderer without updating the others creates visual drift bugs that are hard to detect.

**Checklist when modifying layout, styling, or block rendering:**
1. Update the **editable/interactive** renderer
2. Update the **read-only presentation** renderer
3. Update the **export** renderer (PDF, document, image generation, etc.) if applicable
4. Verify consistent output across all paths (font sizes, spacing, colors)

Once you've hit a drift bug from this class of issue, log it under `.project/knowledge/issues/`
(e.g. `dual-renderer-parity`, `<renderer>-css-specificity-mismatch`).

## Framework-Specific Extension Patterns (Rich Text, Drag-and-Drop, etc.)

Rich-text editors, drag-and-drop libraries, and similar systems have their own extension/plugin
architectures (registries, node/widget types, plugin state) that vary a lot between libraries
and have no generic equivalent worth prescribing here.

Once you build this kind of thing for real — a shared extension registry, a plugin-state-driven
overlay pattern for transient UI, or a rule about which extensions belong in a shared registry
vs. wired inline per host — record the concrete pattern under
`.project/knowledge/patterns/`, including the library involved, the failure mode it prevents,
and the canonical implementation file to reference. That written-down pattern is more useful to
future sessions than a generic paragraph could be.

## Tool Renderer Coverage

If your project has a pluggable "tool"/"action" system (e.g. tools an AI agent can call, plugins
a workflow can invoke), every registered tool **must have a corresponding UI renderer**. Missing
renderers cause raw/unstyled output to leak to users.

**When adding a new tool:**
1. Register the tool in the tool definitions
2. Add a rendering case for the tool's result type in your result-renderer component
3. Choose the appropriate renderer style:
   - **Context/retrieval tools** → minimal pill/badge (tool name + brief status)
   - **Output/generation tools** → full card with structured display

Log a `.project/knowledge/issues/` entry the first time a missing renderer ships, to catch the
class going forward.

## Tool Scoping by Intent Mode

Tools/actions exposed to an AI agent or a mode-based UI must follow the **principle of least
privilege** — only expose what's relevant to the current mode or intent. Including tools from
other modes causes the agent (or user) to reach for irrelevant actions.

- Content mode → content generation tools only
- Analysis mode → analysis/retrieval tools only
- Review each mode's tool list when adding new tools

Log a `.project/knowledge/issues/` entry if this class of bug shows up in your project.

## Forms Pattern

Use a consistent form pattern across the app: a schema-driven validation layer, a form-state
hook/composable, and a thin submit handler that calls the mutation and surfaces
success/error feedback.

```pseudocode
schema CreateSchoolSchema:
  name: string, min 2, "Name must be at least 2 characters"
  slug: string, min 2, pattern [a-z0-9-]+, "Only lowercase letters, numbers, and hyphens"
  description: optional string

component CreateSchoolForm(onSuccess?):
  createSchool = mutation(schools.create)
  form = useForm(schema: CreateSchoolSchema, defaults: { name: "", slug: "", description: "" })

  onSubmit(values):
    try:
      createSchool(values)
      toast.success("School created!")
      form.reset()
      onSuccess?()
    catch error:
      toast.error(error.message ?? "Failed to create school")

  return Form(form, onSubmit, fields: [...])
```

### Form rules:
- Validation schema defined at the top of the file (or in a shared validations module if
  reused across forms)
- Use your project's standard form-state library consistently across all forms
- Server-side/backend validators mirror the client schema — don't rely on client-side
  validation alone
- An `onSuccess` callback for post-submit behavior (close dialog, navigate, etc.)

---

## Mobile Action-Bar Collapse

**Rule: any action bar with 3 or more icon+label buttons MUST collapse to icon-only below your
project's small-screen breakpoint.**

Long labels overflow on narrow viewports. The pattern: render icon + label at full size,
icon-only when the container is narrow. Give feedback (e.g. a toast) on action success and
error regardless of which layout is showing.

Once you've implemented this, record the pattern and its canonical implementation file under
`.project/knowledge/patterns/mobile-action-bar-icon-collapse.md` so future sessions reuse it
instead of re-deriving it.
