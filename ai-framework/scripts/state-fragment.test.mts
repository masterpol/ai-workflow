import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCitations } from "./state-fragment-evidence.mts";
import { REASONS } from "./state-fragment-parse.mts";
import { FALLBACK } from "./state-theme.mts";
import type { Rejection } from "./state-fragment-parse.mts";
import type { Options } from "./state-fragment.mts";

const module = await import(process.env.STATE_FRAGMENT_UNDER_TEST ?? "./state-fragment.mts") as typeof import("./state-fragment.mts");
const { sanitizeFragment, DEFAULT_TOKENS, rejectionMessage } = module;
type Result = ReturnType<typeof sanitizeFragment>;
const reason = (result: Result): string => result.ok ? "accepted" : result.reason;
function accepts(input: string, options?: Options): Extract<Result, { ok: true }> {
  const result = sanitizeFragment(input, options);
  assert.equal(reason(result), "accepted", `expected accepted, got ${reason(result)}`);
  if (!result.ok) throw new Error("acceptance assertion failed");
  const second = sanitizeFragment(result.html, options);
  assert.equal(reason(second), "accepted", "canonical output must be accepted again");
  if (second.ok) assert.deepEqual(second, result, "canonical markup and citations must be byte-idempotent");
  return result;
}
function refuses(input: string, expected: string, control: string, options?: Options): void {
  const result = sanitizeFragment(input, options);
  assert.equal(result.ok, false, `expected ${expected}`);
  assert.equal(reason(result), expected, `expected ${expected}`);
  accepts(control, options);
}
const svg = (content: string): string => `<svg>${content}</svg>`;
const PATH = "ai-framework/scripts/state-render.mts";

test("[accept-valid-fragment] headings table code svg shapes markers and evidence anchor", () => {
  const input = `<h2>Overview</h2><h3>Status</h3><h4>Details</h4><p>See <a href="${PATH}">renderer</a> <strong>source</strong> <em>here</em>.</p>`
    + '<ul><li>First<ol><li>Nested</li></ol></li></ul><pre><code>node --test 12</code></pre>'
    + '<table><caption>Pitches</caption><thead><tr><th scope="col">Count</th></tr></thead><tbody><tr><td><data value="pitches.items.length">3</data></td></tr></tbody></table>'
    + '<svg viewBox="0 0 10 10" width="10" height="10"><title>Chart</title><desc>Summary</desc><g transform="translate(1 1)">'
    + '<rect width="4" height="4" rx="1" ry="1" fill="var(--primary)"/><circle cx="5" cy="5" r="1"/><ellipse rx="1" ry="2"/>'
    + '<line x1="0" y1="0" x2="1" y2="1"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 0,1"/>'
    + '<path class="marker-arrow" d="M0 0L4 4" stroke="none" stroke-width="1"/><text x="1" y="9">Label<tspan dx="1">More</tspan></text></g></svg>';
  const result = accepts(input);
  assert.deepEqual(result.citations, { hrefs: [PATH], numbers: [{ path: "pitches.items.length", text: "3" }], unbound: 0 });
});

test("[accept-valid-fragment] escape five characters", () => {
  const result = accepts('<p>&amp;&lt;&gt;&quot;&apos;</p><a href="x&amp;&lt;&gt;&quot;&apos;">link</a>');
  assert.equal(result.html, '<p>&amp;&lt;&gt;&quot;&apos;</p><a href="x&amp;&lt;&gt;&quot;&apos;">link</a>');
});
test("[accept-valid-fragment] canonical geometry", () => {
  const result = accepts(svg('<g transform="translate(+01.00,2e0) scale(.50) rotate(90,0,0)"><path d="M+01.00,-0L1e-7 .500 Z"/><rect x="-0" width="+02.00"/></g>'));
  assert.equal(result.html, '<svg><g transform="translate(1 2) scale(0.5) rotate(90 0 0)"><path d="M 1 0 L 0.0000001 0.5 Z"></path><rect x="0" width="2"></rect></g></svg>');
});
test("[accept-valid-fragment] path commands and repeated coordinate groups", () => {
  accepts(svg('<path d="M0 0 1 1 L2 2 H3 V4 C1 2 3 4 5 6 S7 8 9 10 Q1 2 3 4 T5 6 A1 2 30 0 1 4 5 Z"/>'));
  accepts(svg('<path d="M0 0 Z M1 1"/><g transform="rotate(45) translate(1) scale(1 2)"></g>'));
});
test("[accept-valid-fragment] default token drift excludes typography", () => {
  const colors = Object.keys(FALLBACK.light).filter((key) => /^#[a-f0-9]{6}$/i.test(FALLBACK.light[key]));
  assert.deepEqual([...DEFAULT_TOKENS].sort(), colors.sort());
  for (const token of DEFAULT_TOKENS) accepts(svg(`<rect fill="var(--${token})" stroke="var(--${token})"/>`));
});
test("[accept-valid-fragment] injected classes tokens markers and empty class", () => {
  const options = { classes: ["panel"], tokens: ["accent"], markers: ["marker-dot"] };
  assert.equal(accepts('<p class=" panel  panel ">x</p>', options).html, '<p class="panel panel">x</p>');
  accepts(svg('<path class="marker-dot" fill="var(--accent)" d="M0 0"/>'), options);
  accepts('<p class="">x</p>');
  accepts(" "); accepts(""); accepts("plain text");
});

for (const name of ["script", "style", "animate", "set", "use", "foreignObject", "image", "iframe", "object", "math", "template", "br", "defs", "marker"]) {
  const id = name === "script" ? "reject-script-element" : name === "animate" || name === "set" ? "reject-smil-href" : name === "use" ? "reject-external-use" : "reject-structural-constructs";
  test(`[${id}] ${name === "script" ? "script element" : name + " element"}`, () => refuses(svg(`<${name}></${name}>`), "element-not-allowed", svg("")));
}
for (const [id, label, input, expected, control] of [
  ["reject-event-handler", "onload", '<svg onload="alert(1)"></svg>', "event-handler", '<svg></svg>'],
  ["reject-event-handler", "mixed case event", '<p OnClick="x">safe</p>', "event-handler", '<p>safe</p>'],
  ["reject-style-attribute", "empty style", '<p style="">safe</p>', "style-attribute", '<p>safe</p>'],
  ["reject-style-attribute", "nonempty style", '<p style="fill:url(javascript:alert(1))">safe</p>', "style-attribute", '<p>safe</p>'],
  ["reject-structural-constructs", "id attribute", '<p id="x">safe</p>', "id-attribute", '<p>safe</p>'],
  ["reject-style-attribute", "url reference", '<svg><rect fill="url(#paint)"/></svg>', "url-reference", '<svg><rect fill="none"/></svg>'],
  ["reject-style-attribute", "url reference case and whitespace", '<svg><rect fill="UrL (#paint)"/></svg>', "url-reference", '<svg><rect fill="none"/></svg>'],
  ["reject-entity-encoded-javascript", "literal script scheme", '<a href="javascript:alert(1)">link</a>', "script-scheme", '<a href="docs/a.md">link</a>'],
  ["reject-entity-encoded-javascript", "script scheme whitespace", '<a href="JaVa\tsCr\nIpT:alert(1)">link</a>', "script-scheme", '<a href="docs/a.md">link</a>'],
  ["reject-entity-encoded-javascript", "numeric reference", '<a href="&#106;avascript:alert(1)">link</a>', "character-reference", '<a href="docs/a.md">link</a>'],
  ["reject-entity-encoded-javascript", "named Tab reference", '<a href="java&Tab;script:x">link</a>', "character-reference", '<a href="docs/a.md">link</a>'],
  ["reject-structural-constructs", "unknown attribute", '<p title="x">safe</p>', "attribute-not-allowed", '<p>safe</p>'],
  ["reject-structural-constructs", "class membership", '<p class="panel">safe</p>', "class-not-allowed", '<p>safe</p>'],
  ["reject-structural-constructs", "unknown color token", '<svg><rect fill="var(--unknown)"/></svg>', "color-not-token", '<svg><rect fill="var(--primary)"/></svg>'],
  ["reject-structural-constructs", "marker membership", '<svg><path class="marker-evil" d="M0 0"/></svg>', "marker-not-allowed", '<svg><path class="marker-arrow" d="M0 0"/></svg>'],
  ["reject-structural-constructs", "attribute case", '<svg viewbox="0 0 1 1"></svg>', "attribute-not-allowed", '<svg viewBox="0 0 1 1"></svg>'],
  ["reject-structural-constructs", "element case", '<P>safe</P>', "element-not-allowed", '<p>safe</p>'],
  ["reject-structural-constructs", "scope value", '<table><tbody><tr><th scope="unknown">x</th></tr></tbody></table>', "attribute-not-allowed", '<table><tbody><tr><th scope="row">x</th></tr></tbody></table>'],
] as const) test(`[${id}] ${label}`, () => refuses(input, expected, control));

for (const color of ["red", "#ffffff", "var(--primary,red)", "var(--radius)", "var(--fontSans)"]) {
  test(`[reject-structural-constructs] refused color ${color}`, () => refuses(svg(`<rect fill="${color}"/>`), "color-not-token", svg('<rect fill="none"/>')));
}
for (const name of ["status", "status-observed", "Status-Observed"]) {
  test(`[ai-label-always-present-and-unspoofable:sanitizer] observed class ${name}`, () => refuses(`<p class="${name}">Observed</p>`, "class-not-allowed", '<p class="panel">Observed</p>', { classes: [name, "panel"] }));
}
test("[reject-structural-constructs] injected sets remain restrictive", () => {
  refuses(svg('<rect fill="var(--primary)"/>'), "color-not-token", svg('<rect fill="var(--accent)"/>'), { tokens: ["accent"] });
  refuses(svg('<path class="marker-arrow"/>'), "marker-not-allowed", svg('<path class="marker-dot"/>'), { markers: ["marker-dot"] });
  refuses('<p class="\u00a0panel">safe</p>', "class-not-allowed", '<p class="panel">safe</p>', { classes: ["panel"] });
});

test("[reject-structural-constructs] svg integration point", () => {
  refuses('<svg><title><p></p></title></svg>', "content-model", '<svg><title></title></svg>');
});

for (const [label, input, control] of [
  ["svg integration point", '<svg><title><p>unsafe</p></title></svg>', '<svg><title>safe</title></svg>'],
  ["desc integration point", '<svg><desc><g></g></desc></svg>', '<svg><desc>safe</desc></svg>'],
  ["foreign content breakout", '<svg><p>unsafe</p></svg>', '<svg><text>safe</text></svg>'],
  ["svg shape child", '<svg><rect><text>unsafe</text></rect></svg>', '<svg><rect/></svg>'],
  ["svg shape whitespace child", '<svg><rect> </rect></svg>', '<svg><rect/></svg>'],
  ["svg text child", '<svg><text><g/></text></svg>', '<svg><text><tspan>safe</tspan></text></svg>'],
  ["tspan child", '<svg><text><tspan><g/></tspan></text></svg>', '<svg><text><tspan>safe</tspan></text></svg>'],
  ["svg raw text", '<svg>unsafe</svg>', '<svg> </svg>'],
  ["nested svg", '<svg><svg/></svg>', '<svg><g/></svg>'],
  ["svg element in html", '<g></g>', '<svg><g/></svg>'],
  ["nested anchors", '<a><span><a>unsafe</a></span></a>', '<a><span>safe</span></a>'],
  ["block inside paragraph", '<p><ul><li>unsafe</li></ul></p>', '<p><span>safe</span></p>'],
  ["block inside span inside paragraph", '<p><span><h2>unsafe</h2></span></p>', '<p><span>safe</span></p>'],
  ["nested headings", '<h2><h3>unsafe</h3></h2>', '<h2><span>safe</span></h2>'],
  ["block inside pre", '<pre><p>unsafe</p></pre>', '<pre><code>safe</code></pre>'],
  ["list prose", '<ul>unsafe<li>safe</li></ul>', '<ul> <li>safe</li></ul>'],
  ["list nonitem", '<ol><p>unsafe</p></ol>', '<ol><li>safe</li></ol>'],
  ["orphan list item", '<li>unsafe</li>', '<ul><li>safe</li></ul>'],
  ["table foster parenting", '<table>unsafe<tbody><tr><td>safe</td></tr></tbody></table>', '<table> <tbody><tr><td>safe</td></tr></tbody></table>'],
  ["table Unicode whitespace", '<table>\u00a0<tbody></tbody></table>', '<table> <tbody></tbody></table>'],
  ["missing tbody", '<table><tr><td>unsafe</td></tr></table>', '<table><tbody><tr><td>safe</td></tr></tbody></table>'],
  ["duplicate tbody", '<table><tbody></tbody><tbody></tbody></table>', '<table><tbody></tbody></table>'],
  ["late caption", '<table><tbody></tbody><caption>unsafe</caption></table>', '<table><caption>safe</caption><tbody></tbody></table>'],
  ["late thead", '<table><tbody></tbody><thead></thead></table>', '<table><thead></thead><tbody></tbody></table>'],
  ["duplicate caption", '<table><caption>a</caption><caption>b</caption><tbody></tbody></table>', '<table><caption>a</caption><tbody></tbody></table>'],
  ["row prose", '<table><tbody><tr>unsafe</tr></tbody></table>', '<table><tbody><tr><td>safe</td></tr></tbody></table>'],
  ["orphan cell", '<td>unsafe</td>', '<table><tbody><tr><td>safe</td></tr></tbody></table>'],
  ["orphan row", '<tr><td>unsafe</td></tr>', '<table><tbody><tr><td>safe</td></tr></tbody></table>'],
  ["orphan caption", '<caption>unsafe</caption>', '<table><caption>safe</caption><tbody></tbody></table>'],
  ["nested table", '<table><tbody><tr><td><table><tbody></tbody></table></td></tr></tbody></table>', '<table><tbody><tr><td>safe</td></tr></tbody></table>'],
] as const) test(`[reject-structural-constructs] content model ${label}`, () => refuses(input, "content-model", control));

for (const [name, value] of [["d", "L0 0"], ["d", "M0"], ["d", "M0 0L1"], ["d", "M0 0Z1"], ["d", "m0 0"], ["d", "M0 0!L1 1"], ["d", "M,0,0"], ["d", "M0,,0"], ["d", "M0 0,"], ["d", "M0 0A1 1 0 2 0 0 0"], ["d", "M0 0A1 1 0 1.0 0 0 0"], ["d", "M0 0A-1 1 0 0 0 0 0"], ["d", "M0 0A1 1"], ["width", "-1"], ["width", "1000001"], ["width", "1e999"], ["width", "NaN"], ["width", "1 2"], ["width", ""], ["points", "0 0 1"], ["points", "0,0,"], ["transform", "translate()"], ["transform", "rotate(1 2)"], ["transform", "scale(1 2 3)"], ["transform", "matrix(1 0 0 1 0 0)"], ["transform", "translate(1)!"], ["transform", "translate((1))"]]) {
  const tag = name === "d" ? "path" : name === "points" ? "polyline" : "rect";
  test(`[reject-structural-constructs] invalid geometry ${name} ${value}`, () => refuses(svg(`<${tag} ${name}="${value}"/>`), "geometry-invalid", svg(`<${tag}/>`)));
}
test("[reject-structural-constructs] viewBox arity and dimensions", () => {
  for (const value of ["0 0 1", "0 0 -1 1", "0 0 1 -1"]) refuses(`<svg viewBox="${value}"></svg>`, "geometry-invalid", '<svg viewBox="0 0 1 1"></svg>');
});

test("[reject-structural-constructs] invalid configuration is rejected without invoking accessors", () => {
  const getter = Object.defineProperty({}, "tokens", { get() { throw new Error("must not invoke getter"); } });
  for (const options of [null, 1, [], "x", { unknown: [] }, { tokens: ["bad token"] }, { tokens: ["x".repeat(33)] }, { classes: Array(1) }, { classes: Array(51).fill("x") }, { markers: ["dot"] }, { limits: { maxDepth: 21 } }, { limits: null }, getter]) {
    assert.equal(reason(sanitizeFragment("<p>safe</p>", options as Options)), "invalid-options");
  }
  accepts("<p>safe</p>", { limits: { maxDepth: 1 } });
});
test("[reject-oversize-and-deep] sanitizer preserves parser limits and canonical output caps", () => {
  refuses("<p>long</p>", "text-length", "<p>x</p>", { limits: { maxText: 1 } });
  refuses("<p>></p>", "text-length", "<p>x</p>", { limits: { maxText: 1 } });
  refuses(svg('<path d="M0 0L1 1"/>'), "path-length", svg('<path d="M0 0"/>'), { limits: { maxPathD: 8 } });
});
test("[number-mismatch] numeric bindings compose with the evidence checker", () => {
  const snapshot = { pitches: { items: { status: "observed", value: ["a", "b", "c"], evidence: [] } } };
  const good = accepts('<data value="pitches.items.length">3.0</data>');
  assert.equal(good.html, '<data value="pitches.items.length">3</data>');
  assert.deepEqual(checkCitations(good.citations, snapshot, "."), { ok: true });
  const bad = accepts('<data value="pitches.items.length">12</data>');
  assert.equal(checkCitations(bad.citations, snapshot, ".").ok, false);
});
test("[number-mismatch] bare digits including svg and inline splits remain unbound", () => {
  for (const input of ['<p>12 pitches</p>', '<p>1<span>2</span></p>', '<svg><text>12</text></svg>', '<svg><title>Chart 12</title></svg>', '<a href="docs/a.md">12</a>']) {
    const result = accepts(input);
    assert.ok(result.citations.unbound > 0);
  }
  assert.equal(accepts('<pre>12<code>34</code></pre><code>56</code>').citations.unbound, 0);
});
test("[number-mismatch] invalid data content rejects", () => {
  for (const input of ['<data>3</data>', '<data value="x"></data>', '<data value="x"><span>3</span></data>', '<data value="x">03</data>', '<data value="x">NaN</data>', '<data value="x">1e3</data>', `<data value="x">${"1".repeat(65)}</data>`]) refuses(input, "content-model", '<data value="x">3</data>');
});
test("[evidence-path-not-in-snapshot] combined citation cap", () => {
  const link = '<a href="docs/a.md">source</a>', number = '<data value="count">3</data>';
  accepts(link.repeat(25) + number.repeat(25));
  refuses(link.repeat(25) + number.repeat(26), "citation-limit", link.repeat(25) + number.repeat(25));
});
test("[reject-structural-constructs] parser rejection is returned intact", () => {
  refuses("<!--x-->", "comment", "");
  refuses("<p/>", "content-model", "<p></p>");
  refuses("<p>\u202e</p>", "control-character", "<p>safe</p>");
});

// Dataset-literal vectors that carry real attack attributes or content, not only an empty element.
for (const [id, label, input, expected, control] of [
  ["reject-script-element", "script element with payload", svg("<script>alert(1)</script>"), "element-not-allowed", svg("<text>alert(1)</text>")],
  ["reject-smil-href", "set element with attributeName href and javascript to", svg('<set attributeName="href" to="javascript:alert(1)"/>'), "element-not-allowed", svg("")],
  ["reject-smil-href", "animate element with href values", svg('<animate attributeName="href" values="javascript:alert(1)"/>'), "element-not-allowed", svg("")],
  ["reject-external-use", "use element with external href", svg('<use href="https://example.com/a.svg"/>'), "element-not-allowed", svg("")],
  ["reject-style-attribute", "svg style with url javascript", svg('<rect style="fill:url(javascript:alert(1))"/>'), "style-attribute", svg("<rect/>")],
  ["reject-entity-encoded-javascript", "hexadecimal reference in scheme", '<a href="&#x6A;avascript:alert(1)">link</a>', "character-reference", '<a href="docs/a.md">link</a>'],
  ["reject-structural-constructs", "doctype through sanitizer", "<!DOCTYPE html><p>x</p>", "doctype", "<p>x</p>"],
  ["reject-structural-constructs", "entity declaration through sanitizer", '<!ENTITY x "y"><p>x</p>', "entity-declaration", "<p>x</p>"],
  ["reject-structural-constructs", "cdata through sanitizer", "<p><![CDATA[x]]></p>", "cdata", "<p>x</p>"],
  ["reject-structural-constructs", "processing instruction through sanitizer", '<?xml version="1.0"?><p>x</p>', "processing-instruction", "<p>x</p>"],
  ["reject-structural-constructs", "namespace prefixed script through sanitizer", "<svg><svg:script>alert(1)</svg:script></svg>", "namespace-prefix", svg("")],
  ["reject-structural-constructs", "unclosed element through sanitizer", "<p><strong>x</strong>", "unclosed", "<p><strong>x</strong></p>"],
  ["reject-structural-constructs", "mismatched close through sanitizer", "<p><strong>x</p></strong>", "mismatched-close", "<p><strong>x</strong></p>"],
  ["reject-structural-constructs", "duplicate attribute through sanitizer", '<a href="docs/a.md" href="docs/b.md">x</a>', "duplicate-attribute", '<a href="docs/a.md">x</a>'],
  ["reject-structural-constructs", "unquoted attribute through sanitizer", "<a href=docs/a.md>x</a>", "unquoted-attribute", '<a href="docs/a.md">x</a>'],
  ["reject-structural-constructs", "unpaired surrogate through sanitizer", "<p>\ud800</p>", "invalid-unicode", "<p>x</p>"],
  ["reject-structural-constructs", "non-printable control through sanitizer", "<p>a\u0000b</p>", "control-character", "<p>ab</p>"],
] as const) test(`[${id}] ${label}`, () => refuses(input, expected, control));

test("[reject-structural-constructs] non-string sanitizer input", () => {
  for (const input of [undefined, null, 1, {}, ["<p></p>"]]) {
    const result = sanitizeFragment(input);
    assert.equal(result.ok, false, "expected input-type");
    assert.equal(reason(result), "input-type");
  }
  accepts("<p></p>");
});

// Timed adversarial inputs through the real sanitizer with default caps. The byte cap fires first, so a second group of
// vectors raises every parser cap the sanitizer allows (never depth) to prove the size cap is not the only defense.
const FUZZ_TIME_BOUND_MS = 1000;
const MEGABYTE = 1024 * 1024;
function fuzz(input: string, options?: Options): { result: Result; ms: number } {
  const start = performance.now();
  const result = sanitizeFragment(input, options);
  return { result, ms: performance.now() - start };
}
function bounded(input: string, expected: string, options?: Options): void {
  const { result, ms } = fuzz(input, options);
  assert.equal(result.ok, false, `expected ${expected}`);
  assert.equal(reason(result), expected);
  assert.ok(ms < FUZZ_TIME_BOUND_MS, `took ${ms} ms`);
}
const RAISED_CAPS = { maxBytes: 16 * MEGABYTE, maxNodes: 1_000_000, maxAttrValue: 16 * MEGABYTE, maxPathD: 16 * MEGABYTE, maxText: 16 * MEGABYTE };

test("[reject-oversize-and-deep] 100000 nested groups reject with the default size cap", () => {
  bounded(svg("<g>".repeat(100_000) + "</g>".repeat(100_000)), "size-limit");
  accepts(svg("<g>".repeat(18) + "</g>".repeat(18)));
});
test("[reject-oversize-and-deep] 5 MB path d rejects with the default size cap", () => {
  bounded(svg(`<path d="M0 0${" L1 1".repeat(5 * MEGABYTE / 5)}"/>`), "size-limit");
  accepts(svg(`<path d="M0 0${" L1 1".repeat(1000)}"/>`));
});
test("[reject-oversize-and-deep] unclosed construct 200000 lines long rejects with the default size cap", () => {
  bounded(`<a href="${"line\n".repeat(200_000)}`, "size-limit");
  accepts('<a href="docs/a.md">x</a>');
});
test("[reject-oversize-and-deep] 100000 nested groups reject by depth when the other caps are raised", () => {
  bounded(svg("<g>".repeat(100_000) + "</g>".repeat(100_000)), "depth-limit", { limits: RAISED_CAPS });
  accepts(svg("<g>".repeat(18) + "</g>".repeat(18)), { limits: RAISED_CAPS });
});
test("[reject-oversize-and-deep] 5 MB path d rejects as geometry when the other caps are raised", () => {
  bounded(svg(`<path d="M0 0${" L1 1".repeat(5 * MEGABYTE / 5)}!"/>`), "geometry-invalid", { limits: RAISED_CAPS });
  accepts(svg(`<path d="M0 0${" L1 1".repeat(1000)}"/>`), { limits: RAISED_CAPS });
});
test("[reject-oversize-and-deep] unclosed construct 200000 lines long rejects as unclosed when the other caps are raised", () => {
  bounded(`<p>${"line\n".repeat(200_000)}`, "unclosed", { limits: RAISED_CAPS });
  accepts(`<p>${"line\n".repeat(200)}</p>`, { limits: RAISED_CAPS });
});

// [rejection-message-does-not-echo]: neither the formatted message nor JSON.stringify(rejection) may carry a source
// value. The rejection object is checked as a channel of its own, separate from the message.
const MESSAGE_PATTERN = /^fragment rejected: [a-z-]{1,40} \(\d{1,6}\)( at (<[a-z][a-zA-Z0-9-]{0,31}>|\(other\)))?$/;
const GENERIC = "fragment rejected: syntax (1)";
const CANARY_BYTES = 10 * 1024;

function echoFree(input: string, expected: string, leaks: readonly string[], options?: Options): void {
  const result = sanitizeFragment(input, options);
  if (result.ok) throw new Error("expected a rejection");
  const message = rejectionMessage(result);
  const json = JSON.stringify(result);
  for (const leak of leaks) {
    assert.equal(message.includes(leak), false, "message echoes a canary fragment");
    assert.equal(json.includes(leak), false, "rejection object echoes a canary fragment");
  }
  assert.match(message, MESSAGE_PATTERN, "message leaves the closed grammar");
  assert.ok(message.length <= 120, "message exceeds 120 characters");
  assert.equal(message, expected);
}

test("[rejection-message-does-not-echo] ESC OSC and BEL in an attribute value", () => {
  echoFree(`<p data-x="\u001b]0;pwned\u0007">x</p>`, "fragment rejected: control-character (1) at (other)", ["pwned", "\u001b", "\u0007", "]0;"]);
});
test("[rejection-message-does-not-echo] 10 KB canary in an unknown attribute value", () => {
  const canary = `Canary-${"Z".repeat(CANARY_BYTES)}`;
  echoFree(`<p data-x="${canary}">x</p>`, "fragment rejected: attribute-not-allowed (1) at <data-x>", ["Canary-", "ZZZZZZZZZZZZZZZZ"], { limits: { maxAttrValue: CANARY_BYTES + 64 } });
});
test("[rejection-message-does-not-echo] U+202E bidi override in an attribute value", () => {
  echoFree(`<p data-x="‮evil-canary">x</p>`, "fragment rejected: control-character (1) at (other)", ["‮", "evil-canary", "canary"]);
});
test("[rejection-message-does-not-echo] newline inside an unknown attribute value", () => {
  echoFree(`<p title="line-one\nline-two-canary">x</p>`, "fragment rejected: attribute-not-allowed (1) at <title>", ["line-one", "line-two-canary"]);
});
test("[rejection-message-does-not-echo] script markup in an unknown attribute value", () => {
  echoFree(`<p data-x="&lt;script&gt;alert(&apos;scriptcanary&apos;)&lt;/script&gt;">x</p>`, "fragment rejected: attribute-not-allowed (1) at <data-x>", ["scriptcanary", "<script", "alert("]);
});
test("[rejection-message-does-not-echo] lower-case value canary on an unknown attribute", () => {
  echoFree(`<p data-canary="canaryvalue">x</p>`, "fragment rejected: attribute-not-allowed (1) at <data-canary>", ["canaryvalue"]);
});
test("[rejection-message-does-not-echo] element name outside the grammar is shown as (other)", () => {
  echoFree(`<P>x</P>`, "fragment rejected: element-not-allowed (1) at (other)", ["P>"]);
  echoFree(`<svg><Rect/></svg>`, "fragment rejected: element-not-allowed (1) at (other)", ["Rect"]);
  echoFree(`<1x>y</1x>`, "fragment rejected: syntax (1) at (other)", ["1x"]);
});
test("[rejection-message-does-not-echo] attribute name outside the grammar is shown as (other)", () => {
  echoFree(`<p Bad-Name-canary="x">y</p>`, "fragment rejected: attribute-not-allowed (1) at (other)", ["Bad-Name-canary"]);
  echoFree(`<p OnCanary="x">y</p>`, "fragment rejected: event-handler (1) at (other)", ["OnCanary"]);
});
test("[rejection-message-does-not-echo] every closed reason formats within the grammar and 120 characters", () => {
  const longest = "a".repeat(32);
  for (const reason of REASONS) {
    const message = rejectionMessage({ ok: false, reason, count: 999999, token: longest });
    assert.match(message, MESSAGE_PATTERN, reason);
    assert.ok(message.length <= 120, reason);
  }
});
test("[rejection-message-does-not-echo] malformed runtime rejections yield the generic message without coercion", () => {
  let calls = 0;
  const getter = Object.defineProperty({ ok: false, count: 1, token: null }, "reason", { enumerable: true, get() { calls++; return "syntax"; } });
  const coerced = { ok: false, reason: { toString() { calls++; return "syntax"; } }, count: 1, token: null };
  const coercedToken = { ok: false, reason: "syntax", count: 1, token: { [Symbol.toPrimitive]() { calls++; return "x"; } } };
  const cases: [unknown, string][] = [
    [undefined, GENERIC], [null, GENERIC], [1, GENERIC], ["fragment rejected: syntax (1)", GENERIC], [[], GENERIC],
    [{ ok: true }, GENERIC], [{ ok: false, reason: "not-a-reason", count: 1, token: null }, GENERIC],
    [{ ok: false, reason: "syntax", count: 1e9, token: null }, GENERIC], [{ ok: false, reason: "syntax", count: Number.NaN, token: null }, GENERIC],
    [{ ok: false, reason: "syntax", count: 1, token: "<script>" }, "fragment rejected: syntax (1) at (other)"],
    [{ ok: false, reason: "syntax", count: 1, token: "Canary" }, "fragment rejected: syntax (1) at (other)"],
    [{ ok: false, reason: "syntax", count: 1, token: 7 }, GENERIC],
    [getter, GENERIC], [coerced, GENERIC], [coercedToken, GENERIC],
    [Object.assign(Object.create(null), { ok: false, reason: "syntax", count: 1, token: null }), "fragment rejected: syntax (1) at (other)"],
  ];
  for (const [input, expected] of cases) assert.equal(rejectionMessage(input as Rejection), expected);
  assert.equal(calls, 0, "no getter or coercion runs on a caller value");
});
test("[rejection-message-does-not-echo] a proxy that throws on every trap yields the generic message", () => {
  const hostile = new Proxy({}, {
    get() { throw new Error("get trap"); },
    getOwnPropertyDescriptor() { throw new Error("descriptor trap"); },
    getPrototypeOf() { throw new Error("prototype trap"); },
    ownKeys() { throw new Error("keys trap"); },
  });
  assert.equal(rejectionMessage(hostile as Rejection), GENERIC);
  assert.equal(rejectionMessage(sanitizeFragment(hostile) as Rejection), "fragment rejected: input-type (1) at (other)");
});

test("[reject-structural-constructs] option arrays use bounded own data without iterators or getters", () => {
  let calls = 0;
  const classes = ["panel"];
  Object.defineProperty(classes, Symbol.iterator, { value: function* () { calls++; yield "unsafe"; } });
  refuses('<p class="unsafe">x</p>', "class-not-allowed", '<p class="panel">x</p>', { classes });
  const accessor = ["panel"];
  Object.defineProperty(accessor, "0", { get() { calls++; return "panel"; } });
  const invalid = sanitizeFragment("<p>x</p>", { classes: accessor });
  assert.equal(reason(invalid), "invalid-options");
  assert.equal(calls, 0);
});

test("[reject-structural-constructs] tspan requires its text parent", () => {
  const control = '<svg><text><tspan>safe</tspan></text></svg>';
  refuses('<svg><tspan>safe</tspan></svg>', "content-model", control);
  refuses('<svg><g><tspan>safe</tspan></g></svg>', "content-model", control);
});

test("[number-mismatch] combined pipeline rejects bare digits and accepts bound facts", () => {
  const snapshot = { count: { value: 3, status: "observed", evidence: [] } };
  const bare = checkCitations(accepts('<p>12 pitches</p>').citations, snapshot, ".");
  assert.equal(bare.ok, false);
  if (!bare.ok) assert.equal(bare.reason, "unbound-number");
  assert.deepEqual(checkCitations(accepts('<data value="count">3</data>').citations, snapshot, "."), { ok: true });
});

test("[accept-valid-fragment] geometry magnitude at the inclusive bound", () => {
  accepts('<svg><rect width="1000000" x="-1000000"/></svg>');
});


test("[reject-oversize-and-deep] limits snapshot preserves the hard depth ceiling", () => {
  assert.equal(reason(sanitizeFragment("<p>x</p>", { limits: { maxDepth: 21 } })), "invalid-options");
  let reads = 0;
  const limits = new Proxy({ maxDepth: 100 }, {
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return key === "maxDepth" ? { ...descriptor, value: ++reads <= 2 ? 20 : 100 } : descriptor;
    },
  });
  const result = sanitizeFragment(svg("<g>".repeat(20) + "</g>".repeat(20)), { limits });
  assert.equal(reason(result), "depth-limit");
  assert.equal(reads, 1, "caller limits are resolved once before both parse passes");
  const hostile = new Proxy({}, { ownKeys() { throw new Error("trap"); } });
  assert.equal(reason(sanitizeFragment("<p>x</p>", { limits: hostile })), "invalid-options");
  accepts(svg("<g>".repeat(19) + "</g>".repeat(19)));
});

test("[reject-structural-constructs] nested tspan and data text boundary", () => {
  refuses('<svg><text><tspan><tspan>x</tspan></tspan></text></svg>', "content-model", '<svg><text><tspan>x</tspan></text></svg>');
  const exact = "0." + "0".repeat(61) + "1";
  assert.equal(exact.length, 64);
  accepts(`<data value="tiny">${exact}</data>`);
  refuses(`<data value="tiny">0.${"0".repeat(62)}1</data>`, "content-model", `<data value="tiny">${exact}</data>`);
});
