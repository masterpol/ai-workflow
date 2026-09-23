#!/usr/bin/env node
/**
 * pre-ship-verify.js — final verification gauntlet invoked by /ship.
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

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

function readPackage() {
  const packagePath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packagePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    console.error(`[pre-ship-verify] invalid package.json: ${error.message}`);
    process.exit(2);
  }
}

function packageManager(pkg) {
  if (pkg.packageManager) return pkg.packageManager.split("@")[0];
  if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) return "yarn";
  if (
    fs.existsSync(path.join(process.cwd(), "bun.lock")) ||
    fs.existsSync(path.join(process.cwd(), "bun.lockb"))
  ) {
    return "bun";
  }
  return "npm";
}

function buildChecks(pkg) {
  if (!pkg) return [];
  const checks = [];
  const scripts = pkg.scripts || {};
  const manager = packageManager(pkg);
  const addAll = (names, required) => {
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

function run(check) {
  if (!check.cmd) {
    return { name: check.name, ok: false, code: 1, required: check.required };
  }
  try {
    execSync(check.cmd, { stdio: "inherit", env: { ...process.env, CI: "1" } });
    return { name: check.name, ok: true };
  } catch (err) {
    return {
      name: check.name,
      ok: false,
      code: err.status ?? 1,
      required: check.required,
    };
  }
}

function commandOutput(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set();
  for (const command of [
    "git diff --name-only",
    "git diff --cached --name-only",
    "git ls-files --others --exclude-standard",
  ]) {
    for (const file of commandOutput(command).split("\n").filter(Boolean)) files.add(file);
  }
  return [...files];
}

function diffSanity() {
  try {
    const files = changedFiles();
    const flagged = files.filter((file) => /(^|\/)\.env(?:\.|$)|(^|\/)debug\./i.test(file));
    const hasHead = commandOutput("git rev-parse --verify HEAD").trim().length > 0;
    const added = hasHead ? commandOutput("git diff HEAD --unified=0") : "";
    const addedDebug = /^\+[^+].*\bconsole\.log\s*\(/m.test(added);
    const addedSecret = /^\+[^+].*(?:sk-[A-Za-z0-9_-]{12,}|api[_-]?key\s*[:=])/im.test(added);
    const untrackedDebug = files
      .filter((file) => /\.(?:[cm]?[jt]sx?|vue|svelte)$/i.test(file))
      .some((file) => {
        try {
          return /\bconsole\.log\s*\(/.test(fs.readFileSync(file, "utf8"));
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
      console.error(`[pre-ship-verify] diff-sanity flagged: ${reasons.join("; ")}`);
      return { name: "diff-sanity", ok: false, code: 1, required: true };
    }
    return { name: "diff-sanity", ok: true };
  } catch (err) {
    return { name: "diff-sanity", ok: false, code: err.status ?? 1, required: false };
  }
}

(function main() {
  const pkg = readPackage();
  const checks = buildChecks(pkg);
  if (!pkg) {
    console.error("[pre-ship-verify] no package.json; skipping stack checks");
  }
  const results = [];

  for (const c of checks) {
    process.stdout.write(`[pre-ship-verify] running ${c.name}...\n`);
    const r = run(c);
    results.push(r);
    if (!r.ok && r.required) {
      console.error(`[pre-ship-verify] FAIL: ${r.name} (required, exit ${r.code})`);
      process.exit(1);
    }
    if (!r.ok) {
      console.error(
        `[pre-ship-verify] WARN: ${r.name} skipped/failed (exit ${r.code}); not required`
      );
    }
  }

  results.push(diffSanity());
  const failedRequired = results.filter((r) => !r.ok && r.required);
  if (failedRequired.length > 0) {
    console.error("[pre-ship-verify] FAILED — see logs above");
    process.exit(1);
  }
  console.error("[pre-ship-verify] all required checks green");
  process.exit(0);
})();
