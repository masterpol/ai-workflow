import { createNodeDeps, nodeChild } from "./node.mts";
import type { RuntimeDeps } from "./types.mts";

interface BunHasher { update(data: string | Uint8Array): BunHasher; digest(encoding: "hex"): string }
interface BunApi {
  file(file: string): { text(): Promise<string>; exists(): Promise<boolean> };
  write(file: string, data: string | Uint8Array): Promise<number>;
  CryptoHasher: new (algorithm: "sha256") => BunHasher;
}

export function bunApi(): BunApi {
  const bun = (globalThis as unknown as { Bun?: BunApi }).Bun;
  if (!bun) throw new Error("AI_WORKFLOW_RUNNER=bun requires running under Bun");
  return bun;
}

/** Bun-native files and hashing with the shared, owned node:child_process runner.
 * Bun exposes that compatibility API; sharing it preserves hidden Windows launches,
 * output bounds and observable process cleanup instead of two divergent lifecycles. */
export function createBunDeps(env: Record<string, string | undefined> = process.env): RuntimeDeps {
  const bun = bunApi();
  const base = createNodeDeps(env);
  return {
    ...base,
    runtime: "bun",
    fs: {
      ...base.fs,
      readFile: (file) => bun.file(file).text(),
      // Bun.write has no flag/mode options; fall back to the Node path whenever the caller passes any.
      writeFile: async (file, data, options) => { if (options) await base.fs.writeFile(file, data, options); else await bun.write(file, data); },
      // Bun.file().exists() is false for directories; fall back to the Node check so both adapters agree.
      exists: async (file) => (await bun.file(file).exists()) || base.fs.exists(file),
    },
    child: { ...nodeChild },
    crypto: { ...base.crypto, sha256Hex: (data) => new bun.CryptoHasher("sha256").update(data).digest("hex") },
  };
}
