# Audit cycle 1 — state-fragment-sanitizer

Status: OPEN. No confirmed live must-fix. Confirmed should-fixes patched, with
318/318 fragment and dataset tests passing. Code/test/cross-pitch completion gaps require
cycle-2 checks; this record does not claim a clean audit.

Read-only: review-bench guard snapshot/check returned clean true, headChanged false,
statusChanged false, changed []. All actual source edits below were made by the coordinator
after that check. Each reviewer received a separate external scratch with a test-breaking
canary. All eight reports caught their canary, but incomplete reports do not count as clean.

| Role/slice | Model | Completion | Canary | Cross-file | verified |
|------------|-------|------------|--------|------------|----------|
| security parser/validator | Sonnet 5.5 medium | incomplete; fresh retry complete | caught on both | reviewed | guard + reports |
| code parser/validator/dataset | Sonnet 5.5 medium | incomplete twice; not-completed | caught on both | partial required helper/plan gap | guard + reports |
| security evidence | Opus 5.5 high | complete | caught | reviewed | guard + report |
| code evidence | Opus 5.5 high | complete | caught | reviewed | guard + report |
| test coverage | Haiku 5.5 high | incomplete; wrong scratch-wide checks, retry required | caught | partial | guard + report |
| cross-pitch | Haiku 5.5 high | incomplete; missing version/diff inputs, retry required | caught synthetic ownership overlap | partial | guard + report |

Code/security models differ from each corresponding original implementation model. S2/S3
used Opus and S4 used Sonnet, so evidence review uses Opus while parser/validator uses Sonnet.
Role prompts, hashes, manifests, own worker_done messages and release receipts are under
`.project/metrics/state-fragment-sanitizer/audit1/`. No prior findings were shown to fresh
reviewers. First security reviewer accidentally read live source; its report is not used
as a completed independent review. Fresh retry stayed in scratch and completed A–G.

## Must-fix

None confirmed in live code. All reported high/critical source defects were planted
scratch canaries: escaping, reserved classes, numeric mismatch, and unbound-number guards.
Live source has those guards. The SKIP-parser defect and rollout ownership collision were
also scratch-only canaries. Coordinator verified live numeric-mismatch/unbound refusals and
read the actual guards. No canary was patched into or removed from the live checkout.

## Should-fix

| ID | Source | Location before fixes | Scenario | Disposition | verified |
|----|--------|-----------------------|----------|-------------|----------|
| A1 | code main | state-fragment.mts:49 | custom iterator yields one option during validation, another during Set construction | fixed: bounded own-index snapshot, no iterator/getter execution | coordinator PoC accepted unsafe class before; new regression passes |
| A2 | code evidence | state-fragment-evidence.mts:82 | changing numbers getter throws TypeError or bypasses 50-citation cap | fixed: data-descriptor snapshot, bounded dense copies, throwing traps refuse input-type | coordinator TypeError before; new accessor/cap regressions pass |
| A3 | code/test main | state-fragment.mts:140 | tspan under svg/g accepted despite text content model | fixed: require text parent, paired rejection controls | coordinator acceptance before; new tests pass |
| A4 | code evidence | state-fragment-evidence.mts:30 | local reject duplicates parser-owned contract | fixed: reuse exported reject | evidence suite passes |
| A5 | code main | state-fragment-dataset.test.mts:221 | partial sanitizer check could count SKIP directly | fixed: countsAsPassing predicate | mapping suite passes |
| A6 | test | tests | exact geometry 1e6 and href 200 boundaries absent | fixed: positive inclusive bounds and 201 refusal | tests pass |

## Acknowledged / declined widening

- Non-ASCII digits and spelled-out numbers: D6 explicitly counts ASCII digit runs. This is a
  deliberate mechanical scope, not a full natural-language truth checker. Live semantics
  remain state-ai-authoring-owned. Unicode format characters outside D2 remain accepted.
- Large numeric decimal normalization follows D6 JS numeric equality. Current output is
  canonical before matching, so float normalization does not inject an unmatched digit string.
- The HTML pre first-newline behavior is a low cosmetic browser difference; no browser
  execution was promised. Deferred as an acknowledged limitation, not an injection path.
- Hard links to secret inodes cannot be classified by filename checks; this library returns
  links, reads no target content, and still requires snapshot membership. No broader inode
  inventory was added. Transcript basename policy remains the approved D8 pattern.
- Shared facts() uses its existing wrapper definition and trusted bundle-produced snapshots.
  Arbitrary proxy snapshots and ambiguous status/value/evidence containers are outside the
  producer contract; no shared state-module edit is made.
- Repeated Set construction and dense formatting are bounded by cohesive approved caps.
  No style-only refactor added.

## Incomplete reviews

Code main twice omitted required source/spec checks and is recorded not-completed for this
cycle. Test reviewer ran repository-wide invariants on a deliberately partial scratch and
reported missing-fixture failures; those are not live failures. Coordinator full live state
regression was already 519/519 before this cycle. Cross reviewer lacked VERSION/CHANGELOG,
actual diff metadata and logs; retry will receive complete ownership evidence. The synthetic
rollout plan exists only in scratch; the real rollout is shaped with no plan.

Cycle 2 will review changed code/test behavior and complete these gaps with fresh, bounded
contexts; no automatic advancement. UX/i18n/eval roles do not trigger for this library scope.
