import { cacheLife } from "next/cache";
import { ECB_URL, parseEcbCsv, type RatePoint } from "./ecb";
import snapshot from "./snapshot.json";

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
