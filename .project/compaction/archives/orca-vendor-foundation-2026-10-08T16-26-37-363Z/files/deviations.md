# Deviations: orca-vendor-foundation

## D1 — Explicit Orca opt-in

During S1, the user requested a JSON flag named `use-orca-orchestration` in the same policy that guides vendor routing, with no Orca checks by default. The policy now uses this optional boolean (default false) instead of the proposed `mode` field. The portable example sets false. S2 must short-circuit before executable resolution, PATH checks, or probes unless the flag is explicitly true, including when `--probe` is requested. S3 doctor still performs no runtime probe.

This correction is explicitly user-authorized and strengthens default behavior; no additional files or appetite change.

## D2 — Portable fixture assertions

Translate the shaped policy fixture family into concrete assertions in the co-located tests, instead of requiring the instance-local `.project/evals/` file at test runtime. Bundle-sync does not copy another project's shaping records. This preserves executable golden-case checks when the portable scripts and tests are copied into a project.

## D3 — Cohesive policy module

The policy utility exceeds the generic 80-line utility checklist. Keep its small validator, guarded reader, and inspection CLI together to avoid adding a generic filesystem abstraction or coupling to transaction writers. Functions remain below 50 lines; the approved scope anticipated this cohesive script and its dedicated tests. Its exact LOC and verification are recorded with S1 evidence.

## D4 — Conservative runtime proof

Only the three established read-only guide/status commands are probed. The installed 1.4.222 contract does not prove that orchestration is enabled, so no speculative lifecycle query is added. This follows the plan's explicit unknown/fallback allowance. The accepted caller receipt is tested with fixtures, not claimed as live verification. `--worker-context` is an explicit diagnostic guard; foundation does not infer that every terminal session is a coordinator or launch workers.

The cohesive preflight utility also exceeds the generic 80-line utility checklist; its functions remain below 50 lines, and it keeps the bounded runner and CLI beside the report that owns their conservative outcomes. No generic process abstraction was added.
