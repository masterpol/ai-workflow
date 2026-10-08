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
