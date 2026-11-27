/**
 * Daily check that the official sources still state the registration duties and
 * notary fees the app calculates with (src/lib/sim/tariffs.ts). Pure functions
 * over the sources' text; fetching lives in get-tariff-checks.ts.
 *
 * These figures change a few times a year at most, and they are legal text, so
 * the app does not read them live: it confirms them. When a source no longer
 * says what we use, the footer turns amber and names the source.
 */
import {
  NOTARY_ADMIN_FEE,
  SCALE_G,
  SCALE_GBIS,
  SCALE_J,
  SCALE_JBIS,
} from "@/lib/sim/tariffs";

export type SourceId = "flanders" | "wallonia" | "brussels" | "notary";

export interface TariffSource {
  id: SourceId;
  label: string;
  url: string;
  kind: "html" | "pdf";
}

export const TARIFF_SOURCES: readonly TariffSource[] = [
  {
    id: "flanders",
    label: "Vlaanderen",
    url: "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/verlaagd-tarief-in-het-verkooprecht-voor-de-aankoop-van-de-enige-eigen-woning",
    kind: "html",
  },
  {
    id: "wallonia",
    label: "Wallonië",
    // FAQ of the Walloon government on the 3 % rate (linked from wallonie.be).
    url: "https://logement.wallonie.be/storage/logement/documents/content/news/fiscalite-wallonne/pdf-reforme-droits-enregistrement-faq.pdf",
    kind: "pdf",
  },
  {
    id: "brussels",
    label: "Brussel",
    url: "https://be.brussels/fr/impots-financement/impots-et-taxes/fiscalite-immobiliere/droits-denregistrement/abattement-sur-les-droits-de-vente",
    kind: "html",
  },
  {
    id: "notary",
    label: "Notaristarief",
    url: "https://www.notaris.be/sites/default/files/files/2026-07/20260630%20-%20Tariefbesluit%20geconsolideerde%20versie%20NL.pdf",
    kind: "pdf",
  },
];

/** "ok": the source states what we use. "changed": it no longer does. */
export type CheckOutcome = { ok: true } | { ok: false; reason: string };

/** Flemish 3 % from 2027: still an intention, enacted, or the text changed. */
export type Flanders2027 = "announced" | "enacted" | "unclear";

// Thin, narrow and normal no-break spaces all count as a space.
const norm = (text: string) => text.replace(/[   ]/g, " ").replace(/\s+/g, " ");

const pct = String.raw`\s?%`;

export function checkFlanders(text: string): CheckOutcome {
  const t = norm(text);
  return new RegExp(
    `enige eigen woning nog maar 2${pct} registratiebelasting`,
    "i",
  ).test(t)
    ? { ok: true }
    : { ok: false, reason: "het tarief van 2 % staat er niet meer" };
}

/**
 * The Flemish page announces 3 % from 2027 as an intention ("intentie …
 * onder voorbehoud"). It counts as enacted only when that wording is gone and
 * the page says plainly that you pay 3 % from 1 January 2027.
 */
export function flanders2027(text: string): Flanders2027 {
  const t = norm(text);
  const intention = new RegExp(
    `intentie[^.]{0,250}3${pct}|3${pct}[^.]{0,250}onder voorbehoud`,
    "i",
  ).test(t);
  const enacted = new RegExp(
    `vanaf 1 januari 2027[^.]{0,150}betaalt u[^.]{0,150}3${pct}|vanaf 1 januari 2027 betaalt u[^.]{0,150}3${pct}`,
    "i",
  ).test(t);
  if (intention) return "announced";
  return enacted ? "enacted" : "unclear";
}

export function checkWallonia(text: string): CheckOutcome {
  return new RegExp(
    `taux réduit de 3${pct}[^.]{0,120}habitation propre et unique`,
    "i",
  ).test(norm(text))
    ? { ok: true }
    : { ok: false, reason: "het tarief van 3 % staat er niet meer" };
}

export function checkBrussels(text: string): CheckOutcome {
  const t = norm(text);
  const missing = [
    !/12,5\s?%/.test(t) && "12,5 %",
    !/premiers 200[ .]000\s?€/.test(t) && "de vrijstelling op € 200.000",
    !/600[ .]000\s?€/.test(t) && "de grens van € 600.000",
  ].filter(Boolean);
  return missing.length === 0
    ? { ok: true }
    : { ok: false, reason: `niet meer gevonden: ${missing.join(", ")}` };
}

/** Belgian notation as in the decree: 7500 → "7.500", 1.368 → "1,3680". */
const amount = (n: number) => n.toLocaleString("de-DE");
const rate = (n: number) => n.toFixed(4).replace(".", ",");

/**
 * The decree's table lists, per slice, the rates of several scales side by
 * side: "7.500 0,7500 1,3680 2,5000 2,5000" is the first slice of G, Gbis, J
 * and Jbis. Every slice we use must be in it, with the € 855 administration
 * fee, and the indexation must be this year's.
 */
export function checkNotary(text: string, now: Date): CheckOutcome {
  const t = norm(text);
  const rows = SCALE_G.slices
    .map(([size], i) => [size, i] as const)
    .filter(([size]) => Number.isFinite(size))
    .map(([size, i]) =>
      [
        amount(size),
        rate(SCALE_G.slices[i][1]),
        rate(SCALE_GBIS.slices[i][1]),
        rate(SCALE_J.slices[i][1]),
        rate(SCALE_JBIS.slices[i][1]),
      ].join(" "),
    );
  const missingRows = rows.filter((r) => !t.includes(r));
  if (missingRows.length > 0) {
    return {
      ok: false,
      reason: `schijven niet meer gevonden: ${missingRows.map((r) => r.split(" ")[0]).join(", ")}`,
    };
  }
  if (!new RegExp(`${NOTARY_ADMIN_FEE} EUR`).test(t)) {
    return {
      ok: false,
      reason: `de forfaitaire kost van € ${NOTARY_ADMIN_FEE} staat er niet meer`,
    };
  }
  const year = Number(t.match(/na indexering op 1 januari (\d{4})/i)?.[1]);
  if (year !== now.getUTCFullYear()) {
    return {
      ok: false,
      reason: Number.isFinite(year)
        ? `geïndexeerd op 1 januari ${year}: de indexering van ${now.getUTCFullYear()} is nog niet verwerkt`
        : "de indexeringsdatum staat er niet meer",
    };
  }
  return { ok: true };
}

export const checks: Record<
  SourceId,
  (text: string, now: Date) => CheckOutcome
> = {
  flanders: checkFlanders,
  wallonia: checkWallonia,
  brussels: checkBrussels,
  notary: checkNotary,
};
