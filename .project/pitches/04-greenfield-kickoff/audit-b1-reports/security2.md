# Security re-check: greenfield-kickoff B1 (second, narrow review)

Scope: `DELTA.patch` and the rules it touches, reviewed only in the supplied work copy. I did not read the repository checkout.

## Findings

| tier | file:line | issue and rule violated | failure scenario | fix |
|------|-----------|-------------------------|------------------|-----|
| must-fix | `ai-framework/scripts/project-state.mts:260` | The skip condition is `depth <= 1`, so the running source folder is also skipped two levels down. This breaks `.project/pitches/04-greenfield-kickoff/build/b1-s2-brief.md:7` ("direct child of the scanned root (never deeper)") and the "A deeper source folder is scanned" sentence in `SETUP.md`. It also lets a classification gate fail open (`ai-framework/rules/security.md` section 9, a refused or unscanned result must not read as "absent"). | With the running bundle at `<root>/vendor/tool/` and project code inside it, the check reports `empty` with no evidence. Setup then continues without asking the person. | Use `depth === 0`. At the root visit, the direct children are examined while `depth` is 0. |

I rated this must-fix because the gate fails open and a contract test is red. The harm is limited to files inside the running source folder at that depth. Files elsewhere are still found.

`DELTA.patch` does not touch this line. I could not tell whether the first review saw the same line or the work copy changed afterwards. Check line 260 in the real tree before patching.

### Evidence

Named test command: `node --test --test-skip-pattern='the shipped manifest matches Git' ai-framework/scripts/project-state.test.mts`

```
tests 62, pass 61, fail 1
✖ a source copy two levels down is still scanned
  'empty' !== 'unclear'   (ai-framework/scripts/project-state.test.mts:141)
```

Separate reproduction: I copied the manifest files plus `SETUP.md` to `work/poc/p3/vendor/tool/`, added `vendor/tool/src/app.ts`, and ran `node poc/p3/vendor/tool/ai-framework/scripts/project-state.mts --root poc/p3 --json`:

```
{"schemaVersion":1,"state":"empty","reasons":["The completed scan found only workflow, scaffold, or incidental files."],"evidence":[]}
```

Control: after changing only that scratch copy to `depth === 0`, the same command printed `"state":"unclear"` with `vendor/tool/...` paths as evidence. With the unchanged script and an extra root `main.ts`, it printed `existing` with evidence `["main.ts"]`, so the code under `vendor/tool` stayed hidden. I did not rerun the full test file with the fix applied.

## Quoting instructions (`SETUP.md:69-74`)

No finding on POSIX shells for the command as written.

- **Metacharacters:** I used a folder named `a;touch M1 & b|c>M2 (x) !! *` and ran the double-quoted command from a script file under `sh`, `bash` and `zsh`. All three passed the name through literally. A directory listing afterwards showed no `M1` or `M2`. A script file does not exercise interactive `!` history expansion.
- **Leading dash (did not work as an attack):** quoting does not stop Node from reading a leading `-` as an option. I tried a folder named `--eval=console.log(String.fromCharCode(80,87,78,69,68));0`, which has no quote, backslash, `$`, backtick or slash. Node stopped with `node: bad option: --root` and printed no `PWNED`. The trailing `--root` therefore blocked this attempt, and a failed command routes to `unclear`. The same path with a `./` prefix ran the intended script. I tested only this spelling under Node, not Bun or later copy commands. Adding `./` would be optional hardening.

Acknowledged, below the confidence bar and not tested:

- **PowerShell:** `command -v pwsh` found nothing. From my knowledge, PowerShell also treats typographic double quotes (U+201C, U+201D, U+201E) as double quotes. "A quote" in `SETUP.md:73` can be read to include them but does not say so.
- **Windows `cmd.exe`:** from my knowledge, `%NAME%` still expands inside double quotes, and `%` is not on the refusal list. I did not test it.
- **Later commands:** "do not put it in a command: treat the result as `unclear`" does not say clearly whether the ban also covers the later Step 1 copy and Step 3 merge commands. "Use that path throughout setup" comes just before it.

## Skip conditions and starter-file rule

- **Depth:** fails, as reported above.
- **Running folder only (`target === bundle`) and bundle title (`hasBundleSetup`):** no finding. The related tests were among the 61 passes. By reading the code, `hasBundleSetup` uses the bounded guarded reader, checks the directory before and after the read, and returns false on any error, so the folder is then scanned. I did not rerun removal tests for these two conditions.
- **Starter-file rule:** no finding. The pattern is anchored at both ends and matches the whole relative path, so nested names and `OLDREADME.md` do not match. The three added test cases are in the test file, and the run's only failure was the depth test.
- **The other new `SETUP.md` sentence** ("continue with Step 1" means continue setup): no security finding.

Known, accepted or deferred items listed in the brief are left out.

## Security summary

| Tier | Count |
|------|-------|
| must-fix | 1 |
| should-fix | 0 |
| acknowledged | 3 |

Checked: `DELTA.patch`; the whole of `ai-framework/scripts/project-state.mts`; the source-folder tests; the named test command; the shell, leading-dash and depth reproductions above; `ai-framework/rules/security.md` section 9. The `.claude` and `.cursor` setup skill files are identical (`cmp`).

Unverified: PowerShell, `cmd.exe`, interactive history expansion, Bun, and the full test file with the proposed fix. I ran no dependency audit because it was outside this narrow scope.

All scratch fixtures are under `work/poc/`. The named test command also creates its own temporary fixtures.

Verdict: BLOCK — 1 must-fix finding requires resolution.
