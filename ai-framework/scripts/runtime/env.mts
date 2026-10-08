import type { FsDeps } from "./types.mts";
import type nodePath from "node:path";

const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Minimal dotenv: KEY=VALUE, optional `export `, `#` comments, matching single or double quotes. No interpolation. */
export function parseDotenv(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!KEY.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length > 1 && value.endsWith(quote)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    values[key] = value;
  }
  return values;
}

/**
 * Reads `<root>/.env` for a trusted, caller-supplied project root only. A `.env` that is missing, or that
 * resolves outside the real root (symlink), contributes nothing. Variables already in `env` win.
 */
export const DOTENV_MAX_BYTES = 64 * 1024;

export function loadDotenv(
  fs: Pick<FsDeps, "existsSync" | "readFileSync" | "realpathSync" | "statSync">,
  path: typeof nodePath,
  root: string,
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const file = path.join(root, ".env");
  let parsed: Record<string, string>;
  try {
    if (!fs.existsSync(file)) return { ...env };
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return { ...env };
    // Only a regular file of bounded size is read: a FIFO would block, a directory throws.
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > DOTENV_MAX_BYTES) return { ...env };
    parsed = parseDotenv(fs.readFileSync(file));
  } catch {
    return { ...env }; // an unreadable .env contributes nothing
  }
  const merged: Record<string, string | undefined> = { ...parsed };
  for (const [key, value] of Object.entries(env)) if (value !== undefined) merged[key] = value;
  return merged;
}
