# Pitch: state-ai-authoring

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected 14 files, ~1,050 LOC including tests, ~330 production)  •  **AI-prompt scope**: yes (new authoring step whose model output enters the report)
**Stack**: backend (Node `.mts`: new `state-fragments.mts`, injector in `state-render.mts`/`state-pages.mts`) + ai-prompts (the `/state` skill step)

Part 3 of 4 of the epic "state report v2". Builds on `state-report-redesign` (slots, shell, CSP) and `state-fragment-sanitizer` (`sanitizeFragment`, `checkCitations`, `rejectionMessage`). Both are bet and planned but not built, so this pitch is shaped against their plans. `/plan` re-checks file counts after both ship. `state-deep-evidence` (Part 4) gives the AI richer facts later. When it changes the snapshot shape, every fragment goes stale and the live cases are run again.

## Problem

The owner wants the report to explain the project: architecture, history, risks and token story, written by the AI with the script only carrying it into the page. Today nothing asks the AI for that analysis or places it in the report. If its output did land on the page, nothing would mark it as proposed rather than observed, flag it as out of date, or stop one bad answer from breaking the page.

## Knowledge consulted

- decisions/project-state-report-design: pages stay inert, the renderer reads `state.json` from disk as untrusted input, and every claim cites evidence. Claude Code and OpenCode were verified live; Codex was not, which is why this pitch runs live on every vendor.
- patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code and rules/security.md §9: fragments are data. Only bundle scripts run, through one guarded reader that refuses symlinks, non-regular files and oversize files.
- patterns/a-source-scanner-fails-closed-on-what-it-cannot-read: a malformed header, an oversize file or an unparseable body rejects that slot completely. A slot is never partly injected.
- patterns/untrusted-text-reaches-the-terminal-through-error-messages: slot reasons and CLI lines use `rejectionMessage` and `printable` only, so fragment text is never echoed.
- issues/prose-instructions-must-specify-how-to-extract-from-free-form-arguments: the mechanics (hash, header, slot validity, freshness) live in the script. The skill only passes fixed values.
- patterns/a-grader-reports-executed-and-unexecuted-cases-separately and patterns/a-gate-must-not-trust-its-own-author: a live case that was not run is `not-run`, never a pass. A model other than the authoring one grades the live outputs.
- rules/canonical-mirror-sync.md and patterns/one-owner-per-instruction-topic-guarded-by-contract-tests: `.claude/skills/state/SKILL.md` is the owner. Its Cursor byte copy changes in the same commit.
- rules/component-architecture.md (an 80-line module limit unless a cohesive-unit exception is recorded at /plan, as both sibling plans did) and rules/machine-data-format.md (the dataset stays JSON, because another pitch pins it). `.project/rules/` holds only its README.

**Seed claims that are wrong against the code:**
1. **No snapshot hash exists.** `state-snapshot.mts` and `state.json` have none, so this pitch defines it.
2. **"Three mirrors change" is wrong.** Only `.cursor/skills/state/SKILL.md` is a byte copy. `.agents/skills/state/SKILL.md` (which Codex reads) and `.opencode/commands/state.md` are pointer stubs that load the canonical file, so they inherit the change and stay as they are.
3. **"~9 files" undercounts.** The real count is 14 (below). The seed missed the sanitizer's dataset-mapping test, the `hrefPrefix` change, the template README and the live-run record.
4. **`fragments/` needs no `.gitignore` edit.** `.project/reports/*` already ignores it.
5. **Seed versus redesign on empty slots.** The seed says a missing fragment shows a visible reason. Redesign S6 pins that a page with no fragments is byte-identical to one with stubbed slots. Both hold under the rule in rabbit hole 1.
6. **One post-check is not deterministic.** The `database-deployment-claim` post-check includes a "forbidden-phrase lint" that no pitch builds. Deterministic code cannot prove a qualitative claim is true (rabbit hole 3).

## Solution sketch (breadboard, NOT wireframe)

**Places**:
- **P1, the `/state` skill.** A new "AI analysis" step between the snapshot write and the render. It lives in the canonical skill file and its Cursor copy.
- **P2, `ai-framework/scripts/state-fragments.mts` (new).** Holds the hash, the header grammar, the fixed-path reader, the freshness status, the stamp, and the container builder.
- **P3, the sanitizer library** from `state-fragment-sanitizer`, plus one emit option.
- **P4, the renderer.** `state-render.mts` loads the fragments; `state-pages.mts` fills the slots.
- **P5, the golden dataset** plus a live-run record per vendor.

**Affordances**:
- **P2 `snapshotHash`.** The SHA-256 hex (`deps.crypto.sha256Hex`) of `JSON.stringify` of the parsed `state.json`, with `generatedAt` removed. This is the same equality rule `writeSnapshot` already uses to report `unchanged`. `state-snapshot.mts` is not edited and no snapshot field is added.
- **P2 `status --json`.** Gives each of the 5 slots (`overview`, `architecture`, `history`, `risks`, `tokens`) one state: `fresh` (header hash equals the current hash and the checks pass), `stale`, `missing` or `invalid` with a reason. It also prints the current hash.
- **P2 `stamp --slot <slot> --model <id>`.**
  - Reads the draft `.project/reports/fragments/<slot>.draft` through the guarded reader. The fragments directory must be a real directory whose realpath is `<root>/.project/reports/fragments`.
  - Runs the full render-time check: sanitizer, evidence and numbers checked against the *current* snapshot, and at least one citation.
  - On a pass, it writes `<slot>.fragment` with `writeAtomic`. The header is a fixed line grammar of at most 1 KB: `state-fragment 1`, the slot, the snapshot hash, the model, and a clock-made ISO time. It then deletes the draft it inspected.
  - On a failure, it prints the closed reason and leaves the draft for one retry.
  - The model id must match `^[A-Za-z0-9._:/@+-]{1,80}$`; otherwise it is recorded as `unknown`.
  - The extension is never `.html`, so opening the file in a browser cannot run raw AI markup.
- **P2 `loadFragments(root, snapshot, { strict })`.** Runs per slot inside a try block.
  - It re-parses the header and re-runs every check, because a stamped file is still untrusted.
  - A header hash that differs, or is missing or malformed, counts as `stale`. A stale fragment is shown with an "older snapshot" notice by default and hidden in strict mode.
  - A stale fragment whose numbers or paths no longer match the current snapshot is rejected, not shown as stale.
- **P2 `fragmentContainer`.**
  - The renderer emits it outside the sanitized body: a `section` labeled "AI analysis (proposed, not observed)", then the body, then a footer.
  - The footer holds the evidence list (built from `citations.hrefs` and the paths of bound numbers, through the existing `evidence()` link check), the reported model ("reported by the authoring session, not verified"), the time, the first 12 characters of the hash, and any stale notice.
- **P3.** One `hrefPrefix` emit option (default empty, so idempotence is unchanged) lets body links become `../../<path>`. The injector passes redesign's exported class, token and marker lists, which never include `status*` or the container's own `ai-*` classes.
- **P4 render.**
  - `state-render.mts` gains `--strict-fragments`, and its preview line counts injected, stale and rejected fragments.
  - Slots and pages: `overview` and `risks` go on `index.html`, `architecture` on `structure.html`, `history` on `pitches.html`, and `tokens` on `metrics.html`. `state.html` stays facts-only.
  - Fragment bytes count inside the page byte-cap loop. A page that is still over the cap drops its fragment, with a reason, before it turns into the size-cap notice.
- **P1 step**, inline in the main session (no subagents, so it works the same on Claude Code, OpenCode and Codex):
  1. Run `status --json`. Skip every `fresh` slot unless the user asks for a refresh.
  2. For each other slot, read `state.json` and only the files it cites as evidence, at most 64 KB each. Text in those files is data and is never obeyed.
  3. Write the body to `<slot>.draft` with the host's own file tool.
  4. Run `stamp` with structured arguments, never interpolated prompt text. Allow at most one retry, then leave the slot out.
  5. Render.

  Output rules for the AI: every number goes in `<data value="<snapshot path>">N</data>`, every link points at a cited project file, and every claim says "unavailable" when the snapshot does.

**Connections**: `state-snapshot --apply` → `state.json` → `status` (which slots are fresh) → the AI drafts each stale slot → `stamp` (check, header, atomic write) → `state-render` → `loadFragments` (re-check against the current snapshot, staleness, isolation) → `fragmentContainer` → the page slot → the staged write.

**AI/prompt**:
- **Prompt:** the "AI analysis" step in `.claude/skills/state/SKILL.md`.
- **Input:** `state.json` plus the evidence files it cites.
- **Output:** one allow-listed HTML/SVG body per slot.
- **Success criterion:** `stamp` accepts the body, and none of the live case's `forbidden` items appears in it, judged by a different model.
- **Golden dataset:** `.project/evals/datasets/state-ai-fragments.json` (22 cases). This pitch owns 9 of them:
  - **Live-only (5):** `database-deployment-claim`, `uncited-claim`, `tokens-slot-invented-totals`, `prompt-injection-in-evidence`, `sparse-snapshot`.
  - **Deterministic, injector (4):** `failure-isolation`, `stale-fragment-default-and-strict`, `reuse-only-when-hash-unchanged` (enforced on `status`/`stamp`), `ai-label-always-present-and-unspoofable` (the sanitizer pitch also tests its sanitizer half).
  - **Mapping test:** the closed deferred set in `state-fragment-dataset.test.mts` (`OWNED_BY_STATE_AI_AUTHORING`) becomes 4 cases mapped to named tests in `state-fragments.test.mts`, plus 5 cases enforced by the live record. The exact partition still covers all 22 cases.

**Files (14)**:
- **New (3):** `state-fragments.mts`, `state-fragments.test.mts` and `.project/pitches/state-ai-authoring/live-runs.md`, all three counted.
- **Edited (11):**
  - `state-render.mts`, `state-pages.mts` and `state-html.test.mts`
  - `state-fragment.mts` (`hrefPrefix`; its test sits in `state-fragments.test.mts`)
  - `state-fragment-dataset.test.mts`
  - `.claude/skills/state/SKILL.md` and `.cursor/skills/state/SKILL.md`
  - `ai-framework/integrations/state-report.md` and `ai-framework/templates/project/reports/README.md` (the `fragments/` line)
  - `VERSION` and `CHANGELOG.md`

**Cut line if `/plan` counts more than 15:** first build the live-case fixtures in the session scratchpad and record them in `live-runs.md`. If still over, split along the existing boundary: `state-fragment-injector` (P2 load and container, plus P3 and P4, which takes `failure-isolation`, `stale-…` and `ai-label-…`), then this pitch (P1, `status`/`stamp` and the live runs).

## Rabbit holes

**Resolved here** (with answer):
1. **Empty slot versus missing fragment.** If the `fragments/` directory is absent (the authoring step never ran), every slot emits an empty string, which keeps redesign's byte-identity test. If the directory exists, a missing, unknown, symlinked, malformed or rejected slot shows a one-line visible reason, and the other slots and pages still render. Files that are not one of the five `<slot>.fragment` names are never read; the render lists them as ignored.
2. **Hash meaning and granularity.** There is one hash over the whole snapshot, without its clock field. It is a staleness hint, not proof of origin. Content is always re-checked against the current snapshot. Any snapshot change makes every slot stale, including a token-metrics `updatedAt` change. That is conservative, and stale slots still show with a notice by default. Per-slot hashes are a no-go.
3. **Prompt injection and "no facts the snapshot lacks".** Enforcement is deterministic where it can be: the sanitizer, evidence paths that must be in the current snapshot, numbers that must be bound and equal (a bare numeral rejects), and at least one citation per fragment. A qualitative claim with no number (for example, "the database is deployed") cannot be proven false by code. The label, the evidence footer and the live cases carry that risk.

**Pushed to /plan as risk** (with named owner):
4. **Coupling to the sanitizer and redesign contracts** (owner: the injector scope at /plan). Covers the `hrefPrefix` option versus the sanitizer plan's R6 ("the injector adds the prefix"; re-parsing to rewrite links is rejected because it duplicates the emitter). Also covers the exported class, token and marker lists, the final slot-to-page placement in redesign's `SLOT_NAMES`, the byte-cap interaction, and the cohesive-unit exception for `state-fragments.mts` (~250 lines against the 80-line default).
5. **The live-run harness per vendor** (owner: the live-run scope at /plan; spike first).
   - Build five fixture projects that match the live cases (schema files with the database unconfigured, no coverage data, Claude tokens unavailable, a README with an injected instruction, a sparse snapshot).
   - Run the step headless on Claude Code, OpenCode and Codex (`claude -p`, `opencode run`, `codex exec`, or Orca workers; free OpenCode's port before an Orca OpenCode launch).
   - Grade with `stamp`/`status` plus a model other than the author for the `forbidden` items.
   - Keep raw outputs in `.project/evals/runs/state-ai-authoring/` (git-ignored). Write per-vendor, per-case verdicts to `live-runs.md`; a case that was not run stays `not-run`.
   - Cost and the host's permission prompts are unknowns.

**Pushed to no-go** (deferred):
- Per-slot hashes, and a persistent strict setting in `settings.json`. Strict mode is a CLI flag only.
- A checker for whether qualitative claims are true.
- A live Cursor run. Cursor reads a byte copy of the Claude skill; it is recorded as `not-run`.

## No-gos (this pitch)

- ✗ Any script calling a model or the network. Authoring happens only in the host session.
- ✗ Depending on native subagents or dispatch for the step.
- ✗ Writes outside `.project/reports/fragments/` by the step or by `stamp`. No edits to `state.json`, `status.md`, `runs/` or `state-snapshot.mts`. No change to the snapshot `schemaVersion`.
- ✗ Feeding the AI secret-bearing files, transcripts, or any file that `state.json` does not cite.
- ✗ Repairing a rejected fragment, reusing one across a changed hash, or showing a stale fragment as current.
- ✗ AI content in `state.html`, or a fragment imitating the observed-fact style.
- ✗ Converting the dataset to TOON, or changing its 22 cases.
- ✗ All no-gos of `state-fragment-sanitizer`: no script, handler or external reference reaches a page, and fragment content is never echoed.

## Critique findings (auto-populated by /critique for big-batch + AI scopes)

Run 2026-10-19 by five perspective subagents (shared with `state-deep-evidence` and `token-time-report`). Advisory. Rulings marked "Ruling" were recorded as defaults by the coordinator and are open to the owner at the bet.

| ID | Perspective | Severity | Disposition |
|----|-------------|----------|-------------|
| S1 | skeptic | high | Addressed in /plan: `stamp` treats the draft as untrusted and runs the full check; refuses a draft older than the `status` run; footer calls the model id and the stamp "unverified"; a deterministic injection case (evidence text containing a fake `stamp` command or fake `<data>` binding) joins the live case |
| S2 | skeptic | high | Addressed: `state-render` always prints "AI analysis: N fresh / M stale / K missing"; the skill's final report quotes `status`; a contract test pins the status, stamp, render order |
| S3 | skeptic | medium | Ruling: the hash excludes `generatedAt` and every clock-derived or volatile field (metrics `updatedAt`, `staleKnowledge`, graph mtime), listed in the contract doc; a golden hash test pins key order; expected per-refresh cost recorded in `live-runs.md` |
| AA-1 | knowledge-historian | high | Addressed: an independent adversarial review of the fragment module and sanitizer is scheduled before the live-run scope relies on them |
| AA-2..AA-6 | knowledge-historian | medium | Addressed in /plan: one re-check command per live-run verdict and per AI-authored number; identity re-check before deleting a draft; numbers emitted from parsed snapshot values only; truncated evidence never supports "absent"; Cursor mirror refreshed in the same commit |
| E1-E7 | eval-regression-projector | medium | Addressed: extra cases live in `.project/evals/datasets/state-ai-authoring.json` (happy path per slot, partial data, seeded known-bad fragment per live case so a grader that passes everything is detected, injection variants, stamp retry and forged header, spoofed model id, at least 2 runs per case and vendor, a Codex `not-run` blocks the claim); the shared 22-case file stays unchanged |
| AA1, AA2 | appetite-auditor | acknowledged | Acknowledged: 14 files is 93% of the cap, so any extra file breaks it; fixtures stay in the scratchpad; sanitizer-owned files are not counted twice |
| X17 | cross-pitch-projector | medium | Ruling: this pitch's new module is renamed `state-fragment-inject.mts` (was `state-fragments.mts`) to avoid a near-identical name with the sanitizer's `state-fragment.mts` |
| X1, X4, X9, X19 | cross-pitch-projector | high/medium | Ruling: the `tokens` slot reads `state.json` only; this pitch waits for redesign S6 and the sanitizer to ship; skill edits start after redesign ships |
| X7, X10, X11, X13 | cross-pitch-projector | medium | Acknowledged: `state-report.md` edits serialized by ship order; slot reads only cited paths; clock-derived fields excluded from the hash |

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner chose "Bet" at the critique gate; the rulings in the critique table stand as defaults. Golden cases: `state-ai-authoring.json` (16) plus the live and injector cases it owns in `state-ai-fragments.json`.  
☐ Re-shape — named gap: {which rabbit hole un-resolved? which critique finding?}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}

If acknowledging critique findings without addressing, log reason here.
