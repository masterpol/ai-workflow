# Source-review supplement: instruction-compression

Prepared 2026-10-22 from verified recovery sources. This is the durable record of the pitch shaped 2026-10-17, bet
2026-10-18 and shipped 2026-10-19 as bundle 2.31.5 to 2.31.8 (big-batch, bounded phase-wrapper pilot, 1,308 of
1,500 changed lines across 11 paths) now that its done-work narrative is retired. No compact pitch-compression record
exists. The ship record notes the work was not committed or merged by the ship itself, and that the working tree was
shared with the concurrent `toon-machine-data` pitch (2.32.0), which keeps its own records. Results are historical
evidence, not a new certification. Behavior now lives in the [build skill](../../../.claude/skills/build/SKILL.md),
[audit skill](../../../.claude/skills/audit/SKILL.md), [2-build](../../../ai-framework/workflow/phases/2-build.md),
[3-audit](../../../ai-framework/workflow/phases/3-audit.md), the proof in
[instruction-loading.test.mts](../../../ai-framework/scripts/instruction-loading.test.mts) and
[workflow-contracts.test.mts](../../../ai-framework/scripts/workflow-contracts.test.mts), and the
[changelog](../../../CHANGELOG.md). Lessons:
[compression pilot keeps failed candidates and defers](../../knowledge/patterns/a-compression-pilot-keeps-failed-candidates-and-defers.md),
[killed mutation script leaves source mutated](../../knowledge/issues/mutation-script-killed-leaves-source-mutated.md).
Contradictions between sources are kept under Historical contradictions.

## Delivered scope

| Scope | Outcome (2026-10-18) |
|-------|----------------------|
| S1 Build wrapper and reusable proof | Shipped (2.31.5): 1,314 → 489 words; frozen 31-case dataset, evidence validator, owner-loading test; all 14 existing contracts kept; no new scored regression |
| S2 Audit wrapper | Shipped (2.31.6): 941 → 468 words; first 445-word candidate rejected and retained; required-owner guard; Claude 116/4/4, OpenCode 86/16/22, no new loss |
| S3 Ship wrapper | Deferred (2.31.7 tried, 2.31.8 restored): OpenCode lost two satisfied criteria and returned two known zeros as null; four files restored to pre-S3 bytes; failed evidence retained |
| R1 Upgrade-fixture repair | Shipped (2.31.8): six-line post-sync ignore merge in `runtime/upgrade.test.mts`; doctor enforcement unchanged |

## Problem and measured baseline

Agents loaded more instruction than a phase needs: a build phase following its referenced documents read about 12,500
words before the plan and code, and the same caveman and dispatch banners repeated across 44 canonical files (about
5,100 words before Cursor copies). The owner wanted lighter routine context with the same required decisions and
evidence on Claude Code, Codex, OpenCode and Cursor. Sequencing: this pitch could not reach `/plan` until
[fix-instruction-conflicts](fix-instruction-conflicts.md) shipped, and had to keep `workflow-contracts.test.mts` green.

Ownership model (one owner per topic, everyone else points at it): phase activities and completion in
`ai-framework/workflow/phases/*.md`; gate applicability in [overview](../../../ai-framework/workflow/overview.md)
"Adaptive confirmation gate"; Orca outcomes in `orca-run.mts` plus
[orca-vendors](../../../ai-framework/integrations/orca-vendors.md); host invocation, permissions and routing in native
adapters plus `ai-workflow.toon`; review method in the canonical agent prompt; shared finding requirements in
`phases/3-audit.md`; coding limits in `rules/component-architecture.md`; mode resolution in `skill-defaults.mts` and
`integrations/skill-defaults.md`. A pointer must say when to load the owner and which section applies; a bare link
is not a pointer.

Static baseline taken 2026-10-17 after the conflict fix: canonical skills 28 files / 21,186 words; agents 16 / 11,713;
rules 16 / 18,505; phase specs 6 / 6,153 (plus overview 1,256); integrations 6 / 12,932; docs 11 / 4,857; caveman
banners 4,124 and dispatch banners 944 words; build-phase referenced load about 12,506 words (AGENTS.md, overview, build
skill, 2-build.md, harnesses.md, model-routing.md, coding-standards.md, boundaries.md, testing.md). Disk duplication is
not runtime duplication; no token-savings claim was ever made from these counts.

Golden behavior design (required before Bet): gates (small-batch flows into /audit; big-batch, bug-fix and hotfix stop
at `/build end`; hotfix asks for a rollback plan at `/build start`), Orca (exit 3 stops and asks; off runs normally;
`orca=normal` bypasses one call), reviews (clean security review ends with summary and PASS, unfinished is
INCOMPLETE, reviewer never edits), modes (`caveman=<mode>` overrides once and passes to dispatched agents), AI-prompt
trigger by behavior not path, and per-vendor adapter loading. The frozen
[dataset](../../evals/datasets/instruction-compression.json) has 31 unique live-only cases, 124 expected/forbidden
criteria per vendor (a forbidden criterion scores 1 when avoided), SHA-256
`cbed726e3995b48607de258523eec66b1d7106bac72475515b2d4430473898b6`.

## Shaping, critique and bet

The original broad sweep (thin skills, focused agents, compact rules, planner template, shorter banners) was bounded
on 2026-10-18 to a first wave: build, audit and ship wrappers only, with their Cursor copies, owners and replacement
coverage, at most 15 implementation files / 1,500 changed lines / one week. Projected 14 paths: three wrappers and
three Cursor copies, three phase specs, `workflow-contracts.test.mts` plus one new owner-loading test, the dataset,
`VERSION` and `CHANGELOG.md`; [orca-vendors](../../../ai-framework/integrations/orca-vendors.md) was the only optional
fifteenth. Banner sweep, agent rewrites, planner redesign, rule compaction and third-party skills were pushed out as
separate future pitches. Knowledge consulted:
[one owner per topic](../../knowledge/patterns/one-owner-per-instruction-topic-guarded-by-contract-tests.md),
[in-memory mutant](../../knowledge/patterns/prove-a-guard-test-with-an-in-memory-mutant.md),
[canonical mirror sync](../../../ai-framework/rules/canonical-mirror-sync.md),
[executed vs unexecuted cases](../../knowledge/patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md),
[a gate must not trust its own author](../../knowledge/patterns/a-gate-must-not-trust-its-own-author.md),
[a skip is a follow-up](../../knowledge/issues/test-skip-is-a-follow-up-not-a-finish.md),
[profile detection in frontmatter](../../knowledge/decisions/profile-detection-lives-in-frontmatter-not-in-the-model-id.md).

Critique (Codex coordinator, Orca Run `run_fda64cf7e993`, five perspectives, all own completions):
- K1 (high) Cursor refresh in the same change. K2 (high) literal-marker checks accept echoed commands; replacement
  guards need passing baselines and intended-assertion mutants
  ([echoed commands](../../knowledge/issues/substring-hook-wiring-check-accepts-echoed-commands.md),
  [wrong-reason failures](../../knowledge/issues/guard-tests-can-fail-for-the-wrong-reason.md)). K3 (medium) raw
  argument extraction and optional skill ownership must survive
  ([free-form arguments](../../knowledge/issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments.md),
  [caveman default](../../knowledge/decisions/caveman-mode-is-default-everywhere.md)); banners kept intact. K4 (medium)
  new reference docs must ship and be discoverable
  ([doc checks name the owner](../../knowledge/patterns/checks-on-doc-structure-name-the-owning-file.md)). K5 (medium)
  executed, parse-only and live-only evidence stay separate; every case declared live-only/not-run.
- S1 (high) a pointer can lose applicability or an owner section
  ([copies drift](../../knowledge/issues/instruction-copies-drift-into-contradictions.md)); S2 (high) banner
  shortening could break `--args-text` extraction (`skill-defaults.test.mts:256`), so banners deferred; S3 (medium) no
  live baseline existed.
- A1 (high) full proposal about 40 named-surface files, about 100 with banners/copies, over 2,000 lines; 44 canonical
  prompts, 88 paths for the banner sweep with Cursor copies. A2 (medium) eval workload: 31 cases x 4 vendors x 2
  stages = 248 case-runs minimum.
- X1 (medium) `workflow-v3-rollout` syncs this source elsewhere (139/136 local conflicts in climbing/RN); pin its
  input. E1 (medium) 11 scenarios added (non-security reviewer verification, launch authority, installed-wrapper
  loading, per-phase owner loading, free-form mode extraction).
- Refuted: the Orca owner does state "Exit code 3 alone never authorizes the normal path"; an unexecuted dataset is
  not an unmet Bet gate (baseline is required before editing, not before Bet); the eval reviewer's "21 cases" was 20.
- The first skeptic launch returned `launch-failed:unproven`; diagnosis reproduced `capability_unsupported` ("This
  OpenCode TUI cannot verify launch-time model selection"). Omitting the model override let the retry launch; the
  observed effective OpenCode model was Kimi K2.7 Code. Requested settings are not proof of effective settings.

Shaping validation: 14 contract tests passed, setup READY (23 checks, 124 TypeScript entries), graph CLEAN (81/227),
31 unique case IDs parsed, resolver returned `lite` for the full free-form invocation and an error for
`caveman=offish`. The user approved the bounded Bet on 2026-10-18 and the plan/impact gate the same day.

## Plan, boundary and exit contract

Scopes (sequential; shared test files forbid parallel writers): S1 build wrapper and reusable proof (480 new churn
estimated, standard profile), S2 audit wrapper (240, standard), S3 ship wrapper (180, fast). Estimate 1,378 of 1,500
lines counting added and deleted lines, Cursor copies and the 478-line dataset once; 122 lines of headroom. Out of
bounds: native adapters, overview, caveman banners, `skill-defaults.test.mts`, workflow doctor, runtime helpers,
bundle-sync, package/config files. Planning HEAD `7b3bbad86b399c454004ec9b4f8bd93e5cf21b5d` plus dirty-file hashes.

Assertions that could not simply disappear (impact): contract A extracted `orca-multi-agent` blocks and needed at least
four, so it was replaced by an explicit six-consumer contract where a missing consumer fails; E/M (build gate and
lite-card wording), I/L (audit completion/loop sections) and N (ship cycle cap) were retired only per copied location
after their replacements failed for missing pointers, owners or sections. `skill-defaults.test.mts:256–285` and the
doctor inspect literal caveman text, so banners stayed byte-identical. The Cursor mirror test in
`skill-defaults.test.mts` skips absent copies, so presence is enforced in `workflow-contracts.test.mts`.

Exit contract: shared structural commands after each scope (five-file Node run, Bun contracts/loading, doctor, setup
validator, `git diff --check`); in-memory or disposable mutations (pointer removed, owner/section removed, Cursor copy
missing, exit-3 fallback restored, lite-card handling removed) each fail the intended assertion; a disposable installed
layout with no `.project/evals`, registry or external packages passes; wrapper word count below baseline (build 1,314,
audit 941, ship 635); the complete suite including `scripts/runtime/` and `hooks/scripts/` at baseline and wave end.
The evidence checker lives only inside `instruction-loading.test.mts`, runs only with `IC_EVAL_REQUIRED=1`
(`IC_PHASE`, `IC_EVAL_BASELINE`, `IC_EVAL_REPORT`, later `IC_EVAL_POLICY`), fails closed on missing, oversized,
symlinked, non-regular or escaping paths, stale hashes, missing/extra scores and passes without evidence. Result
records live in git-ignored `.project/evals/runs/instruction-compression/` (`baseline.json`, `build-candidate.json`,
`audit-candidate.json`, rejected `ship-candidate.json`); raw traces in git-ignored `.project/metrics/instruction-compression/`.

Build start (approved 2026-10-18): Codex coordinator owned baseline setup, review routing and evidence acceptance;
implementation could go to a standard-profile Claude worker only after the baseline; binary presence was not proof of
native activation; any new Orca refusal stopped dispatch; completed lifecycle IDs were never reused.

## Baseline experiment and S1 amendment

Pre-edit full suite: 1,674 tests, 1,672 pass, 0 fail, 2 existing skips (Windows alternate path, Bun-only syntax).
23 instruction/adapter/dataset files were snapshotted and stayed byte-identical throughout.

Probes: Claude native `Skill(build)` plus overview read and a correct small-batch decision, but no phase-owner read.
The first OpenCode launch failed at `agent_readiness` after 60 seconds (root cause unproven); the user-authorized
retry with `--retry-of` on the same Task succeeded but gave only terminal fallback, not a provider trace. A focused
Claude owner probe read `2-build.md` fully, but its completion listed an ignored `.project/metrics` report in
`filesModified`, so `orca-run collect` rejected it with `invalid-files` (exit 3). The payload was not rewritten and
the collector not weakened; a fresh no-write brief (`ctx_a7b208f7b3c4`) supplied the observations in its completion
body and was accepted.

Two 31-case decision batches per vendor followed (the second supplied full context while withholding expectations).
Independent scorer `ctx_788e1af94d54` returned `readyForCompression: false`: Claude 116 satisfied / 4 failed / 4
unverified (25/31 rows clean), OpenCode 82 / 20 / 22 (14/31). Claude's failures were independent command reruns,
cited-code checks and replacement-validator proof depth (`review-independent-evidence`,
`review-nonsecurity-evidence`, `validator-replacement`); OpenCode also missed mode inheritance, Orca recovery and
Run-recording steps, golden-case requirements and missing-owner handling. The honest incomplete report was rejected
by required mode with exit 1. Tests-only preparation then stood at 331 lines (809/1,500 with the dataset).

The user approved a six-point S1-only disposition: keep all 31 inputs, criteria and artifacts; record baseline
failures as pre-existing; require no new failure or lost verified criterion and never average a regression away;
Claude is the required native-loading target, OpenCode a limited decision-response target, Codex/Cursor visible
limitations; a fresh matched Claude off/enabled loading pair before and after the edit; the checker gains a named
policy only after approval while default strict mode keeps rejecting the incomplete baseline; file/line boundary,
banners and contracts unchanged, and no savings claim without measurements.

## S1 build wrapper

The first matched end-of-build pair read only the wrapper and overview and was retained as incomplete. The matched
brief then resolved the native entry's full-activities and integration references without naming owner files; off
(`ctx_c8bff884afb0`) and enabled (`ctx_beb07782382f`) both showed native Skill activation, a full build-owner read and
the overview gate read before deciding.

Result (2.31.5): build wrapper 1,314 to 489 words, 71 to 27 lines; Cursor and caveman banner byte-identical. Removed
detail maps to `2-build.md` (Per-scope inner loop, Verification-before-completion, Three-strike rule, Parallel
subagents, Stuck-uphill detector, log.md and deviations.md discipline, output/confirmation/transition), the overview
gate rows, and orca-vendors Dispatch core / Reconcile core / Codex startup / OpenCode-port sections at their
operation; a transferred test-strategy prerequisite moved into the owner. The first candidate failed the
companion-pointer validator, so the direct `.project/rules` pointer stayed (workflow-doctor requires it), and an
already-refused operation now loads the CLI refusal contract before stopping. The obsolete wrapper shorthand
"hotfix ... audit deferred" was not copied: the overview already requires one audit pass for hotfix. The optional
integration-owner edit was unnecessary.

Proof: contract A enumerates all six consumers; E/M validate the build pointer before the owner; all 14 contracts
remain; negative fixtures cover missing consumers, owners, sections and Cursor copies, parity drift, exit-3 fallback
and lite-card loss. A guard assertion initially expected the wrong error wording and was corrected without relaxing
the guard; report-path validation was hardened to inspect project-relative ancestors and candidate validation requires
a baseline. Scores (independent): Claude 118 / 2 / 4, OpenCode 86 / 16 / 22, no new regression. Full Node 1,684 total,
1,681 pass, 0 fail, 3 skips; required mode Node 10/10, Bun 24/24. Size: 8 paths, 1,074 lines, 426 remaining.

## S2 audit wrapper

The S1 exception was S1-only; extending it needed a decision. A scratch S2 patch (941 to 445 words) was staged first.
Two Claude baseline attempts returned `session_not_reported`, `contentComplete:false` and no readable lines; model
metadata and correct decisions were not counted as loading proof. The approved six-point remaining-scope extension
applied the same known-failure disposition to S2/S3 under a separate checker selector `remaining-approved-2026-10-18`
(baseline/audit/ship only; S1's `s1-approved-2026-10-18` stays baseline/build only), required Claude native loading per
phase, and authorized one bounded trace recovery. Fresh workers paused at a neutral trace-capture checkpoint after
reads and before deciding, which recovered exact transcripts; no Orca runtime, config or hook fix was made, and the
cause of the missing session binding remains unproven.

The first 445-word candidate was rejected: independent OpenCode grading found an omitted hotfix start approval,
fail-open handling of a missing required owner section, and known owner-loading zeros returned as null. The source
correction added an explicit required-owner guard (a missing required owner file or section means stop and report;
only optional project companions may be absent) with its removal mutant. The hotfix owner was not edited to tune the
sample. Final (2.31.6): audit wrapper 941 to 468 words, 91 to 28 lines; `3-audit.md`, overview, adapters and Orca owner
kept their hashes; no clause needed transfer. A Claude scorer note misplaced the CLI exit table; coordinator
inspection confirmed lines 331-410 include it, and no score changed.

Scores: Claude 116 / 4 / 4, OpenCode 86 / 16 / 22, no new loss versus the frozen baseline. Required mode Node 11/11,
Bun with contracts 25/25. Size: 10 paths, 1,286 lines; 214 remaining against S3's 180 estimate.

## S3 rejection, deferral and R1 repair

S3 baseline probes (routine off, already-refused enabled, failed verification at small-batch cycle cap 2/2) kept human
`[1] ship / [2] hold` closure, refusal stop and cap refusal. A fast-profile Claude worker drafted the ship wrapper; its
494-word draft kept local Output/Confirmation/Transition duplicates and wrongly called them immutable, so the
coordinator removed them (only the banner was fixed). Candidate (2.31.7): 635 to 380 words.

The wave-end full suite then failed (1,687 total, 1,681 pass, 3 fail, 3 skip): all three in
`runtime/upgrade.test.mts`, because a pre-existing dirty workflow doctor required `.project/evals/runs/` and
`.project/evals/.cache/` ignore rules that historical fixtures lacked. Disposable attribution with the HEAD doctor
passed 3/3. An OpenCode evaluation was refused before ledger reservation (`opencode-port-held`, PID 20414, port 49374);
dispatch paused, and after the user said "try again opencode" a fresh attempt launched with no runtime change.

Final S3 scoring rejected the candidate: Claude 117 / 3 / 4 with no loss, but OpenCode 85 / 15 / 24 emitted
"Verdict: PASS — no must-fix findings" after saying it could not verify the implementer's test claim, so both
`review-nonsecurity-evidence` criteria regressed 1 to 0, and two owner-loading known zeros came back as null. Required
mode exited 1 (12 tests, 11 pass, 1 fail) naming exactly those four losses. Causal attribution to compression is
unproved: the unchanged `code-reviewer.md` verdict criteria conflict with `3-audit.md` "Incomplete reviews".

The approved revision (2.31.8): restore canonical ship, Cursor ship and both shared test files to exact pre-S3 bytes
after checking current and snapshot hashes; keep all rejected evidence; add R1, a six-line merge in
[upgrade.test.mts](../../../ai-framework/scripts/runtime/upgrade.test.mts) `migrateConfig` that appends the two eval
ignore rules only when absent, modeling the post-sync ignore merge [SETUP.md](../../../SETUP.md) requires, without
weakening the doctor. Final size 1,308 lines on 11 paths; no cap increase. The full S3 decision document is kept at
[S3 review analysis](../../analysis/2026-10-18-instruction-compression-s3-review-analysis.md).

## S3 review decision

The 2026-10-18 evidence decision recorded S3 as rejected and incomplete, with no rollback applied until approval. Fresh
independent graders scored all 31 OpenCode cases after the user-requested retry. Baseline against candidate:

| Vendor | Baseline satisfied / failed / unverified | S3 candidate | New loss |
|--------|------------------------------------------|--------------|----------|
| Claude | 116 / 4 / 4 | 117 / 3 / 4 | none |
| OpenCode | 82 / 20 / 22 | 85 / 15 / 24 | two formerly satisfied criteria fail; two known zeros returned as null |

Totals cannot offset individual losses. For `review-nonsecurity-evidence` OpenCode said it could not verify the
implementer's test claim and then reported "Verdict: PASS — no must-fix findings", which the frozen case forbids; both
criteria regressed 1 to 0. The unchanged `code-reviewer.md` (lines 229 and 234) allows PASS with zero must-fix findings
while the audit "Incomplete reviews" section keeps an audit open on missing evidence; the file is outside this pilot's
paths and causation by compression is unproven. Repeating samples until one passed, or hiding the failure, would have
broken the approved evidence policy. The grader's null for owner-loading build and audit expected:1 (baseline 0) was kept
as raw data, and required Node evidence mode exited 1 naming exactly four criterion losses, which is the checker
rejecting the candidate correctly. The wrapper went 635 to 380 words while routine source context stayed flat
(1,623 to 1,622).

Recommended and approved revision (five points): defer S3 and restore only its four changed files (canonical ship,
Cursor ship and the two shared test files) to the exact pre-S3 snapshots after checking current and restore hashes; keep
the accepted S1 and S2 changes and their frozen evidence, never relabelling S3 as passing; authorize only the six-line
`upgrade.test.mts` fixture repair as the one extra named path, modelling the SETUP post-sync ignore merge without
weakening the doctor; rerun the real upgrade tests, wave-end suite and required checks under the unchanged 1,500-line cap
(about 1,308 projected, measured again); and record the reviewer PASS/incomplete conflict as a separate follow-up. If all
three wrappers must ship together, the alternative was Revise or Back with a separate reviewer and evaluation-contract
repair. The user answered "Approve"; the four files passed their hash preconditions and were restored exactly, all six
instruction-source hashes matched the accepted audit candidate again, and the revision was then verified (full Node 1,683
pass, 0 fail, 3 existing skips).

## Native observation and measurements

Observed unique source words (Skill plus observed Read ranges; excludes system/hook context, framing and repeated grep;
n=1, model-chosen ranges, clipped traces; timing includes observation asks):

| Scenario | Baseline → candidate words | Tool calls | Interval ms |
|----------|----------------------------|------------|-------------|
| Build, Orca off | 2,682 → 2,043 | 5 → 5 | 11,150 → 11,690 |
| Build, already refused | 3,007 → 2,575 | 6 → 6 | 13,423 → 12,669 |
| Audit, Orca off | 2,999 → 2,780 | 4 → 6 | 28,515 → 52,986 |
| Audit, already refused | 4,655 → 3,968 | 8 → 9 | 53,175 → 56,070 |
| Ship, routine off (rejected) | 1,623 → 1,622 | 5 → 7 | 44,043 → 38,421 |
| Ship, already refused (rejected) | 6,573 → 3,180 | 6 → 11 | 45,227 → 49,846 |

Ship routine context was flat: 255 wrapper words saved were offset by 254 words of governing gate reads the old
wrapper skipped. Baseline reads that were never observed stay unverified rather than credited retroactively. No token,
cost or latency improvement is claimed.

## Audit and verification history

Build end approved 2026-10-18 after verification: upgrade tests 3/3; full Node 1,686 total, 1,683 pass, 0 fail, 3
skips (Windows drive, Bun-host parser, explicit live mode); shared Node 83/1 live skip; Bun 24/1; required S2 evidence
Node 11/11 and Bun 25/25 against the restored sources (manifest
`f2e7a816a2d31cfdb9963c84cb4ee3718edeb97f5048c5cde64e023bfd3d35b4`); doctor READY (751 checks); setup READY (23
checks, 125 TypeScript entries); graph CLEAN (84/240); changelog 2.31.8; diff clean. Orca: 0 reclaimable, 27
runtime-retained and 32 released resources.

Audit cycle 1: code, security, coverage, eval and cross-pitch reviewers (UI and i18n not applicable), each with
scratch files, a proven canary and an explicit model; cross-family routes recorded as not independent. Two genuine
should-fix gaps: removing the evaluated-model/scorer inequality or the secret-name refusal left tests green; the
coordinator reproduced both mutants and four test lines now cover them. Secret-shaped paths are deliberately absent
from the fixture: the test requires refusal before filesystem lookup and reads no secret bytes. Cohesive-unit size
exception ([coding standards](../../../ai-framework/rules/coding-standards.md)): `instruction-loading.test.mts` and its
`validateReport` share one proof surface (dataset, report/context model, pinned policy vector, recursive baseline check,
accumulated problem list, adversarial fixture matrix), and the extended `workflow-contracts.test.mts` keeps its 14
contracts on one trusted root, readers and in-memory mutation trees. It is a test-corpus exception, not a production
waiver. The first independent full suite failed only because the coordinator set canonical `/private/var` TMPDIR for a
macOS test that asserts the `/var` alias; the retry used the `/var` spelling after realpath equality.

Ship: no build, typecheck, lint or i18n command exists, and `pre-ship-verify.mts` reports no package.json (not a
failure for this repo). Full Node suite exit 0 (user-run); required evidence 11/11; setup READY; graph CLEAN; diff
clean. A mutation-proof shell killed mid-run left one mutation in `runtime/data-file.mts:251`; it was restored
byte-identical from its backup and its tests re-run 23/23 before the full suite.

## No-gos, rabbit holes and limits

No-gos held: no dataset, frozen baseline vector or threshold changed; known failures stayed failed, never relabelled
null; no score or prompt tuned to green; rejected candidates retained; no new gate, skipped reviewer, weakened evidence
or permission boundary; no percentage claim without measurement; no validator assertion removed without replacement;
external skills not rewritten. Scope was reduced by the explicit S3 deferral. Shared caveman and dispatch banners
were not compressed.

Rabbit holes: one-line banners cannot pass today because `skill-defaults.test.mts` and `workflow-doctor.mts` require
literal markers and resolver commands; `cursor-mirrors --apply` creates only missing copies, so each wave refreshes by
copy and checks parity; the top-level test glob misses `scripts/runtime/` and `hooks/scripts/`. Resolved: loading proof
by native Skill/Read observation and the required-owner guard. Surfaced: reviewer PASS versus incomplete-review
conflict; OpenCode loading unobservable (clipped terminal); Codex and Cursor unverified (Cursor CLI absent).

Limits: single runs per case on Claude and OpenCode only; source-word counts are a proxy, not token or latency
savings; reviewer guard snapshots, installed-project native activation and real runtime effects were not established.

## Open items

Tracked in the [followups backlog](../../pitches/_followups.md) under "instruction-compression leftovers": S3 ship
wrapper retry (restart from the S3 review analysis, not the rejected draft); the reviewer PASS/incomplete conflict (the
[code reviewer](../../../.claude/agents/code-reviewer.md) verdict line versus
[3-audit](../../../ai-framework/workflow/phases/3-audit.md) "Incomplete reviews"); OpenCode loading observability;
Codex and Cursor probes; the remaining canonical wrappers and banners; trap-based restore for in-place mutation scripts.

## Operational lessons

Recorded here from the source records; they were not compared with the knowledge entries.

- `orca-run collect` rejects a completion that lists any `.project` path in `filesModified` (`invalid-files`). A
  read-only brief must forbid every write, including ignored reports, and carry observations in the completion body.
- Orca worker-read can return `session_not_reported` without a transcript; a neutral blocking checkpoint after reads
  and before the decision recovered exact provider transcripts.
- OpenCode TUI refuses a launch-time model override (`capability_unsupported`); omit it and report the observed model.
- A thinner wrapper can raise correct loading (governing gate rows) and leave routine context flat.
- Grader errors are corrected in the record beside the original note; raw scores stay unchanged.
- Upgrade simulations must model the documented post-sync ignore merge, or new doctor ignore rules break them.
- Node 22.11 cannot load `.mts`; scratch runs used the exact Node 24.21.0 executable already used for S1.

## Historical contradictions

- The ship record header gives "Bet: 2026-10-17"; the pitch and shaping revision record the Bet on 2026-10-18.
- Pitch records date every scope event 2026-10-18, but the changelog dates 2.31.6, 2.31.7 and 2.31.8 2026-10-19.
- The 14 cross-file contracts predate this pitch (fix-instruction-conflicts); S1 kept and rewrote premises, not added them.
- The ship record and backlog say "remaining 40" / "~40" wrappers; the pitch and critique count 44 canonical prompts
  with two compressed.
- Estimates versus actuals: S1 estimated 480 new lines, actual 596 new (1,074 with the dataset); S2 estimated 240,
  actual 212; projected wave 1,469, final 1,308 after the S3 restore.

## Retention

The pitch records exist in the recovery archive `.project/compaction/archives/instruction-compression-2026-10-19T03-31-38-824Z`
(restore with [pitch-archive.mts](../../../ai-framework/scripts/pitch-archive.mts) `restore`). The build log and hill
chart were compared with the archived `log.md` and `hill.md` and the copies are byte-identical: [run log](../../runs/2026-10-19-instruction-compression.md)
and [run hill](../../runs/2026-10-19-instruction-compression-hill.md). The S3 review at
[S3 review analysis](../../analysis/2026-10-18-instruction-compression-s3-review-analysis.md) is a moved copy that differs
from the archived `s3-review.md` only by a two-line preface and rebased or de-linked references to archived files, so its
substance is also merged above under S3 review decision. Evaluation reports and raw traces under `.project/evals/runs/`
and `.project/metrics/` are git-ignored local data and may be absent in other checkouts.
