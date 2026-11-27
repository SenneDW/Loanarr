import { typicalFixedRate } from "@/lib/sim/rates";

/**
 * Where the interest rate comes from:
 * - "market":   latest published NBB/ECB rate that buyers actually pay (fixed > 10 years). Default.
 * - "forecast": our estimate of that rate for today, before the NBB publishes it.
 * - "banks":    average published bank tariff for the chosen duration (before negotiation).
 * - "custom":   the user typed their own rate.
 */
export type RateMode = "market" | "forecast" | "banks" | "custom";

interface WithRate {
  annualRatePercent: number;
  years: number;
}

export function rateFor(
  mode: Exclude<RateMode, "custom">,
  years: number,
  marketRate: number,
  forecastRate?: number,
): number {
  if (mode === "market") return marketRate;
  if (mode === "forecast") return forecastRate ?? marketRate;
  return typicalFixedRate(Number.isFinite(years) ? years : 25).ratePercent;
}

/**
 * Applies a patch. Typing a rate switches to "custom"; changing the duration in
 * "banks" mode picks that duration's bank rate.
 */
export function applyRatePatch<T extends WithRate>(
  input: T,
  mode: RateMode,
  marketRate: number,
  patch: Partial<T>,
  forecastRate?: number,
): { input: T; mode: RateMode } {
  const next = { ...input, ...patch };
  if (patch.annualRatePercent !== undefined) {
    return { input: next, mode: "custom" };
  }
  if (mode !== "custom" && patch.years !== undefined) {
    next.annualRatePercent = rateFor(
      mode,
      next.years,
      marketRate,
      forecastRate,
    );
  }
  return { input: next, mode };
}
