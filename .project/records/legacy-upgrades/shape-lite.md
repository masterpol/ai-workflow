# Source-review supplement: shape-lite

Prepared 2026-10-22 from verified recovery sources. This is the only retained record for the 2026-10-07 `/shape-lite` pitch (bundle 2.9.0, then 2.9.1) now that its done-work narrative is retired; no compact pitch-compression record exists. Results are historical evidence, not a new certification. Current behaviour is owned by the [shape-lite skill](../../../.claude/skills/shape-lite/SKILL.md) and the [decision entry](../../knowledge/decisions/shape-lite-is-a-gated-escalating-variant-of-shape.md). Source script names were `.js`; they are `.mts` now. Differences between the sources are kept as recorded under Historical limits.

## Release and deliverables

Problem: someone with a small task, or who rejects part of a plan mid-flow, had only the full `/shape` ceremony or no framing. Appetite was big-batch by file count only (about 8 files and 193 lines).

Scopes S1 (skill plus mirrors), S2 (docs), S3 (version) and an added S4 all finished 2026-10-07. S1: one skill on four vendors (canonical `.claude`, byte-copy `.cursor`, `.agents` stub, `.opencode` command). S2: phase doc, overview and entry-file rows; four files mention shape-lite. S3: VERSION 2.9.1 (the plan's exit said 2.9.0; 2.9.0 shipped the skill and 2.9.1 the S4 import validation). S4, added at the user's request mid-build: `setup-validator` rejected a `CLAUDE.md` that loads `AGENTS.md` via `@AGENTS.md` ("bootstrap file was not replaced"), so [entry-import](../../../ai-framework/scripts/entry-import.mts) (with its tests) was added, wired into setup-validator and bundle-sync, and documented in SETUP.md and the setup skill. Only Claude Code uses CLAUDE.md; OpenCode, Codex and Cursor read AGENTS.md directly, so no per-vendor change. No Cloud Build config exists in this repo.

Final verification: no build, lint or typecheck command in this repo (skipped); the suite had 318 pass and 1 fail. The failure (live caveman state, caveman not installed) predates the pitch; a "payload-controlled names" test is flaky under full-suite load and passes alone. The final diff held no secrets or debug output.

## Scope and limits

No-gos held: full `/shape` behaviour, template and gates unchanged; no critique fan-out and no new agents inside lite; no auto-advance past the single Approve / Revise / Back / Stop gate; no silent edit to a pitch the user did not name; the standing workflow-tooling no-gos (no application work, no secrets, no installs or deletions while shaping).

Rabbit holes resolved in the pitch: escalation drift (hard triggers, evaluated before writing); recording a rejection without bloating the pitch (one `## Revisions` row, a knowledge entry only if reusable); the AI-prompt golden-eval bypass (lite refuses and escalates). Pushed to plan: hard-coded skill counts and mirror parity, and whether OpenCode and Codex need an adapter file; both closed at plan because the doctor discovers skills dynamically, so no code change. Pushed to no-go: a cross-pitch conflict check inside lite (file-set overlap is an escalation trigger instead).

Pre-bet critique (knowledge-historian, skeptic, appetite-auditor; cross-pitch and eval skipped) produced: K1 count agent completions, never launches; K2 escalation triggers must be mechanical, not the skill's own judgement (see [gate must not audit its own instrument](../../knowledge/patterns/a-gate-must-not-audit-its-own-instrument.md)); K3 check git status and sync after adding mirrors (orphan wrappers); K4 doctor enforcement; S1 inline lite must not downgrade a big-batch pitch's gate row; S2 two or more active pitches and no named slug means ask; S3 the gate must include "Back"; A1 appetite is big-batch only by file count.

## Build decisions and deviations

Plan exits were: doctor exit 0, cursor mirror identical to canonical, `skill-vendors cursor-mirrors` clean, grep checks for each pitch behaviour, setup-validator exit 0, changelog check, full suite, graphify check and clean git status. S1 and S2 ran inline in one session with no subagents.

Deviation 1: the caveman line uses `--phase utility`, not `shape`, because the skill-defaults test requires every non-phase skill to resolve as utility; shape-lite is a utility variant, not a phase. Fixed in canonical and the Cursor mirror. Deviation 2: S4 added as above. The plan's `.opencode` adapter used the `standard` profile with no reasoning effort (only deep requires one); current routing is owned elsewhere.

## Audit and review chronology

Two cycles, big-batch; reviewers code (1), security (2) and test coverage (1); ux, i18n, eval and cross-pitch not applicable. Reviews were independent, with sonnet for code and security and haiku for test coverage, in a scratch copy with before and after read-only guards (clean both cycles). A planted canary was caught each cycle (a disabled symlink guard at `entry-import` line 33; an inverted fence closer at line 24) and those findings were refuted as canary-only.

Must-fix (both fixed): M1 a quadratic fence regex (1 MB input about 187 s per the security reviewer; author reproduced 1151 ms at 16k lines), replaced by a linear scanner and a 200k-line test; M2 inline-code stripping rewrote the line before the directive check so `` `a`@AGENTS.md `` imported, fixed by judging the raw line. Should-fix (all fixed): S1 four-tick, unclosed and indented fences accepted as imports; S2 1 MiB cap on AGENTS.md; S3 an invalid import reported as a missing section, now its own message; S4 untested missing kind, directory target, CRLF and multi-import (mutants survived); S5 the skill's escalation test ran after framing, had a narrow AI path and no evidence rule, now test first, re-run on Revise and Back, evidence quoted, undecidable counts as fired. Lessons: [quadratic regex issue](../../knowledge/issues/backtracking-regex-over-untrusted-text-is-quadratic.md) and [gate must not trust its own author](../../knowledge/patterns/a-gate-must-not-trust-its-own-author.md).

## Historical limits

Acknowledged and not actioned: multi-line code spans, a backtick in a fence info string, a symlinked CLAUDE.md, an untestable realpath-escape branch and TOCTOU (low; exact Claude Code behaviour unverified); an ambiguous case of one active pitch plus an unrelated task (sent to cooldown). Cross-file callers of entry-import were not in scratch in cycle 2 (unverified). Contradictions kept as recorded: the plan said VERSION 2.9.0 while the ship says 2.9.1; the hill chart says S4 added 6 tests while the ship and audit report 10 in the entry-import suite after fixes (not reconciled); the pitch's hard-coded "26 skills, 3 mirror sets" counts were found to be dynamic in the doctor, so that risk closed with no code change; the plan's caveman line `--phase shape` shipped as `--phase utility`. Five followups were added to [followups](../../pitches/_followups.md); compare against later work before calling any current.

Whole files left out of the ledger: the hill chart (all four scopes done; process noise).
