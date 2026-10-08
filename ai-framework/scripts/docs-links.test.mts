import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { checkLinks, main, slug } from "./docs-links.mts";
import { createNodeDeps } from "./runtime/node.mts";
import type { DirEntryLike, FsDeps, RuntimeDeps, StatLike } from "./runtime/types.mts";

const SCRIPT = path.join(import.meta.dirname, "docs-links.mts");
const nodeDeps = createNodeDeps();

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docs-links-"));
  for (const [name, value] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), value);
  }
  return root;
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
  fs.symlinkSync(".", path.join(root, "loop"));
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
  assert.equal(spawnSync("node", [SCRIPT, bad]).status, 1);
  assert.equal(spawnSync("node", [SCRIPT, good]).status, 0);
  assert.equal(spawnSync("node", [SCRIPT]).status, 2);
  assert.equal(spawnSync("node", [SCRIPT, path.join(good, "nope-dir")]).status, 2);
});

test("--json reports checked and broken", () => {
  const bad = fixture({ "a.md": "[x](nope.md)\n" });
  const result = spawnSync("node", [SCRIPT, bad, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.checked, 1);
  assert.equal(parsed.broken[0].reason, "missing file");
});

// ---- main() and checkLinks() against an in-memory RuntimeDeps --------------------------------------------

interface Mem { deps: RuntimeDeps; out: string[]; err: string[] }

/** Files only (directories are implied); `links` lists symlink paths. */
function memory(files: Record<string, string>, links: string[] = []): Mem {
  const dirs = new Set<string>(["/"]);
  for (const file of [...Object.keys(files), ...links]) {
    for (let dir = path.posix.dirname(file); !dirs.has(dir); dir = path.posix.dirname(dir)) dirs.add(dir);
  }
  const notFound = (file: string): Error => Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
  const stat = (file: string): StatLike => {
    const isLink = links.includes(file);
    const isDir = dirs.has(file) && !isLink;
    if (!isLink && !isDir && !(file in files)) throw notFound(file);
    return { isFile: () => !isLink && !isDir, isDirectory: () => isDir, isSymbolicLink: () => isLink,
      size: 0, mode: 0, mtimeMs: 0, ino: 1, dev: 1, nlink: 1, uid: 0 };
  };
  const fake: Partial<FsDeps> = {
    lstatSync: stat,
    statSync: stat,
    existsSync: (file) => file in files || dirs.has(file) || links.includes(file),
    readFileSync: (file) => { if (!(file in files)) throw notFound(file); return files[file]; },
    readdirSync: (dir) => {
      const names = new Set<string>();
      for (const key of [...Object.keys(files), ...links, ...dirs]) if (key !== dir && path.posix.dirname(key) === dir) names.add(path.posix.basename(key));
      return [...names];
    },
    readdirEntriesSync: () => [] as DirEntryLike[],
  };
  const mem: Mem = { deps: nodeDeps, out: [], err: [] };
  mem.deps = {
    ...nodeDeps,
    fs: { ...nodeDeps.fs, ...fake },
    io: { ...nodeDeps.io, stdout: { write: (text) => { mem.out.push(text); }, isTTY: false }, stderr: { write: (text) => { mem.err.push(text); }, isTTY: false } },
  };
  return mem;
}

test("checkLinks reads through the injected filesystem", () => {
  const mem = memory({ "/d/a.md": "# A\n[b](sub/b.md#topic) [x](nope.md)\n", "/d/sub/b.md": "# B\n## Topic\n" });
  const result = checkLinks(["/d"], mem.deps);
  assert.equal(result.checked, 2);
  assert.deepEqual(result.broken, [{ file: "/d/a.md", line: 2, target: "nope.md", reason: "missing file" }]);
});

test("checkLinks skips a symlinked directory and a symlinked file", () => {
  const mem = memory({ "/d/a.md": "# A\n" }, ["/d/loop", "/d/b.md"]);
  assert.equal(checkLinks(["/d"], mem.deps).checked, 1);
});

test("main prints broken links and a summary, exits 1", () => {
  const mem = memory({ "/d/a.md": "[x](nope.md)\n[y](#gone)\n" });
  assert.equal(main(["/d"], mem.deps), 1);
  assert.equal(mem.out.join(""), "/d/a.md:1  nope.md  (missing file)\n/d/a.md:2  #gone  (missing anchor)\n1 file(s) checked, 2 broken link(s)\n");
  assert.equal(mem.err.length, 0);
});

test("main exits 0 with only the summary on a clean tree", () => {
  const mem = memory({ "/d/a.md": "# A\n[self](#a)\n" });
  assert.equal(main(["/d/a.md"], mem.deps), 0);
  assert.equal(mem.out.join(""), "1 file(s) checked, 0 broken link(s)\n");
});

test("main --json prints the report as indented JSON", () => {
  const mem = memory({ "/d/a.md": "[x](nope.md)\n" });
  assert.equal(main(["--json", "/d"], mem.deps), 1);
  assert.equal(mem.out.join(""), `${JSON.stringify({ checked: 1, broken: [{ file: "/d/a.md", line: 1, target: "nope.md", reason: "missing file" }] }, null, 2)}\n`);
});

test("main exits 2 with usage text without inputs, and with not-found for missing inputs", () => {
  const none = memory({});
  assert.equal(main([], none.deps), 2);
  assert.equal(main(["--json"], none.deps), 2);
  assert.equal(none.err.join(""), "usage: docs-links.mts <file-or-dir>... [--json]\nusage: docs-links.mts <file-or-dir>... [--json]\n");
  assert.equal(none.out.length, 0);
  const missing = memory({ "/d/a.md": "# A\n" });
  assert.equal(main(["/d", "/x", "/y"], missing.deps), 2);
  assert.equal(missing.err.join(""), "not found: /x, /y\n");
  assert.equal(missing.out.length, 0);
});

test("the direct module keeps the synchronous checkLinks(targets) call that workflow-doctor makes", () => {
  const root = fixture({ "a.md": "[x](nope.md)\n" });
  const result = spawnSync("node", ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--input-type=module", "-e", `const { checkLinks } = await import(${JSON.stringify(path.join(import.meta.dirname, "docs-links.mts"))}); const r = checkLinks([${JSON.stringify(root)}]); console.log(JSON.stringify(r.broken.map((b) => b.reason)));`], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["missing file"]);
});
