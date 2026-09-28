# Path safety hardening — shipped 2026-09-27

## Original build log

# Build evidence

## S1 — 2026-09-26

Behavior tests cover ancestor swaps before temporary-file creation and rename, untouched outside targets, symlinked compaction and ledgers directories, and existing normal ledger commits. The add-skill/pitch-compress suites pass; the shared caller regression run (skill-defaults, skill-sync, skill-vendors, pitch-archive, state-snapshot, plus bundle-sync) passes 132 tests.

In-memory module-loader mutations avoid touching implementation files: disabling the new ancestry checks makes the pre-create swap test overwrite outside data and fail; disabling resolveFile's symlink guard makes the ledger refusal test fail. Both mutant processes exit 1. These demonstrate the bounded defenses, not final race closure.

A first pre-create fixture run failed because macOS realpath expands /var to /private/var; the deterministic mock now compares the canonical context root. This was a fixture mismatch, and its corrected test passes.

Independent security review identified that reusing registry transactions exposed FIFO/oversized lock reads to ledger callers. acquire now opens locks with O_NOFOLLOW/O_NONBLOCK, checks the descriptor is a regular file of at most 4096 bytes, and performs one bounded read. A subprocess FIFO fixture has a 3-second timeout, so a blocking mutant cannot hang the suite. The combined eight-suite verification after this guard passed 189 tests; a later regular-directory replacement fixture and error-preservation adjustment pass three focused tests.

Rollback refusal now preserves both the original write failure and recovery error in an AggregateError. This keeps the observed ancestor-change reason visible without losing the recovery conflict.

Final add-skill/pitch-compress verification: 58 tests pass, zero failures. The subsequently added swapped-ancestor deletion fixture passes its focused command (`node --test --test-name-pattern='swapped ancestor before deleting' ai-framework/scripts/add-skill.test.js`), preserving outside data. No implementation bytes changed after that full run.

## Reproducible in-memory mutation method

Run from the repository root. This compiles altered source only inside isolated child processes; it never edits repository files. Each case must exit 1 with its named assertion failure. The age mutation fails with the expected bounded lock timeout.

```javascript
// Execute this block with node via stdin.
const { spawnSync } = require('node:child_process');
const cases = [
  ['ai-framework/scripts/skill-registry.js', 'ai-framework/scripts/add-skill.test.js', 'rejects ancestor replacement before creating', 'const check = () => {', 'const check = () => { return;'],
  ['ai-framework/scripts/skill-registry.js', 'ai-framework/scripts/pitch-compress.test.js', 'rejects ledger writes through', 'if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink destination forbidden: ${relative}`);', 'void 0;'],
  ['ai-framework/hooks/scripts/token-consumption.js', 'ai-framework/hooks/scripts/token-consumption.test.js', 'keeps colon-separated', 'const identityKey = JSON.stringify([vendor, ...identity]);', 'const identityKey = [vendor, ...identity].join(":");'],
  ['ai-framework/hooks/scripts/token-consumption.js', 'ai-framework/hooks/scripts/token-consumption.test.js', 'an unreadable lock', 'Date.now() - observed.mtimeMs > 1000', 'false'],
  ['ai-framework/scripts/state-theme.js', 'ai-framework/scripts/state-html.test.js', 'parses quoted fonts', '!/^[A-Za-z0-9 _-]+$/.test(name)', 'false'],
];
for (const [file, test, pattern, before, after] of cases) {
  const code = `const fs=require('node:fs'),M=require('node:module'),p=require('node:path');const target=p.resolve(${JSON.stringify(file)}),load=M._extensions['.js'];M._extensions['.js']=(m,f)=>{if(f===target){const source=fs.readFileSync(f,'utf8');if(!source.includes(${JSON.stringify(before)}))throw new Error('mutation not matched');m._compile(source.replace(${JSON.stringify(before)},${JSON.stringify(after)}),f);}else load(m,f);};require(p.resolve(${JSON.stringify(test)}));`;
  const result = spawnSync(process.execPath, [`--test-name-pattern=${pattern}`, '-e', code], { encoding: 'utf8', timeout: 20000 });
  console.log(pattern, result.status, result.stdout, result.stderr);
  if (result.status !== 1) throw new Error('mutant survived or timed out');
}
```


## Completion log

# Path safety completion log — 2026-09-27

The user approved the trusted-directory contract and P2 scope, then selected path safety only.
Collector robustness remains unfinished; no collector implementation was changed in this run.

Knowledge check: the shared-reader refusal issue requires refused destinations to remain errors,
never fresh writes. Existing tests already cover symlinked/non-regular done-work destinations,
symlinked ledger ancestors and outside-target preservation. These remain in the regression set.

P2 unifies ledger/archive contexts and pending-journal guards. Legacy installer journals retain
their original recovery route. Added real SIGKILL fixtures cover existing and new ledgers, exact
rollback bytes, direct API refusal while pending, and old-context recovery. README records the
approved trust boundary and both recovery commands. Scope uses the five approved files.

## Build verification

Direct suites: 110 passed, zero failed. Shared callers: 121 passed, zero failed, including
browser-runtime. Four isolated in-memory mutants failed their focused checks: wrong ledger
transaction namespace, disabled legacy-journal refusal, disabled ancestor identity checks and
disabled ledger symlink refusal. No production source was mutated by these checks.

The audit bench's current tree guard does not skip secret filenames. To honor the project rule,
the audit uses a private copy with its tree-walk skip predicate extended by its existing
SECRET_NAME matcher. This avoids reading secrets without changing the shared bench source.

## Audit and closure preparation

The first four reviewer dispatches hit a provider usage limit without completing. Each was
retried once, fresh and narrower. Code, security, test and cross-pitch retries all detected
the independently tested scratch canary (disabled legacy-journal refusal), which is absent
from production. Reports explicitly retain their narrowed coverage and unverified areas.

Real findings: old/new compaction writers need explicit quiescent migration documentation;
README now says to stop old imported processes before switching namespaces. Test review
requested pitch-source and extracted-content preservation assertions in the killed-ledger
case; added, passed and independently rechecked in cycle 2. All three final focused tests
pass against production source. No unresolved must-fix remains for the approved contract.

Reviewer isolation evidence is qualified: earlier whole-repository guards observed unrelated
collector changes, then collector bookkeeping/status/followup changes. No path-safety source
changed during those dispatches. The private secret-excluding guard preserved the ban on
reading secret files. Initial test-review mutation instrumentation was invalid due to macOS
canonical paths and is not counted; parent mutation results above are the valid evidence.

A concurrent session committed the earlier working tree while this work was interrupted.
The relevant implementation/test hashes still matched the tested build on resume. This
session did not create that commit and does not infer authorship from the combined diff.

## Shipped

User selected 1 at the final ship gate. Closed only path-safety-hardening under the approved
trusted-directory contract; preserved collector status. Version 2.8.6, knowledge, recovery
evidence and audit records remain available. Cooldown is now due; no commit or publication.


## Final hill

# Hill chart: Path safety hardening

**Initialized**: 2026-09-26

| Scope | Position | Last moved | Notes |
|---|---|---|---|
| S1 | done | 2026-09-27 | Existing guarded writes verified under the explicitly approved trusted-directory contract; hostile ancestor races remain outside that contract. |
| P2 | done | 2026-09-27 | Shared compaction recovery context; 231 tests pass across nine suites; four guard mutations caught. Audit passed; user approved ship. |


## Reconciliation

# Shipped: Path safety hardening

**Shipped:** 2026-09-27
**Approval:** User selected 1 at the final ship gate.
**Contract:** The user approved trusted project directories and ancestors; continuous containment against hostile ancestor replacement remains outside the guarantee.

## Scope reconciliation

S1 and P2 are done under the approved contract. Existing static-symlink and observed-ancestor-swap guards remain intact. Ledger commits now share their transaction roots and compaction journal namespace with archive/removal/recovery. New writes refuse pending compaction or legacy installer journals; old journals retain their original installer recovery command. README requires quiescing old compaction writers before migration.

## Verification

231 tests passed across nine direct/shared-caller suites. Three final focused tests passed after adding source/extracted-content preservation assertions. Real SIGKILL fixtures verify prior ledger bytes or prior absence, journal/lock cleanup and legacy recovery. Four author-run guard mutants were caught. Relevant line coverage: registry/archive 100%, compaction 99.32%. Setup validator's 21 checks, graph, syntax and whitespace checks passed. No build, typecheck, lint or i18n command is configured.

## Audit and confidence

Code, security, test and cross-pitch review completed after one fresh narrower retry per role following provider usage-limit failures. All four caught their verified scratch canaries. The migration documentation and preservation assertion findings were addressed; the latter received a fresh cycle-2 recheck. No unresolved must-fix remains for the approved contract. Narrow review coverage, unchanged-source checks, concurrent unrelated writes, invalid reviewer mutation instrumentation and the private secret-excluding guard are documented in completion-audit-summary-2026-09-27.md and per-role records. Independence means fresh context within the same model family.

## No-gos and remaining limitations

No new runtime dependency, ledger schema, retention policy, deletion approval, skill fetching or vendor-mirror change. Historical pitch and native-spike evidence remain intact. Hostile concurrent directory relocation is not solved; unsafe cleanup can retain a temporary file rather than follow a refused path. Collector work is separate and is not shipped by this approval.

## Knowledge and followups

Decision: [[compaction-recovery-shares-context-and-trusted-directories]]. The graph was regenerated. Ledger symlink refusal and mismatched transaction-context followups close with this ship; the stronger TOCTOU requirement stays open. One new followup concerns excluding secret filenames from the review bench tree guard.

## Delivery

Version 2.8.6 records the change (release script date is UTC). The full build/completion logs and final hill are preserved in .project/runs/2026-09-27-path-safety-hardening.md. This session performed workflow closure, not a Git commit, merge, deployment or publication. Cooldown is now due and was not run as part of the user's path-safety-only scope.
