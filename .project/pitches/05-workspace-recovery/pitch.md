# Pitch: workspace-recovery

**Date**: 2026-11-25  •  **Appetite**: not set  •  **State**: draft, not shaped; holds what was cut from `workspace-slim` so it is not lost

## Problem

After the ignore fix, the remaining bulk is content that can only shrink by removing files: compaction recovery copies (this repo 913 files,
6.2 MB; LAH 405) and session evidence (climbing-lab: about 430 files, 3.5 MB of JSON, logs, images and CPU profiles). Removing them needs a
recovery record that points at Git (path, hash, commit) instead of a second copy, and proof that restore works.

## Findings to start from (critique of 2026-11-25, `../02-workspace-slim/critique/`)

- A failed proof after removal needs a whole-operation rollback, using the existing compaction journal (skeptic S1; historian K2).
- Recovery must be proven from a fresh clone after both merge styles. A commit already on the canonical main survives a later squash; a
  feature-branch commit may not. Refuse shallow and local-only ancestry (skeptic's assessment).
- Prior art: `legacy-upgrade.mts` `committedDestinations` already refuses shallow history and hashes blob bytes; it does not check main
  reachability. Working bytes can differ from blob bytes under line-ending or filter attributes (historian K3).
- `pitch-archive` `verify` and `restore`, `legacy-upgrade` and `done-work.md` read the archive layout: converting existing archives is a
  compatibility change of its own (historian K1; cross-pitch X4).
- Prefer extending `pitch-archive.mts` and `ledger-schema.mts` over a second archive tool (appetite A5).
- A file can be needed by a tracked test or dataset without a record link (eval E3; issue `live-test-evidence-outlived-its-pitch-path`).
- Refusal cases to bind to tests: unreachable commit, uncommitted or untracked content, linked or referenced files (eval E2).

## No-gos (carried)

- ✗ Nothing removed that Git does not hold on the main branch; no history rewrite; knowledge entries and rules are out of scope.
