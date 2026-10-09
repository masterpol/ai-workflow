import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildEntry, bump, insertEntry, main } from "./changelog.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = "/proj";
const NOW = Date.UTC(2026, 9, 7, 12);

interface Fake { deps: RuntimeDeps; files: Map<string, string>; out: string[]; err: string[]; writes: string[] }

/** In-memory RuntimeDeps. `failRead` makes readFile reject with that error code for every path. */
function fake(files: Record<string, string>, failRead?: string): Fake {
  const map = new Map(Object.entries(files));
  const out: string[] = [];
  const err: string[] = [];
  const writes: string[] = [];
  const deps = {
    runtime: "node",
    fs: {
      async readFile(file: string): Promise<string> {
        if (failRead) throw Object.assign(new Error(`${failRead} ${file}`), { code: failRead });
        const value = map.get(file);
        if (value === undefined) throw Object.assign(new Error(`ENOENT ${file}`), { code: "ENOENT" });
        return value;
      },
      async writeFile(file: string, data: string): Promise<void> { writes.push(file); map.set(file, data); },
    },
    path: posix,
    clock: { now: () => NOW },
    io: { stdout: { write: (text: string) => { out.push(text); } }, stderr: { write: (text: string) => { err.push(text); } } },
    proc: { cwd: () => ROOT },
  } as unknown as RuntimeDeps;
  return { deps, files: map, out, err, writes };
}

const SEED = "# Changelog\n\nintro\n\n## [1.2.3] - 2020-01-01\n### Added\n- first\n- second\n\nFiles: a\n";

test("bump raises major, minor and patch and rejects bad input", () => {
  assert.equal(bump("1.2.3", "patch"), "1.2.4");
  assert.equal(bump("1.2.3", "minor"), "1.3.0");
  assert.equal(bump("1.2.3", "major"), "2.0.0");
  assert.throws(() => bump("1.2", "patch"), /VERSION is not valid semver: "1\.2"/);
  assert.throws(() => bump("1.2.3", "huge"), /--bump must be patch, minor, or major \(got "huge"\)/);
});

test("buildEntry and insertEntry put the newest entry first and keep the header", () => {
  const entry = buildEntry({ version: "1.3.0", category: "Added", summary: "S", details: ["d1"], files: ["a", "b"], date: "2026-10-07" });
  assert.equal(entry, "## [1.3.0] - 2026-10-07\n### Added\n- S\n- d1\n\nFiles: a, b\n");
  const updated = insertEntry(SEED, entry);
  assert.ok(updated.indexOf("## [1.3.0]") < updated.indexOf("## [1.2.3]"));
  assert.ok(updated.startsWith("# Changelog\n\nintro\n"));
  assert.equal(insertEntry("# Changelog\n\n\n", entry), `# Changelog\n\n${entry}`);
});

test("--check on an empty project reports 0.0.0 and no entries, writing nothing", async () => {
  const f = fake({});
  assert.equal(await main(["--check"], f.deps), 0);
  assert.equal(f.out.join(""), "VERSION: 0.0.0\nNo CHANGELOG.md entries yet.\n");
  assert.deepEqual(f.writes, []);
});

test("--check prints the latest entry, as text and as --json", async () => {
  const f = fake({ [`${ROOT}/VERSION`]: "1.2.3\n", [`${ROOT}/CHANGELOG.md`]: SEED });
  assert.equal(await main(["--check"], f.deps), 0);
  assert.equal(f.out.join(""), "VERSION: 1.2.3\nLatest entry: [1.2.3] 2020-01-01 (Added)\n  - first\n  - second\n");
  const j = fake({ [`${ROOT}/VERSION`]: "1.2.3\n", [`${ROOT}/CHANGELOG.md`]: SEED });
  assert.equal(await main(["--check", "--json"], j.deps), 0);
  assert.deepEqual(JSON.parse(j.out.join("")), { ok: true, version: "1.2.3", latest: { version: "1.2.3", date: "2020-01-01", category: "Added", bullets: ["- first", "- second"] } });
});

test("write bumps VERSION, prepends a dated entry using the injected clock, and prints both", async () => {
  const f = fake({ [`${ROOT}/VERSION`]: "1.2.3\n", [`${ROOT}/CHANGELOG.md`]: SEED });
  const code = await main(["--bump", "minor", "--category", "Added", "--summary", "S", "--detail", "d1", "--detail", "d2", "--files", "a, b"], f.deps);
  assert.equal(code, 0);
  assert.equal(f.files.get(`${ROOT}/VERSION`), "1.3.0\n");
  const changelog = f.files.get(`${ROOT}/CHANGELOG.md`) as string;
  assert.ok(changelog.includes("## [1.3.0] - 2026-10-07\n### Added\n- S\n- d1\n- d2\n\nFiles: a, b\n"));
  assert.ok(changelog.indexOf("## [1.3.0]") < changelog.indexOf("## [1.2.3]"));
  assert.deepEqual(f.writes, [`${ROOT}/VERSION`, `${ROOT}/CHANGELOG.md`]);
  assert.match(f.out.join(""), /^VERSION 1\.2\.3 -> 1\.3\.0\nCHANGELOG\.md updated:\n\n## \[1\.3\.0\] - 2026-10-07\n/);
  assert.deepEqual(f.err, []);
});

test("write --json prints previous and new version; a project with no files starts from 0.0.0", async () => {
  const f = fake({});
  assert.equal(await main(["--bump", "major", "--category", "Removed", "--summary", "S", "--json"], f.deps), 0);
  assert.deepEqual(JSON.parse(f.out.join("")), { ok: true, previousVersion: "0.0.0", version: "1.0.0" });
  assert.equal(f.files.get(`${ROOT}/VERSION`), "1.0.0\n");
  assert.ok((f.files.get(`${ROOT}/CHANGELOG.md`) as string).startsWith("# Changelog\n\nAll notable changes to this AI workflow bundle are recorded here, newest first.\n"));
});

test("validation failures exit 1 with `error:` on stderr and write nothing", async () => {
  const cases: Array<[string[], RegExp]> = [
    [["--bump", "x", "--category", "Added", "--summary", "S"], /^error: --bump must be one of "patch", "minor", "major"\n$/],
    [["--bump", "patch", "--category", "Z", "--summary", "S"], /^error: --category must be one of "Added", "Changed", "Fixed", "Removed"\n$/],
    [["--bump", "patch", "--category", "Added"], /^error: --summary is required \(one short line describing the improvement\)\n$/],
  ];
  for (const [argv, expected] of cases) {
    const f = fake({ [`${ROOT}/VERSION`]: "1.0.0\n" });
    assert.equal(await main(argv, f.deps), 1, argv.join(" "));
    assert.match(f.err.join(""), expected);
    assert.deepEqual(f.out, []);
    assert.deepEqual(f.writes, []);
  }
});

test("under --json a failure goes to stdout as {ok:false,error} and stderr stays empty", async () => {
  const f = fake({});
  assert.equal(await main(["--bump", "x", "--category", "Added", "--summary", "S", "--json"], f.deps), 1);
  assert.deepEqual(JSON.parse(f.out.join("")), { ok: false, error: '--bump must be one of "patch", "minor", "major"' });
  assert.deepEqual(f.err, []);
});

test("an invalid VERSION or a read error other than ENOENT fails with its message and leaves files alone", async () => {
  const bad = fake({ [`${ROOT}/VERSION`]: "bad\n" });
  assert.equal(await main(["--bump", "patch", "--category", "Added", "--summary", "S"], bad.deps), 1);
  assert.equal(bad.err.join(""), 'error: VERSION is not valid semver: "bad"\n');
  assert.deepEqual(bad.writes, []);
  const denied = fake({}, "EACCES");
  assert.equal(await main(["--check"], denied.deps), 1);
  assert.match(denied.err.join(""), /^error: EACCES \/proj\/VERSION\n$/);
});

test("end to end through the direct TypeScript command in a temp project (never the repo root)", () => {
  const dir = mkdtempSync(join(tmpdir(), "changelog-e2e-"));
  try {
    writeFileSync(join(dir, "VERSION"), "1.2.3\n");
    writeFileSync(join(dir, "CHANGELOG.md"), SEED);
    const script = join(here, "changelog.mts");
    const write = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "--bump", "patch", "--category", "Fixed", "--summary", "T", "--json"], { cwd: dir, encoding: "utf8" });
    assert.equal(write.status, 0, write.stderr);
    assert.deepEqual(JSON.parse(write.stdout), { ok: true, previousVersion: "1.2.3", version: "1.2.4" });
    assert.equal(readFileSync(join(dir, "VERSION"), "utf8"), "1.2.4\n");
    assert.match(readFileSync(join(dir, "CHANGELOG.md"), "utf8"), /## \[1\.2\.4\] - \d{4}-\d{2}-\d{2}\n### Fixed\n- T\n/);
    const check = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "--check"], { cwd: dir, encoding: "utf8" });
    assert.equal(check.status, 0);
    assert.match(check.stdout, /^VERSION: 1\.2\.4\nLatest entry: \[1\.2\.4\]/);
    const bad = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "--bump", "x"], { cwd: dir, encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /^error: --bump must be one of/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
