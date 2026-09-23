# Phase 0: Shape

## Purpose

Frame the problem, set appetite, and bound the work — *before* engineering. Most recurring failures (lossy round-trips, OpenAI strict-mode rejections, dndkit ordering, build-gate misses) are rabbit-hole classes that pre-shaping catches at this phase for a fraction of the cost of catching them post-implementation.

## Trigger

- User describes a need
- `/shape` command
- Bug-fix and hotfix workflows skip this phase

## Activities (in order)

### 1. Knowledge gate (mandatory, FIRST)

Look up `.project/knowledge/graph.json` first — its `tagIndex` and `nodes[].title` let you find
candidate entries without reading every file, and `edges`/`related` pull in anything one hop
away from a direct match. Rebuild it (`node ai-framework/scripts/graphify.js`) if it looks
missing or stale, then read the matched files under `.project/knowledge/` (issues + patterns +
decisions). Also check `ai-framework/rules/` and `.project/rules/*.md` for any existing
constraint on the area the pitch touches (e.g. an auth-related pitch should surface
`.project/rules/backend.md`'s auth-guard pattern here, not discover it for the first time at
`/build`). Surface 3-5 hits inline before any writing. This is what catches "we already learned
this" — examples that would have been pre-empted:

- pitch about wizard or upsert flows → hits `wizard-lossy-round-trip-and-openai-strict`
- pitch touching AI prompts → hits `generation-skill-coverage-weakness`, `step-generation-schema-chat-bugs`
- pitch touching a component library's polymorphic/slot pattern → hits memory `<framework>-build-gate-required`

### 2. Set boundaries

- **Pick appetite** (forced choice): `small-batch` (≤5 files / ≤400 LOC / ≤1 day) | `big-batch` (≤15 files / ≤1500 LOC / ≤1 week) | epic (auto-decompose into sub-pitches)
- **Write problem** in user-centric framing — "Teachers can't see X across runs", not "we should build a comparison view"

### 3. Breadboard (not wireframe)

Fat-marker only. Wireframes belong in `/plan`.

- **UI**: list places (screens/views), affordances per place (buttons/fields/links), connections (what triggers what). No visual layout.
- **Backend**: operation sequence + data touchpoints (which queries, which schema fields).
- **AI/prompt**: prompt key + I/O shape + success criterion + **at-least-one golden eval case**.

### 4. Address rabbit holes

Name 2-5 specific unknowns. Each gets one of three dispositions:

- **Resolve here** — answer it now, in the pitch.
- **Push to plan** — explicit risk owner at `/plan` time.
- **Push to no-go** — defer.

### 5. Write no-gos

Explicit exclusions. Forces honesty. Forces focus.

### 6. /critique (auto for big-batch + AI-prompt scopes)

Parallel fan-out of perspective subagents that pre-mortem the pitch. **Advisory, not gating** — user can acknowledge findings and bet anyway with reason logged.

| Perspective | Triggers | Profile | Role |
|---|---|---|---|
| `knowledge-historian` | always | fast | Deep search beyond /shape's gate; finds related-but-missed knowledge entries |
| `skeptic` | always | standard | Proposes 2-3 *additional* rabbit holes the human missed |
| `appetite-auditor` | always | fast | Projects file count + LOC against breadboard; flags appetite mismatch |
| `cross-pitch-projector` | ≥2 active pitches | fast | Projects file-set overlap against other active pitches' planned work |
| `eval-regression-projector` | AI-prompt scopes | standard | "What regression types is your golden case *not* checking?" |

Skipped automatically for small-batch, bug-fix, hotfix.

Output: a "Critique findings" section appended to `pitch.md` with severity / type / suggested addition.

### 7. Bet decision (three outcomes)

```
☐ Bet         → proceed to /plan
☐ Re-shape    → named gap (which rabbit hole un-resolved? which critique finding?); loop in /shape
☐ Pass        → not worth the appetite right now; pitch parked at .project/pitches/_parked/
```

If user acknowledges critique findings instead of addressing them, log the reason in the pitch's "Bet decision" section.

## Output

- `.project/pitches/{slug}/pitch.md` (≤500 tokens for small-batch, ≤900 for big-batch, ≤1500 for epic-with-decomposition)
- AI-prompt scopes: at least one golden case at `.project/evals/datasets/`

## Confirmation gate

Pitch is bet-ready when:
- All 5 sections written (Problem, Knowledge consulted, Solution sketch, Rabbit holes, No-gos)
- Appetite is one of {small-batch, big-batch}; epic-tier pitches must decompose first
- AI-prompt scopes have ≥1 golden case
- Big-batch and AI scopes have run `/critique` and have a "Critique findings" section
- Bet decision selected (Bet / Re-shape / Pass)

## Transition

→ Phase 1: `/plan` (if Bet)
→ `/shape` re-entry (if Re-shape)
→ `.project/pitches/_parked/{slug}/` (if Pass)
