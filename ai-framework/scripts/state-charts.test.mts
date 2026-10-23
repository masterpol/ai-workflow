import assert from "node:assert/strict";
import test from "node:test";
import { CHART_IDS, barChart, type ChartId } from "./state-charts.mts";
import { assertInert, assertKnownMarkup } from "./state-test-helpers.mts";

const SAMPLE_ID: ChartId = "completions-by-vendor";
const TITLE = "Completions by vendor";

function chart(rows: unknown[]): string {
  return barChart({ id: SAMPLE_ID, title: TITLE, rows });
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

test("exports the allowed chart ids", () => {
  assert.deepEqual([...CHART_IDS], [
    "completions-by-vendor",
    "pitches-by-phase",
    "knowledge-by-type",
    "subfolders-by-folder",
  ]);
});

test("rejects an unknown chart id", () => {
  assert.throws(() => barChart({ id: "unknown-chart", title: TITLE, rows: [] }), /Unknown chart id/);
  assert.throws(() => barChart({ id: "", title: TITLE, rows: [] }), /Unknown chart id/);
});

test("rejects bad options shape", () => {
  assert.throws(() => barChart(null as unknown as { id: string; title: string; rows: unknown[] }), /expects an options object/);
  assert.throws(() => barChart({ id: SAMPLE_ID, title: TITLE, rows: "nope" } as unknown as { id: string; title: string; rows: unknown[] }), /rows must be an array/);
  assert.throws(() => barChart({ id: SAMPLE_ID, title: 42, rows: [] } as unknown as { id: string; title: string; rows: unknown[] }), /title must be a string/);
});

test("values must be non-negative safe integers; other rows are dropped and counted", () => {
  const html = chart([
    { label: "a", value: 3 },
    { label: "b", value: -1 },
    { label: "c", value: 1.5 },
    { label: "d", value: NaN },
    { label: "e", value: Infinity },
    { label: "f", value: Number.MAX_SAFE_INTEGER + 1 },
    { label: "g", value: "two" },
    null,
    { label: "h" },
    { value: 2 },
  ]);
  assert.ok(html.includes("8 rows omitted"), html);
  assert.ok(!html.includes("unavailable"), html);
  assert.ok(html.includes(">a<"));
  assert.ok(html.includes(">other<"));
  assert.ok(html.includes(">2<"));
});

test("labels are allow-listed, truncated to 24 characters, escaped, and failing labels become other", () => {
  const long = "a".repeat(30);
  const hostile = '<img src=x onerror="alert(1)">';
  const html = chart([
    { label: long, value: 5 },
    { label: hostile, value: 4 },
    { label: "ok-label", value: 3 },
    { label: "has space/slash.dot-ok", value: 2 },
    { label: "too-long-".repeat(3), value: 1 },
    { label: "bad!", value: 1 },
    { label: "", value: 1 },
    { label: "a".repeat(41), value: 1 },
  ]);
  assert.ok(html.includes(`>${"a".repeat(24)}<`), "truncated label present");
  assert.ok(!html.includes("<img"), "hostile label never reaches markup raw");
  assert.ok(html.includes(">ok-label<"));
  assert.ok(html.includes(">has space/slash.dot-ok<"));
  assert.ok(html.includes(">other<"));
  assert.ok(!html.includes(">bad!<"));
  assertInert(html);
  assertKnownMarkup(html);
});

test("at most 8 bars are drawn and the remainder becomes other (N more)", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ label: `v${i + 1}`, value: 12 - i }));
  const html = chart(rows);
  const barCount = countMatches(html, /<rect\b/g);
  assert.equal(barCount, 9, "8 top bars plus one overflow bar");
  assert.ok(html.includes("other (4 more)"), html);
  assertInert(html);
  assertKnownMarkup(html);
});

test("empty input or all-zero values render an unavailable chip and no svg", () => {
  const empty = chart([]);
  assert.ok(empty.includes("unavailable"));
  assert.ok(!empty.includes("<svg"));
  assert.ok(!empty.includes("<table"));

  const zeros = chart([
    { label: "a", value: 0 },
    { label: "b", value: 0 },
  ]);
  assert.ok(zeros.includes("unavailable"));
  assert.ok(!zeros.includes("<svg"));
  assert.ok(!zeros.includes("<table"));

  const emptyWithDrops = chart([{ label: "a", value: -1 }, { value: "x" }]);
  assert.ok(emptyWithDrops.includes("unavailable"));
  assert.ok(emptyWithDrops.includes("2 rows omitted"));
});

test("rendering is deterministic and passes the markup invariants", () => {
  const rows = [
    { label: "openai", value: 120 },
    { label: "anthropic", value: 90 },
    { label: "google", value: 30 },
  ];
  const first = chart(rows);
  const second = chart(rows);
  assert.equal(first, second);
  assertInert(first);
  assertKnownMarkup(first);
});

test("every chart has title and desc referenced by aria-labelledby and a matching table", () => {
  const html = chart([
    { label: "x", value: 10 },
    { label: "y", value: 5 },
  ]);
  const svg = html.match(/<svg\b[\s\S]*?<\/svg>/)![0];
  assert.match(svg, /aria-labelledby="completions-by-vendor-title completions-by-vendor-desc"/);
  assert.match(svg, /<title id="completions-by-vendor-title">/);
  assert.match(svg, /<desc id="completions-by-vendor-desc">/);
  const rows = countMatches(html.match(/<tbody>[\s\S]*?<\/tbody>/)![0], /<tr>/g);
  const bars = countMatches(html, /<rect\b/g);
  assert.equal(rows, bars);
  assert.ok(html.includes(`<caption>${TITLE}</caption>`));
});

test("color comes from classes, not fill attributes copied from data", () => {
  const html = chart([
    { label: "a", value: 10 },
    { label: "b", value: 5 },
  ]);
  assert.ok(!/\bfill\s*="/.test(html), "no fill attribute");
  assert.ok(!/\bstroke\s*="/.test(html), "no stroke attribute");
  assert.ok(html.includes('class="chart-bar chart-bar-1"'));
  assert.ok(html.includes('class="chart-bar chart-bar-2"'));
});

test("a 500-row input yields at most 9 bars and stays under 4096 bytes", () => {
  const rows = Array.from({ length: 500 }, (_, i) => ({ label: `item-${i + 1}`, value: i + 1 }));
  const html = barChart({ id: "pitches-by-phase", title: "Pitches by phase", rows });
  const bars = countMatches(html, /<rect\b/g);
  assert.ok(bars <= 9, `expected at most 9 bars, got ${bars}`);
  assert.ok(Buffer.byteLength(html) <= 4096, `expected at most 4096 bytes, got ${Buffer.byteLength(html)}`);
  assertInert(html);
  assertKnownMarkup(html);
});

test("assertInert rejects a mutant that emits an inline style attribute", () => {
  const good = chart([{ label: "a", value: 10 }]);
  assertInert(good);
  const mutant = good.replace('class="chart-bar chart-bar-1"', 'class="chart-bar chart-bar-1" style="fill:red"');
  assert.throws(() => assertInert(mutant), /no style= attribute/);
});

test("assertInert rejects a mutant that emits url( inside the svg", () => {
  const good = chart([{ label: "a", value: 10 }]);
  assertInert(good);
  const mutant = good.replace('class="chart-bar chart-bar-1"', 'fill="url(#grad)" class="chart-bar chart-bar-1"');
  assert.throws(() => assertInert(mutant), /no url\(/);
});

test("assertKnownMarkup rejects a mutant with an unknown tag", () => {
  const good = chart([{ label: "a", value: 10 }]);
  assertKnownMarkup(good);
  const mutant = good.replace("</svg>", "<foreignObject>evil</foreignObject></svg>");
  assert.throws(() => assertKnownMarkup(mutant), /unexpected tag <foreignObject>/);
});

test("assertKnownMarkup rejects a mutant with an unknown attribute", () => {
  const good = chart([{ label: "a", value: 10 }]);
  assertKnownMarkup(good);
  const mutant = good.replace('class="chart-bar chart-bar-1"', 'class="chart-bar chart-bar-1" data-value="1"');
  assert.throws(() => assertKnownMarkup(mutant), /unexpected attribute data-value/);
});

test("title is escaped at render time", () => {
  const html = barChart({ id: SAMPLE_ID, title: "<script>alert('x')</script>", rows: [{ label: "a", value: 1 }] });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"));
  assertInert(html);
  assertKnownMarkup(html);
});

test("each chart id renders a valid chart", () => {
  for (const id of CHART_IDS) {
    const html = barChart({ id, title: `Chart ${id}`, rows: [{ label: "a", value: 5 }, { label: "b", value: 3 }] });
    assert.ok(html.includes("<svg"));
    assert.ok(html.includes("<table"));
    assertInert(html);
    assertKnownMarkup(html);
  }
});

test("a single dropped row is reported in the singular, and equal values keep label order", () => {
  const html = barChart({ id: "pitches-by-phase", title: "t", rows: [{ label: "b", value: 2 }, { label: "a", value: 2 }, { label: "bad", value: -1 }] });
  assert.ok(html.includes("1 row omitted"), html);
  assert.ok(html.indexOf(">a<") < html.indexOf(">b<"), "ties sort by label");
});
