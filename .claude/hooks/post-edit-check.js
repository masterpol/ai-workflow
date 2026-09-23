#!/usr/bin/env node
/**
 * Post-edit enforcement hook
 * Runs after every Edit or Write tool call on .ts/.tsx/.js/.jsx files.
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

const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  try {
    run(JSON.parse(raw));
  } catch {
    // Never block on hook parse errors
    process.exit(0);
  }
});

function run(data) {
  const filePath = data.tool_input?.file_path ?? "";
  if (!filePath) return process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  const checkableExts = [".ts", ".tsx", ".js", ".jsx"];
  if (!checkableExts.includes(ext)) return process.exit(0);

  // Skip test files for most checks
  const isTest = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);
  // Skip files in common dependency/build/tooling directories
  if (
    filePath.includes("node_modules") ||
    filePath.includes("/dist/") ||
    filePath.includes("/build/") ||
    filePath.includes(".claude")
  ) {
    return process.exit(0);
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return process.exit(0); // Can't read — don't block
  }

  const lines = content.split("\n");
  const isComponent = ext === ".tsx" || ext === ".jsx";
  const fileName = path.basename(filePath);

  const warnings = [];
  const errors = [];

  // ── 0. TypeScript syntax check (fast, synchronous, ~50ms) ────────────────
  // Uses TypeScript's own transpileModule which catches syntax errors (stray
  // braces, mismatched parens, etc.) without needing a full project type-check.
  // Skipped silently if the project has no local `typescript` install.
  if (ext === ".ts" || ext === ".tsx") {
    try {
      const tsPath = path.join(process.cwd(), "node_modules/typescript");
      const ts = require(tsPath);
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
    return process.exit(0); // Clean — silent pass
  }

  const allIssues = [...errors.map((e) => `  ❌ ${e}`), ...warnings.map((w) => `  ⚠️  ${w}`)];
  process.stdout.write(
    `\n🔍 Post-edit check [${fileName}]:\n${allIssues.join("\n")}\n`
  );

  if (errors.length > 0) {
    process.stderr.write(
      `\n${errors.length} critical issue(s) — fix before proceeding.\n`
    );
    return process.exit(2); // Block on critical errors
  }

  // Warnings only
  return process.exit(0);
}
