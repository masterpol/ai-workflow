# CI/CD & Deployment Rules

## Scope
Apply when preparing code for deployment, setting up CI pipelines, or reviewing
deployment readiness. These rules define what must pass before production deployment.

**This file ships without concrete commands on purpose.** The actual typecheck/lint/test/build
commands, backend deploy flow, and hosting target depend on your stack. Run `/setup` to detect
your project's tooling and generate a concrete version of this file with real commands — or fill
in the placeholders below yourself.

---

## 1. Pre-Merge Requirements (Local)

Every change must pass these before creating a PR or pushing to main:

```bash
# Run in order — each must pass before the next
<typecheck-command>        # Zero type errors
<lint-command>              # Zero lint errors
<test-command>               # All tests pass
<build-command>             # Zero build errors
```

**None of these are optional** — a broken build blocks all teammates.

### Type checking
- `<typecheck-command>` must report zero errors across every workspace/target that has one
- Fixing type errors with an inline suppression comment (e.g. `@ts-ignore`, `# type: ignore`)
  requires a comment explaining why
- Never blanket-disable type checking in production files

### Tests
- All existing tests must still pass (zero regressions)
- New features must have tests covering the happy path and at least one error case
- If a test is flaky, fix it — don't skip it

### Build
- `<build-command>` must complete with zero errors
- Build warnings for large bundles/artifacts must be investigated (not ignored)
- Any dynamic imports or code-split boundaries that fail at build time must be fixed

---

## 2. Backend/Schema Deployment

If your project has a separate backend or database layer with its own deploy step:

### Before deploying backend functions or schema
```bash
# Verify the backend schema is valid and generated types/clients are up to date
<backend-codegen-command>
```

### Schema changes
Follow safe schema-evolution practice strictly:
- New required fields must have migration scripts/mutations ready
- Never deploy a schema change that breaks existing data
- Test migrations locally before deploying

### Backend environment variables
- Add secrets in your backend provider's dashboard or secret manager (not in code)
- Document required env vars in `commands/setup.md`
- Test with all required env vars set — never assume defaults

---

## 3. Environment Variables

### Required env var checklist before deployment
Every deployment must verify these are set in the target environment:

```bash
# Backend / database
<BACKEND_URL_VAR>=          # e.g. production backend/database URL

# Auth
<AUTH_PUBLIC_KEY_VAR>=
<AUTH_SECRET_KEY_VAR>=

# Third-party services
<SERVICE_API_KEY_VAR>=      # e.g. AI provider, payments, email
# ... other service keys
```

### Env var rules
- Document every required env var in `commands/setup.md` and the relevant app README
- Never commit local or production env files (e.g. `.env.local`, `.env.production`)
- Use an `.env.example` file with placeholder values (no real secrets) for new devs
- Fail fast: verify required env vars at startup, not at runtime when they're first needed

---

## 4. Rollback Plan

Every feature deploy must have a rollback plan defined before deploying:

```markdown
## Rollback Plan: [feature-name]

### Rollback trigger
[What symptom would trigger a rollback? e.g., error rate > 1%, specific 500 errors]

### Rollback steps
1. [Step 1: e.g., revert backend deployment to previous version]
2. [Step 2: e.g., revert frontend/app deployment]
3. [Step 3: e.g., data migration rollback if schema changed]

### Data safety
[Is any data at risk? What's the recovery plan?]

### Communication
[Who to notify? Chat channel, email, etc.]
```

For schema changes: always have a **data rollback script** ready before deploying.
For feature flags: prefer gradual rollout over big-bang deployment.

---

## 5. Deployment Checklist

Use this checklist before every production deploy:

### Pre-Deploy
- [ ] `<typecheck-command>` — zero type errors
- [ ] `<lint-command>` — zero lint errors
- [ ] `<test-command>` — all tests pass
- [ ] `<build-command>` — build succeeds with no errors
- [ ] Security review passed (`security-reviewer` clean in `/audit`)
- [ ] All required env vars documented and set in target environment
- [ ] Rollback plan defined for this change
- [ ] Schema migration ready (if schema changed)
- [ ] PR reviewed by at least one other person (if team project)

### Schema Changes (additional)
- [ ] Migration script/mutation written and tested locally
- [ ] Migration will run before code that depends on new field
- [ ] Old field deprecated (not removed) in this deploy
- [ ] Rollback script/mutation ready if migration fails

### Post-Deploy
- [ ] Verify key flows work in production (manual smoke test)
- [ ] Check error rates in logs/monitoring for 10 minutes after deploy
- [ ] Verify backend queries return expected data
- [ ] Confirm all environment variables loaded correctly

---

## 6. What Must NOT Go to Production

Block deployments that include:

| Issue | Why | Fix |
|---|---|---|
| Type errors | Runtime crashes | Fix types first |
| Failing tests | Known broken behavior | Fix or remove test |
| Hardcoded secrets | Security breach | Use env vars |
| Untyped/`any`-style validators on write paths | Data corruption risk | Use specific validators/schemas |
| Missing auth guards on mutations/handlers | Unauthorized data access | Add auth before deploy |
| Schema change without migration | Data inconsistency | Write migration first |
| Debug/console logging in production code | Log noise, potential PII leak | Remove logs |
| Build errors | App won't start | Fix build first |

---

## 7. Multi-Service Deployment Order

When both backend and frontend need updates:

```
1. Deploy backend schema changes (backward-compatible only)
2. Run data migrations if needed
3. Deploy backend function/API updates
4. Deploy frontend/app (now safe — backend is ready)
```

**Never** deploy the frontend first when it depends on new backend functions/endpoints — the app
will break at runtime.

---

## Deployment Quick Reference

```bash
# Full pre-deploy check
<typecheck-command> && <lint-command> && <test-command> && <build-command> && echo "Ready to deploy"

# Deploy backend (from project root)
<backend-deploy-command>

# Deploy frontend/app (depends on your host)
# See commands/setup.md for project-specific deploy commands
```
