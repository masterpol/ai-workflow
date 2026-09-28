# Shipped: Independent re-review catch-up

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-27 · **Appetite:** big-batch, raised twice by explicit user approval
(≤15 → ≤16 → ≤19 files; per-slice fix cap 4 → 5 for S3 only) — see `deviations.md`.

## Scope reconciliation

| Scope | Commitment | Delivered | Status |
|---|---|---|---|
| S0 | Review bench: scratch-copy dispatch, canary, read-only guard, file-count tool | `review-bench.js` (`prepare`, `guard snapshot\|check`, `count`, `canary-check`, `record-check`); 22 tests (18 built, 4 added at `/audit` — see below) | **Done** |
| S1 | Independent re-review of `pitch-compress.js`/`pitch-archive.js` (the file-deleting compaction tool) | 5 dispatches over 3 cycles; 13 fixes in 4 files; `review-compaction.md`; 75 tests | **Done** |
| S2 | Independent re-review of the metrics collector/renderer (`token-consumption.js`, `token-report.js`) | 5 dispatches over 3 cycles; 12 fixes in 4 files; `review-metrics.md`; 79 tests | **Done** |
| S3 | Independent re-review of `/state` (`state-snapshot.js`, `state-theme.js`, `state-render.js`) + 5 HTML-nit triage | 5 dispatches over 2 cycles; 6 findings fixed across 5 files (cycle 2 caught 2 of the 6 round-1 fixes as incomplete and closed them); `review-state.md`; 92 tests; nits triaged (4 followup, 1 rejected) | **Done** |
| S4 | Audit reviewer contract | `3-audit.md` + `.claude/skills/audit/SKILL.md` (+ byte-identical Cursor mirror): 8-rule reviewer contract, prompt template, per-role `independent:` field | **Done** |

Totals: **268 tests across S0-S3** (22 + 75 + 79 + 92); **390 across the full repo suite** (389 pass, 1
skipped — a Linux-kernel-identity fixture, platform-gated on macOS), 0 fail. Doctor READY (746 checks);
setup-validator READY (21 checks); knowledge graph CLEAN. 19 of 19 files used.

## Confidence — read this before relying on it

- **`/audit` on this pitch (`audit-cycle-1.md`) found what S1-S3 could not find on themselves: 4 must-fix
  security bugs in `review-bench.js` itself** — the tool every S0-S3 record's `read-only:`/`canary:`
  evidence rests on, never independently reviewed until the outer `/audit` phase. An ancestor-symlink
  escape past the "outside the project" check, unguarded symlink-following writes (a live
  arbitrary-file-overwrite PoC), raw fs-error/absolute-path leaks on three read call sites, and an
  unguarded FIFO read that hung `canary-check` indefinitely (reproduced live). All four fixed and
  mutation-verified. **This means any S1-S3 guard check that ran before this fix, on a path an attacker
  could have pre-positioned a symlink at, rested on a weaker guarantee than its prose claimed** — in
  practice, low risk here (no untrusted input reached this tool during S1-S3; the gap was in the tool's
  defenses, not evidence that anything was actually exploited) but the honest caveat stands.
- **"Independent" means fresh context, same model family — not proof of independence from the author's
  own blind spots.** Every record says so explicitly. A canary (a hand-planted, verified-to-break-a-test
  defect) substitutes for a length floor: a slice counts as reviewed only if the reviewer catches it. Every
  canary planted across S1-S3-and-its-audit was caught.
- **Two of six S3 round-1 fixes were incomplete** and were only caught by a second, narrower independent
  re-review cycle (not by re-reading my own diff) — the exact failure mode this whole pitch exists to catch,
  now caught in itself. Documented in `review-state.md` and `audit-cycle-1.md`.
- **One cross-pitch-conflict finding was a false positive**, refuted by checking my own S2 prompt file
  (written before any fix, already excluding the disputed code) against `collector-robustness`'s own
  record. Recorded as a false positive, not acted on — see `audit-cycle-1.md` finding 7.
- **Not every should-fix or acknowledged item was actioned.** Plugin hardening (S2), a contrast-boundary
  test gap (S3), four HTML nits (S3), and `review-bench.js`'s convention-based (not sandboxed) read-only
  guarantee (`/audit`) are open followups, not silent gaps — each is named in `_followups.md`.

## No-gos honored

- **Fix scope stayed must-fix only** at every review slice; should-fix and acknowledged items went to
  `_followups.md`, never silently patched in.
- **No reviewer subprocess touched the real repo.** Every dispatch worked inside a `review-bench prepare`
  scratch copy outside the project; `git status`/tree-hash comparisons before and after confirmed no
  unexpected write, for every dispatch this pitch itself controlled the timing of.
- **No author-run substitute was recorded as independent.** Where a fresh dispatch could not be completed,
  the record says `not-completed`, not a masked author check (this pitch had none of these; the three
  *prior* pitches' author-run substitutes are exactly what this pitch exists to replace).

## Rabbit holes — resolved as committed

- **File-cap overrun** (pitch.md's own named risk: appetite projected 17-21 files, cap was 15) happened
  twice, both user-approved with a reason recorded at the time: once because S3 needed the truncation
  fix's regression test in the same slice (15→16), once because independent re-review — the pitch's whole
  premise — found two more must-fix bugs than the one it was sized for (16→19). Both raises are the
  designed escape valve working as intended, not a silent overrun.
- **Concurrent sessions writing the same files** (`collector-robustness` in `token-consumption.js`,
  `path-safety-hardening` in `pitch-compress.js`/`pitch-archive.js`, the shipped-but-uncommitted
  `state-quoted-fonts` in `state-theme.js`) were handled by excluding each pitch's owned functions from
  every prompt, verified by diff before editing, and re-verified by the outer `/audit`'s cross-pitch check
  (one initial misattribution refuted, two pairs confirmed compatible).

## Deviations that changed the plan (see `deviations.md`)

Two cap raises (above). `guard snapshot` was skipped before S3's five dispatches (a process gap relative
to S1/S2), compensated for with a before/after `git status` comparison rather than a real `guard check`
diff — recorded as weaker evidence, not hidden. S3's contract-doc omission from the first scratch copy
(`s3a`) left some checklist items "n/a (doc absent)" rather than pass/fail; folded into the cross-file
pass instead of re-running s3a. Round-3 fixes (S2's Q14, S3's cycle-2 closes) were verified by regression
test and mutation check only, not a fourth independent dispatch, because the 3-cycle cap was already spent.

## Audit findings — final disposition

See `audit-cycle-1.md`. 4 must-fix (all in `review-bench.js`, none in the reviewed subjects themselves),
all fixed and mutation-verified. 2 acknowledged (a size:mtime guard-precision limitation; convention-based
subprocess isolation — both followups, not fixes). 1 false-positive cross-pitch claim, refuted and
dropped. 3 clean passes (code review, compatibility with `path-safety-hardening`, test-coverage spot
checks). Zero must-fix findings remain open.

## Knowledge extracted

- `.project/knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md` (new) — the tool that verifies
  independence must itself be independently verified; this pitch built `review-bench.js` at S0 and did not
  security-review it until the outer `/audit`, which is why it shipped 4 must-fix bugs into its own
  evidence-generating machinery.
- `.project/knowledge/issues/false-cross-pitch-attribution-in-a-shared-uncommitted-file.md` (new) — a
  cross-pitch-conflict-checker (or any tool) cannot separate authorship in a file two uncommitted pitches
  both touch; verify against the accused pitch's own prompt/record timestamps and the other pitch's own
  deviations before triaging a cross-pitch finding as real.
- `.project/knowledge/decisions/token-metrics-dimensions-design.md` — updated with S2's findings (vendor-
  scoped note keys, the rejected-snapshot-aside behavior).
- `.project/knowledge/decisions/project-state-report-design.md` — updated with S3's findings (truncation
  status semantics, the ancestor-symlink fix pattern for `readSettings`/`themeChanges`).

## Followups (see `_followups.md` for full text)

Plugin hardening (null-event throws, unbounded map values); TOCTOU on lstat-then-read; lifetime-totals
clamping vs. the "never clamp" pattern; the `since`/`metricScope` collector-renderer test gap; reconciling
the S2 collector edits with `collector-robustness`'s commit; four `/state` HTML nits; the S3 round-3 fixes'
missing fourth independent cycle; `review-bench.js`'s convention-based read-only guarantee; a `/cooldown`
question about whether a slice's file cap should reserve headroom for "review finds more than the known
bug."
