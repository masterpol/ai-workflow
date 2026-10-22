import { DEFAULT_LIMITS, REASONS, parseFragment, reject, resolveLimits } from "./state-fragment-parse.mts";
import { printable } from "./state-snapshot.mts";

import type { Limits, Node, ReasonCode, Rejection } from "./state-fragment-parse.mts";

export type Citations = { hrefs: string[]; numbers: { path: string; text: string }[]; unbound: number };
export type Options = { classes?: string[]; tokens?: string[]; markers?: string[]; limits?: Partial<Limits>; hrefPrefix?: "" | "../../" };
type Element = Extract<Node, { kind: "element" }>;
type Context = { parent: string; svg: boolean; phrasing: boolean; anchor: boolean; heading: boolean; table: boolean; literal: boolean };
type Config = { classes: Set<string>; tokens: Set<string>; markers: Set<string>; limits?: Partial<Limits>; hrefPrefix: string };
export const DEFAULT_TOKENS = Object.freeze(["background", "foreground", "primary", "primaryForeground", "muted", "mutedForeground", "border"]);
const HTML = new Set("h2 h3 h4 p ul ol li table caption thead tbody tr th td code pre strong em span a data".split(" "));
const SVG = new Set("svg g rect circle ellipse line polyline polygon path text tspan title desc".split(" "));
const INLINE = new Set("code strong em span a data svg".split(" "));
const TEXT_ONLY = new Set(["title", "desc", "tspan"]);
const STRUCTURAL: Record<string, string[]> = { table: ["caption", "thead", "tbody"], thead: ["tr"], tbody: ["tr"], tr: ["th", "td"], ul: ["li"], ol: ["li"] };
const PARENTS: Record<string, string[]> = { caption: ["table"], thead: ["table"], tbody: ["table"], tr: ["thead", "tbody"], th: ["tr"], td: ["tr"], li: ["ul", "ol"] };
const GEOMETRY: Record<string, string> = { svg: "viewBox width height", rect: "x y width height rx ry", circle: "cx cy r", ellipse: "cx cy rx ry", line: "x1 y1 x2 y2", polyline: "points", polygon: "points", path: "d", text: "x y dx dy", tspan: "x y dx dy" };
const PAINTED = new Set("svg g rect circle ellipse line polyline polygon path text tspan".split(" "));
const PATH_ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const IDENTIFIER = /^[a-zA-Z][a-zA-Z0-9-]{0,31}$/;
const DECIMAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MAX_CITATIONS = 50;
const EMPTY: Context = { parent: "", svg: false, phrasing: false, anchor: false, heading: false, table: false, literal: false };
// Same grammar as the parser's token. reject() keeps only names that pass it, so any other name arrives as null.
const TOKEN_NAME = /^[a-z][a-zA-Z0-9-]{0,31}$/;
const MESSAGE_GRAMMAR = /^fragment rejected: [a-z-]{1,40} \(\d{1,6}\)( at (<[a-z][a-zA-Z0-9-]{0,31}>|\(other\)))?$/;
const MAX_COUNT = 999999;
const MAX_MESSAGE = 120;
const GENERIC_MESSAGE = "fragment rejected: syntax (1)";

class Refused {
  readonly rejection: Rejection;
  constructor(rejection: Rejection) { this.rejection = rejection; }
}
function deny(reason: ReasonCode, token: string | null = null): never { throw new Refused(reject(reason, 1, token)); }
const escapeText = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const hasUrlReference = (value: string): boolean => /url\s*\(/i.test(value);
const hasScriptScheme = (value: string): boolean => value.replace(/[\t\n\r ]/g, "").toLowerCase().includes("javascript:");
const own = (object: object, name: string): unknown => Object.getOwnPropertyDescriptor(object, name)?.value;

function configuration(options: unknown): Config {
  if (options === undefined) options = {};
  if (options === null || typeof options !== "object" || Array.isArray(options)) deny("invalid-options");
  if (![Object.prototype, null].includes(Object.getPrototypeOf(options))) deny("invalid-options");
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== "string" || !["classes", "tokens", "markers", "limits", "hrefPrefix"].includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key)!, "value")) deny("invalid-options");
  }
  const list = (key: string, fallback: readonly string[]): Set<string> => {
    const value = own(options, key);
    if (value === undefined) return new Set(fallback);
    if (!Array.isArray(value)) deny("invalid-options");
    const length = own(value, "length");
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > 50) deny("invalid-options");
    // Read bounded own data once; never execute a caller's iterator or indexed getter.
    const items: string[] = [];
    for (let index = 0; index < length; index++) {
      const item = own(value, String(index));
      if (typeof item !== "string" || !IDENTIFIER.test(item) || (key === "markers" && !item.startsWith("marker-"))) deny("invalid-options");
      items.push(item);
    }
    return new Set(items);
  };
  const limits = resolveLimits(own(options, "limits"));
  // Parser-only tests may raise depth; recursive validation and emission must always remain bounded.
  if (!limits || limits.maxDepth > DEFAULT_LIMITS.maxDepth) deny("invalid-options");
  const hrefPrefix = Object.hasOwn(options, "hrefPrefix") ? own(options, "hrefPrefix") : "";
  if (hrefPrefix !== "" && hrefPrefix !== "../../") deny("invalid-options");
  return { classes: list("classes", []), tokens: list("tokens", DEFAULT_TOKENS), markers: list("markers", ["marker-arrow"]), limits, hrefPrefix: hrefPrefix as string };
}

// Expand exponent notation so canonical numbers remain decimal and round-trip through the strict reader.
function decimal(number: number): string {
  const raw = String(number);
  if (!raw.includes("e")) return raw;
  const [mantissa, exponent] = raw.split("e");
  const sign = mantissa.startsWith("-") ? "-" : "";
  const unsigned = mantissa.replace("-", "");
  const digits = unsigned.replace(".", "");
  const point = (unsigned.includes(".") ? unsigned.indexOf(".") : unsigned.length) + Number(exponent);
  return sign + (point <= 0 ? "0." + "0".repeat(-point) + digits : point >= digits.length ? digits + "0".repeat(point - digits.length) : digits.slice(0, point) + "." + digits.slice(point));
}
function numeric(value: string): number {
  const number = Number(value);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(number) || Math.abs(number) > 1e6) deny("geometry-invalid");
  return number;
}
function lex(value: string): string[] {
  const tokens: string[] = [];
  let end = 0;
  for (const match of value.matchAll(/[A-Za-z]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)) {
    const gap = value.slice(end, match.index);
    const command = /^[A-Za-z]$/.test(match[0]);
    if (!/^[\t\r\n ]*,?[\t\r\n ]*$/.test(gap) || (gap.includes(",") && (!tokens.length || command || /^[A-Za-z]$/.test(tokens[tokens.length - 1])))) deny("geometry-invalid");
    tokens.push(match[0]);
    end = match.index + match[0].length;
  }
  if (!tokens.length || !/^[\t\r\n ]*$/.test(value.slice(end))) deny("geometry-invalid");
  return tokens;
}
function pathData(value: string): string {
  const tokens = lex(value);
  const output: string[] = [];
  let cursor = 0;
  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    if (!Object.hasOwn(PATH_ARITY, command) || (!output.length && command !== "M")) deny("geometry-invalid");
    const start = cursor;
    while (cursor < tokens.length && !/^[A-Za-z]$/.test(tokens[cursor])) cursor++;
    const raw = tokens.slice(start, cursor);
    const arity = PATH_ARITY[command];
    if (arity === 0 ? raw.length !== 0 : raw.length === 0 || raw.length % arity !== 0) deny("geometry-invalid");
    const numbers = raw.map(numeric);
    if (command === "A") for (let index = 0; index < raw.length; index += 7) {
      if (numbers[index] < 0 || numbers[index + 1] < 0 || !["0", "1"].includes(raw[index + 3]) || !["0", "1"].includes(raw[index + 4])) deny("geometry-invalid");
    }
    output.push(command + (numbers.length ? " " + numbers.map(decimal).join(" ") : ""));
  }
  return output.join(" ");
}
function transform(value: string): string {
  const output: string[] = [];
  let end = 0;
  for (const match of value.matchAll(/([a-zA-Z]+)\(([^()]*)\)/g)) {
    if (!/^[\t\r\n ]*$/.test(value.slice(end, match.index))) deny("geometry-invalid");
    const numbers = lex(match[2]).map(numeric);
    const arities = match[1] === "rotate" ? [1, 3] : ["translate", "scale"].includes(match[1]) ? [1, 2] : [];
    if (!arities.includes(numbers.length)) deny("geometry-invalid");
    output.push(match[1] + "(" + numbers.map(decimal).join(" ") + ")");
    end = match.index + match[0].length;
  }
  if (!output.length || !/^[\t\r\n ]*$/.test(value.slice(end))) deny("geometry-invalid");
  return output.join(" ");
}
function geometry(name: string, value: string): string {
  if (name === "d") return pathData(value);
  if (name === "transform") return transform(value);
  const numbers = lex(value).map(numeric);
  if (name === "points" ? numbers.length < 2 || numbers.length % 2 !== 0 : numbers.length !== (name === "viewBox" ? 4 : 1)) deny("geometry-invalid");
  if ((["width", "height", "r", "rx", "ry", "stroke-width"].includes(name) && numbers[0] < 0) || (name === "viewBox" && (numbers[2] < 0 || numbers[3] < 0))) deny("geometry-invalid");
  return numbers.map(decimal).join(" ");
}

function validContent(node: Element, context: Context): boolean {
  const name = node.name;
  if (SVG.has(name) && !["svg", "g", "text", "tspan", "title", "desc"].includes(name) && node.children.length) return false;
  if (context.svg) {
    if (!SVG.has(name) || name === "svg" || TEXT_ONLY.has(context.parent)) return false;
    if (context.parent === "text") return name === "tspan";
    return name !== "tspan" && (context.parent === "svg" || context.parent === "g");
  }
  if (name !== "svg" && !HTML.has(name)) return false;
  if (context.phrasing && !INLINE.has(name)) return false;
  if (STRUCTURAL[context.parent] && !STRUCTURAL[context.parent].includes(name)) return false;
  if (PARENTS[name] && !PARENTS[name].includes(context.parent)) return false;
  if ((name === "a" && context.anchor) || (/^h[234]$/.test(name) && context.heading) || (name === "table" && context.table)) return false;
  if (name === "table") {
    const children = node.children.filter((child) => child.kind === "element").map((child) => child.name);
    if (!/^(caption,)?(thead,)?tbody$/.test(children.join(","))) return false;
  }
  return true;
}

function attribute(name: string, value: string, node: Element, config: Config): string {
  const lower = name.toLowerCase();
  if (lower.startsWith("on")) deny("event-handler", name);
  if (lower === "style") deny("style-attribute", name);
  if (lower === "id") deny("id-attribute", name);
  if (hasUrlReference(value)) deny("url-reference", name);
  if (hasScriptScheme(value)) deny("script-scheme", name);
  const allowedAttributes = new Set(["class"]);
  if (node.name === "a") allowedAttributes.add("href");
  if (node.name === "data") allowedAttributes.add("value");
  if (node.name === "th") allowedAttributes.add("scope");
  for (const key of (GEOMETRY[node.name] ?? "").split(" ").filter(Boolean)) allowedAttributes.add(key);
  if (PAINTED.has(node.name)) for (const key of ["fill", "stroke", "stroke-width"]) allowedAttributes.add(key);
  if (PAINTED.has(node.name) && !["svg", "tspan"].includes(node.name)) allowedAttributes.add("transform");
  if (!allowedAttributes.has(name)) deny("attribute-not-allowed", name);
  if (name === "class") {
    const classes = config.classes, markers = config.markers;
    const names = value.split(/[\t\r\n ]+/).filter(Boolean);
    for (const name of names) {
      if (/^status(?:-|$)/i.test(name)) deny("class-not-allowed", "class");
      if (name.startsWith("marker-")) { if (!markers.has(name)) deny("marker-not-allowed", "class"); }
      else if (!classes.has(name)) deny("class-not-allowed", "class");
    }
    return names.join(" ");
  }
  if (name === "fill" || name === "stroke") {
    if (value === "none") return "none";
    const match = /^var\(--([a-zA-Z][a-zA-Z0-9-]{0,31})\)$/.exec(value);
    if (!match) deny("color-not-token", name);
    const token = match[1], tokens = config.tokens;
    if (!tokens.has(token)) deny("color-not-token", name);
    return `var(--${token})`;
  }
  if (name === "scope" && !["row", "col"].includes(value)) deny("attribute-not-allowed", name);
  return ["class", "href", "value", "scope"].includes(name) ? value : geometry(name, value);
}

/** Returns a canonical fragment and citations; callers must separately checkCitations before injection. */
export function sanitizeFragment(text: unknown, options?: Options): { ok: true; html: string; citations: Citations } | Rejection {
  try {
    const config = configuration(options);
    const parsed = parseFragment(text, config.limits);
    if (!parsed.ok) return parsed;
    const citations: Citations = { hrefs: [], numbers: [], unbound: 0 };
    const walk = (node: Node, context: Context): string => {
      if (node.kind === "text") {
        // HTML structural whitespace is ASCII; Unicode trim would admit foster-parented table text.
        if ((STRUCTURAL[context.parent] || (context.svg && !["text", "tspan", "title", "desc"].includes(context.parent))) && /[^\t\n\r ]/.test(node.text)) deny("content-model");
        if (!context.literal) citations.unbound += (node.text.match(/[0-9]+/g) ?? []).length;
        return escapeText(node.text);
      }
      const allowedElements = new Set([...HTML, ...SVG]);
      if (!allowedElements.has(node.name)) deny("element-not-allowed", node.name);
      if (!validContent(node, context)) deny("content-model", node.name);
      const attributes = node.attrs.map(([name, value]) => [name, attribute(name, value, node, config)]);
      const href = attributes.find(([name]) => name === "href");
      if (href) citations.hrefs.push(href[1]);
      const next: Context = { parent: node.name, svg: context.svg || node.name === "svg", phrasing: context.phrasing || INLINE.has(node.name) || ["p", "pre", "h2", "h3", "h4"].includes(node.name), anchor: context.anchor || node.name === "a", heading: context.heading || /^h[234]$/.test(node.name), table: context.table || node.name === "table", literal: context.literal || ["code", "pre"].includes(node.name) };
      let content: string;
      if (node.name === "data") {
        const path = attributes.find(([name]) => name === "value")?.[1];
        const child = node.children[0];
        if (!path || node.children.length !== 1 || child.kind !== "text" || child.text.length > 64 || !DECIMAL.test(child.text) || !Number.isFinite(Number(child.text))) deny("content-model", "data");
        content = decimal(Number(child.text));
        citations.numbers.push({ path, text: content });
      } else content = node.children.map((child) => walk(child, next)).join("");
      if (citations.hrefs.length + citations.numbers.length > MAX_CITATIONS) deny("citation-limit");
      return `<${node.name}${attributes.map(([name, value]) => ` ${name}="${escapeText(name === "href" ? config.hrefPrefix + value : value)}"`).join("")}>${content}</${node.name}>`;
    };
    const html = parsed.nodes.map((node) => walk(node, EMPTY)).join("");
    // Escaping and decimal expansion can grow input: canonical output must fit the same caps too.
    const canonical = parseFragment(html, config.limits);
    if (!canonical.ok) return canonical;
    return { ok: true, html, citations };
  } catch (error) {
    if (error instanceof Refused) return error.rejection;
    throw error;
  }
}

// Reads only the own data of a plain object, so no getter or coercion runs on a caller's value. A proxy's traps can
// still run; any throw they make is contained by rejectionMessage's try block.
function plainRecord(value: unknown): object | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value : null;
}

/** Formats a rejection from validated parts only; a null or invalid token shows as (other), and other runtime values get the generic message. */
export function rejectionMessage(rejection: Rejection): string {
  try {
    const record = plainRecord(rejection);
    if (record === null || own(record, "ok") !== false) return GENERIC_MESSAGE;
    const reason = own(record, "reason"), count = own(record, "count"), token = own(record, "token");
    if (typeof reason !== "string" || !(REASONS as readonly unknown[]).includes(reason)) return GENERIC_MESSAGE;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 || count > MAX_COUNT) return GENERIC_MESSAGE;
    if (token !== null && typeof token !== "string") return GENERIC_MESSAGE;
    const at = ` at ${typeof token === "string" && TOKEN_NAME.test(token) ? `<${token}>` : "(other)"}`;
    // printable is the second layer; the closed grammar below is the authority that keeps unsafe characters out.
    const message = printable(`fragment rejected: ${reason} (${count})${at}`);
    return MESSAGE_GRAMMAR.test(message) && message.length <= MAX_MESSAGE ? message : GENERIC_MESSAGE;
  } catch {
    return GENERIC_MESSAGE;
  }
}
