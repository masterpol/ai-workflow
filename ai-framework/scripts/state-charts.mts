/*
 * Pure inline-SVG bar charts for the state report. Every string that came from the caller is
 * escaped at the point it reaches markup; labels are allow-listed and truncated before escape.
 * Geometry is declared with presentation attributes only, and color is carried by classes so the
 * page stylesheet controls it. No script, no external reference, no inline presentation of color
 * values from data.
 */

export const CHART_IDS = [
  "completions-by-vendor",
  "pitches-by-phase",
  "knowledge-by-type",
  "subfolders-by-folder",
] as const;
export type ChartId = (typeof CHART_IDS)[number];

const MAX_BARS = 8;
const MAX_LABEL_LENGTH = 24;
const LABEL_RE = /^[A-Za-z0-9 ._/-]{1,40}$/;
const OTHER_LABEL = "other";

interface Bar {
  label: string;
  value: number;
}

interface BarChartInput {
  id: string;
  title: string;
  rows: unknown[];
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function cleanLabel(value: unknown): string {
  if (typeof value !== "string" || !LABEL_RE.test(value)) return OTHER_LABEL;
  return value.length > MAX_LABEL_LENGTH ? value.slice(0, MAX_LABEL_LENGTH) : value;
}

function sortBars(a: Bar, b: Bar): number {
  if (b.value !== a.value) return b.value - a.value;
  return a.label.localeCompare(b.label);
}

function renderUnavailable(dropped: number): string {
  const note = dropped > 0 ? ` (${dropped} row${dropped === 1 ? "" : "s"} omitted)` : "";
  return `<span class="status status-unavailable">unavailable</span><span class="none">${esc(note)}</span>`;
}

function renderSvg(id: string, title: string, bars: Bar[]): string {
  const width = 600;
  const rowH = 26;
  const height = bars.length * rowH + 8;
  const labelW = 190;
  const plotW = 340;
  const maxValue = Math.max(...bars.map((bar) => bar.value));
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  let svg = `<svg role="img" aria-labelledby="${titleId} ${descId}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><title id="${titleId}">${esc(title)}</title><desc id="${descId}">Bar chart with ${bars.length} categories.</desc>`;

  for (let index = 0; index < bars.length; index++) {
    const bar = bars[index];
    const barW = maxValue > 0 ? Math.max(bar.value > 0 ? 2 : 0, Math.round((bar.value / maxValue) * plotW)) : 0;
    const y = 4 + index * rowH;
    svg += `<text x="${labelW - 8}" y="${y + 16}" text-anchor="end" class="chart-label">${esc(bar.label)}</text>`;
    svg += `<rect x="${labelW}" y="${y + 3}" width="${barW}" height="${rowH - 8}" rx="2" class="chart-bar chart-bar-${index + 1}"/>`;
    svg += `<text x="${labelW + barW + 6}" y="${y + 16}" text-anchor="start" class="chart-value">${esc(String(bar.value))}</text>`;
  }

  svg += "</svg>";
  return svg;
}

function renderTable(title: string, bars: Bar[]): string {
  let rows = "";
  for (const bar of bars) {
    rows += `<tr><th scope="row">${esc(bar.label)}</th><td>${esc(String(bar.value))}</td></tr>`;
  }
  return `<table><caption>${esc(title)}</caption><thead><tr><th scope="col">Category</th><th scope="col">Value</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function barChart(input: BarChartInput): string {
  if (!input || typeof input !== "object") throw new Error("barChart expects an options object");
  const { id, title, rows } = input as Record<string, unknown>;

  if (!CHART_IDS.includes(id as ChartId)) throw new Error(`Unknown chart id: ${String(id)}`);
  if (typeof title !== "string") throw new Error("title must be a string");
  if (!Array.isArray(rows)) throw new Error("rows must be an array");

  const chartId = id as ChartId;
  let dropped = 0;
  const groups = new Map<string, number>();

  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      dropped++;
      continue;
    }
    const record = row as Record<string, unknown>;
    if (!isSafeCount(record.value)) {
      dropped++;
      continue;
    }
    const label = cleanLabel(record.label);
    groups.set(label, (groups.get(label) ?? 0) + record.value);
  }

  const bars = [...groups.entries()]
    .map(([label, value]): Bar => ({ label, value }))
    .sort(sortBars);

  const totalValue = bars.reduce((sum, bar) => sum + bar.value, 0);
  if (bars.length === 0 || totalValue === 0) return renderUnavailable(dropped);

  const visible: Bar[] = [];
  if (bars.length <= MAX_BARS) {
    visible.push(...bars);
  } else {
    visible.push(...bars.slice(0, MAX_BARS));
    const rest = bars.slice(MAX_BARS);
    const overflowValue = rest.reduce((sum, bar) => sum + bar.value, 0);
    visible.push({ label: `other (${rest.length} more)`, value: overflowValue });
  }

  const note = dropped > 0 ? `<p class="none">${dropped} row${dropped === 1 ? "" : "s"} omitted</p>` : "";
  return `<div class="chart chart-${chartId}">${renderSvg(chartId, title, visible)}${renderTable(title, visible)}${note}</div>`;
}
