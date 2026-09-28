# Plan: Configurable default skills

**Pitch**: [pitch.md](pitch.md)  •  **Appetite**: epic, decomposed into 3 sequential big-batch scopes  •  **Hill**: hill.md
**Depends on**: `portable-skill-installation` (shipped 2026-09-25, v2.4.0) — registry, `add-skill`, native vendor entry points, and `bundle-sync` protection of `.project/skills/` all exist and are reused here, not rebuilt.

## Grounding: real upstream inspection (read-only, no target writes)

Before committing exit criteria, the four upstream skills were inspected via
`node ai-framework/scripts/add-skill.js inspect <id> --path <exact-path>` (no checkout, no
execution — the same guarantee S1 relies on). This materially changed the design from what the
shape-phase sketch assumed:

- **`juliusbrussee/caveman/caveman`** (`skills/caveman/SKILL.md`) is a fully self-contained,
  session-persistent style skill with its **own** internal mode syntax
  (`/caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra|off`, default `full`,
  "Default style for this whole session... until user say 'stop caveman'"). We do not need to
  build a mode *engine* — we need a thin **precedence-resolution and activation layer** that
  decides, per phase invocation, which level (if any) to tell the agent to invoke the already-
  installed skill at.
- **`caveman-stats`** (`skills/caveman-stats/SKILL.md`) is Claude-Code-hook-specific
  (`src/hooks/caveman-mode-tracker.js`/`caveman-stats.js`, inside its own package) and already
  branches per host in its own prose ("In Gemini CLI... In other hosts... say unavailable").
  **Design decision**: we do not parse its private hook files (tight, fragile coupling to
  unreviewed upstream internals). Our integration is limited to tagging our *own*
  `token-consumption.js` records with the currently-configured mode, for our own reporting
  attribution — never reading, invoking, or duplicating this skill's own reporting logic. This
  removes the spike the shape phase flagged for this slice; there is nothing left to de-risk.
- **`caveman-compress`** (`skills/caveman-compress/SKILL.md`) is a **Python** CLI
  (`scripts/__main__.py` etc.) that "call[s] Claude to compress" — a real runtime dependency
  (`python3`, plausibly network/API access) — and already backs up the original file to an
  out-of-tree data dir before overwriting, and already restricts itself to prose file
  extensions. It has **no knowledge of this project's own historical-record guardrails**
  (`.project/pitches/`, `.project/pitches/_archive/`, `.project/design/`, `.project/knowledge/`)
  — left alone, it would happily "compress" any `.md` file it's pointed at, including ones this
  project's own rules forbid rewriting. Our "explicit compression safeguards" requirement is
  therefore a **guard that blocks protected paths and reports Python readiness**, not a
  reimplementation of backup/restore (upstream already does that correctly).
- **`vercel-labs/agent-browser/agent-browser`** (`skills/agent-browser/SKILL.md`) is a
  **discovery stub** (`hidden: true` frontmatter) whose real instructions are served live by
  the installed CLI (`agent-browser skills get core`), which itself requires
  `npm i -g agent-browser && agent-browser install`. Our job is exactly the "runtime readiness,
  never install" framing from the pitch: report whether the CLI resolves on `PATH`, never
  attempt the npm install ourselves.

This inspection also confirmed `frontmatter()` (S1) already tolerates extra upstream frontmatter
fields (`allowed-tools`, `hidden`) since it only extracts/validates `name`/`description` —
`agent-browser`'s inspect above succeeded without any parser change.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| D1 | Bundle default catalog + mode precedence/propagation | 14 | 650–850 | `portable-skill-installation` (done) | — | No: defines the schema D2/D3 both read | — |
| D2 | Stats attribution + compress guard | 7 | 350–470 | D1 (schema only, not code) | D3 | Yes: disjoint files from D3, clear exit, no shared writes | standard |
| D3 | Browser runtime readiness | 5 | 350–450 | D1 (catalog only) | D2 | Yes: disjoint files from D2, clear exit, no shared writes | standard |

Each scope is well under the sub-pitch cap (15 files / 1500 LOC); no further split needed.
File counts below list every touched/created path per scope, including release records.

### D1 files
Create: `ai-framework/integrations/skill-defaults.json`, `ai-framework/scripts/skill-defaults.js`,
`ai-framework/scripts/skill-defaults.test.js`, `ai-framework/integrations/skill-defaults.md`.
Update: `.claude/skills/{shape,critique,plan,build,audit,ship,cooldown}/SKILL.md` (7 files, one
short consistent paragraph each — mirrors the existing "Recommended capability profile" pattern),
`ai-framework/scripts/workflow-doctor.js`, `VERSION`, `CHANGELOG.md`.

### D2 files
Create: `ai-framework/scripts/skill-compress-guard.js`, `ai-framework/scripts/skill-compress-guard.test.js`.
Update: `ai-framework/hooks/scripts/token-consumption.js`, `ai-framework/hooks/scripts/token-consumption.test.js`,
`ai-framework/integrations/skill-defaults.md` (append D1's doc with the stats/compress contract),
`VERSION`, `CHANGELOG.md`.

### D3 files
Create: `ai-framework/scripts/browser-runtime.js`, `ai-framework/scripts/browser-runtime.test.js`.
Update: `ai-framework/integrations/skill-defaults.md` (append), `VERSION`, `CHANGELOG.md`.

(No `.claude/skills/run/` file exists in this bundle to integrate with — dropped from the
shape-phase sketch; nothing here invents a skill that doesn't exist.)

## Concrete contracts

### Bundle default catalog — `ai-framework/integrations/skill-defaults.json`

```json
{
  "schemaVersion": 1,
  "defaults": [
    { "id": "juliusbrussee/caveman/caveman", "path": "skills/caveman/SKILL.md",
      "purpose": "brevity mode", "modes": ["lite","full","ultra","wenyan-lite","wenyan-full","wenyan-ultra"],
      "defaultMode": "full", "runtime": null },
    { "id": "juliusbrussee/caveman/caveman-stats", "path": "skills/caveman-stats/SKILL.md",
      "purpose": "token/mode attribution reporting", "runtime": null },
    { "id": "juliusbrussee/caveman/caveman-compress", "path": "skills/caveman-compress/SKILL.md",
      "purpose": "explicit memory-file compression", "runtime": { "check": ["python3", "--version"] } },
    { "id": "vercel-labs/agent-browser/agent-browser", "path": "skills/agent-browser/SKILL.md",
      "purpose": "browser automation CLI", "runtime": { "check": ["agent-browser", "--version"] } }
  ]
}
```

This is a **catalog of proposed defaults**, not an auto-install list. Nothing in this pitch
installs any of these four skills into any project, including this bundle's own checkout — a
human runs `/add-skill` explicitly per the existing S1–S3 contract. This satisfies "no silent
global installs" and the earlier no-go "no installation... during shaping" carried into build.

### Instance mode state — `.project/skills/modes.json` (project-scope only; never global)

```json
{ "schemaVersion": 1, "caveman": { "enabled": true, "default": "full", "phases": { "build": "lite" } } }
```

Already outside every `bundle-sync.js` `SYNCED_DIRS` entry (`.project/` is never synced), so
instance mode choices survive sync automatically — the same protection S3 relies on for
`.project/skills/registry.json`. `enabled: false` is the only form of **persistent** disable
(the pitch: "Disabling persists only when explicitly requested"); a per-invocation `caveman=off`
argument is scoped to that invocation and its dispatched children only, never written to disk.

### Precedence — `skill-defaults.js resolveMode(root, { phase, invocationArg })`

`invocationArg` (explicit `caveman=<mode>` on that phase command) > `modes.json.phases[phase]`
(instance phase override) > `modes.json.default` (instance default) > bundle `defaultMode`
(`"full"`). `modes.json.enabled === false` forces `"off"` unless `invocationArg` explicitly
overrides it for that one invocation (an explicit ask for that single call wins over a
persistent disable, matching "explicit argument counts as a choice" from `add-skill`'s existing
precedent in the parent pitch). Reject any value outside the 7 modes ∪ `"off"` with a clear
error — never silently fall back.

### Phase-file integration (the "equivalent parameters on workflow commands" requirement)

Each of the 7 canonical phase files gets one new line directly under its existing
"Recommended capability profile" line:

> **Caveman mode:** resolve via `node ai-framework/scripts/skill-defaults.js resolve-mode --phase <phase> [--arg $ARGUMENT]`. If not `off` and the skill is installed and enabled (check `.project/skills/registry.json`), load it and follow it at that level before this phase's other instructions; pass the same resolved mode to any subagent this phase dispatches. If not installed, proceed normally — this is optional, never required.

Only the **canonical** file changes; OpenCode/Codex/Cursor mirrors already say "load the
canonical file and follow it exactly" (S1–S3's own "one source, every vendor" contract) and
need no edit — this is what keeps D1 to 14 files instead of 14 + 3×7 mirror edits.

### Metrics attribution — `token-consumption.js`

One new optional field per recorded event: `mode: textOrNull(...)`, read from
`.project/skills/modes.json`'s resolved default at record time (best-effort; `null` if the file
doesn't exist or caveman isn't installed — never invented, never blocking). No new schema
version needed (additive optional field, same pattern the registry already uses for
`entry.formatting` in S3). Explicitly does **not** read, invoke, or duplicate `caveman-stats`'s
own reporting — see "Grounding" above for why.

### Compress guard — `skill-compress-guard.js`

`canCompress(root, targetPath)` → `{ allowed, reason }`. Refuses: any path under
`.project/pitches/`, `.project/pitches/_archive/`, `.project/design/`, `.project/knowledge/`
(this project's own historical/precision-sensitive records — CLAUDE.md guardrail, not
upstream's concern); a path that doesn't exist; a glob/non-exact path. Reports (never
auto-runs) `python3` availability via the same `execFileSync(..., { stdio: "ignore" })` presence
check pattern already proven in `skill-sync.js`'s `discoverFormatter`. Actual invocation of
`caveman-compress` remains an explicit, human-approved action per its own upstream trigger —
this guard is consulted before that approval is presented, not a replacement for it.

### Browser runtime — `browser-runtime.js`

`report(root)` → per-vendor + overall: skill installed? (cross-check
`.project/skills/registry.json`), CLI resolves on `PATH`? (`agent-browser --version`, ignored
stdio, same pattern as above). Never attempts `npm i -g agent-browser` or `agent-browser
install`. Reports "unsupported host" explicitly rather than guessing when the CLI is absent.

## Exit criteria per scope (machine-checkable)

### D1
- `node --test ai-framework/scripts/skill-defaults.test.js` exits 0 and proves: all 7 modes +
  `off` resolve correctly; an unknown mode string is rejected with a clear error; invocation-arg
  beats phase-override beats instance-default beats bundle-default; `enabled:false` persists as
  `off` across invocations without an override arg but an explicit invocation arg still wins for
  that one call; missing `modes.json` falls back to the bundle default cleanly; malformed
  `modes.json` (bad schema version, wrong types) is rejected, not silently ignored.
- `node --check ai-framework/scripts/skill-defaults.js` exits 0.
- `node ai-framework/scripts/workflow-doctor.js --json` exits 0 and fails loudly on a malformed
  `skill-defaults.json` (new doctor check, itself tested).
- `grep -l "Caveman mode:" .claude/skills/{shape,critique,plan,build,audit,ship,cooldown}/SKILL.md`
  returns all 7 paths (every phase actually carries the paragraph, not just some).

### D2
- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/scripts/skill-compress-guard.test.js`
  exits 0 and proves: a recorded event picks up the current mode when `modes.json` exists, is
  `null` when it doesn't (duplicate-metrics requirement: the existing `recentEventKeys` dedup
  logic is unaffected by the new field — same dedup key excludes `mode`); `canCompress` refuses
  every protected-path case above with a distinct reason string, allows an ordinary project file,
  and reports missing-`python3` without throwing.
- `node --check ai-framework/hooks/scripts/token-consumption.js ai-framework/scripts/skill-compress-guard.js` exits 0.

### D3
- `node --test ai-framework/scripts/browser-runtime.test.js` exits 0 and proves: CLI-present and
  CLI-absent are both reported without throwing (a missing runtime is data, not a failure); an
  installed-but-disabled skill and a not-installed skill are distinguished; reported status never
  claims readiness it didn't verify.
- `node --check ai-framework/scripts/browser-runtime.js` exits 0.

### Final regression (all scopes)
`node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/skill-defaults.js,ai-framework/scripts/skill-compress-guard.js,ai-framework/scripts/browser-runtime.js' --test-coverage-lines=90 ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-compress-guard.test.js ai-framework/scripts/browser-runtime.test.js ai-framework/hooks/scripts/token-consumption.test.js` exits 0.
`node ai-framework/scripts/workflow-doctor.js`, `node ai-framework/scripts/setup-validator.js`,
`node ai-framework/scripts/graphify.js --check`, and a regression run of
`ai-framework/scripts/bundle-sync.test.js` (confirms `.project/skills/modes.json` — a sync
preserving overrides — stays outside every `SYNCED_DIRS` entry, protected exactly like
`registry.json`) all exit 0.

## Risks (inherited from pitch, refined by the grounding inspection above)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Mode-precedence storage/propagation design was unspecified in shape | D1 | No — resolved above by direct upstream inspection; caveman is self-contained, we only need a resolution/activation layer | Schema and precedence fixed in this plan before build starts |
| caveman-stats' actual token/attribution format was unknown | D2 | No — designed away: we never parse its hooks, only tag our own records | If a future pitch wants deeper integration, that is new scope, not this one |
| caveman-compress runtime prerequisites (Python, network/API) unverified | D2 | No — guard only *reports* `python3` presence, never assumes API access or auto-runs | Runtime status stays `unverified`/reported, matching S1's `runtime.status` convention |
| agent-browser requires a global npm install outside this tool's control | D3 | No — reported only, never installed, matching the pitch's explicit "no silent global installs" | — |
| Sync must preserve instance mode overrides across projects | D1/all | No — `.project/` was already fully excluded from `SYNCED_DIRS` in S1–S3; this only needs a regression test, not new sync code | Covered by the final regression's `bundle-sync.test.js` rerun |

No risk in this pitch requires a build-time spike; the grounding inspection above did that work
during planning instead, which is why D1's file/LOC estimate could be committed precisely.

## Parallel dispatch plan

D1 → {D2, D3}. D1 is not subagent-dispatchable: it defines the shared schema
(`skill-defaults.json`, `modes.json`, `resolveMode`) that D2 and D3 both read, and touches 7
shared phase files with one consistent paragraph each — sequencing this by hand keeps that
paragraph actually identical across all 7, which a parallel dispatch across files risks
drifting. Once D1 is committed, D2 and D3 touch fully disjoint files (no shared writes, no
shared schema decisions left to make — both only *read* D1's already-fixed catalog/schema) and
each has a self-contained, machine-checkable exit — dispatch them as two parallel subagents at
the `standard` profile (implementation-grade, not itself a shaping/architecture decision).

## Vendor acceptance

Carried from all three sub-pitch documents: every capability here targets every vendor
registered in the receiving project (currently Claude Code, OpenCode, Codex, Cursor), resolved
the same way S1–S3 already resolve it — via `discoverVendors()`/the project's own
`skill-vendors.json` + `.project/skills/vendors.json` overrides, never a hard-coded four-vendor
list. This pitch adds no new skill/command/agent surface of its own (the four default skills are
optionally installed through the *existing* `add-skill` entry points, already native to every
vendor since S2) — so there is no new per-vendor mirror to build here. The phase-file paragraph
change (D1) lives only in the canonical files, which every vendor's existing mirror already
points to.

## No-gos carried forward

- No application implementation or decisions on La Salle infrastructure.
- No silent override of instance customization, automatic historical deletion, invented token
  savings, or secrets in reports. `modes.json`/`skill-defaults.json` never carry secrets;
  `token-consumption.js`'s new `mode` field is a plain string, no savings/cost inference added.
- No installation or deletion during shaping or planning — this plan installed nothing;
  inspection was read-only per `add-skill.js inspect`'s own guarantee.
- Parent pitch: no parent behavior contract may be dropped to fit appetite (all three sub-pitch
  contracts are represented in D1/D2/D3 above).

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
