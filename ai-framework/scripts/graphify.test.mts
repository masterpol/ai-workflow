import assert from "node:assert/strict";
import { test } from "node:test";

import { RAW_HOOK_END, RAW_HOOK_START, extractWikiLinks, renderIndex, hasRawHook, graphifyCommand, hookBlock, installHooks, legacyCovered, main, overlayKnowledge, parseFrontmatter, buildGraph } from "./graphify.mts";
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
      lstatSync(file) {
        const directory = isDir(file);
        if (!directory && !map.has(file)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        return { isDirectory: () => directory, isFile: () => !directory, isSymbolicLink: () => false,
          size: new TextEncoder().encode(map.get(file) ?? "").length, nlink: 1, mode: 0o644, dev: 1, ino: 1, uid: 0, mtimeMs: 0 };
      },
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
  assert.deepEqual(Object.keys(report.stats), ["total", "decisions", "patterns", "entities", "issues", "edges", "brokenLinks", "orphans", "decisionStatus"]);
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

// ---- decision status and supersession ----

const decision = (id: string, extra = ""): string => `---\nid: ${id}\ntype: decision\ntags: [design]\n${extra}---\n# Decision ${id}\n`;
const decisionTree = (files: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(files).map(([id, text]) => [`${KNOW}/decisions/${id}.md`, text]));
const errorsOf = (files: Record<string, string>): string[] => buildGraph(ROOT, fake(decisionTree(files)).deps).problems.filter((problem) => problem.level === "error").map((problem) => problem.message);

test("a decision with no status reads as accepted without any warning, and the counts say so", () => {
  const { graph, problems } = buildGraph(ROOT, fake(decisionTree({ "old-one": decision("old-one"), "old-two": decision("old-two") })).deps);
  assert.deepEqual(problems, []);
  assert.deepEqual(graph.nodes.map((node) => node.status), ["accepted", "accepted"]);
  assert.deepEqual(graph.stats.decisionStatus, { accepted: 2, superseded: 0, deprecated: 0 });
});

test("decision status, supersedes, superseded_by, alternatives and applies-to parse", () => {
  const { graph, problems } = buildGraph(ROOT, fake(decisionTree({
    "new-way": decision("new-way", "supersedes: [old-way]\nalternatives: [do-nothing, big-rewrite]\napplies-to: [ship, audit]\n"),
    "old-way": decision("old-way", "status: superseded\nsuperseded_by: new-way\n"),
  })).deps);
  assert.deepEqual(problems.filter((problem) => problem.level === "error"), []);
  const byId = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  assert.equal(byId["old-way"].status, "superseded");
  assert.equal(byId["old-way"].supersededBy, "new-way");
  assert.deepEqual(byId["new-way"].supersedes, ["old-way"]);
  assert.deepEqual(byId["new-way"].alternatives, ["do-nothing", "big-rewrite"]);
  assert.deepEqual(byId["new-way"].appliesTo, ["ship", "audit"]);
  assert.deepEqual(graph.edges.filter((edge) => edge.relation === "supersedes"), [{ from: "new-way", to: "old-way", relation: "supersedes" }]);
  assert.deepEqual(graph.stats.decisionStatus, { accepted: 1, superseded: 1, deprecated: 0 });
});

test("supersession errors: unknown status, superseded without a successor, one-sided links, missing targets", () => {
  assert.deepEqual(errorsOf({ a: decision("a", "status: maybe\n") }), ['unknown decision status "maybe" (use accepted, superseded, deprecated)']);
  assert.deepEqual(errorsOf({ a: decision("a", "status: superseded\n") }), ["status superseded needs a superseded_by naming the decision that replaces it"]);
  assert.match(errorsOf({ a: decision("a", "status: superseded\nsuperseded_by: b\n"), b: decision("b") })[0], /superseded_by "b", which does not list supersedes: a/);
  assert.match(errorsOf({ a: decision("a"), b: decision("b", "supersedes: [a]\n") })[0], /"b" supersedes this decision but superseded_by does not name it/);
  assert.match(errorsOf({ b: decision("b", "supersedes: [nothing]\n") })[0], /supersedes "nothing", which is not a decision entry/);
  assert.match(errorsOf({ a: decision("a", "status: superseded\nsuperseded_by: ghost\n") })[0], /superseded_by "ghost" is not a decision entry/);
});

test("a pattern cannot be superseded, and the status keys mean nothing outside decisions", () => {
  const files = { [`${KNOW}/patterns/p.md`]: entry("p", "status: nonsense\n") };
  const { graph, problems } = buildGraph(ROOT, fake(files).deps);
  assert.deepEqual(problems.filter((problem) => problem.level === "error"), []);
  assert.equal(graph.nodes[0].status, undefined);
});

test("the index shows each decision's status and counts accepted and superseded separately; the overlay carries a supersedes link", () => {
  const f = fake(decisionTree({
    "new-way": decision("new-way", "supersedes: [old-way]\n"),
    "old-way": decision("old-way", "status: superseded\nsuperseded_by: new-way\n"),
  }));
  const { graph } = buildGraph(ROOT, f.deps);
  const index = renderIndex(graph, ROOT, f.deps);
  assert.match(index, /## Decisions \(2 entries, 1 accepted, 1 superseded, 0 deprecated\)/);
  assert.match(index, /old-way\.md\) — Decision old-way _\(superseded by new-way\)_/);
  assert.match(index, /new-way -\.->\|supersedes\| old-way/);
  const overlaid = overlayKnowledge({ nodes: [], links: [] }, graph);
  assert.deepEqual(overlaid.links.filter((link) => link.relation === "supersedes").map((link) => [link.source, link.target]), [["new-way", "old-way"]]);
});

// ---- workflow relations overlay ---------------------------------------------------------------------------------

import { MANIFEST_FILE } from "./graphify-relations.mts";
import { encodeData } from "./runtime/toon-data.mts";
import { overlayWorkflow, workflowEdges } from "./graphify.mts";

const WF_SKILL = ".claude/skills/ship/SKILL.md";
const WF_AGENT = ".claude/agents/reviewer.md";
const WF_RULE = "ai-framework/rules/security.md";
const WF_PHASE = "ai-framework/workflow/phases/4-ship.md";
const WF_MIRROR = ".cursor/skills/ship/SKILL.md";
function manifestText(entries: unknown[]): string {
  const encoded = encodeData({ schemaVersion: 1, entries });
  if (encoded.status === "refused") throw new Error(encoded.problem.text);
  return encoded.text;
}
const wfFiles = (extra: Record<string, string> = {}): Record<string, string> => ({
  ".project/knowledge/patterns/one.md": entry("one"),
  [WF_SKILL]: "# ship\n", [WF_AGENT]: "# reviewer\n", [WF_RULE]: "# security\n", [WF_PHASE]: "# phase\n", [WF_MIRROR]: "# ship\n",
  [MANIFEST_FILE]: manifestText([{ path: WF_SKILL, phaseDoc: WF_PHASE, dispatches: [WF_AGENT] }, { path: WF_AGENT, reads: [WF_RULE] }, { path: WF_PHASE, standalone: "owned by the ship skill" }]),
  ...extra,
});
// A stub graphify whose graph has one file node per workflow file (label equals source file, as the real graph has).
const stubGraph = (files: string[]): string => {
  const nodes = files.map((file, i) => ({ id: `n${i}`, label: file, source_file: file, node_kind: "page" }));
  return `#!/bin/sh\nmkdir -p graphify-out && echo '${JSON.stringify({ nodes, links: [], graph: {} })}' > graphify-out/graph.json\n`;
};

test("overlayWorkflow adds typed workflow links, replaces a previous overlay, reports unresolved paths and leaves other links alone", () => {
  const base = {
    nodes: [{ id: "a", label: "a.md", source_file: "a.md" }, { id: "b", label: "b.md", source_file: "b.md" }],
    links: [{ source: "a", target: "b", relation: "references" }, { source: "a", target: "b", relation: "related", workflow_overlay: true }],
  };
  const edges = [{ from: "a.md", to: "b.md", relation: "dispatches" as const }, { from: "a.md", to: "ghost.md", relation: "reads" as const }];
  const first = overlayWorkflow(base, edges);
  assert.deepEqual(first.stubbed, ["ghost.md"]);
  assert.ok(first.graph.nodes.some((node) => node.source_file === "ghost.md" && node.workflow_stub), "a file Graphify skipped gets a stub node so the edge can attach");
  assert.deepEqual(first.graph.links.filter((link) => link.workflow_overlay && link.relation === "dispatches").map((link) => [link.source, link.target]), [["a", "b"]]);
  assert.equal(first.graph.links.length, 4, "native references link and knowledge `related` link survive");
  const second = overlayWorkflow(first.graph, edges);
  assert.equal(second.graph.links.length, 4, "a rebuild replaces, never duplicates");
  assert.equal(second.graph.nodes.length, first.graph.nodes.length, "stub nodes are not duplicated either");
  assert.deepEqual((second.graph.graph as { workflow: { edges: unknown } }).workflow.edges, { dispatches: 1, reads: 1 });
  const refOnly = overlayWorkflow(base, [{ from: "a.md", to: "ghost.md", relation: "references" }]);
  assert.deepEqual(refOnly.stubbed, [], "a prose mention of an unindexed file is dropped, not stubbed");
});

test("workflow relations: --check passes with a manifest, and a skill without an entry fails it (scenario H)", () => {
  const dir = tempFixture(deps, wfFiles());
  try {
    const run = (...args: string[]) => runScript(deps, shim, args, { cwd: dir, encoding: "utf8", env: { ...process.env, GRAPHIFY_BIN: "/nonexistent" } });
    const ok = run("--check", "--json");
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const report = JSON.parse(ok.stdout);
    assert.deepEqual(report.workflow.edges, { "phase-doc": 1, dispatches: 1, reads: 1, mirrors: 1 });
    deps.fs.mkdirSync(deps.path.join(dir, ".claude/skills/newskill"), { recursive: true });
    deps.fs.writeFileSync(deps.path.join(dir, ".claude/skills/newskill/SKILL.md"), "# new\n");
    const bad = run("--check");
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /ERROR .*newskill\/SKILL\.md: .*has no relations entry; add one to/);
    assert.match(bad.stdout, /Graph status: NEEDS ATTENTION \(1 error\(s\)\)/);
  } finally {
    deps.fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("workflow relations: update overlays the edges named mirrors, phase-doc, dispatches, reads, and a second update leaves the count unchanged", () => {
  const files = [WF_SKILL, WF_AGENT, WF_RULE, WF_PHASE, WF_MIRROR];
  const dir = tempFixture(deps, wfFiles({ "stub-graphify": { content: stubGraph(files), mode: 0o755 } as never }));
  try {
    deps.fs.chmodSync(deps.path.join(dir, "stub-graphify"), 0o755);
    const run = (...args: string[]) => runScript(deps, shim, args, { cwd: dir, encoding: "utf8", env: { ...process.env, GRAPHIFY_BIN: deps.path.join(dir, "stub-graphify") } });
    const read = () => JSON.parse(deps.fs.readFileSync(deps.path.join(dir, "graphify-out", "graph.json"), "utf8")) as { nodes: { id: string; source_file?: string }[]; links: { relation: string; workflow_overlay?: boolean; source: string; target: string }[] };
    assert.equal(run().status, 0);
    const first = read();
    const names = (graph: ReturnType<typeof read>) => graph.links.filter((link) => link.workflow_overlay).map((link) => link.relation).sort();
    assert.deepEqual(names(first), ["dispatches", "mirrors", "phase-doc", "reads"]);
    const idOf = (graph: ReturnType<typeof read>, file: string) => graph.nodes.find((node) => node.source_file === file)!.id;
    assert.ok(first.links.some((link) => link.relation === "mirrors" && link.source === idOf(first, WF_MIRROR) && link.target === idOf(first, WF_SKILL)), "a mirror points at its canonical file");
    assert.equal(run().status, 0);
    assert.deepEqual(names(read()), names(first));
  } finally {
    deps.fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("workflow relations: a project with skills but no manifest warns, a damaged manifest is an error, and a bare knowledge tree is untouched", () => {
  const withoutManifest = wfFiles();
  delete withoutManifest[MANIFEST_FILE];
  const dir = tempFixture(deps, withoutManifest);
  try {
    const run = (...args: string[]) => runScript(deps, shim, args, { cwd: dir, encoding: "utf8", env: { ...process.env, GRAPHIFY_BIN: "/nonexistent" } });
    const warned = run("--check");
    assert.equal(warned.status, 0);
    assert.match(warned.stdout, /WARN .*relations\.toon is missing; sync the bundle/);
    deps.fs.writeFileSync(deps.path.join(dir, MANIFEST_FILE), "@toon-data 1\nentries[2]:\n  - path: x");
    const damaged = run("--check");
    assert.equal(damaged.status, 1);
    assert.match(damaged.stdout, /was refused/);
  } finally {
    deps.fs.rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(workflowEdges(ROOT, fake(cleanTree()).deps), null, "no workflow layout, nothing to relate");
});

// ---- audit cycle 1: workflow edges through the real checks, and decision edge cases ----

import { DEFAULT_REF_BUDGET, REF_HUB_LIMIT } from "./graphify-refs.mts";

function withWorkflowRoot(files: Record<string, string>, check: (root: string) => void): void {
  const dir = tempFixture(deps, files);
  try { check(dir); } finally { deps.fs.rmSync(dir, { recursive: true, force: true }); }
}
const standalone = (paths: string[]): string => manifestText(paths.map((path) => ({ path, standalone: "fixture" })));

test("a file named by more than REF_HUB_LIMIT sources yields no edges and is reported as a hub; at the limit it still does", () => {
  const rules = (n: number): Record<string, string> => Object.fromEntries(Array.from({ length: n }, (_, i) => [`ai-framework/rules/r${i}.md`, "see ai-framework/integrations/shared.md\n"]));
  for (const [count, hubbed] of [[REF_HUB_LIMIT + 1, true], [REF_HUB_LIMIT, false]] as const) {
    const files = { ...rules(count), "ai-framework/integrations/shared.md": "# shared\n", [MANIFEST_FILE]: standalone(Object.keys(rules(count))) };
    withWorkflowRoot(files, (root) => {
      const result = workflowEdges(root, deps)!;
      assert.deepEqual(result.problems, []);
      assert.equal(result.counts.references ?? 0, hubbed ? 0 : count);
      assert.deepEqual(result.hubs, hubbed ? [{ target: "ai-framework/integrations/shared.md", sources: count }] : []);
    });
  }
});

test("a reference that repeats a declared relation adds no second edge, and a source over the per-file budget is an error", () => {
  const targets = Object.fromEntries(Array.from({ length: DEFAULT_REF_BUDGET.perFile + 1 }, (_, i) => [`ai-framework/integrations/t${i}.md`, "# t\n"]));
  const files = {
    ".claude/skills/ship/SKILL.md": "# ship\nreads ai-framework/rules/security.md\n", "ai-framework/rules/security.md": "# s\n",
    "ai-framework/rules/wide.md": Object.keys(targets).join("\n") + "\n", ...targets,
    [MANIFEST_FILE]: manifestText([{ path: ".claude/skills/ship/SKILL.md", reads: ["ai-framework/rules/security.md"] }, { path: "ai-framework/rules/wide.md", standalone: "fixture" }, ...Object.keys(targets).map((path) => ({ path, standalone: "fixture" }))]),
  };
  withWorkflowRoot(files, (root) => {
    const result = workflowEdges(root, deps)!;
    assert.equal(result.edges.filter((edge) => edge.from === ".claude/skills/ship/SKILL.md" && edge.to === "ai-framework/rules/security.md").length, 1, "declared reads edge only");
    assert.ok(result.problems.some((problem) => problem.level === "error" && /exceed per-file budget/.test(problem.message)), "the busy source is an error, not a silent truncation");
  });
});

test("decision edge cases: a deprecated decision is counted, and superseded_by needs status superseded and cannot name itself", () => {
  const { graph } = buildGraph(ROOT, fake(decisionTree({ gone: decision("gone", "status: deprecated\n"), kept: decision("kept") })).deps);
  assert.deepEqual(graph.stats.decisionStatus, { accepted: 1, superseded: 0, deprecated: 1 });
  assert.match(errorsOf({ a: decision("a", "superseded_by: b\n"), b: decision("b", "supersedes: [a]\n") })[0], /superseded_by "b" needs status: superseded/);
  assert.ok(errorsOf({ a: decision("a", "supersedes: [a]\nsuperseded_by: a\nstatus: superseded\n") }).some((message) => /cannot supersede itself/.test(message)));
});

// First real legacy upgrades exposed missing root-relative outcome links and slug navigation.
const shippedOutcome = (slug: string, fields: Partial<Record<string, string>> = {}): string => [
  "---", `slug: ${slug}`, "shipped: 2026-10-08", "schemaVersion: 1", "---", `# ${slug}`, "",
  "The fixture change shipped.", "Read its owning files below.", "Verification remains historical.", "",
  ...["outcome", "docs", "decisions", "knowledge", "code", "verification", "followups", "archive"].map(field => `- ${field}: ${fields[field] ?? (field === "outcome" ? "Changed the fixture." : "none")}`), "",
].join("\n");

test("outcome records reach root docs, decisions and code in one hop from their slug, even without workflow layout", () => {
  const record = ".project/records/shipped/alpha.md";
  const root = tempFixture(deps, { [record]: shippedOutcome("alpha", { docs: "[docs](README.md)", decisions: "[decision](.project/knowledge/decisions/one.md)", code: "[code](src/one.mts)" }), "README.md": "# Docs\n", ".project/knowledge/decisions/one.md": "# Decision\n", "src/one.mts": "export {};\n" });
  try {
    const result = workflowEdges(root, deps);
    assert.notEqual(result, null, "outcome-only projects still need navigation");
    assert.deepEqual(result!.problems, []);
    assert.deepEqual(result!.edges.map(edge => edge.to).sort(), [".project/knowledge/decisions/one.md", "README.md", "src/one.mts"]);
    const base = { nodes: [{ id: "record", label: record, source_file: record, node_kind: "page" }, { id: "alpha-heading", label: "alpha", source_file: record, node_kind: "heading" }], links: [] };
    const first = overlayWorkflow(base, result!.edges).graph;
    assert.equal(first.links.filter(link => link.source === "alpha-heading").length, 3, "Graphify explain alpha selects its heading");
    assert.deepEqual(overlayWorkflow(first, result!.edges).graph.links, first.links, "rebuild never duplicates navigation");
  } finally { deps.fs.rmSync(root, { recursive: true, force: true }); }
});

test("explicit outcome links survive shared-target hub filtering and retain their own bounded relation", () => {
  const files: Record<string, string> = { "README.md": "# Docs\n" };
  for (let i = 0; i < 30; i++) files[`.project/records/shipped/pitch-${i}.md`] = shippedOutcome(`pitch-${i}`, { docs: "[docs](README.md)" });
  const root = tempFixture(deps, files);
  try {
    const result = workflowEdges(root, deps)!;
    assert.deepEqual(result.problems, []); assert.equal(result.edges.length, 30);
    assert.ok(result.edges.every(edge => edge.relation === "outcome-link" && edge.to === "README.md"));
    assert.deepEqual(result.hubs, []);
  } finally { deps.fs.rmSync(root, { recursive: true, force: true }); }
});
