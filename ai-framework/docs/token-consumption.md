# Token Consumption

← [Back to README](../../README.md)

After agent completion, the collector updates these Git-ignored local files:

- `.project/metrics/token-consumption.json` is the only stored metric state. It holds current and
  previous completion consumption, increase/decrease comparison inputs, lifetime aggregates, and a
  bounded deduplication list.
- `.project/metrics/token-consumption.md` and `.project/metrics/token-consumption.html` are
  regenerated views for a quick report or browser dashboard. They open with a **Usage** summary
  (most used vendor and model, and the basis it was ranked on), followed by tables by vendor,
  model, agent, reasoning effort, and skill.

The by-model, by-agent, by-effort, and by-skill tables start counting when the snapshot moves to
schema v2 (the report prints the date) and are not back-filled. A harness that does not report a
field shows `Unreported`; a completion with no nonzero cost shows `Unpriced`. Only skill names are
recorded, never a skill's arguments. Completion counts are per assistant message for OpenCode and
per subagent run for Claude Code and Codex, so they are not comparable across vendors.

OpenCode reports per-message token fields and actual cost. Claude Code reports a completion for
every subagent and can supplement foreground agents with final-request usage, which is labelled
partial. Codex records all subagent completions but its hook payload supplies no token or cost
fields, so those values are reported as unavailable rather than zero. Cursor has no verified
completion-hook payload and is not wired automatically.

**One writer at a time.** Each writer (the hook CLI and the OpenCode plugin) holds a loopback
socket on `127.0.0.1` for the whole read, write and report step. The port is derived from the
metrics directory's real path, in the range 20000–29999. The kernel holds that socket while the
writer runs, including while it is paused, and frees it when the writer exits or dies. A waiting
writer gives up after about one second and skips that event: telemetry is best-effort and never
blocks the agent. The same skip happens if another program already listens on `127.0.0.1` at the
derived port, or if a sandbox refuses loopback sockets. A program listening on all interfaces at that
port does not block the collector on macOS; it is not a metrics writer, so it cannot corrupt the snapshot. The collector never falls back to a different port or to a lock
file. This has been verified on macOS only; Linux and Windows are not yet verified. Writers in
separate network namespaces that share one directory are not kept apart.

**Upgrading from a collector that used a lock file.** Earlier collectors used
`.project/metrics/.token-consumption.lock`. The new collector cannot keep an old one from writing,
so it skips every event while that file exists. It never removes the file itself. To migrate:

1. Stop every old writer: finish running agent sessions and restart OpenCode, whose plugin keeps
   the old code loaded in memory.
2. Delete `.project/metrics/.token-consumption.lock` if it exists. Do not delete anything else:
   `token-consumption.json` and its reports stay as they are, and totals carry over unchanged.

Event ids now use a structured form. An event recorded under the old colon-joined id can
therefore be counted a second time if a harness replays it after the upgrade. This happens at
most once per such event.

**Re-running setup:** `/setup` (or re-reading `SETUP.md`) detects existing context docs and
offers Refresh all / Merge / Selective / Cancel. Merge mode shows a diff and preserves manual
edits where possible; Refresh all overwrites selected generated documents only after your
explicit approval.

**Verify the install** — run the workflow doctor (below), then a dry run: give the AI a tiny
first task and run `/shape` (or read `.claude/skills/shape/SKILL.md`) to confirm the pipeline
flows end to end.

**Troubleshooting:**
- *Tool didn't self-trigger setup* — it may not auto-read `CLAUDE.md`/`AGENTS.md` on your
  version; explicitly ask it to read `SETUP.md`.
- *`CLAUDE.md` still looks like a bootstrap stub after setup* — setup was interrupted before its
  Step 4; re-run `/setup` to regenerate the full mirror.
- *Something looks missing or broken* — run `node ai-framework/scripts/workflow-doctor.mts`; it
  diagnoses far more precisely than guessing, and `--fix` can restore missing `.project` files
  without touching anything you've written.

---

See also: [setup](setup.md) · [workflow-doctor](workflow-doctor.md)
