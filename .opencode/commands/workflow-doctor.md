---
description: Diagnose the installed AI workflow and safely restore missing project-template artifacts without overwriting project files.
model: opencode-go/minimax-m3
---

Run `node ai-framework/scripts/workflow-doctor.js` and present its readiness verdict, feedback, and next action to the user. Explain every failure. Only run `node ai-framework/scripts/workflow-doctor.js --fix` after confirming that the user wants missing `.project` template artifacts restored; it never overwrites existing files. $ARGUMENTS
