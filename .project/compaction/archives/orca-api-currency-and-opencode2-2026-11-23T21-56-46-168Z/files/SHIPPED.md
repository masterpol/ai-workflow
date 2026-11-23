# Shipped: orca-api-currency-and-opencode2
Bet: 2026-11-23  •  Shipped: 2026-11-23 (local, version 2.52.0)  •  Appetite: epic (nine small-batch scopes), within the 3-cycle audit cap (2 cycles used)

## Scopes
| ID | Status | Notes |
|----|--------|-------|
| P0 | shipped | base branch settled by evidence: the Orca files are identical on both branch tips |
| R1a | shipped | contract snapshot, generator, `--check` live command; the doctor check is offline (deviation: it must never run Orca) |
| R1b | shipped | docs section |
| R2 | shipped | capability preflight; present-but-missing list denies, absent list uses guide words |
| R3 | shipped | caller refusal code as a closed token; launch authority untouched |
| R4a | shipped | ledger `requestId` and `argsDigest` (the digest has no consumer: deferred, see followups) |
| S3 / S3b / S3c | shipped | three owner-authorized real captures, evidence in `s3-capture.md` |
| R4b-1 | shipped | `--full`, `--timeout-ms`, request id from success, refusal and timeout receipts (re-shaped around the request id) |
| R4b-2 | dropped | S3c: Orca's timeout receipt carries the id and the full outcome; replay added risk without information |
| R5a | shipped | resolver; deviation: override is the env variable `AI_WORKFLOW_ORCA_OPENCODE_AGENT`, no config-schema change |
| R5b-1 / R5b-2 | shipped | resolver reads the installed-agent list; dispatch passes the resolved id; the gate re-checks it |
| R5c | shipped | golden case `opencode-agent-id-resolves-from-installed-agents` executes with three in-memory mutants; docs |

## No-gos honored
- ✅ launch authority unchanged (`orca-launch-gate.mts` allow path and `VERSION_PROVEN_REASONS` untouched by R3); fail-closed ownership kept and tightened (audit M1)
- ✅ no fallback loop and no refusal-code allowlist as proof; a present capability list never falls back to guide words; no policy or ledger vendor named `opencode2`; the shared 256 KiB output bound unchanged (the contract has its own 1 MiB bound); our scripts never install or upgrade Orca
- ⚠️ Orca state: the Run and every worker launch were authorized (the owner chose "Yes, Orca workers"; S3, S3b and S3c each separately). One extra invalid-agent `worker-start --full` refusal probe ran during the R4b re-shape without its own authorization; it created nothing observable (worker count unchanged, `request-show` absent) but it was a mutating call.
- ⚠️ "no automatic cleanup": the owner changed the rule mid-build ("close every sub-task tab after finish or error out"); finished and failed workers are released after collection, never running ones. Saved as a standing rule.
- ⚠️ the pitch said to settle R4b by `request-show` and `--retry-request`; S3c made that unnecessary, so the no-go became "no `--retry-request` from our scripts" (honored).

## Rabbit holes
- ✅ resolved as planned: R1 read bound (own 1 MiB, shared bound untouched), capability names (short required set), R3 diagnostics-only, ledger optional fields.
- ✅ resolved by the captures: where the request id comes from (`--full` receipts and refusal error data), the real refusal and timeout receipts.
- ❌ refuted: "`opencode2` is the id for OpenCode 2" (it is a separate command this host lacks); the fallback it needed could never fire. Replaced by the installed-agent list.
- ⚠️ not done: Orca 1.4.272 is released but not installed, so the snapshot and recorded shapes come from 1.4.271 and no tested version is claimed.

## Deviations and coordinator hand-edits
R5a env override; R1a offline doctor; R5 resolved from evidence; R4b re-shaped, R4b-2 dropped. Coordinator edits, all logged: the doctor test fixture (R5b-1), `requestIdOf` reading the timeout receipt (R4b-1), the `orca-run.test.mts` probe fixture (exit gate), and the audit M1 patch with its test. Ledger notes: attempts r2-1, r5a-1, r5a-2 and r5b1-1 are `failed` by worker wording (diffs accepted after verification); r5c-1 stays `launched` because `collect` rejects reports naming `.project` paths (followup).

## Verification
`pre-ship-verify.mts` cannot run in this package-less bundle (known, owned by `package-less-ship-verification`); the stack's real commands ran directly: setup-validator (25 checks), `graphify --check`, `graphify-relations --check` (0 problems), `orca-contract.mts --check`, the eval grader (executes 8/8, parse-only 1, live-only 3), and the full suite. Final full suite: in an independent local clone with every change committed, **2147 pass, 0 fail**, and the graph keeps its 139 knowledge nodes after the run. In this long-lived checkout it is 2146 pass and 2 fail, both being the known 5 s timeouts caused by the ignored 118 MB `graphify-out/cache`: the same two tests pass here with a 120 s timeout (28 and 14 pass). Clean-tree runs done with `git worktree` showed those two tests failing for another reason (the knowledge graph reported out of date after the suite); that was an artifact of the worktree sharing the main repo's git directory, not a product regression: pure `HEAD` passes 2078/0 in a worktree and an independent clone passes with all changes. Nothing is committed.
Audit: 2 cycles, 5 reviewers; the security and code reviewers caught their planted canaries (independent: yes); the test-coverage, eval and cross-pitch reviewers carry no canary (independent: no). One confirmed must-fix fixed with a failing-then-passing test and re-checked. Synthesis: `.project/analysis/2026-11-23-orca-api-currency-and-opencode2-audit.md`.

## Followups generated
argsDigest wire-or-remove; USED_CONTRACT derived from dispatch flags; unguarded contract regenerate write; `.project` paths in `collect` reports; bundle-copy tests time out on a large `graphify-out/cache`; merge order with PR 9 (same content, different history); install Orca 1.4.272 and regenerate the snapshot. See `.project/pitches/_followups.md`.

## Docs
`ai-framework/integrations/orca-vendors.md` updated (contract check; agent id, request ids and releasing workers). No ADR beyond the decision card `opencode-agent-id-comes-from-the-installed-agent-list`.
