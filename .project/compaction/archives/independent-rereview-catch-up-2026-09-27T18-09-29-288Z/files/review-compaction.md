# Review record: compaction tool (S1)

**Subject:** `ai-framework/scripts/pitch-compress.js`, `pitch-archive.js` (+ the parts of `skill-registry.js` they call), tests, playbook.
**Code state reviewed:** the working tree on 2026-09-26 ~07:33, including the concurrent session's uncommitted edits to `commitLedger`.
**Yardstick:** `decisions/pitch-compaction-gate-and-recovery-design`, `issues/bare-prefix-match-crosses-entities`, `security.md` section 9 and checklist G, the `/pitch-compress` playbook.
**Audit cycles:** 3 (cycle 1: dispatches a–c; cycle 2: dispatch d; cycle 3, the cap: dispatch e). Prompts are stored in `prompts/s1-*.txt`.

independent: yes
canary: caught
read-only: verified by review-bench guard (snapshot before every dispatch, check after; see the guard column)
prompt-sha256: 21c0e906c7df0bcecd04e1310c5997f0a8c05bb95b87614dc1aa461a71df0cdf
model: opus (security dispatches a, d, e), sonnet (code-review dispatches b, c)
cross-file interactions: reviewed

Meaning of `independent: yes` here: a fresh agent (not resumed, shown no earlier findings), same model family as the author, and it found the planted defect. **It is not proof of independence from the author's blind spots.** `cross-pitch-conflict-checker`: not applicable at the time (no other active pitch was known); a real overlap with four concurrent pitches was found later and is recorded in `log.md`.

## Dispatches

| id | role | model | tool calls | prompt-sha256 | canary planted | canary | guard |
|----|------|-------|-----------|---------------|----------------|--------|-------|
| a | security-reviewer, whole files | opus | 18 | 21c0e906…df0cdf | inverted accepted-gap check in `requireCompleteLedger` | caught | 4 paths changed, all written 07:33:39 by the concurrent session, before the prompt existed (07:33:50); none in the reviewer's scratch tree |
| b | code-reviewer, whole files vs playbook | sonnet | 14 | afb36ce1…de329f | inverted `done` filter in `hillOpenCount` | caught | clean |
| c | code-reviewer, cross-boundary (4 interfaces) | sonnet | 15 | 23ab891f…90fefc | ledger file name mismatch (`.ledger.json`) between writer and reader | caught | clean |
| d | security-reviewer, re-review of the round-1 fixes (cycle 2) | opus | 13 | 481888fc…686b22eec | inverted `extracted` check in the new destination re-check | caught | clean |
| e | security-reviewer, re-review of the round-2 fixes (cycle 3, the cap) | opus | 16 | bc4510b3…849851e8b2 | inverted closing-fence length test | caught | clean |

## Findings (real defects only; each reviewer's canary finding is excluded)

Verification budget: 8 claims per role-slice. Every claim below was reproduced with a small script against the repo code (`verified:` names it); scripts are `v1`–`v8` in the session scratchpad. Where a claim rests on code reading or on the reviewer's own run, the cell says so.

| id | source | finding | verified | tier | disposition |
|----|--------|---------|----------|------|-------------|
| P1 | a, b (both) | `remove` never recomputed the required sections nor re-checked ledger destinations, so a hand-placed or stale ledger opened the deletion gate | v1: hand-placed nonsense ledger removed 2 files; ledger covering 1 of 3 sections removed 3 | must-fix | fixed: exact-set recompute + destination re-check at remove time; 3 tests |
| P2 | a | `checkGraph` executed the project's own `graphify.js` | v3: witness file written | must-fix (security 9, mandatory) | fixed: bundle's `graphify.js`; test |
| P3 | a | `restore` wrote through symlinks (leaf and directory), not atomic | v2: outside file overwritten; outside dir received the pitch | must-fix | fixed: symlink refusal at destination/ancestors/leaf, per-file temp+rename; 3 tests |
| P4 | a | `archive` followed a symlinked `.project/pitches` and hung on a FIFO | v2: outside content archived; v4: hung (killed at 6 s) | must-fix (G1 mandatory) | fixed: `assertPlainPath`, `walk` refuses non-regular files; test |
| P5 | a | raw error text and absolute paths (JSON.parse text, EACCES paths) | v2 S3: JSON text in stderr; v8: absolute EACCES path | must-fix (G4 mandatory) | fixed: fixed messages, error codes only, CLI reports fs errors by code |
| P6 | b | duplicate `##` headings: content under a later duplicate was not required | v5 | must-fix | fixed: unique keys; test |
| P7 | b | `slugifyHeading` dropped non-ASCII, so Spanish/Chinese headings collapsed to `SHIPPED.md#` | v5 | must-fix | fixed: Unicode letters kept; ASCII keys unchanged; test |
| P8 | b | `writeDoneWork`: a `## ` summary line orphaned text on rerun; a global blank-line collapse rewrote other pitches' sections | v5 | must-fix | fixed; 2 tests |
| P9 | b | No-gos / Rabbit-holes matched by exact text (real pitches use "No-gos (this pitch)"); the metrics pitch's ledger really omitted it | v5 | must-fix | fixed: loose match, canonical keys; test |
| P10 | b, c | a pitch left with nested empty directories read as active (my 2.8.1 fix was incomplete) | v5 | must-fix | fixed: recursive emptiness; test |
| P11 | d | round-1 bug: a `-2` suffix can equal another heading's own slug, giving duplicate keys | v7 | must-fix (in my fix) | fixed: keys unique against all produced; test |
| P12 | d | a second No-gos heading was hidden by an empty first one; fence rules differed from CommonMark; quadratic heading regex (3.4 s at 80 KB); `writeDoneWork` followed a symlinked `.project`; destinations under `.project/compaction` accepted | v7 | should-fix (G1/G2/G5 items are mandatory) | fixed; 6 tests |
| P13 | e | fence closer padded past 4000 characters; indented ATX headings; readers followed a symlinked `.project` or pitch directory; walk/restore absolute paths; inherited-property file names unreported; unbounded verify read | v8 | must-fix (mandatory G items) | fixed; 4 tests |
| P14 | c | `commitLedger` (changed by the concurrent session at 07:20) uses `context(root, "project")`, while `pitch-archive` guards and recovers under `.project/compaction`; an interrupted commit is not recoverable via `recover` | read both contexts; crash repro is the reviewer's, mine did not run | should-fix | **not fixed here** (owner: `path-safety-hardening`); followup |
| P15 | c | `/state` truncates `done-work.md` at 64 KB while `pitch-compress` reads 4 MB; counts drop after ~25 compactions | v6: 102 KB, 40 entries, `/state` counted 26 | should-fix | belongs to S3 (`state-snapshot.js`) |
| P16 | e | the ledger is bound to section keys, not section content; files outside the rule set, setext headings, `###`-only files and preamble text are not required; destinations may be another pitch's file | code reading + reviewer PoC | design limit | followup |

Bare-prefix fix (`bare-prefix-match-crosses-entities`): verified to hold with adversarial slug pairs (foo/foo-bar/foo-2026, a/a-b/a-b-c) by reviewer a.

## Checklist results (final state; reviewers' earlier fails are P2–P5, P12, P13)

| item | result | evidence |
|------|--------|----------|
| G1 reader refuses symlinks/FIFOs/outside paths/oversize | pass | `assertPlainPath` + `readGuarded` + `walk`, verify size bound; tests |
| G2 linear regexes, capped input | pass | linear heading match, 4000-char line cap (redundant layer, a mutant survives by design), 4 MB read cap |
| G3 no project script executed | pass | `__dirname` graphify; witness test |
| G4 no raw error text / absolute path | pass | code-only messages; CLI fs-error guard |
| G5 writers refuse symlinks, atomic | pass | temp+`wx`+rename, `assertPlainPath` on `done-work.md` and restore |
| Sec.9 rule 6 ("absent" vs "refused") | pass | `writeDoneWork` refuses; walk refuses non-regular files |

## Evidence

- Suites: `node --test` on `pitch-compress`, `pitch-archive`, `state-snapshot`, `state-html`: **160 pass, 0 fail**. Doctor READY, setup-validator READY.
- Mutation checks on the fixes: 41 mutants applied one at a time to scratch copies; all caught except two survivors kept on purpose: the 4000-character line cap (redundant with the linear heading regex; it survived twice) and the `checkGraph` stderr fallback (reachable only if `graphify.js` crashes without JSON output).
- Files changed by this slice (fix cap 4): `pitch-compress.js`, `pitch-archive.js`, `pitch-compress.test.js`, `pitch-archive.test.js`.
- **Not independently re-reviewed:** the round-3 fixes (P13) and the CRLF normalization were made after the third and last dispatch; they are verified by PoC and mutation checks only. The cycle cap was reached with no must-fix open in the code as reviewed by dispatch e.
- Followups written: commitLedger transaction context (P14), ledger required-set and content binding (P16). P15 is carried into S3.
