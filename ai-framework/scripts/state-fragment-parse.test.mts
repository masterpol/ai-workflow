// Behavioral tests for the strict fragment parser (state-fragment-sanitizer S2). Every test is one vector named
// "[<dataset-case-id>] <vector>" and asserts the exact first reason. Rejection vectors carry a paired positive
// control that removes only the offending construct, so the vector, not the fixture, causes the rejection.
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Limits, Node } from "./state-fragment-parse.mts";

// STATE_FRAGMENT_PARSE_UNDER_TEST lets a mutant copy of the parser run the same assertions (mutant proofs).
const parser = await import(process.env.STATE_FRAGMENT_PARSE_UNDER_TEST ?? "./state-fragment-parse.mts") as typeof import("./state-fragment-parse.mts");
const { DEFAULT_LIMITS, REASONS, parseFragment, reject } = parser;

const FUZZ_TIME_BOUND_MS = 1000;
const TWO_MB = 2 * 1024 * 1024;
const RAISED: Partial<Limits> = {
  maxBytes: 8 * 1024 * 1024, maxDepth: 1_000_000, maxNodes: 1_000_000,
  maxAttrValue: 8 * 1024 * 1024, maxPathD: 8 * 1024 * 1024, maxText: 8 * 1024 * 1024,
};

type Result = ReturnType<typeof parseFragment>;

function outcome(result: Result): string {
  return result.ok ? "accepted" : result.reason;
}

function accepts(input: string, limits?: Partial<Limits>): Node[] {
  const result = parseFragment(input, limits);
  assert.equal(outcome(result), "accepted", "expected the input to be accepted");
  return result.ok ? result.nodes : [];
}

function rejects(input: string, reason: string, control: string, limits?: Partial<Limits>): void {
  const result = parseFragment(input, limits);
  assert.equal(result.ok, false, `expected ${reason}`);
  const got = outcome(result);
  assert.equal(got, reason, `expected ${reason}, got ${got}`);
  accepts(control, limits);
}

function el(name: string, attrs: [string, string][] = [], children: Node[] = []): Node {
  return { kind: "element", name, attrs, children };
}

function txt(text: string): Node {
  return { kind: "text", text };
}

function attributes(count: number): string {
  return Array.from({ length: count }, (_, index) => ` a${index}="x"`).join("");
}

function nested(depth: number, leaf = ""): string {
  return "<g>".repeat(depth) + leaf + "</g>".repeat(depth);
}

// Exactly `total` UTF-8 bytes with far fewer UTF-16 code units, so only the encoded byte check can refuse it.
function multiByte(total: number): string {
  const chunk = `<p>${"\u00e9".repeat(1990)}</p>`;
  const rest = total - 16 * 3987 - 7;
  return chunk.repeat(16) + `<p>${"x".repeat(rest)}</p>`;
}

function timed(input: string): { result: string; ms: number } {
  const start = performance.now();
  const result = outcome(parseFragment(input, RAISED));
  return { result, ms: performance.now() - start };
}

// Positive controls.

test("[accept-valid-fragment] parses headings table code svg and anchor", () => {
  const fragment = [
    "<h2>Overview</h2><h3>Status</h3>",
    '<p>See <a href="ai-framework/scripts/state-render.mts">the renderer</a> and <code>node --test</code>.</p>',
    "<table><caption>Pitches</caption><thead><tr><th scope=\"col\">Name</th></tr></thead>",
    "<tbody><tr><td><data value=\"pitches.items.length\">3</data></td></tr></tbody></table>",
    '<svg viewBox="0 0 10 10" width="10" height="10"><title>Chart</title><desc>Bars</desc>',
    '<g transform="translate(1 1)"><rect x="0" y="0" width="4" height="4" fill="var(--primary)"/>',
    '<path class="marker-arrow" d="M 0 0 L 4 4"/><circle cx="5" cy="5" r="1"/></g>',
    '<text x="1" y="9">Label<tspan dx="1">more</tspan></text></svg>',
  ].join("\n");
  const nodes = accepts(fragment);
  assert.deepEqual(nodes.filter((node) => node.kind === "element").map((node) => node.kind === "element" && node.name),
    ["h2", "h3", "p", "table", "svg"]);
});

test("[accept-valid-fragment] builds the exact tree with attribute order and whitespace text", () => {
  assert.deepEqual(accepts('<p class="a" title=\'b\'>x <em>y</em></p>\n'), [
    el("p", [["class", "a"], ["title", "b"]], [txt("x "), el("em", [], [txt("y")])]), txt("\n"),
  ]);
});

test("[accept-valid-fragment] decodes all five predefined entities once", () => {
  assert.deepEqual(accepts('<p title="&quot;&apos;&amp;amp;">&amp;&lt;&gt;&quot;&apos;</p>'), [
    el("p", [["title", "\"'&amp;"]], [txt("&<>\"'")]),
  ]);
});

test("[accept-valid-fragment] accepts SVG self-closing elements as empty elements", () => {
  assert.deepEqual(accepts('<svg><rect width="1" height="1"/><path d="M0 0" /><g/></svg>'), [
    el("svg", [], [el("rect", [["width", "1"], ["height", "1"]]), el("path", [["d", "M0 0"]]), el("g")]),
  ]);
});

test("[accept-valid-fragment] allows whitespace around equals and inside tags", () => {
  assert.deepEqual(accepts('<p\tclass = "a"\n></p >'), [el("p", [["class", "a"]])]);
});

test("[accept-valid-fragment] keeps name case and allows TAB LF CR in text", () => {
  assert.deepEqual(accepts('<svg viewBox="0 0 1 1"><text>a\tb\r\nc</text></svg>'), [
    el("svg", [["viewBox", "0 0 1 1"]], [el("text", [], [txt("a\tb\r\nc")])]),
  ]);
});

test("[accept-valid-fragment] accepts a well-formed surrogate pair", () => {
  assert.deepEqual(accepts("<p>\u{1F600}</p>"), [el("p", [], [txt("\u{1F600}")])]);
});

test("[accept-valid-fragment] accepts top-level text and an empty fragment", () => {
  assert.deepEqual(accepts("plain &gt; text"), [txt("plain > text")]);
  assert.deepEqual(accepts(""), []);
});

// Structural constructs.

test("[reject-structural-constructs] doctype", () => {
  rejects("<!DOCTYPE html><p>x</p>", "doctype", "<p>x</p>");
});

test("[reject-structural-constructs] entity declaration", () => {
  rejects('<!ENTITY x "y"><p>x</p>', "entity-declaration", "<p>x</p>");
});

test("[reject-structural-constructs] cdata", () => {
  rejects("<p><![CDATA[x]]></p>", "cdata", "<p>x</p>");
});

test("[reject-structural-constructs] comment", () => {
  rejects("<p><!--x--></p>", "comment", "<p></p>");
});

test("[reject-structural-constructs] processing instruction", () => {
  rejects('<?xml version="1.0"?><p>x</p>', "processing-instruction", "<p>x</p>");
});

test("[reject-structural-constructs] other markup declarations", () => {
  rejects("<!doctype html><p>x</p>", "syntax", "<p>x</p>");
  rejects("<!ATTLIST x><p>x</p>", "syntax", "<p>x</p>");
});

test("[reject-structural-constructs] namespace prefix", () => {
  rejects("<svg><svg:script></svg:script></svg>", "namespace-prefix", "<svg></svg>");
});

test("[reject-structural-constructs] namespace prefix attribute", () => {
  rejects('<svg><g xlink:href="#x"></g></svg>', "namespace-prefix", "<svg><g></g></svg>");
});

test("[reject-structural-constructs] namespace prefix self-closed", () => {
  rejects("<svg><svg:script/></svg>", "namespace-prefix", "<svg></svg>");
});

test("[reject-structural-constructs] unclosed", () => {
  rejects("<p><strong>x</strong>", "unclosed", "<p><strong>x</strong></p>");
});

test("[reject-structural-constructs] unclosed tag at end of input", () => {
  rejects('<p class="a"', "unclosed", '<p class="a"></p>');
  rejects("<p><", "unclosed", "<p></p>");
  rejects("<p></p", "unclosed", "<p></p>");
});

test("[reject-structural-constructs] unclosed attribute quote", () => {
  rejects('<p class="a></p>', "syntax", '<p class="a"></p>');
  rejects('<p class="a', "unclosed", '<p class="a"></p>');
});

test("[reject-structural-constructs] mismatched close", () => {
  rejects("<p><strong>x</p></strong>", "mismatched-close", "<p><strong>x</strong></p>");
});

test("[reject-structural-constructs] close without an open element", () => {
  rejects("<p>x</p></p>", "mismatched-close", "<p>x</p>");
});

test("[reject-structural-constructs] close tag differs only in case", () => {
  rejects("<p>x</P>", "mismatched-close", "<p>x</p>");
});

test("[reject-structural-constructs] duplicate attribute", () => {
  rejects('<p class="a" class="b"></p>', "duplicate-attribute", '<p class="a"></p>');
});

test("[reject-structural-constructs] duplicate attribute differing in case", () => {
  rejects('<p class="a" CLASS="b"></p>', "duplicate-attribute", '<p class="a"></p>');
});

test("[reject-structural-constructs] unquoted attribute", () => {
  rejects("<p class=a></p>", "unquoted-attribute", '<p class="a"></p>');
});

test("[reject-structural-constructs] attribute without a value", () => {
  rejects("<p hidden></p>", "unquoted-attribute", "<p></p>");
});

test("[reject-structural-constructs] missing attribute separator", () => {
  rejects('<p class="a"title="b"></p>', "syntax", '<p class="a" title="b"></p>');
});

test("[reject-structural-constructs] raw less-than inside an attribute value", () => {
  rejects('<p title="a<b"></p>', "syntax", '<p title="a&lt;b"></p>');
});

test("[reject-structural-constructs] raw less-than in text", () => {
  rejects("<p>a < b</p>", "syntax", "<p>a &lt; b</p>");
});

test("[reject-structural-constructs] malformed element names", () => {
  rejects("<1p></1p>", "syntax", "<p></p>");
  rejects("<p_x></p_x>", "syntax", "<px></px>");
  rejects("<p.x></p.x>", "syntax", "<px></px>");
  rejects("<p\u00e9></p\u00e9>", "syntax", "<p></p>");
});

test("[reject-structural-constructs] malformed self-closing and close tags", () => {
  rejects("<svg><g/ ></svg>", "syntax", "<svg><g/></svg>");
  rejects("<p>x</p class>", "syntax", "<p>x</p>");
});

test("[reject-structural-constructs] self-closed HTML element", () => {
  rejects("<p/>", "content-model", "<p></p>");
});

test("[reject-structural-constructs] self-closed HTML element in any case or position", () => {
  rejects("<P/>", "content-model", "<P></P>");
  rejects('<span class="a" />', "content-model", '<span class="a"></span>');
  rejects("<svg><a/></svg>", "content-model", "<svg><a></a></svg>");
});

test("[reject-structural-constructs] control character", () => {
  rejects("<p>a\u202eb</p>", "control-character", "<p>ab</p>");
});

const CONTROLS: [string, string][] = [
  ["NUL", "\u0000"], ["C0 U+0001", "\u0001"], ["C0 U+000B", "\u000b"], ["C0 U+001F", "\u001f"], ["DEL", "\u007f"],
  ["C1 U+0085", "\u0085"], ["C1 U+009F", "\u009f"], ["bidi U+202A", "\u202a"], ["bidi U+202D", "\u202d"],
  ["isolate U+2066", "\u2066"], ["isolate U+2069", "\u2069"],
];
for (const [label, char] of CONTROLS) {
  test(`[reject-structural-constructs] control character ${label}`, () => {
    rejects(`<p title="a${char}">b</p>`, "control-character", '<p title="a">b</p>');
  });
}

test("[reject-structural-constructs] unpaired surrogate", () => {
  rejects("<p>a\ud800b</p>", "invalid-unicode", "<p>ab</p>");
});

test("[reject-structural-constructs] unpaired low and reversed surrogates", () => {
  rejects("<p>\udc00</p>", "invalid-unicode", "<p></p>");
  rejects("<p>\ude00\ud83d</p>", "invalid-unicode", "<p>\u{1F600}</p>");
});

test("[reject-structural-constructs] non-string input", () => {
  for (const input of [undefined, null, 1, true, {}, ["<p></p>"], new Uint8Array([60])]) {
    assert.equal(outcome(parseFragment(input)), "input-type", `expected input-type for ${typeof input}`);
  }
  accepts("<p></p>");
});

// Entity references.

test("[reject-entity-encoded-javascript] numeric reference", () => {
  // The control keeps a literal scheme: refusing javascript: is the validator's later, independent layer.
  rejects('<a href="&#106;avascript:alert(1)">x</a>', "character-reference", '<a href="javascript:alert(1)">x</a>');
});

test("[reject-entity-encoded-javascript] hexadecimal reference", () => {
  rejects('<a href="&#x6A;avascript:x">x</a>', "character-reference", '<a href="javascript:x">x</a>');
});

test("[reject-entity-encoded-javascript] named Tab reference inside the scheme", () => {
  rejects('<a href="java&Tab;script:x">x</a>', "character-reference", '<a href="javascript:x">x</a>');
});

test("[reject-entity-encoded-javascript] other named references", () => {
  rejects("<p>a&nbsp;b</p>", "character-reference", "<p>a b</p>");
  rejects("<p>&AMP;</p>", "character-reference", "<p>&amp;</p>");
  rejects("<p>&quotx;</p>", "character-reference", "<p>&quot;x</p>");
});

test("[reject-entity-encoded-javascript] bare or unterminated ampersand", () => {
  rejects("<p>a & b</p>", "character-reference", "<p>a &amp; b</p>");
  rejects("<p>&amp</p>", "character-reference", "<p>&amp;</p>");
  rejects('<p title="&">x</p>', "character-reference", '<p title="&amp;">x</p>');
});

// Caps: the value at the cap is accepted and cap + 1 rejects with that cap's reason.

test("[reject-oversize-and-deep] byte cap", () => {
  const atCap = multiByte(DEFAULT_LIMITS.maxBytes), overCap = multiByte(DEFAULT_LIMITS.maxBytes + 1);
  assert.equal(new TextEncoder().encode(atCap).length, DEFAULT_LIMITS.maxBytes, "fixture is exactly at the cap");
  assert.ok(overCap.length < DEFAULT_LIMITS.maxBytes, "fixture passes the UTF-16 lower bound");
  rejects(overCap, "size-limit", atCap);
});

test("[reject-oversize-and-deep] byte cap UTF-16 lower bound", () => {
  rejects("x".repeat(DEFAULT_LIMITS.maxBytes + 1), "size-limit", "x".repeat(DEFAULT_LIMITS.maxText));
});

test("[reject-oversize-and-deep] byte cap override", () => {
  rejects("<p>\u00e9\u00e9</p>", "size-limit", "<p>\u00e9</p>", { maxBytes: 9 });
});

test("[reject-oversize-and-deep] depth cap", () => {
  rejects(nested(DEFAULT_LIMITS.maxDepth + 1), "depth-limit", nested(DEFAULT_LIMITS.maxDepth));
});

test("[reject-oversize-and-deep] depth cap counts self-closed elements", () => {
  rejects(nested(DEFAULT_LIMITS.maxDepth, "<rect/>"), "depth-limit", nested(DEFAULT_LIMITS.maxDepth - 1, "<rect/>"));
});

test("[reject-oversize-and-deep] node cap", () => {
  rejects("<g></g>".repeat(DEFAULT_LIMITS.maxNodes + 1), "node-limit", "<g></g>".repeat(DEFAULT_LIMITS.maxNodes));
});

test("[reject-oversize-and-deep] node cap counts whitespace text nodes", () => {
  const atCap = "<g></g> ".repeat(DEFAULT_LIMITS.maxNodes / 2);
  rejects(atCap + "<g></g>", "node-limit", atCap);
});

test("[reject-structural-constructs] attribute count", () => {
  rejects(`<p${attributes(DEFAULT_LIMITS.maxAttrs + 1)}></p>`, "attribute-limit", `<p${attributes(DEFAULT_LIMITS.maxAttrs)}></p>`);
});

test("[reject-structural-constructs] attribute length", () => {
  const max = DEFAULT_LIMITS.maxAttrValue;
  rejects(`<p title="${"x".repeat(max + 1)}"></p>`, "attribute-length", `<p title="${"x".repeat(max)}"></p>`);
});

test("[reject-structural-constructs] attribute length counts raw encoded characters", () => {
  const max = DEFAULT_LIMITS.maxAttrValue;
  rejects(`<p title="${"x".repeat(max - 4)}&amp;"></p>`, "attribute-length", `<p title="${"x".repeat(max - 5)}&amp;"></p>`);
});

test("[reject-oversize-and-deep] path length", () => {
  const max = DEFAULT_LIMITS.maxPathD;
  rejects(`<svg><path d="${"0".repeat(max + 1)}"/></svg>`, "path-length", `<svg><path d="${"0".repeat(max)}"/></svg>`);
});

test("[reject-oversize-and-deep] path cap applies only to d", () => {
  const value = "0".repeat(DEFAULT_LIMITS.maxPathD);
  rejects(`<svg><path points="${value}"/></svg>`, "attribute-length", `<svg><path d="${value}"/></svg>`);
});

test("[reject-structural-constructs] text length", () => {
  const max = DEFAULT_LIMITS.maxText;
  rejects(`<p>${"x".repeat(max + 1)}</p>`, "text-length", `<p>${"x".repeat(max)}</p>`);
});

test("[reject-structural-constructs] text length applies to top-level text", () => {
  const max = DEFAULT_LIMITS.maxText;
  rejects("x".repeat(max + 1), "text-length", "x".repeat(max));
});

test("[reject-structural-constructs] name length", () => {
  const atCap = "a".repeat(DEFAULT_LIMITS.maxName), overCap = atCap + "a";
  rejects(`<${overCap}></${overCap}>`, "name-length", `<${atCap}></${atCap}>`);
});

test("[reject-structural-constructs] name length for attributes", () => {
  const atCap = "a".repeat(DEFAULT_LIMITS.maxName);
  rejects(`<p ${atCap}a="x"></p>`, "name-length", `<p ${atCap}="x"></p>`);
});

test("[reject-oversize-and-deep] raised caps accept what default caps refuse", () => {
  const deep = nested(DEFAULT_LIMITS.maxDepth + 1);
  assert.equal(outcome(parseFragment(deep)), "depth-limit");
  accepts(deep, { maxDepth: DEFAULT_LIMITS.maxDepth + 1 });
});

test("[reject-oversize-and-deep] invalid limits", () => {
  const getter = Object.defineProperty({}, "maxDepth", { enumerable: true, get: () => 5 });
  const bad: unknown[] = [
    null, [], "big", 5, { maxDepth: 0 }, { maxDepth: -1 }, { maxDepth: 1.5 }, { maxDepth: Number.NaN },
    { maxDepth: Number.POSITIVE_INFINITY }, { maxDepth: 2 ** 53 }, { maxDepth: "5" }, { maxDepth: undefined },
    { maxDepth: 5, maxBogus: 1 }, { [Symbol("x")]: 1 }, getter, new Map(), Object.create({ maxDepth: 1 }),
  ];
  for (const limits of bad) {
    const got = outcome(parseFragment("<p></p>", limits as Partial<Limits>));
    assert.equal(got, "invalid-options", `expected invalid-options, got ${got}`);
  }
  accepts("<p></p>", { maxDepth: 1 });
  accepts("<p></p>", Object.assign(Object.create(null) as object, { maxNodes: 1 }));
});

test("[reject-oversize-and-deep] partial limits keep the other defaults", () => {
  const limits = { maxDepth: 30 };
  assert.equal(outcome(parseFragment(nested(25), limits)), "accepted");
  assert.equal(outcome(parseFragment("<g></g>".repeat(DEFAULT_LIMITS.maxNodes + 1), limits)), "node-limit");
  assert.deepEqual(limits, { maxDepth: 30 }, "caller limits are not mutated");
});

test("[reject-oversize-and-deep] default limits match the S1 contract", () => {
  assert.deepEqual({ ...DEFAULT_LIMITS }, {
    maxBytes: 65536, maxDepth: 20, maxNodes: 2000, maxAttrs: 12, maxAttrValue: 512, maxPathD: 8192, maxText: 4000, maxName: 32,
  });
  assert.ok(Object.isFrozen(DEFAULT_LIMITS));
});

// Iterative parsing and linear time with caps raised, so the size cap is not the only defense.

test("[reject-oversize-and-deep] 100000 nested groups parse iteratively with raised caps", () => {
  const groups = 100_000;
  const result = parseFragment(nested(groups), RAISED);
  assert.equal(outcome(result), "accepted", "expected the deep input to be accepted");
  let depth = 0;
  let level = result.ok ? result.nodes : [];
  while (level.length === 1 && level[0].kind === "element") {
    depth++;
    level = level[0].children;
  }
  assert.equal(depth, groups);
});

test("[reject-oversize-and-deep] 2 MB repeated open tags reject within the time bound", () => {
  const { result, ms } = timed("<a".repeat(TWO_MB / 2));
  assert.equal(result, "syntax");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] 2 MB ampersands reject within the time bound", () => {
  const { result, ms } = timed("&".repeat(TWO_MB));
  assert.equal(result, "character-reference");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] 2 MB markup declarations reject within the time bound", () => {
  const { result, ms } = timed("<!".repeat(TWO_MB / 2));
  assert.equal(result, "syntax");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] 2 MB unclosed attribute quote rejects within the time bound", () => {
  const { result, ms } = timed(`<p a="${"a".repeat(TWO_MB)}`);
  assert.equal(result, "unclosed");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] 2 MB entity-dense text is accepted within the time bound", () => {
  const { result, ms } = timed(`<p>${"&amp;".repeat(TWO_MB / 5)}</p>`);
  assert.equal(result, "accepted");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] 5 MB path d is accepted by the raised-cap parser within the time bound", () => {
  const { result, ms } = timed(`<svg><path d="M0 0${" L1 1".repeat(TWO_MB * 5 / 2 / 5)}"/></svg>`);
  assert.equal(result, "accepted");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] unclosed construct 200000 lines long rejects within the time bound", () => {
  const { result, ms } = timed(`<p>${"line\n".repeat(200_000)}`);
  assert.equal(result, "unclosed");
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
});

test("[reject-oversize-and-deep] default caps refuse the three adversarial shapes by size", () => {
  rejects(nested(100_000), "size-limit", nested(DEFAULT_LIMITS.maxDepth));
  rejects(`<svg><path d="${"0".repeat(5 * 1024 * 1024)}"/></svg>`, "size-limit", `<svg><path d="${"0".repeat(DEFAULT_LIMITS.maxPathD)}"/></svg>`);
  rejects(`<p>${"line\n".repeat(200_000)}`, "size-limit", "<p>line</p>");
});

// Rejections never store source values.

test("[rejection-message-does-not-echo] reject helper validates reason count and token", () => {
  assert.deepEqual(reject("comment"), { ok: false, reason: "comment", count: 1, token: null });
  assert.deepEqual(reject("depth-limit", 3, "g"), { ok: false, reason: "depth-limit", count: 3, token: "g" });
  assert.deepEqual(reject("not-a-reason" as never, 0, "viewBox"), { ok: false, reason: "syntax", count: 1, token: "viewBox" });
  assert.equal(reject("syntax", 10_000_000).count, 999999);
  assert.equal(reject("syntax", 2.7).count, 2);
  assert.equal(reject("syntax", Number.NaN).count, 1);
  assert.equal(reject("syntax", "7" as never).count, 1);
  assert.equal(reject("syntax", Number.POSITIVE_INFINITY).count, 999999);
});

test("[rejection-message-does-not-echo] reject helper drops tokens outside the name grammar", () => {
  for (const token of ["Canary", "a b", "x\u001b]0;pwned\u0007", "<script>", "a".repeat(33), "", "1a", "a\u202e"]) {
    assert.equal(reject("syntax", 1, token).token, null, `dropped ${JSON.stringify(token)}`);
  }
  assert.equal(reject("syntax", 1, "a".repeat(32)).token, "a".repeat(32));
});

test("[rejection-message-does-not-echo] parser rejections carry names but never values", () => {
  const canary = "canaryvalue";
  const cases: [string, string, string | null][] = [
    [`<p title="${canary}" title="x"></p>`, "duplicate-attribute", "title"],
    [`<p title="${canary}<"></p>`, "syntax", "title"],
    [`<p>${canary}</g>`, "mismatched-close", "g"],
    [`<strong title="${canary}">`, "unclosed", "strong"],
    [`<p>&#${canary};</p>`, "character-reference", null],
    [`<${canary}${"x".repeat(32)}>`, "name-length", null],
  ];
  for (const [input, reason, token] of cases) {
    const result = parseFragment(input);
    assert.deepEqual(result, { ok: false, reason, count: 1, token });
    assert.ok(!JSON.stringify(result).includes(canary), `no canary in ${reason}`);
  }
});

test("[rejection-message-does-not-echo] closed reason list has fifty unique codes", () => {
  assert.equal(REASONS.length, 50);
  assert.equal(new Set(REASONS).size, 50);
  assert.ok(Object.isFrozen(REASONS));
  for (const reason of REASONS) assert.match(reason, /^[a-z]+(-[a-z]+)*$/);
});


test("[reject-oversize-and-deep] resolved limits are independent validated data copies", () => {
  const supplied = { maxBytes: 128 };
  const first = parser.resolveLimits(supplied);
  assert.ok(first);
  assert.equal(first.maxBytes, 128);
  supplied.maxBytes = 256;
  assert.equal(first.maxBytes, 128);
  first.maxDepth = 1;
  assert.equal(parser.resolveLimits(undefined)?.maxDepth, DEFAULT_LIMITS.maxDepth);
  let calls = 0;
  const getter = Object.defineProperty({}, "maxDepth", { get() { calls++; return 1; } });
  assert.equal(parser.resolveLimits(getter), null);
  assert.equal(parser.resolveLimits(new Proxy({}, { ownKeys() { throw new Error("trap"); } })), null);
  assert.equal(calls, 0);
});

test("[reject-structural-constructs] every D2 control range rejects with whitespace controls accepted", () => {
  const range = (start: number, end: number): number[] => Array.from({ length: end - start + 1 }, (_, index) => start + index);
  const forbidden = [...range(0, 8), 11, 12, ...range(14, 31), ...range(127, 159), ...range(0x202a, 0x202e), ...range(0x2066, 0x2069)];
  for (const code of forbidden) {
    const result = parseFragment(`<p>${String.fromCharCode(code)}</p>`);
    assert.equal(result.ok, false, `U+${code.toString(16)}`);
    if (!result.ok) assert.equal(result.reason, "control-character");
  }
  for (const code of [9, 10, 13]) accepts(`<p>${String.fromCharCode(code)}</p>`);
});
