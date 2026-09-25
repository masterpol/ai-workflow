# Plan: Styled project state report

**Pitch**: [pitch.md](pitch.md)  •  **Appetite**: epic, decomposed into 2 sequential big-batch scopes  •  **Hill**: hill.md
**Depends on**: `portable-skill-installation`, `portable-skill-defaults`, `pitch-compaction` (all shipped 2026-09-25).
`.project/done-work.md`, the skill registry, `modes.json`, `skill-defaults.js report()`, and
`skill-sync.js reconcile` (read-only preview) all exist and are read here, never modified.

## Grounding: what the real code and data say (checked before writing scopes)

- **The token snapshot is about to change shape.** `.project/pitches/metrics-report-dimensions/` (a
  separate, planned, not-yet-started pitch that is not listed in `status.md`) bumps
  `.project/metrics/token-consumption.json` to `schemaVersion: 2` and adds per-model/agent/effort/
  skill aggregates. This pitch must therefore read the snapshot **tolerantly**: use only fields
  common to v1 and v2 (`schemaVersion`, `updatedAt`, `current`, `lifetime` totals and `vendors`),
  ignore unknown keys, and label an unrecognised `schemaVersion` "unsupported schema" rather than
  guess or crash. It reads the JSON only, never the collector's rendering code, so that pitch's
  planned `token-report.js` split cannot break it. No hard ordering between the two pitches;
  tests cover v1-shaped and v2-shaped fixtures so either can ship first.
- **`VERSION` is not synced.** `bundle-sync.js` reads the source `VERSION` only to record it in
  `.project/.bundle-sync.json` (`sourceVersion`, `lastSyncedAt`, `conflicts`, `keptLocal`); a
  project's own `VERSION` file stays whatever it was unpacked with (reproduced earlier: an old
  project still reads 2.3.0 after a sync). The pitch requires "the actual installed workflow
  version, not an assumed upstream version", so the installed version comes from the marker;
  a bare `VERSION` file is reported as "unpacked version, not updated by sync"; neither present is
  `unavailable`. Partial-sync state comes from the marker's `conflicts`/`keptLocal` plus the
  read-only `skill-sync.js reconcile` status.
- **This repo has no CSS, no Tailwind config, and no database schema.** The no-theme fallback and
  the "database unconfigured" path are what actually run here; themed and migration-present paths
  need fixtures. `.project/reports/` does not exist yet and is not gitignored (only
  `.project/metrics/` is).
- **Theme values become CSS in a generated page.** Discovered tokens come from arbitrary project
  CSS, so they are untrusted input that is later written into a `<style>` block: they are
  accepted only if they match a strict value grammar, never copied through.
- **Two existing files overlap with `metrics-report-dimensions`**: `workflow-doctor.js` (script
  list) and `harnesses.md`/`README.md` (docs). Small textual overlap only; whichever pitch ships
  second rebases those hunks.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| T1 | `/state` entry points and the structured evidence snapshot | 10 (+2 generated) | 800–1,000 | shipped pitches | — | No: defines the snapshot schema and source allowlist T2 consumes | — |
| T2 | Theme rediscovery, accessible escaped HTML, report validation | 9 | 700–950 | T1 (schema only) | — | No: small, and the renderer and theme grammar are reviewed together as one security surface | — |

Both are under the sub-pitch cap (15 files / 1,500 LOC). Cursor mirrors are materialized by the
existing `skill-vendors.js cursor-mirrors` command, not hand-written.

### T1 files
Create: `.claude/skills/state/SKILL.md`, `.agents/skills/state/SKILL.md`, `.opencode/commands/state.md`,
`ai-framework/scripts/state-snapshot.js`, `ai-framework/scripts/state-snapshot.test.js`,
`ai-framework/templates/project/reports/README.md`, `ai-framework/integrations/state-report.md`.
Update: `ai-framework/scripts/workflow-doctor.js` (script list), `.gitignore` (`.project/reports/`),
`VERSION`, `CHANGELOG.md`. Generated: `.cursor/skills/state/SKILL.md`, live `.project/reports/README.md`.
Every new skill must carry the caveman instruction (`workflow-doctor.js` now fails otherwise).

### T2 files
Create: `ai-framework/scripts/state-theme.js`, `ai-framework/scripts/state-render.js`,
`ai-framework/scripts/state-html.test.js`.
Update: `.claude/skills/state/SKILL.md` (HTML step; same file T1 created), `ai-framework/integrations/state-report.md`,
`ai-framework/scripts/workflow-doctor.js` (script list), `ai-framework/scripts/bundle-sync.test.js`
(settings survive a sync), `VERSION`, `CHANGELOG.md`.

## Concrete contracts

### Sources and authorities (read-only, allowlisted)

The snapshot reads only: `.project/status.md` and `.project/runs/` (lifecycle authorities),
`.project/pitches/*/{hill.md,SHIPPED.md,pitch.md}` (title, appetite, hill rows), `.project/done-work.md`
(section headings only), `.project/knowledge/graph.json` (generated), `.project/skills/{registry.json,modes.json}`,
`.project/.bundle-sync.json`, `.project/metrics/token-consumption.json`,
`.project/context/{product,architecture,stack}.md`, `README.md`, `VERSION`, and bounded
existence/count scans for database evidence (`migrations/*.sql`, `prisma/schema.prisma`,
`drizzle*`, `db/schema*`). It never reads `.env*`, `credentials.json`, `settings.local.json`, or
transcripts, and never opens a database connection. Reports are **not authoritative**: `status.md`
and `runs/` stay the lifecycle sources, and the report says so.

### `state.json` (schema v1) — `.project/reports/state.json`

One record per fact: `{ value, status, evidence: [project-relative paths], note? }` with
`status` ∈ `observed | proposed | stale | unavailable | unconfigured`. Sections: `workflow`
(installed version + provenance, last sync, partial-sync state), `project` (description,
README facts, architecture, technology direction), `database`, `pitches` (active with hill
progress, shipped, preserved-with-reason, compacted from `done-work.md`), `knowledge`
(entry counts by type, graph freshness), `skills` (each registry entry's enabled state, phase
bindings, runtime status, plus caveman mode/overrides), `metrics` (measured/partial/unavailable,
completeness, freshness). Every string is length-bounded and passed through a secret-pattern
redaction (AWS keys, `sk-…`/`ghp_…` tokens, PEM headers, `password=`) as defense in depth. Sections
that cannot be built are `unavailable` with a reason — one broken source never fails the rest.
Staleness is explicit (e.g. `token-consumption.json` older than 7 days; `graph.json` older than the
newest knowledge entry). Facts from `stack.md`/`architecture.md` under headings matching
`proposed|direction|not yet|undecided` are `proposed`/`unconfigured`, never `observed`.

### Writes
`--apply` writes `state.json` (T1) and `state.html` (T2) each via a same-directory temp file then
`rename`, so a reader never sees a partial file; a stale temp file never blocks a rerun. Default is
preview (no writes), matching every other script in this bundle. Output is deterministic for the
same inputs and an injected clock, so a rerun is a byte-identical no-op.

### Theme — `.project/reports/theme.json` and optional `.project/reports/settings.json`
Discovery (T2) scans a bounded set of CSS/config files (≤200 files, ≤256 KB each, skipping
`node_modules`, `.git`, `.project/metrics`) for shadcn-style custom properties (`--background`,
`--foreground`, `--primary`, `--muted`, `--border`, `--radius`, font families) and Tailwind v4
`@theme` aliases. A value is accepted only if it matches a strict grammar (hex, `rgb()`, `hsl()`,
a length, a safe font-family list) — anything containing `url(`, `;`, `}`, `<`, `expression`, or
a quote is rejected. Contrast is computed for foreground/background (≥ 4.5:1); a discovered pair
that fails, or uses a format contrast cannot be computed for (e.g. `oklch()`), falls back to the
documented fallback pair for that pair only and records why. Source SHA-256 hashes are stored in
`theme.json`; a changed hash refreshes the theme and is reported, an unchanged set is reused. The
documented fallback is a shadcn-style light/dark theme whose every text/background pair is
asserted ≥ 4.5:1 in tests. `settings.json` (`{ "schemaVersion": 1, "themeMode": "auto" | "fallback" }`)
lets a project force the fallback; it lives under `.project/`, which bundle-sync never touches, so
it survives every sync (regression-tested).

### HTML
Self-contained: inline `<style>`, no scripts, no external loads, a `Content-Security-Policy` meta
(`default-src 'none'; style-src 'unsafe-inline'`). Every project-supplied string is HTML-escaped
at the point of output. Links are emitted only for project-relative evidence paths that resolve
inside the project; anything else (`javascript:`, `data:`, absolute, `../` escapes, external URLs) is
rendered as plain text. `lang`, landmarks, ordered headings, table header scopes, a viewport meta,
`@media (max-width)` and `@media print` rules, and `prefers-color-scheme` support are asserted
structurally. Missing metrics/database render as labeled `unavailable`/`unconfigured`, never as
blank or zero.

### `/state`
Canonical playbook at `.claude/skills/state/SKILL.md` (profile `fast`: templated collection and
rendering, no judgment) with Codex/OpenCode pointers and a materialized Cursor copy — the same
one-source-every-vendor contract already in place. It runs the snapshot, then the renderer, and
reports the written paths. It does not run `pitch-compress` and is not run by it automatically:
the parent pitch's "run `/state` after compaction" step becomes available now, but is added to
the `pitch-compress` playbook as an explicit, documented next step, not an automatic call
(deletion tooling should not silently trigger other writers).

## Exit criteria per scope (machine-checkable)

### T1
- `node --test ai-framework/scripts/state-snapshot.test.js` exits 0 and proves: every fact carries a
  status from the vocabulary and evidence paths that exist (or an explicit `unavailable` reason);
  a bare project (only `status.md`) and a full project both produce a valid snapshot; a malformed
  `graph.json`, `registry.json`, or token snapshot makes only its own section `unavailable`;
  token snapshot `schemaVersion` 1 and a v2-shaped fixture with extra keys are both read, and an
  unknown version is labeled unsupported; workflow version resolves from the sync marker, falls
  back to labeled "unpacked, not updated by sync", and is `unavailable` when neither exists; a
  marker with `conflicts`/`keptLocal` reports partial-sync attention; database is `unconfigured`
  with no evidence and `observed (checked-in only)` with a migrations fixture; a pitch compacted
  by `pitch-compress` (directory gone, present in `done-work.md`) still appears as shipped; canary
  secrets planted in a README and an `.env` never appear in the output; stale sources are labeled
  `stale`; `--apply` writes atomically, a rerun with the same clock is a byte-identical no-op, and
  a leftover temp file does not block it; default is preview with zero writes.
- `node --check ai-framework/scripts/state-snapshot.js` exits 0.
- `node ai-framework/scripts/workflow-doctor.js --json` exits 0 with `state` discovered by its
  existing generic skill checks (mirrors, profile, caveman instruction) — no doctor logic change
  beyond the script list.
- `node ai-framework/scripts/state-snapshot.js --json` run in this repo exits 0 and reports database
  `unconfigured` and technology direction `proposed` (this project's real state).

### T2
- `node --test ai-framework/scripts/state-html.test.js` exits 0 and proves: output contains no
  `<script>`, no external URL loads, and the CSP meta; hostile strings (`<script>`, `"><img onerror>`,
  `</style>`, `javascript:`) in snapshot fields and theme values render inert; evidence links that are
  absolute, `../`-escaping, `javascript:`, or `data:` become plain text; a themed fixture is used
  and its source hashes recorded; editing a CSS file refreshes the theme on the next run and reports
  it; no CSS yields the fallback; a value violating the grammar, a low-contrast discovered pair, and
  an `oklch()` pair each fall back for that pair with a recorded reason; `themeMode: "fallback"`
  skips discovery; every documented fallback pair is ≥ 4.5:1 in light and dark; the structural
  accessibility/mobile/print assertions hold; missing metrics/database are labeled, not blank.
- `node --test ai-framework/scripts/bundle-sync.test.js` exits 0 including a new case proving
  `.project/reports/settings.json` survives a sync unchanged.
- `node --check` on both new scripts exits 0.
- End to end in this repo: `state-snapshot.js --apply` then `state-render.js --apply` exit 0 and the
  produced `state.html` passes the same structural assertions the tests use.

### Final regression (both scopes)
`node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/state-snapshot.js,ai-framework/scripts/state-theme.js,ai-framework/scripts/state-render.js' --test-coverage-lines=90`
over the three new test files exits 0; the whole prior surface (`pitch-compress`, `pitch-archive`,
`bundle-sync`, `add-skill`, `skill-vendors`, `skill-sync`, `skill-defaults`, `skill-compress-guard`,
`browser-runtime`, `token-consumption` tests) still passes; `workflow-doctor.js`,
`setup-validator.js`, and `graphify.js --check` exit 0; `skill-vendors.js cursor-mirrors` reports
0 differing.

## Feature-by-vendor acceptance

| Check | Claude Code | OpenCode | Codex | Cursor |
|---|---|---|---|---|
| `/state` discovered | live run | `opencode debug skill` | run if quota allows, else unverified | file parity only; app not installed here → unverified |
| Resources (script paths) resolve from the entry point | tested | tested | tested | tested (byte copy) |
| Caveman instruction carried | doctor-enforced | doctor-enforced | doctor-enforced | mirror parity test |
| Repeated sync keeps settings | bundle-sync test (vendor-independent, `.project/`) | — | — | — |

Anything not run on a real host is recorded as unverified, separate from structural evidence.

## Risks

| Risk | Scope | Spike? | Mitigation |
|------|-------|--------|------------|
| Token snapshot schema changes under this pitch (v2 from `metrics-report-dimensions`) | T1 | No | Tolerant reader over common fields; v1 and v2-shaped fixtures; unknown version labeled |
| Theme values are untrusted input written into CSS (injection) | T2 | No | Strict value grammar, reject-don't-sanitize; hostile-value tests; CSP; no scripts |
| Discovered theme has unreadable contrast or an unparseable color space | T2 | No | Compute contrast; per-pair fallback with recorded reason; `oklch()` treated as unverified |
| Scanning a large repo is slow or leaks files | T1/T2 | No | Fixed allowlist for facts; theme scan bounded (200 files, 256 KB); never reads secret-bearing paths |
| Report mistaken for a lifecycle authority | T1 | No | Says so in the page and README; reads `status.md`/`runs/`, never writes them |
| Partial write leaves a broken report | T1/T2 | No | Temp file + rename; stale temp never blocks; deterministic output |
| Report leaks a secret quoted in a README/context file | T1 | No | Bounded fields + secret-pattern redaction + canary tests; `.project/reports/` gitignored here and recommended for targets |

No spike is needed; the unknowns were resolved by reading the code and data above.

## Parallel dispatch plan

T1 → T2, sequential, no subagents. T1 fixes the schema and source allowlist that T2's renderer
consumes. T2 is small, and its renderer and theme grammar are one security surface that is easier
to review as a single continuous pass than as two parallel ones.

## Vendor acceptance

Carried from the parent pitch and both sub-pitches: `/state` ships with an entry point for every
vendor registered in the project (currently Claude Code, OpenCode, Codex, Cursor), resolved by the
existing shared mechanism, never a hard-coded four. No new per-vendor adapter logic is needed; the
new skill follows the pattern `pitch-compress` and `add-skill` already use.

## No-gos carried forward

- No application implementation or decisions on La Salle infrastructure. Database and technology
  stay `unconfigured`/`proposed`; nothing is inferred from a live deployment.
- No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets in reports. The report only reads and derives; token figures show
  completeness and are never summed across overlapping measurements or given invented savings.
- No installation or deletion during shaping or planning.
- Parent pitch: no contract dropped to fit appetite — both sub-pitches are represented in T1/T2.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality. Any deviation that relaxes a
safety property — escaping, link rules, the theme grammar, secret handling — is flagged for
explicit approval instead of being logged as routine; see
`.project/knowledge/patterns/a-gate-must-not-trust-its-own-author.md`.)
