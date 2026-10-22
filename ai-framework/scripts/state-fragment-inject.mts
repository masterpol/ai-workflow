import { runDirect } from "./runtime/cli.mts";
// Carries reviewed AI fragments into the state report (hash, header, guarded directory, round record, status | stamp | check).
// No model or network call; writes only inside .project/reports/fragments/. See ai-framework/integrations/state-report.md.
import { createNodeDeps } from "./runtime/node.mts";
import { FRAGMENT_CLASSES, SLOT_NAMES } from "./state-design.mts";
import { checkCitations } from "./state-fragment-evidence.mts";
import { rejectionMessage, sanitizeFragment } from "./state-fragment.mts";
import { createStateSnapshot, REPORT_FILE, StateError } from "./state-snapshot.mts";

import type { RuntimeDeps } from "./runtime/types.mts";
import { REASONS } from "./state-fragment-parse.mts";
import type { Rejection } from "./state-fragment-parse.mts";
import type { Citations } from "./state-fragment.mts";

let nodeDeps: RuntimeDeps | undefined;
const defaultDeps = (): RuntimeDeps => (nodeDeps ??= createNodeDeps());

export type Slot = (typeof SLOT_NAMES)[number];
export type Failure = { ok: false; reason: string; message: string };
export const SLOT_PAGES = { overview: "index", risks: "index", architecture: "structure", history: "pitches", tokens: "metrics" } as const;
/** Clock-derived snapshot paths. state-report.md lists exactly these; a path that does not exist is a no-op. */
export const VOLATILE_PATHS: readonly string[] = Object.freeze([
  "generatedAt", "metrics.value.updatedAt", "metrics.status", "metrics.note", "knowledge.status", "knowledge.note",
  "risks.staleKnowledge", "architecture.graph.value.mtime", "architecture.graph.status", "architecture.graph.note",
]);
export const FRAGMENTS_DIR = ".project/reports/fragments";
const ROUND_FILE = `${FRAGMENTS_DIR}/.round.json`;
const MAX_FRAGMENT_BYTES = 65_536, MAX_ROUND_BYTES = 4096, MAX_HEADER_BYTES = 1024, MAX_ATTEMPTS = 2, MAX_DEPTH = 32, DRAFT_SLACK_MS = 1000;
// The only reasons stamp records in .round.json; anything else read from that file is discarded, never printed.
const ROUND_CODES = new Set<string>([...REASONS, "draft-predates-round", "draft-too-large", "draft-unreadable", "evidence-truncated", "tokens-href", "no-citation"]);
const HEX = /^[0-9a-f]{64}$/, MODEL = /^[A-Za-z0-9._:/@+-]{1,80}$/, CODE = /^[a-z][a-z-]{0,39}$/, FILE_NAME = /^[A-Za-z0-9._-]{1,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type Round = { schemaVersion: 1; startedAt: string; snapshot: string; attempts: Record<string, number>; rejected: Record<string, string> };
export type Loaded = { shown: boolean; html: string; hrefs: string[]; numbers: { path: string; text: string }[]; stale: boolean; reason: string; stamped: string; model: string; hash: string };
export const AI_LABEL = "AI analysis (proposed, not observed)";
type Read = { text: string; mtimeMs: number; id: string } | { missing: true } | { error: string; id?: string };
type Header = { snapshot: string | null; bodySha: string; model: string; stamped: string };

const fail = (reason: string, message = `fragment rejected: ${reason}`): Failure => ({ ok: false, reason, message });
const fromRejection = (rejection: Rejection): Failure => ({ ok: false, reason: rejection.reason, message: rejectionMessage(rejection) });
const isSlot = (value: unknown): value is Slot => (SLOT_NAMES as readonly unknown[]).includes(value);
const record = (value: unknown): Record<string, unknown> | null => (value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null);

function canonical(node: unknown, trail: string, depth: number): string | undefined {
  if (VOLATILE_PATHS.includes(trail)) return undefined;
  if (depth > MAX_DEPTH) return '"[depth]"';
  if (Array.isArray(node)) return `[${node.map((item, index) => canonical(item, `${trail}[${index}]`, depth + 1) ?? "null").join(",")}]`;
  const object = record(node);
  if (object === null) return JSON.stringify(node) ?? "null";
  const parts = Object.keys(object).sort().map((key) => [key, canonical(object[key], trail === "" ? key : `${trail}.${key}`, depth + 1)]);
  return `{${parts.filter(([, text]) => text !== undefined).map(([key, text]) => `${JSON.stringify(key)}:${text}`).join(",")}}`;
}

function bindStateInject(deps: RuntimeDeps) {
  const { fs, path } = deps;
  const { readSource, writeAtomic, printable } = createStateSnapshot(deps);

  const snapshotHash = (snapshot: unknown): string => deps.crypto.sha256Hex(canonical(snapshot, "", 0) ?? "null");
  const realRoot = (root: string): string => { try { return fs.realpathSync(root); } catch { throw new StateError("--root does not exist or is not resolvable"); } };

  /** dev:ino of the fragments directory when it is a real directory whose realpath is exactly where the root says; null otherwise. */
  function dirId(root: string): string | null {
    const full = path.join(root, FRAGMENTS_DIR);
    try { const stat = fs.lstatSync(full); return !stat.isSymbolicLink() && stat.isDirectory() && fs.realpathSync(full) === full ? `${stat.dev}:${stat.ino}:${stat.ctimeMs}` : null; } catch { return null; }
  }
  function guard(root: string): "ok" | "absent" | Failure {
    if (dirId(root) !== null) return "ok";
    try { fs.lstatSync(path.join(root, FRAGMENTS_DIR)); return fail("fragments-dir"); } catch (error) { return (error as { code?: unknown } | null)?.code === "ENOENT" ? "absent" : fail("fragments-dir"); }
  }
  // Without a ctime an in-place rewrite with a restored mtime is undetectable, so the id is unique and never matches: the draft is kept.
  const fileId = (s: { dev: number; ino: number; size: number; mtimeMs: number }): string => { const c = (s as { ctimeMs?: unknown }).ctimeMs; return typeof c === "number" ? `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${c}` : `unknown:${deps.crypto.randomUUID()}`; };
  /** Deletes a draft only if it is still the file that was read and the directory is unchanged (narrows, does not close, the race). */
  function removeDraft(root: string, name: string, id: string | null): void {
    const directory = dirId(root);
    if (id !== null && directory !== null && identity(root, name) === id && dirId(root) === directory) fs.rmSync(path.join(root, FRAGMENTS_DIR, name), { force: true });
  }
  const identity = (root: string, name: string): string | null => {
    try { return fileId(fs.lstatSync(path.join(root, FRAGMENTS_DIR, name))); } catch { return null; }
  };
  /** One open, no symlink follow, regular file only, bounded by fstat: what is checked is what is read. */
  function readBounded(root: string, name: string, cap: number): Read {
    const full = path.join(root, FRAGMENTS_DIR, name), directory = dirId(root);
    let fd = -1;
    if (directory === null) return { error: "fragments-dir" };
    try {
      const before = fs.lstatSync(full);
      if (!before.isFile()) return { error: "not-a-file" };
      if (before.size > cap) return { error: "too-large", id: fileId(before) };
      fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || dirId(root) !== directory) return { error: "changed" };
      if (opened.size > cap) return { error: "too-large", id: fileId(opened) };
      const buffer = new Uint8Array(opened.size);
      for (let got = 0; got < opened.size;) { const n = fs.readSync(fd, buffer, got, opened.size - got, got); if (n <= 0) break; got += n; }
      return { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer), mtimeMs: opened.mtimeMs, id: fileId(opened) };
    } catch (error) { return (error as { code?: unknown } | null)?.code === "ENOENT" ? { missing: true } : { error: "unreadable" }; }
    finally { if (fd >= 0) try { fs.closeSync(fd); } catch { /* nothing to recover */ } }
  }
  function loadSnapshot(root: string): { ok: true; value: unknown } | Failure {
    const source = readSource(root, REPORT_FILE);
    if (source.text === undefined) return fail("no-snapshot");
    try { return { ok: true, value: JSON.parse(source.text) as unknown }; } catch { return fail("no-snapshot"); }
  }

  function readRound(root: string): Round | null {
    const source = readBounded(root, ".round.json", MAX_ROUND_BYTES);
    if (!("text" in source)) return null;
    try {
      const raw = record(JSON.parse(source.text)), attempts = record(raw?.attempts), rejected = record(raw?.rejected);
      if (!raw || raw.schemaVersion !== 1 || typeof raw.startedAt !== "string" || !ISO.test(raw.startedAt) || typeof raw.snapshot !== "string" || !HEX.test(raw.snapshot) || !attempts || !rejected) return null;
      const round: Round = { schemaVersion: 1, startedAt: raw.startedAt, snapshot: raw.snapshot, attempts: {}, rejected: {} };
      for (const [key, value] of Object.entries(attempts)) { if (!isSlot(key) || !Number.isInteger(value) || (value as number) < 0 || (value as number) > MAX_ATTEMPTS) return null; round.attempts[key] = value as number; }
      for (const [key, value] of Object.entries(rejected)) { if (!isSlot(key) || typeof value !== "string" || !CODE.test(value) || !ROUND_CODES.has(value)) return null; round.rejected[key] = value; }
      return round;
    } catch { return null; }
  }
  const saveRound = (root: string, round: Round): void => { writeAtomic(root, ROUND_FILE, `${JSON.stringify(round, null, 2)}\n`); };

  function parseFile(text: string, slot: Slot): { ok: true; header: Header; body: string } | Failure {
    const end = text.indexOf("\n---\n");
    if (end < 0 || new TextEncoder().encode(text.slice(0, end)).length > MAX_HEADER_BYTES || text.slice(0, end).includes("\r")) return fail("header");
    const lines = text.slice(0, end).split("\n");
    const take = (re: RegExp): string | null => { const m = lines.length ? re.exec(lines[0]) : null; if (m) lines.shift(); return m ? m[1] ?? "" : null; };
    if (take(/^(state-fragment 1)$/) === null || take(/^slot (\S{1,32})$/) !== slot) return fail("header");
    const raw = take(/^snapshot (\S{1,128})$/), snapshot = raw === null ? null : HEX.test(raw) ? raw : "", bodySha = take(/^body-sha256 ([0-9a-f]{64})$/), model = take(/^model (\S{1,80})$/), stamped = take(/^stamped (\S{1,40})$/);
    if (bodySha === null || model === null || stamped === null || lines.length > 0 || (model !== "unknown" && !MODEL.test(model)) || !ISO.test(stamped)) return fail("header");
    return { ok: true, header: { snapshot, bodySha, model, stamped }, body: text.slice(end + 5) };
  }

  /** The shared pipeline for stamp, check and the loader: sanitize, check citations, then the slot rules. */
  function validate(root: string, text: string, slot: Slot, snapshot: unknown): { ok: true; html: string; citations: Citations } | Failure {
    const sanitized = sanitizeFragment(text, { classes: [...FRAGMENT_CLASSES], markers: [] });
    if (!sanitized.ok) return fromRejection(sanitized);
    const cited = checkCitations(sanitized.citations, snapshot, root, deps);
    if (!cited.ok) return fromRejection(cited);
    const { hrefs, numbers } = sanitized.citations;
    if (hrefs.length + numbers.length === 0) return fail("no-citation");
    for (const href of hrefs) { try { if (fs.statSync(path.join(root, href)).size > MAX_FRAGMENT_BYTES) return fail("evidence-truncated"); } catch { return fail("evidence-truncated"); } }
    if (slot === "tokens" && hrefs.length > 0) return fail("tokens-href");
    return { ok: true, html: sanitized.html, citations: sanitized.citations };
  }

  const hidden = (reason: string): Loaded => ({ shown: false, html: "", hrefs: [], numbers: [], stale: false, reason, stamped: "", model: "", hash: "" });
  /** Re-runs the whole check on every load; a slot that fails, throws or is stale under strict mode is empty with a closed reason. */
  function load(rootArg: string, snapshot: unknown, options: { strict: boolean }): Record<Slot, Loaded> {
    const out = {} as Record<Slot, Loaded>;
    const all = (reason: string) => { for (const slot of SLOT_NAMES) out[slot] = hidden(reason); return out; };
    let root: string, hash: string;
    try { root = realRoot(rootArg); hash = snapshotHash(snapshot); } catch { return all("root"); }
    const dir = guard(root);
    if (dir !== "ok") return all(dir === "absent" ? "absent" : dir.reason);
    const round = readRound(root), rejected = round !== null && round.snapshot === hash ? round.rejected : {};
    for (const slot of SLOT_NAMES) {
      try {
        const source = readBounded(root, `${slot}.fragment`, MAX_FRAGMENT_BYTES);
        if (!("text" in source)) { out[slot] = hidden("missing" in source ? rejected[slot] ?? "missing" : "unreadable"); continue; }
        const file = parseFile(source.text, slot);
        if (!file.ok) { out[slot] = hidden(file.reason); continue; }
        if (deps.crypto.sha256Hex(file.body) !== file.header.bodySha) { out[slot] = hidden("body-changed"); continue; }
        const checked = validate(root, file.body, slot, snapshot);
        if (!checked.ok) { out[slot] = hidden(checked.reason); continue; }
        if (checked.html !== file.body) { out[slot] = hidden("not-canonical"); continue; }
        const stale = file.header.snapshot !== hash;
        if (stale && options.strict) { out[slot] = hidden("stale"); continue; }
        const shown = sanitizeFragment(file.body, { classes: [...FRAGMENT_CLASSES], markers: [], hrefPrefix: "../../" });
        out[slot] = shown.ok ? { shown: true, html: shown.html, hrefs: checked.citations.hrefs, numbers: checked.citations.numbers, stale, reason: "", stamped: file.header.stamped, model: file.header.model, hash: (file.header.snapshot ?? "").slice(0, 12) } : hidden(shown.reason);
      } catch { out[slot] = hidden("unexpected"); }
    }
    return out;
  }

  /** Empty only when the fragments directory is absent; otherwise always inside the AI label, never as observed. */
  function container(slot: Slot, loaded: Loaded, h: { esc: (value: unknown) => string; evidence: (list: string[]) => string }): string {
    if (loaded.reason === "absent") return "";
    const open = `<section class="ai-analysis" aria-labelledby="ai-${slot}"><h2 id="ai-${slot}">${AI_LABEL}</h2>`;
    // Closed reason codes get a plain next step; the code itself stays visible so it can be looked up.
    const hint = loaded.reason === "missing" ? "Ask the agent to write this slot, then render again." : loaded.reason === "stale" ? "Run the AI analysis step again to refresh it." : "The fragment was rejected; run state-fragment-inject.mts status for details.";
    if (!loaded.shown) return `${open}<p class="none">No AI analysis shown: ${h.esc(loaded.reason)}. ${hint}</p></section>`;
    return `${open}${loaded.stale ? '<p class="status status-stale">stale: written against an older snapshot</p>' : ""}${loaded.html}<footer><p>Evidence: ${h.evidence(loaded.hrefs)}</p><p>Model ${h.esc(loaded.model)}, reported by the authoring session, not verified. Stamped ${h.esc(loaded.stamped)}. Snapshot ${h.esc(loaded.hash || "none")}.${loaded.stale ? " Written against an older snapshot." : ""}</p></footer></section>`;
  }

  /** Per-slot state for --json and the one-line render summary (counts match `status`; reasons are closed codes). */
  function summarize(loaded: Record<Slot, Loaded>): { line: string; slots: Record<Slot, { state: string; reason?: string }> } {
    const slots = {} as Record<Slot, { state: string; reason?: string }>, n: Record<string, number> = { fresh: 0, stale: 0, missing: 0, invalid: 0 };
    for (const slot of SLOT_NAMES) {
      const l = loaded[slot], state = l.shown ? (l.stale ? "stale" : "fresh") : l.reason === "stale" ? "stale" : ["missing", "absent"].includes(l.reason) ? "missing" : "invalid";
      slots[slot] = l.shown || state === "missing" ? { state } : { state, reason: l.reason };
      n[state]++;
    }
    const hiddenStale = SLOT_NAMES.filter((slot) => loaded[slot].reason === "stale").length;
    return { slots, line: `AI analysis: ${n.fresh} fresh / ${n.stale} stale / ${n.missing} missing${n.invalid ? ` / ${n.invalid} invalid` : ""}${hiddenStale ? ` (${hiddenStale} stale hidden by --strict-fragments)` : ""}` };
  }

  /** Starts a new round (attempts reset, earlier rejections kept for this snapshot), then reports what the loader would show. */
  function status(rootArg: string) {
    const root = realRoot(rootArg);
    const dir = guard(root);
    if (dir !== "ok" && dir !== "absent") return dir;
    const snapshot = loadSnapshot(root);
    if (!snapshot.ok) return snapshot;
    const hash = snapshotHash(snapshot.value), previous = readRound(root);
    saveRound(root, { schemaVersion: 1, startedAt: new Date(deps.clock.now()).toISOString(), snapshot: hash, attempts: {}, rejected: previous !== null && previous.snapshot === hash ? previous.rejected : {} });
    const allowed = new Set([...SLOT_NAMES.flatMap((slot) => [`${slot}.fragment`, `${slot}.draft`]), ".round.json"]);
    const listed = dirId(root), names = fs.readdirSync(path.join(root, FRAGMENTS_DIR)).filter((name) => !allowed.has(name));
    if (dirId(root) !== listed) return fail("fragments-dir");
    return { ok: true as const, hash, slots: summarize(load(root, snapshot.value, { strict: false })).slots, ignored: { count: names.length, names: names.filter((name) => FILE_NAME.test(name)) } };
  }

  function stamp(rootArg: string, input: { slot: string; model?: string }): { ok: true } | Failure {
    const root = realRoot(rootArg);
    const dir = guard(root);
    if (dir !== "ok") return dir === "absent" ? fail("round-stale") : dir;
    if (!isSlot(input.slot)) return fail("unknown-slot");
    const slot = input.slot;
    const snapshot = loadSnapshot(root);
    if (!snapshot.ok) return snapshot;
    const hash = snapshotHash(snapshot.value);
    const round = readRound(root);
    if (round === null || round.snapshot !== hash) return fail("round-stale");
    if ((round.attempts[slot] ?? 0) >= MAX_ATTEMPTS) return fail("retry-exhausted");
    round.attempts[slot] = (round.attempts[slot] ?? 0) + 1;
    saveRound(root, round);
    const draftName = `${slot}.draft`, directory = dirId(root), draft = readBounded(root, draftName, MAX_FRAGMENT_BYTES);
    const rejectDraft = (failure: Failure, id: string | null): Failure => {
      round.rejected[slot] = failure.reason;
      saveRound(root, round);
      if (round.attempts[slot] >= MAX_ATTEMPTS) removeDraft(root, draftName, id);
      return failure;
    };
    if ("missing" in draft) return fail("draft-missing");
    if ("error" in draft) return rejectDraft(fail(draft.error === "too-large" ? "draft-too-large" : "draft-unreadable"), draft.id ?? null);
    if (draft.mtimeMs < Date.parse(round.startedAt) - DRAFT_SLACK_MS) return rejectDraft(fail("draft-predates-round"), draft.id);
    const checked = validate(root, draft.text, slot, snapshot.value);
    if (!checked.ok) return rejectDraft(checked, draft.id);
    const model = typeof input.model === "string" && MODEL.test(input.model) ? input.model : "unknown";
    const head = `state-fragment 1\nslot ${slot}\nsnapshot ${hash}\nbody-sha256 ${deps.crypto.sha256Hex(checked.html)}\nmodel ${model}\nstamped ${new Date(deps.clock.now()).toISOString()}\n---\n`;
    if (identity(root, draftName) !== draft.id) return fail("draft-changed", "the draft changed after it was read; nothing was stamped");
    if (dirId(root) !== directory) return fail("fragments-dir");
    writeAtomic(root, `${FRAGMENTS_DIR}/${slot}.fragment`, head + checked.html);
    delete round.rejected[slot];
    saveRound(root, round);
    if (identity(root, draftName) !== draft.id) return fail("draft-changed", "fragment stamped; the draft changed after it was read and was kept");
    removeDraft(root, draftName, draft.id);
    return { ok: true };
  }

  function check(rootArg: string, input: { slot: string; draft?: boolean }) {
    const root = realRoot(rootArg);
    const dir = guard(root);
    if (dir !== "ok") return dir === "absent" ? fail("fragment-missing") : dir;
    if (!isSlot(input.slot)) return fail("unknown-slot");
    const snapshot = loadSnapshot(root);
    if (!snapshot.ok) return snapshot;
    if (!input.draft) {
      const shown = load(root, snapshot.value, { strict: false })[input.slot];
      return shown.shown ? { ok: true as const, bindings: shown.numbers.map((n) => ({ path: n.path, text: n.text, value: Number(n.text) })), hrefs: shown.hrefs, stale: shown.stale } : fail(shown.reason);
    }
    const source = readBounded(root, `${input.slot}.draft`, MAX_FRAGMENT_BYTES);
    if (!("text" in source)) return fail("missing" in source ? "fragment-missing" : "unreadable");
    const checked = validate(root, source.text, input.slot, snapshot.value);
    if (!checked.ok) return checked;
    return { ok: true as const, bindings: checked.citations.numbers.map((n) => ({ path: n.path, text: n.text, value: Number(n.text) })), hrefs: checked.citations.hrefs };
  }

  function cli(argv: string[]): string {
    const [command, ...rest] = argv;
    const options: { root: string; slot?: string; model?: string; draft?: boolean } = { root: deps.proc.cwd() };
    for (let index = 0; index < rest.length; index++) {
      const name = rest[index].slice(2), value = rest[index + 1];
      if (rest[index] === "--draft") options.draft = true;
      else if ((name === "root" || name === "slot" || name === "model") && rest[index].startsWith("--") && value !== undefined) { options[name] = value; index++; }
      else throw new StateError("Unknown option");
    }
    const outcome = command === "status" ? status(options.root) : command === "stamp" ? stamp(options.root, { slot: options.slot ?? "", model: options.model }) : command === "check" ? check(options.root, { slot: options.slot ?? "", draft: options.draft }) : null;
    if (outcome === null) throw new StateError("Unknown command (status | stamp | check)");
    if (!outcome.ok) throw new StateError(outcome.message);
    if ("slots" in outcome) return printable([`snapshot ${outcome.hash}`, ...SLOT_NAMES.map((slot) => `${slot}: ${outcome.slots[slot].state}${outcome.slots[slot].reason ? ` (${outcome.slots[slot].reason})` : ""}`), `ignored files: ${outcome.ignored.count}`].join("\n"));
    if ("bindings" in outcome) return printable([`ok: ${outcome.hrefs.length} link(s)${"stale" in outcome && outcome.stale ? " (stale)" : ""}`, ...outcome.bindings.map((b) => `${b.path} = ${b.value}`)].join("\n"));
    return `ok: ${command}`;
  }

  return { snapshotHash, status, stamp, check, load, container, summarize, cli };
}

export function createStateInject(deps: RuntimeDeps): ReturnType<typeof bindStateInject> { return bindStateInject(deps); }
export function snapshotHash(snapshot: unknown, deps: RuntimeDeps = defaultDeps()): string { return createStateInject(deps).snapshotHash(snapshot); }
type Api = ReturnType<typeof createStateInject>;
export const status = (root: string, deps: RuntimeDeps = defaultDeps()): ReturnType<Api["status"]> => createStateInject(deps).status(root);
export const stamp = (root: string, input: { slot: string; model?: string }, deps: RuntimeDeps = defaultDeps()): ReturnType<Api["stamp"]> => createStateInject(deps).stamp(root, input);
export const loadFragments = (root: string, snapshot: unknown, options: { strict: boolean }, deps: RuntimeDeps = defaultDeps()): Record<Slot, Loaded> => createStateInject(deps).load(root, snapshot, options);
export const fragmentContainer = (slot: Slot, loaded: Loaded, h: Parameters<Api["container"]>[2]): string => createStateInject(defaultDeps()).container(slot, loaded, h);
export const check = (root: string, input: { slot: string; draft?: boolean }, deps: RuntimeDeps = defaultDeps()): ReturnType<Api["check"]> => createStateInject(deps).check(root, input);
export function main(argv: string[], deps: RuntimeDeps): number {
  try { deps.io.stdout.write(`${createStateInject(deps).cli(argv)}\n`); return 0; }
  catch (error) { deps.io.stderr.write(`${createStateSnapshot(deps).printable(`state-fragment-inject: ${error instanceof StateError ? error.message : "internal error"}`)}\n`); return 1; }
}

runDirect(import.meta.url, main);
