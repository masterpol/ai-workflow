# Knowledge-historian critique — `fix-bun-project-preload`

Read-only pre-bet perspective. Target: `.project/pitches/fix-bun-project-preload/pitch.md`.
Nothing in the checkout was created, changed or deleted; this file is the only output.

## Method

Keywords taken from the pitch's Problem and Solution sketch: Bun, Node, preload, `.env`,
macros, path mappings, parse check, runner, `node` resolution, "not parse-checked", README.
Every entry under `.project/knowledge/{issues,patterns,decisions,entities}/` was listed, then
the relevant ones read in full, together with `ai-framework/rules/security.md` and the code
anchors the pitch names. The four entries the pitch already cites (`issues/bun-runs-a-project-preload-before-any-workflow-script`,
`patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code`, security rule G3,
`patterns/one-boundary-selects-the-child-runner`, `patterns/resolve-config-only-from-trusted-root`)
were read as context and are not re-reported.

## Findings

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1 | knowledge-historian | high | missed-knowledge | The "Which `node` is real" rabbit hole (`pitch.md:48`) fixes discovery but not the spawn. The recorded failure is not only a shadowing `node_modules/.bin/node`: presence checks resolved absolute PATH entries while the child ran the **bare name** with the parent's full PATH, so a project-local `./node` reached through a relative PATH entry was executed instead (`issues/a-probe-child-ran-a-bare-command-with-the-parent-path.md:15`, rule at `:18`). The standing rule is one absolute-entry PATH policy for **both** the presence check and the child execution, and spawning the absolute realpath the check returned, with a PATH-sanitized child env (`patterns/opt-in-before-runtime-discovery.md:23`, `:25`). Add both entries to "Knowledge consulted" and carry the rule into the `/plan` scope: resolve `node` by absolute realpath, refuse relative and empty PATH entries, spawn that absolute path. |
| K2 | knowledge-historian | high | missed-pattern | "Refuse one inside the checked tree" (`pitch.md:48`) needs the real-path rule for **both** sides: resolve root and candidate with `realpathSync`, compare the results, `lstat` for a regular file, and treat a name that merely starts with `..` (`..x`) as inside (`patterns/path-containment-compares-real-paths.md:11`, `:17`). A lexical `path.relative` check accepts a file reached through a symlinked parent and refuses a project reached through a symlinked root (macOS `/var` vs `/private/var`), and plain prefix matching misfires — `/app` matched `/Applications` on PATH (`issues/guard-tests-can-fail-for-the-wrong-reason.md:46`). Add the pattern and write the three tests it names: symlinked parent, symlinked root, `..x`. |
| K3 | knowledge-historian | medium | contradicted-rule | The pitch keeps "not parse-checked" at **info** level and defers "a summary must not read as a pass when files were not parsed" to `/plan` (`pitch.md:27`, `:49`). The rule recorded for the sibling scanner is the opposite: unreadable or unparsed **production** files fail the doctor, and an optional/absent case is the one that gets `info` (`patterns/a-source-scanner-fails-closed-on-what-it-cannot-read.md:17`). Executed and unexecuted cases are reported separately and never as a combined total (`patterns/a-grader-reports-executed-and-unexecuted-cases-separately.md:17`). This pitch exists because a read-only check must not run project code; an `info` line on a project that supplied a hostile file is the same silent-open class, so the "not parse-checked" outcome must be a distinct, never-passing result rather than a note attached to a pass. Cite both entries and settle the level before the bet. |
| K4 | knowledge-historian | medium | missed-knowledge | The Done-when adds "the cases with no Node and with a non-real Node" (`pitch.md:32`), and both have recorded gotchas. A test that controls PATH must also pin the runner in the child environment (process env beats the git-ignored `ai_workflow_env.json`), or resolve the runner executable before emptying PATH; run the gauntlet once with `AI_WORKFLOW_RUNNER=node` and once with `bun` (`issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn.md:21`). A fake Node must give the same answers as the real one — here exit 3 when `module.stripTypeScriptTypes` is missing (`ai-framework/scripts/setup-validator.mts:52`, `ai-framework/scripts/workflow-doctor.mts:458`) and exit 1 with a parser message on a syntax error — otherwise the fake proves nothing and the guard can go green without being reached (`patterns/keep-the-fakes-guarantee-the-thing-they-replace.md:22`). Add the issue and the pattern; a fake that always exits 0 is not an acceptable "no Node" case. |
| K5 | knowledge-historian | medium | missed-knowledge | Removing the Bun branch changes operator-facing text, and the recorded rule is to update every user-facing message that names the removed path **in the same commit** and add a test asserting the new wording (`patterns/warn-text-must-be-self-consistent-with-the-code-it-ships.md:37`, `:38`). The affected sites are real: the doctor's label comes from the runtime (`valid Bun syntax` / `invalid Bun syntax`) at `ai-framework/scripts/workflow-doctor.mts:456`, `:459`, `:460`, and the validator's Bun branch is `bun build --no-bundle` at `ai-framework/scripts/setup-validator.mts:287`. The doctor also copies the child's stderr into the record (`workflow-doctor.mts:460`), while the bundle's own security rule says to keep the error code and not the message, because messages carry absolute paths and file fragments (`ai-framework/rules/security.md:264`, `:265`) — a Node parser message carries both a project file fragment and its path. Keep the exit code, bound the message, and pin the new wording in a test. |

## Additional notes (not counted in the five)

- **Standing no-gos and the appetite.** `decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers.md` (section "Decision") keeps the shared no-gos for workflow-tooling pitches alive and records the standing rabbit-hole answer: the planner "counts every mirror and test, and splits the pitch if the appetite is exceeded", and a pitch that relaxes a standing no-go must say so and update the entry. The pitch instead accepts an over-cap ship (`pitch.md:64`). Whether this pitch counts as one of that workflow-tooling set is the owner's call; if it does, the relaxation should be stated there too. Unverified: I did not read the older pitches in that set.
- **Shipped artifacts.** `ai-framework/templates/shipped-files.txt:337` and `:338` already list `ai-framework/scripts/runtime/bun-isolated.toml` and `bun-isolated-tsconfig.json`, so keeping the uncommitted isolation adds no new shipping step. Unverified: whether the two README edits (root `README.md`, `ai-framework/scripts/runtime/README.md`) need a hash or registration update under the shipped-template rule (`issues/changing-a-shipped-template-or-skill-has-hidden-consumers.md`).
- **Proving the new guard.** "A test fails if project source reaches a Bun parser again" (`pitch.md:32`) is best shown with an in-memory mutant rather than a hand-written negative case (`patterns/prove-a-guard-test-with-an-in-memory-mutant.md`).
- **TypeScript acceptance set.** The Bun branch used a full transpile (`bun build --no-bundle`, `setup-validator.mts:287`); the Node path type-strips, which rejects non-erasable syntax such as `enum` and constructor parameter properties (`issues/node-strip-only-mode-rejects-constructor-parameter-properties.md`). A project file using those would move from "parsed" to "invalid syntax". In an installed project these paths are bundle-owned, so practical exposure is probably low. Unverified: no example was run.
- **Release order.** The pitch already carries the cross-pitch release-order item from the audit (`pitch.md`, `audit.md:86`, `.project/pitches/_followups.md` "From fix-bun-project-preload audit"), so no miss there.

## What I checked versus what I infer

**Checked (read in full or in part).** `pitch.md`, `log.md`, `audit.md`; the four cited knowledge
entries and their neighbours; the full listing of `.project/knowledge/{issues,patterns,decisions,entities}/`;
`ai-framework/rules/security.md` (§8–§9); `ai-framework/scripts/setup-validator.mts` (parse branch and
its exit-3 convention), `ai-framework/scripts/workflow-doctor.mts` (parse branch, labels, stderr copy),
`ai-framework/scripts/runtime/entry.mts` (isolation options), `ai-framework/templates/shipped-files.txt`;
`.project/status.md`; `.project/pitches/_followups.md`.

The pitch's factual base checks out against the code: the validator still has the Bun build branch
(`setup-validator.mts:287`), the doctor still has `Bun.Transpiler` (`workflow-doctor.mts:26`, `:456`),
and the audit's two open macro findings (`audit.md:78`, `:79`) describe those same call sites.

**Inferred, not verified by execution.** That the Node type-stripping path rejects non-erasable
TypeScript in a real project (K-note above); that the README edits need shipped-file registration;
that the standing no-gos decision covers this pitch; the exit-code contract the fake Node must honour,
taken from the recorded exit-3 convention rather than from a run.

**Not done.** No probe was executed and no file inside the checkout was written; the five findings
rest on reading records, rules and code only.
