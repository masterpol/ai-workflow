# Model Routing Strategy

Route tasks to the cheapest model that can do the job well.
Implements the cascade pattern from compound AI research: cheap API → capable API → powerful API.

---

## Cascade Pipeline

```
Task dispatched
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Tier 1 — fast                                  │
│  /audit subagents: code-reviewer, test-coverage │
│                  i18n-checker, eval-runner,     │
│                  cross-pitch-conflict-checker   │
│  /critique perspectives: knowledge-historian,   │
│                          appetite-auditor,      │
│                          cross-pitch-projector  │
│  /ship — templated reconciliation + extraction  │
│                                                 │
│  Task too complex for fast?                     │
│  └── Yes → escalate                             │
└─────────────────────────────────────────────────┘
    │ escalate
    ▼
┌─────────────────────────────────────────────────┐
│  Tier 2 — standard (default)                    │
│  /build orchestrator and most coding subagents  │
│  /audit: security-reviewer, ux-reviewer         │
│  /critique: skeptic, eval-regression-projector  │
│  /cooldown — pattern-promotion judgment         │
│                                                 │
│  Genuinely ambiguous architecture?              │
│  └── Yes → escalate                             │
└─────────────────────────────────────────────────┘
    │ escalate (rare)
    ▼
┌─────────────────────────────────────────────────┐
│  Tier 3 — deep                                  │
│  /shape orchestrator (always)                   │
│  /plan orchestrator (big-batch only)            │
└─────────────────────────────────────────────────┘
```

---

## Tier Overview

| Tier | Capability | When to Use |
|---|---|---|---|
| **1 — fast** | Cheapest available capable model | Checklist phases, structured analysis, mechanical patches |
| **2 — standard** | Default capable implementation model | Feature development, security, most workflow phases |
| **3 — deep** | Strongest available reasoning model | Complex architecture decisions only |

Harness mappings and role assignments: `ai-framework/integrations/harnesses.md`.

## Portable Provider Defaults

| Profile | Claude Code | OpenCode | Codex |
|---|---|---|---|
| `fast` | Claude Haiku | `opencode/mimo-v2.5-free` | GPT-5.6 Luna or Terra |
| `standard` | Claude Sonnet | `openai/gpt-5.6-terra`, high reasoning | GPT-5.6, medium/high reasoning |
| `deep` | Claude Opus | `openai/gpt-5.6-terra`, xhigh reasoning | GPT-5.6, high/xhigh reasoning |

Never route OpenCode to bare `openai/gpt-5.6` — it's a stub catalog entry with no real reasoning
support (`reasoning: false`, `context: 0`), unlike its named siblings `gpt-5.6-luna`/`-sol`/`-terra`.
Verify with `opencode models <provider> --verbose` if in doubt; the catalog changes over time.

OpenCode's routes deliberately avoid Anthropic for now — some installations only have
OpenAI/OpenCode Zen connected, and a route through an unconnected provider errors rather than
falling back. The free route is confined to bounded, mechanical fast roles and non-sensitive
`/ship` reconciliation. Free endpoints can retain prompts or use them for service improvement,
so replace `opencode/mimo-v2.5-free` with `openai/gpt-5.6-luna` in every fast adapter before
using it with confidential source or data. There is no silent fallback: connect the required
providers in OpenCode first, and let a missing configured model fail rather than downgrading a
security or architecture task.

---

## Phase-to-Model Mapping (new pipeline)

| Phase / Subagent | Profile | Notes |
|---|---|---|
| `/shape` orchestrator | deep | Creative reasoning: problem framing, breadboarding, decomposing epics |
| `/plan` orchestrator (big-batch) | deep | Architecture trade-offs, parallel-dispatch decisions |
| `/plan` orchestrator (small-batch) | standard | Mechanical scope decomposition |
| `/build` orchestrator | standard | Default coding workhorse |
| `/audit` orchestrator | standard | Synthesis of subagent findings |
| `/ship` orchestrator | fast | Templated reconciliation + extraction + compaction |
| `/cooldown` orchestrator | standard | Pattern-promotion judgment |
| **/critique perspective subagents** | | (parallel fan-out) |
| `knowledge-historian` | fast | Mechanical search of knowledge graph |
| `skeptic` | standard | Stack-aware reasoning about missed rabbit holes |
| `appetite-auditor` | fast | Math/comparison projection |
| `cross-pitch-projector` | fast | File-set comparison |
| `eval-regression-projector` | standard | Reasoning about regression types and golden-case gaps |
| **/audit subagents** | | (parallel fan-out) |
| `code-reviewer` | fast | Pattern matching against coding-standards + boundaries |
| `security-reviewer` | standard | Reasoning about attack vectors + OWASP |
| `test-coverage-checker` | fast | Mechanical coverage analysis |
| `ux-reviewer` | standard | Heuristic judgment (Nielsen 0–3 rubric) |
| `i18n-checker` | fast | Mechanical: missing keys, locale parity |
| `eval-runner` | fast | Runs commands, parses scores |
| `cross-pitch-conflict-checker` | fast | File-set comparison vs other active pitches |
| **/build coding subagents** | | (when dispatched) |
| `build-error-resolver` | standard | Build/type diagnostics |
| `refactor-cleaner` | fast | Mechanical rename/delete/move |
| Hooks (post-edit) | — | Deterministic checks (format, typecheck, boundary) — no model |

---

## Recommended-tier banners (advisory)

Each pipeline phase's `SKILL.md` opens with a capability-profile banner (for example, `/shape` → `deep`, `/ship` → `fast`). When a phase starts, choose an available model for that profile using `ai-framework/integrations/harnesses.md`.

This is **advisory only — a nudge, not a gate:**

- In a harness with model selection, use that harness's supported model switch or role configuration. The user decides.
- In a harness without per-agent selection, keep the available current model and preserve the role separation.

There is no enforcement hook and no logging event backing this — it lives entirely in the phase skills' opening lines, which keeps it portable and dependency-free.

### Quick Reference

| Recommend fast | Recommend standard | Recommend deep |
|-----------------|-----------------|----------------|
| /ship, all mechanical /audit + /critique subagents | /build orchestrator, /audit security/ux, /critique skeptic + eval-regression-projector, /cooldown | /shape always; /plan big-batch only |

### Conditional Phases

| Phase | Condition | Profile |
|-------|-----------|-------|
| `/plan` | small-batch | standard |
| `/plan` | big-batch | deep |
| `/build` | bug-fix | standard |
| `/build` | hotfix | standard |

---

### Rule of thumb
Start each phase on the recommended profile. Upgrade only when the current model produces noticeably wrong output (bad architecture decisions, misunderstood requirements). Most sessions do not need the deep profile.

---

## Cost Optimization Rules

### Always
- Use fast for `/ship` and mechanical `/audit` + `/critique` subagents — checklist phases
- Keep `/build` on standard; reserve deep for `/shape` and big-batch `/plan`
- Avoid deep unless standard is genuinely failing on the task

### Context budget discipline
See `rules/context-management.md` for token budgets per phase.
Smaller context = lower cost regardless of model tier.

### Don't over-front-load context
- Load only what the current phase needs
- Search `knowledge/` instead of bulk-loading all ADRs
- Use transition summaries in `status.md` instead of re-reading full docs

---

## Cost Measurement

Compare actual configured-provider prices and token usage before claiming savings. Deterministic checks (formatting, type checking, boundary validation) use no model and should remain preferred where applicable.

---

## Why Not LangGraph / CrewAI / DSPy?

Those frameworks are for building AI *applications*. The supported coding harnesses can orchestrate focused subagents, while the main session owns decisions and synthesis.

The cascade approach above achieves the same cost savings (26–70% documented in research) without adding a dependency or learning curve. Add external frameworks only if you're building a product that needs them.
