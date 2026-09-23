# Eval Harness

Offline evaluation system for your AI pipelines. Catches quality regressions before your users do.

This rule describes a *pattern* (structural gates + LLM-judge scoring + a pinned baseline). The
track names, commands, and file paths below are illustrative — replace them with your project's
actual eval command names and dataset layout the first time you set this up.

## When to run

| Command (example) | What runs | When |
|---|---|---|
| `pnpm --filter <web-workspace> eval:fast` | Structural + prompt-registry gates. Zero LLM calls. | Every PR (CI) |
| `pnpm --filter <web-workspace> eval:full` | Above + LLM judge scoring for all tracks. | Weekly cron + pre-release |
| `pnpm --filter <web-workspace> eval:track-a` | One track's cases only (any mode). | Focused dev iteration |
| `pnpm --filter <web-workspace> eval:track-b` | Another track's cases only (any mode). | Focused dev iteration |

Full mode requires `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in the environment.

## Directory map

```text
.project/evals/
  datasets/              # YAML, source of truth for eval cases
    track-a/
      generation-en.yaml
      generation-es.yaml
      regeneration.yaml
    track-b/
      feedback-en.yaml
      feedback-es.yaml
  runs/                  # Historical run reports (JSON + Markdown)
  baseline.json          # Pinned judge model + baseline mean scores
  .cache/                # gitignored — local judge response cache
<web-workspace>/evals/
  runner/                # Loader, judge wrapper, cache, reporter
  track-a/
  track-b/
<backend-workspace>/__tests__/evals/
  runtime/               # Runtime correctness (runs in normal test suite)
  feedback/              # Heuristic parallel eval
```

## Dataset format

```yaml
name: track-a generation (EN)
cases:
  - id: gen-en-001            # Stable. Used as cache key.
    description: One-line human summary
    language: en              # optional; required when the prompt is bilingual
    input: { ... }            # Fed to the subject under test
    expected: { ... }         # Structural + judge thresholds
```

- `id` must be unique within the file.
- Zod schemas in each test file validate `input` and `expected` on load.
- Expand datasets via normal PR — no code changes needed.

## Adding a new case

1. Append a YAML entry to the relevant `.project/evals/datasets/**/*.yaml`.
2. `pnpm --filter <web-workspace> eval:fast` — confirms structural gates still pass.
3. Open a PR. Reviewer validates the expected thresholds are calibrated.
4. After merge, the next `eval:full` run (or cron) scores it with the LLM judge.

## Adding a new judge rubric

1. Add a prompt key to `apps/web/lib/ai/prompts/keys.ts` (e.g., `EVAL_JUDGE_X`).
2. Add a definition to `apps/web/lib/ai/prompts/registry.ts` — surface `"eval_judge"`.
3. Add the rubric Zod schema to `apps/web/evals/runner/judge.ts`.
4. Call `runJudge({ key, schema, ... })` from a test file.

## The baseline

`.project/evals/baseline.json` pins:

- The judge model (currently `claude-haiku-4-5-20251001`).
- The judge prompt versions.
- Mean rubric scores per track.

Any change to the pinned judge model requires an updated baseline. The harness emits a `REBASELINE NEEDED` banner in the Markdown report when the current run's pinned model/version differs from `baseline.json`. Update `baseline.json` in the same PR that bumps the judge model and explain the change in the commit.

## Cost control

- Budget: **$5** per full run (enforced by `cost-accountant.ts`).
- At 80% of budget, remaining judge cases skip cleanly.
- At 100%, the run aborts.
- Judge concurrency: 4 parallel calls (via `concurrency.ts`) — avoids provider rate limits.

## Interpreting the report

Each run emits `{YYYY-MM-DD}-{artifact}.json` and `.md` under `.project/evals/runs/`. The Markdown has:

- **Structural section** — pass/fail per case, no scores. Must be all green.
- **Judge section** — 0-3 scores per dimension + per-case reasoning.
- **Aggregate means** — across all judge entries. Compare to `baseline.json` trend.

Thresholds per track (documented in the design plan):

| Track | Dimension | Gate |
|---|---|---|
| A generation | Mean `objectiveAlignment` | ≥ 2.2 |
| A generation | Any case `objectiveAlignment` | ≠ 0 |
| B open-response feedback | Mean `accuracy` | ≥ 2.0 |
| B open-response feedback | Mean `noFabrication` | ≥ 2.0 |

## Known scope (example)

Track your own in-scope vs. deferred coverage here once the harness is running against your
actual pipelines, e.g.:

**In scope**: Track A generation, Track B feedback + heuristic parallel, deterministic scoring fixture.

**Deferred** (stubs present, marked `test.todo`): list what's stubbed and why.

Link the requirement/design docs that motivated the harness under `.project/requirements/` and
`.project/design/plans/` once they exist for your project.

## Troubleshooting

- **"API key not configured"** in full mode → set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`.
- **"Invalid dataset"** → Zod schema mismatch. The error names the bad field path.
- **All judge scores 0** → probably a prompt refusal or parse failure; check the reasoning field and rerun the single case with `--testNamePattern=<caseId>`.
- **Cache hit when you expect a fresh run** → delete `.project/evals/.cache/` or unset `EVAL_CACHE_DIR`.
