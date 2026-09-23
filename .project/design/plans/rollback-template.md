# Rollback Plan: [Feature Name]

**Date**: YYYY-MM-DD
**Feature**: [Feature being deployed]
**Risk Level**: LOW | MEDIUM | HIGH
**Author**: [Name]

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

Initiate rollback if ANY of these occur within 30 minutes of deployment:
- [ ] Error rate on affected endpoints exceeds 5%
- [ ] User-facing functionality is broken (manual check)
- [ ] Console errors related to the new feature
- [ ] Data integrity issues detected
- [ ] Performance degradation > 2x on affected queries

## Rollback Steps

### If feature-flagged:
1. Set `ENABLE_[FEATURE]` to `false` in environment
2. Verify feature is disabled
3. No code rollback needed — investigate at leisure

### If schema change involved:
1. **Check**: Is the schema change backward-compatible?
   - YES: Simply revert the code deployment; schema can stay
   - NO: Follow "Schema Rollback" below

### Code rollback:
1. `git revert [commit-hash]` (do NOT force-push)
2. Deploy the revert commit
3. Verify affected pages/endpoints work
4. Notify team in Slack

### Schema rollback (backend):
1. **WARNING**: Some backend schema changes (e.g. adding required fields) are NOT safely reversible
2. If new fields are optional: safe to revert code (fields ignored)
3. If new tables: safe to revert code (tables stay empty, can clean up later)
4. If fields changed from optional to required: CANNOT revert without data migration

## Post-Rollback

- [ ] Create incident report
- [ ] Run `/retro` to extract lessons
- [ ] Update knowledge/issues/ with root cause
- [ ] Schedule fix with proper testing

## Communication

| Audience | Channel | Message |
|----------|---------|---------|
| Team | Slack | "Rolling back [feature] due to [reason]. Investigating." |
| Users | (if visible) | [Status page update or in-app notice] |

---

## Notes

- Rollback window: 30 minutes from deployment
- After 30 minutes with no issues: rollback plan is retired
- Keep this document until the feature is stable for 1 week
