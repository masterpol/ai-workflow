---
name: state
description: Report what this project is and where it stands — workflow version, pitches, knowledge, skills — as an evidence-backed page rendered by the installed Archify skill, separating observed facts from proposed analysis and unconfigured areas. Trigger phrases include "project state", "state report", and "/state".
---

# State

Load `.claude/skills/state/SKILL.md` and follow it exactly. Run `node ai-framework/scripts/facts-gather.mts` (and `--explainer state.explainer.json`, then Archify `validate` and `deliver`, only when Archify is installed at the pinned revision), report by fact status (observed, proposed, stale, unavailable, unconfigured), and never claim a database, metrics or counts the facts do not show.
