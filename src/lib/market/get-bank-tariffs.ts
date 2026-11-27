import { cacheLife } from "next/cache";
import {
  BANK_TARIFFS,
  type BankTariff,
  type Duration,
  minus,
} from "@/lib/sim/rates";
import { type BankId, isPlausible, parsers } from "./bank-tariffs";
import { fetchOk, pdfText } from "./fetch-text";

export interface BankStatus {
  id: BankId;
  bank: string;
  /** True when the rates were read from the bank's sheet in this check. */
  live: boolean;
  /** "YYYY-MM-DD" the bank's tariff applies from. */
  validFrom: string;
  url: string;
}

export interface LiveBankTariffs {
  tariffs: BankTariff[];
  status: BankStatus[];
  /** ISO timestamp of this check. */
  checkedAt: string;
}

/**
 * Where each bank's current sheet lives. Most keep one fixed link; BNP Paribas
 * Fortis names the file after the month, Elantis numbers each new tariff.
 */
async function sheetUrl(tariff: BankTariff, now: Date): Promise<string> {
  if (tariff.id === "bnp") {
    for (const back of [0, 1]) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1),
      );
      const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const url = `https://www.creditbrokers.bnpparibasfortis.be/Portals/0/files/NL/CB%20${ym}NL.pdf`;
      const found = await fetchOk(url, { method: "HEAD", timeoutMs: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (found) return url;
    }
    return tariff.url;
  }
  if (tariff.id === "elantis") {
    const page = await fetchOk(
      "https://www.elantis.be/nl/reglementen-tarief-prospectus/",
    ).then((r) => r.text());
    const links = [
      ...page.matchAll(
        /https:\/\/cdn\.elantis\.be\/uploads\/[^"'\s]*Officieel-Tarief-(\d+)\.pdf/g,
      ),
    ];
    // Highest tariff number is the newest.
    const newest = links.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return newest?.[0] ?? tariff.url;
  }
  return tariff.url;
}

/** One bank: its live rates when the sheet reads cleanly, else the bundled ones. */
async function checkBank(
  tariff: BankTariff,
  now: Date,
): Promise<{ tariff: BankTariff; status: BankStatus }> {
  const fallback = {
    tariff,
    status: {
      id: tariff.id,
      bank: tariff.bank,
      live: false,
      validFrom: tariff.validFrom,
      url: tariff.url,
    },
  };
  try {
    const url = await sheetUrl(tariff, now);
    const parsed = parsers[tariff.id](await pdfText(url));

    let list = parsed.list;
    let withProducts = parsed.withProducts;
    if (list && !withProducts) {
      withProducts = minus(list, tariff.productsDiscount ?? 0);
    } else if (withProducts && !list) {
      list = withProducts;
    }
    if (
      !isPlausible(list, tariff.list) ||
      !isPlausible(withProducts, tariff.withProducts)
    ) {
      return fallback;
    }

    const validFrom = parsed.validFrom ?? tariff.validFrom;
    return {
      tariff: {
        ...tariff,
        url,
        validFrom,
        list: list as Partial<Record<Duration, number>>,
        withProducts: withProducts as Partial<Record<Duration, number>>,
        verified: true,
        live: true,
      },
      status: { id: tariff.id, bank: tariff.bank, live: true, validFrom, url },
    };
  } catch {
    return fallback;
  }
}

/**
 * The banks' current fixed rates, read from their published tariff sheets.
 * Cached and refreshed every hour, like the ECB data. A bank whose sheet cannot
 * be fetched or read keeps the rates bundled in src/lib/sim/rates.ts, so the
 * site never breaks on a layout change; the footer then shows which bank.
 */
export async function getBankTariffs(): Promise<LiveBankTariffs> {
  "use cache";
  cacheLife("hours");

  const now = new Date();
  const results = await Promise.all(BANK_TARIFFS.map((t) => checkBank(t, now)));
  return {
    tariffs: results.map((r) => r.tariff),
    status: results.map((r) => r.status),
    checkedAt: now.toISOString(),
  };
}
