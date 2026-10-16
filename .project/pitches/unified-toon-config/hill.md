---
slug: unified-toon-config
date: 2026-10-16
phase: plan
---

# Hill: unified-toon-config

> 13 scopes. Build order is mandated, not derived (a → c → b → d). Each scope moves
> `uphill 0%/25%/75%` → `over-the-hill` → `downhill 25%/75%` → `done`. Update this file
> per-scope; never per-task.

| ID  | Title                                        | Position | Notes |
|-----|----------------------------------------------|----------|-------|
| a1  | `config.mts` primitives                       | over-the-hill | Consumer verification by a2 mutants: errorCodes.foo contracts asserted and passed; two a1 reader-context remaps applied. |
| a2  | `config.test.mts` parser mutants              | uphill 25% | 7 parser-guard mutants implemented; all exit criteria green; a1 contract verified. |
| a3  | Writer/path mutants + alias + subprocess     | over-the-hill | 5 writer/path mutants (each proven to bite via manual source mutation), 4 alias tests, K2-3 subprocess, lock contention + stale recovery green; TOON fixture writer in `test-helpers.mts`. 9-site tempFixture audit carried to c1.2 (d10). |
| c1.1| runtime/orca reader glue + grader rewire      | uphill 0% | Deps: a3 |
| c1.2| Reader tests + grader no-race                 | uphill 0% | Deps: c1.1 |
| c2.1| Doctor validators + setup-validator          | uphill 0% | Deps: a1 (parallel with c2.2 / c2.3 after c1.1) |
| c2.2| Root docs rewrite                             | uphill 0% | Deps: a1 (parallel with c2.3) |
| c2.3| Framework docs + build SKILL mirrors         | uphill 0% | Deps: a1 (parallel with c2.2) |
| c2.4| Hooks cutover                                 | uphill 0% | Deps: c1.1 (parallel with c2.1/c2.2/c2.3 if file sets disjoint — verified) |
| b1  | Migrator CLI prod                             | uphill 0% | Deps: c1.1 (loadConfig exists) |
| b2  | Migrator functional tests                     | uphill 0% | Deps: b1 |
| b3  | Migrator guard proofs + Bun-adapter gate      | uphill 0% | Deps: b1 (parallel-with b2; reads b1's exports) |
| d   | Legacy retirement                            | uphill 0% | Deps: all (no scope deletes a legacy file until d lands) |

## State transitions

| from → to         | Trigger                                       |
|-------------------|-----------------------------------------------|
| uphill 0% → 25%   | branch cut, deps known, contracts read        |
| uphill 25% → 75%  | partial implementation, tests start passing   |
| 75% → over-hill   | scope's producer-side invariants hold         |
| over → downhill 75%| consumer verification (other scopes' deps)  |
| downhill → done   | every machine-checkable exit criterion green |

## Block / re-plan triggers

- a1 blocked on branch-gate if `git status --porcelain` lists any of the 4 dirty files.
- Any scope blocked on another scope that is NOT yet `over-the-hill` — escalate to /plan.
- Diff criterion violation (X12): scope that edits a non-allowlisted `orca-*.mts` is blocked.
- A-scope ordering violation (a2 starts before a1; a3 starts before a2; etc.) — blocked.
- Cross-pitch hotspot edits (`orca-policy.mts`, `orca-launch-gate.mts`,
  `orca-eval-grader.mts`, `build/SKILL.md`) outside the allowlisted change surface — blocked.
