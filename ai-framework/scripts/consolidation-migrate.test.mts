import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate, main, legacyInventory, MAX_TEMPLATE_BYTES, MAX_MIGRATION_FILES, PREVIOUS_TEMPLATE_HASHES } from "./consolidation-migrate.mts";
import { DONE_WORK_FILE, INDEX_START, INDEX_END, MAX_DONE_WORK_BYTES } from "./done-work-index.mts";
import { MAX_LEDGER_BYTES } from "./ledger-schema.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

const base = createTestDeps();
const template = (name: string): string => base.fs.readFileSync(base.path.join(import.meta.dirname, "../templates/project", name));
const decision = template("knowledge/templates/decision.md");
const readme = template("knowledge/README.md");
// Reconstruct the two immutable b26b45b fixtures, asserting their independently pinned hashes below.
const oldDecision = decision.replace("status: accepted\n", "").replace(/^# (?:supersedes|superseded_by|alternatives|applies-to):.*\n/gm, "")
  .replace("source: feature-name", "source: ADR-XXX | feature-name")
  .replace("- Related code or documents: `path/to/relevant/code`", "- Link to ADR: `.project/design/decisions/ADR-XXX.md`\n- Related code: `path/to/relevant/code`");
const oldReadme = readme.replace(/^Technical decisions.*$/m, "Technical decisions that affect multiple features. Extracted from ADRs but indexed for quick search.")
  .replace("source: feature-name | manual", "source: ADR-XXX | feature-name | manual");
const legacy = "## alpha — shipped 2026-09-25\n\nExisting narrative.\n";
const ledger = JSON.stringify({ schemaVersion: 1, slug: "alpha", sections: [{ source: "log.md#one", status: "extracted", destination: ".project/knowledge/decisions/alpha.md" }] });
const fixture = {
  "ai-framework/templates/project/knowledge/templates/decision.md": decision,
  "ai-framework/templates/project/knowledge/README.md": readme,
  ".project/knowledge/templates/decision.md": oldDecision,
  ".project/knowledge/README.md": oldReadme,
  [DONE_WORK_FILE]: `# Local header\n\nKeep exactly.\n\n${legacy}`,
  ".project/compaction/ledgers/alpha.json": ledger,
  ".project/knowledge/decisions/alpha.md": "---\nid: alpha\ntype: decision\n---\n# Alpha\n",
};
function run(files: Record<string, string>, action: (root: string) => void): void {
  const root = tempFixture(base, { ...fixture, ...files });
  try { action(root); } finally { base.fs.rmSync(root, { recursive: true, force: true }); }
}
const read = (root: string, relative: string): string => base.fs.readFileSync(base.path.join(root, relative));
const exists = (root: string, relative: string): boolean => base.fs.existsSync(base.path.join(root, relative));

test("counts legacy pitches once across ledgers and entries, excluding preserved v1 siblings", () => run({}, root => {
  base.fs.writeFileSync(base.path.join(root, ".project/compaction/ledgers/alpha.v1.json"), ledger);
  base.fs.writeFileSync(base.path.join(root, DONE_WORK_FILE), `# Header\n\n${legacy}\n## beta — shipped 2026-09-26\n\nAnother entry.\n`);
  const { pitches, legacy: counts } = legacyInventory(root, base);
  assert.equal(pitches, 2);
  assert.deepEqual(counts, { ledgers: 1, entries: 2, decisions: 1 });
}));
function tree(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of base.fs.readdirEntriesSync(base.path.join(root, dir))) {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(relative);
      else result[relative] = read(root, relative);
    }
  };
  walk(".project");
  return result;
}

test("plans without writing, then applies once and preserves all legacy bytes", () => run({}, root => {
  assert.ok(PREVIOUS_TEMPLATE_HASHES["knowledge/README.md"].includes(base.crypto.sha256Hex(oldReadme)));
  assert.ok(PREVIOUS_TEMPLATE_HASHES["knowledge/templates/decision.md"].includes(base.crypto.sha256Hex(oldDecision)));
  const before = tree(root);
  const dry = migrate(root, base);
  assert.deepEqual(tree(root), before);
  assert.equal(exists(root, ".project/records"), false);
  assert.deepEqual(dry.legacy, { ledgers: 1, entries: 1, decisions: 1 });
  assert.equal(dry.steps.filter(step => step.status === "refresh").length, 3);
  const applied = migrate(root, base, { apply: true });
  assert.equal(applied.applied, true);
  assert.ok(exists(root, ".project/records/shipped"));
  assert.equal(read(root, ".project/knowledge/templates/decision.md"), decision);
  assert.equal(read(root, ".project/knowledge/README.md"), readme);
  assert.equal(read(root, ".project/compaction/ledgers/alpha.json"), ledger);
  assert.equal(read(root, ".project/knowledge/decisions/alpha.md"), before[".project/knowledge/decisions/alpha.md"]);
  const text = read(root, DONE_WORK_FILE);
  assert.ok(text.startsWith("# Local header\n\nKeep exactly.\n\n"));
  assert.equal(text.slice(text.indexOf("## alpha")), legacy);
  assert.equal(text.split(INDEX_START).length, 2);
  const snapshot = tree(root);
  assert.ok(migrate(root, base, { apply: true }).steps.every(step => ["unchanged", "report"].includes(step.status)));
  assert.deepEqual(tree(root), snapshot);
}));

test("preserves local templates and prints a comparison instead of overwriting", () => run({ ".project/knowledge/README.md": "# Customized\n" }, root => {
  const result = migrate(root, base, { apply: true });
  const local = result.steps.find(step => step.status === "local");
  assert.equal(local?.path, ".project/knowledge/README.md");
  assert.match(local?.diff ?? "", /-# Customized/);
  assert.match(local?.diff ?? "", /\+# Knowledge Graph/);
  assert.equal(read(root, ".project/knowledge/README.md"), "# Customized\n");
}));

test("creates missing templates and done-work while retaining an existing outcome directory", () => run({}, root => {
  for (const relative of [".project/knowledge/README.md", ".project/knowledge/templates/decision.md", DONE_WORK_FILE]) base.fs.unlinkSync(base.path.join(root, relative));
  base.fs.mkdirSync(base.path.join(root, ".project/records/shipped"), { recursive: true });
  base.fs.writeFileSync(base.path.join(root, ".project/records/shipped/keep.md"), "keep");
  migrate(root, base, { apply: true });
  assert.equal(read(root, ".project/records/shipped/keep.md"), "keep");
  assert.equal(read(root, ".project/knowledge/README.md"), readme);
  assert.ok(read(root, DONE_WORK_FILE).includes(INDEX_START));
}));

test("keeps an existing generated index exactly as written", () => run({ [DONE_WORK_FILE]: `# Mine\n\n${INDEX_START}\n- an existing record\n${INDEX_END}\n\n${legacy}` }, root => {
  const before = read(root, DONE_WORK_FILE);
  migrate(root, base, { apply: true });
  assert.equal(read(root, DONE_WORK_FILE), before);
}));

for (const markers of [INDEX_START, `${INDEX_END}\n${INDEX_START}`, `${INDEX_START}\n${INDEX_START}\n${INDEX_END}\n${INDEX_END}`]) {
  test("refuses damaged markers before any scaffold write: " + markers.length, () => run({ [DONE_WORK_FILE]: `# Mine\n${markers}` }, root => {
    assert.throws(() => migrate(root, base, { apply: true }), /markers/);
    assert.equal(exists(root, ".project/records"), false);
    assert.equal(read(root, ".project/knowledge/README.md"), oldReadme);
  }));
}

for (const relative of [".project", ".project/knowledge", ".project/records", ".project/knowledge/README.md", DONE_WORK_FILE]) {
  test(`refuses a symlink at ${relative} without modifying its target`, () => run({}, root => {
    const target = tempFixture(base, { "keep": "untouched" });
    try {
      base.fs.rmSync(base.path.join(root, relative), { recursive: true, force: true });
      base.fs.symlinkSync(target, base.path.join(root, relative));
      assert.throws(() => migrate(root, base, { apply: true }), /symlink/);
      assert.equal(read(target, "keep"), "untouched");
      assert.deepEqual(base.fs.readdirSync(target), ["keep"]);
    } finally { base.fs.rmSync(target, { recursive: true, force: true }); }
  }));
}

for (const [relative, size] of [[".project/knowledge/README.md", MAX_TEMPLATE_BYTES], [DONE_WORK_FILE, MAX_DONE_WORK_BYTES], [".project/compaction/ledgers/alpha.json", MAX_LEDGER_BYTES]] as const) {
  test(`refuses oversized ${relative} before writing`, () => run({ [relative]: "x".repeat(size + 1) }, root => {
    assert.throws(() => migrate(root, base, { apply: true }), /bounded/);
    assert.equal(exists(root, ".project/records"), false);
  }));
}

test("refuses an unknown future ledger version without attempting a repair", () => run({ ".project/compaction/ledgers/alpha.json": ledger.replace('"schemaVersion":1', '"schemaVersion":3') }, root => {
  const before = tree(root);
  assert.throws(() => migrate(root, base, { apply: true }), /unsupported ledger schemaVersion 3/);
  assert.deepEqual(tree(root), before);
}));

test("refuses nonregular files without opening a FIFO", { skip: base.proc.platform === "win32" ? "mkfifo is a POSIX probe" : false }, () => run({}, root => {
  const file = base.path.join(root, ".project/knowledge/README.md");
  base.fs.unlinkSync(file);
  const result = base.child.runSync("mkfifo", [file], { timeoutMs: 1000 });
  assert.equal(result.status, 0);
  let opened = false;
  const deps = { ...base, fs: { ...base.fs, openSync: (name: string, flags: string | number, mode?: number): number => {
    if (name === file) { opened = true; throw new Error("FIFO opened"); }
    return base.fs.openSync(name, flags, mode);
  } } };
  assert.throws(() => migrate(root, deps, { apply: true }), /bounded/);
  assert.equal(opened, false);
}));

test("refuses hard-linked templates without modifying either name", () => run({}, root => {
  const target = base.path.join(root, ".project/knowledge/README.md");
  base.fs.linkSync(target, base.path.join(root, "linked-readme"));
  assert.throws(() => migrate(root, base, { apply: true }), /bounded/);
  assert.equal(read(root, "linked-readme"), oldReadme);
  assert.equal(exists(root, ".project/records"), false);
}));

for (let stop = 1; stop <= 4; stop++) {
  test(`resumes idempotently after interruption at publication ${stop}`, () => run({}, root => {
    let calls = 0;
    const deps = { ...base, fs: { ...base.fs, renameSync: (from: string, to: string): void => {
      base.fs.renameSync(from, to);
      if (++calls === stop) throw new Error("simulated interruption");
    }, mkdirSync: (dir: string, options?: { recursive?: boolean; mode?: number }): void => {
      base.fs.mkdirSync(dir, options);
      if (dir.endsWith("/records/shipped") && ++calls === stop) throw new Error("simulated interruption");
    } } };
    assert.throws(() => migrate(root, deps, { apply: true }), /simulated interruption/);
    migrate(root, base, { apply: true });
    assert.equal(read(root, DONE_WORK_FILE).split(INDEX_START).length, 2);
    assert.equal(read(root, DONE_WORK_FILE).slice(read(root, DONE_WORK_FILE).indexOf("## alpha")), legacy);
    assert.equal(read(root, ".project/knowledge/templates/decision.md"), decision);
    assert.ok(migrate(root, base, { apply: true }).steps.every(step => ["unchanged", "report"].includes(step.status)));
  }));
}

test("refuses bounded-directory overflow and file changes between inspection and open", () => run({}, root => {
  const many = { ...base, fs: { ...base.fs, readdirSync: (): string[] => Array(MAX_MIGRATION_FILES + 1).fill("x") } };
  assert.throws(() => migrate(root, many), /Too many files/);
  const swapped = { ...base, fs: { ...base.fs, fstatSync: (fd: number) => Object.assign(base.fs.fstatSync(fd), { ino: -1 }) } };
  assert.throws(() => migrate(root, swapped), /changed while opening/);
}));

test("reports dry-run mode, JSON and refusals through the CLI", () => run({}, root => {
  let out = "", err = "";
  const deps: RuntimeDeps = { ...base, proc: { ...base.proc, cwd: () => root }, io: { ...base.io,
    stdout: { ...base.io.stdout, write: text => { out += text; } }, stderr: { ...base.io.stderr, write: text => { err += text; } } } };
  assert.equal(main([], deps), 0);
  assert.match(out, /dry run; pass --apply/);
  out = "";
  assert.equal(main(["--apply", "--json"], deps), 0);
  assert.equal(JSON.parse(out).applied, true);
  assert.equal(main(["--unknown"], deps), 1);
  assert.match(err, /Usage:/);
}));

test("preserves every byte of a hand-edited header with no entries", () => run({ [DONE_WORK_FILE]: "# My header\n\n  trailing spaces   \n\n\n" }, root => {
  const before = read(root, DONE_WORK_FILE);
  migrate(root, base, { apply: true });
  assert.ok(read(root, DONE_WORK_FILE).startsWith(before));
}));

test("refuses insertion that would exceed the reader's own bound", () => run({ [DONE_WORK_FILE]: "x".repeat(MAX_DONE_WORK_BYTES) }, root => {
  assert.throws(() => migrate(root, base, { apply: true }), /insertion exceeds/);
  assert.equal(exists(root, ".project/records"), false);
}));

test("refuses missing bundle templates, malformed ledgers and absent project roots", () => run({}, root => {
  const source = base.path.join(root, "ai-framework/templates/project/knowledge/README.md");
  base.fs.unlinkSync(source);
  assert.throws(() => migrate(root, base, { apply: true }), /Sync the bundle first/);
  base.fs.writeFileSync(source, readme);
  base.fs.writeFileSync(base.path.join(root, ".project/compaction/ledgers/alpha.json"), "{");
  assert.throws(() => migrate(root, base, { apply: true }), /Invalid ledger JSON/);
  base.fs.rmSync(base.path.join(root, ".project"), { recursive: true });
  assert.throws(() => migrate(root, base), /installed project root/);
}));

test("refuses a concurrent local template change instead of overwriting it", () => run({}, root => {
  const target = base.path.join(root, ".project/knowledge/README.md");
  const deps = { ...base, fs: { ...base.fs, writeFileSync: (file: string | number, content: string | Uint8Array, options?: { flag?: string; mode?: number }): void => {
    base.fs.writeFileSync(file, content, options);
    if (typeof file === "string" && file.startsWith(`${target}.migration-`)) base.fs.writeFileSync(target, "concurrent local edit");
  } } };
  assert.throws(() => migrate(root, deps, { apply: true }), /Conflict before publication/);
  assert.equal(read(root, ".project/knowledge/README.md"), "concurrent local edit");
  migrate(root, base, { apply: true });
  assert.equal(read(root, ".project/knowledge/README.md"), "concurrent local edit");
  assert.equal(base.fs.readdirSync(base.path.dirname(target)).some(name => name.includes(".migration-")), false);
}));

test("never opens archives or executes project code and never writes outside .project", () => run({}, root => {
  const deps = { ...base, child: { ...base.child, runSync: (): never => { throw new Error("project code executed"); } }, fs: {
    ...base.fs,
    openSync: (file: string, flags: string | number, mode?: number): number => {
      assert.ok(!file.includes("compaction/archives"));
      return base.fs.openSync(file, flags, mode);
    },
    writeFileSync: (file: string | number, text: string | Uint8Array, options?: { flag?: string; mode?: number }): void => {
      assert.ok(typeof file === "string" && file.startsWith(`${root}/.project/`));
      base.fs.writeFileSync(file, text, options);
    },
  } };
  migrate(root, deps, { apply: true });
}));

test("refuses migration while a compaction transaction owns the records", () => run({ ".project/compaction/transaction.json": "{}" }, root => {
  const before = tree(root);
  assert.throws(() => migrate(root, base, { apply: true }), /Interrupted transaction/);
  assert.deepEqual(tree(root), before);
}));
