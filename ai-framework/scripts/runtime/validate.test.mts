import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDeps, memoryFs } from "./test-helpers.mts";
import { createValidator, MAX_SOURCE_BYTES, UNPARSED_SUGGESTION, validateRuntimeImports } from "./validate.mts";
import type { RuntimeDeps } from "./types.mts";
import type { ValidateOptions } from "./validate.mts";

const base = createTestDeps();
function fixture(files: Record<string, string>, links: Record<string, string> = {}): RuntimeDeps {
  const fake = memoryFs(files, links);
  const handles = new Map<number, string>(); let sequence = 10;
  // Descriptor operations preserve the same bounded-read semantics as real FsDeps.
  return { ...base, fs: { ...base.fs, ...fake,
    openSync: (file: string) => { const fd = sequence++; handles.set(fd, file); return fd; },
    fstatSync: (fd: number) => fake.statSync!(handles.get(fd)!),
    readSync: (fd: number, bytes: Uint8Array, offset: number, length: number, position: number | null) => {
      const data = fake.readBytesSync!(handles.get(fd)!);
      const chunk = data.subarray(position ?? 0, (position ?? 0) + length);
      bytes.set(chunk, offset); return chunk.length;
    },
    closeSync: (fd: number) => { handles.delete(fd); },
  } };
}
function check(source: string, options: ValidateOptions = {}, file = "source.mts") {
  return validateRuntimeImports("/fixture", [file], options, fixture({ [`/fixture/${file}`]: source }));
}

test("recognizes import forms and reports declaration lines", () => {
  const source = `import { readFile } from 'node:fs';
import {
  join,
} from 'node:path';
import fs from 'node:fs';
import * as os from 'node:os';
import 'node:crypto';
export { spawn } from 'node:child_process';
export * from 'node:net';
const p = import('node:fs');
const q = require('node:path');`;
  const found = check(source);
  assert.deepEqual(found.map(v => [v.line, v.kind, v.module]), [
    [1, "import", "node:fs"], [2, "import", "node:path"], [5, "import", "node:fs"],
    [6, "import", "node:os"], [7, "import", "node:crypto"], [8, "export-from", "node:child_process"],
    [9, "export-from", "node:net"], [10, "dynamic-import", "node:fs"], [11, "require", "node:path"],
  ]);
});
test("guard skips comments", () => {
  assert.deepEqual(check(`// require('node:fs')
/* import 'node:path'; */
import /* comment */ 'node:crypto';`).map(v => v.module), ["node:crypto"]);
});
test("guard skips strings", () => {
  assert.deepEqual(check(`const fixture = "require('node:fs')";
const escaped = 'import \\'node:path\\'';
const p = 'process.env';`), []);
});
test("scans nested template expressions while skipping template text", () => {
  assert.deepEqual(check('const t = `import "node:fs" ${ { a: `inner ${require("node:path")}` } } ${"}\\\""}`;').map(v => v.module), ["node:path"]);
});
test("regex literals containing quotes and comments are opaque", () => {
  assert.deepEqual(check(`const re = /["'\x60]require('node:fs')\\/\\/*/g;
const quotient = 4 / 2;
import 'node:path';`).map(v => v.module), ["node:path"]);
});
test("guard skips type imports", () => {
  assert.deepEqual(check(`import type { Stats } from 'node:fs';
import type Path from 'node:path';
import type * as Os from 'node:os';`), []);
  assert.equal(check("import { type Stats, readFile } from 'node:fs';").length, 1);
});
test("guard allows test framework only in test files", () => {
  const source = "import 'node:test'; import 'node:assert'; import 'node:assert/strict'; import 'node:fs';";
  assert.deepEqual(check(source, {}, "check.test.mts").map(v => v.module), ["node:fs"]);
  assert.equal(check(source).length, 4);
  assert.equal(check(source, {}, "check.test.ts").length, 1);
  assert.equal(check(source, { testFile: () => true }).length, 1);
  assert.equal(check(source, { testFile: () => false }, "check.test.mts").length, 4);
});
test("adapters allowlist suppresses imports and globals", () => {
  const deps = fixture({ "/fixture/runtime/adapter.mts": "import 'node:fs'; process.env;", "/fixture/other.mts": "import 'node:fs';" });
  assert.deepEqual(createValidator(deps).validateRuntimeImports("/fixture", ["runtime/adapter.mts", "other.mts"],
    { adapters: new Set(["runtime/adapter.mts"]), includeGlobals: true }).map(v => v.file), ["other.mts"]);
});
test("global advisory is opt-in and ignores strings comments and member names", () => {
  const source = "process.env; process.argv; process.exit(); process.cwd(); process.platform; process.stdin; process.stdout; process.stderr; process.pid; object.process.env; 'process.env'; // process.env";
  assert.deepEqual(check(source), []);
  const found = check(source, { includeGlobals: true });
  assert.equal(found.length, 8); assert.ok(found.every(v => v.kind === "global" && v.module === undefined));
});
test("suggests RuntimeDeps capability for every known module", () => {
  for (const [module, suggestion] of Object.entries({ fs: "deps.fs", path: "deps.path", os: "deps.os",
    child_process: "deps.child", crypto: "deps.crypto", net: "deps.net", url: "pass the capability from a caller" })) {
    assert.equal(check(`import 'node:${module}';`)[0]?.suggestion, suggestion);
  }
  assert.deepEqual(check("import 'fs'; import './local.mts'; object.require('node:fs'); import.meta.url;"), []);
});
test("unreadable oversize symlink and malformed files produce fixed advisories", () => {
  const deps = fixture({ "/fixture/large.mts": " ".repeat(MAX_SOURCE_BYTES + 1),
    "/fixture/valid.mts": "import 'node:fs';", "/fixture/broken.mts": "/* unfinished" },
    { "/fixture/link.mts": "/fixture/valid.mts", "/fixture/dangling.mts": "", "/fixture/alias": "/fixture" });
  let reads = 0; const read = deps.fs.openSync;
  deps.fs.openSync = (file, flags, mode) => { reads++; return read(file, flags, mode); };
  const found = validateRuntimeImports("/fixture", ["missing.mts", "large.mts", "link.mts", "dangling.mts", "alias/valid.mts", "broken.mts", "../outside.mts"], {}, deps);
  assert.equal(found.length, 7); assert.equal(reads, 1);
  assert.ok(found.every(v => v.kind === "unparsed" && v.suggestion === UNPARSED_SUGGESTION && !v.suggestion.includes("/fixture")));
  for (const source of ["const s = 'unfinished", "const t = `unfinished ${ {}", "const r = /unterminated"]) {
    assert.equal(check(source)[0]?.kind, "unparsed");
  }
});
test("byte cap handles multibyte text and growth after stat and closes descriptors", () => {
  const deps = fixture({ "/fixture/a.mts": "é".repeat(MAX_SOURCE_BYTES) });
  let closed = 0; const close = deps.fs.closeSync;
  deps.fs.closeSync = fd => { closed++; close(fd); };
  assert.equal(validateRuntimeImports("/fixture", ["a.mts"], {}, deps)[0]?.kind, "unparsed");
  assert.equal(closed, 1);
  assert.deepEqual(check(" ".repeat(MAX_SOURCE_BYTES)), []);
});

const mutants = [
  ["import argument rule", 'call("dynamic-import");', 'add(token, "dynamic-import", tokens[i + 2]);', "M3 evasion: template argument"],
  ["require identifier rule", 'if (!declaration && !key) call("require");', 'if (!declaration && !key && next?.value === "(") call("require");', "M3 evasion: comma require"],
  ["template expression scan", 'code(true);', 'while (i < source.length && advance() !== "}") {}', "M3 evasion: template expression"],
  ["import type from rule", 'tokens[i + 2]?.value !== "from"', 'true', "M3 evasion: type default binding"],
  ["node literal rule", 'part.string && part.value.startsWith("node:")', 'false', "M3 node literal rule inspects nested arguments and templates"],
  ["computed advisory", '&& options.includeGlobals) {', '&& false) {', "M3 computed specifiers are opt-in advisories only"],
  ["Unicode continuation", 'escaped === "\\n" || escaped === "\\u2028" || escaped === "\\u2029"', 'escaped === "\\n"', "M3 Unicode continuations"],
  ["ancestor symlink", '          if (deps.fs.lstatSync(component).isSymbolicLink()) throw new Error("link");', '', "guard refuses ancestor-directory symlinks"],
  ["export type", 'next?.value === "." || typeOnly', 'next?.value === "." || (token.value === "import" && typeOnly)', "guard skips export type"],
  ["CRLF", String.raw`if (ch === "\n" || ch === "\u2028" || ch === "\u2029") line++;`, String.raw`if (ch === "\r" || ch === "\n") line++;`, "guard handles CRLF declaration lines"],
  ["BOM support", 'if (!options.adapters?.has(file)) result.push', 'if (bytes[0] === 239) throw new Error("BOM"); if (!options.adapters?.has(file)) result.push', "guard handles UTF-8 BOM"],
  ["UTF-8 validation", '{ fatal: true }', '{ fatal: false }', "guard refuses invalid UTF-8"],
  ["stat byte cap", '!stat.isFile() || stat.size > MAX_SOURCE_BYTES', '!stat.isFile()', "guard checks byte cap through stat before opening"],

  ["comment skip", 'if (source.startsWith("//", i)) {', 'if (false) {', "guard skips comments"],
  ["string skip", `if (ch === '"' || ch === "'") {`, `if (ch === "'") {`, "guard skips strings"],
  ["type-import skip", 'const typeOnly = next?.value === "type"', 'const typeOnly = false', "guard skips type imports"],
  ["test-file exception", 'if (isTest && ["node:test", "node:assert", "node:assert/strict"].includes(module.value)) return;', 'if (false) return;', "guard allows test framework only in test files"],
];
for (const [label, before, after, name] of mutants) {
  test(`scratch mutant: removing ${label} turns its guard red`, () => {
    const directory = base.path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
    const scratch = base.fs.mkdtempSync(base.path.join(base.os.tmpdir(), "runtime-validator-mutant-"));
    try {
      const copied = new Set<string>();
      const copy = (source: string): void => {
        if (copied.has(source)) return;
        copied.add(source);
        const text = base.fs.readFileSync(source);
        const destination = base.path.join(scratch, base.path.relative(directory, source));
        assert.ok(!base.path.relative(scratch, destination).startsWith(".."), "copy must remain in scratch");
        base.fs.mkdirSync(base.path.dirname(destination), { recursive: true });
        base.fs.writeFileSync(destination, text);
        for (const match of text.matchAll(/(?:^import[^\n]*?from\s*|import\(\s*)["'](\.\.?\/[^"']+\.mts)["']/gm)) copy(base.path.resolve(base.path.dirname(source), match[1]));
      };
      copy(base.path.join(directory, "validate.test.mts"));
      const target = base.path.join(scratch, "validate.mts");
      const text = base.fs.readFileSync(target);
      assert.equal(text.split(before).length - 1, 1, "mutant patch must match once");
      base.fs.writeFileSync(target, text.replace(before, after));
      const env = { ...base.proc.env }; delete env.NODE_TEST_CONTEXT;
      const result = base.child.runSync("node", ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--test", "--test-name-pattern", `^${name}$`, base.path.join(scratch, "validate.test.mts")],
        { encoding: "utf8", timeoutMs: 20000, cwd: scratch, env });
      assert.equal(result.status, 1, `${label}: ${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /AssertionError|ERR_ASSERTION/);
      assert.ok(result.stdout.includes(name), "named guard must be the failing test");
    } finally { base.fs.rmSync(scratch, { recursive: true, force: true }); }
  });
}

test("M1 retains imports before regex after control parentheses", () => {
  for (const control of ["if (a)", "while (a)", "for (;;)"]) {
    assert.deepEqual(check(`import 'node:fs';\n${control} /["']/.test(b);`).map(v => v.kind), ["import"]);
  }
});
test("M1 retains imports before unterminated strings", () => {
  assert.deepEqual(check("import 'node:fs';\n'unfinished").map(v => v.kind), ["import", "unparsed"]);
});
test("M2 decodes LF and CRLF module continuations", () => {
  for (const newline of ["\n", "\r\n"]) {
    assert.equal(check("import 'node\\" + newline + ":fs';")[0]?.module, "node:fs");
  }
});
test("M2 refuses escaped identifiers", () => {
  assert.deepEqual(check(String.raw`requ\u0069re('node:fs')`).map(v => v.kind), ["unparsed"]);
});

test("guard refuses ancestor-directory symlinks", () => {
  const deps = fixture({ "/fixture/real/a.mts": "export const ok = 1;" }, { "/fixture/alias": "/fixture/real" });
  // Resolve the alias as the OS would after traversal if the component guard were absent.
  const lstat = deps.fs.lstatSync;
  deps.fs.lstatSync = file => file === "/fixture/alias/a.mts" ? lstat("/fixture/real/a.mts") : lstat(file);
  const open = deps.fs.openSync;
  deps.fs.openSync = (file, flags) => open(file === "/fixture/alias/a.mts" ? "/fixture/real/a.mts" : file, flags);
  assert.equal(validateRuntimeImports("/fixture", ["alias/a.mts"], {}, deps)[0]?.kind, "unparsed");
});
test("guard skips export type", () => {
  assert.deepEqual(check("export type { Stats } from 'node:fs'; export type * from 'node:path';"), []);
  assert.equal(check("export { type Stats, readFile } from 'node:fs';").length, 1);
});
test("guard handles CRLF declaration lines", () => {
  assert.deepEqual(check("\r\nimport 'node:fs';\r\nimport 'node:path';").map(v => v.line), [2, 3]);
});
test("guard handles UTF-8 BOM", () => {
  assert.deepEqual(check("\uFEFFimport 'node:fs';").map(v => [v.kind, v.module, v.line]), [["import", "node:fs", 1]]);
});
test("guard refuses invalid UTF-8", () => {
  const deps = fixture({ "/fixture/a.mts": "x" });
  deps.fs.readSync = (_fd, bytes, offset, _length, position) => {
    if (position) return 0;
    bytes.set([0xff], offset); return 1;
  };
  assert.equal(validateRuntimeImports("/fixture", ["a.mts"], {}, deps)[0]?.kind, "unparsed");
});
test("guard checks byte cap through stat before opening", () => {
  const deps = fixture({ "/fixture/a.mts": "é".repeat(MAX_SOURCE_BYTES / 2 + 1) });
  const stat = deps.fs.lstatSync;
  deps.fs.lstatSync = file => ({ ...stat(file), size: file.endsWith("a.mts") ? new TextEncoder().encode("é".repeat(MAX_SOURCE_BYTES / 2 + 1)).byteLength : stat(file).size });
  let opened = 0; const open = deps.fs.openSync;
  deps.fs.openSync = (file, flags) => { opened++; return open(file, flags); };
  assert.equal(validateRuntimeImports("/fixture", ["a.mts"], {}, deps)[0]?.kind, "unparsed");
  assert.equal(opened, 0);
});
test("braced unicode escapes in strings and regexes parse", () => {
  assert.deepEqual(check(String.raw`import 'node:\u{66}s'; if (a) /\u{1f600}["']/u.test(b);`).map(v => v.module), ["node:fs"]);
});

const evasions: Array<[string, string, string, string | undefined]> = [
  ["template argument", "import(`node:fs`)", "dynamic-import", undefined],
  ["parenthesized argument", "import(('node:fs'))", "dynamic-import", undefined],
  ["comma require", "(0, require)('node:fs')", "require", undefined],
  ["optional require", "require?.('node:fs')", "require", undefined],
  ["conditional argument", "import(true ? 'node:fs' : 'node:path')", "dynamic-import", undefined],
  ["tagged require", "require`node:fs`", "require", undefined],
  ["template expression", "`${require('node:fs')}`", "require", "node:fs"],
  ["type default binding", "import type from 'node:fs'", "import", "node:fs"],
  ["type mixed binding", "import type, { readFile } from 'node:fs'", "import", "node:fs"],
  ["concatenated argument", "import('node:' + 'fs')", "dynamic-import", undefined],
  ["plain import", "import 'node:fs'", "import", "node:fs"],
  ["plain dynamic import", "import('node:fs')", "dynamic-import", "node:fs"],
];
for (const [label, source, kind, module] of evasions) {
  test("M3 evasion: " + label, () => {
    const found = check(source);
    assert.deepEqual(found.map(v => [v.kind, v.module]), [[kind, module]]);
    if (!module) assert.equal(found[0].suggestion, "non-literal import specifier; pass the capability from a caller");
  });
}
test("M3 Unicode continuations", () => {
  for (const newline of ["\u2028", "\u2029"]) {
    assert.equal(check("import 'node\\" + newline + ":fs';")[0]?.module, "node:fs");
  }
});
test("M3 literal and require context exceptions", () => {
  assert.deepEqual(check("import('package'); require('package'); object.require('node:fs'); object?.require('node:fs'); const require = capability; const obj = { require: capability, require() {} }; function require() {}"), []);
});
test("S7 malformed literal cases", () => {
  for (const source of ["import 'node:\\xZZ';", "import 'node:\\uZZZZ';", "import 'node:\\u{110000}';", "const r = /bad\nnewline/;", "const t = `unfinished"]) {
    assert.equal(check(source).at(-1)?.kind, "unparsed", source);
  }
});
test("S7 root symlink refusal", () => {
  const deps = fixture({ "/real/a.mts": "export const ok = 1;" }, { "/fixture": "/real" });
  assert.equal(validateRuntimeImports("/fixture", ["a.mts"], {}, deps)[0]?.kind, "unparsed");
});
test("S7 fstat refuses changed size and type before reading", () => {
  for (const isFile of [true, false]) {
    const deps = fixture({ "/fixture/a.mts": "export const ok = 1;" });
    const stat = deps.fs.fstatSync;
    deps.fs.fstatSync = fd => ({ ...stat(fd), size: isFile ? MAX_SOURCE_BYTES + 1 : 1, isFile: () => isFile });
    let reads = 0, closed = 0;
    deps.fs.readSync = () => { reads++; return 0; };
    deps.fs.closeSync = () => { closed++; };
    assert.equal(validateRuntimeImports("/fixture", ["a.mts"], {}, deps)[0]?.kind, "unparsed");
    assert.equal(reads, 0); assert.equal(closed, 1);
  }
});
test("S7 default dependencies read a real temporary source", () => {
  const scratch = base.fs.mkdtempSync(base.path.join(base.os.tmpdir(), "validator-default-"));
  try {
    base.fs.writeFileSync(base.path.join(scratch, "source.mts"), "import 'node:fs';");
    assert.equal(validateRuntimeImports(scratch, ["source.mts"])[0]?.module, "node:fs");
  } finally { base.fs.rmSync(scratch, { recursive: true, force: true }); }
});

test("M3 require in a conditional is a reference rather than an object key", () => {
  assert.deepEqual(check("const loader = flag ? require : capability;"), []);
  assert.deepEqual(check("const loader = flag ? require : capability;", { includeGlobals: true }).map(v => v.kind), ["dynamic-computed"]);
});

test("M3 computed specifiers are opt-in advisories only", () => {
  for (const source of ["import(fileUrl(x))", "import(variable)", "require(variable)", "(0, require)(fileUrl(x))", "require?.(variable)", "const loader = require;"]) {
    assert.deepEqual(check(source), [], source);
    const found = check(source, { includeGlobals: true });
    assert.deepEqual(found.map(v => [v.kind, v.module]), [["dynamic-computed", undefined]], source);
    assert.equal(found[0].suggestion, "computed import specifier; review manually or pass the capability from a caller");
  }
});
test("M3 node literal rule inspects nested arguments and templates", () => {
  for (const source of ["import(`\\u006eode:fs`)", "import(fileUrl('node:fs'))", "import((variable, 'node:fs'))", "require?.(fileUrl('node:fs'))", "(0, require)(('node:fs'))", "import(tag`node:fs`)", "import(`node:${name}`)", "import(`node:\u0066s`)", "import(`package-${'node:fs'}`)"]) {
    assert.equal(check(source).length, 1, source);
    assert.ok(["dynamic-import", "require"].includes(check(source)[0].kind), source);
  }
  for (const source of ["import(fileUrl('package'))", "import(`package-${name}`)", "import(42)", "import(true)", "import(null)", "import(/package/)", "require`package`", "import((variable, 'package'))", "import('package', { with: { type: 'node:fs' } })"]) {
    assert.deepEqual(check(source, { includeGlobals: true }), [], source);
  }
});
