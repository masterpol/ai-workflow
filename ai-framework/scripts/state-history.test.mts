import assert from "node:assert/strict";
import test from "node:test";

import { createTestDeps } from "./runtime/test-helpers.mts";
import type { Fact } from "./state-structure.mts";

const history = await import(process.env.STATE_HISTORY_UNDER_TEST ?? "./state-history.mts");
const deps = createTestDeps();
const { fs, path, os } = deps;
const STAMP = "2026-10-19T03-29-30-919Z";
const ARCHIVES = ".project/compaction/archives";
const MARKER = "SECRET-MARKER-9f3a";
const SCRUB = (text: unknown): string => String(text);
const DONE: Fact = { value: { entries: [] }, status: "observed", evidence: [] };
const TABLE = (rows: string[]): string => ["| # | Finding | Status |", "|---|---|---|", ...rows.map((row, i) => `| ${i + 1} | ${row} | fixed |`)].join("\n");

function reader(fsx = fs, max = 64 * 1024) {
  return (root: string, relative: string) => {
    const full = path.join(root, relative);
    let stat;
    try { stat = fsx.lstatSync(full); } catch { return { missing: true }; }
    if (stat.isSymbolicLink()) return { error: "symlink refused" };
    if (!stat.isFile()) return { error: "not a file" };
    const text = fsx.readFileSync(full);
    return { text: text.slice(0, max), truncated: text.length > max };
  };
}
function project(files: Record<string, string> = {}): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "state-history-")));
  for (const [name, content] of Object.entries(files)) write(root, name, content);
  fs.mkdirSync(path.join(root, ".project/runs"), { recursive: true });
  return root;
}
function write(root: string, name: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), content);
}
const pitch = (slug: string, over: Record<string, unknown> = {}, status = "observed"): Fact => ({ value: { slug, phase: "active", appetite: "small-batch", shipped: null, ...over }, status, evidence: [`.project/pitches/${slug}`] });
function hist(root: string, over: Record<string, unknown> = {}) {
  const api = history.createStateHistory(deps);
  return api.historySection(root, { items: [], doneWork: DONE, knowledge: [], readMarkdown: reader(), scrub: SCRUB, ...over });
}
const one = (root: string, slug = "alpha", over: Record<string, unknown> = {}) => hist(root, { items: [pitch(slug)], ...over }).items[0].value;
const cleanup = (root: string) => fs.rmSync(root, { recursive: true, force: true });
const withRoot = (files: Record<string, string>, body: (root: string) => void) => { const root = project(files); try { body(root); } finally { cleanup(root); } };

test("history item identity comes from the pitch fact and done-work, and a truncated done-work is stale", () => withRoot({}, (root) => {
  const shipped = hist(root, { items: [pitch("beta", { phase: "shipped", appetite: "big-batch", shipped: "2026-09-01" })] }).items[0];
  assert.deepEqual([shipped.value.slug, shipped.value.phase, shipped.value.appetite, shipped.value.shipped, shipped.status], ["beta", "shipped", "big-batch", "2026-09-01", "observed"]);
  const done: Fact = { value: { entries: [{ slug: "old", shipped: "2026-08-02" }] }, status: "observed", evidence: [] };
  const compacted = hist(root, { items: [pitch("old", { phase: "compacted" })], doneWork: done }).items[0];
  assert.equal(compacted.value.shipped, "2026-08-02");
  const cut: Fact = { value: { entries: [] }, status: "stale", evidence: [] };
  const stale = hist(root, { items: [pitch("lost", { phase: "compacted" })], doneWork: cut }).items[0];
  assert.equal(stale.status, "stale");
  assert.equal(stale.value.shipped, null);
  assert.match(stale.note, /\.project\/done-work\.md exceeds the 64 KB read limit; entries past that point are not counted/);
  const found = hist(root, { items: [pitch("old", { phase: "compacted" })], doneWork: { ...done, status: "stale" } }).items[0];
  assert.equal(found.status, "observed");
}));

test("history scopes done come from hill.md, else the newest exact-slug run, else unavailable (never 0)", () => withRoot({
  ".project/pitches/alpha/hill.md": "| Scope | Position |\n|---|---|\n| S1 | done |\n| S2 | Done |\n| S3 | uphill 50% |\n",
  ".project/runs/2026-01-01-gamma-hill.md": "| Scope | Position |\n|---|---|\n| S1 | uphill |\n",
  ".project/runs/2026-02-01-gamma-hill.md": "| Scope | Position |\n|---|---|\n| S1 | done |\n| S2 | done |\n",
  ".project/runs/2026-03-01-gamma-x-hill.md": "| Scope | Position |\n|---|---|\n| S1 | done |\n| S2 | done |\n| S3 | done |\n",
}, (root) => {
  assert.deepEqual(one(root, "alpha").scopes, { value: { done: 2, total: 3 }, availability: "observed" });
  assert.deepEqual(one(root, "gamma").scopes.value, { done: 2, total: 2 });
  const missing = one(root, "delta").scopes;
  assert.equal(missing.availability, "unavailable");
  assert.equal(missing.value, null);
}));

test("history lessons list at most 10 knowledge ids for the slug with a total, and a null graph is unavailable", () => withRoot({}, (root) => {
  const knowledge = [...Array.from({ length: 12 }, (_, i) => ({ id: `lesson-${String(i).padStart(2, "0")}`, source: "alpha", updated: null })), { id: "other", source: "beta", updated: null }];
  const value = one(root, "alpha", { knowledge });
  assert.equal(value.lessons.value.length, 10);
  assert.equal(value.lessonsTotal, 12);
  assert.equal(value.lessons.availability, "observed");
  const unavailable = one(root, "alpha", { knowledge: null });
  assert.equal(unavailable.lessons.availability, "unavailable");
  assert.match(unavailable.lessons.reason, /knowledge graph unavailable/);
  assert.equal(unavailable.lessonsTotal, null);
}));

const STYLE_A = (cycle2: string) => `# Audit\n\n## Must-fix (cycle 1)\n${TABLE(["a", "b"])}\n\n${cycle2}\n`;
test("history audit style A with a table-less cycle 2 gives cycles 2 and a null partial mustFix", () => withRoot({
  ".project/pitches/alpha/audit.md": STYLE_A("## Cycle 2\nAll fixed, see the diff.\n"),
}, (root) => {
  const audit = one(root).audit;
  assert.deepEqual(audit.value, { cycles: 2, mustFix: null });
  assert.equal(audit.availability, "partial");
  assert.match(audit.reason, /cycle 2/);
}));

test("history audit style B with a prose cycle 2 is partial and a full set of tables is a number", () => withRoot({
  ".project/pitches/alpha/audit.md": `## Cycle 1\n\n### Must-fix\n${TABLE(["a", "b", "c"])}\n\n## Cycle 2\nProse, nothing else.\n`,
  ".project/pitches/beta/audit.md": `## Must-fix (cycle 1)\n${TABLE(["a", "b"])}\n\n## Cycle 2\n### Must-fix\n${TABLE(["c"])}\n`,
}, (root) => {
  const partial = one(root, "alpha").audit;
  assert.deepEqual(partial.value, { cycles: 2, mustFix: null });
  assert.equal(partial.availability, "partial");
  const full = one(root, "beta").audit;
  assert.deepEqual(full.value, { cycles: 2, mustFix: 3 });
  assert.equal(full.availability, "observed");
}));

test("history audit refuted rows are excluded from the must-fix count", () => withRoot({
  ".project/pitches/alpha/audit.md": `## Must-fix (cycle 1)\n${TABLE(["real one", "claim REFUTED by test", "real two"])}\n`,
}, (root) => {
  assert.deepEqual(one(root).audit.value, { cycles: 1, mustFix: 2 });
}));

test("history audit unrecognized formats are unavailable and never 0", () => withRoot({
  ".project/pitches/alpha/audit.md": "# Audit cycle 1\n\n## Must-fix\n\nNone real.\n",
  ".project/pitches/beta/audit.md": "# Audit\n\n## Result: 0 must-fix\n\n| a | b |\n|---|---|\n",
  ".project/pitches/gamma/audit.md": "",
}, (root) => {
  for (const slug of ["alpha", "beta", "gamma"]) {
    const audit = one(root, slug).audit;
    assert.equal(audit.availability, "unavailable", slug);
    assert.equal(audit.value.mustFix, null, slug);
    assert.equal(audit.value.cycles, null, slug);
    assert.match(audit.reason, /unrecognized audit format/);
  }
}));

test("history audit of a compacted pitch reads the newest real archive and counts audit-cycle names", () => withRoot({
  [`${ARCHIVES}/alpha-2026-09-01T00-00-00-000Z/files/audit.md`]: `## Must-fix (cycle 1)\n${TABLE(["old", "old", "old"])}\n`,
  [`${ARCHIVES}/alpha-${STAMP}/files/audit.md`]: `## Must-fix (cycle 1)\n${TABLE(["new"])}\n`,
  [`${ARCHIVES}/alpha-extra-${STAMP}/files/audit.md`]: `## Must-fix (cycle 1)\n${TABLE(["wrong", "wrong"])}\n`,
  [`${ARCHIVES}/beta-${STAMP}/files/audit-cycle-1.md`]: "x",
  [`${ARCHIVES}/beta-${STAMP}/files/audit-cycle-2.md`]: "x",
}, (root) => {
  const items = [pitch("alpha", { phase: "compacted" }), pitch("beta", { phase: "compacted" })];
  const [alpha, beta] = hist(root, { items }).items;
  assert.deepEqual(alpha.value.audit.value, { cycles: 1, mustFix: 1 });
  assert.deepEqual(beta.value.audit.value, { cycles: 2, mustFix: null });
  assert.equal(beta.value.audit.availability, "partial");
}));

test("history revisions count the rows of a Revisions table, from the pitch or its archive, never 0 when absent", () => withRoot({
  ".project/pitches/alpha/pitch.md": `# P\n\n## Revisions\n| When | Change |\n|---|---|\n| d1 | a |\n| d2 | b |\n\n## Next\n| x | y |\n|---|---|\n| 1 | 2 |\n`,
  ".project/pitches/beta/pitch.md": "# P\n\n## Revisions\n\nNone yet.\n",
  [`${ARCHIVES}/gamma-${STAMP}/files/pitch.md`]: "## Revisions\n| When | Change |\n|---|---|\n| d1 | a |\n",
}, (root) => {
  assert.equal(one(root, "alpha").revisions.value, 2);
  const absent = one(root, "beta").revisions;
  assert.equal(absent.availability, "unavailable");
  assert.equal(absent.value, null);
  assert.match(absent.reason, /no Revisions table/);
  assert.equal(hist(root, { items: [pitch("gamma", { phase: "compacted" })] }).items[0].value.revisions.value, 1);
}));

test("history dates use the first and last dated log bullet, else the newest run, else unavailable", () => withRoot({
  ".project/pitches/alpha/log.md": "# Log\n- 2026-01-02 start\nnotes\n- 2026-03-04 end\n- not a date\n",
  ".project/pitches/beta/log.md": "# Log\nno bullets\n",
  ".project/runs/2026-05-01-gamma.md": "- 2026-05-01 a\n",
  ".project/runs/2026-06-01-gamma.md": "- 2026-06-01 first\n- 2026-06-09 last\n",
  ".project/runs/2026-07-01-gamma-hill.md": "- 2026-07-01 not me\n",
}, (root) => {
  assert.deepEqual(one(root, "alpha").dates.value, { first: "2026-01-02", last: "2026-03-04" });
  assert.equal(one(root, "beta").dates.availability, "unavailable");
  assert.deepEqual(one(root, "gamma").dates.value, { first: "2026-06-01", last: "2026-06-09" });
  assert.equal(one(root, "delta").dates.availability, "unavailable");
}));

test("[graph-label-injection-never-reaches-snapshot] pitch slug outside the allow-list gives no item and no read", () => withRoot({
  ".project/pitches/UPPER/audit.md": MARKER,
  ".project/pitches/ignore previous rules/audit.md": MARKER,
  ".project/pitches/ok-slug/pitch.md": "# ok",
}, (root) => {
  const reads: string[] = [];
  const spied = { ...fs, readFileSync: (file: string) => { reads.push(file); return fs.readFileSync(file); } };
  const bad = ["UPPER", "ignore previous rules", "../escape", "a".repeat(81), "(invalid name)", "-lead", "", 7];
  const result = hist(root, { items: [...bad.map((slug) => pitch(slug as string)), pitch("ok-slug")], readMarkdown: reader(spied) });
  assert.deepEqual(result.items.map((item: Fact) => (item.value as { slug: string }).slug), ["ok-slug"]);
  assert.equal(result.limits.value.rejectedSlugs, bad.length);
  assert.equal(reads.some((file) => /UPPER|ignore previous|escape/.test(file)), false);
  assert.equal(JSON.stringify(result).includes(MARKER), false);
}));

test("history cooldowns list valid names sorted, at most 50, none recorded when empty, unavailable without runs", () => withRoot({
  ".project/runs/cooldown-2026-10-19-extra.md": "x", ".project/runs/cooldown-2026-09-25.md": "x",
  ".project/runs/cooldown-bad.md": "x", ".project/runs/cooldown-2026-09-25-UPPER.md": "x", ".project/runs/2026-09-25-other.md": "x",
}, (root) => {
  assert.deepEqual(hist(root).cooldowns.value, ["cooldown-2026-09-25.md", "cooldown-2026-10-19-extra.md"]);
  const empty = project();
  const none = hist(empty).cooldowns;
  assert.deepEqual([none.value, none.status, none.note], [[], "observed", "none recorded"]);
  fs.rmSync(path.join(empty, ".project/runs"), { recursive: true });
  assert.equal(hist(empty).cooldowns.status, "unavailable");
  cleanup(empty);
  const many = project(Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`.project/runs/cooldown-2026-01-${String(i).padStart(2, "0")}.md`, "x"])));
  assert.equal(hist(many).cooldowns.value.length, 50);
  cleanup(many);
}));

test("history followups count sections without a Resolved, Done or Shipped line, not items", () => withRoot({
  ".project/pitches/_followups.md": "# Followups\n**Resolved before any section**\n## One\ntext\n**Resolved 2026-01-01:** x\n## Two\n**Done 2026-01-01** y\n## Three\n- open item\n## Four\n**Shipped 2026-02-02:** z\n## Five\n~~struck~~ but open\n",
}, (root) => {
  const fact = history.followupsFact(root, reader());
  assert.deepEqual(fact.value, { sections: 5, open: 2 });
  assert.equal(fact.status, "observed");
  assert.match(fact.note, /counts sections, not items/);
  const cut = history.followupsFact(root, reader(fs, 40));
  assert.equal(cut.status, "stale");
  assert.match(cut.note, /counts sections, not items/);
  assert.equal(history.followupsFact(project(), reader()).status, "unavailable");
}));

test("history reads go through the passed reader: symlinks and FIFOs count as absent with their own reason", { timeout: 15000 }, () => withRoot({
  ".project/real/audit.md": `## Must-fix (cycle 1)\n${TABLE(["a"])}\n`,
  ".project/real/log.md": "- 2026-01-01 x\n",
  [`${ARCHIVES}/beta-${STAMP}-real/files/audit.md`]: `## Must-fix (cycle 1)\n${TABLE(["a"])}\n`,
}, (root) => {
  const link = (target: string, name: string) => { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.symlinkSync(path.join(root, target), path.join(root, name)); };
  link(".project/real/audit.md", ".project/pitches/alpha/audit.md");
  link(".project/real/log.md", ".project/pitches/alpha/log.md");
  link(`${ARCHIVES}/beta-${STAMP}-real`, `${ARCHIVES}/beta-${STAMP}`);
  fs.mkdirSync(path.join(root, ".project/pitches/gamma"), { recursive: true });
  const made = deps.child.runSync("mkfifo", [path.join(root, ".project/pitches/gamma/audit.md")]);
  assert.equal(made.status, 0, "mkfifo must work for this test");
  const [alpha, beta, gamma] = hist(root, { items: [pitch("alpha"), pitch("beta", { phase: "compacted" }), pitch("gamma")] }).items;
  assert.equal(alpha.value.audit.availability, "unavailable");
  assert.match(alpha.value.audit.reason, /symlink refused/);
  assert.match(alpha.value.dates.reason, /symlink refused/);
  assert.equal(beta.value.audit.availability, "unavailable");
  assert.match(beta.value.audit.reason, /not a real directory/);
  assert.equal(gamma.value.audit.availability, "unavailable");
  assert.match(gamma.value.audit.reason, /not a file/);
}));

test("history audit-cycle files are listed, never read", () => withRoot({
  [`${ARCHIVES}/alpha-${STAMP}/files/audit-cycle-1.md`]: MARKER,
  [`${ARCHIVES}/alpha-${STAMP}/files/audit-cycle-2.md`]: MARKER,
}, (root) => {
  const reads: string[] = [];
  const spied = { ...fs, readFileSync: (file: string) => { reads.push(file); return fs.readFileSync(file); } };
  const spyDeps = { ...deps, fs: spied };
  const result = history.createStateHistory(spyDeps).historySection(root, { items: [pitch("alpha", { phase: "compacted" })], doneWork: DONE, knowledge: [], readMarkdown: reader(spied), scrub: SCRUB });
  assert.deepEqual(result.items[0].value.audit.value, { cycles: 2, mustFix: null });
  assert.equal(reads.some((file) => file.includes("audit-cycle")), false);
  assert.equal(JSON.stringify(result).includes(MARKER), false);
}));

const SHAPES: Record<string, (n: number) => string> = {
  "unclosed table cells": (n) => "| ".repeat(n / 2),
  "unclosed table lines": (n) => "| x\n".repeat(n / 4),
  "cycle headings": (n) => "## Cycle ".repeat(n / 9),
  "cycle heading lines": (n) => "## Cycle \n".repeat(n / 10),
  "date bullets": (n) => "- 2026-".repeat(n / 7),
  "date bullet lines": (n) => "- 2026-\n".repeat(n / 8),
  "one long line": (n) => "a".repeat(n),
};
function timeShapes(size: number, limitMs: number, markdownBytes?: number): void {
  const root = project();
  try {
    for (const [name, make] of Object.entries(SHAPES)) {
      const body = make(size);
      const files: Record<string, string> = { audit: body, "pitch": `## Revisions\n${body}`, log: body, hill: body };
      for (const [file, content] of Object.entries(files)) write(root, `.project/pitches/slow/${file}.md`, content);
      const start = deps.clock.perfNowMs();
      const result = hist(root, { items: [pitch("slow")], readMarkdown: reader(fs, size * 2), ...(markdownBytes ? { limits: { markdownBytes } } : {}) });
      const elapsed = deps.clock.perfNowMs() - start;
      assert.equal(result.items.length, 1, name);
      assert.ok(elapsed < limitMs, `${name}: ${Math.round(elapsed)} ms is not under ${limitMs} ms`);
    }
  } finally { cleanup(root); }
}
test("[linear-time-history-parsers] 64 KB hostile inputs finish in under 1,000 ms", { timeout: 60000 }, () => timeShapes(64 * 1024, 1000));
test("[linear-time-history-parsers] 1 MiB hostile inputs finish in under 2,000 ms, so a quadratic scanner fails", { timeout: 120000 }, () => timeShapes(1024 * 1024, 2000, 2 * 1024 * 1024));

test("history output carries only facts and sub-fields, never a fact inside a fact", () => withRoot({ ".project/pitches/alpha/hill.md": "| Scope | Position |\n|---|---|\n| S1 | done |\n" }, (root) => {
  const result = hist(root, { items: [pitch("alpha")] });
  const value = result.items[0].value as Record<string, unknown>;
  for (const key of ["scopes", "lessons", "audit", "revisions", "dates"]) {
    const field = value[key] as Record<string, unknown>;
    assert.ok(["observed", "partial", "unavailable"].includes(field.availability as string), key);
    assert.equal("status" in field || "evidence" in field, false, key);
  }
  assert.equal(hist(root, { items: null }).items.status, "unavailable");
}));
