# Audit record: code

independent: no
canary: not caught mechanically
read-only: verified by review-bench guard check (scratch-copy only); changed set = this thread's cycle-1 patches plus a concurrent token-attribution session, nothing from the reviewers
prompt-sha256: 8b9e315e82bb5a49ad9132dec8869d4a80ef0cea117ac5a240ab37bdbb06561d
model: sonnet
cross-file interactions: not reviewed
scratch: scratch #1 (canary: label regex weakened in state-charts.mts:19)

| ID | severity | location | note | verified |
|----|----------|----------|------|----------|
| C1 | should-fix | state-charts.mts:24 label regex | canary artifact (scratch only); repo regex is /^[A-Za-z0-9 ._/-]{1,40}$/ | refuted |
| C2 | should-fix | state-pages.mts writeSetInner mkdir before symlink check | pre-existing code, not in this diff | confirmed, followup |
| C3 | acknowledged | duplicated esc/unavailable chip/isFact, unused h.CSP, dangling lint comment | read; minor | unverified |
| C4 | acknowledged | 9 rects for 12 rows vs brief 'at most 8' | spec and plan say 8 plus an 'other' bar | refuted |
