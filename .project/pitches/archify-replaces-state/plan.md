# Plan: archify-replaces-state

**Pitch**: pitch.md  •  **Appetite**: epic → 3 big-batch slices (S3 split in two)  •  **Hill**: hill.md

Verification commands run with `bun` (project convention). Full suite: `bun ai-framework/scripts/run-tests.mts`
(partial runs never replace it). No build/typecheck/lint/i18n command exists here (`stack.md`), so none is a gate.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Validate Archify v3.3.0 (spike, findings only) | `.project/pitches/archify-replaces-state/findings.md` (+ scratch dir outside repo) | ~120 (doc) | — | — | no — network + judgment, sequential, owner reads the result | — |
| S2 | Swap `/state` onto Archify | `.claude/skills/state/SKILL.md`, mirrors `.cursor/skills/state/SKILL.md`, `.agents/skills/state/SKILL.md`, `.opencode/commands/state.md`, `ai-framework/integrations/state-report.md`, `ai-framework/workflow/relations.toon`, `.project/skills/registry.json` (+ installed package record), `ai-framework/templates/project/reports/README.md`, `.project/reports/README.md`, one new fact-gather script + test | ~400 | S1 = keep | — | no — shared contract doc + mirrors must agree; small | — |
| S3a | Delete old state code | `ai-framework/scripts/state-*.mts` (25 files incl. tests/helpers), `.project/evals/datasets/state-ai-{authoring,fragments}.json`, `state-deep-evidence.json` | −10,010 | S2 | — | no — mechanical, but follows S2 verification order | — |
| S3b | Prune references + migrate installed projects | `README.md`, `.gitignore`, `ai-framework/workflow/phases/3-audit.md`, `ai-framework/integrations/{workflow-metrics,orca-vendors}.md`, `ai-framework/rules/security.md`, `.claude`+`.cursor` `agents/{code-reviewer,security-reviewer}.md`, `pitch-compress` skills (2), `ai-framework/scripts/{pitch-compress,config-migrate,runtime/migrate,skill-registry,skill-defaults,orca-eval-grader}.mts` and their tests (`bundle-sync`, `installed-upgrade`, `legacy-upgrade`, `config-migrate`, `done-work-index`, `flow-report`, `review-bench`, `orca-start*-hook`), `_followups.md`, `CHANGELOG.md`/`VERSION` | ~250 net | S3a | — | no — wide but each edit is tiny; run in-session so the grep exit stays authoritative | — |

Why S3 was split: S3a is ~45 deletions that must not mix with the ~35 reference edits, so a failing suite after
S3a points at a missing consumer, not at an editing slip. This deviates from the pitch's three-slice wording; logged below.

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S1 — Validate Archify v3.3.0
- `test -s .project/pitches/archify-replaces-state/findings.md`
- `grep -c "^## " .project/pitches/archify-replaces-state/findings.md` ≥ 6 with headings: Pinned version+commit, Install path
  (via `add-skill inspect` preview, no `--apply`), Offline behaviour, Network calls, Safety over untrusted input, Verdict (KEEP | STOP).
- `grep -E "^\*\*Verdict\*\*: (KEEP|STOP)" .project/pitches/archify-replaces-state/findings.md` exit 0
- Pin recorded as a full 40-char commit: `grep -E "[0-9a-f]{40}" .project/pitches/archify-replaces-state/findings.md` exit 0
- Archify's `doctor` and `demo` ran in a scratch dir outside the repo and their exit codes are quoted in findings.
- `git status --porcelain -- . ':!.project/pitches/archify-replaces-state'` shows no new tracked changes from this scope.
- Evidence on the licence file (Apache-2.0 vs MIT history) and on `ARCHIFY_UPDATE_CHECK_DISABLED=1` stopping the update GET.
- Gate: Verdict STOP → S2/S3a/S3b do not start; user decides (re-shape / pass).

### S2 — Swap `/state` onto Archify
- `bun ai-framework/scripts/add-skill.mts list --root .` exits 0 and lists archify at the pinned commit from S1.
- Fact-gather test: `bun test ai-framework/scripts/state-facts.test.mts` passes (new script reads `status.md`, graph,
  knowledge counts, metrics; every fact has `status` ∈ observed/proposed/stale/unavailable/unconfigured and evidence paths;
  refuses symlink/FIFO/oversize inputs and never writes outside `.project/reports/`).
- End-to-end: `/state` run (Claude Code and OpenCode) produces `.project/reports/state.html`; Archify's `validate` receipt
  exits 0 and its path is quoted in the run log. Fixture with a `<script>` string in a pitch title renders inert (test asserts no live script).
- Update check is off in our invocation: `grep -rn "ARCHIFY_UPDATE_CHECK_DISABLED" .claude/skills/state/SKILL.md` exit 0.
- `bun ai-framework/scripts/graphify-relations.mts --check` and `bun ai-framework/scripts/graphify.mts --check` exit 0.
- `bun ai-framework/scripts/setup-validator.mts` exit 0 (old scripts still present, mirrors in sync).
- `bun ai-framework/scripts/run-tests.mts` full suite 0 fail.
- Decision recorded for the metrics/tokens page (drop vs explainer table) in `state-report.md`.
- Manual (non-gating, per `live-host-verification`): smoke on Codex/Cursor noted as unverified if not run.

### S3a — Delete old state code
- `ls ai-framework/scripts/state-*.mts 2>&1 | grep -v "No such file"` empty (new `state-facts.mts` is renamed `facts-gather.mts` in S2 so this stays true; naming settled in S2).
- `bun ai-framework/scripts/run-tests.mts` full suite 0 fail (any import of a removed module fails loudly here).
- `bun ai-framework/scripts/graphify.mts` rebuild, then `--check` exit 0.
- `grep -rIln "state-snapshot\|state-render\|state-fragment\|state-pages\|state-theme\|state-charts\|state-design\|state-graph\|state-history\|state-structure" ai-framework .claude .cursor .agents .opencode` empty.

### S3b — Prune references + migrate installed projects
- Same grep as S3a plus `grep -rIn "reports/state\.json\|state-report\.md\b" ai-framework .claude .cursor .agents .opencode README.md` returns only the rewritten contract's own self-references (explicit allowlist in test).
- Migration test: `bun test ai-framework/scripts/installed-upgrade.test.mts ai-framework/scripts/legacy-upgrade.test.mts ai-framework/scripts/config-migrate.test.mts` passes, including a fixture project holding an old `.project/reports/state.json` + old scripts: upgrade leaves the user's report files untouched (a report never overwrites a file it did not write) and removes only bundle-owned script copies.
- `bun ai-framework/scripts/setup-validator.mts`, `bun ai-framework/scripts/workflow-doctor.mts`, `graphify.mts --check`, `graphify-relations.mts --check` all exit 0.
- `bun ai-framework/scripts/run-tests.mts` full suite 0 fail.
- `bun ai-framework/scripts/changelog.mts` entry written; `grep -q "$(cat VERSION)" CHANGELOG.md` exit 0.
- `_followups.md`: `independent-rereview-catch-up` item for /state and the `live-host-verification` /state item are closed or re-pointed (grep shows none left naming the removed scripts).

## Blast radius (`/impact`, folded in)

- **Direct consumers of state code**: only `state-*` files themselves, plus `pitch-compress.mts` (reuses `inventory()`; hardening history in
  `hardening-a-shared-reader-made-its-writer-destructive`) — S3b must confirm `pitch-compress` does not import any state module.
- **Registries/validators that name the skill**: `relations.toon` (line ~86), `skill-registry.mts`, `skill-defaults.mts` (`state` utility phase),
  `workflow-doctor` scaffold check (reports README + `.gitignore` entry), `runtime/migrate.mts`, `config-migrate.mts`.
- **Tests that mention state and will need edits**: `bundle-sync`, `installed-upgrade`, `legacy-upgrade`, `config-migrate`, `done-work-index`,
  `flow-report`, `review-bench`, `opencode-service`, `orca-start-hook`, `orca-start-codex-hook`, `orca-ledger`. Many hits are the English word
  "state" (ledger state, hook state), not the skill — verify each by hand, never by blanket sed.
- **Historical records** (`.project/compaction/`, `records/`, `pitches/_archive`, shipped pitches, knowledge entries): never edited (guardrail).
  `knowledge/decisions/project-state-report-design.md` and `native-capture-needs-state-boundary-attribution.md` get a superseded note via a new
  knowledge entry at /ship, not an in-place rewrite.
- **Eval datasets** `state-ai-*.json`, `state-deep-evidence.json` become unreferenced; removed in S3a (they test the removed fragment checker, not AI behaviour of the new skill).

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| Archify unverified: CLI path, install, "zero-dependency" claim, stable manifest still v3.2.0 vs release v3.3.0 | S1 | yes (is S1) | Pin to a full commit; KEEP/STOP verdict gates everything |
| Untrusted repo text becoming HTML/script in Archify output; update-check network GET | S1, S2 | yes (S1 tests it) | Set `ARCHIFY_UPDATE_CHECK_DISABLED=1`; inert-script fixture test; parse-and-re-emit facts (`parse-untrusted-values-and-re-emit-them`) |
| Fact-gather script reads untrusted trees | S2 | no | Run only bundle code (`a-report-over-an-untrusted-tree-runs-only-bundle-code`); symlink/FIFO/oversize rejection copied from `pitch-compress` hardening |
| Loss of number-binding/evidence checks | S2 | no | Facts keep `status` + evidence paths in the Archify document; accepted loss of fragment stamping recorded in contract |
| Installed projects holding old reports/scripts | S3b | no | Migration fixture test; never overwrite files not written by the bundle |
| Vendor parity (Archify per `--agent`; Codex/Cursor/OpenCode paths) | S2 | partial (S1 notes) | Verify Claude Code + OpenCode live; mark others unverified in followups |
| Metrics/tokens page has no Archify equivalent | S2 | no | Decide drop vs table in S2; documented in contract |
| License: 3.3.0 Apache-2.0 vs earlier MIT; `add-skill` stores license text | S1, S2 | no | Quote license file in findings; confirm `add-skill inspect` captures it |
| Wide grep deletion hides a consumer | S3a/S3b | no | Full suite after S3a before S3b; no blanket sed |

## Parallel dispatch plan

- Strictly sequential: S1 → (gate on Verdict) → S2 → S3a → S3b. S2/S3 each rewrite files the next scope's tests and greps depend on,
  and S1's result can cancel everything after it. No scope is dispatched to a subagent: shared contract + mirrors must agree, scopes
  are small or mechanical, and Orca workers would add coordination cost without disjoint files. Re-evaluate at /build only if S3b
  edits prove independent in the dirty-tree check.
- Model by scope when run in-session: S1 `standard` (careful reading, no large synthesis), S2 `deep` (contract + safety), S3a `fast`,
  S3b `standard`.

## Wireframes

None (no UI scopes). `<build-command>` N/A: no build in this repository.

## AI-prompt scope check

The rewritten `state` skill instructs the agent to write an Archify document from gathered facts. This is a skill playbook, not a
runtime prompt/model/tool/output-handling change, so no golden eval case is required — confirmed against the definition in
`ai-framework/workflow/phases/0-shape.md`. If /build reclassifies it, a case must be added under `.project/evals/datasets/` first.

## Living-spec deviations log

- 2026-11-23 (/plan): S3 split into S3a (delete) and S3b (prune + migrate) for failure isolation. Pitch's three slices otherwise unchanged.
- 2026-11-23 (/plan): pitch's `/critique` was skipped at the user's direction; risks above are the plan-time substitute.
- 2026-11-23 (/build S1): added S2 prerequisites from `findings.md`: (1) `skill-source.mts` `validateLinks` must ignore inline code
  spans (+test) or `add-skill` cannot inspect Archify; (2) install footprint 22.5 MiB of the 25 MiB cap per vendor and a 1.9 GB clone;
  trimming means vendoring, which the pitch's no-go forbids, so the user must decide; (3) run with `ARCHIFY_UPDATE_CHECK_DISABLED=1` and
  `[archify explainer: on-demand]`; (4) the facts/evidence/number-binding checks and metrics/pitches/knowledge pages are lost unless rebuilt.
- 2026-11-23 (/build S2): added `ai-framework/scripts/facts-gather.mts` + test (11 tests). Reused no `state-*` code (S3a deletes it); copied the old
  snapshot's redaction families and bounded/symlink-refusing reader. Draft is built mechanically from facts, so numbers never come from model text.
  Dropped sections (project, database, doneWork, runs, metrics, tokens, structure, theme, AI fragments) are listed in `state-report.md`.
- 2026-11-23 (/build S2): **S2 exit "full suite 0 fail" is not met by design.** 20 tests fail (4 in `state-fragment-inject.test.mts` that assert the old
  skill order / contract `VOLATILE_PATHS` wording, and 16 `state-fragment-dataset.test.mts` mapping tests that depend on them). They pin text S2 replaced.
  Plan assumed old scripts could run "behind" the new skill; their tests pin the skill and contract text, so S2 and S3a are coupled for the fragment tests. S3a deletes them.
  Everything else passes: 2709 tests. Not weakened or skipped.
- 2026-11-23 (/build S2): installed Archify via `add-skill` with a git `insteadOf` mirror so the registry records the real GitHub URL while the clone is local
  (60 s per git step cannot fetch a 1.9 GB history). Added `.claude/.agents/.cursor/skills/archify/` to `.gitignore` (same reason as caveman).
- 2026-11-23 (/build S2): fixed `validateLinks` in `skill-source.mts` (inline code spans are not links) + 2 assertions; 48 tests pass. Fixed during build:
  facts-gather first read files as Buffers (this runtime returns strings) and masked `[redacted]` by its own bracket neutralising; both caught by the tests.
- Not verified: OpenCode, Codex and Cursor live runs of the new `/state` (only this Claude Code session ran it); Archify's behaviour with the update check enabled.
- 2026-11-23 (/build S3a): deleted 25 `ai-framework/scripts/state-*.mts` (scripts, tests, helpers) and datasets `state-ai-authoring`, `state-ai-fragments`,
  `state-deep-evidence`. Test count 2732 -> 2074; 2071 pass, 0 fail, 3 skipped (same 3 skips as before).
- 2026-11-23 (/build S3a): **moved forward from S3b** because deletion broke them: `legacy-upgrade.test.mts` and `done-work-index.test.mts` (state `buildSnapshot`
  assertions now call `compactedSlugs`/`inventory` directly, the code under test), `installed-upgrade.test.mts` (state-snapshot CLI replaced by
  `pitch-compress inventory --json`), the `workflow-doctor.mts` script list (3 state entries out, `facts-gather` + test in), two stale comments.
- 2026-11-23 (/build S3a): **blast radius the plan missed.** The graph build refuses any shipped outcome record whose link target is missing, and 5 shipped
  records cited deleted scripts/datasets in their `code:` field (state-ai-authoring, state-quoted-fonts, state-fragment-sanitizer, state-deep-evidence,
  state-report-redesign). Owner chose "retarget links": only each record's `- code:` line was changed, to one link to the record's own
  `.project/records/legacy-upgrades/<slug>.md` source supplement, labelled "removed by archify-replaces-state". Outcome text, dates and other fields untouched.
  This edits historical records (not under the guardrail dirs `pitches/`, `design/`, `_archive/`, but archival); logged here for /ship.
- Left for S3b: `runtime/migrate.mts` `SCRIPT_NAMES` still lists state-render/snapshot/theme (rewrites old call paths in installed projects; a rewritten path now
  points at a removed script), README/docs/agents/rules mentions, `.gitignore`, `_followups.md`, CHANGELOG/VERSION, installed-project migration test.
- 2026-11-23 (/build S3b): README, `workflow-metrics.md` and `_followups.md` updated; `runtime/migrate.mts` no longer lists the three retired scripts, so an old
  `.js` reference is left alone instead of flipping an entry file to "manual". New `bundle-sync.test.mts` test replays an installed project: unmodified old
  scripts are pruned, a locally edited copy is kept, `.project/reports/*` is never touched, `facts-gather.mts` arrives as new. Changelog 2.51.0 (minor, Changed).
- 2026-11-23 (/build S3b): `flow-report.mts` still reads an optional `.project/reports/state.json` history that nothing writes now. Left as is (missing history is a defined
  "unavailable"); recorded in `_followups.md` as drop-or-rewire. Not fixed here: out of this pitch's appetite.
- 2026-11-23 (/build, outside scope): the Orca runner fixes made before this pitch (`orca-start.mts`, `orca-start.test.mts`, `orca-preflight.mts`) are in the same working
  tree and are not in the 2.51.0 changelog entry; they need their own entry or commit.
- 2026-11-23 (/audit cycle 1): no must-fix. Eleven should-fix items fixed in the main thread (see `audit.md`); one open for /ship (the Orca runner files, `attribution: shared-diff`).
  The fixes touched security-relevant code after the reviews (`read()`, `writeReport`, `validateLinks`), so they are author-verified (proofs re-run, 10 mutants killed), not independently re-reviewed.
- 2026-11-23 (/audit cycle 1): copying only a subset of the old redaction patterns while the contract said "same families" was a defect the test reviewer found by mutation; all 20 families restored.

