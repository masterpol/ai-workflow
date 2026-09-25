# Followups

## Candidate pitches (cooldown 2026-09-25, approved item by item)

Not shaped yet; start any of them with `/shape <slug>`. The items stay below as the source text.

| Candidate slug | Kind | Items bundled (headings below) |
|---|---|---|
| `independent-rereview-catch-up` | review only | Independent re-review of pitch-compaction; Independent security re-review of the metrics collector fixes; Deeper independent code review of /state |
| `path-safety-hardening` | small build | TOCTOU ancestor-symlink race; commit-ledger writes through a symlinked .project/compaction |
| `live-host-verification` | manual checklist per host | Verify the OpenCode effort and skill wiring; Confirm the new Claude Skill hook fires; Verify /state on Codex and Cursor |
| `collector-robustness` | small build | Collector lock never reclaims a live or reused PID; Collector identity keys can collide |
| `bundle-sync-marker-fix` | small build (standalone) | bundle-sync marker misclassifies un-applied unverified files as `local` |
| `state-quoted-fonts` | small build (standalone) | Quoted font families fall back to the default font |

**Promoted to do next, not a pitch:** run the first real `/pitch-compress` trial on a low-stakes pitch
with the archive kept (item "First real-use trial of /pitch-compress"); fold the "Wire /state into
/pitch-compress" decision into that trial.

## bundle-sync marker misclassifies un-applied unverified files as `local` on the next run

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

## Independent re-review of pitch-compaction (security, test-coverage, cross-pitch)

Raised 2026-09-25 at `pitch-compaction`'s ship. Its audit cycle had only one reviewer finish (the
rest hit a provider rate limit); the security pass on this file-deleting tool was run by the code's
own author. Re-dispatch `security-reviewer`, `test-coverage-checker` and
`cross-pitch-conflict-checker` against `pitch-compress.js` / `pitch-archive.js` and record
`audit-cycle-2.md`. Shipped without it by user decision.

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

## Collector lock never reclaims a live or reused PID, and reclaim can remove a fresh lock

Found 2026-09-24 in `metrics-report-dimensions` audit cycle 1 (security-reviewer, deferred
should-fix; pre-existing code in `token-consumption.js`, not part of that pitch's diff). A lock
file whose recorded PID is alive (or reused after a crash, or owned by another user so
`kill(pid, 0)` returns `EPERM`) is never reclaimed: every hook waits about 1 s and then gives up,
so telemetry silently stops until someone deletes `.project/metrics/.token-consumption.lock`. Also,
`reclaim()` renames the lock after reading a dead owner; if another process reclaimed and took the
lock in between, the rename removes that process's fresh lock and two writers can overlap. Candidate
fix: reclaim by age (mtime over ~30 s) regardless of PID, treat `EPERM` as "alive, check age", and
re-read the lock content immediately before removing it.

## Collector identity keys can collide across entities

Found 2026-09-24 in `metrics-report-dimensions` audit cycle 1 (security-reviewer, deferred,
pre-existing). `normalizedEvent` builds identity with `[...].filter(Boolean).join(":")`, so
`session "a:b"` + `agent "c"` and `session "a"` + `agent "b:c"` share a key, and `agent_type "X"`
with `agent_id "X"` in one session collide. A second Codex `subagent-complete` with the same
session and agent type but no agent id is dropped as a duplicate, so two real runs count once. Same
family as `bare-prefix-match-crosses-entities`. Candidate fix: a JSON-encoded or length-prefixed
identity, with a migration note because `recentEventKeys` and stored `identityKey`s use today's form.

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

## Independent security re-review of the metrics collector fixes

Raised 2026-09-25 at the same ship. The cycle 2 security re-review never returned (rate limit, then
two stalls); the author ran the checks. Re-dispatch `security-reviewer` against
`token-consumption.js`, `token-report.js` and `.opencode/plugins/token-consumption.js` and record the
result as `audit-cycle-3.md`. Shipped without it by user decision.

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

## Deeper independent code review of /state, plus its HTML nits

Raised 2026-09-25. The cycle-1 code review of `state-snapshot.js`/`state-theme.js`/`state-render.js`
was shallow (three tool calls, one finding); security and UX were thorough. Re-dispatch `code-reviewer`
with narrow slices. Bundle the UX nits that were not actioned: `lang="en"` is hard-coded although project
text may be Spanish, timestamp not in `<time>`, nav tap-target size, repeated "—" cells read as noise,
no `<meta name="color-scheme">`.

## Quoted font families fall back to the default font

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

