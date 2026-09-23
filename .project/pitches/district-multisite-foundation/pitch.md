# Pitch: district-multisite-foundation

**Date**: 2026-09-21  •  **Appetite**: big-batch  •  **Stack**: web + content + migration

## Problem

Distrito Lasallista Norandino operates a fragmented public-web estate: the district Joomla site routes visitors to country sections and at least 40 visible school or educational-work links, many of which are separate domains. Content governance and user access must follow the real organisation hierarchy rather than a flat, domain-per-school model.

## Knowledge Consulted

- `analysis/2026-09-21-current-site-validation.md` — public site validation, visible country and school footprint, content classes, and discovery gaps.
- No existing decisions, patterns, entities, or issues were present in the new project knowledge graph.

## Solution Sketch

**Places**: public district home; country, territory, and school landing pages; article listings and articles; sign-in; scoped administration; tenant/user management; landing configuration; media/document library; migration console/reporting.

**Affordances per place**:

| Place | Affordances |
|---|---|
| Public site | Navigate hierarchy, view landing content, read/filter articles, access documents and contacts |
| Tenant administration | Manage permitted organisation details, navigation, landing sections, media, documents, and article lifecycle |
| User administration | Invite, deactivate, and role-scope users only within the administrator's assigned subtree |
| District administration | Manage hierarchy, global configuration, cross-tenant governance, redirects, and support |
| Migration operations | Inventory sources, map fields and URLs, run repeatable imports, review exceptions, reconcile totals |

**Connections**: The request path resolves a public organisation context. Landing content, articles, configuration, and navigation are selected by that context with permitted inheritance from ancestors. The same hierarchy scopes administration and is verified server-side for every protected operation. Migration maps legacy records and URLs to these canonical organisation nodes before publication.

## Programme Scope And Estimate

The first implementation bet is **discovery plus the canonical tenant/content foundation**. It is followed by delivery workstreams that can be scheduled after their dependencies are validated.

| Workstream | Includes | Estimated engineering effort |
|---|---|---:|
| 0. Discovery and migration inventory | Source access, content/media/user inventory, organisation registry, permissions workshops, redirect inventory, acceptance plan | 2-4 person-weeks |
| 1. TypeScript application foundation | TanStack Start proposal approval, core app shell, environment model, baseline quality and deployment plan | 2-4 person-weeks |
| 2. Tenant hierarchy and accounts | Organisation tree, membership/roles, tenant enforcement, invitations, audits, administration | 4-7 person-weeks |
| 3. Content and blog | Articles, media/documents, publishing workflow, tenant-aware lists and public routes | 3-5 person-weeks |
| 4. Configurable landings | Shared templates, controlled sections, inheritance/overrides, navigation, responsive/accessibility review | 4-7 person-weeks |
| 5. Migration and launch | Extract/transform/load, asset transfer, redirects, reconciliation, QA, training, phased release | 4-9 person-weeks |
| **Programme total** | **All workstreams above** | **19-36 person-weeks** |

The range excludes dedicated design, project management, content-editor effort, legal review, translation, and external-vendor fees. Calendar duration depends on team size and parallelism. With two engineers plus available product/content owners, a preliminary delivery range is 14-22 calendar weeks after discovery; it is not a commitment until Workstream 0 closes.

### Sizing Assumptions

- The public crawl establishes 40 visible school/educational-work links, but does not establish page, asset, account, or content totals.
- The base estimate covers the Joomla district content and a repeatable process for selected school sources.
- Each independently managed school website added to full content migration may require roughly 0.5-2 engineering days after tooling exists, plus editorial validation; complex custom sites or inaccessible sources can exceed this range.
- Authentication, database, infrastructure, CMS/editor, hosting, observability, and migration access are undecided. Selection, integration, compliance, and procurement risk may widen the range.
- A configurable landing system is bounded to approved blocks and fields. A drag-and-drop arbitrary page builder is not included.

## First Scope: Discovery And Canonical Foundation

**Objective**: remove the uncertainties that prevent a reliable estimate and establish the data/access model that every later feature depends on.

- Produce an approved organisation registry for district, countries, territories, schools, aliases, and owner contacts.
- Audit Joomla and selected external sources for pages, articles, categories, menus, assets, documents, users, and URLs.
- Define a role-permission matrix and tenant-boundary acceptance tests with district and country stakeholders.
- Define canonical URLs, legacy redirect policy, content ownership, publishing workflow, and migration waves.
- Create a technical proposition for TypeScript, TanStack Start, appropriate TanStack packages, Tailwind, Vite, and Ox tooling, without implementation or vendor selection.

**First-scope estimate**: 2-4 engineering person-weeks, with continuous participation from content owners and administrators. It ends in an approval gate, not a production migration.

## Rabbit Holes

**Resolved here**:

- One domain versus one domain per school -> proposal: one canonical domain with path-based organisation contexts; legacy domains remain a migration and redirect decision.
- State terminology across three countries -> use an optional, country-configured territory level rather than hard-coding “state”.
- Landing flexibility versus governance -> controlled reusable blocks and inherited configuration, not arbitrary code/page building.

**Pushed to plan as risk**:

- Legacy data volume and data quality -> discovery owner: migration lead; source access and inventory are required before import sizing.
- Independent school-site ownership and access -> discovery owner: district sponsor with country owners; classify each source as migrate, directory-only, redirect-only, or out of scope.
- Identity, privacy, hosting, and data residency -> discovery owner: district technical and legal stakeholders; required before technical foundation approval.

**Pushed to no-go**:

- Student systems, payments, learning management, HR, and ERP integration -> separate products and not required for a public multi-site platform.

## No-Gos

- No dependency, infrastructure, or vendor setup in this shaping scope.
- No final decision on database, authentication, CMS, cloud, hosting, or deployment model.
- No bulk migration before a source inventory, content-owner sign-off, and rollback plan exist.
- No automatic assumption that every linked external school site will be rebuilt in the first release.

## Critique Findings

Pending `/critique` before a delivery bet.

## Bet Decision

☐ **Bet** (→ `/plan`)  
☐ Re-shape — named gap: source-access and organisational-inventory validation  
☐ Pass — move to `.project/pitches/_parked/district-multisite-foundation/`
