# log: fix-instruction-conflicts

**Appetite**: bug-fix  •  **Opened**: 2026-10-17  •  **Source**: owner-supplied static analysis of instruction volume and
conflicts; triage approved by the owner's "execute" instruction. Restructuring and compression are **out of scope**
here (separate pitch `instruction-compression`, shaped, not bet).

Single implicit scope: make conflicting instructions agree, each with one authoritative owner, without removing any gate,
evidence requirement or permission boundary. Verification: focused contract tests (new `workflow-contracts.test.mts`),
Cursor mirror parity, workflow-doctor, setup-validator, both full suites (Node and Bun).

## Triage (each finding verified against the checkout before any edit)

| # | Finding | Contradictory sources | Failure scenario | Owner after the fix |
|---|---|---|---|---|
| A | Orca exit 3 treated as "continue normally" | `workflow/phases/3-audit.md:184`, `4-ship.md:117` ("or the command exits 3, continue with the normal single-agent path") vs the audit/ship/build skills ("exits 1, 2, 3 or 4 … stop and ask") and `orca-run.mts:281` (`exitCodeFor`: 3 = normal route, refused dispatch, rejected collection, non-integrated reconcile) | With Orca requested, a refused reconcile (exit 3) lets an agent following the phase spec ship un-integrated worker changes through the single-agent path | `integrations/orca-vendors.md` (outcome semantics) + the skill/phase stop rule |
| B | Security reviewer can edit and is told to remediate | `.claude/agents/security-reviewer.md` (tools incl. Write/Edit; "identifying and remediating"; "Verify remediation works") vs its own OpenCode adapter (`edit: deny`) and Codex adapter (`sandbox_mode = "read-only"`), and the audit reviewer contract (read-only by construction) | Claude/Cursor reviewer patches code in the repo during /audit; the same role is read-only on OpenCode/Codex | Canonical agent prompt (inspection/reporting); coordinator applies verified patches (audit loop) |
| C | "Output exactly No security findings." vs "End every security review with" a summary | same file, lines ~112-131 | A clean review omits the summary/verdict, or a review that could not finish reads as clean | Canonical agent prompt |
| D | Three size limits | `code-reviewer.md` (>800 lines; "200-400 typical, 800 max"), `rules/component-architecture.md` (project limit, 150 default, "hard"), `rules/coding-standards.md` (soft signal + cohesive exception; checklist <150 components / <80 utilities) | Reviewer passes a 600-line component the rules call a hard failure, or flags a documented cohesive unit | `rules/component-architecture.md` § Component Size Rules (limit) + `coding-standards.md` (cohesive-unit exception) |
| E | Build gate inconsistent | `.claude/skills/build/SKILL.md` table header "Build-start gate" + unconditional confirmation gate; `phases/2-build.md` "Gate at /build end" + "Confirmation gate (big-batch only)"; `overview.md` matrix has `/build start` and `/build per scope` rows but no `/build end` row; audit bug-fix "no" (`3-audit.md`) vs "auto if clean" (overview, audit skill) | Small-batch build stops for approval (skill) or bug-fix/hotfix build flows into /audit unconfirmed (phase heading) | `workflow/overview.md` matrix (adds the `/build end` row as the union of the sources, so no gate is removed) |
| F | Mirrors documented as pointers only | `docs/vendors.md` ("A mirror is a pointer, never a fork") vs committed Cursor byte copies (`skill-vendors.mts` `cursorMirrors`, which creates missing copies and never overwrites a differing one) | Maintainer edits a canonical file and leaves the Cursor copy stale | `docs/vendors.md` (both mechanisms + refresh procedure) |
| G | Entry-file and mode drift | `AGENTS.md`/`CLAUDE.md` header ("full mirror … not optional") vs `SETUP.md` and the setup skill (an existing `@AGENTS.md` import is accepted); `AGENTS.md`/`CLAUDE.md` "persistent change is an edit to `.project/skills/modes.json`" vs `integrations/skill-defaults.md` and `loadModes` (`ai-workflow.toon` `skills.modes.caveman` first); `config-migrate` note "modes.json stays authoritative" for per-phase modes vs `loadModes` (a valid toon drops them, d31); `skill-defaults.md` "override utility or agent in the legacy modes.json like any phase" without the toon caveat | Owner edits modes.json, nothing changes; or keeps per-phase modes after migration believing they still apply | `integrations/skill-defaults.md` (mode resolution) |
| H | AI-scope trigger by path | `shape`, `critique` skills and `eval-runner` description name `lib/ai/prompts/`; `phases/0-shape.md` uses "AI-prompt scopes" without a definition | A prompt kept elsewhere (e.g. `src/llm/`) skips /critique and the golden-eval gate | `phases/0-shape.md` (one behavior-based definition) |

## Build (2026-10-17) — done, awaiting the `/build end` gate (bug-fix: gated)

Fixed in the owners, with every other mention pointing at them; no gate, reviewer, evidence requirement or permission
boundary removed:
- A: `3-audit.md` / `4-ship.md` Orca blocks now match the skills (stop and ask; never fall back silently);
  `orca-vendors.md` exit table gains exit 4 and the full meaning of 3, plus "Exit code 3 alone never authorizes the
  normal path" with the off / bypassed / worker / ready / stop decisions.
- B/C: `security-reviewer.md` tools `Read, Bash, Grep, Glob`; inspect-and-report only, proofs of concept only in the
  scratch copy, coordinator applies verified patches; one summary for every review with `Checked`/`Unverified` and a
  `PASS | BLOCK | INCOMPLETE` verdict (unfinished is never PASS). Now consistent with its OpenCode/Codex adapters.
- D: `component-architecture.md` § Component Size Rules is the single owner (project limit, else 150 / 80 / 50; the
  cohesive-unit exception is the only way past it); `coding-standards.md` and `code-reviewer.md` point at it (800 gone).
- E: `overview.md` matrix gains `/build end` (auto / gated / gated / gated) and declares itself the owner; build skill
  and `2-build.md` drop their own tables (the skill's said "Build-start" where the spec said "end") and gate on that row;
  `3-audit.md` bug-fix row matches the overview.
- F: `docs/vendors.md` documents pointer mirrors (OpenCode/Codex) and byte-copy mirrors (Cursor) and the supported
  refresh procedure (`cursor-mirrors` lists `differs`; copy the canonical file); `skill-defaults.md` no longer implies
  `cursor-mirrors` re-syncs differing copies.
- G: `AGENTS.md` and `CLAUDE.md` (identical edits) accept the `@AGENTS.md` import alternative and name
  `skills.modes.caveman` in `ai-workflow.toon` for a persistent mode; `config-migrate` note says per-phase modes stop
  applying once the toon exists (d31); `skill-defaults.md` scopes per-phase overrides to "only when no
  `ai-workflow.toon` exists".
- H: `0-shape.md` defines "AI-prompt scope" by changed model behavior, wherever the files live; shape, critique,
  shape-lite and eval-runner use the term with `lib/ai/prompts/` only as an example.
- Cursor copies of the 7 changed canonical files refreshed (`cursor-mirrors`: 0 created, 0 differs).

Evidence:
- Regression tests `ai-framework/scripts/workflow-contracts.test.mts`: 7 of 8 failed before the edits (A–H; the
  mirror-parity test passed), 8/8 pass after, on Node and Bun.
- Full suites: Node 1685/1687 pass, 0 fail (2 skipped: Windows-only, Bun-only); Bun 1682/1684 pass, 0 fail.
- workflow-doctor READY and setup-validator READY on Node and Bun; docs-links 25 files, 0 broken.
- Not verified: live agent behavior on any vendor (static checks only). The behavior cases are part of
  `instruction-compression`.
