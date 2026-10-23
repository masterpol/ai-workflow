# Build log: workflow-usage-capture

## 2026-10-20 — S1: shipped A1 does not satisfy the capture contract

Symptom: the planned phase replacement is rejected, label-free turns retain unknown labels, and resolver sentinels normalize to other.
Root cause: A1 shipped identity and interval support but not the segment replacement, start-label inheritance or sentinel handling required by A2; its existing 58 tests pass.
Disposition: stop at G1 and return the prerequisite to the owner; A1 source files are outside this pitch's allowed scope.

Reproduce from the project root (in memory; no state writes):

```sh
node --input-type=module <<'JS'
import { blankState, normalizeEvent, applyEvent } from './ai-framework/scripts/workflow-metrics-state.mts';
import { createNodeDeps } from './ai-framework/scripts/runtime/node.mts';
const base = createNodeDeps();
let time = Date.parse('2026-10-20T12:00:00.000Z');
const deps = { ...base, clock: { ...base.clock, now: () => time } };
const state = blankState(deps);
function send(input) {
  const result = applyEvent(state, normalizeEvent({ vendor: 'claude', source: 'native',
    sessionId: 'synthetic-session', occurredAt: new Date(time).toISOString(), ...input }, deps), deps);
  time += 1000;
  return { written: result.written, ...(result.reason ? { reason: result.reason } : {}) };
}
console.log('phase start:', send({ eventId: 'p1', kind: 'phase.started', activityId: 'segment:session', pitch: 'fixture', phase: 'plan', scope: 'S1' }));
console.log('turn start:', send({ eventId: 't1', kind: 'agent.started', activityId: 'turn:session', agentKind: 'primary' }));
const turn = Object.values(state.pending).find(entry => entry.kind === 'agent');
console.log('turn labels:', JSON.stringify({ pitch: turn.pitch, phase: turn.phase, scope: turn.scope }));
console.log('phase replacement:', send({ eventId: 'p2', kind: 'phase.started', activityId: 'segment:session', pitch: 'fixture', phase: 'build', scope: 'S2' }));
const sentinels = normalizeEvent({ eventId: 'x', kind: 'phase.started', activityId: 'segment:session', source: 'native', vendor: 'claude', pitch: '(unattributed)', phase: 'build', scope: '(none)' }, deps);
console.log('sentinel normalization:', JSON.stringify({ pitch: sentinels.pitch, scope: sentinels.scope }));
JS
```

Current-session output, exit 0:

```text
phase start: { written: true }
turn start: { written: true }
turn labels: {"pitch":"(unknown)","phase":"(unknown)","scope":"(none)"}
phase replacement: { written: false, reason: 'activity already started' }
sentinel normalization: {"pitch":"(other)","scope":"(other)"}
```

## 2026-10-20 — S1 evidence

State regression check, exit 0:

```text
ℹ tests 58
ℹ suites 0
ℹ pass 58
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8736.612792
```

Latency proxy: p50 88 ms; p95 92 ms. Proposed G1 budget: 250 ms. Concurrent p95: 135 ms (Orca off),
136 ms (Orca on, readiness refused). Capture lease skips: 0/60. Baseline inherited: 0/12.
Orca-on scratch attempts refused with `worker-identity-unavailable`; ready-Orca coexistence remains unverified.
The original `orca=normal` build invocation is unchanged. No attempt to dispatch or fall back occurred.

S1 record checks, exit 0:

```text
S1 required sections: 13/13
S1 verdict lines: 12/12
Privacy guards: 0 matches across all four checks
Live wiring unchanged: exit 0
G1 accepted contract lines: 3/4; A1 contract blocked (expected)
Status index: within 100-line cap
S1 completion withheld; S2 not started
```

`git diff --check`: exit 0. Only active pitch records and the status index changed.


## 2026-10-20 — Approved prerequisite repair

The owner approved the repair. Orca startup initially failed on worker identity; the later cleanup request reset
111 settled dispatch records and their associated task history after verifying all 110 tasks were settled.
The reset used `orchestration reset --tasks`; worker-list then returned 0 rows and startup returned ready.
Read-only pre-reset worker/task/run snapshots and the reset receipt are retained in the system temporary folder.
No worker stop, release, terminal close, message send or new dispatch was issued.

The approved prerequisite extends the capture plan to the A1 state implementation and its regression test plus
the current contract documentation. Historical A1 pitch records are unchanged. Accepted values expand within
schema 2; persisted fields and the lease mechanism are unchanged. The change is recorded as patch 2.37.1.

Implementation: native canonical segment replacement synthesizes one deterministic phase finish inside the same
apply/write. Label-free native agent starts inherit the open segment's labels, with session/vendor isolation and
no retroactive stamping. Explicit resolver sentinels are accepted in their own dimensions and strict stored-state
validation. Other parenthesized labels still fold into the non-matchable other bucket.

The original diagnostic used the shorthand `segment:session` beside a different synthetic session identifier.
The approved capture contract uses `segment:<sessionId>`; the corrected probe substitutes
`segment:synthetic-session` consistently. With that correction, current output is:

```text
phase start: { written: true }
turn start: { written: true }
turn labels: {"pitch":"fixture","phase":"plan","scope":"S1"}
phase replacement: { written: true }
sentinel normalization: {"pitch":"(unattributed)","scope":"(none)"}
```

This is an explicit native convention. Manual phase lifecycle behavior remains unchanged. Duplicate subagent
starts remain rejected; A1-2 must be narrowed to primary replacement at G1. No OpenCode user-message boundary
is claimed. Those are proposed contract amendments, not inferred approval of the event mapping.

Current-session checks:

```text
Node state tests: 63 pass, 0 fail (58 existing plus 5 regression tests)
Bun state tests: 63 pass, 0 fail
Node workflow-metrics and workflow-metrics-report tests: 21 pass, 0 fail
State coverage: lines 99.45%, branches 93.41%, functions 99.24%
Setup validator: READY, 23 checks; 146 TypeScript entries parse
Workflow doctor: READY, 752 checks
Graph check: CLEAN, 107 entries, 308 links
Mutation checks: 5/5 killed; healthy controls pass
```

The mutants removed pitch sentinel preservation, scope sentinel preservation, label inheritance, phase
replacement and the backwards-time guard. Each failed its behavioral assertion; no mutant source was written
to the checkout. Regression tests first failed against the original implementation, before the repair.


Full Node suite, first run (default concurrency), exit 1:

```text
ℹ tests 2317
ℹ suites 43
ℹ pass 2313
ℹ fail 1
ℹ cancelled 0
ℹ skipped 3
ℹ todo 0
ℹ duration_ms 103144.897625
```

Symptom: `[reject-oversize-and-deep] 5 MB path d rejects as geometry when the other caps are raised` exceeded its wall-clock bound at 1525.916334 ms.
Root cause: the existing load-dependent sanitizer test listed at `_followups.md:484`; it has no dependency on workflow-metrics-state and the patch touches neither its test nor implementation.
Check: exact failing test passes alone (exit 0, 1 pass, 0 fail, 335.236208 ms); rerun the full suite with `--test-concurrency=4` to reduce unrelated CPU contention. No sanitizer fix is included.

Orca startup root cause confirmed: the saved 100-row worker-list response is 268,003 bytes; `orca-preflight.mts`
exports a 256 KiB (262,144-byte) receipt cap. The worker-identity lookup could not accept that response. Resetting
settled task/dispatch history shrank the list to zero and restored the ready verdict. Cleanup resolves the current
incident; reducing worker-list page size or projection size is a separate followup, not part of this repair.

Full suite retry with `--test-concurrency=4`, exit 1:

```text
ℹ tests 2317
ℹ suites 43
ℹ pass 2297
ℹ fail 17
ℹ cancelled 0
ℹ skipped 3
ℹ todo 0
ℹ duration_ms 126257.408583
```

The same sanitizer wall-clock test took 1129.252375 ms. Its dataset child invocation also failed (346 of 347),
producing the documented 16 dataset-mapping failures. All 17 failures map to the existing followup at
`_followups.md:484`; none imports or tests the changed workflow state. The exact sanitizer test passes alone.
No third full-suite run or unrelated sanitizer edit was attempted. Prerequisite P0 remains downhill 75%, since
full-suite success is not evidenced. An explicit baseline exception or a separate sanitizer fix is needed to
complete that exit. Capture mapping approval (G1) is still pending; S2 has not started.

`git diff --check`: exit 0. Source untyped-validator guard: 0 matches. Status index: 35 lines.
The changelog skill recorded the logical repair as 2.37.1 after workflow-doctor passed; this is a working-tree
release record, not a claim that audit or ship has completed. No commit, merge or publication occurred.


## 2026-10-20 — Owner approval: prerequisite exception and G1

The owner replied Approve after the prerequisite verification report. This accepts the documented sanitizer
baseline exception and G1 amendment presented with that report; it does not waive new failures. Startup is ready.
P0 and S1 are complete with their existing evidence and this explicit exception. S2 opens on the main thread,
after the A1 prerequisite; no concurrent writer or alternate-vendor dispatch is needed for this sequential scope.

## 2026-10-20 — S2 pure event mapper

Implemented `mapClaudeEvent` and `mapOpenCodeEvent` in the new `workflow-capture.mts`, with a synchronous injected
resolver, explicit clock input and optional hash dependency. The module creates no files, reads no snapshot and
has no command entry yet. CLI/deadline/lease work remains S3. The 115-line mapper is one cohesive utility unit:
both vendors share its bounded identity, event envelope and phase-label selection; splitting it would obscure
the shared privacy boundary. This is the documented exception to the generic 80-line utility guideline.

Claude mapping covers session start, primary and subagent starts/finishes, both phase-start paths, and the two
cancelled SessionEnd units. Turn/agent/end events never copy labels or consult the resolver. Resolver arguments
are passed only to the injected callback; only its three validated labels enter a phase event. Ignored text-field
getters are never evaluated. Native identifiers are bounded to 96 characters so prefixed activities fit A1's cap;
unknown/oversized/wrong-type metadata and invalid clock inputs produce no events.

OpenCode V2 steps use unknown agent kind: a step is a verified activity interval, but not a verified user turn.
The A1 integration test observes two matched intervals, 2,000 active ms and zero wait or primary turns. V1 messages
and unverified user/idle boundaries emit nothing. A skill metadata envelope can open a phase through the resolver.

Identity detail: the event hash includes only the selected envelope and unit, including event kind. SessionEnd's
two units therefore have distinct identifiers. Identical selected metadata and clock input deduplicate; two
separately launched hook processes with different clock readings are not guaranteed to deduplicate. The plan's
stronger claim about independently duplicated registrations is not established; S4/S5's one-registration checks
remain required. No raw arguments or ignored text enter the hash.

Current-session Node command:
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/workflow-capture.test.mts`
exit 0 (coverage run below executes the same tests with instrumentation). Bun command:
`bun test ai-framework/hooks/scripts/workflow-capture.test.mts`, exit 0:

```text
 12 pass
 0 fail
Ran 12 tests across 1 file. [19.00ms]
```

Node runtime invariants:
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/invariants.test.mts`, exit 0:

```text
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 320.532541
```

These prove silent import, direct-entry discipline for executables, dependency injection and no live JavaScript.
The pure S2 library has no main or runDirect call; S3 will introduce both together.

Source grep exits are 1 with count `0`, which is the required no-match result for each guard:

```text
Untyped validators: 0
Forbidden text-field reads: 0
Token snapshot references: 0
Copied phase set: 0
G1 contract records: 4/4
Mapper/test lines: 115 185
```

In-memory mutation evidence, exit 0:

```text
Killed: text privacy
Killed: label-free Stop
Killed: identifier cap
Killed: identifier allow-list
Killed: metadata cap
Killed: argument cap
Killed: pitch validation
Killed: phase validation
Killed: scope validation
Killed: nonnegative time
Killed: integer time
Killed: ISO year bound
Killed: subagent isolation
Killed: continued Stop
14/14 mutants killed; healthy controls pass
```

The text mutant copies a text marker into the activity identity and fails the marker assertion. The Stop mutant
adds a pitch and fails the label-free assertion. Other mutants remove each selected-field guard and fail its
behavioral check. Mutant modules were loaded in memory; source files were never replaced.

Initial test-fixture incident:
Symptom: the OpenCode sequence test measured 1,000 active ms instead of 2,000 (11 pass, 1 fail).
Root cause: the fixture's collector clock was already five seconds ahead before earlier intervals were applied; A1 correctly clipped the later-arriving old interval behind its fold frontier.
Fix: advance the injected collector clock with each event, matching the approved single-clock-per-vendor model. All 12 tests now pass without changing A1.

No application build applies to this library. All planned S2 exits are evidenced. S2 completion awaits the
big-batch per-scope approval before S3 can start; no adapter is wired or automatically collecting events yet.

Node coverage command: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test --experimental-test-coverage --test-coverage-include='**/workflow-capture.mts' ai-framework/hooks/scripts/workflow-capture.test.mts`, exit 0:

```text
✔ maps OpenCode skill metadata through the resolver and ignores V1 messages and unverified user events (0.159417ms)
✔ ignores malformed OpenCode events and does not leak step text or error values (0.12275ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 102.207792
ℹ start of coverage report
ℹ ------------------------------------------------------------------------
ℹ file                    | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------------
ℹ ai-framework            |        |          |         |
ℹ  hooks                  |        |          |         |
ℹ   scripts               |        |          |         |
ℹ    workflow-capture.mts |  98.26 |    99.05 |  100.00 | 113-114
ℹ ------------------------------------------------------------------------
ℹ all files               |  98.26 |    99.05 |  100.00 |
ℹ ------------------------------------------------------------------------
ℹ end of coverage report
```

`git diff --check`: exit 0. S2 implementation is limited to its two new files.

## 2026-10-20 — S3 bounded hook entry and writer

The owner approved S2. Startup returned ready. Implemented the CLI with a 64 KiB bounded stdin read, a second
UTF-8 byte check, trusted root/vendor arguments, real `resolvePhaseContext`, silent stdout and a closed set of fixed
stderr lines. Main always returns 0, including malformed input, write failures and unavailable diagnostics.
`captureWorkflowEvent` exposes the same in-process boundary for S6; no plugin change or hook registration occurs here.

Mapping runs before any metrics operation. Non-phase calls never acquire a lease or create the metrics directory.
One wall-clock reading supplies the firing's timestamp. A shared 3,000 ms monotonic budget covers input and all
mapped units. Before each writer call the budget is checked; each event gets at most two outer calls, while A1
retains its own existing internal bind retries. No timer or forced exit can interrupt an acquired write. SessionEnd
writes its two cancelled units sequentially, still attempts an independent segment close after a failed turn
write when budget remains, and emits at most one fixed diagnostic for the invocation.

Tests use injected in-memory `net.tryListen` in every writer fixture. A complete marked Claude sequence yields
four matched finishes (two primary, one subagent, one phase), 4,000 active ms and 1,000 wait ms, with strict state
validation. A token-file read spy observes no snapshot read; its LEGACY-MARKER contents are unchanged. Recursive
reads of every fixture metrics file plus stderr find no CAPTURE-TEXT-MARKER. Both phase paths agree with a direct
call of the real resolver, including unattributed fallback. Replays preserve bytes. Failed writes and elapsed
budgets leave no temporary file; successful acquired writes finish even if the injected clock passes the budget.

Busy-first recovery makes exactly two outer attempts and sweeps one A1 refusal marker. Always-busy capture
makes two attempts, leaves state bytes unchanged, and the next successful write sweeps two refusal markers.
These counters describe A1's refused write attempts, including recovered attempts, not exact permanent event loss.

C-A1 check: the original literal grep returned 0 because the state uses `SCHEMA_VERSION`. The corrected executable
assertion confirms exported schema 2 (exit 0); the start-state suite passes 63/63 (exit 0). This equivalent start
check is recorded in the active plan. C-RES exported-function check: 1, exit 0. Real resolver import check: 1.
Test `tryListen` occurrences: 2. No A1 or token-consumption source edit was needed in this scope.

In-memory S3 mutations, exit 0:

```text
Killed: pre-lease phase rejection
Killed: two-attempt retry limit
Killed: pre-acquisition deadline
Killed: input byte guard
4/4 S3 mutants killed; healthy controls pass
```

The first removes effective non-phase rejection by providing fallback phase labels after a null resolver result;
the zero-lease assertion fails. Raising the retry loop to three fails the two-call count. Removing the deadline
check acquires after budget expiry. Removing the byte check fails the oversized-input diagnostic assertion.
All mutants were loaded in memory; no production source replacement occurred.

Final-session exit commands:

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/workflow-capture.test.mts`
  — exit 0, 25 tests pass, 0 fail. The combined required Node command is also run with coverage below.
- `bun test ai-framework/hooks/scripts/workflow-capture.test.mts` — exit 0:

```text
 25 pass
 0 fail
Ran 25 tests across 1 file. [109.00ms]
```

- `node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/runtime/invariants.test.mts`
  — exit 0:

```text
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 660.628083
```

Untyped-validator, forbidden text-read, token-snapshot-reference and copied-phase-set guards all report 0.
The direct-entry guard occurs exactly once. The two-file S3 diff is limited to the owning adapter/test pair;
tracking records are updated separately. No application build applies. `git diff --check`: exit 0.

Combined Node exit command, with coverage: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test --experimental-test-coverage --test-coverage-include='**/workflow-capture.mts' ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/scripts/workflow-metrics-state.test.mts ai-framework/scripts/workflow-metrics.test.mts`, exit 0:

```text
✔ reports JSON, Markdown and HTML without reading stdin or creating an empty event snapshot (36.182708ms)
✔ keeps a root-resolution failure in fixed error output (0.54925ms)
ℹ tests 94
ℹ suites 0
ℹ pass 94
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10698.230208
ℹ start of coverage report
ℹ ------------------------------------------------------------------------
ℹ file                    | line % | branch % | funcs % | uncovered lines
ℹ ------------------------------------------------------------------------
ℹ ai-framework            |        |          |         |
ℹ  hooks                  |        |          |         |
ℹ   scripts               |        |          |         |
ℹ    workflow-capture.mts |  98.96 |    99.35 |  100.00 | 117-118
ℹ ------------------------------------------------------------------------
ℹ all files               |  98.96 |    99.35 |  100.00 |
ℹ ------------------------------------------------------------------------
ℹ end of coverage report
```

`node ai-framework/scripts/setup-validator.mts`, exit 0:

```text
PASS  CLAUDE.md: carries the caveman response-style section
PASS  Knowledge graph: graphify validated 107 entry(ies)
PASS  Workflow doctor: portable workflow contracts passed
PASS  TypeScript entries: 148 TypeScript file(s) parse

Setup status: READY
Generated setup artifacts and portable workflow contracts passed.
Validated 23 checks. Use --json for automation or --no-color for plain text.
```

S3 is complete with evidence. Await big-batch scope approval before S4 wiring.


## 2026-10-20 — S4 start

The owner approved S3. Startup returned ready. C-WIRE passes: each wiring file contains one token phase-start
command, and token-attribution's main-session Stop recommendation has one recorded owner decision. The existing
Stop/token groups and Orca ordering are retained. Plan: eight capture-only groups, template and live settings
updated together; per-group identity, exact command under sh, migration propagation/idempotence and real-command
latency/coexistence checks. The planned S4 commit must include both wiring files and the adapter it references.

## 2026-10-20 — S4 Claude wiring and sync propagation

Updated the wiring template and live Claude settings together, adding eight independent capture-only groups:
SessionStart, UserPromptSubmit, Stop, SessionEnd, SubagentStart, SubagentStop, UserPromptExpansion, and PostToolUse
with matcher Skill. All other capture matchers are star. Every group runs the exact Node-prefixed adapter command
with timeout 5 and a description. Existing token and Orca groups are deep-equal to their pre-S4 values; capture is
appended after them. Main-session token Stop remains a separate unchanged group. Codex wiring is unchanged.

Tests compare event, matcher, command, timeout and description per capture group; both files have exactly eight,
with no extra capture event. The actual registered command runs under sh with only Node on PATH, despite a Bun
environment and Bun project-root runner setting. It records an event with empty stdout/stderr. Without Node the
shell exits non-2 with empty stdout and state bytes unchanged. Migration adds all eight groups beside the existing
Orca/token groups, preserves their data and order, is idempotent on the second run, and retains an existing wrapped
capture command rather than adding a duplicate. No migration implementation change is needed.

Exact-command latency, thirty fresh-process runs under sh per condition (wall time):

```text
Measured p95 ms: 100
Budget p95 ms: 250
Concurrent p95 ms: 142/149
Coexistence lease skips: 0/60
Recorded native starts: 30 sessions, 60 phases; no drops or temporary files
```

Standalone p50 was 91 ms. Orca-off coexistence p50/p95 was 132/142 ms; Orca-on was 135/149 ms. Each coexistence
round ran capture, the exact Orca UserPromptExpansion command and the real token-attribution phase-start command
concurrently on one scratch metrics directory. All capture/token commands exited 0. Orca-off exited 0; Orca-on
refused all 30 scratch probes with policy-missing. This measures coexistence beside readiness refusal, not beside
ready worker dispatch; that same limitation was accepted at G1. No Run or worker was launched. The current
coordinator's separate startup was ready. Capture skips are 0/60 against S1's 0/60 (allowed ceiling 1).
The read-only Node budget/count comparison exits 0, and verifies 30 session starts, 60 phase starts, 59 derived
phase finishes, zero refused attempts and zero leftover temporary files. The budget is 250 ms; max observed p95
is 149 ms. Added process counts remain two per plain turn and one per phase start.

Content checks: both files parse as JSON; exact-command grep count is 8 in each; all capture groups have timeout 5
and exactly one command. Existing groups are unchanged. `git diff --check`: exit 0.

Node regression command:
`node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/hooks/scripts/orca-start-hook.test.mts ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/runtime/migrate.test.mts ai-framework/scripts/runtime/upgrade.test.mts ai-framework/hooks/scripts/token-consumption.test.mts`, exit 0:

```text
ℹ tests 223
ℹ suites 0
ℹ pass 222
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 41829.212541
```

The one pre-existing skip is the Bun-only doctor syntax test when this suite runs under Node.
`bun test ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/scripts/runtime/migrate.test.mts`, exit 0:

```text
 45 pass
 0 fail
Ran 45 tests across 2 files. [273.00ms]
```

`node ai-framework/scripts/setup-validator.mts`, exit 0: READY, 23 checks, 148 TypeScript entries parse.
There is no application build. S4 requires the implementation commit to contain both wiring files; that check is
performed after the atomic source commit, before the hill moves to done.

Fixture incident:
Symptom: the first shell test rejected the absent-Node error wording even though the shell exited non-2 and left state unchanged.
Root cause: this host's sh says No such file or directory instead of not found.
Fix: accept either platform wording while retaining the exact status/stdout/state assertions; all 45 targeted Node/Bun tests now pass.

S4 atomic implementation commit: `866c68e` (`feat: workflow-usage-capture through Claude wiring`).
It includes both wiring files and the referenced adapter, its tests, migration test, and the approved A1 prerequisite.
`git show --name-only --format= 866c68e | grep -cE '^ai-framework/hooks/hooks\.json$|^\.claude/settings\.json$'`
exits 0 and prints `2`. `git cat-file -e 866c68e:ai-framework/hooks/scripts/workflow-capture.mts` exits 0.
The commit changes exactly 10 implementation/release files (tracking records excluded), so no registration points
at an absent adapter in that revision. S4 is done with all planned exits evidenced; next is the scope approval gate.

Terminal table padding was trimmed before the first record commit to pass staged Git whitespace checks; reported command results are unchanged.

## S5 — doctor validation — 2026-10-20

Owner approved S4. Build startup returned ready / launch-allowed for Codex; no worker dispatched.
S5 runs sequentially on the main checkout to preserve the per-scope approval gate before S6.
Test strategy: exercise the public doctor entry with injected runtime dependencies and canonical settings;
change one registration at a time to prove exact command, timeout, type, matcher and cardinality checks.
Check absent capture as a warning and unexpected event as a failure without reflecting arbitrary input.
Baseline live doctor exits 0 with no failures. Add adapter and test to presence/parse checks.

S5 completion evidence (all commands run in this session):

```text
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/workflow-doctor.test.mts
exit 0
 tests 72
 pass 71
 fail 0
 skipped 1 (existing Bun-only test)
$ bun test ai-framework/scripts/workflow-doctor.test.mts
exit 0
 72 pass
 0 fail
 Ran 72 tests across 1 file.
$ node ai-framework/scripts/workflow-doctor.mts --json
exit 0; failures: 0
 Claude capture wiring: pass
 eight capture events wired exactly once with the Node runner and 5s timeout
 workflow-capture.mts: present; valid Node.js syntax
 workflow-capture.test.mts: present; valid Node.js syntax
$ node --disable-warning=ExperimentalWarning /tmp/workflow-capture-s5-mutants.mjs
exit 0
 Killed: exact command
 Killed: timeout
 Killed: matcher
 Killed: type
 Killed: duplicates
 Killed: absent warning
 6/6 S5 mutants killed by actual doctor tests
$ node ai-framework/scripts/setup-validator.mts
exit 0
 PASS Workflow doctor: portable workflow contracts passed
 PASS TypeScript entries: 148 TypeScript file(s) parse
 Setup status: READY
 Validated 23 checks.
```

The in-memory command mutant replaces `entry.hook.command !== expected` with
`!entry.hook.command.includes(expected)`; the actual echoed-command test fails with AssertionError.
Other mutants remove the timeout, matcher, type and cardinality guards, or turn absent-capture warning
into failure. Each is killed by its corresponding actual doctor test. Dynamic modules and temporary
wrappers live under /tmp; repository sources are never swapped for mutation testing.

Source checks: `Claude capture wiring` occurs once; `workflow-capture.mts` occurs five times including
its presence/parse list entry. Added lines have zero explicit any validators. `git diff --check` exits 0.
No application build applies to this workflow bundle; no new dependencies or runtime imports are added.
S5 changes only the planned doctor source/test pair. S5 is done; S6 remains unopened pending scope approval.

## S6 — OpenCode capture — 2026-10-20

Owner approved S5. Build startup: ready / launch-allowed; no dispatch performed.
C-OC passes: G1 says OpenCode pair: not-chosen. Graph query on plugin/lifecycle/lease found existing
runtime, state and collector tests. Existing approved S6 behavior criteria define the integration strategy:
real V1/V2 host hooks and metrics files, matched/failed V2 intervals, absent V1 intervals and wait,
phase skill resolver, privacy markers, malformed/rejected writes, and settled-token-before-capture order.
No new E2E or application build applies. S6 follows S5 sequentially on the coordinator checkout.
Before edits: 12 serial Node plugin test runs all exit 0 (0 failed runs), logs /tmp/capture-s6-baseline-N.log.

S6 completion evidence (current session):

```text
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test --experimental-test-coverage ai-framework/hooks/scripts/opencode-plugin.test.mts ai-framework/hooks/scripts/workflow-capture.test.mts
exit 0
 tests 43
 pass 43
 fail 0
 cancelled 0
 skipped 0
 token-consumption.ts: 98.00% lines, 85.71% branches, 100% functions
 workflow-capture.mts: 98.96% lines, 99.36% branches, 100% functions
$ bun test ai-framework/hooks/scripts/opencode-plugin.test.mts
exit 0
 16 pass
 0 fail
 Ran 16 tests across 1 file.
$ 12 serial Node plugin test runs (same command as baseline)
exit 0
 baseline: 12 runs; 0 failed runs
 post-change: 12 runs; 0 failed runs
 exit codes: [0,0,0,0,0,0,0,0,0,0,0,0]
$ node ai-framework/scripts/setup-validator.mts
exit 0
 PASS Knowledge graph: graphify validated 107 entry(ies)
 PASS Workflow doctor: portable workflow contracts passed
 PASS TypeScript entries: 148 TypeScript file(s) parse
 Setup status: READY
 Validated 23 checks.
$ source guards
exit 0
 C-OC OpenCode pair: not-chosen: true
 pinned recordEvent import: 1
 workflow-capture.mts import: 1
 added explicit any validators: 0
$ git diff --check
exit 0
```

Detailed logs: /tmp/capture-s6-{node,bun,coverage,setup}.log and
/tmp/capture-s6-{baseline,post}-1.log through -12.log. The coverage run is also the required combined
Node command (same test files, with coverage enabled); the earlier non-coverage run passed 43 tests too.

Six added behavior tests exercise matched completed/failed intervals (positive active time), absent V1 and
unverified user intervals, both vendors' phase-skill entrypoints, text-marker exclusion from every metrics
file, and token-settlement ordering with rejecting capture calls. Existing token assertions are unchanged.
The order/rejection test compiles the actual plugin in memory under Node, replacing only its two imports
with spies; a held token promise proves capture waits for settlement. It covers V1 tool, V2 tool and V2
step-stream dispatch, and malformed data cannot terminate the stream. Existing S3 tests separately contain
writer rejection inside the real capture entry. No plugin test uses an installed OpenCode server; the live
V2 API and wait-boundary uncertainty from G1 remain unchanged.

The V2 fixture now acknowledges an event when the subscriber requests its next event, after all awaited
writes settle. It also removes an immediately delivered event from the queued copy, preventing accidental
replay by the fixture. This avoids deleting the scratch directory after token write but before capture write.
No production stream behavior or token collector code is changed. Only the planned plugin/test files changed.
S6 is done; S7 docs/rollout/release remains unopened pending the scope gate.

## S7 — docs and rollout — 2026-10-20

Owner approved S6. Build startup: ready / launch-allowed; no dispatch performed.
Add only the planned harnesses paragraph, run the approved archived-base scratch sync, full Node/Bun suites,
validators and privacy/file-budget checks. The feature release bump remains at /ship per the approved plan;
VERSION stays at the prerequisite repair's 2.37.1 during build. S6's phrase "both vendors' phase-skill
entrypoints" refers to the two OpenCode versions, V1/V2, rather than separate vendors.

S7 incidents:

Symptom: the default Node full suite exits 1 with 17 failures (16 dataset-mapping cascades and the geometry timing case).
Root cause: the existing sanitizer wall-clock assertion took 4068.54 ms under concurrent suite load; matches `_followups.md:472,484` and the G1-approved baseline exception.
Resolution: the exact geometry test passes alone (exit 0); retain the documented baseline exception without changing unrelated tests or claiming a green full Node run.

Symptom: the first Bun full run hit the review-bench CLI's 5-second test deadline and was stopped by the external 180-second probe limit while still making progress.
Root cause: running the Node and Bun full suites together saturated subprocess-heavy tests; this is not evidence of a Bun stall.
Resolution: all 32 review-bench tests pass alone; rerun the complete Bun suite without concurrent Node and with a 900-second outer guard. Do not accept the earlier partial run as completion evidence.

Cross-pitch check: token-attribution is shipped; its collector source remains unchanged by capture. The only
other active pitches are shaped workflow-v3-rollout and test-execution-performance; neither has an active
implementation diff to merge. Rollout owns actual project migration; the performance pitch owns any future
execution-mode changes. S7 changes no runner settings, timeouts, assertions, dependencies or CI discovery.
The RN-shaped fixture's counts, byte-preservation proof and remaining doctor choices live only in rollout.md.

S7 completion evidence (current session):

```text
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test ai-framework/scripts/skill-vendors.test.mts ai-framework/scripts/workflow-contracts.test.mts
exit 0
 tests 28
 pass 28
 fail 0
 skipped 0
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test 'ai-framework/**/*.test.mts' '.claude/**/*.test.mts'
exit 1 (G1-approved pre-existing baseline exception)
 tests 2363
 pass 2343
 fail 17
 cancelled 0
 skipped 3
 duration_ms 120760.052667
$ node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern='5 MB path d rejects' ai-framework/scripts/state-fragment.test.mts
exit 0
 tests 2
 pass 2
 fail 0
 duration_ms 509.5325
$ bun test ai-framework
exit 0 (complete rerun without concurrent full Node suite)
 2338 pass
 3 skip
 0 fail
 Ran 2341 tests across 71 files. [276.23s]
$ bun test ai-framework/scripts/review-bench.test.mts
exit 0
 32 pass
 0 fail
 Ran 32 tests across 1 file. [3.62s]
$ node ai-framework/scripts/setup-validator.mts
exit 0
 PASS TypeScript entries: 148 TypeScript file(s) parse
 Setup status: READY
 Validated 23 checks.
$ node ai-framework/scripts/graphify.mts --check
exit 0
 Knowledge graph: 107 entries (16 decisions, 50 patterns, 2 entities, 39 issues), 308 links.
 Graph status: CLEAN
 Dry run (check) — no files written.
$ node ai-framework/scripts/workflow-doctor.mts --json
exit 0; failures: 0; Claude capture wiring: pass
$ node ai-framework/scripts/changelog.mts --check
exit 0; VERSION: 2.37.1
$ post-suite privacy, content and budget assertions
exit 0
 metrics files containing CAPTURE-TEXT-MARKER: 0
 all required harnesses paragraph phrases: present
 rollout.md: present
 implementation/release budget: 15 files, 1317 added LOC, 11 removed LOC
$ git diff --check
exit 0
```

All 17 Node failures are matched by name to pre-existing `_followups.md:472,484`: the
`[reject-oversize-and-deep] 5 MB path d rejects as geometry when the other caps are raised` timing test,
and all 16 `[dataset-mapping]` failures propagated from that child test. No capture, plugin, doctor,
registration or migration test failed. This uses the baseline exception the owner approved at G1;
it does not claim a successful complete Node run. The standalone geometry case took 370.06 ms.
Bun's complete final run has no failures, so the initial loaded review-bench failure is not retained
as an exception. S6 already established zero failed lease runs before and after capture integration.

S7 scratch commands exit 0; all capture counts and raw Orca-group byte comparisons are in rollout.md,
along with the two intentionally retained target-doctor failures and the workflow-v3-rollout handoff.
No real application project was synced. The source doctor has no new or existing failure.

Build-end roll-up: P0 and S1–S7 are done with command evidence. The approved prerequisite repair,
cohesive adapter module, corrected budget measurement, sequential scope execution, and baseline Node
exception are documented in deviations.md. No unresolved implementation incident remains. Feature release
numbering, knowledge extraction and ship reconciliation remain in /ship after audit. Next gate: approve
S7/build completion to enter /audit; do not auto-advance.

## Audit preparation — 2026-10-20/21 UTC

Owner approved build completion. Audit startup returns ready / launch-allowed. Required passes are code,
security, test coverage and cross-pitch conflict. UI, i18n and AI-prompt eval passes are not applicable.
Selected Orca executable: orca. Run-current was null; created and bound Run `run_6b7b13c50a79` with the
objective of auditing capture build `1051eb6`, coordinator `term_05ddb0fd-931b-42c2-9375-71fd2211ddbc`.
Run and intended prompt/model records are under `.project/metrics/workflow-usage-capture-audit/`.

Four separate scratch copies were prepared with review-bench. Each healthy selected privacy test passed;
a planted prompt-field leak makes that scratch test fail. The hidden manifests remain outside the scratch
copies. No reviewer has seen a manifest or findings. Code/security were configured for explicit standard
Claude Sonnet; coverage/cross-pitch for explicit fast OpenCode. Cross-vendor reviews would be labelled as
such rather than claiming same-model-family independence from the Codex author.

Symptom: first code-review dispatch exits 3, `{"route":"normal","reason":"brief-control-character:change"}`.
Root cause: the coordinator placed multiline prompt text in the change field; workerBrief forbids control characters including newlines in each field.
Next repair: flatten field whitespace and enforce field/total lengths locally before another dispatch; do not silently retry after a refusal.

No successful launch receipt or reviewer completion exists. Audit cycle 1 has not obtained any required
review; it remains open. No audit findings or clean-audit claim can be inferred from scratch preparation.
The phase stops here per AGENTS.md and orca-vendors.md's explicit refusal contract, pending the owner's
choice to fix and retry Orca or re-invoke audit with orca=normal. The bound Run is preserved.

The source review-bench guard snapshot was created, but its later check refuses `the snapshot file is too
large` (exit 1). This is the existing growth issue in `_followups.md:481`; no reviewer ran between those
calls. A verified bounded guard/witness is also required before review can proceed. Do not claim the failed
guard as read-only proof. Scratch preparation added no production files or source edits. Only live tracking
and this log are modified. No worker was launched or released, and no mail delivery was received.


### Audit retry after approved brief repair — 2026-10-21

Normalized briefs pass workerBrief locally. Code/security launches succeed; own worker_done reports accepted,
canaries caught, reports preserved, but unfinished checklists require fresh narrower reviews. Both settled
workers were released, ledger attempts settled, deliveries acknowledged, and independent witness unchanged.

Symptom: OpenCode coverage dispatch exits 3 with route blocked / launch-failed:unproven.
Root cause: launch receipt did not provide proven success or clean failure; exact execution-host cause remains unverified.
Next action: preserve unknown-liveness ownership and ask fix/recover Orca vs explicit orca=normal; never retry from worker-list absence.

See audit-cycle-1.md for exact Dispatch IDs, role completeness, canary evidence and retained observations.
Cross-pitch was not dispatched after refusal. No source patch or audit approval is claimed.


### Audit recovery and completion — 2026-10-21

Owner approved recovery. Runtime source inspection plus installed OpenCode 2.1.1 proves model-pin preflight
fails before Task/Dispatch creation (only 1.18.30, 1.18.32, 2.0.16 supported). The old unknown ledger entry
was classified failed from that positive code-path evidence; remaining work used configured Claude via Orca.
Fresh code/security gap rechecks and coverage/cross-pitch reviews completed. Requested/effective model
receipts verify claude-sonnet-5-5. All six successful workers' own reports were accepted, resources released,
ledger entries settled and deliveries acknowledged. The source witness remained clean throughout review.

All reviewer must-fixes were planted canaries, verified absent in source. One missing-test assertion was
refuted by existing tests at workflow-doctor.test.mts:942-977 and a 4/4 rerun. Documentation wording and the
pre-existing OpenCode steps Map retention concern are deferred with named owners in _followups.md.
No production patch was needed. Audit-cycle-1.md contains the complete per-role synthesis and proof.

Author-run command: node --experimental-strip-types --disable-warning=ExperimentalWarning --test
ai-framework/hooks/scripts/workflow-capture.test.mts ai-framework/hooks/scripts/opencode-plugin.test.mts
ai-framework/scripts/workflow-doctor.test.mts ai-framework/scripts/workflow-metrics-state.test.mts
ai-framework/scripts/runtime/migrate.test.mts
Exit 0: tests 196 / pass 195 / fail 0 / skipped 1. Doctor exit 0 (zero failures); setup READY (23 checks,
148 parsed entries); graph CLEAN (107 entries, 308 links). No full-suite rerun was needed after the already
recorded build gauntlet because the audit changed only records. The accepted Node baseline exception remains.

Audit is complete at cycle 1 with zero confirmed must-fixes. Gate: owner approval before /ship.


## Ship preparation — 2026-10-21

Owner approved entering ship. Startup returned ready / launch-allowed. All audit worker changes were
read-only; their attempts are settled and no unintegrated worker patch needs reconciliation.
The required pre-ship wrapper was invoked and exits 1: "No package.json or Muro document verifier found.
Define project checks before shipping." It ran no project checks. This existing package-less-bundle route
failure is documented in _followups.md:366,463,473 and the prior workflow-usage-state SHIPPED.md. No
package.json was invented, no unrelated Muro tool was added, and the wrapper is not reported as passed.
Shipment remains gated pending an explicit decision to use the existing actual-command fallback or repair
the wrapper. Subsequent work here is preparatory evidence; no pitch closure is claimed.

The actual complete Node suite was run serially to avoid the known sanitizer wall-clock flake without
changing tests or skips. Command: node --experimental-strip-types --disable-warning=ExperimentalWarning
--test --test-concurrency=1 'ai-framework/**/*.test.mts' '.claude/**/*.test.mts'. Exit 0: 2363 tests,
2360 pass, 0 fail, 3 existing skips, duration 344314.775083 ms. This supersedes the earlier need to use
a Node baseline exception for final verification; it does not change global runner settings or promote
a benchmark optimization. A complete Bun suite is being run separately to avoid concurrent full-suite load.

The source doctor passes before release preparation. changelog.mts --check read 2.37.1, then its --bump
minor / --category Added invocation prepared VERSION 2.38.0 and the matching entry. This is a reviewable
local release preparation, not a published release or closed pitch. No application build, typecheck,
lint or i18n command exists in this bundle (stack.md), so none is invented or claimed successful.

Knowledge preparation: 3 issue cards (native state attribution, Orca model preflight ownership, guard
snapshot/read-cap mismatch), 1 observational-hook lease-budget pattern, 2 existing issue confidence
bumps (exact wiring and reviewer-claim measurement). Graphify rebuild exits 0, writes graph.json,
GRAPH_REPORT.md and knowledge index; validation is CLEAN with 111 entries and 317 links. Generated graph
artifacts are mandatory ship bookkeeping, separate from the 15 implementation/release-file budget.

Audit evidence archival: moved the known local audit folder into runs/2026-10-21-workflow-usage-capture-audit-evidence.tar.gz after verifying every member's SHA-256 against its source. The adjacent manifest preserves names/hashes and the archive digest. Local copies were removed only after exact archive verification; all original reports/prompts/receipts remain recoverable. Historical records referencing the old metrics folder are preserved. A post-archive recursive marker scan of .project/metrics has zero matches, including all remaining collector state and ledger files.


Final actual-command verification preparation completed:

```text
Node complete suite: exit 0; tests 2363; pass 2360; fail 0; skipped 3; duration_ms 344314.775083
Bun complete suite: exit 0; 2338 pass; 3 skip; 0 fail; 2341 tests / 71 files / 298.34s
Node changelog + skill-vendors + workflow-contracts: exit 0; 38 pass; 0 fail
setup-validator: exit 0; READY; 23 checks; 148 parsed TypeScript entries
workflow-doctor --json: exit 0; failures 0
graphify --check: exit 0; CLEAN; 112 entries; 319 links
graphify rebuild: exit 0; graph, report and index regenerated
recursive .project/metrics CAPTURE-TEXT-MARKER scan: 0 files
implementation/release budget from 868212b excluding project records and generated graph: 15 files / 1325 added LOC / 11 removed LOC
mandatory generated graph bookkeeping: graphify-out/graph.json and GRAPH_REPORT.md
```

Knowledge total: 4 issues promoted (including the recurring package-less ship-wrapper issue), 1 new
pattern, 2 confidence updates. All new entries have valid IDs, tags and existing related links.
Release 2.38.0 is prepared locally through changelog.mts. The generic pre-ship wrapper still exits 1 and
is not claimed to pass. Audit cycle 2 V1 remains open until an explicit actual-check fallback approval
or a separate route repair. ship-readiness.md is the complete reconciliation for that decision.
No SHIPPED.md or Recent ships entry is created before the final decision. Planned run archives are
snapshots of preparation, not proof the owner closed the pitch. No tag, push or real-project sync occurred.


## Final closure — 2026-10-21

The owner explicitly approved the documented package-less verification fallback and closing v2.38.0 with “Approve”. V1 is resolved by that approved exception, not by a wrapper repair: pre-ship-verify.mts still exits 1 because neither package.json nor a Muro verifier exists. The actual repository checks passed: Node 2360 passed / 3 existing skips / 0 failed; Bun 2338 passed / 3 existing skips / 0 failed; release contracts 38 passed; doctor 0 failures; setup READY; graph CLEAN (112 entries, 319 links); privacy marker scan 0 files. The final Node run needs no sanitizer exception. No production source changed after audit.

Release 2.38.0 is shipped locally; all P0/S1–S7 scopes are complete. SHIPPED.md records reconciliation and limits. The status index is compacted; historical pitch, run and audit evidence is preserved. The durable wrapper repair remains in the followups backlog. No tag, push, publication or application rollout is implied. The due cooldown review follows without applying unapproved proposals.
