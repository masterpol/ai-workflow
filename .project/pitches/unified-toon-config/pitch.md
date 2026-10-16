# Pitch: unified-toon-config

**Date**: 2026-10-16  •  **Appetite**: big-batch
**Stack**: workflow-tooling (TypeScript runtime, doctor, bundle-sync, docs)
**Epic**: `workflow-v3` — pitch 2 of 5. Depends on `upstream-project-drift`. Target version: 3.0.0.

## Problem

A project owner configures the workflow across four files in three places (`ai_workflow_env.json`,
`.project/orchestration.json`, `.project/workflow-doctor.json`, `.project/skills/modes.json`). Nobody knows
which file holds which switch, and each format change means editing every project by hand.

## Knowledge consulted

- [patterns/resolve-config-only-from-trusted-root] — applies: read config only from the trusted project root.
- [patterns/parse-untrusted-values-and-re-emit-them] — applies: strict grammar, reject (never sanitize),
  write the file back from the parsed model.
- [decisions/workflow-tooling-pitches-share-standing-no-gos-and-design-answers] — constrains: instance data
  stays local; bundle-sync must never overwrite the project's config.
- [issues/a-local-workflow-env-file-changes-which-runner-path-tests-spawn] — applies: process env still beats
  the file; tests pin the runner.
- [patterns/a-thin-cli-keeps-every-guard-in-the-library] — applies: the migrator CLI is a thin wrapper.
- [issues/hardening-a-shared-reader-made-its-writer-destructive] (K1) — applies: a hardened reader that
  treats symlinked legacy files as "absent" + a writer using `writeFile` (not `wx`+rename) causes link
  follow-through and clobbers the target. Writer side of the shared reader.
- [patterns/resolve-before-matching-a-protected-path-allowlist] (K2) — applies to bundle-sync exclusion
  for `ai-workflow.toon` and the migrator's backup/delete path allowlist. Resolve realpath, compare
  relative-to-realpath, lowercase; refuse `..` escapes.
- [issues/backtracking-regex-over-untrusted-text-is-quadratic] (K3) — applies: linear line scanner with
  open/close state, bounded+anchored matching, size cap, timing test. No backtracking regex on
  `ai-workflow.toon`.
- [patterns/a-source-scanner-fails-closed-on-what-it-cannot-read] (K4) — applies: open `integrations` map
  with per-integration validators, unknown keys reported (not used), `loadConfig` returns problems; unreadable
  / oversize / symlinked = failure not warning. Use the same lexer at every reader site (no grep-miscount
  for "reader count").
- [issues/installed-skill-wrappers-ship-as-orphans] (K5) — applies: this repo is bundle source AND live
  instance, so source-side `ai-workflow.toon` is instance data too. Bundle-sync exclusion needs a
  mutation-checked test; simulate an old-version sync before shipping.
- [decisions/token-metrics-dimensions-design] (K6) — applies: `schemaVersion` migration + a re-emit-canonical
  writer → v2 file read by v1 writer gets silently downgraded. Refuse unknown `schemaVersion`, keep rejected
  as `.rejected`, never overwrite. `modes.json` read uses same reader rules as snapshot read.
- [patterns/a-report-never-overwrites-a-file-it-did-not-write] (K7) — applies: migrator "refuses unless
  `--force`" + writer owns `ai-workflow.toon`. Replace only generator-marked files; name and skip unmarked.
  Bounds the `--force` rule.
- [patterns/word-boundary-replacement-does-not-see-a-prefixed-property] (K8) — applies: rename across
  15+ readers/fixtures/`.claude/skills/build/SKILL.md`; prefer language-level refactor (rename all symbol
  uses via tool, not `\b`), placeholder-restore any unavoidable hits, run file tests immediately after.
  Repo has no `tsc`.
- [patterns/prove-a-guard-test-with-an-in-memory-mutant] (K1, pass 2) — applies: every NEW guard this
  pitch adds must have a mutant proof. Specifically: writer `wx`+`rename`, per-component `lstat`/
  realpath ancestor walk (S1), symlinked-legacy-is-not-absent (K1 pass 1), fail-closed lexer
  unreadable / oversize / symlinked (K4 pass 1), `--force` hand-edited-vs-stale gate (S2), `.rejected`
  retain (K6 pass 1). The pattern's named examples are "ancestor checks, symlink refusal" — verbatim
  this pitch's new work. Without a mutant, the guard can be inert and green.
- [issues/a-missing-tracked-file-is-not-an-undeleted-deletion] (K2, pass 2) — applies by exact file.
  This entry IS the `ai_workflow_env.example.json` precedent: pitch A4 (rejected — see X20) and the
  recorded root cause was `workflow-doctor.mts`'s "Workflow settings" check running against a preflight
  fixture that wrote no settings file. Same 3 files, same check, same missing-fixture-artifact shape.
  Rule: a missing-file test failure is evidence about this tree, not intent — check `CHANGELOG` /
  `SETUP.md:195` / `.gitignore` before restoring; doctor fixtures need the normal generated artifact
  alongside copied templates.
- [patterns/keep-the-fakes-guarantee-the-thing-they-replace] (K3, pass 2) — applies: K1 (pass 1)'s
  whole failure is "symlinked legacy file read as absent", which is `existsSync`/`statSync`
  behaviour inside `memoryFs`. `ai-framework/scripts/runtime/test-helpers.mts` already fixes it —
  `memoryFs(files, links)` where `links` is `path -> target`, empty target = dangling, `statSync`
  follows, `existsSync` false on dangling. Migrator's hostile-shape tests only prove K1/S1 if they
  pass the `links` map with real targets + dangling case; a `Set<string>` of link paths silently
  resurrects the bug. Also ENOENT vs ENOTDIR semantics on backup/delete walks.
- [issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard] (K4, pass 2) — applies: pitch's
  migrator refuses on symlinked ancestor *and* realpath's every component (S1). `tempFixture` at
  `ai-framework/scripts/runtime/test-helpers.mts:20` defaults `resolve !== false` → returns
  `/private/var/...`, so a test asking for the un-resolved form is indistinguishable from the
  resolved one and passes for the wrong reason. Must pass `{ resolve: false }` for alias-shape tests,
  and build expected refusal paths from the same form the code under test returns (macOS `/var`
  vs `/private/var`).
- [issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check] (K5, pass 2) —
  applies: breadboard names `.claude/skills/build/SKILL.md` + `.cursor`/`.agents` mirrors and
  "AGENTS.md+CLAUDE.md mirror parity" but never the refresh step. Cursor mirrors are generated
  byte copies, self-healing only if refreshed: `node ai-framework/scripts/skill-defaults.mts`
  mirror assertion (`skill-defaults.test.mts:274`) and `setup-validator.mts:154` both fail
  otherwise. Remedy: `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` after
  every canonical edit. Mirrors count as files toward the cap.
- [decisions/runtime-boundary-validator-design] (K6, pass 2) — applies to X5's "doctor registers the
  range validator through this pitch's open `integrations`-style validator map". The map is the same
  shape as doctor's existing `Runtime boundary` check (`workflow-doctor.mts:156`): one library
  function, doctor's check list calls it, the test suite calls the same function, severity ladder
  production-fails / tests-summary-warn, and `unparsed` rendered as fixed-text advisory. Records the
  answers the pitch re-derives: shared-function-between-doctor-and-test contract, bounded lexical
  scan (1 MiB, no symlinks), fixed-text unparsed advisories, and "doctor script list is kept
  complete".
- [issues/guard-tests-can-fail-for-the-wrong-reason] (K1, pass 3) — applies to every mutant-proof
  this pitch adds. Recorded failure modes: mutation scratch copy omitted its relative example fixture
  so unrelated reads failed and results were discarded; a `Stats` mock spread to a plain object
  lost prototype methods so refusal fired for a malformed mock, not the inode mismatch. Rules:
  passing baseline in the same fixture layout before counting a mutant as detected; inspect the
  failing assertion, not the exit code; preserve native-object methods when mocking one field; keep
  the zero-read assertion where contract demands refusal before opening contents. Per-guard:
  every guard's fixed-text error **code** is a contract deliverable (`config.mts` exposes
  `errorCodes`), or the mutant harness has nothing to assert on. (Reuses the `memoryFs(files, links)`
  link map from K3-2.)
- [patterns/subprocess-revalidation-against-on-disk-code] (K2, pass 3) — applies to migrator's
  `--apply` "re-parse on-disk TOON through the *running parser*" claim (cached `require` validates
  pre-write code silently); `setup-validator.mts` shells `workflow-doctor --json` (correct shape but
  the ordering rule that makes it load-bearing is uncited); pitch-5 rollout = sync →
  `config-migrate --apply` → verify in one run, recorded precedent is `bundle-sync` spawning
  `skill-sync reconcile` after its own writes. Bears on (c1)+(c2)'s "each scope ships green"
  claim: green via cached module is not green. Migrator + doctor re-read on-disk before validating.
- [issues/macos-tmpdir-realpath-alias-breaks-path-assertions] (K3, pass 3) — applies to the OTHER
  direction of K4-2. `tempFixture` realpaths by default, so tests building expected refusal paths
  from raw `os.tmpdir()` or `mkdtempSync` compare `/var/...` against code output `/private/var/...`
  (same inode, failing assert). Twice in this repo, two implementers, neither saw the other.
  12 files use `tempFixture` / 30 call sites; 9 sit in this pitch's reader-test set
  (`orca-eval-grader.test.mts` has 6, `orca-start.test.mts` has 3). Rule: realpath fixture root
  once, build every expected path from that form; `resolve:false` only in alias tests, and both
  sides of that comparison in the same form. K4-2 + K3-2 + this entry: alias tests must pass
  `{ resolve: false }` AND build expected refusal paths from the same form the code returns.
- [patterns/dual-hash-tracking-for-transformed-content] (K4, pass 3) — applies to `--force` branch
  (ii) "distinguish hand-edited-valid from stale-from-crashed-mid-write" (S2, S5, critical #6) which
  is stated 3 times with no mechanism. One hash conflates operator edit with writer change.
  Mechanism: record two digests (canonical-bytes-written + parsed-model-as-read); re-verify against
  the written hash only; the source hash answers "did the operator touch it". Two extra properties
  bind: transform must be deterministic or `--apply` idempotency breaks, and transform failure must
  abort before any write — which is branch (iii)'s `.rejected` never-overwrite rule. Composes with
  K7's generator marker + K6's `schemaVersion` rule.
- [issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers] (X-A, pass 3) — applies
  to the additive `loadConfig`+legacy reader+grader writer race during c1+c2. The reader seam is
  a read-side TOCTOU pin (`orca-policy.mts:62-99`): lstat-walk every component,
  `O_NOFOLLOW|O_NONBLOCK`, dev/ino compare before AND re-`inspectPath` after read. Migrator's
  `--apply` deleter is the writer that participates; `bundle-sync` is verified NOT a config writer
  (root files absent from `SYNCED_DIRS:59-77` and `FLAGGED_FILES:83`). Migrator owns the lock.
  /plan ports this primitive verbatim from `orca-policy.mts:62-99`; no re-derivation. Apply
  alternative — flock — has zero precedent here (`hooks/scripts/metrics-lock.mts:6-19` is
  macOS-only, verbatim *"Verified on macOS only. Linux and Windows behaviour is not claimed."*).
  Use O_EXCL lockfile (the primitive `orca-apply.mts:264` already uses
  `writeFileSync(..., {flag:'wx'})`), EEXIST → fixed-text operator-recovery message shaped like
  S5's `.rejected`. ~45 LOC, identical on both runners.
- [issues/coverage-instrumentation-changes-exact-child-environments] +
  [issues/orca-workers-differ-from-the-coordinator-environment] (X-B, pass 3) — runner-divergence
  entries. Verifies `runtime/bun.mts:23-36` overrides only async `readFile`/`writeFile`/`exists`;
  sync `writeFileSync`/`lstatSync`/`realpathSync`/`openSync`/`renameSync` come from
  `createNodeDeps → node:fs`. `wx`+`rename` is runner-identical under both runners. Drift surface
  is async-only (`bun.file().exists()` false for dirs; `bun.write` no flag/mode). Migration's
  `--dry-run` is async-only reads; runner preflight lives ONLY before `--dry-run` output review,
  not as a blanket version gate. Pinning raw `node:fs` breaks the `deps.fs` injection that every
  `memoryFs(files, links)` mutant proof depends on — DO NOT pin raw `node:fs`. Use
  `deps.fs.writeFileSync(path, data, {flag:'wx'})` (already correct on Bun); add one ~15 LOC
  regression gate asserting the Bun adapter never overrides `writeFileSync`.
- Existing reader `ai-framework/scripts/runtime/env.mts` already enforces: regular file, ≤64 KiB, realpath
  inside root, allowlisted keys. Reuse those guards; do not write a second reader. The real
  guarded reader is `orca-policy.mts:62-99` `inspectPath` + `readBoundedFile` (lstat-walk +
  `O_NOFOLLOW` + dev/ino pin); /plan ports this primitive into `config.mts` writers + migrator
  deleter verbatim — no re-derivation. Writer-side guards (K1, K2, S1,
  `sync-tools-refuse-symlinks-in-source-and-destination`, orca-policy.mts:62-99) are new and live next
  to the reader.

## Owner decisions (2026-10-16)

- One TOON file at the project root holds all four sources.
- Legacy files: migrator writes TOON, backs originals up under `.project/records/config-migration/`,
  deletes them. Readers warn on leftover legacy files for one minor version, then ignore them.
- `.project/skills/registry.json`, `lock.json`, `transaction.json` stay as machine state (not config).

## Solution sketch (breadboard)

**Places (13-scope pass-3 decomposition — totals 67 files / ~7,616 LOC, epic at big-batch appetite)**:

- **a1 (7 files / 1,171 LOC)**: `ai-framework/scripts/runtime/config.mts` (a1) — exports
  `wxRename`, `inspectPath` + `readBoundedFile` (ported verbatim from `orca-policy.mts:62-99`),
  `oexLock` (O_EXCL lockfile via `deps.fs.writeFileSync(lock, "", {flag:"wx"})`), `errorCodes`
  (one fixed-text error code per guard), `registerIntegrationValidator` /
  `registerEngineValidator` / `registerCoordinatorValidator` named slots, `loadConfig`,
  `inspectConfig`. Includes parser, typed model, per-section validators, canonical writer,
  `schemaVersion` migration table, prototype-pollution guard, within-role duplicate rejection,
  reserved-but-validated `engines.*` + `integrations.*` + `coordinators.*` slots, `orchestration.*`
  bound keys, `orchestration.workers` pre-declared, lexer's fail-closed scanner. +
  `ai-workflow.toon` (project root example TOON) +
  `ai-framework/templates/ai-workflow.example.toon` (sibling to the relocated
  `ai_workflow_env.example.json`, root copy DELETEd, 4 referrers updated, cite
  `compaction/archives/orca-vendor-foundation.../plan.md:25` for "do NOT relocate into
  `templates/project/`") + decision record +
  `ai-framework/scripts/runtime/oex-lock.mts` (new file, the lock primitive, ~45 LOC, identical
  on Node/Bun) + `runtime/test-helpers.mts` extension lands in **a3**.
- **a2 (1 file / 1,170 LOC)**: `ai-framework/scripts/runtime/config.test.mts` — parser unit
  + 7 parser-guard mutants (one per `errorCodes` parse-shape entry: `wx`+rename, ancestor walk,
  symlinked-legacy-not-absent, lexer unreadable, lexer oversize, lexer symlinked, lexer
  refuse-clause). Each mutant = ~70 LOC + 25 LOC passing-baseline-in-same-fixture-layout +
  fixed-text assertion inspection (not exit code).
- **a3 (3 files / 780 LOC)**: writer/path mutants (5: `--force` hand-edited-vs-stale dual-hash,
  `.rejected` retain, unknown `schemaVersion` refuse, `..`-escape, lowercase allowlist) +
  alias-guard tests (K3-2 + K4-2 + K3-3: `tempFixture` `{ resolve: false }` + same-form-path
  comparison in BOTH directions) + subprocess revalidation tests (K2 pass 3 — fresh Node/Bun
  subprocess re-reads TOON before validating) + lock contention + stale recovery tests;
  `ai-framework/scripts/runtime/test-helpers.mts` extended with one TOON fixture writer built
  on `memoryFs(files, links)` link map (K1 pass 3).
- **c1.1 (10 files / 375 LOC)**: 10 production readers (`runtime/env`, `runtime/select`,
  `runtime/entry`, `skill-defaults`, `state-snapshot`, `workflow-doctor`, `orca-policy`,
  `orca-launch-gate`, `orca-eval-grader` rewired to use `wxRename`, `token-consumption` hook)
  — each adds a TOON branch alongside the legacy fallback, with reader signature FROZEN at
  today's exact arity (A5 pass 2 + A5-2). 7 indirect consumers (`orca-dispatch`,
  `orca-preflight`, `orca-reconcile`, `orca-run`, `orca-start`, both `orca-start-hook` files)
  all consume `orcaMultiAgentEnabled` only and stay byte-stable.
- **c1.2 (11 files / 850 LOC)**: reader test files — both `readPolicy` legacy and
  `readPolicy` `loadConfig` branches exercised; grader no-race tests prove `loadConfig` reads
  do not collide with `orca-eval-grader.mts:347` writes.
- **c2.1 (4 files / 500 LOC)**: `ai-framework/scripts/workflow-doctor.mts` (gain the
  `Runtime boundary`-shaped check for `integrations.*` + `engines.*` + `coordinators.*` validator
  registrations; unregistered slot = `fail`, not silent pass) +
  `ai-framework/scripts/setup-validator.mts` (gain the `Workflow config` check — absent = `info`
  "not yet migrated", invalid = `fail`; filter by `name`+`status` in `--json` `results[]`,
  never on exit code per X8 pass 3) + 2 doctor script-list entries (config validity + config-migrate,
  per X11 pass 3 `kept-complete script list` rule).
- **c2.2 (6 files / 120 LOC)**: root docs (`AGENTS.md` + `CLAUDE.md` byte-equal, `README.md`
  rewritten 4 legacy-config refs + line 95 dead-end instruction per X7 pass 3, `CHANGELOG.md`,
  `VERSION`).
- **c2.3 (13 files / 190 LOC)**: framework docs (`workflow/overview.md`,
  `integrations/{harnesses,orca-vendors,skill-defaults}.md`, `docs/{setup,vendors,workflow-doctor,
  design-notes,extending,token-consumption}.md`, `runtime/README.md`) +
  `ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` runs after every canonical
  edit (K5 pass 2) + `.cursor/skills/build/SKILL.md` mirror refresh.
- **c2.4 (2 files / 240 LOC)**: `hooks/scripts/orca-start-hook.mts` +
  `hooks/scripts/orca-start-codex-hook.mts` cutover. Token-consumption keeps legacy
  `.project/skills/modes.json` read for the one-minor-version warning window (X8).
- **b1 (1 file / 625 LOC)**: `ai-framework/scripts/config-migrate.mts` migrator CLI prod
  (writer + dual-hash + 3-branch force only; NO delete pass yet — runs only when a `loadConfig`
  reader exists). REUSES `runtime/migrate.mts:15 regular()` + `:7 EntryMigration` shape (X11
  pass 3) — does not invent a second vocabulary. Subprocess-revalidation required (K2 pass 3):
  on `--apply`, spawn a fresh Node/Bun subprocess to re-parse, do not use the running
  `require` cache. Migrator refuses on unregistered slot (X4 pass 3).
- **b2 (2 files / 560 LOC)**: migrator functional tests (dry-run / apply / idempotent /
  3-branch force / dual-hash tracking / `.rejected` move).
- **b3 (3 files / 825 LOC)**: migrator guard proofs — 5 writer/path mutants (mutant harness
  per K1 pass 3, `memoryFs(files, links)`, `errorCodes`) + dual-hash tests + lock contention +
  stale recovery + bundle-sync mutation-checked exclusion + simulated old-version sync +
  ONE Bun-adapter regression gate (asserts `runtime/bun.mts` never overrides
  `writeFileSync`; X-B pass 3).
- **d (4 files / 210 LOC)**: legacy-delete pass + retirement (`.rejected` rename goes here,
  `runtime/env.mts` legacy reader retires, the four legacy paths `ai_workflow_env.json` +
  `orchestration.json` + `workflow-doctor.json` + `modes.json` are unlinked under O_EXCL
  lock). `ai-framework/integrations/orca-vendors.example.json` is NOT retired here — 8 test
  files read it by relative path (verified); content edit goes to pitch 4 (X5 pass 3).

**Shape of the file** (illustrative; exact keys fixed in /plan):

```toon
schemaVersion: 1
runtime:
  runner: bun                # was AI_WORKFLOW_RUNNER
engines:
  orca: "1.4.224"           # exact while pitch 3 is open; opaque string validator live here
orchestration:
  multiAgent: true          # was AI_WORKFLOW_ORCA_MULTI_AGENT
  enabled: true             # was use-orca-orchestration
  maxConcurrentWorkers: 3   # bound 1..16 (X18); pitch 4 raises default ceiling
  maxRetriesPerTask: 1      # bound >=0
  workers: []               # optional superset of role-pool union (X19); reserved
  coordinators:
    claude:
      roles:
        implementation[1]: opencode
        review[1]: codex
doctor:
  modelRouting: project
skills:
  modes:
    caveman: full
integrations: {}            # open map; range validators register here (pitch 3)
```

`integrations.notion` and `integrations.orca.cliCommand` deliberately dropped (X22 — no
readers in this repo today would leave them as "reported, not used" doctor findings forever).

**Affordances**:
- `config.mts` (a-scope, NEW): `loadConfig(root)` → typed model + problems list; exports
  `errorCodes` (every guard's fixed-text error code as a contract deliverable for the mutant
  harness — K1 pass 3); exports `inspectPath` + `readBoundedFile` PORTED VERBATIM from
  `orca-policy.mts:62-99` (lstat-walk every component, `O_NOFOLLOW|O_NONBLOCK`, dev/ino compare
  before AND re-`inspectPath` after read); exports `wxRename(writer: (path) => void)` primitive
  (atomic `deps.fs.writeFileSync(path, data, {flag:"wx"})` + `deps.fs.renameSync(tmp, target)`);
  exports `oexLock(path)` O_EXCL lockfile (the primitive `orca-apply.mts:264` already uses) — ~45
  LOC, identical on Node/Bun; exports the four named validator slots (`integrations.*`,
  `engines.*`, `coordinators.<vendor>.*`, `errorCodes`). Includes prototype-pollution guard
  (`Object.getPrototypeOf(value) ∈ {Object.prototype, null}`, S4), within-`roles.<role>`
  duplicate rejection (S3), and parse-error refusing (K6 pass 1). Same lexer + same guard set
  used at every reader site; unreadable / oversize / symlinked = failure not warning; findings
  collected before a lexer error + an `unparsed` entry (K4 pass 1).
- `config-migrate.mts` (b-scope, NEW; co-located next to `runtime/migrate.mts` — *reuse* the
  existing `runtime/migrate.mts:7 EntryMigration{path, status:"ready"|"applied"|"manual"}`
  result shape and `runtime/migrate.mts:15 regular()` lstat-per-component ancestor walk; do not
  invent a second vocabulary). CLI: `--dry-run` (default) prints the TOON it would write;
  `--apply` writes + backs up + deletes legacy; `--force` covers THREE branches (S5):
  (i) absent → write; (ii) parseable + valid → refuse unless `--force`, and `--force`
  distinguishes hand-edited from stale-from-crashed via dual-hash tracking (K4 pass 3:
  record canonical-bytes-written hash + parsed-model-as-read hash; verify against written hash
  only); (iii) present + unparseable → refuse, never silently overwrite, move to `.rejected`,
  require operator recovery. Every write path uses `wxRename` + dev/ino re-check before and
  after via `inspectPath`/`readBoundedFile` (X-A); every delete path uses `oexLock` lockfile
  with EEXIST → fixed-text operator-recovery message. Subprocess-revalidation required (K2
  pass 3): on `--apply`, re-parse via a fresh Node/Bun subprocess, not the running parser
  (`require` cache holds pre-write code). Mutant-proof tests for the 14 discrete guards using
  the `memoryFs(files, links)` link map (K1 pass 3, K3-2): each guard gets a fixed-text error
  code contract + a passing baseline in the same fixture layout + inspection of the failing
  assertion (not exit code).
- Schema migrations: `schemaVersion` + ordered `vN → vN+1` functions. Unknown version refused,
  rejected file kept aside as `.rejected`, never overwritten (K6 pass 1). Same reader rules
  used for `modes.json`. Downgrade test for `orchestration.workers` (X19).
- Writer: re-emits canonical TOON from the model (comments in example template only). Replace
  only generator-marked files; name and skip unmarked (K7). Preserves `orchestration.workers`
  if set. Deterministic transform required or `--apply` idempotency breaks (K4 pass 3).
- Parser accepts `roles.<role>` as string OR array of distinct strings; rejects within-role
  duplicates; validates nothing about pool semantics. Reader hands `orca-start.mts` a
  flattened, distinct worker list (S3). Behavior lands in `orca-role-pools`. Avoids
  `schemaVersion: 1→2` migration in pitch 4 (X4). `PolicyResult.policy.coordinators.<v>.roles`
  is pitch-4-widenable (X2); `readPolicy().report().roles` is frozen at `Record<string,string>`
  (the seam value consumed by `orca-start.mts:157`).
- Doctor: config check (missing / valid / invalid / legacy-files-present → run migrator).
  The "leftover legacy files" walk excludes `.project/records/config-migration/` (S7).
  Severity contract with pitch 5: absent TOON check named `Workflow config` returns
  `info` ("not migrated yet"), invalid returns `fail` (X24, X8 pass 3). Pitch 5's post-`--dry-run`
  validator run gates on `--json` `results[]` by name+status, NOT exit code. Doctor's
  `Runtime boundary` check shape re-used for `integrations.*` + `engines.*` + `coordinators.*.*`
  validator registrations (K6 pass 2). Doctor's "kept-complete script list" gains two new
  scripts — config.mts TOON validity check + config-migrate.mts (X11 pass 3). Unregistered
  slot in the validator table = `fail`, not silent pass (X4 pass 3).
- bundle-sync: `ai-workflow.toon` is instance data; never synced, never overwritten.
  Mutation-checked test + simulated old-version sync (K5 pass 1). `bundle-sync` is verified
  NOT a config writer (root files absent from `SYNCED_DIRS:59-77` and `FLAGGED_FILES:83`;
  `compareFlagged:243` is hash-only) — migrator owns the lock, not bundle-sync (X-A pass 3).
  `SETUP.md` + `README.md` added to `FLAGGED_FILES` (X21).
- `integrations` section: open map per integration, each with its own validator; unknown
  integration keys are reported, not used. Range validators (pitch 3) plug in via the named-slot
  reserved-key table (`registerIntegrationValidator(key, fn)` exported by `config.mts`)
  without rewriting doctor's core check (X5 pass 3, X14). Call site = `workflow-doctor.mts`.
- `engines` section: reserved-but-validated per-key slot (`registerEngineValidator(key, fn)`).
  Pitch 3 registers the range parser under `engines.orca` here (X4 pass 3). Example TOON ships
  exact `engines.orca: "1.4.224"` until pitch 3 lands (X13). No released 3.0.0 advertises
  range syntax that silently does nothing.
- `coordinators.*` section: per-coordinator validator slot reserved (X3 pass 3). `validateCoordinator`
  (currently module-private in `orca-policy.mts:32`) is exposed via the slot as the first
  registered entry. Pitch 4 registers per-coordinator `defaultMaxConcurrentWorkers` bounds here
  without re-opening `config.mts` (X18) or the `readPolicy` seam body (X3).

**Connections (rewritten for pass-3 order)**:

`legacy files` → (c1)+(c2)+(b)+(d) additive → `ai-workflow.toon` → `loadConfig` →
frozen seams (signature AND payload frozen — see X2):
- `orca-policy.mts:62-99` read-side TOCTOU pin: lstat-walk + `O_NOFOLLOW` + dev/ino compare
  before AND after read (verbatim from current code; NOT re-derived).
- `orca-policy.readPolicy(root,deps) → PolicyResult|Refusal` (signature frozen; `report().roles`
  frozen at `Record<string,string>`; `PolicyResult.policy.coordinators.<v>.roles` pitch-4-widenable).
- `runtime/select.orcaMultiAgentEnabled`, `skill-defaults.loadModes(root,deps) → ModesState|null`
- `runtime/env.loadWorkflowEnv(root,deps) → Record` (frozen at TODAY's exact `(fs,path,root,env)`
  shape — not `(root,deps) → WorkflowEnv|null`).
- `orca-launch-gate.mts` version-check seam (X14).

Order of construction (pass-3 mandatory): **(a) → (c1) → (c2) → (b) → (d)**.
(a)'s `wxRename` + `inspectPath`+`readBoundedFile` + named-slot table LAND FIRST — without
them (c1) readers and (b) migrator cannot function. (c1) runtime/orca readers + grader rewire
NEXT — additive `loadConfig`+legacy, no file deleted yet. (c2) skills/hooks readers + doctor +
docs + `.gitignore` NEXT — also additive. (b) migrator `deleter` LAST — only after every
reader has a TOON path. (d) legacy retirement — last; absorbs the `env.mts` legacy reader +
the `ai-framework/integrations/orca-vendors.example.json` orphan (kept in place, content edit
goes to pitch 4 per X5 pass 3) + `runtime/env.mts` reader retirement. Live drop is impossible
because (c1)+(c2) come BEFORE (b). The `runtime/test-helpers.mts` TOON fixture writer
inherits the (a) primitive, builds on `memoryFs(files, links)` link map (K3-2 + K1 pass 3),
gains no new `tempFixture` duty.

## Rabbit holes

**Resolved here** (re-shaped for pass-3 — order matters):

- **(a) `wxRename` + `inspectPath`+`readBoundedFile` + named-slot table LAND FIRST** (pass-3
  mandatory order). The toctou/dup-race/registrar mechanics live in (a). Without (a), (c1)+(c2)
  and (b) cannot function. Concrete primitives:
  - `config.mts` exports `wxRename(writer)` from `deps.fs.writeFileSync(p, d, {flag:"wx"})` +
    `deps.fs.renameSync(tmp, target)`. Primitive ports from `orca-apply.mts:264` (which uses
    the same pattern). Replaces the pass-1/pass-2 "every write path uses `wx`+rename" hand-wave.
  - `config.mts` exports `inspectPath` + `readBoundedFile` PORTED VERBATIM from
    `orca-policy.mts:62-99` (lstat-walk every component, `O_NOFOLLOW|O_NONBLOCK`, dev/ino compare
    before AND re-`inspectPath` after read). X-A pass 3 — no re-derivation.
  - `config.mts` exports `oexLock(path)` O_EXCL lockfile via `deps.fs.writeFileSync(lock, "", {flag:"wx"})`.
    EEXIST → fixed-text operator-recovery message. The only lock primitive with precedent in
    this portable bundle. `flock` rejected (zero precedent; macOS-only loopback TCP in
    `hooks/scripts/metrics-lock.mts`).
  - `config.mts` exports `registerIntegrationValidator(key, fn)` + `registerEngineValidator(key, fn)`
    + `registerCoordinatorValidator(vendor, fn)` named slots. Unregistered slot = doctor `fail`
    (X4 pass 3).
  - `config.mts` exports `errorCodes` — every guard's fixed-text error code is a contract
    deliverable; mutant harness asserts on `errorCodes.foo`, not exit code (K1 pass 3).
- **TOON parser source → strict in-repo subset parser + writer.** Bundle has no
  `package.json`; ships without npm install. Subset: objects by indentation, scalars (string,
  number, boolean, null), quoted strings, inline primitive arrays `key[N]: a,b`. No tabular
  arrays unless /plan needs them. Reject anything else with line/column.
- **TOON parsing shape → linear line scanner** with open/close state, bounded+anchored matching,
  size cap, timing test (K3 pass 1). No backtracking regex on `ai-workflow.toon`.
- **Env override precedence → process env > TOON > defaults** (same as today).
- **`engines.orca`** ships exact `"1.4.224"` until pitch 3 lands. Pitch 3 registers the range
  parser via `registerEngineValidator("engines.orca", rangeFn)` (X13 pass 3, X4 pass 3). Doctor
  fails on unregistered slot. No released 3.0.0 advertises range syntax that silently does
  nothing.
- **Parser accepts `roles.<role>` as string OR array** of distinct strings; rejects
  within-role duplicates (S3); validates nothing about pool semantics; protects against
  `__proto__`/`constructor`/`prototype` (S4, `orca-policy.mts:27`). Behavior lands in
  `orca-role-pools`. Avoids `schemaVersion: 1→2` migration in pitch 4 (X4). Reader flattens
  array to `Record<string,string>` for `orca-start.mts:157` (the seam value, not the seam
  signature).
- **Reader seams frozen** (signature AND payload — X2 pass 3):
  - `orca-policy.readPolicy(root,deps) → PolicyResult|Refusal` signature frozen.
  - `readPolicy().report().roles` frozen at `Record<string,string>` (the seam value consumed by
    `orca-start.mts:157`).
  - `PolicyResult.policy.coordinators.<v>.roles` pitch-4-widenable (the internal schema lives
    inside the seam's payload; freeze names it explicitly so pitch 4 has a legal edit site).
  - `runtime/select.orcaMultiAgentEnabled`, `skill-defaults.loadModes(root,deps) → ModesState|null`.
  - `runtime/env.loadWorkflowEnv(fs,path,root,env) → Record` (TODAY's exact shape — NOT
    `(root,deps) → WorkflowEnv|null`).
  - `orca-launch-gate.mts:62-99` lstat walk + dev/ino pin (verbatim from current code).
  - Diff criterion (X12 restated): `git diff --name-only` after (a)+(c1)+(c2)+(b) lands lists
    no `orca-*.mts` EXCEPT (`orca-policy.mts` + 7 fixture tests + `orca-preflight.test.mts:338-341`
    filename filter + `orca-launch-gate.mts:13` doc line).
- **`runtime/migrate.mts` REUSE** (X11 pass 3): `runtime/migrate.mts:15 regular()` IS the
  lstat-per-component ancestor walk pitch-2's Places listed as new. `runtime/migrate.mts:7
  EntryMigration{path, status:"ready"|"applied"|"manual"}` IS the dry-run/apply result shape.
  Pitch 2 REUSES — does not invent a second vocabulary. Pitch 2 adds the dual-hash + K4 pass 3
  machinery + S5 branch (iii) on top of this existing primitive. Doctor's "kept-complete script
  list" gains TWO new scripts in (c2.1): config.mts TOON validity check + config-migrate.mts.
- **Migrator `--force` covers THREE branches** (S5) with mechanism (K4 pass 3):
  - (i) absent → write;
  - (ii) parseable + valid → refuse unless `--force`; `--force` distinguishes hand-edited-valid
    from stale-from-crashed via DUAL-HASH tracking (canonical-bytes-written + parsed-model-as-read;
    verify against written hash only; deterministic transform required);
  - (iii) present + unparseable → refuse, never silently overwrite, move to `.rejected`,
    operator-driven recovery.
- **Migrator `--apply` re-parses via subprocess** (K2 pass 3) — not the running `require` cache.
  Cached `require` validates pre-write code. `setup-validator.mts` already shells
  `workflow-doctor --json`; pitch-5 rollout is sync → migrate → verify in one run, recorded
  precedent is `bundle-sync` spawning `skill-sync reconcile` after its own writes.
- **SchemaVersion** migration (K6 pass 1): refuse unknown `schemaVersion`, rejected file kept
  aside as `.rejected`, never overwritten. Same reader rules used for `modes.json`.
  `modes.json` JSON parse uses the same enforcing lexer as the snapshot read.
- **Open `integrations` map**: unknown keys reported, not used. Lexer fails closed
  (unreadable / oversize / symlinked = failure not warning); findings collected before a lexer
  error plus an `unparsed` entry (K4 pass 1).
- **Bundle-sync exclusion** (K5 pass 1): `ai-workflow.toon` is instance data (root file, not in
  `SYNCED_DIRS:59-77` and not in `FLAGGED_FILES`, never copied). Mutation-checked test + simulated
  old-version sync. `bundle-sync` is verified NOT a config writer — migrator owns the lock,
  not `bundle-sync` (X-A pass 3).
- **Doctor's "leftover legacy files" check** excludes `.project/records/config-migration/`
  (S7, K4 pass 1).
- **`.gitignore` edit** (X15): add `ai-workflow.toon`, drop stale legacy lines 7 + 12, fix
  the "the .example.json stays tracked" comment. Migrator appends the line to a target
  `.gitignore` on `--apply`. `SETUP.md:195` already owns the manual instruction.
- **Mirror-parity refresh** (K5 pass 2): every canonical edit runs
  `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply` before commit. Exit:
  `skill-defaults.test.mts:274` + `setup-validator.mts:154` both clean. `.agents/skills/build/SKILL.md`
  is a 3-line stub, no edit there (A10 acknowledged). AGENTS.md + CLAUDE.md both need same 2
  lines, byte-equal.
- **`tempFixture` alias tests** (K3-2 + K4-2 + K3-3): alias tests must pass `{ resolve: false }`
  AND build expected refusal paths from the same form the code returns. 9 of pitch's reader
  tests use `tempFixture`; audit covers all 9.
- **`memoryFs(files, links)` link map** (K3-2): TOON fixture writer inherits the link map so
  `existsSync`/`statSync` follow correctly. K1 pass 3 mutant harness requires this.
- **Mutant harness covers 14 discrete guards** (K1 pass 3, A7): `wx`+rename, ancestor walk,
  symlinked-legacy-not-absent, lexer unreadable, lexer oversize, lexer symlinked, `--force`
  hand-edited-vs-stale (dual-hash), `.rejected` retain, unknown `schemaVersion` refuse,
  prototype-pollution, within-role duplicate, `..`/lowercase allowlist, bundle-sync exclusion,
  doctor backup-dir carve-out. Each guard gets a passing baseline in identical fixture layout
  + assertion inspection (not exit code) + the `errorCodes.foo` fixed-text contract.
- **Branch-gate** (X1, X16): branch from 2.23.0 release tag; gate = `git status --porcelain`
  empty against the 4 dirty code files S9 must commit (`orca-preflight.test.mts`,
  `runtime/node.mts`, `runtime/runtime.test.mts`, `skill-defaults.test.mts`).
- **`ai_workflow_env.example.json` EXISTS** at bundle root (76 bytes, tracked). Relocate to
  `ai-framework/templates/` alongside the new TOON example, DELETE the root copy, update the 4
  referrers. Cite archived decision (`.project/compaction/archives/orca-vendor-foundation.../files/plan.md:25`)
  — relocating INTO `ai-framework/templates/project/` would break
  `workflow-doctor.mts:442 checkProjectScaffold` (requireFile'd). Add no-go against
  `templates/project/` for any optional template.
- **`ai-framework/integrations/orca-vendors.example.json`** kept in place (X5 pass 3): 8
  test files read it by relative path (verified). Retire not possible; relocate breaks 8 paths
  identically. Content edit goes to pitch 4 (the `maxConcurrentWorkers: 2` + 2-worker-pool +
  string-roles shape is what pitch 4 widens).
- **`README.md:95` + `integrations/orca-vendors.md:5` dead-end instruction** (X7 pass 3): both
  tell operators to copy the example to `.project/orchestration.json` — a file (b) deletes and
  no reader reads after (c1). Rewrite both in (c2.2), not deferred (d). First sync delivers
  `templates/ai_workflow_env.example.json` + `templates/ai-workflow.example.toon` — record in
  pitch-5 ledger row.
- **`setup-validator` structurally cannot see severity contract** (X8 pass 3):
  `setup-validator.mts:209` accepts only `--json`/`--no-color`; `checkWorkflowDoctor:158-164`
  collapses to exit code + `failures`. Pitch 5's post-`--dry-run` validator run gates on
  `--json` `results[]` BY `name` + `status` — explicitly name the new check `Workflow config`,
  filter on `info`="not yet migrated", never on exit code. K2-2: a missing artifact is
  evidence, not a contract — do NOT add a `--validate-absent` flag.

**Pushed to /plan as risk** (owner: planner) — pass-3 mandatory 13-scope decomposition:

Total scope: **67 files / ~7,616 LOC** (corrected count post-pass-3 — A1 + A3–A7). Pitch's
"big-batch" framing is wrong by shape; this is an epic at big-batch appetite. /plan owns the
decomposition. Mandatory order (A2 pass 3 — neither pass-1's `a→b→c` nor pass-2's
`c1→c2→b→a`; this is `a→c→b→d`):

| scope | what lands | files | LOC | vs 15/1500 |
|-------|------------|-------|-----|------------|
| **a1** | `config.mts` + new example + decision record + `oexLock` lockfile (45 LOC) + `wxRename` primitive + `inspectPath`/`readBoundedFile` ported from orca-policy:62-99 + named-slot registrar (4 slots: `integrations.*`, `engines.*`, `coordinators.*`, `errorCodes`) + `errorCodes` enum | 7 | 1,171 | 0.47× / 0.78× |
| **a2** | `config.test.mts` (parser unit + 7 parser-guard mutants, one mutant per errorCode) | 1 | 1,170 | 0.07× / 0.78× |
| **a3** | writer/path mutants + alias-guard tests (K3-2 + K4-2 + K3-3) + subprocess revalidation tests (K2 pass 3) + lock contention + stale-recovery tests; `runtime/test-helpers.mts` extended with one TOON fixture writer built on `memoryFs(files, links)` (K1 pass 3) | 3 | 780 | 0.20× / 0.52× |
| **c1.1** | runtime/orca reader glue (additive `loadConfig`+legacy fallback); rewire `orca-eval-grader.mts:108` + `:347` to use `wxRename` (X1 pass 3) | 10 | 375 | 0.67× / 0.25× |
| **c1.2** | reader tests + grader no-race tests; both `readPolicy` legacy and `readPolicy` loadConfig branches exercised | 11 | 850 | 0.73× / 0.57× |
| **c2.1** | doctor + setup-validator + 2 new doctor scripts (config validity + config-migrate, per X11 pass 3) + `Workflow config` check named + `info`/`fail` filtering; doctor's "kept-complete script list" edit | 4 | 500 | 0.27× / 0.33× |
| **c2.2** | root docs + AGENTS/CLAUDE parity + `setup-validator:154` byte-mirror exit; rewrite `README.md:95` + `integrations/orca-vendors.md:5` (X7 pass 3) | 6 | 120 | 0.40× / 0.08× |
| **c2.3** | framework docs + `.claude` build `SKILL.md` + `.cursor` build `SKILL.md`; `.agents/skills/build/SKILL.md` stays stub (A10) | 13 | 190 | 0.87× / 0.13× |
| **c2.4** | `hooks/scripts/orca-start-hook.mts` + `orca-start-codex-hook.mts` cutover (X8 token-consumption decision); token-consumption keeps legacy `modes.json` read for one-minor window | 2 | 240 | 0.13× / 0.16× |
| **b1** | `config-migrate.mts` migrator CLI prod (no delete pass yet — runs only the writer + dual-hash + 3-branch force). REUSES `runtime/migrate.mts:15 regular()` + `:7 EntryMigration` (X11 pass 3) | 1 | 625 | 0.07× / 0.42× |
| **b2** | migrator functional tests (dry-run / apply / idempotent / 3-branch force) | 2 | 560 | 0.13× / 0.37× |
| **b3** | migrator guard proofs (5 writer/path mutants + dual-hash + lock contention + stale recovery + bundle-sync mutation-checked + simulated old-version sync) + one Bun-adapter regression gate (K2 pass 3 + X-B pass 3) | 3 | 825 | 0.20× / 0.55× |
| **d** | legacy-delete pass + retirement: delete `env.mts` readers + `runtime/env.mts` legacy reader retirement + (separately) `orca-vendors.example.json` content edit goes to pitch 4 (X5 pass 3); absorber of pass-1 override leftovers | 4 | 210 | 0.27× / 0.14× |
| **total** | | **67** | **7,616** | epic at big-batch appetite; max scope 13 files / 1,171 LOC |

Hard rule that makes the order safe (A2 pass 3): **no scope deletes a legacy file.** (c1)+(c2)
before (b) because (b)'s `deleter` is the only code that can cause the pass-2 live-drop. (a) first
because (c1)'s `loadConfig` IS (a)'s export AND (b)'s writer needs (a)'s writer API. Reader's
live-drop is impossible because (c1)+(c2) ship with the legacy fallback RETAINED.

A1.1 strict ordering rules:
1. **a1 ships first; no (c1)+(c2)+(b) reads `config.mts` exports until a1 lands.** (a)'s exports are
   `wxRename`, `inspectPath`/`readBoundedFile`, `oexLock`, `errorCodes`, `registerIntegrationValidator`,
   `registerEngineValidator`, `registerCoordinatorValidator`, `loadConfig`. (c1) and (b) need these.
2. **a2 follows a1.** Mutants assert on `errorCodes.foo`, which a1 exposes. Running mutants
   against a library that doesn't expose errorCodes is reading the wrong assertion.
3. **a3 follows a2.** Subprocess revalidation needs a1's CLI registered.
4. **c1.1 follows a3.** Runtime/orca reader `loadConfig` calls use (a)'s exports. Until (a)'s
   re-exports land, (c1) can ship a no-op `loadConfig` that returns null and the fallback runs.
5. **c1.2 follows c1.1.** Tests prove both branches return identical values.
6. **c2.1 follows c1.1.** Doctor's `Runtime boundary` shape uses `errorCodes` from a1.
7. **c2.2 + c2.3 + c2.4 in any order after c2.1.**
8. **b1 follows c1.1** (migrator validates that a loadConfig path exists, otherwise `--apply`
   refuses with "no reader reads TOON yet" — green exit but no-op).
9. **b2 + b3 follow b1.**
10. **d last.** Retires legacy readers and migrator's delete pass goes live.

Each scope ships independently behind the X2/X14 seams + the (a) exports. The whole pitch is not
green until all 13 land.

A1.2 KR-risk clarifications the planner still owns:
- Merge `AI_WORKFLOW_ORCA_MULTI_AGENT` and `use-orca-orchestration` into one switch, or keep both?
  Today both must be true. Recommend: keep both keys this version, document the AND.
- `runtime/test-helpers.mts` audit covers all 9 `tempFixture` users in this pitch's reader-test set
  (K3-2 + K4-2 + K3-3 cited; macOS-realpath alias corrected in both directions).
- `engines.node` / `engines.bun` declared as reserved-but-validated slots in a1; pitch 3's range
  parser registers under `engines.orca` only.
- `orchestration.maxConcurrentWorkers` 1..16 default 3 (X18); `orchestration.maxRetriesPerTask` ≥0
  default 1; `orchestration.workers` reserved (X19). All declared in a1's validator table; pitch 4
  registers per-coordinator bounds under `coordinators.<vendor>` slot (X3 pass 3).
- `build/SKILL.md` 3-pitch hotspot (X23): c2.3 edits config-source paragraph + mirrors only;
  pitch 4 appends.
- TOON spec drift: pin the TOON spec version the subset follows and record it in the decision.
- Rename hygiene across 15+ files: prefer language-level rename via tooling, placeholder-restore,
  run file tests immediately after. The bundle has no `tsc`. (K8)
- `.project/evals/datasets/orca-vendor-orchestration.json` + `orca-eval-grader.mts`+test
  triple-touched with pitch 1 S5 (grader port, fixtures pinned) and pitch 4 (default
  `maxConcurrentWorkers: 3` + single-role). c1.1 rewires grader to `wxRename` (X1 pass 3), leaves
  fixture values byte-identical; pitch 4 owns shape. Record in pitch's ledger row so S5's exit
  (`maxConcurrentWorkers: 3`) stays true. (X9)
- Docs triple-merge with pitch 1 S8: `integrations/harnesses.md`, `workflow/overview.md`,
  `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md`. c2.3 edits only config-source
  lines, leaves pitch 1's merged prose intact. Exit: `node ai-framework/scripts/docs-links.mts
  ai-framework/workflow ai-framework/docs ai-framework/integrations ai-framework/templates` clean. (X6)
- Branch base: branch this pitch from the **2.23.0 release tag** (`upstream-project-drift` S9
  lands the bump), never from `feat/upstream-project-drift`. Branch-gate = `git status --porcelain`
  empty, checked against the 4 dirty files S9 must commit before tagging
  (`orca-preflight.test.mts`, `runtime/node.mts`, `runtime/runtime.test.mts`,
  `skill-defaults.test.mts`). (X1, X16)

**Pushed to no-go**:
- Role arrays and higher worker cap → `orca-role-pools` (schema here allows arrays; behavior there).
- Version-range semantics → `orca-engines-range`.
- Per-pool concurrency ceilings, multi-role coordinator behavior → `orca-role-pools`.
- Per-coordinator `defaultMaxConcurrentWorkers` bounds → `orca-role-pools` (validator slot in a1
  is pitch-4-widenable, X3 pass 3, X18).
- `notion` integration config → not in this repo today; drop the integration key here. Pitch 5
  reads `.project/notion-config.json` if/when a sync workflow ships.
- `orca.cliCommand` integration key → no reader in this repo today; drop until a consumer exists.
- Scope-(d) `ai-framework/integrations/orca-vendors.example.json` retirement — file is read by 8
  test files (verified); content edit goes to pitch 4. (X5 pass 3)
- Templates relocated INTO `ai-framework/templates/project/` would break
  `workflow-doctor.mts:442 checkProjectScaffold` (requireFile'd). Cite
  `.project/compaction/archives/orca-vendor-foundation.../files/plan.md:25`. (X6 pass 3)
- `flock` / advisory-lock contract — zero precedent in portable bundle; only macOS-only loopback
  TCP in `hooks/scripts/metrics-lock.mts`. Use O_EXCL lockfile primitive (`orca-apply.mts:264`).
  (X-A pass 3)
- Raw `node:fs` pin in migrator — breaks `memoryFs(files, links)` mutant proofs (deps injection).
  Use `deps.fs.writeFileSync(path, data, {flag:"wx"})`; add a regression gate that the Bun adapter
  never overrides `writeFileSync`. (X-B pass 3)
- `--validate-absent` flag for setup-validator — a missing artifact is evidence, not a contract.
  Gate pitch-5 checklist on `--json` `results[]` by name+status instead. (X8 pass 3)

## No-gos (this pitch)

- ✗ No YAML/JSON5/TOML alternative; TOON only.
- ✗ No secrets in the file; `.env` is never read.
- ✗ No auto-migration on read; migration runs only through the CLI (or `/setup` calling it).
- ✗ Standing workflow-tooling no-gos apply.

## Critique findings

Run 2026-10-16: knowledge-historian (K), skeptic (S), appetite-auditor (A), cross-pitch-projector (X).
Duplicates merged; auto-fired (big-batch). Eval-regression-projector skipped (not AI-prompt).

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1 | knowledge-historian | high | missed-knowledge | `issues/hardening-a-shared-reader-made-its-writer-destructive` — applies: reader reused + hardened (`runtime/env.mts` → new `config.mts`), then writer + backup/delete migrator added. Symlinked legacy treated as absent → writer follows link, clobbers target. Rule: refusal distinct from absent; `wx`+rename not direct write; test writer with hostile shape. Add to "Knowledge consulted" + rabbit holes. |
| K2 | knowledge-historian | high | missed-knowledge | `patterns/resolve-before-matching-a-protected-path-allowlist` — applies to bundle-sync exclusion for `ai-workflow.toon` AND migrator backup/delete paths. Two proven lexical-prefix bypasses: symlink at allowed path pointing into protected dir; APFS/NTFS case-folding; ancestor-dir symlink defeats leaf `lstat`. Resolve realpath, compare relative, lowercase; refuse `..` escapes. Add to "Knowledge consulted" + rabbit holes. |
| K3 | knowledge-historian | high | missed-knowledge | `issues/backtracking-regex-over-untrusted-text-is-quadratic` — applies: hand-rolled parser over project-controlled text + pinned TOON spec version. Lazy regex on `ai-workflow.toon` is recorded 4x-per-doubling class. Fix: linear line scanner with open/close state, bounded+anchored matching, size cap, timing test. Add to "Knowledge consulted" + rabbit holes. |
| K4 | knowledge-historian | high | missed-knowledge | `patterns/a-source-scanner-fails-closed-on-what-it-cannot-read` — applies: open `integrations` map + unknown-key reporting + `loadConfig` problems list is a lexical validator; "unknown key" must be report not drop. Keep findings collected before lexer error + an `unparsed` entry; unreadable/oversize/symlinked is failure not warning; verify `loadConfig` callers use the same lexer that enforces (the base grep in pitch "may push past 15 files" will miscount). Add to "Knowledge consulted" + rabbit holes. |
| K5 | knowledge-historian | high | missed-knowledge | `issues/installed-skill-wrappers-ship-as-orphans` — applies: bundle-sync exclusion only works on projects already running new script; this repo is bundle source AND live instance, so source-side `ai-workflow.toon` is instance data too. Rule: surface sync-can't-do-this as NEXT STEPS, mutation-checked test for exclusion, simulate old-version sync. Add to "Knowledge consulted" + rabbit holes. |
| K6 | knowledge-historian | high | missed-knowledge | `decisions/token-metrics-dimensions-design` — applies: `schemaVersion` migration + re-emit-canonical writer → v2 file read by v1 writer gets silently rewritten down. Recorded bug: unrecognised version snapshot silently overwritten; fix was refuse + keep rejected as `.rejected`. `modes.json` read must use same reader rules as snapshot read. Add to "Knowledge consulted" + rabbit holes. |
| K7 | knowledge-historian | medium | missed-pattern | `patterns/a-report-never-overwrites-a-file-it-did-not-write` — applies: migrator "refuses when differs, unless `--force`" + writer owns `ai-workflow.toon`. Replace only generator-marked files, name and skip unmarked. Bounds the `--force` rule. |
| K8 | knowledge-historian | medium | missed-pattern | `patterns/word-boundary-replacement-does-not-see-a-prefixed-property` — applies: rename across 15+ readers/fixtures/`.claude/skills/build/SKILL.md`; `\b` sweep also hits `process.env.AI_WORKFLOW_RUNNER`, `deps.env.*`, fixture strings. Prefer language-level rename, else placeholder-restore, run file tests immediately after. Repo has no `tsc`. |
| S1 | skeptic | high | missed-rabbit-hole | Migrator write + delete must realpath + `lstat` every ancestor; otherwise symlinked project root or any legacy path causes follow-through deletion of victim file (writer side, mirror of K1 + K2 + `sync-tools-refuse-symlinks-in-source-and-destination`). Pitch reuses reader guards; misses writer side + delete step. Add as rabbit hole. |
| S2 | skeptic | high | missed-rabbit-hole | Idempotent `--apply` must re-parse on-disk TOON through running parser before "already migrated"; `--force` must distinguish hand-edited-valid from stale-from-crashed-mid-write before overwriting (`an-idempotent-replay-path-returned-success-without-re-checking-the-gate` + `a-gate-must-not-trust-its-own-author`). Pitch's "differs unless `--force`" never names this. Add as rabbit hole. |
| S7 | skeptic | medium | missed-rabbit-hole | Doctor legacy-files check must exclude `.project/records/config-migration/` (migrator's own backup dir) or false-positives forever (`a-report-over-an-untrusted-tree-runs-only-bundle-code` + K4 scanner pattern). Add as rabbit hole. |
| A1 | appetite-auditor | high | scope-overrun | Projected 30–45 files / ~1.7k–2.3k LOC for big-batch (caps 15 / 1500). Files 2.0–3.0× cap; LOC 1.13–1.53× cap. Breakdown: 6 new (`config.mts` ~500, `config-migrate.mts` ~275, 2 new tests ~750, root TOON, example template); 10 production readers (~200, doctor check 60–100); 16 reader tests (~350, fixtures inline); 1 bundle-sync; 8 docs; 4 changelog/knowledge. Pitch already flags "may push past 15 files" — confirmed 2–3× not "slightly past". Recommend 3-pitch split: (1) parser+typed model+writer+example, zero reader touch, ~7/~1.1k; (2) migrator CLI+doctor check+bundle-sync exclusion, ~9/~600; (3) reader cutover + legacy warning + docs, ~26/~700 — split 3a (runtime/orca readers) and 3b (skills/hooks readers + docs). Cheap cut if appetite held: drop per-reader legacy warnings, doctor-only. |
| A2 | appetite-auditor | medium | inventory-gap | `ai-framework/scripts/runtime/entry.mts` reads config via `loadWorkflowEnv` — absent from pitch's "every current reader" list. |
| A3 | appetite-auditor | medium | inventory-gap | `ai-framework/scripts/orca-eval-grader.mts` **writes and deletes** `.project/orchestration.json` (lines 108, 347), not just reads; needs migrator-aware write path, not read swap. Pitch lists it as reader. |
| A4 | appetite-auditor | medium | inventory-gap | `ai_workflow_env.example.json` referenced by `SETUP.md:195`, `runtime/README.md:40`, `workflow-doctor.mts:510`, copied by `orca-preflight.test.mts:341` — file does not exist today. New example template swap will break the preflight fixture's root-copy assumption; relocation needed. |
| A5 | appetite-auditor | medium | inventory-gap | Docs are not 1–3 files. Grep names 6+: `SETUP.md`, `ai-framework/docs/workflow-doctor.md`, `ai-framework/integrations/skill-defaults.md`, `ai-framework/integrations/orca-vendors.md`, `ai-framework/scripts/runtime/README.md`, `.claude/skills/build/SKILL.md` (+ `.cursor`/`.agents` mirrors). |
| X1 | cross-pitch-projector | high | projected-conflict | this pitch + `upstream-project-drift` pure overlap on ~29 shared base files: `orca-preflight/test`, `orca-launch-gate/test`, `orca-start/test`, `orca-run/test`, `orca-dispatch/test`, `orca-reconcile/test`, `orca-eval-grader/test`, `hooks/scripts/orca-start{,-codex}-hook.mts`+tests, `hooks/scripts/token-consumption.test.mts`, `workflow-doctor.test.mts`, `skill-defaults.test.mts`, `integrations/orca-vendors.md`, `integrations/harnesses.md`, `workflow/overview.md`, `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md`, `.claude/skills/build/SKILL.md`+`.cursor/skills/build/SKILL.md`. Order resolves it, BUT pitch 1 branch not released — hill S9 `uphill 0%`, S10 checkpoint shows tree uncommitted. Recommend: branch this pitch from 2.23.0 release tag after S9 lands; never from `feat/upstream-project-drift`. Never build both in one tree. |
| X2 | cross-pitch-projector | high | projected-adjacent | Seam collapse. This pitch rewires 5 roots but drags 13+ call sites only because reader signatures move. Freeze: `orca-policy.readPolicy(root,deps) → PolicyResult\|Refusal` + `report()`; `runtime/select.orcaMultiAgentEnabled`; `skill-defaults.loadModes(root,deps) → ModesState\|null`; `env.loadWorkflowEnv`. Map TOON onto today's `Policy`/`ModesState`/`{RUNNER_VAR}` shapes inside the roots. Turns X1's 29-file overlap into ~8 (roots+tests+docs). Removes rewrite cost for pitches 3+4. Acceptance: `git diff --name-only` lists no `orca-*.mts` other than `orca-policy.mts`. |
| X3 | cross-pitch-projector | high | projected-conflict | this pitch + `orca-role-pools` both edit `ai-framework/scripts/orca-policy.mts`. This pitch relocates source; pitch 4 changes shape (`Coordinator.roles` → `Record<string,string\|string[]>`, drop `workers.length > 2` line 33, `maxConcurrentWorkers` 3→16 line 45). Recommend: this pitch owns location + key allowlist only, leaves `Policy`/`Coordinator` types verbatim (already no-go); pitch 4 widens type. Skipping X2 merges both edits in one conflict and pitch 4 re-tests the whole config layer. |
| X4 | cross-pitch-projector | high | projected-conflict | this pitch + `orca-role-pools` both edit `ai-framework/templates/ai-workflow.example.toon` (orchestration section) and orchestration validator inside `config.mts`. Sketch already shows `implementation[1]: opencode` inline arrays — schema lands here, behavior pitch 4. Recommend: v3.0.0 parser accepts `roles.<role>` as string OR array, validates nothing about pool semantics; pitch 4 ships behavior without `schemaVersion` bump. If this pitch rejects arrays at parse, pitch 4 cuts `schemaVersion: 1→2` migration + re-touches this file + migrator fixtures. |
| X5 | cross-pitch-projector | high | projected-conflict | this pitch + `orca-engines-range` + `upstream-project-drift` (S3, D1) all edit `ai-framework/scripts/orca-preflight.mts`; first two also `workflow-doctor.mts` + `integrations/orca-vendors.md`. Triple hotspot. Recommend: `engines.orca` stays opaque string in `config.mts` (pitch says so); pitch 3 changes only `isSupportedVersion` body + doctor config-check branch; doctor registers range validator through this pitch's open `integrations`-style validator map so pitch 3 adds file, not edits doctor's core check. |
| X6 | cross-pitch-projector | medium | projected-adjacent | Docs triple-merge. `integrations/harnesses.md`, `workflow/overview.md`, `docs/{vendors,extending,setup,design-notes,workflow-doctor}.md` all in pitch 1 S8's 3-way hand-merge AND in this pitch's doc set. Recommend: this pitch edits only config-source lines, leaves pitch 1's merged prose intact. Exit criterion: `node ai-framework/scripts/docs-links.mts ai-framework/workflow ai-framework/docs ai-framework/integrations ai-framework/templates` clean (same gate S8 uses). |
| X7 | cross-pitch-projector | medium | projected-adjacent | `ai-framework/scripts/setup-validator.mts` in pitch 1 S7 AND this pitch's implied set (root `ai-workflow.toon` + new template must validate, legacy-file check). Also `runtime/{node,bun,types}.mts` share `runtime/` module with new `config.mts` (pitch 1 S2, adjacent-only). Recommend: add `ai-workflow.toon` scaffold/validity check to `setup-validator.mts` in separate scope from reader rewiring; confirm S2's exit grep (`grep -n 'process.env\|ai_workflow_env' runtime/{node,bun}.mts`) still holds after this pitch. |
| X8 | cross-pitch-projector | medium | projected-conflict | `ai-framework/hooks/scripts/token-consumption.test.mts` in pitch 1 S6 (done) AND this pitch's set. `hooks/scripts/token-consumption.mts` deliberately decouples + reads `.project/skills/modes.json` by path (comment line 204), bypassing `loadModes` on purpose. Recommend: decide explicitly — either couple to `loadConfig` (behavior change, new test churn in file pitch 1 just hardened) or keep legacy `modes.json` read for one-minor-version warning window. Silently leaving it produces mode value that disagrees with `skill-defaults` resolution. |
| X9 | cross-pitch-projector | medium | projected-conflict | `.project/evals/datasets/orca-vendor-orchestration.json` + `orca-eval-grader.mts`+test touched by pitch 1 S5 (grader port, fixtures pinned), this pitch (policy source moves to TOON, grader line 108/347 writes `.project/orchestration.json`), and pitch 4 (`maxConcurrentWorkers: 3` + single-role fixtures). Recommend: this pitch changes only *where* grader writes policy, leaves fixture values byte-identical; pitch 4 owns shape. Record in pitch's ledger row so S5's exit criterion (`maxConcurrentWorkers: 3`) stays true. |
| X10 | cross-pitch-projector | medium | scope-overrun | this pitch projects ~41 files (17 src, 15 test, 8 doc, 3 example/gitignore) vs 15-file big-batch; own risk note predicts "may push past 15". Pitch 1 needed 10 scopes at similar count. Recommend: pre-split in /plan — (a) TOON parser + `config.mts` + migrator + tests; (b) reader rewiring behind X2 seams; (c) doctor + docs + `.gitignore` + example swaps; (d) legacy retirement last (delete `env.mts` readers, `orca-vendors.example.json`, `ai_workflow_env.example.json`) after one minor. Scope (d) deferrable without blocking (b). |
| X11 | cross-pitch-projector | acknowledged | sequencing | `workflow-v3-rollout` projects no base-source edits. Consumes `config-migrate`, creates `ai-workflow.toon` in LAH/RN/climbing roots. Disjoint on files. Standing read: `bundle-sync.mts` must carry `ai-workflow.toon` as instance data (root file, not in `SYNCED_DIRS`, never copied — prove with `bundle-sync.test.mts` case alongside existing `.project/skills/modes.json` survival test line 252). No `.gitignore` exists under `templates/project/`, so ignore line for new root file is manual per project; pitch 5's per-project checklist must name it. |

### Critical takeaways (high-severity minimum)

Pass-3 unifies pass-1, pass-2, and pass-3 into a single ordered list tied to the **a → c → b → d**
mandatory decomposition. Old numbered points from passes 1-2 are renumbered under their scope.

**Order, scope, and shape:**
1. **Branch source** from 2.23.0 tag after pitch 1 S9 lands. Branch-gate = `git status --porcelain`
   empty against the 4 dirty files S9 must commit (`orca-preflight.test.mts`, `runtime/node.mts`,
   `runtime/runtime.test.mts`, `skill-defaults.test.mts`). (X1, X16)
2. **Pitch is one pitch with mandatory 13-scope decomposition** (A1, A2 pass 3): total 67 files /
   ~7,616 LOC (4.5× file cap, 5.1× LOC cap) — epic at big-batch appetite. Big-batch framing is
   wrong by shape. Order = **a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 →
   b2 → b3 → d**. Each scope ≤15 files / ≤1500 LOC. Live drop is impossible because (c) ships
   before (b) deletes.

**a-scope (primitives land first; without (a), nothing else functions):**
3. **`config.mts` exports `wxRename`** (K1, K2, S1) — primitive ports from
   `orca-apply.mts:264` (`deps.fs.writeFileSync(p, d, {flag:"wx"})` + `rename`).
4. **`config.mts` exports `inspectPath` + `readBoundedFile` PORTED VERBATIM** from
   `orca-policy.mts:62-99` (lstat-walk every component, `O_NOFOLLOW|O_NONBLOCK`, dev/ino compare
   before AND re-`inspectPath` after read). X-A pass 3 — no re-derivation, no precedent for
   `flock` in the portable bundle (`metrics-lock.mts` is macOS-only).
5. **`config.mts` exports `oexLock`** O_EXCL lockfile via
   `deps.fs.writeFileSync(lock, "", {flag:"wx"})`. EEXIST → fixed-text operator-recovery
   message. ~45 LOC, identical on Node/Bun. Migrator owns the lock (not `bundle-sync`, which is
   verified NOT a config writer per `SYNCED_DIRS:59-77` + `FLAGGED_FILES:83`).
6. **`config.mts` exports `errorCodes`** — every guard's fixed-text error code. Mutant harness
   asserts on `errorCodes.foo`, not exit code. **Required for K1 pass 3 mutant harness.**
7. **`config.mts` exports `registerIntegrationValidator` / `registerEngineValidator` /
   `registerCoordinatorValidator`** named slots. Unregistered slot = doctor `fail`.
   `validateCoordinator` (currently module-private in `orca-policy.mts:32`) registered as
   first entry. Pitch 3's range parser registers under `engines.orca`; pitch 4's per-coordinator
   bounds register under `coordinators.<vendor>`. (X3 + X4 pass 3)
8. **Mutant harness covers 14 discrete guards** (K1 pass 3 + A7) — each gets passing baseline
   in identical fixture layout + assertion-message inspection + the `errorCodes` contract.
   Per-guard harness ~70 LOC + ~25 LOC fixture parity + ~60 LOC assertion-message helper
   extension. ~980 LOC total for a2's parser-guard mutants + b3's writer/path mutants.
9. **`--force` mechanism = dual-hash tracking** (K4 pass 3): record canonical-bytes-written
   + parsed-model-as-read digests; verify against written hash only; deterministic transform
   required; transform failure aborts before any write (`.rejected` never-overwrite).

**c-scope (additive `loadConfig` + legacy fallback, no file deletion):**
10. **Reader seam freeze names BOTH `roles` shapes** (X2 pass 3): `readPolicy` signature
    frozen; `report().roles` frozen at `Record<string,string>` (seam value `orca-start.mts:157`
    consumes); `PolicyResult.policy.coordinators.<v>.roles` pitch-4-widenable (the internal
    schema — otherwise pitch 4 has no legal edit site).
11. **Reader signatures must freeze EXACTLY** to today's shape: `loadWorkflowEnv` is
    `(fs,path,root,env) → Record`, NOT `(root,deps) → WorkflowEnv|null`. `runtime/entry.mts` +
    `runtime/select.mts` move regardless. /plan names each seam's signature then the diff.
12. **Diff criterion restated** (X12): `git diff --name-only` lists no `orca-*.mts` EXCEPT
    (`orca-policy.mts` + 7 fixture tests + `orca-preflight.test.mts:338-341` filter +
    `orca-launch-gate.mts:13` doc).
13. **Parser accepts string-or-array for `roles.*`**, rejects within-role duplicates (S3),
    prototype-pollution (S4); `orchestration.workers` pre-declared reserved (X19);
    `maxConcurrentWorkers` 1..16 default 3 + `maxRetriesPerTask` ≥0 default 1 (X18). Pitch 4
    ships behavior without `schemaVersion` bump. (X4, X3 pass 3)
14. **`orca-launch-gate.mts` 4-pitch hotspot** (X14): pitch 1 S3 + pitch 3 (range) + pitch 4
    (concurrency) + pitch 2 (frozen seam). Add launch-gate to X5's remedy; freeze its
    version-check seam like `readPolicy`.
15. **`runtime/test-helpers.mts` extended** with one TOON fixture writer (X12 pass 3), built on
    `memoryFs(files, links)` link map (K1 pass 3 + K3-2). Inherits by 9 call sites; `tempFixture`
    gains no new duty.
16. **`tempFixture` alias-test audit** (K3-2 + K4-2 + K3-3) covers all 9 of this pitch's reader
    tests; alias tests must pass `{ resolve: false }` AND build expected refusal paths from the
    same form the code returns.
17. **`orca-eval-grader.mts:108` + `:347` rewired to `wxRename` + dev/ino re-check** (X1 pass 3);
    grader in (c1.1), writer helper ships first via (a1).

**b-scope (migrator CLI writer + dual-hash + 3-branch force; DELETE pass is (d) only):**
18. **REUSE `runtime/migrate.mts:15 regular()` + `:7 EntryMigration`** — do not invent a second
    vocabulary. (X11 pass 3)
19. **Subprocess revalidation** (K2 pass 3): migrator `--apply` re-parses via fresh Node/Bun
    subprocess, NOT the running `require` cache. Pitch 5's sync → migrate → verify in one run
    uses the same pattern (`bundle-sync` + `skill-sync reconcile`).
20. **`engines.orca` ships exact `"1.4.224"`** (X13) until pitch 3 lands. Pitch 3 registers
    range parser via `registerEngineValidator("engines.orca", rangeFn)`. Unregistered slot =
    doctor `fail`. No released 3.0.0 advertises range syntax that silently does nothing.
21. **`Bun.write` vs `wx`+rename** (X-B pass 3): `runtime/bun.mts:23-36` overrides only async
    read/write/exists; sync `writeFileSync` comes from `node:fs`. `wx`+rename is runner-
    identical. Drift surface is `--dry-run` async reads only. Do NOT pin raw `node:fs` (breaks
    `memoryFs(files, links)` proofs). Add one ~15 LOC regression gate asserting Bun adapter
    never overrides `writeFileSync`.
22. **`coordinators.*` validator slot** (X3 pass 3): per-coordinator `defaultMaxConcurrentWorkers`
    bounds live here, not in `config.mts` body and not in `orca-policy.mts` body. Pitch 4
    registers without re-opening either.

**d-scope (legacy retirement, last):**
23. **`env.mts` legacy reader retires** + the four legacy config paths are unlinked under
    O_EXCL lock. **`ai_workflow_env.example.json`** relocated to `ai-framework/templates/`
    (X6 + X20), NOT `templates/project/` (would break `workflow-doctor.mts:442 checkProjectScaffold`).
24. **`ai-framework/integrations/orca-vendors.example.json`** kept in place (X5 pass 3) — 8 test
    files read it by relative path (verified). Retire not possible. Content edit goes to
    pitch 4.

**Persistent across scopes:**
25. **`notion` + `orca.cliCommand` integration keys dropped** (X22) — no consumers in this repo.
26. **`SETUP.md` + `README.md` added to `FLAGGED_FILES`** (X21) — preferred over pitch-5
    per-project reconciliation.
27. **`setup-validator.mts` severity contract** (X24 + X8 pass 3): name the check `Workflow
    config`; absent = `info` ("not yet migrated"), invalid = `fail`. Pitch 5's
    post-`--dry-run` validator run gates on `--json` `results[]` BY `name` + `status`, NEVER on
    exit code. Do NOT add a `--validate-absent` flag.
28. **`README.md:95` + `integrations/orca-vendors.md:5` rewritten** (X7 pass 3) — both tell
    operators to copy a file (b) deletes. Rewrite in c2.2 (NOT deferred to d). First sync
    delivers `templates/ai_workflow_env.example.json` + `templates/ai-workflow.example.toon`
    — record in pitch-5 ledger row.
29. **`build/SKILL.md` 3-pitch hotspot** (X23): c2.3 edits config-source paragraph + mirrors
    only; pitch 4 appends.
30. **Mirror-parity refresh** (K5 pass 2 + A10): every canonical edit runs
    `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply`. Exit:
    `skill-defaults.test.mts:274` + `setup-validator.mts:154` both clean. `.agents/skills/build/SKILL.md`
    is a 3-line stub — no edit there.
31. **`.gitignore` edit** (X15): pitch 2 owns the root `.gitignore` edit (add
    `ai-workflow.toon`, drop stale legacy lines 7 + 12, fix the comment). Migrator appends
    to a target `.gitignore` on `--apply`.
32. **Bundle-sync exclusion** (K5 pass 1): mutation-checked test + simulated old-version sync.
    `bundle-sync` does NOT touch config files.
33. **Standup / TOON spec drift**: pin the TOON spec version the subset follows and record it
    in the decision record.
34. **Rename hygiene** (K8): prefer language-level rename via tooling; placeholder-restore;
    run file tests immediately after. Bundle has no `tsc`.

### Dependency order confirmed

`upstream-project-drift` (1) → `unified-toon-config` (2) → `orca-engines-range` (3) → `orca-role-pools` (4) → `workflow-v3-rollout` (5).
Pitch 2 (this) branches from 2.23.0 release tag, NOT from `feat/upstream-project-drift`.

### Disposition (advisory, not gating)

Review: **Address / Acknowledge / Override** per finding (or per high-severity item as a whole).
- Address = loop in /shape and revise pitch (split, add rabbit hole, cite knowledge).
- Acknowledge = accept finding, bet anyway, reason logged in Bet decision.
- Override = explicitly reject, reason logged.

#### Closure (Re-shape loop, 2026-10-16)

- All knowledge entries cited (K1–K8) added to "Knowledge consulted".
- All high-severity rabbit holes (S1, S2, S7, K1, K2, K3, K5, K6) resolved here and reflected in the
  Solution sketch + Rabbit holes "Resolved here" section.
- Cross-pitch sequencing (X1–X5): branch point fixed; reader seams frozen (X2); `roles.*` parser
  acceptance (X4); opaque `engines.orca` (X5); branch from 2.23.0 tag, not `feat/upstream-project-drift`
  (X1). X6–X10 risks pushed to /plan.
- A1 (scope-overrun): **Override** — bet as one big-batch. Reason + mandatory /plan split rule
  recorded in Bet decision "Critique disposition".
- Inventory gaps (A2–A5): `runtime/entry.mts` added to readers; `orca-eval-grader.mts` flagged as
  writer+deletor; `ai_workflow_env.example.json` swap noted; docs count expanded.
- Medium items (K7, K8, S7, X6–X10) pushed to /plan as risks or noted as defaults.

**Re-shape loop 1 closed.**

#### Closure (Re-shape loop 2, 2026-10-16)

Pass-2 critique surfaced 32 more findings (6 K, 3 S, 10 A, 13 X). All high + medium applied in this
loop; A10 (mirror parity over-stated by 1) acknowledged.

- **Knowledge consulted**: 6 new entries cited (K1–K6 pass 2): prove-a-guard-with-mutant for every
  new guard; `a-missing-tracked-file-is-not-an-undeleted-deletion` (the A4/X20 precedent by exact
  file); `keep-the-fakes-guarantee-the-thing-they-replace` (the `memoryFs` link map the writer
  mutant tests need); `a-temp-helper-that-realpaths-silently-voids-an-alias-guard` (the
  `tempFixture` `resolve: false` requirement); mirror-parity refresh recipe
  (`editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check`); doctor's existing
  `Runtime boundary` check shape (`runtime-boundary-validator-design`).
- **Rabbit holes Resolved here**: 11 new (S3 within-role duplicate rejection; S4 prototype-pollution
  guard; S5 three-branch `--force`; `.gitignore` line; mirror-parity refresh; doctor's
  `Runtime boundary` re-use; `engines` reserved-but-validated; `maxConcurrentWorkers` 1..16 +
  `maxRetriesPerTask` ≥0; `workers` pre-declared; `orca-launch-gate` version seam frozen; example
  exact `1.4.224` until pitch 3; diff criterion restated; branch-gate).
- **Solution sketch**: example TOON corrected (exact `1.4.224`, `maxConcurrentWorkers` 1..16, `workers`
  pre-declared, `integrations: {}` empty, dropped `notion` + `orca.cliCommand`). Connection chain
  extended with `orca-launch-gate` version seam.
- **Breadboard / Places**: README.md root, root .gitignore, `runtime/test-helpers.mts` (TOON fixture
  writer), `ai-framework/integrations/orca-vendors.example.json` (relocate or retire), 7 indirect
  consumers listed by name.
- **`/plan` risks**: 8 added (split-correction, a/b seam, A4/X20 example relocation, etc.).

**Re-shape loop 2 closed.**

#### Disposition — pass-2 table (overlay on pass-1, same row IDs reused for the IDs that apply)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1-2 | knowledge-historian | high | missed-knowledge | `patterns/prove-a-guard-test-with-an-in-memory-mutant` — every NEW guard this pitch adds must have a mutant proof: writer `wx`+`rename`, ancestor `lstat`/realpath, symlinked-legacy-is-not-absent, fail-closed lexer, `--force` hand-edited-vs-stale, `.rejected` retain. Otherwise the guards can be inert and green. |
| K2-2 | knowledge-historian | high | missed-knowledge | `issues/a-missing-tracked-file-is-not-an-undeleted-deletion` — applies by exact file. This entry IS the `ai_workflow_env.example.json` precedent; same 3 files (doctor check + fixture + template), same shape. |
| K3-2 | knowledge-historian | high | missed-pattern | `patterns/keep-the-fakes-guarantee-the-thing-they-replace` — `memoryFs(files, links)`; Set of link paths silently resurrects the bug. ENOENT vs ENOTDIR on backup/delete walks. |
| K4-2 | knowledge-historian | medium | missed-pattern | `issues/a-temp-helper-that-realpaths-silently-voids-an-alias-guard` — `tempFixture` defaults `resolve: false` analogue, must pass it explicitly for alias-shape tests; build expected refusal paths from the same form the code returns. |
| K5-2 | knowledge-historian | medium | missed-knowledge | `issues/editing-a-canonical-file-alone-breaks-the-byte-identity-mirror-check` — Cursor mirrors are byte copies, self-heal only if refreshed by `node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply`. Exit: `skill-defaults.test.mts:274` + `setup-validator.mts:154` both clean. |
| K6-2 | knowledge-historian | medium | missed-decision | `decisions/runtime-boundary-validator-design` — doctor's existing `Runtime boundary` check IS the precedent shape for `integrations` validators + tests: one library fn, doctor's check list calls it, tests call it, severity ladder. |
| S3 | skeptic | high | missed-rabbit-hole | `orca-start.mts:157`'s `Object.values(roles).filter(typeof===string)` drops array-valued roles → `no-workers` every dispatch. Parser must reject duplicate within one role's value list (parse-shape, mirroring `validatePolicy`'s `new Set(workers).size !== workers.length` at `orca-policy.mts:36`) AND reader hands `orca-start.mts` a flattened, distinct list. Otherwise X4's `roles.*` array acceptance silently kills every dispatch. |
| S4 | skeptic | high | missed-rabbit-hole | Parser must replicate `orca-policy.mts:27`'s prototype-pollution guard + the `__proto__`/`constructor`/`prototype` rejection test (`orca-policy.test.mts:149-153`). JSON path's coverage doesn't transfer; building the typed model directly from TOON tokens is a fresh surface. |
| S5 | skeptic | medium | missed-rabbit-hole | `--force` covers 3 branches (refines S2): absent→write; parseable+valid→refuse unless `--force` distinguishes hand-edited from stale; present+unparseable→refuse + `.rejected` move, never silently overwrite. Symlink at this step invalidates S7 carve-out. |
| A1-2 | appetite-auditor | high | split-rule-fit | Override split a/b/c INFEASIBLE. (a) ~5/~1.6k LOC = 1.4× big-batch LOC cap; c2 = 26 files = 1.7× cap. /plan inverts to **(c1)+(c2) → (b) → (a)**: additive `loadConfig` first (legacy fallback retained), then migrator deletes, then parser takes over validation. `workflow-doctor.mts` shared between (b) and (c2) → move to (c2). Split by risk shape not directory: c2.1 doctor-cluster / c2.2 docs-cluster / c2.3 hooks. |
| A2-2 | appetite-auditor | high | split-order-hazard | Migrator deletes legacy before readers cut over → live drop (`loadWorkflowEnv`→`{...env}` runner=node; `readPolicy`→`policy-missing`; `loadModes`→null). "Each scope ships green" claim is false. /plan MUST invert: c1/c2 first, then b, then a. |
| A3-2 | appetite-auditor | high | split-shared-file | `workflow-doctor.mts` + `.test.mts` edited in (b) [legacy-files] AND (c2) [reader cutover]; not independently shippable. Same for `setup-validator.mts` (only shells `workflow-doctor --json` line 159 — its new check consumes doctor output shape c2 changes). Move setup-validator into c2.1; defer (b)'s legacy-files check to doctor-on-next-run. |
| A4-2 | appetite-auditor | medium | split-boundary | a/b seam undefined. Migration table+writer+`wx`+rename+realpath walker live in (a); migration-table runner+`.rejected` flow live in (b). `orca-eval-grader.mts` write path spans (a) writer + (c1) reader. Name the owner explicitly. |
| A5-2 | appetite-auditor | medium | inventory-gap | Reader-count method wrong. Seam grep returns 19 files (15 prod, 4 test); the 7 indirect consumers (`orca-dispatch`, `orca-preflight`, `orca-reconcile`, `orca-run`, `orca-start`, both orca-start hooks) not in pitch's count. `loadWorkflowEnv` frozen shape `(root,deps)` ≠ today's `(fs,path,root,env)` — `runtime/entry.mts` + `runtime/select.mts` move regardless. /plan names exact signatures then exact file diff. |
| A6-2 | appetite-auditor | medium | inventory-gap | `README.md` root has 4 legacy-config refs (lines 65–68 + 94–95) — absent from Places. `ai-framework/integrations/orca-vendors.example.json` (additional example template) has no home in a/b/c; either relocate to `templates/` or retire in scope (d), dropped by override. |
| A7-2 | appetite-auditor | medium | loc-underestimate | ~2.3k understated. `config.mts` ~900–1.1k shipped (lexer, model, per-section validators, `integrations` map, canonical writer, `schemaVersion` table, `wx`+rename, realpath walker, exclusion helper, `loadConfig`/`inspectConfig`, shims) vs assumed 500. `config-migrate.mts` ~400–500 vs 275. Two new tests ~1.1–1.4k vs 750. Reader tests ~600 vs 350. Revised ~3.9k = **2.6× big-batch LOC cap**. |
| A8-2 | appetite-auditor | medium | scope-overhang | Root `.gitignore` lines 7 + 12 name the legacy files; `ai-workflow.toon` needs its own line here AND per consuming project. Not in Places. |
| A9-2 | appetite-auditor | medium | split-rule-fit | 3a/3b (directory-based) leaves the doctor+setup-validator cluster + docs cluster under-decomposed. Split by risk shape: readers / doctor-cluster / docs-cluster. |
| A10 | appetite-auditor | acknowledged | mirror-parity | Mirror count over-stated by 1. `.agents/skills/build/SKILL.md` is a 3-line stub, zero config refs → no edit. Only `.claude` + `.cursor` (byte-identical) carry the `ai_workflow_env.json`/`orchestration.json` text. AGENTS.md + CLAUDE.md both need same 2 lines, must stay byte-equal. |
| X12 | cross-pitch-projector | high | projected-conflict | X2's "no `orca-*.mts` other than `orca-policy.mts`" glob includes `.test.mts`. 7 orca test files carry `.project/orchestration.json` fixtures the migrator deletes + `orca-preflight.test.mts:338-341` filter + `orca-launch-gate.mts:13` doc — pitch's criterion forbids its own required edits. Restate criterion AND land one TOON fixture writer in `runtime/test-helpers.mts` so 9 sites change once. |
| X13 | cross-pitch-projector | high | projected-conflict | `engines.orca` validation gap window, ownerless. Between 3.0.0 and pitch 3 nothing parses `engines.orca`, while pitch 1 S3 already landed exact-floor `isSupportedVersion` at 4 sites. So a released 3.0.0 advertises range syntax that silently does nothing. K4 says unvalidated = fail closed, contradicting "opaque until pitch 3". Either example ships exact `"1.4.224"` (X13 now: yes) OR pitch 2 registers an exact-version validator in its own map. |
| X14 | cross-pitch-projector | high | projected-conflict | `orca-launch-gate.mts` + `.test.mts` is a 4-pitch hotspot X5 never names: pitch 1 S3 (1 edit), pitch 3 (range edit), pitch 4 (concurrency edit), pitch 2 (frozen seam). X5 covers only `orca-preflight.mts` + `workflow-doctor.mts` + `orca-vendors.md`. Add launch-gate to X5's remedy, freeze its version-check seam the way `readPolicy` is frozen. |
| X15 | cross-pitch-projector | high | projected-conflict | `.gitignore` gap in THIS repo (publish source). `git check-ignore ai-workflow.toon` returns NOT IGNORED. `.project/orchestration.json` exists on disk here untracked → migrator writes a root `ai-workflow.toon` committable + publishable to PUBLIC_REPOSITORY — exact K5 orphan shape. X11's pitch-5 assignment never covers this repo's own ignore line. |
| X16 | cross-pitch-projector | high | sequencing-blocked | X1 branch gate un-executable, dirty set wider than X10/X11/X12 from pitch 1. `git tag` has no `2.23.0` (2.0.1/2.1.0/2.22.1/2.8.6/2.9.1/v2.3.0 only). `VERSION`=2.23.0 + `CHANGELOG.md` dirty; S9 `uphill 0%`. Dirty code: `orca-preflight.test.mts`, `runtime/node.mts`, `runtime/runtime.test.mts`, `skill-defaults.test.mts` — 2 are in this pitch's 14 reader tests, `node.mts` is the module `config.mts` lands beside. Branching before S9 silently drops 4 edits. |
| X17 | cross-pitch-projector | medium | projected-adjacent | Two validator registries, second unnamed. Sketch puts `engines.orca` under top-level `engines`; X5's remedy routes pitch 3 through `integrations` map; pitch 3's Connections read `loadConfig().engines.orca`. So `config.mts` needs a second registry for `engines`. Pitch 2 declares `engines` reserved-but-validated with a named slot per key now (X13+X17 combined). |
| X18 | cross-pitch-projector | medium | projected-adjacent | `maxConcurrentWorkers` / `maxRetriesPerTask` bound ownership unassigned. Sketch `3`/`1`; pitch 4 raises ceiling to 16/bounds retries. If pitch 2 validates 1..3, pitch 4 edits `config.mts` (reopens X4). If 1..16, pitch 4 ships behavior with zero `config.mts` edit. X4's remedy covers `roles.*` arrays only. Default 3 / 1, ceiling 16 / unstated, decided in this pitch. |
| X19 | cross-pitch-projector | medium | projected-conflict | Pitch 4's optional `workers` key undeclared in pitch 2's schema. New key post-3.0.0 with no `schemaVersion` bump = K6 downgrade hazard; canonical re-emit writer silently DROPS `workers`. Pre-declare `workers` here (accepted, string array, reserved) so pitch 4 ships behavior without bump. Add a downgrade test. |
| X20 | cross-pitch-projector | medium | inventory-error | A4 (pass 1) premise factually wrong. `ai_workflow_env.example.json` EXISTS at bundle root, 76 bytes, tracked. Real work: relocate to `templates/` AS WELL AS the new TOON example, DELETE root copy, update 4 referrers. Cross-pitch: pitch 5's sync now delivers a file projects never had; `orca-preflight.test.mts` is one of pitch 1's S9 dirty files (X16). |
| X21 | cross-pitch-projector | medium | projected-adjacent | Pitch 5 sync gap for root docs. Pitch 2 rewrites `SETUP.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`. bundle-sync syncs only `SYNCED_DIRS`; `FLAGGED_FILES`=`AGENTS.md`, `CLAUDE.md`, `.opencode/opencode.json`, `.codex/config.toml` (flag-only). `SETUP.md`+`README.md` neither → per-project copies go stale silently. Either pitch 2 adds to `FLAGGED_FILES` (preferred) or pitch 5 reconciles per project. |
| X22 | cross-pitch-projector | medium | projected-adjacent | Fifth config source unowned. `notion-config.json` read by `/sync` SKILL.md only (no script consumers). `orca.cliCommand` has zero readers. Under K4 both become permanent "reported, not used" doctor findings on every migrated project. Drop both keys until a consumer exists. |
| X23 | cross-pitch-projector | medium | projected-conflict | `build/SKILL.md` is a 3-pitch hotspot X4 never covers. Pitch 2 edits config-source paragraph + `.cursor`/`.agents` mirrors; pitch 4 lists the same file + mirrors; pitch 1's X8 says keep out of skill files. Two different edits × mirror parity × 3 vendors × 3 pitches. X4 covers `config.mts` + example TOON only. Record mirror set in pitch-2 ledger row; pitch 4 appends after. |
| X24 | cross-pitch-projector | medium | sequencing | `setup-validator.mts` severity vs pitch 5's per-project order. That file has zero config checks today — pitch 2 adds a new check class to a file pitch 1 S7 edits. Pitch 5 order = sync → `config-migrate --apply` → verify. Absent TOON = `info` ("not migrated yet"), invalid = `fail`. Hard-fail on missing trips every project mid-rollout. Record as explicit pitch-2/pitch-5 contract.

#### Closure (Re-shape loop 3, 2026-10-16)

Pass-3 critique surfaced 27 more findings (4 K, 2 S, 10 A, 12 X). All high + medium applied in this
loop; A10 acknowledged. Pass-2 inversion is dead, scope is epic at big-batch appetite, real guards
live in `orca-policy.mts:62-99` not the pitch's sketches, lock primitive is O_EXCL not flock,
Bun.write ≠ `wx`+rename only on async path.

- **Knowledge consulted**: 6 new entries cited (K1–K4 pass 3 plus 2 runner-divergence entries):
  `guard-tests-can-fail-for-the-wrong-reason` (the mutant scratch-copy defect class with the
  missing fixture layout + the prototype-mock defect class); `subprocess-revalidation-against-on-disk-code`
  (cached `require` validates pre-write code); `macos-tmpdir-realpath-alias-breaks-path-assertions`
  (the OTHER direction of K4-2 — `tempFixture` defaults realpath which breaks tests that build
  expected paths from raw `os.tmpdir()`); `dual-hash-tracking-for-transformed-content`
  (the `--force` mechanism S2/S5 lacked); `issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers`
  (the c1+c2 reader+writer race); `coverage-instrumentation-changes-exact-child-environments` +
  `orca-workers-differ-from-the-coordinator-environment` (the runner-divergence entries that
  dissolve RH-B's `Bun.write` claim).
- **Solution sketch / Affordances**: rewritten. `config.mts` exports the 4 primitives + 4 named-
  slot registrars + `errorCodes` enum. `config-migrate.mts` REUSES `runtime/migrate.mts:7
  EntryMigration` shape + `:15 regular()` walk. Subprocess revalidation. 14-guard mutant harness
  contract via `errorCodes`.
- **Rabbit holes Resolved here**: rewritten for pass-3 (order matters — (a) first, (c) next,
  (b) after, (d) last). Real guards live in `orca-policy.mts:62-99`. Lock primitive = O_EXCL
  (`orca-apply.mts:264`). Reader seam freeze names BOTH `roles` shapes. `engines.orca` exact
  `1.4.224` until pitch 3; registration via named slot.
- **Connections**: rewritten. Mandatory order **a → c → b → d**. Re-explains why (a) must
  come first (c1's `loadConfig` is (a)'s export; c1's grader write needs (a)'s writer; b's
  migrator needs (a)'s writer API).
- **Pushed to /plan as risk**: replaced with the 13-scope decomposition table. Hard rule: no
  scope deletes a legacy file. Each scope ≤15/1500. The "big-batch" framing is now wrong by
  shape — pitch is one pitch with mandatory 13-scope decomposition owned by /plan.
- **Critical takeaways**: renumbered 1–34, tied to the new mandatory order.

**Re-shape loop 3 closed.**

#### Disposition — pass-3 table (new IDs, do not collide with pass-1 / pass-2)

| ID | Perspective | Severity | Type | Suggestion |
|----|-------------|----------|------|------------|
| K1-3 | knowledge-historian | high | missed-knowledge | `issues/guard-tests-can-fail-for-the-wrong-reason` — applies to every mutant-proof this pitch adds. Mutation scratch copy can omit its relative example fixture so unrelated reads fail and results are discarded; a `Stats` mock spread to a plain object loses prototype methods so refusal fires for a malformed mock, not the inode mismatch. Rules: passing baseline in same fixture layout before counting a mutant; inspect the failing assertion, not the exit code; preserve native-object methods when mocking one field; keep the zero-read assertion where contract demands refusal before opening contents. Per-guard fixed-text error codes (`errorCodes.foo`) are the contract deliverable. |
| K2-3 | knowledge-historian | high | missed-knowledge | `patterns/subprocess-revalidation-against-on-disk-code` — applies to migrator `--apply` re-parse claim (cached `require` validates pre-write code silently); `setup-validator.mts` shells `workflow-doctor --json`; pitch-5 rollout is sync → migrate → verify in one run (recorded precedent `bundle-sync` spawning `skill-sync reconcile`). Migrator + doctor must re-read on-disk before validating. |
| K3-3 | knowledge-historian | medium | missed-knowledge | `issues/macos-tmpdir-realpath-alias-breaks-path-assertions` — applies to the OTHER direction of K4-2. `tempFixture` realpaths by default, so tests building expected refusal paths from raw `os.tmpdir()` compare `/var/...` against code output `/private/var/...` (same inode, failing assert). 12 files use `tempFixture` / 30 call sites; 9 in this pitch's reader-test set (`orca-eval-grader.test.mts` 6, `orca-start.test.mts` 3). Realpath fixture root once, build every expected path from that form; `resolve:false` only in alias tests, and both sides of the comparison in the same form. |
| K4-3 | knowledge-historian | medium | missed-pattern | `patterns/dual-hash-tracking-for-transformed-content` — applies to `--force` branch (ii) "distinguish hand-edited-valid from stale-from-crashed-mid-write" (S2 + S5 + critical #6) which is stated 3 times with no mechanism. One hash conflates operator edit with writer change. Mechanism: record two digests (canonical-bytes-written + parsed-model-as-read); re-verify against written hash only; deterministic transform required; transform failure aborts before any write. Composes with K7's generator marker + K6's `schemaVersion` rule. |
| RH-A | skeptic | high | missed-rabbit-hole | c1+c2 additive `loadConfig`+legacy + `orca-eval-grader.mts:347` writer + `bundle-sync` mid-`token-consumption.mts` read has no named lock/atomic-rename contract. Catalog: `issues/reusing-a-transaction-exposes-its-lock-reader-to-new-callers`, `patterns/pin-directory-identities-across-async-leases`, `issues/metrics-ancestor-swap-during-async-lease` — all apply, none cited. Migrator owns the lock; lock primitive = O_EXCL lockfile (`orca-apply.mts:264`); `flock` has zero portable-bundle precedent. |
| RH-B | skeptic | high | missed-rabbit-hole | Pitch 5 runs `config-migrate` on Bun (LAH/RN) and Node (climbing). S1/K1/S5 require `wx`+`rename`, but Bun-native `Bun.write` is NOT `wx`-equivalent and does not guarantee atomic rename. Catalog: `issues/coverage-instrumentation-changes-exact-child-environments` + `issues/orca-workers-differ-from-the-coordinator-environment` — both bear. Migration's `--dry-run` is async-only reads; runner preflight lives ONLY before `--dry-run` output review. Migrator + writer must use `deps.fs.writeFileSync(path, data, {flag:'wx'})` (already correct on Bun); add one ~15 LOC regression gate asserting Bun adapter never overrides `writeFileSync`. Do NOT pin raw `node:fs` (breaks `memoryFs(files, links)` mutant proofs). |
| A1-3 | appetite-auditor | high | scope-overrun | Per-scope totals after pass-3 high items folded: 67 files / ~7,616 LOC across 13 scopes; max scope 13 files / 1,171 LOC (all within 15/1500). Pitch total 4.5× file cap, 5.1× LOC cap vs pass-2's own estimate (~60/~3.9k) — **1.95× its own estimate**. Big-batch appetite declaration is wrong by shape — this is epic at big-batch appetite. Hard rule: mutant harness never shares a scope with the feature it proves. |
| A2-3 | appetite-auditor | high | split-rule-fit | Pass-2 inversion `c1→c2→b→a` is **unbuildable**. (c1)'s "additive `loadConfig`" IS (a)'s export. (c1)'s grader writer and (b)'s writer both need (a)'s writer API. (a) blocks (c1) twice, (b) once. Pitch states both orders at once (A1-2 "(a) last" + A4-2 "(a) first") — self-contradictory. Live-drop hazard caused by migrator's `deleter`, not by (a) early. New order: **a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 → b2 → b3 → d**. Hard rule: no scope deletes a legacy file. |
| A3-3 | appetite-auditor | high | loc-underestimate | (a) ~2.2k shipped is low. Real ~3,121 (a1 1,171 + a2 1,170 + a3 780). Uncounted: O_EXCL lock primitive, decision record, 14 guards not 6, `test-helpers` TOON fixture writer + alias extension, K2 subprocess revalidation. |
| A4-3 | appetite-auditor | high | loc-underestimate | (b) ~9 files / 1.1k is wrong on both axes. Real ~2,010 / 6 files (b1 625 + b2 560 + b3 825). |
| A5-3 | appetite-auditor | high | loc-underestimate | (c1) ~10 files / 0.7k is roughly 2× under on both. Real ~1,225 / 21 files (c1.1 10 + c1.2 11). At 21 files (1.4× file cap) c1 cannot ship as one scope. |
| A6-3 | appetite-auditor | medium | loc-underestimate | (c2.2) ~17 files under-counts by ~6. Grep-verified set adds AGENTS.md + CLAUDE.md + CHANGELOG.md + VERSION. Framework-doc scope = 13 files (0.87× file cap). |
| A7-3 | appetite-auditor | high | vacuous-green | K1 mutant budget must cover **14** discrete guards, not 6. ~980 LOC harness at ~70 each. Two K1 clauses costed 0 LOC and both are the exact pass-3 scratch-copy failure. New a1 deliverable: name every guard's fixed-text error **code** as a contract. |
| A8-3 | appetite-auditor | high | premise-invalid | RH-B "migrator must pin `node:fs` only" is **already handled and pinning breaks the proofs**. `runtime/bun.mts:29` overrides async `writeFile` only; `writeFileSync` comes from `createNodeDeps → node:fs`. Drop pin + per-runner gates; keep one ~15 LOC regression gate asserting Bun adapter never overrides `writeFileSync`. |
| A9-3 | appetite-auditor | high | precedent-gap | RH-A "flock / advisory-lock" imports a mechanism with zero precedent in this portable bundle. The only lock, `hooks/scripts/metrics-lock.mts:6-19`, is macOS-only. Use O_EXCL lockfile (the primitive `orca-apply.mts:264` already uses). |
| A10 | appetite-auditor | acknowledged | mirror-parity | Already known from pass 1+. `(d)` legacy-delete scope reinstated; the pass-1 override that dropped it is what created the ordering deadlock. `d` also absorbs the two orphans the override dropped. |
| X1-3 | cross-pitch-projector | high | projected-conflict | this pitch (c1.1) + (a) + `upstream-project-drift` S5 + `orca-role-pools` all edit `orca-eval-grader.mts`, and `:108` + `:347` re-create and unlink `.project/orchestration.json` — the exact file (b)'s migrator deletes. (c1.1) rewires grader to (a)'s `wxRename` writer + a realpath-walking deleter. |
| X2-3 | cross-pitch-projector | high | projected-conflict | this pitch freezes `readPolicy` signature but not its payload. `orca-policy.mts:11` `Coordinator.roles` (internal) and `:124` `report().roles` (seam, consumed by `:157`) are different shapes; `orca-role-pools` X4 widens the first. Freeze `report().roles` at `Record<string,string>` (c1.1 job) and mark `PolicyResult.policy.coordinators.<v>.roles` pitch-4-widenable. |
| X3-3 | cross-pitch-projector | high | projected-conflict | per-coordinator `defaultMaxConcurrentWorkers` validation must land in `config.mts`'s validator map (reopens a) or `orca-policy.mts`'s module-private `validateCoordinator` (reopens c1 seam). (a1) declares `coordinators.<vendor>` named slot; pitch 4 registers bounds there. |
| X4-3 | cross-pitch-projector | high | projected-conflict | `engines.orca` slot has no named registration call site. `orca-preflight.mts:1-5` imports neither `config.mts` nor `env.mts`. (a1) exports `registerEngineValidator(key, fn)`; call site = `workflow-doctor.mts` per X5; unregistered slot = doctor `fail`. Add registration line to pitch 3's Places. |
| X5-3 | cross-pitch-projector | high | projected-conflict | `ai-framework/integrations/orca-vendors.example.json` is not an orphan — 8 test files + `README.md:95` + `orca-vendors.md:5` read it by relative path (verified). Retire breaks all 8 across pitches 1/2/3/4's shared hotspot. Relocate to `templates/` breaks all 8 paths identically. Keep in place; pitch 4 owns content. |
| X6-3 | cross-pitch-projector | medium | projected-adjacent | X20's relocation is verified safe, but the recorded reason the sibling example stays out of templates — `workflow-doctor.mts:442 checkProjectScaffold` requireFile's every file under `templates/project/` — is uncited. Cite the archived decision; add no-go against `templates/project/` for any optional template. |
| X7-3 | cross-pitch-projector | medium | projected-conflict | `README.md:95` + `integrations/orca-vendors.md:5` instruct operators to copy the example to `.project/orchestration.json`, a file (b) deletes and no reader reads after (c1). Rewrite in c2.2 (NOT deferred d). First sync delivers `templates/ai_workflow_env.example.json` + `templates/ai-workflow.example.toon` — record in pitch-5 ledger row. |
| X8-3 | cross-pitch-projector | high | projected-conflict | `setup-validator.mts:209` accepts only `--json`/`--no-color` and `checkWorkflowDoctor:158-164` collapses to exit code + `failures`. Pitch 2's new TOON check returns absent=`info`; `main():217` counts only `status === "fail"` → exit 0 → "Setup status: READY". Pitch 5's post-`--dry-run` validator run goes green while TOON still absent. Name the check `Workflow config`; pitch 5 asserts on `--json` `results[]` by name+status, never exit code; do NOT add a `--validate-absent` flag. |
| X9-3 | cross-pitch-projector | high | projected-conflict | real guard lives at `orca-policy.mts:62-99`: `inspectPath` lstat-walks every component, `readBoundedFile` opens `O_NOFOLLOW|O_NONBLOCK`, compares `dev`/`ino` before AND re-`inspectPath` after read. Pitch 2's freeze names signature only. Migrator `--apply` owns the lock; (a1) ports the pin verbatim, (b1) deleter re-checks dev/ino on every legacy path before unlink. |
| X10-3 | cross-pitch-projector | medium | projected-adjacent | runner divergence narrower than RH-B assumes. `runtime/bun.mts:23-36` overrides only async `readFile`/`writeFile`/`exists`, so `wx`+`rename` is runner-identical; `runtime/env.mts:16` sync reader unaffected. Drift surface is `--dry-run` async reads only. Pitch 5's checklist preflights `deps.runtime` against the project's pinned runner before reviewing `--dry-run` output; no blanket version gate. |
| X11-3 | cross-pitch-projector | medium | inventory-gap | `ai-framework/scripts/runtime/migrate.mts` already ships the lstat-per-component ancestor walk (`:15 regular()`) and a dry-run/apply result shape (`:7 EntryMigration`) this pitch's Places list as new helpers. `runtime-boundary-validator-design` (K6-2) requires 2 new scripts be added to doctor's kept-complete script list — an edit c2.1 does not name. Reuse `regular()`, align one result shape, add the doctor script-list rows. |
| X12-3 | cross-pitch-projector | medium | projected-adjacent | RH-B's `Bun.write` conflict with pitch 1 S6 does not materialize (`token-consumption.test.mts` uses `mkdtempSync`/`mkdirSync`/`writeFileSync` only). Real gap: `runtime/test-helpers.mts:31 tempFixture` writes with bare `writeFileSync` — no `wx`, follows symlink. X12's TOON fixture writer inherits at 9 sites. Build it on `memoryFs(files, links)` with its own mutant proof; `tempFixture` gains no new duty. |

**Dependency order now:** `upstream-project-drift` (S9 tag + 4 dirty files committed) →
`a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 → b2 → b3 → d`
(this pitch) → `orca-engines-range` (registers via X4-3 call site in workflow-doctor) →
`orca-role-pools` (registers via X3-3 slot) → `workflow-v3-rollout`; `orca-vendors.example.json`
content edit moves to pitch 4. |

## Bet decision

☑ **Bet (→ /plan)** — 2026-10-16, owner.

**Bet disposition**: pitch is one bet with mandatory /plan split rule (13-scope decomposition,
ordered a1 → a2 → a3 → c1.1 → c1.2 → c2.1 → c2.2 → c2.3 → c2.4 → b1 → b2 → b3 → d).
Big-batch-appetite framing of the work itself is wrong by shape — the work is an epic
inside the big-batch toolset, owning through /plan. 86 critique findings (27 pass 1 + 32
pass 2 + 27 pass 3) all cited or acknowledged in the pitch.

**Acknowledged risks logged at bet time:**
- **A10** mirror count over-stated by 1 (`.agents/skills/build/SKILL.md` is a 3-line stub).
  No action; fact recorded.
- **Epic-shaped work** (67 files / ~7,616 LOC) presented as one big-batch pitch with mandatory
  13-scope decomposition. Owner accepts that "one pitch" framing is conventional at this
  pipeline level; /plan absorbs the actual decomposition and per-scope byte limits.
- **Pitch-3 / pitch-4 dependencies explicit**: pitch 3 must register its range parser under
  `registerEngineValidator("engines.orca", rangeFn)` in `workflow-doctor.mts`; pitch 4 must
  register per-coordinator bounds under `registerCoordinatorValidator(vendor, fn)`. Both
  registrations land AFTER pitch 2 ships its (a1) exports.

☐ Re-shape — named gap: {…}
☐ Pass — reason: {…}

### Critique disposition (2026-10-16)

**Pass 1 (Re-shape loop 1):** Critique fired (big-batch). 11 high, 15 medium, 1 acknowledged
across 27 findings (K, S, A, X). `eval-regression-projector` skipped (not AI-prompt).

Owner override on A1 (bet as one big-batch) with /plan split rule (a → b → c).

**Pass 2 (Re-shape loop 2):** 32 more findings (6 K, 3 S, 10 A, 13 X). All high + medium applied.
Pass-2 corrected the override's *order* to (c1)+(c2) → (b) → (a).

**Pass 3 (Re-shape loop 3):** 27 more findings (4 K, 2 S, 10 A, 12 X). All high + medium applied
except A10 (acknowledged).

**Pass-3 corrections that supersede pass-1 + pass-2 inferences:**

1. **Pass-2 inversion was unbuildable** (A2 pass 3). (c1)'s "additive `loadConfig`" IS (a)'s
   export — (c1) needs (a) to function. Pass-2's "swap to a→b→c→d" didn't apply. Pass-2
   self-contradicted A4-2 which placed writer in (a) AND said (a) lands last. **Mandatory new
   order is `a → c → b → d`**:

   - **(a) first** — `config.mts` exports `wxRename`, `inspectPath`+`readBoundedFile` (verbatim
     from `orca-policy.mts:62-99`), `oexLock`, `errorCodes`, named-slot registrar. Without (a),
     (c1)+(c2) and (b) cannot function.
   - **(c) next** — additive `loadConfig`+legacy fallback; reader signatures frozen at today's
     exact arity. NO file deletion yet.
   - **(b) after** — migrator CLI's writer + dual-hash + 3-branch force. Deletes legacy ONLY
     after every reader has a TOON path.
   - **(d) last** — legacy retirement, `env.mts` reader retired, migrator's delete pass goes
     live. Absorbs the `ai_workflow_env.example.json` relocation (relocated, NOT retired).

   Live drop is impossible because (c) ships before (b). The order survives only because the
   (c) → (b) interdependency does not require the delete pass; (b)'s writer + 3-branch force
   work with the legacy file IN PLACE.

2. **Total scope is epic at big-batch appetite** (A1 pass 3): 67 files / ~7,616 LOC lean —
   4.5× file cap, 5.1× LOC cap. /plan owns 13-scope decomposition. Each scope ≤15 files /
   ≤1500 LOC. Big-batch framing is wrong by shape — pass-1 override's "fits 3.0.0" rationale
   still holds but the work is recognisable as an epic inside the big-batch toolset.

3. **Pitch 2 must REUSE primitives** (X11 pass 3):
   - `runtime/migrate.mts:15 regular()` IS the lstat-per-component ancestor walk the pitch
     listed as new.
   - `runtime/migrate.mts:7 EntryMigration` IS the dry-run/apply result shape.
   - `orca-policy.mts:62-99` IS the real guarded reader (lstat-walk + `O_NOFOLLOW` + dev/ino
     pin); /plan ports this primitive into `config.mts` writers + migrator deleter verbatim.
   - Doctor's "kept-complete script list" gains two new scripts (config validity +
     config-migrate) per (c2.1).

4. **Reader seam freeze** (X2 pass 3): must name BOTH `roles` shapes:
   - `readPolicy(root,deps) → PolicyResult|Refusal` signature frozen.
   - `readPolicy().report().roles` frozen at `Record<string,string>` (the seam value
     `orca-start.mts:157` consumes via flat-string filter).
   - `PolicyResult.policy.coordinators.<v>.roles` (the internal schema) is pitch-4-widenable.
   Pitch 4 otherwise has no legal edit site.

5. **`coordinators.*` validator slot added** (X3 pass 3): `validateCoordinator` (currently
   module-private in `orca-policy.mts:32`) registered as first entry in the (a) named-slot
   table. Pitch 4 registers per-coordinator `defaultMaxConcurrentWorkers` bounds here. Zero
   `config.mts` edit, zero seam reopen. X18 + X19a joined.

6. **`engines.orca` registration call site named** (X4 pass 3):
   `registerEngineValidator("engines.orca", rangeFn)` exported by (a); call site =
   `workflow-doctor.mts` per X5; unregistered slot = doctor `fail`. Pitch 3's Places must add
   the registration line.

7. **`Ai_workflow_env.example.json` EXISTS** (X20): relocated to `ai-framework/templates/`
   sibling to new TOON example, root copy DELETEd, 4 referrers updated. Cite the archived
   decision that explains why NOT `templates/project/`.

8. **`ai-framework/integrations/orca-vendors.example.json`** (X5 pass 3): kept in place. 8
   test files read it by relative path (verified). Retire not possible. Content edit goes
   to pitch 4.

9. **Lock primitive is O_EXCL lockfile** (X-A pass 3): zero precedent for `flock` in the
   portable bundle (`metrics-lock.mts` is macOS-only). Use `deps.fs.writeFileSync(lock, "", {flag:"wx"})`,
   EEXIST → fixed-text operator-recovery. Migrator owns the lock (not `bundle-sync`, which is
   verified NOT a config writer — root files absent from `SYNCED_DIRS:59-77` and `FLAGGED_FILES:83`;
   `compareFlagged:243` is hash-only).

10. **Bun.write vs `wx`+rename** (X-B pass 3): `runtime/bun.mts:23-36` overrides only async
    `readFile`/`writeFile`/`exists`. Sync `writeFileSync`/`lstatSync`/`realpathSync` etc. come
    from `createNodeDeps → node:fs`. `wx`+rename is runner-identical. Drift surface is async
    reads in `--dry-run`. Do NOT pin raw `node:fs` (breaks `memoryFs(files, links)` proofs).
    Add one ~15 LOC regression gate asserting the Bun adapter never overrides
    `writeFileSync`.

11. **Mutant harness covers 14 discrete guards** (K1 pass 3 + A7): `wx`+rename, ancestor walk,
    symlinked-legacy-not-absent, lexer unreadable, lexer oversize, lexer symlinked,
    `--force` hand-edited-vs-stale (dual-hash), `.rejected` retain, unknown `schemaVersion`
    refuse, prototype-pollution, within-role duplicate, `..`-escape/lowercase, bundle-sync
    exclusion, doctor backup-dir carve-out. Two K1 clauses costed 0 LOC and are the exact
    pass-3 scratch-copy failure: per-guard passing baseline in identical fixture layout +
    assertion-message inspection (not exit code). `config.mts` exports `errorCodes` so the
    mutant harness has something fixed-text to assert on.

12. **`--force` mechanism = dual-hash tracking** (K4 pass 3): record canonical-bytes-written
    + parsed-model-as-read digests. Re-verify against written hash only. Deterministic
    transform required or `--apply` idempotency breaks; transform failure aborts before any
    write (the `.rejected` never-overwrite rule). Composes with K7's generator marker + K6's
    `schemaVersion` rule.

13. **Subprocess revalidation** (K2 pass 3): migrator `--apply` re-parses via a fresh
    Node/Bun subprocess, NOT the running `require` cache. Setup-validator already shells
    `workflow-doctor --json` (correct shape). Pitch-5 rollout is sync → migrate → verify in one
    run (recorded precedent: `bundle-sync` spawning `skill-sync reconcile`).

14. **Two new doctor scripts** (X11 pass 3): "config validity" + "config-migrate" go into
    doctor's "kept-complete script list" — (c2.1) owns this edit.

15. **`docs/.../*` GHOST ROUTE REMOVED** (X9 correction): pitch 3 reads TOON via
    `loadConfig().engines.orca`, NOT `runtime/env.mts`. Pitch 3's edit to `runtime/env.mts`
    (if any) is seam-adjacent only.

16. **`README.md:95` + `integrations/orca-vendors.md:5` dead-end instructions** (X7 pass 3):
    both tell operators to copy the example to `.project/orchestration.json` — a file (b)
    deletes and no reader reads after (c1). Rewrite both in c2.2 (NOT deferred to d). First
    sync delivers `templates/ai_workflow_env.example.json` + `templates/ai-workflow.example.toon`
    — record in pitch-5 ledger row.

17. **`setup-validator` structurally cannot see severity contract** (X8 pass 3):
    `setup-validator.mts:209` accepts only `--json`/`--no-color`; `checkWorkflowDoctor:158-164`
    collapses to exit code + `failures`. Pitch 5's post-`--dry-run` validator run gates on
    `--json` `results[]` BY `name` + `status` — name the new check `Workflow config`, filter
    on `info` = "not yet migrated", never on exit code. K2-2 (pass 2): a missing artifact is
    evidence, not a contract — do NOT add a `--validate-absent` flag.

18. **`tempFixture` audit covers 9 call sites** (K3-2 + K4-2 + K3-3): alias tests must pass
    `{ resolve: false }` AND build expected refusal paths from the same form the code returns.
    9 of pitch's reader tests use `tempFixture`; 6 in `orca-eval-grader.test.mts`, 3 in
    `orca-start.test.mts`.

19. **`memoryFs(files, links)` link map required** (K1 pass 3 + K3-2): TOON fixture writer
    inherits the link map so `existsSync`/`statSync` follow correctly. This is the fix for
    the pass-3 scratch-copy defect class.

20. **`runtime/test-helpers.mts` extension** (X12 pass 3): one TOON fixture writer built on
    `memoryFs(files, links)`, with its own mutant proof. `tempFixture` gains no new duty.

21. **Branch-gate** (X1 + X16 pass 3): branch from 2.23.0 release tag. Gate = `git status
    --porcelain` empty against the 4 dirty code files S9 must commit
    (`orca-preflight.test.mts`, `runtime/node.mts`, `runtime/runtime.test.mts`,
    `skill-defaults.test.mts`).

**Acknowledged, log per disposition rule:**
- **A10** mirror count over-stated by 1 (`.agents/skills/build/SKILL.md` is a stub). No action.
- **Pass-1 override A1** — superseded. Pass-2's inversion (c1→c2→b→a) was also superseded by
  pass-3's evidence. Pass-3's 13-scope decomposition is what /plan inherits. Original override
  rationale (one bet) is broken because the work doesn't ship as one bet — it's 13 scopes
  across 13 commits. The pitch is now framed as one pitch with mandatory 13-scope
  decomposition owned by /plan.
