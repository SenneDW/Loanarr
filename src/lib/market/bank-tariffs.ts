/**
 * Reads fixed mortgage rates from the banks' own tariff sheets (PDF text).
 * Pure functions, so they can be tested without network access; fetching lives
 * in get-bank-tariffs.ts.
 *
 * Every parser returns rates per duration bracket ("up to N years"). They are
 * strict on purpose: when a bank changes its layout, the parser returns nothing
 * and the site falls back to the rates bundled in src/lib/sim/rates.ts.
 */
import type { Duration } from "@/lib/sim/rates";
import { durations } from "@/lib/sim/rates";

export type BankId = "argenta" | "belfius" | "crelan" | "bnp" | "elantis";

export interface ParsedTariff {
  /** Base rate per duration, when the sheet has one. */
  list?: Partial<Record<Duration, number>>;
  /** Rate with the bank's own insurance products, when the sheet has one. */
  withProducts?: Partial<Record<Duration, number>>;
  /** "YYYY-MM-DD" the tariff applies from, when the sheet says so. */
  validFrom?: string;
}

const num = (s: string) => Number(s.replace(",", "."));

/** "19/11/2026" → "2026-11-19". */
const isoDate = (d: string) => {
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
};

/** Text between `start` (included) and the first `end` after it, or "" when missing. */
function section(text: string, start: RegExp, end: RegExp, max = 2_000) {
  const i = text.search(start);
  if (i < 0) return "";
  const rest = text.slice(i, i + max);
  const j = rest.slice(1).search(end);
  return j < 0 ? rest : rest.slice(0, j + 1);
}

/**
 * Bank brackets ("≤ 13 jaar", "≤ 18 jaar" …) to our durations: each duration
 * gets the smallest bracket that covers it, as banks price a 20-year loan at
 * the "≤ 20 jaar" rate. Durations above the longest bracket are left out.
 */
export function toDurations(
  brackets: ReadonlyArray<readonly [number, number]>,
): Partial<Record<Duration, number>> {
  const sorted = [...brackets].sort((a, b) => a[0] - b[0]);
  const out: Partial<Record<Duration, number>> = {};
  for (const d of durations) {
    const hit = sorted.find(([upTo]) => upTo >= d);
    if (hit) out[d] = hit[1];
  }
  return out;
}

const all = (text: string, re: RegExp) => [...text.matchAll(re)];

/** Argenta: "VASTE RENTEVOETEN < 10 jaar 4,79% 0,3907% < 13 jaar …". Base rates. */
export function parseArgenta(text: string): ParsedTariff {
  const s = section(text, /VASTE RENTEVOETEN/, /\d{2}\/\d{2}\/\d{4}|TARIEVEN/);
  const rows = all(s, /<\s*(\d+)\s*jaar\s+(\d+,\d+)\s*%/g).map(
    (m) => [Number(m[1]), num(m[2])] as const,
  );
  const date = text.match(/Geldig vanaf:\s*(\d{2}\/\d{2}\/\d{4})/)?.[1];
  return {
    list: toDurations(rows),
    validFrom: date ? isoDate(date) : undefined,
  };
}

/**
 * Belfius: "Vaste rentevoet 1-10 jaar 1 maand 120 maand 0,39253 % 4,813 %".
 * The first table is the "voordeeltarief" (with Belfius insurance).
 */
export function parseBelfius(text: string): ParsedTariff {
  const s = section(
    text,
    /WOONKREDIETEN MET EEN VASTE RENTEVOET/,
    /REPRESENTATIEF/,
  );
  const rows = all(
    s,
    /Vaste rentevoet\s+\d+-(\d+)\s+jaar\s+\d+\s+maand\s+\d+\s+maand\s+[\d,]+\s*%\s+(\d+,\d+)\s*%/g,
  ).map((m) => [Number(m[1]), num(m[2])] as const);
  const date = text.match(/Nr\.\s*\d+\s+op\s+(\d{2}\/\d{2}\/\d{4})/)?.[1];
  return {
    withProducts: toDurations(rows),
    validFrom: date ? isoDate(date) : undefined,
  };
}

/**
 * Crelan (French sheet): "Taux fixes ≤ 10 ans 5,66% 0,4599% 5,03% 0,4099%":
 * base rate, monthly, rate with conditions, monthly.
 */
export function parseCrelan(text: string): ParsedTariff {
  const s = section(
    text,
    /Taux fixes/,
    /réductions conditionnelles|2\. Les crédits/,
  );
  const rows = all(s, /≤\s*(\d+)\s*ans\s+(\d+,\d+)%\s+\d+,\d+%\s+(\d+,\d+)%/g);
  const date =
    text.match(/(\d{2}\/\d{2}\/\d{4})\s+et faisant partie/)?.[1] ??
    text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1];
  return {
    list: toDurations(rows.map((m) => [Number(m[1]), num(m[2])] as const)),
    withProducts: toDurations(
      rows.map((m) => [Number(m[1]), num(m[3])] as const),
    ),
    validFrom: date ? isoDate(date) : undefined,
  };
}

/** BNP Paribas Fortis (brokers): "Duur > 10 en < 13 jaar 0,475% 5,85%" (monthly, yearly). */
export function parseBnp(text: string): ParsedTariff {
  const s = section(text, /Formules met VASTE RENTEVOET/i, /Representatief/);
  const rows = all(s, /<\s*(\d+)\s*jaar\s+\d+,\d+%\s+(\d+,\d+)%/g).map(
    (m) => [Number(m[1]), num(m[2])] as const,
  );
  const date = text.match(/F\d+N\s*[–-]\s*(\d{2}\/\d{2}\/\d{4})/)?.[1];
  return {
    list: toDurations(rows),
    validFrom: date ? isoDate(date) : undefined,
  };
}

/** Elantis: "Rentevoetrooster vast … 10 jaar 4,71% 0,384% 15 jaar …". Base rates. */
export function parseElantis(text: string): ParsedTariff {
  const s = section(text, /Rentevoetrooster vast/, /Rentevoetrooster variabel/);
  const rows = all(s, /(\d+)\s*jaar\s+(\d+,\d+)%\s+\d+,\d+%/g).map(
    (m) => [Number(m[1]), num(m[2])] as const,
  );
  const date = text.match(
    /Geldigheidsdatum\s*:\s*vanaf\s+(\d{2}\/\d{2}\/\d{4})/,
  )?.[1];
  return {
    list: toDurations(rows),
    validFrom: date ? isoDate(date) : undefined,
  };
}

export const parsers: Record<BankId, (text: string) => ParsedTariff> = {
  argenta: parseArgenta,
  belfius: parseBelfius,
  crelan: parseCrelan,
  bnp: parseBnp,
  elantis: parseElantis,
};

/**
 * Sanity check before a parsed table replaces the bundled one: realistic rates,
 * the durations most buyers pick, and no wild jump from what we knew (a jump
 * means the parser most likely read the wrong table).
 */
export function isPlausible(
  parsed: Partial<Record<Duration, number>> | undefined,
  known: Partial<Record<Duration, number>>,
): boolean {
  if (!parsed) return false;
  const required: Duration[] = [10, 20, 25];
  if (required.some((d) => parsed[d] === undefined)) return false;
  return Object.entries(parsed).every(([d, r]) => {
    if (r === undefined || r < 1 || r > 12) return false;
    const before = known[Number(d) as Duration];
    return before === undefined || Math.abs(r - before) <= 1.5;
  });
}
