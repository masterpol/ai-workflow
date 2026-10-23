# Build log: state-ai-authoring

## S2 evidence (2026-10-20)
- `T ai-framework/scripts/state-fragment-inject.test.mts` exit 0: 19 tests, 19 pass, 0 fail.
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0: 8 pass.
- Full state set + invariants (`T state-*.test.mts runtime/invariants.test.mts`): 550 tests, 550 pass, 0 fail (baseline 531 + 19).
- Forbidden-call grep on the inject module: no match. `git diff dfb291e… -- state-snapshot.mts`: empty (exit 0).
- `wc -l state-fragment-inject.mts` = 218 after trim (was 235): still fails the ≤ 200 exit (D8). After the trim: INJ 19/19, full set 550/550, M0-M10 re-run, all killed.

| M1 | S2 | drop `metrics.value.updatedAt` from VOLATILE_PATHS | volatile golden + doc test | killed |
| M2 | S2 | unsorted keys | golden hash, key order | killed |
| M3 | S2 | skip `checkCitations` | injection-unbound / fake-stamp | killed |
| M4 | S2 | drop draft-age check | draft-older-than-status-run | killed |
| M5 | S2 | retry limit 2 → 3 | first-draft-rejected-then-retry | killed |
| M6 | S2 | record raw model id | spoofed-model-id | killed (first attempt was a syntax error, redone) |
| M7 | S2 | remove draft identity re-check | stamp keeps a draft replaced | killed |
| M8 | S2 | remove href size check | oversize-cited-file-truncated | killed |
| M9 | S2 | remove realpath check | a realpath that differs … refused | killed |
| M10 | S2 | allow href in tokens | tokens slot refuses file links | killed |
Unmodified copy (M0) passes through the same harness: exit 0.

## S3 evidence (2026-10-20)
- `T state-fragment-inject.test.mts` exit 0: 34 tests, 34 pass (S2's 19 + 15).
- `T state-fragment.test.mts state-fragment-parse.test.mts state-fragment-evidence.test.mts` exit 0: 282 pass, 0 fail.
- `T runtime/invariants.test.mts` exit 0: 8 pass. Full state set + invariants: 565 pass, 0 fail (baseline 531).
- `wc -l`: `state-fragment.mts` 268 (cap 300); `state-fragment-inject.mts` 258 (final cap 330).
| M11 | S3 | skip re-check when hash matches | forged-fragment-header | killed |
| M12 | S3 | drop canonical check | forged-fragment-header | killed |
| M13 | S3 | body emitted before the label | ai-label … inside the label | killed |
| M14 | S3 | stale treated as fresh | stale-fragment-default-and-strict | killed |
| M15 | S3 | ignore strict mode | stale-fragment-default-and-strict | killed |
| M16 | S3 | remove per-slot try | reader that throws | killed |
| M17 | S3 | raw readFileSync instead of readSource | symlinked slot file | killed |
| M18 | S3 | accept any hrefPrefix (sanitizer copy) | hrefPrefix test | killed |
| M19 | S3 | non-hex snapshot line becomes a header failure | header without a valid snapshot line is stale | killed |
Unmodified copy (M0): exit 0.

## S4 evidence (2026-10-20)
- `T state-fragment-inject.test.mts` 41 pass (S3's 34 + 7). `T state-html.test.mts state-theme.test.mts state-snapshot.test.mts` 182 pass, 0 fail. Full state set + invariants: 572 pass, 0 fail.
- `git diff --quiet HEAD -- state-html.test.mts` rc 0 (unchanged). Growth vs Base: `state-render.mts` +10/-5, `state-pages.mts` +13/-10 (limits 30 and 40). `state-fragment-inject.mts` 270 lines (final cap 330).
- Byte identity (no fragments dir): `diff -r` of both renderers' output is empty (D15).
| M20 | S4 | omit the summary line when the directory is absent | no-directory summary test | killed |
| M21 | S4 | render a slot into state.html | placement / state.html test | killed |
| M22 | S4 | remove the omitted-fragments fallback | fragment-heavy page test | killed |
| M23 | S4 | reason lines when the directory is absent | no-directory tests | killed |
Unmodified copy (M0): exit 0.

## S5 evidence (2026-10-20)
- `T state-fragment-dataset.test.mts` exit 0: 52 pass. The five fragment suites (`state-fragment`, `-parse`, `-evidence`, `-inject`, `-dataset`): 375 pass, 0 fail, 0 skipped. Full state set + invariants: 583 pass, 0 fail.
- `git diff --quiet HEAD -- .project/evals/datasets/state-ai-fragments.json` rc 0: the 22-case dataset is unchanged.
- The child TAP run (four suites) exits 0 with `# skipped 0`, `# todo 0`, `# fail 0`; all 13 deterministic authoring + injector ids have a passing `[id]` test.
| M24 | S5 | TAP parser accepts `# SKIP` | SKIP negative control | killed |
| M25 | S5 | validator ignores a missing vendor | missing vendor control | killed |
| M26 | S5 | claim ignores a not-run row (codex) | codex not-run control (strengthened, D22) | killed |
| M27 | S5 | validator ignores author == grader | author/grader control | killed |
Unmodified copy (M0): exit 0.

## S6 evidence (2026-10-20)
- `T state-fragment-inject.test.mts` exit 0: 44 pass (41 + 3 skill tests). `T skill-defaults.test.mts` pass (with inject: 72 pass, 0 fail). `T workflow-contracts.test.mts` 14 pass. Full state set + invariants: 586 pass, 0 fail.
- `cmp .claude/skills/state/SKILL.md .cursor/skills/state/SKILL.md` rc 0. `skill-vendors.mts cursor-mirrors --root .`: created [], differs [], current 44. `setup-validator.mts`: READY, 23 checks.
- Stubs untouched: `git diff --quiet HEAD -- .agents/skills/state/SKILL.md .opencode/commands/state.md` rc 0. Frontmatter unchanged: 0 `^[-+]description:` lines in the diff.
- The step names no subagent/dispatch (0 matches). Controls M28 (stamp before status), M29 (render before stamp), M30 (quote rule removed): all caught (D25).
- The step's behavior is unproven until the live matrix (S9). S6 stays at downhill 75%.

## S7 review record (2026-10-20)
Review code: model=claude-fable-5-1 author=claude-sonnet-5-5 round1=findings(2 must-fix, 6 should-fix) round2=clear
Review security: model=claude-opus-5-5 author=claude-sonnet-5-5 round1=findings(0 must-fix, 3 should-fix) round2=INCOMPLETE
Must-fix 1 (check weaker than loader): fixed (D28), failing-first tests `[review] check on a stamped fragment…`; re-reviewed clear by the code reviewer.
Must-fix 2 (rejected slot shown as missing): fixed (D29); re-reviewed clear.
Security should-fix 2 (bidi in snapshot field) and 3 (status calls rejected fragment fresh): fixed, re-reviewed fixed by the security reviewer.
Security should-fix 1 (read race): file-level race re-reviewed fixed; the directory-swap remainder was patched afterwards (D30) with a failing-first test, but the security reviewer was stopped before it could verify. NOT independently re-reviewed.
Evidence: `T state-fragment-inject.test.mts` 59 pass; full state set + invariants + workflow-contracts 615 pass, 0 fail; mutants M31-M41 killed (M39 directory re-check, M40 round codes, M41 stale print), earlier M1-M38 re-run killed.
Adversarial review: NOT clear (security re-review incomplete).

## S7 third round (2026-10-20)
Review security: model=claude-opus-5-5 author=claude-sonnet-5-5 round3=findings(0 must-fix, 3 should-fix, 4 notes): ABA directory swap, writeAtomic window, rmSync window.
Fixed with failing-first tests: ABA (dirId ctime), pre-write directory check, removeDraft re-check, missing-ctime identity, readdir re-check (D33). Write/delete windows narrowed, not closed: accepted residual risk, recorded in D33.
Evidence: `T state-fragment-inject.test.mts` 62 pass; state set + invariants + workflow-contracts 618 pass, 0 fail; M42-M44 killed. Inject module 297 lines (cap 330).
Adversarial review: clear of must-fix; should-fix residual accepted by D33 (pending owner acknowledgement).
Adversarial review: clear (S7)

## S8 evidence (2026-10-20)
- Smoke (spike) runs of `happy-path-overview` on a scratch fixture, one per vendor: claude-code (haiku, 25 s, $0.0086), opencode (91 s, $0.115), codex (99.1k input tokens). All three stamped `ok: stamp` and passed `check` (4, 4 and 3 links), no CRLF or BOM. Raw outputs: scratchpad `opencode-smoke.jsonl`, `codex-smoke.jsonl`, `fx-<vendor>/`.
- Harness section, cost line and budget line are in `live-runs.md`; `T state-fragment-dataset.test.mts` still passes (52). Not yet present: `Owner approved matrix budget: yes|no` (owner checkpoint).
- First codex attempt hung on stdin; killed and re-run with stdin closed (recorded in the harness line).

## S9 evidence (2026-10-20)
- 72 authoring runs + 12 seeded fragments, graded blind by claude-opus-5-5 (3 agents). Stamped: claude-code 24, codex 24, opencode 12. Graded pass: 21, 20, 10 = 51 of 72. Seeded: 9 graded fail by every grader, 3 rejected by the gate.
- `T state-fragment-dataset.test.mts` exit 0: 53 pass (computed claim blocked equals the file's `Claim: blocked`).
- Replay of all 84 recorded `check` commands: 69 accepted exit 0, 15 rejected exit 1, 0 mismatches.
- `git check-ignore -q .project/evals/runs/state-ai-authoring/x` rc 0; runs are not tracked.
- `grep -c '^Claim: supported$' live-runs.md` = 0: S9 exit NOT met. S6 stays at downhill 75%.
- Cost: claude-code runs about $0.01 each (haiku); opencode about $0.1 each; codex tokens not priced; grading 3 Opus sub-agents (about 270k tokens total).

## S10 evidence (2026-10-20)
- Contract doc section "AI analysis fragments" added; `grep -c state-fragment-inject state-report.md` = 3; `docs-links.mts` 0 broken; template README `fragments/` line = 1.
- Gates: inject module 297 lines (cap 330); production numstat added 332 (cap 420); files 13 + VERSION + CHANGELOG = 15 (cap 15).
- `changelog.mts --bump minor` wrote 2.37.0; `--check` passes. `graphify.mts --check` CLEAN. Full regression (state-*, skill-defaults, workflow-contracts, invariants) all pass.
- `setup-validator.mts` reports INCOMPLETE (2): `ai-workflow.toon invalid: ORCHESTRATION-WORKERS-INCOMPLETE worker "claude" is not listed in integrations.orca.coordinators.claude.workers`. `ai-workflow.toon` is not in this build's diff; it passed READY earlier in the session. Not fixed here.

## Audit cycle 1 (2026-10-20)

### Audit record: security (cycle 1)
independent: yes
canary: caught (state-fragment-inject.mts:234, MODEL.test removed; reported as the must-fix)
read-only: verified by scratch copy plus mtime sweep of the repo after dispatch (guard snapshot too large to re-read after 72 run directories were added)
prompt-sha256: 27a28efbecfc838a8b88ac30bc9365c8e694b08a6fa1cc75ccd811b861aa3acd
model: opus (claude-opus-5-5)
cross-file interactions: reviewed
| ID | File | Finding | verified |
|----|------|---------|----------|
| SEC-1 | state-fragment-inject.mts:234 | stamp writes --model unchecked | refuted: planted canary; live file has the MODEL.test allow-list and [spoofed-model-id] passes |
| SEC-2 | state-fragment-inject.mts:164-178 | hand-written fragment with current hash renders fresh | acknowledged (D27 class) |
| SEC-3 | state-fragment-inject.mts:22-53 | VOLATILE_PATHS leaves some prose fields out of the hash | acknowledged, plan-fixed |
| SEC-4 | state-render.mts:201 | summary counts a cap-omitted slot as fresh | confirmed, accuracy only; deferred |
### Audit record: code (cycle 1)
independent: yes
canary: caught (state-fragment-inject.mts:219, retry cap >= changed to >; reported as the must-fix)
read-only: verified by scratch copy plus mtime sweep of the repo after dispatch
prompt-sha256: 883dfa49da4c25f267d7805a55a4f519191313f01efc5021439d63b931ac3b4c
model: fable (claude-fable-5-1)
cross-file interactions: reviewed
| ID | File | Finding | verified |
|----|------|---------|----------|
| CODE-1 | state-fragment-inject.mts:219 | retry cap allows a third attempt | refuted: planted canary; live file has >= and 64 inject tests pass |
| CODE-2 | state-fragment-inject.test.mts:478 | no byte-identity test for empty slots | confirmed (mutant survives); deferred with reason |
| CODE-3 | log.md M5 row | mutant row untrue of that code | refuted: same canary |
| CODE-4 | state-fragment-inject.mts:96 | TextDecoder repairs bad bytes and drops BOM | confirmed; fixed (fatal, ignoreBOM) with failing-first test |
| CODE-5 | state-fragment-inject.test.mts:317,337 | read spy cannot see open/readSync | confirmed; acknowledged (exact-reason asserts still kill the mutants) |
| CODE-6 | state-fragment-dataset.test.mts:387 | validator does not require a seeded row per id | confirmed; fixed with a negative control |
### Audit record: test-coverage, ux, eval, cross-pitch (cycle 1)
independent: no
read-only: verified by scratch copy plus mtime sweep of the repo after dispatch
prompt-sha256: 53dee488c60d459ebb092bcd3787e41c4f21b57d517b5b43a52dfedd74b82eaf (test-coverage)
prompt-sha256: 485b938e579b30b9d6e5e9ea2c5a46365088a6a2fae0f99726a32c47309a2500 (ux)
prompt-sha256: abe5b3c4b82451c3c3fc7a5d676188fec2d631682df4333eac514669faf8431d (eval)
prompt-sha256: 7f5231c69870b0afe888614cfef1951235cc589c41a0d89da1acb4b11a797c7d (cross-pitch)
model: sonnet (claude-sonnet-5-5) for all four; no canary planted (mechanical roles), so independent: no
cross-file interactions: reviewed (test-coverage, ux, cross-pitch); not reviewed (eval)
| ID | Role | File | Finding | verified |
|----|------|------|---------|----------|
| TEST-1 | test | state-fragment-inject.test.mts:478 | empty-slot byte identity untested | confirmed; deferred |
| TEST-2 | test | state-fragment-inject.test.mts:430 | hrefPrefix idempotence not run over dataset markup | confirmed; deferred (sanitizer suite asserts idempotence on that markup) |
| TEST-3 | test | state-fragment-inject.test.mts | stamp/check --draft success paths unasserted | confirmed; fixed |
| UX-1 | ux | state-fragment-inject.mts:176 | fragment headings duplicate the label | confirmed; deferred (needs skill wording change, which invalidates the live matrix) |
| UX-2 | ux | state-fragment-inject.mts:177 | bare reason tokens | confirmed; fixed with plain next step |
| UX-3 | ux | state-fragment-inject.mts:178 | stale notice only in the footer | confirmed; fixed (pill under the label) |
| UX-4 | ux | index.html | long overview block, nothing collapsible; H8 = 2 (gate met) | confirmed; deferred |
| EVAL-1 | eval | live-runs.md:3 | stale "placeholders" sentence | confirmed; fixed |
| EVAL-2 | eval | live-runs.md | 51/72 below the 100% threshold | confirmed; Claim: blocked, owner accepted (option 2) |
| XP-1 | cross-pitch | VERSION, CHANGELOG.md | shared with test-execution-performance (R12) | confirmed; ship this pitch first |

### Synthesis
Dispatched: code (1, independent: yes, canary caught) | security (1, independent: yes, canary caught) | test (3 should-fix, independent: no) | ux (4 should-fix, H8 = 2, gate met) | eval (blocked, accepted) | i18n (n/a: no i18n in this stack) | cross-pitch (clean; R12 ordering).

**Must-fix: 0 real.** Two reviewer must-fixes were the planted canaries in their scratch copies (lines 219 and 234); both caught, both refuted against the live files (`>=` at :219, `MODEL.test` at :234, 64 inject tests pass). The eval gate block (51 of 72, 100% threshold) is the recorded `Claim: blocked`, accepted by the owner (option 2) and carried into /ship.

**Should-fix fixed (evidence: `T` state-*, skill-defaults, workflow-contracts, invariants = 651 pass, 0 fail):** live-runs.md stale sentence; CLI success paths tested; invalid UTF-8 draft refused (`draft-unreadable`); seeded row per live id required by the validator; hidden-slot next-step hint; stale pill under the label.

**Should-fix deferred (named reasons, follow-up candidates):**
| ID | Disposition |
|----|-------------|
| CODE-2 / TEST-1 | Empty-slot byte-identity golden test: a stored hash breaks on every unrelated page change; D15's one-off diff and the container unit test stay the evidence. Follow-up: render both paths from one fixture inside a test |
| TEST-2 | hrefPrefix default idempotence is asserted over that markup by the sanitizer suite (`accepts()`); the prefix changes href only (tested) |
| UX-1 | Fragment headings duplicating the label need skill wording (start at h3). That changes the AI step, so the 72-run matrix would have to be re-run |
| UX-4 | Collapsible long fragments: design change, not a defect (H8 = 2) |
| SEC-4 | Summary counts a cap-omitted slot as fresh: accuracy only, reachable only under the byte cap |

**Acknowledged:** SEC-2, SEC-3 (accepted design, D27), CODE-5, scratch-copy invariants failures (missing skill-vendors.json; real tree passes), accidental full-directory test run inside the security reviewer's scratch copy (guard: no repo file changed except the author's own live-runs.md edit and hook-written metrics).

Correction (2026-10-20): the INCOMPLETE result above was caused by a mid-session edit of the local git-ignored ai-workflow.toon, not a HEAD failure; fixed by the owner, both validators READY.
