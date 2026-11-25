import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMAND_PHASES, phaseOfCommand, skillDirOfPhase } from "./phase-commands.mts";

test("ship-pitch maps to the stored ship phase and ship is not a command", () => {
  assert.equal(phaseOfCommand("ship-pitch"), "ship");
  assert.equal(phaseOfCommand("ship"), undefined);
  assert.equal(skillDirOfPhase("ship"), "ship-pitch");
});

test("every other workflow command keeps its phase and skill directory", () => {
  const unchanged = ["shape", "shape-lite", "critique", "plan", "build", "audit", "cooldown", "fix", "resume", "switch", "checkpoint"];
  assert.equal(COMMAND_PHASES.size, unchanged.length + 1);
  for (const command of unchanged) {
    assert.equal(phaseOfCommand(command), command);
    assert.equal(skillDirOfPhase(command), command);
  }
  for (const name of ["", "deploy", "/build", "$build", "Build", "constructor"]) assert.equal(phaseOfCommand(name), undefined);
  assert.equal(skillDirOfPhase("other"), "other");
});
