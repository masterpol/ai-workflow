/**
 * One reader and one writer for workflow-only data files, in TOON data grammar 1.0 or JSON.
 * Owner of the grammar: `.project/decisions/toon-data-grammar.md`; the parser is `toon-data.mts`.
 *
 * Three outcomes, never collapsed: `parsed`, `absent` (the file does not exist, nothing else) and
 * `refused` (it exists or its path is unsafe and it cannot be trusted). A writer never replaces a file the
 * reader refuses, so a hostile or damaged file is not silently overwritten with fresh content.
 */
import { createNodeDeps } from "./node.mts";
import { FORBIDDEN_DATA_KEYS, MAX_DATA_BYTES, MAX_DATA_DEPTH, dataEquals, dataErrorCodes, encodeData, parseData } from "./toon-data.mts";
import type { RuntimeDeps } from "./types.mts";

export const dataFileErrorCodes = {
    path: "DATA-FILE-PATH",
    symlink: "DATA-FILE-SYMLINK",
    notFile: "DATA-FILE-NOT-FILE",
    oversize: "DATA-FILE-OVERSIZE",
    unreadable: "DATA-FILE-UNREADABLE",
    encoding: "DATA-FILE-ENCODING",
    changed: "DATA-FILE-CHANGED",
    bothPresent: "DATA-FILE-BOTH-PRESENT",
    json: "DATA-FILE-JSON",
    jsonRoot: "DATA-FILE-JSON-ROOT",
    forbiddenKey: "DATA-FILE-FORBIDDEN-KEY",
    writeFailed: "DATA-FILE-WRITE-FAILED",
    roundTrip: "DATA-FILE-ROUND-TRIP",
    notToon: "DATA-FILE-NOT-TOON",
    exists: "DATA-FILE-EXISTS",
} as const;

export type DataFormat = "toon" | "json";
export type DataRefusal = { status: "refused"; code: string; text: string; line?: number; column?: number };
export type DataReadResult =
    | { status: "parsed"; value: Record<string, unknown>; format: DataFormat; file: string; text: string }
    | { status: "absent" }
    | DataRefusal;
export type DataWriteResult = { status: "written"; file: string; bytes: number; dev: number; ino: number } | DataRefusal;
export interface WriteOptions {
    /** Converter only: a `.json` sibling is expected while the `.toon` is being created. */
    allowJsonSibling?: boolean;
    /** Refuse when the target already exists, and publish without ever replacing a file. */
    createOnly?: boolean;
}

const FORBIDDEN = FORBIDDEN_DATA_KEYS;
let cachedDeps: RuntimeDeps | undefined;

function defaultDeps(): RuntimeDeps {
    if (!cachedDeps) cachedDeps = createNodeDeps();
    return cachedDeps;
}

function refuse(code: string, text: string, line?: number, column?: number): DataRefusal {
    return { status: "refused", code, text, line, column };
}

function errno(error: unknown): unknown {
    return typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
}

type Target = { kind: "absent" } | { kind: "file"; file: string; dev: number; ino: number; size: number; mtimeMs: number } | { kind: "refused"; refusal: DataRefusal };

/** Validates a root-relative path as pure text before touching the disk. */
function segmentsOf(rel: string): string[] | DataRefusal {
    if (typeof rel !== "string" || rel === "" || rel.includes("\0") || rel.includes("\\") || rel.startsWith("/")) return refuse(dataFileErrorCodes.path, "data path must be relative to the project root");
    const parts = rel.split("/");
    if (parts.some((part) => part === "" || part === "." || part === "..")) return refuse(dataFileErrorCodes.path, "data path must stay inside the project root");
    return parts;
}

/** Inspects one path component by component without following any link. Missing means absent, nothing else does. */
function inspect(base: string, parts: string[], deps: RuntimeDeps): Target {
    let current = base;
    for (let i = 0; i < parts.length; i++) {
        current = deps.path.join(current, parts[i]);
        let stat;
        try {
            stat = deps.fs.lstatSync(current);
        } catch (error) {
            if (errno(error) === "ENOENT") return { kind: "absent" };
            return { kind: "refused", refusal: refuse(dataFileErrorCodes.unreadable, "data path could not be inspected") };
        }
        if (stat.isSymbolicLink()) return { kind: "refused", refusal: refuse(dataFileErrorCodes.symlink, "data path contains a symlink") };
        const last = i === parts.length - 1;
        if (!last && !stat.isDirectory()) return { kind: "refused", refusal: refuse(dataFileErrorCodes.notFile, "data path ancestor is not a directory") };
        if (last) {
            if (!stat.isFile()) return { kind: "refused", refusal: refuse(dataFileErrorCodes.notFile, "data path is not a regular file") };
            if (stat.size > MAX_DATA_BYTES) return { kind: "refused", refusal: refuse(dataFileErrorCodes.oversize, "data file is too large") };
            return { kind: "file", file: current, dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
        }
    }
    return { kind: "absent" };
}

function candidates(rel: string): { toon: string; json: string } {
    const stem = rel.endsWith(".toon") ? rel.slice(0, -5) : rel.endsWith(".json") ? rel.slice(0, -5) : rel;
    return { toon: `${stem}.toon`, json: `${stem}.json` };
}

function readPinned(target: { file: string; dev: number; ino: number }, deps: RuntimeDeps): { text: string } | DataRefusal {
    const { fs } = deps;
    let descriptor: number | undefined;
    try {
        descriptor = fs.openSync(target.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
        const opened = fs.fstatSync(descriptor);
        if (!opened.isFile() || opened.size > MAX_DATA_BYTES || opened.dev !== target.dev || opened.ino !== target.ino) {
            return refuse(dataFileErrorCodes.changed, "data file changed between inspect and open");
        }
        const buffer = new Uint8Array(MAX_DATA_BYTES + 1);
        let size = 0;
        while (size < buffer.length) {
            const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
            if (!count) break;
            size += count;
        }
        if (size > MAX_DATA_BYTES) return refuse(dataFileErrorCodes.oversize, "data file grew during read");
        try {
            return { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size)) };
        } catch {
            return refuse(dataFileErrorCodes.encoding, "data file is not valid UTF-8");
        }
    } catch {
        return refuse(dataFileErrorCodes.unreadable, "data file could not be read");
    } finally {
        if (descriptor !== undefined) { try { fs.closeSync(descriptor); } catch { /* best effort */ } }
    }
}

/** Objects are limited like the TOON grammar (32 levels). Arrays count toward a looser overall cap so a deep array chain cannot exhaust the stack. */
function checkJsonValue(value: unknown, objects: number, containers: number): DataRefusal | undefined {
    if (objects > MAX_DATA_DEPTH || containers > 2 * (MAX_DATA_DEPTH + 2)) return refuse(dataErrorCodes.depth, "nesting too deep");
    if (Array.isArray(value)) {
        for (const item of value) { const problem = checkJsonValue(item, objects, containers + 1); if (problem) return problem; }
    } else if (typeof value === "object" && value !== null) {
        for (const key of Object.keys(value)) {
            if (FORBIDDEN.has(key)) return refuse(dataFileErrorCodes.forbiddenKey, "forbidden key");
            const problem = checkJsonValue((value as Record<string, unknown>)[key], objects + 1, containers + 1);
            if (problem) return problem;
        }
    }
    return undefined;
}

function parseJson(text: string): { value: Record<string, unknown> } | DataRefusal {
    let value: unknown;
    try { value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text); } catch { return refuse(dataFileErrorCodes.json, "data file is not valid JSON"); }
    if (typeof value !== "object" || value === null || Array.isArray(value)) return refuse(dataFileErrorCodes.jsonRoot, "data file root must be an object");
    return checkJsonValue(value, 0, 0) ?? { value: value as Record<string, unknown> };
}

function readTarget(target: Extract<Target, { kind: "file" }>, format: DataFormat, deps: RuntimeDeps): DataReadResult {
    const read = readPinned(target, deps);
    if ("status" in read) return read;
    if (format === "json") {
        const parsed = parseJson(read.text);
        return "status" in parsed ? parsed : { status: "parsed", value: parsed.value, format, file: target.file, text: read.text };
    }
    const outcome = parseData(read.text);
    if (outcome.status === "refused") return refuse(outcome.problem.code, outcome.problem.text, outcome.problem.line, outcome.problem.column);
    return { status: "parsed", value: outcome.value, format, file: target.file, text: read.text };
}

/**
 * Reads `rel` (a root-relative path ending `.toon`, `.json`, or with no extension to find either). When
 * both a `.toon` and a `.json` exist for the same stem it is an error, so a stale copy can never shadow the other.
 */
export function readData(root: string, rel: string, deps: RuntimeDeps = defaultDeps()): DataReadResult {
    const given = segmentsOf(rel);
    if (!Array.isArray(given)) return given;
    const names = candidates(rel);
    const toonParts = segmentsOf(names.toon);
    if (!Array.isArray(toonParts)) return toonParts;
    const jsonParts = segmentsOf(names.json) as string[];
    let base: string;
    try { base = deps.fs.realpathSync(root); } catch { return refuse(dataFileErrorCodes.unreadable, "project root could not be resolved"); }
    const toon = inspect(base, toonParts, deps);
    const json = inspect(base, jsonParts, deps);
    if (toon.kind === "refused") return toon.refusal;
    if (json.kind === "refused") return json.refusal;
    if (toon.kind === "file" && json.kind === "file") return refuse(dataFileErrorCodes.bothPresent, "both a .toon and a .json file exist for this data file");
    if (toon.kind === "file") return readTarget(toon, "toon", deps);
    if (json.kind === "file") return readTarget(json, "json", deps);
    return { status: "absent" };
}

/**
 * Reads exactly the file named by `rel` (`.toon` or `.json`) with the same pinned, bounded read, without the
 * pair check. For the converter, which holds both files on purpose and must judge each one on its own.
 */
export function readDataFile(root: string, rel: string, deps: RuntimeDeps = defaultDeps()): DataReadResult {
    const parts = segmentsOf(rel);
    if (!Array.isArray(parts)) return parts;
    if (!rel.endsWith(".toon") && !rel.endsWith(".json")) return refuse(dataFileErrorCodes.path, "data file must end in .toon or .json");
    let base: string;
    try { base = deps.fs.realpathSync(root); } catch { return refuse(dataFileErrorCodes.unreadable, "project root could not be resolved"); }
    const target = inspect(base, parts, deps);
    if (target.kind === "refused") return target.refusal;
    if (target.kind === "absent") return { status: "absent" };
    return readTarget(target, rel.endsWith(".toon") ? "toon" : "json", deps);
}

/**
 * Writes `value` to a `.toon` path atomically (temporary file in the same directory, then publish). It refuses when the
 * existing file cannot be read, when a `.json` sibling exists (unless `allowJsonSibling`, used only by the converter), when
 * the bytes it would write do not parse back to an identical value, and, just before publishing, when the target or its
 * directories changed since they were checked. A new file is published with a hard link, which never replaces anything.
 */
export function writeData(root: string, rel: string, value: unknown, deps: RuntimeDeps = defaultDeps(), options: WriteOptions = {}): DataWriteResult {
    if (typeof rel !== "string" || !rel.endsWith(".toon")) return refuse(dataFileErrorCodes.notToon, "data writer only writes .toon files");
    const parts = segmentsOf(rel);
    if (!Array.isArray(parts)) return parts;
    if (parts[parts.length - 1] === ".toon") return refuse(dataFileErrorCodes.path, "data file needs a name before the extension");
    const encoded = encodeData(value);
    if (encoded.status === "refused") return refuse(encoded.problem.code, encoded.problem.text, encoded.problem.line, encoded.problem.column);
    const bytes = new TextEncoder().encode(encoded.text);
    if (bytes.length > MAX_DATA_BYTES) return refuse(dataFileErrorCodes.oversize, "encoded data is too large");
    // Judge the bytes that will be on disk, not the in-memory string. Defense in depth: the encoder already escapes what
    // UTF-8 would change (lone surrogates), so no input reaches a different result here today.
    let decoded: string;
    try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return refuse(dataFileErrorCodes.roundTrip, "data does not round trip and was not written"); }
    const back = parseData(decoded);
    if (back.status !== "parsed" || !dataEquals(back.value, value)) return refuse(dataFileErrorCodes.roundTrip, "data does not round trip and was not written");

    let base: string;
    try { base = deps.fs.realpathSync(root); } catch { return refuse(dataFileErrorCodes.unreadable, "project root could not be resolved"); }
    const target = inspect(base, parts, deps);
    if (target.kind === "refused") return target.refusal;
    if (target.kind === "file") {
        if (options.createOnly) return refuse(dataFileErrorCodes.exists, "data file already exists");
        // Judge the existing .toon on its own, so a .json sibling cannot hide an unreadable target.
        const current = readPinned(target, deps);
        if ("status" in current) return current;
        const outcome = parseData(current.text);
        if (outcome.status === "refused") return refuse(outcome.problem.code, outcome.problem.text, outcome.problem.line, outcome.problem.column);
    } else {
        const dir = parts.length > 1 ? inspectDir(base, parts.slice(0, -1), deps) : undefined;
        if (dir) return dir;
    }
    if (!options.allowJsonSibling) {
        const sibling = inspect(base, segmentsOf(candidates(rel).json) as string[], deps);
        if (sibling.kind === "refused") return sibling.refusal;
        if (sibling.kind === "file") return refuse(dataFileErrorCodes.bothPresent, "a .json file already exists for this data file");
    }

    const file = deps.path.join(base, ...parts);
    const temp = deps.path.join(deps.path.dirname(file), `.${deps.path.basename(file)}.${deps.crypto.randomUUID().replace(/-/g, "")}.tmp`);
    let descriptor: number | undefined;
    let identity = { dev: 0, ino: 0 };
    try {
        descriptor = deps.fs.openSync(temp, "wx", 0o644);
        let offset = 0;
        while (offset < bytes.length) {
            const count = deps.fs.writeSync(descriptor, bytes.subarray(offset));
            if (!(count > 0)) throw Object.assign(new Error("short write"), { code: "EIO" });
            offset += count;
        }
        deps.fs.fsyncSync(descriptor);
        const written = deps.fs.fstatSync(descriptor);
        identity = { dev: written.dev, ino: written.ino };
        deps.fs.closeSync(descriptor);
        descriptor = undefined;
        // Re-check at the destructive step. `inspect` walks every directory and the leaf without following links, so a
        // swapped directory, a planted file or a replaced target all show up as something other than what was checked.
        const again = inspect(base, parts, deps);
        if (target.kind === "absent" ? again.kind !== "absent" : again.kind !== "file" || again.dev !== target.dev || again.ino !== target.ino || again.size !== target.size || again.mtimeMs !== target.mtimeMs) {
            throw Object.assign(new Error("changed"), { code: "ECHANGED" });
        }
        if (target.kind === "absent") {
            deps.fs.linkSync(temp, file);
            deps.fs.unlinkSync(temp);
        } else {
            deps.fs.renameSync(temp, file);
        }
    } catch (error) {
        if (descriptor !== undefined) { try { deps.fs.closeSync(descriptor); } catch { /* best effort */ } }
        try { deps.fs.unlinkSync(temp); } catch { /* best effort */ }
        return refuse(dataFileErrorCodes.writeFailed, `data file could not be written (${String(errno(error) ?? "io")})`);
    }
    return { status: "written", file, bytes: bytes.length, dev: identity.dev, ino: identity.ino };
}

function inspectDir(base: string, parts: string[], deps: RuntimeDeps): DataRefusal | undefined {
    let current = base;
    for (const part of parts) {
        current = deps.path.join(current, part);
        let stat;
        try { stat = deps.fs.lstatSync(current); } catch {
            return refuse(dataFileErrorCodes.unreadable, "data directory does not exist or cannot be read");
        }
        if (stat.isSymbolicLink()) return refuse(dataFileErrorCodes.symlink, "data path contains a symlink");
        if (!stat.isDirectory()) return refuse(dataFileErrorCodes.notFile, "data path ancestor is not a directory");
    }
    return undefined;
}
