# Shipped: state-ai-authoring

Bet: 2026-10-19 • Shipped: 2026-10-20 • Appetite: big-batch (15 of 15 files including VERSION and CHANGELOG.md; 332 of 420 production lines; inject module 297 of 330) • Version 2.37.0

The `/state` report can now carry short analysis written by the authoring model. `state-fragment-inject.mts` hashes the snapshot, stamps a model-written draft only after the sanitizer and citation checks pass, and the renderer places the stamped fragments on four pages inside an "AI analysis (proposed, not observed)" box with evidence, model id and a stale notice. Failures are per slot and closed. **The live claim is `blocked`:** the step is proven on Claude Code and Codex with documented gaps and is not proven on OpenCode with a small model.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-20 | Preflight: prerequisites shipped, five drift rows (D1–D5), R9 helper edit decided, base commit, 531-test baseline |
| S2 | shipped | 2026-10-20 | Hash, header grammar, guarded directory, round record, `status`/`stamp`/`check`. Gate raised from 200 to 220 lines (D8). M1–M10 killed |
| S3 | shipped | 2026-10-20 | Loader, labelled container, `hrefPrefix`, `frag-*` class list and CSS (D11–D14). M11–M19 killed |
| S4 | shipped | 2026-10-20 | Renderer wiring: slots by page, byte-cap fallback, `--strict-fragments`, summary line, `--json`. Contingent 15th file taken (`state-test-helpers.mts`, R9). M20–M23 killed |
| S5 | shipped | 2026-10-20 | Exact 22-case partition, 16-case authoring dataset, live-record validator and claim, negative controls. M24–M27 killed |
| S6 | shipped | 2026-10-20 | `/state` Step 3 "AI analysis" and its Cursor byte copy, contract test. Wording corrected twice by review and by live runs (D32, D36). Behaviour proven only by the live matrix |
| S7 | shipped | 2026-10-20 | Three independent review rounds (code Fable, security Opus): 2 must-fix and 9 should-fix fixed with failing-first tests; residual by-path write/delete race accepted (D33). M31–M44 killed |
| S8 | shipped | 2026-10-20 | Harness spike for three vendors, measured costs, matrix budget; owner approved |
| S9 | **not met** | 2026-10-20 | 72 runs graded blind by Opus; 51 pass; `Claim: blocked` |
| S10 | shipped | 2026-10-20 | Contract doc, template README, size and file gates, 2.37.0 |
| — | shipped | 2026-10-20 | Audit cycle 1: six reviewers, 0 real must-fix (two canary findings refuted), 6 should-fix fixed, 5 deferred with reasons |

## No-gos honored

- ✅ no script calls a model or the network (grep for fetch/spawn/child_process: no match); authoring happens only in the host session
- ✅ no subagents or dispatch in the step (contract test)
- ✅ writes only inside `.project/reports/fragments/`; `state-snapshot.mts` byte-for-byte unchanged against base; no schemaVersion change; the 22-case dataset unchanged
- ✅ the AI reads only files `state.json` cites (skill text); `.env` canary never appeared in any of 72 run logs
- ✅ no repair, no reuse across a changed hash, no stale fragment shown as current; a rejected draft is never repaired
- ✅ no AI content in `state.html`; fragments cannot use `status-*` or `ai-analysis` classes
- ✅ no TOON conversion of the datasets
- ✅ all sanitizer no-gos: fragment content is never echoed (closed reason codes only)
- ⚠️ the retry cap and draft-age check depend on the model cooperating (`.round.json` is unauthenticated; D27). They are workflow aids, not security boundaries
- ⚠️ a same-user process racing the script can redirect one by-path write or delete in `fragments/` (D33, accepted by the owner)

## Rabbit holes

- ✅ resolved: empty slot versus missing fragment (absent directory renders nothing; present directory shows a reason); hash meaning (a staleness hint, volatile paths documented and drift-tested); prompt injection (deterministic checks plus blind grading; 12 injection runs stamped nothing hostile)
- ✅ resolved: coupling to sanitizer and redesign contracts (D1–D5, D11–D17)
- ⚠️ the live-run harness surfaced real gaps: OpenCode follows `PWD` not the process cwd, Codex needs `--skip-git-repo-check` and closed stdin, `review-bench guard` cannot snapshot once 72 run directories exist
- ⚠️ the live matrix: 51 of 72 pass (Claude Code 21/24, Codex 20/24, OpenCode 10/24). `uncited-claim` fails on all vendors because the fixture's knowledge fact has no evidence path to cite

## Followups generated

- Harden Step 3 for small models (path cheat sheet without `.value.`, links must be files, absolute stop after two rejections), then re-run the OpenCode half of the matrix (med)
- Decide the `uncited-claim` fixture and rubric: the knowledge fact has no evidence path (med)
- Fragment headings that repeat the label: start fragments at h3 and re-run (low)
- Empty-slot byte-identity test without a brittle golden hash (low)
- Summary line should not count a cap-omitted slot as fresh (low)
- `process.chdir`/fd-relative writes to close the by-path write/delete race (low)
- `review-bench guard` skip `.project/evals/runs/` (low)
- ~~`ai-workflow.toon` invalid~~ (resolved 2026-10-20 by the owner): the local, git-ignored file was edited at 16:15 during this build and listed the claude coordinator's implementation worker without listing it in `workers`; `setup-validator` and `workflow-doctor` are READY again. An earlier note that it failed at HEAD was wrong: the file is not in HEAD.
- State-deep-evidence must add any new clock-derived path to `VOLATILE_PATHS` and the doc, and keep its cases out of `state-ai-fragments.json` (note)

## Doc updates

`ai-framework/integrations/state-report.md` (AI analysis fragments), `ai-framework/templates/project/reports/README.md` and `.claude/skills/state/SKILL.md` (with its Cursor copy) were updated. No ADR needed: the design decision (pages stay inert, fragments are untrusted data) is already in `decisions/project-state-report-design`.
