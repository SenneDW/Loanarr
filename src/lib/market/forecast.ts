import { addMonths } from "@/lib/format";
import type { RatePoint } from "./ecb";
import type { YieldMonth } from "./yields";

/** Mortgage rates follow the 10-year yield with this many months of delay. */
export const LAG_MONTHS = 2;
/** Months of history used to measure how strongly they follow it. */
const WINDOW = 24;

export interface RateForecast {
  /** The month this estimate is for ("YYYY-MM"). */
  month: string;
  ratePercent: number;
  /** Likely range (about ±1.5 × the model's typical error). */
  low: number;
  high: number;
  /** Last month the NBB actually published, the starting point of the estimate. */
  fromMonth: string;
}

export interface ForecastModel {
  /** Percentage points the mortgage rate moves per point of 10-year yield. */
  slope: number;
  /** Typical error of the model over the window, in percentage points. */
  error: number;
  fromMonth: string;
  fromRate: number;
  fromYield: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fits fixedLong(t) ≈ a + slope × yield(t − LAG) over the last WINDOW months.
 * Undefined when there is too little overlapping data.
 */
export function fitForecastModel(
  points: readonly RatePoint[],
  yields: readonly YieldMonth[],
): ForecastModel | undefined {
  const yieldOf = new Map(yields.map((y) => [y.month, y.value]));
  const fixed = points.filter((p) => p.fixedLong !== undefined);
  const latest = fixed.at(-1);
  if (!latest) return undefined;
  const fromYield = yieldOf.get(addMonths(latest.month, -LAG_MONTHS));
  if (fromYield === undefined) return undefined;

  const pairs: [number, number][] = [];
  for (const p of fixed.slice(-WINDOW)) {
    const x = yieldOf.get(addMonths(p.month, -LAG_MONTHS));
    if (x !== undefined) pairs.push([x, p.fixedLong as number]);
  }
  if (pairs.length < 12) return undefined;

  const n = pairs.length;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const sxx = pairs.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  if (sxx === 0) return undefined;
  const slope = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / sxx;
  const a = my - slope * mx;
  const error = Math.sqrt(
    pairs.reduce((s, [x, y]) => s + (y - (a + slope * x)) ** 2, 0) / n,
  );
  return {
    slope,
    error,
    fromMonth: latest.month,
    fromRate: latest.fixedLong as number,
    fromYield,
  };
}

/**
 * Estimates the NBB rate (fixed > 10 years) for a month the NBB has not published yet:
 * the last published rate, moved by how much the 10-year yield moved since.
 * Months further ahead than the yield data reaches use the latest yield month.
 */
export function forecastFor(
  model: ForecastModel,
  yields: readonly YieldMonth[],
  month: string,
): RateForecast | undefined {
  if (month <= model.fromMonth) return undefined;
  const source = addMonths(month, -LAG_MONTHS);
  const usable = yields.filter((y) => y.month <= source);
  const y = usable.at(-1);
  if (!y) return undefined;
  const rate = model.fromRate + model.slope * (y.value - model.fromYield);
  const margin = Math.max(0.1, 1.5 * model.error);
  return {
    month,
    ratePercent: round2(rate),
    low: round2(rate - margin),
    high: round2(rate + margin),
    fromMonth: model.fromMonth,
  };
}

/** Estimates for the next `count` months after the last published NBB month. */
export function forecastsAhead(
  points: readonly RatePoint[],
  yields: readonly YieldMonth[],
  count = 6,
): RateForecast[] {
  const model = fitForecastModel(points, yields);
  if (!model) return [];
  const out: RateForecast[] = [];
  for (let i = 1; i <= count; i++) {
    const f = forecastFor(model, yields, addMonths(model.fromMonth, i));
    if (f) out.push(f);
  }
  return out;
}
