# Followups

## Candidate pitches (cooldown 2026-09-25, approved item by item)

Candidates in active work are listed in `.project/status.md`. The items below remain source text.

| Candidate slug | Kind | Items bundled (headings below) |
|---|---|---|
| `independent-rereview-catch-up` | review only | Independent re-review of pitch-compaction; Independent security re-review of the metrics collector fixes; Deeper independent code review of /state |
| `path-safety-hardening` | small build — plan | TOCTOU ancestor-symlink race; commit-ledger writes through a symlinked .project/compaction |
| `live-host-verification` | manual checklist per host | Verify the OpenCode effort and skill wiring; Confirm the new Claude Skill hook fires; Verify /state on Codex and Cursor |
| `collector-robustness` | small build — plan | Collector lock never reclaims a live or reused PID; Collector identity keys can collide |
| `bundle-sync-marker-fix` | shipped 2026-09-26 | Effective-base marker fix; source item retained below. |
| `state-quoted-fonts` | shipped 2026-09-26 | Bounded quoted fonts and same-file variables; source item retained below. |

**Promoted to do next, not a pitch:** run the first real `/pitch-compress` trial on a low-stakes pitch
with the archive kept (item "First real-use trial of /pitch-compress"); fold the "Wire /state into
/pitch-compress" decision into that trial.

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

- **Pitch `package-less-ship-verification`** (med; moved to [pitches/package-less-ship-verification/pitch.md](package-less-ship-verification/pitch.md) 2026-10-22): bundles the package-less `pre-ship-verify.mts` followups above. The verifier selects checks from a root `package.json`, which this bundle lacks; it blocked `/ship` on 4+ ships and each needed an owner-approved direct-check gauntlet. Fix via a documented check contract or bundle-local manifest; no temporary `package.json`.
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
