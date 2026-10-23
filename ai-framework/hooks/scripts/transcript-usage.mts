/*
 * Reads numeric usage from an append-only Claude transcript (JSONL) from a stored offset.
 * It returns token counts and bounded identifiers only: no text, thinking, tool input or path ever leaves
 * this module, in a result or in a refusal reason. The caller holds no lease while calling it.
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

const DEFAULT_BYTE_CAP = 8 * 1024 * 1024;
const DEFAULT_LINE_CAP = 1024 * 1024;
const DEFAULT_TIME_CAP_MS = 1500;
const MAX_TOKENS = 1e12;
const SAFE_ID = /^[\w.:-]{1,128}$/;
const SAFE_MODEL = /^[\w.:/@+-]{1,80}$/;
const NEWLINE = 0x0a;

export interface TranscriptPosition { offset: number; ino: number; dev: number }

export interface MessageUsage {
  messageId: string;
  model: string | null;
  input: number | null;
  cacheWrite: number | null;
  cacheRead: number | null;
  output: number | null;
  /** Offset just past the last line of this message's group: the position to resume from once it is counted. */
  endOffset: number;
}

export interface ReadOptions {
  /** Where the previous call stopped. Absent means start of file. */
  previous?: TranscriptPosition;
  /** Message ids already counted; they are not returned again (a rewritten file replays them). */
  recentIds?: readonly string[];
  /** True when the transcript is complete (the agent stopped), so the last message group is not held back. */
  final?: boolean;
  byteCap?: number;
  /** A single line longer than this is skipped without parsing. */
  lineCap?: number;
  timeCapMs?: number;
}

export type RefusalReason = "no-claude-home" | "unreadable" | "symlink-leaf" | "not-regular" | "outside-root" | "escapes-root" | "changed-while-opening";

export type UsageRead =
  | { status: "ok"; messages: MessageUsage[]; position: TranscriptPosition; size: number; reset: boolean; capped: boolean }
  | { status: "refused"; reason: RefusalReason };

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const field = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_TOKENS ? value : null;
}

function claudeProjects(deps: RuntimeDeps): string | null {
  const configured = deps.proc.env.CLAUDE_CONFIG_DIR;
  const home = deps.proc.env.HOME;
  const base = configured ? configured : home ? deps.path.join(home, ".claude") : null;
  return base === null ? null : deps.path.join(base, "projects");
}

const within = (deps: RuntimeDeps, root: string, target: string): boolean => {
  const relative = deps.path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${deps.path.sep}`) && !deps.path.isAbsolute(relative);
};

/** Distinct outcomes, never null: the writer must not read a refusal as "absent". */
function admit(deps: RuntimeDeps, file: string): RefusalReason | null {
  const root = claudeProjects(deps);
  if (root === null) return "no-claude-home";
  let realRoot: string;
  let stat;
  try {
    realRoot = deps.fs.realpathSync(root);
    stat = deps.fs.lstatSync(file);
  } catch { return "unreadable"; }
  if (stat.isSymbolicLink()) return "symlink-leaf";
  if (!stat.isFile()) return "not-regular";
  let real: string;
  try { real = deps.fs.realpathSync(file); } catch { return "unreadable"; }
  if (within(deps, realRoot, real)) return null;
  // Lexically inside the Claude home but resolving elsewhere means a linked ancestor.
  return within(deps, deps.path.resolve(root), deps.path.resolve(file)) || within(deps, realRoot, deps.path.resolve(file)) ? "escapes-root" : "outside-root";
}

interface Parsed { messageId: string; model: string | null; input: number | null; cacheWrite: number | null; cacheRead: number | null; output: number | null }

// Assistant lines only: message.id plus message.usage. Anything else (and any sidechain line) is skipped.
function parse(text: string): Parsed | null {
  let line: unknown;
  try { line = JSON.parse(text); } catch { return null; }
  if (!isObject(line) || line.isSidechain === true) return null;
  const message = field(line, "message");
  const usage = field(message, "usage");
  const id = field(message, "id");
  if (!isObject(usage) || typeof id !== "string" || !SAFE_ID.test(id)) return null;
  const model = field(message, "model");
  return {
    messageId: id,
    model: typeof model === "string" && SAFE_MODEL.test(model) ? model : null,
    input: count(usage.input_tokens),
    cacheWrite: count(usage.cache_creation_input_tokens),
    cacheRead: count(usage.cache_read_input_tokens),
    output: count(usage.output_tokens),
  };
}

export function readTranscriptUsage(file: string, deps: RuntimeDeps, options: ReadOptions = {}): UsageRead {
  const refusal = admit(deps, file);
  if (refusal !== null) return { status: "refused", reason: refusal };
  const { fs } = deps;
  let fd: number;
  try {
    const before = fs.lstatSync(file);
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev) { fs.closeSync(fd); return { status: "refused", reason: "changed-while-opening" }; }
      // An ancestor can be swapped for a link between the first check and the open: judge the containment again on the open file's path.
      const again = admit(deps, file);
      if (again !== null) { fs.closeSync(fd); return { status: "refused", reason: again }; }
    } catch { fs.closeSync(fd); return { status: "refused", reason: "unreadable" }; }
  } catch { return { status: "refused", reason: "unreadable" }; }

  try {
    const stat = fs.fstatSync(fd);
    const previous = options.previous;
    const reset = previous !== undefined && (previous.ino !== stat.ino || previous.dev !== stat.dev || !Number.isSafeInteger(previous.offset) || previous.offset < 0 || previous.offset > stat.size);
    const start = previous === undefined || reset ? 0 : previous.offset;
    const seen = new Set(options.recentIds ?? []);
    const byteCap = Math.max(1, options.byteCap ?? DEFAULT_BYTE_CAP);
    const lineCap = Math.max(1, options.lineCap ?? DEFAULT_LINE_CAP);
    const deadline = deps.clock.monotonicMs() + (options.timeCapMs ?? DEFAULT_TIME_CAP_MS);

    const length = Math.min(stat.size - start, byteCap);
    const buffer = new Uint8Array(Math.max(0, length));
    let filled = 0;
    while (filled < length) {
      const read = fs.readSync(fd, buffer, filled, length - filled, start + filled);
      if (read <= 0) break;
      filled += read;
    }
    let capped = start + filled < stat.size;

    const groups: MessageUsage[] = [];
    let groupStart = start;
    let lineStart = 0;
    let consumed = 0;
    const text = new TextDecoder();
    for (let index = 0; index < filled; index += 1) {
      if (buffer[index] !== NEWLINE) continue;
      if (deps.clock.monotonicMs() > deadline) { capped = true; break; }
      const end = index + 1;
      if (index - lineStart <= lineCap) {
        const parsed = parse(text.decode(buffer.subarray(lineStart, index)));
        if (parsed !== null) {
          const last = groups[groups.length - 1];
          if (last !== undefined && last.messageId === parsed.messageId) {
            // A repeat of one message carries identical usage except output_tokens, which only grows: the last line wins.
            Object.assign(last, parsed, { endOffset: start + end });
          } else {
            groups.push({ ...parsed, endOffset: start + end });
            groupStart = start + lineStart;
          }
        }
      }
      lineStart = end;
      consumed = end;
    }

    let position = start + consumed;
    // A line longer than the whole read window never shows a newline: step over this window so the cursor still advances.
    if (consumed === 0 && filled === length && filled >= byteCap) position = start + filled;
    // A group that may still be growing is held back: its lines are re-read once a different id follows or the file is final.
    // Unless a capped read would leave the cursor where it started: a message larger than the read window is released instead of re-read forever.
    if (groups.length > 0 && (options.final !== true || capped) && !(capped && groupStart === start)) {
      groups.pop();
      position = groupStart;
    }
    const messages = groups.filter((group) => !seen.has(group.messageId));
    return { status: "ok", messages, position: { offset: position, ino: stat.ino, dev: stat.dev }, size: stat.size, reset, capped };
  } finally {
    fs.closeSync(fd);
  }
}
