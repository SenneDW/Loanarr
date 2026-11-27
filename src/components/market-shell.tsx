import { forecastsAhead } from "@/lib/market/forecast";
import { getBankTariffs } from "@/lib/market/get-bank-tariffs";
import { getMarketRates, getYieldMonths } from "@/lib/market/get-market-rates";
import { getTariffChecks } from "@/lib/market/get-tariff-checks";
import { trendOf } from "@/lib/market/trend";
import { MarketProvider } from "./market-context";

/** Loads live market rates on the server and makes them available to every page. */
export async function MarketShell({ children }: { children: React.ReactNode }) {
  const [market, yields, banks, tariffChecks] = await Promise.all([
    getMarketRates(),
    getYieldMonths(),
    getBankTariffs(),
    getTariffChecks(),
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
        banks,
        tariffChecks,
      }}
    >
      {children}
    </MarketProvider>
  );
}
