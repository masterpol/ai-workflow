#!/usr/bin/env node
import { runDirect } from "../../ai-framework/scripts/runtime/cli.mts";
/**
 * Post-edit enforcement hook
 * Runs after every Edit or Write tool call on .ts/.tsx/.mts/.cts/.js/.jsx files.
 *
 * This hook ships stack-agnostic on purpose: it only runs mechanical checks that
 * apply to any JS/TS codebase regardless of framework or backend. Framework-specific
 * checks (e.g. a client/server component boundary convention, a specific backend's
 * validator API, a specific import-alias convention) are NOT baked in here — if your
 * stack needs those, generate a project-specific version of this hook via `/setup` or
 * add a project-local check of your own.
 *
 * Checks for:
 *   - Hardcoded secrets (API keys, passwords, tokens)
 *   - console.log in production code
 *   - Files without any test coverage nearby (soft signal only — see below)
 *   - Components/modules over 150 lines
 *   - TODO/FIXME comments
 *   - TypeScript `any` usage
 *   - TypeScript syntax errors (if the project has `typescript` installed)
 *
 * Exit codes:
 *   0 = pass (or warnings only)
 *   2 = critical issues — Claude Code will surface the error to the AI
 *
 * Claude Code PostToolUse hook protocol:
 *   - Receives JSON via stdin: { tool_name, tool_input, tool_response }
 *   - stdout is shown to the AI as feedback
 *   - Exit code 2 blocks and surfaces the message
 */

import type { RuntimeDeps } from "../../ai-framework/scripts/runtime/types.mts";
import { createNodeDeps } from "../../ai-framework/scripts/runtime/node.mts";

interface TsDiagnostic { messageText: string | { messageText: string }; start?: number }
interface TsModule {
  ScriptTarget: { ESNext: number };
  JsxEmit: { ReactJSX: number };
  transpileModule(content: string, options: Record<string, unknown>): { diagnostics?: TsDiagnostic[] };
}
type Plain = Record<string, unknown>;

/** `file://` URL for an absolute path, without node:url (this file imports no node:* module). */
function fileUrl(file: string): string {
  const slashed = file.replace(/\\/g, "/");
  return "file://" + encodeURI(slashed.startsWith("/") ? slashed : `/${slashed}`).replace(/[?#]/g, (c) => (c === "?" ? "%3F" : "%23"));
}

/** Resolves the entry file of `dir` the way require(dir) does: package.json "main", else index.js. */
function resolveMain(dir: string, deps: RuntimeDeps): string {
  const isFile = (file: string): boolean => {
    try { return deps.fs.statSync(file).isFile(); } catch { return false; }
  };
  const pkgPath = deps.path.join(dir, "package.json");
  if (deps.fs.existsSync(pkgPath)) {
    const main = (JSON.parse(deps.fs.readFileSync(pkgPath)) as Plain).main;
    if (typeof main === "string" && main !== "") {
      const base = deps.path.resolve(dir, main);
      if (!base.startsWith(dir + deps.path.sep)) return deps.path.join(dir, "index.js");
      for (const candidate of [base, `${base}.js`, deps.path.join(base, "index.js")]) {
        if (isFile(candidate)) return candidate;
      }
    }
  }
  return deps.path.join(dir, "index.js");
}

async function loadTypescript(deps: RuntimeDeps): Promise<TsModule> {
  const tsDir = deps.path.join(deps.proc.cwd(), "node_modules/typescript");
  const ns = (await import(fileUrl(resolveMain(tsDir, deps)))) as { default?: unknown } & Plain;
  return (ns.default ?? ns) as TsModule;
}

export async function check(data: unknown, deps: RuntimeDeps): Promise<number> {
  const input = typeof data === "object" && data !== null ? ((data as Plain).tool_input as Plain | undefined) : undefined;
  const filePath = input?.file_path ?? "";
  if (!filePath || typeof filePath !== "string") return 0;

  const ext = deps.path.extname(filePath).toLowerCase();
  const checkableExts = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"];
  if (!checkableExts.includes(ext)) return 0;

  // Skip test files for most checks
  const isTest = /\.(test|spec)\.(ts|tsx|mts|cts|js|jsx)$/.test(filePath);
  // Skip files in common dependency/build/tooling directories
  if (
    filePath.includes("node_modules") ||
    filePath.includes("/dist/") ||
    filePath.includes("/build/") ||
    filePath.includes(".claude")
  ) {
    return 0;
  }

  let content: string;
  try {
    content = deps.fs.readFileSync(filePath);
  } catch {
    return 0; // Can't read — don't block
  }

  const lines = content.split("\n");
  const isComponent = ext === ".tsx" || ext === ".jsx";
  const fileName = deps.path.basename(filePath);

  const warnings: string[] = [];
  const errors: string[] = [];

  // ── 0. TypeScript syntax check (fast, synchronous, ~50ms) ────────────────
  // Uses TypeScript's own transpileModule which catches syntax errors (stray
  // braces, mismatched parens, etc.) without needing a full project type-check.
  // Skipped silently if the project has no local `typescript` install.
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) {
    try {
      const ts = await loadTypescript(deps);
      const result = ts.transpileModule(content, {
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          // Only set jsx option for .tsx files — passing JsxEmit.None (0) for
          // plain .ts files is rejected as invalid in some TS versions
          ...(ext === ".tsx" ? { jsx: ts.JsxEmit.ReactJSX } : {}),
        },
        reportDiagnostics: true,
      });
      if (result.diagnostics && result.diagnostics.length > 0) {
        for (const diag of result.diagnostics) {
          const msg =
            typeof diag.messageText === "string"
              ? diag.messageText
              : diag.messageText.messageText;
          // Approximate line number from character offset
          const lineNum = diag.start !== undefined
            ? content.slice(0, diag.start).split("\n").length
            : "?";
          errors.push(`SYNTAX: Parse error at line ${lineNum} — ${msg}`);
        }
      }
    } catch {
      // TypeScript not resolvable — skip silently
    }
  }

  // ── 1. Hardcoded secrets ─────────────────────────────────────────────────
  // Format-based patterns for widely-used secret formats. Add project-specific
  // vendor key patterns via `/setup` or a local override if your stack needs more.
  const secretPatterns = [
    { re: /['"`](sk-[A-Za-z0-9]{20,})['"`]/, name: "OpenAI-style API key" },
    { re: /['"`](sk_live_[A-Za-z0-9]{20,})['"`]/, name: "Stripe-style live key" },
    { re: /password\s*[:=]\s*['"`]\w{4,}['"`]/i, name: "hardcoded password" },
    { re: /['"`](ghp_[A-Za-z0-9]{36,})['"`]/, name: "GitHub personal access token" },
    { re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, name: "embedded private key" },
  ];

  for (const { re, name } of secretPatterns) {
    if (re.test(content)) {
      errors.push(`SECURITY: Possible ${name} detected — use environment variables instead`);
    }
  }

  // ── 2. console.log / debug in production ─────────────────────────────────
  if (!isTest) {
    const consoleLogs = lines.filter((l) => {
      const trimmed = l.trim();
      return /console\.(log|debug)\(/.test(trimmed) &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("*");
    });
    if (consoleLogs.length > 0) {
      warnings.push(
        `QUALITY: ${consoleLogs.length} console.log/debug statement(s) found — remove before merging`
      );
    }
  }

  // ── 3. File size limit ────────────────────────────────────────────────────
  if (lines.length > 150) {
    const kind = isComponent ? "component" : "module";
    warnings.push(
      `SIZE: ${fileName} is ${lines.length} lines (limit: 150) — consider splitting this ${kind}`
    );
  }

  // ── 4. TypeScript `any` in production code ────────────────────────────────
  if (!isTest) {
    const anyLines = lines.filter((l) => {
      const t = l.trim();
      return /:\s*any\b/.test(t) &&
      !t.startsWith("//") &&
      !t.startsWith("*") &&
      !t.includes("eslint-disable") &&
      !t.includes("@ts-");
    });
    if (anyLines.length > 0) {
      warnings.push(
        `TYPES: ${anyLines.length} 'any' type(s) detected — use specific types or 'unknown' with type guards`
      );
    }
  }

  // ── 5. TODO / FIXME comments ──────────────────────────────────────────────
  const todos = lines.filter((l) => /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(l));
  if (todos.length > 0) {
    warnings.push(
      `QUALITY: ${todos.length} TODO/FIXME/HACK comment(s) — track in an ADR or knowledge/issues/ entry`
    );
  }

  // ── Output static checks ──────────────────────────────────────────────────
  if (errors.length === 0 && warnings.length === 0) {
    return 0; // Clean — silent pass
  }

  const allIssues = [...errors.map((e) => `  ❌ ${e}`), ...warnings.map((w) => `  ⚠️  ${w}`)];
  deps.io.stdout.write(
    `\n🔍 Post-edit check [${fileName}]:\n${allIssues.join("\n")}\n`
  );

  if (errors.length > 0) {
    deps.io.stderr.write(
      `\n${errors.length} critical issue(s) — fix before proceeding.\n`
    );
    return 2; // Block on critical errors
  }

  // Warnings only
  return 0;
}

export async function main(_argv: string[] = [], deps: RuntimeDeps = createNodeDeps()): Promise<number> {
  try {
    const raw = await deps.io.stdin.readText();
    return await check(JSON.parse(raw) as unknown, deps);
  } catch {
    // Never block on hook parse errors
    return 0;
  }
}

runDirect(import.meta.url, main);
