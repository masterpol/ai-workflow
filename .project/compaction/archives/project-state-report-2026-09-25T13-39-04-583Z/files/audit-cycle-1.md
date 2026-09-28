# Audit cycle 1: project-state-report (T1 + T2)

**Date:** 2026-09-25 · **Fan-out:** security-reviewer, code-reviewer, test-coverage-checker, ux-reviewer
(cross-pitch checker skipped: no other active pitch touches these files; i18n and eval not applicable).

**Independence caveat.** Three reviewers were killed by a session rate limit mid-run and two more
stalled on the watchdog. Security review finally completed on a fresh agent (second attempt); code review
and coverage completed after resume. The code review was thin (3 tool calls, one finding) and the
coverage report contained claims that did not survive checking (below). Every finding below was
re-verified by the main thread before triage.

## Findings and triage

| # | Tier | Source | Finding | Verified | Outcome |
|---|---|---|---|---|---|
| 1 | must-fix | security | Quadratic-backtracking regexes on project markdown (`UNFILLED`, heading, link, bullet); 1 MB file ≈ minutes | ~1 s at 60 KB, scaling ×4 per doubling | fixed: 64 KB cap + linear regexes; 1 MB hostile file now ≈ 50 ms |
| 2 | must-fix | main thread (from build-time concern) | `/state` executed the analyzed project's own `skill-sync.js` | PoC wrote a witness file | fixed: runs only the bundle's script; test proves a project script never runs and its output is not believed |
| 3 | must-fix | code | `**Appetite**:` regex `\s*` crossed newlines and captured the next paragraph | PoC | fixed (`[ \t]*`, trimmed, null when empty); same for `**Shipped:**` |
| 4 | must-fix | coverage | No test for the 1 MB read bound | mutation survived | fixed with test; also depth, DB-scan, reconcile-timeout, temp-cleanup bounds, all mutation-checked |
| 5 | should-fix | security | Secret-scrub gaps (`DB_PASSWORD=`, `client_secret :`, Bearer/Basic, JWT, URL creds, `sk_live_`, `github_pat_`, `AIza`, quoted keys, key body) | PoC: 0 redactions for all of them | fixed; scrub input bounded to 8 KB before scrubbing, then cut to 300 |
| 6 | should-fix | security | `error.message` echoed into the snapshot (absolute paths, registry fragments) | PoC (EACCES path leak) | fixed: only an error code; fixed strings elsewhere |
| 7 | should-fix | security | `byType` keyed by unscrubbed graph `type` on a plain object | PoC | fixed: safe alphabet, ≤20 keys, prototype-free accumulation |
| 8 | should-fix | security | Symlinked `.project/runs`, `.project/pitches`, knowledge dirs followed; knowledge walk unbounded | PoC | fixed (lstat checks; 5000-entry cap) |
| 9 | should-fix | security | `pitch-compress.js` `readText`/`existsSync` followed symlinks, blocked on a FIFO, threw on a directory | PoC (FIFO hang) | fixed in the shared helper (symlink/non-regular → absent; >4 MB refused loudly); `pitch-compress`/`pitch-archive` suites unchanged |
| 10 | should-fix | security | Terminal escapes from `theme.json` / CSS filenames printed raw; `theme.json` read without size cap | PoC | fixed: control characters replaced in CLI output; 256 KB read cap |
| 11 | should-fix | security | Temp file opened with `w` (follows a pre-planted symlink), predictable name | code read | fixed: `wx` + random suffix; test |
| 12 | should-fix | ux | Notes buried in the Evidence column; `Status` ambiguous; duplicate slug/title | inspected | fixed: Notes column, "Source status" |
| 13 | should-fix | ux | Two nested region landmarks per table; ~16 regions | inspected | fixed: scroll wrappers are `role="group"`; only sections are regions |
| 14 | should-fix | ux | Attention states only distinguished by a 1.3:1 dashed border | computed | fixed: 2 px dashed `--fg` outline (fg on muted is contrast-verified); `--border` deliberately **not** added to contrast pairs (real shadcn borders are ~1.3:1 and would reject nearly every theme) |
| 15 | should-fix | ux | Raw markdown, camelCase keys, "Product: Product", long strings, lost row header on mobile, legend at bottom, no summary | inspected | fixed (markdown stripped, keys humanized, labels, `overflow-wrap`, sticky row header ≤640 px, legend + status summary first) |
| 16 | acknowledged | security/ux | `TOKEN_BY_NAME` inherited keys; `cssFiles` visited cap; secret-name link denylist | code | also fixed (cheap): `Object.create(null)`, 20 000-entry cap, denylist extended |
| 17 | acknowledged | ux | `lang="en"` hard-coded (project text may be Spanish); no `<time>`; tap-target size; `.none` dash noise; no `color-scheme` meta | — | not actioned; logged for `/cooldown` |

## False positives / unreliable claims (for `/cooldown` to tune)

- **Coverage agent:** reported 100% line/branch/function coverage; measured 99.3% lines / 90.8% branches.
  Cited a `NEVER_READ` allowlist that does not exist. Claimed `FIELD_LIMIT` and the 200-file bound were
  untested; mutation showed both are caught. Its real finding (1 MB read bound) was correct.
- **Code reviewer:** verdict "one must-fix, nothing else" after 3 tool calls; the finding was real but
  the depth of review was low. Treated as an unreviewed area, not a clean bill.

## Evidence after fixes

- `node --test` over the new suites + the whole prior surface: **259 pass, 0 fail**.
- Coverage (three scripts): lines 99.79%, branches 92.46%, functions 98.19%.
- Mutation checks on every fix above: all caught except four that are redundant by design
  (`MARKDOWN_LIMIT` and `SCRUB_INPUT_LIMIT` each duplicate the linear regexes, the `UNFILLED` regex is
  covered by the cap, and the private-key `$` alternative overlaps the END marker) — each is a second
  layer against the same input.
- Doctor READY (744 checks); setup-validator READY; graphify check exit 0; Cursor mirrors 0 differ.
- Original PoCs re-run: 1 MB `<` file ≈ 50 ms; the credential set redacts (7 redactions); project
  `skill-sync.js` witness file absent.
