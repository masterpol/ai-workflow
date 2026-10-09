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
`VERSION`, a bounded scan for checked-in schema/migration files, and a bounded listing of directory *names* (depth ≤ 3, ≤ 500 entries, no file contents) for the folder diagram and project-type detection.

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

The reader accepts token-snapshot schema versions 1 and 2 and ignores fields it does not know.
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
report, kept). All pages share one nav and stylesheet and obey the rules below. The set is written
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
- **skills.html** — base skills (subdirectories of `.claude/skills`) and project skills (registry entries),
  stacked under their own headings; the base table omits the constant phase, scope and status columns.
- **knowledge.html** and **metrics.html** — counts and status, plus links to `graphify-out/graph.html`,
  `graphify-out/GRAPH_REPORT.md`, `.project/metrics/token-consumption.html` and
  `.project/metrics/workflow-usage.html`, each linked only when that file exists inside the project and is
  not behind a symlink; otherwise the page says it is unavailable. When token completeness is partial,
  metrics.html opens with the reported/total counts from the snapshot. Those linked pages are generated by other tools and may use scripts; the state pages never do.

### Snapshot additions (still `schemaVersion: 1`)

`structure` (`projectType`, `detectedTypes`, `limits`, `tree[]`, `decisions[]`) and `skills.base[]` /
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
fails, is incomplete, or uses an unverifiable value falls back to the documented shadcn-style
(zinc) theme *for that group only*, with the reason recorded; if the assembled mode still fails
(a discovered dark background under a fallback accent), that whole mode falls back. A project with
only a light theme gets the fallback dark mode. `.project/reports/theme.json` records each source
file's SHA-256; a changed, added, or removed source is reported as `changed:` on the next render.
That file is a record only: the theme is always recomputed from the stylesheets, never read back.

`.project/reports/settings.json` — `{ "schemaVersion": 1, "themeMode": "auto" | "fallback" }` —
lets a project force the fallback. It lives under `.project/`, which bundle-sync never writes, so
it survives every sync (regression-tested). An invalid file is ignored with a note.

## Related

`/pitch-compress` does not call `/state`; run it separately after compaction if you want the
report to reflect compacted pitches.
