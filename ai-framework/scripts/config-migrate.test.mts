// b1 smoke tests: the migrator's producer invariants. Functional (b2) and guard-proof (b3) suites build on these exports.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CONFIG_FILE, loadConfig, oexLock } from "./runtime/config.mts";
import { BACKUP_DIR, STATE_FILE, convertV2, emitToon, main, migrate } from "./config-migrate.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { FsDeps, RuntimeDeps } from "./runtime/types.mts";

const deps = createTestDeps();
const SCRIPTS_DIR = deps.path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
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
  assert.deepEqual([loaded.model.runtime.runner, loaded.model.integrations.orca.enabled, loaded.model.integrations.orca.maxConcurrentWorkers, loaded.model.skills.modes.caveman], ["node", true, 2, "lite"]);
  for (const name of Object.keys(LEGACY).filter((file) => file !== ".gitignore")) assert.equal(read(root, name), LEGACY[name as keyof typeof LEGACY], `${name} untouched`);
  const backups = outcome.results.filter((item) => item.action === "backup" && item.status === "applied");
  assert.equal(backups.length, 3);
  for (const item of backups) assert.ok(item.reason && exists(root, item.reason), String(item.reason));
  const state = JSON.parse(read(root, STATE_FILE)) as { bytesSha256: string; modelSha256: string };
  assert.equal(state.bytesSha256, deps.crypto.sha256Hex(read(root, CONFIG_FILE)));
  assert.match(state.modelSha256, /^[0-9a-f]{64}$/);
  assert.equal(read(root, ".gitignore"), "node_modules\nai-workflow.toon\n.project/records/config-migration/\n");
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

// ---------------------------------------------------------------------------
// b2 - functional tests. Real temp projects through the real runtime deps; the
// migrator is exercised through `migrate` (library) and `main` (CLI contract).
// ---------------------------------------------------------------------------

const withFs = (overrides: Partial<FsDeps>): RuntimeDeps => ({ ...deps, fs: { ...deps.fs, ...overrides } }) as RuntimeDeps;
const toonPath = (root: string): string => deps.path.join(root, CONFIG_FILE);
const rejectedFiles = (root: string): string[] => deps.fs.readdirSync(root).filter((name) => name.startsWith(`${CONFIG_FILE}.rejected`));

test("b2 dry-run on a differing valid TOON plans a backup and replace only under --force; exit codes follow", (t) => {
  const root = project(t);
  migrate(root, { apply: true, force: false }, deps);
  deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
  const before = read(root, CONFIG_FILE);
  const tree = (deps.fs.readdirSync(deps.path.join(root, BACKUP_DIR)) as string[]).join(",");
  const plain = capture(["--dry-run", "--root", root], root);
  assert.equal(plain.code, 1);
  assert.match(plain.out, /--force/);
  const forced = capture(["--dry-run", "--force", "--root", root], root);
  assert.equal(forced.code, 0);
  assert.match(forced.out, /ready backup ai-workflow\.toon: would back up the existing file \(matches the bytes this migrator last wrote \(stale\)\)/);
  assert.match(forced.out, /ready overwrite ai-workflow\.toon/);
  assert.equal(read(root, CONFIG_FILE), before, "dry-run never writes");
  assert.equal((deps.fs.readdirSync(deps.path.join(root, BACKUP_DIR)) as string[]).join(","), tree, "dry-run creates no backup directory");
});

test("b2 dry-run on an unparseable TOON reports the planned .rejected move and moves nothing", (t) => {
  const root = project(t, { ...LEGACY, [CONFIG_FILE]: "garbage !!\n" });
  const run = capture(["--dry-run", "--root", root], root);
  assert.equal(run.code, 1);
  assert.match(run.out, /manual reject ai-workflow\.toon: unparseable .* would move it aside as ai-workflow\.toon\.rejected/);
  assert.equal(read(root, CONFIG_FILE), "garbage !!\n");
  assert.deepEqual(rejectedFiles(root), []);
});

test("b2 --force on an absent target is the plain write branch: no overwrite, no TOON backup", (t) => {
  const root = project(t);
  const outcome = migrate(root, { apply: true, force: true }, deps);
  assert.equal(outcome.exitCode, 0, JSON.stringify(outcome.results));
  assert.ok(outcome.results.some((item) => item.action === "write" && item.status === "applied"));
  assert.ok(!outcome.results.some((item) => item.action === "overwrite" || (item.action === "backup" && item.path === CONFIG_FILE)));
});

test("b2 unparseable TOON stays unparseable: --force does not change the .rejected branch and legacy files are kept", (t) => {
  const root = project(t, { ...LEGACY, [CONFIG_FILE]: "schemaVersion: 3\nruntime:\n  runner: \"unterminated\n" });
  const outcome = migrate(root, { apply: true, force: true }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.equal(exists(root, CONFIG_FILE), false);
  assert.equal(rejectedFiles(root).length, 1);
  assert.equal(exists(root, BACKUP_DIR), false, "nothing is written, not even a backup");
  for (const name of ["ai_workflow_env.json", ".project/orchestration.json", ".project/skills/modes.json"]) assert.equal(read(root, name), LEGACY[name as keyof typeof LEGACY]);
});

test("b2 an unregistered integration slot in an existing TOON is a refusal without a move", (t) => {
  const root = project(t);
  migrate(root, { apply: true, force: false }, deps);
  const withSlot = read(root, CONFIG_FILE).replace("\ndoctor:", "\n  mystery:\n    enabled: true\ndoctor:");
  deps.fs.writeFileSync(toonPath(root), withSlot);
  const outcome = migrate(root, { apply: true, force: true }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.match(outcome.results[0].reason ?? "", /unregistered slot/);
  assert.equal(read(root, CONFIG_FILE), withSlot);
  assert.deepEqual(rejectedFiles(root), []);
});

test("b2 an oversized existing TOON is an unsafe refusal, not an unparseable one", (t) => {
  const root = project(t, { ...LEGACY, [CONFIG_FILE]: `schemaVersion: 3\n# ${"x".repeat(70 * 1024)}\n` });
  const outcome = migrate(root, { apply: true, force: true }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.match(outcome.results[0].reason ?? "", /unsafe or unreadable/);
  assert.deepEqual(rejectedFiles(root), []);
  assert.ok(exists(root, CONFIG_FILE));
});

test("b2 dual-hash: state.json holds the canonical-bytes digest and the parsed-model digest that --verify reports", (t) => {
  const root = project(t);
  migrate(root, { apply: true, force: false }, deps);
  const state = JSON.parse(read(root, STATE_FILE)) as { schemaVersion: number; bytesSha256: string; modelSha256: string; writtenAt: string };
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.bytesSha256, deps.crypto.sha256Hex(read(root, CONFIG_FILE)));
  const verified = JSON.parse(capture(["--verify", "--root", root], root).out) as { ok: boolean; modelSha256: string };
  assert.equal(verified.modelSha256, state.modelSha256, "parsed-model digest equals what a fresh read computes");
  assert.notEqual(state.bytesSha256, state.modelSha256, "the two digests are over different things");
  assert.ok(!Number.isNaN(Date.parse(state.writtenAt)));
});

test("b2 --json apply output is machine-readable and exit-code consistent", (t) => {
  const root = project(t);
  const run = capture(["--apply", "--json", "--root", root], root);
  assert.equal(run.code, 0);
  const parsed = JSON.parse(run.out) as { mode: string; exitCode: number; results: Array<{ action: string; status: string }>; notes: string[]; toon?: string };
  assert.equal(parsed.mode, "apply");
  assert.equal(parsed.exitCode, 0);
  assert.equal(parsed.toon, undefined, "apply never echoes the TOON");
  assert.ok(parsed.results.some((item) => item.action === "revalidate" && item.status === "applied"));
  const dry = JSON.parse(capture(["--dry-run", "--json", "--root", exists(root, CONFIG_FILE) ? project(t) : root], root).out) as { mode: string; toon?: string };
  assert.equal(dry.mode, "dry-run");
  assert.match(dry.toon ?? "", /^schemaVersion: 3\n/);
});

test("b2 conversion semantics: caveman off, defaults without legacy files, notes for what TOON cannot hold", (t) => {
  const off = project(t, { "ai_workflow_env.json": "{}", ".project/skills/modes.json": JSON.stringify({ schemaVersion: 1, caveman: { enabled: false, default: "ultra", phases: { build: "lite" } } }) });
  const outcome = migrate(off, { apply: true, force: false }, deps);
  assert.equal(outcome.exitCode, 0, JSON.stringify(outcome.results));
  assert.match(read(off, CONFIG_FILE), /caveman: off/);
  assert.ok(outcome.notes.some((note) => /per-phase caveman modes/.test(note)));
  const empty = project(t, {});
  const defaults = migrate(empty, { apply: true, force: false }, deps);
  assert.equal(defaults.exitCode, 0, JSON.stringify(defaults.results));
  const loaded = loadConfig(empty, deps);
  assert.ok(!("status" in loaded));
  if (!("status" in loaded)) assert.deepEqual([loaded.model.runtime.runner, loaded.model.integrations.orca.enabled, loaded.model.skills.modes.caveman], ["node", false, "full"]);
  assert.equal(exists(empty, BACKUP_DIR + "/state.json"), true);
  const extra = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "bun", OTHER: 1 }) });
  assert.ok(migrate(extra, { apply: false, force: false }, deps).notes.some((note) => /ignored key OTHER/.test(note)));
});

test("b2 .gitignore: never created, never duplicated, not followed through a symlink", (t) => {
  const bare = project(t, { "ai_workflow_env.json": "{}" });
  const result = migrate(bare, { apply: true, force: false }, deps);
  assert.equal(exists(bare, ".gitignore"), false);
  assert.match(result.results.find((item) => item.action === "ignore")?.reason ?? "", /no \.gitignore/);
  const have = project(t, { "ai_workflow_env.json": "{}", ".gitignore": "/ai-workflow.toon\n" });
  migrate(have, { apply: true, force: false }, deps);
  assert.equal(read(have, ".gitignore"), "/ai-workflow.toon\n.project/records/config-migration/\n", "only the missing backup-dir line is appended");
  const linked = project(t, { "ai_workflow_env.json": "{}", "elsewhere.txt": "keep\n" });
  deps.fs.symlinkSync(deps.path.join(linked, "elsewhere.txt"), deps.path.join(linked, ".gitignore"));
  const out = migrate(linked, { apply: true, force: false }, deps);
  assert.equal(read(linked, "elsewhere.txt"), "keep\n");
  assert.equal(out.exitCode, 1, "a manual .gitignore step is reported as manual");
  assert.ok(exists(linked, CONFIG_FILE), "the TOON itself was still written");
});

test("b2 a legacy file larger than the bound is refused rather than read", (t) => {
  const root = project(t, { ".project/orchestration.json": ` ${" ".repeat(70 * 1024)}{}` });
  const outcome = migrate(root, { apply: true, force: false }, deps);
  assert.equal(outcome.exitCode, 1);
  assert.match(outcome.results[0].reason ?? "", /larger than 65536 bytes/);
  assert.equal(exists(root, CONFIG_FILE), false);
});

test("b2 CLI argument contract: conflicting, duplicate or unknown flags exit 2 with usage", (t) => {
  const root = project(t);
  for (const argv of [["--dry-run", "--apply"], ["--apply", "--apply"], ["--root"], ["--root", "--apply"], ["--verify", "--apply"], ["extra"]]) {
    const run = capture(argv, root);
    assert.equal(run.code, 2, argv.join(" "));
    assert.match(run.err, /usage: config-migrate/);
  }
  assert.equal(exists(root, CONFIG_FILE), false);
});

// ---------------------------------------------------------------------------
// b3 - guard proofs. Each mutant: a passing baseline in the same layout, then a
// single injected fault through `deps.fs` / `deps.child` asserting the migrator's
// guard holds (fail closed, nothing half-written, original bytes kept).
// ---------------------------------------------------------------------------

const underBackup = (file: unknown): boolean => typeof file === "string" && file.includes(`${BACKUP_DIR}/`);
const sentinel = (kind: string): Error => Object.assign(new Error(kind), { code: kind });
const stranded = (root: string): string[] => (deps.fs.readdirSync(root) as string[]).filter((name) => name.endsWith(".tmp"));

describe("mutant-b3-wxRename-targetWriteFailureLeavesTargetIntact", () => {
  test("baseline: a clean apply leaves no temp file and replaces the target atomically", (t) => {
    const root = project(t);
    assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 0);
    assert.deepEqual(stranded(root), []);
  });
  test("mutation: rename of the new TOON fails -> previous TOON intact, temp cleaned, exit 1, no state record", (t) => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    const previous = read(root, CONFIG_FILE);
    const state = read(root, STATE_FILE);
    const broken = withFs({ renameSync: (from, to) => { if (to === toonPath(root)) throw sentinel("EXDEV"); deps.fs.renameSync(from, to); } });
    const outcome = migrate(root, { apply: true, force: true }, broken);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /write failed/);
    assert.equal(read(root, CONFIG_FILE), previous);
    assert.equal(read(root, STATE_FILE), state, "the dual-hash record is only advanced after a verified write");
    assert.deepEqual(stranded(root), []);
    assert.equal(exists(root, `${CONFIG_FILE}.lock`), false, "lock released on the failure path");
  });
});

describe("mutant-b3-backup-failureBlocksTargetWrite", () => {
  test("baseline: three legacy originals are backed up before the TOON appears", (t) => {
    const root = project(t);
    const order: string[] = [];
    const watched = withFs({ renameSync: (from, to) => { order.push(to.includes(BACKUP_DIR) ? "backup" : to === toonPath(root) ? "toon" : "other"); deps.fs.renameSync(from, to); } });
    assert.equal(migrate(root, { apply: true, force: false }, watched).exitCode, 0);
    assert.deepEqual(order.slice(0, 3), ["backup", "backup", "backup"]);
    assert.equal(order.indexOf("toon") >= 3, true);
  });
  test("mutation: a backup write fails -> no TOON written, legacy untouched, exit 1", (t) => {
    const root = project(t);
    const broken = withFs({ writeFileSync: (file, data, options) => { if (underBackup(file) && String(file).includes("modes")) throw sentinel("ENOSPC"); deps.fs.writeFileSync(file, data, options); } });
    const outcome = migrate(root, { apply: true, force: false }, broken);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /backup failed, nothing written to ai-workflow\.toon/);
    assert.equal(exists(root, CONFIG_FILE), false);
    assert.equal(exists(root, STATE_FILE), false);
    for (const name of ["ai_workflow_env.json", ".project/orchestration.json", ".project/skills/modes.json"]) assert.equal(read(root, name), LEGACY[name as keyof typeof LEGACY]);
  });
  test("mutation: a backup that reads back differently is a failure, not a success", (t) => {
    const root = project(t);
    // The read-back no longer goes through readFileSync (it is lstat/O_NOFOLLOW based), so tamper with the bytes on disk after the rename.
    const broken = withFs({ renameSync: (from, to) => { deps.fs.renameSync(from, to); if (underBackup(to)) deps.fs.writeFileSync(to, `${deps.fs.readFileSync(to)}tampered`); } });
    const outcome = migrate(root, { apply: true, force: false }, broken);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /backup read-back differs/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });
});

describe("mutant-b3-ensureDirectory-symlinkedRecordsAncestor", () => {
  test("baseline: the records directory is created as plain directories", (t) => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    assert.equal(deps.fs.lstatSync(deps.path.join(root, ".project/records")).isDirectory(), true);
  });
  test("mutation: .project/records is a symlink out of the tree -> refused, nothing written through it", (t) => {
    const root = project(t);
    const outside = tempFixture(deps, { "keep.txt": "outside\n" });
    t.after(() => deps.fs.rmSync(outside, { recursive: true, force: true }));
    deps.fs.symlinkSync(outside, deps.path.join(root, ".project/records"));
    const outcome = migrate(root, { apply: true, force: false }, deps);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /not a plain directory/);
    assert.deepEqual(deps.fs.readdirSync(outside), ["keep.txt"]);
    assert.equal(exists(root, CONFIG_FILE), false);
  });
  test("mutation: a legacy ancestor (.project) that is a file is a refusal, not absence", (t) => {
    const root = project(t, { ".project": "i am a file", "ai_workflow_env.json": "{}" });
    const outcome = migrate(root, { apply: true, force: false }, deps);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results[0].reason ?? "", /ancestor is not a directory/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });
});

describe("mutant-b3-prewriteRecheck-targetAppearsAfterInspect", () => {
  test("baseline: with no interference the absent target is written", (t) => {
    const root = project(t);
    assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 0);
  });
  test("mutation: another writer creates the TOON between inspect and rename -> refused, its bytes win", (t) => {
    const root = project(t);
    let fired = false;
    const racing = withFs({ writeFileSync: (file, data, options) => {
      deps.fs.writeFileSync(file, data, options);
      if (!fired && underBackup(file) && String(file).includes("modes")) { fired = true; deps.fs.writeFileSync(toonPath(root), "# concurrent writer\n"); }
    } });
    const outcome = migrate(root, { apply: true, force: false }, racing);
    assert.equal(fired, true);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /changed after it was inspected; nothing written/);
    assert.equal(read(root, CONFIG_FILE), "# concurrent writer\n");
  });
  test("mutation: identical bytes but a different inode (dev/ino pin) still counts as changed", (t) => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    const original = read(root, CONFIG_FILE);
    let fired = false;
    const swapping = withFs({ writeFileSync: (file, data, options) => {
      deps.fs.writeFileSync(file, data, options);
      if (!fired && underBackup(file) && String(file).includes("ai-workflow.toon")) {
        fired = true;
        const twin = deps.path.join(root, "twin.tmp");
        deps.fs.writeFileSync(twin, original);
        deps.fs.renameSync(twin, toonPath(root));
      }
    } });
    const outcome = migrate(root, { apply: true, force: true }, swapping);
    assert.equal(fired, true);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /changed after it was inspected/);
    assert.equal(read(root, CONFIG_FILE), original);
  });
});

describe("mutant-b3-postwriteVerification-rollsBack", () => {
  const failingChild = (status: number, stdout = ""): RuntimeDeps => ({ ...deps, child: { ...deps.child, runSync: () => ({ status, signal: null, stdout, stderr: "" }) } }) as RuntimeDeps;
  test("baseline: the fresh-process re-parse agrees with the in-process digest", (t) => {
    const root = project(t);
    const outcome = migrate(root, { apply: true, force: false }, deps);
    assert.ok(outcome.results.some((item) => item.action === "revalidate" && item.status === "applied"));
  });
  test("mutation: subprocess exits non-zero on a first write -> output moved to .rejected, no TOON remains, no state", (t) => {
    const root = project(t);
    const outcome = migrate(root, { apply: true, force: false }, failingChild(1));
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /post-write verification failed: subprocess re-parse exited 1/);
    assert.equal(exists(root, CONFIG_FILE), false);
    assert.equal(rejectedFiles(root).length, 1);
    assert.ok(outcome.notes.some((note) => /rejected output kept at ai-workflow\.toon\.rejected/.test(note)));
    assert.equal(exists(root, STATE_FILE), false);
  });
  test("mutation: subprocess reports a different parsed-model digest on --force -> previous bytes restored", (t) => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    const previous = read(root, CONFIG_FILE);
    const state = read(root, STATE_FILE);
    const outcome = migrate(root, { apply: true, force: true }, failingChild(0, JSON.stringify({ ok: true, modelSha256: "0".repeat(64) })));
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /parsed-model digest differs from the in-process digest/);
    assert.equal(read(root, CONFIG_FILE), previous);
    assert.ok(outcome.notes.includes("previous file restored"));
    assert.equal(read(root, STATE_FILE), state);
  });
  test("mutation: non-JSON subprocess output and a spawn failure both fail closed", (t) => {
    const noisy = project(t);
    assert.match(migrate(noisy, { apply: true, force: false }, failingChild(0, "not json")).results.at(-1)?.reason ?? "", /output was not JSON/);
    const dead = project(t);
    const spawnFails = { ...deps, child: { ...deps.child, runSync: () => { throw sentinel("ENOENT"); } } } as RuntimeDeps;
    assert.match(migrate(dead, { apply: true, force: false }, spawnFails).results.at(-1)?.reason ?? "", /subprocess could not start/);
    assert.equal(exists(dead, CONFIG_FILE), false);
  });
  test("mutation: bytes on disk differ from the bytes written (canonical-bytes digest) -> rolled back", (t) => {
    const root = project(t);
    const tampering = withFs({ renameSync: (from, to) => {
      deps.fs.renameSync(from, to);
      if (to === toonPath(root)) deps.fs.writeFileSync(to, `${deps.fs.readFileSync(to)}# drift\n`);
    } });
    const outcome = migrate(root, { apply: true, force: false }, tampering);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /canonical-bytes digest of the file on disk differs/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });
});

describe("mutant-b3-dualHash-bytesDecideProvenance", () => {
  const edited = (t: { after(fn: () => void): void }): { root: string; written: string } => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    return { root, written: read(root, CONFIG_FILE) };
  };
  test("baseline: untouched bytes are stale", (t) => {
    const { root } = edited(t);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    assert.match(migrate(root, { apply: true, force: true }, deps).results.find((item) => item.action === "overwrite")?.reason ?? "", /\(stale\)/);
  });
  test("mutation: a comment-only edit keeps the parsed model identical but is hand-edited (bytes digest decides)", (t) => {
    const { root, written } = edited(t);
    const before = JSON.parse(read(root, STATE_FILE)) as { modelSha256: string };
    deps.fs.writeFileSync(toonPath(root), `# note\n${written}`);
    assert.equal(JSON.parse(capture(["--verify", "--root", root], root).out).modelSha256, before.modelSha256, "same parsed model");
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    assert.match(migrate(root, { apply: true, force: true }, deps).results.find((item) => item.action === "overwrite")?.reason ?? "", /hand-edited or unknown provenance/);
  });
  test("mutation: a corrupted or missing state.json means unknown provenance, never stale", (t) => {
    const { root } = edited(t);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    deps.fs.writeFileSync(deps.path.join(root, STATE_FILE), "{ broken");
    assert.match(migrate(root, { apply: true, force: true }, deps).results.find((item) => item.action === "overwrite")?.reason ?? "", /hand-edited or unknown provenance/);
    const other = edited(t);
    deps.fs.rmSync(deps.path.join(other.root, STATE_FILE), { force: true });
    deps.fs.writeFileSync(deps.path.join(other.root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    assert.match(migrate(other.root, { apply: true, force: true }, deps).results.find((item) => item.action === "overwrite")?.reason ?? "", /unknown provenance/);
  });
  test("mutation: a state.json whose bytes digest matches but model digest is wrong is still stale (model digest never gates --force)", (t) => {
    const { root } = edited(t);
    const state = JSON.parse(read(root, STATE_FILE)) as Record<string, unknown>;
    deps.fs.writeFileSync(deps.path.join(root, STATE_FILE), JSON.stringify({ ...state, modelSha256: "f".repeat(64) }));
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    assert.match(migrate(root, { apply: true, force: true }, deps).results.find((item) => item.action === "overwrite")?.reason ?? "", /\(stale\)/);
  });
  test("mutation: the previous (hand-edited) bytes survive in the backup after the overwrite", (t) => {
    const { root, written } = edited(t);
    const handEdited = `${written}# mine\n`;
    deps.fs.writeFileSync(toonPath(root), handEdited);
    deps.fs.writeFileSync(deps.path.join(root, "ai_workflow_env.json"), JSON.stringify({ AI_WORKFLOW_RUNNER: "bun" }));
    const outcome = migrate(root, { apply: true, force: true }, deps);
    const backup = outcome.results.find((item) => item.action === "backup" && item.path === CONFIG_FILE);
    assert.equal(read(root, backup?.reason ?? ""), handEdited);
  });
});

describe("mutant-b3-rejected-neverOverwritten", () => {
  const bad = (root: string, text: string): void => deps.fs.writeFileSync(toonPath(root), text);
  test("baseline: the first unparseable file takes the plain .rejected name", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "bad one !!\n" });
    migrate(root, { apply: true, force: false }, deps);
    assert.equal(read(root, `${CONFIG_FILE}.rejected`), "bad one !!\n");
  });
  test("mutation: three rejections never overwrite an earlier one; names are .rejected, then unique stamped names", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "bad one !!\n" });
    migrate(root, { apply: true, force: false }, deps);
    bad(root, "bad two !!\n");
    migrate(root, { apply: true, force: true }, deps);
    bad(root, "bad three !!\n");
    migrate(root, { apply: true, force: true }, deps);
    const names = rejectedFiles(root).sort();
    assert.equal(names.length, 3);
    assert.equal(read(root, `${CONFIG_FILE}.rejected`), "bad one !!\n");
    const texts = names.map((name) => read(root, name)).sort();
    assert.deepEqual(texts, ["bad one !!\n", "bad three !!\n", "bad two !!\n"]);
    assert.ok(names.filter((name) => /^ai-workflow\.toon\.rejected\.\d{8}T\d{6}Z-[0-9a-f]{8}$/.test(name)).length === 2);
  });
  test("mutation: the file swapped for another inode after it was classified is not moved aside (dev/ino pin)", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "bad one !!\n" });
    let swapped = false;
    const swapping = { ...deps, crypto: { ...deps.crypto, randomUUID: () => {
      if (!swapped) { swapped = true; deps.fs.rmSync(toonPath(root)); deps.fs.writeFileSync(toonPath(root), "bad swapped !!\n"); }
      return deps.crypto.randomUUID();
    } } } as RuntimeDeps;
    const outcome = migrate(root, { apply: true, force: false }, swapping);
    assert.equal(swapped, true);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results[0].reason ?? "", /changed before it could be moved aside/);
    assert.deepEqual(rejectedFiles(root), []);
    assert.equal(read(root, CONFIG_FILE), "bad swapped !!\n");
  });
  test("mutation: the file swapped between the first lstat and the link is detected by the post-link recheck; the wrong inode is not moved aside", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "bad one !!\n" });
    let swapped = false;
    const racing = withFs({ linkSync: (from: string, to: string) => {
      if (!swapped && String(to).includes(".rejected")) { swapped = true; deps.fs.rmSync(toonPath(root)); deps.fs.writeFileSync(toonPath(root), "bad swapped !!\n"); }
      deps.fs.linkSync(from, to);
    } } as Partial<FsDeps>);
    const outcome = migrate(root, { apply: true, force: false }, racing);
    assert.equal(swapped, true);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results[0].reason ?? "", /changed before it could be moved aside/);
    assert.deepEqual(rejectedFiles(root), [], "the link to the wrong inode was removed");
    assert.equal(read(root, CONFIG_FILE), "bad swapped !!\n", "the swapped-in file was not unlinked");
  });
  test("mutation: a symlink at the target path is a refusal and is never renamed to .rejected", (t) => {
    const root = project(t, { ...LEGACY, "elsewhere.toon": "schemaVersion: 1\n" });
    deps.fs.symlinkSync(deps.path.join(root, "elsewhere.toon"), toonPath(root));
    const outcome = migrate(root, { apply: true, force: true }, deps);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results[0].reason ?? "", /unsafe or unreadable/);
    assert.deepEqual(rejectedFiles(root), []);
    assert.equal(deps.fs.lstatSync(toonPath(root)).isSymbolicLink(), true);
  });
});

test("b3 lock contention: a second migration started mid-apply is refused with the recovery text and the first still succeeds", (t) => {
  const root = project(t);
  let inner: ReturnType<typeof migrate> | undefined;
  const contended = withFs({ writeFileSync: (file, data, options) => {
    deps.fs.writeFileSync(file, data, options);
    if (!inner && underBackup(file)) inner = migrate(root, { apply: true, force: true }, deps);
  } });
  const outer = migrate(root, { apply: true, force: false }, contended);
  assert.equal(outer.exitCode, 0, JSON.stringify(outer.results));
  assert.equal(inner?.exitCode, 1);
  assert.match(inner?.results[0].reason ?? "", /ai-workflow\.toon\.lock exists: if no config migration is running, remove that file and re-run/);
  assert.equal(exists(root, CONFIG_FILE), true);
  assert.equal(exists(root, `${CONFIG_FILE}.lock`), false);
});

test("b3 lock is released on every exit path (refusal, backup failure, post-write rollback)", (t) => {
  const lock = (root: string): boolean => exists(root, `${CONFIG_FILE}.lock`);
  const guarded = project(t, { ...LEGACY, [CONFIG_FILE]: "bad !!\n" });
  migrate(guarded, { apply: true, force: false }, deps);
  assert.equal(lock(guarded), false, "reject path");
  const failing = project(t);
  migrate(failing, { apply: true, force: false }, withFs({ writeFileSync: (file, data, options) => { if (underBackup(file)) throw sentinel("EIO"); deps.fs.writeFileSync(file, data, options); } }));
  assert.equal(lock(failing), false, "backup-failure path");
  const rolled = project(t);
  migrate(rolled, { apply: true, force: false }, { ...deps, child: { ...deps.child, runSync: () => ({ status: 1, signal: null, stdout: "", stderr: "" }) } } as RuntimeDeps);
  assert.equal(lock(rolled), false, "rollback path");
});

test("b3 stale recovery: a leftover lock is never stolen; the refusal names the file; removing it recovers; release is idempotent", (t) => {
  const root = project(t);
  deps.fs.writeFileSync(deps.path.join(root, `${CONFIG_FILE}.lock`), "", { flag: "wx" });
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = migrate(root, { apply: true, force: true }, deps);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results[0].reason ?? "", /remove that file and re-run/);
    assert.ok(exists(root, `${CONFIG_FILE}.lock`), "stale lock retained");
    assert.equal(exists(root, CONFIG_FILE), false);
    assert.equal(exists(root, BACKUP_DIR), false, "nothing written while locked");
  }
  deps.fs.rmSync(deps.path.join(root, `${CONFIG_FILE}.lock`));
  assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 0);
  assert.equal(capture(["--dry-run", "--root", root], root).code, 0);
  const held = oexLock(toonPath(root), deps);
  assert.ok("release" in held);
  const dry = capture(["--dry-run", "--root", root], root);
  assert.equal(dry.code, 0, "dry-run takes no lock, so a held lock does not block it");
  if ("release" in held) { held.release(); held.release(); }
});

test("b3 Bun adapter never overrides writeFileSync: wx stays the Node primitive on both runners", () => {
  const source = deps.fs.readFileSync(deps.path.join(SCRIPTS_DIR, "runtime/bun.mts")).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const block = /fs:\s*\{([\s\S]*?)\n\s{4}\},/.exec(source)?.[1] ?? "";
  assert.ok(block.includes("readFile") && block.includes("writeFile"), "located the createBunDeps fs override block");
  assert.doesNotMatch(block, /\bwriteFileSync\b/, "the Bun adapter must not override writeFileSync (migrator wx + rename relies on it)");
  const probe = tempFixture(deps, { "existing.txt": "keep" });
  try {
    assert.throws(() => deps.fs.writeFileSync(deps.path.join(probe, "existing.txt"), "clobber", { flag: "wx" }), (error) => (error as { code?: string }).code === "EEXIST");
    assert.equal(deps.fs.readFileSync(deps.path.join(probe, "existing.txt")), "keep");
  } finally { deps.fs.rmSync(probe, { recursive: true, force: true }); }
});

test("c1 legacy policy maps into integrations.orca and per-coordinator workers are preserved", (t) => {
  const root = project(t);
  assert.equal(migrate(root, { apply: true, force: false }, deps).exitCode, 0);
  const toon = read(root, CONFIG_FILE);
  assert.match(toon, /^schemaVersion: 3\n/);
  assert.doesNotMatch(toon, /^(engines|orchestration):/m);
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded) && loaded.problems.length === 0);
  if ("status" in loaded) return;
  const orca = loaded.model.integrations.orca;
  assert.deepEqual([orca.engine, orca.enabled, orca.multiAgent, orca.maxConcurrentWorkers, orca.maxRetriesPerTask], [">=1.4.224", true, true, 2, 1]);
  assert.deepEqual(orca.coordinators?.claude, { workers: ["codex", "opencode"], roles: { implementation: ["codex"], review: ["opencode"] } });
  assert.deepEqual(orca.coordinators?.codex?.workers, ["claude", "opencode"]);
  assert.deepEqual(orca.coordinators?.opencode?.workers, ["claude", "codex"]);
});

test("c1 a schemaVersion 1 (old flat layout) ai-workflow.toon is refused without --force and backed up and replaced with it", (t) => {
  const old = "schemaVersion: 1\nruntime:\n  runner: node\nengines:\n  orca: \"1.4.224\"\norchestration:\n  multiAgent: false\n  enabled: false\n  maxConcurrentWorkers: 3\n  maxRetriesPerTask: 1\ndoctor:\n  modelRouting: project\nskills:\n  modes:\n    caveman: full\nintegrations: {}\n";
  const root = project(t, { ...LEGACY, [CONFIG_FILE]: old });
  const refused = migrate(root, { apply: true, force: false }, deps);
  assert.equal(refused.exitCode, 1);
  assert.match(refused.results[0].reason ?? "", /unsupported schemaVersion.*--force/);
  assert.equal(read(root, CONFIG_FILE), old);
  assert.equal(exists(root, BACKUP_DIR), false);
  assert.deepEqual(rejectedFiles(root), []);
  const forced = migrate(root, { apply: true, force: true }, deps);
  assert.equal(forced.exitCode, 0, JSON.stringify(forced.results));
  assert.match(read(root, CONFIG_FILE), /^schemaVersion: 3\n/);
  const backup = forced.results.find((item) => item.action === "backup" && item.path === CONFIG_FILE && item.status === "applied");
  assert.equal(read(root, backup?.reason ?? ""), old);
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded) && loaded.problems.length === 0);
});

// ---- audit cycle 1 (F2) ---------------------------------------------------------------------------------------

describe("f2 legacy multi-agent switch is normalised like the readers", () => {
  const cases: Array<[string, unknown, boolean]> = [["TRUE", "TRUE", true], [" true", " true", true], ["boolean true", true, true], ["false", "false", false], ["maybe", "maybe", false]];
  for (const [label, raw, expected] of cases) {
    test(`${label} -> multiAgent ${expected}`, (t) => {
      const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_ORCA_MULTI_AGENT: raw }) });
      const outcome = migrate(root, { apply: false, force: false }, deps);
      assert.equal(outcome.exitCode, 0);
      assert.match(outcome.toon ?? "", new RegExp(`multiAgent: ${expected}\n`));
    });
  }
  test("missing -> multiAgent false", (t) => {
    const root = project(t, { "ai_workflow_env.json": "{}" });
    assert.match(migrate(root, { apply: false, force: false }, deps).toon ?? "", /multiAgent: false\n/);
  });
});

describe("f2 ancestor swap during a pinned write is refused", () => {
  const swapInto = (root: string, victim: string, match: (dir: string, file: string) => boolean): { fs: Partial<FsDeps>; swapped: () => boolean } => {
    let done = false;
    return {
      swapped: () => done,
      fs: { writeFileSync: (file, data, options) => {
        const name = String(file);
        const dir = deps.path.dirname(name);
        if (!done && name.endsWith(".tmp") && match(dir, name)) {
          done = true;
          deps.fs.renameSync(dir, `${dir}.moved`);
          deps.fs.symlinkSync(victim, dir);
        }
        deps.fs.writeFileSync(file, data, options);
      } },
    };
  };
  const victimDir = (t: { after(fn: () => void): void }, name: string): string => project(t, { [name]: "VICTIM-ORIGINAL\n" });

  test("backup directory swapped for a symlink after ensureDirectory: nothing escapes, nothing is written to the target", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    const victim = victimDir(t, "ai_workflow_env.json");
    const race = swapInto(root, victim, (dir) => dir.includes("/config-migration/"));
    const outcome = migrate(root, { apply: true, force: false }, withFs(race.fs));
    assert.equal(race.swapped(), true, "the race fired");
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /backup failed, nothing written to ai-workflow\.toon: .*DIR-PIN-CHANGED/);
    assert.equal(read(victim, "ai_workflow_env.json"), "VICTIM-ORIGINAL\n");
    assert.equal(exists(root, CONFIG_FILE), false);
  });

  test("state.json directory swapped for a symlink: the victim is untouched and the failure is reported", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    const victim = victimDir(t, "state.json");
    const race = swapInto(root, victim, (dir) => deps.path.basename(dir) === "config-migration");
    const outcome = migrate(root, { apply: true, force: false }, withFs(race.fs));
    assert.equal(race.swapped(), true, "the race fired");
    assert.equal(read(victim, "state.json"), "VICTIM-ORIGINAL\n");
    const record = outcome.results.find((item) => item.path === STATE_FILE);
    assert.equal(record?.status, "manual");
    assert.match(record?.reason ?? "", /DIR-PIN-CHANGED/);
    assert.equal(outcome.exitCode, 1);
  });

  test("backup directory swapped for a different plain directory (no symlink): refused by the dev/ino pin", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    let done = false;
    const fsSwap = { writeFileSync: (file: string, data: string, options?: unknown) => {
      const name = String(file);
      const dir = deps.path.dirname(name);
      if (!done && name.endsWith(".tmp") && dir.includes("/config-migration/")) {
        done = true;
        deps.fs.renameSync(dir, `${dir}.moved`);
        deps.fs.mkdirSync(dir, { recursive: false, mode: 0o755 }); // a different, plain, non-link directory at the same path
      }
      deps.fs.writeFileSync(file, data, options as never);
    } };
    const outcome = migrate(root, { apply: true, force: false }, withFs(fsSwap as Partial<FsDeps>));
    assert.equal(done, true, "the race fired");
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /backup failed, nothing written to ai-workflow\.toon: .*DIR-PIN-CHANGED/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });

  test("backup directory whose realpath differs from its lexical path is refused even when dev/ino match", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    // Same inode on disk, but the OS reports a different canonical path (an aliased ancestor): only the realpath check can see it.
    const aliased = withFs({ realpathSync: (p: string) => (String(p).includes("/config-migration/") ? `${p}-alias` : deps.fs.realpathSync(p)) } as Partial<FsDeps>);
    const outcome = migrate(root, { apply: true, force: false }, aliased);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /DIR-PIN-CHANGED/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });

  test("backup read-back does not follow a link planted at the backup path", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    const original = JSON.stringify({ AI_WORKFLOW_RUNNER: "node" });
    const planted = withFs({ renameSync: (from, to) => {
      deps.fs.renameSync(from, to);
      if (to.includes(BACKUP_DIR) && to.endsWith("ai_workflow_env.json")) {
        deps.fs.unlinkSync(to);
        deps.fs.writeFileSync(deps.path.join(root, "decoy.txt"), original);
        deps.fs.symlinkSync(deps.path.join(root, "decoy.txt"), to);
      }
    } });
    const outcome = migrate(root, { apply: true, force: false }, planted);
    assert.equal(outcome.exitCode, 1);
    assert.match(outcome.results.at(-1)?.reason ?? "", /backup read-back differs/);
    assert.equal(exists(root, CONFIG_FILE), false);
  });
});

describe("f2 legacy keys are never echoed raw", () => {
  test("an ESC/newline key in --dry-run output is counted, not printed", (t) => {
    const key = "\u001b[2Jevil\nforged: line";
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node", [key]: 1, "SAFE_KEY-1": 2 }) });
    const run = capture(["--dry-run", "--root", root], root);
    assert.equal(run.code, 0);
    assert.equal(run.out.includes("\u001b"), false);
    assert.equal(run.out.includes("evil"), false);
    assert.equal(run.out.includes("forged"), false);
    assert.match(run.out, /note: ai_workflow_env\.json: 1 ignored key\(s\) \(unprintable\)/);
    assert.match(run.out, /note: ai_workflow_env\.json: ignored key SAFE_KEY-1/);
    const json = capture(["--dry-run", "--json", "--root", root], root);
    assert.equal(json.out.includes("evil"), false);
  });
});

describe("f2 post-write verification failures roll back and print only a code", () => {
  test("a throw after the rename becomes a failure: target moved aside, no state, no path or raw message printed", (t) => {
    const root = project(t, { "ai_workflow_env.json": JSON.stringify({ AI_WORKFLOW_RUNNER: "node" }) });
    const target = deps.path.join(root, CONFIG_FILE);
    const run = (() => {
      let out = "", err = "";
      const wrapped = { ...withFs({ renameSync: (from, to) => { deps.fs.renameSync(from, to); if (to === target) deps.fs.chmodSync(target, 0o000); } }),
        io: { ...deps.io, stdout: { write: (x: string) => { out += x; }, isTTY: false }, stderr: { write: (x: string) => { err += x; }, isTTY: false } } } as RuntimeDeps;
      const code = main(["--apply", "--root", root], wrapped) as number;
      return { code, out, err };
    })();
    assert.equal(run.code, 1);
    assert.equal(exists(root, CONFIG_FILE), false, "no unverified TOON is left in place");
    assert.equal(exists(root, STATE_FILE), false, "no partial state");
    assert.equal(exists(root, `${CONFIG_FILE}.lock`), false);
    assert.match(run.out, /post-write verification failed: verification error \(error [A-Z]+\)/);
    assert.equal((run.out + run.err).includes(root), false, "no absolute path is printed");
  });
});

describe("f2 .rejected is never overwritten, even under a race", () => {
  test("a .rejected that appears between the check and the move survives; the file takes a stamped name", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "garbage!!\n" });
    const rejected = deps.path.join(root, `${CONFIG_FILE}.rejected`);
    let raced = false;
    const racy = withFs({ linkSync: (existing, link) => {
      if (!raced && link === rejected) { raced = true; deps.fs.writeFileSync(rejected, "OPERATOR-RECOVERY-COPY\n"); }
      deps.fs.linkSync(existing, link);
    }, renameSync: (from, to) => { if (to === rejected || to.startsWith(`${rejected}.`)) throw new Error("must not rename onto .rejected"); deps.fs.renameSync(from, to); } });
    const outcome = migrate(root, { apply: true, force: false }, racy);
    assert.equal(raced, true);
    assert.equal(outcome.exitCode, 1);
    assert.equal(read(root, `${CONFIG_FILE}.rejected`), "OPERATOR-RECOVERY-COPY\n");
    const stamped = rejectedFiles(root).filter((name) => name !== `${CONFIG_FILE}.rejected`);
    assert.equal(stamped.length, 1);
    assert.equal(read(root, stamped[0]), "garbage!!\n");
    assert.equal(exists(root, CONFIG_FILE), false);
  });
});

describe("f2 unsupported is decided by structure, not message text", () => {
  const crafted = 'schemaVersion: "x unsupported schemaVersion: 7 y"\n!!! garbage line\n';
  test("a garbage file with a crafted schemaVersion string is moved aside as .rejected, even with --force", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: crafted });
    const dry = migrate(root, { apply: false, force: true }, deps);
    assert.equal(dry.results[0].action, "reject");
    const outcome = migrate(root, { apply: true, force: true }, deps);
    assert.equal(outcome.exitCode, 1);
    assert.equal(outcome.results[0].action, "reject");
    assert.equal(read(root, `${CONFIG_FILE}.rejected`), crafted);
    assert.equal(exists(root, CONFIG_FILE), false);
    assert.equal(exists(root, BACKUP_DIR), false);
  });
  test("a quoted string schemaVersion whose text looks like an integer is not unsupported either", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: 'schemaVersion: "7"\n!!! garbage line\n' });
    assert.equal(migrate(root, { apply: false, force: true }, deps).results[0].action, "reject");
  });
  test("a bare integer schemaVersion other than 2 is still unsupported (force replaces, backup kept)", (t) => {
    const root = project(t, { ...LEGACY, [CONFIG_FILE]: "schemaVersion: 7\nfuture: yes\n" });
    assert.match(migrate(root, { apply: false, force: false }, deps).results[0].reason ?? "", /unsupported schemaVersion.*--force.*legacy settings or defaults/);
    const forced = migrate(root, { apply: true, force: true }, deps);
    assert.equal(forced.exitCode, 0, JSON.stringify(forced.results));
    assert.deepEqual(rejectedFiles(root), []);
  });
});

describe("f2 the backup directory is gitignored too", () => {
  test("both lines are appended when absent, only the missing one otherwise, none when both exist", (t) => {
    const root = project(t);
    migrate(root, { apply: true, force: false }, deps);
    assert.equal(read(root, ".gitignore"), "node_modules\nai-workflow.toon\n.project/records/config-migration/\n");
    const both = project(t, { "ai_workflow_env.json": "{}", ".gitignore": "ai-workflow.toon\n/.project/records/config-migration\n" });
    migrate(both, { apply: true, force: false }, deps);
    assert.equal(read(both, ".gitignore"), "ai-workflow.toon\n/.project/records/config-migration\n");
    const onlyBackup = project(t, { "ai_workflow_env.json": "{}", ".gitignore": "x" });
    migrate(onlyBackup, { apply: true, force: false }, deps);
    assert.equal(read(onlyBackup, ".gitignore"), "x\nai-workflow.toon\n.project/records/config-migration/\n");
  });
});

const V2_FILE = [
  "schemaVersion: 2", "# keep me", "runtime:", "  runner: bun", "integrations:", "  orca:", '    engine: ">=1.4.224"', "    enabled: true", "    multiAgent: true",
  "    maxConcurrentWorkers: 3", "    maxRetriesPerTask: 2", "doctor:", "  modelRouting: bundle", "skills:", "  modes:", "    caveman: ultra", "",
].join("\n");

test("v2 -> v3: --apply converts in place without --force, preserving every value and adding models for all vendors", (t) => {
  const root = project(t, { [CONFIG_FILE]: V2_FILE, ".gitignore": "node_modules\n" });
  const run = capture(["--apply", "--root", root], root);
  assert.equal(run.code, 0, run.out + run.err);
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded), JSON.stringify(loaded));
  assert.deepEqual(loaded.problems, []);
  const model = loaded.model;
  assert.equal(model.schemaVersion, 3);
  assert.equal(model.runtime.runner, "bun");
  assert.equal(model.doctor.modelRouting, "bundle");
  assert.equal(model.skills.modes.caveman, "ultra");
  assert.equal(model.integrations.orca.maxConcurrentWorkers, 3);
  assert.equal(model.integrations.orca.maxRetriesPerTask, 2);
  assert.equal(model.integrations.orca.multiAgent, true);
  for (const vendor of ["claude", "opencode", "codex"]) for (const profile of ["fast", "standard", "deep"]) assert.ok(model.models?.[vendor]?.[profile]?.model, `${vendor}.${profile}`);
  assert.match(read(root, CONFIG_FILE), /# keep me/);
  const backups = deps.fs.readdirSync(deps.path.join(root, BACKUP_DIR)).filter((name: string) => name !== "state.json");
  assert.equal(backups.length, 1);
});

test("v2 -> v3: dry-run prints the converted file and writes nothing; a converted file is not rewritten", (t) => {
  const root = project(t, { [CONFIG_FILE]: V2_FILE });
  const dry = capture(["--dry-run", "--root", root], root);
  assert.equal(dry.code, 0, dry.out + dry.err);
  assert.match(dry.out, /schemaVersion: 3/);
  assert.match(dry.out, /models:/);
  assert.equal(read(root, CONFIG_FILE), V2_FILE);
  assert.equal(capture(["--apply", "--root", root], root).code, 0);
  const converted = read(root, CONFIG_FILE);
  assert.equal(capture(["--apply", "--root", root], root).code, 1, "a v3 file is not converted again");
  assert.equal(read(root, CONFIG_FILE), converted);
});

test("v2 -> v3: a v2 file with an unknown key is refused, not laundered", (t) => {
  const root = project(t, { [CONFIG_FILE]: V2_FILE.replace("runtime:", "bogus: 1\nruntime:") });
  const run = capture(["--apply", "--root", root], root);
  assert.equal(run.code, 1);
  assert.match(read(root, CONFIG_FILE), /^schemaVersion: 2/);
});

test("convertV2 only accepts a single bare schemaVersion 2 line and never a file that already has models", () => {
  assert.equal(convertV2("schemaVersion: 3\n"), undefined);
  assert.equal(convertV2("schemaVersion: 2\nschemaVersion: 2\n"), undefined);
  assert.equal(convertV2("schemaVersion: 2\nmodels:\n"), undefined);
  assert.match(convertV2("schemaVersion: 2\n") ?? "", /^schemaVersion: 3\nmodels:/);
});

test("convertV2 keeps CRLF line endings, a comment on the version line and trailing blank lines", () => {
  const source = "schemaVersion: 2 # keep\r\nruntime:\r\n  runner: node\r\n\r\n";
  const out = convertV2(source) ?? "";
  assert.ok(out.startsWith("schemaVersion: 3 # keep\r\nruntime:\r\n  runner: node\r\n\r\nmodels:\r\n"), JSON.stringify(out.slice(0, 80)));
  assert.ok(!/[^\r]\n/.test(out), "every line ending stays CRLF");
});

test("convertV2 rejects every schemaVersion other than 2 (0, 1, 3, 7, 9)", () => {
  for (const version of ["0", "1", "3", "7", "9"]) assert.equal(convertV2(`schemaVersion: ${version}\n`), undefined, version);
});

test("emitToon writes the model's own models block instead of the defaults", (t) => {
  const root = project(t, { [CONFIG_FILE]: V2_FILE });
  assert.equal(capture(["--apply", "--root", root], root).code, 0);
  const loaded = loadConfig(root, deps);
  assert.ok(!("status" in loaded));
  const model = structuredClone(loaded.model);
  model.models!.codex.fast = { model: "custom/model-1", effort: "low" };
  const text = emitToon(model);
  assert.match(text, /model: custom\/model-1\n      effort: low/);
  assert.doesNotMatch(text, /gpt-6-luna/);
});

test("routing: the legacy workflow-doctor.json value is carried and backed up; without it the bundled routes are the default", (t) => {
  const owned = project(t, { ".project/workflow-doctor.json": JSON.stringify({ schemaVersion: 1, modelRouting: "project" }), ".gitignore": "x\n" });
  assert.equal(capture(["--apply", "--root", owned], owned).code, 0);
  const loaded = loadConfig(owned, deps);
  assert.ok(!("status" in loaded));
  assert.equal(loaded.model.doctor.modelRouting, "project");
  const backups = deps.fs.readdirSync(deps.path.join(owned, BACKUP_DIR)).filter((name: string) => name !== "state.json");
  assert.ok(deps.fs.existsSync(deps.path.join(owned, BACKUP_DIR, backups[0], ".project__workflow-doctor.json")));
  assert.equal(exists(owned, ".project/workflow-doctor.json"), true, "legacy files are kept");

  const fresh = project(t, { ".gitignore": "x\n" });
  assert.equal(capture(["--apply", "--root", fresh], fresh).code, 0);
  assert.match(read(fresh, CONFIG_FILE), /^  modelRouting: bundle$/m);

  const broken = project(t, { ".project/workflow-doctor.json": JSON.stringify({ schemaVersion: 1, modelRouting: "other" }) });
  const run = capture(["--apply", "--root", broken], broken);
  assert.equal(run.code, 1);
  assert.match(run.out + run.err, /workflow-doctor\.json: must be/);
  assert.equal(exists(broken, CONFIG_FILE), false);
});
