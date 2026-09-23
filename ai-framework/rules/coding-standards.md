# Coding Standards

## Tier markers (used throughout this file)

- ✅ **Always do** — mandatory, enforced. Failing this is a must-fix at /audit.
- ⚠️ **Ask first** — judgment call. Deviation is allowed but must be reasoned and logged in `deviations.md`.
- 🚫 **Never do** — hard prohibition. Auto-flagged by hooks; rejection at /audit.

## Import Order

**This file ships with a generic grouping convention on purpose.** The concrete category names
(and whether "framework imports" even applies to you) depend on your actual stack — a React SPA,
a backend-only Node service, and a Vue app all group imports differently. Run `/setup` to detect
your real stack and generate a concrete version of this section with the exact import order your
project should enforce (e.g. lint-rule-ready groups).

General principle — group imports from most-external to most-local, with a blank line between
groups:

1. **Framework/runtime imports** — the UI framework, meta-framework, or runtime your project is
   built on, if any (React, Vue, a server framework, etc.)
2. **Third-party libraries** — everything else from `node_modules`
3. **Internal imports (aliased)** — your own code, imported via a path alias (`@/`, `~/`, etc.)
4. **Relative imports** — same-feature or same-directory imports (`./`, `../`)
5. **Type-only imports** — kept in their own group, marked with `import type`

Illustrative example (e.g., a React project with a path-aliased `src/` — your real stack may
differ; `/setup` replaces this with your actual convention):

```typescript
// 1. Framework/runtime imports
import { useState } from "react"

// 2. Third-party libraries
import { z } from "zod"
import { ChevronDown } from "lucide-react"

// 3. Internal imports (aliased)
import { Button } from "@/components/ui/button"
import { useCmsContent } from "@/hooks/use-cms-content"

// 4. Relative imports
import { formatDate } from "./utils"

// 5. Type-only imports
import type { User } from "@/types/user"
```

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components (if your UI layer has them) | PascalCase | `UserProfile.tsx` |
| Utilities | kebab-case.ts | `format-date.ts` |
| Hooks/composables | use-kebab-case.ts | `use-cms-content.ts` |
| Tests | *.test.ts(x) | `utils.test.ts` |
| Backend functions/handlers | kebab-case.ts | `projects.ts` |

File extensions and exact casing depend on your language and framework — `/setup` fills in the
concrete conventions your stack actually uses.

## TypeScript Rules

### Strict Mode (enforced)
- **Never** use `any` — use `unknown` with type guards
- Always define explicit return types for exported functions
- Use `type` keyword for type-only imports: `import type { User } from "..."`
- Use `const` assertions where appropriate
- Prefer interfaces for object shapes, types for unions/intersections

### Good Patterns
```typescript
// Explicit props/params interface
interface UserCardProps {
  userId: string
  showEmail?: boolean
}

// Type-only import
import type { User } from "@/types/user"

// Unknown instead of any
function handleError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "An unexpected error occurred"
}
```

## Naming Conventions

### Variables & Functions: `camelCase`
```typescript
const isUserAuthenticated = checkAuth()
const filteredProjects = projects.filter(p => p.status === "published")
```

### Constants: `UPPER_SNAKE_CASE`
```typescript
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const API_TIMEOUT = 30000
```

### Booleans: prefix with `is/has/can/should`
```typescript
const isLoading = true
const hasPermission = checkPermission()
const canEdit = user.role === "admin"
const shouldShowWelcome = isFirstVisit && !hasSeenWelcome
```

## Error Handling

General principle: an error must never disappear silently. Every `catch` either handles the error
meaningfully, re-throws it, or logs it with enough context to debug later.

- 🚫 Never silently swallow errors — an empty `catch {}` block is a hard no
- ✅ Always surface user-facing feedback for failed user-initiated actions (submit, upload,
  delete, etc.) — the exact mechanism (toast, inline error, banner) depends on your UI library
- ✅ Use a schema-validation library (Zod, Yup, your framework's built-in validators, etc.) for
  input validation, on both client and server
- ✅ Centralize error-message extraction in a single shared helper (e.g. `getErrorMessage(error,
  fallback)`) instead of re-implementing `instanceof Error` checks at every call site — put it in
  one place and never redefine it locally

Illustrative example (adapt the notification mechanism and error types to your actual stack):

```typescript
try {
  const result = await createProject(data)
  notifySuccess("Project created!")
  return result
} catch (error) {
  notifyError(getErrorMessage(error, "An unexpected error occurred"))
  console.error("Unexpected error:", error)
}
```

## Comments

- Explain **WHY**, not **WHAT**
- Add comments for: complex business logic, workarounds, performance decisions, security considerations
- Don't add comments for self-explanatory code

```typescript
// ✅ Good: explains why
// Debounce to prevent excessive API calls during typing
const debouncedSearch = useDebouncedValue(searchTerm, 300)

// ❌ Bad: explains what (already obvious)
// Set debounced value with 300ms delay
const debouncedSearch = useDebouncedValue(searchTerm, 300)
```

## Code Quality Principles

1. **DRY** — Extract repeated logic into utilities or hooks
2. **Single Responsibility** — Each function/component does one thing well
3. **Keep It Simple** — Prefer clarity over cleverness
4. **Prefer named exports** — Better for tree-shaking and IDE support
5. **No premature optimization** — Profile first, optimize later

## Scalability Patterns

### Function Design for Maintainability

```typescript
// ✅ Good: Small, focused, testable
function calculateDiscount(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100)
}

function applyTax(price: number, taxRate: number): number {
  return price * (1 + taxRate / 100)
}

function calculateFinalPrice(price: number, discount: number, tax: number): number {
  return applyTax(calculateDiscount(price, discount), tax)
}

// ❌ Bad: Does too much, hard to test individual parts
function calculateFinalPrice(price: number, discount: number, tax: number, 
  couponCode?: string, membershipLevel?: string, quantity?: number): number {
  // 50 lines of nested logic...
}
```

### Data Flow Patterns

The framework-specific hooks below (`useData`, `useAction`) are illustrative placeholders — swap
in whatever data-fetching/mutation primitives your actual stack provides.

```typescript
// ✅ Good: Unidirectional data flow
// Container fetches → passes to presentation → receives callbacks
function SessionListContainer() {
  const sessions = useData(fetchSessions)
  const deleteSession = useAction(removeSession)

  const handleDelete = async (id: string) => {
    await deleteSession(id)
  }

  return <SessionList sessions={sessions ?? []} onDelete={handleDelete} />
}

// ❌ Bad: Bidirectional/tangled data flow
function SessionList() {
  const sessions = useData(fetchSessions) // fetches its own data
  const [localFilter, setLocalFilter] = useState("") // local state mixed with remote
  const parentCallback = useContext(ParentContext) // implicit dependency
}
```

### Type Safety for Extensibility

```typescript
// ✅ Good: Discriminated union — easy to add new types
type StepType = 
  | { type: "activity"; instructions: string; hints: string[] }
  | { type: "feedback"; rubric: string; autoGrade: boolean }
  | { type: "branching"; condition: string; nextStepId: string }

function renderStep(step: StepType) {
  switch (step.type) {
    case "activity": return <ActivityStep {...step} />
    case "feedback": return <FeedbackStep {...step} />
    case "branching": return <BranchingStep {...step} />
    // Adding new type = add case here, TypeScript catches missing cases
  }
}

// ❌ Bad: String checks — easy to miss cases
function renderStep(step: { type: string; data: any }) {
  if (step.type === "activity") return <ActivityStep data={step.data} />
  // Easy to forget a type, no compile-time safety
}
```

### Avoiding Future Refactors

| Pattern | Why It Helps |
|---------|--------------|
| Index exports from features | Change internals without breaking imports |
| Callbacks over direct mutations | Presentation components stay reusable |
| Discriminated unions | Adding variants is additive, not invasive |
| Centralized auth guards | Change auth logic in one place |
| Validation schemas kept in one shared location | Validation logic shared, not duplicated |

### When to Create Abstractions

**Create abstraction when:**
- Same pattern appears 3+ times
- Logic is complex AND reused
- You need to swap implementations

**DON'T abstract when:**
- Only used once (YAGNI)
- Patterns are similar but not identical
- Abstraction adds more complexity than it removes

```typescript
// ✅ Good: Abstraction after pattern emerges
// After seeing this pattern in 3 components:
const { isPending, data, error } = useQueryWithStatus(fetchThing, args)
if (isPending) return <Skeleton />
if (error) return <Error message={error.message} />
// → Create a useQueryWithStatus hook

// ❌ Bad: Premature abstraction
// Creating AbstractDataFetcherFactory before you have 2 use cases
```

## Export & Download Checklist

Any feature that produces downloadable files or triggers client-side side effects (full-screen, file save) must satisfy:

1. **Sanitize filenames** — strip non-alphanumeric characters from user-controlled strings used in filenames; provide a fallback name
2. **Concurrency guard** — use an `isProcessing` ref or state to prevent double-invocation
3. **Disable trigger UI** — disable buttons/menu items while processing (`disabled={isExporting}`)
4. **Handle asset failures** — images, fonts, or external resources used in export must have `onerror` handlers
5. **Use `crossOrigin`** — set `crossOrigin="anonymous"` on images loaded for canvas/PDF rendering

```typescript
// ✅ Good: defensive export handler
const [isExporting, setIsExporting] = useState(false);

async function handleExport() {
  if (isExporting) return;
  setIsExporting(true);
  try {
    const filename = sanitizeFilename(deck.title);
    await exportDeckAsPdf(deck, filename);
  } finally {
    setIsExporting(false);
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
  return cleaned || "export";
}
```

## Prompt Governance

Applies only if your project builds AI prompts at runtime — skip if it doesn't.

- Do not hardcode AI prompt/system strings inline in runtime routes or request-handling code
- Centralize prompts in a single registry/module (e.g. `<your-prompts-dir>/`) and render them
  through one shared function, rather than string-building ad hoc at each call site
- If your product supports multiple locales, every prompt must include all supported locale
  variants with explicit arg validation — adjust to your project's actual locale set

## Revert Completeness

When abandoning or reverting an approach (e.g., switching from library A to library B, removing a feature), **remove all artifacts** — not just the code:

1. **Config entries** — build/bundler config, environment files, framework config, etc. (e.g. `next.config.js`, `metro.config.js`, `.env` — whatever your stack uses)
2. **Plugin registrations** — framework plugins, build plugins, transpiler plugins (Babel, PostCSS, etc.)
3. **Generated/route files** — file-based routing directories, codegen output, migration files
4. **`package.json` dependencies** — remove the package from the correct workspace
5. **Import references** — grep the codebase for the reverted package/module name

**Verify**: After removing, run `grep -r "<package-name>" --include="*.json" --include="*.js" --include="*.ts"` across the repo to catch stragglers.

**Pay special attention to:**
- Framework/build **plugins** — these can silently interfere even with no visible code references
- **File-based routing** directories (if your framework uses file-based routing) — leftover route files can shadow or block expected routes

A partial revert is worse than no revert — leftover config can cause silent failures with no error output. Check your project's issue log for past occurrences of this class of bug.

## CSS Scoping for Shared Component Classes

When multiple instances of the same component (e.g. several rich-text editor instances, several
modal variants) share a base CSS class, every override rule for that shared class **MUST** be
prefixed with a container/instance scope. No unscoped rules on a shared class allowed.

**Why**: Unscoped rules on a class shared by multiple instances leak between them — e.g. a
compact style meant for one context silently breaks the typography of another.

**Also**: If your styling approach uses a utility framework with plugins (e.g. a CSS utility
framework's typography or container plugins), verify the plugin is both installed and
registered/imported wherever those utility classes are used — some tooling silently ignores
unknown utility classes with no build or runtime error.

`/setup` will generate a stack-specific version of this rule (concrete selectors, concrete plugin
names) once it detects your actual styling setup.

## Library Version Verification

Before importing an API from a third-party library, **verify the API exists in the installed version** — not just in the library's latest docs.

1. Check existing usage in the codebase (`grep` for the package name)
2. Match patterns already used by the project
3. If the import doesn't exist, check `node_modules/<pkg>/` or the changelog for your version

Check your project's issue log for past occurrences of this class of bug.

## Data Model Migration End-to-End

After changing a data model (adding fields, renaming, migrating to a new structure), **verify all code paths read from the new source**. Updating only the write path while leaving readers on the old field creates silent bugs.

**Checklist:**
1. Find all reads of the old field/table (`grep` for the field name)
2. Update each reader to use the new field/structure
3. Verify UI actions that write data go through the new path
4. If the old field is deprecated, remove it or add a migration

Check your project's issue log for past occurrences of this class of bug.

## Code Organization Checklist

Before committing, verify:

- [ ] Functions are < 50 lines
- [ ] Files are < 150 lines (components) or < 80 lines (utilities)
- [ ] No `any` types
- [ ] Named exports used
- [ ] No deep imports from features
- [ ] Complex logic extracted to utilities
- [ ] Error handling is explicit
- [ ] Types are exported if used elsewhere
