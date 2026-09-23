# Product Context

## Product

La Salle Norandino will be a single-domain, multi-site public web platform for the district and its educational network. It replaces the fragmented presentation in which country and school experiences are split among independent domains and platforms.

## Users

- Public visitors seeking district, country, region, or school information and news.
- District administrators responsible for all tenants, shared brand content, and governance.
- Country administrators responsible for their country's descendants.
- Region administrators responsible for the schools within an assigned state, province, or equivalent territory.
- School administrators and editors responsible for their own landing page, articles, media, contacts, and approved configuration.

## Product Goal

Serve all sites from the canonical La Salle Norandino domain while enforcing organisational access boundaries:

`district -> country -> territory -> school`

“Territory” is the neutral product term for a state, province, department, or another country-specific intermediate level. It may be absent for organisations where the hierarchy does not need it.

## Core Capabilities In Scope

- Tenant hierarchy and scoped user administration.
- Public district, country, territory, and school landing pages under one domain.
- Configurable, brand-safe landing-page sections and navigation at each level.
- Article/blog publishing with drafts, media, categories, publication dates, and scope-aware visibility.
- Migration of approved content, media, documents, and redirects from the legacy district site and selected school sources.
- Operational controls for account lifecycle, content ownership, auditability, and delegated administration.

## Product Constraints

- The project is in definition only. No technical implementation, infrastructure, identity vendor, CMS vendor, database, or hosting decision has been made.
- The requested direction is a TypeScript application using TanStack Start and appropriate TanStack packages, Tailwind, Vite, and Ox tooling as needed. This is a proposal constraint, not an installed stack or a final package list.
- The public experience must be mobile and desktop usable, Spanish-first, and compatible with country-specific legal and contact content.
