# D3 completion evidence

Scope: browser runtime readiness for the `vercel-labs/agent-browser/agent-browser` catalog
entry. Runtime: Node v24.18.0. Read-only against this checkout: no skill was installed into
this project's own registry by anything other than the test fixtures themselves (which install
into throwaway temp-dir fixtures, never this repository's `.project/skills/registry.json`), and
`browser-runtime.js` never runs `npm i -g agent-browser` or `agent-browser install`.

## What was built

- `ai-framework/scripts/browser-runtime.js` — `report(root)` returns, for the single
  `vercel-labs/agent-browser/agent-browser` catalog entry:
  `{ id, purpose, installed, enabled, scope, cli, status, registryError }`.
  - `installed`/`enabled`/`scope` come from `.project/skills/registry.json`, read the same way
    `skill-defaults.js`'s own `report()` already does: `context()` + `readRegistry()` from
    `skill-registry.js`, with an interrupted-transaction check via `snapshot()` first. Any
    registry error (missing, malformed, interrupted transaction) is caught and surfaced as
    `registryError` — never thrown, and installed is never claimed `true` on error.
  - `cli` (`"available"` / `"unavailable"`) comes from
    `execFileSync("agent-browser", ["--version"], { stdio: "ignore", timeout: 5000 })` in a
    try/catch — the exact presence-check pattern already proven in `skill-sync.js`'s
    `discoverFormatter`. Nothing else is ever invoked.
  - `status` is a derived, human-facing summary: `"unsupported"` (CLI absent — a host capability
    fact, so it takes priority over registry state and is reported regardless of whether the
    skill happens to be installed), `"not-installed"`, `"installed-disabled"`, or `"ready"`
    (installed, enabled, and CLI available). This directly satisfies the exit criterion that a
    not-installed skill and an installed-but-disabled skill be distinguished, and that a missing
    runtime is reported as data, never a thrown failure.
  - CLI: `node ai-framework/scripts/browser-runtime.js report [--root P] [--json]`, matching the
    style of `skill-defaults.js`'s own CLI section (same option parsing, same `--json`/plain-text
    duality, same "Usage:" error on an unknown action).
- `ai-framework/scripts/browser-runtime.test.js` — 6 tests:
  1. CLI absent is reported as `"unavailable"`/`"unsupported"` without throwing, regardless of
     install state.
  2. CLI present (a fake `agent-browser` script placed on a temp `PATH`) is reported as
     `"available"` without throwing.
  3. Not-installed vs installed+enabled (`"ready"`) vs installed+disabled
     (`"installed-disabled"`) are distinguished, using a *real* registry entry built by driving
     `add-skill.js`'s own `install`/`disable` actions against an offline git fixture repo (the
     same pattern `add-skill.test.js` uses) rather than a hand-crafted registry record that could
     drift from what `readRegistry()` actually validates.
  4. An invalid registry (`schemaVersion: 9`) and a missing registry both produce a report
     without throwing; `registryError` is set only for the invalid case.
  5. The report always names the correct catalog entry and carries a non-empty `purpose`.
  6. Full CLI coverage: `--json`, plain text, an unknown action, and an unknown option, all via
     `spawnSync`.

Test isolation note: CLI-presence tests temporarily rewrite `process.env.PATH` for the duration
of the test (restored via `t.after`) rather than relying on whatever happens to be installed on
the host running the suite — so the suite is deterministic regardless of whether `agent-browser`
is actually on the CI/dev machine's `PATH`.

## Verification

```sh
node --test ai-framework/scripts/browser-runtime.test.js
```
Exit 0: 6 tests, 6 pass, 0 fail.

```sh
node --check ai-framework/scripts/browser-runtime.js
```
Exit 0.

```sh
node --test --experimental-test-coverage '--test-coverage-include=ai-framework/scripts/browser-runtime.js' --test-coverage-lines=90 ai-framework/scripts/browser-runtime.test.js
```
Exit 0: line coverage 100%, function coverage 100%, branch coverage 86.96% (above the 90%-lines
threshold the final regression enforces).

```sh
node ai-framework/scripts/workflow-doctor.js --json
```
Exit 0, `"failures": 0, "fixed": 0`. `browser-runtime.js` was deliberately **not** added to
doctor's `node --check` script list — D1 owns doctor integration, per this scope's brief. Noting
for the orchestrator: `ai-framework/scripts/workflow-doctor.js` line ~482's `scripts` array
currently lists `skill-defaults.js` (added by D1) but not yet `browser-runtime.js` or D2's
`skill-compress-guard.js` — both will need adding by whichever scope does the doctor-integration
follow-up, most naturally D1 since it already owns that file/list.

## Deviations / clarifications from plan.md worth flagging

- plan.md's contract line for D3 says `report(root)` returns "per-vendor + overall." The actual
  build task for this scope (and the grounding section's own resolution of D3, which frames it as
  a single "report whether the CLI resolves on PATH" check with no per-vendor dimension) narrowed
  this to a single entry, no vendor breakdown — `agent-browser` is a global CLI on `PATH`, not a
  per-vendor concern the way skill installation is. Implemented as a single-entry report, matching
  the more specific build-task brief over the plan's earlier phrasing. No vendor-specific data
  exists to report here; nothing was dropped.
- `ai-framework/integrations/skill-defaults.md`'s "Browser runtime" section (not touched, per
  scope boundaries) describes a missing CLI as reported "as 'unsupported host'." The literal
  status string implemented is `"unsupported"` (shorter, and consistent with the other three
  status values' single-hyphenated-word style: `not-installed`, `installed-disabled`, `ready`).
  The doc's sentence reads as descriptive prose rather than a literal string contract, so this
  wasn't treated as a doc violation — flagged here per the scope brief instead of editing the doc.

## Remaining

D2 (stats attribution + compress guard) is the only other scope in this plan; it is disjoint from
D3's files and was dispatched in parallel per plan.md. No further work is owed by D3 itself.
