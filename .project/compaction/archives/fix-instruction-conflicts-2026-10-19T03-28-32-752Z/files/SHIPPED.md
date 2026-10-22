# Shipped: fix-instruction-conflicts
Opened: 2026-10-17  •  Shipped: 2026-10-18  •  Appetite: bug-fix  •  Versions: 2.31.1–2.31.4

## Scope (single implicit scope, `log.md`)
| Item | Status | Notes |
|---|---|---|
| A Orca exit 3 | shipped | phase specs stop and ask; `orca-vendors.md` owns the outcome decision ("exit 3 alone never authorizes the normal path"), documents exit 4 |
| B/C security reviewer | shipped | read-only on every vendor; inspect and report; one summary with Checked/Unverified and PASS/BLOCK/INCOMPLETE; INCOMPLETE if no scratch path |
| D size limits | shipped | `component-architecture.md` owns them (project limit, else 150/80/50); cohesive-unit exception honoured in enforcement and ui-design |
| E gates | shipped | `overview.md` owns the matrix, `/build end` row added as the union of the sources; build/audit defer to it |
| F mirrors | shipped | pointer (OpenCode/Codex) and byte-copy (Cursor) mechanisms documented with the refresh procedure |
| G entry files and modes | shipped | `@AGENTS.md` import accepted everywhere it is checked or previewed (AGENTS, CLAUDE, setup skill, SETUP ×3); `skills.modes.caveman` in the toon is the persistent mode, `off` the persistent disable |
| H AI-prompt scope | shipped | defined once by changed model behavior (incl. model-output handling), wherever the files live |
| I–M (Codex session) | shipped | incomplete reviews keep the audit open; critique for AI small-batch; output-handling triggers; cycle caps; standalone lite card in build |
| Audit residuals (9) | shipped | UI size, cohesive enforcement, setup/SETUP import, toon `off`, ship retries under the cap, Cursor byte-copy wording, contract-test gaps |

## No-gos honored
- ✅ No gate, reviewer, evidence requirement or permission boundary removed (gate reconciliation kept the union).
- ✅ No restructuring or compression (that is `instruction-compression`, shaped, sequenced after this ship).
- ✅ Externally installed skills untouched.

## Verify (final, 2026-10-18)
See the run record. No build, typecheck, lint or i18n command exists in this repository (`.project/context/stack.md`);
tests, doctor, validator, graph, docs links and the diff scan stand in.

## Audit
1 cycle, Orca Run `run_69e8aec6acd0`, six reviewer attempts on Codex and OpenCode, planted canary caught by all six,
repo guard clean, `record-check` ok. Eval review `not-completed` (no golden coverage of the changed prompt behavior);
**owner accepted that residual risk** and approved ship. See `audit.md`.

## Knowledge
- Pattern `one-owner-per-instruction-topic-guarded-by-contract-tests` (confidence low).
- Issue `instruction-copies-drift-into-contradictions` (resolved).

## Followups
- Golden behavior cases for the workflow's own prompts (owned by `instruction-compression`; required before its bet).
- Flagged, unchanged: metrics-lock timing flake; `cursor-mirrors` skips project-added agents.
