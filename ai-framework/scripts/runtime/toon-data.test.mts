import { describe, test } from "node:test";
import assert from "node:assert";
import { DATA_HEADER, MAX_DATA_DEPTH, dataEquals, dataErrorCodes, encodeData, parseData } from "./toon-data.mts";

/*
mutant-s1-quoting-numericStringUnquoted
mutant-s1-quoting-commaInCellSplitsRow
mutant-s1-count-tableRowCountIgnored
mutant-s1-count-inlineSizeIgnored
mutant-s1-order-columnOrderNotChecked
mutant-s1-keys-forbiddenKeyAcceptedWhenQuoted
mutant-s1-header-missingHeaderAccepted
mutant-s1-depth-unbounded
*/

function roundTrip(value: Record<string, unknown>): string {
    const encoded = encodeData(value);
    assert.strictEqual(encoded.status, "encoded");
    const parsed = parseData((encoded as { text: string }).text);
    assert.strictEqual(parsed.status, "parsed", JSON.stringify(parsed));
    assert.deepStrictEqual((parsed as { value: unknown }).value, value);
    return (encoded as { text: string }).text;
}

function refusedCode(text: unknown, options?: { maxBytes?: number }): string {
    const outcome = parseData(text, options);
    assert.strictEqual(outcome.status, "refused");
    return (outcome as { problem: { code: string } }).problem.code;
}

describe("round trip", () => {
    test("uniform objects become a table and survive", () => {
        const text = roundTrip({ cases: [{ id: "a", n: 1, ok: true, note: null }, { id: "b", n: 2.5, ok: false, note: "x" }] });
        assert.match(text, /cases\[2\]\{id,n,ok,note\}:/);
    });

    test("strings that look like other types stay strings", () => {
        roundTrip({ rows: [{ a: "007", b: "true", c: "null", d: "1e3", e: "12", f: "-1", g: "+1", h: ".5", i: "@x" }] });
        roundTrip({ list: ["007", "true", "null", "1e3", "12"] });
    });

    test("real numbers and booleans do not become strings", () => {
        const value = { n: [0, -1, 1.5, 1e21, 1e-7], b: [true, false], z: null };
        const text = roundTrip(value);
        assert.match(text, /n\[5\]: 0,-1,1.5,1e\+21,1e-7/);
    });

    test("negative zero is kept", () => {
        const parsed = parseData(`${DATA_HEADER}\nx: -0\n`);
        assert.strictEqual(parsed.status, "parsed");
        assert.ok(Object.is((parsed as { value: { x: number } }).value.x, -0));
        roundTrip({ x: -0 });
    });

    test("commas, colons, quotes, hash, brackets, spaces, newlines, empty and unicode round trip", () => {
        const odd = ["a,b", "k: v", 'say "hi"', "# not a comment", "[x]", "{y}", " lead", "trail ", "", "line1\nline2", "tab\there", "back\\slash", "é 日本 😀", "\u2028", "\u0000"];
        roundTrip({ list: odd, rows: odd.map((s, i) => ({ i, s })), obj: { text: odd[0] } });
    });

    test("keys that are not bare identifiers are quoted", () => {
        roundTrip({ "juliusbrussee/caveman/caveman": { on: true }, "with space": 1, "1st": 2, "a,b": 3, "": 4, "k:v": 5, "-dash": 6 });
    });

    test("non-uniform objects, key order and missing keys fall back to a list, never a misaligned table", () => {
        const sameKeysOtherOrder = { rows: [{ a: 1, b: 2 }, { b: 3, a: 4 }] };
        assert.doesNotMatch(roundTrip(sameKeysOtherOrder), /\{a,b\}/);
        const missing = { rows: [{ a: 1, b: 2 }, { a: 3 }] };
        assert.doesNotMatch(roundTrip(missing), /\{a,b\}/);
        const extra = { rows: [{ a: 1 }, { a: 3, b: 4 }] };
        assert.doesNotMatch(roundTrip(extra), /\{a\}/);
    });

    test("nested objects, empty containers, objects in lists with nested arrays, arrays of primitive arrays", () => {
        roundTrip({
            a: {}, b: [], c: { d: { e: [] } },
            list: [{ x: [1, 2], y: { z: "q" } }, {}, "s", 3, [1, 2], []],
            tabular: [{ k: 1 }, { k: 2 }],
        });
    });

    test("key order of the input object is preserved", () => {
        const text = roundTrip({ z: 1, a: 2, m: { y: 1, b: 2 } });
        assert.ok(text.indexOf("z:") < text.indexOf("a:"));
    });

    test("seeded random structures survive", () => {
        let seed = 12345;
        const rand = (n: number): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
        const words = ["a", "b,c", "", "007", "true", "x y", "q\"r", "n\nm", "-1", "日本", " pad "];
        const scalar = (): unknown => [() => words[rand(words.length)], () => rand(1000) / 8 - 20, () => rand(2) === 0, () => null][rand(4)]();
        const build = (depth: number): unknown => {
            const kind = depth > 3 ? 0 : rand(5);
            if (kind === 0) return scalar();
            if (kind === 1) return Array.from({ length: rand(4) }, scalar);
            if (kind === 2) return Array.from({ length: rand(4) }, () => ({ id: scalar(), v: scalar() }));
            if (kind === 3) return Array.from({ length: rand(4) }, () => build(depth + 1)).filter((v) => !Array.isArray(v) || (v as unknown[]).every((x) => x === null || typeof x !== "object"));
            const obj: Record<string, unknown> = {};
            for (let i = 0; i < rand(4); i++) obj[`k${rand(5)}`] = build(depth + 1);
            return obj;
        };
        for (let i = 0; i < 300; i++) roundTrip({ root: build(0), tail: scalar() });
    });
});

describe("refusal (parsed or refused, never a silent empty value)", () => {
    test("non-text input is refused, not treated as absent", () => {
        for (const bad of [undefined, null, 7, {}, []]) assert.strictEqual(refusedCode(bad), dataErrorCodes.input);
    });

    test("missing, wrong or late header", () => {
        for (const text of ["", "\n\n", "a: 1\n", "@toon-data 2\na: 1\n", "# hi\n@toon-data 1\n", " @toon-data 1\n"]) {
            assert.strictEqual(refusedCode(text), dataErrorCodes.header);
        }
        const empty = parseData(`${DATA_HEADER}\n`);
        assert.deepStrictEqual(empty, { status: "parsed", value: {} });
    });

    test("array size must match rows, items and inline values", () => {
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[3]{a}:\n  1\n  2\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[1]{a}:\n  1\n  2\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[2]: 1\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[1]: 1,2\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[2]:\n  - 1\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[1]{a,b}:\n  1\n`), dataErrorCodes.count);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[0]{a}:\n  1\n`), dataErrorCodes.count);
    });

    test("quoted commas do not split a cell", () => {
        const parsed = parseData(`${DATA_HEADER}\nr[1]{a,b}:\n  "x,y",2\n`);
        assert.deepStrictEqual(parsed, { status: "parsed", value: { r: [{ a: "x,y", b: 2 }] } });
    });

    test("duplicate keys and columns", () => {
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na: 1\na: 2\n`), dataErrorCodes.duplicateKey);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nr[1]{a,a}:\n  1,2\n`), dataErrorCodes.duplicateKey);
    });

    test("forbidden keys at every depth and position, quoted or not", () => {
        for (const key of ["__proto__", "constructor", "prototype"]) {
            for (const text of [
                `${DATA_HEADER}\n${key}: 1\n`,
                `${DATA_HEADER}\n"${key}": 1\n`,
                `${DATA_HEADER}\na:\n  b:\n    ${key}: 1\n`,
                `${DATA_HEADER}\nr[1]{a,${key}}:\n  1,2\n`,
                `${DATA_HEADER}\nr[1]:\n  -\n    ${key}: 1\n`,
                `${DATA_HEADER}\n${key}[0]:\n`,
            ]) assert.strictEqual(refusedCode(text), dataErrorCodes.forbiddenKey, text);
        }
        const polluted = JSON.parse('{"__proto__":{"x":1}}');
        assert.strictEqual(encodeData(polluted).status, "refused");
        assert.strictEqual(encodeData({ a: { b: JSON.parse('{"constructor":1}') } }).status, "refused");
        assert.strictEqual(({} as Record<string, unknown>).x, undefined);
    });

    test("indentation: tabs, odd steps, skipped levels and stray indents", () => {
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na:\n\tb: 1\n`), dataErrorCodes.indent);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na:\n   b: 1\n`), dataErrorCodes.indent);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na:\n      b: 1\n`), dataErrorCodes.indent);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\n  a: 1\n`), dataErrorCodes.indent);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na: 1\n  b: 2\n`), dataErrorCodes.indent);
    });

    test("malformed values and strings", () => {
        for (const body of ["a: ", "a:1", "a: tru e,x", "a: \"open", "a: \"x\" y", "a: \"\\q\"", "a: \"\\u12\"", "a: \"\\uZZZZ\"", "a: 007", "a: x:y", "a: -x", "a: [x]", "a:  x", "a: x ", "a: \"tab\there\"", "[1]: 1", "a[x]: 1", "a[99999999]: 1", "a b: 1", "- x", "a[1]:\n  x"]) {
            const outcome = parseData(`${DATA_HEADER}\n${body}\n`);
            assert.strictEqual(outcome.status, "refused", body);
        }
    });

    test("oversize input and excessive nesting", () => {
        assert.strictEqual(refusedCode(`${DATA_HEADER}\n${"a: 1\n".repeat(100)}`, { maxBytes: 100 }), dataErrorCodes.oversize);
        let text = DATA_HEADER;
        for (let i = 0; i <= MAX_DATA_DEPTH + 1; i++) text += `\n${" ".repeat(i * 2)}k:`;
        assert.strictEqual(refusedCode(`${text}\n`), dataErrorCodes.depth);
        let deep: Record<string, unknown> = {};
        for (let i = 0; i <= MAX_DATA_DEPTH + 2; i++) deep = { k: deep };
        assert.strictEqual(encodeData(deep).status, "refused");
    });

    test("encoder refuses what it cannot carry", () => {
        class Box { x = 1; }
        for (const bad of [{ a: undefined }, { a: NaN }, { a: Infinity }, { a: () => 1 }, { a: 1n }, { a: Symbol("s") }, { a: new Date(0) }, { a: new Box() }, { a: [[{ x: 1 }]] }, { a: [new Array(2)] }, { a: new Array(2) }, [], "x", null, 5]) {
            assert.strictEqual(encodeData(bad).status, "refused");
        }
    });

    test("error problems carry a code, a line and a column but never input text", () => {
        const secret = "TOPSECRETVALUE";
        for (const body of [`a: "${secret}`, `${secret}: 1 2`, `a: ${secret}:`, `a[1]: ${secret},${secret}`, `__proto__: ${secret}`, `r[1]{${secret}}:\n  1,2`]) {
            const outcome = parseData(`${DATA_HEADER}\n${body}\n`);
            assert.strictEqual(outcome.status, "refused");
            const problem = (outcome as { problem: { code: string; text: string; line?: number; column?: number } }).problem;
            assert.ok(!JSON.stringify(problem).includes(secret), body);
            assert.match(problem.code, /^DATA-[A-Z-]+$/);
            if (problem.line !== undefined) assert.ok(problem.line >= 1 && (problem.column ?? 1) >= 1);
        }
    });

    test("random garbage never throws and never parses to a value silently", () => {
        let seed = 99;
        const rand = (n: number): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
        const alphabet = ['"', ",", ":", "\n", " ", "-", "[", "]", "{", "}", "a", "1", "\\", "#", "\t", "\r", "é", "@"];
        for (let i = 0; i < 2000; i++) {
            let text = rand(2) === 0 ? `${DATA_HEADER}\n` : "";
            for (let j = rand(60); j > 0; j--) text += alphabet[rand(alphabet.length)];
            const outcome = parseData(text);
            assert.ok(outcome.status === "parsed" || outcome.status === "refused");
        }
    });

    test("CRLF input and a leading BOM are accepted", () => {
        const parsed = parseData(`\ufeff${DATA_HEADER}\r\na: 1\r\nr[1]{x}:\r\n  2\r\n`);
        assert.deepStrictEqual(parsed, { status: "parsed", value: { a: 1, r: [{ x: 2 }] } });
    });
});

describe("linear-time scanning", () => {
    test("200k lines parse and encode in bounded time", () => {
        const rows = Array.from({ length: 200_000 }, (_, i) => ({ id: i, s: `row ${i}`, ok: i % 2 === 0 }));
        const started = Date.now();
        const encoded = encodeData({ rows });
        assert.strictEqual(encoded.status, "encoded");
        const parsed = parseData((encoded as { text: string }).text, { maxBytes: 64 * 1024 * 1024 });
        assert.strictEqual(parsed.status, "parsed");
        assert.strictEqual(((parsed as { value: { rows: unknown[] } }).value.rows).length, 200_000);
        assert.ok(Date.now() - started < 10_000, "must not be quadratic");
    });

    test("very long hostile lines of quotes, commas and backslashes stay fast", () => {
        for (const filler of ['"', ",", "\\", '\\"', "a,"]) {
            const started = Date.now();
            parseData(`${DATA_HEADER}\nr[1]{a}:\n  ${filler.repeat(200_000)}\n`, { maxBytes: 64 * 1024 * 1024 });
            parseData(`${DATA_HEADER}\nk: ${filler.repeat(200_000)}\n`, { maxBytes: 64 * 1024 * 1024 });
            assert.ok(Date.now() - started < 3_000, `filler ${filler}`);
        }
    });
});

describe("audit cycle 1 regressions", () => {
    test("a wide table header scans in linear time and still catches duplicate and forbidden columns", () => {
        const names = Array.from({ length: 50_000 }, (_, i) => `k${i}`);
        const started = Date.now();
        const refused = parseData(`${DATA_HEADER}\nt[1]{${names.join(",")}}:\n  1\n`, { maxBytes: 64 * 1024 * 1024 });
        assert.strictEqual(refused.status, "refused");
        const row = names.map((_, i) => i).join(",");
        const parsed = parseData(`${DATA_HEADER}\nt[1]{${names.join(",")}}:\n  ${row}\n`, { maxBytes: 64 * 1024 * 1024 });
        assert.strictEqual(parsed.status, "parsed");
        assert.ok(Date.now() - started < 3_000, "header scan must not be quadratic");
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nt[1]{a,b,a}:\n  1,2,3\n`), dataErrorCodes.duplicateKey);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nt[1]{a,__proto__}:\n  1,2\n`), dataErrorCodes.forbiddenKey);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\nt[1]{a,b\n  1,2\n`), dataErrorCodes.syntax);
    });

    test("lone surrogates and DEL are escaped so they survive the bytes on disk", () => {
        const odd = { a: "x\ud800y", b: ["\udc00", "ok"], rows: [{ k: "\ud83d", v: "a\u007fb" }], "k\ud800ey": 1, "del\u007fkey": 2, pair: "😀 fine" };
        const text = roundTrip(odd);
        assert.match(text, /\\ud800/);
        assert.match(text, /\\u007f/);
        assert.match(text, /pair: 😀 fine/);
        const bytes = new TextEncoder().encode(text);
        assert.deepStrictEqual(parseData(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), { status: "parsed", value: odd });
    });

    test("non-finite numbers and padded array sizes are refused on read", () => {
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na: 1e999\n`), dataErrorCodes.syntax);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na: -1e999\n`), dataErrorCodes.syntax);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na[00002]: 1,2\n`), dataErrorCodes.syntax);
        assert.strictEqual(refusedCode(`${DATA_HEADER}\na[12345678]: 1\n`), dataErrorCodes.syntax);
        assert.strictEqual(parseData(`${DATA_HEADER}\na[0]:\n`).status, "parsed");
        assert.strictEqual(parseData(`${DATA_HEADER}\na[2]: 1,2\n`).status, "parsed");
    });

    test("every value the encoder accepts at the depth limit also passes the equality check", () => {
        let deep: unknown = 1;
        for (let i = 0; i < MAX_DATA_DEPTH - 2; i++) deep = { k: [deep, { n: i }] };
        const value = { root: deep };
        const encoded = encodeData(value);
        assert.strictEqual(encoded.status, "encoded");
        const parsed = parseData((encoded as { text: string }).text);
        assert.strictEqual(parsed.status, "parsed");
        assert.ok(dataEquals((parsed as { value: unknown }).value, value), "equality must accept anything the encoder accepts");
    });
});

describe("dataEquals", () => {
    test("is strict about types, order of elements, -0 and prototypes, and loose about key order", () => {
        assert.ok(dataEquals({ a: [1, { b: null }] }, { a: [1, { b: null }] }));
        assert.ok(dataEquals({ a: 1, b: 2 }, { b: 2, a: 1 }));
        assert.ok(!dataEquals({ a: 1 }, { a: "1" }));
        assert.ok(!dataEquals([1, 2], [2, 1]));
        assert.ok(!dataEquals(0, -0));
        assert.ok(!dataEquals({ a: 1 }, Object.assign(Object.create(null), { a: 1 })));
        assert.ok(!dataEquals({ a: 1 }, { a: 1, b: 2 }));
        assert.ok(!dataEquals({ a: undefined }, { b: undefined }));
        assert.ok(!dataEquals([], {}));
    });
});
