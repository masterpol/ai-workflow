# Audit cycle 1 — fix-instruction-conflicts (2026-10-18)

Dispatched: code (2 attempts: INCOMPLETE then complete, independent: yes) | security (1, independent: yes) | test (1, independent: yes) | eval (1, independent: not-completed) | cross-pitch (1, independent: yes) | ux n/a | i18n n/a
Orca Run `run_69e8aec6acd0` (coordinator claude). Workers: codex (code, test, eval, code retry), opencode (security, cross-pitch). All six attempts sent their own `worker_done`, were collected, released (liveness `exited`) and their deliveries acknowledged.

independent: yes
canary: caught
read-only: verified by review-bench guard snapshot/check (changed paths = only the coordinator's own cycle-1 patches; HEAD unchanged) + scratch copies rv2/rv3
model: gpt-6.1-sol high (code, code retry, eval), gpt-6-luna high (test), opencode default (security, cross-pitch; launch-time model selection unsupported by this OpenCode TUI)
cross-file interactions: reviewed
prompt-sha256: c550f3887334722bd4ca3b47a99c1dc6ea82413309f05ee1babed4de9e60f41d

Prompt hashes (SHA-256 of the exact text sent): code c550f388…, security 86732e96…, test 38ab5a2b…, eval 46802a79…,
cross-pitch fa57e931…, code retry b9063382…, cross-pitch (rv3) 34ca0b28….

**Canary:** `ai-framework/workflow/phases/3-audit.md` Orca block in the scratch copy re-allowed the exit-3 fallback
("If the command exits 3, continue with the normal single-agent path above"). Baseline contract suite passed; the
canary broke contract A. Caught by all six attempts (each reported it as must-fix at 3-audit.md:195). It is a planted
defect, not a defect of the shipped files (refuted against the repo: the live block says stop and ask).

## Must-fix
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| M0 | all | 3-audit.md:195 (scratch) | exit-3 fallback | canary (planted) — refuted as repo defect | none |
| M1 | cross-pitch | instruction-compression | pure overlap: it plans to rewrite the files this fix corrects | confirmed | fixed: sequencing recorded in its pitch (no /plan before this fix ships) |

## Should-fix (fixed this cycle, each with a regression assertion and a mutant proof)
| ID | Source | File | Issue | verified | Disposition |
|----|--------|------|-------|----------|-------------|
| S1 | code | ui-design/SKILL.md:49,51,84 | hardcoded 150-line limit; split ordered despite cohesive exception | confirmed | fixed (points at owner; honours exception) — contract N |
| S2 | code | component-architecture.md:87 | enforcement ignored the cohesive-unit exception | confirmed | fixed — contract N |
| S3 | code, code retry | setup/SKILL.md:15,136,227; SETUP.md:213,346 | full mirror required despite the accepted `@AGENTS.md` import | confirmed (SETUP.md:213 found by the new test) | fixed — contract N |
| S4 | code | skill-defaults.md:96 | `enabled: false` "the only persistent disable" ignored the toon | confirmed | fixed — contract N |
| S5 | code | 4-ship.md:22, ship/SKILL.md:20 | failed verify returned to "audit cycle 2" past a hotfix cap of 1 | confirmed | fixed — contract N |
| S6 | code retry | skill-defaults.md:25 | "every vendor mirror already says load the canonical file" (Cursor copies are byte copies) | confirmed | fixed — contract N |
| S7 | test | workflow-contracts.test.mts:156 | mirror test skipped absent Cursor copies (deletion survived) | confirmed | fixed (presence asserted) |
| S8 | test | workflow-contracts.test.mts:146 | contract M missed a contradictory plan/hill requirement | confirmed | fixed (lite paragraph must waive them) |
| S9 | eval | phases/3-audit.md eval gate | no golden case covers the changed prompt behavior | confirmed | **open** — see below |

## Acknowledged
| ID | Source | Issue | verified |
|----|--------|-------|----------|
| A1 | test, security, cross-pitch | some suites could not run in the scratch copy (missing hook modules, skill-vendors.json) | covered author-run: full Node/Bun suites below |
| A2 | security | live vendor behavior unverified | known (instruction-compression owns live cases) |

## Incomplete reviews
- code: first attempt INCOMPLETE (scratch lacked `.agents/`, `SETUP.md`); retried once with a fresh reviewer on a
  narrower scope in rv3 → complete.
- eval: INCOMPLETE. The only dataset (`orca-vendor-orchestration.json`, 11 cases: 7 executed and passed, 1 parsed-only,
  3 live-only not run) grades the Orca libraries, not the changed prompts. The missing golden cases (gates, Orca
  refusal, review summary/INCOMPLETE, AI-scope trigger, read-only reviewer, size exception, mirrors, toon precedence,
  cycle caps, lite card) cannot be produced by a retry; recorded `independent: not-completed`. Per "Incomplete
  reviews" the audit stays open: **no auto-advance to /ship**.

## Author-run checks (not reviews), after the cycle-1 patches
- Contracts: `workflow-contracts.test.mts` 14/14 on Node and Bun. Each new assertion was proven by restoring the
  pre-fix wording (or reintroducing the conflict) in memory: 12 mutants, all killed.
- Full suites: Bun 1688 pass / 0 fail / 2 skip. Node 1689 pass / 2 fail / 2 skip; the two failures
  (metrics-lock paused holder, token-consumption replay dedupe) are the flagged lock-timing flake — both files pass
  3/3 when rerun alone.
- workflow-doctor READY and setup-validator READY on Node and Bun; Cursor copies 44 current, 0 differ; docs-links 26
  files, 0 broken; `review-bench record-check` ok.

## Gate
Bug-fix audit end: auto only if clean **and all required reviews complete**. The eval review is `not-completed`
(no golden coverage for the changed prompt behavior), so the audit stays open and asks the owner: accept the residual
eval risk for this bug fix (the cases are already scoped in `instruction-compression`), add golden cases first, or stop.

**Owner decision (2026-10-18): Approve → /ship with the residual eval risk accepted.** The required eval review stays
recorded as `not-completed`; the missing golden behavior cases are owned by `instruction-compression` and must exist
before that pitch is bet.
