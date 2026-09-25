# State report

`/state` answers "what is this project and where does it stand?" with a snapshot every reader can
check. It is derived, non-authoritative output: `.project/status.md` and `.project/runs/` remain
the lifecycle authorities, and a stale or wrong report is fixed by regenerating it, never by
editing it.

## Run it

```sh
node ai-framework/scripts/state-snapshot.js            # preview: counts by status, writes nothing
node ai-framework/scripts/state-snapshot.js --json     # full snapshot on stdout
node ai-framework/scripts/state-snapshot.js --apply    # write .project/reports/state.json
```

Then render the page from that snapshot:

```sh
node ai-framework/scripts/state-render.js              # preview: theme mode, changed sources, size
node ai-framework/scripts/state-render.js --apply      # write state.html and theme.json (atomic)
```

`state-render.js` needs `state.json` (run the snapshot with `--apply` first) and refuses a
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
done-work.md, knowledge/graph.json, skills/{registry,modes}.json, .bundle-sync.json,
metrics/token-consumption.json, context/{product,architecture,stack}.md}`, `README.md`,
`VERSION`, and a bounded scan for checked-in schema/migration files.

Never reads `.env*`, `credentials.json`, `settings.local.json`, or session transcripts. Never opens
a database or network connection, so a database is reported `unconfigured` or, when schema files
are checked in, `observed` as "schema files exist" with the note that live deployment state is
not inferred. Symlinked sources and paths that resolve outside the project are refused. Every
captured string is bounded (300 characters) and scrubbed of credential-shaped text; the count is
in `redactions`.

## Reading the token metrics

The reader accepts token-snapshot schema versions 1 and 2 and ignores fields it does not know.
An unrecognized version is reported `unavailable: unsupported token snapshot schemaVersion`.
Completeness is `measured` (every completion reported usage), `partial` (some did), or
`unavailable` (none did); a partial snapshot is never presented as a total.

## Installed version

The sync marker (`.project/.bundle-sync.json` `sourceVersion`) is authoritative. A bare `VERSION`
file with no marker is reported `stale`: it records the bundle that was unpacked, and
`bundle-sync` never updates it. With neither, the version is `unavailable`.

## The HTML report

One self-contained file, `.project/reports/state.html`: inline stylesheet, no scripts, no external
loads, and a `Content-Security-Policy` meta (`default-src 'none'; style-src 'unsafe-inline'`).
Every project-supplied string is HTML-escaped where it is written. An evidence path becomes a
link only if it is project-relative, made of plain path characters, not secret-shaped (`.env*`,
`credentials*`, `settings.local.json`, keys), not behind a symlink, and a real file inside the
project; `javascript:`, `data:`, absolute, `../`, and external URLs render as plain text. The page
has `lang`, header/nav/main landmarks, ordered headings, captioned tables with header scopes,
keyboard-focusable scroll regions, a viewport meta, a narrow-screen layout, a print stylesheet,
and `prefers-color-scheme` support. Missing metrics or database evidence render as a labeled
`unavailable`/`unconfigured` row, never blank or zero.

### Theme

Discovered on every render from the project's own CSS (at most 200 stylesheets, 256 KB each,
skipping `node_modules`, `.git`, `.project`, build output, and symlinks): shadcn-style custom
properties (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`,
`--muted-foreground`, `--border`, `--radius`, `--font-sans`, `--font-mono`, in `:root` and
`.dark`) and Tailwind v4 `@theme` `--color-*` aliases. A value is **parsed, not copied**: only hex,
`rgb()`, `hsl()` (including shadcn's bare `240 10% 4%` form), lengths, and unquoted font-family
lists are accepted, and colors are re-emitted as `#rrggbb`. Anything else — `url(`, `;`, braces,
quotes, `<`, `expression`, `!important`, `var()` indirection, `oklch()` and other color spaces
whose contrast cannot be checked — is rejected and recorded in `theme.json` under `rejected`.

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
