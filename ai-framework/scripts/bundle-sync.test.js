const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const SCRIPT = path.join(__dirname, "bundle-sync.js");
const ADD_SKILL = path.join(__dirname, "add-skill.js");
const SYNCED = ["ai-framework/rules", "ai-framework/workflow", "ai-framework/templates", "ai-framework/integrations", "ai-framework/scripts", "ai-framework/hooks", ".claude/agents", ".claude/skills", ".claude/hooks", ".opencode/commands", ".opencode/agents", ".codex/agents", ".agents/skills", ".cursor/agents", ".cursor/skills"];

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function read(root, name) { return fs.readFileSync(path.join(root, name), "utf8"); }
function exists(root, name) { return fs.existsSync(path.join(root, name)); }
function git(root, ...args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" } }).trim();
}
function commit(root, message = "commit") { git(root, "add", "."); git(root, "commit", "-m", message); return git(root, "rev-parse", "HEAD"); }

// A minimal real bundle: enough real scripts/markers for a fresh target to be a usable
// add-skill/skill-sync instance, without copying this whole checkout (keeps fixtures fast).
// Source and target start byte-identical (as a just-installed target really would), so every
// test introduces its own explicit delta instead of tripping over incidental seed drift.
function seedCommon(root) {
  write(root, "ai-framework/workflow/overview.md", "overview\n");
  write(root, "ai-framework/rules/example.md", "rule v1\n");
  write(root, ".claude/skills/keep/SKILL.md", "---\nname: keep\ndescription: Canonical keep skill\n---\nv1\n");
  for (const file of ["ai-framework/scripts/add-skill.js", "ai-framework/scripts/skill-registry.js", "ai-framework/scripts/skill-source.js", "ai-framework/scripts/skill-vendors.js", "ai-framework/scripts/skill-sync.js"]) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.copyFileSync(path.join(__dirname, path.basename(file)), path.join(root, file));
  }
  write(root, "ai-framework/integrations/skill-vendors.json", read(__dirname, "../integrations/skill-vendors.json"));
}
function seedSource(root) {
  seedCommon(root);
  write(root, "VERSION", "9.9.9\n");
}
function seedTarget(root) {
  for (const dir of SYNCED) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.mkdirSync(path.join(root, ".project"), { recursive: true });
  seedCommon(root);
}
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-sync-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, "source");
  const target = path.join(directory, "target");
  fs.mkdirSync(source);
  fs.mkdirSync(target);
  git(source, "init", "-b", "main");
  seedSource(source);
  const baseRef = commit(source, "base");
  seedTarget(target);
  return { directory, source, target, baseRef };
}
function run(target, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: target, encoding: "utf8" });
}
function runJson(target, args) {
  const result = run(target, [...args, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function installSkill(target, repo, extra = {}) {
  const args = { root: target, repo, skill: extra.skill || "example/repository/demo", scope: "project", phases: "manual", apply: true, ...extra };
  const argv = [ADD_SKILL, "install", args.skill, "--root", args.root, "--repo", args.repo, "--scope", "project", "--phases", args.phases, "--apply"];
  const result = spawnSync(process.execPath, argv, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}
function skillRepo(directory, name) {
  const repo = path.join(directory, `upstream-${name}`);
  fs.mkdirSync(repo);
  git(repo, "init", "-b", "main");
  write(repo, `skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: ${name} skill\n---\nBody.\n`);
  commit(repo, "fixture");
  return repo;
}

test("dry run changes nothing on the target and never imports source .project content", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(source, ".project/pitches/should-not-import/pitch.md", "secret plan\n");
  const before = fs.readdirSync(target, { recursive: true }).sort();
  const result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(result.summary.applied, false);
  assert.deepEqual(fs.readdirSync(target, { recursive: true }).sort(), before);
  assert.equal(exists(target, ".project/pitches/should-not-import"), false);
});

test("changed and conflict are classified correctly against a known base, and only changed applies", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(target, "ai-framework/rules/mine.md", "local addition, never existed upstream\n");
  write(target, "ai-framework/rules/fought-over.md", "target version\n");
  write(source, "ai-framework/rules/fought-over.md", "source version\n");
  commit(source, "add a file the target also independently created");
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edits example.md");
  const dry = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(dry.summary.new, 0);
  assert.equal(dry.summary.changed, 1);
  assert.equal(dry.summary.conflict, 1, "no known base for fought-over.md on either side: kept for manual merge");
  const applied = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(applied.summary.appliedCount, 1);
  assert.equal(read(target, "ai-framework/rules/example.md"), "rule v2\n");
  assert.equal(read(target, "ai-framework/rules/fought-over.md"), "target version\n", "conflict is kept, never overwritten");
  assert.equal(read(target, "ai-framework/rules/mine.md"), "local addition, never existed upstream\n", "local-only file untouched");
});

test("prune removes only unmodified-vs-base files removed upstream, keeping a locally edited one", (t) => {
  const { source, target } = fixture(t);
  write(target, "ai-framework/rules/gone-clean.md", "will be removed\n");
  write(target, "ai-framework/rules/gone-edited.md", "will be removed but locally edited\n");
  write(source, "ai-framework/rules/gone-clean.md", "will be removed\n");
  write(source, "ai-framework/rules/gone-edited.md", "will be removed but locally edited\n");
  const removalBase = commit(source, "snapshot the project was originally synced from");
  write(target, "ai-framework/rules/gone-edited.md", "locally changed after the base snapshot\n");
  fs.rmSync(path.join(source, "ai-framework/rules/gone-clean.md"));
  fs.rmSync(path.join(source, "ai-framework/rules/gone-edited.md"));
  commit(source, "remove files upstream");
  const dry = runJson(target, ["--source", source, "--base-ref", removalBase]);
  const removed = dry.removed.map((entry) => entry.path).sort();
  assert.deepEqual(removed, [path.join("ai-framework/rules", "gone-clean.md"), path.join("ai-framework/rules", "gone-edited.md")].sort());
  const goneClean = dry.removed.find((entry) => /gone-clean/.test(entry.path));
  assert.equal(goneClean.status, "removed");
  assert.equal(goneClean.modified, "unmodified");
  assert.equal(fs.realpathSync(goneClean.targetPath), fs.realpathSync(path.join(target, "ai-framework/rules/gone-clean.md")));
  assert.equal(dry.removed.find((entry) => /gone-edited/.test(entry.path)).modified, "modified");
  const applied = runJson(target, ["--source", source, "--base-ref", removalBase, "--apply", "--prune"]);
  assert.equal(exists(target, "ai-framework/rules/gone-clean.md"), false);
  assert.equal(exists(target, "ai-framework/rules/gone-edited.md"), true, "modified-vs-base file is never pruned");
  assert.equal(applied.summary.prunedCount, 1);
});

test("two target projects with different installed skills keep those differences after apply and prune", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  const targetB = path.join(directory, "targetB");
  fs.mkdirSync(targetB);
  seedTarget(targetB);
  const repoA = skillRepo(directory, "alpha");
  const repoB = skillRepo(directory, "beta");
  installSkill(target, repoA, { skill: "example/repository/alpha" });
  installSkill(targetB, repoB, { skill: "example/repository/beta" });
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit");
  runJson(target, ["--source", source, "--base-ref", baseRef, "--apply", "--prune"]);
  runJson(targetB, ["--source", source, "--base-ref", baseRef, "--apply", "--prune"]);
  assert.equal(exists(target, ".claude/skills/alpha/SKILL.md"), true);
  assert.equal(exists(target, ".claude/skills/beta/SKILL.md"), false);
  assert.equal(exists(targetB, ".claude/skills/beta/SKILL.md"), true);
  assert.equal(exists(targetB, ".claude/skills/alpha/SKILL.md"), false);
  assert.equal(read(target, "ai-framework/rules/example.md"), "rule v2\n");
});

test("registry-owned skill files never read as REMOVED in source and are never prune candidates", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  installSkill(target, skillRepo(directory, "gamma"), { skill: "example/repository/gamma" });
  const result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(result.removed.some((entry) => /gamma/.test(entry.path)), false);
  const applied = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply", "--prune"]);
  assert.equal(exists(target, ".claude/skills/gamma/SKILL.md"), true);
  assert.equal(applied.removed.some((entry) => /gamma/.test(entry.path)), false);
});

test("flagged entry files are reported for manual review and never auto-applied", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(target, "AGENTS.md", "target version\n");
  write(source, "AGENTS.md", "source version\n");
  commit(source, "change AGENTS.md");
  const result = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(result.flagged.length, 1);
  assert.equal(read(target, "AGENTS.md"), "target version\n");
});

test("a newly registered target vendor is reconciled for every installed skill in the same apply, with no second approval", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  installSkill(target, skillRepo(directory, "delta"), { skill: "example/repository/delta" });
  const descriptors = JSON.parse(read(source, "ai-framework/integrations/skill-vendors.json"));
  descriptors.vendors.push({ id: "newv", detect: [".newv"], project: ".newv/skills", global: null });
  write(source, "ai-framework/integrations/skill-vendors.json", `${JSON.stringify(descriptors, null, 2)}\n`);
  commit(source, "register a new vendor");
  fs.mkdirSync(path.join(target, ".newv/skills"), { recursive: true });
  const dry = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(dry.summary.skillSync, "coverage-unresolved", "the vendor directory is active locally but its descriptor has not synced onto the target yet");
  const applied = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(applied.summary.skillSync, "clean");
  assert.equal(applied.skillSync.skills[0].status, "reconciled");
  assert.match(read(target, ".newv/skills/delta/SKILL.md"), /Use only in these workflow phases: manual\./);
});

test("an unsupported skill registry schema is reported without blocking the rest of the structural sync", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(target, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit");
  const applied = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(applied.summary.skillSync, "incompatible");
  assert.equal(read(target, "ai-framework/rules/example.md"), "rule v2\n", "unrelated structural sync still applied");
});

test("global scope is never read or written by a project sync", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  installSkill(target, skillRepo(directory, "epsilon"), { skill: "example/repository/epsilon" });
  write(target, ".ai-workflow/skills/registry.json", "untouched sentinel");
  runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(read(target, ".ai-workflow/skills/registry.json"), "untouched sentinel");
});

test("instance caveman mode overrides in .project/skills/modes.json survive a sync unchanged", (t) => {
  const { source, target, baseRef } = fixture(t);
  const modes = JSON.stringify({ schemaVersion: 1, caveman: { enabled: true, default: "lite", phases: { build: "ultra" } } });
  write(target, ".project/skills/modes.json", modes);
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit, unrelated to instance mode state");
  runJson(target, ["--source", source, "--base-ref", baseRef, "--apply", "--prune"]);
  assert.equal(read(target, ".project/skills/modes.json"), modes, "protected exactly like .project/skills/registry.json — .project/ is outside every SYNCED_DIRS entry");
});

test("report settings and generated reports in .project/reports survive every sync unchanged, and a new reports template is a named scaffold step", (t) => {
  const { source, target, baseRef } = fixture(t);
  const settings = JSON.stringify({ schemaVersion: 1, themeMode: "fallback" });
  write(target, ".project/reports/settings.json", settings);
  write(target, ".project/reports/theme.json", "{\"schemaVersion\":1}\n");
  write(target, ".project/reports/state.html", "<!doctype html>local\n");
  write(source, "ai-framework/templates/project/reports/README.md", "# Reports\n");
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream adds the reports template");
  for (let pass = 0; pass < 2; pass++) {
    const result = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply", "--prune"]);
    if (pass === 0) assert.ok(result.nextSteps.some((step) => step.kind === "scaffold" && /reports\/README\.md/.test(step.message)), "the missing reports template is named, not silently written into .project/");
    assert.equal(read(target, ".project/reports/settings.json"), settings, `pass ${pass + 1}: .project/ is outside every SYNCED_DIRS entry`);
    assert.equal(read(target, ".project/reports/state.html"), "<!doctype html>local\n");
    assert.ok(!exists(target, ".project/reports/README.md"), "sync never writes into .project/");
  }
});

test("first sync without a known base reports differences as unverified, not silently applied", (t) => {
  const { source, target } = fixture(t);
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit, no base known to this run");
  const dry = runJson(target, ["--source", source]);
  assert.equal(dry.summary.changed, 0);
  assert.equal(dry.summary.unverified, 1);
  const applied = runJson(target, ["--source", source, "--apply"]);
  assert.equal(read(target, "ai-framework/rules/example.md"), "rule v1\n", "unverified is kept unless --overwrite-unverified");
  assert.equal(applied.summary.appliedCount, 0);
});

test("a skill installed in the SOURCE checkout is never shipped to a synced project", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  installSkill(source, skillRepo(directory, "srcinstalled"), { skill: "example/repository/srcinstalled" });
  assert.equal(exists(source, ".claude/skills/srcinstalled/SKILL.md"), true, "sanity: the source really has an installed skill's wrapper");
  const dry = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal([...dry.new, ...dry.changed].some((entry) => /srcinstalled/.test(entry.path)), false, "installed wrappers are instance data on the source side too");
  runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(exists(target, ".claude/skills/srcinstalled"), false, "an orphan wrapper (package and registry left behind) must never reach a project");
  assert.equal(Object.keys(JSON.parse(read(target, ".project/.bundle-sync.json")).files).some((file) => /srcinstalled/.test(file)), false, "and never enters the recorded base either");
});

test("the sync names what it cannot do for the project — scaffold, entry files, recommended default skills — and goes quiet once done", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  write(source, "ai-framework/templates/project/done-work.md", "# Done Work\n");
  write(source, "AGENTS.md", "# A\n\n## Response style (caveman mode)\n\nbe brief\n\n## Guardrails\n");
  write(source, "ai-framework/integrations/skill-defaults.json", JSON.stringify({ schemaVersion: 1, defaults: [
    { id: "acme/repo/c", path: "skills/c/SKILL.md", purpose: "brevity", recommendedPhases: ["build", "manual"] },
    { id: "acme/repo/d", path: "skills/d/SKILL.md", purpose: "no recommendation" },
  ] }));
  write(target, "AGENTS.md", "# A\n");
  write(target, "CLAUDE.md", "# C\n");

  const before = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.deepEqual(before.nextSteps.map((step) => step.kind), ["scaffold", "entry-files", "default-skill"]);
  assert.match(before.nextSteps[0].message, /done-work\.md.*workflow-doctor\.js --fix/);
  assert.match(before.nextSteps[1].message, /AGENTS\.md and CLAUDE\.md lack/);
  assert.match(before.nextSteps[2].message, /acme\/repo\/c.*\/add-skill acme\/repo\/c --path skills\/c\/SKILL\.md --scope project --phases build,manual/);
  assert.equal(before.nextSteps.some((step) => /acme\/repo\/d/.test(step.message)), false, "a default with no recommendedPhases is not nagged about");
  assert.equal(before.summary.nextSteps, 3);
  assert.match(run(target, ["--source", source, "--base-ref", baseRef]).stdout, /NEXT STEPS \(3\)/);

  write(target, ".project/done-work.md", "# Done Work\n");
  write(target, "AGENTS.md", "# A\n\n## Response style (caveman mode)\n\nbe brief\n");
  write(target, "CLAUDE.md", "# C\n\n## Response style (caveman mode)\n\nbe brief\n");
  installSkill(target, skillRepo(directory, "c"), { skill: "acme/repo/c" });
  const after = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.deepEqual(after.nextSteps, [], "every step done, so nothing is left to say");
  assert.doesNotMatch(run(target, ["--source", source, "--base-ref", baseRef]).stdout, /NEXT STEPS/);

  fs.rmSync(path.join(target, ".project"), { recursive: true, force: true });
  assert.deepEqual(runJson(target, ["--source", source, "--base-ref", baseRef]).nextSteps, [], "no .project yet means setup has not run; these steps do not apply");
});
