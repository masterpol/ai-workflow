# Feature: Single-Domain Multi-Site Platform

**Date**: 2026-09-21
**Status**: Proposed
**Priority**: High

## Problem

The district currently presents country and school information across a Joomla district site, independent school domains, country-specific platforms, and social pages. Administrators need one managed public platform without granting users access beyond their organisational responsibility.

## Outcome

A visitor can navigate a consistent district, country, territory, or school experience on one canonical domain. An administrator can manage only the tenant scope explicitly assigned to them.

## Functional Requirements

### Organisation And Tenancy

- Maintain a district, country, optional territory, and school hierarchy.
- Create, edit, activate, archive, and reorder organisation nodes according to permissions.
- Give every public node a unique canonical path and preserve approved aliases and redirects.
- Allow country-specific territory labels and optional hierarchy depth.

### Users And Administration

- Invite, activate, deactivate, and assign users within an administrator's permitted organisation scope.
- Enforce role and tenant checks on every administrative read and mutation.
- Prevent a country, territory, or school administrator from viewing or changing sibling or parent data unless explicitly delegated.
- Record accountable actions for tenant, user, content, configuration, and publication changes.

### Public Landings

- Render district, country, territory, and school landing pages from shared templates and permitted configuration.
- Support a controlled set of reusable sections: hero, rich content, card/listing, contacts, map, links, document list, media, call to action, and news feed.
- Support inherited branding and navigation with approved local overrides.
- Make every landing responsive and accessible.

### Articles And Media

- Create, edit, preview, publish, unpublish, schedule, and archive articles.
- Assign owner organisation, author, category, cover image, publication date, and visibility scope.
- List and filter articles at the appropriate district, country, territory, and school contexts.
- Upload and manage approved images and documents with metadata and source attribution.

### Migration

- Inventory Joomla and selected school sources before importing.
- Map organisations, pages, articles, media, documents, menus, and legacy URLs to the new structure.
- Import approved records repeatably, retain a source reference, validate totals, and report failures.
- Configure and test redirects for high-value legacy URLs before launch.

## Non-Functional Requirements

- Spanish-first content authoring and public experience; language expansion must not be precluded.
- Least-privilege access control and server-enforced tenant isolation.
- Privacy, retention, and country-specific data-policy requirements validated before accepting personal data.
- Backup, audit, migration rollback, accessibility, performance, and observability targets set during technical discovery.

## Acceptance Criteria

1. A school administrator cannot list, read, edit, publish, or administer a different school's protected records.
2. A country administrator can manage only their country and authorised descendants.
3. District administrators can create and administer all levels of the hierarchy.
4. Each tenant level can publish an approved landing configuration and scoped articles to a canonical path.
5. Migration reports reconcile imported records against the approved source inventory, including exceptions.
6. Approved legacy URLs redirect to their canonical destination without redirect loops.

## Explicitly Out Of Scope For The First Delivery Definition

- Rebuilding school-specific student, parent, learning, payment, HR, or ERP systems.
- A free-form site builder that allows arbitrary code or ungoverned layouts.
- Committing to a cloud, database, identity, CMS, or operations vendor before discovery.
- Full migration of every independently operated school site before its content and ownership are inventoried.
