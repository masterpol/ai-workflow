# Pitch: Independent re-review catch-up

**Date**: 2026-09-26  •  **Appetite**: big-batch (≤15 files changed, including records; raised to ≤16, then
to ≤19, by explicit user approval — 2026-09-27, see `deviations.md`. The second raise was because S3's
independent re-review turned up three must-fix bugs across all three `/state` files, not the one
truncation bug the first raise was sized for; fixing all three with regression tests needs 5 files, not 2).
Hard stop: each review slice may fix at most 4 files, raised to 5 for S3 only by the same approval; a
running file count lives in `hill.md`, and anything past the slice cap or the 19-file total becomes a new
pitch, never a silent overrun
**Stack**: workflow tooling (Node scripts, hooks, workflow docs)

## Problem

A maintainer who runs `/pitch-compress` (which deletes files), the metrics hooks (which run on every agent
event) or `/state` cannot tell which parts an independent reviewer has actually examined. Three pieces shipped
with weaker review than the workflow promises, and their own records say so:

- **`pitch-compress.js` / `pitch-archive.js`**: only the code reviewer finished; the security pass on this
  file-deleting tool was run by its author.
- **The metrics collector** (`token-consumption.js`, `token-report.js`, the OpenCode plugin): the cycle-2
  security re-check never returned (rate limit, two stalls) and was author-run.
- **`/state`** (`state-snapshot.js`, `state-theme.js`, `state-render.js`): security got independent cycles, but
  the code review was shallow (three tool calls, one finding) and five HTML nits were never actioned.

Each is a queued followup. Underneath is a process gap: the audit docs say to verify findings but not what to do
when a reviewer never finishes, so an author-run substitute can be mistaken for a review.

## Knowledge consulted

- `issues/reviewer-reports-contradicted-by-measurement` — every specific in a report is re-checked before triage;
  a short "clean" review is an unreviewed area; long-running reviewers need hard limits. Shapes how this pitch runs.
- `patterns/a-gate-must-not-trust-its-own-author` — why an author-run check is evidence, not independence, and why
  a deviation that relaxes a safety property is flagged, not logged as routine.
- `issues/hardening-a-shared-reader-made-its-writer-destructive` — re-review the fix as well as the finding, and
  trace a shared-helper change through every caller. Applies to every fix this pitch makes.
- `issues/async-agent-launch-hook-counted-as-completion` — the collector was built on assumed hook semantics; the
  review must check assumptions against live payloads, not names.
- `patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code`, `resolve-before-matching-a-protected-path-allowlist`,
  `allow-list-untrusted-labels-at-ingest-and-at-render` — the yardstick for two of the three subjects.
- `patterns/parse-untrusted-values-and-re-emit-them` — the yardstick for `state-theme.js` / `state-render.js` (S3).
- `patterns/reversible-aggregates-store-their-routing` — the design the collector's reversal logic must satisfy (S2).
- `issues/bare-prefix-match-crosses-entities` — an already-*fixed* defect in `pitch-archive.js`; S1 reviewers verify the
  fix holds (adversarial slug pairs) rather than skip it.
- `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers` — the standing no-gos all three
  subjects inherit.
- `decisions/pitch-compaction-gate-and-recovery-design`, `token-metrics-dimensions-design`,
  `project-state-report-design` — the contracts each review tests the code against.
- `ai-framework/rules/testing.md` ("Guards and Fixes") and `ai-framework/rules/security.md` (section 9, checklist
  G) — promoted at the 2026-09-25 cooldown; the review checklists.
- `ai-framework/workflow/phases/3-audit.md` — has "Verify before triage" but no reviewer-completion contract.

## Solution sketch (breadboard, NOT wireframe)

**Places**: a *review slice* (one subject × one reviewer role); the *verification bench* (scratch copies in the
session scratchpad, never the repo); the *slice record* (`review-<subject>.md` in this pitch's directory); the
*repo* (must-fix patches only); the *audit contract docs* (`3-audit.md`, `.claude/skills/audit/SKILL.md` and its
Cursor mirror).

**Affordances per place**:
- Review slice: one fresh agent (never resumed, never shown earlier findings), dispatched with an explicit
  `model` override of `sonnet` or higher — `code-reviewer` and `test-coverage-checker` are pinned to Haiku in
  their frontmatter, and the shallow `/state` review came from exactly that. The prompt is a template: it names the
  exact files and line ranges as the target, says "whole-file review of committed code; ignore the diff-only and
  unchanged-code filters", requires the yardstick checklist to be walked item by item with a result per item,
  lists already-known defects to skip, and states hard limits (each command ≤20 s, tool-call budget, final report
  required). PoCs run only on a scratch copy in the session scratchpad, never against the repo.
- Verification bench: re-run every cited command or PoC; mutation-check any new guard; re-measure any number.
- Slice record: findings table (severity / file:line / claim / verified? / disposition), what was not
  independently reviewed, and an explicit "independent: yes / no" line.
- Repo: fix, add a regression test, mutation-check it, then one narrow fresh re-review of the fix.
- Audit contract docs: a short "reviewer contract" section (see S4).

**Connections** (sequential, one dispatch at a time):

| Slice | Subject | Reviewer role | Yardstick |
|---|---|---|---|
| S1 | `pitch-compress.js`, `pitch-archive.js` (+ tests, skill) | security-reviewer (sonnet), then a code-reviewer (sonnet) whole-file pass; mutation pass on the main-thread bench | compaction decision entry; security §9 |
| S2 | `token-consumption.js`, `token-report.js`, OpenCode plugin | security-reviewer (2 narrow dispatches: collector, renderer+plugin) | metrics decision entry; allow-list pattern |
| S3 | `state-snapshot.js`, `state-theme.js`, `state-render.js` | code-reviewer (sonnet, 3 narrow dispatches, one per file, plus one cross-file interface pass) + the five HTML nits triaged | state decision entry |
| S4 | audit contract | main thread | what S1–S3 showed |

Each subject also gets one cross-boundary pass (interfaces between the slice files, callers of any shared helper); if
it is skipped the record says "cross-file interactions not reviewed".

Flow: dispatch → report → main thread verifies each claim → triage (must / should / acknowledged) → must-fix
patched → narrow re-review of the fix → record → update `_followups.md` (close, shrink, or leave open with the
reason).

S4 is a small doc change that puts the contract where it is used: a per-role `independent: yes | no | not-completed`
field on the audit synthesis template's `Dispatched:` line in `3-audit.md` (mirrored in `.claude/skills/audit/SKILL.md`
and its vendor copies), citing the existing "Verify before triage" section instead of restating it. A reviewer that
returns nothing twice is recorded `not-completed` and never silently replaced by an author-run check; every dispatch
carries hard limits and a per-role model; the review prompt template above lives in that doc. A canary replaces a length
floor: the bench plants one known-bad edit (a mutation) in the scratch copy and a slice counts as reviewed only if
the reviewer catches it, because `security-reviewer` legitimately answers a clean run in one line ("No security findings.").

## Rabbit holes

**Resolved here** (with answer):
- What counts as independent → a fresh agent instance, read-only, not resumed, not shown earlier findings, whose
  claims the main thread re-verifies. An author-run check is recorded as author-run, never as independent. A slice
  whose reviewer fails twice stays "not independently reviewed" and its followup stays open.
- Reviewer failures (rate limit, watchdog stall) → sequential dispatch, ≤~500 LOC per dispatch, hard limits in
  every prompt, one fresh retry on a narrower scope, never wait on a stalled agent.
- Trusting a report → every finding's cited command is re-run before triage; a short "clean" report counts as
  unreviewed and the slice is re-dispatched on a different cut.
- Already-known defects (ancestor-symlink race, collector lock PID reuse, identity-key collisions, `commit-ledger`
  symlink write) → reviewers are told they are known and skip them; they belong to `path-safety-hardening` and
  `collector-robustness`.
- Scope of fixes → must-fix only. Per-slice cap of 4 files and the 15-file total are hard stops tracked in `hill.md`;
  the remainder becomes a new pitch. Should-fix and acknowledged items go to `_followups.md`.
- What "independent" means in each slice record → "fresh context, same model family; not proof of independence from
  the author's blind spots", never "verified independent". Stated on every record so a reader cannot over-read it.
- "Read-only" (the `security-reviewer` agent has Write and Edit) → enforced three ways: PoCs only on a scratch copy
  (prompt), a `git status` plus a tree hash of `.project/` before and after every dispatch, and the record states
  "read-only: verified by <method>", not "assumed".
- How we know a re-review found what is there and not nothing → the canary above, plus an explicit stop rule: after
  audit cycle 3, unverified or new findings go to `_followups.md` as "not resolved". Verification has a budget: at
  most N claims verified per slice, the rest triaged no higher than should-fix (as `3-audit.md` already does).

**Pushed to /plan as risk** (with named owner):
- Slice sizing per file and the model for the file-deleting tool (`sonnet` vs `deep`). Owner: planner.
- Wall-clock and rate limits: about 10–12 sequential dispatches including re-checks (a projection, not a
  measurement). Owner: planner — sequence them, retry once fresh on a narrower scope, and record which completed.
- Whether a fix needs more than one re-review (cap: the audit loop's 3 cycles). Owner: build.
- Whether a dispatch can run with a tool subset lacking Write/Edit where the harness allows it. Owner: build.

**Pushed to no-go** (deferred):
- Enforcing a reviewer budget or completion contract in code (a harness feature).
- Automatic rerouting to another vendor's reviewer when one fails.

## No-gos (this pitch)

- ✗ No new features and no refactors; only must-fix patches from independent findings.
- ✗ No fixing should-fix, acknowledged, or already-known deferred defects here (they go to `_followups.md` and
  their own candidate pitches).
- ✗ No editing of archives, ledgers, `done-work.md`, or any compacted history.
- ✗ Reviewers are read-only; no reading of `.env*`, `credentials.json`, or `settings.local.json`.
- ✗ No author-run check is ever presented or recorded as independent.
- ✗ No re-review of what already had a completed independent review (`/state` security cycles 2–3).
- ✗ No live-host verification (`live-host-verification` candidate).

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-09-26 (knowledge-historian, skeptic, appetite-auditor; cross-pitch-projector skipped: only one active
pitch). Each finding was checked against the files before it was accepted. Disposition: all **addressed** in the pitch above.

| ID | Perspective | Severity | Type | Finding (verified) | Disposition |
|----|-------------|----------|------|--------------------|-------------|
| C1 | skeptic | high | rabbit-hole | Reviewer roles do not match the agent files: `code-reviewer` and `test-coverage-checker` are pinned to Haiku, and `test-coverage-checker` has no mutation step. The shallow `/state` review came from that same Haiku agent | Addressed: explicit `sonnet`+ model override per dispatch; mutation pass moved to the main-thread bench |
| C2 | skeptic | high | rabbit-hole | Shipped code has no diff; `code-reviewer` starts from `git diff` and skips unchanged code, and `security-reviewer`'s checklist is a web-app one | Addressed: prompt template naming exact files/ranges, whole-file review, checklist walked item by item |
| C3 | skeptic | high | rabbit-hole | "Read-only" unenforced: `security-reviewer` holds Write/Edit; `git status` misses ignored paths | Addressed: scratch-copy PoCs, `git status` + tree hash of `.project/` before/after, record states the method |
| C4 | skeptic | medium | rabbit-hole | "Independent" is a self-applied label (same model family); per-file slices miss cross-file bugs | Addressed: record wording is "fresh context, same model family"; one cross-boundary pass per subject |
| C5 | skeptic | medium | rabbit-hole | No ground truth that a clean re-review found what is there; the fix re-review loop had no exit; a length floor would flag a correct one-line clean report | Addressed: seeded canary replaces the length floor; stop rule after cycle 3; verification budget |
| C6 | skeptic | medium | rabbit-hole | S4 contract was unenforceable prose duplicating "Verify before triage" | Addressed: an `independent:` field on the audit synthesis template's `Dispatched:` line, citing the existing section |
| C7 | appetite-auditor | high | scope-overrun | Projected 17–21 files for typical fixes, 24–27 worst case (a projection, not a measurement) | Addressed: per-slice cap of 4 files and 15-file total as hard stops; overflow becomes a new pitch; running count in `hill.md` |
| C8 | appetite-auditor | medium | rate-limits | About 10–12 sequential dispatches | Addressed: pushed to /plan as a named risk; retry once fresh and narrower |
| C9 | knowledge-historian | high | missed-knowledge | `bare-prefix-match-crosses-entities` (S1), `parse-untrusted-values-and-re-emit-them` (S3) | Addressed: added to Knowledge consulted; S1 verifies the fix holds |
| C10 | knowledge-historian | medium | missed-knowledge | `reversible-aggregates-store-their-routing` (S2), the standing-no-gos decision | Addressed: added to Knowledge consulted |


## Bet decision

☑ **Bet** (→ /plan) — 2026-09-26, user selected **bet** after the critique findings C1–C10 were addressed in the pitch.
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

Accepted risk carried into /plan: the appetite projection (17–21 files for a typical set of fixes) is an estimate;
the per-slice cap of 4 files and the 15-file total are the hard stops, tracked in `hill.md`.
