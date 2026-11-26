import { getMarketRates } from "@/lib/market/get-market-rates";
import { trendOf } from "@/lib/market/trend";
import { MarketProvider } from "./market-context";

/** Loads live market rates on the server and makes them available to every page. */
export async function MarketShell({ children }: { children: React.ReactNode }) {
  const market = await getMarketRates();
  const trend = trendOf(market.points, "fixedLong");
  return (
    <MarketProvider
      value={{
        negotiatedFixed: {
          ratePercent: trend?.latest.value ?? 0,
          month: trend?.latest.month ?? "",
        },
        change3m: trend?.change3m,
        fetchedAt: market.fetchedAt,
        source: market.source,
      }}
    >
      {children}
    </MarketProvider>
  );
}
