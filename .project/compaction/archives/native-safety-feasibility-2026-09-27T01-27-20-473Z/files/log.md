# Build log: Native safety feasibility

## 2026-09-26 — S1 complete

User approved the plan and its behavior experiments. Implemented only the four scratch deliverables under `.project/analysis/native-safety-feasibility/`. Production files and concurrent independent-review implementation were not edited by this scope.

Test strategy: real filesystem/process integration in `bench.test.js`, covering operation anchoring and refusal, directory relocation, stopped owners, holder and supervisor death, inode replacement, legacy noncooperation, timeout cleanup, missing APIs/runtime and evidence validation. The plan's approved tests were executed without an additional approval round. Two isolated guard mutations (remove leaf `O_NOFOLLOW`; remove `flock`) both caused the experiment to fail; output-outcome mutations were also rejected. No mutation survived those checks.

Evidence: macOS Python 3.14.7 supported the APIs. Captured descriptors followed directories moved outside the root; replacing a lock inode split ownership. Paused helpers retain ownership after supervisor death until resumed and able to process EOF. These are measured limitations, not failures of the spike's exit criteria. Linux remains unverified.

Verification:
- `node --test .project/analysis/native-safety-feasibility/bench.test.js`: 4 passed, 0 failed, 0 skipped (550.7 ms reported test-run duration).
- `wc -l .project/analysis/native-safety-feasibility/*`: 384 lines across exactly four deliverables.
- `git diff --check`: exit 0.
- `node ai-framework/scripts/setup-validator.js`: 21 checks passed, READY.

S1 is done; audit approval is pending. Both original production scopes remain incomplete. No build failures or three-strike escalation occurred.

## 2026-09-26 — Audit complete; ready for ship gate

Four fresh scratch reviewers caught their canaries; repository guards were clean. Code review found that mutation assertions failed when Python was unavailable. Main thread reproduced the failure, added capability baseline validation and explicit skip, and a fresh cycle-2 reviewer independently verified the fix. No must-fix or should-fix remains. See audit.md and checkable per-role records. Budget after the fix: four files / 386 lines.

Final verification: normal suite 4 passed / 0 failed / 0 skipped; unavailable-PATH suite 3 passed / 0 failed / 1 capability skip. Setup validator: 21 checks passed; graph: 24 entries / 62 links, CLEAN; git diff --check: exit 0; changed-file name check: no secret files. No build, typecheck, lint or i18n command exists. Scope review found no debug additions beyond the experiment's intentional JSON/protocol output.

Extracted the measured limitations into knowledge decision inode-anchoring-and-stable-inode-locks and rebuilt the graph. No architecture/product docs or version bump needed: no shipped bundle behavior, skill, rule, hook or production script changed in this scratch spike. Parent pitches already own remaining work; no duplicate backlog item added. Status remains active at ship closure pending until the user selects ship. No commit or publication performed.

## 2026-09-26 — Shipped

User selected “1” at the final ship gate. Closed this feasibility scope, archived this full log and its final hill, and moved only its status row to recent ships. Both production parent pitches remain incomplete. Cooldown due in two ships. No commit, merge, deployment or publication performed.
