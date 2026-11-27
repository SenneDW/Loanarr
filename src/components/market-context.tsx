"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { RateForecast } from "@/lib/market/forecast";
import { monthOf } from "@/lib/market/release";
import { useAffordabilityStore } from "@/stores/affordability-store";
import { SNAPSHOT_MARKET_RATE } from "@/stores/create-rate-store";
import { useLoanStore } from "@/stores/loan-store";

export interface MarketSummary {
  /** Latest NBB/ECB rate for new loans, fixed > 10 years (after negotiation). */
  negotiatedFixed: { ratePercent: number; month: string };
  /** Change in percentage points over the last 3 months. */
  change3m?: number;
  /** Estimates for the months the NBB has not published yet. */
  forecasts: RateForecast[];
  /** Last day of 10-year yield data behind the estimates ("YYYY-MM-DD"). */
  yieldsUntil?: string;
  fetchedAt: string;
  source: "live" | "snapshot";
}

const MarketContext = createContext<MarketSummary>({
  negotiatedFixed: { ratePercent: SNAPSHOT_MARKET_RATE, month: "" },
  forecasts: [],
  fetchedAt: "",
  source: "snapshot",
});

const noSubscribe = () => () => {};

/**
 * Today's date in the browser; null while rendering on the server, so that
 * date-dependent text never mismatches between server and client.
 */
export function useToday(): Date | null {
  const day = useSyncExternalStore(
    noSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => null,
  );
  return day ? new Date(`${day}T12:00:00Z`) : null;
}

/** The estimate for today's month (or the furthest one available), if any. */
export function forecastForToday(
  forecasts: readonly RateForecast[],
  today: Date | null,
): RateForecast | undefined {
  if (!today || forecasts.length === 0) return undefined;
  const month = monthOf(today);
  return (
    forecasts.find((f) => f.month === month) ??
    (month > (forecasts.at(-1)?.month ?? "") ? forecasts.at(-1) : undefined)
  );
}

/** Provides live market data and pushes the live rates into the calculators. */
export function MarketProvider({
  value,
  children,
}: {
  value: MarketSummary;
  children: React.ReactNode;
}) {
  const rate = value.negotiatedFixed.ratePercent;
  const forecast = forecastForToday(value.forecasts, useToday())?.ratePercent;

  useEffect(() => {
    if (rate > 0) {
      useAffordabilityStore.getState().setMarketRate(rate);
      useLoanStore.getState().setMarketRate(rate);
    }
  }, [rate]);

  useEffect(() => {
    if (forecast !== undefined && forecast > 0) {
      useAffordabilityStore.getState().setForecastRate(forecast);
      useLoanStore.getState().setForecastRate(forecast);
    }
  }, [forecast]);

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);
