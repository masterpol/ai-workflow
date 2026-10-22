#!/usr/bin/env node
// Pre-flight invariant test for Bet 2 (agent-model-sweep): every `.claude/agents/*.md` must
// declare its capability profile via `profile:` frontmatter, must not carry a `model:` line,
// and the frontmatter must parse as YAML. Run as part of the test suite.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDeps } from "./runtime/test-helpers.mts";
const testDeps = createTestDeps();
const fs = testDeps.fs;
const path = testDeps.path;

const BUNDLE_ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const AGENTS_DIR = path.join(BUNDLE_ROOT, ".claude/agents");
const ALLOWED_PROFILES = new Set(["fast", "standard", "deep"]);

// Minimal YAML frontmatter parser for the `key: value` shape used by the agent files.
// Does not handle multiline, anchors, or complex types; the agent frontmatter is flat.
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { valid: false, error: "no frontmatter block" };
  const body = match[1];
  const lines = body.split(/\r?\n/);
  const entries = {};
  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) return { valid: false, error: `malformed line: ${JSON.stringify(line)}` };
    const key = kv[1];
    const value = kv[2].trim();
    if (value === "") return { valid: false, error: `empty value for key: ${key}` };
    entries[key] = value;
  }
  return { valid: true, entries };
}

test("pre-flight: every .claude/agents/*.md declares profile: and has no model: line", async () => {
  const entries = await fs.readdir(AGENTS_DIR);
  const mdFiles = entries.filter((name) => name.endsWith(".md"));
  // The bundle ships exactly 16 roles; an installed project may add its own, which must follow the same rules.
  if (fs.existsSync(path.join(BUNDLE_ROOT, "VERSION"))) assert.equal(mdFiles.length, 16, `expected 16 canonical agents, got ${mdFiles.length}`);
  else assert.ok(mdFiles.length >= 16, `expected at least the 16 bundled agents, got ${mdFiles.length}`);

  const failures = [];
  for (const name of mdFiles) {
    const filePath = path.join(AGENTS_DIR, name);
    const text = await fs.readFile(filePath);
    // Check `model:` line (frontmatter or body — the rule is "no model: line anywhere").
    const modelLine = text.match(/^model:\s*\S+$/m);
    if (modelLine) failures.push(`${name}: has a \`model:\` line (should be removed in Bet 2)`);
    // Check `profile:` frontmatter.
    const parsed = parseFrontmatter(text);
    if (!parsed.valid) { failures.push(`${name}: frontmatter invalid — ${parsed.error}`); continue; }
    const profile = parsed.entries.profile;
    if (!profile) { failures.push(`${name}: missing \`profile:\` frontmatter key`); continue; }
    if (!ALLOWED_PROFILES.has(profile)) { failures.push(`${name}: profile: "${profile}" not in {fast, standard, deep}`); }
  }
  if (failures.length) {
    assert.fail("pre-flight invariant failed:\n  " + failures.join("\n  "));
  }
});
