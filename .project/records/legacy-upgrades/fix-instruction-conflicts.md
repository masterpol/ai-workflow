# Source-review supplement: fix-instruction-conflicts

Prepared 2026-10-22 from verified recovery sources. This replaces the retired done-work narrative for the bug-fix pass opened 2026-10-17 and shipped 2026-10-18 (releases 2.31.1 to 2.31.4); no compact pitch-compression record exists. Results are historical evidence, not a new certification. The owners named below are the current source of truth; check them before relying on any detail here. Differences between the sources are kept as recorded under Historical limits.

## Findings and owners

Triage came from an owner-supplied static analysis of instruction volume and conflicts. Each finding was verified against the checkout before any edit, and the owner's "execute" instruction approved the triage. Goal: make conflicting instructions agree with one authoritative owner per topic, removing no gate, reviewer, evidence requirement or permission boundary. Restructuring and compression were out of scope (separate shaped, unbet pitch `instruction-compression`).

| # | Conflict | Fix and owner |
|---|---|---|
| A | Orca exit 3 was "continue normally" in the audit and ship phase specs (`3-audit.md`, `4-ship.md`) but "stop and ask" in the skills and in `exitCodeFor` (`orca-run.mts`: 3 = normal route, refused dispatch, rejected collection, non-integrated reconcile). A refused reconcile could ship un-integrated worker changes. | Phase specs stop and ask and never fall back silently. [orca-vendors](../../../ai-framework/integrations/orca-vendors.md) owns the decision ("exit code 3 alone never authorizes the normal path"; off, bypassed, worker, ready and stop outcomes) and documents exit 4. |
| B/C | The security reviewer had Write/Edit and was told to remediate, while its OpenCode (`edit: deny`) and Codex (read-only sandbox) adapters were read-only. "Output exactly No security findings" conflicted with "end every review with" a summary, so a clean review omitted the verdict or an unfinished one read as clean. | [security-reviewer](../../../.claude/agents/security-reviewer.md): tools `Read, Bash, Grep, Glob`; inspect and report only; proofs of concept only in a scratch copy; the coordinator applies verified patches; one summary for every review with Checked/Unverified and verdict of PASS, BLOCK or INCOMPLETE (unfinished is never PASS; no scratch path means INCOMPLETE and a request for one). |
| D | Three size limits: 800 lines (code reviewer), a hard 150 (component rules), a soft signal with a cohesive exception (coding standards; checklist under 150 components and 80 utilities). | [component-architecture](../../../ai-framework/rules/component-architecture.md) owns the limit (project limit, else 150/80/50; the cohesive-unit exception is the only way past it, honoured in enforcement and ui-design). [coding-standards](../../../ai-framework/rules/coding-standards.md) and the code reviewer point at it; the 800 is gone. |
| E | Build gate differed between the build skill ("Build-start" gate), the build phase spec ("Gate at /build end") and the overview matrix (no `/build end` row); audit bug-fix gate "no" versus "auto if clean". | The [overview](../../../ai-framework/workflow/overview.md) matrix owns it; the `/build end` row is the union (auto / gated / gated / gated); the build skill and `2-build.md` drop their own tables and the `3-audit.md` bug-fix row matches. |
| F | Mirrors were documented as pointers only, but Cursor holds byte copies (`cursor-mirrors` creates missing copies and never overwrites a differing one). | [vendors](../../../ai-framework/docs/vendors.md) documents pointer mirrors (OpenCode, Codex), byte copies (Cursor) and the refresh procedure (`cursor-mirrors` lists `differs`; copy the canonical file); skill-defaults no longer implies re-sync. |
| G | Entry-file and mode drift: AGENTS/CLAUDE demanded a full mirror though an `@AGENTS.md` import is accepted; persistent mode was said to live in `.project/skills/modes.json` though `ai-workflow.toon` `skills.modes.caveman` wins; per-phase modes stop applying once a valid toon exists (d31). | The `@AGENTS.md` import is accepted everywhere it is checked or previewed (AGENTS, CLAUDE, setup skill, SETUP three places). [skill-defaults](../../../ai-framework/integrations/skill-defaults.md) owns mode resolution; `off` in the toon is the persistent disable; legacy per-phase overrides apply only when no toon exists. |
| H | The AI-prompt scope was triggered by path (`lib/ai/prompts/`), so prompts elsewhere (for example `src/llm/`) skipped critique and the golden-eval gate. | [0-shape](../../../ai-framework/workflow/phases/0-shape.md) defines it once by changed model behavior (including model-output handling), wherever files live; the path is only an example in shape, critique, shape-lite and eval-runner. |
| I-M | Labelled "Codex session" in the shipped record; later corrected and tested as contracts I to M (see Validation pass). | Incomplete reviews keep the audit open; critique runs for AI small-batch (non-AI small-batch skips it); output-handling triggers; cycle caps follow the appetite; a standalone lite card is build's implicit scope. |

Cursor copies of the 7 changed canonical files were refreshed (0 created, 0 differ). Contracts live in [workflow-contracts.test.mts](../../../ai-framework/scripts/workflow-contracts.test.mts): 7 of the 8 first tests (A to H) failed before the edits and all passed after, on Node and Bun.

## No-gos

No gate, reviewer, evidence requirement or permission boundary was removed (gate reconciliation kept the union). No restructuring or compression; that belongs to the separate shaped, unbet `instruction-compression` pitch, sequenced after this ship. Externally installed skills were untouched.

## Review chronology

- Cycle 1 (2026-10-18), Orca Run `run_69e8aec6acd0`, coordinator claude: six reviewer attempts (code twice, security, test, eval, cross-pitch) on Codex and OpenCode. A planted canary (the exit-3 fallback re-allowed in a scratch copy of the audit phase spec) was caught by all six, and the repo guard was clean.
- The first code attempt was INCOMPLETE (the scratch copy lacked `.agents/` and `SETUP.md`) and was retried once, fresh, on a narrower scope.
- The eval review ended `not-completed`: the only dataset (11 cases: 7 executed and passing, 1 parsed-only, 3 live-only not run) grades the Orca libraries, not the changed prompts. A retry cannot supply missing golden cases. The owner accepted the residual risk on 2026-10-18 and approved ship.
- Should-fixes S1 to S8 (UI size limit, cohesive-unit enforcement, setup/SETUP import wording, toon `off`, ship retries under the hotfix cap, Cursor byte-copy wording, mirror test asserting presence, contract M waiving plan and hill for lite) were fixed with regression assertions; 12 mutants were all killed. S9 (no golden case for the changed prompt behavior) stayed open.
- The only other must-fix was a cross-pitch overlap with `instruction-compression`, fixed by recording the sequencing there (no plan until this fix ships). Acknowledged: some suites could not run in the scratch copy (author-run suites cover them) and live vendor behavior is unverified.

## Validation pass

A later validation of the working tree (corrections in 2.31.2 and 2.31.3, Orca Run `run_320b1626df73`, four read-only Claude reviewers, not certified independent, no canary) corrected: a zero-finding INCOMPLETE review could satisfy audit auto-advance; critique was both triggered and skipped for AI small-batch; direct bug-fix and hotfix routing conflicted with an unqualified pre-bet critique; AI-scope text omitted output handling; three audit cycles regardless of appetite; a lite card reached build without plan or hill; "build never stops" wording; a security reviewer with no scratch path; contract tests that skipped missing files or used negative-only regexes; four CLI integration tests needing 30 s budgets under Bun's 5 s default; a parser assertion switched to CPU time to keep its 50 ms bound. Reviewer claims treated as boundary failures (retained Bash alone) and an alleged missing eval floor were checked against the checkout and not accepted. A snapshot-only absence of `.project/evals` was not treated as live absence, and no live golden-case evaluation across vendors was scored.

## Verification and evidence

No build, typecheck, lint or i18n command exists in this repository; tests, workflow doctor, setup validator, graph check, docs-link check and `git diff --check` stand in. Not verified: live agent behavior on any vendor (static checks only). See Historical limits for the unreconciled counts.

## Knowledge and durable owners

- Pattern: [one owner per instruction topic, guarded by contract tests](../../knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md) (confidence low).
- Issue (resolved): [instruction copies drift into contradictions](../../knowledge/issues/instruction-copies-drift-into-contradictions.md).
- Lessons kept here: the canary result (planted exit-3 fallback caught by 6/6); a reviewer working in a scratch copy reports INCOMPLETE when the scratch lacks needed files (retry narrower); an eval gate cannot be satisfied by retry when no golden cases exist; a negative-only regex test hid a missing positive condition; CPU time rather than wall time for a timing bound; Bun's 5 s default timeout on CLI-launch tests; reviewer suggestions are checked against the checkout before patching.

## Historical limits

- Contract test count appears as 8/8 (build), 14/14 (cycle 1 audit, 12 mutants killed) and 13 (validation); the order is not proven.
- Full-suite figures differ by run and are not reconciled: Node 1685/1687 then 1689 pass with 2 flaky failures (metrics-lock paused holder, token-consumption replay dedupe; both pass 3/3 alone), then 60 files and 1,692 tests (1,690 pass, 2 skip); Bun 1682/1684, 1688, then 1,689 (1,686 pass, 1 timeout, 2 skip) with the corrected hook file rerun at 18 passed. Doctor READY (build) and 752 checks with 0 fail, setup validator 24 checks (validation); Cursor copies 7 refreshed then 44 current; docs links 25, 26, then 71 files.
- The shipped record says six independent attempts with a canary; the validation describes a different Orca run of four non-certified reviewers. They were different cycles and are not reconciled.
- The shipped row says "Audit residuals (9)" and lists seven topics, while the audit table has S1 to S8 fixed plus S9 open.
- The validation closes by saying it does not mark the pitch shipped and that changes were uncommitted, yet the shipped record is dated 2026-10-18 with versions 2.31.1 to 2.31.4 (corrections at 2.31.2 and 2.31.3).
- Golden behavior cases for the workflow's own prompts are owned by `instruction-compression` and are required before its bet. Flagged and unchanged: the metrics-lock timing flake, and `cursor-mirrors` skipping project-added agents.
