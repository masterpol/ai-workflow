# State report

`/state` answers "what is this project and where does it stand?" with a snapshot every reader can
check. It is derived, non-authoritative output: `.project/status.md` and `.project/runs/` remain
the lifecycle authorities, and a stale or wrong report is fixed by regenerating it, never by
editing it.

## Run it

```sh
node ai-framework/scripts/state-snapshot.mts            # preview: counts by status, writes nothing
node ai-framework/scripts/state-snapshot.mts --json     # full snapshot on stdout
node ai-framework/scripts/state-snapshot.mts --apply    # write .project/reports/state.json
```

Then render the page from that snapshot:

```sh
node ai-framework/scripts/state-render.mts              # preview: theme mode, changed sources, size
node ai-framework/scripts/state-render.mts --apply      # write state.html and theme.json (atomic)
```

`state-render.mts` needs `state.json` (run the snapshot with `--apply` first) and refuses a
snapshot whose `schemaVersion` it does not know.

`--root <dir>` targets another project; `--now <ISO time>` fixes the clock so output is
reproducible. Generated files in `.project/reports/` are git-ignored.

## Snapshot contract (`schemaVersion: 1`)

Every leaf is a fact: `{ value, status, evidence: [project-relative paths], note? }`.

| Status | Meaning |
|---|---|
| `observed` | Read directly from a cited file. |
| `proposed` | The source states a direction or proposal, not a decision (a heading such as "Proposed", "Direction", "Stated"). |
| `unconfigured` | The source says the area is undecided, or nothing exists for it yet. |
| `stale` | Observed, but older than it should be (token snapshot > 7 days; `graph.json` older than a knowledge entry; a bare `VERSION` that sync never updates). The `note` says why. |
| `unavailable` | Could not be read. The `note` always says why; nothing is guessed. |

Sections: `workflow` (installed version, last sync, partial-sync attention), `project`
(product, README, architecture, technology), `database`, `pitches` (active, shipped, and compacted
ones from `done-work.md`), `doneWork`, `knowledge`, `skills` (installed skills, caveman coverage),
`metrics`, `runs`. A section that cannot be built is `unavailable` on its own; the others still
report.

## What it reads, and what it never does

Reads a fixed allowlist: `.project/{status.md, runs/, pitches/*/{pitch,hill,SHIPPED}.md,
done-work.md, graphify-out/graph.json, skills/{registry,modes}.json, .bundle-sync.json,
metrics/token-consumption.json, context/{product,architecture,stack}.md}`, `README.md`,
`VERSION`, the root `package.json` (for `repoShape` and entry points), `.project/pitches/_followups.md`, per-pitch `audit.md` and `log.md`, and for compacted pitches only the newest `.project/compaction/archives/<slug>-<ISO>/files/{audit,pitch}.md` (the `audit-cycle-N.md` files are listed by name, never read), a bounded scan for checked-in schema/migration files, and a bounded listing of directory *names* (depth ≤ 3, ≤ 500 entries, no file contents) for the folder diagram and project-type detection.

Never reads `.env*`, `credentials.json`, `settings.local.json`, or session transcripts. The one
child process it starts is this bundle's own `skill-sync.mts reconcile` (read-only preview, 15 s
timeout); it never runs a script that the analyzed project supplies. Never opens
a database or network connection, so a database is reported `unconfigured` or, when schema files
are checked in, `observed` as "schema files exist" with the note that live deployment state is
not inferred. Symlinked sources and paths that resolve outside the project are refused. Every
captured string is bounded (300 characters) and scrubbed of credential-shaped text — keyword
assignments (`DB_PASSWORD=`, `client_secret :`, quoted `"password": "…"`), `Bearer`/`Basic`
headers, JWTs, provider tokens (`AKIA…`, `sk_live_…`, `ghp_…`, `github_pat_…`, `AIza…`, `xox…`),
credentials in URLs, and whole private-key blocks; the count is in `redactions`. The scrub is a
best-effort second layer, not a guarantee: the primary controls are the fixed source allowlist and
never reading secret-bearing files. Look-alike Unicode (a Cyrillic "о" in "passwоrd") and free-text
phrasing ("the password is …") are not caught, so keep credentials out of the context files `/state`
summarizes. Markdown sources
are read only up to 64 KB and every parsing pattern is linear, so a hostile file cannot stall the
report. Error text is never copied into the snapshot (only a code such as `EACCES`), directories
such as `.project/runs`, `.project/pitches`, and the knowledge folders are refused when they are
symlinks, and a FIFO or symlink standing in for `hill.md`/`SHIPPED.md`/`done-work.md` counts as
absent. Text printed to the terminal has control characters replaced.

## Reading the token metrics

The reader accepts token snapshot revisions 1, 2 and 3 and ignores fields it does not know.
An unrecognized version is reported `unavailable: unsupported token snapshot schemaVersion`.
Completeness is `measured` (every completion reported usage), `partial` (some did), or
`unavailable` (none did); a partial snapshot is never presented as a total.

## Installed version

The sync marker (`.project/.bundle-sync.json` `sourceVersion`) is authoritative. A bare `VERSION`
file with no marker is reported `stale`: it records the bundle that was unpacked, and
`bundle-sync` never updates it. With neither, the version is `unavailable`.

## The HTML report (multipage)

`state-render.mts --apply` writes a linked set in `.project/reports/`: `index.html`, `structure.html`,
`skills.html`, `metrics.html`, `knowledge.html`, `pitches.html`, and `state.html` (the full single-page
report, kept). All pages share one sidebar nav, one header (project, workflow version, generated time) and one stylesheet, both owned by `state-design.mts`, and obey the rules below. The CSP meta is the first child of `<head>`; the sidebar stacks above the content at 640px or narrower and is hidden in print. The set is written
through `.project/reports/.state-stage`, which is both staging area and lock: it is created without
recursion, an existing one refuses the run (a crash can leave one; delete it by hand after checking
nothing else is rendering), the directory identity of the staging and reports directories is pinned
and rechecked before each write and rename. Generated pages are only ever overwritten, never deleted:
the page set is fixed, so there is nothing to retire, and an existing generated-set filename without the
`<!-- generated by state-render -->` ownership marker is skipped and reported by name in both the result
and CLI output. The sole migration exception is unmarked `state.html`, which older installations
generated; its first update adds the marker. Marked generated-set pages may be replaced. Files outside
the fixed generated set are always left alone, even if marked. A failed write reports just the error code and a project-relative name
(`.project/reports: EACCES`), never an absolute path; a directory swap mid-write reports
`report directory changed while writing; N of M pages were already replaced`. Each page is capped at
512 KB: a larger one is rebuilt with fewer pitch rows, decision rows, evidence links and folders, and if
it still does not fit with none of them it becomes a short "page omitted: exceeds size cap" notice;
the full `state.html` uses the same cap and becomes an omitted notice when oversized. Project name, readme title and every state.json string are bounded,
and only string, number and boolean values are ever printed (anything else renders empty), so a
hand-edited `state.json` degrades one section, never the render. Fact traversal stops past depth 32
with a fixed `[depth limit]` unavailable fact; value rendering also has a hard depth-32 guard and
a shallower display limit. Unexpected CLI errors use fixed `internal error` text.

The directory identity checks reduce substitution risk but cannot eliminate it: subsequent operations
use paths, and Node provides no `openat` API here. A local process with write access can race the
checks and writes or renames. This residual race is accepted; the report is a local derived artifact.

- **structure.html** — folder-structure diagram of the snapshot's `structure.tree` (names only, depth ≤ 3,
  ≤ 500 entries), a project-type badge, and per-folder links to the decision records
  (`.project/knowledge/decisions/`, `.project/design/decisions/`) that mention it. Folders with more than
  8 children fold into `<details>` (open at the top level, collapsed below; always expanded in print),
  a role is printed only when known, and each adapter `skills` folder (`.claude/skills` and its mirrors)
  shows one "N skills" line instead of every child.
- **index.html** — headline cards (active pitches, shipped, knowledge entries, completions with how many reported usage, sync attention), each a value or an `unavailable` chip, never a guessed 0, plus the pitches-by-phase and completions-by-vendor charts. Charts are inline SVG from `state-charts.mts` (at most 8 bars plus "other (N more)", labels allow-listed, no script, `style=` or `url()`), each with a data table; `knowledge.html` charts entries by type, `structure.html` subfolders per top-level folder, `pitches.html` pitches by phase, `metrics.html` completions by vendor. The slots `overview`, `architecture`, `history`, `risks` and `tokens` are empty until reviewed AI fragments exist.
- **skills.html** — base skills (subdirectories of `.claude/skills`) and project skills (registry entries),
  stacked under their own headings; the base table omits the constant phase, scope and status columns.
- **knowledge.html** and **metrics.html** — counts and status, plus links to `graphify-out/graph.html`,
  `graphify-out/GRAPH_REPORT.md`, `.project/metrics/token-consumption.html` and
  `.project/metrics/workflow-usage.html`, each linked only when that file exists inside the project and is
  not behind a symlink; otherwise the page says it is unavailable. When token completeness is partial,
  metrics.html opens with the reported/total counts from the snapshot. Those linked pages are generated by other tools and may use scripts; the state pages never do.

### Snapshot additions (still `schemaVersion: 1`)

`structure` (`projectType`, `detectedTypes`, `repoShape`, `limits`, `tree[]`, `decisions[]`) and `skills.base[]` /
`skills.project[]`. Each is an array of facts or, when it cannot be built, a single `unavailable` or
`unconfigured` fact. `projectType` is `workflow-bundle`, `web`, `backend`, `mobile`, `ai-prompts`, `mixed`
(lists every detected type) or `unknown`, decided from names present only, never file contents. The scan
skips `node_modules`, `.git`, build output, symlinks and secret-shaped names, and excludes
`.project/reports` itself. One shared `isSecretName` policy from `state-structure.mts` filters folder
names, decision source filenames, base-skill directory names, and every evidence-path component. It
refuses `.env*`, `credential*`, `settings.local.json`, names containing `secret`, private-key names,
`.npmrc`/`.netrc`/`.pypirc`, and `.pem`/`.key`/`.p12`/`.pfx`/`.keystore`/`.jks` suffixes before reads
or evidence-file inspection. Base skills are capped at 200 safe directories. An older `state.json` without these keys still renders; the pages show them as unavailable.

### Single-page details

`state.html` is one self-contained file: inline stylesheet, no scripts, no external
loads, and a `Content-Security-Policy` meta (`default-src 'none'; style-src 'unsafe-inline'`).
Every project-supplied string is HTML-escaped where it is written. An evidence path becomes a
link only if it is project-relative, made of plain path characters, free of secret-shaped names in every path component, not behind a symlink, and a real file inside the
project; `javascript:`, `data:`, absolute, `../`, and external URLs render as plain text. The page
has `lang`, header/nav/main landmarks (one region per section, not per table), ordered headings,
captioned tables with header scopes, keyboard-focusable labelled scroll groups whose row headers
stay pinned on narrow screens, a viewport meta, a print stylesheet, and `prefers-color-scheme`
support. A status summary and the legend sit above the data; every non-`observed` status has a
heavier dashed outline as well as its text, so the exceptions are visible without relying on color.
Long paths and hashes wrap. Missing metrics or database evidence render as a labeled
`unavailable`/`unconfigured` row, never blank or zero.

### Theme

Precedence: (1) a `repoShape` of exactly `"monorepo"` always uses the workflow default theme and never scans the tree or reads any stylesheet (the scan would mix package themes); any other value, including a hostile one, means `single`; (2) `themeMode: "fallback"` in `settings.json` forces the default; (3) otherwise the theme is discovered, below. `repoShape` is `monorepo` for a root `pnpm-workspace.yaml`, `lerna.json` or non-empty `package.json` `workspaces`, or for two or more sibling manifests under `packages/`, `apps/`, `libs/`, `services/` or `modules/`; `turbo.json` or `nx.json` alone, one sibling, or anything unreadable is `single`. There is no upward walk, and the only file content read is the root `package.json` (at most 64 KB, shape only). `theme.json` records the `repoShape` used.

Discovered on every render from the project's own CSS (at most 200 stylesheets, 256 KB each,
skipping `node_modules`, `.git`, `.project`, build output, and symlinks): shadcn-style custom
properties (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`,
`--muted-foreground`, `--border`, `--radius`, `--font-sans`, `--font-mono`, in `:root` and
`.dark`) and Tailwind v4 `@theme` `--color-*` aliases. A value is **parsed, not copied**: only hex,
`rgb()`, `hsl()` (including shadcn's bare `240 10% 4%` form), lengths, and bounded quoted or unquoted font-family
lists are accepted, and colors are re-emitted as `#rrggbb`. Anything else — `url(`, `;`, braces,
`<`, `expression`, `!important`, unresolved `var()` indirection, `oklch()` and other color spaces
whose contrast cannot be checked — is rejected and recorded in `theme.json` under `rejected`.
Font names accept ASCII letters, numbers, spaces, underscores and hyphens (at most 200 input
characters). Quoted names are re-emitted with double quotes. A font may reference one custom
property in the same stylesheet with `var(--name)`: the last declaration for that mode wins,
and dark mode can inherit a light/root value. Nested references, cycles, fallbacks in `var()`,
and references to another file are rejected. Stylesheet discovery precedence remains unchanged.

Contrast is checked for every text/background pair the page uses (4.5:1, WCAG AA). A group that
fails, is incomplete, or uses an unverifiable value falls back to the workflow default (slate surface, one blue accent, system fonts)
theme *for that group only*, with the reason recorded; if the assembled mode still fails
(a discovered dark background under a fallback accent), that whole mode falls back. A project with
only a light theme gets the fallback dark mode. `.project/reports/theme.json` records each source
file's SHA-256; a changed, added, or removed source is reported as `changed:` on the next render.
That file is a record only: the theme is always recomputed from the stylesheets, never read back.

`.project/reports/settings.json` — `{ "schemaVersion": 1, "themeMode": "auto" | "fallback" }` —
lets a project force the fallback. It lives under `.project/`, which bundle-sync never writes, so
it survives every sync (regression-tested). An invalid file is ignored with a note.

## Deep evidence (still `schemaVersion: 1`)

Four additive top-level sections give the `/state` AI step facts to cite for its `architecture`, `history`,
`risks` and `tokens` slots. They are built only from bounded reads of files the snapshot already trusts, plus the
root `package.json`. Nothing runs Graphify, `uv`, `git`, a project script or the network; `graphify-out/graph.json`
and every manifest are untrusted data. The version stays `1`: purely additive keys need no bump, and changing the
meaning or shape of an existing path needs a bump (pinned by the test "schemaVersion stays 1: additive keys only").
An older `state.json` simply lacks the new keys and still renders; a fragment citing a new path against it is
rejected as `unknown-fact`. The top-level `architecture` here is distinct from `project.architecture`
(the prose summary of `.project/context/architecture.md`).

**Citing a path.** A fact is unwrapped before each path segment, so a bound number names the fact, then its
fields: `risks.openFollowups.open`, `tokens.totals.total`, `risks.mostConnected.items.0.degree`. A sub-field (see
below) is not a fact, so it needs an explicit `.value`: `history.items.0.audit.value.mustFix`.

**Sub-field rule.** Inside a fact's `value`, a part that can be missing is `{ value, availability, reason? }` with
`availability` one of `observed`, `partial` or `unavailable`. A value never carries both `status` and `evidence`,
so `facts()` sees real facts only and no fact nests inside another (contract test "no nested facts").

| Path | Content | Notes |
|---|---|---|
| `architecture.modules` | `{ count, items[{ module, files, tests }], rootFiles, capped }` | module key: the first two directory segments of a code file, split one level deeper when one module holds more than 60% of files and has two or more groups; kept only if it is a `structure.tree` path |
| `architecture.imports` | `{ pairs, edges[{ from, to, count }], externalEdges, capped }` | module pairs, at most 100; external and unresolved targets are only counted |
| `architecture.graph` | `{ nodes, links, builtAtCommit, mtime, limits, treeAgreement }` | `stale` after 7 days; `builtAtCommit` only if 40 hex characters |
| `architecture.entryPoints` | root `package.json` `main` and `bin` paths | safe relative paths to real files, at most 10 |
| `architecture.packages` | monorepo package map | `unavailable` ("deferred to followup pitch state-monorepo-packages") |
| `history.items[]` | one per pitch: slug, phase, appetite, shipped, `scopes`, `lessons`, `lessonsTotal`, `audit`, `revisions`, `dates` | each sub-field has `availability`; a missing or unrecognized source is `unavailable` with a reason, never 0 |
| `history.cooldowns`, `history.limits` | cooldown run names; rejected slugs and caps | |
| `risks.mostConnected` | top 10 code symbols by **graph degree** with file evidence | degree is connectivity, not defect risk |
| `risks.testFiles` | `{ code, test, ratio }` | `ratio` is `null` when either count is 0 |
| `risks.staleKnowledge` | `{ count, ids, capped, undated }` | `updated` more than 60 days before `--now` |
| `risks.openFollowups` | `{ sections, open }` | counts `## ` sections without a `**Resolved`, `**Done` or `**Shipped` line; not a count of items |
| `risks.todoMarkers` | always `unavailable` | TODO counts need file contents |
| `tokens.totals` | lifetime `input`, `output`, `reasoning`, `cacheRead`, `cacheWrite`, `total` | copied, never summed (`total` excludes `cacheRead`); note "from N of M completions that reported usage" |
| `tokens.byModel[]` | `{ vendor, model, bucket, completions, reportedUsage, tokens }` | at most 20 per vendor; `tokens` is `null` when no completion in the row reported usage; `(unreported)` and `(other)` are buckets |
| `tokens.flows[]` | `{ pitch, bucket, completions, reportedUsage, tokens, scopeDivergence }` | top 20 from token snapshot revision 3 `flows`; `unavailable` when absent; joined to `history` by slug only, buckets never; no resolver is called |

**Graph caps and agreement.** A `graph.json` over 16 MiB, or one beyond 50,000 nodes or 200,000 links, makes the
graph-derived facts `unavailable` (over 16 MiB) or `stale` with `limits.truncated`. Nodes and links are validated
one by one (string ids, a closed set of relations, charset-allow-listed relative `source_file`); prototype-named ids
cannot reach `Object.prototype`. The graph is compared with `structure.tree` by directory prefix: with at least
10 checkable files, agreement of 0.9 or more keeps the facts' own status, 0.5 to 0.9 makes `modules`, `imports`,
`mostConnected` and `testFiles` `stale`, and below 0.5 they are `unavailable`.

**Audit formats.** Only `## Must-fix (cycle N)` and `## Cycle N` with a `### Must-fix` table are counted, plus
`audit-cycle-N.md` file names for cycles. `mustFix` is a number only when every cycle has a table, with refuted rows
excluded. Every other format is `unavailable`, never 0. The scanners walk lines with `indexOf`; no regex sees a
whole file.

**Budgets.** `architecture` and `history` 256 KiB each, `risks` and `tokens` 32 KiB each (compact JSON). A section
over budget halves its lists, then keeps counts only, and is marked `stale` with "shrunk to ..." in the note. The
pretty-printed file stays under 960 KiB (the renderer reads at most 1 MiB); past that, `risks`, `history`,
`architecture` and `tokens` shrink to counts in that order.

**Clock-derived paths.** `generatedAt`, `architecture.graph.value.mtime`, the status of `architecture.graph` and of
the facts that inherit its age, `risks.staleKnowledge`, `tokens.totals` and `metrics` move with `--now`.
`state-ai-authoring`'s snapshot hash must exclude them.

**Ownership.** Record-derived counts (audit cycles and must-fix, revisions) live here; `token-time-report` reads
them by slug and keeps only event-derived transitions. Token totals and by-model rows live here; the flow report
owns per-flow rows.

## Related

`/pitch-compress` does not call `/state`; run it separately after compaction if you want the
report to reflect compacted pitches.

## State fragment sanitizer (library, not wired)

`state-fragment` is a library for untrusted HTML/SVG fragments that a later report step may want to
inject. **It is not wired.** No report renderer or authoring consumer calls it, and no page or snapshot
path renders fragments today. The `overview`, `architecture`, `history`, `risks` and `tokens` slots stay
empty. Injection belongs to `state-ai-authoring`, whose implementation is still unbuilt. Until it is,
these modules are tested building blocks with no runtime effect.

Modules: `state-fragment-parse.mts` (strict XML-subset parser), `state-fragment.mts` (allow-list,
content model, canonical output), `state-fragment-evidence.mts` (citation check against a snapshot).
Tests: the `state-fragment*.test.mts` files. Changes to these modules require independent code and
security review in `/audit`; authoring and injection receive their own review when implemented.

### API

```ts
sanitizeFragment(text: unknown, options?: Options): { ok: true; html: string; citations: Citations } | Rejection
rejectionMessage(rejection: Rejection): string
checkCitations(citations: Citations, snapshot: unknown, root: string, deps?: RuntimeDeps): { ok: true } | Rejection
```

- `sanitizeFragment` returns canonical HTML and the collected citations (`hrefs`, bound `numbers`,
  `unbound` ASCII digit-run count). It always parses the input and re-emits canonical markup, so the output can
  differ from the input. It does not decide whether a citation is true.
- `checkCitations` is a **separate, mandatory** step. Accepted sanitizer output still needs
  `{ ok: true }` from it before any injection. It checks that every href is a project-relative evidence
  path of some snapshot fact and passes the shared file check, that every bound number equals the
  snapshot value it names, and that no ASCII digit run in text is unbound. It reads no fragment file and
  writes nothing.
  Claims written as words or other numeral systems remain authoring-step review responsibilities.
- `Options`: `classes`, `tokens`, `markers` (each an array of up to 50 identifiers) and `limits`
  (partial, key by key). Unknown keys, non-plain objects, and any `limits.maxDepth` above 20 are refused
  as `invalid-options`. The defaults are the intended values; overrides exist mainly for parser tests.
  Limits are validated into one plain snapshot before both parse passes. Option lists and citation
  data use bounded own-data copies, avoiding getter and custom-iterator values.
- `rejectionMessage` formats a rejection from its validated parts only.

### Defaults and caps

| Cap | Default | Applies to |
|---|---|---|
| `maxBytes` | 65536 | UTF-8 input, and canonical output |
| `maxDepth` | 20 | element nesting, self-closed elements included; validator limit 20 |
| `maxNodes` | 2000 | elements and text nodes |
| `maxAttrs` | 12 | attributes per element |
| `maxAttrValue` | 512 | any attribute value except `d` |
| `maxPathD` | 8192 | `d` attribute |
| `maxText` | 4000 | one text run |
| `maxName` | 32 | element and attribute names |

Also fixed: at most 50 citations (hrefs plus numbers) per fragment and per `checkCitations`; a `data`
child is at most 64 characters and a plain decimal; geometry numbers are finite with magnitude at most
1e6. Canonical output is parsed again under the same limits, so escaping or number expansion cannot
exceed them.

### Allow-list and defaults

- HTML: `h2 h3 h4 p ul ol li table caption thead tbody tr th td code pre strong em span a data`.
  Self-closed HTML names are refused, since a browser would open them.
- SVG: `svg g rect circle ellipse line polyline polygon path text tspan title desc`. A `tspan` requires
  a `text` parent and contains text only.
- Colors: `fill` and `stroke` accept only `var(--token)` where the token is in `tokens`. Default tokens
  are seven names: `background`, `foreground`, `primary`, `primaryForeground`, `muted`,
  `mutedForeground`, `border`. Also `none`.
- Classes: none allowed by default (`classes` is empty), so no page classes. `status`, `status-*` are
  always refused.
- Markers: `marker-arrow` only by default; a marker option must start with `marker-`.
- `href` is kept as given in canonical output and becomes a citation. Nothing trusts it on its own.
  `checkCitations` is what decides.

### Reason classes

Every rejection is `{ ok: false, reason, count, token }`. The reason is one of:

- Input and options: `input-type`, `invalid-options`.
- Parse: `invalid-unicode`, `control-character`, `syntax`, `size-limit`, `depth-limit`, `node-limit`,
  `attribute-limit`, `attribute-length`, `path-length`, `text-length`, `name-length`, `doctype`,
  `entity-declaration`, `cdata`, `comment`, `processing-instruction`, `namespace-prefix`,
  `character-reference`, `unclosed`, `mismatched-close`, `duplicate-attribute`, `unquoted-attribute`.
- Allow-list and content: `element-not-allowed`, `event-handler`, `style-attribute`, `id-attribute`,
  `url-reference`, `script-scheme`, `attribute-not-allowed`, `class-not-allowed`, `color-not-token`,
  `marker-not-allowed`, `content-model`, `geometry-invalid`, `citation-limit`.
- Citation check: `traversal`, `absolute`, `scheme`, `percent`, `backslash`, `secret-path`,
  `transcript-path`, `unsafe-path`, `evidence-not-in-snapshot`, `unknown-fact`, `not-a-number`,
  `number-mismatch`, `unbound-number`.

`count` is a clamped integer from 1 to 999999.

### Rejection messages never echo content

`rejectionMessage` returns `fragment rejected: <reason> (<count>)` with ` at <name>` or ` at (other)`
appended. The name is at most one token-grammar name (lowercase first letter, then letters, digits or
hyphens, up to 32 characters). Attribute values, text, and source slices never appear. A name that
fails the grammar shows as `(other)`. The final string must match a closed grammar and fit in 120
characters; if it does not, the message is the fixed `fragment rejected: syntax (1)`.

## State fragment injection (`state-fragment-inject.mts`)

`status`, `stamp` and `check` carry reviewed AI fragments into the report. The script never calls a model. Its
only writes are inside `.project/reports/fragments/`.

### Snapshot hash

The hash is SHA-256 of the snapshot's canonical JSON (keys sorted, depth at most 32) with the clock-derived paths
below removed. A path that does not exist is a no-op. `state.json` itself is written exactly as before.

<!-- volatile-paths:begin -->
- `generatedAt`
- `metrics.value.updatedAt`
- `metrics.status`
- `metrics.note`
- `knowledge.status`
- `knowledge.note`
- `risks.staleKnowledge`
- `architecture.graph.value.mtime`
- `architecture.graph.status`
- `architecture.graph.note`
<!-- volatile-paths:end -->

Counts such as `metrics.value.completions` still change the hash, so slots go stale after most completions. That is
the conservative behavior; per-slot hashes are out of scope.

### AI analysis fragments

Five optional slots hold short analysis written by the authoring model in the `/state` session and carried into the
report by `state-fragment-inject.mts`. The script never calls a model; the skill's Step 3 tells the model what to write.

| Slot | Page |
|------|------|
| `overview`, `risks` | `index.html` |
| `architecture` | `structure.html` |
| `history` | `pitches.html` |
| `tokens` | `metrics.html` |

`state.html` never carries a fragment. With no `.project/reports/fragments/` directory the pages are unchanged. Once the
directory exists, a slot without a usable fragment shows one line, "No AI analysis shown: <code>", with a closed reason code.

- **Files.** `<slot>.draft` (written by the model, at most 64 KB), `<slot>.fragment` (written only by `stamp`) and
  `.round.json`. `.project/reports/fragments/` is the only place the script writes. It must be a real directory
  (no symlink); any other file name there is counted and ignored.
- **Header** of a `.fragment` (LF only, at most 1,024 bytes, fixed order): `state-fragment 1`, `slot <slot>`,
  `snapshot <64 hex>` (optional), `body-sha256 <64 hex>`, `model <id or unknown>`, `stamped <ISO time>`, `---`, then the
  sanitizer's canonical body. A missing or non-hex `snapshot` line means stale; a broken header means invalid.
- **States.** `fresh` (header hash equals the current snapshot hash), `stale` (an older snapshot), `missing`, `invalid`
  (with a reason code). A stale fragment is shown with "Written against an older snapshot" unless
  `state-render.mts --apply --strict-fragments` hides it. Every load re-runs the whole check (sanitizer, citations, slot
  rules, canonical form, body hash), so `status`, `check` and the page agree.
- **Commands.** `state-fragment-inject.mts status` reports each slot and starts a new round (attempts reset).
  `stamp --slot <slot> --model <id>` validates the draft, writes the fragment and removes the draft; it allows two attempts
  per round and refuses a draft older than the round. `check --slot <slot>` replays the loader's verdict for a stamped
  fragment; `check --slot <slot> --draft` previews a draft. None of them calls a model or the network.
- **Summary line.** Every render prints `AI analysis: N fresh / N stale / N missing`, adding `/ N invalid` and a count of
  fragments hidden by `--strict-fragments`. `render --json` carries `fragments.<slot>.state` with closed reason codes only.
- **Label.** Every fragment sits inside "AI analysis (proposed, not observed)" with its evidence list, the model id,
  "reported by the authoring session, not verified", the stamp time and the first 12 characters of the hash. The model id
  and the stamp time are claims, not proof: with no secret to sign with, the hash is a staleness hint and the retry cap
  and draft-age check are workflow aids, not security boundaries. A same-user process racing the script can still redirect
  a single write or delete inside `fragments/`; this is accepted and recorded in the build deviations.
- **What is verified.** Live runs on 2026-10-20 (72 runs, Claude Code, OpenCode and Codex, graded blind by a different
  model): the step works on Claude Code and Codex (21 and 20 of 24 graded pass) and fails half the time on OpenCode with a
  small model (10 of 24); the live claim is recorded as blocked. Cursor was not run.
