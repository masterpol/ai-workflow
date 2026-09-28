# Completion proposal: collector robustness

Status: draft for impact and revised-contract approval. The original plan, deviations and measurements remain intact.

**Approval**: The user approved this completion plan (contract, migration decision, scopes C2-C3 and
appetite) on 2026-09-27 and asked for the implementation to be finished. The pre-bet critique the draft
called for was not run separately; the user's direct approval stands in for it (recorded in `deviations.md`, D3).

## Proposed contract

Replace pathname lock reclamation with a kernel-owned loopback listening socket in the actual writing Node process. Use one deterministic endpoint per canonical project metrics directory. A holder retains the endpoint while paused; process death releases it without PID inference, stale age or unlink/rename. No Python runtime, native compilation, external service or telemetry upload is introduced.

This is a proposal, not a production guarantee. A local probe on 2026-09-27 observed EADDRINUSE for a contender while the holder lived, also after requesting SIGSTOP, and successful acquisition after confirmed holder death. The probe did not acknowledge the stopped state and is not a deterministic stopped-holder test. It did not verify endpoint derivation, concurrent writes, migration or other platforms.

Endpoint collisions or another process occupying the endpoint cause bounded contention and skipped telemetry; never choose a different port after contention because that would permit concurrent writers for the same project. Bind only to 127.0.0.1, exclusive ownership, with no request protocol or transferred event data; close incoming connections. Different network namespaces writing the same directory, hostile directory relocation and noncooperating old writers are outside this contract. Unsupported or restricted socket environments fail closed with a bounded skip, never fallback to the racy lock.

## Migration decision requiring approval

All event entry points must use the new asynchronous ownership API. A deployment must quiesce old hook/plugin processes before switching protocols; old in-memory plugins must be restarted. Do not silently infer that the absence of the old lock file proves old writers cannot return. An existing legacy lock causes a skip until explicit, quiescent migration removes it; no automatic stale reclamation. Migration instructions must preserve metrics snapshots and explain that old colon-form dedup keys remain readable but may replay once across the identity transition already implemented.

This replaces the original age-based reclaim promise. The aggregate JSON format and existing totals remain unchanged. The collector continues to be best-effort telemetry, not a durable event delivery system.

## Draft scopes and appetite

Revised appetite: big-batch, at most nine implementation/test/documentation files and 1,000 changed lines, excluding generated version logs and workflow records. This exceeds the original two-file plan because making the ownership API asynchronous changes plugin and test callers. Pre-bet critique is required before finalizing this expanded plan.

| Scope | Files | Exit | Depends on | Dispatch |
|---|---|---|---|---|
| C2: kernel lease | new `ai-framework/hooks/scripts/metrics-lock.js` and `metrics-lock.test.js` | Deterministic subprocess contention, pause/resume, holder death, bounded timeout, port collision and error cleanup pass; removing exclusivity causes a test failure | — | sequential; one ownership protocol |
| C3: all writers and migration | `token-consumption.js`, `token-consumption.test.js`, `.opencode/plugins/token-consumption.js`, `opencode-plugin.test.js`, `token-report.test.js`, `ai-framework/scripts/skill-defaults.test.js`, `README.md` | Awaited calls and failures handled; concurrent exact totals and dedup pass; legacy lock skips; CLI and plugin remain best-effort | C2 | sequential; public API changes across callers |

The CLI must await recordEvent. The OpenCode callbacks must await it within their failure handling. Update every synchronous test caller; do not leave a mixed old/new path. Hold the socket through snapshot/report writes and close it in finally. Connection handling must not keep a lease alive after the action finishes. Waiting uses a monotonic deadline around one second, with bounded attempts and no unhandled late listen/error event after cancellation. A paused *waiting* process cannot meet a wall-clock deadline until resumed; do not claim otherwise.

## Impact

Risk: high, concurrent metric integrity plus a synchronous-to-asynchronous public API change. Production callers found: the collector CLI and two OpenCode plugin callbacks. Tests also call recordEvent directly in token-consumption, token-report and skill-defaults. Claude/Codex adapters invoke the CLI and retain its invocation shape. Renderer data schema remains unchanged. New helper imports Node built-ins only; the plugin retains its inward dependency on the collector.

Required commands:

- `node --test ai-framework/hooks/scripts/metrics-lock.test.js`
- `node --test ai-framework/hooks/scripts/token-consumption.test.js ai-framework/hooks/scripts/token-report.test.js ai-framework/hooks/scripts/opencode-plugin.test.js ai-framework/scripts/skill-defaults.test.js`
- `node --test ai-framework/scripts/state-snapshot.test.js ai-framework/scripts/state-html.test.js`
- `node ai-framework/scripts/setup-validator.js`, `node ai-framework/scripts/graphify.js --check`, and `git diff --check`.

Use real subprocess barriers for ownership tests, not elapsed sleeps. Assert exact retained totals, vendor-scoped notes, colon-distinct identities, replay dedup, type-only completions, live holder refusal, actual holder death and skipped unsafe migration. Platform claims require execution on that platform; a macOS run alone does not certify Linux or Windows.

After independent critique and approved final plan: build, independent audit, version log and gated ship. Do not silently close unrelated plugin null-event/map hardening or report-design followups.

## Proposed hill

C2 and C3: uphill 0%, pending revised-contract and impact approval. Original S1 remains incomplete until the new ownership contract passes its tests and audit.
