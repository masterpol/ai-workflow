# S2 completion evidence

Scope: native add-skill entry points, doctor/setup integration, Cursor mirror materialization.
Runtime: Node v24.18.0. Continued in Claude Code after the Codex session hit its usage limit;
S1 approval was recorded by the user in that session. No external skill was installed into
this checkout.

## Behavior tests and coverage

```sh
node --test --experimental-test-coverage '--test-coverage-include=**/skill-*.js' --test-coverage-lines=90 ai-framework/scripts/add-skill.test.js ai-framework/scripts/skill-vendors.test.js
```

Exit 0: 36 tests, 36 pass (27 S1 + 9 S2). Line coverage 100% for skill-registry, skill-source
and skill-vendors; aggregate branches 94.46%, functions 100%.

`skill-vendors.test.js` proves:
- Bundle entry points: Claude canonical playbook (`standard`), Codex and OpenCode mirrors load it
  with identical descriptions; OpenCode uses the standard route; referenced scripts exist.
- An installed fixture resolves to one package and its resources from every project vendor,
  including an additional registered vendor; phases are identical in every wrapper.
- A declared override path is recorded in the registry and passes; removing the override
  reports the drift. Edited phases fail, local edits warn, disabled state and missing owned
  files are reported.
- A vendor added after installation fails coverage until `update`; an unregistered
  `.newtool/skills` layout fails coverage; invalid registries and pending transactions are
  reported without throwing and block Cursor mirroring.
- Cursor mirrors: preview writes nothing, apply creates only missing files, customized mirrors
  are preserved and reported, registry-managed skills are skipped, reruns are idempotent,
  canonical symlinks are rejected; CLI rejects unknown options.
- The real doctor and setup validator, run on a copy of this bundle with an installed upstream
  skill lacking workflow frontmatter, report zero failures and no canonical-mirror checks for it.

Mutation check: removing the doctor's managed-skill filter makes the bundle-copy test fail with
`.agents/skills/sample/SKILL.md: loads canonical skill`; the filter was restored.

## Workflow verification

- `node ai-framework/scripts/workflow-doctor.js --json`: exit 0, 0 failures (597 results).
- `node ai-framework/scripts/setup-validator.js`: exit 0, `Setup status: READY`, 18 checks.
  Before materializing, it failed on the missing `.cursor/skills/add-skill/SKILL.md`, as intended.
- `node ai-framework/scripts/skill-vendors.js cursor-mirrors --apply`: created
  `.cursor/skills/add-skill/SKILL.md` (byte-identical); rerun preview: 0 created, 41 current.
- `node ai-framework/scripts/graphify.js --check`: CLEAN.

## Real host smoke tests

Fixture skill `smoke-marker` (SKILL.md links `references/word.md` containing `PELICAN-42`)
installed with `--scope project --phases manual --apply` into a scratch project with
`.claude`, `.opencode`, `.codex`, `.cursor`.

| Host | Version | Result |
|---|---|---|
| Claude Code | 2.1.282 | **Verified.** `claude -p --model haiku "/smoke-marker"` answered `PELICAN-42` (wrapper → package → resource). This session also discovered the new `add-skill` skill live. |
| OpenCode | 1.18.32 | **Discovery verified** (no model call). `opencode debug skill` lists `smoke-marker` once (from `.agents/skills/`) and `add-skill` in this repo; `opencode debug config` resolves command `add-skill` with `openai/gpt-5.6-terra`. Model invocation not run. |
| Codex | 0.156.1 | **Unverified.** `codex exec` reached the prompt, then failed: usage limit (resets 2026-09-25 00:08). Rerun: `echo 'Use the $smoke-marker skill.' \| codex exec --skip-git-repo-check --sandbox read-only -`. |
| Cursor | not installed | **Unverified.** Files present and byte-identical mirror generated. |

## Remaining

S3 (bundle-sync migration and formatting) is unstarted. See `deviations.md` for S2 changes.

## Version record

At the user's request, S1 and S2 are packed into a single `2.4.0` changelog entry: VERSION and
CHANGELOG.md were reset to the committed 2.3.0 state and regenerated once through
`changelog.js --bump minor`. The separate working-tree 2.4.0 (S1) and 2.5.0 (S2) entries no
longer exist. Neither was committed or published.
