# Capture rollout check

Date: 2026-10-20. Source: this unpublished checkout after S6 and the S7 documentation change.
Scratch root: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/capture-rollout-xet7hzkv` (kept for inspection). Base: `633adb3`, exported with `git archive`.

The archived `.claude/settings.json` was changed to an RN-shaped fixture: its two Orca startup
commands use `bun "$CLAUDE_PROJECT_DIR/ai-framework/hooks/scripts/orca-start-hook.mts"` and it
has no capture registrations. No real application checkout was modified.

Commands run from the scratch root:

```sh
node ai-framework/scripts/bundle-sync.mts --source /Users/bryanrestrepo/Documents/ai-workflow-portable --base-ref 633adb3 --json
node ai-framework/scripts/bundle-sync.mts --source /Users/bryanrestrepo/Documents/ai-workflow-portable --base-ref 633adb3 --apply --json
node ai-framework/scripts/bundle-sync.mts --source /Users/bryanrestrepo/Documents/ai-workflow-portable --base-ref 633adb3 --apply --json
```

All three exit 0. The first apply uses the archived script; the second uses its updated copy.
The explicit base enables three-way comparison of existing files. The dry run was inspected as
part of the already approved scratch-only rollout scope; no further live-project sync is authorized.

| Check | Before | First apply | Second apply |
|-------|--------|-------------|--------------|
| `grep -c workflow-capture.mts .claude/settings.json` | 0 | 8 | 8 |
| Capture command registrations | 0 | 8 | 8 |
| Orca group JSON bytes equal to the hand-wired fixture | yes | yes | yes |

Each Orca group was extracted as its raw JSON substring before and after migration and compared
byte for byte, including its command, timeout, matcher and description. The second apply reports
no changed/new/local/conflict/unverified/removed files and no instance migrations. No hook is duplicated.

The updated scratch doctor exits 1 with exactly two expected failures: mandatory `ai-workflow.toon`
is absent from the archive, and the intentionally retained Bun Orca commands fail the current exact
Node startup contract. `Claude capture wiring` passes. These are explicit migration decisions for
the target project; capture sync neither replaces its local startup commands nor invents its config.
The source checkout's doctor exits 0 with zero failures. Apply reports the optional default skill as
not installed; no skill was installed by this test.

Evidence: `/tmp/capture-s7-rollout-{dry,apply,second}.json`,
`/tmp/capture-s7-rollout-result.json`, and `/tmp/capture-s7-rollout-doctor.json`.

`workflow-v3-rollout` remains shaped. This capture implementation lands before that pitch's next sync.
Its next step is to re-run **workflow-v3-rollout's scratch-copy dry run** (critique X16) against the
then-current bundle, resolve its target-owned TOON and Orca startup choices, and review the resulting
report before applying to RN or another real project. This fixture does not replace that rollout gate.

The feature release remains scheduled for /ship after audit; the scratch uses build-time VERSION 2.37.1.
