/**
 * Current Belgian mortgage rates (fixed for the whole duration), from banks' own
 * published tariff sheets. Update these regularly: banks change them every few weeks.
 *
 * - `list`: the bank's base rate.
 * - `withProducts`: the rate when you also take the bank's own debt-balance and fire
 *   insurance (and salary account where that gives a discount). This is what most
 *   first-time buyers end up with, so it is our default.
 *
 * Banks price per duration bracket ("≤ 20 jaar"): a 22-year loan gets the 25-year rate.
 * KBC, ING and vdk publish no tariff sheet; their rates come from personal quotes.
 */
export const RATES_CHECKED_ON = "2026-11-26";

export const durations = [10, 15, 20, 25, 30] as const;
export type Duration = (typeof durations)[number];

export interface BankTariff {
  bank: string;
  validFrom: string;
  url: string;
  list: Partial<Record<Duration, number>>;
  withProducts: Partial<Record<Duration, number>>;
  /** What the "with products" discount requires, in Dutch (user-facing). */
  productsNote: string;
  /** Surcharge above 90 % quotiteit, in percentage points (Dutch, user-facing). */
  highLtvNote?: string;
  /** True when we read the tariff sheet ourselves; false when taken from research notes. */
  verified: boolean;
}

const minus = (
  rates: Partial<Record<Duration, number>>,
  discount: number,
): Partial<Record<Duration, number>> =>
  Object.fromEntries(
    Object.entries(rates).map(([d, r]) => [
      d,
      Math.round((r - discount) * 1000) / 1000,
    ]),
  );

const ARGENTA_LIST = { 10: 4.79, 15: 4.9, 20: 4.97, 25: 5.01 };
const BNP_LIST = { 10: 5.75, 15: 5.9, 20: 5.9, 25: 6.0, 30: 6.95 };
const ELANTIS_LIST = { 10: 4.71, 15: 4.86, 20: 4.94, 25: 5.01, 30: 5.15 };
const BELFIUS = { 10: 4.843, 15: 4.916, 20: 4.966, 25: 4.991, 30: 5.101 };

export const BANK_TARIFFS: readonly BankTariff[] = [
  {
    bank: "Argenta",
    validFrom: "2026-11-19",
    url: "https://www.argenta.be/content/dam/argenta/documenten/leningen/hypothecaire-lening/Tarievenkaart%20Hypothecaire%20kredieten.pdf",
    list: ARGENTA_LIST,
    withProducts: minus(ARGENTA_LIST, 0.2),
    productsNote:
      "−0,10 % met schuldsaldoverzekering en −0,10 % met brandverzekering bij Argenta.",
    highLtvNote: "Geen toeslag tot 100 % quotiteit.",
    verified: true,
  },
  {
    bank: "Belfius",
    validFrom: "2026-11-26",
    url: "https://www.belfius.be/imagingservlet/GetDocument?src=mifid&id=TARIFLOANFIDELITY_NL",
    list: BELFIUS,
    withProducts: BELFIUS,
    productsNote:
      "Voordeeltarief: korting voor schuldsaldo- en brandverzekering bij Belfius zit er al in.",
    highLtvNote:
      "Persoonlijke toeslag tot +1,00 %, onder meer volgens quotiteit.",
    verified: false,
  },
  {
    bank: "Crelan",
    validFrom: "2026-11-23",
    url: "https://www.crelan.be/sites/default/files/documents/Tarifs_Cr%C3%A9dit-logement.pdf",
    list: { 10: 5.66, 15: 5.66, 20: 5.71, 25: 5.77, 30: 5.96 },
    withProducts: { 10: 5.03, 15: 5.03, 20: 5.08, 25: 5.14, 30: 5.33 },
    productsNote:
      "Voordeeltarief met brand- en schuldsaldoverzekering bij AXA en een Crelan-rekening.",
    highLtvNote: "Geen toeslag tot 100 % quotiteit.",
    verified: false,
  },
  {
    bank: "BNP Paribas Fortis (makelaars)",
    validFrom: "2026-11-01",
    url: "https://www.creditbrokers.bnpparibasfortis.be/Portals/0/files/NL/CB%20202611NL.pdf",
    list: BNP_LIST,
    withProducts: minus(BNP_LIST, 0.3),
    productsNote:
      "−0,10 % elk voor schuldsaldoverzekering, woningverzekering en loon op een BNP-rekening.",
    highLtvNote: "+0,60 % boven 90 % quotiteit.",
    verified: false,
  },
  {
    bank: "Elantis",
    validFrom: "2026-11-10",
    url: "https://cdn.elantis.be/uploads/2026/11/Officieel-Tarief-583.pdf",
    list: ELANTIS_LIST,
    withProducts: minus(ELANTIS_LIST, 0.3),
    productsNote:
      "−0,15 % met schuldsaldoverzekering en −0,15 % met een Belfius Pulse-rekening met domiciliëring.",
    highLtvNote: "+0,60 % tot +1,00 % boven 90 % quotiteit, volgens het EPC.",
    verified: true,
  },
];

/** The tariff bracket for a duration: the smallest published duration ≥ years. */
export function bracketFor(
  years: number,
  rates: Partial<Record<Duration, number>>,
): number | undefined {
  for (const d of durations) {
    if (years <= d && rates[d] !== undefined) return rates[d];
  }
  return undefined;
}

export interface BankRate {
  bank: string;
  list: number;
  withProducts: number;
  tariff: BankTariff;
}

/** Each bank's rate for this duration (banks without an offer are left out). */
export function bankRatesFor(years: number): BankRate[] {
  const out: BankRate[] = [];
  for (const tariff of BANK_TARIFFS) {
    const list = bracketFor(years, tariff.list);
    const withProducts = bracketFor(years, tariff.withProducts);
    if (list !== undefined && withProducts !== undefined) {
      out.push({ bank: tariff.bank, list, withProducts, tariff });
    }
  }
  return out;
}

export interface RateSummary {
  years: number;
  /** Average with the bank's own insurance: our default. */
  ratePercent: number;
  /** Average base rate without products. */
  listAverage: number;
  min: number;
  max: number;
  bankCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Typical rate for a duration: the average across banks, rounded to 0,01 %. */
export function typicalFixedRate(years: number): RateSummary {
  const rates = bankRatesFor(Math.max(years, 1));
  if (rates.length === 0) {
    // Longer than any published bracket: fall back to the longest one.
    return typicalFixedRate(durations[durations.length - 1]);
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const withProducts = rates.map((r) => r.withProducts);
  return {
    years,
    ratePercent: round2(avg(withProducts)),
    listAverage: round2(avg(rates.map((r) => r.list))),
    min: Math.min(...withProducts),
    max: Math.max(...withProducts),
    bankCount: rates.length,
  };
}
