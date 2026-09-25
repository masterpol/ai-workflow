# Bundle default skills

`ai-framework/integrations/skill-defaults.json` is a catalog of **proposed** external skills —
not an install list. Nothing in this bundle installs any of them into any project, including
this bundle's own checkout: a human runs `/add-skill` explicitly, exactly like any other
external skill (`ai-framework/integrations/skills.md`). This is deliberate — "no silent global
installs" applies here the same as everywhere else in this workflow.

The current catalog (verified by real `add-skill.js inspect` calls, not assumed):

| Skill | Purpose | Runtime prerequisite |
|---|---|---|
| `juliusbrussee/caveman/caveman` | Brevity/communication mode (`lite`, `full`, `ultra`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`) | none |
| `juliusbrussee/caveman/caveman-stats` | Token/mode usage reporting, per-host | none (host-aware in its own instructions) |
| `juliusbrussee/caveman/caveman-compress` | Compresses a memory file (e.g. `CLAUDE.md`) into brevity style, with an out-of-tree backup | `python3` |
| `vercel-labs/agent-browser/agent-browser` | Browser automation CLI, served live from the installed binary | `agent-browser` CLI (`npm i -g agent-browser`) |

## Caveman mode

`caveman` is a self-contained, session-persistent style skill with its own switch
(`/caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra|off`). This workflow does not
reimplement that — it adds a **precedence-resolution layer** so every canonical phase skill
(`shape`, `critique`, `plan`, `build`, `audit`, `ship`, `cooldown`) can decide, per invocation,
which level (if any) to tell the agent to invoke `caveman` at, without each phase inventing its
own logic. Only the canonical phase files carry the resolution paragraph — every vendor mirror
already says "load the canonical file and follow it exactly," so no mirror needed editing.

```sh
node ai-framework/scripts/skill-defaults.js resolve-mode --phase build --args-text "$ARGUMENTS" [--root P] [--json]
node ai-framework/scripts/skill-defaults.js resolve-mode --phase build --arg lite [--root P] [--json]
node ai-framework/scripts/skill-defaults.js report [--root P] [--json]
```

A phase invocation's arguments are free-form text, not a parsed flag set (e.g. a user typing
`/build caveman=lite fix the login bug`) — a caller cannot reliably hand-extract just the mode
token before calling this without duplicating the extraction logic. `--args-text` takes that raw
text as-is: it extracts a `caveman=<mode>` token if one appears anywhere in it (case-insensitive)
and ignores everything else; no `caveman=` mention at all is not an error, it just falls through
to the instance/bundle default. A `caveman=<value>` mention with an unrecognized value **is**
rejected loudly — that is a real typo, never silently ignored. `--arg` (an exact mode string, no
extraction) remains available for programmatic callers that already have just the mode value —
the two options are mutually exclusive. Every canonical phase file uses `--args-text
"$ARGUMENTS"`, verified against the literal invocation shape this would actually receive (see
`skill-defaults.test.js`'s `extractInvocationArg` coverage) — this was found and fixed after the
first version shipped with a bare `--arg $ARGUMENT`, which fails validation the moment real
invocation text carries anything beyond the mode word alone.

### Coverage: every skill and every agent

The instruction is not limited to the seven phases. Every canonical skill (`.claude/skills/*`)
and every canonical agent (`.claude/agents/*`) carries it, resolved through the same chain under
one of nine scopes: the seven phase names, `utility` (every non-phase skill — `add-skill`,
`checkpoint`, `search`, ...), and `agent` (every dispatched role). An instance can override
`utility` or `agent` in `modes.json` like any phase. Agents also receive the mode from the phase
that dispatched them (the phase files pass their resolved mode down); a read-only agent that
cannot run commands simply follows the mode it was handed. OpenCode and Codex agent/skill
mirrors point at the canonical file, so they inherit it; Cursor mirrors are byte copies and are
re-synced with `skill-vendors.js cursor-mirrors`.

Everything that describes or validates the workflow knows about it:
- `workflow-doctor.js` reports a `Caveman mode` line with the live state — `active`, `inert` (not
  installed), disabled, persistently off, or **under-covering** (the installed wrapper omits a
  catalog-recommended phase, and it tells agents not to activate outside its listed phases) — and
  fails on a malformed `.project/skills/modes.json`, which would otherwise make every skill's
  command fail at runtime. It also requires the response-style section in `AGENTS.md`/`CLAUDE.md`
  of this bundle (`setup-validator.js` only warns in a target project, whose own file may predate it).
- `skill-defaults.js report` lists each default's installed phases and the gap against
  `recommendedPhases` in the catalog.
- The token-consumption Markdown and HTML reports show a `Caveman mode` column per record
  (`Unavailable` when no mode is configured — never guessed).
- Per-vendor coverage and verification status: `ai-framework/integrations/harnesses.md`.

This is enforced, not just documented: `workflow-doctor.js` fails if any canonical skill or agent
lacks the instruction (registry-installed upstream skills are exempt — they are not ours), and
`skill-defaults.test.js` checks each file names a scope `resolve-mode` accepts, runs the exact
command each one names, and confirms every mirror is current or a pointer. The instruction is
inert until `caveman` is actually installed with `/add-skill`.

Precedence: an explicit invocation-scoped `caveman=<mode>` argument on that phase command beats
a per-phase instance override, which beats an instance default, which beats the bundle default
(`full`). An invocation-scoped choice applies **only to that call and whatever it dispatches** —
it is never written to disk. Only editing `.project/skills/modes.json` directly persists a
choice across invocations, matching the pitch's "disabling persists only when explicitly
requested."

Instance state — `.project/skills/modes.json` (project scope only; this file lives under
`.project/`, which is outside every `bundle-sync.js` `SYNCED_DIRS` entry, so it is never touched
by a sync, the same protection `.project/skills/registry.json` already has):

```json
{ "schemaVersion": 1, "caveman": { "enabled": true, "default": "full", "phases": { "build": "lite" } } }
```

`enabled: false` is the only persistent disable; it still yields to an explicit `--arg` for one
call. `resolve-mode` rejects any mode string outside the six levels (plus `off`) with a clear
error rather than silently falling back.

## Token-usage attribution

`ai-framework/hooks/scripts/token-consumption.js` tags each recorded event with the
currently-configured mode (best-effort, `null` when `modes.json` doesn't exist), purely for our
own reporting completeness. It does **not** read, invoke, or duplicate `caveman-stats`'s own
reporting — that skill is Claude-Code-hook-specific by its own design and already handles other
hosts in its own instructions; parsing its private hook files here would be a fragile, needless
coupling. No token savings are ever inferred, invented, or summed from this attribution.

## Compress guard

`caveman-compress` has no knowledge of this project's own historical-record guardrails. Before
it is ever suggested for a path, `ai-framework/scripts/skill-compress-guard.js`'s `canCompress()`
refuses anything under `.project/pitches/`, `.project/pitches/_archive/`, `.project/design/`, or
`.project/knowledge/`, and reports (never assumes) whether `python3` is available. It does not
run the compression itself or reimplement its backup/restore — upstream already does that
correctly; this guard is consulted before a human approves running it.

## Browser runtime

`ai-framework/scripts/browser-runtime.js`'s `report()` checks whether the `agent-browser` skill
is installed (via the registry) and whether its CLI resolves on `PATH` — never attempting
`npm i -g agent-browser` or `agent-browser install` itself. `status` is one of `"unsupported"`
(CLI absent — a host-capability fact that overrides everything else), `"not-installed"`,
`"installed-disabled"`, or `"ready"`; a missing CLI is data, never a thrown failure.

## Verification

```sh
node --test ai-framework/scripts/skill-defaults.test.js ai-framework/scripts/skill-compress-guard.test.js ai-framework/scripts/browser-runtime.test.js ai-framework/hooks/scripts/token-consumption.test.js
node --check ai-framework/scripts/skill-defaults.js ai-framework/scripts/skill-compress-guard.js ai-framework/scripts/browser-runtime.js
```
