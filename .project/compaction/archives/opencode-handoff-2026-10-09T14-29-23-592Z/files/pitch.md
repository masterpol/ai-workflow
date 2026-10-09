# Pitch: opencode-handoff

**Date**: 2026-10-08 • **Appetite**: small-batch (lite)
**Stack**: workflow tooling

## Problem

OpenCode's role in Orca multi-agent coordination is configured but unverified in this checkout; there is no handoff document capturing its current state, missing adapters, or live verification steps, so the next agent has to rediscover the gaps.

## Knowledge hit

- `ai-framework/integrations/orca-vendors.json` lists OpenCode as a worker for Claude/Codex coordinators.
- `ai-framework/integrations/harnesses.md` notes OpenCode sub-agent nesting and skill wrappers are unverified live.
- Active pitch `codex-orca-coordinator-parity` is blocked at critique with `launch-failed:unproven`; OpenCode has no equivalent tracking artifact.

## Rabbit holes

- What exactly fails when OpenCode coordinates or works as an Orca worker? → pushed to plan: document in the handoff file, then shape a fix pitch.
- `.opencode/` adapter directory is absent from this checkout; is it gitignored, never generated, or removed? → pushed to plan: investigate and record.
- Overlap with active `codex-orca-coordinator-parity` pitch? → resolved: this handoff is read-only context; implementation stays separate.

## No-gos

- Do not modify Orca core logic, launch gate, or reconciliation.
- Do not claim live OpenCode proof without running it.
- Do not duplicate the Codex parity pitch's scope.

## Exit check

`.project/context/opencode-handoff.md` exists, is inside root, under 200 lines, and documents: current OpenCode adapter state, Orca worker/coordinator configuration, known blockers, and next verification commands.
