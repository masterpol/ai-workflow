import { createNodeDeps } from "./node.mts";
import type { RuntimeDeps } from "./types.mts";

export interface Violation {
  file: string;
  line: number;
  kind: "import" | "export-from" | "dynamic-import" | "require" | "global" | "dynamic-computed" | "unparsed";
  module?: string;
  suggestion: string;
}
export interface ValidateOptions {
  adapters?: ReadonlySet<string>;
  testFile?: (file: string) => boolean;
  includeGlobals?: boolean;
}
export const MAX_SOURCE_BYTES = 1024 * 1024;
export const UNPARSED_SUGGESTION = "Source could not be safely read or parsed; review it manually.";
interface Token { value: string; line: number; string?: boolean; template?: boolean; end?: number }
const suggestions: Record<string, string> = {
  "node:fs": "deps.fs", "node:path": "deps.path", "node:os": "deps.os",
  "node:child_process": "deps.child", "node:crypto": "deps.crypto", "node:net": "deps.net",
};

/** A lexical scanner, not a TypeScript parser. Template text is opaque; interpolation expressions are scanned as code. */
function lex(source: string): { tokens: Token[]; errorLine?: number } {
  const tokens: Token[] = [];
  let i = 0, line = 1;
  const advance = (): string => { const ch = source[i++]; if (ch === "\n" || ch === "\u2028" || ch === "\u2029") line++; return ch; };
  const escape = (): string => {
    let value = "";
    const escaped = advance();
    if (escaped === "\n" || escaped === "\u2028" || escaped === "\u2029") return "";
    if (escaped === "\r") { if (source[i] === "\n") advance(); return ""; }
    if (escaped === "u" && source[i] === "{") {
      advance();
      const start = i;
      while (i < source.length && source[i] !== "}") advance();
      const hex = source.slice(start, i);
      if (!/^[0-9a-fA-F]{1,6}$/.test(hex) || parseInt(hex, 16) > 0x10ffff || source[i] !== "}") throw new Error("escape");
      advance(); value += String.fromCodePoint(parseInt(hex, 16));
    } else if (escaped === "u" || escaped === "x") {
      const count = escaped === "u" ? 4 : 2;
      const hex = source.slice(i, i + count);
      if (!new RegExp(`^[0-9a-fA-F]{${count}}$`).test(hex)) throw new Error("escape");
      value += String.fromCharCode(parseInt(hex, 16)); i += count;
    } else value += escaped;
    return value;
  };
  const quoted = (quote: string): string => {
    advance();
    let value = "";
    while (i < source.length) {
      const ch = advance();
      if (ch === quote) return value;
      if (ch === "\n" || ch === "\r") throw new Error("literal");
      if (ch === "\\") {
        value += escape();
      } else value += ch;
    }
    throw new Error("literal");
  };
  const comment = (): boolean => {
    if (source.startsWith("//", i)) {
      while (i < source.length && !/[\n\r\u2028\u2029]/.test(source[i])) advance();
      return true;
    }
    if (source.startsWith("/*", i)) {
      advance(); advance();
      while (i < source.length && !source.startsWith("*/", i)) advance();
      if (i === source.length) throw new Error("comment");
      advance(); advance(); return true;
    }
    return false;
  };
  const regex = (): void => {
    advance(); let bracket = false;
    while (i < source.length) {
      const ch = advance();
      if (ch === "\\") { advance(); continue; }
      if (/[\n\r\u2028\u2029]/.test(ch)) throw new Error("regex");
      if (ch === "[") bracket = true;
      if (ch === "]") bracket = false;
      if (ch === "/" && !bracket) { while (/[a-z]/i.test(source[i] ?? "")) advance(); return; }
    }
    throw new Error("regex");
  };
  const template = (token: Token): void => {
    advance();
    let prefix = true;
    while (i < source.length) {
      const ch = advance();
      if (ch === "\\") { const value = escape(); if (prefix) token.value += value; continue; }
      if (ch === "`") { token.end = tokens.length; return; }
      if (ch === "$" && source[i] === "{") {
        prefix = false;
        advance();
        tokens.push({ value: "{", line });
        code(true);
      } else if (prefix) token.value += ch;
    }
    throw new Error("template");
  };
  const parentheses: boolean[] = [];
  let controlClose = false;
  const code = (interpolation = false): void => {
    let depth = 0;
    while (i < source.length) {
      if (/\s/.test(source[i])) { advance(); continue; }
      if (comment()) continue;
      const startLine = line, ch = source[i];
      if (interpolation && ch === "}" && depth === 0) {
        tokens.push({ value: advance(), line: startLine }); return;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (ch === "\\") throw new Error("escaped identifier");
      if (ch === '"' || ch === "'") {
        tokens.push({ value: quoted(ch), line: startLine, string: true }); continue;
      }
      if (ch === "`") { const token = { value: "", line: startLine, string: true, template: true }; tokens.push(token); template(token); continue; }
      const previous = tokens.at(-1)?.value;
      if (ch === "/" && (controlClose || previous === undefined || /^(?:[>=(:,!&|?;{\[]|return|throw|case|yield)$/.test(previous))) {
        regex(); tokens.push({ value: "literal", line: startLine }); continue;
      }
      const afterControl = ch === ")" && (parentheses.pop() ?? false);
      if (ch === "(") parentheses.push(["if", "while", "for"].includes(previous ?? ""));
      controlClose = afterControl;
      if (/[\w$]/.test(ch)) {
        let value = ""; while (i < source.length && /[\w$]/.test(source[i])) value += advance();
        tokens.push({ value, line: startLine });
      } else tokens.push({ value: advance(), line: startLine });
    }
    if (interpolation) throw new Error("template");
  };
  try { code(); } catch { return { tokens, errorLine: line }; }
  return { tokens };
}

function scan(file: string, source: string, options: ValidateOptions): Violation[] {
  const { tokens, errorLine } = lex(source), found: Violation[] = [];
  const isTest = (options.testFile ?? ((p) => /\.test\.(mts|ts)$/.test(p)))(file);
  const add = (token: Token, kind: Violation["kind"], module: Token | undefined): void => {
    if (!module?.string || !module.value.startsWith("node:")) return;
    if (isTest && ["node:test", "node:assert", "node:assert/strict"].includes(module.value)) return;
    found.push({ file, line: token.line, kind, module: module.value,
      suggestion: suggestions[module.value] ?? "pass the capability from a caller" });
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i], next = tokens[i + 1];
    if (token.string || tokens[i - 1]?.value === "." || tokens[i - 1]?.value === "?.") continue;
    if (token.value === "process" && next?.value === "." && options.includeGlobals &&
        ["env", "argv", "exit", "cwd", "platform", "stdin", "stdout", "stderr"].includes(tokens[i + 2]?.value)) {
      found.push({ file, line: token.line, kind: "global", suggestion: "deps.proc or deps.io" });
    }
    // Inspect the first argument, keeping nested expressions and template interpolations.
    const call = (kind: "require" | "dynamic-import"): void => {
      let start = i + 1;
      if (kind === "require") {
        while (tokens[start]?.value === ")") start++;
        if (tokens[start]?.value === "?" && tokens[start + 1]?.value === ".") start += 2;
      }
      let argument: Token[] = [];
      if (tokens[start]?.template) {
        argument = tokens.slice(start, tokens[start].end ?? start + 1);
      } else if (tokens[start]?.value === "(") {
        let depth = 0;
        for (let j = start + 1; j < tokens.length; j++) {
          const current = tokens[j];
          if (!current.string && depth === 0 && [")", ","].includes(current.value)) break;
          argument.push(current);
          if (!current.string && ["(", "[", "{"].includes(current.value)) depth++;
          if (!current.string && [")", "]", "}"].includes(current.value)) depth--;
        }
      }
      const nodeLiteral = argument.find(part => part.string && part.value.startsWith("node:"));
      if (nodeLiteral) {
        if (next?.value === "(" && argument.length === 1 && !nodeLiteral.template) add(token, kind, nodeLiteral);
        else found.push({ file, line: token.line, kind,
          suggestion: "non-literal import specifier; pass the capability from a caller" });
      } else if (!argument.some(part => part.string || /^(?:literal|true|false|null|[0-9].*)$/.test(part.value)) && options.includeGlobals) {
        found.push({ file, line: token.line, kind: "dynamic-computed",
          suggestion: "computed import specifier; review manually or pass the capability from a caller" });
      }
    };
    if (token.value === "require") {
      const previous = tokens[i - 1]?.value;
      const declaration = ["const", "let", "var", "function", "class", "interface", "type", "import"].includes(previous ?? "");
      let method = false;
      if (["{", ","].includes(previous ?? "") && next?.value === "(") {
        let depth = 0;
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].value === "(") depth++;
          if (tokens[j].value === ")" && --depth === 0) {
            method = tokens[j + 1]?.value === "{"; break;
          }
        }
      }
      const key = (["{", ","].includes(previous ?? "") && next?.value === ":") || method;
      if (!declaration && !key) call("require");
    }
    if (token.value !== "import" && token.value !== "export") continue;
    if (token.value === "import" && next?.value === "(") { call("dynamic-import"); continue; }
    const typeOnly = next?.value === "type" && (token.value === "export" ||
      ["{", "*"].includes(tokens[i + 2]?.value) ||
      (/^[\w$]+$/.test(tokens[i + 2]?.value ?? "") && tokens[i + 2]?.value !== "from"));
    if (next?.value === "." || typeOnly) continue;
    if (token.value === "import" && next?.string) { add(token, "import", next); continue; }
    // Only declarations beginning with bindings or a star can have a module specifier.
    if (token.value === "export" && !["{", "*", "type"].includes(next?.value)) continue;
    for (let j = i + 1; j < tokens.length; j++) {
      const current = tokens[j];
      if (current.value === ";" || (!current.string && ["import", "export"].includes(current.value))) break;
      if (!current.string && current.value === "from" && tokens[j + 1]?.string) {
        add(token, token.value === "import" ? "import" : "export-from", tokens[j + 1]); break;
      }
    }
  }
  if (errorLine !== undefined) found.push({ file, line: errorLine, kind: "unparsed", suggestion: UNPARSED_SUGGESTION });
  return found;
}

export function createValidator(deps: RuntimeDeps) {
  return { validateRuntimeImports: (root: string, paths: readonly string[], options: ValidateOptions = {}): Violation[] => {
    const result: Violation[] = [];
    for (const input of paths) {
      const absolute = deps.path.resolve(root, input);
      const relative = deps.path.relative(deps.path.resolve(root), absolute);
      const file = relative.split(deps.path.sep).join("/");
      let fd: number | undefined;
      try {
        if (relative === ".." || relative.startsWith(`..${deps.path.sep}`) || deps.path.isAbsolute(relative)) throw new Error("outside");
        // Refuse links in every component, including directory aliases.
        let component = deps.path.resolve(root);
        if (deps.fs.lstatSync(component).isSymbolicLink()) throw new Error("link");
        for (const part of relative.split(deps.path.sep)) {
          component = deps.path.join(component, part);
          if (deps.fs.lstatSync(component).isSymbolicLink()) throw new Error("link");
        }
        const stat = deps.fs.lstatSync(absolute);
        if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES) throw new Error("size");
        fd = deps.fs.openSync(absolute, deps.fs.constants.O_RDONLY | (deps.fs.constants.O_NOFOLLOW ?? 0) | (deps.fs.constants.O_NONBLOCK ?? 0));
        const opened = deps.fs.fstatSync(fd);
        if (!opened.isFile() || opened.size > MAX_SOURCE_BYTES) throw new Error("size");
        const bytes = new Uint8Array(MAX_SOURCE_BYTES + 1);
        let count = 0, read = 0;
        do { read = deps.fs.readSync(fd, bytes, count, bytes.length - count, count); count += read; } while (read && count < bytes.length);
        if (count > MAX_SOURCE_BYTES) throw new Error("size");
        if (!options.adapters?.has(file)) result.push(...scan(file, new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, count)), options));
      } catch {
        result.push({ file: file.startsWith("../") || deps.path.isAbsolute(file) ? "(outside root)" : file,
          line: 1, kind: "unparsed", suggestion: UNPARSED_SUGGESTION });
      } finally { if (fd !== undefined) { try { deps.fs.closeSync(fd); } catch { /* no raw errors */ } } }
    }
    return result;
  } };
}

/** Defaults are lazy; imports never perform filesystem operations or select a runner. */
export function validateRuntimeImports(root: string, paths: readonly string[], options: ValidateOptions = {}, deps?: RuntimeDeps): Violation[] {
  return createValidator(deps ?? createNodeDeps()).validateRuntimeImports(root, paths, options);
}
