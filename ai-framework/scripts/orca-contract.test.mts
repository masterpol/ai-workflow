import assert from "node:assert/strict";
import test from "node:test";

import { createTestDeps } from "./runtime/test-helpers.mts";
import { MAX_OUTPUT_BYTES } from "./orca-preflight.mts";
import {
  CONTRACT_MAX_BYTES, SNAPSHOT_PATH, USED_CONTRACT, buildSnapshot, checkUsedAgainstSnapshot, diffContract, orcaCommand, parseSnapshot, readLiveContract, readSnapshotFile, serializeSnapshot,
} from "./orca-contract.mts";

import type { RuntimeDeps } from "./runtime/types.mts";

const deps = createTestDeps();
const ROOT = new URL("../../", import.meta.url).pathname;

/*
 * Fixture shape: captured from the real `orca agent-context --json` on 2026-11-23 (schemaVersion 1, commandCount 417; 421,069 bytes).
 * Entries keep the fields the reader uses (command, summary, flags) with the real flag lists of the commands our scripts send,
 * plus the real "Retired:" summary of `orchestration coordinator-start`.
 * `agent installed` was captured from the real Orca 1.4.271 agent-context on 2026-11-23.
 */
type Entry = { command: string; summary: string; flags: string[] };
const COMMON = ["help", "json", "pairing-code", "environment"];
const REAL: Entry[] = [
  { command: "agent installed", summary: "List the agent CLIs installed on this host, with the IDs --agent takes", flags: [...COMMON, "worktree"] },
  { command: "orchestration worker-start", summary: "Start a worker", flags: [...COMMON, "task", "spec", "spec-file", "keep-open", "task-title", "deps", "parent", "on", "worktree", "name", "repo", "base-branch", "display-name", "comment", "setup", "agent", "model", "effort", "terminal", "retry-of", "timeout-ms", "run", "from", "retry-request", "item", "for", "full"] },
  { command: "orchestration worker-list", summary: "List workers", flags: [...COMMON, "run", "terminal-state", "include-remote", "on", "cursor", "limit", "full"] },
  { command: "status", summary: "Show status", flags: [...COMMON] },
  { command: "skills get", summary: "Get a skill", flags: [...COMMON, "topic", "full", "reference", "references"] },
  { command: "orchestration coordinator-start", summary: "Retired: load the current orchestration skill", flags: [...COMMON, "spec", "from", "full"] },
];
const live = (entries: Entry[] = REAL, schemaVersion = 1): string => JSON.stringify({ schemaVersion, commandCount: entries.length, commands: entries });
const mutate = (name: string, change: (entry: Entry) => Entry | null): Entry[] => REAL.flatMap((entry) => (entry.command === name ? (change(entry) ? [change(entry) as Entry] : []) : [entry]));
const snapshot = () => { const built = buildSnapshot(live()); assert.ok(built.ok); return built.value; };
const problems = (text: string): string[] => { const result = diffContract(snapshot(), text); assert.ok(result.ok); return result.value.problems; };

test("snapshot holds only the used commands and flags, sorted, and round-trips through the strict reader", () => {
  const built = snapshot();
  assert.deepEqual(Object.keys(built.commands).sort(), Object.keys(USED_CONTRACT).sort());
  assert.deepEqual(built.commands["orchestration worker-list"].flags, ["cursor", "full", "json", "limit", "terminal-state"]);
  assert.deepEqual(built.commands["orchestration worker-start"].flags,
    ["agent", "base-branch", "effort", "full", "json", "model", "name", "repo", "setup", "spec", "timeout-ms", "worktree"]);
  assert.equal(built.commands.status.retired, false);
  const parsed = parseSnapshot(serializeSnapshot(built));
  assert.deepEqual(parsed.ok && parsed.value, built);
});

test("drift: added flags, added commands and unrelated changes pass", () => {
  const extra = mutate("status", (entry) => ({ ...entry, flags: [...entry.flags, "brand-new-flag"] }));
  extra.push({ command: "brand-new command", summary: "New", flags: ["json"] });
  assert.deepEqual(problems(live(extra)), []);
  assert.deepEqual(problems(live()), []);
});

test("drift: a removed used flag fails and names the command and the flag", () => {
  const found = problems(live(mutate("orchestration worker-start", (entry) => ({ ...entry, flags: entry.flags.filter((flag) => flag !== "agent") }))));
  assert.equal(found.length, 1);
  assert.match(found[0], /"orchestration worker-start" lost flag --agent/);
});

test("drift: worker-start needs both full receipts and the Orca timeout flag", () => {
  for (const flag of ["full", "timeout-ms"]) {
    const found = problems(live(mutate("orchestration worker-start", (entry) => ({ ...entry, flags: entry.flags.filter((value) => value !== flag) }))));
    assert.deepEqual(found, [`command "orchestration worker-start" lost flag --${flag}`]);
  }
});

test("drift: a removed used command fails and names it", () => {
  const found = problems(live(mutate("skills get", () => null)));
  assert.deepEqual(found, ['command "skills get" is gone']);
});

test("drift: a used command that newly became Retired fails; a command that was already Retired in the snapshot does not", () => {
  const retired = mutate("status", (entry) => ({ ...entry, summary: "Retired: use something else" }));
  assert.deepEqual(problems(live(retired)), ['command "status" is now Retired']);
  const base = snapshot();
  base.commands.status.retired = true;
  const again = diffContract(base, live(retired));
  assert.ok(again.ok && again.value.ok);
});

test("drift: a changed schemaVersion fails; an unrelated Retired command is ignored", () => {
  assert.match(problems(live(REAL, 2))[0], /schemaVersion changed from 1 to 2/);
  assert.deepEqual(problems(live(REAL)), []); // coordinator-start is Retired in REAL and is not one of ours
});

test("generator refuses when a used command or flag is absent now, naming it", () => {
  const noFlag = buildSnapshot(live(mutate("status", (entry) => ({ ...entry, flags: [] }))));
  assert.ok(!noFlag.ok && /"status" lacks flag --json/.test(noFlag.reason));
  const noCommand = buildSnapshot(live(mutate("status", () => null)));
  assert.ok(!noCommand.ok && /"status" is not in the live CLI/.test(noCommand.reason));
});

test("hostile or malformed live text yields a fixed reason and never echoes it", () => {
  const secret = "SECRET-TOKEN-123";
  for (const text of [`not json ${secret}`, JSON.stringify({ schemaVersion: secret, commands: [] }), JSON.stringify([secret]), "x".repeat(CONTRACT_MAX_BYTES + 1)]) {
    const result = diffContract(snapshot(), text);
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  }
  const hostile = buildSnapshot(live([{ command: "status", summary: `Retired ${secret}`, flags: ["json", `--${secret}`] }]));
  assert.ok(!hostile.ok);
  assert.doesNotMatch(JSON.stringify(hostile), new RegExp(secret));
});

test("reader rejects snapshots with unexpected shape, unknown commands, bad flag tokens or oversize text", () => {
  const good = JSON.parse(serializeSnapshot(snapshot()));
  const cases: unknown[] = [
    { ...good, schemaVersion: 2 },
    { ...good, commands: { ...good.commands, "evil command": { flags: [], retired: false } } },
    { ...good, commands: { ...good.commands, status: { flags: ["json\nrm"], retired: false } } },
    { ...good, commands: { ...good.commands, status: { flags: ["json"], retired: "no" } } },
    [],
  ];
  for (const bad of cases) assert.equal(parseSnapshot(JSON.stringify(bad)).ok, false);
  assert.equal(parseSnapshot("{").ok, false);
  assert.equal(parseSnapshot("x".repeat(CONTRACT_MAX_BYTES + 1)).ok, false);
});

test("one shared bound: the real 421 KB schema fits with headroom and the shared probe bound is unchanged", () => {
  assert.equal(MAX_OUTPUT_BYTES, 262144, "the shared bound stays at 256 KiB");
  assert.ok(CONTRACT_MAX_BYTES > 421069 * 2, "headroom over the captured 421,069-byte schema");
  const filler = Array.from({ length: 417 }, (_, index) => ({ command: `filler ${index}`, summary: "x".repeat(900), flags: ["json"] }));
  const text = live([...REAL, ...filler]);
  const size = new TextEncoder().encode(text).length;
  assert.ok(size > MAX_OUTPUT_BYTES && size < CONTRACT_MAX_BYTES, `padded schema is ${size} bytes`);
  assert.ok(buildSnapshot(text).ok);
});

function fake(run: (command: string, args: string[], options: Record<string, unknown>) => Promise<unknown>, files: Record<string, string> = {}): { deps: RuntimeDeps; calls: Array<{ command: string; args: string[]; options: Record<string, unknown> }> } {
  const calls: Array<{ command: string; args: string[]; options: Record<string, unknown> }> = [];
  const wrapped: RuntimeDeps = {
    ...deps,
    child: { ...deps.child, run: async (command, args, options) => { calls.push({ command, args, options: (options ?? {}) as Record<string, unknown> }); return run(command, args, (options ?? {}) as Record<string, unknown>) as never; } },
    fs: { ...deps.fs,
      statSync: (file) => (file in files ? { ...deps.fs.statSync(ROOT), isFile: () => true, size: files[file].length } : deps.fs.statSync(file)),
      readFileSync: (file) => (file in files ? files[file] : deps.fs.readFileSync(file)) },
  };
  return { deps: wrapped, calls };
}
const ok = (stdout: string) => ({ status: 0, signal: null, stdout, stderr: "" });

test("live read runs only agent-context --json under the shared bound; ENOENT is absent, failures are fixed reasons", async () => {
  const success = fake(async () => ok(live()));
  assert.deepEqual(await readLiveContract(success.deps, "orca", ROOT), { status: "ok", text: live() });
  assert.deepEqual(success.calls[0].args, ["agent-context", "--json"]);
  assert.equal(success.calls[0].options.maxBufferBytes, CONTRACT_MAX_BYTES);
  const absent = fake(async () => { throw Object.assign(new Error("spawn orca ENOENT SECRET"), { code: "ENOENT" }); });
  assert.deepEqual(await readLiveContract(absent.deps, "orca", ROOT), { status: "absent" });
  const overflow = await readLiveContract(fake(async () => ({ ...ok("x"), errorCode: "ENOBUFS" })).deps, "orca", ROOT);
  assert.deepEqual(overflow, { status: "failed", reason: "agent-context stopped: over the byte bound" });
  const failed = await readLiveContract(fake(async () => { throw new Error("boom SECRET"); }).deps, "orca", ROOT);
  assert.doesNotMatch(JSON.stringify(failed), /SECRET/);
  assert.equal((await readLiveContract(fake(async () => ({ ...ok(""), status: 2 })).deps, "orca", ROOT)).status, "failed");
});

test("orcaCommand honors only an absolute ORCA_CLI_COMMAND", () => {
  assert.equal(orcaCommand({ ORCA_CLI_COMMAND: "/opt/orca" }, deps), "/opt/orca");
  assert.equal(orcaCommand({ ORCA_CLI_COMMAND: "relative/orca" }, deps), "orca");
  assert.equal(orcaCommand({ ORCA_CLI_COMMAND: "/x\n/y" }, deps), "orca");
  assert.equal(orcaCommand({}, deps), "orca");
});

test("snapshot file read: missing, oversize, malformed and valid", () => {
  const file = deps.path.join(ROOT, SNAPSHOT_PATH);
  assert.equal(readSnapshotFile(fake(async () => ok("")).deps, "/nonexistent-root").status, "failed");
  assert.equal(readSnapshotFile(fake(async () => ok(""), { [file]: "{" }).deps, ROOT).status, "failed");
  assert.equal(readSnapshotFile(fake(async () => ok(""), { [file]: serializeSnapshot(snapshot()) }).deps, ROOT).status, "ok");
  const big = fake(async () => ok(""), { [file]: "x" });
  big.deps.fs.statSync = (path) => ({ ...deps.fs.statSync(ROOT), isFile: () => path === file, size: CONTRACT_MAX_BYTES + 1 });
  assert.deepEqual(readSnapshotFile(big.deps, ROOT), { status: "failed", reason: "snapshot over the byte bound" });
});

test("committed snapshot is valid and equals what the generator produces from the live CLI (skipped when orca is absent)", async (t) => {
  const committed = readSnapshotFile(deps, ROOT);
  assert.equal(committed.status, "ok", "committed snapshot parses");
  const result = await readLiveContract(deps, orcaCommand(deps.proc.env, deps), ROOT);
  if (result.status !== "ok") return t.skip(`orca unavailable: ${result.status}`);
  assert.ok(result.text.length < CONTRACT_MAX_BYTES / 2, "the real schema fits with headroom");
  const built = buildSnapshot(result.text);
  assert.ok(built.ok);
  assert.equal(serializeSnapshot(built.value), deps.fs.readFileSync(deps.path.join(ROOT, SNAPSHOT_PATH)));
});

test("offline used-contract check passes on the committed snapshot and names a missing flag, a missing command and a Retired command", () => {
  const read = readSnapshotFile(deps, ROOT);
  assert.equal(read.status, "ok");
  if (read.status !== "ok") return;
  assert.deepEqual(checkUsedAgainstSnapshot(read.snapshot), { ok: true, problems: [] });
  const clone = (): typeof read.snapshot => JSON.parse(JSON.stringify(read.snapshot));
  const noFlag = clone(); noFlag.commands["status"].flags = [];
  assert.match(checkUsedAgainstSnapshot(noFlag).problems.join(), /"status" lacks flag --json/);
  const noCommand = clone(); delete noCommand.commands["skills get"];
  assert.match(checkUsedAgainstSnapshot(noCommand).problems.join(), /"skills get" is missing/);
  const retired = clone(); retired.commands["status"].retired = true;
  assert.match(checkUsedAgainstSnapshot(retired).problems.join(), /"status" is marked Retired/);
});
