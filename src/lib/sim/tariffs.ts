/**
 * Belgian tariffs for buying a first (sole own) home.
 *
 * Every value lists its source and when it was checked. Tariffs change: re-check
 * these before relying on them, and update `TARIFFS_CHECKED_ON`.
 */
export const TARIFFS_CHECKED_ON = "2026-11-26";

export const regions = ["flanders", "wallonia", "brussels"] as const;
export type Region = (typeof regions)[number];

/** Year the notarial deed (akte) is signed; registration duties depend on it. */
export const deedYears = [2026, 2027] as const;
export type DeedYear = (typeof deedYears)[number];

/**
 * Registration duty (verkooprecht / droits d'enregistrement) for a sole own home.
 */
export interface RegistrationRule {
  /** Rate as a fraction, e.g. 0.02 for 2 %. */
  rate: number;
  /** Part of the price that is exempt (Brussels abattement). */
  exemptAmount?: number;
  /** The exemption only applies when the price is at or below this amount. */
  exemptMaxPrice?: number;
  /** True when the rate is announced but not yet enacted. */
  provisional?: boolean;
  source: string;
}

export function registrationRule(
  region: Region,
  deedYear: DeedYear,
): RegistrationRule {
  switch (region) {
    case "flanders":
      // 2 % since 1 Jan 2025. The Flemish Government announced (Septemberverklaring 2026)
      // the intention to move to 3 % from 1 Jan 2027; not yet enacted by decree on the
      // check date.
      return deedYear >= 2027
        ? {
            rate: 0.03,
            provisional: true,
            source:
              "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/verlaagd-tarief-in-het-verkooprecht-voor-de-aankoop-van-de-enige-eigen-woning",
          }
        : {
            rate: 0.02,
            source:
              "https://www.vlaanderen.be/belastingen-en-begroting/vlaamse-belastingen/registratiebelasting/verkooprecht/tarieven-in-het-verkooprecht/verlaagd-tarief-in-het-verkooprecht-voor-de-aankoop-van-de-enige-eigen-woning",
          };
    case "wallonia":
      // Reduced rate for 'habitation propre et unique' since 1 Jan 2025. A price ceiling
      // could not be confirmed on an official page; none is applied here.
      return {
        rate: 0.03,
        source:
          "https://www.wallonie.be/fr/vivre-en-wallonie/impots-taxes-et-fiscalite/fiscalite-immobiliere",
      };
    case "brussels":
      // 12.5 %, no duty on the first 200 000 EUR when the price (plus charges)
      // does not exceed 600 000 EUR.
      return {
        rate: 0.125,
        exemptAmount: 200_000,
        exemptMaxPrice: 600_000,
        source:
          "https://be.brussels/fr/impots-financement/impots-et-taxes/fiscalite-immobiliere/droits-denregistrement/abattement-sur-les-droits-de-vente",
      };
  }
}

/**
 * Notary fee scales from the Royal Decree of 16 December 1950 (consolidated version,
 * indexed on 1 January 2026), table "Onroerende akten en hun financiering".
 * Source: https://www.notaris.be/sites/default/files/files/2026-07/20260630%20-%20Tariefbesluit%20geconsolideerde%20versie%20NL.pdf
 *
 * Brackets are successive slices ("opeenvolgende reeksen"), not cumulative bounds:
 * the first 7 500 EUR at the first rate, the next 10 000 EUR at the second, and so on.
 */
export interface FeeScale {
  fixed: number;
  /** [slice size in EUR, rate in percent]; the last slice has size Infinity. */
  slices: ReadonlyArray<readonly [number, number]>;
}

const SLICE_SIZES = [
  7_500,
  10_000,
  12_500,
  15_495,
  18_595,
  186_005,
  249_905,
  Infinity,
] as const;

const scale = (fixed: number, rates: readonly number[]): FeeScale => ({
  fixed,
  slices: SLICE_SIZES.map((size, i) => [size, rates[i]] as const),
});

/** Scale J: purchase deed, general case. */
export const SCALE_J = scale(285, [2.5, 2.5, 1.75, 1.71, 1.14, 0.57, 0.2, 0.2]);
/** Scale Jbis: purchase of a sole own home by natural persons. */
export const SCALE_JBIS = scale(
  257,
  [2.5, 2.5, 2.0, 1.5, 0.5, 0.485, 0.3, 0.2],
);
/** Scale G: credit deed, general case. */
export const SCALE_G = scale(
  285,
  [0.75, 0.65, 0.5, 0.4, 0.4, 0.228, 0.046, 0.046],
);
/** Scale Gbis: credit deed financing a sole own home. Has no fixed part. */
export const SCALE_GBIS = scale(
  0,
  [1.368, 1.094, 0.73, 0.547, 0.365, 0.182, 0.036, 0.036],
);

/** Art. 2 §2: administrative costs and non-individualisable expenses per deed, excl. VAT. */
export const NOTARY_ADMIN_FEE = 855;
export const VAT_RATE = 0.21;

/**
 * Mortgage registration on the inscribed amount (principal plus accessories).
 * - registration duty on the mortgage: 1 %
 * - mortgage duty (hypotheekrecht): 0.3 %
 * Banks usually inscribe the principal plus 10 % accessories.
 * These are widely documented but were not confirmed on an official page on the check
 * date; together with the estimates below they reproduce real Belgian credit-deed
 * invoices closely.
 */
export const MORTGAGE_REGISTRATION_RATE = 0.01;
export const MORTGAGE_DUTY_RATE = 0.003;
export const MORTGAGE_ACCESSORIES = 0.1;

/**
 * Estimates for third-party costs (uitgaven): searches, certificates, retributions.
 * These vary per file. Users can adjust them in the UI.
 */
export const ESTIMATED_PURCHASE_EXPENSES = 900;
export const ESTIMATED_CREDIT_EXPENSES = 280;

/** Common bank defaults; editable in the UI. */
export const DEFAULT_FILE_COSTS = 350;
export const DEFAULT_VALUATION_COSTS = 0;

/**
 * Maximum loan-to-value. NBB macroprudential guidance lets banks lend up to 90 % to
 * first-time buyers in most cases (higher only for a limited share of their loans).
 */
export const DEFAULT_MAX_LTV = 0.9;
