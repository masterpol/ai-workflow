import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { createTestDeps, urlPath, listTree, copyTree, execFileSync, spawnSync } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const os = testDeps.os;
const path = testDeps.path;
import test from "node:test";

const __dirname = path.dirname(urlPath(import.meta.url));

const SCRIPT = path.join(__dirname, "bundle-sync.mts");
const ADD_SKILL = path.join(__dirname, "add-skill.mts");
const SYNCED = ["ai-framework/rules", "ai-framework/workflow", "ai-framework/templates", "ai-framework/integrations", "ai-framework/docs", "ai-framework/scripts", "ai-framework/hooks", ".claude/agents", ".claude/skills", ".claude/hooks", ".opencode/commands", ".opencode/agents", ".codex/agents", ".agents/skills", ".cursor/agents", ".cursor/skills"];

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
  for (const file of ["ai-framework/scripts/add-skill.mts", "ai-framework/scripts/skill-registry.mts", "ai-framework/scripts/skill-source.mts", "ai-framework/scripts/skill-vendors.mts", "ai-framework/scripts/skill-sync.mts"]) {
    fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    fs.copyFileSync(path.join(__dirname, path.basename(file)), path.join(root, file));
  }
  copyTree(testDeps, path.join(__dirname, "runtime"), path.join(root, "ai-framework/scripts/runtime"));
  for (const name of ["entry-import", "skill-defaults"]) {
    fs.copyFileSync(path.join(__dirname, `${name}.mts`), path.join(root, `ai-framework/scripts/${name}.mts`));
  }
  write(root, "ai-framework/integrations/skill-defaults.json", read(__dirname, "../integrations/skill-defaults.json"));
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
  return spawnSync(process.execPath, [...RUNTIME_FLAGS, SCRIPT, ...args], { cwd: target, encoding: "utf8" });
}
function runJson(target, args) {
  const result = run(target, [...args, "--json"]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("consolidation guidance counts legacy pitches once and leaves instance records unchanged", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(source, "ai-framework/scripts/consolidation-migrate.mts", 'throw new Error("source migration must never execute during sync");\n');
  write(target, ".project/done-work.md", "# Local header\n\n## alpha — shipped 2026-10-01\n\nLegacy.\n\n## beta — shipped 2026-10-02\n\nLegacy too.\n");
  write(target, ".project/compaction/ledgers/alpha.json", JSON.stringify({ schemaVersion: 1, slug: "alpha", sections: [{ source: "log.md#one", status: "extracted", destination: ".project/knowledge/a.md" }] }));
  write(target, ".project/knowledge/templates/decision.md", "# Local decision template\n");
  write(target, ".project/knowledge/README.md", "# Local README\n");
  write(target, ".project/relations.toon", "# Local overlay\n");
  const snapshot = () => Object.fromEntries(listTree(testDeps, path.join(target, ".project"))
    .filter(name => name !== ".bundle-sync.json" && fs.lstatSync(path.join(target, ".project", name)).isFile())
    .map(name => [name, testDeps.crypto.sha256Hex(fs.readBytesSync(path.join(target, ".project", name)))]));
  const before = snapshot();
  for (const apply of [false, true, true]) {
    const result = runJson(target, ["--source", source, "--base-ref", baseRef, ...(apply ? ["--apply"] : [])]);
    const steps = result.nextSteps.filter(step => step.kind === "consolidation");
    assert.equal(steps.length, 1);
    assert.match(steps[0].message, /2 legacy compacted pitch\(es\)/);
    assert.match(steps[0].message, /node ai-framework\/scripts\/consolidation-migrate\.mts/);
    assert.match(steps[0].message, /after both sync passes/);
    assert.deepEqual(snapshot(), before, "only the existing sync baseline manifest may change under .project/");
  }
  assert.equal(exists(target, ".project/records/shipped"), false, "guidance does not run the migration");
});

test("consolidation guidance distinguishes a refused inventory from zero legacy pitches", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(source, "ai-framework/scripts/consolidation-migrate.mts", "// available after sync\n");
  write(target, ".project/done-work.md", "# Current\n");
  let result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.match(result.nextSteps.find(step => step.kind === "consolidation").message, /0 legacy compacted pitch/);
  write(target, ".project/compaction/ledgers/future.json", '{"schemaVersion":99}');
  result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  const message = result.nextSteps.find(step => step.kind === "consolidation").message;
  assert.match(message, /count unavailable \(inventory refused/);
  assert.doesNotMatch(message, /0 legacy/);
});
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
  const before = listTree(testDeps, target);
  const result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(result.summary.applied, false);
  assert.deepEqual(listTree(testDeps, target), before);
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
  const again = runJson(target, ["--source", source]);
  assert.equal(again.summary.conflict, 1, "unapplied conflict retains the null prior base");
  assert.equal(again.summary.changed, 0);
});

test("bundle docs under ai-framework/docs are synced to the target", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(source, "ai-framework/docs/setup.md", "# Set up\n");
  commit(source, "add a bundle doc");
  const dry = runJson(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(dry.summary.new, 1);
  runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(read(target, "ai-framework/docs/setup.md"), "# Set up\n");
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
  const again = runJson(target, ["--source", source]);
  assert.equal(again.removed.find((entry) => /gone-edited/.test(entry.path)).modified, "modified");
  assert.equal(again.removed.some((entry) => /gone-clean/.test(entry.path)), false);
});

test("archify-replaces-state: pruning the retired state scripts keeps edited copies and never touches the old reports", (t) => {
  const { source, target } = fixture(t);
  const scripts = ["state-snapshot", "state-render", "state-theme"].map((name) => `ai-framework/scripts/${name}.mts`);
  for (const script of scripts) { write(target, script, `// ${script} v1\n`); write(source, script, `// ${script} v1\n`); }
  const base = commit(source, "snapshot with the old state scripts");
  const oldReports = { ".project/reports/state.json": "{\"schemaVersion\":1}\n", ".project/reports/index.html": "<!doctype html>old\n", ".project/reports/theme.json": "{}\n" };
  for (const [file, text] of Object.entries(oldReports)) write(target, file, text);
  write(target, scripts[1], "// local edit of state-render\n");
  for (const script of scripts) fs.rmSync(path.join(source, script));
  write(source, "ai-framework/scripts/facts-gather.mts", "// new collector\n");
  commit(source, "the bundle retires the state scripts and adds facts-gather");
  const dry = runJson(target, ["--source", source, "--base-ref", base]);
  assert.deepEqual(dry.removed.map((entry) => entry.path).sort(), [...scripts].sort());
  assert.equal(dry.removed.find((entry) => /state-render/.test(entry.path)).modified, "modified");
  assert.ok(dry.new.some((entry) => entry.path === "ai-framework/scripts/facts-gather.mts"), "the replacement arrives as new");
  for (const script of scripts) assert.equal(exists(target, script), true, "a dry run removes nothing");
  const applied = runJson(target, ["--source", source, "--base-ref", base, "--apply", "--prune"]);
  assert.equal(applied.summary.prunedCount, 2, "only the two unmodified copies are pruned");
  assert.equal(exists(target, scripts[0]), false);
  assert.equal(exists(target, scripts[2]), false);
  assert.equal(read(target, scripts[1]), "// local edit of state-render\n", "a locally edited script is kept");
  assert.equal(read(target, "ai-framework/scripts/facts-gather.mts"), "// new collector\n");
  for (const [file, text] of Object.entries(oldReports)) assert.equal(read(target, file), text, `${file} is user data under .project/ and is never deleted`);
});

test("preserves local bases and retains unpruned upstream removals", (t) => {
  const { source, target } = fixture(t);
  write(source, "ai-framework/rules/gone.md", "old\n");
  write(target, "ai-framework/rules/gone.md", "old\n");
  const base = commit(source, "add removal fixture");
  write(target, "ai-framework/rules/example.md", "my edit\n");
  fs.unlinkSync(path.join(source, "ai-framework/rules/gone.md"));
  runJson(target, ["--source", source, "--base-ref", base, "--apply"]);
  const again = runJson(target, ["--source", source]);
  assert.equal(again.summary.local, 1);
  assert.equal(again.removed.find((entry) => /gone.md/.test(entry.path)).modified, "unmodified");
  const pruned = runJson(target, ["--source", source, "--apply", "--prune"]);
  assert.equal(pruned.summary.prunedCount, 1);
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

test("SETUP.md and README.md are flagged for manual review when they differ, and never auto-applied", (t) => {
  const { source, target, baseRef } = fixture(t);
  for (const name of ["SETUP.md", "README.md"]) {
    write(target, name, "target version\n");
    write(source, name, "source version\n");
  }
  commit(source, "change SETUP.md and README.md");
  const result = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.deepEqual(result.flagged.map((entry) => entry.path).sort(), ["README.md", "SETUP.md"]);
  for (const name of ["SETUP.md", "README.md"]) assert.equal(read(target, name), "target version\n");
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

// ai-workflow.toon is instance data (root file, outside every SYNCED_DIRS entry, not a FLAGGED_FILES entry).
// `toonTouched` is the detector; the mutation test proves it bites by running a mutated copy of the script.
const TOON = "ai-workflow.toon";
function toonTouched(target, before, result) {
  const reported = JSON.stringify(result).includes(TOON);
  const bytes = exists(target, TOON) ? read(target, TOON) : null;
  return reported || bytes !== before;
}
function mutatedScript(directory, replacement) {
  const root = path.join(directory, `mutant-${replacement.name}`);
  const dir = path.join(root, "ai-framework/scripts");
  fs.mkdirSync(dir, { recursive: true });
  copyTree(testDeps, path.join(__dirname, "../integrations"), path.join(root, "ai-framework/integrations"));
  copyTree(testDeps, path.join(__dirname, "runtime"), path.join(dir, "runtime"));
  for (const name of fs.readdirSync(__dirname)) if (name.endsWith(".mts") && !name.endsWith(".test.mts")) fs.copyFileSync(path.join(__dirname, name), path.join(dir, name));
  const original = fs.readFileSync(SCRIPT, "utf8");
  const mutated = original.replace(replacement.from, replacement.to);
  assert.notEqual(mutated, original, `mutation ${replacement.name} must change the script`);
  const file = path.join(dir, "bundle-sync.mts");
  fs.writeFileSync(file, mutated);
  return file;
}
function runWith(script, target, args) {
  const result = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, ...args, "--json"], { cwd: target, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("ai-workflow.toon in the project root is instance data: never synced, flagged, overwritten or created, on every pass", (t) => {
  const { source, target, baseRef } = fixture(t);
  const local = "schemaVersion: 1\nruntime:\n  runner: bun\n";
  write(target, TOON, local);
  write(source, TOON, "schemaVersion: 1\nruntime:\n  runner: node\n");
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit plus a source-side config file");
  for (let pass = 0; pass < 2; pass++) {
    const result = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply", "--prune", "--overwrite-unverified"]);
    assert.equal(toonTouched(target, local, result), false, `pass ${pass + 1}`);
  }
  assert.equal(read(target, "ai-framework/rules/example.md"), "rule v2\n", "the sync itself still ran");
  const bare = fixture(t);
  write(bare.source, TOON, "schemaVersion: 1\n");
  commit(bare.source, "source-side config only");
  runJson(bare.target, ["--source", bare.source, "--base-ref", bare.baseRef, "--apply", "--prune", "--overwrite-unverified"]);
  assert.equal(exists(bare.target, TOON), false, "a target without a config never receives the source's");
});

test("simulated old-version sync: first sync with no base or marker, and a marker from an older bundle, leave the config alone", (t) => {
  const { source, target } = fixture(t);
  const local = "schemaVersion: 1\nruntime:\n  runner: bun\n";
  write(target, TOON, local);
  write(source, TOON, "schemaVersion: 1\n");
  write(source, "ai-framework/rules/example.md", "rule v2\n");
  commit(source, "upstream edit, no base known");
  const first = runJson(target, ["--source", source, "--apply", "--prune", "--overwrite-unverified"]);
  assert.equal(toonTouched(target, local, first), false, "no marker, no base");
  write(target, ".project/.bundle-sync.json", JSON.stringify({ schemaVersion: 1, files: { "ai-framework/rules/example.md": "0".repeat(64) }, legacyField: "from an older bundle" }));
  const second = runJson(target, ["--source", source, "--apply", "--prune", "--overwrite-unverified"]);
  assert.equal(toonTouched(target, local, second), false, "older marker");
  assert.equal(read(target, TOON), local);
});

test("mutation check: the config exclusion detector fails when the script is mutated to treat the TOON as a flagged or synced file", (t) => {
  const { directory, source, target, baseRef } = fixture(t);
  const local = "schemaVersion: 1\nruntime:\n  runner: bun\n";
  write(target, TOON, local);
  write(source, TOON, "schemaVersion: 1\n");
  commit(source, "source-side config");
  const args = ["--source", source, "--base-ref", baseRef];
  assert.equal(toonTouched(target, local, runWith(SCRIPT, target, args)), false, "baseline: the real script never touches it");
  const flagged = mutatedScript(directory, { name: "flagged", from: /FLAGGED_FILES: readonly string\[\] = \[/, to: `FLAGGED_FILES: readonly string[] = ["${TOON}", ` });
  assert.equal(toonTouched(target, local, runWith(flagged, target, args)), true, "mutant: a flagged config is reported");
  const synced = mutatedScript(directory, { name: "synced", from: /SYNCED_DIRS: readonly string\[\] = \[/, to: `SYNCED_DIRS: readonly string[] = ["${TOON}", ` });
  const crashed = spawnSync(process.execPath, [...RUNTIME_FLAGS, synced, ...args, "--apply", "--overwrite-unverified", "--json"], { cwd: target, encoding: "utf8" });
  const syncedResult = crashed.status === 0 ? JSON.parse(crashed.stdout) : { failed: crashed.stderr };
  assert.ok(crashed.status !== 0 || toonTouched(target, local, syncedResult), "mutant: a synced config either breaks the sync or is reported/overwritten");
  assert.match(crashed.stderr + JSON.stringify(syncedResult), /ai-workflow\.toon/, "the mutant is visibly about the config file");
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

test("keeps unverified files pending across repeated marker writes", (t) => {
  const { source, target } = fixture(t);
  write(source, "ai-framework/rules/example.md", "upstream v2\n");
  for (let runNumber = 0; runNumber < 2; runNumber++) {
    const result = runJson(target, ["--source", source, "--apply"]);
    assert.equal(result.summary.unverified, 1);
    const marker = JSON.parse(read(target, ".project/.bundle-sync.json"));
    assert.equal(Object.hasOwn(marker.files, "ai-framework/rules/example.md"), false);
    assert.equal(read(target, "ai-framework/rules/example.md"), "rule v1\n");
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
  assert.match(before.nextSteps[0].message, /done-work\.md.*workflow-doctor\.mts --fix/);
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

// The report reset has no reason to execute project code or contact a service.
// Inject failures here so its data-only boundary is exercised independently of sync's git work.
async function reportFixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-report-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, "target");
  const source = path.join(directory, "source");
  fs.mkdirSync(target);
  fs.mkdirSync(source);
  const reports = path.join(target, ".project/reports");
  const files = { "state.html": "<html>delivered</html>", "state.explainer.json": '{"title":"delivered"}' };
  const digest = (text) => testDeps.crypto.sha256Hex(new TextEncoder().encode(text));
  for (const [name, text] of Object.entries(files)) write(target, `.project/reports/${name}`, text);
  write(target, ".project/reports/state.delivery.json", JSON.stringify({
    artifact: { sha256: digest(files["state.html"]) }, specification: { sha256: digest(files["state.explainer.json"]) },
    explainer: { preparedSha256: "0".repeat(64) },
  }));
  const deps = {
    ...testDeps,
    proc: { ...testDeps.proc, cwd: () => target },
    fs: { ...fs, ...options.fs },
    child: new Proxy({}, { get() { throw new Error("must not execute child process"); } }),
    net: new Proxy({}, { get() { throw new Error("must not use network"); } }),
  };
  const { makeSync } = await import("./bundle-sync.mts");
  return { target, source, reports, files, deps, reset: (apply = true) => makeSync(apply ? ["--apply"] : [], deps).resetStateReports(), pin: () => makeSync([], deps).archifyPinStep(source) };
}

test("report reset removes only matching receipt-owned files and names re-run /state", async (t) => {
  const { target, reset } = await reportFixture(t);
  const steps = await reset();
  for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.equal(exists(target, `.project/reports/${name}`), false);
  assert.equal(steps.length, 3);
  assert.ok(steps.every(step => step.kind === "reports" && /Removed.*re-run \/state/.test(step.message)));
});

for (const name of ["state.html", "state.explainer.json"]) {
  test(`report reset preserves edited ${name} and the receipt`, async (t) => {
    const { target, reset } = await reportFixture(t);
    write(target, `.project/reports/${name}`, "user edit");
    const receipt = read(target, ".project/reports/state.delivery.json");
    const steps = await reset();
    assert.equal(read(target, `.project/reports/${name}`), "user edit");
    assert.equal(read(target, ".project/reports/state.delivery.json"), receipt);
    assert.equal(exists(target, `.project/reports/${name === "state.html" ? "state.explainer.json" : "state.html"}`), false);
    assert.ok(steps.some(step => step.message === `Kept .project/reports/${name}: report-not-owned.`));
  });
}

test("report reset re-hashes before removing: an edit after the preflight hash is kept", async (t) => {
  let opens = 0, target;
  const f = await reportFixture(t, { fs: { openSync: (file, ...rest) => {
    if (String(file).endsWith("state.html") && ++opens === 2) fs.writeFileSync(path.join(target, ".project/reports/state.html"), "late user edit");
    return fs.openSync(file, ...rest);
  } } });
  target = f.target;
  const steps = await f.reset();
  assert.equal(read(f.target, ".project/reports/state.html"), "late user edit");
  assert.ok(steps.some(step => /Report reset refused: report-changed/.test(step.message)));
});

test("report reset refuses a file renamed over the hashed one before the unlink", async (t) => {
  let swapped = false, target;
  const f = await reportFixture(t, { fs: { lstatSync: (file, ...rest) => {
    if (!swapped && String(file).endsWith(path.join("reports", "state.html"))) {
      swapped = true;
      fs.writeFileSync(path.join(target, ".project/reports/user.html"), "USER WORK");
      fs.renameSync(path.join(target, ".project/reports/user.html"), path.join(target, ".project/reports/state.html"));
    }
    return fs.lstatSync(file, ...rest);
  } } });
  target = f.target;
  const steps = await f.reset();
  assert.equal(swapped, true);
  assert.equal(read(f.target, ".project/reports/state.html"), "USER WORK", "the swapped-in file is not removed");
  assert.ok(steps.some(step => /Report reset refused: report-changed/.test(step.message)));
});

test("report reset pins the hashed descriptor: a swap right after the final hash read is refused", async (t) => {
  let target, htmlOpens = 0, watched = -1, swapped = false;
  const f = await reportFixture(t, { fs: {
    openSync: (file, ...rest) => { const fd = fs.openSync(file, ...rest); if (String(file).endsWith("state.html") && ++htmlOpens === 2) watched = fd; return fd; },
    closeSync: (fd) => {
      fs.closeSync(fd);
      if (fd === watched && !swapped) {
        swapped = true;
        fs.writeFileSync(path.join(target, ".project/reports/user.html"), "USER WORK");
        fs.renameSync(path.join(target, ".project/reports/user.html"), path.join(target, ".project/reports/state.html"));
      }
    },
  } });
  target = f.target;
  const steps = await f.reset();
  assert.equal(swapped, true);
  assert.equal(read(f.target, ".project/reports/state.html"), "USER WORK", "the file swapped in after the hash is kept");
  assert.ok(steps.some(step => /Report reset refused: report-changed/.test(step.message)));
});

test("report reset dry run lists removals without changing any byte", async (t) => {
  const { target, reset } = await reportFixture(t);
  const snapshot = () => Object.fromEntries(listTree(testDeps, target).filter(name => fs.lstatSync(path.join(target, name)).isFile()).map(name => [name, read(target, name)]));
  const before = snapshot();
  const steps = await reset(false);
  assert.deepEqual(snapshot(), before);
  assert.equal(steps.filter(step => /Would remove/.test(step.message)).length, 3);
});

for (const entry of ["reports", "receipt", "html", "draft", "ancestor"]) {
  test(`report reset refuses a symlinked ${entry} before removing anything`, async (t) => {
    const { target, reports, reset } = await reportFixture(t);
    const original = entry === "ancestor" ? path.join(target, ".project") : entry === "reports" ? reports : path.join(reports, entry === "receipt" ? "state.delivery.json" : entry === "html" ? "state.html" : "state.explainer.json");
    const moved = `${original}-saved`;
    fs.renameSync(original, moved);
    fs.symlinkSync(moved, original);
    const steps = await reset();
    assert.ok(steps.some(step => /report-path-refused/.test(step.message)));
    for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.ok(exists(target, `.project/reports/${name}`));
  });
}

for (const [label, contents, reason] of [
  ["oversize", " ".repeat(65537), "report-oversize"],
  ["invalid JSON", "{oops", "report-invalid-receipt"],
  ["invalid hashes", '{"artifact":{"sha256":"bad"}}', "report-invalid-receipt"],
  ["null JSON", "null", "report-invalid-receipt"],
]) {
  test(`report reset refuses ${label} receipt with fixed text and no deletion`, async (t) => {
    const { target, reset } = await reportFixture(t);
    write(target, ".project/reports/state.delivery.json", contents);
    const steps = await reset();
    assert.equal(steps[0].message, `Report reset refused: ${reason}; kept remaining files. Review before re-running /state.`);
    for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.ok(exists(target, `.project/reports/${name}`));
  });
}

test("report reset refuses a non-regular target before removing its matching sibling", async (t) => {
  const { target, reports, reset } = await reportFixture(t);
  fs.unlinkSync(path.join(reports, "state.explainer.json"));
  fs.mkdirSync(path.join(reports, "state.explainer.json"));
  assert.match((await reset())[0].message, /report-not-regular/);
  assert.ok(exists(target, ".project/reports/state.html"));
  assert.ok(exists(target, ".project/reports/state.delivery.json"));
});

for (const replacement of ["reports", "ancestor", "inode", "device"]) {
  test(`report reset rechecks directory identity after hash checks (${replacement})`, async (t) => {
    const f = await reportFixture(t);
    let hashChecks = 0;
    let swapped = false;
    f.deps.crypto = { ...testDeps.crypto, sha256Hex: bytes => { hashChecks++; return testDeps.crypto.sha256Hex(bytes); } };
    const originalLstat = f.deps.fs.lstat;
    f.deps.fs.lstat = async (file) => {
      if (file === f.reports && hashChecks >= 2 && !swapped) {
        swapped = true;
        if (replacement === "reports" || replacement === "ancestor") {
          const old = replacement === "reports" ? f.reports : path.dirname(f.reports);
          fs.renameSync(old, `${old}-original`);
          fs.mkdirSync(f.reports, { recursive: true });
          for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) write(f.target, `.project/reports/${name}`, "replacement must survive");
        }
      }
      const stat = await originalLstat(file);
      if (file === f.reports && swapped && (replacement === "inode" || replacement === "device")) return { ...stat, isSymbolicLink: () => false, isDirectory: () => true, dev: stat.dev + (replacement === "device" ? 1 : 0), ino: stat.ino + (replacement === "inode" ? 1 : 0) };
      return stat;
    };
    const steps = await f.reset();
    assert.ok(swapped);
    assert.ok(steps.some(step => /report-directory-changed/.test(step.message)));
    for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.ok(exists(f.target, `.project/reports/${name}`));
  });
}

test("report reset lists all pre-2.51 pages and never removes them", async (t) => {
  const { target, reset } = await reportFixture(t);
  for (const name of ["index.html", "state.json", "theme.json"]) write(target, `.project/reports/${name}`, `legacy ${name}`);
  const steps = await reset();
  for (const name of ["index.html", "state.json", "theme.json"]) {
    assert.equal(read(target, `.project/reports/${name}`), `legacy ${name}`);
    assert.ok(steps.some(step => step.message === `Legacy .project/reports/${name} kept; review manually.`));
  }
});

test("apply changes no other project records beyond the marker and verified delivery", (t) => {
  const { source, target, baseRef } = fixture(t);
  const digest = text => testDeps.crypto.sha256Hex(new TextEncoder().encode(text));
  write(target, ".project/reports/state.html", "page");
  write(target, ".project/reports/state.explainer.json", "draft");
  write(target, ".project/reports/state.delivery.json", JSON.stringify({ artifact: { sha256: digest("page") }, specification: { sha256: digest("draft") } }));
  for (const name of ["status.md", "knowledge/notes.md", "pitches/local/pitch.md", "design/layout.md", "reports/custom.html", "reports/index.html", "reports/state.json", "reports/theme.json", "skills/local.txt"]) write(target, `.project/${name}`, `local bytes ${name}\n`);
  const snapshot = () => Object.fromEntries(listTree(testDeps, path.join(target, ".project")).filter(name => name !== ".bundle-sync.json" && !["reports/state.html", "reports/state.explainer.json", "reports/state.delivery.json"].includes(name) && fs.lstatSync(path.join(target, ".project", name)).isFile()).map(name => [name, read(target, `.project/${name}`)]));
  const before = snapshot();
  // With nothing new upstream, the last delivery still describes the installed bundle and is kept.
  const unchanged = runJson(target, ["--source", source, "--base-ref", baseRef, "--apply"]);
  assert.equal(unchanged.nextSteps.some(step => step.kind === "reports"), false, "no reset when the sync brings nothing");
  assert.equal(exists(target, ".project/reports/state.html"), true);
  write(source, "ai-framework/rules/reset-trigger.md", "new upstream rule\n");
  commit(source, "the bundle changes, so the report describes an older bundle");
  const result = runJson(target, ["--source", source, "--apply"]);
  assert.deepEqual(snapshot(), before);
  assert.ok(exists(target, ".project/.bundle-sync.json"));
  assert.ok(result.nextSteps.some(step => step.kind === "reports" && /re-run \/state/.test(step.message)));
  assert.equal(exists(target, ".project/reports/state.html"), false);
});

test("Archify pin guidance comes only from one bounded anchored source row", async (t) => {
  const f = await reportFixture(t);
  const pin = "a".repeat(40);
  const row = `| Pinned commit | \`${pin}\` |`;
  write(f.source, "ai-framework/integrations/state-report.md", `# Source contract\n${row}\n`);
  write(f.target, ".project/skills/registry.json", JSON.stringify({ skills: { "tt-a1i/archify/archify": { source: { revision: "b".repeat(40) } } } }));
  const steps = await f.pin();
  assert.equal(steps.length, 1);
  assert.equal(steps[0].kind, "archify-pin");
  assert.match(steps[0].message, new RegExp(`add-skill\\.mts install tt-a1i/archify/archify .*--ref ${pin}`));
  for (const text of [`prefix ${row}\n`, `${row} trailing\n`, `${row}\n${row}\n`, "x".repeat(65537) + `\n${row}\n`]) {
    write(f.source, "ai-framework/integrations/state-report.md", text);
    assert.deepEqual(await f.pin(), []);
  }
  write(f.source, "ai-framework/integrations/state-report.md", `${row}\n`);
  write(f.target, ".project/skills/registry.json", JSON.stringify({ skills: { "tt-a1i/archify/archify": { source: { revision: pin } } } }));
  assert.deepEqual(await f.pin(), []);
  write(f.target, ".project/skills/registry.json", '{"skills":{}}');
  assert.deepEqual(await f.pin(), []);
  write(f.target, ".project/skills/registry.json", "invalid");
  assert.deepEqual(await f.pin(), []);
});

for (const absent of ["receipt", "targets"]) {
  test(`report reset handles missing ${absent} without claiming ownership by name`, async (t) => {
    const f = await reportFixture(t);
    if (absent === "receipt") {
      fs.unlinkSync(path.join(f.reports, "state.delivery.json"));
      assert.deepEqual(await f.reset(), []);
      assert.ok(exists(f.target, ".project/reports/state.html"));
      assert.ok(exists(f.target, ".project/reports/state.explainer.json"));
    } else {
      for (const name of ["state.html", "state.explainer.json"]) fs.unlinkSync(path.join(f.reports, name));
      assert.match((await f.reset())[0].message, /Removed.*state.delivery.json/);
      assert.equal(exists(f.target, ".project/reports/state.delivery.json"), false);
    }
  });
}

test("report reset refuses an oversized draft before removing the matching HTML", async (t) => {
  const f = await reportFixture(t);
  write(f.target, ".project/reports/state.explainer.json", "x".repeat(2 * 1024 * 1024 + 1));
  assert.match((await f.reset())[0].message, /report-oversize/);
  for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.ok(exists(f.target, `.project/reports/${name}`));
});

test("report reset checks directory identity again before the second removal", async (t) => {
  const f = await reportFixture(t);
  let removals = 0;
  const unlink = f.deps.fs.unlinkSync;
  f.deps.fs.unlinkSync = file => {
    unlink(file);
    removals++;
    if (removals === 1) {
      fs.renameSync(f.reports, `${f.reports}-original`);
      fs.mkdirSync(f.reports);
      for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) write(f.target, `.project/reports/${name}`, "replacement must survive");
    }
  };
  const steps = await f.reset();
  assert.equal(removals, 1);
  assert.ok(steps.some(step => /report-directory-changed/.test(step.message)));
  for (const name of ["state.html", "state.explainer.json", "state.delivery.json"]) assert.equal(read(f.target, `.project/reports/${name}`), "replacement must survive");
});

test("NEXT STEPS prints the source Archify pin command only for an installed differing revision", (t) => {
  const { source, target, baseRef, directory } = fixture(t);
  const pin = "c".repeat(40);
  write(source, "ai-framework/integrations/state-report.md", `| Pinned commit | \`${pin}\` |\n`);
  assert.equal(runJson(target, ["--source", source, "--base-ref", baseRef]).nextSteps.some(step => step.kind === "archify-pin"), false);
  installSkill(target, skillRepo(directory, "archify"), { skill: "tt-a1i/archify/archify" });
  const result = runJson(target, ["--source", source, "--base-ref", baseRef]);
  const step = result.nextSteps.find(step => step.kind === "archify-pin");
  assert.ok(step, "an installed differing Archify revision gets a pin hint");
  assert.match(step.message, new RegExp(`--ref ${pin} --apply`));
  const output = run(target, ["--source", source, "--base-ref", baseRef]);
  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /NEXT STEPS/);
  assert.match(output.stdout, new RegExp(`add-skill\\.mts install tt-a1i/archify/archify .*--ref ${pin}`));
  const installed = JSON.parse(read(target, ".project/skills/registry.json")).skills["tt-a1i/archify/archify"].source.revision;
  write(source, "ai-framework/integrations/state-report.md", `| Pinned commit | \`${installed}\` |\n`);
  assert.equal(runJson(target, ["--source", source, "--base-ref", baseRef]).nextSteps.some(step => step.kind === "archify-pin"), false);
});

test("the pin hint still works when --source is a symlink to the bundle; only the report reset refuses a linked project root", async (t) => {
  const f = await reportFixture(t);
  const pin = "a".repeat(40);
  write(f.source, "ai-framework/integrations/state-report.md", `# Source contract\n| Pinned commit | \`${pin}\` |\n`);
  write(f.target, ".project/skills/registry.json", JSON.stringify({ skills: { "tt-a1i/archify/archify": { source: { revision: "b".repeat(40) } } } }));
  const link = path.join(path.dirname(f.source), "source-link");
  fs.symlinkSync(f.source, link);
  const { makeSync } = await import("./bundle-sync.mts");
  const steps = await makeSync([], f.deps).archifyPinStep(link);
  assert.equal(steps.length, 1, "a source reached through a link is still read");
  assert.equal(steps[0].kind, "archify-pin");
});

test("a project whose graph is rebuilt in post-commit is told to run graphify setup once, and one with the commit-time rebuild is not", (t) => {
  const { source, target, baseRef } = fixture(t);
  write(target, "graphify-out/graph.json", "{}\n");
  write(target, ".git/hooks/post-commit", "#!/bin/sh\n# ai-workflow-graphify-start\n( rebuild )\n# ai-workflow-graphify-end\n");
  const older = runJson(target, ["--source", source, "--base-ref", baseRef]);
  const step = older.nextSteps.find(item => item.kind === "graphify" && /pre-commit hook/.test(item.message));
  assert.ok(step, "the older after-commit rebuild is named");
  assert.match(step.message, /graphify\.mts setup/);
  write(target, ".git/hooks/post-commit", "#!/bin/sh\necho unrelated\n");
  assert.equal(runJson(target, ["--source", source, "--base-ref", baseRef]).nextSteps.some(item => item.kind === "graphify" && /pre-commit hook/.test(item.message)), false);
});
