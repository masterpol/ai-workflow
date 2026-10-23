# Shipped: state-fragment-sanitizer

Bet: 2026-10-19 • Shipped: 2026-10-20 • Appetite: big-batch (12 of 15 files, cap 15; 666 production LOC, cap 800) • Version 2.35.0
The sanitizer is a library. It takes untrusted fragment text and either returns re-emitted,
allow-listed markup with its citations, or a rejection with a closed reason. It reads no files,
injects nothing and writes no report — that is `state-ai-authoring`.

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-19 | Security spike: caps table, 9 decisions (D1–D9), 52-row mutation list, line budgets, parser prototype timing. `spike-s1.md` |
| S2 | shipped | 2026-10-19 | Strict XML-subset parser, iterative, capped, linear. 266/350 lines, 84 tests, M1–M21 killed. Orca worker (Claude deep), reconciled in the coordinator checkout |
| S3 | shipped | 2026-10-19 | Allow-list validator, content model, canonical re-emit, byte-idempotence. 266/300 lines, 113 tests, M22–M34 killed. Implemented by the coordinator after the owner chose `orca=normal` |
| S4 | shipped | 2026-10-19 | Evidence-path and number checker, reusing the shared `safeEvidencePath`. 134/150 lines, 35 tests, M35–M49 killed. Orca worker (Claude standard) |
| S5 | shipped | 2026-10-20 | Mutation matrix, positive controls, named reasons, timed fuzz. 449 tests pass; M1–M49 killed, M50–M52 explicitly deferred to their owners |
| S6 | shipped | 2026-10-20 | Bounded rejection formatter; messages never echo fragment content. M50 killed, M51 measured redundant (7 507 identical outputs) |
| S7 | shipped | 2026-10-20 | Golden-dataset mapping: 13 owned cases enforced, 9 deferred to `state-ai-authoring`, exact disjoint partition. M52 killed. Dataset already tracked (open action A5 satisfied) |
| S8 | shipped | 2026-10-20 | Docs, version log (2.35.0), final build checks. 519 tests |
| — | shipped | 2026-10-20 | Audit cycle 3: A7 fixed (limits snapshot), boundary regressions added, all four required reviews completed. 531 tests, 666/800 lines |

## No-gos honored

- ✅ no script, event handler, external reference or `url()` can pass — element/attribute allow-lists, `on*`, `style`, `id`, scheme and content-model rules all refuse, each with a named reason and a killed mutant
- ✅ the AI's own statement of safety is never trusted — the sanitizer re-parses and re-emits from the tree; canonical output is parsed against the same caps after escaping
- ✅ nothing is written anywhere — the library returns a result; no report file is touched by this pitch
- ✅ no runtime dependency was added (the hand-written allow-list is the "DOMPurify or equivalent" `rules/security.md` §4 asks for, by owner decision 2026-10-19)
- ✅ fragment content never reaches an error text — rejection messages carry only a closed reason, a bounded count and a validated name or `(other)`
- ⚠️ plan deviation: the pitch's parser upper estimate (800+ lines) did not hold; the shipped parser is 266 lines, so the `/shape-lite` trigger never fired

## Rabbit holes

- ✅ resolved as planned: deny-list vs allow-list (allow-list), the parse differential (no HTML error recovery; reject; re-emit from the tree; idempotence test), rejection-message leakage (class + count + capped token only), repair vs reject (reject the whole fragment, keep earlier findings)
- ✅ resolved during build: sparse citation arrays (`every` skips holes, `for-of` visits them), Node strip-only syntax, two Orca launch failures from an interactive shell prompt, the caller-supplied-limits `Proxy` bypass of the hard depth cap
- ⚠️ surfaced new: nine dataset cases remain owned by `state-ai-authoring`; renderer/injector wiring is deliberately unbuilt; no browser execution evidence was claimed

## Audit

Three cycles, zero confirmed live must-fix in the final cycle. Cycle 1 fixed bounded data
snapshots, the tspan content model and the shared rejection builder. Cycle 2 caught the live
A7 defect — a caller-limited `Proxy` could pass the hard depth-20 guard — which cycle 3 fixed
by resolving limits once into a validated plain snapshot. Cycle 3 also closed the promised
boundary regressions and completed all four required reviews (code, security, test coverage,
cross-pitch) after escalating two unreliable fast reviews to the standard profile. Planted
canaries were caught by the reviewers and refuted against the live code. See
`audit-cycle1.md`, `audit-cycle2.md`, `audit-cycle3.md`.

## Evidence

- Final state/runtime regression: **531 tests, 531 pass, 0 fail, 0 skipped, 0 todo**
  (`--test-concurrency=1`, serialized; the concurrent run is load-sensitive and is documented
  in `audit-cycle2.md`).
- Full repository suite: **2 190 pass, 0 fail, 3 skipped** (Node 24.21.0, serialized).
- All 52 planned mutation rows resolved: **51 killed, M51 measured redundant** under the
  approved S1 D10 decision (7 507 differential inputs identical, 2 250 intermediate messages
  unchanged). Five additional audit guards proved with baseline 0 / mutant 1.
- Production budgets: parser 266/350, validator 266/300, evidence 134/150, **total 666/800**.
- `workflow-doctor` 752 checks READY · `setup-validator` 23 checks READY (144 TypeScript files
  parse) · `graphify --check` CLEAN · `docs-links` 0 broken · `changelog --check` 2.35.0 ·
  `git diff --check` clean.
- `node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 0. The bundle has no root
  `package.json`, so the verifier is driven through a temporary `package.json` carrying only
  the `test` script; the file is removed immediately afterwards and the bundle surface is
  unchanged. See "Verification route" below.

## Verification route

The repository has **no build, typecheck, lint or i18n command** (`.project/context/stack.md`,
"Not Applicable") — those gauntlet steps are skipped with that reason, not reported as passed.

`pre-ship-verify.mts` needs a `package.json` (or the Muro viewer verifier) to select its
checks, and this bundle has neither. The first attempt at this ship was therefore blocked and
no SHIPPED record was made. The route used now: a temporary root `package.json` whose only
script is the project's real test command, so the verifier runs the real checks and its
diff-sanity step, then the file is deleted. `pre-ship-verify` reports
`required checks passed` and exits 0. The package-less route is recorded as a followup.

## Followups generated

5 items in `.project/pitches/_followups.md` (pre-ship-verify route for a package-less bundle,
renderer/injector wiring, nine deferred dataset cases, the shared transcript-path rule, and the
state-report-redesign marker/token export).

## Doc updates

`ai-framework/integrations/state-report.md` gained the library contract, the caps, the reason
classes, the no-echo guarantee and the mandatory separate `checkCitations` gate. The doc states
plainly that the library is not wired yet and that the authoring/injector half belongs to
`state-ai-authoring`. No ADR-worthy decision beyond the pitch records: the hand-written
allow-list instead of a dependency is already recorded as an owner decision in `pitch.md`.

The OpenCode Go `fast` route was also repointed from `opencode-go/space-bunny` to
`opencode-go/minimax-m3.1-flash-free` in the same session (owner request): the toon `models`
block, the doctor route, the migrator default, the example toon, the model-routing rule, the
harness/setup docs and every `.opencode` agent/command mirror. The doctor passes with the
new route. That change is a separate logical change and carries its own version entry
(2.35.1); the sanitizer itself ships as 2.35.0.

## Orca

`orca-run.mts start --root . --phase ship --vendor opencode` exits 4 with
`worker-identity-unavailable` — the known pre-existing `lookupWorker --limit 100` output-cap
defect already tracked in `_followups.md`, unrelated to this pitch. No dispatch was required:
every worker change was already integrated and hash-verified during /build and /audit, so the
ship skill's reconcile precondition ("worker changes are still unintegrated") is false, and no
Run is bound. Disclosed at the gate rather than worked around silently.
