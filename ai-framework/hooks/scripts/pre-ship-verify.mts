#!/usr/bin/env node
import { runDirect } from "../../scripts/runtime/cli.mts";
/**
 * pre-ship-verify.mts — final verification gauntlet invoked by /ship.
 *
 * Reads the target project's package scripts and runs only checks that exist:
 * build · typecheck · lint · tests · i18n · diff-sanity.
 *
 * Invoked by the /ship skill (NOT a hooks.json hook).
 * Exit codes:
 *   0 — all required checks green
 *   1 — at least one required check failed
 *   2 — script error (uncaught exception)
 */

import type { RuntimeDeps } from "../../scripts/runtime/types.mts";
import { createNodeDeps } from "../../scripts/runtime/node.mts";

export interface Check { name: string; cmd?: string; required: boolean }
export interface CheckResult { name: string; ok: boolean; code?: number; required?: boolean }
type Plain = Record<string, unknown>;
type Outcome = { exit: number } | { value: unknown };

// execSync's default output cap; keeps "too much git output" a failed command as before.
const EXEC_MAX_BUFFER = 1024 * 1024;

function asRecord(value: unknown): Plain {
  return typeof value === "object" && value !== null ? (value as Plain) : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readPackage(deps: RuntimeDeps): Outcome {
  const packagePath = deps.path.join(deps.proc.cwd(), "package.json");
  if (!deps.fs.existsSync(packagePath)) return { value: null };
  try {
    return { value: JSON.parse(deps.fs.readFileSync(packagePath)) as unknown };
  } catch (error) {
    deps.io.stderr.write(`[pre-ship-verify] invalid package.json: ${errorMessage(error)}\n`);
    return { exit: 2 };
  }
}

export function packageManager(pkg: unknown, deps: RuntimeDeps): string {
  const declared = asRecord(pkg).packageManager;
  if (declared) {
    if (typeof declared !== "string") throw new TypeError("pkg.packageManager.split is not a function");
    return declared.split("@")[0];
  }
  const cwd = deps.proc.cwd();
  if (deps.fs.existsSync(deps.path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (deps.fs.existsSync(deps.path.join(cwd, "yarn.lock"))) return "yarn";
  if (
    deps.fs.existsSync(deps.path.join(cwd, "bun.lock")) ||
    deps.fs.existsSync(deps.path.join(cwd, "bun.lockb"))
  ) {
    return "bun";
  }
  return "npm";
}

export function buildChecks(pkg: unknown, deps: RuntimeDeps): Check[] {
  if (!pkg) return [];
  const checks: Check[] = [];
  const scripts = asRecord(asRecord(pkg).scripts);
  const manager = packageManager(pkg, deps);
  const addAll = (names: string[], required: boolean): void => {
    for (const name of names) {
      if (scripts[name]) checks.push({ name, cmd: `${manager} run ${name}`, required });
    }
  };

  addAll(["build", "build:web"], true);
  addAll(["typecheck", "typecheck:web", "typecheck:mobile"], true);
  addAll(["lint"], false);
  addAll(["test:ci", "test", "test:unit"], true);
  addAll(["i18n:check"], false);

  if (checks.length === 0) {
    checks.push({ name: "workflow checks", required: true });
  }
  return checks;
}

function run(check: Check, deps: RuntimeDeps): CheckResult {
  if (!check.cmd) {
    return { name: check.name, ok: false, code: 1, required: check.required };
  }
  const result = deps.child.runSync(check.cmd, [], { shell: true, stdio: "inherit", env: { ...deps.proc.env, CI: "1" } });
  if (result.status === 0 && result.signal === null) return { name: check.name, ok: true };
  return { name: check.name, ok: false, code: result.status ?? 1, required: check.required };
}

function commandOutput(command: string, deps: RuntimeDeps): string {
  try {
    const result = deps.child.runSync(command, [], { shell: true, stdio: "pipe", maxBufferBytes: EXEC_MAX_BUFFER });
    if (result.status !== 0 || result.signal !== null || result.errorCode !== undefined) return "";
    return result.stdout;
  } catch {
    return "";
  }
}

function changedFiles(deps: RuntimeDeps): string[] {
  const files = new Set<string>();
  for (const command of [
    "git diff --name-only",
    "git diff --cached --name-only",
    "git ls-files --others --exclude-standard",
  ]) {
    for (const file of commandOutput(command, deps).split("\n").filter(Boolean)) files.add(file);
  }
  return [...files];
}

function diffSanity(deps: RuntimeDeps): CheckResult {
  try {
    const files = changedFiles(deps);
    const flagged = files.filter((file) => /(^|\/)\.env(?:\.|$)|(^|\/)debug\./i.test(file));
    const hasHead = commandOutput("git rev-parse --verify HEAD", deps).trim().length > 0;
    const added = hasHead ? commandOutput("git diff HEAD --unified=0", deps) : "";
    const addedDebug = /^\+[^+].*\bconsole\.log\s*\(/m.test(added);
    const addedSecret = /^\+[^+].*(?:sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=])/im.test(added);
    const untrackedDebug = files
      .filter((file) => /\.(?:[cm]?[jt]sx?|vue|svelte)$/i.test(file))
      .some((file) => {
        try {
          return /\bconsole\.log\s*\(/.test(deps.fs.readFileSync(file));
        } catch {
          return false;
        }
      });
    if (flagged.length > 0 || addedDebug || addedSecret || untrackedDebug) {
      const reasons = [
        flagged.length > 0 ? `sensitive/debug files: ${flagged.join(", ")}` : "",
        addedDebug || untrackedDebug ? "console.log in changed code" : "",
        addedSecret ? "possible secret in changed code" : "",
      ].filter(Boolean);
      deps.io.stderr.write(`[pre-ship-verify] diff-sanity flagged: ${reasons.join("; ")}\n`);
      return { name: "diff-sanity", ok: false, code: 1, required: true };
    }
    return { name: "diff-sanity", ok: true };
  } catch (error) {
    const status = asRecord(error).status;
    return { name: "diff-sanity", ok: false, code: typeof status === "number" ? status : 1, required: false };
  }
}

export function main(_argv: string[] = [], deps: RuntimeDeps = createNodeDeps()): number {
  const read = readPackage(deps);
  if ("exit" in read) return read.exit;
  const pkg = read.value;
  const checks = buildChecks(pkg, deps);
  if (!pkg) {
    deps.io.stderr.write("[pre-ship-verify] no package.json; skipping stack checks\n");
  }
  const results: CheckResult[] = [];

  for (const c of checks) {
    deps.io.stdout.write(`[pre-ship-verify] running ${c.name}...\n`);
    const r = run(c, deps);
    results.push(r);
    if (!r.ok && r.required) {
      deps.io.stderr.write(`[pre-ship-verify] FAIL: ${r.name} (required, exit ${r.code})\n`);
      return 1;
    }
    if (!r.ok) {
      deps.io.stderr.write(
        `[pre-ship-verify] WARN: ${r.name} skipped/failed (exit ${r.code}); not required\n`
      );
    }
  }

  results.push(diffSanity(deps));
  const failedRequired = results.filter((r) => !r.ok && r.required);
  if (failedRequired.length > 0) {
    deps.io.stderr.write("[pre-ship-verify] FAILED — see logs above\n");
    return 1;
  }
  deps.io.stderr.write("[pre-ship-verify] all required checks green\n");
  return 0;
}

runDirect(import.meta.url, main);
