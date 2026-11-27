import { describe, expect, it } from "vitest";
import { addMonths } from "@/lib/format";
import type { RatePoint } from "./ecb";
import { fitForecastModel, forecastFor, forecastsAhead } from "./forecast";
import { releaseStatus } from "./release";
import { parseYieldCsv, type YieldMonth } from "./yields";

describe("parseYieldCsv", () => {
  it("averages daily values per month and keeps the last date", () => {
    const csv = `KEY,FREQ,REF_AREA,CURRENCY,PROVIDER_FM,INSTRUMENT_FM,PROVIDER_FM_ID,DATA_TYPE_FM,TIME_PERIOD,OBS_VALUE
YC.B,B,U2,EUR,4F,G_N_A,SV_C_YM,SR_10Y,2026-10-30,3.4
YC.B,B,U2,EUR,4F,G_N_A,SV_C_YM,SR_10Y,2026-11-24,3.3
YC.B,B,U2,EUR,4F,G_N_A,SV_C_YM,SR_10Y,2026-11-25,3.2
YC.B,B,U2,EUR,4F,G_N_A,SV_C_YM,SR_10Y,2026-11-26,NaN`;
    expect(parseYieldCsv(csv)).toEqual([
      { month: "2026-10", value: 3.4, lastDate: "2026-10-30" },
      { month: "2026-11", value: 3.25, lastDate: "2026-11-25" },
    ]);
  });
});

/** 24 months where the rate is exactly 1 + 0.8 × the yield two months earlier. */
function synthetic() {
  const yields: YieldMonth[] = [];
  const points: RatePoint[] = [];
  for (let i = 0; i < 28; i++) {
    const month = addMonths("2024-07", i);
    const value = 2.5 + 0.05 * i + (i % 3) * 0.1;
    yields.push({ month, value, lastDate: `${month}-28` });
  }
  for (let i = 2; i < 26; i++) {
    const month = addMonths("2024-07", i);
    const lagged = yields[i - 2].value;
    points.push({
      month,
      fixedLong: Math.round((1 + 0.8 * lagged) * 1e6) / 1e6,
    });
  }
  return { yields, points };
}

describe("forecast", () => {
  it("recovers the slope and has no error on a perfect relation", () => {
    const { yields, points } = synthetic();
    const model = fitForecastModel(points, yields);
    expect(model?.slope).toBeCloseTo(0.8, 6);
    expect(model?.error).toBeCloseTo(0, 6);
    expect(model?.fromMonth).toBe(points.at(-1)?.month);
  });

  it("moves the last published rate with the lagged yield", () => {
    const { yields, points } = synthetic();
    const model = fitForecastModel(points, yields);
    if (!model) throw new Error("no model");
    const next = addMonths(model.fromMonth, 1);
    const lagged = yields.find((y) => y.month === addMonths(next, -2));
    const f = forecastFor(model, yields, next);
    expect(f?.ratePercent).toBeCloseTo(1 + 0.8 * (lagged?.value ?? 0), 2);
    expect(f?.low).toBeLessThan(f?.ratePercent ?? 0);
    expect(f?.high).toBeGreaterThan(f?.ratePercent ?? 0);
  });

  it("gives nothing for months the NBB already published", () => {
    const { yields, points } = synthetic();
    const model = fitForecastModel(points, yields);
    if (!model) throw new Error("no model");
    expect(forecastFor(model, yields, model.fromMonth)).toBeUndefined();
  });

  it("forecasts the months after the latest published one", () => {
    const { yields, points } = synthetic();
    const ahead = forecastsAhead(points, yields, 4);
    expect(ahead.map((f) => f.month)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
  });

  it("needs enough overlapping history", () => {
    const { yields, points } = synthetic();
    expect(fitForecastModel(points.slice(-5), yields)).toBeUndefined();
    expect(fitForecastModel(points, [])).toBeUndefined();
  });
});

describe("releaseStatus", () => {
  it("expects October's figure in early December", () => {
    const s = releaseStatus("2026-09", new Date("2026-11-27T12:00:00Z"));
    expect(s).toEqual({
      ageMonths: 2,
      nextMonth: "2026-10",
      expectedIn: "2026-12",
      daysUntil: 8,
    });
  });

  it("goes negative when the release is overdue", () => {
    expect(
      releaseStatus("2026-09", new Date("2026-12-10T00:00:00Z")).daysUntil,
    ).toBe(-5);
  });
});
