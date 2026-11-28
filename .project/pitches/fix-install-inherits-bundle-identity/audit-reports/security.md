# Security review of the setup-validator identity gate

**Disposition:** The visible change fails its own regression. The two entry-file reads and their diagnostics also have pre-existing violations of the project-tree security rules. The scratch source and CHANGE.patch both use the same prefix test, so the test result and the review apply to the visible patch. This review covered the entry checks and their immediate call paths.

## Findings

### High / ai-framework/scripts/setup-validator.mts:140 / planned identity gate in .project/pitches/fix-install-inherits-bundle-identity/log.md:5

The patch checks the start of the entire file rather than checking whether the effective text contains the identity. An untouched copy has the identity at line 146 in both files. A full mirror and a merge with a preserved introductory section therefore pass the identity predicate. With an accepted one-line Claude import, the checked string starts with the directive, followed by the full contents of AGENTS.md. The installed-project regression returned success with both stale entry files.

Command ran in the scratch root:

~~~sh
bun test --test-name-pattern 'an install that kept|bundle.s own entry files still carry|bootstrap CLAUDE' ai-framework/scripts/setup-validator.test.mts
~~~

Observed output, excerpt:

~~~text
(pass) bootstrap CLAUDE.md fails; invalid @AGENTS.md import reports the library detail
AssertionError: Expected values to be strictly equal:

0 !== 1
(fail) an install that kept the bundle's own project specifics fails; the bundle checkout itself passes
(pass) the bundle's own entry files still carry the identity sentence the install check looks for
2 pass
27 filtered out
1 fail
~~~

The failure is at ai-framework/scripts/setup-validator.test.mts:188. The test exits before exercising its bundle exception. Source evidence for imports and merges came from `nl -ba ai-framework/scripts/setup-validator.mts` and `nl -ba ai-framework/scripts/entry-import.mts`. The relevant lines were 155–168 in the validator and line 66 in the resolver, which returns the original text followed by the imported text.

### Medium / ai-framework/scripts/setup-validator.mts:139 / security.md:249 guarded inspection and the portable-bundle classification

Existence of a project-controlled SETUP.md is enough to turn the entry identity check off. A target can legitimately have its own setup guide. The helper can also report presence for links and non-regular paths. This follows the pitch's explicit SETUP.md convention for real guides. Acceptance of other path types follows from the implementation, and the filename alone cannot establish trusted origin. This is an entry-gate finding. The doctor enables additional checks when SETUP.md is present, so whole-validator success with this shape is unverified.

Commands were `nl -ba ai-framework/scripts/setup-validator.mts | sed -n '1,210p;275,365p'` and `rg -n 'inPortableBundleRepo|function exists\(' ai-framework/scripts/workflow-doctor.mts`. The validator printed `const install = !(await exists("SETUP.md"));` at line 139 and the existence-or-directory-listing expression at 106–107. The doctor reported the analogous classification at line 1038 and additional checks at lines 1092–1096 and 1118.

### Medium / ai-framework/scripts/setup-validator.mts:143 and ai-framework/scripts/setup-validator.mts:151 / security.md:249 and :253 guarded, bounded entry reads

An entry supplied as a symlink can be read through an unchecked target. A FIFO can stall the Node read and an oversized regular file is read before any bound. The validator then applies regular expressions and the resolver scans the unbounded CLAUDE.md. The import resolver checks the target's type, containment and size, but this happens after the primary AGENTS.md read, and the parallel response-style check also reads both entry files through an unguarded helper. The import check uses an ordinary pathname read after inspection, so file replacement between check and read remains possible by inspection. These are existing read paths retained by the patch.

Commands were `nl -ba ai-framework/scripts/setup-validator.mts | sed -n '1,210p;275,365p'`, `nl -ba ai-framework/scripts/entry-import.mts`, and `rg -n 'readFile:|exists:' ai-framework/scripts/runtime/node.mts`. The output showed direct `deps.fs.readFile` at validator lines 143 and 151, another direct `deps.fs.readFile` at resolver-helper line 71, and Node `fsp.readFile(file, "utf8")` at line 345.

For the narrower import-target control, I ran:

~~~sh
bun test --test-name-pattern 'resolved through injected deps|injected deps: a target|effectiveEntryText follows' ai-framework/scripts/entry-import.test.mts
~~~

The three tests passed. The simulated out-of-root target, symlink, non-file, oversized target and missing target were all rejected without a target read. Direct reads and check-to-read races were reviewed statically. Real filesystem behavior is unverified.

### Medium / ai-framework/scripts/setup-validator.mts:156 and ai-framework/scripts/setup-validator.mts:308 / security.md:259 and :264 safe diagnostics

The invalid-import detail is emitted verbatim. The shared resolver interpolates the raw directive, which may contain an absolute path or terminal control characters. An entry read that throws flows to stderr with the raw error stack or message, potentially exposing the local checkout path. The new identity failure text is constant and does not have this problem.

The above source reads printed `detail: \`malformed or foreign AGENTS.md import "${agentsAttempt.trim()}" ...\`` at ai-framework/scripts/entry-import.mts:55 and `err.stack || err.message` at validator line 308. I also ran:

~~~sh
bun test --test-name-pattern 'READY run: plain text|unexpected errors exit 2' ai-framework/scripts/setup-validator.test.mts
~~~

Both tests passed. The existing unexpected-error test asserts that the injected message `kaboom` reaches stderr and that the command returns 2. Terminal rendering and real filesystem errors were reviewed statically.

### Low / ai-framework/scripts/setup-validator.mts:140 / legitimate project text under the pitch contract

Once the prefix bug is corrected, a whole-file phrase search can still flag a legitimate project that keeps the exact sentence solely as a quoted migration note or example. The visible prefix check does not reject an ordinary note after the heading. Its current false-positive window is a document that opens with the exact words as historical prose and later defines its own specifics. No affected legitimate checkout was verified. The same source read printed `content.startsWith(BUNDLE_IDENTITY)` at line 140, with no check of Markdown section or quotation context.

## Case and negative-check results

- **Full LF copies:** Failed the new regression above. The validator returned 0 where the contract requires 1.
- **Native import:** The in-memory resolver read the accepted local target once and returned the directive followed by the target text. Rejected target shapes stayed unread in that helper. The existing validator unit test for a reported invalid import passed. Copied-identity handling with the real resolver is a static failure because the effective text starts earlier than the sentence.
- **Appended CLAUDE.md merge:** The recognized merge heading can pass while a retained identity sits later in the file. Static review. A legitimate full mirror passed the existing READY test, and a legitimate append-only merge with the patched gate was not run.
- **Line endings:** I ran `node --input-type=module -e 'const heading = /^## Project specifics$/m; for (const ending of ["\n", "\r\n", "\r"]) console.log(JSON.stringify(ending), heading.test("# Agents" + ending + "## Project specifics" + ending + "Example project"));'` and got `"\n" true`, `"\r\n" true`, and `"\r" true`. CRLF alone did not defeat the heading check. Source inspection shows the import parser splits LF and CRLF, while lone CR is outside that parser's line splitting. End-to-end alternate-line-ending checks are unverified.
- **Sentence changes:** The log already records that removal or rewording of the fixed sentence is outside the detector's coverage. The pinning test passed. It establishes that both bundle files still contain the text and does not establish that the validator finds it.
- **SETUP.md and symlinks:** The bundle-exception assertion was never reached in the failing regression. SETUP.md path-type behavior and direct entry path behavior were inspected in source only. The mock import-target checks did refuse links and non-regular paths.
- **Scope and missing inputs:** `cat .claude/agents/security-reviewer.md` returned `No such file or directory` in the scratch copy. I used the security rules and their checklist. I ran selected in-memory tests with Bun, and did not run live target fixtures, the full validator, or the Node test suite.

## Security checklist

| Item | Result |
| --- | --- |
| A1 write authentication, A2 sensitive-read ownership, A3 API auth | Not applicable to a local read-only CLI. Entry path trust is covered under G1. |
| B1 server role checks, B2 authenticated tenant context, B3 privileged operation roles | Not applicable. No server roles, tenants, or privileged writes in this path. |
| C1 specific backend types, C2 client and backend validation | Not applicable. There is no client/backend handler in the reviewed path. |
| C3 bounded strings | Fail. Primary entry input is unbounded. The import side checks stat size before its read. |
| D1 hardcoded credentials, D2 public-prefix secrets | Pass by source inspection of the entry path. No such constants or environment reads appear there. |
| D3 secrets omitted from console | The new diagnostics are fixed text. Indirect disclosure risk remains through raw diagnostics and unguarded reads. No secrets were read or reproduced. |
| E1 safe rendering | Fail for terminal output of untrusted import text. No HTML renderer is involved. |
| E2 safe URLs, E3 no eval with user input | URLs are not rendered. No entry text is passed to eval or Function. |
| F1 tenant-scoped queries, F2 authenticated tenant identity | Not applicable. No tenant data or queries. |
| G1 guarded reads and directory listings | Fail for root entry reads and the shared existence/listing helper. Import-target refusal passed the in-memory cases. |
| G2 regex and transformation bounds | Fail. Heading expressions are simple and the resolver uses a line scan, but primary input is unbounded and concatenated effective text has no overall cap. |
| G3 only bundle code executed | Entry parsing invokes no analyzed script. The surrounding full-validator doctor and graph helpers use cwd-relative entry paths (ai-framework/scripts/setup-validator.mts:193 and :226). This pre-existing orchestration path was observed in source and was outside the entry-check runtime review. |
| G4 no raw errors or paths in output | Fail. See diagnostic finding. |
| G5 regular atomic write targets, G6 publish-time reinspection, G7 owned cleanup, G8 injected publish races | Not applicable to this read-only entry gate. |
| Section 9 absent versus refused | No writer consumes this entry check. The presence probe does not preserve the distinction for entry paths. |
| Section 9 trusted configuration root | No configuration is loaded by the entry check. Other validator checks were outside scope. |
