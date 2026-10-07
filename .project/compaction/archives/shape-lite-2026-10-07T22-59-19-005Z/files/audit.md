# Audit — shape-lite (big-batch, 2 cycles)

Dispatched: code (1, independent: yes) | security (2, independent: yes) | test-coverage (1, independent: yes) | ux n/a | i18n n/a | eval n/a | cross-pitch n/a (no other active pitch)

independent: yes
canary: caught (cycle 1 `entry-import.js:33` symlink guard disabled, cited by all 3 reviewers; cycle 2 `entry-import.js:24` fence-closer inverted, cited by security; `review-bench canary-check` caught: true both)
read-only: verified by review-bench guard snapshot/check (clean both cycles)
model: sonnet (code, security x2), haiku (test-coverage)
prompt-sha256: 6d947d78d34ff9653f667ee3bfde5504655fe3fbee2c8209d83aa5fa18d36586
cross-file interactions: reviewed (cycle 1: setup-validator and bundle-sync via diff; cycle 2: entry-import only, callers not in scratch = unverified)

Note: prompt hash is of the shared base template; each dispatch added role-specific checklist lines. Reviewer-run claims verified by the author before triage. Security reviewer 1 timing (187 s) reproduced by author.

## Findings

| ID | Source | File:line | Issue | Tier | verified | Disposition |
|----|--------|-----------|-------|------|----------|-------------|
| M1 | security | entry-import.js:15 | quadratic fence regex; 1 MB input ~187 s | must-fix | yes (1151 ms @16k lines) | fixed: linear scanner + 200k-line test |
| M2 | security c2 | entry-import.js:29 | inline-code stripping rewrote line before directive check (`` `a`@AGENTS.md `` imported) | must-fix | yes | fixed: raw-line judgement + tests |
| F1 | code/sec | entry-import.js:33 | disabled symlink guard | — | refuted: canary (scratch only) | n/a |
| F2 | security c2 | entry-import.js:24 | inverted fence closer | — | refuted: canary (scratch only) | n/a |
| S1 | code/sec | entry-import.js:15 | 4-tick / unclosed / indented fences accepted as imports | should-fix | yes | fixed + tests |
| S2 | sec | entry-import.js:37 | no size cap on AGENTS.md | should-fix | yes (by reading) | fixed: 1 MiB cap + test |
| S3 | code | bundle-sync.js | invalid import reported as missing section | should-fix | yes | fixed: own message |
| S4 | tests | entry-import.test.js | untested: missing kind, directory target, CRLF, multi-import | should-fix | yes (mutants survived) | fixed |
| S5 | sec | shape-lite SKILL.md | escalation test after framing, narrow AI path, no evidence rule | should-fix | yes | fixed: test first, re-run on Revise/Back, evidence quoted, undecidable = fired |
| A1 | code/sec | entry-import.js | multi-line code spans; backtick in fence info string; symlinked CLAUDE.md; realpath-escape branch untestable; TOCTOU | acknowledged | — | not actioned (low; Claude Code exact behaviour unverified) |
| A2 | code | SKILL.md step 1 | one active pitch + unrelated task is ambiguous | acknowledged | — | to /cooldown |

## Evidence after fixes
- `node --test ai-framework/scripts/entry-import.test.js`: 10 pass, 0 fail
- `node ai-framework/scripts/workflow-doctor.js` exit 0; `setup-validator.js` exit 0
- `node --test ai-framework/scripts/*.test.js`: 318 pass, 1 fail (pre-existing at HEAD: live caveman state, caveman not installed)
- Must-fix open: 0
