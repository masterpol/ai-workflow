---
description: Diagnose the portable workflow and safely restore missing project template artifacts.
model: openai/gpt-5.6-luna
---

Run `node ai-framework/scripts/workflow-doctor.js` and present its readiness verdict, feedback, and next action to the user. Explain every failure. Only run `node ai-framework/scripts/workflow-doctor.js --fix` after confirming that the user wants missing `.project` template artifacts restored; it never overwrites existing files. $ARGUMENTS
