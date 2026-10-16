// b1 smoke tests: the migrator's producer invariants. Functional (b2) and guard-proof (b3) suites build on these exports.
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG_FILE, loadConfig, oexLock } from "./runtime/config.mts";
import { BACKUP_DIR, STATE_FILE, emitToon, main, migrate } from "./config-migrate.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const deps = createTestDeps();
const POLICY = JSON.stringify({ schemaVersion: 1, "use-orca-orchestration": true, maxConcurrentWorkers: 2, maxRetriesPerTask: 1,
  coordinators: {
    claude: { workers: ["codex", "opencode"], roles: { implementation: "codex", review: "opencode" } },
    codex: { workers: ["claude", "opencode"], roles: { implementation: "claude", review: "opencode" } },
    opencode: { workers: ["claude", "codex"], roles: { implementation: "claude", review: "codex" } },
  } });
const LEGACY = {
  "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node", AI_WORKFLOW_ORCA_MULTI_AGENT: true }),
  ".project/orchestration.json": POLICY,
  ".project/skills/modes.json": JSON.stringify({ schemaVersion: 1, caveman: { enabled: true, default: "lite" } }),
  ".gitignore": "node_modules\n",
};

function project(t: { after(fn: () => void): void }, files: Record<string, string> = LEGACY): string {
  const root = tempFixture(deps, files);
  t.after(() => deps.fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const read = (root: string, name: string): string => deps.fs.readFileSync(deps.path.join(root, name));
const exists = (root: string, name: string): boolean => deps.fs.existsSync(deps.path.join(root, name));
function capture(argv: string[], root: string): { code: number; out: string; err: string } {
  let out = "", err = "";
  const io = { ...deps.io, stdout: { write: (s: string) => { out += s; }, isTTY: false }, stderr: { write: (s: string) => { err += s; }, isTTY: false } };
  const code = main(argv, { ...deps, io, proc: { ...deps.proc, cwd: () => root } } as RuntimeDeps) as number;
  return { code, out, err };
}

test("dry-run prints the canonical TOON and changes nothing", (t) => {
  const root = project(t);
  const run = capture(["--dry-run", "--root", root], root);
  assert.equal(run.code, 0);
  assert.match(run.out, /ready write ai-workflow\.toon/);
  assert.match(run.out, /caveman: lite/);
  assert.equal(exists(root, CONFIG_FILE), false);
  assert.equal(exists(root, BACKUP_DIR), false);
  assert.equal(read(root, ".gitignore"), "node_modules\n");
});

test("apply writes valid TOON, backs up originals, keeps legacy files, records dual-hash state", (t) => {
  const root = project(t);
  const outcome = migrate(root, { apply: true, force: false }, deps);
  assert.equal(outcome.exitCode, 0, JSON.stringify(outcome.results));
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded) && loaded.problems.length === 0);
  if ("status" in loaded) return;
  assert.deepEqual([loaded.model.runtime.runner, loaded.model.orchestration.enabled, loaded.model.orchestration.maxConcurrentWorkers, loaded.model.skills.modes.caveman], ["node", true, 2, "lite"]);
  for (const name of Object.keys(LEGACY).filter((file) => file !== ".gitignore")) assert.equal(read(root, name), LEGACY[name as keyof typeof LEGACY], `${name} untouched`);
  const backups = outcome.results.filter((item) => item.action === "backup" && item.status === "applied");
  assert.equal(backups.length, 3);
  for (const item of backups) assert.ok(item.reason && exists(root, item.reason), String(item.reason));
  const state = JSON.parse(read(root, STATE_FILE)) as { bytesSha256: string; modelSha256: string };
  assert.equal(state.bytesSha256, deps.crypto.sha256Hex(read(root, CONFIG_FILE)));
  assert.match(state.modelSha256, /^[0-9a-f]{64}$/);
  assert.equal(read(root, ".gitignore"), "node_modules\nai-workflow.toon\n");
  assert.equal(exists(root, `${CONFIG_FILE}.lock`), false, "lock released");
});

test("apply is idempotent and emitToon is deterministic", (t) => {
  const root = project(t);
  assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 0);
  const first = read(root, CONFIG_FILE);
  const again = migrate(root, { apply: true, force: false }, deps);
  assert.equal(again.exitCode, 0);
  assert.deepEqual(again.results.map((item) => item.action), ["unchanged"]);
  assert.equal(read(root, CONFIG_FILE), first);
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded));
  if (!("status" in loaded)) assert.equal(emitToon(loaded.model), first);
});

test("a valid TOON that differs is refused without --force and replaced (with backup) under --force", (t) => {
  const root = project(t);
  migrate(root, { apply: true, force: false }, deps);
  deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
  const refused = migrate(root, { apply: true, force: false }, deps);
  assert.equal(refused.exitCode, 1);
  assert.match(refused.results[0].reason ?? "", /--force/);
  assert.match(read(root, CONFIG_FILE), /runner: node/);
  const forced = migrate(root, { apply: true, force: true }, deps);
  assert.equal(forced.exitCode, 0, JSON.stringify(forced.results));
  assert.match(read(root, CONFIG_FILE), /runner: bun/);
  assert.match(forced.results.find((item) => item.action === "overwrite")?.reason ?? "", /stale/);
  assert.ok(forced.results.some((item) => item.action === "backup" && item.path === CONFIG_FILE && item.status === "applied"));
});

test("a hand-edited TOON is classified as such under --force and kept in a backup", (t) => {
  const root = project(t);
  migrate(root, { apply: true, force: false }, deps);
  const edited = `${read(root, CONFIG_FILE)}# edited by hand\n`;
  deps.fs.writeFileSync(deps.path.join(root, CONFIG_FILE), edited);
  const forced = migrate(root, { apply: true, force: true }, deps);
  assert.equal(forced.exitCode, 0, JSON.stringify(forced.results));
  assert.match(forced.results.find((item) => item.action === "overwrite")?.reason ?? "", /hand-edited/);
  const backup = forced.results.find((item) => item.action === "backup" && item.path === CONFIG_FILE);
  assert.equal(read(root, backup?.reason ?? ""), edited);
});

test("an unparseable TOON is moved to .rejected, never overwritten, and nothing is written", (t) => {
  const root = project(t, { ...LEGACY, [CONFIG_FILE]: "this is !! not toon\n" });
  const outcome = migrate(root, { apply: true, force: true }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.equal(exists(root, CONFIG_FILE), false);
  assert.equal(read(root, `${CONFIG_FILE}.rejected`), "this is !! not toon\n");
  deps.fs.writeFileSync(deps.path.join(root, CONFIG_FILE), "second bad !!\n");
  assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 1);
  assert.equal(read(root, `${CONFIG_FILE}.rejected`), "this is !! not toon\n", "first .rejected kept");
  assert.equal(deps.fs.readdirSync(root).filter((name) => name.startsWith(`${CONFIG_FILE}.rejected.`)).length, 1);
});

test("a symlinked legacy file is a refusal, not absence; nothing is written", (t) => {
  const root = project(t, { ".project/orchestration.json": POLICY, "outside.json": "{}" });
  deps.fs.symlinkSync(deps.path.join(root, "outside.json"), deps.path.join(root, "ai_workflow_env.json"));
  const outcome = migrate(root, { apply: true, force: false }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.match(outcome.results[0].reason ?? "", /symlink/);
  assert.equal(exists(root, CONFIG_FILE), false);
  assert.equal(exists(root, BACKUP_DIR), false);
});

test("a held lock refuses with the operator-recovery text and leaves the lock alone", (t) => {
  const root = project(t);
  const held = oexLock(deps.path.join(root, CONFIG_FILE), deps);
  assert.ok("release" in held);
  const outcome = migrate(root, { apply: true, force: false }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.match(outcome.results[0].reason ?? "", /ai-workflow\.toon\.lock exists: if no config migration is running, remove that file/);
  assert.ok(exists(root, `${CONFIG_FILE}.lock`));
  if ("release" in held) held.release();
});

test("invalid legacy JSON aborts before any write; --verify re-parses in a fresh process", (t) => {
  const root = project(t, { "ai_workflow_env.json": "{ not json" });
  assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 1);
  assert.equal(exists(root, CONFIG_FILE), false);
  const good = project(t);
  migrate(good, { apply: true, force: false }, deps);
  const verified = capture(["--verify", "--root", good], good);
  assert.equal(verified.code, 0);
  assert.equal((JSON.parse(verified.out) as { ok: boolean }).ok, true);
  assert.equal(capture(["--bogus"], good).code, 2);
});
