---
description: Compact a shipped pitch's full history into durable knowledge and a compact done-work record, with a coverage ledger, an immutable recovery archive, and transactional deletion. Trigger phrases include "pitch compress" and "/pitch-compress".
model: openai/gpt-5.6-terra
---

Load `.claude/skills/pitch-compress/SKILL.md` and follow it exactly. Never skip a step: extract → commit a complete coverage ledger → archive and verify → human approves the specific preview → only then delete. Every mutating step requires `--apply`; nothing here is ever automatic. $ARGUMENTS
