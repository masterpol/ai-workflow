# Followups

## Candidate pitches (cooldown 2026-09-25, approved item by item)

Candidates in active work are listed in `.project/status.md`. The items below remain source text.

| Candidate slug | Kind | Items bundled (headings below) |
|---|---|---|
| `independent-rereview-catch-up` | review only | Independent re-review of pitch-compaction; Independent security re-review of the metrics collector fixes; Deeper independent code review of /state (moot, see 'Superseded by archify-replaces-state') |
| `path-safety-hardening` | small build — plan | TOCTOU ancestor-symlink race; commit-ledger writes through a symlinked .project/compaction |
| `live-host-verification` | manual checklist per host | Verify the OpenCode effort and skill wiring; Confirm the new Claude Skill hook fires; Verify /state on Codex and Cursor (re-pointed at the new /state) |
| `collector-robustness` | small build — plan | Collector lock never reclaims a live or reused PID; Collector identity keys can collide |
| `bundle-sync-marker-fix` | shipped 2026-09-26 | Effective-base marker fix; source item retained below. |
| `state-quoted-fonts` | shipped 2026-09-26 | Bounded quoted fonts and same-file variables; source item retained below. |

**Promoted to do next, not a pitch:** run the first real `/pitch-compress` trial on a low-stakes pitch
with the archive kept (item "First real-use trial of /pitch-compress"); fold the "Wire /state into
/pitch-compress" decision into that trial.

## Superseded by archify-replaces-state (2026-11-23)

`/state` was rebuilt: `ai-framework/scripts/facts-gather.mts` collects facts and the Archify skill (pinned) renders the page.
The old snapshot, render, theme, structure, graph, history, charts, design, pages and fragment scripts, their tests and the
three `state-*` eval datasets were deleted. Items below that are about that code are **moot, not done**; they stay as source text.

- **Moot** (code removed): "Deeper independent code review of /state" and the S3 third-round re-review (`state-snapshot.js` fixes); the four `/state`
  UX/i18n nits in `state-render`; "state report hardening leftovers"; "state-report-redesign leftovers"; "From state-fragment-sanitizer";
  the fragment/dataset items in "From state-ai-authoring" (live matrix, `uncited-claim`, fragment headings, sanitizer wall-clock test,
  `[dataset-mapping]` flake); "From state-deep-evidence ship" (`state-monorepo-packages`, metrics/tokens extraction); FRLE-D1 and the
  stale live-evidence test (the test file is deleted).
- **Re-pointed**: "Verify /state on Codex and Cursor in a running host" now means: run `/state` once in each host and confirm it runs
  `facts-gather.mts`, stops cleanly when Archify is not installed, and otherwise validates and delivers `.project/reports/state.html`.
  OpenCode and Codex/Cursor have not run the new `/state` live. In the `live-host-verification` row the `/state` item carries this meaning.
- **New** (from archify-replaces-state): Archify's package is 22.5 MiB of `add-skill`'s 25 MiB cap, so a new upstream release can stop installing;
  re-check the size when bumping the pinned revision. `flow-report.mts` still reads an optional `.project/reports/state.json` history that nothing writes
  any more; drop that input or give it a new writer. A per-pitch audit/revision history view that the old `/state` offered is gone by decision.
- **Still live**: "Wire /state into /pitch-compress" (the decision is unchanged: `/pitch-compress` does not call `/state`), and everything not named above.

## bundle-sync marker misclassifies un-applied unverified files as `local` on the next run

**Resolved 2026-09-26:** shipped bundle-sync-marker-fix. Repeated runs preserve each unapplied entry's effective base; tests cover unverified, local, conflict, and removal outcomes.

Found 2026-09-25 during `portable-skill-installation` S3 manual verification (pre-existing,
unrelated to that pitch's scope). `bundle-sync.js`'s marker write snapshots the full CURRENT
source manifest as the next `base`, regardless of which files were actually applied. A file
reported `unverified` (no known base, kept, not applied) then reads as `local` ("kept, upstream
unchanged") on the next sync, even though upstream did change and the target never received it —
silently hiding a real, still-pending upstream change. Likely fix: the marker's base for a given
file should be the base it was ACTUALLY compared/kept against this run (old base if kept as
`unverified`/`local`/`conflict`, new source hash only if applied), not a blanket re-snapshot of
current source. See `.project/compaction/archives/portable-skill-installation-2026-09-25T13-27-02-414Z/files/log.md` (S3 observation) for
the exact repro.

## TOCTOU: ancestor-symlink race between resolveFile's check and the later write

Found 2026-09-25 during `portable-skill-installation` audit cycle 1 (security-reviewer,
deferred should-fix). `skill-registry.js`'s `resolveFile` lstats every path component once and
returns a plain string; the actual write happens afterward with no re-check. A second local
process with write access to the same project directory could in theory swap an ancestor
directory (e.g. `.project/skills/`) for a symlink in the window between the check and the write,
redirecting an install/reconcile write outside the intended tree. Not reachable from malicious
upstream skill content alone (symlinks inside fetched content are already rejected before this
point) — requires an independent local attacker already capable of racing filesystem operations
on the same host, a materially stronger precondition than this tool's actual threat model.
Deferred rather than fixed: `.project/compaction/archives/portable-skill-installation-2026-09-25T13-27-02-414Z/files/audit-cycle-1.md` has
the full reasoning. Candidate fix if ever prioritized: verify device/inode of the opened file
descriptor against a fresh `lstatSync` of the resolved path before trusting a write.

## First real-use trial of /pitch-compress

The tool has only ever run against fixtures. Try it once on a low-stakes shipped pitch (with the
archive kept) and record what the real content exposes that the fixtures did not.

**Done 2026-09-25 on `portable-skill-installation`** (19 required sections, all extracted, 0 gaps; archive
verified; 12 files removed; ledger, archive, and `done-work.md` entry kept). What real content exposed that
fixtures did not:
- `remove` leaves the emptied pitch directory behind, and `inventory` and `/state` then read it as an
  *active* pitch. Fixed in `inventory` (an empty directory whose slug is in `done-work.md` is "already
  compacted"; tested). Open question: should `remove` also delete the empty directory?
- The ledger's "destination exists" check is only mechanical. Extraction needed a real look at whether the
  destination held the claim; nine of nineteen sections mapped to durable docs that already existed, and the
  rest needed one new decision entry. Consider a `verify-destination` hint (a phrase that must appear in the
  destination) so a mapping cannot point at a file that merely exists.
- The summary is written before the archive exists, so the archive pointer needs a second `write-done-work`
  run; a `--archive latest` option would remove that round trip.
- Decision on `/state`: after compaction it now shows the pitch as "compacted" from `done-work.md`. Still a
  separate, human-chosen step; calling it automatically would leave no diff (report output is git-ignored).

## Wire /state into /pitch-compress once project-state-report ships

The parent pitch wanted an automatic `/state` run after compaction; deliberately left out because
the command does not exist yet.

Update 2026-09-25, at the `project-state-report` ship: `/state` now exists. The `/pitch-compress`
playbook names it as an explicit, human-chosen step after a removal (compacted pitches appear in the
report from `done-work.md`). Still open: whether to call it automatically; decide after the first
real compaction, and note that `/state` output is git-ignored, so an automatic run leaves no diff.

## Verify the OpenCode effort and skill wiring in a live session

Raised 2026-09-25 at `metrics-report-dimensions` ship. The OpenCode plugin passes `variant` from
`chat.message` as reasoning effort and counts `tool.execute.after` calls whose tool id is `skill`.
Both were written against `@opencode-ai/plugin` 1.17.20 type definitions and tested with stubs only.
Run one OpenCode session that uses a skill with a non-default variant and confirm the report shows
that effort and that skill; if the tool id or field differs, fix the plugin. Until then the report
shows `Unreported` for those fields on OpenCode, which is truthful.

## Confirm the new Claude Skill hook fires in a fresh session

Raised 2026-09-25 at the same ship. The `PostToolUse` `Skill` entry in `.claude/settings.json` was
written from payload keys captured live, but the entry itself has not been observed running. Start a
new Claude Code session, invoke any skill, and check that `skills.claude.<name>.uses` increments in
`.project/metrics/token-consumption.json`.

## Verify /state on Codex and Cursor in a running host

Raised 2026-09-25 at the `project-state-report` ship. Claude Code (skill listed) and OpenCode
(`opencode debug skill` returns `state`) were checked live. Codex has the `.agents/skills/state` pointer
and Cursor a byte-identical mirror (43 current, 0 differ), but neither was run in a host. In each: invoke
`/state`, confirm it runs `state-snapshot.js` then `state-render.js` and reports by fact status.

## commit-ledger writes through a symlinked .project/compaction

Raised 2026-09-25 by the cycle-3 security re-check. `pitch-compress.js commit-ledger` still uses
`mkdirSync` + `writeFileSync` for `.project/compaction/ledgers/<slug>.json`, following a symlinked
`compaction` or `ledgers` directory. Pre-existing and not reachable from `/state`; only through the
human-approved compaction CLI. Give it the same lstat check and temp file + rename that
`writeDoneWork` now has.

## Quoted font families fall back to the default font

**Resolved 2026-09-26:** shipped state-quoted-fonts. Bounded quoted families and one same-file font variable hop are parsed and re-emitted, with renderer-side validation retained.

Raised 2026-09-25. The strict theme grammar rejects any quote, so `'Inter', sans-serif` or
`var(--font-inter)` in a project's CSS renders in the fallback font. If real projects hit this often,
accept a quoted family only in the exact form `"[A-Za-z0-9 -]{1,40}"` and re-emit it from the validated
name, and resolve one level of `var()` within the same file.

## /pitch-compress and /pitch-archive have no CHANGELOG entry of their own

Raised 2026-09-25 while compacting `pitch-compaction`. The feature (skill, `pitch-compress.js`,
`pitch-archive.js`, the `done-work.md` scaffold) shipped in commits without a `changelog.js` entry; only the
2.8.0 entry mentions `pitch-compress`, and only for its hardening. A project syncing from an older bundle sees no
changelog line for the new skill. `CHANGELOG.md` says past entries are not hand-edited, so the fix is a new
entry (a patch bump) describing the skill as an addition that was previously unlogged.

**Resolved 2026-09-25:** logged in the 2.8.1 entry (as a detail, not a retroactive 'Added' release).

## commitLedger's transaction context differs from pitch-archive's guard and recover

Raised 2026-09-26 by the independent re-review of the compaction tool (`review-compaction.md`, P14). The concurrent session's
uncommitted change to `commitLedger` writes the ledger through `transact(context(root, "project"))` (state
`.project/skills`, roots `{project, target}`), while `pitch-archive.js` guards and recovers under `.project/compaction` with roots
`{target}`. An interrupted `commit-ledger` leaves a journal in a directory that neither `pitch-archive.js recover` nor its
interrupted-transaction guard looks at (reviewer PoC; the static mismatch was verified by reading both contexts). The partial
ledger fails closed at remove, but no compaction command can recover it. Fix: give `commitLedger` the same context as
`pitch-archive.js` `ctxFor` (export it) and route the guard and recovery through one context. Owner: `path-safety-hardening`.

## Ledger required-set design: content binding, other files, setext and nested headings

Raised 2026-09-26 by the same re-review (P16). Recorded limits, not regressions: the ledger is bound to section *keys*, not
section *content* (rewrite a section after the ledger is written, re-archive, and the old ledger still opens the gate); files other
than `SHIPPED.md`, `pitch.md`, `audit-cycle-*.md`, `deviations.md` and `log.md` (research notes, spike files) are never required;
setext headings, `###`-only files and preamble text under a file's title are not sections; a destination may be another pitch's
live file. Options: store a per-section body hash in the ledger and compare at remove, require a "preamble/other" entry for any
unlisted file, and refuse destinations under `.project/pitches/`. Needs a decision on how strict the playbook should be.

## OpenCode plugin hardening and the untested collector-to-renderer contract values

Raised 2026-09-26 by the independent re-review of the metrics stack (`review-metrics.md`, Q11 and Q15). The plugin
`.opencode/plugins/token-consumption.js` throws into OpenCode on null hook arguments (`chat.message`, `tool.execute.after`,
and the `event` destructuring are outside its try/catch), stores `input.agent` and `input.variant` unbounded in its
session maps, shares one Map key for an undefined `sessionID`, and builds the model as `` `${providerID}/${modelID}` ``
(the collector now folds `undefined/undefined` to unreported, but the plugin should not send it). Also, the
collector-to-renderer field `dimensions.since` and the plugin's `metricScope` value are asserted by no test: the review
bench refused canaries on both because they broke nothing. Needs one small pitch (plugin + its test + two assertions).

## Metrics collector: TOCTOU on reads, and clamped lifetime totals

Raised 2026-09-26 (same review, acknowledged items). The snapshot and `modes.json` guards `lstat` then read by name, so a
swap to a FIFO or a large file after the check would still block or bloat; open once with
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK`, `fstat` the descriptor, and read at most the bound. Separately, lifetime totals are
clamped with `Math.max(0, ...)` while `patterns/reversible-aggregates-store-their-routing` says "never clamp": either stop
clamping or document lifetime totals as the exception. The overflow bucket "Other (overflow)" also shows names rejected by the
allow-list, not only overflow; relabel it "Other (overflow or invalid)".

## /state report: four small UX/i18n nits from the original audit, never actioned

Raised 2026-09-27 by the S3 independent re-review of `independent-rereview-catch-up` (`review-state.md`'s
HTML-nits triage; originally found at project-state-report's audit cycle 1, item 17, acknowledged and
never actioned). All four are in `ai-framework/scripts/state-render.js`: `<html lang="en">` is
hard-coded even though a project's own text may not be English; dates (`generatedAt`, `shipped`, run
names) are plain text, not `<time>`; tap-target size on badges/links has not been measured against the
rendered CSS; the repeated `<span class="none">—</span>` across a full table may need `aria-hidden` (a UX
call, not a certainty). Small enough to fold into whichever pitch next touches this file, not its own
pitch. (A fifth nit, no `color-scheme` meta tag, was rejected: the stylesheet already sets
`color-scheme:light dark` on `:root`, so the meta tag would be redundant for this single self-contained page.)

## Independent re-review of the S3 fixes' third round (not independently re-reviewed)

Raised 2026-09-27. `independent-rereview-catch-up` S3's cycle-2 re-review found two of the six round-1
fixes incomplete (`state-snapshot.js`'s truncation-status fix missed two call sites; the error-leak fix
missed `state-snapshot.js`'s own three `realpathSync(root)` sites). Both were fixed in a third round,
verified by regression test and mutation check, but the big-batch 3-cycle cap was already used by S1's
own cycles elsewhere in this pitch's slices, so no fourth independent dispatch re-checked this round. Low
risk (small, mechanical, mutation-verified patches), but worth a fresh look if `/state`'s code is touched
again before this is folded into a routine review.

## /cooldown: should a slice's file cap reserve headroom for "review finds more than the known bug"?

Raised 2026-09-27 by `independent-rereview-catch-up`'s two cap raises (15→16→19). Both raises were sized
to the specific bug already known going in, and both undercounted because the review the pitch exists to
run found more. Worth asking at the next `/cooldown` whether the standing per-slice/total file-cap
convention should build in a fixed reserve (e.g. +2) for exactly this case, so a well-justified single
raise is the norm rather than a second surprise mid-slice.

## review-bench.js: is convention-based "read-only" enough for this tool's threat model?

Raised 2026-09-27 by /audit cycle 1 of `independent-rereview-catch-up`. After the four must-fix security
fixes (ancestor-symlink escape, unguarded symlink-following writes, raw error/path leaks, an unguarded
FIFO-read hang — see `audit-cycle-1.md`), `guard`/`prepare` are now solid detective and preventive controls
for what they directly check. But nothing in the tool forces an orchestrator to actually call `guard`
around every dispatch, and no reviewer subprocess is sandboxed (chroot/seccomp/fs permission drop) from
touching the real project beyond being told the scratch path in its prompt. Worth a `/cooldown` question:
given this is internal developer tooling, not exposed to untrusted end users, is convention (a disciplined
orchestrator) an acceptable boundary here, or should a future pitch add real process isolation?

## Metrics lease: verify on Linux and Windows, and reduce cross-project port collisions

Raised 2026-09-27 by `collector-robustness` C2/C3. The kernel-held loopback lease (`metrics-lock.js`) is
verified on macOS only; Windows socket exclusivity semantics differ and Linux needs a real run. Unrelated
projects share a derived port with probability ~1/10,000 per pair and skip each other's events while one
holds; one full parallel test run failed this way (likely, not confirmed). Options: a wider port span, or a
per-directory port chosen once and recorded, with the trust questions that brings. Also untested: the guard
that closes a server whose `listen` completes after its attempt timed out (needs timing fault injection).

## Path-safety completion disposition — 2026-09-27

**Shipped 2026-09-27:** user approved path-safety-hardening. The approved trusted-directory
contract intentionally leaves hostile ancestor replacement after the final pathname check
outside the guarantee. The original stronger TOCTOU requirement remains unresolved rather
than being represented as fixed.

Ledger symlink refusal is verified, and the ledger/archive transaction-context mismatch is
fixed using one compaction namespace and tested real interruption recovery. Old installer
journals retain their recovery route; migration requires stopping old compaction writers.
Ledger symlink refusal and the transaction-context mismatch are closed by this ship.

## Review bench tree guard must exclude secret filenames

Found during path-safety completion audit on 2026-09-27: review-bench.js has a SECRET_NAME
matcher in its copy/reader path, but walkTree's skip predicate omits it before hashing files.
The audit used a private copy with that matcher added to the skip predicate; no secret files
were read by the guard in this run. Future bench hardening should apply the same exclusion to
tree walking and verify that secret-shaped files are never opened. No shared bench source was
changed as part of path safety.

## shape-lite followups — 2026-10-07

- `skill-defaults.test.js` "live caveman state truthfully" fails at HEAD when caveman is not installed in the source checkout; make it fixture-only or skip when absent.
- `outsideCode`: multi-line code spans, a backtick in a fence info string, and a symlinked `CLAUDE.md` are unhandled; confirm Claude Code's exact behaviour first.
- `/shape-lite` step 1: one active pitch plus an unrelated task is ambiguous; add a rule.
- Run `/shape-lite` end to end on a throwaway task per host (OpenCode, Codex, Cursor); only Claude Code wiring is checked statically.
- Cycle-2 reviewer lacked `setup-validator.js`/`bundle-sync.js` callers in scratch; a caller-inclusive re-review of the entry-import wiring is open.

## Orca foundation followups — 2026-10-07

- Before dispatch, confirm Orca's required child environment and define an allowlist; preflight currently inherits the operator environment with a sanitized PATH (audit S4).
- At dispatch /plan, freeze and review the foundation `report --json` contract and rerun cross-pitch overlap checks for preflight, doctor, harness docs, release records, and eval fixtures (audit S6).
- Add a presence-check fixture with an actual launcher in cwd and relative/empty PATH entries; the shared PATH helper and child regression are covered, but that specific presence-only fixture remains open (audit S7).
- At /cooldown, require stored exact reviewer prompts and prompt hashes: the external foundation audit omitted them, so `review-bench.js record-check` cannot validate its record.

- readme-split (2026-10-07): `workflow-doctor.js` has no dedicated test file; docs checks covered only indirectly via `skill-defaults.test.mts`. Add one. Also: `docs-links.js` ignores reference-style links, HTML anchors and setext headings.

- ts-runtime-injection (2026-10-08): runtime modules (`bun`, `cli`, `entry`, `env`, `node`, `select`) are only covered through shared tests; add per-module tests. Replace repeated Node flag arrays in spawn sites with the shared `NODE_FLAGS`. Add regression tests for the bundle-sync symlink refusals and `--base-ref` rejection. Post-edit hook: `.claude`-substring skips the secret scan; stdin/file reads are unbounded. Template hook paths are cwd-relative. Doctor/validator print "N files parse" even when some parse checks were skipped (info line emitted).

- orca-vendor-dispatch (2026-10-08): kill the whole process group on timeout in `runtime/node.mts` and `bun.mts` (orphans keep pipes open until they exit); move the coordinator/worker membership check into the launch gate (callers of `launchWorker` bypass it today); add a test that changes a ledger slot between read and rename (a deleted compare-before-rename survived); prune settled ledger records and isolate one corrupt record so it does not block every task; Bun grace path drops partial output (Node keeps it); a missing launcher (ENOENT) is labelled unknown-liveness; replace the guessed `WORKER_ENV_MARKERS` once a real worker env is observed; observe Codex/OpenCode completion and peer messaging live (S0 gap); `orca-vendor-reconcile` pitch is next.

- orca-vendor-reconcile (2026-10-08): wire reconcile into /audit and /ship and write the executable grader (`orca-vendor-reconcile-integration`); unit-level proof of the cleanup filter-driver guard and the apply `--ignore-submodules` flag (end-to-end tests are shadowed by other layers); `apply.whitespace`/`core.autocrlf`/`eol`/`ident` can change written bytes (consider `-c` overrides and refusing non-unspecified attributes); admission keeps its own 120 s budget instead of the caller deadline; ignored-path check does not read the user's global excludes; prune settled ledger/evidence/snapshot directories; race of two reconcile processes and a person touching a worktree between decide and perform are untested; third-cycle fixes need an independent re-review; observe real Orca `worker-release` output against the settlement parser.

## Workflow usage metrics followups — 2026-10-08

- `workflow-usage-capture`: shape explicit workflow lifecycle instrumentation and verified Claude/Codex/OpenCode/Cursor adapters; distinguish primary/subagent work and replace automatic token hooks with useful events. Preserve existing historical files; require live capture proof or explicit unverified status. Core 2.16.0 is the dependency, not evidence of automatic capture.
- `workflow-usage-adoption`: after capture contracts stabilize, shape `/state`, setup/doctor, bundle-sync and project-local rollout. Application projects need their own repository scope; no automatic fleet discovery/upload. Optional comparisons take explicit roots and report incomplete evidence honestly.
- `metrics-core-maintainability`: reconcile approved cohesive state/report modules with generic size/manual-schema conventions in a bounded mechanical refactor; preserve all behavioral contracts and hostile-state checks, and avoid introducing a validation dependency without a deliberate scope decision (audit D4).

## Test runtime helpers followups — 2026-10-08

- Commit-order blocker (must clear before any clean checkout works): `runtime/test-helpers.mts` and `runtime/test-helpers.test.mts` are untracked while `orca-apply.test.mts` in `HEAD` already imports them (the S4 refactor landed in `fb38efd` under `orca-vendor-reconcile`). Commit `runtime/{test-helpers.mts,test-helpers.test.mts,types.mts,node.mts}` as one unit. Do not rewrite `fb38efd`. Tell `workflow-usage-metrics` to record the dependency in its `deviations.md` and correct `plan.md:98` ("no test-helper/API changes required" is no longer true).
- `runScript`'s `NODE_FLAGS` branch never executes on Node >= 22.18 or Bun (`process.features.typescript === "strip"`), so Node 22.12-22.17 support is unproven. Extract a pure `nodeFlagsFor(runtime, script, features)` and unit-test both branches; or add a CI matrix entry on Node 22.14.
- `memoryFs` has untested surface no pilot currently needs: `readdirEntriesSync` (16 lines), `readBytesSync`, the `Uint8Array` content branch, and empty-`files`. Add tests when the first pilot needs them, and re-check `existsSync` on a dangling link (still `true`, real `fs` says `false`) plus `readdirSync` error code (`ENOENT` vs Node's `ENOTDIR`).
- `CapturedDeps` extends the deps object with `out`/`err` before handing it to production code. Harmless today, but any `{...deps}` into a logged or serialized structure leaks test state. Consider returning `{ deps, out, err }` instead.
- `FsDeps.symlinkSync` is a required member with no typecheck in this repo. Hand-written `fs` object literals in ~14 test files will fail silently at runtime if one is missed. Add a parity guard in `runtime/invariants.test.mts` asserting every `FsDeps` key exists on both the node and bun adapters, or make the member optional.
- `runtime/runtime.test.mts` "extended fs surface behaves like node:fs" uses a raw `node:fs` `symlinkSync`, so it never proves the adapter method. Add a read-back case through `deps.fs.symlinkSync` for both adapters.
- `runtime.test.mts:337` ("the project .env picks the runner but none of its other variables reach `proc.env`") asserts `deepEqual(deps.proc.env, { PATH: "/usr/bin" })`, but `selectRuntime` now injects the resolved runner into `proc.env` (`select.mts:37`). Reproduced at HEAD with the helper pitch's adapter changes stashed. Fix in `fix-workflow-runner-env`: assert the runner key is present and the *other* `.env` keys (`OPENAI_API_KEY`, `NODE_OPTIONS`) are absent, rather than deep-equalling the whole object.
- `workflowInvocation` selects the bare runner name (`"node"` / `"bun"`) whenever the requested runner differs from the current one, so the child must find that name on `PATH`. An `options.env` without `PATH` makes it fail with ENOENT. Resolve a real executable path, or document that callers must preserve `PATH` when overriding `options.env`.
- `fix-workflow-runner-env`: `review-bench.mts` requires a node-prefixed test command, and three portable inline hooks start `node -e` without the shared dispatcher. Neither goes through `runWorkflowSync`.
- Muted candidate set: 34 test files still import `node:fs`/`node:os`/`node:path`/`node:child_process` directly. Only migrate a file that is already being edited; bulk migration has no appetite.

## Runner env followups — 2026-10-08

- `hooks.json` has no test asserting the command wiring of the three `workflow-notice.mts` entries; a typo would go uncaught.
- Hooks still bootstrap with a literal `node`; a Bun-only host cannot start any hook. Document as a prerequisite or add a bootstrap-free path.
- `workflow-notice.mts` exits 1 above 64 KiB instead of passing input through. Decide whether fail-open pass-through is preferable.
- `setup-validator.mts` and `workflow-doctor.mts` pick parse-check args from `deps.runtime`, not the effective runner; no disagreeing input found, `selectRuntime` keeps them aligned.
- An explicit child `AI_WORKFLOW_RUNNER=""` selects Node even when the process env says Bun.
- Node parity was not re-run at ship time and Node 22.12-22.17 flag handling is still unproven.

## orca-vendor-reconcile-integration — 2026-10-08

- Run the live smoke for Codex, OpenCode and peer messaging when funds allow; record pass / fail / not-run per target.
- `reconcile` with no `--check` passes an empty list to the library; decide whether the library should refuse an integration with no independent checks.
- Trace whether the CLI's verbatim outcome can carry launch stdout/stderr; cap or drop it if so.
- Grader copies up to 200 chars of error text into its report; emit an error code only.
- Test-coverage-checker was not dispatched at audit; the next audit should include it.
- Bun full suite intermittently fails 1-4 tests when run right after the Node suite (runs: 1, 0, 4, 0 failures). Names were not captured; rerun with output saved to identify the flaky tests.
- `skill-defaults.test.mts` "doctor and setup-validator report the live caveman state truthfully" fails on a clean `git archive` export (also at HEAD): it needs the gitignored local caveman install (`.project/skills/registry.json`, `.claude/skills/caveman/`). Make it install a fixture skill or skip when absent. A clean export also skips 3 more tests than the working tree.

## Orca smoke followups — 2026-10-08

From the local orca smoke in `runs/orca-smoke-2026-10-08.md`. Findings F1 and F2 are real; F3 and F4 are informational.

- **(F1)** SHIPPED 2026-10-08 as `fix-orca-dispatch-resume-gate`: `orca-dispatch.mts` `resumeExisting` skipped the policy gate and the switch; the CLI exited 0 on a `resume` outcome. Fixed by re-checking `orcaMultiAgentEnabled` and `evaluateLaunch` before the replay branch, plus 2 regression tests.
- **(F2)** SHIPPED 2026-10-08 as `fix-orca-dispatch-resume-gate`: `parseArgs` rejected repeated `--vendor`. `status` now accepts a repeated vendor; other commands refuse it as `vendor-not-repeatable`.
- **(F3 informational)** — no action. `orca-eval-grader.mts` reports 3 live-only cases as `not-run` by design; counts separate; `liveCompatibility: "unverified"` stays unverified.
- **(F4 informational)** — no action. The smoke left one ledger entry under `.project/metrics/orca-ledger/` (Git-ignored).

## follow-orca-dispatch-resume-gate — 2026-10-08

- `workflow-doctor`'s OpenCode check reports `WARN | OpenCode | could not resolve config` whenever `opencode debug config` runs inside a live OpenCode session, because the managed service port is already bound by that session. Truthful, not a code defect. Decide whether the check should detect that case and report "cannot verify inside a live session" instead of a bare warning.
- Bun parity for the whole repository exceeds a 400 s shell budget (`token-consumption.test.mts` and `browser-runtime.test.mts` carry >100 s integration tests). Either raise the budget or split those files so a full Bun run is practical.
- The env-source contract moved from `.env` to `ai_workflow_env.json`, but `SETUP.md`, `docs/setup.md` and `docs/design-notes.md` may still tell a reader to put runner settings in `.env`. Check every doc for that claim while the contract is fresh.
- `fix-orca-dispatch-resume-gate` shipped a wrong fix that only surfaced at the changelog step: a `git show HEAD:<file>` "restore" of `.env.example` reversed a deletion that CHANGELOG 2.18.0 had already recorded as intentional (replaced by `ai_workflow_env.example.json`). When a test or `git diff` says a file is missing, check the recorded decision — CHANGELOG, README link, `.gitignore` — before restoring it. Consider a rule clause: "a missing tracked file is a decision to verify, not a deletion to undo."

## state report hardening leftovers (audit cycles 2-3 of state-multipage-report, 2026-10-08)
- Snapshot metadata walkers (state-snapshot.mts ~293) lack the ancestor-symlink containment the structure scan has; reuse `insideProject`.
- `writeSet` creates the reports directory before validating its ancestors (F6); directory enumeration in the structure scan lists a whole directory before the visit cap applies (F9).
- Orca: `collect` rejects a worker report whose files list names a path outside the project; read-only reviewers should report in the message body. Idle worker terminals need `worker-release` before the ledger can be settled.
- ~~`browser-runtime.test.mts` "CLI end to end" fails locally when `ai_workflow_env.json` selects `bun` (the test empties PATH); pin the runner in the child env.~~ (resolved 2026-10-17: the child runner is pinned to the host) `token-consumption.test.mts` has one intermittent failure on a clean HEAD (passed in the final full Node run). See issue `a-local-workflow-env-file-changes-which-runner-path-tests-spawn`.
- Pitch `orca-auto-start-all-phases` is shaped (critique pending): start gate from `evaluateLaunch`, stop-and-ask, `orca=normal` per-call override.

## orca-auto-start-all-phases leftovers (audit cycles 1-2, 2026-10-08)
- Defence in depth for the Orca start hook: `runDirect` should accept a fail-closed exit code for hook scripts so an entry copied without the `AI_WORKFLOW_RUNNER=node` prefix cannot fail open when the configured runner is missing.
- Migrate `orca-start-hook.test.mts` and `orca-start.test.mts` off direct `node:*` imports (`runtime/test-helpers`) before `runner-aware-runtime-boundary-validator` lands.
- Later pitches: the 12-skill start block rollout (24 canonical files plus mirrors, byte-identity vs pointer stubs), and the Codex, OpenCode and Cursor adapters (OpenCode `tool.hook`, Codex `hooks.json`; no live proof outside Claude Code).
- Orca coordinator-side `evaluateLaunch` still passes the full parent env to its probe child (existing launch gate; out of scope for this pitch).

## runner-aware-runtime-boundary-validator leftovers (2026-10-08)
- ~~Migrate the 43 test files that still import `node:fs/os/path/child_process/url/module/crypto/net` to `runtime/test-helpers`~~ (resolved 2026-10-17: 49 files migrated, doctor Runtime boundary 0 test violations) (`createTestDeps`, `tempFixture`, `runScript`, `memoryFs`, `captureIo`); the doctor's Runtime boundary warning lists the count and the first files. The two Orca start test files are in that set.
- Remaining validator test gaps left as listed in `audit-cycle-2.md` S7 (root symlink, fstat size/type refusal, close error, default deps, doctor plain output / non-directory / exhausted cap).
- A purely computed `import(x)` and an uncalled `require` are advisory only; consider promoting them if the 8 current computed imports are all reviewed and justified.
- Cycle-2 final fixes were verified by coordinator-run probes and suites, not by a third independent review; revisit at the next cooldown or when the validator is next touched.

## codex-orca-coordinator-parity — 2026-10-08

- Priority: fix review-bench guard to exclude secret names before any read/hash, even for Git-ignored files. Test with a read-refusing spy, secret fixture and nonsecret-change control. This audit used secret-excluding injected deps; the CLI remains unfixed.
- Verify Codex automatic UserPromptSubmit ready context and blocking behavior in a fresh session after `/hooks` trust review. Existing dispatch/collection/release proof does not prove host activation; never bypass trust to manufacture proof.
- Decide whether to support non-Git hook bootstrap and stricter unsupported direct --root parsing. Current registration requires Git/checkout and blocks before the off check if root lookup fails; documented and tested.
- Make coverage compatible with the existing exact child-environment assertion without weakening it. Keep Node/Bun regression results separate from instrumentation failures; investigate Bun1.4.2 coverage crash independently.

## upstream-project-drift leftovers (2026-10-16)
- RN's `next-pitch.mts` pitch numbering: decide whether it becomes a base feature (its own pitch) or stays RN-only (decision 14).
- Runner-aware usage text and hook commands, so projects that run Bun stop hand-editing `node` into `bun` (RN did
  this across docs and hooks). Belongs to `unified-toon-config` (decision 11).
- Climbing: upgrade Orca to 1.4.224 or later before `workflow-v3-rollout` syncs it (decision 13).
- Flaky tests that fail only under full-suite load, and pass when their file runs alone: "descendant ownership
  after timeout/output" (runtime, node and bun), the orca-eval-grader mutation proof ("settle without evidence"),
  diff-admit "a rename is annotated on the add…", reconcile "a diff that touches check definitions…".
- Orca attempts dispatched under 2.22.x have no `authorizedPaths` and cannot be reconciled after 2.23.0. Decide
  whether reconcile should accept a legacy attempt when a person confirms its file claims.
- Codex workers stop at an interactive update prompt (seen with 0.162.1 → 0.163.0) and fail at `agent_readiness`.
  Consider detecting this in the launch receipt and reporting it as its own reason.
- The drift ledger read only `ai-framework/` and missed climbing's `.opencode/` fixes. Later drift passes should
  also compare the vendor adapter directories.
- OpenCode plugin hardening (U4) was not part of this pitch.

## unified-toon-config leftovers (2026-10-16)
- Parser: an unclosed quote is accepted as a string, and a comma inside quotes is read as an array (both fail closed). Also: inconsistent indentation is accepted silently; dead codes `inspectPathMissing`/`regexpBacktracking`; the `errorCode` helper is copied four times.
- Migrator: `.gitignore` update has no re-check before its rename (lost update); classification of an unsupported file uses a regex over the message, a structured version field in `config.mts` would be sturdier (d51); no v1-to-v2 key conversion exists (`--force` replaces and keeps a backup).
- `readLegacyFile` ancestor race is unproven; `maxRetriesPerTask` is unbounded in config but 0..2 in `orca-policy`.
- TOON `skills.modes` has no per-phase slot, so a valid TOON ignores `modes.json` phases (d40). Move `readLegacyFile` into `config.mts`.
- For orca-role-pools: `orca-policy` rejects more than 2 workers per coordinator and keeps only the first role target; the grader writes the legacy JSON policy. For orca-engines-range: `engine` is required, so "default when key absent" cannot apply. For upstream-project-drift: its X2 assumes `orca-policy.mts` is unchanged, and its `status.md` row is stale. For workflow-v3-rollout: README/SETUP are now flagged files and v1 TOON files are refused.
- `orca-start.mts` `lookupWorker` asks for `--limit 100`; the worker list is now over the 256 KiB output cap, so Orca-requested phases block with `worker-identity-unavailable`. Use a smaller page size.
- Flaky only under full-suite load: skill-defaults "FIFO or oversize modes.json is skipped".
- `pre-ship-verify.mts` fails in this repo (no package.json or Muro verifier); the real checks are the test suite and validators.

### orca-engines-range leftovers
- Link the migrator's `DEFAULT_ENGINE` to `DEFAULT_ENGINE_RANGE` (or test they match) so a floor bump cannot drift.
- Decide whether `engineRange` should report invalid when a config file exists but fails to load, instead of using the default floor.
- The `engine-range-invalid` branches in preflight, gate and start are unreachable through config; delete them or test them directly.
- Optional doctor warning for a bare-version (exact pin) engine.

## orca-role-pools followups (shipped 2026-10-17, v2.27.0)

- **Live concurrency spike** (S4 skipped): run 4 / 8 / 16 no-op `worker-start` workers against a supervised Orca and record the ceiling in `orca-vendors.md` before raising the default (3).
- **Case-folded path overlap**: `authorizedPathsOverlap` is case-sensitive; on case-insensitive filesystems `Src/` and `src/` can both be live. Reject case variants in `validAuthorizedPaths` or compare case-folded. Integration (`orca-apply`) still refuses true overlap.
- ~~**In-place v2→v3 config conversion**~~ (resolved 2026-10-17 by vendor-model-toon: `convertV2`): the reader's refusal text promises `config-migrate --apply` converts v2 files; today it needs `--force` and drops values. Owner: vendor-model-toon / workflow-v3-rollout (its `--apply` step will hit this).
- **`runtime/upgrade.test.mts` (3 tests)**: the old-install fixture fails the agent-model-sweep doctor (Codex startup wiring, README links, mandatory `ai-workflow.toon`). Seed the fixture with the example toon / current bundle.
- **Review prompt hashes**: record the SHA-256 of each reviewer prompt in `audit.md` (the contract asks for it; skipped this time).
- **Vanishing local `ai-workflow.toon`**: it disappeared mid-audit with no known cause (gitignored, so nothing recovers it). Find the deleter; consider the doctor printing the recovery command.
- **Holder-state test as a table**: iterate `STATES` against the `holds` predicate instead of a loop plus one case.
- **workflow-v3-rollout planning inputs**: preflight now probes every pool member; release numbering with agent-model-sweep's 2.28.0.

## agent-model-sweep-bet-3 (cooldown 2026-10-17, bundled from SHIPPED.md followups) — **approved as a candidate pitch 2026-10-22**

Items bundled:
- Remove `model:` from `.opencode/agents/*.md` (16), `.codex/agents/*.toml` (16), `.opencode/commands/*.md` (28).
- Doctor relaxation: `checkAgent` under bundle routing no longer requires `^model: <toon id>$` in mirrors (per critique C12: split into 3a (doctor: presence→absence under bundle routing) + 3b (scripted sweep)).
- New tests for the doctor relaxation (mutant tests for the `^model:` requirement removal).
- Cursor regen: cursor-mirrors + manual copy of `report.differs` (the 16 `.cursor/agents/*.md` were already done in Bet 2; Bet 3 does not need to redo them).

## mandatory-fixture-seeding (cooldown 2026-10-17, bundled) — **approved as a candidate pitch 2026-10-22**

Items bundled:
- `upgrade.test.mts` 3 failures (Codex startup wiring, README links, mandatory `ai-workflow.toon` — pre-existing Bet 1 fixture gap).
- The "every test that creates a temp project from the bundle must seed the example toon" pattern (generalize from the skill-defaults/skill-vendors/orca-preflight fixes in Bet 1 and Bet 2).
- `agent-frontmatter-invariant.test.mts` negative fixtures (T2: out-of-allowlist profile, missing profile, malformed frontmatter, has-model-line).

## doc-sweep-stale-claims (cooldown 2026-10-17, bundled from agent-model-sweep Bet 2 audit should-fix) — **approved as a candidate pitch 2026-10-22**

Items bundled:
- `harnesses.md` OpenCode section still hardcodes model ids as authoritative (rows 17-19, 46-48).
- `parseFrontmatter` untyped return (TS strict; add `tsconfig.json` with `strict:true`).
- `new URL(...).pathname` portability (use `fileURLToPath` for Windows + macOS `/var` alias).
- Hardcoded agent count `=== 16` (assert `> 0` instead).
- Stale test titles referencing the removed fallback (rename to "reads profile: frontmatter (no legacy model: fallback)").

## bundle-sync-stale-ledger (cooldown 2026-10-17, bundled) — **approved as a candidate pitch 2026-10-22**

Items bundled:
- Refresh the rows in `.project/analysis/2026-10-16-upstream-drift-ledger-analysis.md` (the drift ledger, moved out of the compacted `upstream-project-drift` pitch) for `extending.md`/`vendors.md` (rows 79, 81, 168 — marked `conflict` because the project-side version differs from the updated bundle).
- Refresh row 270 (base-side `agent.build.model` description, now stale).
- Verify the bundle-sync seed flow carries the v3 toon into a fresh project (the bet 1 mandatory-toon check depends on the toon being present). **2026-10-22: also proven for the new consolidation files by `connected-memory-consolidation` P2d-S3 (fresh-install case); the rest of this bundle stays its own pitch.**

- ~~**upgrade.test.mts fails at HEAD (3 tests)**~~ (resolved 2026-10-17: the sync now adds missing workflow hook groups, the doctor and upgrade doc name `config-migrate --apply`, the simulation runs it): old-install fixture lacks `ai-workflow.toon` (doctor "mandatory" check fails) and Codex startup wiring is unregistered, so `workflow-doctor` exits 1. Found 2026-10-17 during vendor-model-toon completion; unrelated to its diff. Owner: workflow-v3-rollout / next cooldown.

## workflow-v3-rollout readiness run (2026-10-17)
- ~~`doctor.modelRouting` in `ai-workflow.toon` is inert~~ (resolved 2026-10-17: doctor reads the toon, reader validates, migrator carries the legacy value, default `bundle`): the doctor reads only the legacy `.project/workflow-doctor.json`, `config-migrate` always writes `project` (never reads the legacy file), and the reader accepts any string. Decide the default before retiring the legacy file. See `workflow-v3-rollout/readiness.md`.
- ~~The doctor checks Codex Orca startup wiring~~ (resolved 2026-10-17: "Claude startup wiring" check added) (`AI_WORKFLOW_RUNNER=node node ...`) but not the Claude `PreToolUse`/`UserPromptExpansion` Orca hooks; RN's bun-wired Claude hooks pass silently.
- `skill-vendors cursor-mirrors --apply` skips project-added agents (climbing `e2e-runner`, `tdd-guide`).
- token-consumption tests flake ~1 in 12 isolated runs with "metrics lock is held by another writer" (the lock port is a hash of the directory mod 10000).
- ~~Post-commit graph hook drops the knowledge overlay~~ (resolved 2026-10-17: `graphify.mts setup` installs overlay-aware hooks, replaces raw blocks; doctor warns while one remains).

## fix-instruction-conflicts leftovers (2026-10-18)
- Golden behavior cases for the workflow's own prompts (gates per appetite, Orca refusal stop, review summary/INCOMPLETE, AI-scope trigger outside `lib/ai/prompts/`, read-only reviewer, cycle caps, lite card). Owned by `instruction-compression`; required before its bet. The fix's eval review is recorded `not-completed` with the risk accepted by the owner.
- Reviewer scratch copies must include every file a contract reads (`.agents/`, `SETUP.md`, hook modules, `skill-vendors.json`): the first code review and two suites came back incomplete only because the copy lacked them.

## instruction-compression leftovers (2026-10-19)
- **S3 ship wrapper retry** (med): deferred after final OpenCode scoring lost two satisfied review-nonsecurity-evidence criteria and returned two baseline zeros as null. Restart from `.project/analysis/2026-10-18-instruction-compression-s3-review-analysis.md` (what completed, the four criterion losses, the restore plan), not from the rejected draft. The rejected trial files and the other pitch records are in the recovery archive (`pitch-archive.mts restore instruction-compression`); the frozen dataset stays at `.project/evals/datasets/instruction-compression.json`.
- Reviewer approval criteria conflict with incomplete-review handling (unchanged owner text); attribute before compressing further.
- OpenCode native loading is unobservable (clipped terminal fallback, no read events); Codex and Cursor behavior unverified.
- Remaining ~40 canonical wrappers and the repeated caveman/dispatch banners are not compressed; measured savings so far are source-word proxies only.
- Mutation-proof scripts that edit source in place must restore on exit (trap) — see knowledge issue `mutation-script-killed-leaves-source-mutated`.

## toon-machine-data leftovers (2026-10-19)
- **toon-skill-registry** (med): (start from `.project/analysis/2026-10-18-agent-load-inventory-analysis.md`) `.project/skills/registry.json` is the one existing file agents open on every phase (the caveman banner says to check it). Six readers (`skill-registry`, `skill-sync`, `add-skill`, `state-snapshot`, `bundle-sync`, `browser-runtime`), five tests, `.gitignore` and the bundle-sync "never synced" rule change with it. Sequence after the banner rewrite in `instruction-compression`.
- Wire `eval-runner` and other readers to `readData` so the rule's "every reader" is true; today only `data-file.mts` and the converter use it (low).
- Converter and writer: detect JSON loss the parser hides (integers beyond 2^53, duplicate keys), refuse hard links, keep file mode on replace, fsync the directory (low).
- Run the 5 live-only golden cases in `.project/evals/datasets/toon-machine-data.json` once an eval harness exists (med).
- The agent-load inventory method in `.project/analysis/2026-10-18-agent-load-inventory-analysis.md` (evidence by `file:line`) could become a small script if more files are proposed for conversion (low).

## state-report-redesign leftovers (2026-10-19)
- Update the `/state` skill and its mirrors: "theme is rediscovered from the project's own CSS" is stale for monorepos; the CLI preview already names the reason (med).
- `state-pages.mts` `writeSetInner` runs `mkdirSync(recursive)` before its symlink check, so a symlinked `.project` leaves an empty `reports/` outside the project (low, pre-existing).
- Ownership marker is matched with `includes` anywhere in a page, so a user file that quotes it is overwritten; `readSource` reads up to 1 MiB before the 64 KB slice for `package.json` (low, pre-existing).
- Small duplication: `esc` in `state-charts.mts` and `state-render.mts`, three unavailable chips, `isFact` twice, unused `h.CSP` in `createStatePages` (low).
- The structure page still renders `structure.tree` for a monorepo; decide whether "monorepo never lists the tree" should cover it (low).
- View the redesigned report in a browser at 360px (sidebar height, chart fallback) and print (low, not done: static checks only).
- The `old install upgrades with its own bundle-sync` test took 111 s and failed once in the full parallel run; passes alone (low, flaky under load; the retry passed in the full suite).

## From token-attribution (2026-10-19)
- Codex usage: parse the session log for `total_token_usage` (about 45 LOC); the on-disk shape is unconfirmed, and so is whether `UserPromptSubmit` and `SubagentStop` repeat one session id. Needs `.codex/hooks.json` plus `orca-start-codex-hook.test.mts` changes (med).
- OpenCode child sessions: the plugin passes no parent session id, so child completions are `(unattributed)`; verify whether session-created events expose one (low-med).
- Verify live: the Claude `Stop` payload carries `transcript_path`, and `SubagentStop` vs `PostToolUse(Agent)` order for foreground agents (low).
- One pitch built across several git worktrees splits its metrics; a join or main-checkout resolution is not built (low).
- `leastRecentPitch` sorts pitches without `at` by NaN; `resolveFlow` can overshoot the leaf cap by one `(other)/(other)` row; stored context labels are only checked to be strings (low).
- Path-length cap and locked id-window filter have no distinguishing test (equivalent mutants) (low).
- Cross-pitch ruling needed: `state-report-redesign` (after the token revision) vs `state-deep-evidence` (wants redesign S2 first); `state-deep-evidence` plan.md:27 is stale (resolver export exists) (med).
- Brief workers with the data shape and pin the worktree base to HEAD; `ai-workflow.toon` is git-ignored so workers cannot run doctor-based checks (low).

## From state-fragment-sanitizer (2026-10-20)
- **`pre-ship-verify.mts` route for a package-less bundle** (med): the verifier selects its checks from a root `package.json` (or the Muro viewer verifier), and this bundle has neither, so `/ship` blocked on it on the first attempt. A durable route is needed: either a documented `verify:base`-style contract that does not require a `package.json`, or a bundle-local check manifest the verifier can read. The temporary `package.json` used at this ship is not a fix.
- **Renderer/injector wiring** (med): `sanitizeFragment` and `checkCitations` are a library only. Nothing calls them yet; `state-ai-authoring` owns the injector that places sanitized markup into a page and the provenance/staleness label.
- **Nine deferred dataset cases** (med): `.project/evals/datasets/state-ai-fragments.json` — 5 live-only (model, prompt-injection, snapshot) and 4 injector cases — are owned by `state-ai-authoring`; they are not enforced by any test today.
- **Shared transcript-path rule** (low): the evidence checker classifies a transcript path locally. Fold the rule into the shared `safeEvidencePath` once `state-report-redesign` releases `state-render.mts`, so there is one authority for secret/transcript paths.
- **`state-report-redesign` marker and token export** (low): the sanitizer's default allow-lists are the 7 color tokens and one marker class. The redesign pitch should export its class, token and marker lists and own the marker defs, so the integration point has real values to inject.

## From workflow-usage-state (2026-10-20)
- **`workflow-usage-capture` (A2) wires the hooks and calls the exported resolver** (med): this pitch is the state library only; nothing writes `session.started`, `agent.*` or phase events automatically. Shaping draft: `.project/pitches/workflow-usage-capture/shaping-draft.md`. `token-time-report` (part B) reads the state read-only and owns the time and flow tables.
- **Runtime constants for an `O_APPEND` marker open** (low-med): add `O_WRONLY`, `O_APPEND` and `O_CREAT` to `FsConstants` in `runtime/types.mts` and `runtime/node.mts` (and the Bun adapter), then open `workflow-usage.dropped` with them plus `O_NOFOLLOW`. Closes the accepted symlink-planting and FIFO-swap windows (`deviations.md` S6).
- **Full-suite `[dataset-mapping]` flake and `bun test ai-framework` stall** (med): 14 `state-fragment-dataset.test.mts` tests fail intermittently in the full Node suite ("a top-level test is not ok" in a child run); they pass alone and fail identically without this pitch. `bun test ai-framework` prints nothing and stalls. A stale `bun ../probe.mts` has run at 100% CPU since 11 Oct.
- **`pre-ship-verify.mts` for a package-less bundle** (med, hit again): exits 1 with no project checks; `/ship` ran the real commands from `stack.md` instead.
- **Audit tuning** (low): the test-coverage reviewer ran inside the code reviewer's canary scratch tree and reported the canary as its must-fix; give it its own tree. A reviewer wrote one output file inside the scratch audit directory (outside the repo, flagged in the record).
- **Test hygiene** (low): the full-cap size test takes about 8 s (`scopeRow` leaf recount); the cut-back test spins instead of failing if its guard is removed; the older metrics tests still bind the real loopback port (flake 0/12).
- **Step 3 hardening for small models, then re-run the OpenCode half of the live matrix** (med, from `state-ai-authoring`): path cheat sheet without `.value.`, links must be files, an absolute stop after two rejections; the live claim is `blocked` (51 of 72) until all vendors pass twice per case. Any skill wording change invalidates the earlier passes, so re-run the whole matrix.
- **`uncited-claim` fixture and rubric** (med, from `state-ai-authoring`): the fixture's knowledge fact has no evidence path, so "every risk cites an evidence path" cannot pass; either give the fact evidence or relax the case.
- **Fragment headings that repeat the label; long overview block** (low, from `state-ai-authoring` UX review): start fragments at h3; consider collapsing long bodies.
- **Empty-slot byte-identity test and summary accuracy** (low): render both paths from one fixture inside a test (no stored golden hash); the `AI analysis:` line counts a cap-omitted slot as fresh.
- **Close the by-path write/delete race in `fragments/`** (low): `process.chdir` into the checked directory in the CLI, or fd-relative file calls; `writeAtomic` is shared with `state.json`.
- **`review-bench guard` skips `.project/evals/runs/`** (low): the snapshot exceeded its size limit once 72 run directories existed; the audit used an mtime sweep.
- ~~`ai-workflow.toon` invalid mid-session~~ (resolved 2026-10-20 by the owner, `workers[2]: codex,claude`): the local git-ignored file was edited during `state-ai-authoring` and briefly failed `ORCHESTRATION-WORKERS-INCOMPLETE`; it was never a HEAD failure.
- **`state-deep-evidence`**: add any new clock-derived snapshot path to `VOLATILE_PATHS` and `state-report.md`, and keep its dataset cases out of `state-ai-fragments.json` (22-case partition).
- **Sanitizer wall-clock test fails under load** (med, root cause of the full-suite `[dataset-mapping]` flake; seen again in `state-ai-authoring`): `state-fragment.test.mts:255` "[reject-oversize-and-deep] 5 MB path d rejects as geometry…" asserts a time bound and took 1.24 s with six suites in parallel; the dataset test then reports 16 red lines (child exit 1, 346 of 347). Passes alone. Use a step-count or relative bound, or a generous ceiling.

- **Orca startup identity lookup exceeds its own output cap** (med, observed 2026-10-20 during `workflow-usage-capture`): `lookupWorker` requests 100 fully projected worker rows; the local receipt was 268,003 bytes, above `MAX_OUTPUT_BYTES` (262,144). Startup returned `worker-identity-unavailable` despite a healthy runtime. Owner-requested `orchestration reset --tasks` after verifying 111 dispatches and 110 tasks were settled restored readiness. Use smaller paginated worker-list requests or a bounded identity projection, and add a regression over a large historical worker fleet. Preserve live/unknown worker ownership; cleanup must remain an explicit user action.


## From workflow-usage-capture audit (2026-10-21)

- **Workflow metrics documentation clarity** (low; owner: workflow metrics docs maintenance): remove the
  ambiguity of the A1 core guide's planned hook table at workflow-metrics.md:125-128 now that the separate
  capture adapter is wired. harnesses.md already describes the current events and unwired vendors.
- **OpenCode token-plugin metadata retention** (low; owner: OpenCode token-plugin maintenance): the existing
  V2 steps Map has no cap/TTL when a start never gets an end/failure. Verified present before capture at
  868212b:129,147,169. Capture does not add entries to this Map. Add a bounded retention policy separately.
- **Orca model-pin capability preflight** (med; owner: Orca adapter maintenance): this runtime pins OpenCode
  models only for 1.18.30, 1.18.32 and 2.0.16; installed 2.1.1 is refused before worker creation. The library
  reduces that structured preflight failure to launch-failed:unproven and claims unknown ownership. Preserve
  a bounded safe error/capability receipt or probe before claiming, without weakening fail-closed liveness.
  This audit recovered using runtime code-path/version proof and used configured Claude alternates; no
  OpenCode version, credentials, global settings or app code was changed.


## From state-deep-evidence ship (2026-10-21)

- **state-monorepo-packages** (med): implement the deliberately cut S6 package map through bounded named manifest reads; preserve unavailable semantics until it exists.
- **Structured audit counts** (med): define stable machine-readable audit-cycle/must-fix/revision records; current history parser correctly reports unavailable for unrecognized prose formats. Keep event-derived transitions separate.
- **State metrics/tokens extraction** (low-med): split their cohesive reader/assembly functions out of state-snapshot.mts without duplicating token reads, scope resolution or usage semantics; snapshot exceeded its planned growth allowance.
- **structure.tree label hardening** (med): drop or replace directory labels outside a conservative allow-list. Existing tree names are explicitly outside the deep-evidence injection case; do not claim full-snapshot injection coverage from that case.
- **Deep-evidence live reliability and vendor rerun** (med): address Claude fact-path/no-fragment/semantic failures and rerun its 15-case matrix; rerun OpenCode when quota permits. Preserve the two 0.50 regressions and all not-run rows until fresh evidence replaces the claim. Coordinate with the existing Step 3 path-guidance followup; a skill change invalidates old authoring passes.

Existing backlog owners for the package-less ship wrapper, review-bench guard snapshot cap, sanitizer timing under load and Step 3 path guidance remain authoritative; no duplicate entries were added. Any guard repair must also honor the separate secret-file exclusion issue. Source-review canaries were correctly caught and excluded from the live queue in this ship.


## From test-execution-performance ship (2026-10-21)

- **Idle-host test timing rerun** (med): rerun the five candidates (Node default / 4 workers / cache, Bun default / `--parallel=4`) on an idle host from a fixed snapshot; append rows to `pitches/test-execution-performance/measurements.md` and update `ai-framework/docs/testing.md`. Promote only on ≥20% median reduction with exit-0 parity.
- **Bun full-suite timeouts** (med): `workflow-doctor` real-bundle-copy tests (two) and "every cap filled" size-bound test exceed Bun's 5 s default timeout; Bun default takes 2.7x Node. Decide whether to change the tests or document Bun as scoped-only. Never lengthen deadlines without a decision.
- **run-tests signal handling** (low): forward SIGINT/SIGTERM to the child and report the killing signal; `--root` default is untested directly.
- **Subprocess-matrix unit seams** (med): replace repeated CLI matrices (Codex start hook, 48 launches) with in-process cases while keeping executable-wiring smoke tests.
- **Testing guide discoverability** (low): link `testing.md` from the README docs table (omitted to keep the 5-file budget).

## From token-time-report — ship preparation (2026-10-21)

- **TTR-A1 — review-bench trusted-root Git execution** (med): prevent project/local/global Git config and environment from executing fsmonitor/filter helpers when inspecting an untrusted tree; preserve a narrow trusted-root contract and add execution-spy regressions. Current usage is restricted to this trusted checkout.
- **TTR-A2 — review-bench strict appetite counting** (med): reject non-finite/non-numeric --max, use NUL-delimited Git listings for non-ASCII filenames and preserve explicit bookkeeping filters. This pitch uses independent exact-file/numstat accounting.
- **TTR-A3 — bounded review-tool input/path diagnostics** (low-med): fix in-root '..name' snapshot destinations, validate snapshot shape, map filesystem errors to fixed diagnostics and tighten citation/record parsing. Preserve outside-only snapshots, symlink/FIFO refusals and current caps.
- **TTR-A4 — static flow-report usability polish** (low): consider Path-first/sticky row headers, descriptive single-row time totals, reduced duplicate title announcements and source-aware empty-state help; avoid implying browser geometry/contrast verification or weakening inert output.

**Resolved in this implementation, pending final ship closure:** the existing review-bench snapshot-size mismatch and secret-name tree-walk omissions. Production guard now shares a 16MiB snapshot read/write bound and skips protected names before reads; Node/Bun 35-case regressions and canonical snapshot/check pass. Existing historical items remain above; current resolution cards are [[review-guard-snapshot-can-outgrow-its-reader]] and [[review-guard-hashes-ignored-secret-files]].

The package-less pre-ship verifier and timing-under-load issues retain their existing backlog ownership. The mandatory wrapper failed again; the owner explicitly approved the documented direct-check gauntlet for this ship. No duplicate wrapper/timing pitch is added. Cooldown should review packet completeness, misnumbered citations and allocation-confounded mutation evidence; no rule change is auto-promoted.

## Cooldown candidate pitches (2026-10-21, forced)

- **Pitch `package-less-ship-verification`** (med; moved to [pitches/00-package-less-ship-verification/pitch.md](00-package-less-ship-verification/pitch.md) 2026-10-22): bundles the package-less `pre-ship-verify.mts` followups above. The verifier selects checks from a root `package.json`, which this bundle lacks; it blocked `/ship` on 4+ ships and each needed an owner-approved direct-check gauntlet. Fix via a documented check contract or bundle-local manifest; no temporary `package.json`.
- **Pitch `orca-bounded-control-receipts`** (med; moved to `pitches/orca-bounded-control-receipts/pitch.md` 2026-10-22; guard-reader-bounds half already fixed): bundles Orca model-pin capability preflight, startup worker-list output overflow and guard reader bounds. Keep ownership fail-closed and cleanup explicitly authorized.

## codex-trusted-hook-smoke (cooldown 2026-10-08 C2, approved 2026-10-22 as a candidate pitch)

Not shaped or bet. Needs a human at a fresh Codex host.
- Verify the current `UserPromptSubmit` definition through `/hooks` and observe a ready context, a blocked phase, worker suppression and budgets.
- No trust bypass and no global config edits; hook trust is an explicit owner action.

## workflow-coverage-instrumentation (cooldown 2026-10-08 C3, approved 2026-10-22 as a candidate pitch)

Not shaped or bet. Source followup is at the "coverage" entry above (line ~340).
- Make coverage compatible with the exact child-environment assertion without weakening it.
- Keep Node/Bun regression results separate from instrumentation failures; investigate the Bun 1.4.2 coverage crash on its own.
- Keep the ordinary runtime regression commands.

## connected-memory-consolidation ship verification (2026-10-22)

- **Stale live-evidence test blocks shipping** (high): `state-fragment-dataset.test.mts:435` reads the removed `.project/pitches/state-ai-authoring/live-runs.md` and fails with `ENOENT`. Full Node suite: 2,614 passed, one failed, three skipped. This is distinct from the older load-dependent dataset/sanitizer flake. Repair the evidence ownership through a separate fix/shape entry without fabricating live results, skipping validation or routinely reading recovery archives. Audit is at its three-cycle cap; ship remains blocked. Evidence: `runs/2026-10-22-connected-memory-consolidation-ship-verification.md`.

**Resolved 2026-10-23:** the separately approved `fix-retired-live-evidence-path` ship published the exact original matrix under durable ownership and changed the test path. The final parent regression passed 54/54, independent child tests passed 347/347, and the supported full Node suite passed. Historical `Claim: blocked` is preserved. Receipt: `runs/2026-10-23-fix-retired-live-evidence-path.md`. The diagnostics/timing followups remain separate.


## fix-retired-live-evidence-path — 2026-10-23

- **FRLE-D1 — bounded child-failure diagnostics** (med): state-fragment-dataset.test.mts:108/208 reduces a failing child to aggregate counts and stderr while TAP detail is on stdout. Preserve bounded failing child names/TAP diagnostics without weakening assertions, changing timing/security limits or echoing unbounded child output. Cycle2 observed child346/347 then16 dependent parent failures; exact cause unconfirmed. Subsequent independent sequential347/347 and54/54 passed. Existing sanitizer timing-under-load backlog remains the timing owner.

## connected-memory-consolidation — ship preparation (2026-10-23)

- **CMC-A1 — grammar-pin decision adoption** (low): evaluate indexing/adopting the two historical `.project/decisions/` TOON grammar pins under the single ADR home. P2a used the explicit R4 fallback; neither document was rewritten or silently adopted.
- **CMC-A2 — fail-fast FIFO guard control** (med): make the setup-validator FIFO guard mutation produce a bounded assertion failure instead of hanging the guard test. Keep production refusal and security limits unchanged.
- **CMC-G1 — workflow relation completeness** (low): assess sparse role/rule declarations and currently undeclared writes for plan/ship/cooldown against their actual playbooks. Do not invent relations to improve counts; P1 ships only observed declarations and bounded references.

The pre-existing state-history archive fallback remains owned by un-bet P2b, under the explicit closing exception. P2b/P3a/P3b and downstream rollout are not implemented or authorized by these four ship proposals. Cooldown should review repeated source/instance boundary and independent gate evidence lessons; no rule promotion is applied here.

## review-bench-hardening (cooldown 2026-10-23, forced; promoted to a pitch draft)

Moved to `pitches/01-review-bench-hardening/pitch.md`. Not shaped or bet. Bundles the review-bench followups: TTR-A1 (trusted-root Git execution: fsmonitor/filter helpers), TTR-A2 (strict appetite counting, NUL-delimited listings), TTR-A3 (bounded input/path diagnostics, in-root `..name` snapshot destinations) and the 2026-09-27 question whether convention-based read-only is enough or the tool needs real process isolation (decide in shaping; the tool is internal developer tooling run on a trusted checkout).

## From archify-replaces-state (2026-11-23)
- **Commit the Orca work in its own commits, stacked after `feat/archify-replaces-state`** (med; now also covers `orca-bounded-control-receipts`, 2.51.3 and 2.51.4): `orca-start.mts`, `orca-start.test.mts`, `orca-preflight.mts`, `orca-dispatch.mts`, `orca-dispatch.test.mts` and `orca-vendors.md` (changelog 2.51.1 and 2.51.2, the second being the tolerance work that came after the audit and was validated on the live 1.4.271 CLI) are in the same working tree as this pitch. `orca-bounded-control-receipts` plans to edit `lookupWorker`; tell it the `--full` and null-terminal change is already made. Audit item X-2, `attribution: shared-diff`.
- **`flow-report.mts` history input has no writer** (low-med): it reads an optional `.project/reports/state.json` that the retired `/state` produced. Drop the input, or write the facts it wants some other way.
- **Independent second review cycle of the audit fixes** (low-med): the fixes to `read()`, `writeReport` and the link scanner are author-verified (proofs re-run, 10 mutants killed), not independently re-reviewed.
- **Live `/state` on OpenCode, Codex and Cursor** (med): only Claude Code has run the new `/state`; also run it once with Archify absent and confirm it stops after the facts preview. Same item as the re-pointed "Verify /state on Codex and Cursor" entry.
- **Archify inline grammar for `@ = & $`** (low): `clean()` neutralises `< > [ ] | { } \ ~ _ # !` and backticks only; confirm Archify renders the rest literally or neutralise them too.
- **Archify's package is 22.5 MiB of `add-skill`'s 25 MiB cap** (low-med): re-check the size at every pinned-revision bump; consider raising the cap with a test.
- **A way to retire a link in a shipped outcome record** (low): deleting a cited file currently forces an edit to history; a `retired` marker would not. See issue `deleting-a-file-breaks-shipped-outcome-records-that-link-to-it`.
- **Restore a structure view with Archify's code analysis** (low): the folder diagram was dropped by decision; `archify code-analysis prepare` could give it back without bundle code, but needs a language toolchain choice.
- **`package-less-ship-verification`** (known, already shaped): `pre-ship-verify.mts` failed again here with "No package.json or Muro document verifier found"; the stack's commands were run directly and recorded.

## From orca-bounded-control-receipts (2026-11-23)
- **Capture one real pre-creation refusal receipt** (med, S3 deferred): run `worker-start --agent opencode --model <pin>` against an OpenCode outside Orca's allow-list in a disposable Run, save the receipt as `.project/analysis/orca-opencode-pin-refusal-receipt.json` (the pitch folder was compacted, so it is no longer a home for it), and decide from it whether a positive "nothing was created" proof exists (an explicit empty `effects` or a pre-creation `failedStage`). It creates Orca coordination state, so it needs the owner's authorization and cleanup choice. Until then a refusal stays `launch-failed:refused:<code>` with `unknown-liveness` ownership.
- **Verify the concise `worker-start` receipt on a real launch** (low-med): `dispatchIdOf` reads five known places; whether 1.4.271's concise start receipt carries a dispatch id there is unconfirmed until the first real dispatch. A miss is safe (`launched-without-dispatch-id` resumes with a human action) but disruptive.
- **Confirm Orca accepts a cursor from a larger page at a smaller `--limit`** (low): the identity walk reuses a cursor after halving the page size mid-walk; unconfirmed on Orca, and the walks are now short. Audit COD-4.
- **Confirm `--terminal-state` coverage with a real worker** (low-med): the lookup queries every state but `released`, inferred from the six documented states. A real worker run (S3's Run would also show it) should list its terminal under one of them. Audit SEC-3.
- **Phase start is about 0.5 s slower** (low): the five-state lookup replaced one call. If it matters, the states could be read in parallel (the runner is synchronous today).


- `skill-defaults.test.mts` "workflow-doctor exits 0 on a real bundle copy" (and a registry-managed-skill sibling) copy the whole working tree including the ignored `graphify-out/cache` (118 MB), so they exceed Bun's 5 s default timeout in a long-lived checkout while passing in 1 s on a clean tree. Skip ignored directories in the copy or raise the test timeout. Found 2026-11-23 during orca-api-currency-and-opencode2.

- Orca dispatch accepts an authorized path under `.project/` (for example an eval dataset), but `collectReport` rejects a `worker_done` whose `filesModified` names any `.project` path (`invalid-files`), so such an attempt can never be settled by its own report and stays `launched`. Either allow `.project/` paths that were authorized for that attempt in the report grammar, or refuse them at dispatch. Found 2026-11-23 on scope R5c of orca-api-currency-and-opencode2.

- `argsDigest` / `computeArgsDigest` (orca-ledger.mts) have no consumer after R4b-2 was dropped (orca-api-currency-and-opencode2 audit S1): wire it into the claim with a mismatch check, or remove the field.
- `USED_CONTRACT` (orca-contract.mts) is hand-maintained; add a test that derives the `worker-start` flags from `PLACEMENT_FLAGS` and the args dispatch builds, so a new flag cannot slip past the snapshot (audit S2).
- orca-contract.mts regenerate mode writes without a guard when run from a directory without ai-framework/scripts (CLI-only edge, audit acknowledged).
- Verifying a change set through `git worktree` can fail the two bundle-copy doctor tests: the suite rebuilds the knowledge graph through the shared git directory and reads the main repo's committed cards, so the graph looks out of date. An independent clone passes. Make that rebuild use the checkout it runs in, or document it as a verification caveat (found 2026-11-23 shipping orca-api-currency-and-opencode2).

- `installed-upgrade.test.mts` pins `BASE_REF = "b26b45b"`, a commit that exists only in local clones, not on origin, so the test "installed b26b45b project upgrades in two passes…" fails in every fresh clone of main (also failed at c5d05f9 before PR #9). Re-pin it to a commit reachable from origin/main, or build the legacy fixture without a git ref. Found 2026-11-24 verifying the merge of PR #9.

## From state-project-depth (2026-11-24)
- **Tell `workflow-v3-rollout` about the report reset** (med, audit S8): its `bundle-sync --apply` on LAH, RN and climbing now removes the last `/state` delivery when files change (receipt-verified). Note it in that pitch before its apply, and re-run `/state` after.
- **Prisma and other schema sources for project depth** (low-med): only `drizzle/meta/NNNN_snapshot.json` is read; Prisma, SQL and TypeScript schemas report `unconfigured`. A Prisma reader needs a linear, line-anchored scanner (issue `backtracking-regex-over-untrusted-text-is-quadratic`).
- **`opendirSync` in `RuntimeDeps`** (low): `facts-project` structure discovery uses `readdirSync`, which loads one whole directory before its entry budget applies.
- ~~Regression assertion for the doctor's syntax-check list~~ done in state-project-sources (a test lists every `facts-*.mts` file).
- **Real LAH checkout after its next sync** (low-med): the live check used a copy of LAH; run `/state` in LAH itself after it syncs to 2.53.0 (Archify is installed there).

## From state-project-sources (2026-11-24)
- **Route map diagram** (med): a tree from the generated TanStack `routeTree.gen.ts` (`FileRoutesByFullPath`), cut at critique (over the LOC cap; climbing-lab has two route trees and needs a rule for which wins). A linear text scan bounded to that block, not a global regex.
- **Service and API diagrams** (low): OpenAPI, docker-compose and supabase service diagrams. None of the five checked projects had one.
- **ORM schema sources** (low-med): Prisma, TypeScript (`schema.ts` beside a drizzle config, e.g. RN) and Python models are only listed as "not read".
- **`workflow-v3-rollout` release pin** (med, X1): it must name which release it syncs to LAH, RN and climbing, and regenerate `/state` after the final sync so the new sources appear.
- **Rename and retype in the SQL reader** (low): `RENAME` and `ALTER COLUMN … TYPE` mark a table approximate; replaying them would make LAH exact.
- **S2 cost** (note): the opencode worker took about 2 hours for S2 and wrote 422 source lines against an estimate of 250; consider the vendor and a smaller brief for parser-adjacent scopes.
- **Raw names in the facts JSON** (low, audit nits C3-SEC-3 and C3-SEC-4, and SEC-8 from 2.53.0): SQL identifiers, `structure.nodes` folder names and the draft's `sources[]` evidence paths are not credential-checked in the raw `--json` output; the page cleaner covers the draft. Add a check at ingest or run the evidence through `clean`.
- **Review the cycle-3 fixes** (med): the credential cutoff, fullwidth keys, invalid `package.json`, `DROP` name matching and unterminated flow lists were fixed after the last allowed audit cycle and have only regression tests; fold them into the next independent review of the state collector.

## From orca-balanced-role-pools (2026-11-25)
- **Balanced pitch-level reviewers** (med, cut at critique): audit and critique reviewers have no `reviewOf` scope, so the pools cannot pick them cleanly; reviewers were spread by hand or assigned as `implementation`.
- **The run helper should supply `runId`** (low-med): the id is only shape-checked; a fresh id on each dispatch resets load to zero. It can never move an owned task.
- **Run identity in task and attempt keys** (med, S2 at critique): an older Run's `S1` is inherited by a new Run. Pre-existing.
- **Review the post-audit changes** (med): the unlaunchable-member skip, the checked re-pick loop, the `source` label and the shared Run-id grammar were made after the last audit cycle; mutant-check the two new dispatch tests.
- **A released worker terminal can come back after a Claude Code restart** (low-med): seen twice (it re-wrote scratch files and once received a new dispatch in its old session). Decide whether release should close the session for good.
- **Orca status load view** (low, cut): show per-vendor load for a Run.

## From rename-ship-command-to-finish (2026-11-25)
- **Check every workflow command against host built-ins** (med): `ship` was shadowed without any warning. A doctor check or a documented release step should catch the next one (`checkpoint`, `plan`, `resume` are candidates to verify).
- **`ship-pitch` availability in each host's built-ins is unverified** (low-med): the owner chose the name; confirm in Codex, OpenCode and Cursor.
- **Installed projects and the old `ship` files** (LAH, RN, climbing): `bundle-sync --apply` removes copies this bundle shipped; a customized copy is the owner's to move. `workflow-v3-rollout` should include it.
- **`package-less-ship-verification` overlaps this change** (`pre-ship-verify.mts`, `4-ship.md`) and its pitch still tells the reader to run `/ship` (audit X1–X3): update its wording when it is shaped.
- **`bundle-sync --prune` still removes other files by path and baseline** (low-med, audit): the pinned, content-checked removal covers only the retired adapters.
- **Review the last rename-audit fixes** (med): the case-insensitive prune guard, the final pre-unlink re-check, the next-step wording, the dry-run list and per-file error handling shipped without a third review cycle. Also never run: Windows, a case-sensitive volume, FIFO or oversize adapter inputs, and a rerun of the failed test-coverage role.
- **Type `/ship-pitch` in a fresh session** (low): the live check so far loaded it as a skill only.

## From greenfield-kickoff shaping (2026-11-25)
- **New installs inherit this repository's identity** (high, bug): `SETUP.md` copies the bundle's `AGENTS.md` and `CLAUDE.md`, whose "Project specifics" describe `ai-workflow-portable` (product, stack, verification commands); the bootstrap stub the docs expect is gone and `setup-validator` accepts the copied section as complete. Ship neutral entry files (or a stub) and make the validator refuse the bundle's own section in an install. Check whether LAH, RN and climbing carry it.
  Closed in v2.59.3 by [fix-install-inherits-bundle-identity](fix-install-inherits-bundle-identity/SHIPPED.md); neutral entry files stay with `starter-install`, and LAH is unchecked.

## From workspace-slim shaping (2026-11-25)
- **Installed skill packages are indexed and committed** (high, bug): `GRAPHIGNORE` and `GITIGNORE_BLOCK` in `graphify.mts` and `SETUP.md`'s minimum ignore list omit `.project/skills/packages/` (this checkout's own `.gitignore` has it). In LAH 87% of graph data (58.9 of 67.5 MB) is that folder, rewritten and staged by the pre-commit hook on every commit. LAH also tracks 624 files / 23 MB of packages (597 are Archify, committed by the assistant on 2026-11-24 against `state-report.md`). Fix the templates, warn in the doctor when packages are tracked, and in LAH untrack them and rebuild the graph (history keeps them).

## From package-less-ship-verification (audit, 2026-11-25)

- **Verifier reads without the guarded reader** (med): `package.json` and changed application sources are read with no symlink, file-type or size check (`security.md` §9). A refused read must not count as absent. Predates the pitch.
- **`diff-sanity` below the Git root** (med, bug): `git diff` paths are relative to the Git top level, but the source filter and reads use the project directory, so a nested project passes with a changed `console.log`; `ls-files` is limited to the directory. Add subdirectory, staged, untracked and listing-failure tests.
- **Verifier output is printed raw** (low): child output, Git stderr, error messages and flagged file names reach the terminal unescaped. Predates the pitch.
- **Interrupting the verifier leaves its check running** (med, unverified by coordinator): the child is detached and no signal is forwarded; with 10–20 minute timeouts a retry can run beside it. Check `runtime/node.mts`.
- **Viewer route paths** (low): move the document-viewer checks into that project's own manifest (pitch no-go); until then its marker and `setup-validator` path are project-relative and unguarded.
- **Local-only knowledge graph** (owner question, 2026-11-25): two fresh clones on one machine built identical graphs; the committed `graph.json` held 8 nodes for Git-ignored installed skills and differed in 45 nodes' header data. Decide whether to stop tracking it (needs a build step after clone; `setup-validator` requires the file).
- **Stale Orca ledger entries hold capacity** (low): `attempt:rsc-s2-1` and `attempt:rsc-aud1-cross-pitch-conflict-checker-1` (Run `run_89271af6dc37`) still read `launched` and refused a third reviewer under the cap of 4. Inspect before settling.
- **Flaky timing ratio test** (closed by `fix-timing-ratio-flake`, 2026-11-25): equal-work, thread-CPU-time measurement.
- **Earlier package-less verifier entries are resolved** (2.57.0): older backlog lines about `pre-ship-verify.mts` failing without a `package.json` are closed by the check manifest. Installed projects need a sync and, without a `package.json`, their own `checks.toon`.
- **The verifier needs `ai-workflow.toon` in a fresh clone** (low): this repository's manifest runs `setup-validator` and `workflow-doctor`, which fail without the Git-ignored mandatory config. Copy the example config first, or document that step in `4-ship.md`.

## From fix-timing-ratio-flake (2026-11-25)

- **The renderer's early stop has no failing test** (low): removing the 80-character `break` in `facts-sql.mts` stays linear and passes; the output length is asserted.
- **A synchronous reader call cannot be stopped by the test timeout** (low, unverified): run the scaling probes in a killable child with a wall-clock deadline.
- **Vacuous scaling case** (low): "unterminated openers" costs under 1 ms at both sizes, so the 1 ms floor makes its ratio check pass whatever the growth below that. Raise its sizes.
- **Other wall-clock limits in tests** (low): several suites assert elapsed milliseconds; none was seen to fail here.


## From review-bench-hardening (build, 2026-11-26)

- **Possible flaky test in `runtime/upgrade.test.mts`** (low, reported by the S3 worker, not reproduced by the coordinator): a bundle-sync no-op assertion failed once in a full run (`[0,1,0,0]` against `[0,0,0,0]`), then passed alone and on rerun.
- **Orca dispatch without a model uses the tool's own default** (low): build briefs with `assign` and no `placement.model` ran OpenCode on an unavailable free model. Dispatch could default to the `ai-workflow.toon` model for the picked vendor.
- **No command to settle a stopped Orca attempt** (low): after `worker-stop` confirms a failure, the ledger entry stays `launched` and blocks the same paths; it was moved to `failed` through the ledger library.

## From review-bench-hardening (audit cycle 1, 2026-11-26), deferred

- **`guard` does not hash `.git`** (med): config, hooks, `info/exclude` and `info/attributes` can change during a review and stay `clean`; ignored files outside the roots too. Documented as a limit.
- **`canary-check` still reads prose** (med): any citation near the line counts, not only findings-table rows; a suffix match accepts a path in another directory that is not a copied file; names cut at `+` or `@`; reversed ranges and `11abc` count.
- **The scratch manifest sits beside the scratch tree** (med): a reviewer with a shell can read the planted line.
- **`record-check` structure limits** (low): setext headings do not split sections; a role section with no `independent:` line is ignored; role headings need not be unique.
- **Raw filesystem errors can print paths** (low); **`guard snapshot --file` replaces any existing file** (low); two superlinear patterns bounded by the size cap (low).
- **Untested bounds** (low): individual guard roots, `GUARD_SKIP` entries, the walk cap, the 9-digit line limit.


## From review-bench-hardening (audit cycle 2, 2026-11-26), deferred at the cycle cap

- **`guard` second-edit gap**: closed by scope S4 of the same pitch (2026-11-26).
- **`record-check` can be fooled by crafted Markdown** (med, verified): a fence opener with a comment; claims after inline `<!--`, a line starting with inline triple backticks, `<!-->`, or an indented fence.
- **`PATH` entry `link/..` still reaches the project** (med, verified): drop `..` segments or resolve the `git` file itself and run that path. An empty filtered `PATH` was claimed to search the current folder; not reproduced.
- **`count` ignores staged changes restored in the worktree** (low, verified).
- **Replace refs, `prepare` with `TMPDIR` inside the project, other range spellings, numbered or backticked claims** (low, unverified).
- **Other Git callers may run configured hooks** (high, **unverified**): `core.hooksPath=/dev/null` does not stop Git 2.54 `hook.*` hooks. `pre-ship-verify.mts`, `graphify.mts`, `legacy-upgrade.mts`, `orca-apply.mts`, `orca-diff-admit.mts`, `orca-evidence.mts` and `skill-source.mts` rely on that flag or on `core.fsmonitor`, and none checks `hook.*`. Orca ones run against worker trees. Not tested which of their commands fire a hook.
- **`guard` hardening from the S4 review** (low): reject empty, `.` or `..` segments in Git-reported paths as a second layer; non-UTF-8 file names may be dropped silently (unreproduced, Linux); two guard lines have no failing test.


## From workspace-slim (build, 2026-11-26)

- **`climbing-lab-monorepo` and LAH track installed skill packages** (observed by the new report, read-only): handle with the pending package-ignore fix.
- **Report labels** (low): `.opencode/node_modules` counts as workflow bundle; loose files directly in `.project/` show as unrecognised "Project entries" without saying which; absent areas print as zero rows.
- **Report root through a symlink** (low): `--root` reached through a symlinked folder is refused with only the generic message.
- **Report bound** (low, from the worker): a folder is listed in full before the 200,000-entry limit applies.
- **Duplicated hardened Git call** (low): `workspace-report.mts` and `review-bench.mts` each build their own; share one if they drift.

## From workspace-slim (audit cycle 1, 2026-11-26), deferred

- **Report: case aliases of scanned folders** (low): a differently cased `.Project/` entry leaves tracked figures `incomplete` instead of attributed.
- **Report: many unrecognised folders** (low): marking incomplete loops over all areas per failure, quadratic in a very unusual tree.
- **Report: tracked-only folder name** (low): a tracked folder later replaced by a loose file of the same name can print that name.
- **`graphify` tag map** (low, unverified, predates): a tag named `constructor` may throw with a plain-object `tagIndex`, now also in `--check --json`.

## From workspace-slim (audit cycle 2, 2026-11-26), deferred

- **Report: a differently cased scan root** (med, unverified): an index entry under `.Project/` is not listed, so tracked reads 0 as complete and no packages warning appears.
- **Report: submodule replaced by a plain file** (low, unverified): reads as complete; take the mode from `ls-files --stage`.
- **`canary-check` false "caught"** (med, observed): an unrelated finding whose cited range covers the planted line counts. Check that the matching row describes the planted edit.

## From knowledge-distill pilot (2026-11-26)

- **A default `graphify query` can return no knowledge** (high, observed): for two of three realistic questions, none of the 55 nodes shown at the default budget was a knowledge entry (617 and 402 found; 7 and 3 knowledge entries appeared at `--budget 60000`). The shape, search and fix gates query this way. Rank knowledge first, filter to knowledge nodes, or tell the gates to raise the budget; measure on more questions first.
  Closed in v2.59.2 by [fix-graphify-knowledge-query](fix-graphify-knowledge-query/SHIPPED.md). Both previously empty queries now emit five knowledge paths at the default budget.
- **Cooldown rule destination** (observed): `/cooldown` names `ai-framework/rules/` for promotions. Shape a small change to route project-specific lessons to `.project/rules/` and reusable bundle lessons to `ai-framework/rules/`. See [the knowledge distill pitch](03-knowledge-distill/pitch.md).

## From greenfield-kickoff part A build (2026-11-27)

- **Detector and `node_modules`** (medium, observed): an installed JavaScript project passes the 4,096-entry budget and reports `unclear`, so setup asks instead of going straight to today's flow. The owner left it as is at the A1 gate.
- **Bun runs a project's `bunfig.toml` preload before workflow scripts** (high, reproduced): affects every script when Bun is the runner or invoked directly. Shape a fix in the shared startup (trusted config, no automatic env files) and document direct invocation. **Open when part A shipped, by the owner's override on 2026-11-27: run `/fix` next.**
- **Detector hardening** (medium): bounded incremental directory listing; path-swap race; assert reason strings; installed-skill paths report `unclear` (coordinate with pitch 07).
- **`SETUP.md` Step 3** (medium, static): check that `.project` is not a link before copying the scaffold. The setup skill also has no fallback when `status.md` and its template are both missing on a re-run.
- **No documented install route reaches `empty` or `existing`** (high, observed): the bundle's source folder or root files make first-time detection `unclear`. A clean installer (`starter-install`) or detector support for the routes is needed before the part B interview can start by itself; settle this before planning part B.
- **README, LICENSE or `.gitignore` only reports `existing`** (design, observed): a typical new repository would never reach the part B interview. Revisit before planning part B.

## From fix-install-inherits-bundle-identity audit (2026-11-27)

- **Unguarded reads in shared helpers** (medium, static review): `skill-vendors.mts` and `skill-registry.mts` read mirrors and registry files without a type or size bound, and the validator's rules and TypeScript directory listings are unchecked (`security.md` §9).
- **Ledger and outcome readers** (medium, static review): they check a path and then open it, and their diagnostics copy values from malformed records.
- **`resolveClaudeEntry` second read** (medium, static review): the imported `AGENTS.md` is re-read without a pinned descriptor or link-count check. `bundle-sync` and the validator share it.
- **LAH** (open check): its entry files are plain files, but its content was not checked for the bundle's specifics (the read was denied) and it has its own root `SETUP.md`. Run its validator after sync.

## From knowledge-distill re-shape (2026-11-27)

- **Ranked knowledge query misses cited cards** (high, observed): on five `/shape` gate questions from pitches 01, 02, 04, 06 and 07, `graphify.mts query` ranked 4 of the 9 cards those pitches cited into its top five, and none for the 04, 06 and 07 questions. Candidate `/shape-lite` fix; use [the gate questions](03-knowledge-distill/pilot/gate-questions.json) as a test set with fresh held-out questions, and report recall separately from words loaded. See [the gate comparison](03-knowledge-distill/pilot/gate-comparison.md). The untracked `fix-graph-query-hides-knowledge/` folder may be a start on this; owner to confirm.

## From fix-graphify-knowledge-query (2026-11-26)

- **Shared project reader during concurrent ancestor replacement** (medium, static review): the descriptor-pinned reader rejects static symlinks and verifies the file identity. An ancestor replaced during the pathname inspection can redirect both checks to the same out-of-project file. Evaluate a portable containment strategy for `readProjectText` and its callers.

## From greenfield-kickoff B1 build (2026-11-27)

- **Orca dispatch accepts a `.project` path that collect refuses** (medium, reproduced): a worker that reports it gets `invalid-files`, and the attempt holds a cap slot for good. Refuse the path at dispatch, or define a recovery for released workers; four stale records need it now.
- **Entry files on the folder-in-project route** (medium, static): after Step 1, `AGENTS.md` and `CLAUDE.md` tell a later session to read a root `SETUP.md` that is not there.
- **Setup guide errors** (low, observed in the B1 eval; older than B1): `.opencode/package.json` is Git-ignored but listed for copying and checking; Step 7 says 18 agents, 16 ship; no root check for an empty folder; the Cursor mirror step is unclear.
- **Merge order** (B1 audit): part B1, then pitch 07, then pitch 06 pins a release and hand-merges both install routes.
- **A leftover OpenCode service stalls the workflow doctor** (medium, reproduced): `opencode debug config` hangs for 15 s and a setup-validator timing test fails. Free the port after the last OpenCode worker is released, and report the hang in the doctor.
- **Source-folder quoting and marker limit** (low, B1 audit cycle 2): say the character refusal covers later copy commands too; cover PowerShell and `cmd.exe`; add a test for the 64 KiB marker limit.
