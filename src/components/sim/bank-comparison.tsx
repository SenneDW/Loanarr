"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEurRounded, formatPercent } from "@/lib/format";
import {
  type AffordabilityInput,
  affordabilityInputSchema,
  maxPurchasePrice,
} from "@/lib/sim/affordability";
import { bankRatesFor, RATES_CHECKED_ON } from "@/lib/sim/rates";

/** What each bank's published rate would mean for the user's maximum price. */
export function BankComparison({ input }: { input: AffordabilityInput }) {
  const rows = useMemo(() => {
    const parsed = affordabilityInputSchema.safeParse(input);
    if (!parsed.success) return [];
    return bankRatesFor(input.years)
      .map((r) => {
        const result = maxPurchasePrice({
          ...parsed.data,
          annualRatePercent: r.withProducts,
        });
        return { ...r, maxPrice: result.maxPrice, loan: result.plan.loan };
      })
      .sort((a, b) => b.maxPrice - a.maxPrice);
  }, [input]);

  if (rows.length === 0) return null;
  const best = rows[0].maxPrice;
  const worst = rows[rows.length - 1].maxPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wat geven de banken nu?</CardTitle>
        <CardDescription>
          Vaste rente voor {input.years} jaar met verzekeringen bij de bank, uit
          hun tarieflijsten (
          {new Date(RATES_CHECKED_ON).toLocaleDateString("nl-BE")}). Zelfde
          maandlast en eigen middelen.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {rows.map((r, i) => (
          <div
            key={r.bank}
            className="anim-fade-up grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-sm tabular-nums odd:bg-muted/50 sm:grid-cols-[minmax(0,180px)_70px_minmax(0,1fr)_auto]"
            style={{ "--delay": `${i * 0.06}s` } as React.CSSProperties}
          >
            <a
              href={r.tariff.url}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium hover:text-primary hover:underline"
              title={r.tariff.productsNote}
            >
              {r.bank}
            </a>
            <span className="text-right text-muted-foreground sm:text-left">
              {formatPercent(r.withProducts / 100, 2)}
            </span>
            <svg
              viewBox="0 0 100 8"
              className="col-span-2 h-2 w-full sm:col-span-1"
              aria-hidden="true"
            >
              <rect width="100" height="8" rx="3" fill="var(--muted)" />
              <rect
                width={
                  best === worst
                    ? 100
                    : 25 + (75 * (r.maxPrice - worst)) / (best - worst)
                }
                height="8"
                rx="3"
                fill={i === 0 ? "var(--chart-1)" : "var(--chart-2)"}
              />
            </svg>
            <span className="hidden text-right font-semibold sm:inline">
              {formatEurRounded(r.maxPrice)}
            </span>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          Het verschil tussen de duurste en goedkoopste bank is{" "}
          <strong className="text-foreground">
            {formatEurRounded(best - worst)}
          </strong>{" "}
          aan koopbudget. Tarieflijsten zijn een vertrekpunt: vraag offertes en
          onderhandel. KBC, ING en vdk publiceren geen tarieflijst.
        </p>
      </CardContent>
    </Card>
  );
}
