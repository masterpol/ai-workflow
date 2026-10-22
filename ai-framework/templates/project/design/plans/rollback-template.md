# Rollback Plan: [Feature Name]

**Date**: YYYY-MM-DD
**Feature**: [Feature being deployed]
**Risk Level**: LOW | MEDIUM | HIGH
**Responsible role**: [Role]
**Deployment authorization**: [Scope and source]
**Observation period**: [Period justified by the affected behavior]

---

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Security review passed
- [ ] Database migration is backward-compatible (if applicable)
- [ ] Feature flag / env gate in place (if applicable)
- [ ] Monitoring/alerts configured for affected endpoints

## Deployment Steps

1. [Step 1: e.g., Deploy backend schema changes]
2. [Step 2: e.g., Deploy frontend application]
3. [Step 3: e.g., Enable feature flag]
4. [Step 4: e.g., Verify in production]

## Rollback Triggers

Define measurable triggers before deployment. Replace these examples with thresholds justified by the scope:
- [ ] Error rate on affected endpoints exceeds [threshold] during [interval]
- [ ] User-facing functionality is broken (manual check)
- [ ] Console errors related to the new feature
- [ ] Data integrity issues detected
- [ ] Performance on affected queries exceeds [latency or degradation threshold]

## Rollback Steps

### If feature-flagged:
1. Set `ENABLE_[FEATURE]` to `false` in environment
2. Verify feature is disabled
3. Verify the flag stops the affected behavior and assess any data or background work requiring recovery

### If schema change involved:
1. **Check**: Is the schema change backward-compatible?
   - YES: Simply revert the code deployment; schema can stay
   - NO: Follow "Schema Rollback" below

### Code rollback:
1. `git revert [commit-hash]` (do NOT force-push)
2. Deploy the revert commit
3. Verify affected pages/endpoints work
4. Use the agreed communication channel when notification is authorized

### Schema rollback (backend):
1. **WARNING**: Some backend schema changes (e.g. adding required fields) are NOT safely reversible
2. Inspect compatibility with the previous application version, existing records, constraints, and writes made after deployment
3. Preserve new data; added tables or optional fields are not by themselves proof that rollback is safe
4. Document the required forward fix, backward migration, or recovery procedure before running it

## Post-Rollback

- [ ] Create incident report
- [ ] Record the incident for per-pitch extraction during `/ship` and recurring review during `/cooldown`
- [ ] Update knowledge/issues/ with root cause
- [ ] Schedule fix with proper testing

## Communication

| Audience | Channel | Message |
|----------|---------|---------|
| Team | [Agreed channel] | "Rolling back [feature] due to [reason]. Investigating." |
| Users | (if visible) | [Status page update or in-app notice] |

---

## Notes

- Retain this plan with the deployment record.
- Define when observation can end and who confirms stability.
- A quiet initial window does not establish that delayed jobs, billing, or migrations are safe.
