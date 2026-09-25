# Harness Integration Guide

The workflow has one portable core and three native adapters. `AGENTS.md` is the shared project contract; `ai-framework/workflow/` is the canonical phase specification; `.claude/agents/` contains the canonical role prompts.

## Capability Profiles

Select a model available in the active harness that meets the profile. Never substitute an unavailable provider or model just to match this table.

| Profile | Work | Claude Code | OpenCode | Codex |
|---|---|---|---|---|
| `fast` | Checklist review, repository search, templated reconciliation | Haiku | `opencode/mimo-v2.5-free` for non-sensitive, bounded work | `gpt-5.6-luna` or `gpt-5.6-terra` |
| `standard` | Implementation, security, UX, test reasoning | Sonnet | `openai/gpt-5.6-terra` | `gpt-5.6` at medium or high effort |
| `deep` | Shaping, architecture, ambiguous trade-offs | Opus | `openai/gpt-5.6-terra` at xhigh effort | `gpt-5.6` at high or xhigh effort |

Escalate one profile only when the returned work is demonstrably incomplete or unreliable. A harness that cannot select per-agent models should use its current model and preserve the same role separation.

## Role Profiles

| Profile | Roles |
|---|---|
| `fast` | appetite-auditor, code-reviewer, cross-pitch-conflict-checker, cross-pitch-projector, eval-runner, i18n-checker, knowledge-historian, refactor-cleaner, test-coverage-checker |
| `standard` | build-error-resolver, eval-regression-projector, security-reviewer, skeptic, ux-reviewer |
| `deep` | architect, planner |

## Claude Code

Claude Code discovers `.claude/skills/` and `.claude/agents/` directly. The `model:` values in those role files are Claude-specific suggestions. Phase skills state a profile, so another harness can make an equivalent selection.

## OpenCode

`.opencode/opencode.json` loads `AGENTS.md`. OpenCode discovers the phase wrappers in `.agents/skills/`; `.opencode/commands/` provides native phase commands, and `.opencode/agents/` provides native subagent definitions. Commands and adapters load the canonical playbooks and role prompts from `.claude/`.

The included OpenCode routes are explicit and, for now, deliberately avoid Anthropic entirely —
some OpenCode installations only have OpenAI/OpenCode Zen connected, and a route through an
unconnected provider errors instead of falling back: fast roles use `opencode/mimo-v2.5-free`
(the OpenCode Zen free tier); standard and deep roles use `openai/gpt-5.6-terra` (deep at
`xhigh` reasoning via the global provider default in `.opencode/opencode.json`, standard at the
`high` default, both explicit per-command where they need to differ from that default).
**Never route to bare `openai/gpt-5.6`** — confirmed via `opencode models openai --verbose`,
that id is a stub catalog entry (`reasoning: false`, `context: 0`, empty `variants`) despite
accepting a `reasoningEffort` option, which breaks at runtime. Its named siblings —
`gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.6-terra` — are the real, fully-specified models
(`reasoning: true`, 400k context, full `none`/`low`/`medium`/`high`/`xhigh`/`max` variants) and
are otherwise identical; this bundle standardizes on `terra` for standard/deep and `luna` for
the paid-fast route below, but any of the three works. Before assuming a model id from this doc
still resolves, check `opencode models <provider> --verbose` against your own installation —
the catalog changes over time. `workflow-doctor` and `setup-validator` are the exception among
fast roles: they use the paid `openai/gpt-5.6-luna` because diagnostics can expose broad project
context, not the free route. Connect OpenAI (and OpenCode Zen for the free tier) before running
the workflow. The free route is only for short, mechanical, non-sensitive work: OpenCode's
free-model privacy terms may permit prompt retention or training. Change every affected fast
adapter to `openai/gpt-5.6-luna` when source or task context is confidential. If Anthropic
becomes available in your OpenCode installation and you'd
rather route standard/deep work there, that's a local choice to make deliberately — it isn't the
bundle's default. Do not commit credentials or provider setup to this bundle.

## Codex

Codex reads `AGENTS.md`, discovers native skills in `.agents/skills/`, and loads native subagents from `.codex/agents/*.toml`. The included adapters use Codex model profiles. If a workspace restricts model availability, remove the `model` and `model_reasoning_effort` keys from the affected adapter; Codex then inherits the parent session's allowed model.

`.codex/config.toml` only enables a practical concurrency cap. It does not set a provider or a global model, so it does not override a user's Codex configuration.

## Instance-managed Skills

External skills are installed through the `add-skill` entry point in every vendor (Claude Code
skill, Codex skill, OpenCode command, Cursor mirror). One installation writes a wrapper into each
project vendor's descriptor path in `ai-framework/integrations/skill-vendors.json`, extended or
overridden by `.project/skills/vendors.json`, and all wrappers load the same package under
`.project/skills/packages/`. Some hosts also read other vendors' skill directories (OpenCode reads `.claude/skills/` and `.agents/skills/`);
a wrapper per vendor keeps each host's own discovery path covered without relying on that.
See `ai-framework/integrations/skills.md` for the contract.

## Token Consumption Collector

The bundle records completion metrics in a bounded local snapshot at
`.project/metrics/token-consumption.json`, with regenerated
`token-consumption.md` and `token-consumption.html` views. The directory is ignored by Git and
contains only numeric usage, cost, identifiers, and model metadata: never prompts, responses, or
transcripts.

- **OpenCode:** `.opencode/plugins/token-consumption.js` automatically records completed assistant
  messages. Its native event includes total message tokens and actual cost.
- **Claude Code:** `.claude/settings.json` records every `SubagentStop`; its `Agent` PostToolUse
  hook supplements foreground agents with final-request usage when Claude exposes it. That usage
  is intentionally labeled `partial`, not a full agent-run total.
- **Codex:** `.codex/hooks.json` records every `SubagentStop`. Codex completion hooks do not expose
  token or cost fields, so those records truthfully show `unavailable` instead of zero.
- **Cursor and other harnesses:** no portable completion payload is available. Run
  `node ai-framework/hooks/scripts/token-consumption.js --vendor <vendor> --event agent-complete`
  after an agent only when its caller can provide a supported numeric payload on stdin; otherwise
  the collector records the completion as unavailable.

The snapshot keeps only current and previous completions for comparison, lifetime aggregates, and
at most 100 idempotency keys. It does not create per-run log files.

## Sub-agent Dispatch

Any phase skill (`.claude/skills/*/SKILL.md`) or role prompt (`.claude/agents/*.md`) may spawn
its own sub-agents for independent subtasks — not only the fan-outs a skill already names
explicitly (audit's 7 reviewers, critique's 5 perspectives). This applies one level deeper too:
an agent invoked *by* a phase can itself dispatch further sub-agents for its own subtasks, when
the harness allows it.

**When to dispatch, not do it inline:**
- The subtask is genuinely independent — read-only, or writes to a disjoint file set — with a
  clear, checkable exit condition.
- It's parallelizable with other subtasks already running, or isolating it keeps the parent's
  context clean (a large or noisy exploration that would otherwise bloat the parent's context).
- Never dispatch for a single atomic step you could just do yourself — spawn overhead only pays
  off for parallelizable or context-isolatable work.

**Per-harness nested-dispatch capability:**

| Harness | Sub-agent can itself spawn further sub-agents | Notes |
|---|---|---|
| Claude Code | Yes | Costs context proportional to depth; don't nest beyond one level without a clear reason. |
| OpenCode | Yes, where the installed version's subagent config supports it | Confirm with `opencode debug config`; treat as unsupported if unclear. |
| Codex | Yes | Codex does not spawn nested agents implicitly — the parent must explicitly ask it to. |
| Cursor | Case-by-case | Depends on the installed Cursor version's agent-nesting support; verify before relying on it. |

If the active harness doesn't support nested dispatch (or support is unclear), fall back to a
sequential pass with the same role prompt and the same constrained context — skip the
parallelism, never the subtask itself.

**Model selection per spawned subtask, not per phase.** Pick the capability profile the subtask
itself needs, not the profile of whatever spawned it:
- A `deep`-profile phase (e.g. `/plan`) spawning a sub-agent to do a mechanical file inventory
  should dispatch that sub-agent at `fast` — inheriting `deep` for a checklist task spends
  budget for no quality gain.
- A `fast`-profile role spawning a sub-agent to resolve an ambiguous trade-off should escalate
  that one subtask to `standard` or `deep`, not force everything else it does up to match.
This is the "escalate one profile only when the returned work is demonstrably incomplete or
unreliable" rule above, applied per subtask instead of per phase.

**Other dispatch rules:**
- Do not run parallel writers in one worktree. Use isolated worktrees or execute write scopes sequentially.
- Each dispatched sub-agent gets a constrained context: only the slice of work it needs, not the full parent history — this is what keeps nested/parallel dispatch worth the overhead.
- Harness commands are convenience entry points. Gates, hill updates, evidence requirements, and phase transitions are enforced by the playbooks and `AGENTS.md`, not by the command name.
