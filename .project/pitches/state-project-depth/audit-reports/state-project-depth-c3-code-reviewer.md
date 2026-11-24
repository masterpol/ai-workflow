# state-project-depth: cycle-3 code review (narrow)

Reviewed only the specified cycle-2 fixes and four new regression tests, using the canonical code-reviewer role. No helper workers or workflow phases were started. All proof scripts, copies, fixtures and mutation logs are under `/private/tmp/state-c3-code-f2jiyiuc` and `/private/tmp/state-c3-marker-Ecg3y8`; this report is the only repository file written by this reviewer.

| severity | file:line | rule | failure scenario with command and output | fix |
|---|---|---|---|---|
| must-fix | ai-framework/scripts/facts-gather.mts:462 | A gate must establish ownership before overwriting; an inspection error is not evidence of absence. | The new marker-content check catches every inspection/read error as `absent`. A pre-existing regular marker path containing `USER NOTES` with mode `000` cannot be read, but its writable parent permits rename over it. No concurrent mutation is needed. Run `bun /private/tmp/state-c3-code-f2jiyiuc/marker-proof.mts`: output is `{"root":"/private/tmp/state-c3-marker-Ecg3y8","beforeError":"EACCES","result":".project/reports/state.explainer.json","markerAfter":"31520e0d9fe88bfd56beb4232f48d8363002e05a06df17caac36bbb3be0c1101\n","foreignPreserved":false}`. This uses real chmod/read/rename, without injected filesystem behavior. The marker guard's error branch silently destroys the foreign file. | Treat only `ENOENT` as absent. On any other inspection/read error, leave the marker path alone and return the already-written report path. Add an unreadable-marker test (or deterministic EACCES injection for privileged test runners). |

## Cycle-2 findings: fixed / not fixed

| Cycle-2 finding | Status | Evidence |
|---|---|---|
| Code/security reviewers: reset pins a pathname sampled after hashing, allowing deletion of a replacement inode | **Fixed** | `readBounded` pins `opened.dev/ino` from fstat before reading; reset compares that descriptor identity before unlink. The new close-hook swap test passes. A scratch mutant reinstating the late pathname pin fails the test with `ENOENT` when reading the wrongly deleted replacement. |
| Security reviewer: absent draft cannot publish on a filesystem without hard links | **Fixed within the documented residual** | Non-EEXIST link failures recheck destination absence, then rename. The injected EPERM regression passes. The fallback's documented path window is excluded by the dispatch. |
| Security reviewer: a foreign file or directory at the marker path is overwritten or causes a post-publication error | **Not fully fixed** | The new predicate preserves readable non-hex files, directories, links and oversized files by inspection; the readable foreign-file regression passes. A non-ENOENT inspection/read error still permits overwrite, as proven above. This new failure scenario is in the added guard's error handling. |
| Security/test reviewers: final draft inode identity has no independent regression coverage | **Fixed** | New same-bytes replacement-inode test passes and fails when only `again.dev/ino` comparisons are removed. The hash check remains enabled in the mutant. |
| Test reviewer: descriptor identity guard has no independent regression coverage | **Fixed** | New misdirected-open case passes and fails when only `opened.dev/ino` comparisons are removed. Its decoy contains the same bytes. |
| Code/test reviewers: deliver → edit → real bundle reset → regenerate composition missing | **Fixed** | New end-to-end test calls real `resetStateReports(true)`, verifies matching HTML removal and edited draft/receipt retention, then runs real facts CLI main and verifies refusal with unchanged edited bytes. A scratch mutant disabling reset fails the test. |

Earlier findings already marked fixed in cycle 2, plus its acknowledged/deferred exclusions, were not re-audited in this narrow cycle.

## Verification

Commands executed against scratch copies, with `TMPDIR=/private/tmp`:

- `bun test /private/tmp/state-c3-code-f2jiyiuc/ai-framework/scripts/bundle-sync.test.mts --test-name-pattern 'report reset pins the hashed descriptor'`: **1 pass, 52 filtered, 0 fail**.
- `bun test /private/tmp/state-c3-code-f2jiyiuc/ai-framework/scripts/facts-gather.test.mts --test-name-pattern 'writeReport refuses a same-bytes|writeReport falls back|end to end with the real reset'`: **3 pass, 32 filtered, 0 fail**.
- `python3 /private/tmp/state-c3-code-f2jiyiuc/mutate.py`: **4/4 mutants killed**, each exit 1 with **0 pass, 1 fail**. Cases: `reset-late-pin`, `pinned-identity`, `final-identity`, `no-reset`. Exact substitutions, selectors and logs are preserved beside the script; source copies were restored after each run.
- `bun /private/tmp/state-c3-code-f2jiyiuc/marker-proof.mts`: actual unreadable-marker overwrite reproduced as recorded above.

## Unverified

- Full repository suite, type checks, setup/graph/release checks, live delivery and visual validation were outside this narrow task.
- Real Archify validation was not run; scratch copies lack the installed Archify package, and the selected tests do not invoke it.
- No exhaustive filesystem error matrix, scheduler stress test, directory replacement test or fallback-absence mutation test was run.
- Known readdir budget, facts-project directory-swap race, remaining final-check-to-unlink/rename windows, link-less fallback window and workflow-v3-rollout followup were excluded as instructed.

## Review summary

| Tier | Count |
|---|---|
| must-fix | 1 |
| should-fix | 0 |
| acknowledged | 0 |

Verdict: **BLOCK — marker inspection errors can still authorize destruction of a foreign file.**
