# Plan: independent-rereview-catch-up

**Pitch**: pitch.md  •  **Appetite**: big-batch (≤15 files)  •  **Hill**: hill.md  •  **Base ref**: `42fbb58`

## What counts toward the 15-file cap

Code, test, script and doc files changed **outside** this pitch's directory, measured with
`node ai-framework/scripts/review-bench.js count --since 42fbb58`. Bookkeeping is excluded, as in earlier pitches:
`VERSION`, `CHANGELOG.md`, `.project/status.md`, `.project/pitches/_followups.md`, `.project/knowledge/`,
`.project/runs/`, and everything under this pitch's directory. Budget: S0 = 3, S4 = 3, leaving **9 for fixes**
(at most 4 per slice). Any fix past a slice cap or the 15 total becomes a new pitch.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S0 | Review bench: scratch slice + canary + read-only guard + file count | `ai-framework/scripts/review-bench.js`, `review-bench.test.js`, `workflow-doctor.js` (script list) = 3 | ~190 script + ~230 test + 1 | — | — | No: small, self-contained, and the bench is what every later scope trusts | — (main thread) |
| S1 | Compaction re-review (`pitch-compress.js`, `pitch-archive.js`) | record `review-compaction.md`; fixes ≤4 of `pitch-compress.js`, `pitch-archive.js`, their tests, `pitch-compress/SKILL.md` | 0–120 | S0 | — | Yes, but sequential: 3 fresh read-only reviewers (security, whole-file code, cross-boundary). Not parallel: rate limits, and each verified before the next | security `opus` (it deletes files); code review `sonnet` |
| S2 | Metrics collector re-review (`token-consumption.js`, `token-report.js`, OpenCode plugin) | record `review-metrics.md`; fixes ≤4 of the three files and their tests | 0–120 | S1 | — | Yes, sequential: 2 security dispatches (collector; renderer+plugin) + 1 cross-boundary | `sonnet` |
| S3 | `/state` re-review (`state-snapshot.js`, `state-theme.js`, `state-render.js`) + HTML nits triage | record `review-state.md`; fixes ≤4 of the three files and their tests | 0–120 | S2 | — | Yes, sequential: 3 whole-file code reviews (one per file) + 1 cross-file | `sonnet` |
| S4 | Audit reviewer contract | `ai-framework/workflow/phases/3-audit.md`, `.claude/skills/audit/SKILL.md`, `.cursor/skills/audit/SKILL.md` (byte mirror) = 3 | ~50 doc | S1–S3 (it records what they showed) | — | No: prose that must follow the evidence | — |

Sequencing is strictly S0 → S1 → S2 → S3 → S4. There is **no parallelism on purpose**: the pitch's premise is that
reviewers fail under load, and each slice's findings must be verified and fixed before the next dispatch.

## Blast radius (`/impact` equivalent, by grep)

- `3-audit.md` is referenced by `ai-framework/workflow/overview.md`, the audit skill and its Codex pointer / Cursor copy. The
  Codex (`.agents`) and OpenCode (`.opencode/commands`) entries are pointers to the canonical files and need no edit.
- `workflow-doctor.js` requires the audit skill to mention the rules (`rulesConsumers`); S4 must keep that true. The Cursor
  copy must stay byte-identical (`skill-vendors.js cursor-mirrors` and the setup validator flag a differing copy).
- `ai-framework/workflow/` and `.claude/skills/` are `bundle-sync` directories: S4's edits ship to every project. The bundle-sync
  suite is run after S4.
- `pitch-compress.js` is also loaded by `state-snapshot.js` (`inventory`), so an S1 fix there must run the state suites too.
- The three reviewed tools are otherwise leaf code; the metrics hooks are wired in `.claude/settings.json` and `hooks.json`
  (not changed by this plan).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

### S0 — Review bench
- `node --check ai-framework/scripts/review-bench.js` exit 0
- `node --test ai-framework/scripts/review-bench.test.js` exit 0, covering: `prepare` copies exactly the slice files to a scratch
  dir and applies **one** caller-supplied canary edit (`{file, find, replace}`; `find` must match exactly once) and verifies with
  a given test command that the canary makes a scratch test **fail** (a canary that breaks nothing is refused); the manifest
  records the canary's file:line but neither the scratch tree's file names nor the generated prompt mention it; `guard snapshot`
  then `guard check` passes on a no-op and **fails** for: a tracked-file edit, a new untracked file, a write to an ignored path
  under `.project/` (excluding `.project/metrics/` and `.project/reports/`, which hooks write during a session), and a
  symlink swap; `count` excludes the bookkeeping paths and this pitch's directory; `canary-check <report>` is true only when
  the report cites the canary's file within ±3 lines; `record-check <file>` fails a record that has `independent: yes` without
  `canary: caught`, or lacks `read-only:`, `prompt-sha256:` or a verification column.
- Mutation checks (recorded in `log.md`): removing canary application, the ignored-path hashing, and the `find`-once rule each
  make a test fail.
- `grep -c "review-bench" ai-framework/scripts/workflow-doctor.js` ≥ 1 and `node ai-framework/scripts/workflow-doctor.js` READY
- Applies `security.md` checklist G to itself: refuses symlinks and non-regular files in the slice, bounded reads, no project
  script executed (the test command is supplied by the main thread and run only in the scratch copy), no raw error text.

### S1 / S2 / S3 — a re-review slice (same shape, per-subject commands below)
- `test -f .project/pitches/independent-rereview-catch-up/review-<subject>.md` and
  `node ai-framework/scripts/review-bench.js record-check` on it exit 0.
- After **every** dispatch: `node ai-framework/scripts/review-bench.js guard check` exit 0 (the repo is unchanged apart from the
  main thread's own patches, after which the snapshot is retaken). The record states `read-only: verified by review-bench guard`.
- Every finding in the record has a `verified:` cell naming the command re-run by the main thread; unverified claims are
  triaged no higher than should-fix (verification budget: at most 8 claims per slice).
- The record carries `canary: caught | missed | not-run`. A slice with `missed` or `not-run` is recorded `independent: no` and
  its followup stays open, as does one whose reviewer returned nothing twice (`not-completed`);
  `grep -c "<followup heading>" .project/pitches/_followups.md` ≥ 1 in that case.
- Each fix has a regression test that fails when the fix is removed (a `mutation:` line per fix in `log.md`) and one narrow fresh
  re-review of the fix; `node ai-framework/scripts/review-bench.js count --since 42fbb58` ≤ 4 for the slice and ≤ 9 cumulative.
- The record quotes the exact reviewer prompt's hash (`prompt-sha256:`), states `independent:` as "fresh context, same model
  family; not proof of independence from the author's blind spots", and lists `cross-file interactions: reviewed | not reviewed`.
- `security.md` section 9 / checklist G walked item by item in the record (a result per item).
- Subject suites pass:
  - S1: `node --test ai-framework/scripts/pitch-compress.test.js ai-framework/scripts/pitch-archive.test.js ai-framework/scripts/state-snapshot.test.js`
  - S2: `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/opencode-plugin.test.js`
  - S3: `node --test ai-framework/scripts/state-snapshot.test.js ai-framework/scripts/state-html.test.js`
- `node ai-framework/scripts/workflow-doctor.js` READY and `node ai-framework/scripts/setup-validator.js` READY.
- S1 only: the record lists `cross-pitch-conflict-checker: not applicable (no other active pitch)`; adversarial slug pairs are
  used to confirm the `bare-prefix-match-crosses-entities` fix holds.
- S3 only: the five HTML nits are each marked `fixed | followup | rejected` with a reason (they stay followups unless a reviewer
  shows a concrete failure).

### S4 — Audit reviewer contract
- `grep -c "independent:" ai-framework/workflow/phases/3-audit.md` ≥ 1 (the per-role field on the `Dispatched:` line) and
  `grep -c "Reviewer contract" ai-framework/workflow/phases/3-audit.md .claude/skills/audit/SKILL.md` ≥ 1 each.
- The prompt template in `3-audit.md` contains each of: `whole-file review`, `hard limits`, `scratch`, `model`, `checklist`,
  and `known defects` (`grep -c` ≥ 1 each), and cites the existing "Verify before triage" section (`grep -c "Verify before triage"` ≥ 2).
- `diff .claude/skills/audit/SKILL.md .cursor/skills/audit/SKILL.md` exit 0 and
  `node ai-framework/scripts/skill-vendors.js cursor-mirrors` reports `"differs": []`.
- `node ai-framework/scripts/workflow-doctor.js` READY (the audit skill still mentions the rules) and
  `node --test ai-framework/scripts/bundle-sync.test.js` exit 0.
- `wc -l < .claude/skills/audit/SKILL.md` ≤ 95 (the contract lives in `3-audit.md`; the skill only points at it).

## Risks (inherited from pitch rabbit holes)

| Risk | Scope | Spike needed? | Mitigation |
|------|-------|---------------|------------|
| ~10–12 sequential dispatches; rate limits (HTTP 429) and 600 s stalls | S1–S3 | No | One dispatch at a time; hard limits in the prompt (each command ≤20 s, tool-call budget, final report required); one fresh retry on a narrower scope; a reviewer that returns nothing twice is recorded `not-completed`, never replaced by an author-run check |
| "Read-only" is prompt-only (`security-reviewer` has Write/Edit) | S0–S3 | No | Reviewers get the **scratch copy** only; `guard snapshot/check` around every dispatch; record states the method |
| Canary too easy, too hard, or unrelated to the role | S0–S3 | No | Canary is hand-authored per slice and role, must break a scratch test (bench refuses otherwise), and is a realistic defect of that role's class (security: a removed containment check; code review: an inverted condition) |
| A clean report is a correct result, not a failure | S1–S3 | No | Canary, not a length floor; `security-reviewer`'s one-line "No security findings." is valid only when the canary is caught |
| Fix volume overruns the appetite (projected 17–21 files typical) | S1–S3 | No | Per-slice cap 4, total 15, `count` after every fix; overflow becomes a new pitch. Running count in `hill.md` |
| A fix to a shared helper breaks a caller (`hardening-a-shared-reader…`) | S1, S3 | No | Trace callers before patching; run the state and pitch-compress suites together (S1's suite list includes state-snapshot) |
| The reviewer prompt drifts between slices | S1–S3 | No | Template lives in S4's doc section (drafted at S1 start as a file in the pitch dir, moved in S4); each record stores its `prompt-sha256:` |
| Reviewer model is silently the frontmatter default (Haiku) | S1–S3 | No | Explicit `model` override per dispatch, recorded in the record; a record without a model line fails `record-check` |
| Same model family as the author; cross-file bugs invisible to a per-file slice | S1–S3 | No | Wording "not proof of independence"; one cross-boundary pass per subject or `cross-file interactions: not reviewed` |
| Verification cost is unbounded | S1–S3 | No | At most 8 claims verified per slice; the rest triaged no higher than should-fix (as `3-audit.md` does) |

## Parallel dispatch plan

None. S0 → S1 → S2 → S3 → S4, one reviewer dispatch at a time, each verified by the main thread before the next. This is the pitch's
rate-limit mitigation, not a missed optimization.

## Wireframes (UI scopes only, light)

Not applicable: no UI scope. (`state-render.js` is reviewed in S3, not redesigned; no `<build-command>` exists for this project.)

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)
