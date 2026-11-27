/**
 * Euro area 10-year government bond yield (AAA-rated, ECB yield curve), daily.
 * Belgian mortgage rates follow this yield with a delay of a few months, so recent
 * yields tell us where the NBB rate is heading before the NBB publishes it.
 *
 * https://data.ecb.europa.eu/data/datasets/YC
 */
export const YIELD_SOURCE_URL =
  "https://data.ecb.europa.eu/data/datasets/YC/YC.B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y";

/** Daily data from `startDate` ("YYYY-MM-DD"). */
export const yieldUrl = (startDate: string) =>
  `https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y?format=csvdata&detail=dataonly&startPeriod=${startDate}`;

export interface YieldMonth {
  /** "YYYY-MM" */
  month: string;
  /** Average yield over the trading days of that month, in percent. */
  value: number;
  /** Last trading day with data ("YYYY-MM-DD"). */
  lastDate: string;
}

/** Parses the ECB "csvdata" response into monthly averages. */
export function parseYieldCsv(csv: string): YieldMonth[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const iTime = header.indexOf("TIME_PERIOD");
  const iValue = header.indexOf("OBS_VALUE");
  if (iTime < 0 || iValue < 0) throw new Error("Unexpected ECB CSV header");

  const byMonth = new Map<
    string,
    { sum: number; n: number; lastDate: string }
  >();
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const date = cols[iTime];
    const value = Number(cols[iValue]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value)) continue;
    const month = date.slice(0, 7);
    const m = byMonth.get(month) ?? { sum: 0, n: 0, lastDate: date };
    m.sum += value;
    m.n += 1;
    if (date > m.lastDate) m.lastDate = date;
    byMonth.set(month, m);
  }
  return [...byMonth.entries()]
    .map(([month, m]) => ({
      month,
      value: Math.round((m.sum / m.n) * 1000) / 1000,
      lastDate: m.lastDate,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
