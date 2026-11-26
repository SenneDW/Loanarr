"use client";

import { useMarket } from "@/components/market-context";
import { Term } from "@/components/term";
import { formatPercent, monthLabel } from "@/lib/format";
import { typicalFixedRate } from "@/lib/sim/rates";
import { cn } from "@/lib/utils";
import type { RateMode } from "@/stores/rate-sync";

const pct = (n: number) => formatPercent(n / 100, 2);

/** Lets the user pick where the rate comes from, and explains each source. */
export function RateHint({
  years,
  mode,
  onModeChange,
}: {
  years: number;
  mode: RateMode;
  onModeChange: (mode: Exclude<RateMode, "custom">) => void;
}) {
  const { negotiatedFixed, change3m } = useMarket();
  const safeYears = Number.isFinite(years) && years > 0 ? years : 25;
  const banks = typicalFixedRate(safeYears);
  const rising = change3m !== undefined && change3m > 0.05;

  const options = [
    {
      mode: "market" as const,
      title: "Marktrente",
      rate: negotiatedFixed.ratePercent,
      sub: `wat kopers effectief betalen (NBB, ${monthLabel(negotiatedFixed.month)})`,
    },
    {
      mode: "banks" as const,
      title: "Tarieflijst banken",
      rate: banks.ratePercent,
      sub: `vóór onderhandeling, ${safeYears} jaar vast`,
    },
  ];

  return (
    <div className="grid gap-2 rounded-lg bg-primary/5 p-3 text-xs ring-1 ring-primary/15">
      <span className="font-medium">Welke rente gebruiken we?</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onModeChange(o.mode)}
            aria-pressed={mode === o.mode}
            className={cn(
              "grid gap-0.5 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:border-primary/60",
              mode === o.mode && "border-primary ring-1 ring-primary",
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{o.title}</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {pct(o.rate)}
              </span>
            </span>
            <span className="text-muted-foreground">{o.sub}</span>
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <p className="text-muted-foreground">
          Je gebruikt je eigen rentevoet. Kies hierboven om terug te gaan.
        </p>
      )}
      <p className="text-muted-foreground">
        {rising && (
          <>
            De rente stijgt (+{change3m?.toLocaleString("nl-BE")}{" "}
            <Term id="procentpunt">procentpunt</Term> in 3 maanden): reken met
            wat marge.{" "}
          </>
        )}
        De <Term id="marktrente" /> komt van de <Term id="nbb" />. Banken
        publiceren hogere <Term id="affichetarief">affichetarieven</Term> op hun{" "}
        <Term id="tarieflijst">tarieflijst</Term> (spreiding {pct(banks.min)} –{" "}
        {pct(banks.max)}). Na onderhandeling of via een{" "}
        <Term id="kredietmakelaar" /> ligt je rente meestal dichter bij de
        marktrente.
      </p>
    </div>
  );
}
