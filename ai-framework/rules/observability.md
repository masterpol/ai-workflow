# Observability Rules

## Scope

Apply during development and review phases to ensure the application fails gracefully,
provides clear user feedback, and is debuggable in production.

**This file ships framework-agnostic on purpose.** The concrete error-boundary file, routing
convention, and backend error type differ by stack (Next.js App Router, plain React + a router
library, a mobile app's screen stack, etc.). Run `/setup` to detect your actual frontend/backend
framework and generate a concrete version of this file with real file names and code — or adapt
the templates below yourself.

---

## 1. Error Boundaries

### Every route/screen/entry point needs graceful error handling

Use your framework's error-boundary mechanism (e.g. `error.tsx` in Next.js App Router, an
`ErrorBoundary` component in plain React, a top-level try/catch + fallback screen in a mobile
navigator, etc.). The mechanism name and placement vary — the requirement doesn't: no route or
screen should be able to crash the whole app with an unhandled render error.

```text
<routes-or-screens>/
├── <section>/
│   ├── <error-boundary-for-section>   ← catches errors in all routes/screens under this section
│   ├── <sub-route>/
│   │   ├── <error-boundary-for-sub-route>  ← catches errors specific to this sub-route
```

### Minimum implementation (pseudocode — adapt to your framework's API)

```typescript
// Generic shape: an error boundary receives the caught error and a way to retry/reset.
function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState>
      <Message>Something went wrong</Message>
      <RetryButton onPress={reset}>Try again</RetryButton>
    </ErrorState>
  )
}
```

### Do NOT put business logic in error boundaries
- Error boundaries only catch render errors
- Mutation/handler errors must be caught with try/catch — they don't bubble up to an error
  boundary in most frameworks

---

## 2. User Feedback (Toasts / Alerts / Inline Messages)

### Every mutation must give user feedback

```typescript
// ✅ Both success and error paths notify the user
const handleCreate = async (data: FormData) => {
  try {
    await createSession(data)
    notifySuccess("Session created")
    navigateTo(sessionDetailRoute(sessionId))
  } catch (error) {
    if (isUserFacingError(error)) {
      notifyError(error.message) // user-friendly message from backend
    } else {
      notifyError("Failed to create session — please try again")
      logError("[sessions:create]", error) // log for debugging
    }
  }
}

// ❌ Forbidden: silent failures
const handleCreate = async (data: FormData) => {
  await createSession(data).catch(() => {}) // swallowed error
}
```

`notifySuccess`/`notifyError` stand in for whatever your stack uses — a toast library, a native
alert, an inline banner, etc.

### Message conventions
| Situation | Message pattern |
|---|---|
| Success | Short, positive: "Session created", "Changes saved" |
| User error | Specific: "Title is required", "Session already active" |
| System error | Generic + retry hint: "Failed to save — please try again" |
| Loading | Only for operations > 1s: show a loading indicator, then dismiss it |

---

## 3. Loading States

### Every async operation needs a loading state

```typescript
// ✅ Data fetch: check for a pending/undefined state before rendering real content
const sessions = useSessionsQuery()
if (sessions.isLoading) return <Skeleton className="h-32 w-full" />

// ✅ Mutation: track pending status
const { mutate: createSession, isPending } = useCreateSession()
<Button disabled={isPending}>
  {isPending ? "Creating..." : "Create Session"}
</Button>
```

The exact hook/API names above (`useSessionsQuery`, `isPending`) are illustrative — use whatever
your data-fetching layer provides (React Query, SWR, framework-native hooks, etc.).

### Loading skeleton rules
- Match the shape of the real content (same height/width proportions)
- Use a pulse/shimmer animation for skeleton placeholders
- Never show a spinner for operations completing in < 200ms

---

## 4. Logging Conventions

### Structured log format
```typescript
// Format: [feature:action] message
console.error("[sessions:create] Failed to create session", { error, userId })
console.error("[ai:generate] Token limit exceeded", { sessionId, tokensUsed })

// ❌ Forbidden: unstructured, context-free logs
console.log("error happened")
console.error(error)
```

(Substitute your language/runtime's logging call if it isn't JS `console.*` — the structured
`[feature:action] message + context object` shape is what matters, not the specific API.)

### What to log (production-safe)
```typescript
// ✅ Log for debugging — safe content only
console.error("[feature:action] Description", {
  sessionId,    // resource IDs are OK
  errorCode,    // error codes are OK
  userId,       // user IDs are OK for debugging
})

// ❌ Never log
console.log("API key:", apiKey)      // secrets
console.log("User data:", userData)  // full user objects (PII)
console.log("Token:", authToken)     // auth tokens
```

### Log levels
- `error`: Unexpected errors, failed mutations/handlers, API failures
- `warn`: Deprecated usage, fallback paths, recoverable issues
- `log`/`debug`: **Remove before merge** (caught by post-edit hook, or a linter rule if configured)

---

## 5. Error Recovery Patterns

### Backend/handler layer: throw user-friendly errors for expected failures

```typescript
// Throw a user-facing error type for conditions the user caused/can act on
if (session.status === "active") {
  throw new UserFacingError("Session is already active")
}

// Throw generic for unexpected internal errors (they surface as a 5xx/unhandled error)
// These get caught by error boundaries or try/catch on the client
```

Use whatever error-type distinction your backend framework provides (a custom error class, a
typed error union, an HTTP status convention) to separate "expected, user-facing" errors from
"unexpected, internal" ones.

### Retry-able operations
```typescript
// ✅ For network-dependent operations, offer retry
catch (error) {
  notifyError("Failed to connect — tap to retry", {
    action: { label: "Retry", onClick: () => retryOperation() }
  })
}
```

### Graceful degradation for AI features
```typescript
// ✅ AI features degrade gracefully — never block the core UX
const aiSuggestion = await generateHint(context).catch(() => null)
if (!aiSuggestion) {
  // Show fallback UI, not an error
  return <ManualFeedbackForm />
}
```

---

## 6. Not-Found / Missing-Resource Handling

### Every route/screen that loads a resource by id must handle "not found"

Use your framework's convention for this (e.g. a `not-found.tsx` file in Next.js App Router, a
conditional render + redirect in plain React, a dedicated "not found" screen in a mobile
navigator, etc.).

```text
<routes-or-screens>/
├── sessions/
│   ├── <session-detail-route>/
│   │   ├── <not-found-view-for-this-route>  ← shown when the session doesn't exist
```

```typescript
// Generic shape: fetch the resource, and short-circuit to a not-found view when it's missing
const session = await fetchSession(sessionId)
if (!session) return <SessionNotFound />

function SessionNotFound() {
  return (
    <EmptyState>
      <Message>Session not found</Message>
      <LinkButton to="/sessions">Back to sessions</LinkButton>
    </EmptyState>
  )
}
```

---

## Observability Checklist (Used in Review)

- [ ] Every route/screen has an error-boundary equivalent for its framework
- [ ] Routes/screens that load a resource by id handle the "not found" case explicitly
- [ ] All mutations have try/catch with user feedback (success + error)
- [ ] No silent error swallowing (`catch(() => {})`)
- [ ] No debug-level logs left in production code (only warn/error where needed)
- [ ] Logs follow a structured `[feature:action] message + context` format
- [ ] Loading states present for all async data-fetching calls
- [ ] AI features have fallback UI, not error states
- [ ] A distinct user-facing error type/convention is used for expected, actionable errors (not
      generic throws)
