import type { RatePoint, SeriesName } from "./ecb";

export type Direction = "up" | "down" | "flat";

export interface Trend {
  latest: { month: string; value: number };
  /** Change in percentage points vs. 3 and 12 months earlier (undefined if missing). */
  change3m?: number;
  change12m?: number;
  direction: Direction;
}

/** Changes smaller than this (in percentage points over 3 months) count as flat. */
const FLAT_THRESHOLD = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function trendOf(
  points: readonly RatePoint[],
  series: SeriesName,
): Trend | undefined {
  const values = points
    .filter((p) => p[series] !== undefined)
    .map((p) => ({ month: p.month, value: p[series] as number }));
  if (values.length === 0) return undefined;
  const latest = values[values.length - 1];
  const at = (monthsBack: number) => {
    const [y, m] = latest.month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 - monthsBack, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return values.find((v) => v.month === key)?.value;
  };
  const v3 = at(3);
  const v12 = at(12);
  const change3m = v3 === undefined ? undefined : round2(latest.value - v3);
  const change12m = v12 === undefined ? undefined : round2(latest.value - v12);
  const basis = change3m ?? change12m ?? 0;
  const direction: Direction =
    basis > FLAT_THRESHOLD ? "up" : basis < -FLAT_THRESHOLD ? "down" : "flat";
  return { latest, change3m, change12m, direction };
}

/** Keeps only the last `years` years of data. */
export function lastYears(
  points: readonly RatePoint[],
  years: number,
): RatePoint[] {
  if (points.length === 0) return [];
  const [y, m] = points[points.length - 1].month.split("-").map(Number);
  const from = `${y - years}-${String(m).padStart(2, "0")}`;
  return points.filter((p) => p.month > from);
}
