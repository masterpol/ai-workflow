import assert from "node:assert/strict";
import test from "node:test";

import { createNodeDeps } from '../../scripts/runtime/node.mts';
import {
  buildChecks,
  isSensitivePath,
  main,
  packageCommand,
  runCheck,
} from './pre-ship-verify.mts';

import type { RunResult, RuntimeDeps, SpawnOptions } from '../../scripts/runtime/types.mts';
import { createTestDeps } from "../../scripts/runtime/test-helpers.mts";
const testDeps = createTestDeps();
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = testDeps.fs;
const tmpdir = (): string => testDeps.os.tmpdir();
const { join, posix, win32 } = testDeps.path;

interface Call {
  adapter: "sync" | "async";
  cwd?: string;
  maxBufferBytes?: number;
  command: string;
  args: string[];
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  shell?: boolean;
  stdio?: "pipe" | "inherit" | "ignore";
}

/** Injected host: a virtual file set and scripted child results, so no real build or git command runs. */
function fakeHost(options: {
  files?: Record<string, string>;
  platform?: string;
  results?: (call: Call) => Partial<RunResult> | undefined;
}): { deps: RuntimeDeps; calls: Call[]; out: string[]; err: string[] } {
  const base = createNodeDeps();
  const files = options.files ?? {};
  const calls: Call[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const childResult = (adapter: Call["adapter"], command: string, args: string[], spawn?: SpawnOptions): RunResult => {
    const call: Call = { adapter, command, args, cwd: spawn?.cwd, env: spawn?.env, timeoutMs: spawn?.timeoutMs, maxBufferBytes: spawn?.maxBufferBytes, shell: spawn?.shell, stdio: spawn?.stdio };
    calls.push(call);
    const scripted = options.results?.(call);
    return { status: 0, signal: null, stdout: "", stderr: "", ...scripted };
  };
  const deps: RuntimeDeps = {
    ...base,
    fs: {
      ...base.fs,
      existsSync: (file: string) => file in files,
      readFileSync: (file: string) => {
        if (!(file in files)) throw new Error(`ENOENT ${file}`);
        return files[file];
      },
    },
    path: options.platform === 'win32' ? win32 : posix,
    proc: {
      ...base.proc,
      cwd: () => options.platform === 'win32' ? 'C:\\repo' : '/repo',
      env: { PATH: '/bin' },
      execPath: options.platform === 'win32' ? 'C:\\node.exe' : '/node',
      platform: options.platform ?? 'linux',
    },
    io: {
      ...base.io,
      stdout: { write: (text: string) => void out.push(text), isTTY: false },
      stderr: { write: (text: string) => void err.push(text), isTTY: false },
    },
    child: {
      ...base.child,
      runSync: (command, args, spawn) => {
        assert.equal(command, "git", "only read-only Git listings may use the synchronous adapter");
        assert.deepEqual(args.slice(0, 3), ["--no-pager", "-c", "core.fsmonitor=false"]);
        return childResult("sync", command, args, spawn);
      },
      run: async (command, args, spawn) => {
        assert.notEqual(command, "git", "build and test checks use the owned asynchronous adapter");
        return childResult("async", command, args, spawn);
      },
    },
  };
  return { deps, calls, out, err };
}

const pkg = (scripts: Record<string, string>, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ scripts, ...extra });

test('package manager comes from the declaration, then lockfiles, and Windows uses the JS CLI', () => {
  const declared = fakeHost({ files: {} }).deps;
  assert.deepEqual(packageCommand({ packageManager: 'pnpm@10.34.5' }, declared), { command: 'pnpm', prefix: [] });
  const locked = fakeHost({ files: { '/repo/yarn.lock': '' } }).deps;
  assert.equal(packageCommand({}, locked).command, 'yarn');
  assert.equal(packageCommand({}, fakeHost({ files: {} }).deps).command, 'npm');
  assert.throws(() => packageCommand({ packageManager: 'rush@5' }, declared), /Unsupported package manager: rush/);
  const windows = fakeHost({ files: { 'C:\\repo\\node_modules\\pnpm\\bin\\pnpm.cjs': '' }, platform: 'win32' }).deps;
  assert.deepEqual(packageCommand({ packageManager: 'pnpm@10' }, windows), {
    command: 'C:\\node.exe',
    prefix: ['C:\\repo\\node_modules\\pnpm\\bin\\pnpm.cjs'],
  });
  assert.throws(
    () => packageCommand({ packageManager: 'pnpm@10' }, fakeHost({ files: {}, platform: 'win32' }).deps),
    /WORKFLOW_PACKAGE_MANAGER_CLI/,
  );
});

test('a packageManager outside npm, pnpm, yarn and bun is refused before anything runs', async () => {
  for (const declared of ['touch INJECTED; echo@1.0.0', 'true@1', 'node@22', 42]) {
    const host = fakeHost({ files: { '/repo/package.json': pkg({ build: 'b' }, { packageManager: declared }) } });
    assert.equal(await main([], host.deps), 1, String(declared));
    assert.equal(host.calls.length, 0);
    assert.match(host.err.join(''), /Unsupported package manager/);
  }
});

test('checks come from the recognised scripts, with verify:base first and the document checks after it', () => {
  const plain = fakeHost({ files: { '/repo/package.json': pkg({ build: 'x', lint: 'x', test: 'x', other: 'x' }) } }).deps;
  const list = buildChecks({ scripts: { build: 'x', lint: 'x', test: 'x', other: 'x' } }, plain);
  assert.deepEqual(
    list.map((check) => [check.name, check.required]),
    [['build', true], ['lint', false], ['test', true]],
  );
  assert.deepEqual(list[0].args, ['run', 'build']);

  const viewer = fakeHost({ files: { '/repo/tools/viewer/verify-all.ts': '' } }).deps;
  const base = buildChecks({ scripts: { 'verify:base': 'x' } }, viewer);
  assert.deepEqual(
    base.map((check) => check.name),
    ['verify:base', 'workflow setup', 'documentación: documentos', 'documentación: integridad', 'visor HTML sin conexión'],
  );
  assert.equal(base[0].timeout, 1_200_000);
  assert.ok(base[1].args.includes('ai-framework/scripts/setup-validator.mts'));

  assert.throws(() => buildChecks({ scripts: {} }, plain), /no recognized checks/);
  assert.throws(() => buildChecks(null, fakeHost({ files: {} }).deps), /No package.json or Muro document verifier/);
});

test('a green run executes each check with CI=1 and reports Git as unavailable when it is', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }) },
    results: (call) => (call.command === 'git' ? { status: 128, stderr: 'fatal: not a git repository' } : undefined),
  });
  assert.equal(await main([], host.deps), 0);
  assert.equal(host.calls[0].env?.CI, '1');
  assert.ok(host.out.join('').includes('required checks passed; Git diff comparison unavailable'));
});

test('a failing required check stops the run, an optional one only warns', async () => {
  const required = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x', test: 'x' }) },
    results: (call) => (call.args.includes('build') ? { status: 3 } : undefined),
  });
  assert.equal(await main([], required.deps), 1);
  assert.ok(required.err.join('').includes('build failed (exit 3)'));
  assert.equal(required.calls.filter((call) => call.args.includes('test')).length, 0);

  const optional = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x', build: 'x' }) },
    results: (call) =>
      call.command === 'git' ? { status: 128, stderr: 'not a git repository' } : call.args.includes('lint') ? { status: 1 } : undefined,
  });
  assert.equal(await main([], optional.deps), 0);
  assert.ok(optional.err.join('').includes('WARN lint failed (optional check)'));
});

test('an invalid package.json fails with the parse message', async () => {
  const host = fakeHost({ files: { '/repo/package.json': '{' } });
  assert.equal(await main([], host.deps), 1);
  assert.match(host.err.join(''), /FAILED:/);
});

test('diff-sanity blocks sensitive paths and debug logging in application source only', async () => {
  const listing = (files: string[]) => (call: Call) =>
    call.command === 'git' && call.args.includes('diff') && !call.args.includes('--cached')
      ? { stdout: files.join('\0') + '\0' }
      : undefined;
  const sensitive = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }) },
    results: listing(['apps/api/.env']),
  });
  assert.equal(await main([], sensitive.deps), 1);
  assert.ok(sensitive.err.join('').includes('sensitive/debug paths changed: apps/api/.env'));

  const debug = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }), '/repo/apps/web/a.ts': 'console.log(1)' },
    results: listing(['apps/web/a.ts']),
  });
  assert.equal(await main([], debug.deps), 1);
  assert.ok(debug.err.join('').includes('console.log in changed application code'));

  const tool = fakeHost({
    files: { '/repo/package.json': pkg({ build: 'x' }), '/repo/tools/dev/a.ts': 'console.log(1)' },
    results: listing(['tools/dev/a.ts']),
  });
  assert.equal(await main([], tool.deps), 0);
});

test('pre-ship allows the documented root environment template and ordinary source paths', () => {
  for (const file of [
    '.env.example',
    'tools/dev/database.ts',
    'apps/api/src/main.ts',
    'verification/stage-1/DB04/README.md',
  ])
    assert.equal(isSensitivePath(file), false, file);
});

test('pre-ship still rejects actual environment, credential, personal-setting and debug paths', () => {
  for (const file of [
    '.env',
    '.env.local',
    '.env.production',
    '.env.example.local',
    '.ENV.EXAMPLE',
    'apps/api/.env',
    'apps/api/.env.example',
    'apps/mobile/.env.local',
    'credentials.json',
    'nested/credentials.json',
    'settings.local.json',
    'nested/settings.local.json',
    'nested/debug.log',
  ])
    assert.equal(isSensitivePath(file), true, file);
});

test('checks run without a shell with CI=1 on top of the environment', async () => {
  const host = fakeHost({ files: { '/repo/package.json': pkg({ test: 'x' }) } });
  await main([], host.deps);
  const check = host.calls.find((c) => c.adapter === 'async');
  assert.ok(check);
  assert.equal(check.command, 'npm');
  assert.deepEqual(check.args, ['run', 'test']);
  assert.equal(check.env?.CI, '1');
  assert.equal(check.shell, undefined);
});

test('main awaits every check and forwards its timeout, output cap and CI environment', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ 'verify:base': 'x' }), '/repo/tools/viewer/verify-all.ts': '' },
    results: (call) => call.command === 'git' ? { status: 128, stderr: 'not a git repository' } : undefined,
  });
  const ordinaryRun = host.deps.child.run;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  host.deps.child.run = async (...args) => {
    const result = await ordinaryRun(...args);
    await pending;
    return result;
  };
  const execution = main([], host.deps);
  await Promise.resolve();
  assert.equal(host.calls.length, 1, 'the next check cannot start before completion');
  assert.doesNotMatch(host.out.join(''), /required checks passed/);
  release();
  assert.equal(await execution, 0);
  const checks = host.calls.filter(call => call.adapter === 'async');
  assert.equal(checks.length, 5);
  assert.equal(checks[0].timeoutMs, 1_200_000);
  for (const [index, call] of checks.entries()) {
    assert.equal(call.cwd, '/repo');
    assert.equal(call.env?.CI, '1');
    assert.equal(call.maxBufferBytes, 4 * 1024 * 1024);
    assert.equal(call.shell, undefined);
    if (index > 0) assert.equal(call.timeoutMs, 60_000);
  }
  assert.ok(host.calls.filter(call => call.command === 'git').every(call => call.adapter === 'sync'));
});

test('uncertain cleanup stops even optional checks and preserves the pending owner in diagnostics', async () => {
  const host = fakeHost({
    files: { '/repo/package.json': pkg({ lint: 'x', test: 'x' }) },
    results: () => { throw Object.assign(new Error('tree close was not confirmed'), { code: 'EPROCESSCLEANUP', ownerPid: 321 }); },
  });
  assert.equal(await main([], host.deps), 1);
  assert.equal(host.calls.length, 1, 'no later check, Git listing or retry can run');
  assert.equal(host.calls[0].adapter, 'async');
  assert.ok(host.calls[0].args.includes('lint'));
  assert.match(host.err.join(''), /EPROCESSCLEANUP: ownership pending \(PID 321\)/);
  assert.match(host.err.join(''), /termination is unconfirmed/);
  assert.doesNotMatch(host.err.join(''), /WARN lint/);
  assert.doesNotMatch(host.out.join(''), /required checks passed/);
});

test('timeout or output-cap results never pass solely because a wrapper reports exit zero', async () => {
  for (const errorCode of ['ETIMEDOUT', 'ENOBUFS']) {
    const host = fakeHost({
      files: { '/repo/package.json': pkg({ build: 'x', test: 'x' }) },
      results: () => ({ status: 0, errorCode }),
    });
    assert.equal(await main([], host.deps), 1);
    assert.equal(host.calls.length, 1);
    assert.ok(host.err.join('').includes(errorCode));
    assert.doesNotMatch(host.out.join(''), /required checks passed/);
  }
});
