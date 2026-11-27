import { forecastsAhead } from "@/lib/market/forecast";
import { getMarketRates, getYieldMonths } from "@/lib/market/get-market-rates";
import { trendOf } from "@/lib/market/trend";
import { MarketProvider } from "./market-context";

/** Loads live market rates on the server and makes them available to every page. */
export async function MarketShell({ children }: { children: React.ReactNode }) {
  const [market, yields] = await Promise.all([
    getMarketRates(),
    getYieldMonths(),
  ]);
  const trend = trendOf(market.points, "fixedLong");
  return (
    <MarketProvider
      value={{
        negotiatedFixed: {
          ratePercent: trend?.latest.value ?? 0,
          month: trend?.latest.month ?? "",
        },
        change3m: trend?.change3m,
        forecasts: forecastsAhead(market.points, yields),
        yieldsUntil: yields.at(-1)?.lastDate,
        fetchedAt: market.fetchedAt,
        source: market.source,
      }}
    >
      {children}
    </MarketProvider>
  );
}
