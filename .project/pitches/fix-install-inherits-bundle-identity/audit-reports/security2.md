# Security review of setup-validator bundle detection

## Medium / ai-framework/scripts/setup-validator.mts:144 / security.md §9, resolve config only from a trusted root

A target project's own Markdown heading can turn off the inherited identity check. The code exempts every nonempty first line, including an ordinary app setup heading. `BUNDLE_SETUP_TITLE` is exported and tested but never compared by the classifier. With otherwise healthy inputs, the ordinary guide switches both stale entries from fail to pass and the validator returns 0. This also violates the documented contract that a project with its own setup guide is still an install. The exemption comes solely from the scanned project's text, so an exact title comparison would restore the documented distinction while still accepting a verbatim copy of that title as proof of origin.

I ran `bun test ai-framework/scripts/setup-validator.test.mts -t 'an install that kept|the bundle.s own SETUP'`. The first test failed at `ai-framework/scripts/setup-validator.test.mts:194` on its app-guide assertion with `0 !== 1`. The separate pinned-title test passed. The in-memory command below confirms which entry checks passed.

## Medium / ai-framework/scripts/setup-validator.mts:143 / security.md §9, read through one guarded reader and bound input before every regex

The new `SETUP.md` read bypasses file type, containment, and size checks. The linked-guide fixture below recorded one read and zero metadata checks. The Node runtime delegates directly to `fs.promises.readFile`, which follows links and reads the entire file before the split. A checkout with a linked setup document can therefore cause the validator to consume content outside the requested root. The same call can wait on a FIFO or consume excessive memory for a large file. Those latter effects were assessed from the code. Filesystem-level symlink traversal, FIFO behavior, and oversized reads remain unverified under the read-only scope.

## Low / ai-framework/scripts/setup-validator.mts:143 / security.md §9, guarded reader and distinct refusal outcome

An unreadable genuine bundle setup guide is silently treated as absent. Both otherwise valid root entry files are then flagged as inherited and the output points to editing the entry files even though the read of the setup guide failed. The mocked `EACCES` case reproduced the false refusal. A leading blank line also produced refusal with identical entry contents. That blank-line result is consistent with the documented first-line rule. Canonical LF and CRLF headings both passed, so CRLF alone did not cause refusal. Missing and empty setup guides also kept the install check active.

## In-memory command and output

I ran the actual validator entry point with the test suite's existing in-memory dependencies. The guide and entries were synthetic inputs. The test used no on-disk changes.

```sh
{
  sed -n '1,/^interface Report/p' ai-framework/scripts/setup-validator.test.mts | sed '/^import /s|"\./|"./ai-framework/scripts/|g'
  cat <<'TS'
for (const [label, setup] of [
  ["install without a guide", undefined],
  ["install with own guide", "# How to set up my app\n"],
  ["install with an empty guide", ""],
  ["bundle with canonical title", BUNDLE_SETUP_TITLE + "\n"],
  ["bundle with CRLF canonical title", BUNDLE_SETUP_TITLE + "\r\n"],
  ["bundle with a leading blank line", "\n" + BUNDLE_SETUP_TITLE + "\n"],
  ["bundle with a temporarily unreadable guide", "simulate EACCES"],
  ["regular fixture with mocked linked setup guide", "# Shared project setup\n"],
] as const) {
  const files = baseFiles();
  files["AGENTS.md"] = files["CLAUDE.md"] = AGENTS.replace("Real.", BUNDLE_IDENTITY);
  if (setup !== undefined) files["SETUP.md"] = setup;
  const { deps, out } = makeDeps(files, healthy);
  const read = deps.fs.readFile;
  const lstat = deps.fs.lstatSync;
  let setupStats = 0;
  let setupReads = 0;
  deps.fs.lstatSync = (file) => {
    if (file === `${ROOT}/SETUP.md`) {
      setupStats++;
      if (label.includes("linked")) return { isSymbolicLink: () => true, isFile: () => false, size: 16 };
    }
    return lstat(file);
  };
  deps.fs.readFile = async (file) => {
    if (file === `${ROOT}/SETUP.md`) {
      setupReads++;
      if (setup === "simulate EACCES") throw Object.assign(new Error("read refused"), { code: "EACCES" });
    }
    return read(file);
  };
  const exit = await main(["--json"], deps, libs);
  const report = JSON.parse(out.join("")) as Report;
  const entries = report.results.filter((r) => ["AGENTS.md", "CLAUDE.md"].includes(r.name) && r.detail !== "present" && !r.detail.includes("response-style"));
  console.log(`${label}: exit=${exit}, ${entries.map((r) => `${r.name} ${r.status}`).join(", ")}, guide reads=${setupReads}, guide lstat=${setupStats}`);
}
TS
} | bun run -
```

```text
install without a guide: exit=1, AGENTS.md fail, CLAUDE.md fail, guide reads=1, guide lstat=0
install with own guide: exit=0, AGENTS.md pass, CLAUDE.md pass, guide reads=1, guide lstat=0
install with an empty guide: exit=1, AGENTS.md fail, CLAUDE.md fail, guide reads=1, guide lstat=0
bundle with canonical title: exit=0, AGENTS.md pass, CLAUDE.md pass, guide reads=1, guide lstat=0
bundle with CRLF canonical title: exit=0, AGENTS.md pass, CLAUDE.md pass, guide reads=1, guide lstat=0
bundle with a leading blank line: exit=1, AGENTS.md fail, CLAUDE.md fail, guide reads=1, guide lstat=0
bundle with a temporarily unreadable guide: exit=1, AGENTS.md fail, CLAUDE.md fail, guide reads=1, guide lstat=0
regular fixture with mocked linked setup guide: exit=0, AGENTS.md pass, CLAUDE.md pass, guide reads=1, guide lstat=0
```
