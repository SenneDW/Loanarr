/** Belgian (Dutch) formatting: € 1.234,56 and 3,20 %. */
export const LOCALE = "nl-BE";

const eur = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
});

const eurRounded = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormats = new Map<number, Intl.NumberFormat>();
const percentFormat = (decimals: number) => {
  let format = percentFormats.get(decimals);
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    percentFormats.set(decimals, format);
  }
  return format;
};

export const formatEur = (value: number) => eur.format(value);
export const formatEurRounded = (value: number) => eurRounded.format(value);
/** Takes a fraction: 0.032 → "3,2 %". At most `decimals` decimals (default 1). */
export const formatPercent = (fraction: number, decimals = 1) =>
  percentFormat(decimals).format(fraction);

/** "2026-09" → "september 2026" (or "sep. 2026" when short). */
export const monthLabel = (month: string, short = false) => {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE, {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
