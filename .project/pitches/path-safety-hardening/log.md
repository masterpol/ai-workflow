# Build evidence

## S1 — 2026-09-26

Behavior tests cover ancestor swaps before temporary-file creation and rename, untouched outside targets, symlinked compaction and ledgers directories, and existing normal ledger commits. The add-skill/pitch-compress suites pass; the shared caller regression run (skill-defaults, skill-sync, skill-vendors, pitch-archive, state-snapshot, plus bundle-sync) passes 132 tests.

In-memory module-loader mutations avoid touching implementation files: disabling the new ancestry checks makes the pre-create swap test overwrite outside data and fail; disabling resolveFile's symlink guard makes the ledger refusal test fail. Both mutant processes exit 1. These demonstrate the bounded defenses, not final race closure.

A first pre-create fixture run failed because macOS realpath expands /var to /private/var; the deterministic mock now compares the canonical context root. This was a fixture mismatch, and its corrected test passes.

Independent security review identified that reusing registry transactions exposed FIFO/oversized lock reads to ledger callers. acquire now opens locks with O_NOFOLLOW/O_NONBLOCK, checks the descriptor is a regular file of at most 4096 bytes, and performs one bounded read. A subprocess FIFO fixture has a 3-second timeout, so a blocking mutant cannot hang the suite. The combined eight-suite verification after this guard passed 189 tests; a later regular-directory replacement fixture and error-preservation adjustment pass three focused tests.

Rollback refusal now preserves both the original write failure and recovery error in an AggregateError. This keeps the observed ancestor-change reason visible without losing the recovery conflict.

Final add-skill/pitch-compress verification: 58 tests pass, zero failures. The subsequently added swapped-ancestor deletion fixture passes its focused command (`node --test --test-name-pattern='swapped ancestor before deleting' ai-framework/scripts/add-skill.test.js`), preserving outside data. No implementation bytes changed after that full run.

## Reproducible in-memory mutation method

Run from the repository root. This compiles altered source only inside isolated child processes; it never edits repository files. Each case must exit 1 with its named assertion failure. The age mutation fails with the expected bounded lock timeout.

```javascript
// Execute this block with node via stdin.
const { spawnSync } = require('node:child_process');
const cases = [
  ['ai-framework/scripts/skill-registry.js', 'ai-framework/scripts/add-skill.test.js', 'rejects ancestor replacement before creating', 'const check = () => {', 'const check = () => { return;'],
  ['ai-framework/scripts/skill-registry.js', 'ai-framework/scripts/pitch-compress.test.js', 'rejects ledger writes through', 'if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Symlink destination forbidden: ${relative}`);', 'void 0;'],
  ['ai-framework/hooks/scripts/token-consumption.js', 'ai-framework/hooks/scripts/token-consumption.test.js', 'keeps colon-separated', 'const identityKey = JSON.stringify([vendor, ...identity]);', 'const identityKey = [vendor, ...identity].join(":");'],
  ['ai-framework/hooks/scripts/token-consumption.js', 'ai-framework/hooks/scripts/token-consumption.test.js', 'an unreadable lock', 'Date.now() - observed.mtimeMs > 1000', 'false'],
  ['ai-framework/scripts/state-theme.js', 'ai-framework/scripts/state-html.test.js', 'parses quoted fonts', '!/^[A-Za-z0-9 _-]+$/.test(name)', 'false'],
];
for (const [file, test, pattern, before, after] of cases) {
  const code = `const fs=require('node:fs'),M=require('node:module'),p=require('node:path');const target=p.resolve(${JSON.stringify(file)}),load=M._extensions['.js'];M._extensions['.js']=(m,f)=>{if(f===target){const source=fs.readFileSync(f,'utf8');if(!source.includes(${JSON.stringify(before)}))throw new Error('mutation not matched');m._compile(source.replace(${JSON.stringify(before)},${JSON.stringify(after)}),f);}else load(m,f);};require(p.resolve(${JSON.stringify(test)}));`;
  const result = spawnSync(process.execPath, [`--test-name-pattern=${pattern}`, '-e', code], { encoding: 'utf8', timeout: 20000 });
  console.log(pattern, result.status, result.stdout, result.stderr);
  if (result.status !== 1) throw new Error('mutant survived or timed out');
}
```
