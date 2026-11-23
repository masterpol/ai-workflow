# Shipped: archify-replaces-state
Bet: 2026-11-23  •  Shipped: 2026-11-23  •  Appetite: epic decomposed into 3 big-batch slices (S3 split in two); within budget, all in one session

Release: 2.51.0 (the `/state` rebuild), 2.51.1 (the Orca runner fix that was done first) and 2.51.2 (Orca mode made tolerant of CLI output drift between minor releases, added at the owner's request before ship; not part of this pitch's scopes and not covered by `/audit`, but covered by 7 mutants, the full suite and a live run of all 12 phases on Orca 1.4.271). The two Orca entries are a separate change from the `/state` rebuild.

## Scopes
| ID | Status | Hill done | Notes |
|----|--------|-----------|-------|
| S1 | shipped | 2026-11-23 | Validate Archify v3.3.0; verdict KEEP, conditional on four prerequisites; `findings.md` |
| S2 | shipped | 2026-11-23 | `facts-gather.mts` + 11 tests, skill, contract and vendor mirrors rewritten, Archify installed pinned. Deviation: its "full suite 0 fail" exit could not hold alone because 20 old tests pinned the replaced wording; S3a closed it |
| S3a | shipped | 2026-11-23 | 25 `state-*.mts` and 3 datasets deleted; 3 consumer tests, the doctor list and 2 comments re-pointed (moved forward from S3b); 5 shipped outcome records retargeted with owner approval |
| S3b | shipped | 2026-11-23 | README, `workflow-metrics.md`, followups, `migrate.mts`; installed-project prune test; changelog 2.51.0 |

Audit cycle 1 (after S3b): 0 must-fix, 11 should-fix fixed, 1 open (below). Details in `audit.md`.

## No-gos honored
- ✅ no vendoring or forking of Archify: it is installed from the pinned commit through `add-skill` into git-ignored instance data
- ✅ no floating install and no auto-update at report time: pinned commit `af3aaf3c…`, `ARCHIFY_UPDATE_CHECK_DISABLED=1`
- ✅ the report never edits `status.md`, `runs/` or pitch records (it writes only `.project/reports/`)
- ✅ no second renderer kept: the old one is deleted
- ✅ no AI-prompt scope: the `state` skill is a playbook and the draft's text comes from the collector, so no golden eval case was required
- ⚠️ owner-approved exception: five shipped outcome records were edited (their `code:` link only), because the graph refuses missing link targets; the guardrail names only `pitches/`, `design/` and `_archive/`

## Rabbit holes
- ✅ resolved as planned: install footprint (22.5 MiB of 25, installed as-is by owner choice), untrusted input (raw HTML and `javascript:` rejected by Archify, captured text made inert by the collector), vendor wrappers git-ignored, update check off, metrics page dropped, facts rebuilt as panels
- ⚠️ surfaced new: `add-skill` link check mis-read inline code (fixed, then hardened after review); shipped records block deletion of the files they cite; `flow-report.mts` still reads a `state.json` history nothing writes; the Orca runner overlaps another pitch's planned edit

## Verification
`pre-ship-verify.mts` cannot run in this package-less bundle (known issue, owned by `package-less-ship-verification`), so the stack's real commands ran directly: full suite 2090 tests, 2087 pass, 0 fail, 3 skipped (after the Orca tolerance work; 2083/2080 before it); `setup-validator` READY; `workflow-doctor` READY (764 checks); `graphify --check`, `graphify-relations --check` and `changelog --check` exit 0; no secret files or credential shapes in the diff. There is no build, typecheck, lint or i18n command here (`stack.md`).

## Followups generated
9 items in `_followups.md` under "From archify-replaces-state (2026-11-23)", plus the "Superseded by archify-replaces-state" section.

## Knowledge
1 decision (`archify-renders-the-state-report`), 3 issues, 1 pattern, 1 pattern bumped; graph 131 entries, clean.

## Doc updates
README and `ai-framework/integrations/state-report.md` (rewritten), `workflow-metrics.md`, the four `/state` mirrors, `relations.toon`. ADR-worthy decision recorded as the knowledge decision above.
