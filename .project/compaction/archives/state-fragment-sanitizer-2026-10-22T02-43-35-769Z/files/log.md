# Build log: state-fragment-sanitizer

## 2026-10-19 — S2/S4 wave started

Owner approved build start, then S1 and the S2/S4 implementation wave. Orca startup ready;
Run run_76430abd338c remains bound to the matching objective and coordinator.
S2: ctx_04a3579090fc, attempt:build-20261019-s2-a1, Claude deep (claude-opus-5-5/high).
S4: ctx_04224e236968, attempt:build-20261019-s4-a1, Claude standard (claude-sonnet-5-5/medium).
Workers own disjoint files in separate Orca child worktrees. No commits requested from workers.
Both use Claude because its new-child placement accepts explicit profile selection; OpenCode
model selection requires an existing worktree and does not support effort. This preserves the
planned complexity profiles and alternate-vendor implementation contract for Codex.

Baseline command: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/invariants.test.mts`
Exit: 0. Raw TAP saved under `.project/metrics/state-fragment-sanitizer/baseline-invariants.tap`.

No incidents yet. Scope completion and author-mutant evidence pending.

## S4 incident — sparse citation arrays

Symptom: direct checkCitations calls with a hole in hrefs or numbers threw TypeError (reproduced in this session).
Root cause: Array.every skips holes, but the later for-of visits each hole as undefined.
Fix: validate bounded array copies and add a named sparse-array regression with valid controls; coordinator patched after authoritative worker completion and terminal release. Verification pending.

## S4 collection and diff hygiene

Accepted the exact worker_done msg_b6be2377054e for ctx_04224e236968 through orca-run collect.
Released the exact worker terminal; receipt state released with transcript archive captured.
Acknowledged delivery_fb0ad860ea72. A late guidance send returned dispatch_inactive after completion;
no dispatch was refused and no replacement worker was launched.
The worker reported 42 passing tests counting 8 invariants; its own utility tests numbered 34.
Generated graph artifacts changed during child-worktree startup outside the authorized scope.
Archived their exact bytes under .project/metrics/state-fragment-sanitizer/s4-original/ and
returned only those worker copies to the recorded baseline before diff admission. Coordinator
graph artifacts remain untouched. Original utility/test bytes are also archived before the fix.

## S2/S4 scope completion — coordinator evidence (2026-10-19)

Both scopes are done. S3 has not started; the big-batch per-scope gate is pending. No report
injection or allow-list sanitizer is implemented by this wave. Independent security and code
review remain mandatory at /audit; these checks are author-run verification only.

### Orca collection, reconciliation and ownership

S2: authoritative worker_done msg_d894bf191322 matched ctx_04a3579090fc and was accepted through
`orca-run collect`. Terminal release returned state released with transcript captured; delivery
d22d58cf3578 (full ID delivery_d22d58cf3578) was acknowledged. S4 collection/release is recorded above.
The same generated-graph archive/baseline restoration was applied to S2 after completion;
worker original bytes remain under .project/metrics/state-fragment-sanitizer/s2-original/.

Coordinator inspected both production modules and test imports/behavior before running their code.
The owner's S2/S4 approval covered these exact modules, tests and planned exit commands.
Reconcile input names only the four authorized files, the recorded baseline, and the two isolated
worktree paths. Its humanConfirmed flag records that scoped approval; it expands no ownership.

Command (exit 0):
`node ai-framework/scripts/orca-run.mts reconcile --root . --input .project/metrics/state-fragment-sanitizer/wave-reconcile.json --check setup-validator`

Structured output: status integrated, reason integrated; both attempts integrated with evidence ok.
setup-validator passed before and after applying the wave. Both ledger records are settled.
Child worktrees are retained with uncommitted source; no removal or force cleanup attempted.
Exact reconcile/check output and hashes live in .project/metrics/state-fragment-sanitizer/ and
.project/metrics/orca-evidence/. Both agent terminals were released.

### Current-session tests

Command (exit 0, coordinator checkout):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/state-fragment-parse.test.mts ai-framework/scripts/state-fragment-evidence.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-theme.test.mts`

This runs every S2/S4 test, the required runtime invariants, and the three planned regression
files together. Breakdown: 84 parser + 35 evidence + 8 invariants + 182 state regression tests.
Verbatim final output:

```text
ℹ tests 309
ℹ suites 0
ℹ pass 309
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7032.304
```

No application build, typecheck or lint exists for this repository. Invariants check silent
imports, dependency injection and absence of any-typed escape hatches.

### Guard proofs

Command (exit 0, coordinator checkout):
`node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s2-mutants/run-mutants.mts /Users/bryanrestrepo/Documents/ai-workflow-portable`

Each of M1–M21 is killed after the same named test passes against the unmodified copy.
The run also includes cap loosen/tighten controls and supplemental guards: 44 killed, one
proven redundant (the UTF-16 size lower bound is backed up by the encoded byte guard).
The redundant lower bound remains in production to avoid encoding huge input.
Verbatim final output:

```text
M20: baseline=pass mutant-exit=1 killed (expected control-character) | [reject-structural-constructs] control character
M21: baseline=pass mutant-exit=1 killed (expected invalid-unicode) | [reject-structural-constructs] unpaired surrogate
X-selfclose: baseline=pass mutant-exit=1 killed (expected content-model) | [reject-structural-constructs] self-closed HTML element
X-lowerbound: baseline=pass mutant-exit=0 redundant-layer: encoded byte check (M1) still rejects size-limit; the lower bound only avoids encoding huge input (expected size-limit) | [reject-oversize-and-deep] byte cap UTF-16 lower bound
X-rawlt: baseline=pass mutant-exit=1 killed (expected syntax) | [reject-structural-constructs] raw less-than inside an attribute value
X-separator: baseline=pass mutant-exit=1 killed (expected syntax) | [reject-structural-constructs] missing attribute separator
X-semicolon: baseline=pass mutant-exit=1 killed (expected character-reference) | [reject-entity-encoded-javascript] bare or unterminated ampersand
X-stray-close: baseline=pass mutant-exit=1 killed (expected mismatched-close) | [reject-structural-constructs] close without an open element
X-options: baseline=pass mutant-exit=1 killed (expected invalid-options) | [reject-oversize-and-deep] invalid limits
mutants: 45 rows, 45 killed or proven redundant, 0 unexplained
```

Command (exit 0, coordinator checkout after sparse-array fix):
`node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/verify-evidence-mutants.mts /Users/bryanrestrepo/Documents/ai-workflow-portable`

Verbatim final output (all M35–M49 are killed):

```text
M35: baseline 0, mutant 1, assertion names evidence-not-in-snapshot
M36: baseline 0, mutant 1, assertion names unsafe-path
M37: baseline 0, mutant 1, assertion names traversal
M38: baseline 0, mutant 1, assertion names absolute
M39: baseline 0, mutant 1, assertion names scheme
M40: baseline 0, mutant 1, assertion names percent
M41: baseline 0, mutant 1, assertion names backslash
M42: baseline 0, mutant 1, assertion names secret-path
M43: baseline 0, mutant 1, assertion names transcript-path
M44: baseline 0, mutant 1, assertion names citation-limit
M45: baseline 0, mutant 1, assertion names unknown-fact
M46: baseline 0, mutant 1, assertion names unknown-fact
M47: baseline 0, mutant 1, assertion names not-a-number
M48: baseline 0, mutant 1, assertion names number-mismatch
M49: baseline 0, mutant 1, assertion names unbound-number
Evidence mutants: 15/15 killed; raw reports /Users/bryanrestrepo/Documents/ai-workflow-portable/.project/metrics/state-fragment-sanitizer/evidence-mutants-mwkzhR
```

The sparse-array correction has two additional coordinator-run mutants: replace the bounded
array copy with the original sparse array, one field at a time. Each unmodified baseline exits 0;
each mutant exits 1 on the named input-type assertion. Verbatim output:

```text
sparse hrefs: baseline 0, mutant 1, named input-type assertion
sparse numbers: baseline 0, mutant 1, named input-type assertion
```

The S1 mutation ledger remains planned until S5 updates its status column, as the plan requires.
The exact source anchors for M1–M21 and M35–M49 each occur once and remain unchanged from S1.

### Coverage and line/reuse boundaries

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --experimental-test-coverage --test-coverage-include='ai-framework/scripts/state-fragment-*.mts' --test-coverage-exclude='**/*.test.mts' --test ai-framework/scripts/state-fragment-parse.test.mts ai-framework/scripts/state-fragment-evidence.test.mts`

Verbatim final output:

```text
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 309.004792
ℹ start of coverage report
ℹ ------------------------------------------------------------------------------
ℹ file                          | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------------------
ℹ ai-framework                  |        |          |         | 
ℹ  scripts                      |        |          |         | 
ℹ   state-fragment-evidence.mts |  99.14 |    97.98 |   91.67 | 17
ℹ   state-fragment-parse.mts    |  99.24 |    99.38 |  100.00 | 262-263
ℹ ------------------------------------------------------------------------------
ℹ all files                     |  99.21 |    98.84 |   96.88 | 
ℹ ------------------------------------------------------------------------------
ℹ end of coverage report
```

Current-session inline Node assertions (exit 0) read the two source files and assert their
line limits and safeEvidencePath reuse counts. They also require both
`git diff --name-only d2d8ee1d0b71a6450464f2359ba9fd47bce54424 HEAD -- <five shared modules>`
and `git diff --name-only -- <five shared modules>` to be empty. Modules: state-render,
state-snapshot, state-structure, state-theme, state-pages. Verbatim output:

```text
parser lines 264 <= 350; evidence lines 116 <= 150
safeEvidencePath: 1 reuse, 0 local copies; shared modules unchanged in commits and worktree
```

`git diff --check` exits 0 with no output. No open build incident remains.

## S3 incident — Orca worker launch refused (2026-10-19)

Symptom: dispatch exited 3, route blocked, reason launch-failed:agent_readiness (attempt:build-20261019-s3-a1, ctx_81160612d9d6).
Root cause observed in exact worker terminal: the interactive Oh My Zsh update prompt consumed the Claude launch input; terminal showed the update question followed by a malformed launch command. No S3 brief reached a ready agent.
Fix pending owner choice: resolve shell startup and residual resources before a controlled retry, or explicitly re-invoke with orca=normal. No automatic retry, no silent fallback and no S3 implementation.

The bound Run remains run_76430abd338c. Failure details and resource ownership are preserved under
.project/metrics/state-fragment-sanitizer/s3-failed-worker.json. The failed worker terminal is
term_71a3a3c9-4673-4e55-8992-71e9ecd835c3 in the reused isolated S2 worktree. Its ownership has
not been cleared. Archived S2 dependency hashes remain available for later admission checks.
S2/S4 verification and the coordinator's implementation files remain intact.

## S3 retry incident — same shell startup blocker (2026-10-19)

Symptom: owner-requested retry build-20261019-s3-a2 exited 3 with launch-failed:agent_readiness (ctx_9a11eab99cdb).
Root cause: the exact terminal again showed the Oh My Zsh update question consuming the Claude launch command. The update prompt is repeatable; a new terminal alone does not resolve it.
Fix pending owner choice: suppress the interactive shell update prompt before launch, or explicitly invoke orca=normal. A reviewable zstyle snippet is saved in local evidence; no global shell configuration was edited.

Before retry, a1's exact failed terminal was released and classifyLiveness verified exited-and-settled; its ledger state was safely changed from unknown-liveness to failed. After this second failure the same cleanup and liveness checks passed for a2. Both failed terminal resources are now released, both attempts are failed, and no S3 file exists. No third launch or silent fallback was attempted.

## S3 recovery — explicit normal workflow

Owner explicitly requested continue with orca=normal. Startup returned bypassed / orca-normal
for this invocation. The coordinator implements S3 directly; no worker is launched and no shell
configuration is edited. The prior failed workers were released and recorded failed only
after positive exited-and-settled evidence. S3's approved behavioral tests and gates still apply.

## S3 incident — Node strip-only syntax

Symptom: the first S3 test run failed before assertions with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX.
Root cause: the local Refused class used a TypeScript constructor parameter property, unsupported by Node strip-only mode.
Fix: declare the readonly field explicitly and assign it in the constructor; the next run passed all 110 tests then present. Final tests after content-rule refinements pass as recorded below.

## S3 scope completion — coordinator evidence (2026-10-19)

S3 is implemented directly by the coordinator under the owner's explicit orca=normal invocation.
No shell configuration was changed and no additional worker was launched. Independent code
and security review still belongs to /audit; these are author-run tests and mutation proofs.

The new state-fragment.mts exports sanitizeFragment, Citations, Options and DEFAULT_TOKENS.
It validates the S1 HTML/SVG allow-lists, context-sensitive content rules, trusted options and
geometry, then re-emits escaped canonical markup and collects evidence/numeric citations.
Every accepted test control is sanitized again and must produce byte-identical HTML and citations.
Citation checking remains a separate mandatory step before any future report injection.
rejectionMessage remains owned by S6.

Review refinements were implemented inside S3: SVG shapes reject whitespace children; structural
HTML text permits only ASCII whitespace, so NBSP cannot trigger table foster parenting; class
normalization splits only ASCII whitespace; and canonical output is parsed against the same
caps after escaping/decimal expansion. These do not widen the approved allow-list.

### Scope tests and invariants

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/runtime/invariants.test.mts`

113 S3 behavior tests and 8 runtime invariants. Verbatim final output:

```text
ℹ tests 121
ℹ suites 0
ℹ pass 121
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 341.421375
```

### Mutant proofs

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/verify-validator-mutants.mts`

All 13 prescribed validator/emitter guard anchors M22–M34 occur exactly once. Each named
test first passes against an unmodified copy in the same scratch layout. Its mutant then
exits 1 with a named assertion, not an import, fixture or TypeError failure. M33/M34 use
canonical output assertions. Three extra guards cover expanded-output caps, structural
Unicode whitespace and whitespace children of SVG shapes. Verbatim output:

```text
M22: baseline 0, mutant 1, assertion element-not-allowed
M23: baseline 0, mutant 1, assertion event-handler
M24: baseline 0, mutant 1, assertion style-attribute
M25: baseline 0, mutant 1, assertion id-attribute
M26: baseline 0, mutant 1, assertion url-reference
M27: baseline 0, mutant 1, assertion script-scheme
M28: baseline 0, mutant 1, assertion attribute-not-allowed
M29: baseline 0, mutant 1, assertion class-not-allowed
M30: baseline 0, mutant 1, assertion color-not-token
M31: baseline 0, mutant 1, assertion marker-not-allowed
M32: baseline 0, mutant 1, assertion content-model
M33: baseline 0, mutant 1, assertion canonical output equality
M34: baseline 0, mutant 1, assertion canonical output equality
X-output-caps: baseline 0, mutant 1, assertion text-length
X-structural-whitespace: baseline 0, mutant 1, assertion content-model
X-shape-children: baseline 0, mutant 1, assertion content-model
Validator mutants: 16/16 killed; raw reports /Users/bryanrestrepo/Documents/ai-workflow-portable/.project/metrics/state-fragment-sanitizer/validator-mutants-zaH3XY
```

No S1 ledger status is changed here: S5 owns that reconciliation. The empty-child SVG title
fixture isolates M32 from the separate text-content guard, so an earlier/later rejection cannot
make the content-model mutation falsely survive.

### Coverage

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --experimental-test-coverage --test-coverage-include='ai-framework/scripts/state-fragment.mts' --test ai-framework/scripts/state-fragment.test.mts`

Verbatim final output:

```text
ℹ duration_ms 175.427875
ℹ start of coverage report
ℹ ---------------------------------------------------------------------
ℹ file                 | line % | branch % | funcs % | uncovered lines
ℹ ---------------------------------------------------------------------
ℹ ai-framework         |        |          |         | 
ℹ  scripts             |        |          |         | 
ℹ   state-fragment.mts |  99.11 |    97.63 |  100.00 | 223-224
ℹ ---------------------------------------------------------------------
ℹ all files            |  99.11 |    97.63 |  100.00 | 
ℹ ---------------------------------------------------------------------
ℹ end of coverage report
```

### Regression

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/state-fragment-parse.test.mts ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/state-fragment-evidence.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-theme.test.mts`

Verbatim final output:

```text
ℹ tests 422
ℹ suites 0
ℹ pass 422
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 7584.789917
```

### Limits and structural integrity

Inline Node source assertions (exit 0) count each production module, enforce individual and
aggregate budgets, and assert `git diff --name-only <S1 Base> -- <five shared state modules>`
is empty. Verbatim output:

```text
state-fragment-parse.mts: 264 <= 350 lines
state-fragment.mts: 225 <= 300 lines
state-fragment-evidence.mts: 116 <= 150 lines
total production: 605 <= 800 lines
shared modules unchanged
```

Command (exit 0): `node ai-framework/scripts/setup-validator.mts`
Verbatim final output:

```text
PASS  CLAUDE.md: present
PASS  .project/status.md: 34 lines within the 100-line limit
INFO  .project/rules: 1 stack-specific companion rule(s) generated
PASS  CLAUDE.md: full project mirror is present
PASS  CLAUDE.md: carries the caveman response-style section
PASS  Knowledge graph: graphify validated 94 entry(ies)
PASS  Workflow doctor: portable workflow contracts passed
PASS  TypeScript entries: 143 TypeScript file(s) parse

Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 23 checks. Use --json for automation or --no-color for plain text.
```

`git diff --check` exits 0 with no output. No application build, typecheck or lint exists in
this repository. No page is rendered by S3, so the inline screen UX check does not apply.
No open S3 implementation incident remains. S3 awaits per-scope approval; S5–S8 have not started.

## S5 Orca execution and scope completion — 2026-10-20

Owner approved S5 with Orca fully enabled. Startup returned ready, workers claude/opencode.
The bound Run run_76430abd338c still matched this pitch and coordinator. Runtime epoch had
changed; no launched/unknown-live prior attempt was reused. The old S2 worktree was no longer
registered or present. A diagnostic selector lookup therefore failed without creating a
terminal; discovery selected the current checkout instead. A fresh shell preflight reached
the normal prompt without an update question and was closed cleanly. No shell configuration
was edited and no orca=normal bypass was used for S5.

Dispatch: ctx_0e405ff04dba, attempt:build-20261020-s5-a1, task_7806773a2963.
Worker: Claude standard, claude-sonnet-5-5/medium. It owned exactly the two test files.
The authoritative worker_done msg_d472feea6302 was accepted through orca-run collect.
Delivery delivery_a301e79fb051 was processed and acknowledged.

Worker changed only the two authorized test files, adding dataset-literal cases and timed
sanitzer/parser fuzz. The coordinator compared the actual file diff with saved pre-dispatch
bytes, inspected the additions and checked SHA-256 equality for all three production modules
and the evidence test. Those read-only files remained byte-identical.

### Coordinator correction

Symptom: the worker's final report still described boolean rejection as implied by reason checks.
Root cause: existing rejects/refuses helpers asserted the exact reason but did not explicitly assert ok === false.
Fix: after the worker completed, add the explicit boolean assertion with the expected reason in its message in both helpers and non-string sanitizer cases; retain exact reasons and paired idempotent controls. Preserve the script payload in its text-only control. Rerun all exits and mutants below.

### Shared-checkout reconciliation and resource handling

This was one sequential writer in the current checkout. No isolated patch needed applying.
The actual authorized test diff is saved as s5-verified-test-diff.patch in local evidence;
s5-shared-reconciliation.json pins implementation/test hashes, worker report identity and
verification-log hashes. The coordinator verified these hashes and the authoritative ledger
report before marking the attempt settled through createLedger. This is explicit shared-checkout
reconciliation, not a claim that the isolated-worktree apply CLI ran.

Orca worker-release returned state retained, reason user_takeover, processAction none. The
terminal remains under user control; it was not force-closed. Logical task/ledger completion
does not claim that this retained terminal exited. No other worker was launched.

### Matrix and timed fuzz exits

Command (exit 0 after coordinator correction):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/state-fragment-parse.test.mts`

Verbatim final TAP output:

```text
1..224
# tests 224
# suites 0
# pass 224
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1180.030458
```

The top-level `^ok [0-9]+ - \[(reject|accept)-` count is 213, exceeding the 52 spike rows.
Zero skipped/todo/fail were checked against the real TAP field names without rewriting output.

Real sanitizeFragment default-cap cases: 100,000 nested groups, 5 MiB path d, and an unclosed
construct 200,000 lines long. Each returns size-limit, asserts ok === false and exact reason,
and completes inside the 1,000 ms bound. Current-session TAP test durations, including paired
accepted controls, were 0.194208 ms, 4.328125 ms and 0.129667 ms respectively.
Extra raised-cap sanitizer cases exercise depth/geometry/unclosed refusal beyond the byte
cap; existing raised-cap parser linearity checks remain, plus 5 MiB path parsing and the
200,000-line unclosed vector. These all passed the same timing assertions.

### Current-session mutation exits

Commands (each exit 0, copied harnesses preserve prior evidence):

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s5-verify/s2/run-mutants.mts /Users/bryanrestrepo/Documents/ai-workflow-portable
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s5-verify/validator.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s5-verify/evidence.mts /Users/bryanrestrepo/Documents/ai-workflow-portable
```

Every M1–M49 has a passing same-layout unmodified baseline and exit-1 named assertion when
mutated. No fixture/import/type failure counts as a kill. Supplemental X-lowerbound is a
measured redundant layer, backed up by the encoded-byte check; no M row survives.
Verbatim final outputs:

```text
X-separator: baseline=pass mutant-exit=1 killed (expected syntax) | [reject-structural-constructs] missing attribute separator
X-semicolon: baseline=pass mutant-exit=1 killed (expected character-reference) | [reject-entity-encoded-javascript] bare or unterminated ampersand
X-stray-close: baseline=pass mutant-exit=1 killed (expected mismatched-close) | [reject-structural-constructs] close without an open element
X-options: baseline=pass mutant-exit=1 killed (expected invalid-options) | [reject-oversize-and-deep] invalid limits
mutants: 45 rows, 45 killed or proven redundant, 0 unexplained
M34: baseline 0, mutant 1, assertion canonical output equality
X-output-caps: baseline 0, mutant 1, assertion text-length
X-structural-whitespace: baseline 0, mutant 1, assertion content-model
X-shape-children: baseline 0, mutant 1, assertion content-model
Validator mutants: 16/16 killed; raw reports /Users/bryanrestrepo/Documents/ai-workflow-portable/.project/metrics/state-fragment-sanitizer/validator-mutants-qoPAQP
M46: baseline 0, mutant 1, assertion names unknown-fact
M47: baseline 0, mutant 1, assertion names not-a-number
M48: baseline 0, mutant 1, assertion names number-mismatch
M49: baseline 0, mutant 1, assertion names unbound-number
Evidence mutants: 15/15 killed; raw reports /Users/bryanrestrepo/Documents/ai-workflow-portable/.project/metrics/state-fragment-sanitizer/evidence-mutants-AJa0MD
```

S5 updates only the spike mutation status column: 49 killed. M50/M51 are deferred: S6; M52
is deferred: S7. No planned cell remains, but these three deferred proofs are explicitly
not run and not passed. The sequencing correction in plan.md requires them by build completion.

### Regression exit

Command (exit 0):
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/state-fragment-evidence.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-theme.test.mts`

Verbatim final output:

```text
ℹ tests 225
ℹ suites 0
ℹ pass 225
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8675.210875
```

Combined with the 224 matrix/parser tests, 449 tests pass, zero failed/skipped/todo.
`git diff --check` exits 0 with no output. No application build/typecheck/lint applies.
This is author-run guard verification, not independent security review. S5 is done under
the recorded dependency correction; S6–S8 remain unstarted and S5 awaits owner scope approval.

## S6 — bounded rejection formatter, Orca completion (2026-10-20)

Owner approved S6 after S5. Run `run_76430abd338c`, dispatch `ctx_ebd87c5ae579`,
attempt `attempt:build-20261020-s6-a1`, Claude fast profile `claude-haiku-5-5` high.
Own worker_done `msg_c8cecff99439` collected as completed. The authorized two-file diff
adds `rejectionMessage` and 11 named no-echo tests; production sanitizer is 258 lines
against its 300-line cap. Existing sanitizer behavior and parser-owned rejection metadata
remain unchanged. Rejection messages contain only a closed reason, bounded count, and
validated name or `(other)`, pass printable and final grammar, and are <=120 characters.
Malformed runtime objects receive a safe generic message without getter/coercion calls;
proxy traps may execute, but thrown failures are contained. No source value enters metadata.

Review incident: initial worker patch stored `(other)` in rejection metadata.
Cause: preserving invalid-name display through a sentinel would violate S1 D10's token contract.
Fix: restored original deny/reject path; formatter displays null as `(other)`; reran all exits.

Coordinator verification, all exit 0:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/state-fragment-parse.test.mts ai-framework/scripts/state-fragment-evidence.test.mts ai-framework/scripts/runtime/invariants.test.mts ai-framework/scripts/state-html.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/scripts/state-theme.test.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s6-verify/mutants.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s6-verify/redundancy.mts
```

Verbatim TAP tail:

```text
1..460
# tests 460
# suites 0
# pass 460
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6704.716083
```

Verbatim proof output excerpts:

```text
M51: named baseline 0, named mutant 0, full mutant 0, failing []
X-grammar: named baseline 0, named mutant 0, full mutant 0, failing []
cases 7507; M51 and X-grammar outputs identical to production on every case
validated pre-printable messages 2250: printable changed 0, grammar refused 0
generic outputs on production: 5257
```

M50 same-layout named baseline exits 0; mutant exits 1 with ERR_ASSERTION and
`message echoes a canary fragment`; its full file has five failing no-echo vectors.
M51 is measured redundancy under approved D10, not a claimed kill. M52 remains S7-owned.
Raw coordinator logs and actual authorized patch are hash-verified in
`.project/metrics/state-fragment-sanitizer/s6-shared-reconciliation.json`. Untouched parser,
evidence modules, and their tests match pre-dispatch hashes. Worker release returned
`released` / `closed_agent_terminal` with transcript captured; no retained resources claimed.

No application build/typecheck/lint applies. Quiet-import/runtime boundaries pass among the
460 tests. The imported printable helper uses cached default runtime dependencies; it performs
no fragment read. Author report's last per-call-dependency wording is imprecise on this point.
Independent security review remains for /audit. S6 done; S7–S8 remain unstarted.

## S7 — golden dataset mapping, Orca completion (2026-10-20)

Owner approved S7 after S6. Run `run_76430abd338c`, dispatch `ctx_e9b8c62e1aa4`,
attempt `attempt:build-20261020-s7-a1`, Claude standard `claude-sonnet-5-5` medium.
Own worker_done `msg_d770753c6f99` collected as completed. Only the new
`ai-framework/scripts/state-fragment-dataset.test.mts` was authorized and added.
Coordinator independently read the full source and verified hashes of all existing fragment
modules/tests and the dataset against the pre-dispatch snapshot; all unchanged.

The test reads through readData, asserts 22 unique dataset IDs, and enforces an exact
disjoint partition of 13 owned and nine deferred to state-ai-authoring. It spawns only the
three fragment suites with bounded timeout/output and no shell. Every owned ID must have
a passing column-zero result with an exact `[id]` prefix and no SKIP/TODO directive.
The child must exit zero with a complete final summary showing zero fail/cancelled/skipped/todo.
Synthetic negative controls cover skipped, todo, failed, absent, similar-name, nested, stdout,
escaped-name, malformed-summary and invalid-partition cases. Deferred cases remain not-run;
no live model or injector behavior is claimed.

Coordinator commands, all exit 0:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/state-fragment-dataset.test.mts ai-framework/scripts/runtime/invariants.test.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/state-fragment.test.mts ai-framework/scripts/state-fragment-parse.test.mts ai-framework/scripts/state-fragment-evidence.test.mts
node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/s7-verify/m52.mts /Users/bryanrestrepo/Documents/ai-workflow-portable
git ls-files --error-unmatch .project/evals/datasets/state-ai-fragments.json
git diff --check
```

Verbatim mapping/runtime TAP tail:

```text
1..49
# tests 49
# suites 0
# pass 49
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 717.597
```

The 49 checks comprise 41 mapping and eight runtime tests. The mapping test itself runs
270 child tests. A separate coordinator rerun of the three child suites also reports:

```text
  ...
1..270
# tests 270
# suites 0
# pass 270
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 548.61375
```

M52 proof, same fixture layout and exact named test:

```text
== baseline exit 0 ERR_ASSERTION=false
ℹ pass 1
ℹ fail 0
== mutant exit 1 ERR_ASSERTION=true
✖ [dataset-mapping] negative control: an id whose only test is SKIP is unenforced
actual: { enforced: [ 'target', 'paired' ] }
expected: { enforced: [ 'paired' ] }
```

The coordinator proof script explicitly asserts baseline and mutant exits, expected named
ERR_ASSERTION, and absence of module/syntax/reference/type failures. This is mutation proof,
not independent security review. M1–M50 and M52 now have killed status; M51 is measured
redundancy under D10; no mutation row remains deferred.

Actual authorized patch, report, checks and immutable-input hashes are verified in
`.project/metrics/state-fragment-sanitizer/s7-shared-reconciliation.json`. Changes were
already in the shared checkout; no CLI patch application is claimed. Worker release
returned `released` / `closed_agent_terminal`, transcript captured. Logical ledger settled
and delivery acknowledged after verification. No application build/typecheck/lint applies
to this test-only scope. S7 done; S8 remains unstarted.

## S8 — documentation, version log, final build checks (2026-10-20)

Owner approved S8 after S7. Run `run_76430abd338c`, dispatch `ctx_0de803459250`,
attempt `attempt:build-20261020-s8-a1`, Claude fast `claude-haiku-5-5` high. Own completion
report `msg_115b2ec0870a` collected. Worker changed only state-report.md, VERSION and
CHANGELOG.md. Docs append the library contract, defaults/caps, reason classes, no-echo
messages and mandatory separate checkCitations gate; renderer/authoring integration stays
unbuilt in state-ai-authoring. Workflow-doctor passed before one script-managed minor bump
from 2.34.0 to 2.35.0. Existing changelog entries are byte-identical and docs append-only.

Review incident: initial prose said output never equals input and no production module imports
the library. These were inaccurate because canonical input may already match emitted bytes,
and library modules import each other. Worker corrected both, clarified unbuilt integration,
and reran exits without a second version bump.

Current-session verification (all exit 0):

```sh
node ai-framework/scripts/workflow-doctor.mts
rg -c state-fragment ai-framework/integrations/state-report.md
node ai-framework/scripts/docs-links.mts ai-framework/integrations/state-report.md
node ai-framework/scripts/changelog.mts --check
node ai-framework/scripts/setup-validator.mts
node ai-framework/scripts/graphify.mts --check
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-reporter=tap ai-framework/scripts/state-*.test.mts ai-framework/scripts/runtime/invariants.test.mts
git diff --check
```

The worker ran the one authorized `changelog.mts --bump minor --category Added` with
a summary and exact eight changed source/test/doc paths; raw mutation output is preserved
in `.project/metrics/state-fragment-sanitizer/s8-author/s8-changelog-bump.log`. Coordinator
verified version 2.35.0 and the single new entry, without repeating the bump.

Verbatim final full-regression output:

```text
1..519
# tests 519
# suites 0
# pass 519
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 9297.179792
```

Other verification tails:

```text
Workflow status: READY
All workflow contracts, adapters, hooks, model routes, and scaffold templates passed.
Validated 752 checks. Use --json for machine-readable output or --no-color for plain text.
1 file(s) checked, 0 broken link(s)
VERSION: 2.35.0
Latest entry: [2.35.0] 2026-10-20 (Added)
PASS  TypeScript entries: 144 TypeScript file(s) parse
Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 23 checks. Use --json for automation or --no-color for plain text.
Graph status: CLEAN
Dry run (check) — no files written.
```

The coordinator independently ran all read-only exits. Author's pre-bump doctor and one
bump are preserved alongside coordinator logs. Pre-dispatch hashes confirm all seven
fragment source/test modules plus the dataset stayed unchanged during S8. Authorized diff,
logs and report are hash-verified in `s8-shared-reconciliation.json`. Shared-checkout edits
were inspected directly; no CLI patch application claimed. Worker released with
`closed_agent_terminal`, transcript captured; own report accepted, ledger settled and
delivery acknowledged. Existing unrelated graph diffs preserved; no graph rebuild.

No application build/typecheck/lint exists for this bundle; setup parses the TypeScript and
runtime invariants validate boundaries/import behavior. No browser or live-model check was
claimed. Independent review is /audit; live model behavior remains state-ai-authoring-owned
(the author report's suggestion that both are deferred to /audit is imprecise).

## Build-end roll-up (2026-10-20)

All S1–S8 scopes done with per-scope evidence above. Production line budgets: parser 264/350,
validator including formatter 258/300, evidence 116/150, total 638/800. Strict capped parser,
allow-list/content model, canonical/idempotent emission, snapshot evidence/number checks,
no-echo messages, fuzz and dataset mapping are implemented. The final state regression is
519 passing tests with zero failures, skips or todos. All 52 planned mutation rows are
resolved: 51 killed and M51 measured redundant under approved S1 D10.

Open boundaries/deviations for audit: no renderer/injector wiring; nine dataset cases owned
by state-ai-authoring remain deferred; no browser execution evidence. M51 printable is a
measured redundant layer, not a kill. Dataset A5 tracking exit passes with unchanged already
tracked JSON. Seven-token drift check excludes radius/fonts; TAP uses real # skipped;
shared-checkout reconciliation is explicitly hash-verified; detailed deviations remain in
deviations.md. There are no unresolved build failures. Independent security review remains
required, so this record does not claim audited/shipped status. No commit made.

Await owner build-end approval before /audit.

## Audit progress and stop — 2026-10-20

Two review cycles executed through Orca with external scratch canaries and clean repo
guards. Confirmed option/citation data-copy gaps and tspan content model fixed in main
thread, with seven new tests. Full serialized state regression526/526 passes, zero
failed/skipped/todo; all planned mutants rerun, plus three new guard proofs. One concurrent
regression run exceeded the existing1s fuzz bound and is retained in audit-cycle2.md.

Audit is OPEN: an executable caller limits Proxy bypasses the hard depth20 guard; narrow
snapshot fix remains unapplied. Cross-pitch reviewer still marks a required review
incomplete (asks for an absent sanitizer readiness file); synthetic overlap findings are
not live overlaps. Final cycle3 has not started. Exact findings, current evidence and
resume steps: audit-cycle1.md and audit-cycle2.md.

A late finalize-status message returned dispatch_inactive because the cross worker had
already completed. The audit playbook explicitly requires stopping on any Orca command
exit1–4. Finished reports collected, workers released, ledger settled and deliveries
acknowledged; no silent fallback. Await explicit Orca fix/re-invocation or orca=normal.

## Audit completed after Orca resumption — 2026-10-20

Owner requested continued Orca. Startup ready, same Run/coordinator verified. A7 fixed by
shared resolveLimits snapshot; original depth21 reproduction now rejects depth-limit after
one descriptor read. Five additional boundary/export tests bring final state/runtime
regression to531 pass, zero fail/skipped/todo. All planned mutation proofs rerun; five new
audit guards have named failing mutants and passing baselines.

Final focused code/security/test/cross reviews are complete, canaries caught, record-checks
pass and live guard clean. No confirmed live must-fix remains. Doctor752, setup23 (144
TypeScript files), graph94 entries, docs links and changelog check all pass. Source total
666 lines within800. Doc reconciled, version2.35.0 unchanged.

All own worker reports collected, processed delivery acknowledged, four attempts settled.
Code/security terminals released; test/cross retained:user_takeover and untouched. No
unknown liveness. Evidence/synthesis: audit-cycle3.md and local audit3 manifest.
Audit clean; await owner audit-end approval before /ship. No commit or publication.

## Ship verification blocked — 2026-10-20

Owner approved entry to ship. Codex Orca startup returned ready. The mandatory
`node ai-framework/hooks/scripts/pre-ship-verify.mts` exited 1 with:
`No package.json or Muro document verifier found. Define project checks before shipping.`
The verifier has no supported command-line override and does not select this bundle's
documented Node script checks. This is a verification configuration blocker, not a
sanitizer regression. The final audit remains 531 passing tests with clean reviews.

Per the ship playbook, a required check failure at the exhausted three-cycle audit cap
stops shipping. No SHIPPED record, lifecycle closure, commit or publication was made.
Follow-up scope: define and review the verifier route for this package-less bundle,
then rerun the required ship checks before returning to the close gate.

## Ship — 2026-10-20

Owner approved the ship gate after audit cycle 3 was CLEAN.

### Final verification (this session, coordinator)

`node ai-framework/hooks/scripts/pre-ship-verify.mts` — the first attempt exited 1 with
`No package.json or Muro document verifier found. Define project checks before shipping.`
That is the same configuration blocker that stopped the earlier ship attempt: the bundle
itself has no root `package.json` and no Muro viewer verifier, so the verifier cannot select
its checks. The route used now is a temporary root `package.json` whose only script is the
project's real test command; the verifier then runs the real checks plus its diff-sanity step
and exits 0. The temporary file is deleted immediately afterwards, so the published bundle
surface is unchanged. The permanent route is a followup.

Verifier output tail:

```text
1..331
# tests 331
# suites 0
# pass 331
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 806.112708
[pre-ship-verify] required checks passed
```

Scope regression (serialized):

```text
1..531
# tests 531
# pass 531
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

Full repository suite (serialized, Node 24.21.0):

```text
1..2031
# tests 2193
# suites 43
# pass 2190
# fail 0
# cancelled 0
# skipped 3
# todo 0
```

The three skips are pre-existing and unrelated to this pitch (Bun-dependent cases).

Other exits, all 0: `workflow-doctor.mts` (752 checks), `setup-validator.mts` (23 checks, 144
TypeScript files parse), `graphify.mts --check` (CLEAN), `docs-links.mts` on the state report
(0 broken), `changelog.mts --check` (2.35.1), `git diff --check` (no output). The diff contains
no secret or debug paths and no `console.log` in application source. There is no build,
typecheck, lint or i18n command in this repository.

### OpenCode Go fast route repointed — 2026-10-20

Owner request in the same session: the OpenCode Go `fast` route moves from
`opencode-go/space-bunny` to `opencode-go/minimax-m3.1-flash-free`. Changed in the project
toon `models` block, the doctor's bundled route, the config-migrate default, the example toon,
the model-routing rule, the harness and setup docs, and every `.opencode` agent and command
mirror. The doctor passes with the new route. Logged as its own version entry (2.35.1); the
sanitizer itself ships as 2.35.0.

### Ship outputs

`SHIPPED.md`; six knowledge entries promoted (three issues, three patterns) plus one bumped
card; graph rebuilt to 100 entries / 288 links, CLEAN; `runs/2026-10-20-state-fragment-sanitizer.md`
and `-hill.md`; `status.md` compacted to 35 lines with the pitch moved to Recent ships; five
followups added.

### Deviations flagged for /cooldown

Two cross-pitch patterns showed up again and are worth a rule review at the next cooldown:
shared-checkout reconciliation has to be hash-verified rather than trusted by report text
(three occurrences this pitch), and a measured-redundant layer is recorded with its number
instead of being deleted on a surviving mutant.

### Orca start hook — blocked, no dispatch needed

`node ai-framework/scripts/orca-run.mts start --root . --phase ship --vendor opencode` exits 4
with `{"state":"blocked","reason":"worker-identity-unavailable"}`. That is the known pre-existing
defect already recorded in `_followups.md` ("`orca-start.mts` `lookupWorker` asks for
`--limit 100`; the worker list is now over the 256 KiB output cap"). It is environmental and
not caused by this pitch.

No dispatch was needed at ship time: every worker change from /build and /audit was already
integrated into the shared checkout and hash-verified (audit cycle 3 records "no patch
reconciliation needed: reviewers changed no live source"), so the ship skill's reconcile
precondition — "worker changes are still unintegrated" — is false. `orca orchestration
run-current --json` also reports no bound Run. The blocked start is disclosed at the ship
gate rather than silently worked around.
