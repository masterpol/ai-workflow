/**
 * Pure member selection for role pools (no I/O, no module state, no imports).
 *
 * Every function is a deterministic function of its arguments, so a resumed run computes the same answer as the first
 * run. The ledger's recorded `vendor` for a task always wins (`recorded`): a pool change, a preflight skip or a retry
 * elsewhere must never move a scope that already has an owner.
 */

export type Pick = { ok: true; vendor: string; source: "recorded" | "round-robin" } | { ok: false; reason: PickFailure };
export type PickFailure = "invalid-input" | "pool-exhausted" | "implementer-unknown" | "review-independence-unavailable" | "exhausted";

export interface PickInput {
  /** Ordered, distinct pool members from the policy. */
  pool: readonly string[];
  /** Zero-based position of the scope in plan order; the only source of spread. */
  planIndex: number;
  /** Members whose preflight failed or that must not be used. */
  skip?: readonly string[];
  /** The vendor already recorded for this task in the ledger, if any. */
  recorded?: string;
}
export interface ReviewInput extends PickInput {
  /** The vendor that implemented the scope under review. */
  implementer?: string;
}

const validPool = (pool: unknown): pool is readonly string[] =>
  Array.isArray(pool) && pool.length > 0 && pool.every((member) => typeof member === "string" && member.length > 0) && new Set(pool).size === pool.length;
const validIndex = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

function eligible(pool: readonly string[], skip: readonly string[] | undefined): string[] {
  const skipped = new Set(skip ?? []);
  return pool.filter((member) => !skipped.has(member));
}

/** Round-robin over the pool minus skipped members, by plan position. */
export function pickImplementer(input: PickInput): Pick {
  if (!validPool(input.pool) || !validIndex(input.planIndex)) return { ok: false, reason: "invalid-input" };
  if (input.recorded !== undefined) return { ok: true, vendor: input.recorded, source: "recorded" };
  const members = eligible(input.pool, input.skip);
  if (!members.length) return { ok: false, reason: "pool-exhausted" };
  return { ok: true, vendor: members[input.planIndex % members.length], source: "round-robin" };
}

/** Like `pickImplementer`, but never the implementer of the scope under review. */
export function pickReviewer(input: ReviewInput): Pick {
  if (!validPool(input.pool) || !validIndex(input.planIndex)) return { ok: false, reason: "invalid-input" };
  if (input.recorded !== undefined) return { ok: true, vendor: input.recorded, source: "recorded" };
  if (typeof input.implementer !== "string" || input.implementer.length === 0) return { ok: false, reason: "implementer-unknown" };
  const members = eligible(input.pool, input.skip);
  if (!members.length) return { ok: false, reason: "pool-exhausted" };
  const others = members.filter((member) => member !== input.implementer);
  if (!others.length) return { ok: false, reason: "review-independence-unavailable" };
  return { ok: true, vendor: others[input.planIndex % others.length], source: "round-robin" };
}

/**
 * The member to try after a proven-clean launch failure: pool order, circular, starting after the most recently tried
 * member and skipping every tried one. `exhausted` after one lap.
 */
export function nextMember(pool: readonly string[], tried: readonly string[], skip?: readonly string[]): Pick {
  if (!validPool(pool) || !Array.isArray(tried) || tried.length === 0) return { ok: false, reason: "invalid-input" };
  const used = new Set([...tried, ...(skip ?? [])]);
  const start = pool.indexOf(tried[tried.length - 1]);
  for (let step = 1; step <= pool.length; step++) {
    const member = pool[(start + step + pool.length) % pool.length];
    if (!used.has(member)) return { ok: true, vendor: member, source: "round-robin" };
  }
  return { ok: false, reason: "exhausted" };
}
