# Sub-pitch: state-html

**Date**: 2026-09-24
**Appetite**: big-batch, maximum 15 files / 1500 LOC / one week, including mirrors and tests.

## Problem

Deliver one bounded part of [project-state-report](pitch.md).

## Knowledge consulted

Use the parent pitch’s consulted sources and critique; inherited constraints apply.

## Solution sketch

Theme rediscovery, accessible escaped HTML, adapters and report validation.

Use the parent’s behavior contracts for this slice. Execute in listed dependency order. Count actual touched files at planning; split again before betting any scope that exceeds limits.

## Rabbit holes

Planner owns precise schema/interfaces, host dependencies, cross-slice contracts and sizing before implementation.

## Vendor acceptance

The parent’s all-vendor delivery requirement applies to this slice: every vendor available in the receiving project, currently Claude Code, OpenCode, Codex and Cursor here. Resolve the set from project configuration and registered adapters, not a fixed four-vendor list or the global upstream catalog. Shared core behavior must be host-neutral; any exposed skills, commands, agents or resources require adapters and parity checks for the entire project vendor set before the feature ships. Include these files and checks in appetite estimates.

## No-gos

Other slices and application implementation are excluded. No parent behavior contract may be dropped to fit appetite.

## Critique findings

Parent pre-bet critique applies. This decomposition addresses the scope-overrun finding; exact estimates remain a planning responsibility.

## Bet decision

Pending user: Approve / Revise / Back / Stop.

## Approval record

2026-09-24 — User selected **Approve** after the revision requiring all vendors available in each receiving project. Bet accepted for planning; build remains subject to the plan gate. This records the decision without changing the earlier pending-gate history.
