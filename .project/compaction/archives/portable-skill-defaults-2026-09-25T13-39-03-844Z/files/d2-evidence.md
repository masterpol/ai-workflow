# D2 completion evidence

Scope: stats attribution (`token-consumption.js`'s new optional `mode` field) and the
compression guard (`skill-compress-guard.js`). Runtime: Node v24.18.0. No external skill was
installed or invoked; `skill-compress-guard.js` never runs `caveman-compress` itself, and
`token-consumption.js` never reads `caveman-stats`' own hook files — both per plan.md's
"Grounding" section.

## Behavior tests

```sh
node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/scripts/skill-compress-guard.test.js
```
Exit 0: 22 tests, 22 pass, 0 fail.

`token-consumption.test.js` additions (6 new tests, on top of the 4 pre-existing) cover: a
recorded event's `mode` resolves to an explicit `modes.json` instance default (`"lite"`); falls
back to the bundle default (`"full"`, read from `skill-defaults.json`'s catalog, not
hand-duplicated) when `modes.json` has a `caveman` key but no explicit `default`; resolves to
`"off"` when `caveman.enabled === false`; is `null` when `modes.json` does not exist; is `null`
when `modes.json` exists but has no `caveman` key at all (not "configured"); and a dedicated test
proves the `recentEventKeys` dedup logic is unaffected by `mode` — the same idempotent event is
recorded once, `modes.json` is then changed to a different mode, the identical event is replayed
and still recognized and rejected as `"duplicate event"` (dedup runs on `record.id`, not `mode`),
and the original recorded snapshot's `mode` value is untouched by the rejected replay.

`skill-compress-guard.test.js` (new file, 12 tests) covers every refusal case from plan.md with
its own distinct reason string (verified pairwise-distinct in one test): path under
`.project/pitches/_archive/`, path under `.project/pitches/` (asserted to *not* match the
`_archive` reason, since `_archive` is nested under `pitches/` and needed an explicit
most-specific-first check order), path under `.project/design/`, path under
`.project/knowledge/`, non-existent path, non-string target (array and `undefined`), empty-string
target, and a glob pattern (`*`). Plus: an allowed ordinary in-project file (relative and
absolute-path forms both accepted), and `pythonAvailable()` returning a boolean without throwing
regardless of which way it resolves in this environment (Python is present here, so only the
"available" branch is exercised live — matching D1's own honest reporting of what was actually
observed rather than forcing both branches synthetically).

## Syntax verification

```sh
node --check ai-framework/hooks/scripts/token-consumption.js ai-framework/scripts/skill-compress-guard.js
```
Exit 0, no output (both files syntactically valid).

## Workflow doctor

```sh
node ai-framework/scripts/workflow-doctor.js --json
```
Exit 0, `failures: 0`, `fixed: 0`. `skill-compress-guard.js` is not yet in doctor's file lists —
per this scope's own instructions, D1 owns doctor integration and this scope does not add it;
doctor still passes cleanly with the new file present but unlisted.

## Coverage (informational, not part of D2's own exit criteria)

`skill-compress-guard.js` alone: 94.03% line / 90.00% branch / 100% function coverage against its
own test file — exceeds the pitch's 90%-line final-regression bar (that bar's
`--test-coverage-include` list is `skill-defaults.js,skill-compress-guard.js,browser-runtime.js`;
it does not include `token-consumption.js`, so that file's own historical CLI/lock-contention
coverage gaps, unrelated to this scope's edit, are out of scope here and were not touched).

## Implementation notes / correction to plan.md's contract text

- `token-consumption.js`'s new `currentCavemanMode(root)` reads `.project/skills/modes.json`
  directly (guarded entirely by one `try { } catch { return null; }`) rather than requiring
  `skill-defaults.js`, per the task's explicit "your call" — `skill-defaults.js` pulls in
  `skill-registry.js`, which is unrelated to a metrics hook's own invocation shape. To avoid
  hand-duplicating the bundle default mode string (`"full"`), the same
  `ai-framework/integrations/skill-defaults.json` catalog `skill-defaults.js` already reads is
  required lazily inside the same try/catch, so a future change to the catalog's `defaultMode`
  does not require a matching edit here.
- The resolution deliberately does **not** consult `modes.json`'s `caveman.phases` (per-phase
  override) map, because a `token-consumption` event has no phase context — it is emitted by
  agent-completion hooks, not phase commands. It resolves exactly `enabled:false → "off"`, else
  `caveman.default` if set, else the bundle default — the same three tiers `resolveMode()` uses
  minus the phase/invocation-arg tiers, which do not apply here. This is a deliberate narrowing
  of "resolved default" from plan.md's phrase, not a bug: worth the orchestrator's attention only
  if a future scope wants per-phase attribution on metrics events, which is new scope, not this
  one.
- `skill-compress-guard.js` treats `.project/pitches/_archive/` and `.project/pitches/` as two
  ordered checks (archive checked first) so a path under the archive gets its own reason string
  rather than being silently absorbed by the more general pitches check — plan.md lists both as
  requiring "a distinct reason string each," which is only achievable with that ordering since
  `_archive` is filesystem-nested under `pitches/`.
- No correction found to `ai-framework/integrations/skill-defaults.md` — not read as part of this
  scope's work (out of scope per the task's "Do NOT touch" list); no implementation detail here
  contradicted anything already known about that doc's contract.

## Remaining

D3 (browser runtime readiness) is out of this scope's file list and was not touched. This
evidence file, `ai-framework/hooks/scripts/token-consumption.js`,
`ai-framework/hooks/scripts/token-consumption.test.js`,
`ai-framework/scripts/skill-compress-guard.js`, and
`ai-framework/scripts/skill-compress-guard.test.js` are the only files this scope wrote.
`ai-framework/integrations/skill-defaults.md` (D2's append target per plan.md's file list) was
intentionally left untouched per this task's explicit "Do NOT touch" instruction; the orchestrator
owns reconciling D2's contract into that doc.
