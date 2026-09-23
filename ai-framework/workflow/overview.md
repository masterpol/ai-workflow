# AI-Assisted Development Workflow

ShapeUp + agentic-coding pipeline. Five phases plus a periodic learning surface.

## Pipeline

```
(optional) brainstorm → /shape → /critique (auto) → bet → /plan → /build → /audit → /ship
                                                                                     → every 5 ships: /cooldown
```

**Pre-`/shape` thought partner (informal):** when a problem isn't framed yet, ask the active assistant to "search around and propose 2-3 options, don't write any files." An installed brainstorming skill is optional. This is a one-shot exploration, not a phase; output is verbal alignment that informs `/shape`, not an artifact. Skip when the problem is already clear.

| # | Phase | Purpose | Key mechanic |
|---|-------|---------|--------------|
| 0 | **/shape** | Frame problem, set appetite, name rabbit holes, write no-gos | Knowledge gate (mandatory first) + breadboard + bet/re-shape/pass |
| — | **/critique** | Pre-bet red-team (auto for big-batch + AI) | 5 perspective subagents fan out: knowledge-historian, skeptic, appetite-auditor, cross-pitch-projector, eval-regression-projector |
| 1 | **/plan** | Decompose into independent scopes with machine-checkable exits | Parallel-dispatch plan + hill chart initialized |
| 2 | **/build** | Execute scopes, hill-tracked, parallel where flagged | Verification-before-completion enforced — `/hill {scope} done` requires evidence |
| 3 | **/audit** | Parallel fan-out of review/security/test/ux/i18n/eval/cross-pitch | Cycle ≤3; must-fix tier blocks /ship |
| 4 | **/ship** | Reconcile pitch ↔ implementation, extract knowledge, compact status | Final /verify mandatory; status capped at ≤100 lines |
| 5 | **/cooldown** | Promote issue → pattern → rule; prune stale; triage backlog | Every 5 ships; per-item approval |

## Workflow variants

### Big-batch feature (full pipeline)
```
/shape → /critique → bet → /plan → /build → /audit → /ship
```

### Small-batch feature (light pipeline, fewer gates)
```
/shape → bet → /plan (1-screen mini) → /build (auto-advance) → /audit (auto-flow if clean) → /ship
```
`/critique` skipped; per-scope confirmation skipped.

### Bug fix
```
/fix (triage) → /build → /audit → /ship
```
`/fix` searches knowledge and confirms the root cause, then hands off. Single implicit scope; mandatory `log.md` entry; full /audit fan-out still runs.

### Hotfix
```
/build → /audit (single pass) → /ship
```
One audit cycle only; anything beyond it is deferred to a follow-up. Rollback plan required at /ship; explicit residual-risk acceptance at the audit gate.

## Adaptive confirmation gate

| Phase | small-batch | big-batch | bug-fix | hotfix |
|-------|-------------|-----------|---------|--------|
| /shape (bet) | gated | gated | n/a | n/a |
| /plan | gated (light) | gated (full) | n/a | n/a |
| /build start | auto | gated | gated | gated + rollback |
| /build per scope | auto | gated (evidence) | n/a | n/a |
| /audit end | auto if zero must-fix | gated | auto if clean | gated (residual risk) |
| /ship | gated (brief) | gated (full) | gated | gated |

## Hill chart

Per-pitch live tracking at `.project/pitches/{slug}/hill.md`. `/hill {scope} {position}` in the phase docs is shorthand for updating that scope's row in `hill.md` — it is not a separate command. Positions:

```
uphill 0%  → uphill 25%  → uphill 75%  → over-the-hill  → downhill 25%  → downhill 75%  → done
```

Stuck-uphill detector: a scope at the same uphill position across 3 session updates triggers a "rabbit hole?" warning. Direct application of ShapeUp's hill-chart insight.

## Pitch folder layout

```
.project/pitches/
├── {slug}/
│   ├── pitch.md          ← /shape output
│   ├── plan.md           ← /plan output
│   ├── hill.md           ← live progress
│   ├── log.md            ← in-build incident notes
│   ├── deviations.md     ← plan ↔ reality drift
│   ├── checkpoint.md     ← latest /checkpoint (overwritten, < 300 tokens)
│   └── SHIPPED.md        ← /ship reconciliation
├── _followups.md         ← single-file backlog of deferred should-fixes
├── _parked/              ← passed pitches awaiting context shift
├── _archive/             ← shipped pitches that compacted out of status.md
└── _templates/           ← scaffolds for new pitches
```

## Status.md (≤100 lines hard cap)

Top-level `.project/status.md` is an **index**, not a log:

```markdown
## Active pitches
| Pitch | Hill | Phase | Appetite | Last touched |

## Parked pitches

## Recent ships (last 5)
- YYYY-MM-DD slug → runs/...

## Open rabbit holes across active pitches

## Followups backlog
→ .project/pitches/_followups.md ({N} items)

## /cooldown due in: {N} ships
```

Detail lives per-pitch in `pitches/{slug}/`; history lives in `.project/runs/`.

## Multi-pitch parallel work (first-class)

Each shaped pitch lives in its own folder. `/resume {slug}` loads only that pitch's context (~2K tokens). `/switch {slug}` checkpoints current and loads target. Worktrees-per-pitch are the default for big-batch (isolates parallel subagent file changes; orchestrator merges on completion); small-batch can share the main worktree if file sets are disjoint.

Cross-pitch contention is checked twice:
- **Pre-bet** at `/critique` by `cross-pitch-projector` (against breadboard's projected file set)
- **Post-build** at `/audit` by `cross-pitch-conflict-checker` (against actual diff)

## Subagent model routing

| Where | Capability profile | Why |
|---|---|---|
| Parent orchestrator (/shape, /plan, /build) | deep / standard | High-leverage thinking and implementation |
| /critique perspectives | fast (3) + standard (2) | Mostly mechanical pre-mortem |
| /audit code-reviewer / test-coverage / i18n / eval-runner / cross-pitch | fast | Checklist-based |
| /audit security-reviewer / ux-reviewer | standard | Reasoning required |
| /ship | fast | Templated reconciliation |
| /cooldown | standard | Pattern-promotion judgment |

Select profiles using `ai-framework/integrations/harnesses.md`. Per-provider costs vary; no savings claim applies until the configured models and prices are known.

## Confirmation gate philosophy

Every gated phase: **Approve / Revise / Back / Stop**. Never auto-advance through a gated phase. Adaptive gate skips gates where they don't earn their keep (small-batch and bug-fix flow more autonomously; big-batch and hotfix keep tighter checkpoints).

## Phase details

See `workflow/phases/`:
- `0-shape.md`
- `1-plan.md`
- `2-build.md`
- `3-audit.md`
- `4-ship.md`
- `5-cooldown.md`
