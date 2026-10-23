---
id: untrusted-text-reaches-the-terminal-through-error-messages
type: pattern
created: 2026-10-16
updated: 2026-10-16
tags: [security, output, terminal-escapes, prompt-injection, errors]
related: [a-gate-must-not-trust-its-own-author, unified-toon-config-schema-v2]
source: unified-toon-config
confidence: low
---
# Pattern: a refusal message that echoes a file value is an output channel

## Summary
A version refusal put the raw `schemaVersion` value in its text. Three tools printed it unfiltered, so escape bytes could set the window title, clear the screen or carry instructions into an agent's context. The first audit cycle fixed the migrator's key labels but missed this path, and the second found it.

## The Pattern
- Never interpolate a parsed value into an error message; show a type, a count or a small validated integer.
- When a value must be shown, JSON-quote it, strip non-printable characters and cap its length.
- Audit every printer of a shared error, not only the producer: the same text reached `skill-defaults`, `config-migrate` and `setup-validator`.
