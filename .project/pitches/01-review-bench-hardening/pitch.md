# Pitch: review-bench-hardening

**Date**: 2026-10-23, re-shaped 2026-11-25  •  **Appetite**: small-batch (≤5 files)
**Stack**: workflow tooling (`review-bench.mts`, its test, one decision entry)
**Origin**: cooldown candidate F1 (`runs/cooldown-2026-10-23-forced.md`); followups TTR-A1, TTR-A2, TTR-A3 and the 2026-09-27 isolation question.

## Problem

`review-bench` is what makes an audit's claims checkable: it guards the tree during a review, counts files against the appetite cap, checks that a
planted defect was caught, and checks the audit record. On 2026-11-25, in temporary repositories, each of those could give a wrong answer, and
inspecting a repository ran programs named in its own Git config.

| # | Reproduced | Result | First draft said |
|---|---|---|---|
| 1 | `guard snapshot` on a repo with `core.fsmonitor` set in its config | **the program ran** | same (TTR-A1) |
| 2 | `guard snapshot` with a clean filter from `.gitattributes` and repo config | **the program ran** | same |
| 3 | `count --max abc`, `--max Infinity`, bare `--max`, with the cap exceeded | **exit 0: the gate passes** | "accepts" bad values |
| 4 | `count` with a non-ASCII bookkeeping file | counted, and returned in quoted octal form | same (TTR-A2) |
| 5 | `guard snapshot --file <project>/..inside.json` | **written inside the project**: the containment check is bypassed | "wrongly refused" (the opposite) |
| 6 | `guard check` with a snapshot of the wrong shape | raw `Cannot convert undefined or null to object` | same (TTR-A3) |
| 7 | `canary-check` where the report cites `unrelated-facts.mts:10` and the canary is in `facts.mts` | **`caught: true`** | "citation parsing is loose" |
| 8 | `record-check` on a record where one section claims `independent: yes` and only another has `canary: caught` | **passes** | **not listed** |

7 and 8 matter most now: audit records have one section per reviewer role, so the check that is meant to stop an unearned independence claim
can be satisfied by another role's evidence. (The records written on 2026-11-24 and 25 all say `independent: no`, so none relied on this.)

**Related, not in scope:** the four audit records from 2026-11-24 and 25 are `independent: no` for every role; one from 2026-11-23 reached `yes`
with caught canaries. `prepare` copies only the files named by hand and refuses unless their tests pass there; a first try with a module and its
test failed that baseline check (their imports were not listed).

## Knowledge consulted

- patterns/`a-planted-canary-makes-a-reviewer-finding-checkable` — the claim that checks 7 and 8 protect.
- patterns/`a-gate-must-not-audit-its-own-instrument`, `a-gate-must-not-trust-its-own-author`.
- patterns/`path-containment-compares-real-paths` — row 5 is a string-prefix containment test (`startsWith("..")`).
- issues/`review-guard-hashes-ignored-secret-files`, `review-guard-snapshot-can-outgrow-its-reader` — already fixed; must not regress.
- rules/`security` section 9 — one guarded reader, fixed diagnostics, no project program executed.

## Solution sketch (breadboard)

**Places**: `review-bench.mts`, `review-bench.test.mts`, a decision entry for the isolation boundary.

**Affordances**
- **Git without the repository's programs** (1, 2): every Git call runs with system and global config off and `core.fsmonitor=false`; a
  repository whose own config defines a filter or monitor program is refused with a fixed message. An execution-spy test for each.
- **Strict numbers and names** (3, 4): `--max` must be present as a finite non-negative integer, else a usage error; listings use `-z`.
- **Containment by path segment** (5): "outside" means the first segment is exactly `..`.
- **Checked input** (6): validate the snapshot's shape; file errors map to fixed text.
- **Exact citation** (7): the cited path must be the canary's path or end with `/` plus it, or be its bare name only when that name is unique
  among the copied files.
- **Record checked per section** (8): each section that states `independent:` must itself carry its canary, read-only method, prompt hash,
  model and cross-file line.

**Connections**: `/audit` → `prepare` / `guard` / `canary-check` / `record-check` → the audit record.

## Rabbit holes

**Resolved here**
- Is convention-based read-only enough, or is process isolation needed? → **Not in this pitch.** The tool inspects this trusted checkout; the
  boundary is stated in a decision entry: the guard detects changes after the fact and does not prevent them.
- Per-section `record-check` would reject old records? → It applies when a record is checked; old records are history and are not rewritten.
  /plan runs it over existing records and lists any that would now fail.

**Pushed to /plan as risk**
- Whether refusing repo-level filters breaks a legitimate setup (for example Git LFS configured in the repository). Planner spikes it; the
  alternative is to stop using the Git commands that run filters, since the guard already hashes the tree itself.
- `SETUP.md` is not in the guard's hashed roots (its changes show only through `git status`): decide whether to add it.

**Pushed to no-go** (followups)
- **Making `prepare` follow imports** so a real module can be copied and independence is practical to reach. This is the likely reason recent
  audits stop at `independent: no`; it deserves its own pitch.
- OS-level sandboxing; changing how Orca reviewers are dispatched.

## No-gos (this pitch)

- ✗ No weakening of symlink, FIFO, secret-name or size refusals, or of the current caps.
- ✗ No execution of anything supplied by the inspected tree.
- ✗ No sandbox infrastructure.
- ✗ No edits to existing audit records.

## Critique findings

Not run: small-batch, no AI-prompt scope.

## Bet decision

☐ **Bet** (→ /plan)  
☐ Re-shape — named gap: {…}  
☐ Pass — reason: {…}
