"use client";

import { createContext, useContext, useEffect } from "react";
import { useAffordabilityStore } from "@/stores/affordability-store";
import { SNAPSHOT_MARKET_RATE } from "@/stores/create-rate-store";
import { useLoanStore } from "@/stores/loan-store";

export interface MarketSummary {
  /** Latest NBB/ECB rate for new loans, fixed > 10 years (after negotiation). */
  negotiatedFixed: { ratePercent: number; month: string };
  /** Change in percentage points over the last 3 months. */
  change3m?: number;
  fetchedAt: string;
  source: "live" | "snapshot";
}

const MarketContext = createContext<MarketSummary>({
  negotiatedFixed: { ratePercent: SNAPSHOT_MARKET_RATE, month: "" },
  fetchedAt: "",
  source: "snapshot",
});

/** Provides live market data and pushes the live rate into the calculators. */
export function MarketProvider({
  value,
  children,
}: {
  value: MarketSummary;
  children: React.ReactNode;
}) {
  const rate = value.negotiatedFixed.ratePercent;
  useEffect(() => {
    if (rate > 0) {
      useAffordabilityStore.getState().setMarketRate(rate);
      useLoanStore.getState().setMarketRate(rate);
    }
  }, [rate]);

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);
