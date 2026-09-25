const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const { run } = require("./add-skill");
const { ownedPaths, discoverFormatter, formatFiles, reconcile } = require("./skill-sync");
const { context, snapshot } = require("./skill-registry");

const ID = "example/repository/sample";
function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function read(root, name) { return fs.readFileSync(path.join(root, name), "utf8"); }
function git(root, ...args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" } }).trim();
}
function sourceRepo(directory, name = "sample") {
  const repo = path.join(directory, `repo-${name}`);
  fs.mkdirSync(repo);
  git(repo, "init", "-b", "main");
  write(repo, `skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: ${name} skill\n---\nBody.\n`);
  git(repo, "add", ".");
  git(repo, "commit", "-m", "Fixture");
  return repo;
}
// A deterministic fake `prettier`, not the real binary: appends a marker to files it is told
// to write, mirroring the plan's "deterministic fake formatter" spike for testing formatting
// without depending on prettier actually being installed.
function installFakePrettier(root, behavior = "append") {
  write(root, ".prettierrc.json", "{}\n");
  const bin = path.join(root, "node_modules/.bin/prettier");
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  const body = behavior === "fail"
    ? "#!/bin/sh\necho boom 1>&2\nexit 1\n"
    : "#!/bin/sh\nfor a in \"$@\"; do\n  case \"$a\" in\n    --config|*.json|--write) ;;\n    *) if [ -f \"$a\" ]; then printf '\\n<!-- formatted -->\\n' >> \"$a\"; fi ;;\n  esac\ndone\n";
  fs.writeFileSync(bin, body, { mode: 0o755 });
}
function fixture(t, { formatter } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-sync-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  fs.mkdirSync(root);
  for (const item of [".claude", ".opencode", ".codex", ".cursor"]) fs.mkdirSync(path.join(root, item));
  fs.mkdirSync(path.join(root, ".project"), { recursive: true });
  if (formatter) installFakePrettier(root);
  const repo = sourceRepo(directory);
  return { directory, root, repo, options: { root, repo, skill: ID, scope: "project", phases: "manual", apply: true } };
}

test("registry-owned paths are reported so bundle-sync can protect them", (t) => {
  const { root, options } = fixture(t);
  assert.deepEqual([...ownedPaths(root)], []);
  run(options);
  const owned = ownedPaths(root);
  assert.ok(owned.has(".claude/skills/sample/skill.md"));
  assert.ok(owned.has(".project/skills/packages/example/repository/sample/skill.md"));
});

test("an invalid or unreadable registry protects nothing rather than throwing", (t) => {
  const { root } = fixture(t);
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  assert.deepEqual([...ownedPaths(root)], []);
});

test("no formatter is discovered without project configuration, and files pass through unchanged", (t) => {
  const { root } = fixture(t);
  const files = { "a.md": { data: Buffer.from("hello\n"), mode: 0o644 } };
  assert.equal(discoverFormatter(root), null);
  const result = formatFiles(root, files, () => true);
  assert.deepEqual(result, { formatter: null, files, changed: [] });
});

test("a configured, installed formatter formats only the selected changed files", (t) => {
  const { root } = fixture(t, { formatter: true });
  const files = {
    "a.md": { data: Buffer.from("hello\n"), mode: 0o644 },
    "b.sh": { data: Buffer.from("#!/bin/sh\n"), mode: 0o755 },
  };
  const result = formatFiles(root, files, (file) => file === "a.md");
  assert.equal(result.formatter, "prettier");
  assert.deepEqual(result.changed, ["a.md"]);
  assert.match(result.files["a.md"].data.toString(), /hello\n\n<!-- formatted -->/);
  assert.equal(result.files["b.sh"].data.toString(), "#!/bin/sh\n", "excluded by the include predicate");
  assert.equal(fs.existsSync(path.join(root, "a.md")), false, "preview never writes the target project");
});

test("the formatter's --config always resolves to the trusted project root, never to fetched skill content", (t) => {
  const { root } = fixture(t, { formatter: true });
  const spy = path.join(root, "node_modules/.bin/prettier");
  // A spy in place of the deterministic fake: records exactly how it was invoked.
  fs.writeFileSync(spy, "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$SPY_LOG\"\n", { mode: 0o755 });
  const log = path.join(root, "spy.log");
  const previousLog = process.env.SPY_LOG;
  process.env.SPY_LOG = log;
  t.after(() => { if (previousLog === undefined) delete process.env.SPY_LOG; else process.env.SPY_LOG = previousLog; });
  // A file INSIDE the fetched skill's own content, named exactly like a Prettier config file —
  // formatFiles must still pass only the real project's config path to --config, never this one.
  const files = {
    ".project/skills/packages/example/repository/sample/SKILL.md": { data: Buffer.from("Body.\n"), mode: 0o644 },
    ".project/skills/packages/example/repository/sample/.prettierrc.js": { data: Buffer.from("module.exports = { plugins: ['./evil'] };\n"), mode: 0o644 },
  };
  const result = formatFiles(root, files, () => true);
  const argv = fs.readFileSync(log, "utf8").trim().split("\n");
  const configIndex = argv.indexOf("--config");
  assert.notEqual(configIndex, -1);
  assert.equal(argv[configIndex + 1], path.join(root, ".prettierrc.json"), "always the trusted project's own config, never one found among the formatted content");
  assert.equal(result.formatter, "prettier");
});

test("prettier configured via package.json is also discovered", (t) => {
  const { root } = fixture(t);
  write(root, "package.json", JSON.stringify({ prettier: {} }));
  const bin = path.join(root, "node_modules/.bin/prettier");
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  fs.writeFileSync(bin, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const formatter = discoverFormatter(root);
  assert.equal(formatter.label, "prettier");
  assert.equal(formatter.configPath, path.join(root, "package.json"));
});

test("a configured formatter with no installed binary is treated as no formatter", (t) => {
  const { root } = fixture(t);
  write(root, ".prettierrc.json", "{}\n");
  assert.equal(discoverFormatter(root), null);
});

test("formatter failure throws and no bytes are queued for writing", (t) => {
  const { root } = fixture(t, { formatter: true });
  installFakePrettier(root, "fail");
  const files = { "a.md": { data: Buffer.from("hello\n"), mode: 0o644 } };
  assert.throws(() => formatFiles(root, files, () => true), /Formatter failed \(prettier\): boom/);
});

test("install records separate upstream and post-format hashes, and reinstalling is clean", (t) => {
  const { root, options } = fixture(t, { formatter: true });
  const result = run(options);
  const ctx = context(root, "project");
  const packageFile = ".project/skills/packages/example/repository/sample/SKILL.md";
  const entry = JSON.parse(Buffer.from(snapshot(ctx, ".project/skills/registry.json").data, "base64").toString()).skills[ID];
  assert.deepEqual(entry.formatting, { tool: "prettier", changed: [packageFile] });
  assert.notEqual(entry.owned[packageFile].hash, entry.owned[packageFile].sourceHash);
  assert.match(read(root, packageFile), /Body\.\n\n<!-- formatted -->/);
  assert.deepEqual(run(options).changed, [], "repeated install after formatting produces no diff");
});

test("a formatter failure during install leaves the target completely unwritten", (t) => {
  const { root, options } = fixture(t, { formatter: true });
  installFakePrettier(root, "fail");
  const before = fs.readdirSync(root, { recursive: true }).sort();
  assert.throws(() => run(options), /Formatter failed/);
  assert.deepEqual(fs.readdirSync(root, { recursive: true }).sort(), before);
});

test("reconcile reports clean states without an installed registry, a pending transaction, or no .project", (t) => {
  const { root, directory } = fixture(t);
  const bare = path.join(directory, "bare");
  fs.mkdirSync(bare);
  assert.equal(reconcile(bare).status, "not-installed");
  assert.equal(reconcile(root).status, "clean");
  write(root, ".project/skills/transaction.json", "{}");
  assert.equal(reconcile(root).status, "pending-transaction");
});

test("an invalid registry schema is reported as incompatible without touching global scope", (t) => {
  const { root } = fixture(t);
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  write(root, ".ai-workflow/skills/registry.json", "untouched");
  const result = reconcile(root, { apply: true });
  assert.equal(result.status, "incompatible");
  assert.match(result.error, /schema/i);
  assert.equal(read(root, ".ai-workflow/skills/registry.json"), "untouched");
});

test("an unrecognized vendor layout blocks reconciliation for the whole project", (t) => {
  const { root, options } = fixture(t);
  run(options);
  fs.mkdirSync(path.join(root, ".unknown/skills"), { recursive: true });
  const result = reconcile(root);
  assert.equal(result.status, "coverage-unresolved");
  assert.match(result.error, /Unregistered/);
});

test("a newly registered target vendor receives owned adapters after reconciliation, in preview and apply", (t) => {
  const { root, options } = fixture(t);
  run(options);
  assert.deepEqual(reconcile(root).skills, [{ id: ID, status: "current" }]);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  fs.mkdirSync(path.join(root, ".extra"));
  const preview = reconcile(root);
  assert.deepEqual(preview.skills, [{ id: ID, status: "needs-reconciliation", vendors: ["extra"] }]);
  assert.equal(fs.existsSync(path.join(root, ".extra/skills")), false, "dry run writes nothing");
  const applied = reconcile(root, { apply: true });
  assert.deepEqual(applied.skills, [{ id: ID, status: "reconciled", vendors: ["extra"] }]);
  assert.equal(applied.applied, true);
  assert.match(read(root, ".extra/skills/sample/SKILL.md"), /Use only in these workflow phases: manual\./);
  assert.deepEqual(reconcile(root).skills, [{ id: ID, status: "current" }], "idempotent: nothing left to reconcile");
});

test("a locally modified owned file blocks reconciliation as a conflict instead of overwriting it", (t) => {
  const { root, options } = fixture(t);
  run(options);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  fs.mkdirSync(path.join(root, ".extra"));
  write(root, ".agents/skills/sample/SKILL.md", "tampered\n");
  const result = reconcile(root, { apply: true });
  assert.equal(result.status, "conflict");
  assert.deepEqual(result.skills, [{ id: ID, status: "conflict", vendors: ["extra"] }]);
  assert.equal(fs.existsSync(path.join(root, ".extra/skills/sample")), false);
  assert.equal(read(root, ".agents/skills/sample/SKILL.md"), "tampered\n", "modified file is left exactly as the user left it");
});

test("reconciliation refuses to overwrite an unowned collision at a newly active vendor path", (t) => {
  const { root, options } = fixture(t);
  run(options);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  write(root, ".extra/skills/sample/SKILL.md", "not ours\n");
  const result = reconcile(root, { apply: true });
  assert.equal(result.skills[0].status, "conflict");
  assert.match(result.skills[0].error, /not owned/);
  assert.equal(read(root, ".extra/skills/sample/SKILL.md"), "not ours\n");
});

test("reconcile CLI previews, applies, and reports a nonzero exit for a conflict", (t) => {
  const { root, options } = fixture(t);
  run(options);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  fs.mkdirSync(path.join(root, ".extra"));
  const script = path.join(__dirname, "skill-sync.js");
  const preview = spawnSync(process.execPath, [script, "reconcile", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(preview.status, 0);
  assert.equal(JSON.parse(preview.stdout).status, "needs-reconciliation");
  const applied = spawnSync(process.execPath, [script, "reconcile", "--root", root, "--apply", "--json"], { encoding: "utf8" });
  assert.equal(applied.status, 0);
  assert.equal(JSON.parse(applied.stdout).status, "clean");
  write(root, ".agents/skills/sample/SKILL.md", "tampered\n");
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }, { id: "other", detect: [".other"], project: ".other/skills", global: null }] }));
  fs.mkdirSync(path.join(root, ".other"));
  const conflict = spawnSync(process.execPath, [script, "reconcile", "--root", root, "--apply", "--json"], { encoding: "utf8" });
  assert.equal(conflict.status, 1);
  assert.equal(JSON.parse(conflict.stdout).status, "conflict");
  const bad = spawnSync(process.execPath, [script, "reconcile", "--force"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown option: --force/);
});
