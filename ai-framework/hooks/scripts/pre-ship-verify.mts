#!/usr/bin/env node
import { runDirect } from "../../scripts/runtime/cli.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";

/**
 * pre-ship-verify.mts — final checks for this installation, invoked by /ship (not a hooks.json hook).
 *
 * Runs direct executables (never a shell) in the project root. With `verify:base` in package.json it runs that
 * script, then the document, integrity and offline-viewer checks; otherwise it runs the recognised build,
 * typecheck, lint, test and i18n scripts. A diff-sanity step blocks sensitive paths and debug logging in
 * application source. Exit codes: 0 all required checks green, 1 a required check failed or the script failed.
 */

export interface Check {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  timeout?: number;
}
export interface CheckResult {
  name: string;
  ok: boolean;
  code?: number;
  required?: boolean;
  skipped?: boolean;
  errorCode?: string;
  signal?: string;
}
interface Runner {
  command: string;
  prefix: string[];
}
type Plain = Record<string, unknown>;

const DEFAULT_TIMEOUT_MS = 60_000;
const VERIFY_BASE_TIMEOUT_MS = 1_200_000;
const MAX_BUFFER_BYTES = 4 * 1024 * 1024;
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];
const CLI_BY_MANAGER: Record<string, string> = {
  npm: "npm/bin/npm-cli.js",
  pnpm: "pnpm/bin/pnpm.cjs",
  yarn: "yarn/bin/yarn.js",
};
const VIEWER_VERIFIER = "tools/viewer/verify-all.ts";

function asRecord(value: unknown): Plain {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Plain) : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readPackage(deps: RuntimeDeps): Plain | null {
  const file = deps.path.join(deps.proc.cwd(), "package.json");
  return deps.fs.existsSync(file) ? asRecord(JSON.parse(deps.fs.readFileSync(file)) as unknown) : null;
}

/** Only this documented root template is allowed. Actual environment and personal configuration files stay blocked. */
export function isSensitivePath(file: string): boolean {
  if (file === ".env.example") return false;
  return /(^|\/)(?:\.env(?:\.|$)|settings\.local\.json$|credentials\.json$|debug\.)/i.test(file);
}

export function packageCommand(pkg: Plain, deps: RuntimeDeps): Runner {
  const root = deps.proc.cwd();
  const has = (name: string): boolean => deps.fs.existsSync(deps.path.join(root, name));
  const raw = pkg.packageManager;
  const declared = typeof raw === "string" ? raw.split("@")[0] : "";
  // A declared but non-string or unknown packageManager is refused before it can become an executable name.
  if (raw !== undefined && (typeof raw !== "string" || !declared || !PACKAGE_MANAGERS.includes(declared))) {
    throw new Error(`Unsupported package manager: ${typeof raw === "string" ? declared : typeof raw}`);
  }
  const manager =
    declared || (has("pnpm-lock.yaml") ? "pnpm" : has("yarn.lock") ? "yarn" : has("bun.lock") || has("bun.lockb") ? "bun" : "npm");
  if (!PACKAGE_MANAGERS.includes(manager)) throw new Error(`Unsupported package manager: ${manager}`);
  if (deps.proc.platform !== "win32" || manager === "bun") return { command: manager, prefix: [] };
  // Windows .cmd wrappers require a shell. Use the installed JavaScript CLI instead.
  const relativeCli = CLI_BY_MANAGER[manager] ?? "";
  const candidates = [
    deps.proc.env.WORKFLOW_PACKAGE_MANAGER_CLI,
    deps.path.join(deps.path.dirname(deps.proc.execPath), "node_modules", relativeCli),
    deps.path.join(root, "node_modules", relativeCli),
  ].filter((file): file is string => typeof file === "string" && file.length > 0);
  const cli = candidates.find((file) => deps.path.isAbsolute(file) && /\.[cm]?js$/i.test(file) && deps.fs.existsSync(file));
  if (!cli) {
    throw new Error(
      `Cannot resolve ${manager}'s JavaScript CLI. Set WORKFLOW_PACKAGE_MANAGER_CLI to its installed absolute path; no shell or package installation is attempted.`,
    );
  }
  return { command: deps.proc.execPath, prefix: [cli] };
}

function nodeCheck(deps: RuntimeDeps, name: string, args: string[]): Check {
  return { name, command: deps.proc.execPath, args, required: true };
}

export function buildChecks(pkg: Plain | null, deps: RuntimeDeps): Check[] {
  if (!pkg) {
    if (!deps.fs.existsSync(deps.path.join(deps.proc.cwd(), VIEWER_VERIFIER))) {
      throw new Error("No package.json or Muro document verifier found. Define project checks before shipping.");
    }
    // Validate the current documents and self-contained HTML without relying on a previous user's absolute
    // temporary extraction path. Do not regenerate HTML/ZIP.
    return [
      nodeCheck(deps, "workflow setup", [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
        "ai-framework/scripts/setup-validator.mts",
        "--json",
      ]),
      ...["documentos", "integridad"].map((phase) =>
        nodeCheck(deps, `documentación: ${phase}`, ["--experimental-strip-types", VIEWER_VERIFIER, "--fase", phase]),
      ),
      nodeCheck(deps, "visor HTML sin conexión", ["--experimental-strip-types", "tools/viewer/verify-viewer.ts"]),
    ];
  }
  const scripts = asRecord(pkg.scripts);
  if (scripts["verify:base"]) {
    const runner = packageCommand(pkg, deps);
    return [
      {
        name: "verify:base",
        command: runner.command,
        args: [...runner.prefix, "run", "verify:base"],
        required: true,
        timeout: VERIFY_BASE_TIMEOUT_MS,
      },
      ...buildChecks(null, deps),
    ];
  }
  const names: Array<{ name: string; required: boolean }> = [];
  const addAll = (list: string[], required: boolean): void => {
    for (const name of list) if (scripts[name]) names.push({ name, required });
  };
  addAll(["build", "build:web"], true);
  addAll(["typecheck", "typecheck:web", "typecheck:mobile"], true);
  addAll(["lint"], false);
  addAll(["test:ci", "test", "test:unit"], true);
  addAll(["i18n:check"], false);
  if (!names.length) throw new Error("package.json has no recognized checks. Define project checks before shipping.");
  const runner = packageCommand(pkg, deps);
  return names.map(({ name, required }) => ({
    name,
    required,
    command: runner.command,
    args: [...runner.prefix, "run", name],
  }));
}

export async function runCheck(check: Check, deps: RuntimeDeps): Promise<CheckResult> {
  deps.io.stdout.write(`[pre-ship-verify] running ${check.name}...\n`);
  const result = await deps.child.run(check.command, check.args, {
    cwd: deps.proc.cwd(),
    env: { ...deps.proc.env, CI: "1" },
    timeoutMs: check.timeout ?? DEFAULT_TIMEOUT_MS,
    maxBufferBytes: MAX_BUFFER_BYTES,
  });
  if (result.stdout) deps.io.stdout.write(result.stdout);
  if (result.status === 0 && result.signal === null && result.errorCode === undefined) {
    return { name: check.name, ok: true, required: check.required };
  }
  if (result.stderr) deps.io.stderr.write(result.stderr);
  return { name: check.name, ok: false, code: result.status === 0 ? 1 : result.status ?? 1, required: check.required,
    ...(result.errorCode ? { errorCode: result.errorCode } : {}), ...(result.signal ? { signal: result.signal } : {}) };
}

// Only bounded read-only Git listings use the synchronous adapter. It is not a
// supervisor for commands that launch workers; all build/test wrappers use runCheck.
// Disable the pager and filesystem-monitor hook so these listings stay leaf operations.
function git(args: string[], deps: RuntimeDeps): { ok: boolean; stdout: string; stderr: string; missing: boolean } {
  try {
    const result = deps.child.runSync("git", ["--no-pager", "-c", "core.fsmonitor=false", ...args], {
      cwd: deps.proc.cwd(),
      timeoutMs: DEFAULT_TIMEOUT_MS,
      maxBufferBytes: MAX_BUFFER_BYTES,
    });
    return { ok: result.status === 0 && result.signal === null && result.errorCode === undefined, stdout: result.stdout, stderr: result.stderr, missing: false };
  } catch (error) {
    if (asRecord(error).code === "ENOENT") return { ok: false, stdout: "", stderr: errorMessage(error), missing: true };
    throw error;
  }
}

function diffSanity(deps: RuntimeDeps): CheckResult {
  const top = git(["rev-parse", "--show-toplevel"], deps);
  if (!top.ok) {
    // An exported source folder may omit Git metadata; report that limitation.
    if (top.missing || /not a git repository/i.test(top.stderr)) {
      deps.io.stderr.write(
        "[pre-ship-verify] SKIP diff-sanity: no Git repository or executable; no comparison with a previous revision is available.\n",
      );
      return { name: "diff-sanity", ok: true, skipped: true };
    }
    throw new Error(`git rev-parse failed: ${top.stderr.trim()}`);
  }
  const files = new Set<string>();
  for (const args of [
    ["diff", "--name-only", "-z"],
    ["diff", "--cached", "--name-only", "-z"],
    ["ls-files", "--others", "--exclude-standard", "-z"],
  ]) {
    const listing = git(args, deps);
    if (!listing.ok) throw new Error(`git ${args[0]} failed: ${listing.stderr.trim()}`);
    for (const file of listing.stdout.split("\0").filter(Boolean)) files.add(file);
  }
  const flagged = [...files].filter(isSensitivePath);
  if (flagged.length) {
    deps.io.stderr.write(`[pre-ship-verify] sensitive/debug paths changed: ${flagged.join(", ")}\n`);
    return { name: "diff-sanity", ok: false, required: true };
  }
  // Runtime logs are legitimate in maintenance scripts. Restrict this production-code heuristic to application
  // source, not the documentary tools or workflow examples.
  const root = deps.proc.cwd();
  const hasDebug = [...files]
    .filter((file) => /^(?:apps|src|packages)\//.test(file) && /\.(?:[cm]?[jt]sx?|vue|svelte)$/i.test(file))
    .some((file) => {
      const absolute = deps.path.join(root, file);
      return deps.fs.existsSync(absolute) && /\bconsole\.log\s*\(/.test(deps.fs.readFileSync(absolute));
    });
  if (hasDebug) deps.io.stderr.write("[pre-ship-verify] console.log in changed application code\n");
  return { name: "diff-sanity", ok: !hasDebug, required: true };
}

export async function main(_argv: string[] = [], deps: RuntimeDeps = createNodeDeps()): Promise<number> {
  try {
    for (const check of buildChecks(readPackage(deps), deps)) {
      const result = await runCheck(check, deps);
      if (!result.ok && result.required) throw new Error(`${result.name} failed (${result.errorCode ?? result.signal ?? `exit ${result.code}`})`);
      if (!result.ok) deps.io.stderr.write(`[pre-ship-verify] WARN ${result.name} failed (optional check)\n`);
    }
    const diff = diffSanity(deps);
    if (!diff.ok) throw new Error("diff-sanity failed");
    deps.io.stdout.write(
      `[pre-ship-verify] required checks passed${diff.skipped ? "; Git diff comparison unavailable" : ""}\n`,
    );
    return 0;
  } catch (error) {
    const detail = asRecord(error);
    if (detail.code === "EPROCESSCLEANUP") {
      const owner = typeof detail.ownerPid === "number" && Number.isSafeInteger(detail.ownerPid) && detail.ownerPid > 0 ? `PID ${detail.ownerPid}` : "PID unavailable";
      deps.io.stderr.write(`[pre-ship-verify] EPROCESSCLEANUP: ownership pending (${owner}); command termination is unconfirmed. Stop shipping and reconcile the owned process before retrying.\n`);
    }
    deps.io.stderr.write(`[pre-ship-verify] FAILED: ${errorMessage(error)}\n`);
    return 1;
  }
}

runDirect(import.meta.url, main);
