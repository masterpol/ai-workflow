# Plan: orca-vendor-reconcile (reconcile-core)

**Pitch**: pitch.md  •  **Appetite**: big-batch (cap 15 files / 1500 LOC)  •  **Hill**: hill.md

All new code is `.mts` on injected `RuntimeDeps` (no `node:` imports in production modules, no `any`), tests are `*.test.mts` under Node and Bun and use REAL git repositories in temp directories (`git init`, `git worktree add`), not mocks, because git behaviour is the risk. Commands run with `AI_WORKFLOW_RUNNER=node node --experimental-strip-types --disable-warning=ExperimentalWarning`; abbreviated `NT`. No Orca process or vendor agent is needed: a worker is simulated by a plain git worktree with hostile content.

## Honest size and the decomposition decision

| Wave | Scopes | Files | LOC (impl + tests) |
|---|---|---|---|
| A: take a worker's change in safely | R1 admission, R2 snapshot/apply/rollback | 4 | ~1300 |
| B: prove it and clean up | R3 evidence and cleanup, R4 reconcile orchestration + combined checks | 4 + release step 2 | ~1100 |

Total ~2400 LOC, which is over the 1500 cap (critique A1/A2 predicted this). **Recommendation: bet and build Wave A now; Wave B becomes its own pitch `orca-vendor-reconcile-verify` (shaped before it is built).** Wave A alone is ~1300 LOC (under the cap, with room for the audit fix pass) and is the part that can destroy user work. The scope table below covers both waves so the interfaces are fixed; the gate asks which to build.

## Shared interfaces (fixed here so parallel builds agree)

- Admission (R1): `admitDiff({ worktree, baseline, deps }): Promise<{ status: "admitted"; entries: Entry[]; patch: string } | { status: "rejected"; reason: string; path?: string }>`, `Entry = { path: string; kind: "add" | "modify" | "delete" | "rename"; from?: string; mode: "100644" | "100755"; binary: boolean; size: number }`. Pure read of the worker tree through hardened git; never writes.
- Apply (R2): `applyAdmitted({ root, baseline, admitted, workerOrder, deps }): Promise<{ status: "applied"; snapshot: string; touched: string[] } | { status: "refused"; reason: string } | { status: "rolled-back"; reason: string; restored: string[] }>`; plus `rollback({ root, snapshot, touched, deps })`.
- Ledger states for reconcile live in a reconcile record next to the dispatch ledger (R4); R1/R2 are ledger-free.
- Hardened git: every invocation uses `-c core.hooksPath=/dev/null -c core.fsmonitor=false -c core.attributesFile=/dev/null -c protocol.file.allow=never -c diff.external= --no-ext-diff --no-textconv`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_TERMINAL_PROMPT=0`, the dispatch gate's env allowlist, `--` before paths, and refuses refs starting with `-`.

## Scopes

| ID | Name | Files | LOC est | Depends on | Parallel with | Subagent? | Dispatch model |
|----|------|-------|---------|------------|---------------|-----------|----------------|
| R1 | Diff admission policy | `ai-framework/scripts/orca-diff-admit.mts`, `.test.mts` (2) | ~230 + ~420 | — | R2 | yes: disjoint files, self-contained, clear exit; adversarial security work | deep |
| R2 | Snapshot, apply, rollback in a dirty tree | `ai-framework/scripts/orca-apply.mts`, `.test.mts` (2) | ~250 + ~400 | — | R1 | yes: same reasons | standard |
| R3 | Evidence copy and settlement-proof cleanup | `ai-framework/scripts/orca-evidence.mts`, `.test.mts` (2) | ~200 + ~300 | R1 (types) | R4 design | yes | standard |
| R4 | Reconcile orchestration, re-measure, combined checks, reconcile ledger states | `ai-framework/scripts/orca-reconcile.mts`, `.test.mts` (2) | ~300 + ~450 | R1, R2, R3 | — | no: consumes all interfaces; main thread | — |
| R5 | Release (docs, CHANGELOG, VERSION) | `ai-framework/integrations/orca-vendors.md`, `CHANGELOG.md`, `VERSION` (3) | ~60 | R4 (or Wave A) | — | no: shared files | — |

Wave A = R1 + R2 (+ R5 documenting Wave A). Total files if everything: 11, under 15; LOC is the binding limit.

## Exit criteria per scope (machine-checkable)

### R1 — diff admission
- `NT --test ai-framework/scripts/orca-diff-admit.test.mts` and `bun test` of it exit 0, using real temp repos plus `git worktree add`.
- Each hostile fixture is rejected with its own reason and the coordinator tree is byte-identical afterwards: worker `.gitattributes` with a `filter=` driver and a `diff=` textconv driver (a canary file proves the driver command never ran); worker-controlled `.git` config and `core.hooksPath`/`core.fsmonitor` set to a script that writes a canary (canary absent); symlink entries and a path through a symlinked directory; paths with `..`, absolute paths, NUL or newline in names; gitlink/submodule (mode 160000); case-fold collision (`A.txt` and `a.txt`); `+x` flip allowed only as an explicit `mode` field, setuid bits rejected; renames and deletes appear in `entries` (changed set derived from `git diff --raw -z --no-renames --binary`, never from mail); binary file round-trips in `patch`; a baseline that is not an ancestor of the worker HEAD, or a ref starting with `-`, is rejected; worker commits and untracked files are both captured.
- A claimed `filesModified` that omits a changed file does not hide it (test passes a lying list and the entry is still reported).
- Mutant proof: disabling each guard (hooks off, symlink check, gitlink check, case-fold check, `--` separator, raw-diff source) turns at least one named test red.
- `grep -n "node:" ai-framework/scripts/orca-diff-admit.mts` empty; `grep -nE ": any\\b|as any"` empty; `runtime/invariants.test.mts` passes.

### R2 — snapshot, apply, rollback
- `NT --test ai-framework/scripts/orca-apply.test.mts` and bun exit 0, real temp repos.
- Dirty tree: unrelated uncommitted edits and untracked files survive an apply and a rollback byte for byte; an admitted change that overlaps a dirty file is refused (`dirty-overlap`) before any write, naming the path (no `--3way`, no conflict markers ever written into user files).
- Baseline moved (HEAD differs from `baseline`): refused (`baseline-moved`) with no write.
- `git apply --check` runs for every worker first; any failure refuses all of them; a failure injected after the first worker's write rolls back only the touched paths and returns `rolled-back` with the restored list; rerun after rollback is idempotent.
- Deterministic worker order (sorted by attempt key) and per-call result lists applied/rejected/rolled-back.
- Writes refuse symlinked ancestors of any target path (lstat each component, `sync-tools-refuse-symlinks...` pattern); a symlink pointing at a victim file leaves it untouched (probe test); paths realpath-resolved before matching, macOS `/var` alias covered.
- Never uses `git stash`, `git reset --hard`, `git checkout -- .` or `clean`; a grep test over the module fails if those strings appear.
- Mutant proof for dirty-overlap, baseline-moved, check-first, rollback-scope and symlink guards.
- Same greps and invariants as R1.

### R3 — evidence and cleanup (Wave B)
- `NT --test ai-framework/scripts/orca-evidence.test.mts` and bun exit 0.
- Evidence (patch, changed-file hashes, check output) is copied outside the worker resources, each copy verified by hash before any cleanup; a mismatch blocks cleanup.
- Cleanup decision is positive-proof only: unproven settlement, a retained/user-touched worktree, a dirty worker tree or unaccepted edits ⇒ no removal; never `worktree remove --force` or `prune`; terminal state `integrated-uncleaned` with leftover paths; cleanup is idempotent and resumable after a crash between copy and removal; late mail after release does not change a settled state.
- Mutants and symlink probes as above.

### R4 — orchestration and combined checks (Wave B)
- `NT --test ai-framework/scripts/orca-reconcile.test.mts` and bun exit 0.
- Re-measures changed files, counts and check results itself; worker claims are never trusted (lying-claims test).
- Checks run only from a typed allow-list of commands with scrubbed env and a deadline (refuse a remaining budget under 1 ms); baseline checked first to separate flaky from worker-caused; a diff that touches check definitions (scripts, test configs, hooks, `ai-framework/scripts/`, the grader) requires explicit human confirmation before checks run.
- Reconcile ledger states keep missing/refused/corrupt distinct; reruns are idempotent; the `AI_WORKFLOW_ORCA_MULTI_AGENT` switch is checked first.

### R5 — release
- `docs-links.mts` reports 0 broken; `changelog.mts --check` shows the new version; `workflow-doctor.mts` and `setup-validator.mts` READY; `graphify.mts --check` CLEAN.
- Whole suite: Node `--test` over scripts, runtime, hooks, `.claude/hooks` exits 0 (>= 846 + new) and `bun test` has 0 failures.

## Risks (inherited from pitch and critique)

| Risk | Scope | Spike needed? | Mitigation |
|---|---|---|---|
| Applying worker diffs is code execution on untrusted input (C2) | R1 | no | Hardened git, canary-proven fixtures, raw-diff source of truth |
| Partial application destroys user work (C3) | R2 | no | Check-first, snapshot, touched-path rollback, no destructive git verbs |
| Combined checks run untrusted code and attest themselves (C4) | R4 | no | Allow-list, scrubbed env, human confirmation for check-definition diffs, baseline first |
| Cleanup after `retained/user_takeover` (C5) | R3 | no | Positive proof only, `integrated-uncleaned` |
| Size over cap (C1) | all | no | Wave split; Wave B is its own pitch |
| Shared reader hardening makes a writer destructive | R2, R4 | no | Trace every caller of any shared reader touched; reuse dispatch ledger reader unchanged |
| macOS `/var` realpath alias | all | no | realpath-aware assertions |
| Live Codex/OpenCode completion and peer messaging unobserved | none in core | no | Not needed: workers are simulated by git worktrees; live criteria belong to integration |

Applicable rules checked: `ai-framework/rules/security.md` §9, `testing.md`, and the entries cited under "Knowledge consulted" in pitch.md.

## Parallel dispatch plan

R1 and R2 in parallel as separate subagents (deep and standard) with disjoint files and the fixed interfaces above; the orchestrator re-runs their tests, greps and mutants itself. Then (if Wave B is in scope) R3 as a standard subagent, R4 on the main thread, R5 last. After the build, a security-focused audit with a git-hostile-tree focus, expected to need two cycles.

## Living-spec deviations log

(Empty at /plan time.)

## Plan decision (2026-10-08)

User approved the plan with Wave A and Wave B together (option 2), knowing the total (~2400 LOC) exceeds the 1500-LOC cap. Accepted as a deliberate overrun; the audit still runs per wave order (R1/R2 first, R3/R4 after), and an overrun is not a reason to skip a cycle. Wave B is not split into its own pitch.
