// Live workflow code ships TypeScript entrypoints and imports commands without starting them.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NODE_FLAGS } from "./entry.mts";
import { createTestDeps, memoryFs } from "./test-helpers.mts";
import { validateRuntimeImports } from "./validate.mts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const SKIP = new Set(["node_modules", ".git", "scratchpad"]);
const ADAPTERS = new Set(["ai-framework/scripts/runtime/node.mts", "ai-framework/scripts/runtime/bun.mts", "ai-framework/scripts/runtime/cli.mts", "ai-framework/scripts/runtime/entry.mts"]);
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(relative(root, full).split(sep).join("/"));
  }
  return out;
}
const files = ["ai-framework", ".claude", ".opencode", ".project/analysis/native-safety-feasibility"].flatMap((dir) => existsSync(join(root, dir)) ? walk(join(root, dir)) : []);
const sources = files.filter((file) => /\.(mts|ts)$/.test(file) && !/\.test\.(mts|ts)$/.test(file));

test("ships no live JavaScript or CommonJS workflow source or test files", () => {
  assert.ok(sources.length > 30, `found ${sources.length} sources; walk is broken`);
  assert.deepEqual(files.filter((file) => /\.(js|cjs|mjs)$/.test(file)), []);
  assert.ok(files.includes(".opencode/plugins/token-consumption.ts"), "OpenCode discovers the direct .ts plugin");
});

test("ships no CommonJS directory overrides or launcher references in production TypeScript", () => {
  for (const file of files.filter((file) => file.endsWith("/package.json"))) {
    assert.notEqual(JSON.parse(readFileSync(join(root, file), "utf8")).type, "commonjs", file);
  }
  for (const file of sources) {
    assert.doesNotMatch(readFileSync(join(root, file), "utf8"), /\bmodule\.exports\b|runtime\/entry\.js|\bAI_WORKFLOW_RELAUNCHED\b|(?:from|import\()\s*["'][^"']+\.(?:js|cjs)["']/, file);
  }
});

test("guards every executable main with one direct-entry call", () => {
  const commands = sources.filter((file) => /export (?:async )?function main\b/.test(readFileSync(join(root, file), "utf8")));
  assert.ok(commands.length >= 25, `found ${commands.length} commands; executable detection is broken`);
  for (const file of commands) {
    const text = readFileSync(join(root, file), "utf8");
    assert.equal(text.match(/runDirect\(import\.meta\.url, main\);/g)?.length, 1, file);
  }
});

test("imports all production TypeScript modules silently without running commands", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "workflow-quiet-import-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const modules = sources.map((file) => pathToFileURL(join(root, file)).href);
  const code = `for (const url of ${JSON.stringify(modules)}) await import(url);`;
  const flags = process.versions.bun ? [] : NODE_FLAGS;
  const result = spawnSync(process.execPath, [...flags, "--input-type=module", "-e", code], {
    cwd, encoding: "utf8", timeout: 20000, env: { ...process.env, AI_WORKFLOW_RUNNER: "deno" },
  });
  assert.deepEqual([result.status, result.stdout, result.stderr], [0, "", ""]);
  assert.deepEqual(readdirSync(cwd), [], "importing cannot create project state");
});

function boundaryFindings(rootPath: string, paths: string[], deps: ReturnType<typeof createTestDeps>) {
  return validateRuntimeImports(rootPath, paths, { adapters: ADAPTERS, includeGlobals: true }, deps)
    .filter((item) => item.kind !== "global" && item.kind !== "dynamic-computed");
}

test("uses injected dependencies outside runtime adapters and avoids any-typed escape hatches", () => {
  const violations = boundaryFindings(root, sources, createTestDeps());
  assert.deepEqual(violations, [], "production sources import node:* outside runtime adapters or remain unparsed");
  for (const file of sources) {
    const text = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(text, /:\s*any\b|\bas any\b/, `${file} uses any`);
  }
});

function plantedDeps(fixtureRoot: string, file: string, source: string) {
  const base = createTestDeps();
  const fake = memoryFs({ [`${fixtureRoot}/${file}`]: source });
  const handles = new Map<number, string>();
  let sequence = 10;
  return { ...base, fs: { ...base.fs, ...fake,
    openSync: (name: string) => { const fd = sequence++; handles.set(fd, name); return fd; },
    fstatSync: (fd: number) => fake.statSync!(handles.get(fd)!),
    readSync: (fd: number, bytes: Uint8Array, offset: number, length: number, position: number | null) => {
      const data = fake.readBytesSync!(handles.get(fd)!);
      const chunk = data.subarray(position ?? 0, (position ?? 0) + length);
      bytes.set(chunk, offset); return chunk.length;
    },
    closeSync: (fd: number) => { handles.delete(fd); },
  } };
}

test("runtime dependency invariant reports a planted production import in memory", () => {
  const fixtureRoot = "/fixture", file = "ai-framework/scripts/planted.mts";
  const deps = plantedDeps(fixtureRoot, file, '// planted violation\nexport { readFile } from "node:fs";\n');
  assert.deepEqual(validateRuntimeImports(fixtureRoot, [file], { adapters: ADAPTERS }, deps), [
    { file, line: 2, kind: "export-from", module: "node:fs", suggestion: "deps.fs" },
  ]);
});

test("S6 invariant retains planted unparsed production", () => {
  const file = "ai-framework/scripts/unreadable.mts";
  const findings = boundaryFindings("/fixture", [file], plantedDeps("/fixture", file, "const source = 'unfinished"));
  assert.deepEqual(findings.map(v => [v.file, v.kind]), [["ai-framework/scripts/unreadable.mts", "unparsed"]]);
});

test("runtime dependency invariant excludes computed and global advisories", () => {
  const file = "ai-framework/scripts/computed.mts";
  const deps = plantedDeps("/fixture", file, "import(fileUrl(x)); import(variable); const loader = require; process.env;");
  assert.deepEqual(validateRuntimeImports("/fixture", [file], { includeGlobals: true }, deps).map(v => v.kind),
    ["dynamic-computed", "dynamic-computed", "dynamic-computed", "global"]);
  assert.deepEqual(boundaryFindings("/fixture", [file], deps), []);
});
