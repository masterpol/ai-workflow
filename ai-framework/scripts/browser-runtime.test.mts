import { NODE_FLAGS } from "./runtime/entry.mts";
const RUNTIME_FLAGS = process.versions.bun ? [] : NODE_FLAGS;
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

import * as addSkill from "./add-skill.mts";
import { ENTRY_ID, cliStatus, main, overallStatus, report } from "./browser-runtime.mts";
import type { RunResult, RuntimeDeps, SpawnOptions } from "./runtime/types.mts";

const here = dirname(fileURLToPath(import.meta.url));
const { run } = addSkill as { run(options: Record<string, unknown>): unknown };

function write(root: string, name: string, value: string): void {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, value);
}

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", root, ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_AUTHOR_NAME: "Fixture", GIT_AUTHOR_EMAIL: "fixture@example.test", GIT_COMMITTER_NAME: "Fixture", GIT_COMMITTER_EMAIL: "fixture@example.test" },
  }).trim();
}
function commit(root: string): void { git(root, "add", "."); git(root, "commit", "-m", "Fixture change"); }

function fixture(t: TestContext): { directory: string; root: string; repo: string } {
  const directory = mkdtempSync(join(tmpdir(), "browser-runtime-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = join(directory, "project");
  const repo = join(directory, "repo");
  mkdirSync(root);
  mkdirSync(repo);
  for (const item of [".claude", ".opencode", ".codex", ".cursor", ".project"]) mkdirSync(join(root, item));
  return { directory, root, repo };
}

// Builds a real, registry-valid installed entry for the exact catalog id under test, by
// exercising add-skill.mts's own install path against a local offline fixture repo (the same
// pattern add-skill.test.mts uses) rather than hand-crafting a registry record and risking it
// drifting from what readRegistry() actually validates.
function install(t: TestContext): string {
  const { root, repo } = fixture(t);
  git(repo, "init", "-b", "main");
  write(repo, "skills/agent-browser/SKILL.md", "---\nname: agent-browser\ndescription: Browser automation CLI\n---\nDiscovery stub.\n");
  commit(repo);
  run({ root, repo, skill: ENTRY_ID, scope: "project", phases: "build", apply: true });
  return root;
}

// Points PATH so `agent-browser` either resolves (a fake executable) or definitely does not
// (an empty directory), without depending on whether the real CLI happens to be on this host.
function withCli(t: TestContext, present: boolean): void {
  const original = process.env.PATH;
  t.after(() => { process.env.PATH = original; });
  if (present) {
    const bin = mkdtempSync(join(tmpdir(), "browser-runtime-bin-"));
    t.after(() => rmSync(bin, { recursive: true, force: true }));
    const script = join(bin, "agent-browser");
    writeFileSync(script, "#!/bin/sh\necho fake-agent-browser 1.0.0\n");
    chmodSync(script, 0o755);
    process.env.PATH = `${bin}${delimiter}${original}`;
  } else {
    const empty = mkdtempSync(join(tmpdir(), "browser-runtime-empty-"));
    t.after(() => rmSync(empty, { recursive: true, force: true }));
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
  assert.match(result.registryError ?? "", /schema/i);
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
  assert.ok((result.purpose ?? "").length > 0);
});

test("CLI end to end, including --json and plain text", (t) => {
  withCli(t, false);
  const { root } = fixture(t);
  const script = join(here, "browser-runtime.mts");
  const jsonRun = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "report", "--root", root, "--json"], { encoding: "utf8", env: process.env });
  assert.equal(jsonRun.status, 0);
  const parsed = JSON.parse(jsonRun.stdout);
  assert.equal(parsed.id, ENTRY_ID);
  assert.equal(parsed.cli, "unavailable");
  assert.equal(parsed.status, "unsupported");

  const plainRun = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "report", "--root", root], { encoding: "utf8", env: process.env });
  assert.equal(plainRun.status, 0);
  assert.match(plainRun.stdout, /vercel-labs\/agent-browser\/agent-browser: unsupported/);

  const bad = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "bogus"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Usage:/);

  const badOption = spawnSync(process.execPath, [...RUNTIME_FLAGS, script, "report", "--nope"], { encoding: "utf8" });
  assert.equal(badOption.status, 1);
  assert.match(badOption.stderr, /Unknown option/);
});

// ---- main() and cliStatus() with an in-memory fake RuntimeDeps -------------------------------------

interface Fake { deps: RuntimeDeps; out: string[]; err: string[]; spawned: Array<{ command: string; args: string[]; options?: SpawnOptions }> }

/** Only what browser-runtime touches is real; everything else throws if used. */
function fake(root: string, child: (command: string, args: string[]) => RunResult | Error): Fake {
  const out: string[] = [];
  const err: string[] = [];
  const spawned: Fake["spawned"] = [];
  const deps = {
    runtime: "node",
    fs: { realpathSync: (file: string) => file },
    child: {
      runSync(command: string, args: string[], options?: SpawnOptions): RunResult {
        spawned.push({ command, args, options });
        const result = child(command, args);
        if (result instanceof Error) throw result;
        return result;
      },
    },
    io: { stdout: { write: (text: string) => { out.push(text); } }, stderr: { write: (text: string) => { err.push(text); } } },
    proc: { cwd: () => root },
  } as unknown as RuntimeDeps;
  return { deps, out, err, spawned };
}
const ok: RunResult = { status: 0, signal: null, stdout: "", stderr: "" };
const failed: RunResult = { status: 1, signal: null, stdout: "", stderr: "" };

test("cliStatus probes `agent-browser --version` with a 5s timeout and no stdio", () => {
  const f = fake("/unused", () => ok);
  assert.equal(cliStatus(f.deps), "available");
  assert.deepEqual(f.spawned, [{ command: "agent-browser", args: ["--version"], options: { stdio: "ignore", timeoutMs: 5000 } }]);
});

test("cliStatus is unavailable for a non-zero exit, a kill, and a spawn that throws", () => {
  assert.equal(cliStatus(fake("/unused", () => failed).deps), "unavailable");
  assert.equal(cliStatus(fake("/unused", () => ({ status: null, signal: "SIGKILL", stdout: "", stderr: "" })).deps), "unavailable");
  assert.equal(cliStatus(fake("/unused", () => new Error("ENOENT")).deps), "unavailable");
});

test("overallStatus: a missing CLI wins over install state; then not-installed, installed-disabled, ready", () => {
  assert.equal(overallStatus({ installed: true, enabled: true, cli: "unavailable" }), "unsupported");
  assert.equal(overallStatus({ installed: false, enabled: null, cli: "available" }), "not-installed");
  assert.equal(overallStatus({ installed: true, enabled: false, cli: "available" }), "installed-disabled");
  assert.equal(overallStatus({ installed: true, enabled: true, cli: "available" }), "ready");
});

test("main report prints the plain line and exits 0 (CLI present, nothing installed)", (t) => {
  const { root } = fixture(t);
  const f = fake(root, () => ok);
  assert.equal(main(["report", "--root", root], f.deps), 0);
  assert.equal(f.out.join(""), `${ENTRY_ID}: not-installed (installed=false, enabled=n/a, cli=available)\n`);
  assert.deepEqual(f.err, []);
});

test("main report --json prints the report, defaulting --root to the injected cwd", (t) => {
  const { root } = fixture(t);
  const f = fake(root, () => failed);
  assert.equal(main(["report", "--json"], f.deps), 0);
  const parsed = JSON.parse(f.out.join(""));
  assert.equal(parsed.id, ENTRY_ID);
  assert.equal(parsed.cli, "unavailable");
  assert.equal(parsed.status, "unsupported");
  assert.equal(parsed.registryError, null);
});

test("main appends the registry error line for an invalid registry", (t) => {
  const { root } = fixture(t);
  write(root, ".project/skills/registry.json", JSON.stringify({ schemaVersion: 9, skills: {} }));
  const f = fake(root, () => ok);
  assert.equal(main(["report", "--root", root], f.deps), 0);
  assert.match(f.out.join(""), /\nregistry: .*schema/i);
});

test("main exits 1 with a prefixed stderr line for usage and unknown-option errors", () => {
  const usage = fake("/unused", () => ok);
  assert.equal(main(["bogus"], usage.deps), 1);
  assert.deepEqual(usage.out, []);
  assert.equal(usage.err.join(""), "browser-runtime: Usage: node ai-framework/scripts/browser-runtime.mts report [--root /absolute/project] [--json]\n");
  const option = fake("/unused", () => ok);
  assert.equal(main(["report", "--nope"], option.deps), 1);
  assert.equal(option.err.join(""), "browser-runtime: Unknown option: --nope\n");
  const dangling = fake("/unused", () => ok);
  assert.equal(main(["report", "--root"], dangling.deps), 1);
  assert.equal(dangling.err.join(""), "browser-runtime: Unknown option: --root\n");
});
