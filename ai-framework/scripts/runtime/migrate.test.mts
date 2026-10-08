import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createNodeDeps } from "./node.mts";
import { migrateInstanceEntries } from "./migrate.mts";

function write(root: string, relative: string, text: string): void {
  const file = join(root, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
function fixture(t: TestContext) {
  const temporary = realpathSync(mkdtempSync(join(tmpdir(), "instance-entry-migration-")));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "project"), source = join(temporary, "source");
  mkdirSync(root); mkdirSync(source);
  for (const relative of ["ai-framework/scripts/graphify.mts", "ai-framework/hooks/scripts/token-consumption.mts", ".claude/hooks/post-edit-check.mts", ".opencode/plugins/token-consumption.ts"]) write(source, relative, "export {};\n");
  const deps = createNodeDeps();
  return { root, source, deps };
}

const entry = "# Project\n\nKeep app-specific instructions.\nRun node ai-framework/scripts/graphify.js --check.\nLoad .opencode/plugins/token-consumption.js.\n";
const settings = {
  permissions: { allow: ["node app.js"], other: "ai-framework/scripts/graphify.js" },
  env: { CUSTOM: "instance owned" },
  hooks: { PostToolUse: [{ matcher: "Write|Edit", hooks: [
    { type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-check.js" --json', timeout: 10 },
    { type: "command", command: "node app.js", timeout: 42 },
    { type: "prompt", prompt: "Keep ai-framework/scripts/graphify.js in this prompt" },
  ] }] },
};

test("reports dry-run migrations without changing entry/config bytes or creating files", (t) => {
  const { root, source, deps } = fixture(t);
  write(root, "AGENTS.md", entry);
  write(root, ".claude/settings.json", JSON.stringify(settings));
  const before = readFileSync(join(root, ".claude/settings.json"), "utf8");
  const reports = migrateInstanceEntries(root, source, false, deps);
  assert.deepEqual(reports, [{ path: "AGENTS.md", status: "ready" }, { path: ".claude/settings.json", status: "ready" }]);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), entry);
  assert.equal(readFileSync(join(root, ".claude/settings.json"), "utf8"), before);
  assert.deepEqual(readdirSync(join(root, ".claude")), ["settings.json"]);
});

test("applies exact workflow references and hook commands while preserving project prose, extras and file mode", (t) => {
  const { root, source, deps } = fixture(t);
  write(root, "AGENTS.md", entry);
  write(root, "CLAUDE.md", "@AGENTS.md\n\nKeep custom context.\nnode ai-framework/scripts/graphify.js --check\n");
  write(root, ".claude/settings.json", JSON.stringify(settings));
  deps.fs.chmodSync(join(root, ".claude/settings.json"), 0o640);
  write(root, ".codex/hooks.json", JSON.stringify({ custom: 1, hooks: { SessionEnd: [{ hooks: [{ type: "command", command: "bun ai-framework/hooks/scripts/token-consumption.js --vendor codex" }] }] } }));
  const reports = migrateInstanceEntries(root, source, true, deps);
  assert.equal(reports.length, 4);
  assert.ok(reports.every((item) => item.status === "applied"));
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), entry.replace("graphify.js", "graphify.mts").replace("token-consumption.js", "token-consumption.ts"));
  assert.match(readFileSync(join(root, "CLAUDE.md"), "utf8"), /^@AGENTS\.md\n\nKeep custom context\./);
  const after = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
  assert.deepEqual(after.permissions, settings.permissions);
  assert.deepEqual(after.env, settings.env);
  const hooks = after.hooks.PostToolUse[0].hooks;
  assert.deepEqual(hooks.slice(1), settings.hooks.PostToolUse[0].hooks.slice(1));
  assert.equal(hooks[0].command, 'node --experimental-strip-types --disable-warning=ExperimentalWarning "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-check.mts" --json');
  assert.equal(hooks[0].timeout, 10);
  assert.equal(statSync(join(root, ".claude/settings.json")).mode & 0o777, 0o640);
  const codex = JSON.parse(readFileSync(join(root, ".codex/hooks.json"), "utf8"));
  assert.equal(codex.custom, 1);
  assert.equal(codex.hooks.SessionEnd[0].hooks[0].command, "bun ai-framework/hooks/scripts/token-consumption.mts --vendor codex");
  assert.deepEqual(migrateInstanceEntries(root, source, true, deps), []);
  assert.deepEqual(readdirSync(join(root, ".claude")), ["settings.json"]);
});

test("retains explicit Node flags without duplicating them", (t) => {
  const { root, source, deps } = fixture(t);
  write(root, ".codex/hooks.json", JSON.stringify({ hooks: [{ type: "command", command: "node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/graphify.js --check" }] }));
  assert.deepEqual(migrateInstanceEntries(root, source, true, deps), [{ path: ".codex/hooks.json", status: "applied" }]);
  assert.equal(JSON.parse(readFileSync(join(root, ".codex/hooks.json"), "utf8")).hooks[0].command, "node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/graphify.mts --check");
});

test("preserves malformed configuration and unsupported custom commands with actionable manual reports", (t) => {
  const { root, source, deps } = fixture(t);
  const broken = "{invalid INSTANCE-MARKER";
  write(root, ".claude/settings.json", broken);
  const custom = { hooks: [
    { type: "command", command: "bash -c 'node ai-framework/scripts/graphify.js --check'" },
    { type: "command", command: "node ai-framework/scripts/graphify.js --check && echo custom" },
  ] };
  const before = JSON.stringify(custom);
  write(root, ".codex/hooks.json", before);
  const reports = migrateInstanceEntries(root, source, true, deps);
  assert.deepEqual(reports.map(({ path, status }) => ({ path, status })), [{ path: ".claude/settings.json", status: "manual" }, { path: ".codex/hooks.json", status: "manual" }]);
  assert.equal(readFileSync(join(root, ".claude/settings.json"), "utf8"), broken);
  assert.equal(readFileSync(join(root, ".codex/hooks.json"), "utf8"), before);
  assert.doesNotMatch(JSON.stringify(reports), /INSTANCE-MARKER|bash -c|echo custom/);
});

test("preserves a custom hook beside an independently migratable command", (t) => {
  const { root, source, deps } = fixture(t);
  const custom = "sh wrapper ai-framework/scripts/graphify.js --check";
  write(root, ".claude/settings.json", JSON.stringify({ hooks: [{ type: "command", command: custom }, { type: "command", command: "node ai-framework/scripts/graphify.js --check" }] }));
  const reports = migrateInstanceEntries(root, source, true, deps);
  assert.deepEqual(reports.map((item) => item.status), ["manual", "applied"]);
  const after = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
  assert.equal(after.hooks[0].command, custom);
  assert.match(after.hooks[1].command, /graphify\.mts --check$/);
});

test("refuses missing replacement sources without changing entries", (t) => {
  const { root, source, deps } = fixture(t);
  const before = "node ai-framework/scripts/bundle-sync.js --apply\n";
  write(root, "AGENTS.md", before);
  const reports = migrateInstanceEntries(root, source, true, deps);
  assert.equal(reports[0].status, "manual");
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), before);
});

test("refuses symlinked instance files, ancestors and replacement sources", (t) => {
  const { root, source, deps } = fixture(t);
  write(root, "outside.md", entry);
  symlinkSync(join(root, "outside.md"), join(root, "AGENTS.md"));
  write(root, "outside/settings.json", JSON.stringify(settings));
  symlinkSync(join(root, "outside"), join(root, ".claude"));
  write(root, "CLAUDE.md", "node ai-framework/scripts/graphify.js --check\n");
  deps.fs.unlinkSync(join(source, "ai-framework/scripts/graphify.mts"));
  write(source, "outside.mts", "export {};\n");
  symlinkSync(join(source, "outside.mts"), join(source, "ai-framework/scripts/graphify.mts"));
  const reports = migrateInstanceEntries(root, source, true, deps);
  assert.equal(reports.length, 3);
  assert.ok(reports.every((item) => item.status === "manual"));
  assert.equal(readFileSync(join(root, "outside.md"), "utf8"), entry);
  assert.equal(readFileSync(join(root, "outside/settings.json"), "utf8"), JSON.stringify(settings));
});

for (const timing of ["before temporary write", "after temporary write"] as const) {
  test(`preserves concurrent instance edits ${timing} and cleans up owned temporary files`, (t) => {
    const { root, source, deps } = fixture(t);
    const destination = join(root, "AGENTS.md"), concurrent = "Concurrent user edit\n";
    writeFileSync(destination, entry);
    const base = deps.fs;
    let reads = 0;
    const raced = { ...deps, fs: { ...base,
      readFileSync(file: string): string {
        if (timing === "before temporary write" && file === destination && ++reads === 2) writeFileSync(destination, concurrent);
        return base.readFileSync(file);
      },
      writeFileSync: ((file, text, options) => {
        base.writeFileSync(file, text, options);
        if (timing === "after temporary write" && typeof file === "number") writeFileSync(destination, concurrent);
      }) as typeof base.writeFileSync,
    } };
    const reports = migrateInstanceEntries(root, source, true, raced);
    assert.equal(reports[0].status, "manual");
    assert.equal(readFileSync(destination, "utf8"), concurrent);
    assert.deepEqual(readdirSync(root), ["AGENTS.md"]);
  });
}

test("never reads settings.local.json or unknown script references", (t) => {
  const { root, source, deps } = fixture(t);
  const local = JSON.stringify(settings), unknown = "node ai-framework/scripts/custom.js --check\n";
  write(root, ".claude/settings.local.json", local);
  write(root, "AGENTS.md", unknown);
  const accessed: string[] = [];
  const tracked = { ...deps, fs: { ...deps.fs, readFileSync(file: string) { accessed.push(file); return deps.fs.readFileSync(file); } } };
  assert.deepEqual(migrateInstanceEntries(root, source, true, tracked), []);
  assert.equal(accessed.some((file) => file.endsWith("settings.local.json")), false);
  assert.equal(readFileSync(join(root, ".claude/settings.local.json"), "utf8"), local);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), unknown);
});

for (const command of [
  "node ./custom.js --input ai-framework/scripts/graphify.js",
  "node ai-framework/scripts/graphify.js.backup --check",
  "node prefix-ai-framework/scripts/graphify.js --check",
]) {
  test(`preserves custom executable command ${command}`, (t) => {
    const { root, source, deps } = fixture(t);
    const before = JSON.stringify({ hooks: [{ type: "command", command }] });
    write(root, ".claude/settings.json", before);
    const reports = migrateInstanceEntries(root, source, true, deps);
    assert.equal(reports[0].status, "manual");
    assert.equal(readFileSync(join(root, ".claude/settings.json"), "utf8"), before);
  });
}

test("changes only the executable operand and leaves workflow-like arguments intact", (t) => {
  const { root, source, deps } = fixture(t);
  write(root, ".claude/settings.json", JSON.stringify({ hooks: [{ type: "command", command: "node ai-framework/scripts/graphify.js --input ai-framework/scripts/graphify.js" }] }));
  assert.deepEqual(migrateInstanceEntries(root, source, true, deps), [{ path: ".claude/settings.json", status: "applied" }]);
  assert.equal(JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).hooks[0].command, "node --experimental-strip-types --disable-warning=ExperimentalWarning ai-framework/scripts/graphify.mts --input ai-framework/scripts/graphify.js");
});
