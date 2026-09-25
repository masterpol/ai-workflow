const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { CATALOG, MODES, PHASES, resolveMode, report, loadModes, extractInvocationArg } = require("./skill-defaults");

const BUNDLE = path.resolve(__dirname, "../..");
const { externalSkillReport } = require("./skill-vendors");

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

test("a caveman=<mode> token embedded in real free-form invocation text is extracted correctly", () => {
  assert.equal(extractInvocationArg("caveman=lite do the build scope"), "lite");
  assert.equal(extractInvocationArg("fix the login bug, also caveman=ultra please"), "ultra");
  assert.equal(extractInvocationArg("CAVEMAN=Off"), "off", "case-insensitive on both the key and the value");
  assert.equal(extractInvocationArg("portable-skill-defaults D1 (plan approved)"), undefined, "no caveman= mention at all is not an error, just absent");
  assert.equal(extractInvocationArg(""), undefined);
  assert.equal(extractInvocationArg(undefined), undefined);
  assert.equal(extractInvocationArg(42), undefined, "non-string input never throws");
});

test("resolveMode's --args-text path matches the exact scenario that broke the original --arg $ARGUMENT design", (t) => {
  const root = fixture(t);
  // Before the fix, passing the raw, unparsed invocation text directly as an exact mode value
  // failed validation the moment it carried anything beyond the bare mode word.
  assert.equal(resolveMode(root, { phase: "build", argumentsText: "caveman=lite do the build scope" }), "lite");
  assert.equal(resolveMode(root, { phase: "build", argumentsText: "portable-skill-defaults D1 (plan approved)" }), "full", "falls through to bundle default when nothing mentions caveman");
  assert.throws(() => resolveMode(root, { phase: "build", argumentsText: "caveman=turbo" }), /Choose --arg explicitly/, "a real typo after caveman= is still rejected loudly, not silently ignored");
  assert.equal(resolveMode(root, { phase: "build", invocationArg: "ultra", argumentsText: "caveman=lite ignored because invocationArg wins" }), "ultra", "an explicit invocationArg always takes precedence over argumentsText extraction");
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

test("CLI --args-text resolves a real free-form phase invocation the way every canonical phase file actually calls it", (t) => {
  const root = fixture(t);
  const script = path.join(__dirname, "skill-defaults.js");
  const embedded = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root, "--args-text", "caveman=lite do the build scope"], { encoding: "utf8" });
  assert.equal(embedded.status, 0);
  assert.equal(embedded.stdout.trim(), "lite");
  const none = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root, "--args-text", "portable-skill-defaults D1 (plan approved)"], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.equal(none.stdout.trim(), "full");
  const both = spawnSync(process.execPath, [script, "resolve-mode", "--phase", "build", "--root", root, "--arg", "lite", "--args-text", "caveman=ultra"], { encoding: "utf8" });
  assert.equal(both.status, 1);
  assert.match(both.stderr, /not both/);
});

test("every canonical phase name from the pitch is accepted", () => {
  assert.deepEqual([...PHASES].sort(), ["agent", "audit", "build", "cooldown", "critique", "plan", "shape", "ship", "utility"]);
});

test("workflow-doctor exits 0 on a real bundle copy, and fails loudly on a malformed skill-defaults.json", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-defaults-doctor-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const skip = new Set([".git", "node_modules", "metrics", ".DS_Store"]);
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source) => !skip.has(path.basename(source)) });
  // Keep .project/skills (registry + packages) together with the wrapper files it owns: excluding
  // it would leave an installed skill's wrappers orphaned, which the doctor rightly rejects — a
  // failure that only appears once a skill is actually installed in the repo running this test.
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

// Every canonical skill and agent must carry the caveman instruction, and the instruction must
// actually work when followed: the --phase it names has to be one resolve-mode accepts (the
// same "instruction looked right but the command it names would fail" class of bug found after
// D1 shipped), and the paragraph's command must run as written.
function canonicalFiles() {
  const managed = externalSkillReport(BUNDLE).managed; // registry-installed upstream skills carry no workflow paragraph
  const skills = fs.readdirSync(path.join(BUNDLE, ".claude/skills")).filter((name) => !managed.has(name)).map((name) => ({ kind: "skill", name, file: `.claude/skills/${name}/SKILL.md` }));
  const agents = fs.readdirSync(path.join(BUNDLE, ".claude/agents")).filter((name) => name.endsWith(".md")).map((name) => ({ kind: "agent", name: name.replace(/\.md$/, ""), file: `.claude/agents/${name}` }));
  return [...skills, ...agents];
}

test("every canonical skill and agent carries exactly one caveman instruction naming a phase resolve-mode accepts", () => {
  const files = canonicalFiles();
  assert.ok(files.length >= 42, `expected the full bundle (26 skills + 16 agents), found ${files.length}`);
  const phaseSkills = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown"]);
  for (const { kind, name, file } of files) {
    const text = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    assert.equal((text.match(/\*\*Caveman mode:\*\*/g) || []).length, 1, `${file} must carry exactly one caveman instruction`);
    const phase = text.match(/resolve-mode --phase ([a-z]+)/)[1];
    assert.ok(PHASES.has(phase), `${file} names --phase ${phase}, which resolve-mode would reject`);
    const expected = kind === "agent" ? "agent" : phaseSkills.has(name) ? name : "utility";
    assert.equal(phase, expected, `${file} should resolve as ${expected}`);
  }
});

test("the exact command each skill and agent instruction names runs successfully as written", (t) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra", phases: { agent: "lite", utility: "wenyan-lite" } } }));
  const expectedByScope = { agent: "lite", utility: "wenyan-lite", build: "ultra" };
  const script = path.join(__dirname, "skill-defaults.js");
  for (const { file } of canonicalFiles()) {
    const text = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    const phase = text.match(/resolve-mode --phase ([a-z]+)/)[1];
    const plain = spawnSync(process.execPath, [script, "resolve-mode", "--phase", phase, "--args-text", "please review this", "--root", root], { encoding: "utf8" });
    assert.equal(plain.status, 0, `${file}: ${plain.stderr}`);
    assert.equal(plain.stdout.trim(), expectedByScope[phase] || "ultra", `${file} (${phase}) must resolve through the instance override/default chain`);
    const withArg = spawnSync(process.execPath, [script, "resolve-mode", "--phase", phase, "--args-text", "caveman=off do the thing", "--root", root], { encoding: "utf8" });
    assert.equal(withArg.stdout.trim(), "off", `${file}: an invocation-scoped caveman=off must win`);
  }
});

test("every vendor mirror of a skill or agent either points at the canonical file or is byte-identical to it", () => {
  const files = canonicalFiles();
  for (const { kind, name, file } of files) {
    const canonical = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    // Cursor mirrors are generated byte copies (absent in a fresh source checkout — skip then).
    const cursor = path.join(BUNDLE, kind === "agent" ? `.cursor/agents/${name}.md` : `.cursor/skills/${name}/SKILL.md`);
    if (fs.existsSync(cursor)) assert.equal(fs.readFileSync(cursor, "utf8"), canonical, `${path.relative(BUNDLE, cursor)} is stale — run skill-vendors.js cursor-mirrors and refresh it`);
    // Codex/OpenCode mirrors are pointers, so they inherit the canonical instruction; confirm the pointer exists.
    const pointers = kind === "agent" ? [`.opencode/agents/${name}.md`, `.codex/agents/${name}.toml`] : [`.agents/skills/${name}/SKILL.md`, `.opencode/commands/${name}.md`];
    for (const pointer of pointers) {
      const full = path.join(BUNDLE, pointer);
      if (!fs.existsSync(full)) continue;
      assert.match(fs.readFileSync(full, "utf8"), new RegExp(`\\.claude/(skills/${name}/SKILL|agents/${name})\\.md|ai-framework/scripts/`), `${pointer} must load the canonical file or its script, not carry its own copy of the logic`);
    }
  }
});

test("both cross-vendor entry files carry the same working caveman instruction for the main session agent", () => {
  const section = (file) => fs.readFileSync(path.join(BUNDLE, file), "utf8").match(/## Response style \(caveman mode\)\n[\s\S]*?(?=\n## )/)?.[0];
  const agents = section("AGENTS.md");
  assert.ok(agents, "AGENTS.md needs the Response style section");
  assert.equal(section("CLAUDE.md"), agents, "CLAUDE.md is a required full mirror of AGENTS.md — the section must be identical");
  const phase = agents.match(/resolve-mode --phase ([a-z]+)/)[1];
  assert.ok(PHASES.has(phase), `entry files name --phase ${phase}, which resolve-mode would reject`);
  assert.match(agents, /caveman=<lite\|full\|ultra\|wenyan-lite\|wenyan-full\|wenyan-ultra\|off>/);
});

test("doctor and setup-validator report the live caveman state truthfully across every state it can be in", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "caveman-state-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source) => !new Set([".git", "node_modules", "metrics", ".DS_Store"]).has(path.basename(source)) });
  const env = { ...process.env, PATH: path.dirname(process.execPath), NO_COLOR: "1" };
  const node = (script, ...args) => spawnSync(process.execPath, [path.join(root, "ai-framework/scripts", script), ...args], { cwd: root, encoding: "utf8", env });
  const doctor = () => JSON.parse(node("workflow-doctor.js", "--json").stdout);
  const state = () => doctor().results.find((item) => item.name === "Caveman mode");
  // add-skill shells out to git, so it keeps the full PATH; only the doctor needs it restricted.
  const installer = (...args) => spawnSync(process.execPath, [path.join(root, "ai-framework/scripts/add-skill.js"), ...args], { cwd: root, encoding: "utf8" });
  const addSkill = (...args) => { const result = installer(...args, "--root", root, "--scope", "project", "--apply"); assert.equal(result.status, 0, result.stderr); };
  const id = "juliusbrussee/caveman/caveman";

  assert.match(state().detail, /^active: installed, enabled, covers all recommended phases; default full/);
  assert.equal(state().status, "pass");

  const modes = path.join(root, ".project/skills/modes.json");
  fs.writeFileSync(modes, JSON.stringify({ schemaVersion: 1, caveman: { enabled: false } }));
  assert.equal(state().status, "info");
  assert.match(state().detail, /persistently disabled/);

  fs.writeFileSync(modes, "{ not json");
  const broken = doctor();
  assert.ok(broken.failures > 0);
  assert.match(broken.results.find((item) => item.name === ".project/skills/modes.json").detail, /^invalid:/, "a malformed mode file would make every skill's command fail — the doctor must say so first");
  fs.rmSync(modes);

  addSkill("disable", id);
  assert.equal(state().status, "warn");
  assert.match(state().detail, /installed but disabled/);
  addSkill("enable", id);

  addSkill("remove", id);
  assert.equal(state().status, "info");
  assert.match(state().detail, /not installed, so it is inert/, "carrying the instruction must never be mistaken for being active");

  const repo = path.join(directory, "upstream");
  fs.mkdirSync(path.join(repo, "skills/caveman"), { recursive: true });
  fs.writeFileSync(path.join(repo, "skills/caveman/SKILL.md"), "---\nname: caveman\ndescription: Fixture caveman\n---\nBody.\n");
  const git = (...args) => spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", repo, ...args], { encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "f", GIT_AUTHOR_EMAIL: "f@x.test", GIT_COMMITTER_NAME: "f", GIT_COMMITTER_EMAIL: "f@x.test" } });
  git("init", "-b", "main"); git("add", "."); git("commit", "-m", "fixture");
  const install = installer("install", id, "--root", root, "--repo", repo, "--scope", "project", "--phases", "build", "--apply");
  assert.equal(install.status, 0, install.stderr);
  assert.equal(state().status, "warn");
  assert.match(state().detail, /does not list recommended phase\(s\): shape, critique, plan, audit, ship, cooldown, manual/, "an install that under-covers the workflow must be called out, since its wrapper tells agents not to activate elsewhere");

  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  fs.writeFileSync(path.join(root, "AGENTS.md"), agents.replace(/## Response style \(caveman mode\)[\s\S]*?(?=\n## )/, ""));
  const missing = doctor();
  assert.equal(missing.results.find((item) => item.name === "AGENTS.md" && item.detail === "carries the caveman response-style section").status, "fail");
  const validator = JSON.parse(node("setup-validator.js", "--json").stdout);
  assert.equal(validator.results.find((item) => item.name === "AGENTS.md" && /caveman/.test(item.detail)).status, "warn", "in a target project this is a warning, not a failure");
});

test("the token report shows the caveman mode column, and labels it Unavailable rather than inventing one", () => {
  const { recordEvent } = require("../hooks/scripts/token-consumption");
  const withMode = fs.mkdtempSync(path.join(os.tmpdir(), "token-mode-"));
  const without = fs.mkdtempSync(path.join(os.tmpdir(), "token-nomode-"));
  try {
    fs.mkdirSync(path.join(withMode, ".project/skills"), { recursive: true });
    fs.writeFileSync(path.join(withMode, ".project/skills/modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    fs.mkdirSync(path.join(without, ".project"), { recursive: true });
    const event = { vendor: "opencode", event: "message.completed", raw: { session_id: "s", message_id: "m", tokens: { input: 1, output: 1 } } };
    recordEvent(event, withMode); recordEvent(event, without);
    const read = (root, file) => fs.readFileSync(path.join(root, ".project/metrics", file), "utf8");
    assert.match(read(withMode, "token-consumption.md"), /\| Availability \| Caveman mode \|/);
    assert.match(read(withMode, "token-consumption.md"), /\| ultra \|\n/);
    assert.match(read(withMode, "token-consumption.html"), /<th>Caveman mode<\/th>[\s\S]*<td>ultra<\/td>/);
    assert.match(read(without, "token-consumption.md"), /\| Unavailable \|\n/, "no configured mode is reported as Unavailable, never guessed");
  } finally { fs.rmSync(withMode, { recursive: true, force: true }); fs.rmSync(without, { recursive: true, force: true }); }
});

test("report() exposes installed phases and the gap against the catalog's recommendation", (t) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const caveman = report(root).defaults.find((entry) => entry.id.endsWith("/caveman"));
  assert.deepEqual([caveman.phases, caveman.phaseGap], [null, []], "not installed: no phases, no gap to report");
  assert.deepEqual(CATALOG.defaults.find((entry) => entry.id.endsWith("/caveman")).recommendedPhases, [...PHASES].filter((p) => !["utility", "agent"].includes(p)).concat("manual"), "recommendation = the seven workflow phases plus manual");
});
