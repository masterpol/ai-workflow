/**
 * Pure subset of npm semver ranges for `integrations.orca.engine`. No imports, no regex over untrusted text:
 * every scan is a single linear pass over a bounded string.
 *
 * Accepted: exact (`1.4.224`, `=1.4.224`), partials and wildcards (`1`, `1.4`, `1.x`, `1.4.*`, `*`), `^`, `~`,
 * `>`, `>=`, `<`, `<=`, space = AND, `||` = OR, and hyphen ranges (`1.4.223 - 1.5.0`).
 * Rejected: prerelease and build metadata, leading zeros, parts over six digits, unknown operators,
 * a space between an operator and its version, empty arms, input over MAX_RANGE_LENGTH.
 */

export type Triple = readonly [number, number, number];
export type Operator = ">=" | ">" | "<=" | "<" | "=";
export interface Comparator { readonly op: Operator; readonly version: Triple }
/** OR of ANDs. An empty arm matches every version; `NEVER` below is the arm that matches none. */
export interface ParsedRange { readonly arms: readonly (readonly Comparator[])[] }
export interface RangeError { readonly message: string; /** Zero-based index into the input where the problem starts. */ readonly position: number }
export type ParseResult = { readonly ok: true; readonly range: ParsedRange } | { readonly ok: false; readonly error: RangeError };

export const MAX_RANGE_LENGTH = 256;
export const MAX_VERSION_LENGTH = 64;
const MAX_ARMS = 16;
const MAX_COMPARATORS = 16;
const MAX_PART_DIGITS = 6;
const NEVER: Comparator = { op: "<", version: [0, 0, 0] };

const isDigit = (code: number): boolean => code >= 48 && code <= 57;

/** Strict `x.y.z`: three canonical numbers, each at most six digits, no sign, prerelease or build part. */
export function parseVersion(text: unknown): Triple | undefined {
  if (typeof text !== "string" || text.length < 5 || text.length > MAX_VERSION_LENGTH) return undefined;
  const parts = parseParts(text, 0);
  if (!parts || "message" in parts || parts.values.length !== 3 || parts.values.some((part) => part === null)) return undefined;
  return parts.values as unknown as Triple;
}

type Parts = { values: (number | null)[] } | RangeError;

/** Parses `a[.b[.c]]` where each part is a canonical number or a wildcard (`x`, `X`, `*`, reported as null). */
function parseParts(text: string, offset: number): Parts | undefined {
  const values: (number | null)[] = [];
  let index = 0;
  let wildcard = false;
  while (true) {
    const start = index;
    while (index < text.length && text[index] !== ".") index++;
    const piece = text.slice(start, index);
    if (!piece) return { message: "empty version part", position: offset + start };
    if (piece === "x" || piece === "X" || piece === "*") { values.push(null); wildcard = true; }
    else {
      if (wildcard) return { message: "a number cannot follow a wildcard", position: offset + start };
      const parsed = parseNumber(piece, offset + start);
      if ("message" in parsed) return parsed;
      values.push(parsed.value);
    }
    if (index >= text.length) break;
    index++;
    if (values.length === 3) return { message: "too many version parts", position: offset + index - 1 };
  }
  return { values };
}

function parseNumber(piece: string, position: number): { value: number } | RangeError {
  for (let i = 0; i < piece.length; i++) {
    if (!isDigit(piece.charCodeAt(i))) {
      const c = piece[i];
      return { message: c === "-" || c === "+" ? "prerelease and build metadata are not supported" : `unexpected character ${JSON.stringify(c)}`, position: position + i };
    }
  }
  if (piece.length > MAX_PART_DIGITS) return { message: `version part longer than ${MAX_PART_DIGITS} digits`, position };
  if (piece.length > 1 && piece[0] === "0") return { message: "leading zeros are not allowed", position };
  return { value: Number(piece) };
}

export function compareVersions(a: Triple, b: Triple): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  return 0;
}

interface Partial { values: (number | null)[]; count: number }

/** The version one step above the last specified part: `1.4` -> `1.5.0`, `1` -> `2.0.0`, `1.4.5` -> `1.4.6`. */
function bump(p: Partial): Triple {
  const [major, minor, patch] = [p.values[0] ?? 0, p.values[1] ?? 0, p.values[2] ?? 0];
  if (p.count === 1) return [major + 1, 0, 0];
  if (p.count === 2) return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}
const low = (p: Partial): Triple => [p.values[0] ?? 0, p.values[1] ?? 0, p.values[2] ?? 0];

/** Rewrites one `<operator><partial>` term into primitive comparators, following npm's desugaring. */
function desugar(operator: string, p: Partial): Comparator[] {
  const lo = low(p);
  const ge = (version: Triple): Comparator => ({ op: ">=", version });
  const lt = (version: Triple): Comparator => ({ op: "<", version });
  switch (operator) {
    case "": case "=":
      if (p.count === 0) return [];
      return p.count === 3 ? [{ op: "=", version: lo }] : [ge(lo), lt(bump(p))];
    case ">": return p.count === 0 ? [NEVER] : p.count === 3 ? [{ op: ">", version: lo }] : [ge(bump(p))];
    case ">=": return p.count === 0 ? [] : [ge(lo)];
    case "<": return p.count === 0 ? [NEVER] : [lt(lo)];
    case "<=": return p.count === 0 ? [] : p.count === 3 ? [{ op: "<=", version: lo }] : [lt(bump(p))];
    case "~": return p.count === 0 ? [] : [ge(lo), lt(p.count === 1 ? bump(p) : [lo[0], lo[1] + 1, 0])];
    case "^": {
      if (p.count === 0) return [];
      const [major, minor, patch] = lo;
      let ceiling: Triple;
      if (major > 0 || p.count === 1) ceiling = [major + 1, 0, 0];
      else if (minor > 0 || p.count === 2) ceiling = [0, minor + 1, 0];
      else ceiling = [0, 0, patch + 1];
      return [ge(lo), lt(ceiling)];
    }
    default: return [NEVER];
  }
}

const OPERATORS = new Set(["", "=", ">", ">=", "<", "<=", "~", "^"]);

function parseTerm(token: string, offset: number): { comparators: Comparator[]; partial: Partial } | RangeError {
  let split = 0;
  while (split < token.length && "<>=~^".includes(token[split]!)) split++;
  const operator = token.slice(0, split);
  if (!OPERATORS.has(operator)) return { message: `unknown operator ${JSON.stringify(operator)}`, position: offset };
  if (split === token.length) return { message: "missing version", position: offset + split };
  const parts = parseParts(token.slice(split), offset + split);
  if (!parts || "message" in parts) return parts ?? { message: "missing version", position: offset + split };
  const count = parts.values.findIndex((part) => part === null);
  const partial: Partial = { values: parts.values, count: count === -1 ? parts.values.length : count };
  return { comparators: desugar(operator, partial), partial };
}

/** Splits `text` on runs of spaces, keeping each token's start index. Any other whitespace is rejected by the term parser. */
function tokens(text: string, offset: number): { token: string; start: number }[] {
  const out: { token: string; start: number }[] = [];
  let index = 0;
  while (index < text.length) {
    while (index < text.length && text[index] === " ") index++;
    const start = index;
    while (index < text.length && text[index] !== " ") index++;
    if (index > start) out.push({ token: text.slice(start, index), start: offset + start });
  }
  return out;
}

function parseArm(text: string, offset: number): Comparator[] | RangeError {
  const list = tokens(text, offset);
  if (!list.length) return { message: "empty range", position: offset };
  if (list.length > MAX_COMPARATORS) return { message: `more than ${MAX_COMPARATORS} comparators in one group`, position: list[MAX_COMPARATORS]!.start };
  if (list.length === 3 && list[1]!.token === "-") {
    const from = parseTerm(list[0]!.token, list[0]!.start);
    if ("message" in from) return from;
    const to = parseTerm(list[2]!.token, list[2]!.start);
    if ("message" in to) return to;
    if (!isPlain(list[0]!.token) || !isPlain(list[2]!.token))
      return { message: "operators are not allowed in a hyphen range", position: list[0]!.start };
    const lower: Comparator[] = from.partial.count === 0 ? [] : [{ op: ">=", version: low(from.partial) }];
    const upper: Comparator[] = to.partial.count === 0 ? []
      : to.partial.count === 3 ? [{ op: "<=", version: low(to.partial) }] : [{ op: "<", version: bump(to.partial) }];
    return [...lower, ...upper];
  }
  const comparators: Comparator[] = [];
  for (const { token, start } of list) {
    if (token === "-") return { message: "a hyphen range needs exactly one version on each side", position: start };
    const term = parseTerm(token, start);
    if ("message" in term) return term;
    comparators.push(...term.comparators);
  }
  return comparators;
}

const isPlain = (token: string): boolean => token.length > 0 && !"<>=~^".includes(token[0]!);

/** Parses `text` or reports the first problem with its position. Never throws. */
export function parseRange(text: unknown): ParseResult {
  if (typeof text !== "string") return { ok: false, error: { message: "range must be a string", position: 0 } };
  if (text.length > MAX_RANGE_LENGTH) return { ok: false, error: { message: `range longer than ${MAX_RANGE_LENGTH} characters`, position: MAX_RANGE_LENGTH } };
  if (!text.trim()) return { ok: false, error: { message: "empty range", position: 0 } };
  const arms: Comparator[][] = [];
  let start = 0;
  while (true) {
    let end = start;
    while (end < text.length && !(text[end] === "|" && text[end + 1] === "|")) end++;
    const arm = parseArm(text.slice(start, end), start);
    if (!Array.isArray(arm)) return { ok: false, error: arm };
    arms.push(arm);
    if (arms.length > MAX_ARMS) return { ok: false, error: { message: `more than ${MAX_ARMS} alternatives`, position: start } };
    if (end >= text.length) break;
    start = end + 2;
  }
  return { ok: true, range: { arms } };
}

function holds(comparator: Comparator, version: Triple): boolean {
  const order = compareVersions(version, comparator.version);
  switch (comparator.op) {
    case ">=": return order >= 0;
    case ">": return order > 0;
    case "<=": return order <= 0;
    case "<": return order < 0;
    default: return order === 0;
  }
}

/** True when `version` is a strict `x.y.z` that satisfies `range`. An invalid version or range is never satisfied. */
export function satisfies(version: unknown, range: string | ParsedRange): boolean {
  const triple = parseVersion(version);
  if (!triple) return false;
  const parsed = typeof range === "string" ? parseRange(range) : { ok: true as const, range };
  if (!parsed.ok) return false;
  return parsed.range.arms.some((arm) => arm.every((comparator) => holds(comparator, triple)));
}
