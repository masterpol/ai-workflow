# Pitch: state-fragment-sanitizer

**Date**: 2026-10-19  •  **Appetite**: big-batch (≤15 files; projected ~6 files, ~1,000 LOC)  •  **AI-prompt scope**: no (deterministic code); the golden dataset also serves `state-ai-authoring`
**Stack**: backend (Node `.mts`)

Part 2 of 4 of the epic "state report v2", after `state-report-redesign`. Split from the first draft `state-ai-fragments` after critique B2. `state-ai-authoring` (skill step, injector, provenance, staleness) follows. `state-deep-evidence` feeds the AI richer facts.

## Problem

The owner wants AI-written HTML and SVG (diagrams, analysis) inside the report. AI output is untrusted input, and the owner chose to accept raw markup rather than a structured spec. Until a sanitizer exists that provably refuses everything dangerous, none of that content can enter a page that today is inert.

## Knowledge consulted

- decisions/project-state-report-design — inert pages, CSP, facts with evidence.
- patterns/parse-untrusted-values-and-re-emit-them; patterns/a-report-over-an-untrusted-tree-runs-only-bundle-code; patterns/a-gate-must-not-trust-its-own-author.
- patterns/untrusted-text-reaches-the-terminal-through-error-messages — rejection messages never echo content.
- patterns/a-source-scanner-fails-closed-on-what-it-cannot-read — unparseable or capped input rejects the whole fragment.
- issues/backtracking-regex-over-untrusted-text-is-quadratic; issues/guard-tests-can-fail-for-the-wrong-reason — one attack vector per test, assert the named reason, include positive controls.
- issues/reviewer-reports-contradicted-by-measurement — numbers in a fragment are checked against the snapshot.
- patterns/local-eval-data-is-gitignored — datasets are tracked; `.project/evals/datasets/state-ai-fragments.json` is untracked and must be committed.
- Owner decision (2026-10-19): the AI writes SVG/HTML directly; the script sanitizes and injects.

## Solution sketch (breadboard, NOT wireframe)

**Places**: P1 fragment parser (new module); P2 allow-list and validator (new module); P3 evidence-path and number checker (reuses the shared evidence-path check); P4 mutation list and positive controls (tests); P5 golden dataset.

**Affordances per place**:
- P1: strict, well-formed XML-subset parser, no HTML error recovery; iterative (no recursion), depth cap ~20, caps on nodes, attributes, attribute length, `path d` length; rejects DOCTYPE, entities, processing instructions, CDATA, comments, `<math>`, `<template>`, namespace prefixes; linear time.
- P2: element and attribute allow-list (headings, paragraphs, lists, tables, `code`, `a` to project files, SVG shapes, text, paths, groups, `title`, `desc`, markers from a fixed design-system set); refuses `animate`, `set`, `use`, `style` (element and attribute), `foreignObject`, `image`, `iframe`, `object`, every `on*`, `id`, any `url()`, `javascript:` or external reference; classes and colors map to design-system tokens only; output re-emitted from the tree with all text and values escaped; `sanitize(sanitize(x))` is byte-identical.
- P3: every cited evidence path must exist in the snapshot and pass the shared check (no `..`, absolute, `//host`, backslash, `file:`, percent-encoded traversal, symlink, secret-bearing or transcript path); every stated snapshot number must match.
- P4: table-driven, one vector per case, each asserting the named reason; positive controls so over-rejection also fails; a timed fuzz test (deep nesting, huge attribute, unclosed construct).
- P5: dataset of 22 cases (deterministic cases enforced here; live-only cases used by `state-ai-authoring`).

**Connections**: untrusted fragment text → P1 parse (or reject) → P2 validate and re-emit → P3 evidence and number check → sanitized markup returned to the caller, or a rejection with a class, a count and a capped, stripped token only.

## Rabbit holes

**Resolved here** (with answer):
- Deny-list versus allow-list → allow-list; every attack class in the critique becomes a mutation case.
- Parse differential (sanitizer tree versus browser tree) → no HTML error recovery; reject fragments that rely on it; re-emit from the tree only; idempotence test.
- Rejection messages leak attacker text → class, count and capped, stripped token only.
- Repair versus reject → reject the whole fragment, keep earlier findings, never pass an unparseable one.

**Pushed to /plan as risk** (with named owner):
- Hand-written parser size (upper estimate 800+ lines) could break the cap; a security spike first, and a budget of lines for the parser — owner: S1.
- Fixed marker set and token class list come from `state-report-redesign`'s design system; sequence after it — owner: S2.
- Whether to cite the browser behavior list from the critique as fixtures or add a small cross-browser check by hand — owner: S1.

**Pushed to no-go** (deferred):
- Fragment authoring, injection, provenance label and staleness (`state-ai-authoring`).
- Any HTML5-tolerant parsing, scripts, interactive diagrams, Mermaid.

## No-gos (this pitch)

- ✗ Any path that lets a script, event handler or external reference through.
- ✗ Trusting the AI's own statement of safety.
- ✗ Writing anywhere but returning a result; this pitch never touches a report file.
- ✗ A runtime dependency without an explicit owner decision.
- ✗ Echoing fragment content in any error text.

## Critique findings

Critique ran 2026-10-19 (shared with `state-report-redesign`, on the first draft). Findings that apply and where they are handled: skeptic S1-S4 (allow-list, parse differential, limits, evidence paths) in P1-P3; knowledge A1-A5 and eval E1-E10 in P2-P5 and the dataset; appetite B1-B2 produced this split. Dataset commit (A5) is an open action at bet.

## Bet decision

☑ **Bet** (→ /plan) — 2026-10-19, owner approved "bet all three shaped pitches, plan in order" after critique. Open action: commit `.project/evals/datasets/state-ai-fragments.json` (A5) once the owner asks for a commit.
☐ Re-shape — named gap: {…}  
☐ Pass — moved to `.project/pitches/_parked/{slug}/`; reason: {…}
