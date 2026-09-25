const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const { run, cli, phases } = require("./add-skill");
const { identity, frontmatter, safeRelative, inspectSource } = require("./skill-source");
const { discoverVendors, adapters } = require("./skill-vendors");
const { context, digest, json, snapshot, readRegistry, transact, recover, resolveFile } = require("./skill-registry");

const ID = "example/repository/sample";
function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function git(root, ...args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" } }).trim();
}
function commit(root) { git(root, "add", "."); git(root, "commit", "-m", "Fixture change"); return git(root, "rev-parse", "HEAD"); }
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const repo = path.join(directory, "repo");
  const home = path.join(directory, "home");
  for (const item of [root, repo, home]) fs.mkdirSync(item);
  for (const item of [".claude", ".opencode", ".codex", ".cursor"]) fs.mkdirSync(path.join(root, item));
  git(repo, "init", "-b", "main");
  write(repo, "skills/sample/SKILL.md", "---\nname: sample\ndescription: Sample useful skill\n---\nRead [guide](references/guide.md). Run scripts/check.sh from this directory.\n");
  write(repo, "skills/sample/references/guide.md", "Keep all negative constraints. Never drop units.\n");
  write(repo, "skills/sample/scripts/check.sh", "#!/bin/sh\nexit 0\n");
  fs.chmodSync(path.join(repo, "skills/sample/scripts/check.sh"), 0o755);
  write(repo, "LICENSE", "Fixture MIT license\n");
  const revision = commit(repo);
  const options = { root, repo, skill: ID, scope: "project", phases: "shape,build", apply: true };
  return { directory, root, repo, home, options, revision, ctx: context(root, "project") };
}
function files(root) {
  const result = {};
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else result[path.relative(root, full)] = entry.isSymbolicLink() ? `link:${fs.readlinkSync(full)}` : fs.readFileSync(full).toString("base64");
    }
  }
  walk(root);
  return result;
}

test("installs one verified skill and all resources for every project vendor", (t) => {
  const { options, root, ctx, revision } = fixture(t);
  const result = run(options);
  assert.deepEqual(result.vendors.sort(), ["claude-code", "codex", "cursor", "opencode"]);
  assert.equal(result.revision, revision);
  const entry = readRegistry(ctx).registry.skills[ID];
  assert.equal(entry.source.revision, revision);
  assert.equal(entry.license.status, "present");
  assert.equal(entry.runtime.status, "unverified");
  assert.match(fs.readFileSync(path.join(root, entry.packagePath, "references/guide.md"), "utf8"), /Never drop units/);
  assert.equal(fs.statSync(path.join(root, entry.packagePath, "scripts/check.sh")).mode & 0o777, 0o755);
  for (const target of Object.values(entry.adapters)) {
    const wrapper = fs.readFileSync(path.join(root, target), "utf8");
    const link = wrapper.match(/\[the installed skill\]\(([^)]+)\)/)[1];
    assert.equal(fs.realpathSync(path.resolve(root, path.dirname(target), link)), fs.realpathSync(path.join(root, entry.packagePath, "SKILL.md")));
    assert.match(wrapper, /shape, build/);
  }
  const before = files(root);
  assert.deepEqual(run(options).changed, []);
  assert.deepEqual(files(root), before);
});

test("previews without any writes and requires explicit choices", (t) => {
  const { options, root } = fixture(t);
  const before = files(root);
  assert.equal(run({ ...options, apply: false }).applied, false);
  assert.deepEqual(files(root), before);
  assert.throws(() => run({ ...options, scope: undefined }), /Choose --scope/);
  assert.throws(() => run({ ...options, phases: undefined }), /Choose --phases/);
  assert.deepEqual(files(root), before);
  const inspected = run({ ...options, action: "inspect" });
  assert.equal(inspected.id, ID);
  assert.equal(inspected.files.length, 3);
  assert.match(inspected.instructions, /^---\nname: sample\n[\s\S]*Run scripts\/check\.sh/);
});

test("rejects missing, ambiguous and invalid sources without changing target", (t) => {
  const { options, root, repo } = fixture(t);
  const before = files(root);
  assert.throws(() => run({ ...options, skill: "example/repository/missing" }), /does not exist/);
  write(repo, "other/sample/SKILL.md", "---\nname: sample\ndescription: duplicate\n---\n"); commit(repo);
  assert.throws(() => run(options), /Ambiguous/);
  fs.rmSync(path.join(repo, "other"), { recursive: true });
  write(repo, "skills/sample/SKILL.md", "no frontmatter"); commit(repo);
  assert.throws(() => run(options), /frontmatter/);
  assert.deepEqual(files(root), before);
});

test("rejects unsafe identities and validates supported scalar frontmatter", () => {
  assert.equal(identity("https://www.skills.sh/example/repository/sample").id, ID);
  assert.equal(identity("https://skills.sh/example/repository/sample/").id, ID);
  for (const value of [undefined, "sample", "../repo/sample", "a/b/bad_name", "https://example.test/a/b/c", "https://user@skills.sh/a/b/c", "https://skills.sh/a/b/c?q=x"]) assert.throws(() => identity(value));
  assert.deepEqual(frontmatter("---\nname: 'sample'\ndescription: >-\n  useful\n  behavior\n---\n", "sample"), { name: "sample", description: "useful behavior" });
  assert.equal(frontmatter('---\nname: "sample"\ndescription: "Useful"\n---\n', "sample").description, "Useful");
  assert.equal(frontmatter('---\nname: sample\ndescription: "A skill with \\"quotes\\" and a\\nline"\n---\n', "sample").description, 'A skill with "quotes" and a\nline');
  assert.equal(frontmatter("---\nname: sample\ndescription: 'It''s useful'\n---\n", "sample").description, "It's useful");
  assert.throws(() => frontmatter('---\nname: sample\ndescription: "unterminated \\"\n---\n', "sample"), /Invalid double-quoted frontmatter value/);
  for (const text of ["---\nname: sample\nname: sample\ndescription: x\n---\n", "---\nname: sample\ndescription: []\n---\n", "---\nname: wrong\ndescription: x\n---\n"]) assert.throws(() => frontmatter(text, "sample"));
  for (const value of ["../a", "/a", "a//b", "a/./b", "a\\b", ".git/config", ".env", "credentials.json", "settings.local.json", "C:/file"]) assert.throws(() => safeRelative(value));
  assert.equal(safeRelative("references/readme.md"), "references/readme.md");
  for (const value of [[], ["shape", "shape"], ["unknown"], undefined]) assert.throws(() => phases(value));
});

test("rejects symlinks, case collisions and secret resources in source", (t) => {
  const { options, repo, root } = fixture(t);
  fs.symlinkSync("../outside", path.join(repo, "skills/sample/link")); commit(repo);
  assert.throws(() => run(options), /Symlink/);
  fs.unlinkSync(path.join(repo, "skills/sample/link"));
  write(repo, "skills/sample/.env", "fixture-only-placeholder"); commit(repo);
  assert.throws(() => run(options), /Unsafe relative path/);
  fs.unlinkSync(path.join(repo, "skills/sample/.env"));
  // Git trees can hold case collisions even on a case-insensitive host filesystem.
  commit(repo);
  const blob = git(repo, "hash-object", "skills/sample/SKILL.md");
  git(repo, "update-index", "--add", "--cacheinfo", `100644,${blob},skills/sample/skill.md`);
  git(repo, "commit", "-m", "Case collision");
  assert.throws(() => run(options), /Case-colliding/);
  assert.deepEqual(files(root), {});
});

test("pins an older revision and handles root skills and absent licenses", (t) => {
  const { options, repo, revision } = fixture(t);
  write(repo, "skills/sample/references/guide.md", "Changed\n"); commit(repo);
  assert.match(inspectSource(ID, { ...options, ref: revision }).files["references/guide.md"].data.toString(), /Never drop/);
  const text = fs.readFileSync(path.join(repo, "skills/sample/SKILL.md"));
  fs.rmSync(path.join(repo, "skills"), { recursive: true });
  fs.unlinkSync(path.join(repo, "LICENSE"));
  write(repo, "SKILL.md", text);
  write(repo, "references/guide.md", "Guide");
  commit(repo);
  const rootSkill = inspectSource(ID, options);
  assert.equal(rootSkill.sourcePath, "SKILL.md");
  assert.equal(rootSkill.license, null);
  assert.throws(() => inspectSource(ID, { repo: "relative" }), /absolute/);
  assert.throws(() => inspectSource(ID, { ...options, ref: "missing-ref" }), /Source unavailable/);
  write(repo, "SKILL.md", "---\nname: different\ndescription: x\n---\n"); commit(repo);
  assert.throws(() => inspectSource(ID, options), /does not exist/);
});

test("rejects canonical name and unowned file collisions", (t) => {
  const { options, root } = fixture(t);
  write(root, ".claude/skills/sample/SKILL.md", "Canonical skill");
  assert.throws(() => run(options), /Reserved workflow/);
  fs.rmSync(path.join(root, ".claude/skills/sample"), { recursive: true });
  write(root, ".agents/skills/sample/local.txt", "Keep this");
  const before = files(root);
  assert.throws(() => run(options), /not owned/);
  assert.deepEqual(files(root), before);
});

test("tracks and preserves local edits during update, disable and removal", (t) => {
  const { options, root, ctx } = fixture(t);
  run(options);
  const entry = readRegistry(ctx).registry.skills[ID];
  write(root, `${entry.packagePath}/references/guide.md`, "Local customization");
  const before = files(root);
  for (const action of ["update", "disable", "remove"]) assert.throws(() => run({ ...options, action }), /Local modification/);
  assert.deepEqual(files(root), before);
});

test("updates pinned resources and toggles activation before removing owned files", (t) => {
  const { options, repo, root, ctx } = fixture(t);
  run(options);
  run({ ...options, action: "disable" });
  assert.equal(run({ ...options, action: "list" }).skills[0].enabled, false);
  assert.match(fs.readFileSync(path.join(root, ".claude/skills/sample/SKILL.md"), "utf8"), /disabled/);
  write(repo, "skills/sample/references/guide.md", "New guidance\n");
  const revision = commit(repo);
  const before = files(root);
  assert.equal(run({ ...options, action: "update", apply: false }).revision, revision);
  assert.deepEqual(files(root), before);
  run({ ...options, action: "update" });
  assert.equal(readRegistry(ctx).registry.skills[ID].enabled, false);
  run({ ...options, action: "enable" });
  assert.equal(readRegistry(ctx).registry.skills[ID].enabled, true);
  write(root, "unrelated.md", "Keep");
  const owned = Object.keys(readRegistry(ctx).registry.skills[ID].owned);
  run({ ...options, action: "remove" });
  assert.equal(run({ ...options, action: "list" }).skills.length, 0);
  for (const file of owned) assert.equal(fs.existsSync(path.join(root, file)), false);
  assert.equal(fs.readFileSync(path.join(root, "unrelated.md"), "utf8"), "Keep");
  assert.throws(() => run({ ...options, action: "remove" }), /not installed/);
});

test("adds project-local vendor descriptors and shares identical destinations", (t) => {
  const { root, options } = fixture(t);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [
    { id: "extra", detect: [".extra"], project: ".extra/skills", global: ".extra/skills" },
    { id: "shared", detect: [".shared"], project: ".agents/skills", global: ".codex/skills" },
  ] }));
  const result = run(options);
  assert.equal(result.vendors.length, 6);
  assert.ok(fs.existsSync(path.join(root, ".extra/skills/sample/SKILL.md")));
  assert.equal(result.changed.filter((file) => file === ".agents/skills/sample/SKILL.md").length, 1);
});

test("fails explicitly for unsupported scopes, unknown vendors and malformed descriptors", (t) => {
  const { root, options, home } = fixture(t);
  const config = ".project/skills/vendors.json";
  const extra = { id: "extra", detect: [".extra"], project: ".extra/skills", global: null };
  write(root, config, JSON.stringify({ schemaVersion: 1, vendors: [extra] }));
  assert.throws(() => run({ ...options, scope: "global", location: home }), /does not support global/);
  for (const value of [{ schemaVersion: 2, vendors: [] }, { schemaVersion: 1, vendors: [extra, extra] }, { schemaVersion: 1, vendors: [{ ...extra, detect: [] }] }, { schemaVersion: 1, vendors: [{ ...extra, project: "../outside" }] }]) {
    write(root, config, JSON.stringify(value));
    assert.throws(() => discoverVendors(root));
  }
  fs.unlinkSync(path.join(root, config));
  fs.mkdirSync(path.join(root, ".unknown/skills"), { recursive: true });
  assert.throws(() => discoverVendors(root), /Unregistered/);
  assert.throws(() => adapters([{ id: "a", project: ".A/skills" }, { id: "b", project: ".a/skills" }], "project", "sample", "store/sample", "desc", ["build"], true), /Case-colliding/);
});

test("installs global scope only at an explicit location and links the project", (t) => {
  const { root, options, home } = fixture(t);
  assert.throws(() => run({ ...options, scope: "global" }), /explicit absolute/);
  assert.throws(() => context(root, "project", home), /must equal/);
  assert.throws(() => context(root, "global", root), /separate/);
  const global = { ...options, scope: "global", location: home };
  run(global);
  assert.equal(run({ ...global, action: "list" }).skills.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".project/skills/global.json"))).locations, [fs.realpathSync(home)]);
  assert.ok(fs.existsSync(path.join(home, ".config/opencode/skills/sample/SKILL.md")));
  assert.equal(fs.existsSync(path.join(root, ".project/skills/registry.json")), false);
  assert.deepEqual(run(global).changed, []);
});

test("rejects destination symlinks without touching their targets", (t) => {
  const { root, options, home } = fixture(t);
  fs.symlinkSync(home, path.join(root, ".claude/skills"));
  assert.throws(() => run(options), /Symlink destination/);
  assert.deepEqual(files(home), {});
});

test("rolls back failed writes and retains original data and modes", (t) => {
  const { options, root, ctx } = fixture(t);
  assert.throws(() => run({ ...options, transaction: { afterWrite: () => { throw new Error("Injected fault"); } } }), /Injected fault/);
  assert.deepEqual(files(root), {});
  run(options);
  const before = files(root);
  assert.throws(() => run({ ...options, action: "disable", transaction: { afterWrite: () => { throw new Error("Injected fault"); } } }), /Injected fault/);
  assert.deepEqual(files(root), before);
  assert.equal(snapshot(ctx, ".project/skills/transaction.json"), null);
});

test("recovers an actual interrupted process before a subsequent install", (t) => {
  const { options, root } = fixture(t);
  const script = `const {run}=require(${JSON.stringify(require.resolve("./add-skill"))}); run({...${JSON.stringify(options)},transaction:{afterWrite(){process.exit(71)}}});`;
  assert.equal(spawnSync(process.execPath, ["-e", script]).status, 71);
  assert.equal(run({ ...options, action: "recover", apply: false }).pending, true);
  assert.throws(() => run(options), /collision|not owned|recover|locked/);
  assert.equal(run({ ...options, action: "recover" }).recovered, true);
  assert.deepEqual(files(root), {});
  assert.equal(run({ ...options, action: "recover" }).recovered, false);
  assert.equal(run(options).applied, true);
});

test("refuses recovery if a file changed after process interruption", (t) => {
  const { options, root } = fixture(t);
  const script = `const {run}=require(${JSON.stringify(require.resolve("./add-skill"))});run({...${JSON.stringify(options)},transaction:{afterWrite(){process.exit(72)}}});`;
  assert.equal(spawnSync(process.execPath, ["-e", script]).status, 72);
  const journal = JSON.parse(fs.readFileSync(path.join(root, ".project/skills/transaction.json")));
  write(root, journal.operations[0].path, "Concurrent user edit");
  assert.throws(() => run({ ...options, action: "recover" }), /Recovery conflict/);
  assert.equal(fs.readFileSync(path.join(root, journal.operations[0].path), "utf8"), "Concurrent user edit");
});

test("serializes writers and detects stale snapshots and duplicate destinations", (t) => {
  const { ctx, root } = fixture(t);
  const operation = { path: "result.txt", expected: null, value: { data: Buffer.from("new"), mode: 0o644 } };
  write(root, ".project/skills/lock.json", JSON.stringify({ pid: process.pid }));
  assert.throws(() => transact(ctx, [operation]), /locked/);
  fs.unlinkSync(path.join(root, ".project/skills/lock.json"));
  assert.throws(() => transact(ctx, [operation, operation]), /Duplicate/);
  assert.throws(() => transact(ctx, [operation, { ...operation, path: "result.txt/child" }]), /overlapping/);
  write(root, "result.txt", "concurrent");
  assert.throws(() => transact(ctx, [operation]), /Concurrent edit/);
  assert.equal(fs.readFileSync(path.join(root, "result.txt"), "utf8"), "concurrent");
});

test("validates registry versions and detects missing owned files", (t) => {
  const { ctx, root, options } = fixture(t);
  write(root, ctx.registry, JSON.stringify({ schemaVersion: 2, skills: {} }));
  assert.throws(() => readRegistry(ctx), /Unsupported/);
  write(root, ctx.registry, JSON.stringify({ schemaVersion: 1, skills: { [ID]: {} } }));
  assert.throws(() => readRegistry(ctx), /Invalid registry entry/);
  fs.unlinkSync(path.join(root, ctx.registry));
  run(options);
  const entry = readRegistry(ctx).registry.skills[ID];
  fs.unlinkSync(path.join(root, entry.packagePath, "SKILL.md"));
  assert.throws(() => run({ ...options, action: "disable" }), /Missing owned/);
});

test("validates CLI arguments and reports structured results and failures", (t) => {
  const { options } = fixture(t);
  assert.match(cli([]), /Usage:/);
  assert.match(cli(["--help"]), /Usage:/);
  for (const args of [["--unknown"], ["--root"], ["--apply", "--apply"], ["install", "a", "b"]]) assert.throws(() => cli(args));
  assert.throws(() => run({ ...options, action: "invalid" }), /Unknown action/);
  const command = require.resolve("./add-skill");
  const result = spawnSync(process.execPath, [command, "inspect", ID, "--root", options.root, "--repo", options.repo, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).id, ID);
  const failure = spawnSync(process.execPath, [command, "--unknown"], { encoding: "utf8" });
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /Unknown option/);
});

test("rejects missing and escaping resource links while preserving directory links", (t) => {
  const { repo, options } = fixture(t);
  const header = "---\nname: sample\ndescription: Sample\n---\n";
  write(repo, "skills/sample/SKILL.md", `${header}[missing](references/missing.md)`); commit(repo);
  assert.throws(() => inspectSource(ID, options), /Missing referenced resource/);
  write(repo, "skills/sample/SKILL.md", `${header}[escape](../../outside.md)`); commit(repo);
  assert.throws(() => inspectSource(ID, options), /Unsafe relative path/);
  write(repo, "skills/sample/SKILL.md", `${header}[guide](./references/guide.md#example) [folder](references/) [web](https://example.test) [section](#section)`); commit(repo);
  assert.equal(Object.keys(inspectSource(ID, options).files).length, 3);
});

test("keeps a concurrent edit made during a transaction and leaves recovery evidence", (t) => {
  const { ctx, root } = fixture(t);
  const operation = { path: "result.txt", expected: null, value: { data: Buffer.from("new"), mode: 0o644 } };
  assert.throws(() => transact(ctx, [operation], { afterWrite() { write(root, "result.txt", "Concurrent edit"); } }), /Recovery conflict/);
  assert.equal(fs.readFileSync(path.join(root, "result.txt"), "utf8"), "Concurrent edit");
  assert.ok(snapshot(ctx, ".project/skills/transaction.json"));
});

test("rolls back global and project files together on failure", (t) => {
  const { options, root, home } = fixture(t);
  assert.throws(() => run({ ...options, scope: "global", location: home, transaction: { afterWrite(index) { if (index === 2) throw new Error("Global fault"); } } }), /Global fault/);
  assert.deepEqual(files(root), {});
  assert.deepEqual(files(home), {});
});

test("rejects broken registry ownership and vendor symlink configuration", (t) => {
  const { ctx, root, options, home } = fixture(t);
  run(options);
  const valid = readRegistry(ctx).registry;
  for (const modify of [
    (entry) => { entry.owned["README.md"] = { hash: "a".repeat(64), sourceHash: "a".repeat(64), mode: 0o644 }; },
    (entry) => { entry.packagePath = "outside"; },
    (entry) => { entry.name = "wrong"; },
    (entry) => { entry.adapters = {}; },
    (entry) => { entry.owned[Object.keys(entry.owned)[0]].hash = "bad"; },
  ]) {
    const broken = structuredClone(valid); modify(broken.skills[ID]);
    write(root, ctx.registry, JSON.stringify(broken));
    assert.throws(() => readRegistry(ctx));
  }
  fs.symlinkSync(path.join(home, "vendors.json"), path.join(root, ".project/skills/vendors.json"));
  assert.throws(() => discoverVendors(root), /Symlink/);
});

test("rejects projects with no vendors and unsafe filesystem destinations", (t) => {
  const { home, ctx, root } = fixture(t);
  assert.throws(() => discoverVendors(home), /No project vendors/);
  assert.throws(() => resolveFile(ctx, "file", "untrusted"), /Invalid transaction root/);
  fs.mkdirSync(path.join(root, "directory"));
  assert.throws(() => snapshot(ctx, "directory"), /not a file/);
});

test("preserves executable resource modes under a restrictive user umask", (t) => {
  const { options, root } = fixture(t);
  const script = `process.umask(0o077);require(${JSON.stringify(require.resolve("./add-skill"))}).run(${JSON.stringify(options)});`;
  const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.statSync(path.join(root, ".project/skills/packages", ID, "scripts/check.sh")).mode & 0o777, 0o755);
});

test("requires explicit selection between variants and remembers it on update", (t) => {
  const { repo, options, ctx } = fixture(t);
  write(repo, "other/sample/SKILL.md", "---\nname: sample\ndescription: Alternative variant\n---\n"); commit(repo);
  assert.throws(() => run(options), /choose --path from.*other\/sample\/SKILL.md.*skills\/sample\/SKILL.md/);
  assert.throws(() => inspectSource(ID, { ...options, path: "../SKILL.md" }), /Unsafe/);
  assert.throws(() => inspectSource(ID, { ...options, path: "skills/sample" }), /exact SKILL.md/);
  run({ ...options, path: "other/sample/SKILL.md" });
  assert.equal(readRegistry(ctx).registry.skills[ID].source.path, "other/sample/SKILL.md");
  run({ ...options, action: "update" });
  assert.equal(readRegistry(ctx).registry.skills[ID].description, "Alternative variant");
});

test("preserves an existing skill directory when adding a vendor during activation", (t) => {
  const { root, options } = fixture(t);
  run(options);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  write(root, ".extra/skills/sample/custom.md", "Existing user content");
  const before = files(root);
  assert.throws(() => run({ ...options, action: "enable" }), /not owned/);
  assert.deepEqual(files(root), before);
});
