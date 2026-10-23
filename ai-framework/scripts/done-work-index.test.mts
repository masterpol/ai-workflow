import { describe, test } from "node:test";
import assert from "node:assert";
import { applyIndex, compactedSlugs, DONE_WORK_FILE, INDEX_END, INDEX_HEADING, INDEX_START, legacyEntries, main, MAX_DONE_WORK_BYTES, recordSlugs, renderBlock, scanRecords, writeIndex } from "./done-work-index.mts";
import { inventory } from "./pitch-compress.mts";
import { buildSnapshot } from "./state-snapshot.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";

const deps = createTestDeps();
const { fs, path } = deps;

const record = (slug: string, shipped: string, outcome = `Changed ${slug}.`): string => [
  "---", `slug: ${slug}`, `shipped: ${shipped}`, "schemaVersion: 1", "---", `# ${slug}`, "",
  `${slug} now works the new way.`, "Look in the docs for how.", "Nothing else changed.", "",
  `- outcome: ${outcome}`, "- docs: none", "- decisions: none", "- knowledge: none", "- code: none", "- verification: none", "- followups: none", "- archive: none", "",
].join("\n");
const LEGACY = "## alpha — shipped 2026-08-01\n\nAlpha shipped.\n\n## beta — shipped 2026-08-02\n\nBeta shipped, with `code`.\n\n";
const HEADER = "# Done Work\n\nCompact record.\n\n";

function withRoot(files: Record<string, string>, run: (root: string) => void): void {
  const root = tempFixture(deps, files);
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const read = (root: string): string => fs.readFileSync(path.join(root, DONE_WORK_FILE));
const entriesOf = (text: string): string => text.slice(text.search(/^## [a-z0-9-]+ — shipped /m));

describe("generated index", () => {
  test("a file without markers gets the block ahead of the first entry, entries stay byte-identical, and a second run is a no-op", () => {
    withRoot({ [DONE_WORK_FILE]: HEADER + LEGACY, ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      const first = writeIndex(root, deps, { apply: true });
      assert.strictEqual(first.changed, true);
      const text = read(root);
      assert.ok(text.startsWith(HEADER), "the header is untouched");
      assert.ok(text.includes(`${INDEX_HEADING}\n\n${INDEX_START}\n- [gamma](records/shipped/gamma.md) — shipped 2026-09-01 — Changed gamma.\n${INDEX_END}`));
      assert.strictEqual(entriesOf(text), LEGACY, "legacy entries are byte-identical");
      assert.strictEqual(writeIndex(root, deps, { apply: true }).changed, false, "regeneration is idempotent");
    });
  });

  test("with markers, only the text between them changes", () => {
    const block = `${INDEX_HEADING}\n\n${INDEX_START}\nstale line\n${INDEX_END}\n`;
    const original = `${HEADER}${block}\nhand-written note after the block\n\n${LEGACY}`;
    withRoot({ [DONE_WORK_FILE]: original, ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      writeIndex(root, deps, { apply: true });
      const text = read(root);
      assert.ok(!text.includes("stale line"));
      assert.strictEqual(text.slice(0, text.indexOf(INDEX_START)), original.slice(0, original.indexOf(INDEX_START)));
      assert.strictEqual(text.slice(text.indexOf(INDEX_END) + INDEX_END.length), original.slice(original.indexOf(INDEX_END) + INDEX_END.length));
    });
  });

  test("a file with no headings is appended to, and a missing file is created", () => {
    assert.strictEqual(applyIndex("just notes\n", []), `just notes\n\n${INDEX_HEADING}\n\n${renderBlock([])}\n`);
    withRoot({ ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      writeIndex(root, deps, { apply: true });
      assert.ok(read(root).startsWith("# Done Work\n"));
    });
  });

  test("damaged markers are refused, not repaired", () => {
    for (const text of [`${INDEX_START}\nx\n`, `${INDEX_START}\n${INDEX_START}\n${INDEX_END}\n`, `${INDEX_END}\n${INDEX_START}\n`]) {
      assert.throws(() => applyIndex(text, []), /damaged index markers|wrong order/);
    }
  });

  test("a symlinked done-work.md or .project is refused and its target left alone", () => {
    withRoot({ "outside.md": "# outside\n", ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      fs.symlinkSync(path.join(root, "outside.md"), path.join(root, DONE_WORK_FILE));
      assert.throws(() => writeIndex(root, deps, { apply: true }), /symlink or not a regular file/);
      assert.strictEqual(fs.readFileSync(path.join(root, "outside.md")), "# outside\n");
    });
    withRoot({ "elsewhere/done-work.md": "# elsewhere\n" }, (root) => {
      fs.symlinkSync(path.join(root, "elsewhere"), path.join(root, ".project"));
      assert.throws(() => writeIndex(root, deps, { apply: true }), /\.project is a symlink/);
      assert.strictEqual(fs.readFileSync(path.join(root, "elsewhere/done-work.md")), "# elsewhere\n");
    });
  });

  test("a record that fails the lint is left out and reported; template and non-slug files are ignored", () => {
    withRoot({
      ".project/records/shipped/good.md": record("good", "2026-09-01"),
      ".project/records/shipped/bad.md": "no frontmatter\n",
      ".project/records/shipped/_template.md": record("_template", "2026-09-01"),
      ".project/records/shipped/Not_A_Slug.md": record("x", "2026-09-01"),
    }, (root) => {
      assert.deepStrictEqual(recordSlugs(root, deps), ["bad", "good"]);
      const scan = scanRecords(root, deps);
      assert.deepStrictEqual(scan.records.map((r) => r.slug), ["good"]);
      assert.deepStrictEqual(scan.skipped.map((s) => s.slug), ["bad"]);
    });
  });

  test("the CLI is a dry run until --apply", () => {
    withRoot({ [DONE_WORK_FILE]: HEADER + LEGACY, ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      const run = (...args: string[]): { code: number; out: string } => {
        const out: string[] = [];
        const local = { ...deps, proc: { ...deps.proc, cwd: () => root }, io: { stdout: { write: (t: string) => { out.push(t); } }, stderr: { write: () => undefined } } } as typeof deps;
        return { code: main(args, local), out: out.join("") };
      };
      const dry = run();
      assert.strictEqual(dry.code, 0);
      assert.match(dry.out, /would change \(dry run; pass --apply\)/);
      assert.strictEqual(read(root), HEADER + LEGACY);
      assert.match(run("--apply").out, /written/);
      assert.match(run("--json").out, /"changed":false/);
    });
  });

  test("the 46 real legacy entries survive regeneration byte for byte", () => {
    const real = path.join(path.dirname(path.dirname(import.meta.dirname)), DONE_WORK_FILE);
    if (!fs.existsSync(real)) return;
    const text = fs.readFileSync(real);
    const before = entriesOf(text);
    const after = applyIndex(text, [{ slug: "gamma", shipped: "2026-09-01", outcome: "Changed gamma." }]);
    assert.strictEqual(entriesOf(after), before);
    assert.strictEqual(legacyEntries(after).size, legacyEntries(text).size);
  });
});

describe("one compacted row per slug (dual read)", () => {
  test("a record wins over a legacy entry, either alone counts, and each slug appears once", () => {
    withRoot({
      [DONE_WORK_FILE]: HEADER + LEGACY,
      ".project/records/shipped/beta.md": record("beta", "2026-09-05"),
      ".project/records/shipped/gamma.md": record("gamma", "2026-09-06"),
    }, (root) => {
      const map = compactedSlugs(root, deps);
      assert.deepStrictEqual([...map.keys()].sort(), ["alpha", "beta", "gamma"]);
      assert.deepStrictEqual(map.get("alpha"), { shipped: "2026-08-01", source: "legacy" });
      assert.deepStrictEqual(map.get("beta"), { shipped: "2026-09-05", source: "record" });
      assert.deepStrictEqual(map.get("gamma"), { shipped: "2026-09-06", source: "record" });
    });
  });

  test("pitch-compress inventory and the state snapshot count a record-only slug as compacted exactly once", () => {
    withRoot({
      [DONE_WORK_FILE]: HEADER + LEGACY,
      ".project/records/shipped/beta.md": record("beta", "2026-09-05"),
      ".project/records/shipped/gamma.md": record("gamma", "2026-09-06"),
    }, (root) => {
      const rows = inventory(root, deps).filter((row) => row.reason === "already compacted").map((row) => row.slug).sort();
      assert.deepStrictEqual(rows, ["alpha", "beta", "gamma"]);
      const snapshot = buildSnapshot(root, { now: "2026-10-22T12:00:00.000Z" }) as unknown as { pitches: { items: { value: { slug: string; phase: string; shipped: string } }[] }; doneWork: { value: { compacted: number; entries: { slug: string }[] } } };
      const compacted = snapshot.pitches.items.map((item) => item.value).filter((item) => item.phase === "compacted");
      assert.deepStrictEqual(compacted.map((item) => item.slug).sort(), ["alpha", "beta", "gamma"]);
      assert.strictEqual(compacted.find((item) => item.slug === "beta")?.shipped, "2026-09-05", "the record's date wins");
      assert.strictEqual(snapshot.doneWork.value.compacted, 3);
      assert.deepStrictEqual(snapshot.doneWork.value.entries.map((entry) => entry.slug).sort(), ["alpha", "beta", "gamma"]);
    });
  });

  test("a record is found even when done-work.md is past the read limit", () => {
    withRoot({ [DONE_WORK_FILE]: `${HEADER}${"<!-- pad -->\n".repeat(8000)}${LEGACY}`, ".project/records/shipped/gamma.md": record("gamma", "2026-09-06") }, (root) => {
      const snapshot = buildSnapshot(root, { now: "2026-10-22T12:00:00.000Z" }) as unknown as { pitches: { items: { value: { slug: string; phase: string } }[] } };
      assert.ok(snapshot.pitches.items.map((item) => item.value).some((item) => item.slug === "gamma" && item.phase === "compacted"));
    });
  });
});

describe("no-go: nothing here reads recovery archives", () => {
  test("the outcome-record, done-work-index and ledger-schema sources never name the archive folder", () => {
    for (const name of ["outcome-record.mts", "done-work-index.mts", "ledger-schema.mts"]) {
      const text = fs.readFileSync(path.join(import.meta.dirname, name));
      assert.ok(!text.includes("compaction/archives"), `${name} must not read compaction archives`);
    }
  });
});

describe("audit cycle 1: marker injection, symlinks, bounds and output safety", () => {
  test("an outcome carrying the index end marker cannot damage the block, and regeneration still works the next time", () => {
    const hostile = record("evil", "2026-10-01").replace("- outcome: Changed evil.", "- outcome: done <!-- done-work-index:end --> tail");
    withRoot({ [DONE_WORK_FILE]: HEADER + LEGACY, ".project/records/shipped/evil.md": hostile }, (root) => {
      writeIndex(root, deps, { apply: true });
      const once = read(root);
      assert.strictEqual(once.split(INDEX_END).length - 1, 1, "exactly one end marker");
      assert.strictEqual(once.split(INDEX_START).length - 1, 1);
      assert.strictEqual(writeIndex(root, deps, { apply: true }).changed, false);
    });
    assert.ok(!renderBlock([{ slug: "x", shipped: "2026-10-01", outcome: "a <!-- b --> c\nd\u001b[2J" }]).slice(INDEX_START.length, -INDEX_END.length).match(/<!--|-->|[\u0000-\u0009\u000b-\u001f]/));
  });

  test("a symlinked records folder yields no slugs, and an oversize done-work.md is refused instead of read", () => {
    withRoot({ "elsewhere/shipped/gamma.md": record("gamma", "2026-09-01"), ".project/keep": "" }, (root) => {
      fs.symlinkSync(path.join(root, "elsewhere"), path.join(root, ".project/records"));
      assert.deepStrictEqual(recordSlugs(root, deps), []);
    });
    withRoot({ [DONE_WORK_FILE]: "x".repeat(MAX_DONE_WORK_BYTES + 1), ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      assert.throws(() => writeIndex(root, deps, { apply: true }), /is larger than/);
    });
  });

  test("the shipped date is read from the first bytes only, so a record with a huge body still yields it", () => {
    withRoot({ ".project/records/shipped/big.md": record("big", "2026-09-07") + "x".repeat(2_000_000) }, (root) => {
      assert.strictEqual(compactedSlugs(root, deps, "").get("big")?.shipped, "2026-09-07");
    });
  });

  test("the index lists records newest first, ties broken by slug", () => {
    const block = renderBlock([
      { slug: "b", shipped: "2026-01-01", outcome: "o" }, { slug: "a", shipped: "2026-01-01", outcome: "o" }, { slug: "c", shipped: "2026-02-01", outcome: "o" },
    ]);
    assert.deepStrictEqual(block.split("\n").filter((line) => line.startsWith("- [")).map((line) => line.slice(3, 4)), ["c", "a", "b"]);
  });

  test("the CLI prints an error code and a fixed message, never the absolute path of a failed write", () => {
    withRoot({ [DONE_WORK_FILE]: HEADER, ".project/records/shipped/gamma.md": record("gamma", "2026-09-01") }, (root) => {
      fs.chmodSync(path.join(root, ".project"), 0o500);
      try {
        const err: string[] = [];
        const local = { ...deps, proc: { ...deps.proc, cwd: () => root }, io: { stdout: { write: () => undefined }, stderr: { write: (t: string) => { err.push(t); } } } } as typeof deps;
        assert.strictEqual(main(["--apply"], local), 1);
        assert.ok(!err.join("").includes(root), "no absolute path in the message");
        assert.match(err.join(""), /^done-work-index: file system error \(E[A-Z]+\)\n$/);
      } finally { fs.chmodSync(path.join(root, ".project"), 0o700); }
    });
  });
});

describe("audit cycle 2: markers cannot be rebuilt from fragments", () => {
  test("a nested-fragment outcome that a single-pass strip would turn into an end marker leaves exactly one marker, run after run", () => {
    const hostile = record("evil", "2026-10-01").replace("- outcome: Changed evil.", "- outcome: <!<!-<!--c-->--- done-work-index:end ---->>");
    withRoot({ [DONE_WORK_FILE]: HEADER + LEGACY, ".project/records/shipped/evil.md": hostile }, (root) => {
      writeIndex(root, deps, { apply: true });
      assert.strictEqual(read(root).split(INDEX_END).length - 1, 1);
      assert.strictEqual(writeIndex(root, deps, { apply: true }).changed, false);
      assert.ok(!/[<>]/.test(read(root).slice(read(root).indexOf(INDEX_START) + INDEX_START.length, read(root).indexOf(INDEX_END)).replace(/\n- \[evil\]\(records\/shipped\/evil\.md\)/, "")), "no angle bracket survives inside the block");
    });
  });
});
