# Deviations: readme-split

| Scope | Plan | Reality |
|-------|------|---------|
| S2 | fast subagent | Done inline: one mechanical script run, no dispatch overhead needed. |
| S2 | docs get "one-line purpose" | Not added: avoids new prose; each doc's first paragraph serves. Back-link + See also only. |
| S3 | README keeps Set up 2 steps | Plus 2 sentences of pointer text and link to `setup.md`. |
| S4 | README-links-docs check in doctor | Implemented as `docsLinkCheck` using `docs-links.js`; also syntax-checks the new script and test. |
| S4 | `workflow-doctor\.js --fix` check | Retargeted to `--fix` in `workflow-doctor.md`, since the original phrase lives in `extending.md`. |
| S2 | text moved verbatim | Removed the word "below" from 3 cross-links that no longer point below. |
