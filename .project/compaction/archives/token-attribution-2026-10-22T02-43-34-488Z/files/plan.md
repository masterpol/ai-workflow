# Plan: token-attribution

**Pitch**: pitch.md  •  **Appetite**: big-batch (cap 15 files / 1,500 LOC)  •  **Hill**: hill.md  •  **Base ref**: `633adb3`

Part 1 of 2. Every scope below keeps the pitch's no-gos: no transcript text, prompts, responses or tool arguments are
stored; no estimated tokens or cost; no per-message logs or unbounded arrays; the lease mechanism is not changed; the
collector never fails a hook (exit 0 always).

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| S1 | Spike: pointer placement, session mapping, worktrees, lease-flake baseline | `.project/pitches/token-attribution/spike-s1-pointer.md` (pitch record) | ~80 (notes) | — | S2, S3 | yes: read-only research plus a temp-dir test loop; writes only its own findings file | standard (placement trade-offs need judgment) |
| S2 | Spike: Codex usage availability (one hour) | `.project/pitches/token-attribution/spike-s2-codex.md` (pitch record) | ~40 (notes) | — | S1, S3 | yes: read-only, one yes/no question, own findings file | fast |
| S3 | Spike: Claude transcript JSONL shape (field names and types only) | `.project/pitches/token-attribution/spike-s3-transcript.md` (pitch record) | ~80 (notes) | — | S1, S2 | yes: read-only, own findings file; the prompt carries the privacy rules verbatim | standard (privacy discipline on real files) |
| S4 | Usage reader module (P2) | `ai-framework/hooks/scripts/transcript-usage.mts` (new), `ai-framework/hooks/scripts/transcript-usage.test.mts` (new) | ~140 + ~200 test | S3 | S5 (isolated worktree only) | yes: new files only, pure function behind `RuntimeDeps`, exits fully specified | standard |
| S5 | Token snapshot revision 3 (P4) plus directory-identity pin | `token-consumption.mts`, `token-consumption.test.mts`, `ai-framework/scripts/state-snapshot.mts`, `ai-framework/scripts/state-snapshot.test.mts`, `ai-framework/integrations/state-report.md` (one line) | ~60 + ~100 test + ~4 | S1 | S4 (isolated worktree only) | no: one-commit, cross-file version bump that needs the full suite and the base-ref proof; main thread | — |
| S6 | Active-context pointer and phase-start event (P1) | `token-consumption.mts`, `token-consumption.test.mts`, `ai-framework/hooks/hooks.json`, `.claude/settings.json` (+ contingent pair, see File budget) | ~90 + ~130 test + ~20 wiring | S1, S5 | — | no: same collector file as S5 and S7 | — |
| S7 | Collector stamping, transcript offsets, `flows` aggregate, per-level caps (P3) | `token-consumption.mts`, `token-consumption.test.mts` | ~160 + ~240 test | S4, S6 | — | no: the hardest scope (reversal, exactly-once, lease reconciliation); main thread | — |
| S8 | Report: minimal `flows` rendering and unattributed share | `ai-framework/hooks/scripts/token-report.mts`, `ai-framework/hooks/scripts/token-report.test.mts` | ~50 + ~50 test | S7 | S9 | yes: two disjoint files, pure renderer, existing escaping helpers to reuse | standard (escaping is security-relevant) |
| S9 | Docs | `ai-framework/docs/token-consumption.md` | ~40 | S7 | S8 | yes: one doc file, content fixed by S1-S7 findings | fast |
| S10 | Rollout ordering and release | `.project/pitches/token-attribution/rollout.md` (pitch record); `CHANGELOG.md`, `VERSION` via `ai-framework/scripts/changelog.mts` at /ship | ~15 | S8, S9 | — | no: needs the full suite, a scratch bundle-sync dry run and the cross-pitch check; main thread | — |

All paths without a directory are under `ai-framework/hooks/scripts/`.

Scope order differs from the pitch's P1→P4 listing on purpose: the revision bump (S5) lands **before** any scope
writes new data (S6, S7), so no commit ever writes pointers, offsets or flows under `schemaVersion: 2`, where an old
collector would carry them without understanding them.

Pitch risk owners map to plan scopes: pitch S1 (pointer, worktrees) → plan S1 then S6; pitch S2 (Codex) → plan S2;
pitch S3 (key caps) → plan S7; pitch S4 (rollout, test ports) → plan S10, with test-port isolation enforced in S4-S7.

## File budget

Firm, 14 of 15 (release records included, pitch records excluded, as in earlier big-batch plans):

1. `ai-framework/hooks/scripts/transcript-usage.mts` (new)
2. `ai-framework/hooks/scripts/transcript-usage.test.mts` (new)
3. `ai-framework/hooks/scripts/token-consumption.mts`
4. `ai-framework/hooks/scripts/token-consumption.test.mts`
5. `ai-framework/hooks/scripts/token-report.mts`
6. `ai-framework/hooks/scripts/token-report.test.mts`
7. `ai-framework/hooks/hooks.json`
8. `.claude/settings.json`
9. `ai-framework/scripts/state-snapshot.mts`
10. `ai-framework/scripts/state-snapshot.test.mts`
11. `ai-framework/integrations/state-report.md`
12. `ai-framework/docs/token-consumption.md`
13. `CHANGELOG.md`
14. `VERSION`

Contingent pairs. The S1-S3 gate picks **at most one**, because each adds two files:

- **Codex pointer**: `.codex/hooks.json` plus `ai-framework/hooks/scripts/orca-start-codex-hook.test.mts`. The test
  pins exactly one `UserPromptSubmit` and one `SubagentStop` entry (lines 210-214). Adding the pair only makes sense
  if S2 finds Codex usage. Otherwise Codex completions stay unattributed and the wiring goes to `_followups.md`.
- **OpenCode child sessions**: `.opencode/plugins/token-consumption.ts` plus
  `ai-framework/hooks/scripts/opencode-plugin.test.mts`. Needed only if S1 shows that child-session messages carry
  no parent id the collector can already see.

When a pair is chosen, S8's flow-render assertions go into `token-consumption.test.mts` (end to end, through the
written `.md`/`.html`) instead of `token-report.test.mts`. That removes item 6 and keeps the total at 15. The pair
that is not chosen is deferred to a named followup. The appetite is never exceeded (critique A3: re-count after the
spikes).

Not touched, with reason: `workflow-doctor.mts` (it finds hook entries with `.find()` and its script list is a
presence check, not an exhaustive list), `bundle-sync.mts` (it syncs `ai-framework/hooks` whole),
`setup-validator.mts` (it reads no token snapshot field), `README.md:42` ("never retains ... transcripts" stays true),
`orca-start-hook.mts` / `orca-start-codex-hook.mts` (see "Pitch claims checked against the code", item 1).

Projected LOC: ~1,300 of 1,500. Tests are about 60% of that.

## Blast radius (impact scan at `633adb3`)

Readers of the token snapshot or its `schemaVersion`:

| Consumer | What it reads | Effect of revision 3 | Action |
|---|---|---|---|
| `token-consumption.mts` `readSnapshot` (line 500) | refuses `schemaVersion > 2`; migrates 1→2 | the guard must become `> SNAPSHOT_REVISION`; migrator 2→3 appended | S5 |
| `state-snapshot.mts:36` `SUPPORTED_METRICS_SCHEMAS = new Set([1, 2])` | lifetime fields only | `/state` would report "unsupported token snapshot schemaVersion 3" | S5: add 3 |
| `state-snapshot.test.mts:156-157` | rows for v2 observed, 99 unsupported | needs a revision-3 observed row | S5 |
| `integrations/state-report.md:76` | documents "versions 1 and 2" | stale | S5 (one line, same commit) |
| `token-report.mts` | cleans every field itself; header says "schema v2" | unknown blocks are ignored; header wording | S8 |
| `.opencode/plugins/token-consumption.ts` | imports `recordEvent` in-process | a long-running OpenCode keeps the old module in memory | operator step (S9 docs) |
| `workflow-metrics*.mts` | separate store `workflow-usage.json`; tests assert they **never** read `token-consumption.json` | none | must stay green |
| `workflow-metrics.test.mts:50-69` | runs the collector concurrently, asserts `lifetime.agentCompletions === 1` | none expected | must stay green |
| `skill-defaults.test.mts:400-413` | pins the report's "Current Completion" table (`Availability`, `Caveman mode` columns) | none if that table is untouched | S8 must not change it |
| `workflow-doctor.mts:968-1034`, `bundle-sync.mts`, `setup-validator.mts` | file presence, hook wiring regexes | none | must stay green |

Tests that pin the schema, all in `token-consumption.test.mts`: line 228/243 (v1→v2 expects 2), 629, 641-645
(`schemaVersion: 3` is "newer", regex `/schemaVersion 3 is newer/`), 647, 652, 708, 792. With revision 3, the
"newer" fixture becomes `SNAPSHOT_REVISION + 1` and the v1 migration expects 3. Run
`grep -rn "schemaVersion: 2\|schemaVersion\":2\|schemaVersion: 3" ai-framework/hooks/scripts/*.test.mts ai-framework/scripts/state*.test.mts`
before S5 closes.

Lease-port flake: `_followups.md:422` and `workflow-v3-rollout/readiness.md:25` record that `token-consumption.test.mts`
sees "metrics lock is held by another writer" in about 1 of 12 isolated runs. The port is
`20000 + sha256(realpath) mod 10000`. New tests must not make it worse (see S4-S7 exits).

## Exit criteria per scope (machine-checkable, ≥1 per scope)

Commands below: `T` = `node --experimental-strip-types --disable-warning=ExperimentalWarning --test`, and
`SUITE` = `T "ai-framework/**/*.test.mts" ".claude/**/*.test.mts"`. This repository has no build, typecheck or lint
command (`.project/context/stack.md:20`). Every backend scope's "no untyped validators" check is
`grep -cE ":\s*any\b|as any\b|<any>" <changed .mts>` = 0 on the lines it added. Bun is installed: each code scope
also runs `bun test <its test files>`.

### S1 — Spike: pointer placement, session mapping, worktrees, lease-flake baseline
- `test -f .project/pitches/token-attribution/spike-s1-pointer.md`
- `grep -cE "^## (Claude|OpenCode|Codex|Worktrees|Pitch, phase and scope source|TTL|Placement decision|Lease-flake baseline)$" .project/pitches/token-attribution/spike-s1-pointer.md` = 8
- `grep -cE "^Placement: (snapshot-map|pointer-files)$" .project/pitches/token-attribution/spike-s1-pointer.md` = 1
- Lease-flake baseline recorded as a number: `for i in $(seq 12); do T ai-framework/hooks/scripts/token-consumption.test.mts >/dev/null 2>&1 || echo F; done | grep -c F`. The result is written as `Baseline failures: N/12`; `grep -cE "^Baseline failures: [0-9]+/12$"` = 1.
- Privacy: `grep -cE "/Users/|/home/" .project/pitches/token-attribution/spike-s1-pointer.md` = 0 (no absolute paths, session ids or payload values; key names only).
- Questions it must answer, each under its own heading:
  - Which payload key names reach which hook: `UserPromptExpansion` (`command_name`, `command_args`, `session_id`?), `PostToolUse(Skill)`, `SubagentStop`, `PostToolUse(Agent)`, OpenCode skill tool and session events, Codex `UserPromptSubmit`.
  - Does a Claude subagent's `SubagentStop`/`PostToolUse(Agent)` carry the **parent** `session_id`? Does an OpenCode child message carry a parent id the plugin already passes?
  - Source of pitch, phase and scope. Default proposal: phase is the command or skill name in the orca-start `PHASES` set. Pitch is the first argument token, if it is a slug whose `.project/pitches/<slug>/` is a real directory; else the sole row of `.project/status.md` "Active pitches"; else `(unattributed)`. Scope is an argument token matching `^S\d{1,3}$`; else `(none)`. Also settle how `resume`, `switch` and `checkpoint` behave.
  - TTL value (default proposal: 6 h, sliding, refreshed by each attributed completion) and the context cap (default 32 sessions).
  - Placement (default proposal: a bounded `contexts` map **inside** the snapshot). It is written in the same atomic write under the lease, so it needs no new path-safety surface and no per-file refusal handling. Choosing per-session files instead requires distinct refusal outcomes and the writer to be tested against a symlinked pointer.
  - Worktrees: `$CLAUDE_PROJECT_DIR` and `git rev-parse --show-toplevel` both resolve to the worktree, so each worktree has its own `.project/metrics`. Default proposal: document the limit, without resolving to the main checkout (that would add a git spawn per hook and a cross-checkout trust question).
  - Method: documented hook input schemas, plus, where possible, a capture run in a scratch project under the scratchpad with its own `.claude/settings.json` hook that prints `Object.keys` recursively. Values are never printed. `settings.local.json` is never read or written.

### S2 — Spike: Codex usage availability
- `test -f .project/pitches/token-attribution/spike-s2-codex.md`
- `grep -cE "^Verdict: (payload|session-log|unavailable)$" .project/pitches/token-attribution/spike-s2-codex.md` = 1
- `grep -cE "/Users/|/home/" .project/pitches/token-attribution/spike-s2-codex.md` = 0
- Answers: does Codex `SubagentStop` carry numeric usage or a path to a session log with usage events (key names and types only)? Does Codex `UserPromptSubmit` carry a session id that its `SubagentStop` repeats? If the verdict is `session-log`, it also estimates the parser size; a parser over ~60 LOC is deferred, and Codex stays `Unavailable`. If `unavailable`, the report says so (S8) and the Codex pointer pair is not chosen.
- Time box: one hour. An undecided answer at one hour is recorded as `Verdict: unavailable`.

### S3 — Spike: Claude transcript JSONL shape
- `test -f .project/pitches/token-attribution/spike-s3-transcript.md`
- `grep -cE "^Verdict: (subagent-file|sidechain-in-parent|both)$"` = 1, and `grep -cE "^Main-session Stop: (recommend|do-not-recommend)$"` = 1
- Privacy (sample files from the local Claude projects directory are read for field **shapes** only):
  - `grep -cE '"(text|thinking|content|input|prompt)"\s*:\s*"' .project/pitches/token-attribution/spike-s3-transcript.md` = 0
  - `grep -cE 'msg_[A-Za-z0-9]{8,}|toolu_[A-Za-z0-9]{8,}|req_[A-Za-z0-9]{8,}' ...` = 0
  - `grep -cE "/Users/|/home/" ...` = 0
  - `git status --porcelain | grep -cE "\.jsonl"` = 0 (no transcript copied anywhere in the repo)
- Answers:
  - The key path and type of `model`, `message.id` and each `usage` field on assistant lines.
  - Whether lines that repeat one `message.id` (one per content block) carry identical or growing usage, and so whether to keep the last or the maximum. Whether repeats are always contiguous.
  - Where subagent usage lives: the payload's `agent_transcript_path` file, or `isSidechain` lines in the parent transcript, or both. This decides the double-count rule.
  - Whether `SubagentStop` and `PostToolUse(Agent)` fire in that order for foreground agents (`upgradeClaudeCompletion` assumes SubagentStop first).
  - Byte-size p50 and max over the sampled transcripts (numbers only, used to set the read caps), whether files ever shrink or are rewritten (the shorter-file rule), and the Claude home root. `CLAUDE_CONFIG_DIR` is set under Orca, so it is not always `~/.claude`.
  - Whether the main-session `Stop` payload carries `transcript_path`, and whether to wire it (gate decision, below).

**Spike gate (after S1-S3; Approve / Revise / Back / Stop).** The owner decides: the placement, the contingent pair (at
most one), and whether Claude main-session usage is recorded through a new `Stop` registration. That registration
would be a new `session-turn` event counted as one completion of agentType `primary`. It changes Claude's completion
unit, so it needs explicit approval. If approved, it costs no extra files: `hooks.json` and `.claude/settings.json`
are already in S6. The gate also re-counts files and LOC against the cap.

### S4 — Usage reader module (P2)
- `T ai-framework/hooks/scripts/transcript-usage.test.mts` exit 0; `bun test ai-framework/hooks/scripts/transcript-usage.test.mts` exit 0
- `T ai-framework/scripts/runtime/invariants.test.mts` exit 0 (the new module imports no `node:*`, only `RuntimeDeps`)
- `grep -cE ":\s*any\b|as any\b" ai-framework/hooks/scripts/transcript-usage.mts` = 0
- Behavior tests, one per item, in `transcript-usage.test.mts`:
  - **Partial trailing line**: a final line without `\n` is not parsed, and the returned offset stops at the last complete newline.
  - **Shorter file**: a size below the stored offset, or a changed `ino`/`dev`, resets the offset to 0 and returns `reset: true`. Message ids already in the passed recent-id window are not returned again.
  - **`message.id` repeats**: the rule from S3 (last or max) gives one entry per id. A group split at the read boundary is held back until a different id or the end of a complete file.
  - **Sidechain/subagent rule** from S3: no message is counted from both the subagent file and the parent.
  - **Caps**: the byte cap (default from S3 sizes) and the time cap (injected `deps.clock.monotonicMs`) stop at the last complete line and return `capped: true`. A single line over the line cap is skipped without parsing, and the offset advances past it.
  - **Path safety**: the path is resolved with `realpathSync` before matching against the realpath of `<CLAUDE_CONFIG_DIR or $HOME/.claude>/projects/`. A symlink leaf, a non-regular file (FIFO, opened `O_NONBLOCK`, must not block), an ancestor symlink escaping the root, and a path outside the root each return a distinct `{ status: "refused", reason }`, never `null` or "absent". The file is opened `O_NOFOLLOW`, and the `fstat` `ino`/`dev` must match the `lstat`.
  - **macOS alias**: a Claude home given through the `/var` alias (`tempFixture(deps, {}, { resolve: false })`) is accepted. The test asserts `alias !== realpath(alias)` at its top, so a helper cannot void it.
  - **Output contains numbers and bounded ids only**: fixture lines carry `TRANSCRIPT-TEXT-MARKER` in text, thinking, tool input and tool result fields. `JSON.stringify(result)` does not match `/TRANSCRIPT-TEXT-MARKER/`, and neither does any thrown or returned reason.
  - Token values that are fractional, negative, above 1e12 or non-numeric come back `null`. The collector re-validates them in S7.
- Mutant proof, recorded in `log.md`: deleting the `realpathSync` containment step makes the alias/escape test fail.
- Isolated lease ports: the reader takes no lease; `grep -c "withLease\|recordEvent" ai-framework/hooks/scripts/transcript-usage.test.mts` = 0.

### S5 — Token snapshot revision 3 (P4) plus directory-identity pin
- One commit carries the constant, emitter, refusal guard, migrator, state reader and every fixture literal:
  `git show --name-only --format= <S5 commit> | grep -cE "hooks/scripts/token-consumption\.mts|hooks/scripts/token-consumption\.test\.mts|scripts/state-snapshot\.mts|scripts/state-snapshot\.test\.mts|integrations/state-report\.md"` = 5
- `grep -cE "schemaVersion: 2,|schemaVersion as number\) > 2" ai-framework/hooks/scripts/token-consumption.mts` = 0; `grep -c "SNAPSHOT_REVISION" ai-framework/hooks/scripts/token-consumption.mts` ≥ 3
- `grep -c "new Set(\[1, 2, 3\])" ai-framework/scripts/state-snapshot.mts` = 1
- Old in-memory collectors refuse instead of corrupting:
  `git show 633adb3:ai-framework/hooks/scripts/token-consumption.mts | grep -c "(snapshot.schemaVersion as number) > 2"` = 1.
  This is the evidence behind the operator step. A long-running OpenCode with the old module skips every event with
  "newer than this collector understands" and never overwrites the file, until it is restarted.
- `T ai-framework/hooks/scripts/token-consumption.test.mts ai-framework/scripts/state-snapshot.test.mts ai-framework/hooks/scripts/token-report.test.mts ai-framework/hooks/scripts/opencode-plugin.test.mts ai-framework/scripts/skill-defaults.test.mts ai-framework/scripts/workflow-metrics.test.mts` exit 0, then `SUITE` exit 0. The suite is not handed on red (knowledge: 98 stale tests).
- Behavior tests:
  - A v2 fixture migrates to revision 3 append-only: the migrated object with `flows`, `transcripts` (and `contexts` if S1 chose `snapshot-map`) removed deep-equals the original with `schemaVersion` 3.
  - A v1 fixture chains 1→2→3.
  - The migrated object is proven through the strict reader: written, re-read, no `.rejected` file, totals equal.
  - Revision `SNAPSHOT_REVISION + 1` is refused, and its bytes are unchanged afterwards.
  - The new blocks are validated by `usableShape`. A hostile `flows` row, or stored flow routing that resolves to no row, is replaced, and the original text is kept in `.rejected` (byte-equal).
  - `state-snapshot` reports a revision-3 file `observed`; 99 stays `unsupported`.
- Directory-identity pin (knowledge: pin-directory-identities-across-async-leases, metrics-ancestor-swap-during-async-lease). `recordEvent` records `lstat` `ino`/`dev` and the realpath of `.project` and `.project/metrics` before awaiting `withLease`, and rechecks them inside the action before the first read and before each write. Test: an injected `deps.net.tryListen` swaps `.project/metrics` for a symlink to an outside directory while the lease is being acquired. The outside directory is unchanged, the event is skipped with a fixed reason, the lease is released, and the next event after restoring records normally. The lease protocol itself is unchanged.
- Mutant proof, in `log.md`: changing the guard to `> SNAPSHOT_REVISION + 1` fails the "newer revision" test.
- Wording: `grep -ciE "snapshot v3|v3 snapshot" ai-framework/integrations/state-report.md ai-framework/hooks/scripts/token-consumption.mts` = 0 ("token snapshot revision", never "v3").

### S6 — Active-context pointer and phase-start event (P1)
- `T ai-framework/hooks/scripts/token-consumption.test.mts ai-framework/hooks/scripts/orca-start-hook.test.mts ai-framework/hooks/scripts/orca-start-codex-hook.test.mts ai-framework/hooks/scripts/opencode-plugin.test.mts` exit 0; `node ai-framework/scripts/workflow-doctor.mts` reports no new fail.
- Wiring, as a new registration (the orca-start hooks are untouched):
  - `grep -c -- "--vendor claude --event phase-start" ai-framework/hooks/hooks.json .claude/settings.json` gives 1 in each file (`UserPromptExpansion`, matcher `*`, explicit `timeout`).
  - `node -e 'for (const f of ["ai-framework/hooks/hooks.json",".claude/settings.json"]) JSON.parse(require("fs").readFileSync(f,"utf8"))'` exit 0.
- Resolver export (added at 2026-10-19 /plan of `workflow-usage-capture`, ruling X3): the pitch/phase/scope function is exported from one module as a pure function. `grep -c "export function resolvePhaseContext" <module>` gives 1, a test imports it from outside the collector and checks a slug, a closed phase and an `S<n>` scope, and `workflow-usage-capture` imports it instead of duplicating it. Update the name in this exit if S6 picks a different one.
- Behavior tests:
  - A `UserPromptExpansion` slash command for a phase sets the session's context: pitch, phase, scope, `at`.
  - The existing `skill-use` path (Claude `PostToolUse(Skill)`, OpenCode skill tool) sets it for a phase skill and not for a non-phase skill.
  - A payload with `agent_id` (a subagent helper) never overwrites the parent's context.
  - A non-phase command returns before acquiring the lease: an injected `tryListen` spy is called 0 times.
  - A phase-start event never counts a completion: `lifetime.agentCompletions` is unchanged.
  - The hook's stdout is empty for every input. `UserPromptExpansion` stdout would be added to the model's context.
  - Exit is 0 on malformed, oversized or hostile input; stderr carries fixed text and no path.
  - Pitch argument validation:
    - A slug whose directory is missing, or is a symlink, falls back to the `status.md` rule.
    - A symlinked, oversized (>64 KiB) or FIFO `status.md` gives `(unattributed)` with a distinct reason, and `status.md`'s hash is unchanged.
    - Names outside `^[a-z0-9][a-z0-9-]{0,79}$` (pitch), outside `PHASES` (phase) or outside `^S\d{1,3}$` (scope) never become keys.
  - TTL: a context older than the TTL resolves to `(unattributed)`, and an attributed completion refreshes `at`, using an injected `deps.clock.now`.
  - Cap: context 33 evicts the oldest.
- The contingent Codex pair, if chosen: `.codex/hooks.json` gains a `--vendor codex --event phase-start` registration. `orca-start-codex-hook.test.mts:210-214` changes from `length === 1` to finding the Orca entry by command, and the exact Orca command string assertion is kept.
- Isolated lease ports: every new test passes an injected in-memory `deps.net.tryListen` (as `metrics-lock.test.mts:358` does); `git diff 633adb3 -- ai-framework/hooks/scripts/token-consumption.test.mts | grep -c "tryListen"` ≥ 1.

### S7 — Collector stamping, transcript offsets, `flows` aggregate, per-level caps (P3)
- `T ai-framework/hooks/scripts/token-consumption.test.mts` exit 0; `bun test ai-framework/hooks/scripts/token-consumption.test.mts` exit 0; `SUITE` exit 0
- Lease-flake check: the S1 loop rerun gives a failure count ≤ the S1 baseline. Both numbers are recorded in `log.md`.
- Stamping and reversal (patterns: reversible-aggregates-store-their-routing, display-buckets-are-not-lifecycle-identities):
  - Each completion stores `flow: { applied: true, pitch, phase, scope }`, holding the bucket names after caps. The aggregate is nested (`flows.pitches[pitch].phases[phase].scopes[scope]`, with vendor rows at the leaf), so no string join is needed and no two tuples can collide.
  - An upgrade or replay reuses the stored key, even if the context moved to another phase in between. Test: SubagentStop under `plan`, a context switch to `build`, then `agent-result`; the row stays under `plan`.
  - Reversal uses the stored routing. A record without `flow.applied` (pre-revision) is skipped, not subtracted.
  - Apply then reverse deep-equals the starting `flows`, and an underflow throws (no clamping).
- Per-level caps (pitch S3 risk: `(other)` must not hide the answer):
  - Pitches ≤ 50, matching `workflow-metrics-state` `LIMITS.pitches` for part 2's join. Phases are the closed `PHASES` set plus `(unattributed)`. Scopes ≤ 25 per pitch/phase. Leaf rows ≤ 600 in total.
  - At a cap, the least recently used row that neither `current` nor `previous` routes to is folded into `(other)`, adding its counters. Totals are kept, and a new pitch gets its own row.
  - Tests:
    - The 51st pitch gets a row.
    - The sum of all flow leaves equals the number of completions recorded since `flows.since`.
    - Reversing `current` after a fold still resolves.
    - With every cap filled, `JSON.stringify(snapshot).length` < 2 MiB (the file cap is 4 MiB).
- Transcript usage (Claude):
  - The reader runs **before** the lease, from the offset in an unlocked, read-only snapshot read.
  - Under the lease, only messages whose end offset is beyond the locked offset and whose id is not in the recent window are applied.
  - The offset, the recent ids and the totals commit in the one atomic snapshot write.
  - `transcripts` is keyed by `sha256` of the real path, never the path, and is capped (default 200, LRU).
  - A record with transcript usage gets `metricScope: "agent_total"` and `availability: "reported"`, and its cost stays `null` (shown as `Unpriced`).
- Exactly-once tests:
  - **Repeated SubagentStop** (and repeated `Stop`, if the gate approved it): tokens are counted once.
  - **Partial trailing line**: not counted until a later event reads it complete.
  - **Shorter file**: no double count of ids still in the window.
  - **Failed write**: an injected `renameSync` throw for the snapshot leaves the offset and totals unchanged, and the next event counts each message exactly once.
  - **Concurrent events on one transcript**: two events are interleaved through injected scheduling, and each message is counted once.
- `upgradeClaudeCompletion` (`token-consumption.mts:565-580`) today upgrades only an `unavailable` current record. A foreground `agent-result` that follows a SubagentStop already `reported` from the transcript is absorbed: `agentCompletions` stays 1, tokens stay the transcript totals, and only a missing model is filled. The existing test "upgrades a completion without usage instead of counting it twice" still passes. An async launch is still a model note only (rule: testing.md, event units).
- Writer against the hostile shape (issue: hardening-a-shared-reader-made-its-writer-destructive): a refused transcript (symlink, outside the root, FIFO) still counts the completion as `unavailable`, leaves the `transcripts` entry for that key unchanged, and writes nothing outside `.project/metrics`.
- Values from the reader are re-validated at the write point with `integerOrNull`. A stub that returns 1.5, -1 or 2e12 gives `null`.
- Marker grep: a run over fixture transcripts carrying `TRANSCRIPT-TEXT-MARKER` leaves every file under `.project/metrics` (`*.json`, `*.md`, `*.html`, `*.rejected`) and stderr free of the marker. Test: read every file in the directory and `assert.doesNotMatch`.

### S8 — Report: minimal `flows` rendering and unattributed share
- `T ai-framework/hooks/scripts/token-report.test.mts ai-framework/scripts/skill-defaults.test.mts ai-framework/hooks/scripts/token-consumption.test.mts` exit 0
- `grep -c "By Flow" ai-framework/hooks/scripts/token-report.mts` ≥ 2 (Markdown and HTML)
- `grep -c "schema v2" ai-framework/hooks/scripts/token-report.mts` = 0 (header says "token snapshot revision")
- Behavior tests:
  - The table has columns Pitch / Phase / Scope / Vendor / Completions / Tokens / Cost.
  - Claude rows show tokens with `Unpriced`.
  - The line `Unattributed: X of Y completions since <flows.since>` appears; with zero completions it says `No data yet`, never a zero share.
  - Codex shows `Unavailable` when S2 says so.
  - Hostile hand-edited `flows` labels render with no markup, links or headings (reusing `safeLabel`/`escapeHtml`).
  - The renderer stays pure (render twice, same text, input untouched).
  - The skill-defaults "Current Completion" table is unchanged.
- Fallback if a contingent pair was chosen: the same assertions live in `token-consumption.test.mts`, and `token-report.test.mts` is untouched.

### S9 — Docs
- `grep -c "token snapshot revision" ai-framework/docs/token-consumption.md` ≥ 1; `grep -ciE "snapshot v3|v3 snapshot" ai-framework/docs/token-consumption.md` = 0
- `grep -ciE "restart" ai-framework/docs/token-consumption.md` ≥ 1 (operator step: restart OpenCode or any process that loaded the old collector; until then its events are skipped, not corrupted)
- `grep -ciE "worktree" ai-framework/docs/token-consumption.md` ≥ 1 (per-worktree metrics limit, if S1 kept the default)
- `grep -ciE "numeric|numbers only" ai-framework/docs/token-consumption.md` ≥ 1 (what is read from the transcript and what is never stored)
- `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0

### S10 — Rollout ordering and release
- Ordering: the hook changes land before `workflow-v3-rollout`'s next bundle-sync. `grep -c "| workflow-v3-rollout | shaped |" .project/status.md` = 1 when S10 closes, or `rollout.md` records the sync commit it precedes.
- Scratch dry run, so `workflow-v3-rollout` sees the new hook files:
  - Export base `633adb3` into the scratchpad (`git archive 633adb3 | tar -x -C <scratch>`).
  - From there, run `node ai-framework/scripts/bundle-sync.mts --source <this checkout> --json > <scratch>/sync.json` (exit 0).
  - Check `grep -c "transcript-usage.mts" <scratch>/sync.json` ≥ 1.
  - The output is summarized (counts only) in `.project/pitches/token-attribution/rollout.md`.
- `rollout.md` names the re-run of `workflow-v3-rollout`'s scratch-copy dry run (readiness.md method) as that pitch's next step. `test -f .project/pitches/token-attribution/rollout.md`.
- `SUITE` exit 0 under Node; `bun test ai-framework` exit 0 (or each failure is matched to a pre-existing followup by name); the flake count is ≤ the S1 baseline.
- `node ai-framework/scripts/setup-validator.mts` exit 0; `node ai-framework/scripts/graphify.mts --check` exit 0; `node ai-framework/scripts/workflow-doctor.mts` has no new fail.
- Release at /ship: `node ai-framework/scripts/changelog.mts ...` updates `CHANGELOG.md` and `VERSION`; `git diff --name-only 633adb3 -- . ':!.project' | wc -l` ≤ 15 (untracked new files are added first).

## Risks (inherited from pitch rabbit holes)

| Risk | Pitch owner → plan scope | Spike needed? | Mitigation |
|------|--------------------------|---------------|------------|
| Pointer placement for Claude, OpenCode and Codex; parent/child session mapping | S1 → S1, S6 | yes (S1) | Spike captures key names. Claude subagents likely already carry the parent `session_id`. OpenCode child mapping and Codex wiring are the contingent pairs, at most one. Unmapped children are `(unattributed)` and counted in the reported share. |
| Codex usage availability | S2 → S2 | yes (S2, one hour) | Verdict line. `unavailable` keeps Codex `Unavailable` in the report and defers the Codex pointer. |
| Per-worktree metrics directories split the data | S1 → S1, S9 | yes (S1) | Default: document the limit. Worker completions in an Orca worktree land in that worktree's git-ignored `.project/metrics` without a pointer. |
| Key caps hide the current pitch in `(other)` | S3 → S7 | no | LRU fold of rows no stored record routes to; caps 50/closed phases/25/600; size test < 2 MiB. |
| Rollout interaction with `workflow-v3-rollout` | S4 → S10 | no | Land before its next sync; scratch dry run; the rollout pitch re-runs its own dry run. |
| New tests worsen the lease-port flake (1 in ~12) | S4 → S4-S7 | no (baseline in S1) | New collector tests inject an in-memory `deps.net.tryListen`; the reader takes no lease; flake count ≤ baseline at S7 and S10. |
| Transcript shape assumptions (`message.id` repeats, sidechain, ordering of SubagentStop vs `agent-result`) | new → S3, S4, S7 | yes (S3) | Rules come from S3's findings, not from the event names (knowledge: async-agent-launch-hook-counted-as-completion). |
| Transcript content leaks into any output | rabbit hole (resolved) → S4, S7 | no | Reader returns numbers and bounded ids only; re-validated at write; marker-grep tests over every metrics file and stderr. |
| Transcript path safety, including the macOS `/var` alias and Orca's `CLAUDE_CONFIG_DIR` home | rabbit hole (resolved) → S4 | no | Realpath both sides; distinct refusal outcomes; `O_NOFOLLOW`/`O_NONBLOCK`; alias test asserts its input shape; containment mutant. |
| Exactly-once under replay, partial line, shorter file, failed write | rabbit hole (resolved) → S4, S7 | no | Offset, ids and totals in one atomic write; four named tests plus the concurrent-event test. |
| Lease hold time / hook timeouts (Codex `SubagentStop` timeout is 5 s) | rabbit hole (resolved) → S4, S7 | no (sizes from S3) | Read before the lease with byte and time caps; only reconcile and write inside it; capped reads are marked `partial`. |
| Revision bump leaves stale tests or a migrator on the old version | knowledge K → S5 | no | One commit; grep for old literals; full suite green before S5 closes; base-ref proof for old collectors. |
| Ancestor swap during the async lease | knowledge → S5 | no | Pin `ino`/`dev`/realpath before the wait; recheck before reads and writes; injected-scheduling test. |
| Main-session (non-subagent) Claude usage stays invisible | new → S3 gate | yes (S3) | Owner decides at the spike gate whether to add a `Stop` registration (`session-turn`); no file cost. |
| Scope changes inside one `/build` are invisible to a phase-start hook | new → S1, S8 | yes (S1) | Scope comes from invocation arguments only; otherwise `(none)`, with the unattributed/`(none)` share shown. The model is never asked to write the pointer (critique A2). |
| `state-deep-evidence` (shaped, not bet) also plans edits to `state-snapshot.mts` | cross-pitch → S5 | no | Our edit is one token in one constant; rerun the overlap check at /audit. |

### Rules folded into exit criteria
- `ai-framework/rules/testing.md`: event units (phase-start and launch are never completions: S6, S7); macOS tmpdir realpath with `{ resolve: false }` and a shape assertion (S4); prove guards with in-memory mutants (S4, S5).
- `ai-framework/rules/security.md`: specific validators and string-length bounds on every name (S6 patterns, S4 ids); never log paths or values (fixed stderr text: S4, S6).
- `ai-framework/rules/machine-data-format.md`: the snapshot and any pointer data are script-read and not agent-loaded, so they stay JSON; no `.toon` is introduced under `.project/metrics`.
- `ai-framework/rules/data-modeling.md`: the revision migration is append-only, and a lossless round trip is proven (S5).
- `ai-framework/rules/canonical-mirror-sync.md`: not triggered; no skill or agent file is edited.
- `.project/rules/`: only `README.md`, no stack-specific companion applies.

## Parallel dispatch plan

1. **Wave A (parallel):**
   - S1 (`standard`), S2 (`fast`) and S3 (`standard`) are read-only, and each writes only its own findings file.
   - S3's prompt carries the privacy exits verbatim. It may read sample transcripts for shapes only and writes no values.
   - The phase skill fans out (Claude Code supports nested dispatch); on a harness without it, run S1 → S2 → S3 sequentially.
   - Then the **spike gate**.
2. **Wave B:**
   - S4 is dispatched (`standard`), and S5 runs on the main thread. They are parallel **only in an isolated worktree** for S4: the harness rule forbids parallel writers in one worktree. Otherwise run S5, then S4.
   - Their file sets are disjoint. S4 creates two new files; S5 touches the collector, the state reader and their tests.
3. **S6** (main thread) after S5.
4. **S7** (main thread) after S4 and S6. S5, S6 and S7 all edit `token-consumption.mts` and its test, so they are strictly sequential and never dispatched in parallel.
5. **Wave C (parallel):** S8 dispatched (`standard`) and S9 dispatched (`fast`) after S7. They touch disjoint files, and S9's content is fixed by S1-S7.
6. **S10** (main thread) last, before `workflow-v3-rollout`'s next bundle-sync.

## Pitch claims checked against the code

1. "Written by a shared phase-start hook (orca-start hooks)" does not fit the real hooks.
   - `orca-start-hook.mts` and `orca-start-codex-hook.mts` return before reading stdin when Orca is off. Tests pin this: `orca-start-hook.test.mts:54` and `orca-start-codex-hook.test.mts:56`.
   - The Codex test also pins exactly one `UserPromptSubmit` and one `SubagentStop` entry.
   - So the shared phase-start hook is the collector's own `phase-start` event: a new `UserPromptExpansion` registration plus the existing `PostToolUse(Skill)` / OpenCode skill-use paths. It is still hook-driven, never skill prose.
2. "Cleared at phase finish": no hook fires when a phase ends. A pointer is replaced by the next phase start and otherwise expires by TTL.
3. Scope from a phase-start hook is only known when it is in the invocation arguments. Scope changes inside one `/build` produce no hook event.
4. The pitch's file projection (~13) missed `state-snapshot.mts:36` (`SUPPORTED_METRICS_SCHEMAS = new Set([1, 2])`), its test, and `state-report.md:76`. Without them, `/state` would turn `unavailable` after the bump.
5. `upgradeClaudeCompletion` upgrades only `unavailable` records. Once SubagentStop carries transcript usage, a foreground `agent-result` would become a second completion unless S7 absorbs it.
6. "v2 collectors still in memory" is benign. The base-ref collector refuses `schemaVersion > 2` and never overwrites the file, so the operator step is a restart, and events are lost until then rather than corrupted.
7. `token-consumption.mts` checks `.project/metrics` before the async lease and never again. The identity pin from `workflow-metrics-state.mts` was never ported, so S5 ports it.
8. The Claude home is not always `~/.claude`. Under Orca it is the profile's `CLAUDE_CONFIG_DIR`.
9. Claude's 1,499 completions are all subagent completions. No `Stop` hook is wired today, so main-session usage needs an explicit owner decision.
10. The existing dimension cap (first come keeps the key, `bucketKey`) would push every pitch after the 50th into `(other)` forever. That is why S7 needs an LRU fold, not the same cap rule.

## Wireframes (UI scopes only, light)

Not applicable: no UI scope. The S8 report is a generated Markdown/HTML table, verified by content tests.

## Living-spec deviations log

(Empty at /plan time. /build appends as plan diverges from reality.)

### Spike gate decisions (2026-10-19, owner: Approve, recommendations as proposed, execute with Orca)
- Placement: `snapshot-map` (bounded `contexts` map inside the snapshot). TTL 6 h sliding, cap 32 sessions.
- Contingent pair: **neither**. Codex pointer (S2 `Verdict: session-log`, shape unconfirmed, ~45 LOC parser) and OpenCode child sessions (no parent id seen) go to `_followups.md` at /ship. Files stay 14 of 15; S8 assertions stay in `token-report.test.mts`.
- Claude main-session `Stop` registration (`session-turn`, agentType `primary`): **approved**, in S6 wiring. S7 must test that a `Stop` payload without `transcript_path` degrades to an `unavailable` completion.
- Pitch fallback: the "sole `status.md` row" rule is **dropped**; no usable argument means `(unattributed)`.
- S3 rules: subagent usage is read from the payload's `agent_transcript_path`; skip `isSidechain` lines in parent transcripts; repeated `message.id` keeps the last line.
- Execution: Orca (coordinator claude; implementation opencode, review codex).

## Deviations
- D1: plan names `upgradeClaudeCompletion`; the code has `canUpgradeClaudeCompletion` inside `recordCompletion`. Exits keep the behavior, not the name.
- D2: S1 lease-flake baseline recorded `0/12` (thin against the recorded ~1/12).
- D3 (S5 gate, 2026-10-19): the 7 suite failures from the committed `state-test-helpers.mts:3` `node:assert/strict` import (also red on a clean HEAD export) are accepted as pre-existing and out of budget; followup at /ship. S5 committed.
- D4 (S6): the "sole `status.md` row" fallback is dropped per the spike gate, so the S6 `status.md` symlink/oversize/FIFO tests do not apply; pitch validation tests cover missing, linked, underscore and malformed slugs instead. The `Stop` (`session-turn`) registration moves to S7 so no commit wires an event the collector would count as a completion.
- D5 (S4): signature is `readTranscriptUsage(file, deps, options)`, returns `{status:"ok"|"refused"}`; `options.final` tells the reader the transcript is complete (SubagentStop) so the last message group is released, otherwise the last group is held back. The worker's Orca worktree had an old base (not an ancestor of HEAD), so its diff was not reconciled through `orca-run reconcile`; its files were replaced by the main-thread rewrite. Attempt was collected (`completed`) and its terminal released; the worktree `token-attr-s4` is still to be removed at wrap-up.
- D6 (S7): `Stop` (`session-turn`) registered in `hooks.json` and `.claude/settings.json` (moved from S6). Its `transcript_path` is documented but not observed live; no path degrades to an `unavailable` primary completion (tested). A session-turn with no new usage is not a completion.
- D7 (S7): the "stub returns 1.5, -1, 2e12" exit is tested through the exported pure helper `transcriptTokens` (re-validates each value with `integerOrNull`), because the reader is called directly, not injected.
- D8 (S7): flow recency for scopes is insertion order (move-to-end); pitches carry an `at` timestamp. Reversal restores counters, not `at`.
