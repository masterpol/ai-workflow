import assert from "node:assert/strict";
import { test } from "node:test";

import { checkLinks, main, slug } from "./docs-links.mts";
import { captureIo, createTestDeps, memoryFs, runScript, tempFixture } from "./runtime/test-helpers.mts";

const nodeDeps = createTestDeps();
const SCRIPT = nodeDeps.path.join(import.meta.dirname, "docs-links.mts");

function fixture(files: Record<string, string>): string {
  return tempFixture(nodeDeps, files);
}

test("slug follows GitHub rules", () => {
  assert.equal(slug("Version Log & Bundle Sync"), "version-log--bundle-sync");
  assert.equal(slug("The `pipeline`"), "the-pipeline");
  assert.equal(slug("snake_case_name"), "snake_case_name");
});

test("valid file and anchor links pass", () => {
  const root = fixture({ "a.md": "# A\n[b](docs/b.md#topic) [self](#a)\n", "docs/b.md": "# B\n## Topic\n[back](../a.md)\n" });
  assert.deepEqual(checkLinks([root]).broken, []);
});

test("broken file and anchor links are reported with line numbers", () => {
  const root = fixture({ "a.md": "# A\n[x](nope.md)\n[y](b.md#missing)\n", "b.md": "# B\n" });
  const reasons = checkLinks([root]).broken.map((item) => `${item.line}:${item.reason}`);
  assert.deepEqual(reasons, ["2:missing file", "3:missing anchor"]);
});

test("external URLs, fenced code and inline code are ignored", () => {
  const root = fixture({ "a.md": "# A\n[x](https://example.com/nope)\n`[y](nope.md)`\n```\n[z](nope.md)\n```\n" });
  assert.deepEqual(checkLinks([root]).broken, []);
});

test("duplicate headings get numbered anchors", () => {
  const root = fixture({ "a.md": "# A\n## Same\n## Same\n[one](#same) [two](#same-1) [three](#same-2)\n" });
  assert.deepEqual(checkLinks([root]).broken.map((item) => item.target), ["#same-2"]);
});

test("a malformed percent escape is reported, not thrown", () => {
  const root = fixture({ "a.md": "[x](ok%ZZ.md)\n" });
  assert.deepEqual(checkLinks([root]).broken.map((item) => item.reason), ["malformed escape"]);
});

test("symlinks are skipped, so loops terminate", () => {
  const root = fixture({ "a.md": "# A\n" });
  nodeDeps.fs.symlinkSync(".", nodeDeps.path.join(root, "loop"));
  assert.equal(checkLinks([root]).checked, 1);
});

test("an extremely long line is skipped quickly", () => {
  const root = fixture({ "a.md": `${"[".repeat(100000)}\n` });
  const start = Date.now();
  checkLinks([root]);
  assert.ok(Date.now() - start < 2000);
});

test("CLI exits 1 on a broken link and 0 on a clean tree", () => {
  const bad = fixture({ "a.md": "[x](nope.md)\n" });
  const good = fixture({ "a.md": "# A\n" });
  assert.equal(runScript(nodeDeps, SCRIPT, [bad]).status, 1);
  assert.equal(runScript(nodeDeps, SCRIPT, [good]).status, 0);
  assert.equal(runScript(nodeDeps, SCRIPT, []).status, 2);
  assert.equal(runScript(nodeDeps, SCRIPT, [nodeDeps.path.join(good, "nope-dir")]).status, 2);
});

test("--json reports checked and broken", () => {
  const bad = fixture({ "a.md": "[x](nope.md)\n" });
  const result = runScript(nodeDeps, SCRIPT, [bad, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.checked, 1);
  assert.equal(parsed.broken[0].reason, "missing file");
});

// ---- main() and checkLinks() against an in-memory RuntimeDeps --------------------------------------------

/** Files only (directories are implied); `links` is a path -> target map (empty target = dangling). */
function memory(files: Record<string, string>, links: Record<string, string> = {}) {
  return captureIo({ ...nodeDeps, fs: { ...nodeDeps.fs, ...memoryFs(files, links) } });
}

test("checkLinks reads through the injected filesystem", () => {
  const mem = memory({ "/d/a.md": "# A\n[b](sub/b.md#topic) [x](nope.md)\n", "/d/sub/b.md": "# B\n## Topic\n" });
  const result = checkLinks(["/d"], mem);
  assert.equal(result.checked, 2);
  assert.deepEqual(result.broken, [{ file: "/d/a.md", line: 2, target: "nope.md", reason: "missing file" }]);
});

test("checkLinks skips a symlinked directory and a symlinked file", () => {
  const mem = memory({ "/d/a.md": "# A\n" }, { "/d/loop": "", "/d/b.md": "" });
  assert.equal(checkLinks(["/d"], mem).checked, 1);
});

test("main prints broken links and a summary, exits 1", () => {
  const mem = memory({ "/d/a.md": "[x](nope.md)\n[y](#gone)\n" });
  assert.equal(main(["/d"], mem), 1);
  assert.equal(mem.out.join(""), "/d/a.md:1  nope.md  (missing file)\n/d/a.md:2  #gone  (missing anchor)\n1 file(s) checked, 2 broken link(s)\n");
  assert.equal(mem.err.length, 0);
});

test("main exits 0 with only the summary on a clean tree", () => {
  const mem = memory({ "/d/a.md": "# A\n[self](#a)\n" });
  assert.equal(main(["/d/a.md"], mem), 0);
  assert.equal(mem.out.join(""), "1 file(s) checked, 0 broken link(s)\n");
});

test("main --json prints the report as indented JSON", () => {
  const mem = memory({ "/d/a.md": "[x](nope.md)\n" });
  assert.equal(main(["--json", "/d"], mem), 1);
  assert.equal(mem.out.join(""), `${JSON.stringify({ checked: 1, broken: [{ file: "/d/a.md", line: 1, target: "nope.md", reason: "missing file" }] }, null, 2)}\n`);
});

test("main exits 2 with usage text without inputs, and with not-found for missing inputs", () => {
  const none = memory({});
  assert.equal(main([], none), 2);
  assert.equal(main(["--json"], none), 2);
  assert.equal(none.err.join(""), "usage: docs-links.mts <file-or-dir>... [--json]\nusage: docs-links.mts <file-or-dir>... [--json]\n");
  assert.equal(none.out.length, 0);
  const missing = memory({ "/d/a.md": "# A\n" });
  assert.equal(main(["/d", "/x", "/y"], missing), 2);
  assert.equal(missing.err.join(""), "not found: /x, /y\n");
  assert.equal(missing.out.length, 0);
});

test("the direct module keeps the synchronous checkLinks(targets) call that workflow-doctor makes", () => {
  const root = fixture({ "a.md": "[x](nope.md)\n" });
  const code = `const { checkLinks } = await import(${JSON.stringify(nodeDeps.path.join(import.meta.dirname, "docs-links.mts"))}); const r = checkLinks([${JSON.stringify(root)}]); console.log(JSON.stringify(r.broken.map((b) => b.reason)));`;
  const result = nodeDeps.child.runSync("node", ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--input-type=module", "-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["missing file"]);
});
