/**
 * Data grammar 1.0: a lossless TOON subset for workflow-only data files (not configuration).
 * Owner of the grammar: `.project/decisions/toon-data-grammar.md`. The configuration parser in
 * `config.mts` is a separate, closed-schema grammar and is not touched by this module.
 *
 * Both directions scan each line once with character loops (no backtracking regex over input) and
 * refuse with one fixed-text problem that carries only a code, a line and a column, never input text.
 */

export const DATA_GRAMMAR_VERSION = 1;
export const DATA_HEADER = `@toon-data ${DATA_GRAMMAR_VERSION}`;
export const MAX_DATA_BYTES = 1024 * 1024;
export const MAX_DATA_DEPTH = 32;

export const dataErrorCodes = {
    oversize: "DATA-OVERSIZE",
    header: "DATA-HEADER",
    indent: "DATA-INDENT",
    syntax: "DATA-SYNTAX",
    string: "DATA-STRING",
    count: "DATA-COUNT-MISMATCH",
    duplicateKey: "DATA-DUPLICATE-KEY",
    forbiddenKey: "DATA-FORBIDDEN-KEY",
    depth: "DATA-DEPTH",
    input: "DATA-INPUT",
    unsupported: "DATA-UNSUPPORTED",
} as const;

export type DataProblem = { code: string; text: string; line?: number; column?: number };
/** The two outcomes of reading text. "Absent" is a file-level outcome and lives in `data-file.mts`. */
export type ParseOutcome = { status: "parsed"; value: Record<string, unknown> } | { status: "refused"; problem: DataProblem };
export type EncodeOutcome = { status: "encoded"; text: string } | { status: "refused"; problem: DataProblem };

export const FORBIDDEN_DATA_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);
const FORBIDDEN_KEYS = FORBIDDEN_DATA_KEYS;
const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const BARE_KEY = /^[A-Za-z_][A-Za-z0-9_./-]*$/;
const UNSAFE_CHARS = /[,:"\\#[\]{}\u0000-\u001f\u007f]/;

class DataError extends Error {
    readonly problem: DataProblem;
    constructor(code: string, text: string, line?: number, column?: number) {
        super(code);
        this.problem = { code, text, line, column };
    }
}

function fail(code: string, text: string, line?: number, column?: number): never {
    throw new DataError(code, text, line, column);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

// ---------------------------------------------------------------- scalars

/** Reads a double-quoted string starting at `pos`; returns the value and the index after the closing quote. */
function readQuoted(text: string, pos: number, line: number, base: number): { value: string; end: number } {
    let out = "";
    let index = pos + 1;
    while (index < text.length) {
        const ch = text[index];
        if (ch === '"') return { value: out, end: index + 1 };
        const code = text.charCodeAt(index);
        if (code < 0x20 || code === 0x7f) fail(dataErrorCodes.string, "control character in quoted string", line, base + index);
        if (ch !== "\\") { out += ch; index++; continue; }
        const next = text[index + 1];
        const simple: Record<string, string> = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
        if (next !== undefined && next in simple) { out += simple[next]; index += 2; continue; }
        if (next === "u") {
            const hex = text.slice(index + 2, index + 6);
            if (hex.length !== 4) fail(dataErrorCodes.string, "bad unicode escape", line, base + index);
            for (let k = 0; k < 4; k++) {
                const c = hex.charCodeAt(k);
                const ok = (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
                if (!ok) fail(dataErrorCodes.string, "bad unicode escape", line, base + index);
            }
            out += String.fromCharCode(parseInt(hex, 16));
            index += 6;
            continue;
        }
        fail(dataErrorCodes.string, "bad escape in quoted string", line, base + index);
    }
    return fail(dataErrorCodes.string, "unterminated quoted string", line, base + pos);
}

function unquotedValue(token: string, line: number, column: number): unknown {
    if (token === "") fail(dataErrorCodes.syntax, "empty value; use a quoted empty string", line, column);
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null") return null;
    if (NUMBER.test(token)) {
        const number = Number(token);
        if (!Number.isFinite(number)) fail(dataErrorCodes.syntax, "number is not finite", line, column);
        return number;
    }
    if (token !== token.trim()) fail(dataErrorCodes.syntax, "unquoted value has surrounding space", line, column);
    if (UNSAFE_CHARS.test(token) || /^[-+.\d@]/.test(token)) fail(dataErrorCodes.syntax, "value must be quoted", line, column);
    return token;
}

/** Parses one scalar token that spans the whole of `text` from `pos`. */
function parseScalar(text: string, pos: number, line: number, base: number): unknown {
    if (text[pos] === '"') {
        const { value, end } = readQuoted(text, pos, line, base);
        if (end !== text.length) fail(dataErrorCodes.syntax, "text after quoted value", line, base + end);
        return value;
    }
    return unquotedValue(text.slice(pos), line, base + pos);
}

/** Splits a comma-separated list of scalars, honoring quotes. Empty input is an empty list only if `allowEmpty`. */
function parseCells(text: string, pos: number, line: number, base: number): unknown[] {
    const cells: unknown[] = [];
    let index = pos;
    for (;;) {
        if (text[index] === '"') {
            const { value, end } = readQuoted(text, index, line, base);
            cells.push(value);
            index = end;
        } else {
            let stop = index;
            while (stop < text.length && text[stop] !== ",") stop++;
            cells.push(unquotedValue(text.slice(index, stop), line, base + index));
            index = stop;
        }
        if (index >= text.length) return cells;
        if (text[index] !== ",") fail(dataErrorCodes.syntax, "expected a comma between values", line, base + index);
        index++;
    }
}

// ---------------------------------------------------------------- parsing

interface Line { indent: number; text: string; number: number }
interface Header { key: string; size?: number; fields?: string[]; restAt: number }

function splitLines(text: string): Line[] {
    const lines: Line[] = [];
    let start = 0;
    let number = 0;
    while (start <= text.length) {
        let end = text.indexOf("\n", start);
        if (end === -1) end = text.length;
        number++;
        let stop = end;
        if (stop > start && text[stop - 1] === "\r") stop--;
        let indent = 0;
        while (start + indent < stop && text[start + indent] === " ") indent++;
        const body = text.slice(start + indent, stop);
        if (body.includes("\t") && /^\t/.test(body)) fail(dataErrorCodes.indent, "tab indentation", number, indent + 1);
        if (body.length > 0) lines.push({ indent, text: body, number });
        start = end + 1;
    }
    return lines;
}

function readKey(body: string, start: number, line: number, base: number): { key: string; end: number } {
    if (body[start] === '"') {
        const { value, end } = readQuoted(body, start, line, base);
        return { key: value, end };
    }
    let end = start;
    while (end < body.length && /[A-Za-z0-9_./-]/.test(body[end])) end++;
    const key = body.slice(start, end);
    if (!BARE_KEY.test(key)) fail(dataErrorCodes.syntax, "invalid key", line, base + start);
    return { key, end };
}

function readHeader(body: string, line: number, indent: number): Header {
    const base = indent + 1;
    const { key, end } = readKey(body, 0, line, base);
    if (FORBIDDEN_KEYS.has(key)) fail(dataErrorCodes.forbiddenKey, "forbidden key", line, base);
    let index = end;
    let size: number | undefined;
    let fields: string[] | undefined;
    if (body[index] === "[") {
        let stop = index + 1;
        while (stop < body.length && body[stop] >= "0" && body[stop] <= "9") stop++;
        if (stop === index + 1 || body[stop] !== "]" || stop - index - 1 > 7 || (body[index + 1] === "0" && stop - index - 1 > 1)) fail(dataErrorCodes.syntax, "bad array size", line, base + index);
        size = Number(body.slice(index + 1, stop));
        index = stop + 1;
        if (body[index] === "{") {
            const names: string[] = [];
            const seen = new Set<string>();
            let pos = index + 1;
            for (;;) {
                const part = readKey(body, pos, line, base);
                if (FORBIDDEN_KEYS.has(part.key)) fail(dataErrorCodes.forbiddenKey, "forbidden key", line, base + pos);
                if (seen.has(part.key)) fail(dataErrorCodes.duplicateKey, "duplicate column", line, base + pos);
                seen.add(part.key);
                names.push(part.key);
                pos = part.end;
                if (body[pos] === ",") { pos++; continue; }
                if (body[pos] === "}") break;
                fail(dataErrorCodes.syntax, "bad column list", line, base + pos);
            }
            fields = names;
            index = pos + 1;
        }
    }
    if (body[index] !== ":") fail(dataErrorCodes.syntax, "expected a colon", line, base + index);
    return { key, size, fields, restAt: index + 1 };
}

class Reader {
    private at = 0;
    private readonly lines: Line[];
    constructor(lines: Line[]) { this.lines = lines; }

    peek(): Line | undefined { return this.lines[this.at]; }
    next(): Line { return this.lines[this.at++]; }
    done(): boolean { return this.at >= this.lines.length; }

    /** Parses the object whose entries sit at exactly `indent`. */
    object(indent: number, depth: number): Record<string, unknown> {
        if (depth > MAX_DATA_DEPTH) fail(dataErrorCodes.depth, "nesting too deep", this.peek()?.number, 1);
        const out: Record<string, unknown> = {};
        for (let line = this.peek(); line !== undefined && line.indent >= indent; line = this.peek()) {
            if (line.indent !== indent) fail(dataErrorCodes.indent, "unexpected indentation", line.number, line.indent + 1);
            if (line.text === "-" || line.text.startsWith("- ")) fail(dataErrorCodes.syntax, "list item outside a list", line.number, line.indent + 1);
            this.next();
            const header = readHeader(line.text, line.number, line.indent);
            if (Object.prototype.hasOwnProperty.call(out, header.key)) fail(dataErrorCodes.duplicateKey, "duplicate key", line.number, line.indent + 1);
            out[header.key] = this.entry(header, line, depth);
        }
        return out;
    }

    private entry(header: Header, line: Line, depth: number): unknown {
        const rest = line.text.slice(header.restAt);
        const col = line.indent + 1;
        if (header.size === undefined) {
            if (rest === "") {
                const child = this.peek();
                return child !== undefined && child.indent > line.indent ? this.child(child, line, depth) : {};
            }
            if (rest[0] !== " ") fail(dataErrorCodes.syntax, "expected a space after the colon", line.number, col + header.restAt);
            return parseScalar(rest, 1, line.number, col + header.restAt);
        }
        const size = header.size;
        if (header.fields !== undefined) {
            if (rest !== "") fail(dataErrorCodes.syntax, "table header must end at the colon", line.number, col + header.restAt);
            return this.table(header.fields, size, line);
        }
        if (rest !== "") {
            if (rest[0] !== " ") fail(dataErrorCodes.syntax, "expected a space after the colon", line.number, col + header.restAt);
            const cells = parseCells(rest, 1, line.number, col + header.restAt);
            if (cells.length !== size) fail(dataErrorCodes.count, "array size does not match the values", line.number, col);
            return cells;
        }
        return size === 0 ? [] : this.list(size, line, depth);
    }

    private child(child: Line, parent: Line, depth: number): Record<string, unknown> {
        if (child.indent !== parent.indent + 2) fail(dataErrorCodes.indent, "indent must grow by two spaces", child.number, child.indent + 1);
        return this.object(child.indent, depth + 1);
    }

    private table(fields: string[], size: number, parent: Line): unknown[] {
        const rows: unknown[] = [];
        for (let line = this.peek(); line !== undefined && line.indent > parent.indent; line = this.peek()) {
            if (line.indent !== parent.indent + 2) fail(dataErrorCodes.indent, "indent must grow by two spaces", line.number, line.indent + 1);
            this.next();
            const cells = parseCells(line.text, 0, line.number, line.indent + 1);
            if (cells.length !== fields.length) fail(dataErrorCodes.count, "row width does not match the columns", line.number, line.indent + 1);
            const row: Record<string, unknown> = {};
            fields.forEach((name, i) => { row[name] = cells[i]; });
            rows.push(row);
        }
        if (rows.length !== size) fail(dataErrorCodes.count, "array size does not match the rows", parent.number, parent.indent + 1);
        return rows;
    }

    private list(size: number, parent: Line, depth: number): unknown[] {
        const items: unknown[] = [];
        for (let line = this.peek(); line !== undefined && line.indent > parent.indent; line = this.peek()) {
            if (line.indent !== parent.indent + 2) fail(dataErrorCodes.indent, "indent must grow by two spaces", line.number, line.indent + 1);
            this.next();
            const col = line.indent + 1;
            if (line.text === "-") {
                const child = this.peek();
                items.push(child !== undefined && child.indent > line.indent ? this.child(child, line, depth) : {});
            } else if (line.text.startsWith("- [")) {
                const header = readHeader(`x${line.text.slice(2)}`, line.number, line.indent + 1);
                const rest = line.text.slice(1 + header.restAt);
                if (header.size === undefined || header.fields !== undefined) fail(dataErrorCodes.syntax, "bad list item", line.number, col);
                if (header.size === 0) {
                    if (rest !== "") fail(dataErrorCodes.syntax, "bad list item", line.number, col);
                    items.push([]);
                } else {
                    if (rest[0] !== " ") fail(dataErrorCodes.syntax, "expected a space after the colon", line.number, col);
                    const cells = parseCells(rest, 1, line.number, col + 1 + header.restAt);
                    if (cells.length !== header.size) fail(dataErrorCodes.count, "array size does not match the values", line.number, col);
                    items.push(cells);
                }
            } else if (line.text.startsWith("- ")) {
                items.push(parseScalar(line.text, 2, line.number, col));
            } else {
                fail(dataErrorCodes.syntax, "expected a list item", line.number, col);
            }
        }
        if (items.length !== size) fail(dataErrorCodes.count, "array size does not match the items", parent.number, parent.indent + 1);
        return items;
    }
}

export function parseData(text: unknown, options: { maxBytes?: number } = {}): ParseOutcome {
    try {
        if (typeof text !== "string") fail(dataErrorCodes.input, "input is not text");
        if (text.length > (options.maxBytes ?? MAX_DATA_BYTES)) fail(dataErrorCodes.oversize, "data text is too large");
        const lines = splitLines(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
        const first = lines[0];
        if (first === undefined || first.indent !== 0 || first.text !== DATA_HEADER) fail(dataErrorCodes.header, "missing or unsupported data header", first?.number ?? 1, 1);
        const reader = new Reader(lines.slice(1));
        const value = reader.object(0, 0);
        if (!reader.done()) { const stray = reader.peek() as Line; fail(dataErrorCodes.indent, "unexpected indentation", stray.number, stray.indent + 1); }
        return { status: "parsed", value };
    } catch (error) {
        if (error instanceof DataError) return { status: "refused", problem: error.problem };
        return { status: "refused", problem: { code: dataErrorCodes.syntax, text: "unreadable data" } };
    }
}

// ---------------------------------------------------------------- encoding

type Primitive = string | number | boolean | null;

function isPrimitive(value: unknown): value is Primitive {
    return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

/** JSON-style quoting, plus DEL, which JSON leaves raw but the reader refuses. Lone surrogates come out as \\uXXXX escapes. */
function quote(value: string): string {
    return JSON.stringify(value).replace(/\u007f/g, "\\u007f");
}

function hasLoneSurrogate(value: string): boolean {
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
            const next = value.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) { i++; continue; }
            return true;
        }
        if (code >= 0xdc00 && code <= 0xdfff) return true;
    }
    return false;
}

function scalarToken(value: Primitive): string {
    if (typeof value === "string") {
        const needsQuote = value === "" || /^\s|\s$/.test(value) || value === "true" || value === "false" || value === "null"
            || /^[-+.\d@]/.test(value) || UNSAFE_CHARS.test(value) || hasLoneSurrogate(value);
        return needsQuote ? quote(value) : value;
    }
    if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
    return String(value);
}

function keyToken(key: string): string {
    if (FORBIDDEN_KEYS.has(key)) fail(dataErrorCodes.forbiddenKey, "forbidden key");
    return BARE_KEY.test(key) ? key : quote(key);
}

function tabular(items: unknown[]): string[] | undefined {
    if (items.length === 0 || !items.every(isRecord)) return undefined;
    const columns = Object.keys(items[0] as Record<string, unknown>);
    if (columns.length === 0) return undefined;
    for (const item of items as Record<string, unknown>[]) {
        const keys = Object.keys(item);
        if (keys.length !== columns.length || keys.some((key, i) => key !== columns[i])) return undefined;
        if (!columns.every((key) => isPrimitive(item[key]))) return undefined;
    }
    return columns;
}

function encodeObject(value: Record<string, unknown>, indent: number, depth: number, out: string[]): void {
    if (depth > MAX_DATA_DEPTH) fail(dataErrorCodes.depth, "nesting too deep");
    const pad = " ".repeat(indent);
    for (const key of Object.keys(value)) {
        const item = value[key];
        const name = keyToken(key);
        if (isPrimitive(item)) { out.push(`${pad}${name}: ${scalarToken(item)}`); continue; }
        if (Array.isArray(item)) { encodeArray(name, item, indent, depth, out); continue; }
        if (isRecord(item)) { out.push(`${pad}${name}:`); encodeObject(item, indent + 2, depth + 1, out); continue; }
        fail(dataErrorCodes.unsupported, "value type cannot be written");
    }
}

function encodeArray(name: string, items: unknown[], indent: number, depth: number, out: string[]): void {
    if (depth > MAX_DATA_DEPTH) fail(dataErrorCodes.depth, "nesting too deep");
    const pad = " ".repeat(indent);
    const inner = " ".repeat(indent + 2);
    for (let i = 0; i < items.length; i++) if (!(i in items)) fail(dataErrorCodes.unsupported, "sparse array cannot be written");
    if (items.length === 0) { out.push(`${pad}${name}[0]:`); return; }
    if (items.every(isPrimitive)) { out.push(`${pad}${name}[${items.length}]: ${items.map((v) => scalarToken(v as Primitive)).join(",")}`); return; }
    const columns = tabular(items);
    if (columns) {
        out.push(`${pad}${name}[${items.length}]{${columns.map(keyToken).join(",")}}:`);
        for (const row of items as Record<string, Primitive>[]) out.push(`${inner}${columns.map((key) => scalarToken(row[key])).join(",")}`);
        return;
    }
    out.push(`${pad}${name}[${items.length}]:`);
    for (const item of items) {
        if (isPrimitive(item)) { out.push(`${inner}- ${scalarToken(item)}`); continue; }
        if (Array.isArray(item)) {
            if (!item.every(isPrimitive) || item.length !== Object.keys(item).length) fail(dataErrorCodes.unsupported, "nested array of non-primitives cannot be written");
            out.push(item.length === 0 ? `${inner}- [0]:` : `${inner}- [${item.length}]: ${item.map((v) => scalarToken(v as Primitive)).join(",")}`);
            continue;
        }
        if (isRecord(item)) { out.push(`${inner}-`); encodeObject(item, indent + 4, depth + 1, out); continue; }
        fail(dataErrorCodes.unsupported, "value type cannot be written");
    }
}

/** Encodes a plain-object root. Anything the grammar cannot carry losslessly is refused, never approximated. */
export function encodeData(value: unknown): EncodeOutcome {
    try {
        if (!isRecord(value)) fail(dataErrorCodes.input, "root must be a plain object");
        const out: string[] = [DATA_HEADER];
        encodeObject(value, 0, 0, out);
        return { status: "encoded", text: `${out.join("\n")}\n` };
    } catch (error) {
        if (error instanceof DataError) return { status: "refused", problem: error.problem };
        return { status: "refused", problem: { code: dataErrorCodes.unsupported, text: "value cannot be written" } };
    }
}

/** Strict structural equality for values this grammar can carry: same types, same prototypes, -0 differs from 0. */
export function dataEquals(a: unknown, b: unknown, depth = 0): boolean {
    if (depth > 2 * (MAX_DATA_DEPTH + 2)) return false;
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (!dataEquals(a[i], b[i], depth + 1)) return false;
        return true;
    }
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!dataEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], depth + 1)) return false;
    }
    return true;
}
