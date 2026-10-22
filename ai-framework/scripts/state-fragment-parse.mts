// Strict XML-subset parser for untrusted state fragments (state-fragment-sanitizer, spike S1 contract D1, D2, D10).
// It is pure: no I/O, no dependency and no recursion. All state lives in one call, a single forward cursor walks
// the input once, and every cap is checked before or during that scan, so cost stays linear in the input size.
// The parser only proves the input is well formed and bounded; the allow-list and content model belong to
// state-fragment.mts, which consumes the Node tree.

export const REASONS = Object.freeze([
  "input-type", "invalid-options", "invalid-unicode", "syntax", "size-limit", "depth-limit", "node-limit",
  "attribute-limit", "attribute-length", "path-length", "text-length", "name-length", "doctype",
  "entity-declaration", "cdata", "comment", "processing-instruction", "namespace-prefix", "character-reference",
  "unclosed", "mismatched-close", "duplicate-attribute", "unquoted-attribute", "control-character",
  "element-not-allowed", "event-handler", "style-attribute", "id-attribute", "url-reference", "script-scheme",
  "attribute-not-allowed", "class-not-allowed", "color-not-token", "marker-not-allowed", "content-model",
  "geometry-invalid", "citation-limit", "traversal", "absolute", "scheme", "percent", "backslash", "secret-path",
  "transcript-path", "evidence-not-in-snapshot", "unsafe-path", "unknown-fact", "not-a-number", "number-mismatch",
  "unbound-number",
] as const);

export type ReasonCode = (typeof REASONS)[number];
/** A rejection never carries source text: token is a name from the closed name grammar, or null. */
export type Rejection = { ok: false; reason: ReasonCode; count: number; token: string | null };
export type Node =
  | { kind: "element"; name: string; attrs: [string, string][]; children: Node[] }
  | { kind: "text"; text: string };
export type Limits = {
  maxBytes: number; maxDepth: number; maxNodes: number; maxAttrs: number;
  maxAttrValue: number; maxPathD: number; maxText: number; maxName: number;
};

type Element = Extract<Node, { kind: "element" }>;

export const DEFAULT_LIMITS: Readonly<Limits> = Object.freeze({
  maxBytes: 65536, maxDepth: 20, maxNodes: 2000, maxAttrs: 12,
  maxAttrValue: 512, maxPathD: 8192, maxText: 4000, maxName: 32,
});

const MAX_COUNT = 999999;
const TOKEN = /^[a-z][a-zA-Z0-9-]{0,31}$/;
const NAME = /^[A-Za-z][A-Za-z0-9-]*$/;
const ENTITIES: Readonly<Record<string, string>> = Object.freeze({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" });
// The longest predefined reference name has four characters, so ";" must appear within five of "&".
const ENTITY_LOOKAHEAD = 5;
// Node has no self-closed bit. A browser opens <p/> instead of closing it, so a self-closed allow-listed HTML
// name would change meaning on injection. SVG self-closure is real XML in foreign content and stays allowed.
const HTML_ELEMENTS = new Set([
  "h2", "h3", "h4", "p", "ul", "ol", "li", "table", "caption", "thead", "tbody", "tr", "th", "td",
  "code", "pre", "strong", "em", "span", "a", "data",
]);
// C0 except TAB/LF/CR, DEL and C1, bidi embeddings and overrides (U+202A-202E), and isolates (U+2066-2069).
const FORBIDDEN_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/;

/** Builds a rejection from validated parts only: unknown reasons become syntax, counts clamp, bad tokens drop. */
export function reject(reason: ReasonCode, count = 1, token: string | null = null): Rejection {
  const known: ReasonCode = (REASONS as readonly unknown[]).includes(reason) ? reason : "syntax";
  const bounded = typeof count === "number" && !Number.isNaN(count) ? Math.min(Math.max(Math.trunc(count), 1), MAX_COUNT) : 1;
  const name = typeof token === "string" && token.length <= 32 && TOKEN.test(token) ? token : null;
  return { ok: false, reason: known, count: bounded, token: name };
}

// Thrown only inside one parse call to unwind the scanner with an already-built rejection.
class Halt {
  rejection: Rejection;
  constructor(rejection: Rejection) { this.rejection = rejection; }
}

function hasForbiddenControl(text: string): boolean {
  return FORBIDDEN_CONTROL.test(text);
}

function isQuote(char: string | undefined): boolean {
  return char === '"' || char === "'";
}

function isSpace(char: string | undefined): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

// Characters a name scan consumes. Colon, dot and underscore are consumed so they reject with a named
// reason (namespace-prefix or syntax) instead of being read as a missing separator.
function isNameChar(code: number): boolean {
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90) || (code >= 48 && code <= 58)
    || code === 45 || code === 46 || code === 95;
}

/** Partial limits override defaults key by key; anything other than own positive safe integers is refused. */
export function resolveLimits(overrides: unknown): Limits | null {
  try {
    if (overrides === undefined) return { ...DEFAULT_LIMITS };
    if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) return null;
    const prototype: unknown = Object.getPrototypeOf(overrides);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const limits: Limits = { ...DEFAULT_LIMITS };
    for (const key of Reflect.ownKeys(overrides)) {
      if (typeof key !== "string" || !Object.hasOwn(DEFAULT_LIMITS, key)) return null;
      // Ordinary getters are not invoked; Proxy traps may run, but only the copied value is consumed.
      const value: unknown = Object.getOwnPropertyDescriptor(overrides, key)?.value;
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
      limits[key as keyof Limits] = value;
    }
    return limits;
  } catch { return null; }
}

/** Decodes the five predefined entities once; any other named or numeric reference rejects. */
function decode(value: string): string {
  let out = "", from = 0;
  for (let amp = value.indexOf("&"); amp !== -1; amp = value.indexOf("&", from)) {
    let end = amp + 1;
    while (end < value.length && end - amp <= ENTITY_LOOKAHEAD && value[end] !== ";") end++;
    const key = value.slice(amp + 1, end);
    if (value[end] !== ";" || !Object.hasOwn(ENTITIES, key)) throw new Halt(reject("character-reference"));
    out += value.slice(from, amp) + ENTITIES[key];
    from = end + 1;
  }
  return out + value.slice(from);
}

function scan(text: string, limits: Limits): Node[] {
  const roots: Node[] = [];
  const stack: Element[] = [];
  let cursor = 0, count = 0;

  const fail = (reason: ReasonCode, token: string | null = null): never => {
    throw new Halt(reject(reason, 1, token));
  };
  const expectMore = (): void => {
    if (cursor >= text.length) fail("unclosed", stack.length === 0 ? null : stack[stack.length - 1].name);
  };
  const skipSpace = (): boolean => {
    const start = cursor;
    while (isSpace(text[cursor])) cursor++;
    return cursor > start;
  };
  const add = (node: Node): void => {
    count++;
    if (count > limits.maxNodes) fail("node-limit");
    (stack.length === 0 ? roots : stack[stack.length - 1].children).push(node);
  };

  const readName = (): string => {
    const start = cursor;
    while (cursor < text.length && isNameChar(text.charCodeAt(cursor))) cursor++;
    const length = cursor - start;
    if (length > limits.maxName) fail("name-length");
    const name = text.slice(start, cursor);
    if (name.includes(":")) fail("namespace-prefix");
    if (length === 0) expectMore();
    if (!NAME.test(name)) fail("syntax");
    return name;
  };

  const readText = (): void => {
    const start = cursor;
    const end = text.indexOf("<", cursor);
    cursor = end === -1 ? text.length : end;
    const length = cursor - start;
    if (length > limits.maxText) fail("text-length");
    add({ kind: "text", text: decode(text.slice(start, cursor)) });
  };

  const readAttribute = (attrs: [string, string][], seen: Set<string>): void => {
    const name = readName();
    if (seen.has(name.toLowerCase())) fail("duplicate-attribute", name);
    seen.add(name.toLowerCase());
    if (attrs.length >= limits.maxAttrs) fail("attribute-limit");
    skipSpace();
    expectMore();
    if (text[cursor] !== "=") fail("unquoted-attribute", name);
    cursor++;
    skipSpace();
    expectMore();
    const quote = text[cursor];
    if (!isQuote(quote)) fail("unquoted-attribute", name);
    const start = ++cursor;
    while (cursor < text.length && text[cursor] !== quote) {
      if (text[cursor] === "<") fail("syntax", name);
      cursor++;
    }
    expectMore();
    const length = cursor - start;
    // Path data has its own larger cap that replaces the general attribute cap.
    if (name === "d") {
      if (length > limits.maxPathD) fail("path-length", name);
    } else if (length > limits.maxAttrValue) fail("attribute-length", name);
    attrs.push([name, decode(text.slice(start, cursor))]);
    cursor++;
  };

  const readOpen = (): void => {
    const name = readName();
    const attrs: [string, string][] = [];
    const seen = new Set<string>();
    for (;;) {
      const separated = skipSpace();
      expectMore();
      if (text[cursor] === ">" || text[cursor] === "/") break;
      if (!separated) fail("syntax", name);
      readAttribute(attrs, seen);
    }
    const selfClosed = text[cursor] === "/";
    if (selfClosed) {
      cursor++;
      expectMore();
      if (text[cursor] !== ">") fail("syntax", name);
      if (HTML_ELEMENTS.has(name.toLowerCase())) fail("content-model", name);
    }
    cursor++;
    // Depth counts the new element itself, self-closed or not.
    const depth = stack.length + 1;
    if (depth > limits.maxDepth) fail("depth-limit", name);
    const node: Element = { kind: "element", name, attrs, children: [] };
    add(node);
    if (!selfClosed) stack.push(node);
  };

  const readClose = (): void => {
    const name = readName();
    skipSpace();
    expectMore();
    if (text[cursor] !== ">") fail("syntax", name);
    cursor++;
    const open = stack.pop();
    if (open === undefined) return fail("mismatched-close", name);
    if (open.name !== name) fail("mismatched-close", name);
  };

  while (cursor < text.length) {
    if (text[cursor] !== "<") {
      readText();
      continue;
    }
    if (text.startsWith("<!DOCTYPE", cursor)) fail("doctype");
    if (text.startsWith("<!ENTITY", cursor)) fail("entity-declaration");
    if (text.startsWith("<![CDATA[", cursor)) fail("cdata");
    if (text.startsWith("<!--", cursor)) fail("comment");
    if (text.startsWith("<?", cursor)) fail("processing-instruction");
    cursor++;
    // Any other "<!" falls through to readName, which rejects the empty name as syntax.
    if (text[cursor] === "/") {
      cursor++;
      readClose();
    } else readOpen();
  }
  if (stack.length !== 0) fail("unclosed", stack[stack.length - 1].name);
  return roots;
}

/** Parses a fragment into a tree, or returns the first deterministic rejection. Never strips and continues. */
export function parseFragment(text: unknown, overrides?: Partial<Limits>): { ok: true; nodes: Node[] } | Rejection {
  if (typeof text !== "string") return reject("input-type");
  const limits = resolveLimits(overrides);
  if (limits === null) return reject("invalid-options");
  // UTF-8 never takes fewer bytes than UTF-16 code units, so the length is a lower bound that refuses a huge
  // input before it is encoded.
  if (text.length > limits.maxBytes) return reject("size-limit");
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > limits.maxBytes) return reject("size-limit");
  if (!text.isWellFormed()) return reject("invalid-unicode");
  if (hasForbiddenControl(text)) return reject("control-character");
  try {
    return { ok: true, nodes: scan(text, limits) };
  } catch (error) {
    if (error instanceof Halt) return error.rejection;
    throw error;
  }
}
