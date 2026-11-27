import { cacheLife } from "next/cache";
import { pageText, pdfText } from "./fetch-text";
import {
  checks,
  type Flanders2027,
  flanders2027,
  type SourceId,
  TARIFF_SOURCES,
} from "./tariff-checks";

export interface SourceCheck {
  id: SourceId;
  label: string;
  url: string;
  /**
   * "ok": the source states the figures we use. "changed": it no longer does
   * (see `reason`). "unreachable": the source could not be fetched this time.
   */
  status: "ok" | "changed" | "unreachable";
  reason?: string;
}

export interface TariffChecks {
  sources: SourceCheck[];
  /** Status of the Flemish 3 % from 2027; "unclear" when not checked. */
  flanders2027: Flanders2027;
  /** ISO timestamp of this check. */
  checkedAt: string;
}

/**
 * Checks once a day that the official sources still state the registration
 * duties and notary fees in src/lib/sim/tariffs.ts.
 */
export async function getTariffChecks(): Promise<TariffChecks> {
  "use cache";
  cacheLife("days");

  const now = new Date();
  let flemish2027: Flanders2027 = "unclear";
  const sources = await Promise.all(
    TARIFF_SOURCES.map(async (s): Promise<SourceCheck> => {
      const base = { id: s.id, label: s.label, url: s.url };
      let text: string;
      try {
        text = await (s.kind === "pdf" ? pdfText(s.url) : pageText(s.url));
      } catch {
        return { ...base, status: "unreachable" };
      }
      if (s.id === "flanders") flemish2027 = flanders2027(text);
      const outcome = checks[s.id](text, now);
      return outcome.ok
        ? { ...base, status: "ok" }
        : { ...base, status: "changed", reason: outcome.reason };
    }),
  );
  return { sources, flanders2027: flemish2027, checkedAt: now.toISOString() };
}
