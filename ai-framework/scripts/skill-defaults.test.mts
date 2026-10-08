import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

import type { RuntimeDeps } from "./runtime/types.mts";
import { createNodeDeps } from "./runtime/node.mts";
import { CATALOG, MODES, PHASES, main, resolveMode, report, loadModes, extractInvocationArg } from "./skill-defaults.mts";
import type { CatalogEntry } from "./skill-defaults.mts";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
interface Check { name: string; status: string; detail: string }
interface Checks { failures: number; results: Check[] }
const parseChecks = (stdout: string): Checks => JSON.parse(stdout) as Checks;
const BUNDLE = path.resolve(here, "../..");
const { externalSkillReport } = require("./skill-vendors.mts") as { externalSkillReport(root: string): { managed: Set<string> } };

function write(root: string, name: string, value: string): void {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-defaults-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("the catalog's caveman mode list matches the hardcoded MODES set exactly", () => {
  const caveman = CATALOG.defaults.find((entry: CatalogEntry) => entry.id.endsWith("/caveman"))!;
  assert.deepEqual(new Set(caveman.modes), MODES);
  assert.equal(caveman.defaultMode, "full");
  assert.ok(MODES.has(caveman.defaultMode!));
});

test("a caveman=<mode> token embedded in real free-form invocation text is extracted correctly", () => {
  assert.equal(extractInvocationArg("caveman=lite do the build scope"), "lite");
  assert.equal(extractInvocationArg("fix the login bug, also caveman=ultra please"), "ultra");
  assert.equal(extractInvocationArg("CAVEMAN=Off"), "off", "case-insensitive on both the key and the value");
  assert.equal(extractInvocationArg("portable-skill-defaults D1 (plan approved)"), undefined, "no caveman= mention at all is not an error, just absent");
  assert.equal(extractInvocationArg(""), undefined);
  assert.equal(extractInvocationArg(undefined), undefined);
  assert.equal(extractInvocationArg(42 as unknown), undefined, "non-string input never throws");
});

test("resolveMode's --args-text path matches the exact scenario that broke the original --arg $ARGUMENT design", (t: TestContext) => {
  const root = fixture(t);
  // Before the fix, passing the raw, unparsed invocation text directly as an exact mode value
  // failed validation the moment it carried anything beyond the bare mode word.
  assert.equal(resolveMode(root, { phase: "build", argumentsText: "caveman=lite do the build scope" }), "lite");
  assert.equal(resolveMode(root, { phase: "build", argumentsText: "portable-skill-defaults D1 (plan approved)" }), "full", "falls through to bundle default when nothing mentions caveman");
  assert.throws(() => resolveMode(root, { phase: "build", argumentsText: "caveman=turbo" }), /Choose --arg explicitly/, "a real typo after caveman= is still rejected loudly, not silently ignored");
  assert.equal(resolveMode(root, { phase: "build", invocationArg: "ultra", argumentsText: "caveman=lite ignored because invocationArg wins" }), "ultra", "an explicit invocationArg always takes precedence over argumentsText extraction");
});

test("every mode plus off resolves, and an unknown mode is rejected", (t: TestContext) => {
  const root = fixture(t);
  for (const mode of [...MODES, "off"]) assert.equal(resolveMode(root, { phase: "build", invocationArg: mode }), mode);
  assert.throws(() => resolveMode(root, { phase: "build", invocationArg: "extreme" }), /Choose --arg explicitly/);
  assert.throws(() => resolveMode(root, { phase: "not-a-phase" }), /Unknown phase/);
});

test("missing modes.json falls back cleanly to the bundle default", (t: TestContext) => {
  const root = fixture(t);
  assert.equal(loadModes(root), null);
  assert.equal(resolveMode(root, { phase: "build" }), "full");
});

test("precedence: invocation arg > phase override > instance default > bundle default", (t: TestContext) => {
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

test("a persistent disable resolves to off, but an explicit invocation arg for that one call still wins", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { enabled: false, default: "full" } }));
  assert.equal(resolveMode(root, { phase: "build" }), "off");
  assert.equal(resolveMode(root, { phase: "audit" }), "off");
  assert.equal(resolveMode(root, { phase: "build", invocationArg: "lite" }), "lite", "explicit ask for this one call overrides a persistent disable");
});

test("a malformed modes.json is rejected, not silently ignored", (t: TestContext) => {
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

test("a symlinked modes.json is refused, whether the leaf or an ancestor directory is the symlink", (t: TestContext) => {
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

test("report distinguishes not-installed, installed+enabled, and installed+disabled without throwing", (t: TestContext) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const before = report(root);
  assert.equal(before.registryError, null);
  assert.equal(before.defaults.length, CATALOG.defaults.length);
  assert.ok(before.defaults.every((entry: CatalogEntry) => entry.installed === false && entry.enabled === null));
  const compress = before.defaults.find((entry: CatalogEntry) => entry.id.endsWith("/caveman-compress"))!;
  const browser = before.defaults.find((entry: CatalogEntry) => entry.id.endsWith("/agent-browser"))!;
  assert.ok(["available", "unavailable"].includes(compress.runtime));
  assert.ok(["available", "unavailable"].includes(browser.runtime));
  const stats = before.defaults.find((entry: CatalogEntry) => entry.id.endsWith("/caveman-stats"))!;
  assert.equal(stats.runtime, null, "no runtime check declared for caveman-stats");
});

test("report surfaces an invalid registry without throwing and without claiming a default is installed", (t: TestContext) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  const result = report(root);
  assert.match(result.registryError!, /schema/i);
  assert.ok(result.defaults.every((entry: CatalogEntry) => entry.installed === false));
});

test("CLI resolve-mode and report work end to end, including --json", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "lite" } }));
  const script = path.join(here, "skill-defaults.mts");
  const text = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root], { encoding: "utf8" });
  assert.equal(text.status, 0);
  assert.equal(text.stdout.trim(), "lite");
  const json = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root, "--json"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(json.stdout) as unknown, { phase: "build", mode: "lite" });
  const reportText = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "report", "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(reportText.status, 0);
  assert.equal((JSON.parse(reportText.stdout) as { defaults: unknown[] }).defaults.length, CATALOG.defaults.length);
  const reportPlain = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "report", "--root", root], { encoding: "utf8" });
  assert.equal(reportPlain.status, 0);
  assert.match(reportPlain.stdout, /juliusbrussee\/caveman\/caveman: not installed/);
  const bad = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root, "--arg", "nonsense"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Choose --arg explicitly/);
  const unknown = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "bogus"], { encoding: "utf8" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Usage:/);
});

test("CLI --args-text resolves a real free-form phase invocation the way every canonical phase file actually calls it", (t: TestContext) => {
  const root = fixture(t);
  const script = path.join(here, "skill-defaults.mts");
  const embedded = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root, "--args-text", "caveman=lite do the build scope"], { encoding: "utf8" });
  assert.equal(embedded.status, 0);
  assert.equal(embedded.stdout.trim(), "lite");
  const none = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root, "--args-text", "portable-skill-defaults D1 (plan approved)"], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.equal(none.stdout.trim(), "full");
  const both = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", "build", "--root", root, "--arg", "lite", "--args-text", "caveman=ultra"], { encoding: "utf8" });
  assert.equal(both.status, 1);
  assert.match(both.stderr, /not both/);
});

test("every canonical phase name from the pitch is accepted", () => {
  assert.deepEqual([...PHASES].sort(), ["agent", "audit", "build", "cooldown", "critique", "plan", "shape", "ship", "utility"]);
});

test("workflow-doctor exits 0 on a real bundle copy, and fails loudly on a malformed skill-defaults.json", (t: TestContext) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "skill-defaults-doctor-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const skip = new Set([".git", "node_modules", "metrics", ".DS_Store", ".env"]);
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source: string) => !skip.has(path.basename(source)) });
  // Keep .project/skills (registry + packages) together with the wrapper files it owns: excluding
  // it would leave an installed skill's wrappers orphaned, which the doctor rightly rejects — a
  // failure that only appears once a skill is actually installed in the repo running this test.
  // Pin the runner: a developer's project .env may select bun, which this PATH does not contain.
  const env = { ...process.env, PATH: path.dirname(process.execPath), NO_COLOR: "1", AI_WORKFLOW_RUNNER: "node" };
  const doctorScript = path.join(root, "ai-framework/scripts/workflow-doctor.mts");

  const clean = spawnSync(process.execPath, [...RUNTIME_FLAGS, doctorScript, "--json"], { cwd: root, encoding: "utf8", env });
  const cleanReport = parseChecks(clean.stdout);
  assert.equal(clean.status, 0);
  assert.deepEqual(cleanReport.results.filter((item: Check) => item.status === "fail"), []);
  const cleanCheck = cleanReport.results.find((item: Check) => item.name === "ai-framework/integrations/skill-defaults.json" && item.detail !== "present")!;
  assert.equal(cleanCheck.status, "pass");
  assert.match(cleanCheck.detail, /default skill\(s\) declared/);

  write(root, "ai-framework/integrations/skill-defaults.json", JSON.stringify({ schemaVersion: 2, defaults: [] }));
  const corrupted = spawnSync(process.execPath, [...RUNTIME_FLAGS, doctorScript, "--json"], { cwd: root, encoding: "utf8", env });
  const corruptedReport = parseChecks(corrupted.stdout);
  assert.equal(corrupted.status, 1);
  assert.ok(corruptedReport.failures > 0);
  const corruptedCheck = corruptedReport.results.find((item: Check) => item.name === "ai-framework/integrations/skill-defaults.json" && item.detail !== "present")!;
  assert.equal(corruptedCheck.status, "fail");
  assert.match(corruptedCheck.detail, /malformed catalog/);
});

// Every canonical skill and agent must carry the caveman instruction, and the instruction must
// actually work when followed: the --phase it names has to be one resolve-mode accepts (the
// same "instruction looked right but the command it names would fail" class of bug found after
// D1 shipped), and the paragraph's command must run as written.
interface Canonical { kind: "skill" | "agent"; name: string; file: string }
function canonicalFiles(): Canonical[] {
  const managed = externalSkillReport(BUNDLE).managed; // registry-installed upstream skills carry no workflow paragraph
  const skills = fs.readdirSync(path.join(BUNDLE, ".claude/skills")).filter((name: string) => !managed.has(name)).map((name): Canonical => ({ kind: "skill", name, file: `.claude/skills/${name}/SKILL.md` }));
  const agents = fs.readdirSync(path.join(BUNDLE, ".claude/agents")).filter((name) => name.endsWith(".md")).map((name): Canonical => ({ kind: "agent", name: name.replace(/\.md$/, ""), file: `.claude/agents/${name}` }));
  return [...skills, ...agents];
}

test("every canonical skill and agent carries exactly one caveman instruction naming a phase resolve-mode accepts", () => {
  const files = canonicalFiles();
  assert.ok(files.length >= 42, `expected the full bundle (26 skills + 16 agents), found ${files.length}`);
  const phaseSkills = new Set(["shape", "critique", "plan", "build", "audit", "ship", "cooldown"]);
  for (const { kind, name, file } of files) {
    const text = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    assert.equal((text.match(/\*\*Caveman mode:\*\*/g) || []).length, 1, `${file} must carry exactly one caveman instruction`);
    const phase = text.match(/resolve-mode --phase ([a-z]+)/)![1];
    assert.ok(PHASES.has(phase), `${file} names --phase ${phase}, which resolve-mode would reject`);
    const expected = kind === "agent" ? "agent" : phaseSkills.has(name) ? name : "utility";
    assert.equal(phase, expected, `${file} should resolve as ${expected}`);
  }
});

test("the exact command each skill and agent instruction names runs successfully as written", (t: TestContext) => {
  const root = fixture(t);
  write(root, ".project/skills/modes.json", JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra", phases: { agent: "lite", utility: "wenyan-lite" } } }));
  const expectedByScope: Record<string, string> = { agent: "lite", utility: "wenyan-lite", build: "ultra" };
  const script = path.join(here, "skill-defaults.mts");
  for (const { file } of canonicalFiles()) {
    const text = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    const phase = text.match(/resolve-mode --phase ([a-z]+)/)![1];
    const plain = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", phase, "--args-text", "please review this", "--root", root], { encoding: "utf8" });
    assert.equal(plain.status, 0, `${file}: ${plain.stderr}`);
    assert.equal(plain.stdout.trim(), expectedByScope[phase] || "ultra", `${file} (${phase}) must resolve through the instance override/default chain`);
    const withArg = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "resolve-mode", "--phase", phase, "--args-text", "caveman=off do the thing", "--root", root], { encoding: "utf8" });
    assert.equal(withArg.stdout.trim(), "off", `${file}: an invocation-scoped caveman=off must win`);
  }
});

test("every vendor mirror of a skill or agent either points at the canonical file or is byte-identical to it", () => {
  const files = canonicalFiles();
  for (const { kind, name, file } of files) {
    const canonical = fs.readFileSync(path.join(BUNDLE, file), "utf8");
    // Cursor mirrors are generated byte copies (absent in a fresh source checkout — skip then).
    const cursor = path.join(BUNDLE, kind === "agent" ? `.cursor/agents/${name}.md` : `.cursor/skills/${name}/SKILL.md`);
    if (fs.existsSync(cursor)) assert.equal(fs.readFileSync(cursor, "utf8"), canonical, `${path.relative(BUNDLE, cursor)} is stale — run skill-vendors.mts cursor-mirrors and refresh it`);
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
  const section = (file: string) => fs.readFileSync(path.join(BUNDLE, file), "utf8").match(/## Response style \(caveman mode\)\n[\s\S]*?(?=\n## )/)?.[0];
  const agents = section("AGENTS.md");
  assert.ok(agents, "AGENTS.md needs the Response style section");
  assert.equal(section("CLAUDE.md"), agents, "CLAUDE.md is a required full mirror of AGENTS.md — the section must be identical");
  const phase = agents!.match(/resolve-mode --phase ([a-z]+)/)![1];
  assert.ok(PHASES.has(phase), `entry files name --phase ${phase}, which resolve-mode would reject`);
  assert.match(agents!, /caveman=<lite\|full\|ultra\|wenyan-lite\|wenyan-full\|wenyan-ultra\|off>/);
});

test("doctor and setup-validator report the live caveman state truthfully across every state it can be in", (t: TestContext) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "caveman-state-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  fs.cpSync(BUNDLE, root, { recursive: true, filter: (source: string) => !new Set([".git", "node_modules", "metrics", ".DS_Store", ".env"]).has(path.basename(source)) });
  // Pin the runner: a developer's project .env may select bun, which this PATH does not contain.
  const env = { ...process.env, PATH: path.dirname(process.execPath), NO_COLOR: "1", AI_WORKFLOW_RUNNER: "node" };
  const node = (script: string, ...args: string[]) => spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(root, "ai-framework/scripts", script), ...args], { cwd: root, encoding: "utf8", env });
  const doctor = (): Checks => parseChecks(node("workflow-doctor.mts", "--json").stdout);
  const state = (): Check | undefined => doctor().results.find((item: Check) => item.name === "Caveman mode");
  // add-skill shells out to git, so it keeps the full PATH; only the doctor needs it restricted.
  const installer = (...args: string[]) => spawnSync(process.execPath, [...RUNTIME_FLAGS, path.join(root, "ai-framework/scripts/add-skill.mts"), ...args], { cwd: root, encoding: "utf8" });
  const addSkill = (...args: string[]) => { const result = installer(...args, "--root", root, "--scope", "project", "--apply"); assert.equal(result.status, 0, result.stderr); };
  const id = "juliusbrussee/caveman/caveman";

  assert.match(state()!.detail, /^active: installed, enabled, covers all recommended phases; default full/);
  assert.equal(state()!.status, "pass");

  const modes = path.join(root, ".project/skills/modes.json");
  fs.writeFileSync(modes, JSON.stringify({ schemaVersion: 1, caveman: { enabled: false } }));
  assert.equal(state()!.status, "info");
  assert.match(state()!.detail, /persistently disabled/);

  fs.writeFileSync(modes, "{ not json");
  const broken = doctor();
  assert.ok(broken.failures > 0);
  assert.match(broken.results.find((item: Check) => item.name === ".project/skills/modes.json")!.detail, /^invalid:/, "a malformed mode file would make every skill's command fail — the doctor must say so first");
  fs.rmSync(modes);

  addSkill("disable", id);
  assert.equal(state()!.status, "warn");
  assert.match(state()!.detail, /installed but disabled/);
  addSkill("enable", id);

  addSkill("remove", id);
  assert.equal(state()!.status, "info");
  assert.match(state()!.detail, /not installed, so it is inert/, "carrying the instruction must never be mistaken for being active");

  const repo = path.join(directory, "upstream");
  fs.mkdirSync(path.join(repo, "skills/caveman"), { recursive: true });
  fs.writeFileSync(path.join(repo, "skills/caveman/SKILL.md"), "---\nname: caveman\ndescription: Fixture caveman\n---\nBody.\n");
  const git = (...args: string[]) => spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", repo, ...args], { encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "f", GIT_AUTHOR_EMAIL: "f@x.test", GIT_COMMITTER_NAME: "f", GIT_COMMITTER_EMAIL: "f@x.test" } });
  git("init", "-b", "main"); git("add", "."); git("commit", "-m", "fixture");
  const install = installer("install", id, "--root", root, "--repo", repo, "--scope", "project", "--phases", "build", "--apply");
  assert.equal(install.status, 0, install.stderr);
  assert.equal(state()!.status, "warn");
  assert.match(state()!.detail, /does not list recommended phase\(s\): shape, critique, plan, audit, ship, cooldown, manual/, "an install that under-covers the workflow must be called out, since its wrapper tells agents not to activate elsewhere");

  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  fs.writeFileSync(path.join(root, "AGENTS.md"), agents.replace(/## Response style \(caveman mode\)[\s\S]*?(?=\n## )/, ""));
  const missing = doctor();
  assert.equal(missing.results.find((item: Check) => item.name === "AGENTS.md" && item.detail === "carries the caveman response-style section")!.status, "fail");
  const validator = parseChecks(node("setup-validator.mts", "--json").stdout);
  assert.equal(validator.results.find((item: Check) => item.name === "AGENTS.md" && /caveman/.test(item.detail))!.status, "warn", "in a target project this is a warning, not a failure");
});

test("the token report shows the caveman mode column, and labels it Unavailable rather than inventing one", async () => {
  const { recordEvent } = require("../hooks/scripts/token-consumption.mts") as { recordEvent(event: unknown, root: string): Promise<void> };
  const withMode = fs.mkdtempSync(path.join(os.tmpdir(), "token-mode-"));
  const without = fs.mkdtempSync(path.join(os.tmpdir(), "token-nomode-"));
  try {
    fs.mkdirSync(path.join(withMode, ".project/skills"), { recursive: true });
    fs.writeFileSync(path.join(withMode, ".project/skills/modes.json"), JSON.stringify({ schemaVersion: 1, caveman: { default: "ultra" } }));
    fs.mkdirSync(path.join(without, ".project"), { recursive: true });
    const event = { vendor: "opencode", event: "message.completed", raw: { session_id: "s", message_id: "m", tokens: { input: 1, output: 1 } } };
    await recordEvent(event, withMode); await recordEvent(event, without);
    const read = (root: string, file: string) => fs.readFileSync(path.join(root, ".project/metrics", file), "utf8");
    assert.match(read(withMode, "token-consumption.md"), /\| Availability \| Caveman mode \|/);
    assert.match(read(withMode, "token-consumption.md"), /\| ultra \|\n/);
    assert.match(read(withMode, "token-consumption.html"), /<th>Caveman mode<\/th>[\s\S]*<td>ultra<\/td>/);
    assert.match(read(without, "token-consumption.md"), /\| Unavailable \|\n/, "no configured mode is reported as Unavailable, never guessed");
  } finally { fs.rmSync(withMode, { recursive: true, force: true }); fs.rmSync(without, { recursive: true, force: true }); }
});

test("report() exposes installed phases and the gap against the catalog's recommendation", (t: TestContext) => {
  const root = fixture(t);
  for (const dir of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const caveman = report(root).defaults.find((entry: CatalogEntry) => entry.id.endsWith("/caveman"))!;
  assert.deepEqual([caveman.phases, caveman.phaseGap], [null, []], "not installed: no phases, no gap to report");
  assert.deepEqual(CATALOG.defaults.find((entry: CatalogEntry) => entry.id.endsWith("/caveman"))!.recommendedPhases, [...PHASES].filter((p: string) => !["utility", "agent"].includes(p)).concat("manual"), "recommendation = the seven workflow phases plus manual");
});

// --- main(argv, deps) with fake in-memory deps: no real fs, no real process ---

interface Fake { deps: RuntimeDeps; out: string[]; err: string[]; spawned: string[][] }
function fake(files: Record<string, string>, options: { cwd?: string; status?: number } = {}): Fake {
  const cwd = options.cwd ?? "/proj";
  const out: string[] = [];
  const err: string[] = [];
  const spawned: string[][] = [];
  const base = createNodeDeps({});
  const deps: RuntimeDeps = {
    ...base,
    fs: {
      ...base.fs,
      existsSync: (file) => Object.hasOwn(files, file),
      readFileSync: (file) => { if (!Object.hasOwn(files, file)) throw new Error(`ENOENT: ${file}`); return files[file]; },
      realpathSync: (file) => file,
    },
    child: {
      runSync: (command, args) => { spawned.push([command, ...args]); return { status: options.status ?? 0, signal: null, stdout: "", stderr: "" }; },
      run: () => Promise.reject(new Error("unexpected async spawn")),
    },
    io: { stdout: { write: (text) => { out.push(text); } }, stderr: { write: (text) => { err.push(text); } } },
    proc: { argv: [], env: {}, execPath: "/bin/node", cwd: () => cwd },
  };
  return { deps, out, err, spawned };
}

test("main(): resolve-mode writes the mode plus newline to stdout and returns 0, using only injected deps", () => {
  const f = fake({ "/proj/.project/skills/modes.json": JSON.stringify({ schemaVersion: 1, caveman: { phases: { build: "ultra" }, default: "lite" } }) });
  assert.equal(main(["resolve-mode", "--phase", "build"], f.deps), 0);
  assert.deepEqual(f.out, ["ultra\n"]);
  assert.deepEqual(f.err, []);
  const json = fake({});
  assert.equal(main(["resolve-mode", "--phase", "plan", "--args-text", "caveman=lite go", "--json"], json.deps), 0);
  assert.deepEqual(JSON.parse(json.out.join("")) as unknown, { phase: "plan", mode: "lite" });
});

test("main(): --root overrides proc.cwd, and no modes.json falls back to the bundle default", () => {
  const f = fake({ "/elsewhere/.project/skills/modes.json": JSON.stringify({ schemaVersion: 1, caveman: { enabled: false } }) }, { cwd: "/proj" });
  assert.equal(main(["resolve-mode", "--phase", "ship", "--root", "/elsewhere"], f.deps), 0);
  assert.deepEqual(f.out, ["off\n"]);
  const g = fake({});
  assert.equal(main(["resolve-mode", "--phase", "ship"], g.deps), 0);
  assert.deepEqual(g.out, ["full\n"]);
});

test("main(): errors go to stderr as 'skill-defaults: <message>' with exit code 1 and nothing on stdout", () => {
  for (const [argv, pattern] of [
    [["resolve-mode", "--phase", "nope"], /^skill-defaults: Unknown phase: nope\n$/],
    [["resolve-mode", "--phase", "build", "--arg", "extreme"], /^skill-defaults: Choose --arg explicitly/],
    [["resolve-mode", "--phase", "build", "--arg", "lite", "--args-text", "x"], /^skill-defaults: Pass --arg .* not both\n$/],
    [["resolve-mode", "--bogus"], /^skill-defaults: Unknown option: --bogus\n$/],
    [["bogus"], /^skill-defaults: Usage:/],
  ] as Array<[string[], RegExp]>) {
    const f = fake({});
    assert.equal(main(argv, f.deps), 1, argv.join(" "));
    assert.deepEqual(f.out, []);
    assert.equal(f.err.length, 1);
    assert.match(f.err[0], pattern);
  }
  const bad = fake({ "/proj/.project/skills/modes.json": "{ not json" });
  assert.equal(main(["resolve-mode", "--phase", "build"], bad.deps), 1);
  assert.match(bad.err[0], /^skill-defaults: /);
});

test("main(): report runs runtime checks through deps.child and prints one line per default", () => {
  const f = fake({}, { status: 0 });
  assert.equal(main(["report", "--root", "/proj"], f.deps), 0);
  assert.deepEqual(f.err, []);
  const lines = f.out.join("").trimEnd().split("\n");
  assert.ok(lines.some((line) => /juliusbrussee\/caveman\/caveman: not installed/.test(line)));
  assert.ok(f.spawned.length > 0, "runtime checks went through the injected child deps");
  assert.ok(lines.some((line) => /runtime available$/.test(line)));
  const failing = fake({}, { status: 1 });
  assert.equal(main(["report", "--root", "/proj"], failing.deps), 0);
  assert.match(failing.out.join(""), /runtime unavailable/);
});

test("report() reads the registry through the injected deps, not default Node deps", () => {
  const seen: string[] = [];
  const real = createNodeDeps();
  const deps = { ...real, fs: { ...real.fs, readBytesSync: (file: string) => { seen.push(file); return real.fs.readBytesSync(file); }, lstatSync: (file: string) => { seen.push(file); return real.fs.lstatSync(file); } } };
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "defaults-deps-")));
  try {
    fs.mkdirSync(path.join(root, ".project/skills"), { recursive: true });
    fs.writeFileSync(path.join(root, ".project/skills/registry.json"), JSON.stringify({ schemaVersion: 1, skills: {} }));
    report(root, deps);
    assert.ok(seen.some((file) => file.endsWith("registry.json")), `registry was read without the injected fs: ${seen.join(",")}`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
