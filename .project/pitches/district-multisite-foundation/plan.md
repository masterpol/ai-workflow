# Plan: district-multisite-foundation

**Pitch**: pitch.md  •  **Appetite**: big-batch  •  **Hill**: hill.md

## Scopes

| ID | Name | Deliverables | Effort | Depends on | Parallel with |
|---|---|---|---:|---|---|
| S1 | Organisation and source inventory | Authoritative tenant registry, source catalogue, content/media/user counts, ownership and access status | 1-2 pw | Stakeholder access | S2 |
| S2 | Access and governance definition | Role-permission matrix, delegation rules, privacy and audit requirements, acceptance scenarios | 0.5-1 pw | Stakeholder workshops | S1 |
| S3 | Content, URL, and migration design | Content model, canonical paths, redirect policy, migration waves, reconciliation/rollback criteria | 0.5-1 pw | S1 | S2 |
| S4 | Technical proposition | Decision-ready options for the stated TypeScript/TanStack Start/Tailwind/Vite/Ox direction and undecided services | 0.5-1 pw | S1-S3 | - |

## Exit Criteria Per Scope

### S1 - Organisation and source inventory

- Every in-scope tenant has a proposed parent, public name, stable reference, current URL, owner, and migration classification.
- Source counts are recorded for pages, articles, media, documents, users, and URLs, with inaccessible sources listed as exceptions.

### S2 - Access and governance definition

- District, country, territory, school, editor, and reviewer actions are recorded in an approved permission matrix.
- At least one allow and one deny acceptance scenario exists for every scoped administrator role.

### S3 - Content, URL, and migration design

- Every in-scope legacy URL category has a proposed canonical-destination or retention policy.
- Import, reconciliation, exception, and rollback procedures have named owners.

### S4 - Technical proposition

- The proposition lists decisions, options, decision criteria, and owners for application foundation, identity, data, media, infrastructure, and operations.
- It distinguishes approved direction from undecided implementation choices and installs nothing.

## Risks

| Risk | Scope | Mitigation |
|---|---|---|
| Missing CMS/database or external-site access | S1 | Treat access as a discovery deliverable; do not commit import totals without it |
| Geography and ownership vary by country | S1-S3 | Use configurable territory and explicit tenant registry |
| Roles become too broad or inconsistent | S2 | Define server-enforced permission tests before implementation |
| Scope expands into school operational systems | All | Maintain no-gos and separate follow-up pitches |

## Sequencing

S1 and S2 can begin together. S3 starts when the organisation/source inventory is sufficiently complete. S4 uses the confirmed constraints from S1-S3. The full implementation plan must be created only after these discovery outputs are approved.

## Living-Spec Deviations Log

Empty at planning time.
