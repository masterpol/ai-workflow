# S1 security spike: state-fragment-sanitizer

Date: 2026-10-19
Base: d2d8ee1d0b71a6450464f2359ba9fd47bce54424

Build start approved by owner. S1 runs inline, as planned. Orca startup: ready, coordinator
codex, workers claude/opencode. Bound Run: `run_76430abd338c`, objective matches this pitch;
coordinator handle: `term_18258b50-0348-43bb-b991-b1766cbe1d50`. No worker dispatched in S1.
Existing changes to `graphify-out/GRAPH_REPORT.md` and `graphify-out/graph.json` predate build.

## Caps and line budgets

| Cap | Value | Meaning |
|-----|-------|---------|
| MAX_FRAGMENT_BYTES | 65,536 | UTF-8 bytes before token scanning; reject by UTF-16 lower bound before encoding large inputs |
| MAX_DEPTH | 20 | Element depth, including self-closed elements |
| MAX_NODES | 2,000 | Elements plus text nodes, including whitespace |
| MAX_ATTRS | 12 | Per element |
| MAX_ATTR_VALUE | 512 | Raw encoded attribute length, except path d |
| MAX_PATH_D | 8,192 | Raw path d length; replaces the general attribute cap for d |
| MAX_TEXT | 4,000 | Raw encoded length per text node |
| MAX_NAME | 32 | Element and attribute names |
| MAX_CITATIONS | 50 | Combined hrefs and numeric bindings |
| FUZZ_TIME_BOUND_MS | 1,000 | Per adversarial vector |

| Budget | Value | Module |
|--------|-------|--------|
| PARSER_LINE_BUDGET | 350 | state-fragment-parse.mts |
| VALIDATOR_LINE_BUDGET | 300 | state-fragment.mts |
| EVIDENCE_LINE_BUDGET | 150 | state-fragment-evidence.mts |

Production total remains 800 lines. No budget increase. The prototype scanner plus harness is
109 lines; production still needs typed rejections, options validation, Unicode validation and
comments. This leaves 241 lines within the parser budget. This demonstrates feasibility, not
production correctness or independent review. S2 must still pass every planned exit.

## Decisions (closed contract)

- **D1 — Parser.** Use a single forward cursor and explicit stack. Name recognition checks one character at a time; entity lookahead is bounded to the longest predefined reference. Scan an attribute or text slice once, decode once, and never search repeatedly over an unbounded suffix. Check byte size before scanning. Keep all state per call, no I/O, no dependency, no recursion. Reject malformed UTF-16, raw less-than inside attribute values, missing separators and malformed names. Caps are positive safe integers; partial limits override defaults explicitly, with invalid options returning `invalid-options`. Raised caps are trusted test controls; sanitizer must never raise its production depth above 20, so bounded validation recursion remains safe.
- **D2 — Entities and text.** Decode only `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`; every numeric or other named reference rejects as `character-reference`. Escape all five characters on emit, using `&apos;` rather than `&#39;`, so canonical output is accepted again. Reject C0 except TAB/LF/CR, C1 including DEL, bidi overrides U+202A–202E and isolates U+2066–2069. Reject malformed surrogates. HTML and attribute case must be canonical; never case-fold unknown names into an accepted name. Duplicate attributes are detected case-insensitively before validator case checks.
- **D3 — Allow-list.** HTML: `h2 h3 h4 p ul ol li table caption thead tbody tr th td code pre strong em span a data`. SVG: `svg g rect circle ellipse line polyline polygon path text tspan title desc`. HTML attributes: `class` globally, `href` on a, `value` on data, `scope` on th (row/col only). SVG: `class`; root `viewBox width height`; geometry appropriate to each shape (`x y x1 y1 x2 y2 width height rx ry cx cy r points d`); text/tspan `x y dx dy`; presentation `fill stroke stroke-width`; groups/shapes/text `transform`. No xmlns attributes: the HTML parser supplies the namespace. No attribute outside this table. Always refuse on* (case-insensitive), style, id and url() before per-element attribute validation. Refuse javascript: after removing ASCII scheme whitespace and case-folding; parser entity rejection is an earlier independent layer. SVG anchors, nested svg, defs, marker elements, use, animation and all resource-loading tags are absent. Geometry uses finite bounded numbers (absolute value <= 1e6), canonical decimal output; points use paired coordinates; d uses only M/L/H/V/C/S/Q/T/A/Z commands and finite operands with command arity and arc flags checked. Transform accepts only translate/scale/rotate with their fixed arities. No raw geometry is copied to output.
- **D4 — Content model.** Root is flow HTML or one svg subtree; top-level text is permitted. HTML phrasing elements contain phrasing only; p, headings and pre cannot acquire block descendants through a span or anchor. No nested anchors anywhere in ancestry; no nested headings. Lists contain only li and whitespace; li requires a list parent. Tables require `caption? thead? tbody` in that order, exactly one tbody; sections contain tr; rows contain th/td; table structural positions allow whitespace only, never foster-parented prose. Table structures require their named parent and nested tables are refused. SVG can occur only in HTML flow/phrasing positions and contains only allowed SVG elements; g is a container; shapes have no children. SVG text contains text/tspan, tspan contains text only. SVG title/desc contain text only and no HTML or SVG child elements. HTML void elements and self-closed HTML are rejected. Parser tree type stays unchanged: represent a self-closed HTML node as a parser `content-model` rejection, while SVG self-closure expands to an explicit start/end pair on emission. These rules eliminate the selected implied-end-tag, integration-point and foster-parenting differentials; they do not claim browser execution evidence.
- **D5 — Browser behavior evidence.** Use deterministic fixtures, not a new browser dependency. Rebuilt fixture list: HTML breakout inside svg; children inside SVG title/desc; nested anchors; block descendant of p through a span; nested headings; table prose; missing tbody; misplaced/duplicated/late caption or thead; misplaced tr/td/li; self-closed HTML; mixed-case HTML/attribute names; unclosed formatting; encoded ampersands and numeric references. Grounding: WHATWG HTML parsing, foreign content and in-table insertion modes, https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign and https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-intable (read 2026-10-19). No manual browser smoke was run. Inject only in an ordinary HTML flow container later; table/select/raw-text/SVG injection contexts are outside this contract.
- **D6 — Numbers.** Bind through `<data value="pitches.items.length">3</data>`; data contains one nonempty numeric text value and no elements. Citations retain the canonical text and own-property snapshot path. Lookup unwraps a snapshot fact's own value when traversing that fact; arrays allow only length or bounded canonical indices; no prototype traversal, accessors, inherited properties or coercion. Reject __proto__/constructor/prototype segments. Numeric leaves must be finite numbers, equality is numeric after strict decimal parsing (no hexadecimal/Infinity/NaN); an array length is numeric. A bare ASCII numeral anywhere in visible text outside code/pre/data increments unbound, including SVG text/tspan, headings, link labels and descriptions. Code/pre are explicit literal-code exemptions, not facts. No time/date exemption or time element. Geometry, token names and citation paths are not prose. Sanitizer returns unbound; checkCitations rejects it as unbound-number. The combined pipeline, not sanitizeFragment alone, enforces numeric truth.
- **D7 — Colors, classes, markers.** Accept exact `var(--TOKEN)` on fill/stroke with TOKEN in the trusted token list, plus fixed `none`; emit from the parsed token. Default tokens: background, foreground, primary, primaryForeground, muted, mutedForeground, border. No arbitrary CSS, paint URLs, fallback var values, hex or named colors. Classes are whitespace-separated trusted names; defaults empty except marker-arrow in the separate marker list. Always refuse status and status-* even if injected options contain them. Marker classes start marker- and require marker-list membership; marker elements, ids and marker URL attributes remain refused. The future host owns CSS marker definitions. Configuration arrays are bounded and names match a bounded ASCII identifier grammar. Canonical emission preserves input attribute order deterministically. Browser appearance under CSP is unverified and belongs to integration; sanitization does not rely on paint support.
- **D8 — Evidence and transcripts.** First classify path shape to obtain traversal/absolute/scheme/percent/backslash/secret-path/transcript-path. Refuse transcript-bearing directory segments `transcripts`, `sessions`, `.sessions`, `session-logs`, `conversation-logs`, and transcript/conversation/session-log basenames (case-insensitive, delimited by dot, dash or underscore), plus `.jsonl` files. This conservative scope protects session text without refusing an arbitrary source file named session.mts. Build snapshot evidence membership from facts(snapshot), then require membership and the shared createStateRender(deps).safeEvidencePath after canonicalizing root once. No local replacement for its symlink/realpath checks. External URLs, protocol-relative paths, percent encodings and backslashes never reach it. checkCitations validates its runtime input shape and counts before traversal; it reads no fragment file and writes nothing.
- **D9 — Hrefs.** Canonical href remains project-relative with no prefix rewrite, fragments, query or scheme. Injector owns ../../ prefix after validation. sanitizeFragment collects raw decoded hrefs and bounds their count but checkCitations is the path authority. A successful sanitizer result alone is never permission to inject. All shared state modules stay unchanged.
- **D10 — Types and failures.** Export Node/Limits/ReasonCode/Rejection from parser; Citations from validator (evidence imports it type-only). Keep S1's public API signatures from plan. Limits keys are maxBytes/maxDepth/maxNodes/maxAttrs/maxAttrValue/maxPathD/maxText/maxName. Parser owns reject(reason,count=1,token=null), with count clamped to 1..999999 and token either an approved bounded name or null. Unknown names become `(other)` in messages. No error or rejection stores a source value. rejectionMessage formats only a validated reason, count and name and applies printable before final closed-grammar enforcement; arbitrary runtime input also produces a safe generic rejection. The printable mutant may be redundant with the closed-grammar check; S6 must measure it and use the plan's redundant-layer mechanism rather than weaken the formatter to make that mutant observable.

## Closed reason list

- `input-type`
- `invalid-options`
- `invalid-unicode`
- `syntax`
- `size-limit`
- `depth-limit`
- `node-limit`
- `attribute-limit`
- `attribute-length`
- `path-length`
- `text-length`
- `name-length`
- `doctype`
- `entity-declaration`
- `cdata`
- `comment`
- `processing-instruction`
- `namespace-prefix`
- `character-reference`
- `unclosed`
- `mismatched-close`
- `duplicate-attribute`
- `unquoted-attribute`
- `control-character`
- `element-not-allowed`
- `event-handler`
- `style-attribute`
- `id-attribute`
- `url-reference`
- `script-scheme`
- `attribute-not-allowed`
- `class-not-allowed`
- `color-not-token`
- `marker-not-allowed`
- `content-model`
- `geometry-invalid`
- `citation-limit`
- `traversal`
- `absolute`
- `scheme`
- `percent`
- `backslash`
- `secret-path`
- `transcript-path`
- `evidence-not-in-snapshot`
- `unsafe-path`
- `unknown-fact`
- `not-a-number`
- `number-mismatch`
- `unbound-number`

Count denotes rejected occurrences known at the first failure, not a scan of the rest of an unsafe
fragment. Return the first deterministic reason; never strip-and-continue. Typed unknown rejection
input falls back to syntax. Tests assert each vector's first reason, including earlier-layer rejects.

## Mutation ledger

Before strings are prescribed guard anchors for the production implementation. S2–S4 must use these
anchors or record their exact replacement before running a mutant. The scratch prototype is not the
mutant target. Every mutant needs an unmodified baseline in the same harness and a named assertion
failure. No fixture/import error counts. Paired positive controls remove only the offending vector.

| ID | Guard | Module | Exact before string | Test name | Expected reason | Status |
|----|-------|--------|---------------------|-----------|-----------------|--------|
| M1 | UTF-8 byte cap | parser | `if (bytes > limits.maxBytes)` | [reject-oversize-and-deep] byte cap | `size-limit` | killed |
| M2 | depth cap | parser | `if (depth > limits.maxDepth)` | [reject-oversize-and-deep] depth cap | `depth-limit` | killed |
| M3 | node cap | parser | `if (count > limits.maxNodes)` | [reject-oversize-and-deep] node cap | `node-limit` | killed |
| M4 | attribute count | parser | `if (attrs.length >= limits.maxAttrs)` | [reject-structural-constructs] attribute count | `attribute-limit` | killed |
| M5 | attribute length | parser | `if (length > limits.maxAttrValue)` | [reject-structural-constructs] attribute length | `attribute-length` | killed |
| M6 | path length | parser | `if (length > limits.maxPathD)` | [reject-oversize-and-deep] path length | `path-length` | killed |
| M7 | text length | parser | `if (length > limits.maxText)` | [reject-structural-constructs] text length | `text-length` | killed |
| M8 | name length | parser | `if (length > limits.maxName)` | [reject-structural-constructs] name length | `name-length` | killed |
| M9 | DOCTYPE | parser | `text.startsWith("<!DOCTYPE", cursor)` | [reject-structural-constructs] doctype | `doctype` | killed |
| M10 | ENTITY declaration | parser | `text.startsWith("<!ENTITY", cursor)` | [reject-structural-constructs] entity declaration | `entity-declaration` | killed |
| M11 | CDATA | parser | `text.startsWith("<![CDATA[", cursor)` | [reject-structural-constructs] cdata | `cdata` | killed |
| M12 | comments | parser | `text.startsWith("<!--", cursor)` | [reject-structural-constructs] comment | `comment` | killed |
| M13 | processing instruction | parser | `text.startsWith("<?", cursor)` | [reject-structural-constructs] processing instruction | `processing-instruction` | killed |
| M14 | namespace | parser | `name.includes(":")` | [reject-structural-constructs] namespace prefix | `namespace-prefix` | killed |
| M15 | predefined entities | parser | `!Object.hasOwn(ENTITIES, key)` | [reject-entity-encoded-javascript] numeric reference | `character-reference` | killed |
| M16 | unclosed stack | parser | `if (stack.length !== 0)` | [reject-structural-constructs] unclosed | `unclosed` | killed |
| M17 | close match | parser | `if (open.name !== name)` | [reject-structural-constructs] mismatched close | `mismatched-close` | killed |
| M18 | attribute duplicate | parser | `seen.has(name.toLowerCase())` | [reject-structural-constructs] duplicate attribute | `duplicate-attribute` | killed |
| M19 | quoted value | parser | `if (!isQuote(quote))` | [reject-structural-constructs] unquoted attribute | `unquoted-attribute` | killed |
| M20 | control characters | parser | `if (hasForbiddenControl(text))` | [reject-structural-constructs] control character | `control-character` | killed |
| M21 | well-formed Unicode | parser | `if (!text.isWellFormed())` | [reject-structural-constructs] unpaired surrogate | `invalid-unicode` | killed |
| M22 | element allow-list | validator | `if (!allowedElements.has(node.name))` | [reject-script-element] script element | `element-not-allowed` | killed |
| M23 | event attributes | validator | `if (lower.startsWith("on"))` | [reject-event-handler] onload | `event-handler` | killed |
| M24 | style attribute | validator | `if (lower === "style")` | [reject-style-attribute] empty style | `style-attribute` | killed |
| M25 | id attribute | validator | `if (lower === "id")` | [reject-structural-constructs] id attribute | `id-attribute` | killed |
| M26 | paint URL | validator | `if (hasUrlReference(value))` | [reject-style-attribute] url reference | `url-reference` | killed |
| M27 | script scheme | validator | `if (hasScriptScheme(value))` | [reject-entity-encoded-javascript] literal script scheme | `script-scheme` | killed |
| M28 | attribute allow-list | validator | `if (!allowedAttributes.has(name))` | [reject-structural-constructs] unknown attribute | `attribute-not-allowed` | killed |
| M29 | class membership | validator | `if (!classes.has(name))` | [reject-structural-constructs] class membership | `class-not-allowed` | killed |
| M30 | color tokens | validator | `if (!tokens.has(token))` | [reject-structural-constructs] unknown color token | `color-not-token` | killed |
| M31 | marker membership | validator | `if (!markers.has(name))` | [reject-structural-constructs] marker membership | `marker-not-allowed` | killed |
| M32 | content model | validator | `if (!validContent(node, context))` | [reject-structural-constructs] svg integration point | `content-model` | killed |
| M33 | emit escaping | validator | `escapeText(node.text)` | [accept-valid-fragment] escape five characters | accepted output equality | killed |
| M34 | canonical numbers | validator | `String(number)` | [accept-valid-fragment] canonical geometry | accepted output equality | killed |
| M35 | href snapshot membership | evidence | `if (!evidence.has(href))` | [evidence-path-not-in-snapshot] missing from snapshot | `evidence-not-in-snapshot` | killed |
| M36 | shared filesystem authority | evidence | `if (!render.safeEvidencePath(canonicalRoot, href))` | [evidence-path-not-in-snapshot] symlink | `unsafe-path` | killed |
| M37 | traversal classification | evidence | `if (segments.includes(".."))` | [reject-external-anchor] parent traversal | `traversal` | killed |
| M38 | absolute paths | evidence | `if (href.startsWith("/"))` | [reject-external-anchor] absolute path | `absolute` | killed |
| M39 | schemes | evidence | `if (hasScheme(href))` | [reject-external-anchor] external scheme | `scheme` | killed |
| M40 | percent encodings | evidence | `if (href.includes("%"))` | [reject-external-anchor] percent traversal | `percent` | killed |
| M41 | backslashes | evidence | `if (href.includes("\\"))` | [reject-external-anchor] backslash | `backslash` | killed |
| M42 | secret paths | evidence | `if (segments.some(isSecretName))` | [evidence-path-not-in-snapshot] secret path | `secret-path` | killed |
| M43 | transcript paths | evidence | `if (isTranscriptPath(href))` | [evidence-path-not-in-snapshot] transcript path | `transcript-path` | killed |
| M44 | citation count | evidence | `if (count > MAX_CITATIONS)` | [evidence-path-not-in-snapshot] citation count | `citation-limit` | killed |
| M45 | unknown fact | evidence | `if (!Object.hasOwn(current, segment))` | [number-mismatch] unknown fact | `unknown-fact` | killed |
| M46 | prototype guard | evidence | `if (FORBIDDEN_SEGMENTS.has(segment))` | [number-mismatch] prototype path | `unknown-fact` | killed |
| M47 | numeric leaf | evidence | `if (typeof value !== "number")` | [number-mismatch] non numeric leaf | `not-a-number` | killed |
| M48 | numeric equality | evidence | `if (Number(binding.text) !== value)` | [number-mismatch] unequal binding | `number-mismatch` | killed |
| M49 | unbound digits | evidence | `if (citations.unbound > 0)` | [number-mismatch] bare numeral | `unbound-number` | killed |
| M50 | token provenance | validator | `safeToken(name)` | [rejection-message-does-not-echo] value canary | `syntax` | killed: S6 M50 named canary assertion |
| M51 | printable defense | validator | `printable(message)` | [rejection-message-does-not-echo] terminal controls | `syntax` | redundant-layer: S6 D10, 7507 identical outputs |
| M52 | TAP skip directives | dataset | `if (hasDirective(line))` | [accept-valid-fragment] skip is unenforced | mapping assertion | killed: S7 named skip negative control |

The two accepted-output assertions and TAP mapping assertion do not introduce rejection reasons.
S5 records redundant layers with measured evidence, rather than counting an earlier failure as a kill.
S7 owns the TAP row. Additional SMIL/use/math/template/foreignObject/iframe/object/image and class-spoof
vectors use the element/class guard rows but each has its own named test and positive control.

## Prototype evidence (author-run)

Scratch: `.project/metrics/state-fragment-sanitizer/prototype.mts` (Git-ignored; not production).
Command: `node --experimental-strip-types --disable-warning=ExperimentalWarning .project/metrics/state-fragment-sanitizer/prototype.mts`
Exit: 0. Verbatim output from the first run:

```text
Prototype controls: 4 accepted; 12 named rejections passed
measured: deep, 700000 bytes, 51.60 ms, accepted
measured: open-attribute, 2097158 bytes, 24.72 ms, unclosed
measured: repeated-open, 2097152 bytes, 2.02 ms, syntax
measured: ampersands, 2097152 bytes, 26.31 ms, character-reference
measured: declarations, 2097152 bytes, 2.16 ms, syntax
Prototype size: 109 total scratch lines (includes harness)
```

The deep input has 100,000 nested groups and no RangeError. All raised-cap adversarial vectors finish
below 1,000 ms. Normal production caps remain unchanged. These measurements prove only the spike
algorithm's feasibility; no production module, integrated sanitizer or full corpus was tested yet.

## S1 completion evidence

All checks below ran in this build session. Every exit code was 0. Commands use the repository
root unless noted. No application build applies to this documentation/prototype scope.

```text
test -f .project/pitches/state-fragment-sanitizer/spike-s1.md
(no output; exit 0)

grep -cE '^\| (MAX_FRAGMENT_BYTES|MAX_DEPTH|MAX_NODES|MAX_ATTRS|MAX_ATTR_VALUE|MAX_PATH_D|MAX_TEXT|MAX_NAME|MAX_CITATIONS|FUZZ_TIME_BOUND_MS) \| [0-9][0-9,]* \|' .project/pitches/state-fragment-sanitizer/spike-s1.md
10

grep -cE '^\| (PARSER|VALIDATOR|EVIDENCE)_LINE_BUDGET \| [0-9]+ \|' .project/pitches/state-fragment-sanitizer/spike-s1.md
3

grep -c 'measured:' .project/pitches/state-fragment-sanitizer/spike-s1.md
5

grep -cE '^- \*\*D[0-9]+' .project/pitches/state-fragment-sanitizer/spike-s1.md
10

grep -cE '^\| M[0-9]+ \|.*\| \[[a-z-]+\].*\| planned \|$' .project/pitches/state-fragment-sanitizer/spike-s1.md
52

grep -c '^Base: [0-9a-f]\{40\}$' .project/pitches/state-fragment-sanitizer/spike-s1.md
1
```

Reason closure and budget verification command (exit 0):

```sh
node -e 'const fs=require("node:fs"),assert=require("node:assert/strict"),s=fs.readFileSync(".project/pitches/state-fragment-sanitizer/spike-s1.md","utf8"),reasons=new Set([...s.matchAll(/^- `([a-z-]+)`$/gm)].map(x=>x[1]));let count=0;for(const row of s.split("\n").filter(x=>/^\| M[0-9]+ /.test(x))){const expected=row.split("|")[6].trim();if(expected.startsWith("`")){assert.ok(reasons.has(expected.slice(1,-1)),expected);count++;}}assert.ok(count>=30);const budgets=[...s.matchAll(/^\| (PARSER|VALIDATOR|EVIDENCE)_LINE_BUDGET \| ([0-9]+) \|/gm)].map(x=>Number(x[2]));assert.equal(budgets.length,3);assert.ok(budgets[0]<=350);assert.ok(budgets.reduce((a,b)=>a+b,0)<=800);console.log(`reason closure: ${count} mutation rejection rows in ${reasons.size} closed reasons; budgets ${budgets.join("+")} = ${budgets.reduce((a,b)=>a+b,0)}`);'
```

```text
reason closure: 49 mutation rejection rows in 50 closed reasons; budgets 350+300+150 = 800
```

S1 is done with author-run evidence; owner scope approval is pending. S2–S8 have not started.
No independent security review or browser smoke is claimed. The current status index shows
state-report-redesign already shipped; state-design.mts exports slots but no fragment token/marker
lists. Minimal defaults and the later state-ai-authoring integration point remain as planned.
