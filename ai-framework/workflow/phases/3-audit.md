# Phase 3: Audit

## Purpose

Replace sequential review/security/test phases with a single **parallel fan-out** of specialized subagents. Same coverage, ~½ the wall time. Synthesize findings, fix must-fixes, loop until clean.

## Trigger

- Completion of `/build` with all scopes at `done`
- `/audit` command

## Subagent fan-out

| Subagent | Triggers | Profile | Output |
|---|---|---|---|
| `code-reviewer` | always | fast | Severity / file:line / rule violated / suggested fix (per `coding-standards.md` + `boundaries.md`) |
| `security-reviewer` | always | standard | Severity / vulnerability class / file:line / mitigation (per `security.md` + OWASP Top 10) |
| `test-coverage-checker` | always | fast | Uncovered behavior / missing regressions / flaky tests (per `testing.md`) |
| `ux-reviewer` | UI scopes | standard | 10-heuristic scores + simplification opportunities (per `ui-ux-review.md`); H8 ≥ 2 hard gate |
| `i18n-checker` | i18n strings touched | fast | Missing keys / EN↔ES parity / `pnpm i18n:check` results |
| `eval-runner` | AI-prompt scopes | fast | Per-criterion score + delta vs baseline + pass/fail per gate |
| `cross-pitch-conflict-checker` | ≥2 active pitches | fast | Pure overlap / adjacent overlap / disjoint vs other pitches' diffs |

Dispatch applicable roles in parallel when native subagents are available; otherwise run them sequentially before synthesis. Each role gets only the slice of diff it needs + only the rules it applies (`ai-framework/rules/` for the principle, the matching `.project/rules/*.md` companion for this project's concrete convention — both, not either) + only matched knowledge entries. Constrained context = clean signal.

## Synthesis (single-threaded, main thread)

After dispatch, main thread combines findings into a single report:

```markdown
# Audit cycle 1 — {pitch-slug}

Dispatched: code (3) | security (1) | test (2) | ux (PASS) | eval (PASS) | i18n (0) | cross-pitch (0)

## Must-fix (blocks /ship)
| ID | Source | File | Issue | Cycle |
|----|--------|------|-------|-------|
| M1 | security | api/.../route.ts:12 | No rate limit on AI endpoint | 1 |

## Should-fix
| ID | Source | File | Issue | Disposition |
|----|--------|------|-------|-------------|
| S1 | code | comment-thread.tsx:265 | Approaches 150-LOC limit | fix |
| S2 | ux | mobile.tsx | H10 help discoverability 1/3 | defer → log.md |

## Acknowledged
[…]

## Eval gate (AI scopes)
skillCoverage 2.1/3.0 ≥ 2.0 ✅
objectiveAlignment 2.8/3.0 ≥ 2.0 ✅
delta vs baseline: −0.0 (no regression) ✅
```

## Triage tiers (not negotiable)

- **must-fix** — security high/critical, build-gate failures, eval regression > 0.3 on any criterion, missing exit criterion from /plan, cross-pitch pure overlap. Blocks /ship.
- **should-fix** — fix this pass OR defer with named reason logged to `deviations.md`. Reason becomes a follow-up pitch candidate.
- **acknowledged** — noted, not actioned. Goes to `log.md` for `/cooldown` review.

## Loop discipline

- **Cycle 1**: full fan-out dispatch
- Apply must-fix patches in main thread
- **Cycle 2**: re-dispatch *only* the subagents whose findings changed (narrow re-check)
- **Cycle 3**: same, narrower
- After cycle 3 with must-fixes still open → framework recommends `/shape` re-entry. Pitch is over-ambitious for its appetite.

## Evidence rule (same as /build)

Every "fixed" claim re-runs the failing check and pastes the new output. No assertions without evidence.

## Eval gate (AI changes — hard)

For pitches touching prompts or LLM call sites:
1. Load baseline from `.project/evals/runs/{prior}.json`
2. Run new code against golden cases (mandated at `/shape`)
3. Compute per-criterion delta
4. **Any criterion regressing by > 0.3 = must-fix**
5. Should-fix tier: regression between 0.2 and 0.3 (catches subtler drifts)

## Cross-pitch conflict check

Triggers when ≥ 2 active pitches in `.project/pitches/`. Output:
- **Pure overlap** — same file edited by both → must-fix (decide merge order or split scope)
- **Adjacent overlap** — shared module, different files → should-fix
- **Disjoint** — clean

## Adaptive gate

| Appetite | Cycles capped | Gate at audit end |
|---|---|---|
| small-batch | 2 | no — auto-flow to /ship if zero must-fix |
| big-batch | 3 | yes — present synthesis, ask |
| bug-fix | 2 | no |
| hotfix | 1 (single pass) | yes — must explicitly accept residual risk |

## Output

- Audit synthesis report with all 3 tiers
- Must-fix queue: empty
- Evidence inline for every fix applied

## Confirmation gate

Big-batch and hotfix only. Options: Approve → /ship / Revise (cycle 2) / Back to /build / Stop.

## Transition

→ Phase 4: `/ship`
