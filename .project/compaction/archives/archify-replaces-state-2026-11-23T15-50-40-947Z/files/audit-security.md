# Audit record: security review (cycle 1)

model: sonnet
independent: yes
canary: caught (planted in scratch-sec at facts-gather.mts:63, removing the symlink refusal; report cited :63-66; `review-bench canary-check` caught: true)
read-only: verified by review-bench guard snapshot/check on the repo (clean: true, headChanged: false) and a scratch copy
prompt-sha256: bf6a0088b4d4408bce275eed427f4f02eceeab241672873eafd0ee812c806210
cross-file interactions: reviewed
dispatch: fresh agent, Agent tool `security-reviewer`, 45 tool-call budget, scratch copy with 15 files plus AUDIT_DIFF.patch
Deviation: the prompt text sat in a file the agent was told to read first (outside the scratch dir) instead of inline.

| id | tier | file:line | issue | verified | disposition |
|----|------|-----------|-------|----------|-------------|
| SEC-1 | should-fix | facts-gather.mts writeReport | `mkdirSync(recursive)` ran before the containment check, so a hostile `.project` symlink got an empty directory created behind it | yes (reproduced on the real repo: outside dir held `reports`) | fixed: each directory is lstat-checked before the next is created; test + mutant killed |
| SEC-2 | should-fix | facts-gather.mts read() | only the leaf was lstat-checked; a symlinked ancestor inside the project was followed | yes (reproduced: fake status.md read as observed) | fixed: lstat at every path segment; 2 tests |
| SEC-3 | should-fix | facts-gather.test.mts:67-77 | test and code disagree on the symlink note | refuted: this is the planted canary's effect; the real code and its 11 tests agree | dropped |
| SEC-4 | should-fix | skill-source.mts validateLinks | the one-line regex hid links after escaped backticks or beside double-backtick spans | yes (regex probes reproduced) | fixed: per-line CommonMark-style scanner; 5 assertions; old regex mutant killed |
| SEC-5 | acknowledged | facts-gather.mts:68 | TOCTOU between lstat and read | n/a | acknowledged: needs a concurrent attacker, realpath check precedes the read |
| SEC-6 | acknowledged | clean() | redaction is heuristic; several families were missing from the copied list | yes (list compared with the old snapshot's) | fixed: all 20 old families restored, one assertion each; unknown Archify grammar for `@`, `=`, `&` stays unverified |
| SEC-7 | acknowledged | migrate.mts, records, .gitignore, workflow-doctor | none found | n/a | none |
