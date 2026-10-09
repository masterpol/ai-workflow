import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

interface Record_ {
  schema: number;
  python: string;
  host: string;
  status: string;
  capabilities: Record<string, boolean>;
  elapsed_ms: number;
  path?: unknown;
  lock?: unknown;
  coverage: Record<string, string>;
  fixtures_removed?: boolean;
}

const expectedPath: Record<string, string> = { ancestor_swap: 'captured_inode_only', leaf_symlink: 'refused',
  directory_move: 'write_outside_root_demonstrated' };
const expectedLock: Record<string, string> = { paused_holder: 'contender_refused', helper_death: 'released',
  parent_death: 'held_until_helper_resumed_and_EOF_observed', timeout_cleanup: 'released',
  inode_replacement: 'split_locks_demonstrated', legacy_writer: 'cooperation_required' };

function validate(record: Record_): void {
  assert.equal(record.schema, 1);
  assert.match(record.python, record.status === 'unsupported' ? /^(unavailable|\d+\.\d+\.\d+)$/ : /^\d+\.\d+\.\d+$/);
  assert.equal(typeof record.host, 'string');
  assert.deepEqual(Object.keys(record.capabilities).sort(),
    ['dir_fd', 'directory', 'flock', 'nofollow', 'unix_process']);
  for (const value of Object.values(record.capabilities)) assert.equal(typeof value, 'boolean');
  assert.ok(Number.isInteger(record.elapsed_ms) && record.elapsed_ms >= 0 && record.elapsed_ms < 25000);
  if (record.status === 'unsupported') {
    assert.ok(Object.values(record.capabilities).includes(false));
    assert.equal(record.path, undefined);
    assert.equal(record.lock, undefined);
  } else {
    assert.equal(record.status, 'observed');
    assert.ok(Object.values(record.capabilities).every(Boolean));
    assert.equal(record.coverage[record.host], 'observed');
    assert.equal(record.fixtures_removed, true);
    assert.deepEqual(record.path, expectedPath);
    assert.deepEqual(record.lock, expectedLock);
  }
  for (const host of ['Darwin', 'Linux']) {
    if (host !== record.host) assert.equal(record.coverage[host], 'unverified');
  }
}

function experiment(source: string | null = null, deadline = 25000, runtime = 'python3'): Promise<Record_> {
  return new Promise((resolve, reject) => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'native-safety-owner-'));
    const script = source === null ? path.join(here, 'bench.py') : path.join(scratch, 'mutant.py');
    if (source !== null) fs.writeFileSync(script, source);
    const child = spawn(runtime, [script], { detached: process.platform !== 'win32',
      env: { ...process.env, NATIVE_SAFETY_TMP: scratch }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    function kill() {
      if (!child.pid) return;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') reject(error); }
    }
    const timer = setTimeout(kill, deadline);
    child.stdout.on('data', (data: Buffer) => { output += data; if (output.length > 8192) kill(); });
    child.stderr.on('data', (data: Buffer) => { errors += data; if (errors.length > 8192) kill(); });
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      fs.rmSync(scratch, { recursive: true, force: true });
      if (error.code !== 'ENOENT') return reject(error);
      resolve({ schema: 1, host: os.type(), python: 'unavailable', status: 'unsupported',
        capabilities: { dir_fd: false, directory: false, flock: false, nofollow: false, unix_process: false },
        coverage: { Darwin: 'unverified', Linux: 'unverified' }, elapsed_ms: 0 });
    });
    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      kill(); // Descendants must not survive even a failed experiment.
      fs.rmSync(scratch, { recursive: true, force: true });
      assert.equal(fs.existsSync(scratch), false);
      if (code !== 0) return reject(new Error(`experiment failed: ${code}; stderr bytes=${errors.length}`));
      try { resolve(JSON.parse(output)); } catch (error) { reject(error); }
    });
  });
}

test('measures descriptor and lock behavior with bounded real processes', { timeout: 30000 }, async () => {
  validate(await experiment());
});
test('detects removed symlink and locking guards and cleans up deadline failure', { timeout: 30000 }, async (t) => {
  const baseline = await experiment();
  validate(baseline);
  if (baseline.status === 'unsupported') return t.skip('native capabilities unavailable');
  const source = fs.readFileSync(path.join(here, 'bench.py'), 'utf8');
  for (const [before, after] of [
    ['os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd', 'os.O_RDONLY, dir_fd=fd'],
    ['fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)', 'pass'],
  ]) {
    assert.ok(source.includes(before));
    await assert.rejects(experiment(source.replace(before, after)));
  }
  await assert.rejects(experiment('import time\ntime.sleep(60)\n', 100));
});
test('reports missing APIs and runtime as unsupported without installing or falling back', { timeout: 30000 }, async () => {
  validate(await experiment(null, 25000, path.join(here, 'absent-python')));
  const source = fs.readFileSync(path.join(here, 'bench.py'), 'utf8');
  const record = await experiment(source.replace('DEADLINE = 5', 'fcntl = None\nDEADLINE = 5'));
  assert.equal(record.status, 'unsupported');
  validate(record);
});
test('validates recorded evidence and refuses missing or misleading outcomes', () => {
  const evidence = JSON.parse(fs.readFileSync(path.join(here, 'evidence.json'), 'utf8'));
  validate(evidence);
  for (const section of ['path', 'lock']) {
    if (!evidence[section]) continue;
    for (const key of Object.keys(evidence[section])) {
      const changed = structuredClone(evidence);
      changed[section][key] = 'safe';
      assert.throws(() => validate(changed));
    }
  }
  const report = fs.readFileSync(path.join(here, 'report.md'), 'utf8');
  for (const term of ['path-safety-hardening', 'collector-robustness', 'Observed', 'Hypotheses',
    'runtime', 'platform', 'appetite', 'unverified', 'cooperation', 'containment']) {
    assert.ok(report.includes(term), `report missing ${term}`);
  }
});
