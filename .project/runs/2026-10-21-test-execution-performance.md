# Build log: test-execution-performance

- S1: full discovery returned 0 files. `runCli` overwrites `deps.proc.argv` with args only, so deriving the root from `argv[1]` fails. Fixed with `inferRoot(import.meta.filename)`.
- S1: real-launch tests under Node got exit 0 and no output from the child. Cause: `NODE_TEST_CONTEXT` inherited from the outer `node:test` run makes the child act as a subtest. Fixed: the command removes it from the child environment.

- S3: `changelog.mts` bumped VERSION 2.39.0 -> 2.40.0 on top of the uncommitted state-deep-evidence ship edits; both entries are in the working tree. The 5-file budget held; no README link was added to the new guide.
- Audit: symlinked parent directories bypassed lexical path containment; fixed with real-path comparison, which also fixed a symlinked `--root`. Acknowledged for /cooldown: no SIGINT/SIGTERM forwarding (A1), `--root` default untested directly (A2), `NODE_TEST_CONTEXT` leaks into the mutation test's outer script, not reproduced (A3). `review-bench guard` cannot read a 3.4 MB snapshot of this repo, so read-only was verified by git status.
