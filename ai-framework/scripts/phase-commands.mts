/** Command a person types -> phase name. Only ship-pitch differs from its phase. */
export const COMMAND_PHASES: ReadonlyMap<string, string> = new Map([
  ["shape", "shape"], ["shape-lite", "shape-lite"], ["critique", "critique"], ["plan", "plan"],
  ["build", "build"], ["audit", "audit"], ["ship-pitch", "ship"], ["cooldown", "cooldown"],
  ["fix", "fix"], ["resume", "resume"], ["switch", "switch"], ["checkpoint", "checkpoint"],
]);

export function phaseOfCommand(name: string): string | undefined {
  return COMMAND_PHASES.get(name);
}

export function skillDirOfPhase(phase: string): string {
  return phase === "ship" ? "ship-pitch" : phase;
}
