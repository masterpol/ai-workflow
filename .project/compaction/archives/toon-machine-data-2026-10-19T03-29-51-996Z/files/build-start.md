# Build-start brief — toon-machine-data

**Date:** 2026-10-18. **Appetite:** big-batch. **State:** awaiting `/build start` approval; no scope started.

Plan approved by the user's `/build` invocation after the plan gate. This gate authorizes starting **S0 only**.

## First scope and order

S0 (agent-load inventory) runs first and in the main session. It ends with `Decision: GO` or `NO-GO` in `inventory.md`.
After S0, S1 then S2 run sequentially. S3 and S4 may run in parallel after S2. S5 runs only on GO. S6 closes.
Big-batch: each scope stops at a per-scope gate with pasted command output; `/build end` is gated too.

## Limits

- 15 files, at the cap. Anything extra is a deviation entry; the one pre-approved exception is `integrations/orca-vendors.md` in S5.
- No `SKILL.md`, agent, Cursor copy, `instruction-compression.json`, `instruction-loading.test.mts` or `skill-defaults.*` edits.
- S4 and S6 wait while `instruction-compression` is still editing rules and shared exits (it is in S1 final verification now).
- No commit, merge, publication or downstream sync is part of this start.

## Orca

`orca-run start --phase build --vendor claude` returned `ready` (workers opencode, codex). No Run is bound for this pitch.
`instruction-compression` holds its own bound Run, so a new Run is created for this pitch before any dispatch (S3 ∥ S4 only).
OpenCode port is freed before any OpenCode worker. S0–S2 need no workers.

## Known risks / stop conditions

S0 may return NO-GO (nothing existing is agent-loaded): then S5 is dropped and the owner is told before S6.
A parser safety failure in S1 (prototype keys, quadratic scan, refusal read as absent) stops S2 onward.
