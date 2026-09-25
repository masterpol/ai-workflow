const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
const SECRET = /^(?:\.env(?:\..*)?|credentials\.json|settings\.local\.json)$/i;

function safeRelative(value) {
  if (typeof value !== "string" || !value || /[\\\x00-\x1f\x7f:]/.test(value) || value.startsWith("/") || value.split("/").some((part) => !part || part === "." || part === ".." || part.toLowerCase() === ".git" || SECRET.test(part))) {
    throw new Error(`Unsafe relative path: ${JSON.stringify(value)}`);
  }
  return value;
}

function identity(input) {
  let value = input;
  if (typeof value !== "string") throw new Error("Provide owner/repository/skill or an exact skills.sh skill URL");
  if (value.startsWith("https://")) {
    const url = new URL(value);
    if (!["skills.sh", "www.skills.sh"].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash) throw new Error("Expected an exact skills.sh skill URL");
    value = url.pathname.replace(/^\//, "").replace(/\/$/, "");
  }
  const parts = value.split("/");
  if (parts.length !== 3 || parts.some((part) => !SEGMENT.test(part) || part === "." || part === "..") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[2]) || parts[2].length > 64) {
    throw new Error("Ambiguous or invalid skill: use owner/repository/skill (no bare names)");
  }
  return { id: parts.join("/"), owner: parts[0], repository: parts[1], name: parts[2], url: `https://github.com/${parts[0]}/${parts[1]}.git` };
}

function frontmatter(text, name) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) throw new Error("Invalid SKILL.md: missing YAML frontmatter");
  const fields = {};
  const lines = match[1].split("\n");
  for (let index = 0; index < lines.length; index++) {
    const field = lines[index].match(/^(name|description):\s*(.*)$/);
    if (!field) continue;
    if (fields[field[1]] !== undefined) throw new Error(`Duplicate frontmatter field: ${field[1]}`);
    let value = field[2].trim();
    if (/^[|>][-+]?$/.test(value)) {
      value = "";
      while (index + 1 < lines.length && /^(?:\s+|$)/.test(lines[index + 1])) value += `${lines[++index].trim()} `;
    } else if (value.startsWith('"') && value.endsWith('"')) {
      // Double-quoted YAML scalars use JSON-compatible backslash escapes (\", \\, \n, ...).
      try { value = JSON.parse(value); } catch { throw new Error(`Invalid double-quoted frontmatter value: ${field[1]}`); }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      // Single-quoted YAML scalars escape an embedded quote only as a doubled '' — no backslashes.
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (/^[\[\]{&*!]/.test(value)) throw new Error("name and description must be plain or quoted scalars");
    fields[field[1]] = value.trim();
  }
  if (fields.name !== name || !fields.description) throw new Error("Invalid SKILL.md: exact name and nonempty description required");
  return fields;
}

function git(directory, args, encoding = "utf8") {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", directory, ...args], {
    encoding, timeout: 60000, maxBuffer: 28 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, stdio: ["ignore", "pipe", "pipe"],
  });
}

function validateLinks(files) {
  const text = files["SKILL.md"].data.toString().replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) continue;
    const decoded = decodeURIComponent(link.split(/[?#]/)[0]);
    const normalized = path.posix.normalize(decoded).replace(/\/$/, "");
    safeRelative(normalized);
    if (!Object.hasOwn(files, normalized) && !Object.keys(files).some((file) => file.startsWith(`${normalized}/`))) throw new Error(`Missing referenced resource: ${link}`);
  }
}

// Read committed blobs only: no checkout, smudge filters, hooks or upstream setup code.
function inspectSource(input, options = {}) {
  const selected = identity(input);
  const requestedPath = options.path ? safeRelative(options.path) : null;
  if (requestedPath && path.posix.basename(requestedPath) !== "SKILL.md") throw new Error("--path must name the exact SKILL.md within the repository");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-skill-"));
  try {
    const origin = options.repo || selected.url;
    if (options.repo && !path.isAbsolute(origin)) throw new Error("Offline --repo must be an absolute local repository path");
    const checkout = path.join(temporary, "repository");
    git(temporary, ["clone", "--no-checkout", "--no-hardlinks", "--", origin, checkout]);
    const revision = git(checkout, ["rev-parse", "--verify", "--end-of-options", `${options.ref || "HEAD"}^{commit}`]).trim();
    const tree = git(checkout, ["ls-tree", "-rz", "--full-tree", revision]).split("\0").filter(Boolean).map((line) => {
      const match = line.match(/^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/);
      if (!match) throw new Error("Invalid repository tree");
      return { mode: match[1], type: match[2], object: match[3], file: match[4] };
    });
    const candidates = tree.filter((entry) => requestedPath ? entry.file === requestedPath : entry.file === "SKILL.md" || entry.file.endsWith(`/${selected.name}/SKILL.md`));
    const matches = candidates.filter((entry) => {
      if (entry.mode === "120000" || entry.type !== "blob") throw new Error("Symlink or non-file SKILL.md is forbidden");
      const content = git(checkout, ["cat-file", "blob", entry.object]);
      // A repository-root skill is considered only when its declared name matches.
      if (entry.file === "SKILL.md" && !new RegExp(`^name:\\s*["']?${selected.name}["']?\\s*$`, "m").test(content)) return false;
      frontmatter(content, selected.name);
      return true;
    });
    if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous skill: choose --path from ${matches.map((entry) => entry.file).join(", ")}` : `Skill does not exist: ${selected.id}`);
    const sourcePath = matches[0].file;
    const prefix = sourcePath.slice(0, -"SKILL.md".length);
    const selectedFiles = tree.filter((entry) => entry.file.startsWith(prefix));
    if (selectedFiles.length > 1000) throw new Error("Skill exceeds 1000 files");
    const files = Object.create(null);
    const seen = new Set();
    let bytes = 0;
    for (const entry of selectedFiles) {
      const relative = safeRelative(entry.file.slice(prefix.length));
      if (!["100644", "100755"].includes(entry.mode) || entry.type !== "blob") throw new Error(`Symlink or submodule forbidden: ${relative}`);
      if (seen.has(relative.toLowerCase())) throw new Error(`Case-colliding resource: ${relative}`);
      seen.add(relative.toLowerCase());
      const content = git(checkout, ["cat-file", "blob", entry.object], null);
      bytes += content.length;
      if (bytes > 25 * 1024 * 1024) throw new Error("Skill exceeds 25 MiB");
      files[relative] = { data: content, mode: entry.mode === "100755" ? 0o755 : 0o644 };
    }
    validateLinks(files);
    const licenseEntry = tree.find((entry) => /^(?:LICENSE|COPYING)(?:\.[a-z]+)?$/i.test(entry.file) && entry.mode === "100644");
    const license = licenseEntry ? { path: licenseEntry.file, text: git(checkout, ["cat-file", "blob", licenseEntry.object]) } : null;
    return { ...selected, url: origin, revision, sourcePath, files, license, ...frontmatter(files["SKILL.md"].data.toString(), selected.name) };
  } catch (error) {
    // Git stderr can contain credential-bearing remotes. Do not forward it.
    if (error.status !== undefined || error.code === "ETIMEDOUT") throw new Error("Source unavailable or revision invalid; no files installed");
    throw error;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

module.exports = { identity, frontmatter, safeRelative, inspectSource };
