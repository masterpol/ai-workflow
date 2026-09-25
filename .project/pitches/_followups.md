# Followups

## bundle-sync marker misclassifies un-applied unverified files as `local` on the next run

Found 2026-09-25 during `portable-skill-installation` S3 manual verification (pre-existing,
unrelated to that pitch's scope). `bundle-sync.js`'s marker write snapshots the full CURRENT
source manifest as the next `base`, regardless of which files were actually applied. A file
reported `unverified` (no known base, kept, not applied) then reads as `local` ("kept, upstream
unchanged") on the next sync, even though upstream did change and the target never received it —
silently hiding a real, still-pending upstream change. Likely fix: the marker's base for a given
file should be the base it was ACTUALLY compared/kept against this run (old base if kept as
`unverified`/`local`/`conflict`, new source hash only if applied), not a blanket re-snapshot of
current source. See `.project/pitches/portable-skill-installation/log.md` (S3 observation) for
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
Deferred rather than fixed: `.project/pitches/portable-skill-installation/audit-cycle-1.md` has
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

## Wire /state into /pitch-compress once project-state-report ships

The parent pitch wanted an automatic `/state` run after compaction; deliberately left out because
the command does not exist yet.

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

