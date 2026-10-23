import { createNodeDeps } from "./node.mts";
import { parseRange } from "./semver-range.mts";
import type { RuntimeDeps, StatLike } from "./types.mts";

export const CONFIG_FILE = "ai-workflow.toon";
export const MAX_CONFIG_BYTES = 64 * 1024;

export interface ConfigModel {
    schemaVersion: 3;
    runtime: { runner: "bun" | "node" };
    doctor: { modelRouting: string };
    skills: { modes: { caveman: "lite" | "full" | "ultra" | "wenyan-lite" | "wenyan-full" | "wenyan-ultra" | "off" } };
    integrations: { orca: OrcaIntegration } & Record<string, Record<string, unknown>>;
    models?: ModelsConfig;
}

export type ModelProfile = "fast" | "standard" | "deep";

export interface ModelEntry {
    model: string;
    effort?: "low" | "medium" | "high" | "xhigh";
}

export type ModelsConfig = Record<string, Partial<Record<ModelProfile, ModelEntry>>>;

export interface OrcaCoordinator {
    workers?: string[];
    roles?: Record<string, string | string[]>;
}

export interface OrcaIntegration {
    engine: string;
    enabled: boolean;
    multiAgent: boolean;
    maxConcurrentWorkers: number;
    maxRetriesPerTask: number;
    coordinators?: Record<string, OrcaCoordinator>;
}

export type Problem = { code: string; text: string; line?: number; column?: number };

interface Location { base: string; file: string; stat: StatLike }
type Refusal = { status: "refused" | "missing"; code?: string; text?: string };

export type ValidatorFn = (key: string, value: unknown) => Problem | undefined;

export const errorCodes = {
    wxRenameAlreadyExists: "WX-RENAME-ALREADY-EXISTS",
    wxRenameIoError: "WX-RENAME-IO-ERROR",
    inspectPathSymlink: "INSPECT-PATH-SYMLINK",
    inspectPathEscape: "INSPECT-PATH-ESCAPE",
    inspectPathOversize: "INSPECT-PATH-OVERSIZE",
    inspectPathMissing: "INSPECT-PATH-MISSING",
    inspectPathNotFile: "INSPECT-PATH-NOT-FILE",
    oexLockBusy: "OEX-LOCK-BUSY",
    oexLockIoError: "OEX-LOCK-IO-ERROR",
    schemaVersionUnknown: "CONFIG-SCHEMA-VERSION-UNKNOWN",
    loadConfigRefused: "CONFIG-LOAD-REFUSED",
    parserUnrecognized: "PARSER-UNRECOGNIZED",
    parserPrototypePollution: "PARSER-PROTOTYPE-POLLUTION",
    parserWithinRoleDuplicate: "PARSER-WITHIN-ROLE-DUPLICATE",
    lexerUnreadable: "LEXER-UNREADABLE",
    lexerOversize: "LEXER-OVERSIZE",
    lexerSymlink: "LEXER-SYMLINK",
    regexpBacktracking: "REGEXP-BACKTRACKING",
    orchestrationWorkersIncomplete: "ORCHESTRATION-WORKERS-INCOMPLETE",
    validationType: "VALIDATION-TYPE",
} as const;

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CAVEMAN_MODES = new Set(["lite", "full", "ultra", "wenyan-lite", "wenyan-full", "wenyan-ultra", "off"]);
const ROOT_KEYS = new Set(["schemaVersion", "runtime", "doctor", "skills", "integrations", "models"]);
const MODEL_PROFILE_KEYS = new Set(["fast", "standard", "deep"]);
const MODEL_VENDOR_KEYS = new Set(["claude", "opencode", "codex"]);
const MODEL_ENTRY_KEYS = new Set(["model", "effort"]);
const MODEL_EFFORT_VALUES = new Set(["low", "medium", "high", "xhigh"]);

const ORCA_KEYS = new Set(["engine", "enabled", "multiAgent", "maxConcurrentWorkers", "maxRetriesPerTask", "coordinators"]);
const COORDINATOR_KEYS = new Set(["workers", "roles"]);

const integrationValidators = new Map<string, ValidatorFn>();
// Engine validators receive the value of `integrations.<key>.engine` (e.g. key "orca" gets the Orca engine version string).
const engineValidators = new Map<string, ValidatorFn>();
const coordinatorValidators = new Map<string, ValidatorFn>();

export function registerIntegrationValidator(key: string, fn: ValidatorFn): void {
    integrationValidators.set(key, fn);
}

export function registerEngineValidator(key: string, fn: ValidatorFn): void {
    engineValidators.set(key, fn);
}

export function registerCoordinatorValidator(vendor: string, fn: ValidatorFn): void {
    coordinatorValidators.set(vendor, fn);
}

// A registered validator is third-party code: a throw becomes a problem, never an exception out of loadConfig.
function runValidator(kind: string, fn: ValidatorFn, key: string, value: unknown, problems: Problem[]): void {
    try {
        const finding = fn(key, value);
        if (finding) problems.push(finding);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        problems.push(problem(errorCodes.validationType, `${kind} validator for "${key}" threw: ${reason}`));
    }
}

interface LineParts { indent: number; key: string; arraySize?: number; hasColon: boolean; rest: string }

const KEY_PATTERN = /^([a-zA-Z0-9_-]+)(\[(\d+)\])?$/;
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/;

// Linear scan: split on the first colon, then match only the short key segment.
function scanLine(content: string): LineParts | null {
    let indent = 0;
    while (indent < content.length && content.charCodeAt(indent) === 32) indent++;
    const colon = content.indexOf(":", indent);
    let keyEnd = colon === -1 ? content.length : colon;
    while (keyEnd > indent && content.charCodeAt(keyEnd - 1) === 32) keyEnd--;
    const match = KEY_PATTERN.exec(content.slice(indent, keyEnd));
    if (!match) return null;
    let rest = "";
    if (colon !== -1) {
        let restStart = colon + 1;
        while (restStart < content.length && content.charCodeAt(restStart) === 32) restStart++;
        rest = content.slice(restStart);
        if (LINE_TERMINATOR.test(rest)) return null;
    }
    return { indent, key: match[1], arraySize: match[3] !== undefined ? Number(match[3]) : undefined, hasColon: colon !== -1, rest };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function errorCode(error: unknown): unknown {
    return error !== null && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
}

function problem(code: string, text: string, line?: number, column?: number): Problem {
    return { code, text, line, column };
}

function refused(code: string, text: string): Refusal {
    return { status: "refused", code, text };
}

function missing(code: string, text: string): Refusal {
    return { status: "missing", code, text };
}

export function inspectPath(root: string, deps: RuntimeDeps): Location | Refusal {
    const { fs, path } = deps;
    const base = fs.realpathSync(root);
    const parts = CONFIG_FILE.split("/");
    const leaf = parts[parts.length - 1];
    let file = base;
    for (const part of parts) {
        file = path.join(file, part);
        const stat = fs.lstatSync(file);
        if (stat.isSymbolicLink()) return refused(errorCodes.inspectPathSymlink, "config path contains a symlink");
        if (part !== leaf && !stat.isDirectory()) return refused(errorCodes.inspectPathSymlink, "config path ancestor is not a directory");
    }
    const relative = path.relative(base, fs.realpathSync(file));
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
        return refused(errorCodes.inspectPathEscape, "config path escapes the project root");
    }
    const stat = fs.lstatSync(file);
    if (!stat.isFile()) return refused(errorCodes.inspectPathNotFile, "config path is not a regular file");
    if (stat.size > MAX_CONFIG_BYTES) return refused(errorCodes.inspectPathOversize, `config file exceeds ${MAX_CONFIG_BYTES} bytes`);
    return { base, file, stat };
}

export function readBoundedFile(location: Location, deps: RuntimeDeps): Refusal | { text: string } {
    const { fs } = deps;
    let descriptor: number | undefined;
    try {
        descriptor = fs.openSync(location.file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
        const opened = fs.fstatSync(descriptor);
        if (!opened.isFile() || opened.size > MAX_CONFIG_BYTES || opened.dev !== location.stat.dev || opened.ino !== location.stat.ino) {
            return refused(errorCodes.inspectPathSymlink, "config file changed between inspect and open");
        }
        const current = inspectPath(location.base, deps);
        if ("status" in current) return current;
        if (current.stat.dev !== opened.dev || current.stat.ino !== opened.ino) {
            return refused(errorCodes.inspectPathSymlink, "config file changed between open and read");
        }
        const buffer = new Uint8Array(MAX_CONFIG_BYTES + 1);
        let size = 0;
        while (size < buffer.length) {
            const count = fs.readSync(descriptor, buffer, size, buffer.length - size, null);
            if (!count) break;
            size += count;
        }
        if (size > MAX_CONFIG_BYTES) return refused(errorCodes.inspectPathOversize, "config file grew during read");
        return { text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer.subarray(0, size)) };
    } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
    }
}

function tempPath(target: string, suffix: string, deps: RuntimeDeps): string {
    const dir = deps.path.dirname(target);
    const base = deps.path.basename(target);
    return deps.path.join(dir, `.${base}.${suffix}.tmp`);
}

export function wxRename(
    target: string,
    writer: (tmp: string) => void,
    deps: RuntimeDeps,
): { ok: true } | { refused: Refusal; tempPath?: string; cleanup?: () => void } {
    const temp = tempPath(target, deps.crypto.randomUUID().replace(/-/g, ""), deps);
    const cleanup = (): void => {
        try { deps.fs.unlinkSync(temp); } catch { /* best effort */ }
    };
    try {
        writer(temp);
    } catch (error) {
        cleanup();
        const code = errorCode(error) === "EEXIST" ? errorCodes.wxRenameAlreadyExists : errorCodes.wxRenameIoError;
        return { refused: refused(code, `wxRename write failed: ${errorCode(error)}`), tempPath: temp, cleanup };
    }
    try {
        deps.fs.renameSync(temp, target);
    } catch (error) {
        cleanup();
        return { refused: refused(errorCodes.wxRenameIoError, `wxRename rename failed: ${errorCode(error)}`), tempPath: temp, cleanup };
    }
    return { ok: true };
}

export function oexLock(target: string, deps: RuntimeDeps): { release(): void } | { refused: Refusal } {
    const lockPath = `${target}.lock`;
    try {
        deps.fs.writeFileSync(lockPath, "", { flag: "wx", mode: 0o600 });
        return {
            release: (): void => {
                try { deps.fs.unlinkSync(lockPath); } catch { /* best effort */ }
            },
        };
    } catch (error) {
        const busy = errorCode(error) === "EEXIST";
        const code = busy ? errorCodes.oexLockBusy : errorCodes.oexLockIoError;
        const text = busy
            ? `config lock is held by another process: ${lockPath}`
            : `could not create config lock: ${lockPath}`;
        return { refused: refused(code, text) };
    }
}

function stripComment(line: string): string {
    let inSingle = false;
    let inDouble = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '"' && !inSingle) inDouble = !inDouble;
        else if (char === "'" && !inDouble) inSingle = !inSingle;
        else if (char === '#' && !inSingle && !inDouble) return line.slice(0, index);
    }
    return line;
}

function parseScalar(raw: string, line: number, column: number): { value: unknown; problem?: Problem } {
    const value = raw.trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        return { value: value.slice(1, -1).replace(/\\"/g, '"') };
    }
    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
        return { value: value.slice(1, -1).replace(/\\'/g, "'") };
    }
    if (value === "true") return { value: true };
    if (value === "false") return { value: false };
    if (value === "null") return { value: null };
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        const asNumber = Number(value);
        if (Number.isFinite(asNumber)) return { value: asNumber };
    }
    if (value.length === 0) return { value: null };
    return { value };
}

function splitArray(value: string): string[] {
    const parts: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;
    for (const char of value) {
        if (char === '"' && !inSingle) inDouble = !inDouble;
        else if (char === "'" && !inDouble) inSingle = !inSingle;
        else if (char === "," && !inSingle && !inDouble) {
            parts.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

interface ParseFrame { obj: Record<string, unknown>; indent: number; key: string | null; line: number }

interface ParseResult { root: Record<string, unknown>; problems: Problem[] }

export function parseToon(text: string): ParseResult | Refusal {
    const lines = text.split(/\r?\n/);
    const root: Record<string, unknown> = {};
    const stack: ParseFrame[] = [{ obj: root, indent: -1, key: null, line: 0 }];
    const problems: Problem[] = [];

    for (let lineNumber = 1; lineNumber <= lines.length; lineNumber++) {
        const raw = lines[lineNumber - 1];
        const content = stripComment(raw);
        if (/^\s*$/.test(content)) continue;

        const parts = scanLine(content);
        if (!parts) {
            problems.push(problem(errorCodes.parserUnrecognized, "unrecognized TOON line", lineNumber, 1));
            continue;
        }

        const { indent, key, arraySize, hasColon, rest } = parts;

        if (FORBIDDEN_KEYS.has(key)) {
            problems.push(problem(errorCodes.parserPrototypePollution, `forbidden key at line ${lineNumber}`, lineNumber, indent + 1));
            continue;
        }

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const parent = stack[stack.length - 1];
        if (indent <= parent.indent && parent.indent >= 0) {
            problems.push(problem(errorCodes.parserUnrecognized, "indentation does not open a nested object", lineNumber, indent + 1));
        }

        if (Object.hasOwn(parent.obj, key)) {
            problems.push(problem(errorCodes.parserUnrecognized, `duplicate key "${key}"`, lineNumber, indent + 1));
        }

        const column = indent + 1;

        if (!hasColon || rest.trim() === "") {
            // Object opener.
            const child: Record<string, unknown> = {};
            parent.obj[key] = child;
            stack.push({ obj: child, indent, key, line: lineNumber });
            continue;
        }

        const trimmed = rest.trim();
        if (trimmed === "{}") {
            parent.obj[key] = {};
        } else if (trimmed === "[]") {
            parent.obj[key] = [];
        } else if (arraySize !== undefined) {
            const items = splitArray(rest);
            const parsed = items.map((item) => parseScalar(item, lineNumber, column));
            const values = parsed.map((entry) => entry.value);
            for (const entry of parsed) {
                if (entry.problem) problems.push(entry.problem);
            }
            if (values.length !== arraySize) {
                problems.push(problem(errorCodes.parserUnrecognized, `array size [${arraySize}] does not match ${values.length} values`, lineNumber, column));
            }
            parent.obj[key] = values;
        } else if (rest.includes(",")) {
            const items = splitArray(rest);
            const parsed = items.map((item) => parseScalar(item, lineNumber, column));
            const values = parsed.map((entry) => entry.value);
            for (const entry of parsed) {
                if (entry.problem) problems.push(entry.problem);
            }
            parent.obj[key] = values;
        } else {
            const { value, problem: scalarProblem } = parseScalar(rest, lineNumber, column);
            if (scalarProblem) problems.push(scalarProblem);
            parent.obj[key] = value;
        }
    }

    return { root, problems };
}

function expectString(value: unknown, path: string, line?: number, column?: number): { ok: true; value: string } | { ok: false; problem: Problem } {
    if (typeof value === "string") return { ok: true, value };
    return { ok: false, problem: problem(errorCodes.validationType, `${path} must be a string`, line, column) };
}

function expectBoolean(value: unknown, path: string, line?: number, column?: number): { ok: true; value: boolean } | { ok: false; problem: Problem } {
    if (typeof value === "boolean") return { ok: true, value };
    return { ok: false, problem: problem(errorCodes.validationType, `${path} must be a boolean`, line, column) };
}

function expectInteger(value: unknown, path: string, line?: number, column?: number): { ok: true; value: number } | { ok: false; problem: Problem } {
    if (typeof value === "number" && Number.isInteger(value)) return { ok: true, value };
    return { ok: false, problem: problem(errorCodes.validationType, `${path} must be an integer`, line, column) };
}

function expectStringArray(value: unknown, path: string, line?: number, column?: number): { ok: true; value: string[] } | { ok: false; problem: Problem } {
    if (!Array.isArray(value)) return { ok: false, problem: problem(errorCodes.validationType, `${path} must be an array`, line, column) };
    const items: string[] = [];
    for (const item of value) {
        if (typeof item !== "string") return { ok: false, problem: problem(errorCodes.validationType, `${path} must be an array of strings`, line, column) };
        items.push(item);
    }
    if (new Set(items).size !== items.length) {
        return { ok: false, problem: problem(errorCodes.parserWithinRoleDuplicate, `${path} contains duplicate values`, line, column) };
    }
    return { ok: true, value: items };
}

function validateCoordinators(raw: unknown, problems: Problem[]): OrcaIntegration["coordinators"] {
    const base = "integrations.orca.coordinators";
    if (raw === undefined) return undefined;
    if (!isRecord(raw)) {
        problems.push(problem(errorCodes.validationType, `${base} must be an object`));
        return undefined;
    }
    const coordinators: Record<string, OrcaCoordinator> = {};
    for (const [vendor, entry] of Object.entries(raw)) {
        if (!isRecord(entry)) {
            problems.push(problem(errorCodes.validationType, `${base}.${vendor} must be an object`));
            continue;
        }
        for (const key of Object.keys(entry)) {
            if (!COORDINATOR_KEYS.has(key)) {
                problems.push(problem(errorCodes.parserUnrecognized, `unknown key "${key}" in ${base}.${vendor}`));
            }
        }
        const coordinator: OrcaCoordinator = {};
        if (entry.workers !== undefined) {
            const workers = expectStringArray(entry.workers, `${base}.${vendor}.workers`);
            if (workers.ok) coordinator.workers = workers.value;
            else problems.push(workers.problem);
        }
        const roles: Record<string, string | string[]> = {};
        if (entry.roles !== undefined) {
            if (!isRecord(entry.roles)) {
                problems.push(problem(errorCodes.validationType, `${base}.${vendor}.roles must be an object`));
            } else {
                for (const [role, roleValue] of Object.entries(entry.roles)) {
                    if (typeof roleValue === "string") {
                        roles[role] = roleValue;
                    } else if (Array.isArray(roleValue)) {
                        const items = expectStringArray(roleValue, `${base}.${vendor}.roles.${role}`);
                        if (items.ok) roles[role] = items.value;
                        else problems.push(items.problem);
                    } else {
                        problems.push(problem(errorCodes.validationType, `${base}.${vendor}.roles.${role} must be a string or string array`));
                    }
                }
            }
        }
        coordinator.roles = roles;
        // A coordinator that lists workers must list every worker its roles use.
        if (coordinator.workers !== undefined) {
            const used = new Set<string>();
            for (const roleValue of Object.values(roles)) {
                if (typeof roleValue === "string") used.add(roleValue);
                else for (const worker of roleValue) used.add(worker);
            }
            for (const worker of used) {
                if (!coordinator.workers.includes(worker)) {
                    problems.push(problem(errorCodes.orchestrationWorkersIncomplete, `worker "${worker}" is not listed in ${base}.${vendor}.workers`));
                }
            }
        }
        coordinators[vendor] = coordinator;
        const validator = coordinatorValidators.get(vendor);
        if (validator) runValidator("coordinator", validator, vendor, entry, problems);
    }
    return coordinators;
}

/** Orca when the config does not mention it: off, with the documented limits and no engine pin (the default floor applies). */
const defaultOrca = (): OrcaIntegration => ({ engine: "", enabled: false, multiAgent: false, maxConcurrentWorkers: 3, maxRetriesPerTask: 1 });

function validateOrca(raw: Record<string, unknown>, problems: Problem[]): OrcaIntegration {
    const base = "integrations.orca";
    const orca = defaultOrca();

    for (const key of Object.keys(raw)) {
        if (!ORCA_KEYS.has(key)) problems.push(problem(errorCodes.parserUnrecognized, `unknown key "${key}" in ${base}`));
    }

    if (raw.engine === undefined) {
        problems.push(problem(errorCodes.validationType, `${base}.engine is required`));
    } else {
        const engine = expectString(raw.engine, `${base}.engine`);
        if (engine.ok) {
            orca.engine = engine.value;
            const range = parseRange(engine.value);
            if (!range.ok) problems.push(problem(errorCodes.validationType, `${base}.engine is not a valid version range: ${range.error.message} at position ${range.error.position}`));
            const validator = engineValidators.get("orca");
            if (validator) runValidator("engine", validator, "orca", engine.value, problems);
        } else problems.push(engine.problem);
    }

    const enabled = expectBoolean(raw.enabled, `${base}.enabled`);
    if (enabled.ok) orca.enabled = enabled.value;
    else problems.push(enabled.problem);

    const multiAgent = expectBoolean(raw.multiAgent, `${base}.multiAgent`);
    if (multiAgent.ok) orca.multiAgent = multiAgent.value;
    else problems.push(multiAgent.problem);

    const maxConcurrent = expectInteger(raw.maxConcurrentWorkers, `${base}.maxConcurrentWorkers`);
    if (maxConcurrent.ok) {
        if (maxConcurrent.value < 1 || maxConcurrent.value > 16) {
            problems.push(problem(errorCodes.validationType, `${base}.maxConcurrentWorkers must be between 1 and 16`));
        } else {
            orca.maxConcurrentWorkers = maxConcurrent.value;
        }
    } else problems.push(maxConcurrent.problem);

    const maxRetries = expectInteger(raw.maxRetriesPerTask, `${base}.maxRetriesPerTask`);
    if (maxRetries.ok) {
        if (maxRetries.value < 0) {
            problems.push(problem(errorCodes.validationType, `${base}.maxRetriesPerTask must be >= 0`));
        } else {
            orca.maxRetriesPerTask = maxRetries.value;
        }
    } else problems.push(maxRetries.problem);

    const coordinators = validateCoordinators(raw.coordinators, problems);
    if (coordinators !== undefined) orca.coordinators = coordinators;
    return orca;
}

function validateIntegrations(raw: unknown, problems: Problem[]): ConfigModel["integrations"] | undefined {
    // No `integrations` section means no integration is configured: Orca stays off and the normal flow runs.
    if (raw === undefined) return { orca: defaultOrca() };
    if (!isRecord(raw)) {
        problems.push(problem(errorCodes.validationType, "integrations must be an object"));
        return undefined;
    }
    const others: Record<string, Record<string, unknown>> = {};
    let orca: OrcaIntegration | undefined;
    for (const [name, entry] of Object.entries(raw)) {
        if (!isRecord(entry)) {
            problems.push(problem(errorCodes.validationType, `integrations.${name} must be an object`));
            continue;
        }
        // The built-in `orca` validator always runs; a registered validator for the same key adds to it.
        if (name === "orca") orca = validateOrca(entry, problems);
        const validator = integrationValidators.get(name);
        if (validator) {
            runValidator("integration", validator, name, entry, problems);
        } else if (name !== "orca") {
            problems.push(problem(errorCodes.parserUnrecognized, `unknown integration "${name}"`));
        }
        if (name !== "orca") others[name] = entry;
    }
    return { ...others, orca: orca ?? defaultOrca() };
}

function validateModels(raw: unknown, problems: Problem[]): ModelsConfig | undefined {
    if (raw === undefined) return undefined;
    if (!isRecord(raw)) { problems.push(problem(errorCodes.validationType, "models must be an object")); return undefined; }
    const config: ModelsConfig = {};
    for (const [vendor, vendorRaw] of Object.entries(raw)) {
        if (!MODEL_VENDOR_KEYS.has(vendor)) { problems.push(problem(errorCodes.parserUnrecognized, `unknown vendor "${vendor}" in models`)); continue; }
        if (!isRecord(vendorRaw)) { problems.push(problem(errorCodes.validationType, `models.${vendor} must be an object`)); continue; }
        const profiles: Partial<Record<ModelProfile, ModelEntry>> = {};
        for (const [profile, profileRaw] of Object.entries(vendorRaw)) {
            if (!MODEL_PROFILE_KEYS.has(profile)) { problems.push(problem(errorCodes.parserUnrecognized, `unknown profile "${profile}" in models.${vendor}`)); continue; }
            if (!isRecord(profileRaw)) { problems.push(problem(errorCodes.validationType, `models.${vendor}.${profile} must be an object`)); continue; }
            for (const key of Object.keys(profileRaw)) {
                if (!MODEL_ENTRY_KEYS.has(key)) problems.push(problem(errorCodes.parserUnrecognized, `unknown key "${key}" in models.${vendor}.${profile}`));
            }
            const modelField = profileRaw.model;
            if (typeof modelField !== "string" || modelField.length === 0) { problems.push(problem(errorCodes.validationType, `models.${vendor}.${profile}.model must be a non-empty string`)); continue; }
            const entry: ModelEntry = { model: modelField };
            if (profileRaw.effort !== undefined) {
                if (typeof profileRaw.effort !== "string" || !MODEL_EFFORT_VALUES.has(profileRaw.effort)) { problems.push(problem(errorCodes.validationType, `models.${vendor}.${profile}.effort must be one of low, medium, high, xhigh`)); }
                else entry.effort = profileRaw.effort as ModelEntry["effort"];
            }
            profiles[profile as ModelProfile] = entry;
        }
        for (const required of MODEL_PROFILE_KEYS) {
            if (!(required in profiles) && !(required in vendorRaw)) problems.push(problem(errorCodes.validationType, `models.${vendor}.${required} is required`));
        }
        config[vendor] = profiles;
    }
    return config;
}

function validateConfig(raw: Record<string, unknown>, parseProblems: Problem[]): { model: ConfigModel; problems: Problem[] } | Refusal {
    const problems = [...parseProblems];

    for (const key of Object.keys(raw)) {
        if (!ROOT_KEYS.has(key)) {
            problems.push(problem(errorCodes.parserUnrecognized, `unknown root key "${key}"`));
        }
    }

    const schemaVersion = raw.schemaVersion;
    if (schemaVersion !== 3) {
        return refused(errorCodes.schemaVersionUnknown, `unsupported schemaVersion: ${typeof schemaVersion === "number" && Number.isInteger(schemaVersion) && Math.abs(schemaVersion) < 1e9 ? String(schemaVersion) : "(not a small integer)"} (only 3 is supported; ai-workflow.toon v2 files can be converted in place with \`node ai-framework/scripts/config-migrate.mts --apply --root .\`)`);
    }

    const runtimeRaw = raw.runtime;
    if (!isRecord(runtimeRaw)) {
        problems.push(problem(errorCodes.validationType, "runtime must be an object"));
    }
    const runnerResult = expectString(runtimeRaw?.runner, "runtime.runner");
    if (runnerResult.ok && (runnerResult.value !== "bun" && runnerResult.value !== "node")) {
        problems.push(problem(errorCodes.validationType, "runtime.runner must be 'bun' or 'node'"));
    }

    const doctorRaw = raw.doctor;
    if (!isRecord(doctorRaw)) {
        problems.push(problem(errorCodes.validationType, "doctor must be an object"));
    }
    const modelRouting = expectString(doctorRaw?.modelRouting, "doctor.modelRouting");
    const doctor: ConfigModel["doctor"] = { modelRouting: modelRouting.ok ? modelRouting.value : "bundle" };
    if (!modelRouting.ok) problems.push(modelRouting.problem);
    else if (modelRouting.value !== "bundle" && modelRouting.value !== "project") problems.push(problem(errorCodes.validationType, "doctor.modelRouting must be 'bundle' or 'project'"));

    const skillsRaw = raw.skills;
    if (!isRecord(skillsRaw)) {
        problems.push(problem(errorCodes.validationType, "skills must be an object"));
    }
    const modesRaw = isRecord(skillsRaw) ? skillsRaw.modes : undefined;
    const cavemanRaw = isRecord(modesRaw) ? modesRaw.caveman : undefined;
    const cavemanResult = expectString(cavemanRaw, "skills.modes.caveman");
    if (cavemanResult.ok && !CAVEMAN_MODES.has(cavemanResult.value)) {
        problems.push(problem(errorCodes.validationType, "skills.modes.caveman must be a valid caveman mode"));
    }
    const skills: ConfigModel["skills"] = {
        modes: { caveman: cavemanResult.ok && CAVEMAN_MODES.has(cavemanResult.value) ? cavemanResult.value as ConfigModel["skills"]["modes"]["caveman"] : "full" },
    };
    if (!cavemanResult.ok) problems.push(cavemanResult.problem);

    const integrations = validateIntegrations(raw.integrations, problems);
    const models = validateModels(raw.models, problems);

    if (!integrations || !runnerResult.ok) {
        return refused(errorCodes.loadConfigRefused, "required config sections are missing or invalid");
    }

    const model: ConfigModel = {
        schemaVersion: 3,
        runtime: { runner: runnerResult.value as "bun" | "node" },
        doctor,
        skills,
        integrations,
    };
    if (models) model.models = models;

    return { model, problems };
}

export type LoadConfigResult = { model: ConfigModel; problems: Problem[] } | Refusal;

export function loadConfig(root: string, deps: RuntimeDeps = defaultDeps()): LoadConfigResult {
    let location: Location | Refusal;
    try {
        location = inspectPath(root, deps);
    } catch (error) {
        if (errorCode(error) === "ENOENT") {
            return missing(errorCodes.loadConfigRefused, "ai-workflow.toon not found");
        }
        return refused(errorCodes.loadConfigRefused, `could not inspect config path: ${errorCode(error)}`);
    }
    if ("status" in location) {
        if (location.code === errorCodes.inspectPathSymlink) {
            return refused(errorCodes.lexerSymlink, location.text);
        }
        if (location.code === errorCodes.inspectPathOversize) {
            return refused(errorCodes.lexerOversize, location.text);
        }
        return location;
    }

    let contents: Refusal | { text: string };
    try {
        contents = readBoundedFile(location, deps);
    } catch (error) {
        return refused(errorCodes.lexerUnreadable, `could not read config file: ${errorCode(error)}`);
    }
    if ("status" in contents) return contents;

    if (contents.text.charCodeAt(0) === 0xFEFF) {
        return refused(errorCodes.schemaVersionUnknown, "ai-workflow.toon starts with a UTF-8 byte order mark (BOM), so its first key is unreadable; save the file as UTF-8 without a BOM");
    }

    const parsed = parseToon(contents.text);
    if ("status" in parsed) return parsed;

    if (parsed.problems.length > 0) {
        parsed.problems.push(problem(errorCodes.parserUnrecognized, "unparsed content remains after errors"));
    }

    return validateConfig(parsed.root, parsed.problems);
}

export function inspectConfig(root: string, deps: RuntimeDeps = defaultDeps()): ConfigModel | Refusal {
    const result = loadConfig(root, deps);
    if ("status" in result) return result;
    if (result.problems.length > 0) {
        return refused(errorCodes.loadConfigRefused, `config has ${result.problems.length} problem(s); first: ${result.problems[0].text}`);
    }
    return result.model;
}
