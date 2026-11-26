---
id: config-defined-git-hooks-ignore-core-hookspath
type: issue
created: 2026-11-26
updated: 2026-11-26
tags: [security, git, hooks, subprocess, untrusted-content]
related: [git-against-a-workers-tree-runs-worker-code-unless-every-command-is-guarded, a-report-over-an-untrusted-tree-runs-only-bundle-code, a-gate-must-not-audit-its-own-instrument]
source: review-bench-hardening
severity: high
resolved: false
confidence: high
---

# Issue: Git hooks defined in configuration run even with core.hooksPath=/dev/null

## Symptom

With Git 2.54.0, `hook.<name>.command` plus `hook.<name>.event` in a repository's config ran the program during `git diff` (event
`post-index-change`), although every call passed `-c core.hooksPath=/dev/null`, `-c core.fsmonitor=false` and `GIT_OPTIONAL_LOCKS=0`. The same
diff also rewrote the index.

## How it was missed

The plan spike and the build checks tested file hooks, filters, monitors and submodules, all through routes that predate this one. An independent
security review found it.

## Fix and rule

`review-bench` refuses any `hook.*` key, read with `git config --includes` (not `--local`, which misses included and worktree settings) before any
command that can run it. Other callers in this repository that rely on `core.hooksPath` or `core.fsmonitor` were **not** tested; that is why this
card is unresolved (see the backlog). When Git adds a way to run programs, a list of disabling flags goes stale: check the installed version's
routes with a marker program.
