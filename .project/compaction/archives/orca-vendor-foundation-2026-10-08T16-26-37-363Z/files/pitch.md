# Pitch: orca-vendor-foundation

**Date**: 2026-10-07 • **Appetite**: big-batch (≤15 files / ≤1500 LOC / ≤1 week); estimate 7 files / 550 LOC
**Stack**: Node.js workflow tooling
**Parent**: `../orca-vendor-orchestration/pitch.md`

## Problem

Users need explicit vendor delegation policy and reliable Orca detection before the workflow can safely delegate tasks.

## Knowledge consulted

Parent investigation consulted trusted-root configuration, instance-customization preservation, worker provenance, report verification, honest metrics, and harness routing. Apply those same constraints here; see the parent's links and `investigation.md`.

## Solution sketch (breadboard, NOT wireframe)

**Places**: portable configuration example, instance-local policy, Node policy/preflight helper, diagnostics and tests.
**Affordances**: enable/off mode; coordinator-specific worker lists and role routes; bounded concurrency/retries; readiness diagnostics.
**Connections**: accept verified harness identity, read policy from the trusted root, inspect the selected installed Orca guide/runtime and necessary capabilities, and return a structured eligibility verdict. Missing policy, invalid policy, unsupported harness, missing session, missing capability, or no alternate eligible vendor preserves the normal workflow. Worker preambles prevent recursive coordination. Do not install, authenticate, launch workers, or create lifecycle state.

Eligibility remains informational until the dispatch pitch ships. Configuration contains no credentials and stays instance-local. Templates must not overwrite customization. Use vendor defaults unless explicit user policy requests a supported model. Extend setup/doctor validation only within the projected cap; /plan counts every mirror and release record.

Online verification identifies one more prerequisite: Orca orchestration must be enabled under Settings → Experimental. Check availability without changing that setting; disabled orchestration selects the normal workflow. Evidence: `../orca-vendor-orchestration/online-verification.md`.

## Rabbit holes

- **Resolved**: current Orca CLI discovery fails; upstream feasibility does not establish local readiness.
- **Push to /plan, owner: planner**: establish actual version/capability discovery without guessing flags; unsupported versions report normal fallback.
- **Push to /plan, owner: planner**: define policy path/schema, root containment, malformed-data handling, and config ownership.
- **Push to /plan, owner: planner**: count installation/validation surfaces and split further if caps are exceeded.

## No-gos

Worker launch, messaging, integration, remote execution, installation, credential handling, fabricated performance claims, or enabling a partial delegation path.

## Critique findings

Parent critique requires decomposition (A1) and runtime verification (A2). Apply K1–K4: distinguish launch from completion, never infer settlement from age/PID, and independently review the preflight gate before relying on it. Policy/preflight fixtures must cover each harness and refused/malformed configuration. Parent records full findings and dispositions.

## Bet decision

☑ **Bet** — user said “next” on 2026-10-07 after online verification; proceed to foundation planning.
☐ **Re-shape** — revise boundaries.
☐ **Pass** — park.

Foundation bet accepted; impact and plan approved by the user on 2026-10-07. Separate big-batch build-start gate pending. Dispatch remains separately gated.
