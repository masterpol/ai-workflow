import { runDirect } from "./runtime/cli.mts";
import { readData, readDataFile, writeData } from "./runtime/data-file.mts";
import { dataEquals, encodeData, parseData } from "./runtime/toon-data.mts";
import type { RuntimeDeps } from "./runtime/types.mts";

/**
 * JSON -> TOON data converter for workflow-only data files (grammar: `.project/decisions/toon-data-grammar.md`).
 * Dry-run by default. `--apply` writes the `.toon` next to the `.json` after proving the two parse to identical
 * values; `--remove-json` (implies `--apply`) then deletes the `.json`. Both files present is an error for every
 * reader, so `--apply` alone is a deliberate half step. It never replaces a `.toon` it did not write and never
 * converts a file the grammar cannot carry losslessly.
 *
 * `--report` is a measurement, not a guarantee: no model tokenizer is bundled, so it prints two named proxies
 * (`chars/4` and `lexemes`, a count of word and punctuation runs) against the file as stored and against minified JSON.
 */

const USAGE = "usage: toon-convert [--dry-run | --apply | --remove-json] [--report] [--root <project>] <file.json>...";

export interface Measure { bytes: number; chars4: number; lexemes: number }
export interface Conversion {
    file: string;
    status: "converted" | "would-convert" | "skipped" | "refused";
    reason?: string;
    stored?: Measure;
    minified?: Measure;
    toon?: Measure;
    /** Against the file as stored, which is what an agent reads today. */
    verdict?: Verdict;
    /** Against minified JSON, the fairest format-only comparison. */
    verdictMinified?: Verdict;
}

export type Verdict = "smaller" | "larger" | "mixed" | "no saving";

export function measure(text: string): Measure {
    let lexemes = 0;
    let inWord = false;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        const word = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code > 127;
        if (word) { if (!inWord) lexemes++; inWord = true; continue; }
        inWord = false;
        if (code > 32) lexemes++;
    }
    return { bytes: new TextEncoder().encode(text).length, chars4: Math.ceil(text.length / 4), lexemes };
}

/** The two proxies must agree to call a result smaller or larger; if they disagree the answer is mixed. */
export function verdictOf(toon: Measure, base: Measure): Verdict {
    const chars = Math.sign(toon.chars4 - base.chars4);
    const lexemes = Math.sign(toon.lexemes - base.lexemes);
    if (chars <= 0 && lexemes <= 0) return chars === 0 && lexemes === 0 ? "no saving" : "smaller";
    if (chars >= 0 && lexemes >= 0) return "larger";
    return "mixed";
}

export function convertOne(root: string, rel: string, options: { apply: boolean; removeJson: boolean }, deps: RuntimeDeps): Conversion {
    if (!rel.endsWith(".json")) return { file: rel, status: "refused", reason: "input must be a .json path" };
    const toonRel = `${rel.slice(0, -5)}.toon`;
    // readData judges the pair: a .toon already beside the .json refuses here, so a file this tool did not write is never touched.
    const source = readData(root, rel, deps);
    if (source.status === "absent") return { file: rel, status: "refused", reason: "file does not exist" };
    if (source.status === "refused") return { file: rel, status: "refused", reason: `${source.code}: ${source.text}` };
    if (source.format !== "json") return { file: rel, status: "refused", reason: "source is not JSON" };

    const encoded = encodeData(source.value);
    if (encoded.status === "refused") return { file: rel, status: "skipped", reason: `stays JSON (${encoded.problem.code}: ${encoded.problem.text})` };
    const back = parseData(encoded.text);
    if (back.status !== "parsed" || !dataEquals(back.value, source.value)) return { file: rel, status: "refused", reason: "round trip check failed; nothing written" };

    const stored = measure(source.text);
    const minified = measure(JSON.stringify(source.value));
    const toon = measure(encoded.text);
    const result: Conversion = { file: rel, status: "would-convert", stored, minified, toon, verdict: verdictOf(toon, stored), verdictMinified: verdictOf(toon, minified) };
    if (!options.apply) return result;

    const written = writeData(root, toonRel, source.value, deps, { allowJsonSibling: true, createOnly: true });
    if (written.status === "refused") return { ...result, status: "refused", reason: `${written.code}: ${written.text}` };
    // Prove it from the file on disk, not from memory. Both files exist now, so each is read on its own with the pinned reader.
    const reread = readDataFile(root, toonRel, deps);
    if (reread.status !== "parsed" || !dataEquals(reread.value, source.value)) {
        // Remove only the inode this tool published; a file someone else put there since is left alone.
        let ours = false;
        try { const now = deps.fs.lstatSync(written.file); ours = now.dev === written.dev && now.ino === written.ino; } catch { /* already gone */ }
        if (ours) { try { deps.fs.unlinkSync(written.file); } catch { /* already gone */ } }
        return { ...result, status: "refused", reason: ours ? "written file did not read back identical; it was removed" : "written file did not read back identical; it was replaced by another writer and left alone" };
    }
    if (options.removeJson) {
        // The JSON may have been edited since it was read. If it differs in any way, keep both files for the owner.
        const current = readDataFile(root, rel, deps);
        if (current.status !== "parsed" || current.text !== source.text || !dataEquals(current.value, source.value)) {
            return { ...result, status: "refused", reason: "json source changed during conversion; kept both files" };
        }
        try { deps.fs.unlinkSync(source.file); } catch { return { ...result, status: "refused", reason: "json could not be removed; kept both files" }; }
    }
    return { ...result, status: "converted" };
}

function formatMeasure(label: string, m: Measure | undefined): string {
    return m ? `  ${label}: ${m.bytes} bytes, chars/4=${m.chars4}, lexemes=${m.lexemes}` : "";
}

export function main(argv: string[], deps: RuntimeDeps): number {
    let root = deps.proc.cwd();
    let apply = false;
    let removeJson = false;
    let dryRun = false;
    let report = false;
    const files: string[] = [];
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--root") {
            const value = argv[++i];
            if (!value || value.startsWith("--")) { deps.io.stderr.write(`${USAGE}\n`); return 2; }
            root = value;
        } else if (arg === "--apply") apply = true;
        else if (arg === "--remove-json") { apply = true; removeJson = true; }
        else if (arg === "--dry-run") dryRun = true;
        else if (arg === "--report") report = true;
        else if (arg.startsWith("--")) { deps.io.stderr.write(`${USAGE}\n`); return 2; }
        else files.push(arg);
    }
    if ((dryRun && apply) || files.length === 0) { deps.io.stderr.write(`${USAGE}\n`); return 2; }

    const lines = [`toon-convert ${apply ? (removeJson ? "--remove-json" : "--apply") : "--dry-run"}`];
    let failed = false;
    for (const rel of files) {
        const result = convertOne(root, rel, { apply, removeJson }, deps);
        if (result.status === "refused") failed = true;
        lines.push(`${result.status} ${result.file}${result.reason ? `: ${result.reason}` : ""}${result.verdict ? ` (vs stored file: ${result.verdict}; vs minified JSON: ${result.verdictMinified})` : ""}`);
        if (report && result.toon) {
            lines.push(formatMeasure("as stored", result.stored), formatMeasure("minified JSON", result.minified), formatMeasure("toon", result.toon));
            if (result.verdict !== "smaller") lines.push(`  note: ${result.verdict} against the stored file; keep this file as JSON unless an agent-load path justifies it`);
            else if (result.verdictMinified !== "smaller") lines.push(`  note: the saving comes from dropping JSON's indentation; against minified JSON the result is ${result.verdictMinified}`);
        }
    }
    if (report) lines.push("proxies, not a tokenizer: chars/4 = ceil(characters / 4); lexemes = runs of letters, digits and underscore plus each other visible character");
    deps.io.stdout.write(`${lines.join("\n")}\n`);
    return failed ? 1 : 0;
}

runDirect(import.meta.url, main);
