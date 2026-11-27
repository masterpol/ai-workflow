# Code review — install entry identity and validator hardening

Reviewed all 28 hunks across nine files in `CHANGE.patch` against the pitch log and its “Revision before ship.” One finding is reproduced by the patch’s own regression test under Node and Bun. The remaining findings below use source evidence.

## Findings

### High / ai-framework/scripts/setup-validator.mts:113 / Revision before ship, “No raw text in output”

`record` applies `printable` to the detail only. It preserves the raw file name in both the result object and the terminal output. A mirror report with a line feed in the file name writes an apparent second status line even with `--no-color`. Sanitize the report name at the same boundary as its detail.

Command:

```sh
node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern='^control characters in a reported file name' ai-framework/scripts/setup-validator.test.mts
```

Output excerpt, with control characters escaped:

```text
not ok 1 - control characters in a reported file name cannot forge report lines
'PASS  forged\x1B[2K: missing Cursor mirror; run node ai-framework/scripts/skill-vendors.mts cursor-mirrors --apply\n'
# tests 1
# pass 0
# fail 1
```

### Medium / ai-framework/scripts/setup-validator.test.mts:209 / Coding Standards, test supported entry points and data used by consumers

The two new bundle source assertions run unconditionally in a test shipped into target projects. A fresh install that follows Step 1 has the test file but lacks the bundle’s `SETUP.md`. Its correctly generated entry files also lack the bundle identity. Running this test file in that install therefore fails with a missing file at line 210 and a failed identity assertion at line 216. The same test file already contains validator tests intended to exercise installation behavior. Gate the two source invariants on bundle provenance or keep them in a bundle-only test that the installer does not copy.

Command and output:

```text
$ rg -n 'the bundle.s own|readFileSync\(join\(urlPath' ai-framework/scripts/setup-validator.test.mts
209:test("the bundle's own SETUP.md still starts with the title that marks the bundle checkout", () => {
210:  const setup = testDeps.fs.readFileSync(join(urlPath(new URL("../../", import.meta.url)), "SETUP.md"), "utf8") as string;
214:test("the bundle's own entry files still carry the identity sentence the install check looks for", () => {
215:  const read = (file: string): string => testDeps.fs.readFileSync(join(urlPath(new URL("../../", import.meta.url)), file), "utf8") as string;
$ rg -n 'ai-workflow-portable/ai-framework|ai-workflow-portable/(AGENTS|CLAUDE)' SETUP.md
69:- `ai-workflow-portable/ai-framework/` → `<root>/ai-framework/`
71:- `ai-workflow-portable/AGENTS.md` → `<root>/AGENTS.md`  *(see Step 2 for tool nuances)*
72:- `ai-workflow-portable/CLAUDE.md` → `<root>/CLAUDE.md`  *(the self-triggering bootstrap — see below)*
```

The two source tests passed in the supplied bundle scratch copy. The installed-project failure was verified by inspection and was not run in a fresh fixture.

### Medium / ai-framework/scripts/setup-validator.mts:164 / Coding Standards, DRY and end-to-end behavior

The setup validator treats an unrelated root `SETUP.md` as an install, but its mandatory workflow doctor still treats any existing `SETUP.md` as bundle provenance. A real installed project with its own setup guide and app README can get a doctor failure from bundle-specific checks, including documentation links whose bundle README targets were never installed. The new own-guide unit test stubs the doctor and asserts that entries with the inherited sentence fail, so it misses the healthy-entry scenario. Use consistent bundle detection in the two checks.

Command and output:

```text
$ rg -n 'const setupTitle|const install =|const inPortableBundleRepo|inPortableBundleRepo \? \[docsLinkCheck' ai-framework/scripts/{setup-validator,workflow-doctor}.mts
ai-framework/scripts/setup-validator.mts:164:    const setupTitle = (await quietText("SETUP.md"))?.split(/\r?\n/)[0];
ai-framework/scripts/setup-validator.mts:165:    const install = setupTitle !== BUNDLE_SETUP_TITLE;
ai-framework/scripts/workflow-doctor.mts:1038:    const inPortableBundleRepo = await exists(absolute("SETUP.md"));
ai-framework/scripts/workflow-doctor.mts:1093:      ...(inPortableBundleRepo ? [docsLinkCheck(docFiles)] : []),
```

This is a static call-path finding. A healthy install with an unrelated guide was not run end to end.

### Low / ai-framework/scripts/setup-validator.mts:258 / Revision before ship and Coding Standards, explicit error handling

The doctor failure discards both the safe process error code and its exit status. If the doctor cannot start, times out, or actually finds a project issue, the user gets the same “found a blocking issue” report. The runner already returns the sanitized error code and exit status. Retain those diagnostics while keeping child output out of the validator report.

Command and output:

```text
$ rg -n 'workflow doctor found a blocking issue|spawnError =|errorCode: code' ai-framework/scripts/{setup-validator,setup-validator.test}.mts
ai-framework/scripts/setup-validator.mts:144:      return { code: null, stdout: "", stderr: "", signal: null, errorCode: code ?? "SPAWN_FAILED" };
ai-framework/scripts/setup-validator.mts:258:    if (result.code !== 0) { record("fail", "Workflow doctor", "workflow doctor found a blocking issue"); return; }
ai-framework/scripts/setup-validator.test.mts:248:  const spawnError = makeDeps(baseFiles(), (call) => {
ai-framework/scripts/setup-validator.test.mts:253:  assert.ok(spawnError.out.join("").includes("FAIL  Workflow doctor: workflow doctor found a blocking issue\n"));
```

The existing child-failure test passes and explicitly expects the generic message for a spawn exception.

### Low / ai-framework/docs/setup-validator.md:10 / Revision before ship, guarded-read contract

“Every project file it reads” overstates the implementation. One in-process counterexample is a regular, hard-linked consolidation ledger. Its separate reader checks type, symbolic-link status and size, then reads the file without checking link count. Similarly, the mirror scanner reads sources and destinations under its own rules. The documented cap and UTF-8 checks should identify the seven guarded artifacts listed in the pitch log.

Command and output:

```text
$ sed -n '77,81p' ai-framework/scripts/setup-validator.mts
      try {
        // lstat first: a FIFO would block the read forever, and a symlink or oversize file must not be followed or slurped.
        const stat = deps.fs.lstatSync(deps.path.join(dir, name));
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_LEDGER_BYTES) throw new Error("not a plain bounded file");
        const text = await deps.fs.readFile(deps.path.join(dir, name));
```

The counterexample is from inspection of the existing ledger reader. I did not create a ledger fixture for it.

## Checklist

1. **Install and setup instructions.** Checked the SETUP Step 4 hunk, both setup skill hunks, their entry-file and approval steps, and the documented validation instructions. `cmp` confirmed byte-identical mirrors. The inherited-identity test, local-guide case, stale imported identity, and bundle marker invariants passed in the filtered validator run. The setup behavior dataset records its live cases as unrun, so actual agent editing behavior remains unverified. The copied headers still say “extend” at line 10 and the supplied `CLAUDE.md` is already a full mirror. These are existing instructions outside the changed files. The live setup evaluation would need to expose the copied headers as well as the skill text to assess whether the conflict affects agents.
2. **Guarded reads.** Traced the context, direct entry, status, and optional setup-title reads through the default adapter, `readProjectText`, and the pinned byte reader. Checked ancestor inspection, refusal versus absence, type/link/size checks, bounded read and fatal UTF-8 decoding. Read the updated symlink, hard-link, FIFO and oversize fixtures. Those file-backed tests remain unverified in this review.
3. **Import handling and callers.** Read the entire resolver and effective-text helper. `bundle-sync.mts:556` reports the resolver’s fixed detail for invalid imports and uses effective text for valid imports. `workflow-doctor.mts` checks for and parse-checks the module and entry files, and has no direct resolver call in this scratch version. A read-only Bun probe invoking `resolveClaudeEntry(process.cwd(), "@docs/AGENTS.md\n")` returned `{"kind":"invalid","detail":"malformed or foreign AGENTS.md import (only \"@AGENTS.md\" is accepted)"}` with exit 0.
4. **Output and subprocesses.** Reviewed report construction, graph and doctor child handling, parse-result selection, and the top-level error handling through plain and JSON paths. Filtered tests passed for fixed graph/Cursor/parser/unexpected diagnostics and failed for report name sanitization. The doctor diagnostic gap is above.
5. **Changed test fixtures and patch inventory.** Reviewed the whole fixture helper and both callers in the archived-baseline and fresh-setup flows, plus every modified validator and resolver test. The helper performs the minimal marker substitution in both copied texts. `git apply --reverse --check CHANGE.patch` exited 0. The historical upgrade and fresh-copy suites were not run. The scratch snapshot lacks the git object database required by the historical fixture.
6. **Coding standards.** Checked relative and type imports, new types and named exports, absence of new `any` or non-exhaustive switches, and explicit handling at each changed catch. The validator already exceeds the generic file-size guidance and the existing `makeValidator` grows while hosting the changed checks. The scratch log does not establish a new size exception. The individual changed validator checks remain under 50 lines. Existing module sizes were not treated as new functional failures.
7. **Architectural boundaries.** No app, backend, or shared-package boundary applies to these workflow scripts. The patch adds no dependencies and reuses the existing project reader. Checked nearby imports and found no direct reverse dependency from the new reader or the compaction code to the validator.

## Verification limits and failed attempts

- The filtered Bun run produced 10 passes and one failure. Its initial test-name pattern also selected an existing ledger test which created and cleaned its own temporary fixtures outside the scratch copy. This exceeded the read-only work boundary. I tightened the Node filter to the intended tests, and did not run further filesystem-fixture tests. The filtered Node run produced nine passes and one failure. Both failures were the report-name regression at line 302.
- The first batched patch display was truncated. I recovered the affected ranges with smaller reads and confirmed all nine paths using the reverse patch check.
- The scratch snapshot has no `.claude/agents` directory. I used the supplied role and its two named rules. Full filesystem integration, the historical upgrade, and vendor behavior evaluations remain unverified.
