const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const { run } = require("./add-skill");
const { discoverVendors, externalSkillReport, cursorMirrors } = require("./skill-vendors");
const { context, readRegistry } = require("./skill-registry");

const ID = "example/repository/sample";
const BUNDLE = path.resolve(__dirname, "../..");

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function read(root, name) { return fs.readFileSync(path.join(root, name), "utf8"); }
function git(root, ...args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" } }).trim();
}
function sourceRepo(directory) {
  const repo = path.join(directory, "repo");
  fs.mkdirSync(repo);
  git(repo, "init", "-b", "main");
  // Upstream authors do not declare this workflow's capability profile; the doctor must not require one.
  write(repo, "skills/sample/SKILL.md", "---\nname: sample\ndescription: Sample useful skill\n---\nRead [guide](references/guide.md).\n");
  write(repo, "skills/sample/references/guide.md", "Never drop units.\n");
  git(repo, "add", ".");
  git(repo, "commit", "-m", "Fixture");
  return repo;
}
function fixture(t, vendors = [".claude", ".opencode", ".codex", ".cursor"]) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-vendors-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  fs.mkdirSync(root);
  for (const item of vendors) fs.mkdirSync(path.join(root, item));
  const repo = sourceRepo(directory);
  return { directory, root, repo, options: { root, repo, skill: ID, scope: "project", phases: "build,audit", apply: true } };
}
const statusOf = (report, name) => report.results.filter((result) => result.name === name).map((result) => result.status).sort();

test("every bundled vendor entry point exposes add-skill from one canonical playbook", () => {
  const canonical = read(BUNDLE, ".claude/skills/add-skill/SKILL.md");
  const description = canonical.match(/^description: (.+)$/m)[1];
  assert.match(canonical, /Recommended capability profile:\*\* `standard`/);
  for (const mirror of [".agents/skills/add-skill/SKILL.md", ".opencode/commands/add-skill.md"]) {
    const text = read(BUNDLE, mirror);
    assert.equal(text.match(/^description: (.+)$/m)[1], description, mirror);
    assert.match(text, /Load `\.claude\/skills\/add-skill\/SKILL\.md` and follow it exactly/);
  }
  assert.match(read(BUNDLE, ".opencode/commands/add-skill.md"), /^model: openai\/gpt-5\.6-terra$/m);
  assert.match(read(BUNDLE, ".agents/skills/add-skill/SKILL.md"), /^name: add-skill$/m);
  for (const command of canonical.match(/node ai-framework\/scripts\/[a-z-]+\.js/g)) assert.ok(fs.existsSync(path.join(BUNDLE, command.split(" ")[1])), command);
});

test("an installed skill resolves to the same content and resources for every project vendor", (t) => {
  const { root, options } = fixture(t);
  write(root, ".project/skills/vendors.json", JSON.stringify({ schemaVersion: 1, vendors: [{ id: "extra", detect: [".extra"], project: ".extra/skills", global: null }] }));
  const result = run(options);
  const vendors = discoverVendors(root);
  assert.deepEqual(result.vendors.sort(), vendors.map((vendor) => vendor.id).sort());
  const entry = readRegistry(context(root, "project")).registry.skills[ID];
  for (const vendor of vendors) {
    const target = entry.adapters[vendor.id];
    assert.equal(target, `${vendor.project}/sample/SKILL.md`);
    const wrapper = read(root, target);
    assert.match(wrapper, /^---\nname: sample\ndescription: "Sample useful skill"\n---/);
    assert.match(wrapper, /Use only in these workflow phases: build, audit\./);
    const link = wrapper.match(/\[the installed skill\]\(([^)]+)\)/)[1];
    const source = path.resolve(root, path.dirname(target), link);
    assert.equal(fs.realpathSync(source), fs.realpathSync(path.join(root, entry.packagePath, "SKILL.md")));
    const resource = fs.readFileSync(source, "utf8").match(/\]\(([^)]+)\)/)[1];
    assert.match(fs.readFileSync(path.join(path.dirname(source), resource), "utf8"), /Never drop units/);
  }
  const report = externalSkillReport(root);
  assert.ok(report.managed.has("sample"));
  assert.deepEqual(statusOf(report, `Skill ${ID}`), ["pass"]);
});

test("declared vendor overrides stay traceable and drift from them fails coverage", (t) => {
  const { root, options } = fixture(t);
  const config = ".project/skills/vendors.json";
  write(root, config, JSON.stringify({ schemaVersion: 1, vendors: [{ id: "cursor", detect: [".cursor"], project: ".cursor/team-skills", global: ".cursor/skills" }] }));
  run(options);
  const entry = readRegistry(context(root, "project")).registry.skills[ID];
  assert.equal(entry.adapters.cursor, ".cursor/team-skills/sample/SKILL.md");
  assert.deepEqual(statusOf(externalSkillReport(root), `Skill ${ID}`), ["pass"]);
  fs.unlinkSync(path.join(root, config));
  const drift = externalSkillReport(root).results.find((item) => item.name === `Skill ${ID}`);
  assert.equal(drift.status, "fail");
  assert.match(drift.detail, /cursor adapter \.cursor\/team-skills\/sample\/SKILL\.md differs from descriptor path \.cursor\/skills\/sample\/SKILL\.md/);
});

test("inconsistent phases, disabled state and local edits are reported per wrapper", (t) => {
  const { root, options } = fixture(t);
  run(options);
  const wrapper = path.join(root, ".agents/skills/sample/SKILL.md");
  fs.writeFileSync(wrapper, fs.readFileSync(wrapper, "utf8").replace("build, audit", "shape"));
  let report = externalSkillReport(root);
  assert.deepEqual(statusOf(report, `Skill ${ID}`), ["fail", "warn"]);
  assert.match(report.results.find((item) => item.status === "fail").detail, /\.agents\/skills\/sample\/SKILL\.md phases differ from registry/);
  assert.match(report.results.find((item) => item.status === "warn").detail, /locally modified owned file\(s\): \.agents\/skills\/sample\/SKILL\.md/);
  fs.writeFileSync(wrapper, fs.readFileSync(wrapper, "utf8").replace("shape", "build, audit"));
  run({ ...options, action: "disable" });
  report = externalSkillReport(root);
  assert.deepEqual(statusOf(report, `Skill ${ID}`), ["pass"]);
  assert.match(report.results[0].detail, /^disabled for/);
  fs.rmSync(path.join(root, ".claude/skills/sample/SKILL.md"));
  assert.match(externalSkillReport(root).results[0].detail, /missing owned file \.claude\/skills\/sample\/SKILL\.md/);
});

test("new or unknown vendors after installation are explicit coverage failures until updated", (t) => {
  const { root, options } = fixture(t, [".claude", ".codex"]);
  run(options);
  assert.deepEqual(statusOf(externalSkillReport(root), `Skill ${ID}`), ["pass"]);
  fs.mkdirSync(path.join(root, ".cursor"));
  assert.match(externalSkillReport(root).results.find((item) => item.name === `Skill ${ID}`).detail, /not activated for cursor; run add-skill update/);
  run({ ...options, action: "update", phases: undefined });
  assert.deepEqual(statusOf(externalSkillReport(root), `Skill ${ID}`), ["pass"]);
  assert.ok(fs.existsSync(path.join(root, ".cursor/skills/sample/SKILL.md")));
  fs.mkdirSync(path.join(root, ".newtool/skills"), { recursive: true });
  const unknown = externalSkillReport(root).results.find((item) => item.name === "Skill vendors");
  assert.equal(unknown.status, "fail");
  assert.match(unknown.detail, /Unregistered project vendor: \.newtool/);
});

test("reports invalid registries and pending transactions without throwing", (t) => {
  const { root, options } = fixture(t);
  assert.deepEqual(externalSkillReport(root), { managed: new Set(), results: [] });
  run(options);
  write(root, ".project/skills/transaction.json", "{}");
  assert.equal(statusOf(externalSkillReport(root), ".project/skills")[0], "fail");
  fs.rmSync(path.join(root, ".project/skills/transaction.json"));
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  const report = externalSkillReport(root);
  assert.deepEqual(statusOf(report, ".project/skills/registry.json"), ["fail"]);
  assert.throws(() => cursorMirrors(root), /Resolve \.project\/skills\/registry\.json before mirroring/);
});

test("Cursor mirrors are rerunnable, skip managed skills and preserve customized files", (t) => {
  const { root, options } = fixture(t);
  write(root, ".claude/skills/demo/SKILL.md", "---\nname: demo\ndescription: Demo\n---\nSee [notes](references/notes.md).\n");
  write(root, ".claude/skills/demo/references/notes.md", "notes\n");
  write(root, ".claude/agents/reviewer.md", "---\nname: reviewer\n---\nReview.\n");
  write(root, ".claude/agents/README.txt", "not an agent\n");
  write(root, ".cursor/skills/shape/SKILL.md", "custom\n");
  write(root, ".claude/skills/shape/SKILL.md", "canonical\n");
  run(options);
  const cursorWrapper = read(root, ".cursor/skills/sample/SKILL.md");
  const preview = cursorMirrors(root);
  assert.deepEqual(preview.created, [".cursor/agents/reviewer.md", ".cursor/skills/demo/SKILL.md", ".cursor/skills/demo/references/notes.md"]);
  assert.deepEqual(preview.differs, [".cursor/skills/shape/SKILL.md"]);
  assert.equal(fs.existsSync(path.join(root, ".cursor/skills/demo")), false);
  const applied = cursorMirrors(root, { apply: true });
  assert.deepEqual(applied.created, preview.created);
  assert.equal(read(root, ".cursor/skills/demo/references/notes.md"), "notes\n");
  assert.equal(read(root, ".cursor/skills/shape/SKILL.md"), "custom\n");
  assert.equal(read(root, ".cursor/skills/sample/SKILL.md"), cursorWrapper);
  const again = cursorMirrors(root, { apply: true });
  assert.deepEqual([again.created, again.differs, again.current], [[], [".cursor/skills/shape/SKILL.md"], 3]);
  assert.deepEqual(statusOf(externalSkillReport(root), `Skill ${ID}`), ["pass"]);
  write(root, ".claude/skills/linked/SKILL.md", "x\n");
  fs.symlinkSync(path.join(root, ".claude/agents/reviewer.md"), path.join(root, ".claude/skills/linked/extra.md"));
  assert.throws(() => cursorMirrors(root), /Symlink in canonical source/);
});

test("cursor-mirrors CLI previews, applies and rejects unknown options", (t) => {
  const { root } = fixture(t);
  write(root, ".claude/skills/demo/SKILL.md", "demo\n");
  const script = path.join(__dirname, "skill-vendors.js");
  const preview = JSON.parse(execFileSync(process.execPath, [script, "cursor-mirrors", "--root", root], { encoding: "utf8" }));
  assert.deepEqual([preview.created, preview.applied], [[".cursor/skills/demo/SKILL.md"], false]);
  execFileSync(process.execPath, [script, "cursor-mirrors", "--root", root, "--apply"]);
  assert.equal(read(root, ".cursor/skills/demo/SKILL.md"), "demo\n");
  const bad = spawnSync(process.execPath, [script, "cursor-mirrors", "--force"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown option: --force/);
});

test("workflow doctor and setup validator accept a registry-managed skill in a real bundle copy", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-bundle-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const skip = new Set([".git", "node_modules", "metrics", ".DS_Store"]);
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source) => !skip.has(path.basename(source)) });
  // Keep .project/skills (registry + packages) together with the wrapper files it owns: excluding
  // it would leave an installed skill's wrappers orphaned, which the doctor rightly rejects — a
  // failure that only appears once a skill is actually installed in the repo running this test.
  run({ root, repo: sourceRepo(directory), skill: ID, scope: "project", phases: "manual", apply: true });
  const env = { ...process.env, PATH: path.dirname(process.execPath), NO_COLOR: "1" };
  const doctor = spawnSync(process.execPath, ["ai-framework/scripts/workflow-doctor.js", "--json"], { cwd: root, encoding: "utf8", env });
  const report = JSON.parse(doctor.stdout);
  assert.deepEqual(report.results.filter((item) => item.status === "fail"), []);
  assert.equal(doctor.status, 0);
  assert.equal(report.results.find((item) => item.name === `Skill ${ID}`).status, "pass");
  assert.equal(report.results.some((item) => item.name.startsWith(".agents/skills/sample") || item.name.startsWith(".opencode/commands/sample")), false);
  const validator = spawnSync(process.execPath, ["ai-framework/scripts/setup-validator.js", "--json"], { cwd: root, encoding: "utf8", env });
  const setup = JSON.parse(validator.stdout);
  assert.deepEqual(setup.results.filter((item) => item.status === "fail"), []);
  assert.equal(setup.results.some((item) => item.name === ".cursor/skills/sample/SKILL.md"), false);
});
