import type { SpawnSyncOptions } from "node:child_process";
// Simulates the real upgrade of an existing install: a project holding the pre-migration bundle runs its OWN
// (old) bundle-sync.js against this tree, with plain `node` and no flags, and must end healthy with the same
// command output as before after a second direct TypeScript sync. Skips when the historical ref is unavailable.
import assert from "node:assert/strict";
import { createTestDeps, urlPath, spawnSync as rawSpawnSync } from "./test-helpers.mts";
const testDeps = createTestDeps();
const { appendFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } = testDeps.fs;
const tmpdir = (): string => testDeps.os.tmpdir();
const { join } = testDeps.path;
import { test } from "node:test";
import { NODE_FLAGS } from "./entry.mts";
import { WORKFLOW_ENV_FILE } from "./env.mts";

function spawnSync(command: string, args: string[], options: SpawnSyncOptions = {}) {
  return rawSpawnSync(command, args, { ...options, shell: false, windowsHide: true, timeout: 120000, killSignal: "SIGKILL" });
}

/** Last commit before the TypeScript migration (the bundle existing installs hold). */
const PRE_MIGRATION_REF = "53bca03";
const repoRoot = urlPath(new URL("../../..", import.meta.url));
/** The tree the old install upgrades TO. Defaults to this checkout; override to test an isolated copy. */
const source = process.env.UPGRADE_SIM_SOURCE ?? repoRoot;
const nodeExecutable = String(spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout).trim();
const run = (command: string, args: string[], cwd: string, env: Record<string, string | undefined> = {}) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, AI_WORKFLOW_RUNNER: undefined, ...env }, maxBuffer: 64 * 1024 * 1024 });
  return { ...result, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
};

const hasRef = run("git", ["cat-file", "-e", `${PRE_MIGRATION_REF}^{commit}`], repoRoot).status === 0;
const hasBun = run("bun", ["--version"], source).status === 0;
const hasNoStripFlag = run(process.execPath, ["--no-experimental-strip-types", "-e", "0"], source).status === 0;
const skip = process.platform === "win32" ? "historical bundle has no verified Windows process lifecycle" : hasRef ? false : `git ref ${PRE_MIGRATION_REF} not available`;

const COMMANDS: Array<{ name: string; args: string[]; identical: boolean }> = [
  { name: "workflow-doctor", args: ["ai-framework/scripts/workflow-doctor.js", "--no-color"], identical: false },
  { name: "setup-validator", args: ["ai-framework/scripts/setup-validator.js", "--no-color"], identical: false },
  { name: "graphify", args: ["ai-framework/scripts/graphify.js", "--check", "--json"], identical: true },
  { name: "skill-defaults", args: ["ai-framework/scripts/skill-defaults.js", "resolve-mode", "--phase", "shape", "--args-text", "x"], identical: true },
  { name: "skill-sync", args: ["ai-framework/scripts/skill-sync.js", "reconcile", "--json"], identical: true },
];

function oldProject(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "upgrade-sim-")));
  const archive = spawnSync("git", ["archive", PRE_MIGRATION_REF], { cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 });
  assert.equal(archive.status, 0);
  const extract = spawnSync("tar", ["-x", "-C", dir], { input: archive.stdout });
  assert.equal(extract.status, 0);
  return dir;
}

const sortLines = (text: string): string => text.split("\n").sort().join("\n");

function snapshot(project: string, env: Record<string, string> = {}, migrated = false): Record<string, { status: number | null; stdout: string; stderr: string }> {
  const out: Record<string, { status: number | null; stdout: string; stderr: string }> = {};
  for (const command of COMMANDS) {
    const args = migrated ? [...NODE_FLAGS, command.args[0].replace(/\.js$/, ".mts"), ...command.args.slice(1)] : command.args;
    const result = run(nodeExecutable, args, project, env);
    out[command.name] = { status: result.status, stdout: sortLines(result.stdout), stderr: result.stderr };
  }
  return out;
}

/**
 * An old install never receives README.md (bundle-sync only flags it) and an old bundle-sync never copies a
 * directory it does not know, so a bundle that moves docs into ai-framework/docs makes the doctor fail on exactly
 * those paths. That belongs to the docs change, not to this migration: tolerate it, and nothing else.
 * The simulated install is the bundle repo itself (it has SETUP.md), so those README checks apply to it; a real
 * project's README is its own and the doctor skips them there.
 */
const DOCS_ONLY = /README\.md|ai-framework\/docs\//;
function docsOnlyDoctorFailures(after: ReturnType<typeof snapshot>): boolean {
  const failures = after["workflow-doctor"].stdout.split("\n").filter((line) => line.startsWith("FAIL "));
  return failures.length > 0 && failures.every((line) => DOCS_ONLY.test(line));
}

/** The delivered graphify adds an empty `files` list to --json (stdout is line-sorted here), so drop it and trailing commas. */
function comparable(text: string): string {
  return text.split("\n").filter((line) => line.trim() !== '"files": []' && line.trim() !== '"files": [],').map((line) => line.replace(/,$/, "")).join("\n");
}

function assertHealthy(label: string, before: ReturnType<typeof snapshot>, after: ReturnType<typeof snapshot>, skip: string[] = []): void {
  const tolerateDocs = docsOnlyDoctorFailures(after);
  for (const command of COMMANDS) {
    if (skip.includes(command.name)) continue;
    if (tolerateDocs && (command.name === "workflow-doctor" || command.name === "setup-validator")) {
      assert.equal(after[command.name].stderr, "", `${label}: ${command.name} wrote to stderr`);
      continue;
    }
    const was = before[command.name];
    const now = after[command.name];
    const detail = `${now.stdout.split("\n").filter((line) => /^FAIL /.test(line)).join("; ")} ${now.stderr.slice(0, 300)}`.trim();
    assert.equal(now.status, was.status, `${label}: ${command.name} exit status. ${detail}`);
    assert.equal(now.stderr, "", `${label}: ${command.name} wrote to stderr`);
    assert.doesNotMatch(now.stdout, /^FAIL /m, `${label}: ${command.name} reports a failure`);
    if (command.identical) assert.equal(comparable(now.stdout), comparable(was.stdout), `${label}: ${command.name} output changed`);
  }
}

/** The documented post-sync step: `ai-workflow.toon` is instance data the sync never writes, so the migrator builds it. */
const migrateConfig = (project: string) => {
  const result = run(nodeExecutable, [...NODE_FLAGS, "ai-framework/scripts/config-migrate.mts", "--apply", "--root", "."], project);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.ok(existsSync(join(project, "ai-workflow.toon")));
  // Project-owned ignore rules are not overwritten by bundle-sync; model the required post-sync merge.
  const ignoreFile = join(project, ".gitignore");
  const ignoreText = readFileSync(ignoreFile, "utf8");
  for (const rule of [".project/evals/runs/", ".project/evals/.cache/"]) {
    if (!ignoreText.split(/\r?\n/).includes(rule)) appendFileSync(ignoreFile, `\n${rule}\n`);
  }
};

const sync = (project: string, extra: string[], migrated = false) => {
  const entry = migrated ? [...NODE_FLAGS, "ai-framework/scripts/bundle-sync.mts"] : ["ai-framework/scripts/bundle-sync.js"];
  const result = run(nodeExecutable, [...entry, "--source", source, "--base-ref", PRE_MIGRATION_REF, "--json", ...extra], project);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).summary as Record<string, number | string | boolean | null>;
};

test("old install upgrades with its own bundle-sync (apply + prune) and every command still works", { skip, timeout: 240000 }, () => {
  const project = oldProject();
  try {
    const before = snapshot(project);
    assert.ok(Object.values(before).every((entry) => entry.status === 0 && entry.stderr === ""), "pre-migration project is healthy");

    const dry = sync(project, []);
    assert.ok(Number(dry.new) > 0 && dry.conflict === 0 && dry.unverified === 0, JSON.stringify(dry));

    const applied = sync(project, ["--apply", "--prune"]);
    assert.equal(applied.applied, true);
    assert.ok(applied.skillSync === null || applied.skillSync === "not-installed", "the old sync cannot reconcile after pruning its hardcoded skill-sync.js");
    assert.ok(existsSync(join(project, "ai-framework/scripts/runtime/entry.mts")), "runtime shipped by the old sync");
    assert.ok(existsSync(join(project, "ai-framework/scripts/graphify.mts")));
    assert.equal(existsSync(join(project, "ai-framework/scripts/skill-defaults.test.js")), false, "pruned, no orphan test");

    // First pass: the OLD sync only knows the old directory list, so a bundle that adds a synced directory (for
    // example ai-framework/docs) needs the second pass below. Every command this change touches must already work.
    assertHealthy("after the old sync", before, snapshot(project, {}, true), ["workflow-doctor", "setup-validator"]);

    // Second pass uses the delivered direct TypeScript sync with the original ref to remove old plugin files.
    const second = sync(project, ["--apply", "--prune"], true);
    assert.equal(second.skillSync, "clean", JSON.stringify(second));
    assert.equal(existsSync(join(project, ".opencode/plugins/token-consumption.js")), false);
    assert.equal(existsSync(join(project, ".opencode/plugins/token-consumption.ts")), true);
    assert.equal(second.conflict, 0, JSON.stringify(second));
    const codexHooks = JSON.parse(readFileSync(join(project, ".codex/hooks.json"), "utf8"));
    assert.ok(Array.isArray(codexHooks.hooks.UserPromptSubmit), "the sync registers the Codex startup hook an old install lacks");
    const claudeSettings = JSON.parse(readFileSync(join(project, ".claude/settings.json"), "utf8"));
    assert.ok(Array.isArray(claudeSettings.hooks.UserPromptExpansion) && Array.isArray(claudeSettings.hooks.PreToolUse), "the sync registers the Claude Orca start hooks");
    migrateConfig(project);
    assertHealthy("direct Node", before, snapshot(project, {}, true));

    const again = sync(project, [], true);
    assert.deepEqual([again.new, again.changed, again.removed, again.conflict], [0, 0, 0, 0], "a further sync is a no-op");

    if (hasNoStripFlag) assertHealthy("node without type stripping", before, snapshot(project, { NODE_OPTIONS: "--no-experimental-strip-types" }, true));
    if (hasBun) assertHealthy("AI_WORKFLOW_RUNNER=bun", before, snapshot(project, { AI_WORKFLOW_RUNNER: "bun" }, true));
  } finally { rmSync(project, { recursive: true, force: true }); }
});

test("a locally edited script is kept by the old sync and the project still works", { skip, timeout: 240000 }, () => {
  const project = oldProject();
  try {
    const before = snapshot(project);
    appendFileSync(join(project, "ai-framework/scripts/graphify.js"), "\n// local customization\n");
    const applied = sync(project, ["--apply"]);
    assert.ok(Number(applied.local) + Number(applied.conflict) + Number(applied.removed) >= 1, JSON.stringify(applied));
    assert.match(readFileSync(join(project, "ai-framework/scripts/graphify.js"), "utf8"), /local customization/);
    sync(project, ["--apply", "--prune"], true);
    assert.match(readFileSync(join(project, "ai-framework/scripts/graphify.js"), "utf8"), /local customization/);
    migrateConfig(project);
    assertHealthy("preserved edited graphify.js with direct graphify.mts", before, snapshot(project, {}, true));
  } finally { rmSync(project, { recursive: true, force: true }); }
});

test("a project whose workflow settings select Bun actually uses Bun and runs the same commands", { skip: skip || (hasBun ? false : "bun not installed"), timeout: 240000 }, () => {
  const project = oldProject();
  try {
    const before = snapshot(project);
    sync(project, ["--apply", "--prune"]);
    sync(project, ["--apply", "--prune"], true);
    writeFileSync(join(project, WORKFLOW_ENV_FILE), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    migrateConfig(project);
    assert.match(readFileSync(join(project, "ai-workflow.toon"), "utf8"), /runner: bun/, "the migrator carries the legacy runner setting");
    const probe = join(project, "ai-framework/scripts/upgrade-runtime-probe.mts");
    writeFileSync(probe, [
      'import { runDirect } from "./runtime/cli.mts";',
      'runDirect(import.meta.url, (_args, deps) => { deps.io.stdout.write(JSON.stringify({ selected: deps.runtime, host: process.versions.bun ? "bun" : "node" })); return 0; });',
    ].join("\n"));
    const host = run(nodeExecutable, [...NODE_FLAGS, probe], project);
    assert.equal(host.status, 0, host.stderr);
    assert.deepEqual(JSON.parse(host.stdout), { selected: "bun", host: "bun" });
    assertHealthy("workflow settings runner", before, snapshot(project, {}, true));
  } finally { rmSync(project, { recursive: true, force: true }); }
});
