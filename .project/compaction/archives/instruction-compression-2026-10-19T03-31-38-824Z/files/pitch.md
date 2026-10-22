# Pitch: instruction-compression

**Date**: 2026-10-17  •  **Appetite**: big-batch (decompose into waves in /plan)
**Stack**: ai-prompts (the workflow's own skills, agents, rules and phase specs)

## Problem

Agents load more instruction than a phase needs: a build phase that follows its referenced documents reads about
12,500 words before the plan and the code, and the same caveman and dispatch banners repeat across 44 canonical files
(about 5,100 words, before the Cursor copies). The owner wants lighter routine context with **the same required
decisions and evidence** on Claude Code, Codex, OpenCode and Cursor.

## Prerequisite and sequencing

**Sequencing (cross-pitch, from the fix-instruction-conflicts audit):** this pitch rewrites the same canonical
skills, agents, rules and banners that `fix-instruction-conflicts` corrects. Intent is compatible, but this pitch may
not reach `/plan` until that bug fix has shipped; its plan starts from the shipped owners and keeps
`workflow-contracts.test.mts` green.

The instruction conflicts that had to be resolved before anything is shortened were fixed as a bug fix:
`.project/pitches/fix-instruction-conflicts/log.md` (Orca exit 3, read-only security reviewer and its summary, one
size-limit owner, one gate matrix with a `/build end` row, both mirror mechanisms, entry-file and mode precedence,
behavior-based AI-prompt scope). `ai-framework/scripts/workflow-contracts.test.mts` guards those owners; this pitch
must keep it green.

## Knowledge consulted

- [patterns/a-gate-must-not-trust-its-own-author] — the reviewer and gate wording this pitch shortens exists to
  enforce re-checks; compression must not drop those clauses.
- [issues/test-skip-is-a-follow-up-not-a-finish] — a validator that blocks a change gets a replacement check, never a
  removal or skip.
- [decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id] — profile/model routing stays in frontmatter and
  `ai-workflow.toon`; prompts only name the profile.
- Owner analysis (2026-10-17): ownership model and constraints below.

## Ownership model (who states each topic; everyone else points at it)

| Topic | Owner |
|---|---|
| Phase activities and completion requirements | `ai-framework/workflow/phases/*.md` |
| Gate applicability (appetite × phase) | `ai-framework/workflow/overview.md` "Adaptive confirmation gate" |
| Orca outcome semantics | `orca-run.mts` contract + `integrations/orca-vendors.md` |
| Host invocation, permissions, model routing | native adapters (`.opencode/`, `.codex/`, `.agents/`) + `ai-workflow.toon` |
| Role-specific review method | canonical agent prompt |
| Shared finding requirements | audit reviewer contract (`phases/3-audit.md`) |
| Concrete coding limits | `rules/component-architecture.md` / project rules |
| Mode resolution | `skill-defaults.mts` + `integrations/skill-defaults.md` |

A pointer must say **when** to load the owner and **which section** applies; a bare link is not a pointer.

## Solution sketch (breadboard)

**Places**: canonical phase skills (build, audit, ship first), canonical reviewer agents (security, code, test
coverage), the planner prompt, rules, the shared caveman/dispatch banners, their Cursor copies.

**Affordances**:
1. *Thin phase skills*: invocation mechanics, required inputs, "execute `phases/<n>.md`" with the sections that apply;
   no copied activities, gate tables or transitions.
2. *Conditional Orca guidance*: a short startup decision in the normal path; dispatch/reconcile detail loaded only when
   the switch is on.
3. *Focused agents*: scope, evidence requirements, review method, output obligations; generic examples moved to an
   optional reference.
4. *Compact rules*: enforceable checks and applicability first; rationale and examples after, loaded on demand.
5. *Planner template* aligned with the real scope/dependency/dispatch/exit-criterion structure.
6. *Shorter shared banners* that keep mode inheritance, raw-invocation handling, optional install and sequential
   fallback.

**Connections**: owner documents unchanged in meaning → wrappers shrink → Cursor copies refreshed in the same change →
contract tests + behavior cases prove the same decisions.

**Golden behavior cases (AI-prompt scope; required before bet)** — to be added under `.project/evals/datasets/`
and run before and after each wave on every vendor available:
- Gates: small-batch build flows into /audit without a stop; big-batch, bug-fix and hotfix stop at `/build end`;
  hotfix asks for a rollback plan at `/build start`.
- Orca: switch on + refused reconcile (exit 3) stops and asks; switch off runs normally; `orca=normal` bypasses one call.
- Reviews: a clean security review still ends with the summary and PASS; an unfinished one is INCOMPLETE; the reviewer
  never edits the repo (guard snapshot clean).
- Modes: `caveman=<mode>` in the invocation overrides once and is passed to dispatched agents; `off` disables.
- AI-prompt trigger: a prompt moved out of `lib/ai/prompts/` still triggers /critique and the golden-eval gate.
- Vendor loading: each vendor's adapter actually loads the canonical file and the owner sections it points at.

## Measurement (reproducible, static; not a token-savings claim)

Baseline taken 2026-10-17 after the conflict fix: canonical skills 28 files / 21,186 words; agents 16 / 11,713;
rules 16 / 18,505; phase specs 6 / 6,153 (+ overview 1,256); integrations 6 / 12,932; docs 11 / 4,857; caveman banners
4,124 words and dispatch banners 944 words across canonical files; build-phase referenced load ≈ 12,506 words
(AGENTS.md, overview, build skill, 2-build.md, harnesses.md, model-routing.md, coding-standards.md, boundaries.md,
testing.md). Report separately: repository size, per-task loaded context (measured from real sessions), tool calls and
latency, maintenance effort, and behavior/review quality. Disk duplication (Cursor copies) is not runtime duplication.

## Rabbit holes

**Resolved here**:
- Is this a bug fix? → No. Only the confirmed conflicts were (done). Restructuring goes through /critique, bet, /plan.
- Do one-line banners pass validation? → Not today: `skill-defaults.test.mts` (~line 256) and `workflow-doctor.mts`
  require literal markers and resolver commands in every canonical prompt. Shortening them needs replacement checks
  that verify loading and behavior, proposed in the same scope — never deleted assertions.

**Pushed to /plan as risk**:
- Cursor copies are not regenerated automatically for differing files (`cursor-mirrors --apply` creates missing ones
  only); every wave refreshes them by copy and checks parity.
- Test coverage: `scripts/*.test.mts` misses `scripts/runtime/` and `hooks/scripts/`; run the nested suites too.
- Live vendor checks: structural validation cannot prove behavior. Codex and OpenCode coordinator activation is still
  unproven live; plan the live cases per vendor and mark the rest unverified.

**Pushed to no-go**:
- Rewriting externally installed skills (e.g. `caveman`) or third-party rule content.

## No-gos (this pitch)

- ✗ No new gates, no skipped reviewers, no weakened evidence or permission boundaries, no workflow-semantics change to
  save words.
- ✗ No promised percentage reduction without the before/after measurement above.
- ✗ No removal of a validator assertion without a replacement check.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

(Empty until /critique runs — required before bet: big-batch and AI-prompt scope.)

## Bet decision

☐ **Bet** (→ /plan)
☐ Re-shape — named gap: {…}
☐ Pass — moved to `.project/pitches/_parked/instruction-compression/`; reason: {…}


## Shaping revision — 2026-10-18 (current candidate; Bet pending)

The original broad proposal above is retained as history. The proposed next bet is bounded by
[shape-revision.md](shape-revision.md): build, audit and ship wrappers only, with Cursor copies,
owner requirements and replacement coverage (14 projected implementation files; maximum 15).
Agent rewrites, rule compaction, planner changes and the shared-banner sweep require separate pitches.

### Critique findings

All five required perspectives completed through Orca Run `run_fda64cf7e993`.
[critique.md](critique.md) records evidence, proposed dispositions, refuted claims and worker accounting.
The scope-overrun finding is addressed by the bounded candidate; pointer, validator, rollout and baseline
risks are explicit planning obligations. No critique finding has been silently accepted as a user decision.

Golden specification: [instruction-compression.json](../../evals/datasets/instruction-compression.json),
31 unique cases, all live-only/not-run. All 14 existing instruction-contract tests passed.
The initial OpenCode model override refusal was diagnosed and recovered with user authorization;
no workflow source code or global settings changed.

**Gate:** Approve / Revise / Back / Stop. Approval means Bet on the bounded candidate and return to `/plan`;
it does not approve the original full sweep or implementation. No Bet selected yet.


## Bet recorded — 2026-10-18

The user replied **Approve** to the bounded-candidate gate. Bet is selected for
[shape-revision.md](shape-revision.md), with the critique dispositions and mitigations recorded there
and in [critique.md](critique.md). The original full sweep is not approved.
Planning now lives in [plan.md](plan.md), with [impact.md](impact.md) and [hill.md](hill.md).
The plan is a complete draft awaiting impact acknowledgment and plan approval; no build has begun.


## Plan approved — 2026-10-18

The user replied “Appove” to the plan/impact gate. The bounded [plan.md](plan.md) is finalized and [impact.md](impact.md) acknowledged. [build-start.md](build-start.md) prepares S1 for the separate big-batch start gate. No implementation has begun; all hill rows remain uphill 0%.


## Bounded S1 result — 2026-10-18

After explicit approval of the incomplete-baseline disposition, build-wrapper compression and its reusable proof are complete under the S1-only amendment. The wrapper is 489 words versus 1,314; Cursor and banner parity hold. No new scored regression was observed, while known failures and unverified coverage remain. Full Node tests pass. S1 scope approval and the remaining S2/S3 budget decision are presented in [build-evidence.md](build-evidence.md); no later scope or ship has started.
