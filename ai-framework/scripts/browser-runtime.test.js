const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const test = require("node:test");

const { ENTRY_ID, report } = require("./browser-runtime");
const { run } = require("./add-skill");

function write(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function git(root, ...args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" },
  }).trim();
}
function commit(root) { git(root, "add", "."); git(root, "commit", "-m", "Fixture change"); }

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "browser-runtime-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  const repo = path.join(directory, "repo");
  fs.mkdirSync(root);
  fs.mkdirSync(repo);
  for (const item of [".claude", ".opencode", ".codex", ".cursor", ".project"]) fs.mkdirSync(path.join(root, item));
  return { directory, root, repo };
}

// Builds a real, registry-valid installed entry for the exact catalog id under test, by
// exercising add-skill.js's own install path against a local offline fixture repo (the same
// pattern add-skill.test.js uses) rather than hand-crafting a registry record and risking it
// drifting from what readRegistry() actually validates.
function install(t) {
  const { root, repo } = fixture(t);
  git(repo, "init", "-b", "main");
  write(repo, "skills/agent-browser/SKILL.md", "---\nname: agent-browser\ndescription: Browser automation CLI\n---\nDiscovery stub.\n");
  commit(repo);
  run({ root, repo, skill: ENTRY_ID, scope: "project", phases: "build", apply: true });
  return root;
}

// Points PATH so `agent-browser` either resolves (a fake executable) or definitely does not
// (an empty directory), without depending on whether the real CLI happens to be on this host.
function withCli(t, present) {
  const original = process.env.PATH;
  t.after(() => { process.env.PATH = original; });
  if (present) {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), "browser-runtime-bin-"));
    t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
    const script = path.join(bin, "agent-browser");
    fs.writeFileSync(script, "#!/bin/sh\necho fake-agent-browser 1.0.0\n");
    fs.chmodSync(script, 0o755);
    process.env.PATH = `${bin}${path.delimiter}${original}`;
  } else {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "browser-runtime-empty-"));
    t.after(() => fs.rmSync(empty, { recursive: true, force: true }));
    process.env.PATH = empty;
  }
}

test("CLI absent is reported as an explicit status, never thrown, regardless of install state", (t) => {
  const { root } = fixture(t);
  withCli(t, false);
  const result = report(root);
  assert.equal(result.cli, "unavailable");
  assert.equal(result.status, "unsupported");
  assert.equal(result.installed, false);
});

test("CLI present is reported as available without throwing", (t) => {
  const { root } = fixture(t);
  withCli(t, true);
  const result = report(root);
  assert.equal(result.cli, "available");
});

test("not-installed, installed+enabled, and installed+disabled are distinguished", (t) => {
  withCli(t, true);
  const bareRoot = fixture(t).root;
  const notInstalled = report(bareRoot);
  assert.equal(notInstalled.installed, false);
  assert.equal(notInstalled.enabled, null);
  assert.equal(notInstalled.status, "not-installed");

  const installedRoot = install(t);
  const enabledResult = report(installedRoot);
  assert.equal(enabledResult.installed, true);
  assert.equal(enabledResult.enabled, true);
  assert.equal(enabledResult.status, "ready");

  run({ root: installedRoot, skill: ENTRY_ID, scope: "project", action: "disable", apply: true });
  const disabledResult = report(installedRoot);
  assert.equal(disabledResult.installed, true);
  assert.equal(disabledResult.enabled, false);
  assert.equal(disabledResult.status, "installed-disabled");
});

test("an invalid or missing registry does not crash the report", (t) => {
  withCli(t, true);
  const { root } = fixture(t);
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  const result = report(root);
  assert.match(result.registryError, /schema/i);
  assert.equal(result.installed, false);
  assert.equal(result.status, "not-installed");

  const { root: missingRoot } = fixture(t);
  const missing = report(missingRoot);
  assert.equal(missing.registryError, null);
  assert.equal(missing.installed, false);
});

test("report never claims the catalog entry other than agent-browser, and carries its purpose", (t) => {
  withCli(t, true);
  const { root } = fixture(t);
  const result = report(root);
  assert.equal(result.id, ENTRY_ID);
  assert.equal(typeof result.purpose, "string");
  assert.ok(result.purpose.length > 0);
});

test("CLI end to end, including --json and plain text", (t) => {
  withCli(t, false);
  const { root } = fixture(t);
  const script = path.join(__dirname, "browser-runtime.js");
  const jsonRun = spawnSync(process.execPath, [script, "report", "--root", root, "--json"], { encoding: "utf8", env: process.env });
  assert.equal(jsonRun.status, 0);
  const parsed = JSON.parse(jsonRun.stdout);
  assert.equal(parsed.id, ENTRY_ID);
  assert.equal(parsed.cli, "unavailable");
  assert.equal(parsed.status, "unsupported");

  const plainRun = spawnSync(process.execPath, [script, "report", "--root", root], { encoding: "utf8", env: process.env });
  assert.equal(plainRun.status, 0);
  assert.match(plainRun.stdout, /vercel-labs\/agent-browser\/agent-browser: unsupported/);

  const bad = spawnSync(process.execPath, [script, "bogus"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Usage:/);

  const badOption = spawnSync(process.execPath, [script, "report", "--nope"], { encoding: "utf8" });
  assert.equal(badOption.status, 1);
  assert.match(badOption.stderr, /Unknown option/);
});
