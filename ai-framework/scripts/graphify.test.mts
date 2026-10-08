import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { extractWikiLinks, graphifyCommand, legacyCovered, main, overlayKnowledge, parseFrontmatter, buildGraph } from "./graphify.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const ROOT = "/proj";
const KNOW = `${ROOT}/.project/knowledge`;
const shim = fileURLToPath(new URL("./graphify.mts", import.meta.url));

interface Fake {
  deps: RuntimeDeps;
  files: Map<string, string>;
  out: string[];
  err: string[];
  writes: string[];
  calls: { command: string; args: string[] }[];
}

const BASE_GRAPH = {
  directed: false,
  nodes: [{ id: "code_fn", label: "fn", source_file: "src/a.ts", _origin: "ast" }, { id: "heading_a", label: "A", source_file: ".project/knowledge/patterns/a-pattern.md", _origin: "ast" }],
  links: [],
  graph: {},
};

function unsupported(name: string): () => never {
  return () => { throw new Error(`fake deps: ${name} not supported`); };
}

/** In-memory RuntimeDeps. Directories are implied by file paths; `dirs` adds empty ones. */
function fake(files: Record<string, string>, dirs: string[] = [], env: Record<string, string> = {}): Fake {
  const calls: { command: string; args: string[] }[] = [];
  // Scripted uv/graphify: `uv --version` succeeds; `... update <root>` writes the base graph a real graphify would.
  const script = (command: string, args: string[]): { status: number; signal: null; stdout: string; stderr: string } => {
    if (args.includes("update")) map.set(`${ROOT}/graphify-out/graph.json`, JSON.stringify(BASE_GRAPH));
    return { status: 0, signal: null, stdout: "", stderr: "" };
  };
  const map = new Map(Object.entries(files));
  const dirSet = new Set(dirs);
  const out: string[] = [];
  const err: string[] = [];
  const writes: string[] = [];
  const isDir = (p: string): boolean => dirSet.has(p) || [...map.keys()].some((k) => k.startsWith(`${p}/`));
  const deps: RuntimeDeps = {
    runtime: "node",
    fs: {
      readFileSync(file) {
        if (isDir(file)) throw new Error("EISDIR");
        const value = map.get(file);
        if (value === undefined) throw new Error(`ENOENT ${file}`);
        return value;
      },
      writeFileSync(file, data) { writes.push(file); map.set(file, data); },
      existsSync: (file) => map.has(file) || isDir(file),
      readdirSync(dir) {
        if (!isDir(dir)) throw new Error(`ENOTDIR ${dir}`);
        const names = new Set<string>();
        for (const key of [...map.keys(), ...dirSet]) {
          if (key.startsWith(`${dir}/`)) names.add(key.slice(dir.length + 1).split("/")[0]);
        }
        return [...names].sort();
      },
      mkdirSync: unsupported("mkdirSync"),
      rmSync(file) { map.delete(file); },
      realpathSync: (file) => file,
      readFile: unsupported("readFile"),
      writeFile: unsupported("writeFile"),
      exists: unsupported("exists"),
      readdir: unsupported("readdir"),
    },
    path: posix,
    child: { runSync: (command, args) => { calls.push({ command, args }); return script(command, args); }, run: unsupported("run") },
    crypto: { sha256Hex: unsupported("sha256Hex") },
    os: { tmpdir: () => "/tmpfake", platform: () => "linux" },
    clock: { now: () => Date.UTC(2026, 9, 7, 12), monotonicMs: () => 0 },
    io: { stdout: { write: (t) => { out.push(t); } }, stderr: { write: (t) => { err.push(t); } } },
    proc: { argv: [], env, execPath: "node", cwd: () => ROOT },
  };
  return { deps, files: map, out, err, writes, calls };
}

const entry = (id: string, extra = "", body = ""): string =>
  `---\nid: ${id}\ntype: pattern\ntags: [alpha]\n${extra}---\n# Title of ${id}\n${body}\n`;

const cleanTree = (): Record<string, string> => ({
  [`${KNOW}/patterns/b-pattern.md`]: entry("b-pattern", "", "See [[a-pattern]]."),
  [`${KNOW}/patterns/a-pattern.md`]: entry("a-pattern", "related: [b-pattern]\n"),
});

test("parseFrontmatter and wiki-links parse lists, quotes and bodies", () => {
  const { data, body } = parseFrontmatter("---\nid: \"x\"\ntags: [a, 'b', ]\n---\n# T\n[[one]] [[two]] [[one]]\n");
  assert.equal(data.id, "x");
  assert.deepEqual(data.tags, ["a", "b"]);
  assert.deepEqual(extractWikiLinks(body), ["one", "two"]);
});

test("--check on a clean tree: exit 0, CLEAN, nothing written", () => {
  const f = fake(cleanTree());
  const code = main(["--check"], f.deps);
  const text = f.out.join("");
  assert.equal(code, 0);
  assert.match(text, /^Knowledge graph: 2 entries \(0 decisions, 2 patterns, 0 entities, 0 issues\), 2 links\.\n/);
  assert.match(text, /Graph status: CLEAN\n/);
  assert.match(text, /Dry run \(check\) — no files written\.\n/);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.err, []);
});

test("--check with a duplicate id fires: exit 1, NEEDS ATTENTION (guard must not be removed)", () => {
  const f = fake({
    ...cleanTree(),
    [`${KNOW}/patterns/c-copy.md`]: entry("a-pattern", "related: [a-pattern]\n"),
  });
  const code = main(["--check"], f.deps);
  const text = f.out.join("");
  assert.equal(code, 1);
  assert.match(text, /ERROR \.project\/knowledge\/patterns\/c-copy\.md: duplicate id "a-pattern" also used by \.project\/knowledge\/patterns\/a-pattern\.md\n/);
  assert.match(text, /Graph status: NEEDS ATTENTION \(1 error\(s\)\)\n/);
  assert.deepEqual(f.writes, []);
});

test("warnings only: broken link and orphan give exit 0 and OK WITH WARNINGS", () => {
  const f = fake({
    [`${KNOW}/patterns/lonely.md`]: "---\nid: lonely\n---\n# Lonely\n",
    [`${KNOW}/decisions/d.md`]: "---\nid: d\ntags: [t]\nrelated: [ghost]\n---\n# D\n",
  });
  const code = main(["--check"], f.deps);
  const text = f.out.join("");
  assert.equal(code, 0);
  assert.match(text, /WARN  \.project\/knowledge\/decisions\/d\.md: broken link — related entry "ghost" not found\n/);
  assert.match(text, /WARN  \.project\/knowledge\/patterns\/lonely\.md: orphan — /);
  assert.match(text, /Graph status: OK WITH WARNINGS \(2\)\n/);
});

test("missing frontmatter id falls back to the filename with a warning", () => {
  const f = fake({ [`${KNOW}/issues/no-id.md`]: "---\ntags: [x]\n---\n# No id\n" });
  assert.equal(main(["--json", "--check"], f.deps), 0);
  const report = JSON.parse(f.out.join(""));
  assert.deepEqual(report.problems, [
    { level: "warn", file: ".project/knowledge/issues/no-id.md", message: 'missing frontmatter id — using filename "no-id"' },
  ]);
});

test("update runs graphify through uv, overlays knowledge entries, writes index and provisions ignore files", () => {
  const f = fake(cleanTree());
  assert.equal(main([], f.deps), 0);
  assert.deepEqual(f.calls.map((c) => [c.command, ...c.args]), [
    ["uv", "--version"],
    ["uv", "tool", "run", "--from", "graphifyy==0.9.80", "graphify", "update", ROOT],
  ]);
  const graph = JSON.parse(f.files.get(`${ROOT}/graphify-out/graph.json`) ?? "");
  const knowledge = graph.nodes.filter((n: { node_kind?: string }) => n.node_kind === "knowledge");
  assert.deepEqual(knowledge.map((n: { id: string }) => n.id), ["a-pattern", "b-pattern"]);
  assert.ok(graph.nodes.some((n: { id: string }) => n.id === "code_fn"), "graphify's own nodes are kept");
  assert.equal(graph.links.filter((l: { relation: string }) => l.relation === "related").length, 2);
  assert.ok(graph.links.some((l: { relation: string; source: string; target: string }) => l.relation === "contains" && l.source === "a-pattern" && l.target === "heading_a"));
  assert.deepEqual(graph.graph.workflow.tagIndex, { alpha: ["a-pattern", "b-pattern"] });
  assert.match(f.files.get(`${KNOW}/index.md`) ?? "", /^# Knowledge Index\n\nLast updated: 2026-10-07 — generated by /);
  assert.match(f.files.get(`${ROOT}/.gitignore`) ?? "", /graphify-out\/\*\n!graphify-out\/graph\.json/);
  assert.ok(f.files.has(`${ROOT}/.graphifyignore`));
  assert.match(f.out.join(""), /Wrote graphify-out\/graph\.json and \.project\/knowledge\/index\.md; created\/updated \.graphifyignore and \.gitignore\./);
  // Re-running replaces the overlay instead of stacking it, and never rewrites an existing .gitignore block.
  const before = f.files.get(`${ROOT}/.gitignore`);
  main([], f.deps);
  const again = JSON.parse(f.files.get(`${ROOT}/graphify-out/graph.json`) ?? "");
  assert.equal(again.nodes.filter((n: { node_kind?: string }) => n.node_kind === "knowledge").length, 2);
  assert.equal(f.files.get(`${ROOT}/.gitignore`), before);
});

test("update migrates the legacy graph.json only when the new graph covers it", () => {
  const covered = fake({ ...cleanTree(), [`${KNOW}/graph.json`]: JSON.stringify({ nodes: [{ id: "a-pattern" }], edges: [{ from: "a-pattern", to: "b-pattern" }] }) });
  assert.equal(main([], covered.deps), 0);
  assert.equal(covered.files.has(`${KNOW}/graph.json`), false);
  assert.match(covered.out.join(""), /migrated and removed legacy \.project\/knowledge\/graph\.json/);
  const gap = fake({ ...cleanTree(), [`${KNOW}/graph.json`]: JSON.stringify({ nodes: [{ id: "gone" }], edges: [] }) });
  assert.equal(main([], gap.deps), 0);
  assert.equal(gap.files.has(`${KNOW}/graph.json`), true);
  assert.match(gap.out.join(""), /kept legacy/);
  assert.equal(legacyCovered("nope", buildGraph(ROOT, covered.deps).graph), false);
});

test("an error-level problem stops the build before graphify runs", () => {
  const f = fake({ ...cleanTree(), [`${KNOW}/patterns/c-copy.md`]: entry("a-pattern") });
  assert.equal(main([], f.deps), 1);
  assert.deepEqual(f.calls, []);
  assert.match(f.out.join(""), /Not building: fix the error-level problems first\./);
});

test("graphify failure and a missing uv are reported on stderr with exit 1", () => {
  const f = fake(cleanTree());
  f.deps.child.runSync = (_command, args) => ({ status: args.includes("--version") ? 127 : 0, signal: null, stdout: "", stderr: "" });
  assert.equal(main([], f.deps), 1);
  assert.match(f.err.join(""), /uv is not installed/);
  assert.equal(graphifyCommand(f.deps), null);
  const bin = fake(cleanTree(), [], { GRAPHIFY_BIN: "/opt/graphify" });
  assert.deepEqual(graphifyCommand(bin.deps), { command: "/opt/graphify", prefix: [] });
  const broken = fake(cleanTree());
  broken.deps.child.runSync = (_command, args) => ({ status: args.includes("update") ? 2 : 0, signal: null, stdout: "", stderr: "boom" });
  assert.equal(main([], broken.deps), 1);
  assert.match(broken.err.join(""), /`graphify update` failed \(exit 2\)\.\nboom/);
});

test("setup also installs the git hooks; other subcommands pass through to graphify", () => {
  const f = fake(cleanTree());
  assert.equal(main(["setup"], f.deps), 0);
  assert.deepEqual(f.calls.at(-1)?.args, ["tool", "run", "--from", "graphifyy==0.9.80", "graphify", "hook", "install"]);
  assert.match(f.out.join(""), /installed graphify git hooks/);
  const q = fake(cleanTree());
  assert.equal(main(["query", "gates"], q.deps), 0);
  assert.deepEqual(q.calls.at(-1)?.args, ["tool", "run", "--from", "graphifyy==0.9.80", "graphify", "query", "gates"]);
});

test("overlayKnowledge namespaces an entry id that collides with a graphify node id", () => {
  const { graph } = buildGraph(ROOT, fake(cleanTree()).deps);
  const merged = overlayKnowledge({ nodes: [{ id: "a-pattern" }], links: [] }, graph);
  assert.ok(merged.nodes.some((n) => n.id === "knowledge:a-pattern" && n.entry_id === "a-pattern"));
  assert.ok(merged.links.every((l) => merged.nodes.some((n) => n.id === l.source) && merged.nodes.some((n) => n.id === l.target)));
});

test("--json prints stats, problems, wrote flag and files", () => {
  const f = fake(cleanTree());
  assert.equal(main(["--json"], f.deps), 0);
  const report = JSON.parse(f.out.join(""));
  assert.deepEqual(Object.keys(report), ["stats", "problems", "wrote", "files"]);
  assert.equal(report.wrote, true);
  assert.deepEqual(report.problems, []);
  assert.deepEqual(Object.keys(report.stats), ["total", "decisions", "patterns", "entities", "issues", "edges", "brokenLinks", "orphans"]);
  const g = fake(cleanTree());
  main(["--json", "--check"], g.deps);
  assert.equal(JSON.parse(g.out.join("")).wrote, false);
  assert.deepEqual(g.calls, [], "check never calls uv");
  assert.equal(g.out.join("").split("\n").length > 3, true, "pretty-printed with a trailing newline");
});

test("missing .project/knowledge: message on stderr, exit 1, no stdout", () => {
  const f = fake({});
  assert.equal(main(["--check"], f.deps), 1);
  assert.deepEqual(f.out, []);
  assert.equal(f.err.join(""), "graphify: .project/knowledge does not exist — run /setup and approve the .project scaffold first.\n");
});

test("non-md files and directories named *.md are skipped", () => {
  const f = fake({ ...cleanTree(), [`${KNOW}/patterns/notes.txt`]: "x", [`${KNOW}/patterns/folder.md/inner.md`]: entry("inner") });
  assert.equal(main(["--check", "--json"], f.deps), 0);
  assert.equal(JSON.parse(f.out.join("")).stats.total, 2);
});

test("integration: the direct TypeScript command builds the overlay with a stub graphify", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "graphify-test-")));
  try {
    const know = join(dir, ".project", "knowledge", "patterns");
    mkdirSync(know, { recursive: true });
    writeFileSync(join(know, "one.md"), entry("one", "related: [two]\n"));
    writeFileSync(join(know, "two.md"), entry("two"));
    const stub = join(dir, "stub-graphify");
    writeFileSync(stub, `#!/bin/sh\nmkdir -p graphify-out && echo '{"nodes":[],"links":[],"graph":{}}' > graphify-out/graph.json\n`);
    chmodSync(stub, 0o755);
    const run = (...args: string[]) => spawnSync("node", [shim, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, GRAPHIFY_BIN: stub } });

    const check = run("--check", "--json");
    assert.equal(check.status, 0, check.stderr);
    assert.equal(JSON.parse(check.stdout).stats.total, 2);
    assert.equal(existsSync(join(dir, "graphify-out")), false);

    const write = run();
    assert.equal(write.status, 0, write.stderr);
    const graph = JSON.parse(readFileSync(join(dir, "graphify-out", "graph.json"), "utf8"));
    assert.equal(graph.links.filter((l: { relation: string }) => l.relation === "related").length, 1);
    assert.match(readFileSync(join(dir, ".project", "knowledge", "index.md"), "utf8"), /one --> two/);

    writeFileSync(join(know, "dup.md"), entry("one"));
    const stale = run("--check");
    assert.equal(stale.status, 1);
    assert.match(stale.stdout, /Graph status: NEEDS ATTENTION \(1 error\(s\)\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
