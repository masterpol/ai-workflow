# Architectural Boundaries

## Purpose

Prevent architectural drift by keeping a clear, enforced dependency direction between the
layers of your codebase.

**This file ships without a concrete layer map on purpose.** The right boundaries depend on your
actual project shape (single app, monorepo with web+mobile, monorepo with a shared backend
package, etc.). Run `/setup` to detect your project's actual workspace layout and generate a
concrete version of this file with real paths — or fill in the template below yourself.

## Template: Layer Map

Replace this with your project's real top-level layout:

```text
<app-a>/                  # e.g. web app — routes, UI, app-local logic
<app-b>/                  # e.g. mobile app, admin app, worker — if you have more than one
<shared-packages>/        # Platform-safe shared code only (no UI framework imports)
<backend>/                # Shared backend: API routes, database access, server logic
```

## Dependency Rule

Dependencies flow inward, never sideways:

- Each app (`<app-a>`, `<app-b>`, ...) may depend on `<shared-packages>/` and generated backend
  types.
- `<backend>/` may depend on `<shared-packages>/` only when the shared code is framework-free.
- `<shared-packages>/` must never import from an app.
- Sibling apps must never import each other directly.

## Responsibilities

### App-local code (routes, screens, UI)
- Owns routing, layout composition, and thin request/response wiring
- No heavy business logic — delegate to app-local `lib`/domain modules
- May import from its own app's modules and from shared packages
- Must not import from a sibling app

### Shared packages
- Contracts, validation schemas, pure transforms, and framework-agnostic orchestrators only
- No JSX, no UI-framework imports, no app-local imports
- A module belongs here only if it has zero platform branching and zero UI rendering

### Backend
- Queries, mutations/handlers, auth helpers, schema, generated artifacts
- No UI-framework imports
- May import only platform-safe code from shared packages

## Shared Package Admission Rule

Code may move into a shared package only if all of these are true:

- No UI-framework, browser-only, or native-device APIs
- No JSX
- No app-provider/context hooks
- No imports from any app-local directory
- The module is a contract, validation schema, pure transform, formatting helper, or
  framework-agnostic orchestrator

If a module needs platform branching or UI rendering, keep it app-local.

### Shared-Domain Subpath Exports

When cross-platform logic is extracted into a shared package, export it via a named subpath, not
the root barrel:

```json
// packages/shared-domain/package.json
{
  "exports": {
    ".": "./src/index.ts",
    "./activities": "./src/activities/index.ts"
  }
}
```

Rules:
- Consumers import from the subpath: `import { resolveVariant } from "@your-scope/shared-domain/activities"`
- Do not re-export subpaths from the root barrel — keeps tree-shaking honest and intent explicit
- Define a minimal structural input interface instead of re-exporting full domain types (which
  may pull in backend-specific document types)
- If an app already has a local type alias, swap the definition for a re-export — no import sites
  change, one source of truth

Once you've applied this pattern for real, record it as a pattern in `.project/knowledge/patterns/`.

## Dependency Placement

Package-manager dependencies must be added to the **workspace that uses them**, not the monorepo
root.

```bash
# ✅ Correct: add to the consuming workspace
<pkg-manager> --filter <app-workspace> add <package>

# ❌ Wrong: add at root (silently works via hoisting but violates isolation)
<pkg-manager> add <package>
```

**Root `package.json`** should only contain:
- Workspace-wide dev tooling (CLIs, linters, formatters)
- Shared scripts that run across workspaces

**App-specific packages** (UI libraries, exporters, etc.) always go in the app's own
`package.json`.

## Refactor Triggers

- One app importing from another app directly
- Backend importing from an app-local directory
- JSX or UI hooks being moved into a shared package
- Duplicate pure logic appearing in more than one app

## Checklist

- [ ] Each app's changes stay within that app's own directory
- [ ] Shared code in shared packages is framework-free
- [ ] Backend imports no app-local code
- [ ] No direct cross-app imports
- [ ] New dependencies added to the correct workspace `package.json` (not root)
