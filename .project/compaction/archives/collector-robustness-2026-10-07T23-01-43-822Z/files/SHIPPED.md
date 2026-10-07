# Shipped: Collector robustness

**Pitch:** [pitch.md](pitch.md) · **Plan:** [plan.md](plan.md), [completion-plan-2026-09-27.md](completion-plan-2026-09-27.md) · **Hill:** [hill.md](hill.md)
**Shipped:** 2026-09-27 · **Appetite:** small-batch (S1), then a user-approved big-batch completion plan (C2 + C3, ≤9 files)

## Scope reconciliation

| Scope | Commitment | Delivered | Status |
|---|---|---|---|
| S1 | Robust lock and event identity | Structured identity delivered (tagged JSON tuples, type-only completions distinct, replay dedup kept). Age/PID lock reclaim proved unsafe (a paused owner can resume) | **Identity done; lock superseded by C2** |
| C2 | Kernel lease | `metrics-lock.js`: loopback `127.0.0.1`, port from the directory's real path, exclusive, no protocol, ~1 s monotonic bounded wait, fail closed, never a fallback port or file; 11 tests with real subprocess barriers | **Done** |
| C3 | All writers and migration | Async `recordEvent` holding the lease across read, snapshot and report writes; CLI and both OpenCode callbacks await; legacy lock → skip, never reclaimed; README migration; 6-process exact-totals test | **Done** |

Files: 9 of the completion plan's 9. Tests: 117 in the required suites; full repo suite 404/404 (three consecutive runs
after the audit fixes). Doctor READY, setup-validator READY, graph CLEAN.

## Confidence — read this before relying on it

- **macOS only.** Linux and Windows socket semantics are not verified; Windows may differ materially.
- **Unrelated projects can share a port** (~1/10,000 per pair) and skip each other's events while one holds. Seen once
  as a flaky full-suite run during build (likely, not confirmed) and once in an audit scratch run.
- **The guard that closes a server whose `listen` completes after its attempt timed out is untested**: unreachable
  without timing fault injection. It survives mutation.
- **Old writers are not excluded** until the migration's quiesce step is done; the legacy-lock skip only covers writers
  that left the file.
- **No separate pre-bet critique** ran for the completion plan (the user approved it directly); `/audit` was the first
  independent look.
- **A commit (`c948231 update`) captured most of C2/C3 mid-build**; it was not made by this session. Later fixes are
  uncommitted until the user asks.

## No-gos honored

- No new telemetry dimensions or vendors; no telemetry upload; no report presentation change.
- No unbounded waits in agent hooks: ~1 s monotonic deadline, bounded attempts, skip on contention.
- No change to historical snapshots beyond read compatibility; totals carry over; the legacy lock is never modified.
- No Python runtime, native build, external service or new dependency (Node built-ins only).

## Rabbit holes — resolved as committed

- Legacy `identityKey` compatibility: stored totals readable; old colon keys preserved and may replay once (documented).
- Lock-age boundary: removed with the age rule; ownership is kernel-held.
- Every writer on one protocol: CLI and plugin both use `recordEvent`; no synchronous path remains (grep and review).

## Deviations (see `deviations.md`)

D1 unsafe age reclaim; D2 identity semantics; D3 no separate critique; D4 S1's five reclaim tests retired with the
mechanism; D5 cross-project collisions observed in practice.

## Audit findings — final disposition

`audit-cycle-2.md`: five fresh sonnet dispatches, every canary caught. F1 must-fix (a late accept error closed a granted
lease, letting a second writer in) fixed with a guard-proving test; F2 vacuous timing bound and F3 README overstatement
fixed; cross-pitch clean. 0 must-fix open. (`audit-cycle-1.md` is the 2026-09-26 audit of the retired S1 lock.)

## Knowledge extracted

- `.project/knowledge/decisions/collector-metrics-lease-design.md` (new), linked from `token-metrics-dimensions-design`.

## Followups

Closed: "Collector lock never reclaims a live or reused PID…", "Collector identity keys can collide across entities",
"Reconcile the collector edits made by the S2 re-review with `collector-robustness`". Open (owned here): "Metrics lease:
verify on Linux and Windows, and reduce cross-project port collisions". Still open, not closed by this pitch: OpenCode
plugin null-event/map hardening and the `since`/`metricScope` test gap.
