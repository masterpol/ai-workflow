# Performance Rules

## Scope

Apply during development and review phases to all UI components, data-access code, and API
routes.

**This file ships framework-agnostic on purpose.** The principles below (minimize client-side JS,
avoid N+1 queries, memoize deliberately, virtualize large lists, optimize assets) apply to every
stack. The concrete mechanism — what your framework calls "server rendering," which image
component you use, how your database client batches queries — is stack-specific. Run `/setup` to
detect your actual framework/data layer and generate a concrete version of this file with real
APIs, or fill in the examples below with your own.

---

## 1. Minimize Client-Side JavaScript

### Ship less code to the browser than you need to

The default should be: render on the server (or at build time) whenever you can, and only pay for
client-side JS where you actually need interactivity, hooks, browser APIs, or a live
subscription.

- If your framework has a server-rendering or static-generation mechanism (server components,
  SSR, SSG, islands, partial hydration, etc.), default to it.
- Only opt a component into client-side execution when it needs local state, event handlers,
  browser-only APIs, or a real-time subscription.
- Every opt-in to client-side execution should carry a comment justifying why it's needed there —
  this makes the boundary reviewable instead of accidental.

```
// e.g. (illustrative — replace with your framework's actual mechanism)

// ✅ Rendered server-side / at build time by default — no JS shipped for this
function TeacherDashboard() {
  data = fetchData()
  return renderLayout(data)
}

// ✅ Client-side execution only where needed, with justification
// client-boundary: needed for a live/real-time subscription
function LiveSessionView() {
  session = useLiveQuery(getSession, { id })
  ...
}
```

### Lazy-load heavy components

Anything that pulls in a large third-party dependency (rich text editors, chart libraries, PDF
renderers, slide/presentation libraries, etc.) should be loaded on demand, not bundled into the
initial page/app load — use your framework's dynamic-import or code-splitting mechanism, with a
loading placeholder.

### Avoid unnecessary re-renders

```
// ✅ Memoize expensive computations
processedData = memo(() => heavyTransform(rawData), [rawData])

// ✅ Stable callback references passed to child components
handleSubmit = memoCallback((data) => submitMutation(data), [submitMutation])

// ❌ Avoid: a new object/function created on every render, defeating memoization
render(Component, { options: { key: "value" } })   // new object each render
render(Component, { onAction: () => doThing() })   // new function each render
```

### List virtualization

Any list that can grow large (hundreds+ of rows) should be virtualized — render only the visible
window of items plus a small buffer, not the entire list — using whatever virtualization
primitive your UI framework/ecosystem provides.

### Image and asset optimization (mandatory for user content)

Use your framework/platform's image optimization primitive (responsive sizing, lazy loading,
modern format negotiation, explicit width/height to avoid layout shift) for all user-facing
images rather than an unoptimized raw `<img>`-equivalent tag.

---

## 2. Data-Access / Query Performance

These rules apply regardless of whether your data layer is SQL, a document store, a real-time
sync engine, or a plain REST API.

### Never pull an unbounded result set from a large collection

```
// ✅ Paginate large result sets
results = db.query("sessions")
  .where("teacherId", "=", userId)
  .paginate(pageOpts)

// ❌ Forbidden on collections with many rows
allSessions = db.query("sessions").fetchAll()
```

### Every filter clause should be backed by an index

```
// ✅ Filtering on an indexed column — fast
.where("teacherId", "=", userId)  // teacherId is indexed

// ❌ Filtering on a non-indexed column — full scan
.filter(row => row.teacherId === userId)
```

Check your schema/migrations before adding a new filter — if the column isn't indexed, add the
index or reconsider the query shape.

### Fetch only the fields you need

```
// ✅ Return only what the caller needs
return { id: session.id, title: session.title, status: session.status }

// ❌ Avoid: returning the full record with large unused fields
return session // includes full transcript, activity log, etc.
```

### Avoid N+1 queries — don't fetch inside a loop

```
// ✅ Batch fetch, then look up in memory
users = batchGet(userIds)

// ❌ Forbidden: one round trip per item
for (id of userIds) {
  user = db.get(id) // N round trips
}
```

### Skip queries that don't have their required inputs yet

If your data-fetching hook/mechanism supports a "don't run yet" state, use it instead of firing a
query with incomplete or default arguments and discarding the result.

---

## 3. Bundle Size

### Track third-party dependencies

- Before adding any new package, check its bundle-size impact (e.g. via bundlephobia.com or your
  ecosystem's equivalent).
- A dependency that meaningfully increases the client bundle requires a justification comment at
  the import site or in the PR description.

### Import only what you need (tree-shaking)

```
// ✅ Named import — tree-shakeable
import { format } from "date-fns"

// ❌ Default import of a large library — pulls in everything
import _ from "lodash"
```

### Prefer native platform APIs over libraries for simple tasks

```
// ✅ Native
formatted = new Intl.DateTimeFormat("en-US").format(date)

// ❌ Overkill for a simple format
import { format } from "date-fns" // adds real weight for one format call
```

---

## 4. Loading States

Every async operation must have a loading state — never a blank screen or a crash while data is
in flight.

```
// ✅ Handle the loading and empty states explicitly
function SessionList() {
  sessions = useQuery(listSessions)

  if (sessions === undefined) return renderSkeleton()
  if (sessions.length === 0) return renderEmptyState()
  return sessions.map(s => renderSessionCard(s))
}

// ❌ Forbidden: assumes data is already there
function SessionList() {
  sessions = useQuery(listSessions)
  return sessions.map(s => renderSessionCard(s)) // crashes if still loading
}
```

---

## 5. Caching

### Static-ish data should declare a revalidation/staleness window

If your framework or data layer supports time-based revalidation/caching for data that doesn't
change every request, use it instead of refetching on every load.

### Don't fetch inside loops

See the N+1 rule above — this applies to caching as much as to raw query performance. Batch first,
then iterate over results already in memory.

---

## Performance Checklist (Used in Review)

- [ ] No unbounded fetch of a large collection without pagination
- [ ] Every filter clause is backed by a matching index
- [ ] User-facing images use the framework's optimized image mechanism
- [ ] Heavy components/dependencies are lazy-loaded / code-split
- [ ] Any client-side-execution boundary is justified by a comment
- [ ] Large lists are virtualized
- [ ] No new dependency adds significant bundle weight without justification
- [ ] Loading/skeleton states present for all async data
- [ ] No fetches inside loops (N+1)
