import assert from "node:assert/strict";
import { test } from "node:test";

import { RAW_HOOK_END, RAW_HOOK_START, extractWikiLinks, hasRawHook, graphifyCommand, hookBlock, installHooks, legacyCovered, main, overlayKnowledge, parseFrontmatter, buildGraph } from "./graphify.mts";
import { createTestDeps, runScript, tempFixture, urlPath } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const ROOT = "/proj";
const KNOW = `${ROOT}/.project/knowledge`;
const shim = urlPath(new URL("./graphify.mts", import.meta.url));
const deps = createTestDeps();

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
  const fakeDeps: RuntimeDeps = {
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
    path: deps.path,
    child: { runSync: (command, args) => { calls.push({ command, args }); return script(command, args); }, run: unsupported("run") },
    crypto: { sha256Hex: unsupported("sha256Hex") },
    os: { tmpdir: () => "/tmpfake", platform: () => "linux" },
    clock: { now: () => Date.UTC(2026, 9, 7, 12), monotonicMs: () => 0 },
    io: { stdout: { write: (t) => { out.push(t); } }, stderr: { write: (t) => { err.push(t); } } },
    proc: { argv: [], env, execPath: "node", cwd: () => ROOT },
  };
  return { deps: fakeDeps, files: map, out, err, writes, calls };
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

test("entity entries in entities/ match their folder; a mismatched type still warns", () => {
  const f = fake({
    [`${KNOW}/entities/acme.md`]: "---\nid: acme\ntype: entity\ntags: [t]\nrelated: [d]\n---\n# Acme\n",
    [`${KNOW}/decisions/d.md`]: "---\nid: d\ntype: decision\ntags: [t]\nrelated: [acme]\n---\n# D\n",
    [`${KNOW}/patterns/p.md`]: "---\nid: p\ntype: entity\ntags: [t]\nrelated: [d]\n---\n# P\n",
  });
  const code = main(["--check"], f.deps);
  const text = f.out.join("");
  assert.equal(code, 0);
  assert.doesNotMatch(text, /entities\/acme\.md: frontmatter type/);
  assert.match(text, /patterns\/p\.md: frontmatter type "entity" doesn't match its folder "patterns"/);
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

test("setup installs the workflow's own hooks, never graphify's raw ones; other subcommands pass through to graphify", () => {
  const f = fake(cleanTree());
  assert.equal(main(["setup"], f.deps), 0);
  assert.equal(f.calls.some((call) => call.args.includes("hook")), false, "graphify hook install rebuilds without the knowledge overlay");
  assert.match(f.out.join(""), /git hooks not installed \(not a git work tree\)/);
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

test("overlayKnowledge drops graphify edges whose endpoint node does not exist", () => {
  const { graph } = buildGraph(ROOT, fake(cleanTree()).deps);
  const merged = overlayKnowledge({ nodes: [{ id: "page" }], links: [{ source: "page", target: "missing-page" }, { source: "page", target: "page" }] }, graph);
  assert.ok(!merged.links.some((l) => l.target === "missing-page"));
  assert.ok(merged.links.some((l) => l.source === "page" && l.target === "page"));
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
  const dir = tempFixture(deps, {
    ".project/knowledge/patterns/one.md": entry("one", "related: [two]\n"),
    ".project/knowledge/patterns/two.md": entry("two"),
    "stub-graphify": { content: `#!/bin/sh\nmkdir -p graphify-out && echo '{"nodes":[],"links":[],"graph":{}}' > graphify-out/graph.json\n`, mode: 0o755 },
  });
  try {
    const know = deps.path.join(dir, ".project", "knowledge", "patterns");
    const stub = deps.path.join(dir, "stub-graphify");
    const run = (...args: string[]) => runScript(deps, shim, args, { cwd: dir, encoding: "utf8", env: { ...process.env, GRAPHIFY_BIN: stub } });

    const check = run("--check", "--json");
    assert.equal(check.status, 0, check.stderr);
    assert.equal(JSON.parse(check.stdout).stats.total, 2);
    assert.equal(deps.fs.existsSync(deps.path.join(dir, "graphify-out")), false);

    const write = run();
    assert.equal(write.status, 0, write.stderr);
    const graph = JSON.parse(deps.fs.readFileSync(deps.path.join(dir, "graphify-out", "graph.json"), "utf8"));
    assert.equal(graph.links.filter((l: { relation: string }) => l.relation === "related").length, 1);
    assert.match(deps.fs.readFileSync(deps.path.join(dir, ".project", "knowledge", "index.md"), "utf8"), /one --> two/);

    deps.fs.writeFileSync(deps.path.join(know, "dup.md"), entry("one"));
    const stale = run("--check");
    assert.equal(stale.status, 1);
    assert.match(stale.stdout, /Graph status: NEEDS ATTENTION \(1 error\(s\)\)/);
  } finally {
    deps.fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- git hooks against real repositories ------------------------------------------------------------------------

function repo(t: { after(fn: () => void): void }): string {
  const root = tempFixture(deps, { ".project/knowledge/README.md": "# K\n" });
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  for (const args of [["init", "-q"], ["config", "user.email", "t@example.com"], ["config", "user.name", "t"], ["config", "commit.gpgsign", "false"]]) {
    assert.equal(deps.child.runSync("git", args, { cwd: root }).status, 0);
  }
  return root;
}
const hookFile = (root: string, event: string): string => deps.path.join(root, ".git/hooks", event);

test("installHooks writes both hooks, is idempotent, and replaces a raw graphify block while keeping other hook content", (t) => {
  const root = repo(t);
  const raw = `#!/bin/sh\necho keep-before\n${RAW_HOOK_START}\n( graphify raw rebuild )\n${RAW_HOOK_END}\necho keep-after\n`;
  deps.fs.writeFileSync(hookFile(root, "post-commit"), raw);
  const first = installHooks(root, deps);
  assert.deepEqual(first, { installed: ["post-commit", "post-checkout"], replacedRaw: ["post-commit"] });
  const commit = deps.fs.readFileSync(hookFile(root, "post-commit"));
  assert.match(commit, /^#!\/bin\/sh\necho keep-before\n# ai-workflow-graphify-start\n/);
  assert.match(commit, /# ai-workflow-graphify-end\necho keep-after\n$/);
  assert.doesNotMatch(commit, /graphify raw rebuild|graphify-hook-start/);
  assert.match(commit, /graphify\.mts update/);
  assert.equal(deps.fs.readFileSync(hookFile(root, "post-checkout")), `#!/bin/sh\n${hookBlock("post-checkout")}\n`);
  assert.equal(deps.fs.statSync(hookFile(root, "post-checkout")).mode & 0o111, 0o111);
  assert.deepEqual(installHooks(root, deps), { installed: ["post-commit", "post-checkout"], replacedRaw: [] });
  assert.equal(deps.fs.readFileSync(hookFile(root, "post-commit")), commit, "a second install changes nothing");
});

test("installHooks removes graphify's checkout block too, even beside an existing workflow block", (t) => {
  const root = repo(t);
  const text = `#!/bin/sh\n# graphify-checkout-hook-start\n( raw checkout rebuild )\n# graphify-checkout-hook-end\n${hookBlock("post-checkout")}\n`;
  deps.fs.writeFileSync(hookFile(root, "post-checkout"), text);
  const result = installHooks(root, deps);
  assert.deepEqual(result, { installed: ["post-commit", "post-checkout"], replacedRaw: ["post-checkout"] });
  const after = deps.fs.readFileSync(hookFile(root, "post-checkout"));
  assert.doesNotMatch(after, /raw checkout rebuild|graphify-checkout-hook/);
  assert.equal(after.split("# ai-workflow-graphify-start").length - 1, 1, "exactly one workflow block");
  assert.equal(hasRawHook(after), false);
});

test("installHooks refuses a symlinked hook and reports a non-repository", (t) => {
  const root = repo(t);
  const outside = tempFixture(deps, { "target.sh": "#!/bin/sh\n" });
  t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
  deps.fs.symlinkSync(deps.path.join(outside, "target.sh"), hookFile(root, "post-commit"));
  assert.match((installHooks(root, deps) as { error: string }).error, /post-commit hook is not a regular file/);
  assert.equal(deps.fs.readFileSync(deps.path.join(outside, "target.sh")), "#!/bin/sh\n");
  const plain = tempFixture(deps, {});
  t.after(() => deps.fs.rmSync(plain, { recursive: true, force: true }));
  assert.deepEqual(installHooks(plain, deps), { error: "not a git work tree" });
});

test("the installed post-commit hook reruns graphify.mts in the background, but not for a graph-only commit", { skip: process.platform === "win32", timeout: 30000 }, async (t) => {
  const root = repo(t);
  // Marker and log live outside the repository so they never become part of a commit.
  const outside = tempFixture(deps, {});
  t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
  const marker = deps.path.join(outside, "rebuilt.txt");
  // A stand-in for the real script: records each background run.
  deps.fs.mkdirSync(deps.path.join(root, "ai-framework/scripts"), { recursive: true });
  deps.fs.writeFileSync(deps.path.join(root, "ai-framework/scripts/graphify.mts"), `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(marker)}, process.argv.slice(2).join(" ") + "\\n");\n`);
  assert.ok(!("error" in installHooks(root, deps)));
  const env = { ...deps.proc.env, GRAPHIFY_REBUILD_LOG: deps.path.join(outside, "hook.log") };
  const commit = (file: string): void => {
    deps.fs.mkdirSync(deps.path.dirname(deps.path.join(root, file)), { recursive: true });
    deps.fs.writeFileSync(deps.path.join(root, file), `${file}\n`);
    assert.equal(deps.child.runSync("git", ["add", "-A"], { cwd: root, env }).status, 0);
    assert.equal(deps.child.runSync("git", ["commit", "-q", "-m", file], { cwd: root, env }).status, 0);
  };
  const runs = async (count: number): Promise<number> => {
    for (let i = 0; i < 100; i++) {
      const seen = deps.fs.existsSync(marker) ? deps.fs.readFileSync(marker).split("\n").filter(Boolean).length : 0;
      if (seen >= count) return seen;
      await deps.clock.sleep(100);
    }
    return deps.fs.existsSync(marker) ? deps.fs.readFileSync(marker).split("\n").filter(Boolean).length : 0;
  };
  commit("src/a.ts");
  assert.equal(await runs(1), 1, "a code commit triggers one background rebuild");
  assert.equal(deps.fs.readFileSync(marker), "update\n");
  deps.fs.rmSync(marker);
  commit("graphify-out/graph.json");
  await deps.clock.sleep(1500);
  assert.equal(deps.fs.existsSync(marker), false, "a commit of graph outputs only does not rebuild");
});
