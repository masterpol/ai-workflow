# Pitch: fix-bun-project-preload

**Date**: 2026-11-27  •  **Appetite**: big-batch  •  **Stack**: backend (workflow scripts)

Re-shaped after `/audit` reached the bug-fix cap with two must-fix findings open. History: [log.md](log.md), [audit.md](audit.md).

## Problem

A person who runs the workflow's checks over a project can have that project's code run by a check that only reads. Under Bun, four routes were found one at a time: preload, `.env`, TypeScript path mappings, macros. The critique found one more that also happens under Node: the doctor runs the checked folder's Graphify script.

## Knowledge consulted

- [issues/bun-runs-a-project-preload-before-any-workflow-script] — the original problem; startup code cannot protect a direct `bun` call.
- [patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code] and security rule G3 — run only bundle code; treat the tree as data.
- [patterns/one-boundary-selects-the-child-runner] — one launcher starts children.
- [patterns/resolve-config-only-from-trusted-root] — turn off a tool's own config discovery.
- [issues/a-probe-child-ran-a-bare-command-with-the-parent-path] — why finding a safe `node` is hard.
- [patterns/a-grader-reports-executed-and-unexecuted-cases-separately] — never count unchecked as passed.
- [patterns/warn-text-must-be-self-consistent-with-the-code-it-ships] — update messages with the code.

## Solution sketch

**Rule:** a check never runs a script taken from the folder it checks, and never gives project source to Bun's parser.

| Place | Change |
|---|---|
| Shared launcher | Keep the built, uncommitted isolation: shipped empty Bun and TypeScript configs, `--no-env-file`, `--no-install`. This closes startup discovery |
| Setup validator and doctor parse checks | Delete both Bun parse branches. Parse only when the checking process is Node, by starting that same executable. Under Bun, parse nothing |
| Result under Bun | A warning, "not parse-checked", with the file count. Never counted as parsed or valid, also in JSON and in the validator's summary of the doctor. It does not block |
| Doctor's Graphify check | Run the copy beside the doctor, as the validator already does; Graphify reads the project from the working folder |
| Doctor's live OpenCode step | Opt-in (`--live-opencode`); by default it is reported as not checked. The command starts a service that loads project plugins |
| READMEs | State what is protected, that Bun skips parse checks, and what is not protected |

**To get parse checks:** run the command with `AI_WORKFLOW_RUNNER=node`.

**Done when:** under Bun, marker macros imported by relative path, absolute path and package name leave no marker through both real commands; a test fails if either command gives project source to Bun again; under both runners a marker Graphify script in the checked folder never runs; a result with unparsed files cannot read as parsed.

**Rejected**
- Parsing with a separately found Node: needs a trusted-executable policy (relative `PATH` entries, symlinks, wrappers, a project's `node_modules/.bin/node`) and probably a new module, about 21 files.
- More Bun flags: `--no-macros` does not cover the transpiler.
- Removing the Bun runner: breaks projects that use it.

**Cost:** Bun users lose the syntax check in these two commands. Their builds and tests are unaffected.

## Threat boundary

Covered: a trusted bundle copy reading a tree it does not trust, for the parse checks, the Graphify check and workflow-started Bun launches. Not covered: a checkout whose own bundle, hooks or harness settings are hostile; those files are the code being run. "Use Node" alone only avoids the Bun routes.

## Rabbit holes

**Resolved here**
- Which `node` is real → the design adds no Node search or launch.
- A project's settings file can select Bun → at worst the parse checks are skipped, with a warning.
- Test runs and project check commands run project code → intended, unchanged.

**Pushed to /plan** (owner: plan)
- The doctor also runs `opencode debug config` (Node only) and bare `uv` and `git` in the checked folder. Whether OpenCode loads project plugins there is unverified: probe it; if it runs project code, bring that back before changing scope.
- Key the skip on the executable that would parse, not only on the declared runtime.
- Marker test that Node's two parse forms run no project code. Bound parser error text (the doctor copies stderr today). Update every message that names Bun syntax.
- Runner-dependent tests pin the runner in the child environment.

**Pushed to no-go**
- `package.json` script fallback for a missing script path.
- The runner switch starting `node` or `bun` by bare name (existing, all commands): backlog.

## No-gos

- ✗ No change to runner selection or its settings files.
- ✗ No change to the doctor's `uv` or Git calls.
- ✗ No claim for a direct `bun <script>` call, `BUN_OPTIONS`, `NODE_OPTIONS`, or a hostile installed bundle.
- ✗ No new parser dependency, home-made parser or Node search.
- ✗ No claim beyond Bun 1.4.5 on macOS without a new probe.

## Size

The uncommitted isolation change is 15 files besides records. The new work adds `setup-validator.mts`, `workflow-doctor.mts` and `workflow-doctor.test.mts`, and edits files already changed. **Combined: 18 files, 3 over the 15-file cap**; about 500 inserted lines against 1500. Betting accepts the overage by name, including against the standing workflow-tooling rule to split.

**Order:** ships before pitch 07 edits the doctor; pitch 04 part B2 regenerates the shipped list after it; pitch 06 pins a release that contains it.

## Critique findings

2026-11-27, four read-only Orca workers; repository guard clean. Reports: [critique-reports/](critique-reports/).

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| S1 | high | Doctor runs the checked tree's Graphify | Addressed; confirmed under Node |
| K1, K2, S2 | high | Finding a safe Node needs `PATH` and real-path rules | Addressed by removing the need; runner switch to backlog |
| K3, S3 | medium | A skipped parse can read as a pass | Addressed: distinct warning, never counted as parsed. Kept non-blocking, or a Bun setup would always fail |
| K4 | medium | Rules for no-Node and fake-Node tests | Fake Node no longer needed; runner pinning to /plan |
| K5 | medium | Messages and raw parser text | To /plan |
| A1, A2 | medium | Size sentence unclear; Node resolver unpriced | Addressed; resolver removed |
| A4 | medium | Ship the parse change first, Node selection later | Overridden: the first part depended on the second, now dropped. Overage left to the bet |
| A5, X5 | medium | README claims must match what ships | One ship, so they land together |
| X1, X2, X4 | high to medium | Doctor and validator shared with pitches 04 B2, 06, 07 | Addressed under Order |
| A3, X3 | acknowledged | Line headroom; shipped list shared with B2 | Noted |

## Bet decision

**Bet** (2026-11-27). The owner replied "next" to a gate that recommended Bet; the coordinator recorded it as Bet and said so. Accepted by that choice: 18 files against the 15-file cap, including against the standing workflow-tooling rule to split, and no parse check under Bun. The A4 cut is overridden for the reason in the table.

### Plan probe and owner decision (2026-11-27)

`opencode debug config` (2.4.2, macOS, temporary `HOME`) left a service running; markers from two project plugins existed once it was stopped. The owner chose **A**: make the live step opt-in in this pitch. This also accepts about **22 files** instead of 18. `uv --version` and the doctor's Git call ran nothing in a hostile scratch repository.
