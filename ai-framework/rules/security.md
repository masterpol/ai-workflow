# Security Rules

## Tier markers (used throughout this file)

- ✅ **Always do** — mandatory; must-fix at /audit's `security-reviewer` if missing
- ⚠️ **Ask first** — judgment call; logged in `deviations.md` with reason
- 🚫 **Never do** — hard prohibition; ship-blocking

## Scope

Apply to every server-side handler (function, mutation, query, API route) and client component in
this codebase. These rules are checked during the `/audit` phase by the `security-reviewer`
subagent and enforced by the post-edit hook.

**This file ships stack-agnostic on purpose.** The concrete auth API, validator syntax, and
storage APIs depend on your backend/auth provider. `/setup` (or your own setup) should generate a
project-specific version of this file once the stack is known, swapping the pseudocode below for
your real APIs.

---

## 1. Authentication & Authorization

### Every server-side write/read path touching user data must authenticate
```
// ✅ Required pattern
function updateSession(ctx, args) {
  const user = requireAuth(ctx) // throws/returns 401 if not authenticated
  // ...
}

// ❌ Forbidden: handler with no auth check
function updateSession(ctx, args) {
  db.patch(args.sessionId, { ... }) // anyone can call this
}
```

### Role checks must happen server-side
```
// ✅ Role checked in the server-side handler
const user = getUser(ctx)
requireRole(user, "teacher") // throws/denies if role doesn't match

// ❌ Forbidden: role-gating only in the UI
if (user?.role === "teacher") { // client can lie
  updateSession(...)
}
```

### Reads that return sensitive data must verify ownership
```
// ✅ Verify the caller owns the resource
const session = getById(args.sessionId)
if (session?.ownerId !== user.id) return null // or throw

// ❌ Forbidden: return data without ownership check
const session = getById(args.sessionId)
return session // returns to anyone who knows the ID
```

---

## 2. Data Validation

### All handler inputs must use specific validators — never an "accept anything" type
```
// ✅ Typed validators
schema: {
  title: string(),
  status: oneOf(["active", "archived"]),
  metadata: object({ gradeLevel: string(), subject: string() }),
}

// ❌ Forbidden
schema: { data: anyType() }
```

### Forms must validate on the client AND the backend
- Client: use a schema library (e.g. Zod) in `lib/validations/`
- Backend: use your backend's validator/schema layer on every write path
- Never trust client-only validation for writes that touch persistent storage

### Validate string length to prevent abuse
```
// ✅ Bounded strings
title: string(), // pair with a max-length rule on the client side too
// e.g. Zod: z.string().max(200).trim()
```

---

## 3. Secrets & Credentials

### Never hardcode secrets in source code
```
// ✅ Environment variables only
const apiKey = process.env.OPENAI_API_KEY

// ❌ Forbidden — will be flagged by post-edit hook
const apiKey = "sk-abc123..."
const password = "admin123"
```

### Allowed env patterns
| Variable type | Location |
|---|---|
| Backend secrets | `.env.local` → `process.env.VARIABLE`, read only in server-side code |
| Framework server secrets | `.env.local` → `process.env.VARIABLE` in server components/API routes |
| Public config | Framework's public-prefix convention only, for non-sensitive values |

### Never log secrets
```
// ❌ Forbidden
console.log("API key:", process.env.OPENAI_API_KEY)
console.log("User token:", token)
```

---

## 4. Input Safety (XSS Prevention)

### Never render raw HTML from user-provided content
```
// ✅ Safe: use text content
<p>{userProvidedText}</p>

// ❌ Forbidden without sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### If rich text rendering is required
- Use DOMPurify (or equivalent) to sanitize before rendering as HTML
- Only allow an explicit allowlist of HTML tags and attributes
- Never allow `<script>`, `on*` attributes, or `javascript:` URLs

### URL validation for user-supplied links
```
// ✅ Validate URL scheme before rendering as href
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['https:', 'http:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

---

## 5. API Routes

### All API routes must authenticate requests
```
// ✅ app/api/*/route.ts (or equivalent)
export async function POST(req: Request) {
  const user = await requireAuth(req) // your auth provider's server-side check
  if (!user) return new Response("Unauthorized", { status: 401 })
  // ...
}
```

### Never expose internal error details to clients
```
// ✅ Generic error to client
return new Response("Internal server error", { status: 500 })

// ❌ Forbidden: leaks implementation details
return new Response(error.message, { status: 500 })
```

### Validate Content-Type on mutation endpoints
```
const contentType = req.headers.get("content-type")
if (!contentType?.includes("application/json")) {
  return new Response("Bad Request", { status: 400 })
}
```

---

## 6. Multi-Tenancy / Organization Isolation

If this project has multiple tenants/organizations sharing the same backend, isolation must be
enforced on every query and mutation that touches tenant-scoped data — never rely on the client to
send the correct tenant ID.

### Tenant isolation must be enforced in every multi-tenant query
```
// ✅ Always scope queries to the user's org
const orgId = user?.organizationId
if (!orgId) throw new Error("No organization context")
const sessions = queryByOrg("sessions", orgId)

// ❌ Forbidden: returns data from all orgs
const sessions = queryAll("sessions")
```

### Never trust `organizationId` from client args — always derive from auth
```
// ✅ Derive from auth, not from request args
const user = requireAuth(ctx)
const orgId = user.organizationId // from the authenticated user record, not from args

// ❌ Forbidden: client can send any orgId
schema: { organizationId: string() }
handler: (ctx, { organizationId }) => { ... }
```

The concrete implementation (how the org/tenant ID is attached to the auth session, how it's
enforced at the query layer) depends on your backend/auth provider; `/setup` (or your own setup)
should generate this section once the stack is known.

---

## 7. File Uploads (if applicable)

- Validate file type server-side (not just by extension — check MIME type)
- Enforce maximum file size limits
- Store files in dedicated object storage or a CDN — never the public directory
- Never execute uploaded files

---

## 8. Security Anti-Patterns (Auto-Flagged)

The post-edit hook and the `/audit` security-reviewer will flag these automatically:

| Pattern | Risk | Fix |
|---|---|---|
| "accept anything" type in a handler's input schema | Accepts arbitrary input | Use specific validators |
| Unsanitized raw-HTML rendering | XSS | Use DOMPurify or render as text |
| Write handler without an auth check | Unauthenticated write | Add auth check |
| Hardcoded strings matching secret patterns | Credential exposure | Use env vars |
| `process.env.*` in client-side files | Leaks server env | Move to server component or API route |
| `console.log(token\|key\|password\|secret)` | Credential logging | Remove |
| Read returning data without ownership check | IDOR | Add `if (resource.ownerId !== user.id) return null` |
| Cross-org data access | Tenant isolation breach | Scope all queries by org/tenant ID |

---

## 9. Scripts That Read or Write a Project Tree

Applies to workflow scripts, hooks and reports that scan a project they did not author (doctor,
`/state`, sync, compaction, collectors). Promoted at the 2026-09-25 cooldown: a path or
untrusted-input must-fix was found at the audit of all five pitches shipped that day. Background:
`.project/knowledge/patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code.md`.

### ✅ Read through one guarded reader
Refuse symlinks, non-regular files (a FIFO blocks forever), paths whose realpath leaves the
project, and files over a size bound. Apply the same check to directory listings.

### ✅ Bound input before every regex, and again after any transformation that can grow it
Unicode NFKC expands text up to about 18×. Prefer linear patterns and cap the source.

### ✅ Execute only bundle code
Resolve helper scripts from the running script's directory, never from the analyzed project.

### ✅ Parse and re-emit untrusted values; allow-list labels at ingest and again at render
Never copy project text into CSS, SQL, a shell command or markup
(`patterns/parse-untrusted-values-and-re-emit-them.md`,
`patterns/allow-list-untrusted-labels-at-ingest-and-at-render.md`).

### ✅ Never copy error text into output; write atomically
Keep the error code, not the message (absolute paths, file fragments). Write with a temp file
opened `wx` plus rename, through a resolver that refuses symlinked destinations.

### 🚫 Never let a helper's "absent" result stand for "refused"
If a reader starts refusing symlinks or non-regular files, list every caller that writes on
"absent" and give the refusal its own outcome
(`issues/hardening-a-shared-reader-made-its-writer-destructive.md`).

---

## Security Checklist (used by `security-reviewer` in `/audit`)

### A. Authentication
- [ ] Every write path calls a `requireAuth` (or equivalent) check
- [ ] Every sensitive read verifies caller ownership
- [ ] API routes check auth before processing

### B. Authorization
- [ ] Role checks happen server-side, not client-only
- [ ] Organization/tenant context derived from auth, not client args
- [ ] Sensitive operations require the correct role

### C. Data Validation
- [ ] No "accept anything" types in backend validators
- [ ] All user inputs validated with a schema library on the client and backend validators on the server
- [ ] String length bounded for all user-provided text

### D. Secrets
- [ ] No hardcoded API keys, passwords, tokens
- [ ] No public-prefix env vars used for secrets
- [ ] No secrets logged to console

### E. XSS / Injection
- [ ] No unsafe raw-HTML rendering of user content
- [ ] User-provided URLs validated before rendering
- [ ] No `eval()` or `Function()` with user input

### F. Multi-Tenancy (if applicable)
- [ ] All queries scoped by organization/tenant ID
- [ ] Organization/tenant ID derived from auth, never from client args

### G. Scripts over a project tree (workflow tooling)
- [ ] Reader refuses symlinks, FIFOs/non-regular files, out-of-project realpaths and oversize files; directory listings checked too
- [ ] Regexes are linear and input is capped before matching and after any expanding transformation
- [ ] No script supplied by the analyzed project is executed
- [ ] No raw error text or absolute path reaches output
- [ ] Writers refuse non-regular or symlinked targets and replace atomically
