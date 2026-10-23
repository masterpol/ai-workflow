import assert from "node:assert/strict";
import { test } from "node:test";
import { joinFlowReport, projectHistory, projectTokens, projectUsage } from "./flow-join.mts";
import type { FlowReport, Loaded } from "./flow-join.mts";
import { FORMATS, ownsFormat, render, renderFormats } from "./flow-render.mts";
import { blankState } from "./workflow-metrics-state.mts";
import { createTestDeps } from "./runtime/test-helpers.mts";

const AT = "2026-10-21T12:00:00.000Z", ID = "123e4567-e89b-42d3-a456-426614174000";
const leaf = { completions: 2, reportedUsageCount: 1, unavailableCount: 1, tokens: 9, costUsd: 0, pricedCount: 0 };
function value<T>(loaded: Loaded<T>): T { assert.equal(loaded.status, "valid"); return (loaded as { value: T }).value; }
function sample(): FlowReport {
  const state = blankState(createTestDeps(), "example"), row = { activeMs: 40, waitMs: 5, turnsStarted: 1, turnsFinished: 1, gapsMeasured: 0, gapsUnmeasured: 0, gapsOverCap: 0 };
  state.usage.since = AT;
  state.usage.pitches.alpha = { lastAt: AT, row, phases: { build: { row, scopes: { S1: row } } }, transitions: { repeat: 0, forward: 2, back: 0, other: 0 }, trace: [{ at: AT, phase: "build", scope: "S1", class: "start" }], lastPhase: "build" };
  state.pending["b".repeat(64)] = { startedAt: AT, lastAt: AT, status: "running" };
  const tokens = projectTokens({ schemaVersion: 3, updatedAt: AT, flows: { since: AT, pitches: { alpha: { phases: { build: { scopes: { S1: { claude: leaf } } } } } } } });
  const history = projectHistory({ schemaVersion: 1, generatedAt: AT, history: { items: [{ value: { slug: "alpha", phase: "shipped", shipped: "2026-10-01", audit: { value: { cycles: 1, mustFix: 0 }, availability: "observed" }, revisions: { value: 3, availability: "observed" } }, status: "observed", evidence: [] }], limits: { value: { truncatedItems: 4, maxItems: 100 }, status: "observed", evidence: [] } } });
  return joinFlowReport({ tokens: { status: "valid", value: value(tokens) }, usage: projectUsage(state), history: { status: "valid", value: value(history) } }, AT);
}
const FACTS = ["observed", "provisional", "Pending activities", "partial", "vendor-defined agent completion event", "cacheHitRatio", "outputInputRatio", "timeEfficiency", "2026-10-01", "Omitted leaf rows", "Omitted pitches", "forward", "lower bound"];

test("all three formats carry the same sanitized report semantics and one generation ID", () => {
  const report = sample();
  for (const format of FORMATS) {
    const text = render(format, report, ID);
    assert.ok(text.includes(ID), format);
    assert.ok(ownsFormat(format, text), format);
    if (format !== "json") for (const fact of FACTS) assert.ok(text.toLowerCase().includes(fact.toLowerCase()), `${format}: ${fact}`);
    assert.ok(!text.includes("example") && !text.includes("b".repeat(64)), format);
  }
  const json = JSON.parse(render("json", report, ID)) as Record<string, unknown> & FlowReport;
  assert.deepEqual([json.generationId, json.generator, json.schemaVersion, json.timing.provisional, json.omitted.leafRows, json.unavailableMetrics.length], [ID, "ai-workflow/flow-report", 1, true, 0, 4]);
  assert.equal(json.pitches[0].history?.revisions.value, 3);
  // Unavailable values stay explicit, never zero.
  const md = render("markdown", { ...report, totals: { ...report.totals, tokens: null, time: null } }, ID);
  assert.ok(md.includes("no vendor token rows") && md.includes("| unavailable | unavailable | unavailable | unavailable |"));
  assert.ok(render("markdown", { ...report, pitches: [] }, ID).includes("_No rows._"));
  assert.equal(render("markdown", report, ID).split("Gaps over cap").length, 3); // totals and per-row coverage counters
  for (const format of FORMATS) assert.throws(() => render(format, report, '"><script>'), /invalid generation ID/);
});

test("hostile labels stay inert in Markdown and HTML and the page has no active or external content", () => {
  const report = sample(), hostile = "<img src=x onerror=1>|[a](javascript:alert(1))\n# h`";
  report.pitches[0].label = hostile;
  report.pitches[0].children[0].label = '"><script>x</script>';
  const md = render("markdown", report, ID), html = render("html", report, ID);
  assert.ok(!/(?<!\\)[<[]/.test(md.slice(md.indexOf("\n"))) && !md.includes("\n# h") && md.includes("\\[a\\]\\(javascript:alert\\(1\\)\\)"));
  const tags = new Set([...html.matchAll(/<\/?([a-z0-9]+)/gi)].map(m => m[1].toLowerCase()));
  assert.deepEqual([...tags].filter(t => !["html", "head", "meta", "title", "style", "body", "main", "h1", "h2", "p", "section", "div", "table", "caption", "thead", "tbody", "tr", "th", "td", "ul", "li"].includes(t)), []);
  assert.ok(!/<[^>]*\s(?:href|src|action|on\w+)\s*=/i.test(html) && !/https?:\/\//.test(html));
  assert.ok(html.includes("&#60;img") && html.includes("Content-Security-Policy"));
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">/);
  assert.match(html, /<caption>Sources<\/caption>[\s\S]*<th scope="col">Status<\/th>/);
  assert.match(html, /class="scroll" role="region" aria-labelledby="t0" tabindex="0"/);
  assert.equal(JSON.parse(render("json", report, ID)).pitches[0].label, hostile);
  const links = render("markdown", { ...report, notes: ["https://evil.example/x www.evil.example a@evil.co"] }, ID);
  assert.ok(links.includes("https:\\/\\/evil\\.example\\/x www\\.evil\\.example a\\@evil\\.co"));
  assert.equal((html.match(/Timing is provisional:/g) ?? []).length, 3);
  assert.equal((md.match(/Timing is provisional:/g) ?? []).length, 3);
});

test("generator ownership needs the exact format marker, not just a schema version", () => {
  const report = sample(), text = (format: typeof FORMATS[number]): string => render(format, report, ID);
  for (const format of FORMATS) assert.ok(ownsFormat(format, text(format)));
  assert.ok(!ownsFormat("json", '{"schemaVersion":1}') && !ownsFormat("json", "[]") && !ownsFormat("json", "{") && !ownsFormat("json", '{"schemaVersion":1,"generator":"ai-workflow/flow-report","format":"json","generationId":"x"}'));
  assert.ok(!ownsFormat("markdown", `intro\n${text("markdown")}`) && !ownsFormat("markdown", text("html")) && !ownsFormat("html", text("markdown")) && !ownsFormat("json", text("markdown")));
  assert.ok(!ownsFormat("html", text("html").replace("format: html", "format: markdown")));
});

test("a format that would exceed the output cap makes the whole render fail rather than truncate", () => {
  const report = sample();
  assert.equal(renderFormats(report, ID, FORMATS)?.length, 3);
  assert.equal(renderFormats({ ...report, notes: ["x".repeat(4 * 1024 * 1024)] }, ID, ["markdown"]), null);
});
