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
