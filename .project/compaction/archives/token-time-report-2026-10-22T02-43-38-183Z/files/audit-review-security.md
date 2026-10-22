# Audit review record: security

independent: not-completed
canary: caught
read-only: verified by review-bench guard-cycle1-check.json
prompt-sha256: 818cb9d7fc95524001543aa2d22d0789942ad7f3484d97334bad84829f6dfdb4
model: claude-sonnet-5-5
cross-file interactions: reviewed

Coordinator assessment: the scratch canary was cited and its failure reproduced. It is absent from the live source or pitch artifacts. "not-completed" preserves missing required evidence; a worker_done proves report delivery, not a clean review. First-wave security reviewer disclosed one live-file diff read; no live writes were detected.

The original first-wave guard is clean. The retry guard differs only in the coordinator's review-bench source/test repair and eight newly excluded secret-shaped paths; HEAD/status are unchanged and no reviewer edits were detected. No secret contents are included in this record.

Exact prompt: `.project/metrics/token-time-report-audit/prompt-security.txt`. Scratch manifest: `/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-security-xw9izqee.manifest.json`. Dispatch/completion/release receipts remain under the same local evidence directory. Coverage-retry resource release was retained with reason `user_takeover`; the human-owned terminal was not closed or retried. All nine attempt ledgers are settled after accepting their own completion messages.

## Verbatim worker report

Worker self-assigned metadata and verdicts below describe the scratch copy; the coordinator assessment above governs completeness and independence.

# Security audit: token-time-report (flow-join, flow-report, flow-render, review-bench)

Model: claude-sonnet-5-5. Reviewer: security-reviewer role, read-only. All reads, commands and proofs of concept ran with the scratch directory as cwd (`/var/folders/77/m2rbzn2n14q3jc82w4lzjj800000gn/T/ttr-audit-security-xw9izqee`). The only files written are POCs under `poc/` and this report.

independent: no (no canary planted)
read-only: verified by scratch-only cwd and absolute paths; no source or test edited
model: claude-sonnet-5-5
cross-file interactions: reviewed

One slip to disclose: while checking whether the scratch copy matched the live checkout I ran `diff -q` on `flow-render.mts` against the live file, which is a read of one live file. It reported that the two differ. I did not inspect the live file further. The findings below describe the scratch copy only. If live has since been changed, F1 may already be fixed there and the coordinator should re-run the two failing tests against live.

## Findings

| tier | file:line | issue | failure scenario | fix | verified |
|------|-----------|-------|------------------|-----|----------|
| must-fix | `flow-render.mts:22-23` (consumed at `flow-report.mts:124`) | Rule: a gate must not trust its own author; plan S2 exit says existing generated filenames require the format's generator marker. `ownsFormat` returns `true` for every non-JSON format. `MARKER_START` (lines 16-19) is declared but never used. | A user's own `.project/metrics/flow-report.md` containing `# my own notes`, or a hand-written `flow-report.html`, is classed as "owned". `--apply` then renames the staged report over it and the user's file is lost. A symlink, FIFO or directory is still refused, but a regular file with arbitrary content is not. | In `ownsFormat`, return `MARKER_START[format].test(text)` for markdown and html. The regexes already exist. | Yes. The two scratch tests fail with this exact outcome: "generator ownership needs the exact format marker" and "existing unowned, linked, directory and FIFO targets are refused". The latter got `[0, "published flow-report.json, flow-report.md, flow-report.html ..."]` where `[1, ""]` was expected. POC `poc/a.mts` prints `ownsFormat("markdown","# my own notes\n") = true` and `ownsFormat("html","<html>mine") = true`. |
| should-fix | `flow-join.mts:149,306` | Plan: scrub credential-shaped values before every format. `trace[].class` goes through `label()` (the `SAFE` charset) but never through `safeText`. The `phase` and `scope` fields beside it are scrubbed. | A usage state whose trace class is `ghp_abcdefghijklmnopqrstuv` passes `SAFE` and is not redacted. It appears in the HTML trace column, in JSON, and in Markdown with `_` escaped. | Apply `safeText` to `t.class` at line 306, or scrub in `projectUsage`. | Yes. POC: `html has ghp_: true`. The usage reader's own validation of `class` was not checked (see Unverified). |
| should-fix | `flow-render.mts:74` with `flow-join.mts:45,80` | Plan S2: Markdown escapes cells and link syntax, with no active user-supplied link. `mdCell` does not escape `:`, `/`, `.` or `@`, and `SAFE` admits all four. | A token-store pitch or vendor label such as `https://evil.example/x`, `www.evil.example` or `a@evil.co` is written into `flow-report.md` unescaped. GFM renderers turn it into a clickable link. HTML is not affected, since `esc` emits text only. | Escape `:`, `/` and `@` in `mdCell`, or insert a zero-width break after `:` and `@`. Alternatively reject `://`, `www.` and `@` in `label()`. | Yes. POC output shows unescaped `https://evil.example/x`, `www.evil.example` and `a@evil.co` in table rows. |
| acknowledged | `review-bench.mts:182` | A tree file over 2 MiB is signed as `S:size:mtime`, not hashed. A same-size edit with the mtime restored is not detected. This is not part of the repaired cap. | Overwrite a 3 MB file in `ai-framework/` with one byte changed, then restore its mtime. `guard check` returns `clean:true`. | Hash large files in chunks, or document the limit in the guard. | Yes. POC: the check reported `clean:true` for the same-size, same-mtime edit. |
| acknowledged | `review-bench.mts:200-203` | A snapshot that is valid JSON but lacks `tree` or `head` fails with an engine TypeError message instead of a fixed one. The message is printable-sanitized and does not echo the input. | `{}` as the snapshot gives exit 1 and an engine message. | Add a shape check after `parseJson`. | Not run (reasoned from code). |
| acknowledged | `flow-report.mts:146` | Staged files are created mode 0o644. The parent directory is 0o700, so exposure is limited. | None under the normal layout. | Use 0o600 if the report should be private. | Reasoned from code. |
| acknowledged | `review-bench.mts:129` | `--test-cmd` runs an operator-supplied `node` or `bun` argument array. This is operator-trusted and already restricted to those two binaries. | Not an attacker path. | None. | Reasoned from code. |

## Test results

- `node --test flow-join.test.mts flow-render.test.mts flow-report.test.mts` in scratch: 41 tests, 39 pass, 2 fail (the two F1 tests above). The plan's Build verification rollup says S2 passed, so this contradicts it for the scratch copy.
- `node --test review-bench.test.mts`: 34 tests, 34 pass, 0 fail. This includes the oversized-snapshot refusal test and the symlink/FIFO/oversize guard-check test.

## review-bench checks

- Round trip: `guard snapshot` followed by `guard check` on an untouched repo returned `clean:true`.
- Edit detection: after appending to a tracked file the check returned `clean:false` with `changed:["ai-framework/x.txt"]`. The edit-detection gap above is for files over 2 MiB.
- Oversize writer refusal: `review-bench.mts:196` encodes the snapshot and fails at more than 16 MiB before `writeGuarded`. It is covered by the passing test "guard refuses an oversized snapshot before publishing it". I did not write a real 16 MiB snapshot by hand.
- Separate caps: `MAX_RECORD_BYTES` (256 KiB) is the default of `readGuardedAbsolute`, used by `canaryCheck` and `recordCheck` for the manifest, report and record. Only `guard check` passes `MAX_SNAPSHOT_BYTES` (line 200). This matches the stated intent.
- Symlink and FIFO protections: unchanged and still enforced. `readGuardedAbsolute` and `writeGuarded` use lstat and refuse symlinks and non-regular files. The tests above cover them.

## Checklist walk

security.md was not opened separately (see Unverified). The walk uses the role prompt's checklist.

| Item | Result | Evidence |
|------|--------|----------|
| OWASP 1 Injection | Checked, no finding | No shell string building. `review-bench` runs `git` through `runSync` with an argument array. `--since` is hex-validated and `--pitch` is `safeRelative`. Labels use a restricted charset. |
| 2 Broken auth | N/A | No authentication in these tools. |
| 3 Sensitive data | Checked, finding F2 | Secret-shaped label scrubbing exists. `class` is missed. Errors are fixed strings (`REASONS`, `failure()`). |
| 4 XXE | N/A | No XML. |
| 5 Broken access | Checked | Pinned directory identities and guarded fs on every call (`flow-report.mts:64-79`). Tests cover directory swaps. The path recheck-to-syscall race is a known accepted limit. |
| 6 Misconfiguration | Checked | CSP meta `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'` (`flow-render.mts:102`). Staging directory is 0o700. |
| 7 XSS | Checked | HTML output escapes every cell with `esc`. No script, no external resources, no user-supplied href. The Markdown autolink case is F3. |
| 8 Insecure deserialization | Checked | `JSON.parse` of untrusted files is followed by shape validation, bounded sizes (4 MiB) and a `RESERVED` key block. Maps are used for label-keyed storage. A deeply nested file raises an error that is caught and reported as a refused shape. |
| 9 Known vulnerabilities | N/A | No package manifests or dependency changes. Dependency tooling was not run. |
| 10 Logging | Checked | stderr messages are fixed strings. Raw rejected values are never echoed. |
| Guarded reads | Checked | `readText` opens with O_NOFOLLOW and O_NONBLOCK, compares identity after fstat and caps bytes. FIFO and symlink tests pass. |
| Ancestor, target and stage swaps | Checked | Exclusive `mkdir` staging, a pinned chain re-verified on every fs call, target reinspected before link or rename, cleanup only of owned staged files. Rename-over-target depends on the ownership check, which is F1. |
| Loss of user files | Finding F1 | See above. |
| Sanitized errors | Checked | `failure()` maps to a known list or an error code. |
| Known accepted limits | Not duplicated | Non-atomic set of three files, the recheck-to-syscall race, and the multi-table UA-styled HTML. |

## Cross-file interfaces

Reviewed: `flow-report.mts` to `flow-join.mts` (`projectTokens`, `projectUsage`, `projectHistory`, `joinFlowReport`) and to `flow-render.mts` (`renderFormats`, `ownsFormat`, `FILE_NAMES`), and to `workflow-metrics-state.mts` (`metricsDirectory`, `readText`, `readWorkflowState`, `withMetricsLease`, read in full for the relevant functions). The F1 defect crosses the interface between `flow-render.mts` (ownership) and `flow-report.mts` (`inspectOwned`). `state-pages.mts` links the fixed `.project/metrics/flow-report.html` through its existing `links` helper (line 132).

Not reviewed: `state-pages.mts` and `state-html.test.mts` beyond that one grep. I did not confirm the safe-link behaviour for present, missing and unsafe targets.

## Things I tried that did not work

- `timeout` is not installed on this macOS host, so the first test command failed to run. I re-ran it without `timeout`.
- My first review-bench POC used an inline zsh variable as the command and failed to start. I rewrote it as a script file and it ran.

## Unverified

- `ai-framework/rules/security.md` and `.project/rules/backend.md` were not read. The checklist walk uses the role prompt's list.
- The test files `flow-join.test.mts`, `flow-render.test.mts`, `flow-report.test.mts` and `review-bench.test.mts` were run but not read in full. The plan's "mutant" check (an in-memory mutant proving the ownership and ancestor-swap tests fail for the intended reason) was not confirmed.
- Whether the usage reader validates `trace[].class` upstream (F2 severity depends on it).
- A real 16 MiB snapshot round trip, and the exact 16 MiB boundary. Only the passing test and code reading cover it.
- Section 9 behaviour in `state-pages.mts` and `state-html.test.mts`.
- Cross-pitch contention and the `.project/metrics/token-time-report-audit/security-report.md` authorized path: I wrote the report to the scratch path the brief asked for and did not write to the live repository.

## Security summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 2 |
| acknowledged | 4 |

Checked: owned-file gate, scrubbing, Markdown/HTML escaping and CSP, guarded reads, ancestry pinning, review-bench snapshot caps, round trip, edit detection and refusals, with test and POC evidence listed above.
Unverified: see the list above.

Verdict: BLOCK, 1 must-fix finding requires resolution (F1, Markdown and HTML ownership check missing, which lets `--apply` overwrite a user's own `flow-report.md` or `flow-report.html`).
