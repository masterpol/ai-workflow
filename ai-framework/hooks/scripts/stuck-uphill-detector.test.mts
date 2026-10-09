import assert from "node:assert/strict";
import nodePath from "node:path";
import test from "node:test";

import { appendAudit, detectStuck, listActivePitches, main, parseHill } from "./stuck-uphill-detector.mts";
import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

const NOW = Date.parse("2026-03-01T00:00:00.000Z");
const P = "/proj/.project/pitches";

interface Fake { deps: RuntimeDeps; files: Map<string, string>; err: string[] }

function fake(initial: Record<string, string>, dirs: string[] = [], throwOnAppend = false): Fake {
  const files = new Map(Object.entries(initial));
  const err: string[] = [];
  const deps = {
    path: nodePath,
    fs: {
      existsSync: (file: string) => files.has(file) || dirs.includes(file) || [...files.keys()].some((f) => f.startsWith(`${file}/`)),
      readFileSync: (file: string) => {
        const text = files.get(file);
        if (text === undefined) throw new Error(`ENOENT: ${file}`);
        return text;
      },
      readdirEntriesSync: (dir: string) =>
        [...new Set([...files.keys(), ...dirs.map((d) => `${d}/x`)].filter((f) => f.startsWith(`${dir}/`)).map((f) => f.slice(dir.length + 1).split("/")[0]))]
          .map((name) => ({ name, isDirectory: () => !name.includes("."), isFile: () => name.includes("."), isSymbolicLink: () => false })),
      appendFileSync: (file: string, data: string) => {
        if (throwOnAppend) throw new Error("EACCES: denied");
        files.set(file, (files.get(file) ?? "") + data);
      },
    },
    clock: { now: () => NOW },
    proc: { cwd: () => "/proj" },
    io: { stderr: { write: (t: string) => err.push(t) } },
  } as unknown as RuntimeDeps;
  return { deps, files, err };
}

const HILL = "| Scope | Pos | Last |\n|---|---|---|\n| S1 api | Uphill (figuring out) | 2026-01-01 |\n| S2 ui | Downhill | 2026-01-02 |\n| S3 x | uphill | — |\nnot a row\n";

test("listActivePitches returns directories except underscore ones", () => {
  const f = fake({ [`${P}/a/hill.md`]: "", [`${P}/_archive/hill.md`]: "", [`${P}/_followups.md`]: "" });
  assert.deepEqual(listActivePitches(f.deps), ["a"]);
  assert.deepEqual(listActivePitches(fake({}).deps), []);
});

test("parseHill reads scope rows and ignores other lines", () => {
  const f = fake({ [`${P}/a/hill.md`]: HILL });
  assert.deepEqual(parseHill("a", f.deps), [
    { scope: "S1 api", position: "Uphill (figuring out)", lastMoved: "2026-01-01" },
    { scope: "S2 ui", position: "Downhill", lastMoved: "2026-01-02" },
    { scope: "S3 x", position: "uphill", lastMoved: "—" },
  ]);
  assert.deepEqual(parseHill("missing", f.deps), []);
});

test("appendAudit writes one timestamped line per uphill row only", () => {
  const f = fake({ [`${P}/a/hill.md`]: HILL });
  appendAudit("a", parseHill("a", f.deps), f.deps);
  assert.equal(
    f.files.get(`${P}/a/.hill-audit.log`),
    "2026-03-01T00:00:00.000Z\tS1 api\tUphill (figuring out)\n2026-03-01T00:00:00.000Z\tS3 x\tuphill\n",
  );
  const g = fake({});
  appendAudit("a", [{ scope: "S1", position: "Downhill", lastMoved: "x" }], g.deps);
  assert.equal(g.files.size, 0);
});

test("detectStuck needs 3 observations spanning at least 24 hours", () => {
  const log = (...ts: string[]) => ({ [`${P}/a/.hill-audit.log`]: ts.map((t) => `${t}\tS1\tUphill\n`).join("") });
  assert.deepEqual(detectStuck("a", fake({}).deps), []);
  assert.deepEqual(detectStuck("a", fake(log("2026-01-01T00:00:00Z", "2026-01-05T00:00:00Z")).deps), []);
  assert.deepEqual(detectStuck("a", fake(log("2026-01-01T00:00:00Z", "2026-01-01T05:00:00Z", "2026-01-01T10:00:00Z")).deps), []);
  assert.deepEqual(
    detectStuck("a", fake(log("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", "2026-01-03T01:00:00Z")).deps),
    [{ scope: "S1", pos: "Uphill", count: 3, hours: 49 }],
  );
});

test("main warns on stderr for a stuck scope, appends audit lines, skips underscore pitches, exits 0", () => {
  const old = ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z", "2026-01-03T01:00:00.000Z"].map((t) => `${t}\tS1 api\tUphill (figuring out)\n`).join("");
  const f = fake({ [`${P}/a/hill.md`]: HILL, [`${P}/a/.hill-audit.log`]: old, [`${P}/_arch/hill.md`]: HILL });
  assert.equal(main([], f.deps), 0);
  assert.deepEqual(f.err, ["[stuck-uphill] pitch=a scope=S1 api stuck at Uphill (figuring out) for 4 sessions over ~1416h. Re-shape or push to no-go?\n"]);
  assert.ok(f.files.get(`${P}/a/.hill-audit.log`)?.endsWith("2026-03-01T00:00:00.000Z\tS3 x\tuphill\n"));
  assert.equal(f.files.has(`${P}/_arch/.hill-audit.log`), false);
});

test("main is silent with no pitches directory", () => {
  const f = fake({});
  assert.equal(main([], f.deps), 0);
  assert.deepEqual(f.err, []);
});

test("main reports a hook error on stderr but still exits 0", () => {
  const f = fake({ [`${P}/a/hill.md`]: HILL }, [], true);
  assert.equal(main([], f.deps), 0);
  assert.deepEqual(f.err, ["[stuck-uphill] hook error: EACCES: denied\n"]);
});
