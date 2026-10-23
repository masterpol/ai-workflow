import { describe, test } from "node:test";
import assert from "node:assert";
import { lintOutcomeRecord, main, outcomeFields, printable, MAX_LINE_LENGTH, MAX_LINKS_PER_FIELD, MAX_PROSE_LINES, MAX_RECORD_BYTES, MIN_PROSE_LINES, OUTCOME_DIR, OUTCOME_FIELDS, OUTCOME_SCHEMA_VERSION } from "./outcome-record.mts";
import { createTestDeps, tempFixture } from "./runtime/test-helpers.mts";

const deps = createTestDeps();
const { fs } = deps;
const SLUG = "demo";
const REL = `${OUTCOME_DIR}/${SLUG}.md`;
const PROSE = ["Shipped the demo change for agents.", "Read the guide first.", "Decisions are in the ADR."];
const TARGETS: Record<string, string> = { "docs/a.md": "# a\n", "docs/b.md": "# b\n", ".project/pitches/_followups.md": "x\n", ".project/pitches/other/pitch.md": "x\n", [`.project/pitches/${SLUG}/pitch.md`]: "x\n" };

interface Opts { slug?: string; shipped?: string; version?: string; prose?: string[]; fields?: Array<[string, string]>; heading?: string; extra?: string; frontmatter?: string }
function record(o: Opts = {}): string {
  const slug = o.slug ?? SLUG;
  const fields = o.fields ?? OUTCOME_FIELDS.map((name): [string, string] => [name, name === "outcome" ? "Demo outcome." : name === "docs" ? "[guide](docs/a.md#top), [b](docs/b.md)" : "none"]);
  const front = o.frontmatter ?? `---\nslug: ${slug}\nshipped: ${o.shipped ?? "2026-10-22"}\nschemaVersion: ${o.version ?? "1"}\n---\n`;
  return `${front}${o.heading ?? `# ${slug}`}\n\n${(o.prose ?? PROSE).join("\n")}\n\n${fields.map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n${o.extra ?? ""}`;
}
function lint(content: string | null, check: (problems: string[]) => void, files: Record<string, string> = {}, rel = REL): void {
  const all = { ...TARGETS, ...files, ...(content === null ? {} : { [rel]: content }) };
  const root = tempFixture(deps, all);
  try { check(lintOutcomeRecord(root, rel, deps).problems); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const has = (problems: string[], text: string): boolean => problems.some((p) => p.includes(text));
const withField = (name: string, value: string): Array<[string, string]> => OUTCOME_FIELDS.map((n): [string, string] => [n, n === name ? value : n === "outcome" ? "o" : "none"]);

describe("constants", () => {
  test("shape", () => {
    assert.strictEqual(OUTCOME_SCHEMA_VERSION, 1);
    assert.strictEqual(OUTCOME_FIELDS.length, 8);
    assert.ok(MIN_PROSE_LINES <= MAX_PROSE_LINES);
  });
});

describe("lintOutcomeRecord", () => {
  test("a conforming record passes", () => lint(record(), (p) => assert.deepStrictEqual(p, [])));
  test("missing file", () => lint(null, (p) => assert.ok(has(p, "missing"))));
  test("directory is not a regular file", () => lint(null, (p) => assert.ok(has(p, "not a regular file")), { [`${OUTCOME_DIR}/dir/f.md`]: "x" }, `${OUTCOME_DIR}/dir`));
  test("symlink refused", () => {
    const root = tempFixture(deps, { ...TARGETS, "real.md": record() });
    try {
      fs.mkdirSync(`${root}/${OUTCOME_DIR}`, { recursive: true });
      fs.symlinkSync(`${root}/real.md`, `${root}/${REL}`);
      assert.ok(has(lintOutcomeRecord(root, REL, deps).problems, "symlink"));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  test("oversize refused", () => lint(record() + "x".repeat(MAX_RECORD_BYTES), (p) => assert.ok(has(p, `larger than ${MAX_RECORD_BYTES}`))));
  test("path outside root refused", () => lint(null, (p) => assert.ok(has(p, "outside the project root")), {}, "../x.md"));
  test("frontmatter missing", () => lint(record({ frontmatter: "" }), (p) => assert.ok(has(p, "frontmatter is missing"))));
  test("frontmatter unclosed", () => lint(record({ frontmatter: "---\nslug: demo\n" }), (p) => assert.ok(has(p, "no closing"))));
  test("frontmatter malformed", () => lint(record({ frontmatter: "---\nslug: demo\nnonsense\n---\n" }), (p) => assert.ok(has(p, "malformed"))));
  test("slug must equal file stem", () => lint(record({ slug: "other", heading: "# other" }), (p) => assert.ok(has(p, "does not equal the file name stem"))));
  test("bad shipped date", () => {
    lint(record({ shipped: "2026-13-40" }), (p) => assert.ok(has(p, "shipped is not a valid")));
    lint(record({ shipped: "soon" }), (p) => assert.ok(has(p, "shipped is not a valid")));
  });
  test("schemaVersion must be 1", () => lint(record({ version: "2" }), (p) => assert.ok(has(p, "schemaVersion must be 1"))));
  test("wrong heading", () => lint(record({ heading: "# nope" }), (p) => assert.ok(has(p, `"# ${SLUG}"`))));
  test("deeper heading restates a section", () => lint(record({ extra: "", prose: [...PROSE, "## Summary"] }), (p) => assert.ok(has(p, "a heading that restates a section"))));
  test("too few prose lines", () => lint(record({ prose: PROSE.slice(0, MIN_PROSE_LINES - 1) }), (p) => assert.ok(has(p, "need at least"))));
  test("too many prose lines", () => lint(record({ prose: Array(MAX_PROSE_LINES + 1).fill("line") }), (p) => assert.ok(has(p, "at most 6 allowed") || has(p, `at most ${MAX_PROSE_LINES}`))));
  test("prose line too long", () => lint(record({ prose: ["x".repeat(MAX_LINE_LENGTH + 1), "b", "c"] }), (p) => assert.ok(has(p, "prose line 1"))));
  test("html comments are not prose", () => lint(record({ prose: [...PROSE, "<!-- one", "two -->", "<!-- single -->"] }), (p) => assert.deepStrictEqual(p, [])));
  test("missing field", () => lint(record({ fields: withField("docs", "none").filter(([n]) => n !== "code") }), (p) => assert.ok(has(p, "field is missing: code"))));
  test("duplicated field", () => lint(record({ fields: [...withField("docs", "none"), ["docs", "none"]] }), (p) => assert.ok(has(p, "field is duplicated: docs"))));
  test("out-of-order fields", () => {
    const f = withField("docs", "none");
    [f[1], f[2]] = [f[2] as [string, string], f[1] as [string, string]];
    lint(record({ fields: f }), (p) => assert.ok(has(p, "out of order")));
  });
  test("unknown field", () => lint(record({ fields: [...withField("docs", "none"), ["bonus", "none"]] }), (p) => assert.ok(has(p, "unknown field: bonus"))));
  test("outcome longer than the line limit", () => lint(record({ fields: withField("outcome", "x".repeat(MAX_LINE_LENGTH + 1)) }), (p) => assert.ok(has(p, "outcome is"))));
  test("link-field lines may exceed the line limit via links", () => {
    const value = Array.from({ length: MAX_LINKS_PER_FIELD }, () => "[a-long-label-for-the-doc](docs/a.md)").join(", ");
    assert.ok(value.length > MAX_LINE_LENGTH);
    lint(record({ fields: withField("docs", value) }), (p) => assert.deepStrictEqual(p, []));
  });
  test("too many links", () => lint(record({ fields: withField("docs", Array(MAX_LINKS_PER_FIELD + 1).fill("[a](docs/a.md)").join(", ")) }), (p) => assert.ok(has(p, `at most ${MAX_LINKS_PER_FIELD}`))));
  test("field value neither none nor links", () => {
    lint(record({ fields: withField("docs", "see the docs") }), (p) => assert.ok(has(p, 'must be "none"')));
    lint(record({ fields: withField("docs", "[a](docs/a.md) trailing") }), (p) => assert.ok(has(p, 'must be "none"')));
  });
  test("bad link targets", () => {
    const bad: Array<[string, string]> = [["/etc/passwd", "absolute"], ["docs/../docs/a.md", '".."'], ["docs\\a.md", "backslash"], ["https://x.io/a.md", "URL scheme"], ["mailto:a@b.c", "URL scheme"], ["docs/missing.md", "not an existing regular file"], ["docs", "not an existing regular file"], ["docs/a%00.md", "not an existing regular file"]];
    for (const [target, text] of bad) lint(record({ fields: withField("docs", `[x](${target})`) }), (p) => assert.ok(has(p, text), `${target}: ${p.join("|")}`));
  });
  test("NUL link target", () => lint(record({ fields: withField("docs", "[x](docs/a\0.md)") }), (p) => assert.ok(has(p, "NUL"))));
  test("symlinked link target refused", () => {
    const root = tempFixture(deps, { ...TARGETS, [REL]: record({ fields: withField("docs", "[x](docs/link.md)") }) });
    try {
      fs.symlinkSync(`${root}/docs/a.md`, `${root}/docs/link.md`);
      assert.ok(has(lintOutcomeRecord(root, REL, deps).problems, "not an existing regular file"));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  test("own pitch folder refused, followups and other pitches allowed", () => {
    lint(record({ fields: withField("docs", `[p](.project/pitches/${SLUG}/pitch.md)`) }), (p) => assert.ok(has(p, "own pitch folder")));
    lint(record({ fields: withField("followups", "[f](.project/pitches/_followups.md#x), [o](.project/pitches/other/pitch.md)") }), (p) => assert.deepStrictEqual(p, []));
  });
  test("link to the record itself refused", () => lint(record({ fields: withField("docs", `[me](${REL})`) }), (p) => assert.ok(has(p, "the record itself"))));
  test("never throws on a broken fixture", () => {
    const result = lintOutcomeRecord("/nonexistent-root-xyz", REL, deps);
    assert.ok(result.problems.length > 0);
  });
});

describe("size cap", () => {
  test("is the same constant for a small and a big-batch fixture", () => {
    const small = record();
    const big = record({ prose: Array(MAX_PROSE_LINES).fill("p".repeat(MAX_LINE_LENGTH)) });
    const huge = small + "y".repeat(MAX_RECORD_BYTES);
    lint(small, (p) => assert.deepStrictEqual(p, []));
    lint(big, (p) => assert.ok(!has(p, "larger than")));
    for (const content of [small, big]) lint(content + "z".repeat(MAX_RECORD_BYTES), (p) => assert.ok(has(p, `larger than ${MAX_RECORD_BYTES}`)));
    lint(huge, (p) => assert.ok(has(p, `larger than ${MAX_RECORD_BYTES}`)));
  });

  test("max links in every link field fits within the cap", () => {
    const files: Record<string, string> = {};
    const links = Array.from({ length: MAX_LINKS_PER_FIELD }, (_, i) => { files[`d/${i}.md`] = "x\n"; return `[${i}](d/${i}.md)`; }).join(", ");
    const fields = OUTCOME_FIELDS.map((n): [string, string] => [n, n === "outcome" ? "o" : links]);
    const content = record({ fields, prose: PROSE });
    const bytes = new TextEncoder().encode(content).length;
    assert.ok(bytes <= MAX_RECORD_BYTES, `${bytes} bytes`);
    lint(content, (p) => assert.deepStrictEqual(p, []), files);
  });

  test("maximum prose and outcome plus max short links fits", () => {
    const files: Record<string, string> = {};
    const links = Array.from({ length: MAX_LINKS_PER_FIELD }, (_, i) => { files[`d/${i}.md`] = "x\n"; return `[${i}](d/${i}.md)`; }).join(", ");
    const fields = OUTCOME_FIELDS.map((n): [string, string] => [n, n === "outcome" ? "o".repeat(MAX_LINE_LENGTH) : links]);
    const content = record({ fields, prose: Array(MAX_PROSE_LINES).fill("p".repeat(MAX_LINE_LENGTH)) });
    const bytes = new TextEncoder().encode(content).length;
    console.log(`measured max record bytes: ${bytes} (cap ${MAX_RECORD_BYTES})`);
    assert.ok(bytes <= MAX_RECORD_BYTES, `${bytes} bytes`);
  });
});

describe("template", () => {
  test("filled template lints clean", () => {
    const template = fs.readFileSync(`${import.meta.dirname}/../templates/project/records/shipped/_template.md`);
    const content = String(template).replaceAll("<slug>", SLUG).replaceAll("<YYYY-MM-DD>", "2026-10-22");
    lint(content, (p) => assert.deepStrictEqual(p, []));
  });
});

describe("cli", () => {
  test("bare slug resolves under the records dir; exit 0 clean and 1 with problems", () => {
    const root = tempFixture(deps, { ...TARGETS, [REL]: record(), [`${OUTCOME_DIR}/bad.md`]: "nothing" });
    const out: string[] = [];
    const cli = { ...deps, proc: { ...deps.proc, cwd: () => root }, io: { ...deps.io, stdout: { ...deps.io.stdout, write: (t: string) => { out.push(t); } } } } as typeof deps;
    try {
      assert.strictEqual(main(["lint", SLUG], cli), 0);
      assert.strictEqual(main(["lint", "bad"], cli), 1);
      assert.ok(out.join("").includes("frontmatter"));
      assert.strictEqual(main(["lint", "bad", "--json"], cli), 1);
      assert.strictEqual(main([], cli), 2);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

describe("source hygiene", () => {
  test("module never references the archive directory or node: runtime imports", () => {
    const source = String(fs.readFileSync(new URL("./outcome-record.mts", import.meta.url).pathname));
    assert.ok(!source.includes(["compaction", "archives"].join("/")));
    assert.ok(!/from "node:/.test(source));
  });
});

describe("audit cycle 1: path aliasing, symlinked ancestors and terminal safety", () => {
  test("the size cap is the pinned constant, not just a relative bound", () => {
    assert.strictEqual(MAX_RECORD_BYTES, 3000);
    assert.strictEqual(MAX_LINKS_PER_FIELD, 12);
    assert.strictEqual(MAX_PROSE_LINES, 6);
  });

  test("a link target under a symlinked directory is refused, not only a symlinked final file", () => {
    const root = tempFixture(deps, { ...TARGETS, "outside/secret.md": "# outside\n", [REL]: record({ fields: withField("docs", "[x](linkdir/secret.md)") }) });
    try {
      fs.symlinkSync(`${root}/outside`, `${root}/linkdir`);
      assert.ok(has(lintOutcomeRecord(root, REL, deps).problems, "not an existing regular file"));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test("a record reached through a symlinked ancestor is refused and its content is never read", () => {
    const root = tempFixture(deps, { ...TARGETS, "elsewhere/shipped/demo.md": record({ extra: "SECRET after fields\n" }) });
    try {
      fs.mkdirSync(`${root}/.project`, { recursive: true });
      fs.symlinkSync(`${root}/elsewhere`, `${root}/.project/records`);
      const problems = lintOutcomeRecord(root, REL, deps).problems;
      assert.ok(has(problems, "passes through a symlink"));
      assert.ok(!problems.join("\n").includes("SECRET"));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test("a link into the record's own pitch folder is refused whatever its letter case", () => {
    lint(record({ fields: withField("docs", `[x](.project/Pitches/${SLUG.toUpperCase()}/pitch.md)`) }), (p) => {
      // On a case-sensitive file system that path does not exist (refused as a missing file); on a case-insensitive one it is the pitch folder.
      assert.ok(has(p, "own pitch folder") || has(p, "not an existing regular file"));
    });
    lint(record({ fields: withField("docs", `[x](.PROJECT/pitches/${SLUG}/pitch.md)`) }), (p) => assert.ok(p.length > 0));
  });

  test("control characters and escape sequences in a record never reach the terminal, and file text is not echoed back", () => {
    assert.strictEqual(printable("a\u001b]0;TITLE\u0007b\u001b[2Jc"), "a?]0;TITLE?b?[2Jc");
    lint(record({ extra: "\u001b]0;PWNED\u0007 trailing\n" }), (p) => {
      assert.ok(p.length > 0);
      assert.ok(!/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/.test(p.join("\n")), "no control character in any problem");
      assert.ok(!p.join("\n").includes("PWNED"), "the offending text is not repeated");
    });
  });

  test("outcomeFields reads the comment-stripped text the lint judged", () => {
    const text = record({ extra: "" }).replace("- outcome: Demo outcome.", "- outcome: real <!-- done-work-index:end --> tail");
    assert.deepStrictEqual(outcomeFields(text), { shipped: "2026-10-22", outcome: "real  tail" });
    assert.deepStrictEqual(outcomeFields("no fields here"), { shipped: null, outcome: null });
  });
});

describe("audit cycle 2: identity, not spelling", () => {
  test("a link whose spelling is folded by the file system (ſ is s) into the record's own pitch folder is refused when the disk aliases it", () => {
    const alias = `.project/pitcheſ/${SLUG}/pitch.md`;
    const root = tempFixture(deps, { ...TARGETS, [REL]: record({ fields: withField("docs", `[x](${alias})`) }) });
    try {
      const problems = lintOutcomeRecord(root, REL, deps).problems;
      if (fs.existsSync(`${root}/${alias}`)) assert.ok(has(problems, "own pitch folder"), "an aliasing disk is caught by device and inode");
      else assert.ok(has(problems, "not an existing regular file"));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});

describe("audit cycle 3: line feeds", () => {
  test("printable replaces line feeds and carriage returns as well, so one value is one line", () => {
    assert.strictEqual(printable("a\nPASS forged\r\nb"), "a?PASS forged??b");
  });
});
