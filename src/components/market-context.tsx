"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { RateForecast } from "@/lib/market/forecast";
import type { LiveBankTariffs } from "@/lib/market/get-bank-tariffs";
import type { TariffChecks } from "@/lib/market/get-tariff-checks";
import { monthOf } from "@/lib/market/release";
import { BANK_TARIFFS, RATES_CHECKED_ON } from "@/lib/sim/rates";
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
  /** Bank tariffs, read live from the banks' sheets (bundled ones as fallback). */
  banks: LiveBankTariffs;
  /** Daily check of the registration duties and notary fees against their sources. */
  tariffChecks: TariffChecks;
}

/** Before (or without) a check: the 2027 rate counts as announced, as in tariffs.ts. */
export const UNCHECKED_TARIFFS: TariffChecks = {
  sources: [],
  flanders2027: "announced",
  checkedAt: "",
};

/** Bundled bank tariffs, until (or when) the live ones are not available. */
export const BUNDLED_BANKS: LiveBankTariffs = {
  tariffs: [...BANK_TARIFFS],
  status: BANK_TARIFFS.map((t) => ({
    id: t.id,
    bank: t.bank,
    live: false,
    validFrom: t.validFrom,
    url: t.url,
  })),
  checkedAt: `${RATES_CHECKED_ON}T12:00:00Z`,
};

const MarketContext = createContext<MarketSummary>({
  negotiatedFixed: { ratePercent: SNAPSHOT_MARKET_RATE, month: "" },
  forecasts: [],
  fetchedAt: "",
  source: "snapshot",
  banks: BUNDLED_BANKS,
  tariffChecks: UNCHECKED_TARIFFS,
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

  const tariffs = value.banks.tariffs;
  useEffect(() => {
    useAffordabilityStore.getState().setBankTariffs(tariffs);
    useLoanStore.getState().setBankTariffs(tariffs);
  }, [tariffs]);

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);

/**
 * True once the Flemish page states plainly that 3 % applies from 2027; until
 * then the app calls that rate "aangekondigd".
 */
export const useFlanders2027Enacted = () =>
  useContext(MarketContext).tariffChecks.flanders2027 === "enacted";
