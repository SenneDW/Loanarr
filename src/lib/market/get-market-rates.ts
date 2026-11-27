import { cacheLife } from "next/cache";
import { ECB_URL, parseEcbCsv, type RatePoint } from "./ecb";
import snapshot from "./snapshot.json";
import { parseYieldCsv, type YieldMonth, yieldUrl } from "./yields";

export interface MarketRates {
  points: RatePoint[];
  /** ISO timestamp of when the data was fetched. */
  fetchedAt: string;
  /** "live" when fetched from the ECB just now, "snapshot" when the API was unreachable. */
  source: "live" | "snapshot";
}

/**
 * Belgian mortgage rates from the ECB, cached and refreshed every hour.
 * New monthly figures appear on the site automatically once the ECB publishes them.
 * Falls back to the bundled snapshot when the API is unreachable.
 */
export async function getMarketRates(): Promise<MarketRates> {
  "use cache";
  cacheLife("hours");

  try {
    const res = await fetch(ECB_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`ECB API responded ${res.status}`);
    const points = parseEcbCsv(await res.text());
    if (points.length === 0) throw new Error("ECB API returned no data");
    return { points, fetchedAt: new Date().toISOString(), source: "live" };
  } catch {
    return {
      points: snapshot.points,
      fetchedAt: snapshot.fetchedAt,
      source: "snapshot",
    };
  }
}

/**
 * Monthly averages of the euro area 10-year yield over the last three years, cached
 * and refreshed every hour. Used to estimate today's rate before the NBB publishes it.
 * Empty when the API is unreachable (the site then shows no estimate).
 */
export async function getYieldMonths(): Promise<YieldMonth[]> {
  "use cache";
  cacheLife("hours");
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 3, 0, 1);
  try {
    const res = await fetch(yieldUrl(start.toISOString().slice(0, 10)), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`ECB API responded ${res.status}`);
    return parseYieldCsv(await res.text());
  } catch {
    return [];
  }
}
