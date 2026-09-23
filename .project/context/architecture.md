# Architecture Context

## Proposed Shape, Not a Final Decision

One application serves multiple public site contexts from one canonical domain. The route identifies the public context, and the organisational hierarchy determines which content and configuration may be shown or edited.

Example public paths:

```text
/
/{country}
/{country}/{territory}
/{country}/{territory}/{school}
/{country}/articles/{article-slug}
```

The final URL and legacy-domain strategy requires approval after the organisation inventory is complete.

## Tenant Model

```text
District
  Country
    Territory (optional and country-defined)
      School
```

- Every organisation node has a stable identifier, slug, status, contact data, and configurable public presentation.
- Content belongs to one organisation node and may be visible only in that node, inherited by descendants, or promoted according to an approved publishing rule.
- Landing configuration inherits from district to country to territory to school. A child can override only allowed fields and approved page sections.
- Users have memberships and roles scoped to one or more organisation nodes. Permissions apply to the assigned node and, where intended, its descendants.

## Access-Control Direction

| Role | Intended scope |
|---|---|
| Platform administrator | Entire district, tenancy, global settings, accounts, and support |
| District editor/publisher | District content and approved shared assets |
| Country administrator | Assigned country and descendants; local users and configuration |
| Territory administrator | Assigned territory and descendant schools |
| School administrator | Assigned school users, landing configuration, and publication workflow |
| Author/editor | Assigned content scope; cannot manage users or protected settings |
| Reviewer/publisher | Assigned content scope; approves publication if a workflow is required |

Exact role names, permissions, approval workflow, and delegation rules remain discovery decisions.

## Content Direction

- Structured pages and landing blocks, rather than unrestricted page-builder code.
- Article/blog records with author, owner organisation, audience/scope, publication state, lead media, categories, and revisions.
- Central media and document records with ownership, metadata, usage references, and lifecycle controls.
- Redirect records for legacy Joomla URLs and approved school-domain mappings.

## Undecided Components

- Database and data-access approach.
- Authentication provider, identity federation, invitation flow, and password policy.
- Hosting, CDN, file storage, backup, monitoring, CI/CD, and environments.
- Search, analytics, email, forms, anti-spam, and translation approach.
- CMS/editor implementation and the migration extraction method.
