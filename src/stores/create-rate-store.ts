import { create } from "zustand";
import snapshot from "@/lib/market/snapshot.json";
import { applyRatePatch, type RateMode, rateFor } from "./rate-sync";

interface WithRate {
  annualRatePercent: number;
  years: number;
}

export interface RateStore<T extends WithRate> {
  input: T;
  rateMode: RateMode;
  /** Latest live market rate (NBB/ECB, fixed > 10 years). */
  marketRate: number;
  /** Estimated market rate for today (undefined until it has loaded). */
  forecastRate?: number;
  setInput: (patch: Partial<T>) => void;
  setRateMode: (mode: Exclude<RateMode, "custom">) => void;
  /** Called once the live market data has loaded. */
  setMarketRate: (rate: number) => void;
  /** Called once today's estimate is known. */
  setForecastRate: (rate: number) => void;
  reset: () => void;
}

/** Last fixed > 10 years rate in the bundled snapshot; replaced by live data on load. */
export const SNAPSHOT_MARKET_RATE =
  [...snapshot.points].reverse().find((p) => p.fixedLong)?.fixedLong ?? 3.5;

/** A Zustand store for inputs whose rate follows the market, the banks, or the user. */
export function createRateStore<T extends WithRate>(
  defaults: Omit<T, "annualRatePercent">,
) {
  const initial = (marketRate: number) =>
    ({ ...defaults, annualRatePercent: marketRate }) as T;

  return create<RateStore<T>>((set) => ({
    input: initial(SNAPSHOT_MARKET_RATE),
    rateMode: "market",
    marketRate: SNAPSHOT_MARKET_RATE,
    forecastRate: undefined,
    setInput: (patch) =>
      set((s) => {
        const next = applyRatePatch(
          s.input,
          s.rateMode,
          s.marketRate,
          patch,
          s.forecastRate,
        );
        return { input: next.input, rateMode: next.mode };
      }),
    setRateMode: (mode) =>
      set((s) => ({
        rateMode: mode,
        input: {
          ...s.input,
          annualRatePercent: rateFor(
            mode,
            s.input.years,
            s.marketRate,
            s.forecastRate,
          ),
        },
      })),
    setMarketRate: (rate) =>
      set((s) =>
        s.rateMode === "market"
          ? {
              marketRate: rate,
              input: { ...s.input, annualRatePercent: rate },
            }
          : { marketRate: rate },
      ),
    setForecastRate: (rate) =>
      set((s) =>
        s.rateMode === "forecast"
          ? {
              forecastRate: rate,
              input: { ...s.input, annualRatePercent: rate },
            }
          : { forecastRate: rate },
      ),
    reset: () =>
      set((s) => ({
        input: initial(s.marketRate),
        rateMode: "market",
      })),
  }));
}
