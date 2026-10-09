import assert from "node:assert/strict";
import nodePath from "node:path";
import test from "node:test";

import { buildChecks, main, packageManager } from "./pre-ship-verify.mts";
import type { RuntimeDeps, RunResult, SpawnOptions } from "../../scripts/runtime/types.mts";

interface Call { command: string; options: SpawnOptions }
interface Fake { deps: RuntimeDeps; out: string[]; err: string[]; calls: Call[] }

type Responder = (command: string, options: SpawnOptions) => Partial<RunResult>;

function fake(files: Record<string, string>, respond: Responder = () => ({ status: 0 })): Fake {
  const out: string[] = [];
  const err: string[] = [];
  const calls: Call[] = [];
  const deps = {
    runtime: "node",
    path: nodePath,
    fs: {
      existsSync: (file: string) => file in files,
      readFileSync: (file: string) => {
        if (!(file in files)) throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
        return files[file];
      },
    },
    child: {
      runSync: (command: string, _args: string[], options: SpawnOptions = {}): RunResult => {
        calls.push({ command, options });
        return { status: 0, signal: null, stdout: "", stderr: "", ...respond(command, options) };
      },
    },
    proc: { cwd: () => "/proj", env: { PATH: "/bin", KEEP: "1" } },
    io: { stdout: { write: (t: string) => out.push(t) }, stderr: { write: (t: string) => err.push(t) } },
  } as unknown as RuntimeDeps;
  return { deps, out, err, calls };
}

const pkg = (scripts: Record<string, string>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ name: "t", scripts, ...extra });
const PKG = "/proj/package.json";

test("packageManager prefers the declared manager, then lockfiles, then npm", () => {
  assert.equal(packageManager({ packageManager: "pnpm@9.1.0" }, fake({}).deps), "pnpm");
  assert.equal(packageManager({}, fake({ "/proj/pnpm-lock.yaml": "" }).deps), "pnpm");
  assert.equal(packageManager({}, fake({ "/proj/yarn.lock": "" }).deps), "yarn");
  assert.equal(packageManager({}, fake({ "/proj/bun.lock": "" }).deps), "bun");
  assert.equal(packageManager({}, fake({ "/proj/bun.lockb": "" }).deps), "bun");
  assert.equal(packageManager({}, fake({}).deps), "npm");
});

test("buildChecks lists only existing scripts with their required flag", () => {
  const checks = buildChecks({ scripts: { build: "x", lint: "x", test: "x", "i18n:check": "x", other: "x" } }, fake({}).deps);
  assert.deepEqual(checks.map((c) => [c.name, c.cmd, c.required]), [
    ["build", "npm run build", true],
    ["lint", "npm run lint", false],
    ["test", "npm run test", true],
    ["i18n:check", "npm run i18n:check", false],
  ]);
  assert.deepEqual(buildChecks(null, fake({}).deps), []);
  assert.deepEqual(buildChecks({}, fake({}).deps), [{ name: "workflow checks", required: true }]);
});

test("no package.json skips stack checks and exits 0 after diff-sanity", () => {
  const f = fake({});
  assert.equal(main([], f.deps), 0);
  assert.deepEqual(f.out, []);
  assert.equal(f.err[0], "[pre-ship-verify] no package.json; skipping stack checks\n");
  assert.equal(f.err.at(-1), "[pre-ship-verify] all required checks green\n");
});

test("invalid package.json exits 2 with the parse message", () => {
  const f = fake({ [PKG]: "{x" });
  assert.equal(main([], f.deps), 2);
  assert.match(f.err[0], /^\[pre-ship-verify\] invalid package\.json: .+\n$/);
  assert.equal(f.calls.length, 0);
});

test("package.json without scripts yields a failing 'workflow checks' (exit 1)", () => {
  const f = fake({ [PKG]: JSON.stringify({ name: "t" }) });
  assert.equal(main([], f.deps), 1);
  assert.deepEqual(f.out, ["[pre-ship-verify] running workflow checks...\n"]);
  assert.equal(f.err.at(-1), "[pre-ship-verify] FAIL: workflow checks (required, exit 1)\n");
  assert.equal(f.calls.length, 0);
});

test("a failing required check stops the run with its exit code in the message", () => {
  const f = fake({ [PKG]: pkg({ build: "b", test: "t" }) }, (command) => (command === "npm run build" ? { status: 4 } : {}));
  assert.equal(main([], f.deps), 1);
  assert.equal(f.err.at(-1), "[pre-ship-verify] FAIL: build (required, exit 4)\n");
  assert.deepEqual(f.calls.map((c) => c.command), ["npm run build"]);
});

test("a failing optional check only warns", () => {
  const f = fake({ [PKG]: pkg({ lint: "l", test: "t" }) }, (command) => (command === "npm run lint" ? { status: 3 } : {}));
  assert.equal(main([], f.deps), 0);
  assert.ok(f.err.includes("[pre-ship-verify] WARN: lint skipped/failed (exit 3); not required\n"));
  assert.equal(f.err.at(-1), "[pre-ship-verify] all required checks green\n");
});

test("checks run through the shell with inherited stdio and CI=1 on top of the environment", () => {
  const f = fake({ [PKG]: pkg({ test: "t" }) });
  main([], f.deps);
  const first = f.calls[0];
  assert.equal(first.command, "npm run test");
  assert.equal(first.options.shell, true);
  assert.equal(first.options.stdio, "inherit");
  assert.deepEqual(first.options.env, { PATH: "/bin", KEEP: "1", CI: "1" });
});

test("a signal-killed check counts as exit 1", () => {
  const f = fake({ [PKG]: pkg({ test: "t" }) }, (command) => (command === "npm run test" ? { status: null, signal: "SIGKILL" } : {}));
  assert.equal(main([], f.deps), 1);
  assert.equal(f.err.at(-1), "[pre-ship-verify] FAIL: test (required, exit 1)\n");
});

test("diff-sanity flags .env and debug files", () => {
  const f = fake({ [PKG]: pkg({ test: "t" }) }, (command) => (command === "git diff --name-only" ? { stdout: ".env.local\nsrc/debug.ts\n" } : {}));
  assert.equal(main([], f.deps), 1);
  assert.ok(f.err.includes("[pre-ship-verify] diff-sanity flagged: sensitive/debug files: .env.local, src/debug.ts\n"));
  assert.equal(f.err.at(-1), "[pre-ship-verify] FAILED — see logs above\n");
});

test("diff-sanity flags console.log and secrets added in the diff", () => {
  const f = fake({}, (command) => {
    if (command === "git rev-parse --verify HEAD") return { stdout: "abc\n" };
    if (command === "git diff HEAD --unified=0") return { stdout: "+++ b/a.js\n+  console.log(1)\n+const api_key = 'x'\n" };
    return {};
  });
  assert.equal(main([], f.deps), 1);
  assert.ok(f.err.includes("[pre-ship-verify] diff-sanity flagged: console.log in changed code; possible secret in changed code\n"));
});

test("diff-sanity flags console.log in an untracked source file", () => {
  const f = fake({ "new.ts": "console.log(1)\n" }, (command) => (command === "git ls-files --others --exclude-standard" ? { stdout: "new.ts\n" } : {}));
  assert.equal(main([], f.deps), 1);
  assert.ok(f.err.includes("[pre-ship-verify] diff-sanity flagged: console.log in changed code\n"));
});

test("failing or oversized git output is treated as empty", () => {
  const failing = fake({}, () => ({ status: 128, stdout: ".env\n" }));
  assert.equal(main([], failing.deps), 0);
  const huge = fake({}, () => ({ status: null, errorCode: "ENOBUFS", stdout: ".env\n" }));
  assert.equal(main([], huge.deps), 0);
  assert.equal(huge.calls[0].options.maxBufferBytes, 1024 * 1024);
  assert.equal(huge.calls[0].options.stdio, "pipe");
});
