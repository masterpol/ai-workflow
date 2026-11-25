---
id: a-workflow-command-can-be-shadowed-by-a-host-built-in
type: issue
created: 2026-11-25
updated: 2026-11-25
tags: [commands, skills, harness, vendors, upgrade]
related: [prove-ownership-by-shipped-content-before-removing-a-renamed-file, installed-skill-wrappers-ship-as-orphans]
source: rename-ship-command-to-finish
severity: high
resolved: true
---

# Issue: a host added a built-in `/ship`, and the workflow's command of the same name stopped loading

## Symptom
Typing `/ship` ran Claude Code's built-in instead of the workflow's close-out: it pushed the branch, opened a pull request and started a code review, and none of the ship playbook ran.
Asking the model to run it answered that a custom `/ship` is not loaded because a built-in has that name. Nothing in the doctor or tests could see it.

## Fix and rule
- The command is `ship-pitch`; the **phase** keeps the name `ship` wherever it is data, so stored metrics and records still line up. One module maps command to phase for every hook.
- A command name and a phase name are different things; keep them apart from the start.
- A guard test refuses the old command and path in bundle-owned text. Searching for a command form needs care: the first search missed uses at the end of a sentence and one vendor folder.
- Not covered: nothing checks the other commands against host built-ins (followup).
