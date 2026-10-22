/*
 * Checks the citations a sanitized state fragment carries against the state snapshot: every cited path
 * must be a project-relative evidence path of some snapshot fact and pass the shared state-render
 * file check; every bound number must equal the snapshot fact it names. Reads no fragment file and
 * writes nothing. See .project/pitches/state-fragment-sanitizer/spike-s1.md (D6, D8, D9).
 */
import { createNodeDeps } from "./runtime/node.mts";
import { createStateRender } from "./state-render.mts";
import { createStateSnapshot } from "./state-snapshot.mts";
import { isSecretName } from "./state-structure.mts";
import { reject } from "./state-fragment-parse.mts";

import type { RuntimeDeps } from "./runtime/types.mts";
import type { Rejection } from "./state-fragment-parse.mts";
import type { Citations } from "./state-fragment.mts";

let nodeDeps: RuntimeDeps | undefined;
function defaultDeps(): RuntimeDeps { return (nodeDeps ??= createNodeDeps()); }

export const MAX_CITATIONS = 50;
const MAX_PATH = 200;
const MAX_NUMBER_TEXT = 64;
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);
const TRANSCRIPT_DIRS = new Set(["transcripts", "sessions", ".sessions", "session-logs", "conversation-logs"]);
const TRANSCRIPT_NAME = /(?:^|[._-])(?:transcript|conversation|session-log)(?:[._-]|$)/;
const INDEX = /^(?:0|[1-9][0-9]{0,5})$/;
const DECIMAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const MISSING = Symbol("missing");

const hasScheme = (href: string): boolean => /^[A-Za-z][A-Za-z0-9+.-]*:/.test(href);

function isTranscriptPath(href: string): boolean {
  const segments = href.toLowerCase().split("/");
  const base = segments[segments.length - 1] ?? "";
  return segments.slice(0, -1).some((segment) => TRANSCRIPT_DIRS.has(segment)) || base.endsWith(".jsonl") || TRANSCRIPT_NAME.test(base);
}

/** Shape of an untrusted href, as a named reason; null means the shared filesystem check decides. */
function classify(href: string): Rejection["reason"] | null {
  const segments = href.split("/");
  if (href.includes("\\")) return "backslash";
  if (href.includes("%")) return "percent";
  if (hasScheme(href)) return "scheme";
  if (href.startsWith("/")) return "absolute";
  if (segments.includes("..")) return "traversal";
  if (segments.some(isSecretName)) return "secret-path";
  if (isTranscriptPath(href)) return "transcript-path";
  return null;
}

// A snapshot fact wraps its leaf as { value, status, evidence }; traversal reads through the wrapper.
function unwrap(node: unknown): unknown {
  if (node === null || typeof node !== "object" || !Object.hasOwn(node, "status") || !Object.hasOwn(node, "evidence") || !Object.hasOwn(node, "value")) return node;
  const desc = Object.getOwnPropertyDescriptor(node, "value");
  return desc && "value" in desc ? desc.value : MISSING;
}

/** Resolves a dotted path over own data properties only, so no prototype member is ever reachable. */
function lookup(snapshot: unknown, path: string): unknown {
  if (path.length > MAX_PATH) return MISSING;
  let current = snapshot;
  for (const segment of path.split(".")) {
    current = unwrap(current);
    if (FORBIDDEN_SEGMENTS.has(segment)) return MISSING;
    if (current === null || typeof current !== "object") return MISSING;
    if (!Object.hasOwn(current, segment)) return MISSING;
    if (Array.isArray(current) && segment !== "length" && !INDEX.test(segment)) return MISSING;
    const desc = Object.getOwnPropertyDescriptor(current, segment);
    if (desc && !("value" in desc)) return MISSING;
    current = desc?.value;
  }
  return unwrap(current);
}

const own = (object: object, key: string): unknown => Object.getOwnPropertyDescriptor(object, key)?.value;

// Validate a bounded data snapshot, then consume only that snapshot. Accessors and iterators never run.
function citationData(input: unknown): Citations | Rejection {
  try {
    if (input === null || typeof input !== "object") return reject("input-type");
    const hrefs = own(input, "hrefs"), numbers = own(input, "numbers"), unbound = own(input, "unbound");
    if (!Array.isArray(hrefs) || !Array.isArray(numbers) || typeof unbound !== "number" || !Number.isSafeInteger(unbound) || unbound < 0) return reject("input-type");
    const hrefCount = own(hrefs, "length"), numberCount = own(numbers, "length");
    if (typeof hrefCount !== "number" || typeof numberCount !== "number" || !Number.isSafeInteger(hrefCount) || !Number.isSafeInteger(numberCount) || hrefCount < 0 || numberCount < 0) return reject("input-type");
    const count = hrefCount + numberCount;
    if (count > MAX_CITATIONS) return reject("citation-limit", count);
    const copied: Citations = { hrefs: [], numbers: [], unbound };
    for (let index = 0; index < hrefCount; index++) {
      const href = own(hrefs, String(index));
      if (typeof href !== "string") return reject("input-type");
      copied.hrefs.push(href);
    }
    for (let index = 0; index < numberCount; index++) {
      const item = own(numbers, String(index));
      if (item === null || typeof item !== "object") return reject("input-type");
      const path = own(item, "path"), text = own(item, "text");
      if (typeof path !== "string" || typeof text !== "string") return reject("input-type");
      copied.numbers.push({ path, text });
    }
    return copied;
  } catch { return reject("input-type"); }
}

/** Returns `{ ok: true }` only when every cited path and bound number is backed by the snapshot. */
export function checkCitations(citations: Citations, snapshot: unknown, root: string, deps: RuntimeDeps = defaultDeps()): { ok: true } | Rejection {
  if (typeof root !== "string" || root === "") return reject("input-type");
  const data = citationData(citations);
  if ("ok" in data) return data;
  citations = data;
  if (citations.hrefs.length > 0) {
    const evidence = new Set<string>();
    for (const [, fact] of createStateSnapshot(deps).facts(snapshot)) for (const item of fact.evidence) if (typeof item === "string") evidence.add(item);
    let canonicalRoot: string;
    try { canonicalRoot = deps.fs.realpathSync(root); } catch { return reject("unsafe-path"); }
    const render = createStateRender(deps);
    for (const href of citations.hrefs) {
      if (href.length > MAX_PATH) return reject("unsafe-path");
      const reason = classify(href);
      if (reason) return reject(reason);
      if (!evidence.has(href)) return reject("evidence-not-in-snapshot");
      if (!render.safeEvidencePath(canonicalRoot, href)) return reject("unsafe-path");
    }
  }
  for (const binding of citations.numbers) {
    const value = lookup(snapshot, binding.path);
    if (value === MISSING) return reject("unknown-fact");
    if (typeof value !== "number") return reject("not-a-number");
    // A strict decimal text can only equal a finite value, so NaN and Infinity leaves fail the comparison below.
    if (binding.text.length > MAX_NUMBER_TEXT || !DECIMAL.test(binding.text)) return reject("not-a-number");
    if (Number(binding.text) !== value) return reject("number-mismatch");
  }
  if (citations.unbound > 0) return reject("unbound-number", citations.unbound);
  return { ok: true };
}
