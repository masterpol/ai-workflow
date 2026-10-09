# Native safety feasibility — 2026-09-26

Observed on macOS (Darwin), Python 3.14.7. Linux is unverified; Windows is unsupported. This is a scratch experiment, not an approved production runtime dependency. Reproduce with `node --experimental-strip-types --test .project/analysis/native-safety-feasibility/bench.test.mts`; `evidence.json` preserves the initial observed run rather than being overwritten by tests.

## Observed

- Directory-relative open, rename and unlink acted on the captured directory after its pathname became an outside symlink. The outside target's contents stayed intact. `O_NOFOLLOW` refused the leaf symlink.
- Moving that captured directory outside the root did not revoke its descriptor: a subsequent write created an outside file. These primitives provide inode anchoring, not continuous root containment.
- A paused holder excluded a nonblocking contender. Killing the holder released its lock. Deadline cancellation killed a helper and allowed reacquisition.
- Killing a supervisor while its helper was paused left the lock held. Resuming the helper let it observe stdin EOF, close the descriptor and release ownership. Parent death alone does not revoke helper ownership; the lifetime protocol requires a responsive helper.
- Unlinking and recreating the lock file allowed another exclusive lock while the original descriptor stayed locked. Normal operation must preserve one stable inode. A legacy writer ignoring locks could still write; all writers need cooperation.

## Recommendations

**path-safety-hardening:** Do not claim the original continuous containment promise is solved. A future plan may adopt descriptor-relative operations only after explicitly narrowing the threat model to exclude relocation of an open ancestor, or choosing a stronger primitive that meets the original promise. Traverse every component without following symlinks; the experiment starts with one known directory and does not prove a complete resolver. Keep this parent scope incomplete.

**collector-robustness:** A permanent-inode advisory lock avoids age-based stealing and PID-reuse identity decisions for cooperating writers. Production integration needs one lock protocol for every writer, migration preventing overlap with legacy collectors, timeout behavior that retains ownership until the actual helper exits, and crash supervision. Hostile same-user inode replacement remains outside the demonstrated guarantee. Keep this parent scope incomplete.

## Hypotheses and next contract

A Python helper may support a bounded Unix integration, but this experiment does not validate production transactions, collector migration or a complete component traversal. Python availability is a proposed runtime requirement, not a bundle dependency added here. The supported platform contract must explicitly refuse missing Python/APIs and unsupported hosts; Linux needs a real host run before any support claim.

The recommended next appetite is a separate big-batch production design and migration pitch for collector locking. Path safety first needs a re-shape decision about containment versus inode anchoring; no implementation appetite can honestly close the stronger guarantee from these results. No production writer was changed in this spike.

## Evidence limits

Pipes and stopped-process acknowledgements establish ordering; elapsed time is not race evidence. Each barrier and child wait has a five-second bound, with an outer 25-second process-group deadline and 30-second test bound. Temporary fixtures are isolated and removed by both normal Python cleanup and the Node owner after failures. Guard-removal experiments must fail for leaf symlinks and lock acquisition. Scenario coverage is the useful metric for this OS experiment; generic UI/utility percentage targets do not describe its guarantees.
