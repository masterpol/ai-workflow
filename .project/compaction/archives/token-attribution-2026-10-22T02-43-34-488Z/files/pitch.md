# Pitch: token-attribution

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected ~13)
**Stack**: backend (Node `.mts` hooks, collector, OpenCode plugin, Codex hook)

Part 1 of 2. Split from the first draft `token-metrics-redesign` after critique A1 (22 files projected). Part 2 is `token-time-report` (time, flow, ratios, joined report); it is shaped after this one ships and joins on the key this pitch produces.

## Problem

The owner cannot say which pitch, phase or scope spent the tokens. The token snapshot groups by vendor, model and agent, and Claude (1,499 completions) and Codex (51) report no tokens at all, so the report is empty for the tools used most. This pitch makes every completion carry real numeric usage and a pitch/phase/scope key.

## Knowledge consulted

- decisions/token-metrics-dimensions-design — v2 schema, units per vendor, `Unreported`/`Unpriced` rules; its no-gos on Claude transcript reads are overridden by the owner (below).
- decisions/collector-metrics-lease-design — one writer via loopback lease; every new write goes through `withLease` and fails closed.
- patterns/reversible-aggregates-store-their-routing; patterns/allow-list-untrusted-labels-at-ingest-and-at-render.
- issues/async-agent-launch-hook-counted-as-completion; issues/metrics-ancestor-swap-during-async-lease; patterns/pin-directory-identities-across-async-leases.
- issues/a-schema-version-bump-left-98-stale-tests-and-the-migrator-on-the-old-version; patterns/a-version-migrator-edits-the-token-not-the-model.
- issues/hardening-a-shared-reader-made-its-writer-destructive; patterns/parse-untrusted-values-and-re-emit-them; patterns/resolve-before-matching-a-protected-path-allowlist; patterns/a-writer-reinspects-the-target-at-the-publish-step.
- patterns/display-buckets-are-not-lifecycle-identities; issues/macos-tmpdir-realpath-alias-breaks-path-assertions.
- `_followups.md`: lease-port flake (~1 in 12) must not get worse.

Owner decisions (2026-10-19, override earlier no-gos): Claude usage is read from the local transcript, numeric fields only; attribution is pitch → phase → scope.

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- P1 Active-context pointer: one small file per session id under `.project/metrics/`.
- P2 Usage reader (new module): numbers out of one Claude transcript.
- P3 Collector `token-consumption.mts`, OpenCode plugin, Codex hook, `hooks.json`.
- P4 Snapshot schema migration (token snapshot version bump).

**Affordances per place**:
- P1: written by a shared phase-start hook (orca-start hooks), not by per-skill prose, so the model cannot skip it; cleared at phase finish; carries a timestamp so a stale pointer (crash, abandoned phase) is ignored after a TTL. Child sessions (subagent, OpenCode child, Codex thread) resolve to the parent's pointer. A completion with no valid pointer is `(unattributed)`, and the share of unattributed completions is reported.
- P2: reads from a saved byte offset, before taking the lease, with byte and time caps. Keeps only `model`, `message.id` and the `usage` numbers; dedups by message id; advances the offset only to the last complete newline; resets the offset if the file is shorter (compacted or resumed). Follows the subagent or sidechain transcript when the payload names it.
- P3: stamps each completion with the key and stores the key on the record, so a later upgrade or reversal hits the same row. Offset and totals commit in one atomic snapshot write under the lease. Adds a `flows` aggregate keyed by pitch, phase and scope with an unambiguous composite key encoding, per-level key caps, and routing stored per record.
- P4: schema bump appends a migrator step proven through the strict reader; constant, emitter, refusal regex and fixtures change in one commit. v2 collectors still in memory (OpenCode plugin) are handled as a named operator step.

**Connections**: phase start → hook writes P1 pointer → agent finishes → hook payload → P2 reads usage (Claude) or payload supplies it (OpenCode; Codex if available) → P3 stamps the key and commits under the lease → `flows` available to part 2.

## Rabbit holes

**Resolved here** (with answer):
- Transcript content stays out → reader outputs only values built from parsed numbers, re-validated at the write point; a test greps all outputs for fixture-transcript markers.
- Path safety → the transcript path is resolved to its real path before matching the Claude home project directory; symlinks and non-regular files get a distinct refusal outcome (not `null`), and the writer is tested against the hostile shape.
- Exactly-once → dedup by message id plus offset committed in the same write as the totals; tests cover repeated Stop, partial trailing line, shorter file and a failed write.
- Lease hold time → file read happens before the lease; only offset commit and aggregate write are inside it.
- Cost → no estimated cost; Claude shows tokens with cost `Unpriced`.
- Version naming → call it "token snapshot revision", never "v3" (clashes with toon schemaVersion 3).

**Pushed to /plan as risk** (with named owner):
- Pointer placement for Claude, OpenCode and Codex, and parent-child session mapping — owner: S1 spike first.
- Codex usage availability (payload or session log); if none, Codex stays `Unavailable` and the report says so — owner: S2, one-hour spike.
- Per-worktree metrics directories split the data; decide whether to resolve to the main checkout or document the limit — owner: S1.
- Key caps (the existing limit is 25 per dimension) per level so `(other)` does not hide the answer — owner: S3.
- Rollout interaction: land hook changes before `workflow-v3-rollout`'s next bundle-sync, re-run its dry run, and give new tests isolated lease ports — owner: S4.

**Pushed to no-go** (deferred):
- Time, flow outcome, efficiency ratios and the joined report (part 2, `token-time-report`).
- Estimated cost; back-filling history.

## No-gos (this pitch)

- ✗ Storing prompts, responses, tool arguments or any transcript text.
- ✗ Estimated tokens or cost for any vendor.
- ✗ Per-message or per-run logs, or unbounded arrays.
- ✗ Changing the lease mechanism or merging the two metrics stores.
- ✗ A Cursor collector, a dashboard server or network calls.
- ✗ Blocking the agent: the collector still never fails a hook.
- ✗ Back-filling history; counts start at the revision date, printed in the report.

## Critique findings

Full table is recorded in the first draft's run on 2026-10-19; each finding is addressed above. Severity-high items: A1 (resolved by this split), S1 (reader: offset, sidechain, partial line, lease), S2 (`flows` reversal, key on record, caps, v2 collectors), K1 (version bump in one commit).

| ID | Disposition |
|----|-------------|
| A1 | Addressed: split in two |
| A2 | Addressed: shared phase-start hook |
| A3 | Acknowledged: re-count after spikes |
| S1, S2, S3 | Addressed in P1-P4 and rabbit holes |
| K1-K9 | Addressed: cited in Knowledge consulted, enforced as exit checks in /plan |
| X1-X3 | Addressed: S4 owns rollout ordering and test ports |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner approved "bet all three shaped pitches, plan in order" after critique (A1 resolved by the split; S1-S3, K1-K9, X1-X3 addressed above).
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}
