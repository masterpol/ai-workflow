import assert from "node:assert/strict";
import fs from "node:fs";
import nodePath from "node:path";
import os from "node:os";
import test from "node:test";

import { check, main } from "./post-edit-check.mts";
import { createNodeDeps } from "../../ai-framework/scripts/runtime/node.mts";
import type { RuntimeDeps } from "../../ai-framework/scripts/runtime/types.mts";

interface Fake { deps: RuntimeDeps; out: string[]; err: string[] }

function fake(files: Record<string, string>, stdin = "", cwd = "/proj"): Fake {
  const out: string[] = [];
  const err: string[] = [];
  const deps = {
    path: nodePath,
    fs: {
      readFileSync: (file: string) => {
        if (!(file in files)) throw new Error(`ENOENT: ${file}`);
        return files[file];
      },
      existsSync: (file: string) => file in files,
      statSync: (file: string) => {
        if (!(file in files)) throw new Error(`ENOENT: ${file}`);
        return { isFile: () => true };
      },
    },
    proc: { cwd: () => cwd },
    io: { stdout: { write: (t: string) => out.push(t) }, stderr: { write: (t: string) => err.push(t) }, stdin: { readText: async () => stdin } },
  } as unknown as RuntimeDeps;
  return { deps, out, err };
}

const edit = (file_path: unknown) => ({ tool_name: "Edit", tool_input: { file_path } });

test("clean file passes silently", async () => {
  const f = fake({ "/p/a.js": "const x = 1;\n" });
  assert.equal(await check(edit("/p/a.js"), f.deps), 0);
  assert.deepEqual([f.out, f.err], [[], []]);
});

test("hardcoded secret blocks with exit 2 and a stderr summary", async () => {
  const f = fake({ "/p/a.js": 'const k = "sk-abcdefghijklmnopqrstuvwxyz123";\n' });
  assert.equal(await check(edit("/p/a.js"), f.deps), 2);
  assert.equal(f.out.join(""), "\n🔍 Post-edit check [a.js]:\n  ❌ SECURITY: Possible OpenAI-style API key detected — use environment variables instead\n");
  assert.equal(f.err.join(""), "\n1 critical issue(s) — fix before proceeding.\n");
});

test("each secret pattern is detected", async () => {
  const cases: [string, string][] = [
    [`x = "sk_${"live"}_abcdefghijklmnopqrstuvwx"`, "Stripe-style live key"],
    ['password = "hunter22"', "hardcoded password"],
    [`t = "ghp_${"a".repeat(36)}"`, "GitHub personal access token"],
    ["-----BEGIN RSA PRIVATE KEY-----", "embedded private key"],
  ];
  for (const [content, name] of cases) {
    const f = fake({ "/p/a.js": content });
    assert.equal(await check(edit("/p/a.js"), f.deps), 2, name);
    assert.match(f.out.join(""), new RegExp(`Possible ${name} detected`));
  }
});

test("warnings print to stdout but exit 0", async () => {
  const f = fake({ "/p/a.js": "console.log(1);\n// TODO later\nlet a: any = 1;\n// console.log(2)\n" });
  assert.equal(await check(edit("/p/a.js"), f.deps), 0);
  assert.equal(
    f.out.join(""),
    "\n🔍 Post-edit check [a.js]:\n" +
      "  ⚠️  QUALITY: 1 console.log/debug statement(s) found — remove before merging\n" +
      "  ⚠️  TYPES: 1 'any' type(s) detected — use specific types or 'unknown' with type guards\n" +
      "  ⚠️  QUALITY: 1 TODO/FIXME/HACK comment(s) — track in an ADR or knowledge/issues/ entry\n",
  );
  assert.deepEqual(f.err, []);
});

test("size limit names the kind from the extension", async () => {
  const body = Array.from({ length: 160 }, (_, i) => `const a${i} = ${i};`).join("\n");
  const mod = fake({ "/p/a.js": body });
  assert.equal(await check(edit("/p/a.js"), mod.deps), 0);
  assert.match(mod.out.join(""), /SIZE: a\.js is 160 lines \(limit: 150\) — consider splitting this module/);
  const comp = fake({ "/p/c.jsx": body });
  await check(edit("/p/c.jsx"), comp.deps);
  assert.match(comp.out.join(""), /splitting this component/);
});

test("test files skip console.log and any checks", async () => {
  const f = fake({ "/p/a.test.js": "console.log(1);\nlet a: any = 1;\n" });
  assert.equal(await check(edit("/p/a.test.js"), f.deps), 0);
  assert.deepEqual(f.out, []);
});

test("skips non-checkable extensions, tooling directories and missing paths", async () => {
  const bad = 'const k = "sk-abcdefghijklmnopqrstuvwxyz123";';
  const f = fake({ "/p/a.md": bad, "/p/node_modules/x.js": bad, "/p/dist/x.js": bad, "/p/build/x.js": bad, "/p/.claude/x.js": bad });
  for (const file of ["/p/a.md", "/p/node_modules/x.js", "/p/dist/x.js", "/p/build/x.js", "/p/.claude/x.js", "/p/missing.js"]) {
    assert.equal(await check(edit(file), f.deps), 0, file);
  }
  assert.deepEqual(f.out, []);
});

test("main never blocks on empty, malformed or odd payloads", async () => {
  for (const stdin of ["", "{nope", "null", "5", "{}", JSON.stringify(edit(5)), JSON.stringify(edit(""))]) {
    const f = fake({}, stdin);
    assert.equal(await main([], f.deps), 0, JSON.stringify(stdin));
    assert.deepEqual([f.out, f.err], [[], []]);
  }
});

test("main reads the tool payload from stdin and returns the blocking code", async () => {
  const f = fake({ "/p/a.js": 'password = "hunter22"' }, JSON.stringify(edit("/p/a.js")));
  assert.equal(await main([], f.deps), 2);
  const g = fake({ "/p/a.js": "const a = 1;" }, JSON.stringify(edit("/p/a.js")));
  assert.equal(await main([], g.deps), 0);
});

test("main swallows a stdin failure", async () => {
  const f = fake({});
  f.deps.io.stdin.readText = async () => { throw new Error("boom"); };
  assert.equal(await main([], f.deps), 0);
});

function projectWithTypescript(main: string | null, source: string): { deps: RuntimeDeps; out: string[]; err: string[]; dir: string } {
  const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), "post-edit-g8-"));
  const pkgDir = nodePath.join(dir, "node_modules/typescript");
  fs.mkdirSync(nodePath.join(pkgDir, "lib"), { recursive: true });
  if (main !== null) fs.writeFileSync(nodePath.join(pkgDir, "package.json"), JSON.stringify({ main }));
  fs.writeFileSync(nodePath.join(pkgDir, main ?? "index.js"), source);
  const base = createNodeDeps();
  const out: string[] = [];
  const err: string[] = [];
  const deps: RuntimeDeps = {
    ...base,
    proc: { ...base.proc, cwd: () => dir },
    io: { ...base.io, stdout: { ...base.io.stdout, write: (t: string) => { out.push(t); } }, stderr: { ...base.io.stderr, write: (t: string) => { err.push(t); } } },
  };
  return { deps, out, err, dir };
}

const FAKE_TS = 'module.exports={ScriptTarget:{ESNext:99},JsxEmit:{ReactJSX:4},transpileModule(c,o){return {diagnostics:c.includes("BAD")?[{messageText:"boom",start:c.indexOf("BAD")},{messageText:{messageText:"chain"}}]:[]}}};';

test("TypeScript syntax errors from the project's own typescript block with exit 2 (package main)", async () => {
  const p = projectWithTypescript("./lib/typescript.js", FAKE_TS);
  try {
    const file = nodePath.join(p.dir, "bad.ts");
    fs.writeFileSync(file, "const a = 1;\nconst b = BAD;\n");
    assert.equal(await check(edit(file), p.deps), 2);
    assert.match(p.out.join(""), /SYNTAX: Parse error at line 2 — boom/);
    assert.match(p.out.join(""), /SYNTAX: Parse error at line \? — chain/);
    assert.match(p.err.join(""), /2 critical issue\(s\)/);
    const ok = nodePath.join(p.dir, "ok.tsx");
    fs.writeFileSync(ok, "const a = 1;\n");
    assert.equal(await check(edit(ok), p.deps), 0);
  } finally { fs.rmSync(p.dir, { recursive: true, force: true }); }
});

test("TypeScript resolves index.js when package.json has no main", async () => {
  const p = projectWithTypescript(null, FAKE_TS);
  try {
    const file = nodePath.join(p.dir, "bad.ts");
    fs.writeFileSync(file, "BAD\n");
    assert.equal(await check(edit(file), p.deps), 2);
  } finally { fs.rmSync(p.dir, { recursive: true, force: true }); }
});

test("a project without typescript, or a throwing transpiler, skips the syntax check silently", async () => {
  const f = fake({ "/proj/bad.ts": "const a = BAD;\n" });
  assert.equal(await check(edit("/proj/bad.ts"), f.deps), 0);
  const p = projectWithTypescript("./lib/typescript.js", "module.exports={ScriptTarget:{},JsxEmit:{},transpileModule(){throw new Error('x')}};");
  try {
    const file = nodePath.join(p.dir, "a.ts");
    fs.writeFileSync(file, "const a = 1;\n");
    assert.equal(await check(edit(file), p.deps), 0);
    assert.deepEqual(p.out, []);
  } finally { fs.rmSync(p.dir, { recursive: true, force: true }); }
});

for (const extension of ["mts", "cts"]) {
  test(`blocks hardcoded secrets in a ${extension} source`, async () => {
    const file = `/p/source.${extension}`;
    const f = fake({ [file]: 'password = "hunter22"' });
    assert.equal(await check(edit(file), f.deps), 2);
    assert.match(f.out.join(""), /hardcoded password/);
  });
  test(`recognizes ${extension} test fixtures and skips console/any warnings`, async () => {
    const file = `/p/source.test.${extension}`;
    const f = fake({ [file]: "console.log(1);\nlet a: any = 1;\n" });
    assert.equal(await check(edit(file), f.deps), 0);
    assert.deepEqual(f.out, []);
  });
  test(`checks project TypeScript syntax for a ${extension} source`, async () => {
    const p = projectWithTypescript("./lib/typescript.js", FAKE_TS);
    try {
      const file = nodePath.join(p.dir, `bad.${extension}`);
      fs.writeFileSync(file, "const b = BAD;\n");
      assert.equal(await check(edit(file), p.deps), 2);
      assert.match(p.out.join(""), /SYNTAX: Parse error/);
    } finally { fs.rmSync(p.dir, { recursive: true, force: true }); }
  });
}
