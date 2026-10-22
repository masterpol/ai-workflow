# Shipped: workflow-usage-state

Bet: 2026-10-19 • Shipped: 2026-10-20 • Appetite: big-batch (7 of 15 files incl. `CHANGELOG.md` and `VERSION`; about 1,076 lines added against the 1,500 cap) • Version 2.36.0
The workflow usage state is now schema 2 and can answer how long a pitch, phase or scope took and how much of that was waiting. It is still a library: nothing writes these events automatically (that is `workflow-usage-capture`), and the report shows only the new health rows, not time tables (that is `token-time-report`).

## Scopes

| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-10-20 | Spike: lease-flake baseline 0/12, drop channel `marker-file`, record cap 256, coordination yes/yes. Owner approved |
| S2 | shipped | 2026-10-20 | Schema 2 skeleton and v1→v2 migration by token edit and append, byte round-trip proof; report never rewrites v1 |
| S3 | shipped | 2026-10-20 | Scope label, label-free activity key, oldest-start eviction (arriving start competes), 6 h TTL, primary re-start supersede, replay fingerprint kept |
| S4 | shipped | 2026-10-20 | Interval engine: active union, wait minus active, four levels, fold point, 256-record clip, sessions; 300-scenario property test against a brute force |
| S5 | shipped | 2026-10-20 | Pitch tree, LRU fold into `(other)` in both stores, protection of referenced pitches, ranked transitions, 32-entry trace; full-cap state 1,007,578 bytes |
| S6 | shipped | 2026-10-20 | `recordDroppedCapture` marker outside the lease, consumed under the next lease; residual symlink window accepted by the owner |
| S7 | shipped | 2026-10-20 | Report: computed Automatic capture (`unconfigured`/`observed`/`stale`), `usageSince`, six health rows, no new tables |
| S8 | shipped | 2026-10-20 | Contract doc: schema 2, match key, time and flow definitions, hook mapping (planned), bounds |
| S9 | shipped | 2026-10-20 | Flake 0/12 (baseline 0/12), validators, fences; release 2.36.0 written at `/ship` |

## No-gos honored

- ✅ no prompts, responses, tool arguments or transcript text stored (marker-laden event test; sessions keyed by hash)
- ✅ no inferred `gate.decided`, `audit.finished` or `pitch.finished` (`kind: "gate.decided"` appears 0 times in the module)
- ✅ token snapshot, lease mechanism and store separation untouched (`metrics-lock.mts` and `token-consumption.mts` unchanged; no import from `token-consumption`)
- ✅ no unbounded array or per-event log: every collection has a cap and a test; full-cap state measured at about 1 MB against the 4 MiB bound
- ✅ no fabricated or back-filled durations (unmatched finishes add nothing; unmeasured gaps are counted, not guessed)
- ⚠️ plan deviations, all logged in `deviations.md`: the S4 engine needed the pitch tree early (S5 added the LRU on top); `blankState` stamps `usage.since`; the marker is opened with flag `"a"` instead of `O_APPEND|O_CREAT|O_NOFOLLOW` because the runtime adapter does not expose them; an audit fix added frontier validation and a loop guard

## Rabbit holes

- ✅ resolved as planned: lease flake (no new real-port test; flake 0/12 throughout), label-free identity and the one rewritten test, phase segments excluded from active time, fingerprint drift on pre-scope events, state size, ancestor swap during migration or marker consumption
- ✅ resolved during build and audit: a simulated clock ahead of undelivered events folded them away (test now advances the clock); a hand-edited frontier could spin the forced-fold loop under the lease (audit M1, fixed both ways)
- ⚠️ surfaced new: see followups below

## Audit

Two cycles (cap 3). Cycle 1: three independent reviewers (security, code, test coverage), each in its own scratch copy with a planted canary that it caught. One real must-fix (M1, the fold-loop hang), fixed with a validator rule and a loop guard, each killed by a mutant. Cycle 2: narrow security re-check, canary caught, no new finding. Must-fix queue empty. Records: `audit.md`, `audit-record-*.md`.

## Final verify

`node ai-framework/hooks/scripts/pre-ship-verify.mts` exits 1 ("No package.json or Muro document verifier found"). That is the existing followup from `state-fragment-sanitizer` (this bundle has no `package.json`), not a check of this pitch's code, so the real project commands from `.project/context/stack.md` were run instead: the three metrics test files 79/79, Bun on the state and report tests 73 pass, the invariants test 8/8, `setup-validator` exit 0, `graphify --check` clean, `workflow-doctor` exit 0, flake loop 0/12. No build, typecheck, lint or i18n command exists in this repository. The full Node suite (2234 tests) failed only the 14 `[dataset-mapping]` tests, which fail identically without this pitch's changes. `bun test ai-framework` stalls with or without them.

## Docs

`ai-framework/integrations/workflow-metrics.md` is the contract and was rewritten in S8. No ADR: the choices (marker file over indirect-only, record cap 256) are in `spike-s1.md`.

## Followups generated

- workflow-usage-capture calls the exported resolver and wires the hooks (planned, med)
- Add `O_WRONLY`, `O_APPEND` and `O_CREAT` to the runtime adapter constants and open the marker with them (closes the accepted symlink and FIFO windows; low-med)
- `[dataset-mapping]` child-suite flake in the full suite and the `bun test ai-framework` stall, with a stale `bun ../probe.mts` process at 100% CPU (med)
- `pre-ship-verify.mts` route for a package-less bundle, hit again at this ship (med, already open)
- Tune the audit: give the test-coverage reviewer its own scratch tree (it shared the code reviewer's canary copy) (low)
- Full-cap size test takes about 8 s because `scopeRow` recounts leaves; the cut-back test hangs instead of failing without its guard; existing tests still bind the real loopback port (low)
