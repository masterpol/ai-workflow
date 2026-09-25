const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { CATALOG, MODES, PHASES, resolveMode, report, loadModes } = require("./skill-defaults");

const BUNDLE = path.resolve(__dirname, "../..");

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-defaults-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("the catalog's caveman mode list matches the hardcoded MODES set exactly", () => {
  const caveman = CATALOG.defaults.find((entry) => entry.id.endsWith("/caveman"));
  assert.deepEqual(new Set(caveman.modes), MODES);
  assert.equal(caveman.defaultMode, "full");
  assert.ok(MODES.has(caveman.defaultMode));
});

test("every mode plus off resolves, and an unknown mode is rejected", (t) => {
  const root = fixture(t);
  for (const mode of [...MODES, "off"]) assert.equal(resolveMode(root, { phase: "build", invocationArg: mode }), mode);
  assert.throws(() => resolveMode(root, { phase: "build", invocationArg: "extreme" }), /Choose --arg explicitly/);
  assert.throws(() => resolveMode(root, { phase: "not-a-phase" }), /Unknown phase/);
});

test("missing modes.json falls back cleanly to the bundle default", (t) => {
  const root = fixture(t);
  assert.equal(loadModes(root), null);
  assert.equal(resolveMode(root, { phase: "build" }), "full");
});

test("precedence: invocation arg > phase override > instance default > bundle default", (t) => {
  const root = fixture(t);
  assert.equal(resolveMode(root, { phase: "build" }), "full", "bundle default with no state file");
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
  assert.equal(resolveMode(root, { phase: "build" }), "lite", "instance default beats bundle default");
  assert.equal(resolveMode(root, { phase: "audit" }), "lite", "instance default applies to any phase without its own override");
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "lite", phases: { build: "ultra" } } }));
  assert.equal(resolveMode(root, { phase: "build" }), "ultra", "phase override beats instance default");
  assert.equal(resolveMode(root, { phase: "audit" }), "lite", "unrelated phase still uses instance default");
  assert.equal(resolveMode(root, { phase: "build", invocationArg: "wenyan-lite" }), "wenyan-lite", "invocation arg beats everything");
});

test("a persistent disable resolves to off, but an explicit invocation arg for that one call still wins", (t) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { enabled: false, default: "full" } }));
  assert.equal(resolveMode(root, { phase: "build" }), "off");
  assert.equal(resolveMode(root, { phase: "audit" }), "off");
  assert.equal(resolveMode(root, { phase: "build", invocationArg: "lite" }), "lite", "explicit ask for this one call overrides a persistent disable");
});

test("a malformed modes.json is rejected, not silently ignored", (t) => {
  const root = fixture(t);
  for (const value of [
    { schemaVersion: 2, caveman: {} },
    { schemaVersion: 1, caveman: { enabled: "yes" } },
    { schemaVersion: 1, caveman: { default: "extreme" } },
    { schemaVersion: 1, caveman: { phases: { "not-a-phase": "full" } } },
    { schemaVersion: 1, caveman: { phases: { build: "extreme" } } },
    { schemaVersion: 1, caveman: "nope" },
    "not even an object",
  ]) {
    write(root, ".project/skills/modes.json", JSON.stringify(value));
    assert.throws(() => resolveMode(root, { phase: "build" }), undefined, JSON.stringify(value));
  }
});

test("a symlinked modes.json is refused, whether the leaf or an ancestor directory is the symlink", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  write(outside, "modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "full" } }));
  fs.mkdirSync(path.join(root, ".project/skills"), { recursive: true });
  fs.symlinkSync(path.join(outside, "modes.json"), path.join(root, ".project/skills/modes.json"));
  assert.throws(() => resolveMode(root, { phase: "build" }), /outside the project root/i);

  const root2 = fixture(t);
  const outside2 = fixture(t);
  write(outside2, "modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
  fs.mkdirSync(path.join(root2, ".project"), { recursive: true });
  fs.symlinkSync(outside2, path.join(root2, ".project/skills"));
  assert.throws(() => resolveMode(root2, { phase: "build" }), /outside the project root/i, "a symlinked ancestor directory must be caught too, not just the leaf file");
});

test("report distinguishes not-installed, installed+enabled, and installed+disabled without throwing", (t) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const before = report(root);
  assert.equal(before.registryError, null);
  assert.equal(before.defaults.length, CATALOG.defaults.length);
  assert.ok(before.defaults.every((entry) => entry.installed === false && entry.enabled === null));
  const compress = before.defaults.find((entry) => entry.id.endsWith("/caveman-compress"));
  const browser = before.defaults.find((entry) => entry.id.endsWith("/agent-browser"));
  assert.ok(["available", "unavailable"].includes(compress.runtime));
  assert.ok(["available", "unavailable"].includes(browser.runtime));
  const stats = before.defaults.find((entry) => entry.id.endsWith("/caveman-stats"));
  assert.equal(stats.runtime, null, "no runtime check declared for caveman-stats");
});

test("report surfaces an invalid registry without throwing and without claiming a default is installed", (t) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  const result = report(root);
  assert.match(result.registryError, /schema/i);
  assert.ok(result.defaults.every((entry) => entry.installed === false));
});

test("CLI resolve-mode and report work end to end, including --json", (t) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
  const script = path.join(__dirname, "skill-defaults.js");
  const text = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root], { encoding: "utf8" });
  assert.equal(text.status, 0);
  assert.equal(text.stdout.trim(), "lite");
  const json = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root, "--json"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(json.stdout), { phase: "build", mode: "lite" });
  const reportText = spawnSync(process.execPath, [script, "report", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(reportText.status, 0);
  assert.equal(JSON.parse(reportText.stdout).defaults.length, CATALOG.defaults.length);
  const reportPlain = spawnSync(process.execPath, [script, "report", "--root", root], { encoding: "utf8" });
  assert.equal(reportPlain.status, 0);
  assert.match(reportPlain.stdout, /juliusbrussee\/caveman\/caveman: not installed/);
  const bad = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root, "--arg", "nonsense"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Choose --arg explicitly/);
  const unknown = spawnSync(process.execPath, [script, "bogus"], { encoding: "utf8" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Usage:/);
});

test("every canonical phase name from the pitch is accepted", () => {
  assert.deepEqual([...PHASES].sort(), ["audit", "build", "cooldown", "critique", "plan", "shape", "ship"]);
});

test("workflow-doctor exits 0 on a real bundle copy, and fails loudly on a malformed skill-defaults.json", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-defaults-doctor-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const skip = new Set([".git", "node_modules", "metrics", ".DS_Store"]);
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source) => !skip.has(path.basename(source)) && !source.includes(`${path.sep}.project${path.sep}skills`) });
  const env = { ...process.env, PATH: path.dirname(process.execPath), NO_COLOR: "1" };
  const doctorScript = path.join(root, "ai-framework/scripts/workflow-doctor.js");

  const clean = spawnSync(process.execPath, [doctorScript, "--json"], { cwd: root, encoding: "utf8", env });
  const cleanReport = JSON.parse(clean.stdout);
  assert.equal(clean.status, 0);
  assert.deepEqual(cleanReport.results.filter((item) => item.status === "fail"), []);
  const cleanCheck = cleanReport.results.find((item) => item.name === "ai-framework/integrations/skill-defaults.json" && item.detail !== "present");
  assert.equal(cleanCheck.status, "pass");
  assert.match(cleanCheck.detail, /default skill\(s\) declared/);

  write(root, "ai-framework/integrations/skill-defaults.json", JSON.stringify({ schemaVersion: 2, defaults: [] }));
  const corrupted = spawnSync(process.execPath, [doctorScript, "--json"], { cwd: root, encoding: "utf8", env });
  const corruptedReport = JSON.parse(corrupted.stdout);
  assert.equal(corrupted.status, 1);
  assert.ok(corruptedReport.failures > 0);
  const corruptedCheck = corruptedReport.results.find((item) => item.name === "ai-framework/integrations/skill-defaults.json" && item.detail !== "present");
  assert.equal(corruptedCheck.status, "fail");
  assert.match(corruptedCheck.detail, /malformed catalog/);
});
