/**
 * Belgian mortgage interest rates from the ECB Data Portal (MFI interest rate
 * statistics, collected by the National Bank of Belgium). Monthly, new business,
 * loans to households for house purchase, rates actually agreed (after negotiation).
 *
 * https://data.ecb.europa.eu/data/datasets/MIR
 */

export const ECB_SERIES = {
  /** Initial rate fixation over 10 years. */
  fixedLong: "P",
  /** All new housing loans. */
  all: "A",
  /** Floating rate or fixed up to 1 year. */
  variable: "F",
} as const;

export type SeriesName = keyof typeof ECB_SERIES;

export const ECB_URL = `https://data-api.ecb.europa.eu/service/data/MIR/M.BE.B.A2C.${Object.values(
  ECB_SERIES,
).join("+")}.R.A.2250.EUR.N?format=csvdata&detail=dataonly`;

export const ECB_SOURCE_URL =
  "https://data.ecb.europa.eu/data/datasets/MIR/MIR.M.BE.B.A2C.P.R.A.2250.EUR.N";

export interface RatePoint {
  /** "YYYY-MM" */
  month: string;
  fixedLong?: number;
  all?: number;
  variable?: number;
}

/** Parses the ECB "csvdata" response into one row per month. */
export function parseEcbCsv(csv: string): RatePoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",");
  const iMaturity = header.indexOf("MATURITY_NOT_IRATE");
  const iTime = header.indexOf("TIME_PERIOD");
  const iValue = header.indexOf("OBS_VALUE");
  if (iMaturity < 0 || iTime < 0 || iValue < 0) {
    throw new Error("Unexpected ECB CSV header");
  }
  const codeToName = Object.fromEntries(
    Object.entries(ECB_SERIES).map(([name, code]) => [code, name]),
  ) as Record<string, SeriesName>;

  const byMonth = new Map<string, RatePoint>();
  for (const line of lines.slice(1)) {
    const cols = line.split(",");
    const name = codeToName[cols[iMaturity]];
    const value = Number(cols[iValue]);
    const month = cols[iTime];
    if (!name || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(value)) {
      continue;
    }
    const point = byMonth.get(month) ?? { month };
    point[name] = value;
    byMonth.set(month, point);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}
