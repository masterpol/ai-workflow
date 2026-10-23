# S3 spike: Claude transcript JSONL shape

Verdict: subagent-file
Main-session Stop: recommend

Sample: 610 transcript files under `<claude-home>/projects/` (448 of them in `subagents/` subfolders). Field shapes, counts and byte sizes only; no content was read into this file.

## Assistant line fields

| What | Key path | JS type |
|------|----------|---------|
| line type | `type` ("assistant") | string |
| model | `message.model` | string |
| message id | `message.id` | string |
| input tokens | `message.usage.input_tokens` | number |
| cache write | `message.usage.cache_creation_input_tokens` | number |
| cache read | `message.usage.cache_read_input_tokens` | number |
| output tokens | `message.usage.output_tokens` | number |
| other usage keys (ignore) | `output_tokens_details`, `server_tool_use`, `cache_creation` (objects); `service_tier`, `inference_geo`, `speed` (strings); `iterations` (array); `fallback_credit` (null) | mixed |

Other `message.*` keys: `content` (array), `role`, `type`, `stop_reason` (string), `stop_sequence`, `stop_details`, `container`, `diagnostics`, `context_management` (objects). Top-level line keys include `isSidechain` (boolean), `agentId`, `requestId`, `sessionId`, `uuid`, `parentUuid`, `timestamp`.

## Repeated message.id lines

- One assistant line is written per content block, so a `message.id` repeats. In the sample, 24891 repeats were checked across all files.
- Repeats are always contiguous in the sampled 60 files (0 non-contiguous repeats among 1779 repeats there).
- Usage is identical on most repeats (1574 of 1779). When it differs (205), only `output_tokens` changes, and it only grows (0 cases of a later value being smaller across all 610 files).
- Rule: count one record per `message.id`; keep the LAST line, which equals the max for each field. Using max per field is equivalent and safe if order ever differs.

## Where subagent usage lives

- Parent transcripts: 151675 lines, 0 with `isSidechain: true`, 0 with `agentId`. No subagent usage is inlined in the parent.
- Subagent transcripts live in separate files in a `subagents/` folder next to the parent session file. Their lines are almost all `isSidechain: true` (49104 of 52716) and carry `agentId`.
- Verdict `subagent-file`: read subagent usage only from the payload's `agent_transcript_path` file (or that folder). Because the parent never contains sidechain lines, there is no double count between parent and subagent files. Defensive rule: when reading a parent transcript, skip any line with `isSidechain: true`.
- The repo's adapter test uses `tool_response.transcript_path` on PostToolUse(Agent), which points at the same subagent file; attribute each file once, keyed by agent id.

## Hook ordering

`token-consumption.mts` `recordCompletion` (`canUpgradeClaudeCompletion`) assumes SubagentStop is recorded first as an `unavailable` completion, then PostToolUse(Agent) (`agent-result`) upgrades it when the agent type matches. Its test (`token-consumption.test.mts`, around lines 370-380) covers this with the async launch note: for async agents PostToolUse(Agent) fires at launch (`isAsync`, only leaves a model note) and SubagentStop fires at completion. The order SubagentStop then PostToolUse(Agent) for foreground agents is the one the code encodes; this spike did not observe live hook timing (transcripts do not record it), so the S6 tests should keep both orders working (the existing identity-key match path already does).

## Sizes and rewrites

- Byte size over 610 sampled transcripts: p50 = 527815, max = 76509810.
- Suggested read cap: tail-read with a cap of a few MB per file (p50 is about 0.5 MB, max about 76 MB).
- Shrink/rewrite: a static snapshot cannot show a file shrinking. Transcripts are append-only in normal use, but compaction/resume can write new files and top-level keys such as `snapshot`, `isSnapshotUpdate` and `parentSessionId` show rewritten or forked sessions exist. Keep the shorter-file rule: if the file is smaller than the stored offset, reset the offset to 0 and re-read, de-duplicating by `message.id`.

## Claude home root

Under Orca, `CLAUDE_CONFIG_DIR` is set (a per-profile directory outside `~/.claude`), and transcripts are under `<claude-home>/projects/<encoded-cwd>/<session>.jsonl`, with subagent files in `<session>/subagents/`. Resolve the root as `CLAUDE_CONFIG_DIR` if set, else `~/.claude`. In practice use the payload's `transcript_path` and `agent_transcript_path` directly and only validate that they resolve under that root.

## Main-session Stop

Claude Code hook payloads share `session_id`, `transcript_path`, `cwd` and `hook_event_name`, so the `Stop` payload carries `transcript_path` (documented behavior, not verified against a live payload here). Recommendation: wire `Stop` as a `session-turn` event (agentType `primary`), approved at the spike gate since it changes Claude's completion unit. Stop fires per turn, so dedupe by `message.id` and offset when reading.
