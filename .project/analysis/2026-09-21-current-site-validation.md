# Current Site Validation

**Validated**: 2026-09-21
**Source**: public crawl of https://lasallenorandino.org/ and its `/colombia`, `/ecuador`, and `/venezuela` sections
**Limit**: this is public-site evidence, not an administrative export or database audit.

## Observed Platform

- The public site identifies itself as Distrito Lasallista Norandino and exposes a Joomla-style `robots.txt` with standard Joomla administrator, component, module, plugin, and cache paths excluded from crawlers.
- One shared district domain serves a district home page plus country sections at `/colombia`, `/ecuador`, and `/venezuela`.
- The home page provides district-level institutional pages, news, documents, external resources, videos, contact information, country entry points, and country-specific policy and hiring links.
- Country pages have distinct menus, institutional landing content, maps, documents, and lists of educational works.

## School Footprint Seen Publicly

| Country | School or educational-work links observed | Current delivery pattern |
|---|---:|---|
| Colombia | 11 | Predominantly links to separate school domains; some legacy `lasallenorandino.org` paths |
| Ecuador | 20 | Predominantly links to separate domains, `lasalleweb.ec` subdomains, or social pages |
| Venezuela | 9 | Predominantly links to `delasalle.org.ve` paths; one separate school domain |
| Total | 40 | Fragmented across the district site, independent sites, and external platforms |

These counts describe visible links, not confirmed unique legal entities, tenants, editors, pages, or migration records. They establish a minimum inventory for discovery.

## Content Classes To Account For

- District, country, and school landing-page content.
- News and article archives with image lead media.
- Institutional pages, menus, contacts, maps, social links, and calls to action.
- PDFs, policy documents, calendars, and other downloads.
- Image galleries, sliders, embedded video, and external integrations.
- External school sites and links, including the domains that may need preservation or redirection.

## Implications

1. A new single-domain application must support content ownership and presentation at more than one organisational level; a country-only model is insufficient.
2. Migrating the district Joomla content is a bounded source migration. Migrating every external school website is a separate, variable workstream that needs an inventory and source-access check before it can be committed.
3. A canonical path convention such as `/{country}/{region}/{school}` can satisfy the one-domain objective, but country-specific geographic labels must remain configurable because “state” is not universal across Colombia, Ecuador, and Venezuela.
4. Legacy URLs, school domains, PDFs, and search indexing require an explicit redirect and asset-retention plan. This is included in the programme estimate but cannot be sized precisely from public crawling alone.

## Evidence Gaps To Resolve In Discovery

- Joomla version, extensions, database access, content count, media size, and author/account records.
- Authoritative organisation list, including country, region/province/state, school status, and public URL ownership.
- Which external school sites are in scope for content migration versus a directory/profile and redirect only.
- Active users, required roles, approval processes, and identity-provider requirements.
- Retention, privacy, accessibility, multilingual, analytics, search, and legal requirements.
